"""
Compensatory pattern detection from joint angle data.

Detects common movement compensations and maps them to likely
weak/tight muscles using NASM corrective exercise principles.
"""

from dataclasses import dataclass, field


@dataclass
class Compensation:
    """A detected compensatory movement pattern."""
    type: str
    severity: str  # mild | moderate | severe
    side: str  # left | right | bilateral
    frames: list[int] = field(default_factory=list)
    angle_value: float = 0.0
    threshold: float = 0.0
    likely_weak_muscle: str = ""
    likely_tight_muscle: str = ""
    description: str = ""


# ── Thresholds (NASM-aligned) ────────────────────────────────────────

# Knee valgus: how far the knee x-position deviates inward from ankle
KNEE_VALGUS_MILD = 0.02       # normalized coords
KNEE_VALGUS_MODERATE = 0.04
KNEE_VALGUS_SEVERE = 0.06

# Forward lean: trunk angle from vertical
FORWARD_LEAN_MILD = 15.0      # degrees
FORWARD_LEAN_MODERATE = 25.0
FORWARD_LEAN_SEVERE = 35.0

# Hip shift: difference in left vs right hip y-position during bilateral movement
HIP_SHIFT_MILD = 0.02
HIP_SHIFT_MODERATE = 0.04
HIP_SHIFT_SEVERE = 0.06

# Bilateral angle asymmetry
ASYMMETRY_MILD = 8.0          # degrees
ASYMMETRY_MODERATE = 15.0
ASYMMETRY_SEVERE = 25.0

# Heel rise: ankle-to-foot angle indicates dorsiflexion limit
HEEL_RISE_THRESHOLD = 70.0    # degrees (below this = likely heel rise)

# Shoulder elevation: one shoulder significantly higher
SHOULDER_ELEVATION_MILD = 0.02
SHOULDER_ELEVATION_MODERATE = 0.04

# Lumbar hyperextension: trunk lean goes negative (leaning back) during overhead
LUMBAR_HYPEREXT_MILD = -5.0
LUMBAR_HYPEREXT_MODERATE = -10.0


def _severity(value: float, mild: float, moderate: float, severe: float = None) -> str:
    """Determine severity from thresholds. Higher value = worse."""
    if severe and abs(value) >= severe:
        return "severe"
    if abs(value) >= moderate:
        return "moderate"
    if abs(value) >= mild:
        return "mild"
    return ""


def detect_knee_valgus(landmarks: list[dict], frame_idx: int = 0) -> list[Compensation]:
    """Detect knees caving inward (valgus) from frontal plane."""
    results = []
    if len(landmarks) < 33:
        return results

    for side, knee_idx, ankle_idx, hip_idx in [
        ("left", 25, 27, 23),
        ("right", 26, 28, 24),
    ]:
        knee_x = landmarks[knee_idx]["x"]
        ankle_x = landmarks[ankle_idx]["x"]
        hip_x = landmarks[hip_idx]["x"]

        # Knee should track over ankle. If knee is medial to ankle (toward midline):
        # For left side: valgus = knee_x > ankle_x (closer to center)
        # For right side: valgus = knee_x < ankle_x (closer to center)
        midline_x = (landmarks[23]["x"] + landmarks[24]["x"]) / 2

        if side == "left":
            deviation = knee_x - ankle_x  # positive = medial collapse
        else:
            deviation = ankle_x - knee_x  # positive = medial collapse

        sev = _severity(deviation, KNEE_VALGUS_MILD, KNEE_VALGUS_MODERATE, KNEE_VALGUS_SEVERE)
        if sev:
            results.append(Compensation(
                type="knee_valgus",
                severity=sev,
                side=side,
                frames=[frame_idx],
                angle_value=round(deviation, 4),
                threshold=KNEE_VALGUS_MILD,
                likely_weak_muscle="gluteus medius, VMO",
                likely_tight_muscle="adductors, IT band, lateral gastrocnemius",
                description=f"{side.title()} knee tracking {round(deviation * 100, 1)}% medially",
            ))

    return results


def detect_forward_lean(joint_angles: dict, frame_idx: int = 0) -> list[Compensation]:
    """Detect excessive anterior trunk lean."""
    trunk = joint_angles.get("trunk_lean", 0)
    sev = _severity(trunk, FORWARD_LEAN_MILD, FORWARD_LEAN_MODERATE, FORWARD_LEAN_SEVERE)
    if sev:
        return [Compensation(
            type="anterior_lean",
            severity=sev,
            side="bilateral",
            frames=[frame_idx],
            angle_value=trunk,
            threshold=FORWARD_LEAN_MILD,
            likely_weak_muscle="anterior core, gluteus maximus",
            likely_tight_muscle="hip flexors (psoas), thoracic spine extensors",
            description=f"Trunk leaning forward {trunk:.1f} degrees from vertical",
        )]
    return []


def detect_hip_shift(landmarks: list[dict], frame_idx: int = 0) -> list[Compensation]:
    """Detect lateral hip shift during bilateral movements."""
    if len(landmarks) < 33:
        return []

    left_hip_y = landmarks[23]["y"]
    right_hip_y = landmarks[24]["y"]
    diff = abs(left_hip_y - right_hip_y)

    sev = _severity(diff, HIP_SHIFT_MILD, HIP_SHIFT_MODERATE, HIP_SHIFT_SEVERE)
    if sev:
        lower_side = "left" if left_hip_y > right_hip_y else "right"
        return [Compensation(
            type="hip_shift",
            severity=sev,
            side=lower_side,
            frames=[frame_idx],
            angle_value=round(diff, 4),
            threshold=HIP_SHIFT_MILD,
            likely_weak_muscle=f"{lower_side} gluteus medius, {lower_side} quadratus lumborum",
            likely_tight_muscle=f"{'right' if lower_side == 'left' else 'left'} adductors",
            description=f"Hip dropping on {lower_side} side by {round(diff * 100, 1)}%",
        )]
    return []


def detect_bilateral_asymmetry(joint_angles: dict, frame_idx: int = 0) -> list[Compensation]:
    """Detect significant left/right angle differences."""
    results = []
    checks = [
        ("knee_flexion_diff", "knee flexion", "quadriceps/hamstrings"),
        ("hip_flexion_diff", "hip flexion", "hip flexors/glutes"),
        ("shoulder_flexion_diff", "shoulder flexion", "deltoids/rotator cuff"),
    ]

    for key, name, muscles in checks:
        diff = joint_angles.get(key, 0)
        sev = _severity(diff, ASYMMETRY_MILD, ASYMMETRY_MODERATE, ASYMMETRY_SEVERE)
        if sev:
            results.append(Compensation(
                type="bilateral_asymmetry",
                severity=sev,
                side="bilateral",
                frames=[frame_idx],
                angle_value=diff,
                threshold=ASYMMETRY_MILD,
                likely_weak_muscle=f"weaker side {muscles}",
                likely_tight_muscle=f"tighter side {muscles}",
                description=f"{name.title()} asymmetry: {diff:.1f} degree difference L/R",
            ))

    return results


def detect_heel_rise(joint_angles: dict, frame_idx: int = 0) -> list[Compensation]:
    """Detect heel rising during squat (ankle dorsiflexion limit)."""
    results = []
    for side in ["left", "right"]:
        angle = joint_angles.get(f"{side}_ankle_dorsiflexion", 180)
        if angle < HEEL_RISE_THRESHOLD:
            results.append(Compensation(
                type="heel_rise",
                severity="moderate" if angle < 55 else "mild",
                side=side,
                frames=[frame_idx],
                angle_value=angle,
                threshold=HEEL_RISE_THRESHOLD,
                likely_weak_muscle="anterior tibialis",
                likely_tight_muscle="gastrocnemius, soleus (calves)",
                description=f"{side.title()} ankle dorsiflexion limited to {angle:.1f} degrees",
            ))
    return results


def detect_shoulder_elevation(landmarks: list[dict], frame_idx: int = 0) -> list[Compensation]:
    """Detect one shoulder shrugging up (common during presses)."""
    if len(landmarks) < 33:
        return []

    left_y = landmarks[11]["y"]
    right_y = landmarks[12]["y"]
    diff = abs(left_y - right_y)

    sev = _severity(diff, SHOULDER_ELEVATION_MILD, SHOULDER_ELEVATION_MODERATE)
    if sev:
        higher_side = "left" if left_y < right_y else "right"
        return [Compensation(
            type="shoulder_elevation",
            severity=sev,
            side=higher_side,
            frames=[frame_idx],
            angle_value=round(diff, 4),
            threshold=SHOULDER_ELEVATION_MILD,
            likely_weak_muscle=f"{higher_side} lower trapezius, serratus anterior",
            likely_tight_muscle=f"{higher_side} upper trapezius, levator scapulae",
            description=f"{higher_side.title()} shoulder elevated by {round(diff * 100, 1)}%",
        )]
    return []


def detect_all_compensations(
    landmarks: list[dict],
    joint_angles: dict,
    frame_idx: int = 0,
) -> list[Compensation]:
    """Run all compensation detectors on a single frame."""
    all_comps = []
    all_comps.extend(detect_knee_valgus(landmarks, frame_idx))
    all_comps.extend(detect_forward_lean(joint_angles, frame_idx))
    all_comps.extend(detect_hip_shift(landmarks, frame_idx))
    all_comps.extend(detect_bilateral_asymmetry(joint_angles, frame_idx))
    all_comps.extend(detect_heel_rise(joint_angles, frame_idx))
    all_comps.extend(detect_shoulder_elevation(landmarks, frame_idx))
    return all_comps


def merge_compensations(all_frame_comps: list[list[Compensation]]) -> list[dict]:
    """Merge per-frame compensations into a summary across all frames.

    Groups by (type, side), collects all frames, uses worst severity.
    """
    groups: dict[tuple, dict] = {}

    for frame_comps in all_frame_comps:
        for comp in frame_comps:
            key = (comp.type, comp.side)
            if key not in groups:
                groups[key] = {
                    "type": comp.type,
                    "severity": comp.severity,
                    "side": comp.side,
                    "frames": list(comp.frames),
                    "likely_weak_muscle": comp.likely_weak_muscle,
                    "likely_tight_muscle": comp.likely_tight_muscle,
                    "description": comp.description,
                    "avg_value": comp.angle_value,
                    "_values": [comp.angle_value],
                    "_count": 1,
                }
            else:
                g = groups[key]
                g["frames"].extend(comp.frames)
                g["_values"].append(comp.angle_value)
                g["_count"] += 1
                # Escalate severity
                severity_rank = {"mild": 1, "moderate": 2, "severe": 3}
                if severity_rank.get(comp.severity, 0) > severity_rank.get(g["severity"], 0):
                    g["severity"] = comp.severity

    results = []
    for g in groups.values():
        g["avg_value"] = round(sum(g["_values"]) / g["_count"], 4)
        g["frame_count"] = g["_count"]
        del g["_values"]
        del g["_count"]
        results.append(g)

    # Sort by severity (severe first)
    severity_order = {"severe": 0, "moderate": 1, "mild": 2}
    results.sort(key=lambda x: severity_order.get(x["severity"], 3))

    return results
