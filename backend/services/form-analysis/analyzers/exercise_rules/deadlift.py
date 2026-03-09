"""
Deadlift form rules (conventional, sumo, RDL).

Assessment criteria based on:
- NASM CES: hip hinge pattern assessment
- NASM PES: posterior chain activation patterns
- Squat University (Dr. Aaron Horschig): deadlift biomechanics
  - Neutral spine maintenance through full ROM
  - Hip hinge dominance (not squat pattern)
  - Bar path analysis (vertical line from lateral view)

Key checkpoints:
  Lumbar spine: rounding (flexion under load), hyperextension at lockout
  Hip hinge: hip-dominant vs knee-dominant pattern
  Lockout: full hip extension without lumbar hyperextension
  Bilateral: hip/shoulder symmetry
"""

from .base import ExerciseRuleEngine, FormCue


class DeadliftRules(ExerciseRuleEngine):
    exercise_name = "deadlift"
    rep_angle_key = "left_hip_flexion"
    rep_bottom_threshold = 90.0
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

        # ── Lumbar spine: rounding (NASM CES + Squat University) ─────
        # Overactive: hamstrings (limiting hip ROM, forcing lumbar flexion)
        # Underactive: erector spinae, multifidus, gluteus maximus
        if avg_hip < 140:
            if trunk_lean > 45:
                cues.append(FormCue(
                    rule_name="back_rounding",
                    message="Lumbar flexion detected -- brace core, maintain neutral spine",
                    severity="error",
                    weight=2.5,
                ))
            elif trunk_lean > 35:
                cues.append(FormCue(
                    rule_name="slight_rounding",
                    message="Slight spinal flexion -- engage lats, chest proud",
                    severity="warning",
                    weight=1.5,
                ))

        # ── Hip hinge quality (NASM PES posterior chain assessment) ───
        if avg_hip < 130 and avg_knee < 100:
            cues.append(FormCue(
                rule_name="squat_pattern",
                message="Excessive knee bend -- hinge at hips, maintain shin angle",
                severity="warning",
                weight=1.5,
            ))

        if avg_hip < 130 and avg_knee > 150:
            cues.append(FormCue(
                rule_name="stiff_leg_pattern",
                message="Knees too straight -- slight knee bend protects low back",
                severity="warning",
                weight=1.0,
            ))

        # ── Lockout (NASM PES: glute activation at terminal hip extension) ─
        if avg_hip > 165 and trunk_lean < 8:
            cues.append(FormCue(
                rule_name="good_lockout",
                message="Full hip extension -- strong glute lockout",
                severity="good",
            ))
        elif avg_hip > 155 and avg_hip <= 165:
            cues.append(FormCue(
                rule_name="incomplete_lockout",
                message="Squeeze glutes to full hip extension at top",
                severity="warning",
                weight=0.8,
            ))

        # ── Bilateral hip symmetry (NASM CES: lateral subsystem) ─────
        hip_diff = joint_angles.get("hip_flexion_diff", 0)
        if hip_diff > 15:
            cues.append(FormCue(
                rule_name="hip_asymmetry",
                message=f"Hip rotation/shift detected ({hip_diff:.0f} deg diff) -- check stance width",
                severity="error",
                weight=1.5,
            ))
        elif hip_diff > 8:
            cues.append(FormCue(
                rule_name="hip_asymmetry",
                message=f"Slight hip asymmetry ({hip_diff:.0f} deg) -- monitor unilateral strength",
                severity="warning",
                weight=0.8,
            ))

        # ── Shoulder position ────────────────────────────────────────
        if len(landmarks) >= 33:
            shoulder_diff = abs(landmarks[11]["y"] - landmarks[12]["y"])
            if shoulder_diff > 0.04:
                higher = "left" if landmarks[11]["y"] < landmarks[12]["y"] else "right"
                cues.append(FormCue(
                    rule_name="uneven_shoulders",
                    message=f"{higher.title()} shoulder higher -- maintain level bar/shoulders",
                    severity="warning",
                    weight=1.0,
                ))

        return cues


class SumoDeadliftRules(DeadliftRules):
    """Sumo deadlift -- wide stance, upright torso, hip-dominant.

    NASM PES: wider base of support, more adductor/glute demand.
    Squat University: knee tracking over toes critical in wide stance.
    """
    exercise_name = "sumo_deadlift"

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = super().evaluate(joint_angles, landmarks)

        # ── Knee valgus (critical in wide stance) ───────────────────
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
                        message=f"{side.title()} knee caving -- push knees out in line with toes",
                        severity="error",
                        weight=2.0,
                    ))

        return cues
