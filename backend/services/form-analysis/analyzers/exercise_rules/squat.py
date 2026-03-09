"""
Squat form rules (bodyweight, goblet, barbell back/front).

Assessment criteria based on:
- NASM Corrective Exercise Specialist (CES) overhead squat assessment
- NASM Performance Enhancement Specialist (PES) movement screening
- Squat University (Dr. Aaron Horschig) biomechanics standards

Key checkpoints (NASM OHS protocol):
  Foot/Ankle: feet turn out, heels rise
  Knee: valgus collapse (medial), excessive forward travel
  LPHC: anterior pelvic tilt, excessive forward lean, lateral shift
  Shoulder: arms fall forward (not applicable without arms overhead)
"""

from .base import ExerciseRuleEngine, FormCue


class SquatRules(ExerciseRuleEngine):
    exercise_name = "squat"
    rep_angle_key = "left_knee_flexion"
    rep_bottom_threshold = 100.0
    rep_top_threshold = 155.0

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_knee = (
            joint_angles.get("left_knee_flexion", 180)
            + joint_angles.get("right_knee_flexion", 180)
        ) / 2

        # ── Depth (Squat University: hip crease below knee = full ROM) ──
        if avg_knee < 130:
            if avg_knee > 110:
                cues.append(FormCue(
                    rule_name="shallow_depth",
                    message="Partial depth -- hip crease should reach knee level or below",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_knee > 90:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good depth -- hip crease at or near knee level",
                    severity="good",
                ))
            else:
                cues.append(FormCue(
                    rule_name="full_depth",
                    message="Full depth -- below parallel",
                    severity="good",
                ))

        # ── LPHC: Forward lean (NASM CES: excessive forward lean) ──────
        # Indicates overactive hip flexors/erector spinae,
        # underactive gluteus maximus/anterior core
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 35:
            cues.append(FormCue(
                rule_name="excessive_forward_lean",
                message="Excessive forward lean -- brace core, drive chest up",
                severity="error",
                weight=2.0,
            ))
        elif trunk_lean > 25:
            cues.append(FormCue(
                rule_name="forward_lean",
                message="Forward lean detected -- engage anterior core",
                severity="warning",
                weight=1.0,
            ))

        # ── Knee: Valgus collapse (NASM CES primary checkpoint) ────────
        # Overactive: adductors, IT band/TFL, lateral gastrocnemius
        # Underactive: gluteus medius/maximus, VMO, medial hamstring
        if len(landmarks) >= 33:
            for side, knee_idx, ankle_idx in [("left", 25, 27), ("right", 26, 28)]:
                knee_x = landmarks[knee_idx]["x"]
                ankle_x = landmarks[ankle_idx]["x"]
                if side == "left":
                    deviation = knee_x - ankle_x
                else:
                    deviation = ankle_x - knee_x

                if deviation > 0.06:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee valgus -- cue 'push knees out over toes'",
                        severity="error",
                        weight=2.0,
                    ))
                elif deviation > 0.03:
                    cues.append(FormCue(
                        rule_name=f"{side}_knee_valgus",
                        message=f"{side.title()} knee tracking medially -- activate glutes",
                        severity="warning",
                        weight=1.0,
                    ))

        # ── Foot/Ankle: Heel rise (NASM CES + Squat University) ────────
        # Overactive: soleus, gastrocnemius, peroneals
        # Underactive: anterior tibialis
        # Squat University: ankle dorsiflexion minimum ~35 degrees needed
        for side in ["left", "right"]:
            ankle_angle = joint_angles.get(f"{side}_ankle_dorsiflexion", 180)
            if ankle_angle < 55:
                cues.append(FormCue(
                    rule_name=f"{side}_heel_rise",
                    message=f"{side.title()} heel rising -- limited ankle dorsiflexion, stretch calves",
                    severity="error",
                    weight=1.5,
                ))
            elif ankle_angle < 70:
                cues.append(FormCue(
                    rule_name=f"{side}_heel_rise",
                    message=f"{side.title()} ankle dorsiflexion restricted -- foam roll calves",
                    severity="warning",
                    weight=0.8,
                ))

        # ── LPHC: Lateral shift (NASM CES) ────────────────────────────
        # Overactive: adductors on shift side, TFL/IT band, QL
        # Underactive: gluteus medius on opposite side
        if len(landmarks) >= 33:
            left_hip_x = landmarks[23]["x"]
            right_hip_x = landmarks[24]["x"]
            left_shoulder_x = landmarks[11]["x"]
            right_shoulder_x = landmarks[12]["x"]
            hip_center = (left_hip_x + right_hip_x) / 2
            shoulder_center = (left_shoulder_x + right_shoulder_x) / 2
            lateral_shift = abs(hip_center - shoulder_center)
            if lateral_shift > 0.04:
                shift_dir = "left" if hip_center < shoulder_center else "right"
                cues.append(FormCue(
                    rule_name="lateral_shift",
                    message=f"Lateral shift {shift_dir} -- strengthen opposite glute medius",
                    severity="warning",
                    weight=1.2,
                ))

        # ── Bilateral knee symmetry ──────────────────────────────────
        # Squat University: >10 degree L/R difference warrants investigation
        knee_diff = joint_angles.get("knee_flexion_diff", 0)
        if knee_diff > 15:
            cues.append(FormCue(
                rule_name="knee_asymmetry",
                message=f"Significant knee asymmetry ({knee_diff:.0f} deg) -- assess single-leg strength",
                severity="error",
                weight=1.5,
            ))
        elif knee_diff > 8:
            cues.append(FormCue(
                rule_name="knee_asymmetry",
                message=f"Knee asymmetry detected ({knee_diff:.0f} deg) -- monitor bilaterally",
                severity="warning",
                weight=0.8,
            ))

        return cues


class GobletSquatRules(SquatRules):
    """Goblet squat -- front-loaded squat with dumbbell/kettlebell.

    NASM CES: same checkpoints as squat. Counterbalance weight
    naturally reduces forward lean, making it a great corrective tool.
    """
    exercise_name = "goblet_squat"


class FrontSquatRules(SquatRules):
    """Front squat -- barbell in front rack position.

    NASM PES: requires more thoracic extension and anterior core.
    More upright torso is expected, so forward lean thresholds are stricter.
    """
    exercise_name = "front_squat"

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = super().evaluate(joint_angles, landmarks)
        trunk_lean = joint_angles.get("trunk_lean", 0)
        if trunk_lean > 25:
            cues = [c for c in cues if c.rule_name not in ("forward_lean", "excessive_forward_lean")]
            cues.append(FormCue(
                rule_name="excessive_forward_lean",
                message="Excessive lean for front squat -- elbows up, chest proud, brace core",
                severity="error",
                weight=2.5,
            ))
        return cues


class OverheadSquatRules(SquatRules):
    """Overhead squat -- the NASM CES gold standard movement assessment.

    Arms overhead amplifies all compensations:
    - Arms fall forward = lat/teres major tightness
    - Forward lean = hip flexor/erector overactivity
    - Knee valgus = adductor/TFL overactivity
    - Heel rise = soleus/gastroc tightness
    """
    exercise_name = "overhead_squat"

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = super().evaluate(joint_angles, landmarks)
        avg_shoulder = (
            joint_angles.get("left_shoulder_flexion", 180)
            + joint_angles.get("right_shoulder_flexion", 180)
        ) / 2
        if avg_shoulder < 140:
            cues.append(FormCue(
                rule_name="arms_fall_forward",
                message="Arms falling forward -- tight lats/pecs, work on thoracic mobility",
                severity="error",
                weight=2.0,
            ))
        elif avg_shoulder < 160:
            cues.append(FormCue(
                rule_name="arms_forward_slight",
                message="Arms not fully overhead -- stretch lats, improve thoracic extension",
                severity="warning",
                weight=1.2,
            ))
        return cues


class SumoSquatRules(SquatRules):
    """Sumo squat -- wide stance, targets adductors and glutes."""
    exercise_name = "sumo_squat"
    rep_bottom_threshold = 95.0


class SplitSquatRules(SquatRules):
    """Split squat -- staggered stance squat (NASM CES single-leg progression)."""
    exercise_name = "split_squat"
