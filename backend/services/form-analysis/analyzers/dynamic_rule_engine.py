"""
DynamicRuleEngine — Evaluate custom exercise rules from mechanicsSchema JSONB.

Phase 6b: Hydrates rule definitions created in the BiomechanicsStudio frontend
and evaluates them against MediaPipe 33-point landmarks per frame.

Supported rule types:
  - angle_threshold: Joint angle must stay within [min, max] degrees
  - landmark_deviation: Distance between two landmarks must stay within tolerance
  - bilateral_symmetry: Left/right angle difference must stay below threshold

mechanicsSchema shape (from CustomExercise.mechanicsSchema JSONB):
{
  "primaryAngle": {
    "joint": "left_knee",          # key from ANGLE_JOINTS
    "landmarks": [23, 25, 27],     # hip-knee-ankle triplet
    "repPhases": {
      "startAngle": 170,
      "bottomAngle": 90,
      "hysteresis": 10
    }
  },
  "formRules": [
    {
      "type": "angle_threshold",
      "name": "Knee Cave Check",
      "joint": "left_knee_flexion",
      "landmarks": [23, 25, 27],
      "min": 80,
      "max": 170,
      "severity": "warning",
      "cue": "Push your knees out over your toes"
    },
    {
      "type": "landmark_deviation",
      "name": "Shoulder Alignment",
      "landmarkA": 11,
      "landmarkB": 12,
      "axis": "y",
      "maxDeviation": 0.05,
      "severity": "warning",
      "cue": "Keep your shoulders level"
    },
    {
      "type": "bilateral_symmetry",
      "name": "Knee Symmetry",
      "leftJoint": "left_knee_flexion",
      "rightJoint": "right_knee_flexion",
      "leftLandmarks": [23, 25, 27],
      "rightLandmarks": [24, 26, 28],
      "maxDiff": 15,
      "severity": "info",
      "cue": "Try to bend both knees evenly"
    }
  ],
  "checkpoints": [
    {
      "name": "Bottom Position",
      "condition": "primaryAngle < 100",
      "rules": ["Knee Cave Check", "Shoulder Alignment"]
    }
  ]
}
"""

import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .angle_calculator import _angle_between, _pt, LandmarkIndex as LI


@dataclass
class RuleViolation:
    """A single form rule violation detected in a frame."""
    rule_name: str
    severity: str  # info | warning | danger
    cue: str
    actual_value: float
    threshold_value: float
    rule_type: str


@dataclass
class RepPhaseConfig:
    """Configuration for rep detection from mechanicsSchema.primaryAngle."""
    landmarks: list[int]
    start_angle: float
    bottom_angle: float
    hysteresis: float = 10.0


@dataclass
class FrameResult:
    """Result of evaluating all rules against a single frame."""
    violations: list[RuleViolation] = field(default_factory=list)
    angles: dict[str, float] = field(default_factory=dict)
    primary_angle: Optional[float] = None
    score: float = 100.0


class DynamicRuleEngine:
    """Evaluates custom exercise form rules against MediaPipe landmarks.

    Hydrated from CustomExercise.mechanicsSchema JSONB. Stateless per-frame
    evaluation — rep counting and score aggregation happen in the caller.
    """

    def __init__(self, mechanics_schema: dict):
        self._schema = mechanics_schema
        self._form_rules = mechanics_schema.get("formRules", [])
        self._checkpoints = mechanics_schema.get("checkpoints", [])
        self._primary = mechanics_schema.get("primaryAngle", None)
        self._rep_config = self._parse_rep_config()

    def _parse_rep_config(self) -> Optional[RepPhaseConfig]:
        """Parse primaryAngle into RepPhaseConfig if present."""
        if not self._primary:
            return None
        phases = self._primary.get("repPhases", {})
        landmarks = self._primary.get("landmarks", [])
        if len(landmarks) != 3 or not phases:
            return None
        return RepPhaseConfig(
            landmarks=landmarks,
            start_angle=phases.get("startAngle", 170),
            bottom_angle=phases.get("bottomAngle", 90),
            hysteresis=phases.get("hysteresis", 10),
        )

    @property
    def rep_phase_config(self) -> Optional[RepPhaseConfig]:
        return self._rep_config

    @property
    def rule_count(self) -> int:
        return len(self._form_rules)

    def evaluate_frame(self, landmarks: list[dict]) -> FrameResult:
        """Evaluate all form rules against a single frame of landmarks.

        Args:
            landmarks: List of 33 dicts with keys x, y, z, visibility

        Returns:
            FrameResult with violations, computed angles, primary angle, and score
        """
        result = FrameResult()

        if not landmarks or len(landmarks) < 33:
            return result

        # Compute primary angle for rep detection
        if self._rep_config:
            lm = self._rep_config.landmarks
            result.primary_angle = _angle_between(
                _pt(landmarks, lm[0]),
                _pt(landmarks, lm[1]),
                _pt(landmarks, lm[2]),
            )

        # Evaluate each form rule
        for rule in self._form_rules:
            rule_type = rule.get("type", "")
            violation = None

            if rule_type == "angle_threshold":
                violation = self._eval_angle_threshold(rule, landmarks, result)
            elif rule_type == "landmark_deviation":
                violation = self._eval_landmark_deviation(rule, landmarks)
            elif rule_type == "bilateral_symmetry":
                violation = self._eval_bilateral_symmetry(rule, landmarks, result)

            if violation:
                result.violations.append(violation)

        # Score: start at 100, deduct per violation severity
        deductions = {"info": 2, "warning": 8, "danger": 20}
        for v in result.violations:
            result.score -= deductions.get(v.severity, 5)
        result.score = max(0.0, result.score)

        return result

    def _eval_angle_threshold(
        self, rule: dict, landmarks: list[dict], result: FrameResult
    ) -> Optional[RuleViolation]:
        """Check if a joint angle is within [min, max] range."""
        lm_indices = rule.get("landmarks", [])
        if len(lm_indices) != 3:
            return None

        # Check landmark visibility
        min_vis = 0.5
        for idx in lm_indices:
            if idx >= len(landmarks):
                return None
            if landmarks[idx].get("visibility", 0) < min_vis:
                return None

        angle = _angle_between(
            _pt(landmarks, lm_indices[0]),
            _pt(landmarks, lm_indices[1]),
            _pt(landmarks, lm_indices[2]),
        )
        angle = round(angle, 1)

        # Store computed angle
        joint_name = rule.get("joint", rule.get("name", "unknown"))
        result.angles[joint_name] = angle

        min_val = rule.get("min", 0)
        max_val = rule.get("max", 180)

        if angle < min_val:
            return RuleViolation(
                rule_name=rule.get("name", "Angle Check"),
                severity=rule.get("severity", "warning"),
                cue=rule.get("cue", f"Angle too low ({angle:.0f})"),
                actual_value=angle,
                threshold_value=min_val,
                rule_type="angle_threshold",
            )
        elif angle > max_val:
            return RuleViolation(
                rule_name=rule.get("name", "Angle Check"),
                severity=rule.get("severity", "warning"),
                cue=rule.get("cue", f"Angle too high ({angle:.0f})"),
                actual_value=angle,
                threshold_value=max_val,
                rule_type="angle_threshold",
            )

        return None

    def _eval_landmark_deviation(
        self, rule: dict, landmarks: list[dict]
    ) -> Optional[RuleViolation]:
        """Check if two landmarks deviate beyond tolerance on a given axis."""
        idx_a = rule.get("landmarkA", -1)
        idx_b = rule.get("landmarkB", -1)

        if idx_a < 0 or idx_b < 0 or idx_a >= len(landmarks) or idx_b >= len(landmarks):
            return None

        min_vis = 0.5
        if landmarks[idx_a].get("visibility", 0) < min_vis:
            return None
        if landmarks[idx_b].get("visibility", 0) < min_vis:
            return None

        axis = rule.get("axis", "y")
        val_a = landmarks[idx_a].get(axis, 0)
        val_b = landmarks[idx_b].get(axis, 0)
        deviation = abs(val_a - val_b)

        max_deviation = rule.get("maxDeviation", 0.05)

        if deviation > max_deviation:
            return RuleViolation(
                rule_name=rule.get("name", "Alignment Check"),
                severity=rule.get("severity", "warning"),
                cue=rule.get("cue", f"Alignment off by {deviation:.3f}"),
                actual_value=round(deviation, 4),
                threshold_value=max_deviation,
                rule_type="landmark_deviation",
            )

        return None

    def _eval_bilateral_symmetry(
        self, rule: dict, landmarks: list[dict], result: FrameResult
    ) -> Optional[RuleViolation]:
        """Check if left/right angle difference exceeds threshold."""
        left_lm = rule.get("leftLandmarks", [])
        right_lm = rule.get("rightLandmarks", [])

        if len(left_lm) != 3 or len(right_lm) != 3:
            return None

        min_vis = 0.5
        for idx in left_lm + right_lm:
            if idx >= len(landmarks):
                return None
            if landmarks[idx].get("visibility", 0) < min_vis:
                return None

        left_angle = _angle_between(
            _pt(landmarks, left_lm[0]),
            _pt(landmarks, left_lm[1]),
            _pt(landmarks, left_lm[2]),
        )
        right_angle = _angle_between(
            _pt(landmarks, right_lm[0]),
            _pt(landmarks, right_lm[1]),
            _pt(landmarks, right_lm[2]),
        )

        # Store both angles
        left_name = rule.get("leftJoint", "left_unknown")
        right_name = rule.get("rightJoint", "right_unknown")
        result.angles[left_name] = round(left_angle, 1)
        result.angles[right_name] = round(right_angle, 1)

        diff = abs(left_angle - right_angle)
        max_diff = rule.get("maxDiff", 15)

        if diff > max_diff:
            return RuleViolation(
                rule_name=rule.get("name", "Symmetry Check"),
                severity=rule.get("severity", "info"),
                cue=rule.get("cue", f"Left/right difference: {diff:.0f} degrees"),
                actual_value=round(diff, 1),
                threshold_value=max_diff,
                rule_type="bilateral_symmetry",
            )

        return None

    def validate_schema(self) -> dict:
        """Validate the mechanicsSchema for completeness and correctness.

        Returns:
            Dict with "valid" bool, "errors" list, "warnings" list
        """
        errors = []
        warnings = []

        # Check primaryAngle
        if self._primary:
            lm = self._primary.get("landmarks", [])
            if len(lm) != 3:
                errors.append("primaryAngle.landmarks must have exactly 3 indices")
            else:
                for idx in lm:
                    if not isinstance(idx, int) or idx < 0 or idx > 32:
                        errors.append(f"primaryAngle.landmarks contains invalid index: {idx}")

            phases = self._primary.get("repPhases", {})
            if not phases:
                errors.append("primaryAngle.repPhases is required for rep detection")
            else:
                start = phases.get("startAngle", 0)
                bottom = phases.get("bottomAngle", 0)
                if start <= bottom:
                    warnings.append(
                        f"startAngle ({start}) should be > bottomAngle ({bottom}) for standard exercises"
                    )
        else:
            warnings.append("No primaryAngle defined — rep detection will not work")

        # Check formRules
        valid_types = {"angle_threshold", "landmark_deviation", "bilateral_symmetry"}
        rule_names = set()

        for i, rule in enumerate(self._form_rules):
            rtype = rule.get("type", "")
            rname = rule.get("name", f"Rule {i}")

            if rtype not in valid_types:
                errors.append(f"Rule '{rname}': unknown type '{rtype}'")

            if rname in rule_names:
                warnings.append(f"Duplicate rule name: '{rname}'")
            rule_names.add(rname)

            if not rule.get("cue"):
                warnings.append(f"Rule '{rname}': missing coaching cue text")

            if rtype == "angle_threshold":
                lm = rule.get("landmarks", [])
                if len(lm) != 3:
                    errors.append(f"Rule '{rname}': angle_threshold needs 3 landmarks")
                mn = rule.get("min", 0)
                mx = rule.get("max", 180)
                if mn >= mx:
                    errors.append(f"Rule '{rname}': min ({mn}) must be < max ({mx})")

            elif rtype == "landmark_deviation":
                if rule.get("landmarkA") is None or rule.get("landmarkB") is None:
                    errors.append(f"Rule '{rname}': landmark_deviation needs landmarkA and landmarkB")
                if rule.get("axis", "y") not in ("x", "y", "z"):
                    errors.append(f"Rule '{rname}': axis must be x, y, or z")

            elif rtype == "bilateral_symmetry":
                if len(rule.get("leftLandmarks", [])) != 3:
                    errors.append(f"Rule '{rname}': bilateral_symmetry needs 3 leftLandmarks")
                if len(rule.get("rightLandmarks", [])) != 3:
                    errors.append(f"Rule '{rname}': bilateral_symmetry needs 3 rightLandmarks")

        # Check checkpoint references
        for cp in self._checkpoints:
            for ref in cp.get("rules", []):
                if ref not in rule_names:
                    warnings.append(f"Checkpoint '{cp.get('name', '?')}' references unknown rule: '{ref}'")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "ruleCount": len(self._form_rules),
            "hasRepDetection": self._rep_config is not None,
        }

    def to_summary(self) -> dict:
        """Return a human-readable summary of the engine configuration."""
        return {
            "ruleCount": len(self._form_rules),
            "ruleTypes": list({r.get("type") for r in self._form_rules}),
            "hasRepDetection": self._rep_config is not None,
            "checkpointCount": len(self._checkpoints),
            "primaryJoint": self._primary.get("joint") if self._primary else None,
        }
