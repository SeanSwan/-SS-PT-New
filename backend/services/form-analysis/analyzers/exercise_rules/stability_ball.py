"""
Stability ball exercise rules.

Assessment criteria based on:
- NASM CES: proprioceptive progression (stable -> unstable surface)
- NASM PES: reactive stabilization on unstable surfaces

Key checkpoints for stability ball:
  Balance: maintain center of gravity over support base
  Spine: neutral alignment maintained through instability
  Core: bracing throughout (drawing-in maneuver)
  ROM: full range despite unstable surface
"""

from .base import ExerciseRuleEngine, FormCue


class StabilityBallCrunchRules(ExerciseRuleEngine):
    """Stability ball crunch.

    NASM CES: core activation on unstable surface.
    Greater ROM than floor crunch due to spinal extension over ball.
    """
    exercise_name = "stability_ball_crunch"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 130.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Core engagement (hip stability during crunch) ───────────
        hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
        if hip_diff > 0.04:
            cues.append(FormCue(
                rule_name="hip_shift",
                message="Shifting on ball -- stabilize hips, engage core evenly",
                severity="warning",
                weight=1.5,
            ))

        # ── Head/neck position ──────────────────────────────────────
        nose_y = landmarks[0]["y"]
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        if nose_y < shoulder_y - 0.08:
            cues.append(FormCue(
                rule_name="neck_pull",
                message="Don't pull on neck -- support head lightly, crunch with abs",
                severity="error",
                weight=1.5,
            ))

        return cues


class StabilityBallHamstringCurlRules(ExerciseRuleEngine):
    """Stability ball hamstring curl (supine).

    NASM CES: hamstring activation with hip extension.
    Progression: glute bridge -> ball bridge -> ball curl.
    """
    exercise_name = "stability_ball_hamstring_curl"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 70.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Hip drop during curl ────────────────────────────────────
        if len(landmarks) >= 33:
            hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            if hip_y > shoulder_y + 0.05:
                cues.append(FormCue(
                    rule_name="hip_drop",
                    message="Hips dropping -- keep hips elevated throughout the curl",
                    severity="error",
                    weight=2.0,
                ))

        # ── Full ROM ───────────────────────────────────────────────
        if avg_knee < 80:
            cues.append(FormCue(
                rule_name="good_contraction",
                message="Good hamstring contraction -- full curl range",
                severity="good",
            ))

        return cues


class StabilityBallPushUpRules(ExerciseRuleEngine):
    """Stability ball push-up (hands on ball or feet on ball).

    NASM PES: reactive stabilization during pushing pattern.
    Higher demand on scapular stabilizers and core.
    """
    exercise_name = "stability_ball_pushup"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 90.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip sag (amplified on unstable surface) ─────────────────
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2
        expected_hip = (shoulder_y + ankle_y) / 2
        sag = hip_y - expected_hip

        if sag > 0.04:
            cues.append(FormCue(
                rule_name="hip_sag",
                message="Hips sagging on ball -- extra core engagement needed on unstable surface",
                severity="error",
                weight=2.0,
            ))
        elif sag > 0.02:
            cues.append(FormCue(
                rule_name="slight_sag",
                message="Slight hip drop -- brace harder to stabilize on ball",
                severity="warning",
                weight=1.0,
            ))

        # ── Shoulder level ──────────────────────────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.04:
            cues.append(FormCue(
                rule_name="uneven_shoulders",
                message="Uneven on ball -- stabilize through shoulders, distribute weight",
                severity="warning",
                weight=1.2,
            ))

        return cues


class StabilityBallBackExtensionRules(ExerciseRuleEngine):
    """Stability ball back extension (prone over ball).

    NASM CES: posterior chain activation with spinal extension control.
    Key: controlled extension, don't hyperextend lumbar.
    """
    exercise_name = "stability_ball_back_extension"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 120.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Hyperextension ──────────────────────────────────────────
        if trunk_lean < -10:
            cues.append(FormCue(
                rule_name="hyperextension",
                message="Hyperextending low back -- stop at neutral spine, don't arch excessively",
                severity="error",
                weight=2.0,
            ))

        return cues


class StabilityBallPlankRules(ExerciseRuleEngine):
    """Stability ball plank (forearms on ball).

    NASM PES: advanced core stabilization on unstable surface.
    Same checkpoints as regular plank but amplified instability.
    """
    exercise_name = "stability_ball_plank"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 140.0
    rep_top_threshold = 175.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2
        expected_hip = (shoulder_y + ankle_y) / 2
        sag = hip_y - expected_hip

        if sag > 0.04:
            cues.append(FormCue(
                rule_name="hip_sag",
                message="Hips sagging -- brace core, squeeze glutes, maintain plank on ball",
                severity="error",
                weight=2.0,
            ))
        elif sag < -0.04:
            cues.append(FormCue(
                rule_name="hip_pike",
                message="Hips piking -- lower to align with shoulders and ankles",
                severity="warning",
                weight=1.0,
            ))

        return cues


class StabilityBallSquatRules(ExerciseRuleEngine):
    """Wall ball squat (stability ball between back and wall).

    NASM CES: squat pattern with wall support for form correction.
    Teaches upright torso, controlled descent.
    """
    exercise_name = "wall_ball_squat"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Depth ──────────────────────────────────────────────────
        if avg_knee < 130:
            if avg_knee > 110:
                cues.append(FormCue(
                    rule_name="shallow_squat",
                    message="Partial depth -- lower until thighs parallel with floor",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_knee > 85:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good wall squat depth",
                    severity="good",
                ))

        # ── Knee valgus ─────────────────────────────────────────────
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
                        message=f"{side.title()} knee caving -- push knees out over toes",
                        severity="error",
                        weight=2.0,
                    ))

        return cues
