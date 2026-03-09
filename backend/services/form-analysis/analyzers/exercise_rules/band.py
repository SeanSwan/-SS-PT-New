"""
Resistance band exercise rules.

Assessment criteria based on:
- NASM CES: corrective exercise with bands (progressive resistance)
- NASM PES: accommodating resistance for power development

Band exercises follow same biomechanical principles as their
free weight counterparts but with ascending resistance curves.
Key: maintain form through the entire ROM, don't let band snap back.
"""

from .base import ExerciseRuleEngine, FormCue


class BandedSquatRules(ExerciseRuleEngine):
    """Banded squat (band above knees or band for load).

    NASM CES: corrective squat with band cue to push knees out.
    """
    exercise_name = "banded_squat"
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
        if avg_knee < 130 and avg_knee > 110:
            cues.append(FormCue(
                rule_name="shallow_squat",
                message="Partial depth -- lower until thighs reach parallel",
                severity="warning",
                weight=1.5,
            ))

        # ── Knee valgus (the whole point of banded squats) ──────────
        if len(landmarks) >= 33:
            for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
                knee_x = landmarks[knee_idx]["x"]
                ankle_x = landmarks[ankle_idx]["x"]
                if side == "left":
                    deviation = knee_x - ankle_x
                else:
                    deviation = ankle_x - knee_x
                if deviation > 0.04:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee caving -- actively push INTO the band",
                        severity="error",
                        weight=2.0,
                    ))

        # ── Forward lean ────────────────────────────────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 30:
            cues.append(FormCue(
                rule_name="forward_lean",
                message="Forward lean -- chest up, core braced",
                severity="warning",
                weight=1.5,
            ))

        return cues


class BandPullApartRules(ExerciseRuleEngine):
    """Band pull-apart -- posterior deltoid and scapular retraction.

    NASM CES: scapular stabilization corrective exercise.
    Key: depress shoulders, squeeze shoulder blades, control eccentric.
    """
    exercise_name = "band_pull_apart"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Shoulder shrugging ──────────────────────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.03:
            cues.append(FormCue(
                rule_name="shoulder_shrug",
                message="Shrugging -- depress shoulders, pull with mid/lower traps",
                severity="warning",
                weight=1.2,
            ))

        # ── Trunk lean (should stay upright) ────────────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if abs(trunk_lean) > 10:
            cues.append(FormCue(
                rule_name="trunk_movement",
                message="Keep torso still -- isolate the pull to shoulders and scapulae",
                severity="warning",
                weight=1.0,
            ))

        return cues


class BandedGluteKickbackRules(ExerciseRuleEngine):
    """Banded glute kickback -- hip extension with band resistance.

    NASM CES: glute activation corrective exercise.
    Key: hip extension only (no lumbar hyperextension), controlled tempo.
    """
    exercise_name = "banded_glute_kickback"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 130.0
    rep_top_threshold = 170.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Lumbar hyperextension (arching back to cheat) ───────────
        if trunk_lean < -8:
            cues.append(FormCue(
                rule_name="back_arch",
                message="Arching back to kick further -- isolate at the hip, keep spine neutral",
                severity="error",
                weight=2.0,
            ))

        # ── Hip rotation ────────────────────────────────────────────
        if len(landmarks) >= 33:
            hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
            if hip_diff > 0.04:
                cues.append(FormCue(
                    rule_name="hip_rotation",
                    message="Hip rotating open -- keep pelvis square, isolate the glute",
                    severity="warning",
                    weight=1.5,
                ))

        return cues


class BandedLateralWalkRules(ExerciseRuleEngine):
    """Banded lateral walk (monster walk / crab walk).

    NASM CES: glute medius activation corrective exercise.
    Key: maintain half-squat position, don't let knees cave, stay low.
    """
    exercise_name = "banded_lateral_walk"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 120.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Stay in athletic position ───────────────────────────────
        if avg_knee > 160:
            cues.append(FormCue(
                rule_name="standing_too_tall",
                message="Stay low -- maintain quarter-squat position throughout",
                severity="warning",
                weight=1.5,
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
                if deviation > 0.04:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee caving -- resist the band, knees out",
                        severity="error",
                        weight=2.0,
                    ))

        return cues


class BandedHipThrustRules(ExerciseRuleEngine):
    """Banded hip thrust -- hip extension with band around knees.

    NASM CES: combined glute max + glute med activation.
    Key: push knees out against band while driving hips up.
    """
    exercise_name = "banded_hip_thrust"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        # ── Full extension ──────────────────────────────────────────
        if avg_hip > 170:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full hip extension with band -- excellent glute activation",
                severity="good",
            ))
        elif avg_hip > 150 and avg_hip <= 160:
            cues.append(FormCue(
                rule_name="incomplete_extension",
                message="Drive hips higher -- squeeze glutes to full lockout",
                severity="warning",
                weight=1.5,
            ))

        # ── Knee valgus against band ────────────────────────────────
        if len(landmarks) >= 33:
            for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
                knee_x = landmarks[knee_idx]["x"]
                ankle_x = landmarks[ankle_idx]["x"]
                if side == "left":
                    deviation = knee_x - ankle_x
                else:
                    deviation = ankle_x - knee_x
                if deviation > 0.04:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee caving into band -- push out to activate glute medius",
                        severity="error",
                        weight=1.5,
                    ))

        return cues


class BandedRowRules(ExerciseRuleEngine):
    """Banded row (standing or seated).

    NASM CES: scapular retraction with accommodating resistance.
    """
    exercise_name = "banded_row"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 90.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean < -10:
            cues.append(FormCue(
                rule_name="lean_back",
                message="Leaning back to pull -- stay upright, pull with back not momentum",
                severity="warning",
                weight=1.5,
            ))

        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.03:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shoulders shrugging -- depress and retract scapulae",
                    severity="warning",
                    weight=1.0,
                ))

        return cues
