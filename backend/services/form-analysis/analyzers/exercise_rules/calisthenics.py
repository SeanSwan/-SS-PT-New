"""
Bodyweight calisthenics exercise rules (burpee, jump squat, box jump,
bear crawl, pike push-up, handstand push-up, pistol squat, muscle-up,
wall sit, hollow body hold, superman, inverted row).

Assessment criteria based on:
- NASM CES: bodyweight movement assessment
- NASM PES: plyometric and bodyweight power development
- Squat University: landing mechanics, single-leg stability

Key checkpoints:
  Landing: soft knees, no valgus, controlled deceleration
  Spine: neutral throughout dynamic movements
  Core: anti-extension, anti-rotation under bodyweight
"""

from .base import ExerciseRuleEngine, FormCue


class BurpeeRules(ExerciseRuleEngine):
    """Burpee -- full body plyometric.

    NASM PES: integrated plyometric training.
    Key: controlled landing, maintain plank in bottom position, no hip sag.
    """
    exercise_name = "burpee"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 165.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip sag in plank phase ──────────────────────────────────
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2
        expected_hip = (shoulder_y + ankle_y) / 2
        sag = hip_y - expected_hip

        if sag > 0.05:
            cues.append(FormCue(
                rule_name="hip_sag",
                message="Hips sagging in plank position -- brace core even during burpees",
                severity="error",
                weight=1.5,
            ))

        # ── Knee valgus on landing ──────────────────────────────────
        for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
            knee_x = landmarks[knee_idx]["x"]
            ankle_x = landmarks[ankle_idx]["x"]
            if side == "left":
                deviation = knee_x - ankle_x
            else:
                deviation = ankle_x - knee_x
            if deviation > 0.05:
                cues.append(FormCue(
                    rule_name=f"{side}_knee_valgus_landing",
                    message=f"{side.title()} knee caving on landing -- absorb impact with knees tracking over toes",
                    severity="error",
                    weight=2.0,
                ))

        return cues


class JumpSquatRules(ExerciseRuleEngine):
    """Jump squat -- plyometric squat.

    NASM PES: lower body reactive power.
    Key: soft landing with knees tracking over toes, full depth before jump.
    """
    exercise_name = "jump_squat"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Depth before jump ──────────────────────────────────────
        if avg_knee < 130 and avg_knee > 115:
            cues.append(FormCue(
                rule_name="shallow_squat",
                message="Deeper squat before jump -- load the legs more for explosive power",
                severity="warning",
                weight=1.0,
            ))

        # ── Knee valgus on landing ──────────────────────────────────
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
                        rule_name=f"{side}_valgus_landing",
                        message=f"{side.title()} knee caving on landing -- land softly with knees out",
                        severity="error",
                        weight=2.5,
                    ))

        # ── Forward lean ────────────────────────────────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 30:
            cues.append(FormCue(
                rule_name="forward_lean",
                message="Forward lean -- chest up, drive through heels",
                severity="warning",
                weight=1.5,
            ))

        return cues


class BoxJumpRules(JumpSquatRules):
    """Box jump -- same landing mechanics as jump squat.

    NASM PES: reactive plyometric power.
    Key: land softly on box, absorb impact, step down (don't jump down).
    """
    exercise_name = "box_jump"


class PistolSquatRules(ExerciseRuleEngine):
    """Pistol squat (single-leg squat).

    NASM CES: advanced single-leg assessment.
    Maximum demand on single-leg stability, balance, and ankle mobility.
    """
    exercise_name = "pistol_squat"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Depth ──────────────────────────────────────────────────
        if avg_knee < 90:
            cues.append(FormCue(
                rule_name="full_depth",
                message="Full pistol squat depth -- excellent single-leg strength and mobility",
                severity="good",
            ))

        # ── Knee valgus (critical on single leg) ────────────────────
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
                        message=f"{side.title()} knee caving -- push knee over toes, strengthen glute medius",
                        severity="error",
                        weight=2.5,
                    ))

        # ── Forward lean ────────────────────────────────────────────
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 35:
            cues.append(FormCue(
                rule_name="excessive_lean",
                message="Excessive forward lean -- work on ankle mobility and core strength",
                severity="warning",
                weight=1.5,
            ))

        # ── Heel rise ──────────────────────────────────────────────
        for side in ["left", "right"]:
            ankle = joint_angles.get(f"{side}_ankle_dorsiflexion", 180)
            if ankle < 55:
                cues.append(FormCue(
                    rule_name=f"{side}_heel_rise",
                    message=f"{side.title()} heel rising -- limited ankle mobility",
                    severity="error",
                    weight=1.5,
                ))

        return cues


class PikePushUpRules(ExerciseRuleEngine):
    """Pike push-up -- overhead pressing alternative using bodyweight.

    NASM PES: vertical pushing without equipment.
    Key: maintain pike position, controlled descent, elbows track back.
    """
    exercise_name = "pike_pushup"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        # ── Depth ──────────────────────────────────────────────────
        if avg_elbow < 120 and avg_elbow > 100:
            cues.append(FormCue(
                rule_name="partial_rep",
                message="Partial range -- lower head toward floor for full ROM",
                severity="warning",
                weight=1.5,
            ))

        # ── Elbow flare ─────────────────────────────────────────────
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)
                if flare > 0.12:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring -- tuck elbows to protect shoulders",
                        severity="warning",
                        weight=1.2,
                    ))

        return cues


class WallSitRules(ExerciseRuleEngine):
    """Wall sit -- isometric quad and glute hold.

    NASM CES: isometric strengthening for quad endurance.
    Key: 90-degree knee angle, back flat against wall, don't slide.
    """
    exercise_name = "wall_sit"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Target angle (90 degrees ideal) ─────────────────────────
        if avg_knee > 110:
            cues.append(FormCue(
                rule_name="too_high",
                message="Slide lower -- aim for 90-degree knee angle (thighs parallel to floor)",
                severity="warning",
                weight=1.5,
            ))
        elif avg_knee > 85 and avg_knee <= 95:
            cues.append(FormCue(
                rule_name="good_position",
                message="Great wall sit position -- hold it!",
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
                if deviation > 0.04:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee caving -- push out, track over toes",
                        severity="warning",
                        weight=1.5,
                    ))

        return cues


class HollowBodyHoldRules(ExerciseRuleEngine):
    """Hollow body hold -- anti-extension core exercise.

    NASM CES: core stabilization in supine position.
    Key: low back pressed to floor, legs and arms elevated, no arch.
    """
    exercise_name = "hollow_body_hold"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 140.0
    rep_top_threshold = 175.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Low back position ───────────────────────────────────────
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        arch = shoulder_y - hip_y
        if arch > 0.05:
            cues.append(FormCue(
                rule_name="back_arching",
                message="Low back arching -- press spine into floor, tuck pelvis",
                severity="error",
                weight=2.0,
            ))

        return cues


class SupermanRules(ExerciseRuleEngine):
    """Superman hold/raise -- prone back extension.

    NASM CES: posterior chain activation (erector spinae, glutes).
    Key: controlled extension, don't hyperextend neck, lift arms and legs.
    """
    exercise_name = "superman"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 155.0
    rep_top_threshold = 175.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Hyperextension ──────────────────────────────────────────
        if trunk_lean < -15:
            cues.append(FormCue(
                rule_name="hyperextension",
                message="Excessive extension -- lift just to neutral, don't crank the low back",
                severity="warning",
                weight=1.5,
            ))

        # ── Head position ───────────────────────────────────────────
        if len(landmarks) >= 33:
            nose_y = landmarks[0]["y"]
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            if shoulder_y - nose_y > 0.06:
                cues.append(FormCue(
                    rule_name="head_crane",
                    message="Don't crank neck up -- keep head neutral, look at floor",
                    severity="warning",
                    weight=0.8,
                ))

        return cues


class InvertedRowRules(ExerciseRuleEngine):
    """Inverted row (bodyweight row under a bar).

    NASM PES: horizontal pull using bodyweight.
    Key: maintain plank from heels to head, full scapular retraction.
    """
    exercise_name = "inverted_row"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Body alignment (should be straight like a plank) ────────
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2
        expected_hip = (shoulder_y + ankle_y) / 2
        sag = hip_y - expected_hip

        if sag > 0.04:
            cues.append(FormCue(
                rule_name="hip_sag",
                message="Hips sagging -- maintain straight line from head to heels",
                severity="error",
                weight=1.5,
            ))
        elif sag < -0.04:
            cues.append(FormCue(
                rule_name="hip_pike",
                message="Hips piking -- lower hips to align body in straight line",
                severity="warning",
                weight=1.0,
            ))

        # ── Shoulder shrugging ──────────────────────────────────────
        shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
        if shoulder_diff > 0.03:
            cues.append(FormCue(
                rule_name="shoulder_shrug",
                message="Shrugging -- depress shoulders, pull with lats",
                severity="warning",
                weight=1.0,
            ))

        return cues


class BearCrawlRules(ExerciseRuleEngine):
    """Bear crawl -- quadruped movement pattern.

    NASM PES: contralateral movement, core stability under locomotion.
    Key: keep hips low and level, maintain neutral spine.
    """
    exercise_name = "bear_crawl"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 80.0
    rep_top_threshold = 120.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        if len(landmarks) < 33:
            return cues

        # ── Hip height (should stay low) ────────────────────────────
        hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
        shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
        if hip_y < shoulder_y - 0.05:
            cues.append(FormCue(
                rule_name="hips_too_high",
                message="Hips too high -- keep hips at shoulder level for proper crawl",
                severity="warning",
                weight=1.5,
            ))

        # ── Hip level (no rocking side to side) ─────────────────────
        hip_diff = abs(landmarks[23]["y"] - landmarks[24]["y"])
        if hip_diff > 0.04:
            cues.append(FormCue(
                rule_name="hip_rocking",
                message="Hips rocking side to side -- engage core to stabilize pelvis",
                severity="warning",
                weight=1.2,
            ))

        return cues
