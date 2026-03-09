"""
Hip hinge pattern rules (Romanian deadlift, good morning, kettlebell swing,
hip thrust, glute bridge).

Assessment criteria based on:
- NASM CES: hip hinge movement assessment
- NASM PES: posterior chain power development
- Squat University: hip-dominant movement mechanics

Key checkpoints:
  Lumbar spine: maintain neutral (no rounding or hyperextension)
  Hip hinge: hip-dominant pattern, not squat pattern
  Knee: slight bend maintained throughout (RDL/good morning)
  Lockout: full hip extension via glute activation
"""

from .base import ExerciseRuleEngine, FormCue


class RomanianDeadliftRules(ExerciseRuleEngine):
    """Romanian deadlift -- hip hinge with minimal knee bend.

    NASM CES: hip hinge assessment (hamstring length limiting factor).
    Squat University: hip crease drives back, bar stays close to legs.
    """
    exercise_name = "romanian_deadlift"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Back rounding (NASM CES: lumbar flexion under load) ─────
        if avg_hip < 140 and trunk_lean > 50:
            cues.append(FormCue(
                rule_name="back_rounding",
                message="Lumbar rounding -- maintain neutral spine, limit ROM to hamstring flexibility",
                severity="error",
                weight=2.5,
            ))
        elif avg_hip < 140 and trunk_lean > 40:
            cues.append(FormCue(
                rule_name="slight_rounding",
                message="Slight spinal flexion -- engage lats, retract shoulder blades",
                severity="warning",
                weight=1.5,
            ))

        # ── Knee bend (RDL should have minimal ~15-20 deg knee bend) ─
        if avg_hip < 140:
            if avg_knee < 120:
                cues.append(FormCue(
                    rule_name="excessive_knee_bend",
                    message="Too much knee bend -- this is becoming a conventional deadlift, keep knees soft but straighter",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_knee > 170:
                cues.append(FormCue(
                    rule_name="locked_knees",
                    message="Knees completely locked -- maintain slight bend to protect low back",
                    severity="warning",
                    weight=1.0,
                ))

        # ── Hip hinge depth (hamstring flexibility indicator) ────────
        if avg_hip < 130:
            if avg_hip > 90:
                cues.append(FormCue(
                    rule_name="good_hinge_depth",
                    message="Good hip hinge depth -- hamstrings lengthened well",
                    severity="good",
                ))

        # ── Lockout ─────────────────────────────────────────────────
        if avg_hip > 165 and trunk_lean < 8:
            cues.append(FormCue(
                rule_name="good_lockout",
                message="Full hip extension -- strong glute squeeze",
                severity="good",
            ))
        elif avg_hip > 155 and avg_hip <= 165:
            cues.append(FormCue(
                rule_name="incomplete_lockout",
                message="Squeeze glutes to full extension at top",
                severity="warning",
                weight=0.8,
            ))

        # ── Bilateral symmetry ──────────────────────────────────────
        hip_diff = joint_angles.get("hip_flexion_diff", 0)
        if hip_diff > 12:
            cues.append(FormCue(
                rule_name="hip_asymmetry",
                message=f"Hip asymmetry ({hip_diff:.0f} deg) -- possible rotation or uneven loading",
                severity="warning",
                weight=1.2,
            ))

        return cues


class GoodMorningRules(RomanianDeadliftRules):
    """Good morning -- barbell on back, hip hinge pattern.

    Same mechanics as RDL but more strict on back position since
    the load is higher (on shoulders vs in hands).
    """
    exercise_name = "good_morning"
    rep_bottom_threshold = 110.0  # less depth than RDL typically


class KettlebellSwingRules(ExerciseRuleEngine):
    """Kettlebell swing -- ballistic hip hinge.

    NASM PES: power development through hip extension.
    Key: explosive hip drive, NOT a squat-and-lift pattern.
    """
    exercise_name = "kettlebell_swing"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 110.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Squat pattern (should be a hinge, not a squat) ──────────
        if avg_knee < 110:
            cues.append(FormCue(
                rule_name="squat_swing",
                message="Too much knee bend -- swing is a hip hinge, not a squat",
                severity="error",
                weight=2.0,
            ))

        # ── Back rounding ───────────────────────────────────────────
        if trunk_lean > 45:
            cues.append(FormCue(
                rule_name="back_rounding",
                message="Back rounding at bottom -- brace core, neutral spine",
                severity="error",
                weight=2.0,
            ))

        # ── Hyperextension at top (common fault) ────────────────────
        if avg_hip > 175:
            cues.append(FormCue(
                rule_name="hyperextension",
                message="Leaning back at top -- finish tall with glutes, don't hyperextend",
                severity="warning",
                weight=1.5,
            ))

        # ── Shoulder check (arms should be relaxed, not shrugging) ──
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.04:
                cues.append(FormCue(
                    rule_name="uneven_shoulders",
                    message="Uneven shoulders -- pack shoulders down and back",
                    severity="warning",
                    weight=0.8,
                ))

        return cues


class HipThrustRules(ExerciseRuleEngine):
    """Hip thrust / glute bridge -- hip extension from supine position.

    NASM PES: isolated glute activation.
    Key: full hip extension at top, no lumbar hyperextension.
    """
    exercise_name = "hip_thrust"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Full extension at top ──────────────────────────────────
        if avg_hip > 170:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full hip extension -- excellent glute lockout",
                severity="good",
            ))
        elif avg_hip > 155 and avg_hip <= 165:
            cues.append(FormCue(
                rule_name="incomplete_extension",
                message="Push hips higher -- squeeze glutes to full extension",
                severity="warning",
                weight=1.5,
            ))

        # ── Knee angle (should be ~90 deg at top for max glute activation) ─
        if avg_hip > 155:
            if avg_knee < 70:
                cues.append(FormCue(
                    rule_name="feet_too_close",
                    message="Feet too close to body -- quad dominant, move feet out slightly",
                    severity="warning",
                    weight=1.0,
                ))
            elif avg_knee > 120:
                cues.append(FormCue(
                    rule_name="feet_too_far",
                    message="Feet too far from body -- hamstring dominant, move feet closer",
                    severity="warning",
                    weight=1.0,
                ))

        # ── Knee valgus (common during hip thrust) ──────────────────
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
                        weight=1.5,
                    ))

        # ── Hip asymmetry ───────────────────────────────────────────
        hip_diff = joint_angles.get("hip_flexion_diff", 0)
        if hip_diff > 10:
            cues.append(FormCue(
                rule_name="hip_asymmetry",
                message=f"Uneven hip extension ({hip_diff:.0f} deg) -- one glute may be weaker",
                severity="warning",
                weight=1.2,
            ))

        return cues


class GluteBridgeRules(HipThrustRules):
    """Glute bridge -- floor-based hip extension.

    Same mechanics as hip thrust but from flat on floor.
    """
    exercise_name = "glute_bridge"
    rep_bottom_threshold = 110.0
