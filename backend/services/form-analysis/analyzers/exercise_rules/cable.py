"""
Cable machine exercise rules (cable crossover, cable woodchop, cable kickback,
cable lateral raise, cable curl, cable tricep extension).

Assessment criteria based on:
- NASM CES: functional movement patterns with constant tension
- NASM PES: multi-planar movement training

Cable exercises provide constant tension throughout ROM.
Key: control the eccentric, don't let the weight stack pull you.
"""

from .base import ExerciseRuleEngine, FormCue


class CableCrossoverRules(ExerciseRuleEngine):
    """Cable crossover / cable fly.

    NASM PES: pec activation through horizontal adduction with constant tension.
    Key: slight lean, slight elbow bend, controlled tempo.
    """
    exercise_name = "cable_crossover"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        # ── Elbow angle (should maintain slight bend) ───────────────
        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2
        if avg_elbow > 170:
            cues.append(FormCue(
                rule_name="locked_elbows",
                message="Elbows locked -- maintain slight bend throughout for joint safety",
                severity="warning",
                weight=1.0,
            ))

        # ── Body lean / momentum ────────────────────────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 25:
            cues.append(FormCue(
                rule_name="excessive_lean",
                message="Too much lean -- use less weight, control the movement",
                severity="warning",
                weight=1.5,
            ))

        # ── Symmetry ───────────────────────────────────────────────
        shoulder_diff = joint_angles.get("shoulder_flexion_diff", 0)
        if shoulder_diff > 12:
            cues.append(FormCue(
                rule_name="asymmetry",
                message=f"Uneven crossover ({shoulder_diff:.0f} deg) -- match range both sides",
                severity="warning",
                weight=1.0,
            ))

        return cues


class CableWoodchopRules(ExerciseRuleEngine):
    """Cable woodchop (high-to-low or low-to-high).

    NASM PES: rotational power through transverse plane.
    Key: rotate through thoracic spine, anti-rotation at lumbar,
    arms stay relatively straight (power from hips/core).
    """
    exercise_name = "cable_woodchop"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip rotation (power should come from hips) ──────────────
        hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
        if hip_diff > 0.06:
            cues.append(FormCue(
                rule_name="good_hip_rotation",
                message="Good hip engagement -- driving rotation from hips and core",
                severity="good",
            ))

        # ── Shoulder level ──────────────────────────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.06:
            cues.append(FormCue(
                rule_name="uneven_shoulders",
                message="Control the rotation -- don't let shoulders collapse asymmetrically",
                severity="warning",
                weight=1.0,
            ))

        return cues


class CableKickbackRules(ExerciseRuleEngine):
    """Cable glute kickback.

    NASM CES: glute activation with constant tension.
    Key: hip extension only, no lumbar hyperextension, controlled tempo.
    """
    exercise_name = "cable_kickback"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 130.0
    rep_top_threshold = 170.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        if trunk_lean < -8:
            cues.append(FormCue(
                rule_name="back_arch",
                message="Arching back -- keep spine neutral, extend from the hip only",
                severity="error",
                weight=2.0,
            ))

        if len(landmarks) >= 33:
            hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
            if hip_diff > 0.04:
                cues.append(FormCue(
                    rule_name="hip_rotation",
                    message="Hip rotating open -- keep pelvis square to cable machine",
                    severity="warning",
                    weight=1.5,
                ))

        return cues


class CableLateralRaiseRules(ExerciseRuleEngine):
    """Cable lateral raise -- medial deltoid with constant tension.

    Same mechanics as dumbbell lateral raise but with ascending resistance.
    """
    exercise_name = "cable_lateral_raise"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 70.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)
        if abs(trunk_lean) > 12:
            cues.append(FormCue(
                rule_name="momentum",
                message="Using body momentum -- control the raise, reduce weight",
                severity="warning",
                weight=1.5,
            ))

        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.03:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shrugging -- depress shoulders, isolate medial deltoid",
                    severity="warning",
                    weight=1.2,
                ))

        return cues


class CableCurlRules(ExerciseRuleEngine):
    """Cable bicep curl -- constant tension through full ROM.

    Same biomechanics as dumbbell curl but tension maintained at top.
    """
    exercise_name = "cable_curl"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 60.0
    rep_top_threshold = 150.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        if abs(trunk_lean) > 12:
            cues.append(FormCue(
                rule_name="body_swing",
                message="Body swinging -- stand tall, isolate the biceps",
                severity="warning",
                weight=1.5,
            ))

        return cues


class CableTricepExtensionRules(ExerciseRuleEngine):
    """Cable tricep pushdown / overhead extension.

    NASM PES: tricep isolation with constant tension.
    Key: elbows pinned, full extension, no lean.
    """
    exercise_name = "cable_tricep_extension"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 70.0
    rep_top_threshold = 150.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        if avg_elbow > 155:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full tricep lockout -- good contraction",
                severity="good",
            ))

        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 20:
            cues.append(FormCue(
                rule_name="leaning_over",
                message="Leaning forward to push -- stand upright, isolate triceps",
                severity="warning",
                weight=1.2,
            ))

        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)
                if flare > 0.10:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring -- pin elbows to sides",
                        severity="warning",
                        weight=1.0,
                    ))

        return cues


class CablePullThroughRules(ExerciseRuleEngine):
    """Cable pull-through -- hip hinge with cable between legs.

    NASM CES: hip hinge corrective exercise.
    Key: hip-dominant pattern, squeeze glutes at top, neutral spine.
    """
    exercise_name = "cable_pull_through"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Back rounding ───────────────────────────────────────────
        if avg_hip < 130 and trunk_lean > 45:
            cues.append(FormCue(
                rule_name="back_rounding",
                message="Back rounding -- maintain neutral spine through the hinge",
                severity="error",
                weight=2.0,
            ))

        # ── Lockout ─────────────────────────────────────────────────
        if avg_hip > 165 and trunk_lean < 8:
            cues.append(FormCue(
                rule_name="good_lockout",
                message="Full hip extension -- strong glute squeeze at top",
                severity="good",
            ))

        return cues
