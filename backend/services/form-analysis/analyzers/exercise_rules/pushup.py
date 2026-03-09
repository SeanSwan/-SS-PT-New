"""
Push-up form rules.

Assessment criteria based on:
- NASM CES: upper body pushing pattern assessment
- NASM PES: scapular stability and core integration
- Squat University principles applied to upper body:
  - Maintain neutral spine (no sagging or piking)
  - Elbow angle and flare control
  - Full ROM (chest to floor, full lockout)

Key checkpoints:
  Core/LPHC: hip sag (anterior tilt), piking (hip flexion)
  Shoulder: elbow flare angle, scapular winging
  Depth: elbow angle at bottom
  Head: cervical alignment
"""

from .base import ExerciseRuleEngine, FormCue


class PushupRules(ExerciseRuleEngine):
    exercise_name = "pushup"
    rep_angle_key = "left_elbow_flexion"
    rep_bottom_threshold = 90.0   # elbow angle at bottom
    rep_top_threshold = 155.0     # near full extension at top

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []

        avg_elbow = (
            joint_angles.get("left_elbow_flexion", 180)
            + joint_angles.get("right_elbow_flexion", 180)
        ) / 2

        # ── Depth (NASM: full ROM for optimal muscle activation) ─────
        if avg_elbow < 140:  # user is in the descent
            if avg_elbow > 110:
                cues.append(FormCue(
                    rule_name="shallow_pushup",
                    message="Partial range -- lower until elbows reach 90 degrees",
                    severity="warning",
                    weight=1.5,
                ))
            elif avg_elbow > 80:
                cues.append(FormCue(
                    rule_name="good_depth",
                    message="Good depth -- elbows at ~90 degrees",
                    severity="good",
                ))
            else:
                cues.append(FormCue(
                    rule_name="full_depth",
                    message="Full range of motion -- excellent depth",
                    severity="good",
                ))

        # ── Core: Hip sag (NASM CES: anterior pelvic tilt pattern) ───
        # Overactive: hip flexors, erector spinae
        # Underactive: transverse abdominis, internal oblique, glute max
        # Detected via shoulder-hip-ankle alignment
        if len(landmarks) >= 33:
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
            ankle_y = (landmarks[27]["y"] + landmarks[28]["y"]) / 2

            # In a plank/pushup, shoulder-hip-ankle should be roughly linear
            # If hip drops below the shoulder-ankle line = sag
            expected_hip_y = (shoulder_y + ankle_y) / 2
            sag = hip_y - expected_hip_y  # positive = sagging down

            if sag > 0.04:
                cues.append(FormCue(
                    rule_name="hip_sag",
                    message="Hips sagging -- squeeze glutes, brace core, maintain plank",
                    severity="error",
                    weight=2.0,
                ))
            elif sag > 0.02:
                cues.append(FormCue(
                    rule_name="hip_sag",
                    message="Slight hip drop -- engage core to maintain neutral spine",
                    severity="warning",
                    weight=1.0,
                ))

            # Hip pike (hips too high)
            if sag < -0.04:
                cues.append(FormCue(
                    rule_name="hip_pike",
                    message="Hips piking up -- lower hips to align with shoulders and ankles",
                    severity="warning",
                    weight=1.0,
                ))

        # ── Shoulder: Elbow flare (NASM PES: scapular mechanics) ─────
        # Ideal: elbows at ~45 degrees from torso (not 90 degrees T-shape)
        # Excessive flare stresses the shoulder joint (impingement risk)
        # Detected by comparing elbow x-position to shoulder x-position
        if len(landmarks) >= 33:
            for side, shoulder_idx, elbow_idx in [("left", 11, 13), ("right", 12, 14)]:
                shoulder_x = landmarks[shoulder_idx]["x"]
                elbow_x = landmarks[elbow_idx]["x"]
                flare = abs(elbow_x - shoulder_x)

                if flare > 0.12:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow flaring wide -- tuck elbows to ~45 degrees",
                        severity="error",
                        weight=1.5,
                    ))
                elif flare > 0.08:
                    cues.append(FormCue(
                        rule_name=f"{side}_elbow_flare",
                        message=f"{side.title()} elbow slightly wide -- keep closer to body",
                        severity="warning",
                        weight=0.8,
                    ))

        # ── Head position (NASM CES: cervical spine alignment) ───────
        # Head should stay neutral, not craning forward or dropping
        if len(landmarks) >= 33:
            nose_y = landmarks[0]["y"]
            shoulder_y = (landmarks[11]["y"] + landmarks[12]["y"]) / 2
            # If nose is significantly lower than shoulders = head dropping
            head_drop = nose_y - shoulder_y
            if head_drop > 0.06:
                cues.append(FormCue(
                    rule_name="head_drop",
                    message="Head dropping -- maintain neutral cervical spine, look slightly ahead",
                    severity="warning",
                    weight=0.8,
                ))

        # ── Bilateral elbow symmetry ─────────────────────────────────
        elbow_diff = abs(
            joint_angles.get("left_elbow_flexion", 0)
            - joint_angles.get("right_elbow_flexion", 0)
        )
        if elbow_diff > 15:
            cues.append(FormCue(
                rule_name="elbow_asymmetry",
                message=f"Uneven push-up ({elbow_diff:.0f} deg elbow diff) -- distribute weight evenly",
                severity="error",
                weight=1.2,
            ))
        elif elbow_diff > 8:
            cues.append(FormCue(
                rule_name="elbow_asymmetry",
                message=f"Slight elbow asymmetry ({elbow_diff:.0f} deg) -- balance loading",
                severity="warning",
                weight=0.7,
            ))

        return cues
