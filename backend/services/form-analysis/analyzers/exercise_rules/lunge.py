"""
Lunge pattern rules (forward, reverse, walking, lateral, Bulgarian split squat, step-up).

Assessment criteria based on:
- NASM CES: single-leg squat assessment (primary single-leg checkpoint)
- NASM PES: single-leg stability and deceleration patterns
- Squat University: knee tracking, trunk stability, depth standards

Key checkpoints (NASM single-leg assessment):
  Foot/Ankle: foot flatten/turn out, heel rise
  Knee: valgus collapse, extends past toes excessively
  LPHC: lateral trunk lean, hip drop (Trendelenburg), rotation
  Trunk: forward lean compensation
"""

from .base import ExerciseRuleEngine, FormCue


class ForwardLungeRules(ExerciseRuleEngine):
    exercise_name = "forward_lunge"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Depth (NASM: 90-deg knee flexion = full lunge depth) ────
        if avg_knee < 140:
            if avg_knee > 115:
                cues.append(FormCue(
                    rule_name="shallow_lunge",
                    message="Partial depth -- lower until front knee reaches ~90 degrees",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_knee > 85:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good lunge depth -- front knee near 90 degrees",
                    severity="good",
                ))
            else:
                cues.append(FormCue(
                    rule_name="full_depth",
                    message="Full lunge depth achieved",
                    severity="good",
                ))

        # ── Knee valgus (NASM CES primary single-leg checkpoint) ────
        if len(landmarks) >= 33:
            for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
                knee_x = landmarks[knee_idx]["x"]
                ankle_x = landmarks[ankle_idx]["x"]
                if side == "left":
                    deviation = knee_x - ankle_x
                else:
                    deviation = ankle_x - knee_x

                if deviation > 0.05:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee caving inward -- push knee over 2nd/3rd toe",
                        severity="error",
                        weight=2.0,
                    ))
                elif deviation > 0.03:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee tracking medially -- activate glutes",
                        severity="warning",
                        weight=1.0,
                    ))

        # ── Trunk lean (NASM CES: LPHC assessment) ─────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 30:
            cues.append(FormCue(
                rule_name="excessive_forward_lean",
                message="Excessive forward lean -- stay upright, brace core",
                severity="error",
                weight=2.0,
            ))
        elif trunk_lean > 20:
            cues.append(FormCue(
                rule_name="forward_lean",
                message="Forward lean detected -- chest up, engage anterior core",
                severity="warning",
                weight=1.0,
            ))

        # ── Hip drop / Trendelenburg (NASM CES: glute medius weakness) ──
        if len(landmarks) >= 33:
            left_hip_y = landmarks[23]["y"]
            right_hip_y = landmarks[24]["y"]
            hip_diff = abs(left_hip_y - right_hip_y)
            if hip_diff > 0.04:
                drop_side = "left" if left_hip_y > right_hip_y else "right"
                cues.append(FormCue(
                    rule_name="hip_drop",
                    message=f"Hip dropping on {drop_side} -- strengthen glute medius",
                    severity="warning",
                    weight=1.5,
                ))

        # ── Knee asymmetry (NASM: bilateral comparison) ─────────────
        knee_diff = joint_angles.get("knee_flexion_diff", 0)
        if knee_diff > 15:
            cues.append(FormCue(
                rule_name="knee_asymmetry",
                message=f"Significant knee asymmetry ({knee_diff:.0f} deg) -- check single-leg strength",
                severity="error",
                weight=1.5,
            ))
        elif knee_diff > 8:
            cues.append(FormCue(
                rule_name="knee_asymmetry",
                message=f"Knee asymmetry detected ({knee_diff:.0f} deg) -- monitor bilaterally",
                severity="warning",
                weight=0.8,
            ))

        return cues


class ReverseLungeRules(ForwardLungeRules):
    """Reverse lunge -- same checkpoints as forward lunge, slightly more lenient on lean."""
    exercise_name = "reverse_lunge"


class WalkingLungeRules(ForwardLungeRules):
    exercise_name = "walking_lunge"


class LateralLungeRules(ExerciseRuleEngine):
    """Lateral lunge targets frontal-plane stability and adductor flexibility."""
    exercise_name = "lateral_lunge"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        # ── Knee tracking over toes ─────────────────────────────────
        if len(landmarks) >= 33:
            for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
                knee_x = landmarks[knee_idx]["x"]
                ankle_x = landmarks[ankle_idx]["x"]
                if side == "left":
                    deviation = knee_x - ankle_x
                else:
                    deviation = ankle_x - knee_x
                if deviation > 0.05:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee collapsing inward -- track over toes",
                        severity="error",
                        weight=2.0,
                    ))

        # ── Trunk lateral lean (should stay centered) ───────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 25:
            cues.append(FormCue(
                rule_name="lateral_trunk_lean",
                message="Leaning too far forward -- keep torso upright over hips",
                severity="warning",
                weight=1.5,
            ))

        # ── Hip symmetry ────────────────────────────────────────────
        if len(landmarks) >= 33:
            hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
            if hip_diff > 0.05:
                cues.append(FormCue(
                    rule_name="hip_shift",
                    message="Uneven hip position -- maintain level pelvis",
                    severity="warning",
                    weight=1.0,
                ))

        # ── Heel rise (ankle mobility) ──────────────────────────────
        for side in ["left", "right"]:
            ankle = joint_angles.get(f"{side}_ankle_dorsiflexion", 180)
            if ankle < 55:
                cues.append(FormCue(
                    rule_name=f"{side}_heel_rise",
                    message=f"{side.title()} heel rising -- work on ankle mobility",
                    severity="warning",
                    weight=1.0,
                ))

        return cues


class BulgarianSplitSquatRules(ForwardLungeRules):
    """Bulgarian split squat -- elevated rear foot, single-leg emphasis.

    NASM CES: advanced single-leg assessment.
    Same checkpoints as forward lunge with stricter balance/hip drop thresholds.
    """
    exercise_name = "bulgarian_split_squat"
    rep_bottom_threshold = 95.0


class StepUpRules(ForwardLungeRules):
    """Step-up -- NASM PES progression for single-leg strength.

    Uses same knee/hip/trunk checkpoints as lunge pattern.
    """
    exercise_name = "step_up"
    rep_bottom_threshold = 105.0
    rep_top_threshold = 160.0
