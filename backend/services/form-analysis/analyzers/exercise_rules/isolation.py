"""
Isolation exercise rules (bicep curl, tricep extension, lateral raise,
front raise, rear delt fly, calf raise, leg extension, leg curl,
chest fly, shrug).

Assessment criteria based on:
- NASM CES: joint-specific ROM assessment
- NASM PES: isolated muscle activation, tempo control
- Squat University: joint health through controlled isolation work

Key checkpoints for isolation:
  ROM: full range through target joint
  Compensation: momentum/swinging (body english)
  Symmetry: bilateral balance
  Control: eccentric vs concentric tempo
"""

from .base import ExerciseRuleEngine, FormCue


class BicepCurlRules(ExerciseRuleEngine):
    """Bicep curl (barbell, dumbbell, or cable).

    NASM CES: elbow flexion assessment.
    Key: no swinging/momentum, full ROM, elbows pinned to sides.
    """
    exercise_name = "bicep_curl"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 60.0    # elbow fully flexed at top
    rep_top_threshold = 150.0      # arms extended at bottom

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Body swing / momentum (main curl compensation) ──────────
        # Overactive: anterior deltoid, hip flexors
        # Underactive: biceps brachii, brachialis
        if trunk_lean > 15:
            cues.append(FormCue(
                rule_name="body_swing",
                message="Using momentum -- keep torso still, reduce weight if needed",
                severity="error",
                weight=2.0,
            ))
        elif trunk_lean > 8:
            cues.append(FormCue(
                rule_name="slight_swing",
                message="Slight body english -- stabilize torso, brace core",
                severity="warning",
                weight=1.0,
            ))

        # ── Lean back (hyperextension to cheat) ────────────────────
        if trunk_lean < -8:
            cues.append(FormCue(
                rule_name="lean_back",
                message="Leaning back to curl -- use strict form, reduce weight",
                severity="error",
                weight=1.5,
            ))

        # ── Full ROM ───────────────────────────────────────────────
        if avg_elbow < 80:
            if avg_elbow > 55:
                cues.append(FormCue(
                    rule_name="partial_curl",
                    message="Partial curl -- bring all the way up to full bicep contraction",
                    severity="warning",
                    weight=1.0,
                ))
            else:
                cues.append(FormCue(
                    rule_name="full_contraction",
                    message="Full bicep contraction -- good range",
                    severity="good",
                ))

        # ── Bilateral symmetry ──────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 15:
            cues.append(FormCue(
                rule_name="curl_asymmetry",
                message=f"Uneven curl ({elbow_diff:.0f} deg) -- one arm weaker, use unilateral work",
                severity="warning",
                weight=1.0,
            ))

        # ── Elbow drift (elbows should stay pinned to sides) ────────
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                drift = abs(elbow_x - shoulder_x)
                if drift > 0.08:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_drift",
                        message=f"{side.title()} elbow drifting forward -- pin elbows to sides",
                        severity="warning",
                        weight=0.8,
                    ))

        return cues


class HammerCurlRules(BicepCurlRules):
    """Hammer curl (neutral grip) -- same mechanics as bicep curl."""
    exercise_name = "hammer_curl"


class TricepExtensionRules(ExerciseRuleEngine):
    """Tricep extension (overhead, cable pushdown, skull crusher).

    NASM PES: elbow extension isolation.
    Key: elbows stay fixed, full extension, no flaring.
    """
    exercise_name = "tricep_extension"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 70.0
    rep_top_threshold = 150.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        # ── Full extension ──────────────────────────────────────────
        if avg_elbow > 155:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full tricep lockout -- great contraction",
                severity="good",
            ))
        elif avg_elbow > 130 and avg_elbow <= 145:
            cues.append(FormCue(
                rule_name="partial_extension",
                message="Incomplete extension -- extend fully for peak contraction",
                severity="warning",
                weight=1.0,
            ))

        # ── Elbow flare ────────────────────────────────────────────
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)
                if flare > 0.10:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring -- keep elbows close to head/torso",
                        severity="warning",
                        weight=1.0,
                    ))

        # ── Symmetry ───────────────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 12:
            cues.append(FormCue(
                rule_name="asymmetry",
                message=f"Uneven extension ({elbow_diff:.0f} deg) -- balance tricep strength",
                severity="warning",
                weight=1.0,
            ))

        return cues


class TricepPushdownRules(TricepExtensionRules):
    """Tricep pushdown (cable) -- same elbow mechanics."""
    exercise_name = "tricep_pushdown"


class LateralRaiseRules(ExerciseRuleEngine):
    """Lateral raise (dumbbell or cable).

    NASM PES: medial deltoid isolation.
    Key: control the weight, no shrugging, stop at shoulder height.
    """
    exercise_name = "lateral_raise"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 70.0    # arms raised to sides
    rep_top_threshold = 160.0      # arms at sides (rest)

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Momentum / body swing ──────────────────────────────────
        if abs(trunk_lean) > 12:
            cues.append(FormCue(
                rule_name="momentum",
                message="Using momentum -- control the raise, reduce weight if needed",
                severity="warning",
                weight=1.5,
            ))

        # ── Shoulder shrugging (upper trap compensation) ────────────
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.03:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shrugging to lift -- depress shoulders, isolate medial deltoid",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Symmetry ───────────────────────────────────────────────
        shoulder_diff_angle = joint_angles.get("shoulder_flexion_diff", 0)
        if shoulder_diff_angle > 12:
            cues.append(FormCue(
                rule_name="raise_asymmetry",
                message=f"Uneven raise ({shoulder_diff_angle:.0f} deg) -- match both arms",
                severity="warning",
                weight=1.0,
            ))

        return cues


class FrontRaiseRules(LateralRaiseRules):
    """Front raise -- anterior deltoid isolation. Same checkpoints as lateral raise."""
    exercise_name = "front_raise"


class RearDeltFlyRules(ExerciseRuleEngine):
    """Rear delt fly (bent-over or cable).

    NASM CES: posterior shoulder / scapular stabilizer activation.
    Key: maintain hip hinge, no momentum, pinch shoulder blades.
    """
    exercise_name = "rear_delt_fly"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Body position ──────────────────────────────────────────
        if trunk_lean < 20:
            cues.append(FormCue(
                rule_name="too_upright",
                message="Lean forward more -- need ~45 degree torso angle for rear delt targeting",
                severity="warning",
                weight=1.0,
            ))

        # ── Shoulder shrugging ──────────────────────────────────────
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.03:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shrugging -- depress and retract scapulae",
                    severity="warning",
                    weight=1.0,
                ))

        return cues


class CalfRaiseRules(ExerciseRuleEngine):
    """Calf raise (standing or seated).

    NASM CES: ankle plantar flexion assessment.
    Key: full ROM (stretch at bottom, full contraction at top), even weight.
    """
    exercise_name = "calf_raise"
    rep_angle_key = "left_ankle_dorsiflexion"
    rep_bottom_threshold = 70.0    # ankle in dorsiflexion at bottom (stretched)
    rep_top_threshold = 110.0      # plantar flexion at top (raised)

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        # ── Full ROM ───────────────────────────────────────────────
        for side in ["left", "right"]:
            ankle = joint_angles.get(f"{side}_ankle_dorsiflexion", 90)
            if ankle > 100:
                cues.append(FormCue(
                    rule_name=f"{side}_good_extension",
                    message=f"{side.title()} calf -- good plantar flexion at top",
                    severity="good",
                ))

        # ── Knee bend (should stay relatively straight) ─────────────
        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2
        if avg_knee < 155:
            cues.append(FormCue(
                rule_name="knee_bend",
                message="Knees bending -- keep legs straight for full calf engagement",
                severity="warning",
                weight=1.0,
            ))

        # ── Balance (lateral shift) ─────────────────────────────────
        if len(landmarks) >= 33:
            hip_center = (landmarks[23]["x"] + landmarks[24]["x"]) / 2
            ankle_center = (landmarks[27]["x"] + landmarks[28]["x"]) / 2
            shift = abs(hip_center - ankle_center)
            if shift > 0.04:
                cues.append(FormCue(
                    rule_name="lateral_shift",
                    message="Shifting to one side -- distribute weight evenly",
                    severity="warning",
                    weight=0.8,
                ))

        return cues


class LegExtensionRules(ExerciseRuleEngine):
    """Leg extension (machine) -- quadricep isolation.

    NASM PES: quad activation.
    Key: full knee extension at top, controlled eccentric, no jerking.
    """
    exercise_name = "leg_extension"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0   # knees bent (starting position)
    rep_top_threshold = 160.0      # knees extended

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Full extension ──────────────────────────────────────────
        if avg_knee > 165:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full knee extension -- hold for peak contraction",
                severity="good",
            ))
        elif avg_knee > 140 and avg_knee <= 155:
            cues.append(FormCue(
                rule_name="partial_extension",
                message="Extend fully -- don't stop short, complete the rep",
                severity="warning",
                weight=1.0,
            ))

        # ── Asymmetry ──────────────────────────────────────────────
        knee_diff = joint_angles.get("knee_flexion_diff", 0)
        if knee_diff > 12:
            cues.append(FormCue(
                rule_name="asymmetry",
                message=f"Uneven extension ({knee_diff:.0f} deg) -- one quad may be weaker",
                severity="warning",
                weight=1.0,
            ))

        return cues


class LegCurlRules(ExerciseRuleEngine):
    """Leg curl (lying or seated) -- hamstring isolation.

    NASM PES: hamstring activation.
    Key: full flexion, controlled eccentric, no hip lifting.
    """
    exercise_name = "leg_curl"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 60.0    # knees fully bent
    rep_top_threshold = 150.0      # legs extended

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Full contraction ────────────────────────────────────────
        if avg_knee < 65:
            cues.append(FormCue(
                rule_name="full_contraction",
                message="Full hamstring contraction -- excellent range",
                severity="good",
            ))
        elif avg_knee > 80 and avg_knee < 100:
            cues.append(FormCue(
                rule_name="partial_curl",
                message="Curl further -- full hamstring contraction for best activation",
                severity="warning",
                weight=1.0,
            ))

        # ── Hip lift (compensating by lifting hips off pad) ──────────
        if len(landmarks) >= 33:
            hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            if hip_y < shoulder_y - 0.05:
                cues.append(FormCue(
                    rule_name="hip_lift",
                    message="Hips lifting off pad -- reduce weight, control the movement",
                    severity="warning",
                    weight=1.5,
                ))

        # ── Asymmetry ──────────────────────────────────────────────
        knee_diff = joint_angles.get("knee_flexion_diff", 0)
        if knee_diff > 12:
            cues.append(FormCue(
                rule_name="asymmetry",
                message=f"Uneven curl ({knee_diff:.0f} deg) -- balance hamstring strength",
                severity="warning",
                weight=1.0,
            ))

        return cues


class ChestFlyRules(ExerciseRuleEngine):
    """Chest fly (dumbbell or cable).

    NASM PES: pec isolation through horizontal adduction.
    Key: slight elbow bend maintained, controlled eccentric, no excessive stretch.
    """
    exercise_name = "chest_fly"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        # ── Elbow angle (should maintain slight bend, not straight) ─
        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        if avg_elbow > 170:
            cues.append(FormCue(
                rule_name="locked_elbows",
                message="Elbows locked straight -- maintain slight bend to protect joint",
                severity="warning",
                weight=1.5,
            ))

        # ── Symmetry ───────────────────────────────────────────────
        shoulder_diff = joint_angles.get("shoulder_flexion_diff", 0)
        if shoulder_diff > 12:
            cues.append(FormCue(
                rule_name="fly_asymmetry",
                message=f"Uneven fly ({shoulder_diff:.0f} deg) -- match range on both sides",
                severity="warning",
                weight=1.0,
            ))

        return cues


class ShrugRules(ExerciseRuleEngine):
    """Shrug (barbell or dumbbell) -- upper trapezius isolation.

    Key: vertical shoulder elevation, no head forward, no rolling.
    """
    exercise_name = "shrug"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 140.0
    rep_top_threshold = 170.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Shoulder elevation range ────────────────────────────────
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        ear_y = (landmarks[7]["y"] + landmarks[8]["y"]) / 2
        elevation = shoulder_y - ear_y
        if elevation < 0.04:
            cues.append(FormCue(
                rule_name="good_shrug",
                message="Good shoulder elevation -- squeeze at the top",
                severity="good",
            ))

        # ── Head position (don't jut forward) ───────────────────────
        nose_y = landmarks[0]["y"]
        if nose_y > shoulder_y:
            cues.append(FormCue(
                rule_name="head_forward",
                message="Head jutting forward -- keep chin neutral, look straight ahead",
                severity="warning",
                weight=0.8,
            ))

        return cues
