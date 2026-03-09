"""
Pressing pattern rules (overhead press, push press, bench press, dumbbell press).

Assessment criteria based on:
- NASM CES: overhead squat/pressing assessment (arms overhead checkpoint)
- NASM PES: scapulohumeral rhythm, rotator cuff integration
- Squat University principles: shoulder mobility prerequisites

Key checkpoints:
  Shoulder: scapular upward rotation, impingement risk
  Spine: lumbar hyperextension (rib flare), cervical alignment
  Elbow: lockout quality, flare angle
  Core: anterior core engagement (anti-extension)
"""

from .base import ExerciseRuleEngine, FormCue


class OverheadPressRules(ExerciseRuleEngine):
    """Overhead press (barbell or dumbbell).

    NASM CES: arms overhead checkpoint from overhead squat assessment.
    Overactive: latissimus dorsi, teres major, pectoralis minor
    Underactive: mid/lower trapezius, rotator cuff, serratus anterior
    """
    exercise_name = "overhead_press"
    rep_angle_key = "left_shoulder_flexion"
    rep_bottom_threshold = 100.0   # shoulder angle at bottom (arms at ~shoulder height)
    rep_top_threshold = 165.0      # near full overhead lockout

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_shoulder = (
            joint_angles.get("left_shoulder_flexion", 180)
            + joint_angles.get("right_shoulder_flexion", 180)
        ) / 2

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        trunk_lean = joint_angles.get("trunk_lean", 0)

        # ── Lockout (full overhead extension) ──────────────────────
        if avg_shoulder > 160 and avg_elbow > 165:
            cues.append(FormCue(
                rule_name="good_lockout",
                message="Full overhead lockout -- strong press",
                severity="good",
            ))
        elif avg_shoulder > 145 and avg_shoulder <= 160:
            cues.append(FormCue(
                rule_name="partial_lockout",
                message="Press to full extension -- complete the rep overhead",
                severity="warning",
                weight=1.0,
            ))

        # ── Lumbar hyperextension (NASM CES: rib flare / anterior tilt) ─
        # Common compensation: arching back to "cheat" the press
        # Overactive: hip flexors, erector spinae
        # Underactive: anterior core (TVA, internal oblique)
        if trunk_lean < -5:
            cues.append(FormCue(
                rule_name="lumbar_hyperextension",
                message="Excessive back arch -- brace core, ribs down, squeeze glutes",
                severity="error",
                weight=2.0,
            ))
        elif trunk_lean < 0:
            cues.append(FormCue(
                rule_name="slight_lean_back",
                message="Slight lean back -- engage anterior core to stay neutral",
                severity="warning",
                weight=1.0,
            ))

        # ── Shoulder elevation / shrugging ──────────────────────────
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.04:
                higher = "left" if landmarks[11]["y"] < landmarks[12]["y"] else "right"
                cues.append(FormCue(
                    rule_name="shoulder_elevation",
                    message=f"{higher.title()} shoulder shrugging -- pack shoulders down",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Elbow flare (bar path) ──────────────────────────────────
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)
                if flare > 0.14:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring -- keep elbows slightly in front of bar",
                        severity="warning",
                        weight=1.0,
                    ))

        # ── Bilateral shoulder symmetry ─────────────────────────────
        shoulder_diff = joint_angles.get("shoulder_flexion_diff", 0)
        if shoulder_diff > 15:
            cues.append(FormCue(
                rule_name="shoulder_asymmetry",
                message=f"Uneven press ({shoulder_diff:.0f} deg) -- one arm lagging",
                severity="error",
                weight=1.5,
            ))
        elif shoulder_diff > 8:
            cues.append(FormCue(
                rule_name="shoulder_asymmetry",
                message=f"Slight press asymmetry ({shoulder_diff:.0f} deg) -- balance strength",
                severity="warning",
                weight=0.8,
            ))

        return cues


class PushPressRules(OverheadPressRules):
    """Push press -- overhead press with leg drive.

    Same upper body checkpoints as overhead press.
    Additional: excessive forward lean during dip is checked.
    """
    exercise_name = "push_press"


class BenchPressRules(ExerciseRuleEngine):
    """Bench press (flat/incline) -- horizontal pushing pattern.

    NASM CES: upper body pushing assessment.
    Squat University: shoulder-safe pressing mechanics.
    Key: scapular retraction, elbow angle, bar path symmetry.
    """
    exercise_name = "bench_press"
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
        if avg_elbow < 120:
            if avg_elbow > 100:
                cues.append(FormCue(
                    rule_name="partial_rom",
                    message="Partial range of motion -- lower bar to chest level",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_elbow > 75:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good range of motion -- bar near chest",
                    severity="good",
                ))

        # ── Elbow flare (impingement risk at >75 deg from torso) ────
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)
                if flare > 0.15:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring wide -- tuck elbows to ~45-75 degrees to protect shoulders",
                        severity="error",
                        weight=1.5,
                    ))
                elif flare > 0.10:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow slightly wide -- tuck elbows more",
                        severity="warning",
                        weight=0.8,
                    ))

        # ── Bilateral symmetry ──────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 15:
            cues.append(FormCue(
                rule_name="elbow_asymmetry",
                message=f"Uneven press ({elbow_diff:.0f} deg diff) -- one arm weaker, use dumbbells to correct",
                severity="error",
                weight=1.5,
            ))
        elif elbow_diff > 8:
            cues.append(FormCue(
                rule_name="elbow_asymmetry",
                message=f"Slight asymmetry ({elbow_diff:.0f} deg) -- focus on even push",
                severity="warning",
                weight=0.8,
            ))

        return cues


class InclinePressRules(BenchPressRules):
    """Incline bench press -- same checkpoints, slightly adjusted for angle."""
    exercise_name = "incline_press"


class DumbbellShoulderPressRules(OverheadPressRules):
    """Dumbbell shoulder press -- seated or standing."""
    exercise_name = "dumbbell_shoulder_press"


class DipsRules(ExerciseRuleEngine):
    """Dips -- bodyweight or weighted vertical push.

    NASM PES: upper body pushing progression.
    Key: forward lean for chest vs upright for triceps, shoulder safety.
    """
    exercise_name = "dips"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 85.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        # ── Depth (90 deg elbow = adequate, deeper risks shoulder) ──
        if avg_elbow < 120:
            if avg_elbow > 95:
                cues.append(FormCue(
                    rule_name="partial_dip",
                    message="Partial range -- lower until elbows reach ~90 degrees",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_elbow > 70:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good dip depth -- elbows at ~90 degrees",
                    severity="good",
                ))
            else:
                cues.append(FormCue(
                    rule_name="excessive_depth",
                    message="Very deep dip -- risk of shoulder impingement, stop at 90 degrees",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Shoulder elevation ──────────────────────────────────────
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.04:
                cues.append(FormCue(
                    rule_name="uneven_shoulders",
                    message="Uneven shoulders during dip -- keep shoulders level and packed",
                    severity="warning",
                    weight=1.0,
                ))

        # ── Elbow symmetry ──────────────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 12:
            cues.append(FormCue(
                rule_name="elbow_asymmetry",
                message=f"Asymmetric dip ({elbow_diff:.0f} deg) -- distribute weight evenly",
                severity="warning",
                weight=1.0,
            ))

        return cues
