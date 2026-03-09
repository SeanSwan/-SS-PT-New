"""
Base exercise rule engine.

Each exercise defines rules that evaluate joint angles and landmarks
for a single frame, returning form cues and a per-frame score.
"""

from dataclasses import dataclass


@dataclass
class FormCue:
    """A single form feedback cue for one frame."""
    rule_name: str
    message: str
    severity: str  # good | warning | error
    weight: float = 1.0  # contribution to score deduction
    deduction: float = 0.0  # actual points lost (0-100 scale)


class ExerciseRuleEngine:
    """Base class for exercise-specific rule engines."""

    exercise_name: str = "unknown"
    # Primary angle used for rep detection (e.g., knee flexion for squats)
    rep_angle_key: str = ""
    # Angle thresholds for rep detection (bottom of rep)
    rep_bottom_threshold: float = 90.0  # below this = bottom of rep
    rep_top_threshold: float = 160.0    # above this = top of rep

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        """Evaluate all rules for a single frame.

        Override in subclasses.
        Returns list of FormCue objects.
        """
        raise NotImplementedError

    def calculate_frame_score(self, cues: list[FormCue]) -> float:
        """Calculate a 0-100 score from form cues.

        Starts at 100, deducts based on cue severity and weight.
        """
        score = 100.0
        for cue in cues:
            if cue.severity == "error":
                score -= cue.weight * 15
            elif cue.severity == "warning":
                score -= cue.weight * 7
        return max(0, min(100, round(score, 1)))
