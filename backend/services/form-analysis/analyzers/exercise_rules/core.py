"""
Core exercise rules (plank, dead bug, crunch, Russian twist, mountain climber,
leg raise, wood chop, pallof press).

Assessment criteria based on:
- NASM CES: core stabilization assessment (drawing-in maneuver)
- NASM PES: core power and anti-movement patterns
- Squat University: spinal stability under load principles

Key checkpoints:
  Anti-extension: plank position, no lumbar sag or pike
  Anti-rotation: resist rotational forces (pallof, wood chop)
  Anti-lateral flexion: side plank, farmer carry
  Spinal alignment: neutral cervical, thoracic, lumbar
"""

from .base import ExerciseRuleEngine, FormCue


class PlankRules(ExerciseRuleEngine):
    """Plank (forearm or high plank) -- isometric core stabilization.

    NASM CES: core stability assessment baseline.
    Key: shoulder-hip-ankle alignment, no sag or pike.
    Note: Plank is isometric -- rep counter will detect hold duration rather than reps.
    """
    exercise_name = "plank"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 140.0  # slight hip flexion during hold
    rep_top_threshold = 175.0     # full extension = rest position

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip sag (anterior pelvic tilt in plank) ─────────────────
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2

        expected_hip_y = (shoulder_y + ankle_y) / 2
        sag = hip_y - expected_hip_y

        if sag > 0.05:
            cues.append(FormCue(
                rule_name="hip_sag",
                message="Hips sagging -- squeeze glutes, brace core, posterior pelvic tilt",
                severity="error",
                weight=2.0,
            ))
        elif sag > 0.025:
            cues.append(FormCue(
                rule_name="slight_sag",
                message="Slight hip drop -- tighten core, think about pulling belly button to spine",
                severity="warning",
                weight=1.0,
            ))

        # ── Hip pike ────────────────────────────────────────────────
        if sag < -0.04:
            cues.append(FormCue(
                rule_name="hip_pike",
                message="Hips too high -- lower to align shoulders, hips, and ankles",
                severity="warning",
                weight=1.0,
            ))

        # ── Head position ───────────────────────────────────────────
        nose_y = landmarks[0]["y"]
        if nose_y - shoulder_y > 0.06:
            cues.append(FormCue(
                rule_name="head_drop",
                message="Head dropping -- maintain neutral neck, look slightly ahead",
                severity="warning",
                weight=0.8,
            ))
        elif shoulder_y - nose_y > 0.06:
            cues.append(FormCue(
                rule_name="head_crane",
                message="Head craning up -- tuck chin, neutral cervical spine",
                severity="warning",
                weight=0.8,
            ))

        # ── Shoulder alignment (should be level) ────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.03:
            cues.append(FormCue(
                rule_name="uneven_shoulders",
                message="Uneven shoulders -- distribute weight evenly through both arms",
                severity="warning",
                weight=0.8,
            ))

        return cues


class SidePlankRules(ExerciseRuleEngine):
    """Side plank -- anti-lateral flexion.

    NASM CES: lateral subsystem assessment.
    Key: hip elevation, straight line from head to feet.
    """
    exercise_name = "side_plank"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 150.0
    rep_top_threshold = 175.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip drop (lateral sag) ──────────────────────────────────
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2

        expected_hip = (shoulder_y + ankle_y) / 2
        hip_drop = hip_y - expected_hip

        if hip_drop > 0.04:
            cues.append(FormCue(
                rule_name="hip_drop",
                message="Hip dropping -- lift hips to align with shoulders and ankles",
                severity="error",
                weight=2.0,
            ))
        elif hip_drop > 0.02:
            cues.append(FormCue(
                rule_name="slight_hip_drop",
                message="Slight hip drop -- engage obliques to maintain alignment",
                severity="warning",
                weight=1.0,
            ))

        return cues


class DeadBugRules(ExerciseRuleEngine):
    """Dead bug -- supine anti-extension core exercise.

    NASM CES: core activation assessment (TVA + internal obliques).
    Key: maintain low back pressed to floor, no lumbar extension.
    """
    exercise_name = "dead_bug"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 110.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Low back position (spine should stay flat) ──────────────
        # Detected via hip position relative to shoulder/ankle line
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2

        # In dead bug (supine), if hip lifts = back arching
        arch = shoulder_y - hip_y
        if arch > 0.06:
            cues.append(FormCue(
                rule_name="back_arching",
                message="Low back arching off floor -- brace core, press spine into ground",
                severity="error",
                weight=2.0,
            ))
        elif arch > 0.03:
            cues.append(FormCue(
                rule_name="slight_arch",
                message="Maintain flat back -- exhale and press low back down",
                severity="warning",
                weight=1.0,
            ))

        # ── Movement symmetry ──────────────────────────────────────
        knee_diff = joint_angles.get("knee_flexion_diff", 0)
        if knee_diff > 15:
            cues.append(FormCue(
                rule_name="asymmetry",
                message=f"Uneven leg movement ({knee_diff:.0f} deg) -- match range on both sides",
                severity="warning",
                weight=1.0,
            ))

        return cues


class CrunchRules(ExerciseRuleEngine):
    """Crunch / sit-up -- spinal flexion core exercise.

    NASM note: crunches are spinal flexion -- contraindicated for some.
    Key: control the movement, don't use momentum, protect cervical spine.
    """
    exercise_name = "crunch"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 130.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Head/neck position ──────────────────────────────────────
        nose_y = landmarks[0]["y"]
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2

        # If pulling on neck (hands behind head yanking forward)
        if nose_y < shoulder_y - 0.08:
            cues.append(FormCue(
                rule_name="neck_pull",
                message="Don't pull on neck -- hands support head lightly, curl with abs",
                severity="error",
                weight=1.5,
            ))

        return cues


class RussianTwistRules(ExerciseRuleEngine):
    """Russian twist -- rotational core exercise.

    NASM PES: rotational power development.
    Key: rotation through thoracic spine (not lumbar), controlled tempo.
    """
    exercise_name = "russian_twist"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Shoulder level during rotation ──────────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.05:
            cues.append(FormCue(
                rule_name="uneven_rotation",
                message="Uneven rotation -- rotate evenly to both sides through thoracic spine",
                severity="warning",
                weight=1.0,
            ))

        return cues


class MountainClimberRules(PlankRules):
    """Mountain climber -- dynamic plank with knee drives.

    NASM PES: core stability under dynamic load.
    Uses plank checkpoints as base (hip sag is main compensation).
    """
    exercise_name = "mountain_climber"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 90.0
    rep_top_threshold = 155.0


class LegRaiseRules(ExerciseRuleEngine):
    """Hanging or lying leg raise.

    NASM: hip flexion with core stabilization.
    Key: control eccentric, don't swing, maintain low back position.
    """
    exercise_name = "leg_raise"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_hip = (
            joint_angles.get("left_hip_flexion", 180)
            + joint_angles.get("right_hip_flexion", 180)
        ) / 2

        # ── ROM ────────────────────────────────────────────────────
        if avg_hip < 130:
            if avg_hip > 100:
                cues.append(FormCue(
                    rule_name="partial_raise",
                    message="Partial range -- raise legs higher (aim for 90 degrees)",
                    severity="warning",
                    weight=1.0,
                ))
            else:
                cues.append(FormCue(
                    rule_name="good_rom",
                    message="Good leg raise range of motion",
                    severity="good",
                ))

        # ── Leg symmetry ───────────────────────────────────────────
        hip_diff = joint_angles.get("hip_flexion_diff", 0)
        if hip_diff > 10:
            cues.append(FormCue(
                rule_name="leg_asymmetry",
                message=f"Uneven leg raise ({hip_diff:.0f} deg) -- keep legs together",
                severity="warning",
                weight=1.0,
            ))

        return cues
