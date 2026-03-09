"""
Pulling pattern rules (bent-over row, pull-up, chin-up, lat pulldown, cable row, face pull).

Assessment criteria based on:
- NASM CES: upper body pulling assessment, scapular stabilization
- NASM PES: scapulohumeral rhythm, posterior chain integration
- Squat University: shoulder health through balanced push/pull

Key checkpoints:
  Scapular: retraction and depression (not elevation/protraction)
  Spine: neutral lumbar during bent-over movements
  Elbow: tracking (bicep vs back engagement)
  Bilateral: symmetry in pulling strength
"""

from .base import ExerciseRuleEngine, FormCue


class BentOverRowRules(ExerciseRuleEngine):
    """Bent-over row (barbell or dumbbell).

    NASM CES: pulling pattern, scapular retraction assessment.
    Key: maintain hip hinge, pull to lower chest, elbows close.
    """
    exercise_name = "bent_over_row"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 100.0   # elbows bent at top of pull
    rep_top_threshold = 160.0      # arms extended at bottom

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Back position (must maintain hip hinge throughout) ──────
        if trunk_lean > 55:
            cues.append(FormCue(
                rule_name="back_rounding",
                message="Back rounding -- maintain neutral spine, brace core throughout row",
                severity="error",
                weight=2.0,
            ))
        elif trunk_lean < 20:
            cues.append(FormCue(
                rule_name="too_upright",
                message="Too upright -- lean forward more for proper row angle (~45 degrees)",
                severity="warning",
                weight=1.0,
            ))

        # ── Pull height (full ROM) ─────────────────────────────────
        if avg_elbow < 120:
            if avg_elbow > 100:
                cues.append(FormCue(
                    rule_name="partial_pull",
                    message="Partial row -- pull bar/dumbbells to lower chest/hip",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_elbow > 70:
                cues.append(FormCue(
                    rule_name="good_pull",
                    message="Good row depth -- full scapular retraction",
                    severity="good",
                ))

        # ── Shoulder elevation (shrugging = upper trap dominance) ───
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.04:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shoulder shrugging -- depress shoulders, drive elbows back not up",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Bilateral symmetry ──────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 15:
            cues.append(FormCue(
                rule_name="row_asymmetry",
                message=f"Uneven row ({elbow_diff:.0f} deg) -- one side pulling harder",
                severity="error",
                weight=1.5,
            ))
        elif elbow_diff > 8:
            cues.append(FormCue(
                rule_name="row_asymmetry",
                message=f"Slight row asymmetry ({elbow_diff:.0f} deg) -- balance pull",
                severity="warning",
                weight=0.8,
            ))

        return cues


class SingleArmRowRules(BentOverRowRules):
    """Single-arm dumbbell row -- unilateral pulling."""
    exercise_name = "single_arm_row"


class PullUpRules(ExerciseRuleEngine):
    """Pull-up (overhand) and chin-up (underhand).

    NASM CES: upper body pulling, lat activation vs bicep dominance.
    NASM PES: scapulohumeral rhythm in vertical pulling.
    """
    exercise_name = "pull_up"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 80.0    # elbows bent at top (chin over bar)
    rep_top_threshold = 155.0      # arms extended at bottom (dead hang)

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        avg_shoulder = (
            joint_angles.get("left_shoulder_flexion", 180)
            + joint_angles.get("right_shoulder_flexion", 180)
        ) / 2

        # ── Full ROM top (chin above bar level) ────────────────────
        if avg_elbow < 100:
            if avg_elbow > 80:
                cues.append(FormCue(
                    rule_name="partial_pull",
                    message="Partial pull-up -- drive chin above the bar",
                    severity="warning",
                    weight=1.5,
                ))
            else:
                cues.append(FormCue(
                    rule_name="full_pull",
                    message="Full pull-up -- chin above bar, great ROM",
                    severity="good",
                ))

        # ── Full ROM bottom (dead hang with active shoulders) ───────
        if avg_elbow > 165 and avg_shoulder > 165:
            cues.append(FormCue(
                rule_name="full_extension",
                message="Full extension at bottom -- good ROM",
                severity="good",
            ))

        # ── Shoulder shrugging (upper trap dominance) ───────────────
        if len(landmarks) >= 33:
            # During pull, shoulders should stay depressed
            nose_y = landmarks[0]["y"]
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            if abs(nose_y - shoulder_y) < 0.03 and avg_elbow < 100:
                cues.append(FormCue(
                    rule_name="shoulder_shrug",
                    message="Shoulders shrugging to ears -- pull with lats, depress shoulders",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Bilateral symmetry ──────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 12:
            cues.append(FormCue(
                rule_name="pull_asymmetry",
                message=f"Uneven pull ({elbow_diff:.0f} deg) -- one arm dominant",
                severity="warning",
                weight=1.2,
            ))

        return cues


class ChinUpRules(PullUpRules):
    """Chin-up (underhand grip) -- same checkpoints as pull-up."""
    exercise_name = "chin_up"


class LatPulldownRules(PullUpRules):
    """Lat pulldown -- cable vertical pull.

    Same movement pattern as pull-up with machine assistance.
    Additional check: leaning too far back.
    """
    exercise_name = "lat_pulldown"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = super().evaluate(joint_angles, landmarks)

        trunk_lean = joint_angles.get("trunk_lean", 0)
        # Slight lean back is OK (~10-15 deg), excessive is cheating
        if trunk_lean < -15:
            cues.append(FormCue(
                rule_name="excessive_lean_back",
                message="Leaning too far back -- slight lean is OK, but you're using momentum",
                severity="warning",
                weight=1.5,
            ))

        return cues


class CableRowRules(BentOverRowRules):
    """Seated cable row -- horizontal pull, seated.

    NASM PES: scapular retraction with stable base.
    Key: upright posture, full scapular retraction, controlled eccentric.
    """
    exercise_name = "cable_row"
    rep_bottom_threshold = 95.0
    rep_top_threshold = 160.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Posture (should be mostly upright, slight lean OK) ──────
        if trunk_lean > 25:
            cues.append(FormCue(
                rule_name="rounding_forward",
                message="Rounding forward -- sit tall, maintain upright posture",
                severity="warning",
                weight=1.5,
            ))
        elif trunk_lean < -10:
            cues.append(FormCue(
                rule_name="leaning_back",
                message="Leaning too far back -- using momentum, reduce weight",
                severity="warning",
                weight=1.2,
            ))

        # ── Full contraction ────────────────────────────────────────
        if avg_elbow < 110 and avg_elbow > 70:
            cues.append(FormCue(
                rule_name="good_contraction",
                message="Good retraction -- squeeze shoulder blades together",
                severity="good",
            ))
        elif avg_elbow > 120:
            cues.append(FormCue(
                rule_name="partial_pull",
                message="Pull further -- drive elbows back, squeeze shoulder blades",
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
                rule_name="row_asymmetry",
                message=f"Uneven row ({elbow_diff:.0f} deg) -- balance pull evenly",
                severity="warning",
                weight=1.0,
            ))

        return cues


class FacePullRules(ExerciseRuleEngine):
    """Face pull -- external rotation + scapular retraction.

    NASM CES: rotator cuff activation, posterior shoulder health.
    Key: pull to face level, elbows high, external rotation at end.
    """
    exercise_name = "face_pull"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        # ── Pull height ────────────────────────────────────────────
        if len(landmarks) >= 33:
            # Hands should come to face level (wrist near nose height)
            wrist_y = (landmarks[15]["y"] + landmarks[16]["y"]) / 2
            nose_y = landmarks[0]["y"]
            if avg_elbow < 100:
                height_diff = abs(wrist_y - nose_y)
                if height_diff < 0.06:
                    cues.append(FormCue(
                        rule_name="good_height",
                        message="Good pull height -- hands at face level",
                        severity="good",
                    ))
                elif wrist_y > nose_y + 0.08:
                    cues.append(FormCue(
                        rule_name="pull_too_low",
                        message="Pull higher -- bring hands to face/forehead level",
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
                message=f"Uneven face pull ({elbow_diff:.0f} deg) -- pull both sides equally",
                severity="warning",
                weight=1.0,
            ))

        return cues
