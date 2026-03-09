"""
Joint angle calculator from MediaPipe 33-point landmarks.

Uses atan2 to compute angles between landmark triplets.
All angles returned in degrees (0-180).
"""

import math
import numpy as np


def _angle_between(a: tuple, b: tuple, c: tuple) -> float:
    """Calculate angle at point B formed by points A-B-C.

    Args:
        a: (x, y, z) of first point
        b: (x, y, z) of vertex point
        c: (x, y, z) of third point

    Returns:
        Angle in degrees (0-180)
    """
    ba = np.array(a) - np.array(b)
    bc = np.array(c) - np.array(b)

    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return math.degrees(math.acos(cos_angle))


# MediaPipe Pose landmark indices
# https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
class LandmarkIndex:
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


LI = LandmarkIndex


def _pt(landmarks: list[dict], idx: int) -> tuple:
    """Extract (x, y, z) from a landmark by index."""
    lm = landmarks[idx]
    return (lm["x"], lm["y"], lm["z"])


def calculate_joint_angles(landmarks: list[dict]) -> dict:
    """Calculate all tracked joint angles from 33-point MediaPipe landmarks.

    Args:
        landmarks: List of 33 dicts with keys x, y, z, visibility

    Returns:
        Dict of joint angle names to degree values
    """
    if len(landmarks) < 33:
        return {}

    angles = {}

    # -- Knee flexion (hip-knee-ankle) --
    angles["left_knee_flexion"] = _angle_between(
        _pt(landmarks, LI.LEFT_HIP),
        _pt(landmarks, LI.LEFT_KNEE),
        _pt(landmarks, LI.LEFT_ANKLE),
    )
    angles["right_knee_flexion"] = _angle_between(
        _pt(landmarks, LI.RIGHT_HIP),
        _pt(landmarks, LI.RIGHT_KNEE),
        _pt(landmarks, LI.RIGHT_ANKLE),
    )

    # -- Hip flexion (shoulder-hip-knee) --
    angles["left_hip_flexion"] = _angle_between(
        _pt(landmarks, LI.LEFT_SHOULDER),
        _pt(landmarks, LI.LEFT_HIP),
        _pt(landmarks, LI.LEFT_KNEE),
    )
    angles["right_hip_flexion"] = _angle_between(
        _pt(landmarks, LI.RIGHT_SHOULDER),
        _pt(landmarks, LI.RIGHT_HIP),
        _pt(landmarks, LI.RIGHT_KNEE),
    )

    # -- Shoulder flexion (elbow-shoulder-hip) --
    angles["left_shoulder_flexion"] = _angle_between(
        _pt(landmarks, LI.LEFT_ELBOW),
        _pt(landmarks, LI.LEFT_SHOULDER),
        _pt(landmarks, LI.LEFT_HIP),
    )
    angles["right_shoulder_flexion"] = _angle_between(
        _pt(landmarks, LI.RIGHT_ELBOW),
        _pt(landmarks, LI.RIGHT_SHOULDER),
        _pt(landmarks, LI.RIGHT_HIP),
    )

    # -- Elbow flexion (shoulder-elbow-wrist) --
    angles["left_elbow_flexion"] = _angle_between(
        _pt(landmarks, LI.LEFT_SHOULDER),
        _pt(landmarks, LI.LEFT_ELBOW),
        _pt(landmarks, LI.LEFT_WRIST),
    )
    angles["right_elbow_flexion"] = _angle_between(
        _pt(landmarks, LI.RIGHT_SHOULDER),
        _pt(landmarks, LI.RIGHT_ELBOW),
        _pt(landmarks, LI.RIGHT_WRIST),
    )

    # -- Ankle dorsiflexion (knee-ankle-foot_index) --
    angles["left_ankle_dorsiflexion"] = _angle_between(
        _pt(landmarks, LI.LEFT_KNEE),
        _pt(landmarks, LI.LEFT_ANKLE),
        _pt(landmarks, LI.LEFT_FOOT_INDEX),
    )
    angles["right_ankle_dorsiflexion"] = _angle_between(
        _pt(landmarks, LI.RIGHT_KNEE),
        _pt(landmarks, LI.RIGHT_ANKLE),
        _pt(landmarks, LI.RIGHT_FOOT_INDEX),
    )

    # -- Trunk lean (midpoint shoulders - midpoint hips - vertical) --
    left_shoulder = np.array(_pt(landmarks, LI.LEFT_SHOULDER))
    right_shoulder = np.array(_pt(landmarks, LI.RIGHT_SHOULDER))
    left_hip = np.array(_pt(landmarks, LI.LEFT_HIP))
    right_hip = np.array(_pt(landmarks, LI.RIGHT_HIP))

    mid_shoulder = (left_shoulder + right_shoulder) / 2
    mid_hip = (left_hip + right_hip) / 2

    # Trunk vector (hip to shoulder)
    trunk_vec = mid_shoulder - mid_hip
    # Vertical reference (straight up in image coords: y decreases upward)
    vertical = np.array([0, -1, 0])

    cos_trunk = np.dot(trunk_vec, vertical) / (
        np.linalg.norm(trunk_vec) * np.linalg.norm(vertical) + 1e-8
    )
    cos_trunk = np.clip(cos_trunk, -1.0, 1.0)
    angles["trunk_lean"] = math.degrees(math.acos(cos_trunk))

    # -- Bilateral symmetry metrics --
    angles["knee_flexion_diff"] = abs(
        angles["left_knee_flexion"] - angles["right_knee_flexion"]
    )
    angles["hip_flexion_diff"] = abs(
        angles["left_hip_flexion"] - angles["right_hip_flexion"]
    )
    angles["shoulder_flexion_diff"] = abs(
        angles["left_shoulder_flexion"] - angles["right_shoulder_flexion"]
    )

    # Round all values
    return {k: round(v, 1) for k, v in angles.items()}
