"""
Pose estimation using MediaPipe Pose Landmarker.

Wraps MediaPipe to provide a clean interface for extracting
33-point landmarks from images and video frames.
"""

import logging
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

try:
    from ..config import settings
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from config import settings

logger = logging.getLogger(__name__)

# MediaPipe setup
mp_pose = mp.solutions.pose


class PoseEstimator:
    """Singleton-style pose estimator using MediaPipe Pose."""

    def __init__(self):
        self._pose = None
        self._ready = False

    def initialize(self):
        """Load the MediaPipe Pose model. Call once at startup."""
        logger.info("Loading MediaPipe Pose model (complexity=%d)...", settings.pose_model_complexity)
        self._pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=settings.pose_model_complexity,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._ready = True
        logger.info("MediaPipe Pose model loaded successfully.")

    @property
    def is_ready(self) -> bool:
        return self._ready

    def estimate_from_image(self, image_bytes: bytes) -> dict:
        """Run pose estimation on a single image.

        Args:
            image_bytes: Raw image bytes (JPEG/PNG)

        Returns:
            Dict with 'landmarks' (list of 33 points) and 'image_dimensions'
        """
        if not self._pose:
            raise RuntimeError("PoseEstimator not initialized. Call initialize() first.")

        # Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image. Ensure it is a valid JPEG/PNG.")

        height, width = image.shape[:2]

        # MediaPipe expects RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Run pose estimation
        results = self._pose.process(image_rgb)

        if not results.pose_landmarks:
            return {
                "landmarks": [],
                "image_dimensions": {"width": width, "height": height},
                "detected": False,
            }

        landmarks = []
        for lm in results.pose_landmarks.landmark:
            landmarks.append({
                "x": round(lm.x, 6),
                "y": round(lm.y, 6),
                "z": round(lm.z, 6),
                "visibility": round(lm.visibility, 4),
            })

        return {
            "landmarks": landmarks,
            "image_dimensions": {"width": width, "height": height},
            "detected": True,
        }

    def estimate_from_video(self, video_path: str, max_frames: int | None = None) -> list[dict]:
        """Run pose estimation on each frame of a video.

        Args:
            video_path: Path to video file
            max_frames: Maximum frames to process (None = all)

        Returns:
            List of per-frame results with landmarks + frame metadata
        """
        if not self._pose:
            raise RuntimeError("PoseEstimator not initialized. Call initialize() first.")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if max_frames is None:
            max_frames = settings.max_video_frames

        # For long videos, sample frames to stay under limit
        frame_skip = max(1, total_frames // max_frames) if total_frames > max_frames else 1

        frames_data = []
        frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_skip != 0:
                frame_idx += 1
                continue

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self._pose.process(frame_rgb)

            landmarks = []
            detected = False
            if results.pose_landmarks:
                detected = True
                for lm in results.pose_landmarks.landmark:
                    landmarks.append({
                        "x": round(lm.x, 6),
                        "y": round(lm.y, 6),
                        "z": round(lm.z, 6),
                        "visibility": round(lm.visibility, 4),
                    })

            frames_data.append({
                "frame_index": frame_idx,
                "timestamp_sec": round(frame_idx / fps, 3),
                "landmarks": landmarks,
                "detected": detected,
            })

            frame_idx += 1

            if len(frames_data) >= max_frames:
                break

        cap.release()

        return {
            "frames": frames_data,
            "video_metadata": {
                "fps": round(fps, 2),
                "total_frames": total_frames,
                "processed_frames": len(frames_data),
                "width": width,
                "height": height,
                "duration_sec": round(total_frames / fps, 2) if fps > 0 else 0,
            },
        }

    def close(self):
        """Release MediaPipe resources."""
        if self._pose:
            self._pose.close()
            self._pose = None
            self._ready = False


# Module-level singleton
pose_estimator = PoseEstimator()
