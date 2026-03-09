"""
SwanStudios Form Analysis Microservice
=======================================
FastAPI service for AI-powered exercise form analysis.
Uses MediaPipe Pose for 33-point landmark detection and
custom biomechanics calculations for joint angle analysis.

Phase 0: Image + video analysis endpoints with angle calculations.
"""

import logging
import os
import signal
import sys
import tempfile
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from .analyzers.angle_calculator import calculate_joint_angles
    from .analyzers.corrective_recommendations import get_recommendations
    from .analyzers.exercise_rules.registry import get_exercise_engine, supported_exercises, exercise_categories
    from .analyzers.pattern_detector import detect_all_compensations, merge_compensations
    from .analyzers.pose_estimator import pose_estimator
    from .analyzers.rep_counter import RepCounter
    from .config import settings
    from .feedback.gemini_feedback import generate_coaching_feedback
    from .models import (
        ErrorResponse,
        ExerciseAnalysisResponse,
        HealthResponse,
        ImageAnalysisResponse,
        VideoAnalysisResponse,
    )
except ImportError:
    # Running directly (python main.py or uvicorn main:app)
    from analyzers.angle_calculator import calculate_joint_angles
    from analyzers.corrective_recommendations import get_recommendations
    from analyzers.exercise_rules.registry import get_exercise_engine, supported_exercises, exercise_categories
    from analyzers.pattern_detector import detect_all_compensations, merge_compensations
    from analyzers.pose_estimator import pose_estimator
    from analyzers.rep_counter import RepCounter
    from config import settings
    from feedback.gemini_feedback import generate_coaching_feedback
    from models import (
        ErrorResponse,
        ExerciseAnalysisResponse,
        HealthResponse,
        ImageAnalysisResponse,
        VideoAnalysisResponse,
    )

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("form-analysis")

# -- Allowed MIME types for upload validation --
ALLOWED_IMAGE_TYPES = set(settings.allowed_image_types)
ALLOWED_VIDEO_TYPES = set(settings.allowed_video_types)
MAX_FILE_BYTES = settings.max_file_size_mb * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("Starting Form Analysis service...")
    pose_estimator.initialize()
    logger.info("Service ready.")
    yield
    logger.info("Shutting down Form Analysis service...")
    pose_estimator.close()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="SwanStudios Form Analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# -- CORS --
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)


def _validate_upload(file: UploadFile, allowed_types: set[str]) -> None:
    """Validate uploaded file type and size."""
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. "
            f"Allowed: {', '.join(sorted(allowed_types))}",
        )


# ── Health Endpoints ──────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Basic health check."""
    return HealthResponse(
        status="ok",
        model_loaded=pose_estimator.is_ready,
    )


@app.get("/ready", response_model=HealthResponse)
async def ready():
    """Readiness check -- only returns 200 if model is loaded."""
    if not pose_estimator.is_ready:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    return HealthResponse(
        status="ready",
        model_loaded=True,
    )


# ── Image Analysis ────────────────────────────────────────────────────

@app.post(
    "/analyze-image",
    response_model=ImageAnalysisResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def analyze_image(file: UploadFile = File(...)):
    """Analyze a single image for pose landmarks and joint angles.

    Accepts JPEG, PNG, or WebP. Returns 33-point landmarks
    and calculated joint angles in degrees.
    """
    _validate_upload(file, ALLOWED_IMAGE_TYPES)

    # Read and validate size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum: {settings.max_file_size_mb}MB",
        )

    start = time.time()

    try:
        result = pose_estimator.estimate_from_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Image analysis failed")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

    # Calculate joint angles if pose was detected
    joint_angles = {}
    if result["detected"]:
        joint_angles = calculate_joint_angles(result["landmarks"])

    elapsed = round(time.time() - start, 3)
    logger.info(
        "Image analyzed: detected=%s, angles=%d, time=%.3fs",
        result["detected"],
        len(joint_angles),
        elapsed,
    )

    return ImageAnalysisResponse(
        detected=result["detected"],
        landmarks=result["landmarks"],
        joint_angles=joint_angles,
        image_dimensions=result["image_dimensions"],
    )


# ── Video Analysis ────────────────────────────────────────────────────

@app.post(
    "/analyze-video",
    response_model=VideoAnalysisResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def analyze_video(file: UploadFile = File(...)):
    """Analyze a video for per-frame pose landmarks and joint angles.

    Accepts MP4, MOV, or WebM. Returns per-frame landmarks,
    joint angles, and a summary with min/max/avg angles.
    """
    _validate_upload(file, ALLOWED_VIDEO_TYPES)

    # Save to temp file (OpenCV needs file path)
    video_bytes = await file.read()
    if len(video_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum: {settings.max_file_size_mb}MB",
        )

    start = time.time()

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        result = pose_estimator.estimate_from_video(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Video analysis failed")
        raise HTTPException(status_code=500, detail="Video analysis failed. Please try again.")
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # Calculate joint angles for each detected frame
    all_angles: list[dict] = []
    for frame in result["frames"]:
        if frame["detected"] and frame["landmarks"]:
            angles = calculate_joint_angles(frame["landmarks"])
            frame["joint_angles"] = angles
            all_angles.append(angles)
        else:
            frame["joint_angles"] = {}

    # Generate summary statistics across all frames
    summary = _compute_video_summary(all_angles)

    elapsed = round(time.time() - start, 3)
    logger.info(
        "Video analyzed: frames=%d, detected=%d, time=%.3fs",
        result["video_metadata"]["processed_frames"],
        len(all_angles),
        elapsed,
    )

    return VideoAnalysisResponse(
        frames=result["frames"],
        video_metadata=result["video_metadata"],
        summary=summary,
    )


# ── Full Exercise Analysis (Phase 1) ─────────────────────────────────

@app.post(
    "/analyze-exercise",
    response_model=ExerciseAnalysisResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def analyze_exercise(
    file: UploadFile = File(...),
    exercise: str = Form("squat"),
):
    """Full exercise analysis pipeline: video -> pose -> angles -> reps -> scores -> compensations -> feedback.

    Accepts a video file and exercise name. Returns rep-by-rep scoring,
    compensatory pattern analysis, NASM CES corrective recommendations,
    and AI-powered coaching feedback via Gemini Flash.

    Supported exercises: squat, deadlift, pushup
    """
    _validate_upload(file, ALLOWED_VIDEO_TYPES)

    # Validate exercise name
    engine = get_exercise_engine(exercise)
    if not engine:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported exercise: '{exercise}'. Supported: {', '.join(supported_exercises())}",
        )

    # Read and validate file size
    video_bytes = await file.read()
    if len(video_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum: {settings.max_file_size_mb}MB",
        )

    start = time.time()

    # 1. Save to temp file for OpenCV
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        # 2. Pose estimation (per-frame landmarks)
        result = pose_estimator.estimate_from_video(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Video pose estimation failed")
        raise HTTPException(status_code=500, detail="Video analysis failed. Please try again.")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # 3. Calculate joint angles for each detected frame
    all_angles: list[dict] = []
    all_landmarks: list[list[dict]] = []
    detected_frames: list[dict] = []

    for frame in result["frames"]:
        if frame["detected"] and frame["landmarks"]:
            angles = calculate_joint_angles(frame["landmarks"])
            frame["joint_angles"] = angles
            all_angles.append(angles)
            all_landmarks.append(frame["landmarks"])
            detected_frames.append(frame)
        else:
            frame["joint_angles"] = {}

    if not all_angles:
        raise HTTPException(
            status_code=400,
            detail="No pose detected in video. Ensure full body is visible and well-lit.",
        )

    # 4. Compensatory pattern detection (per-frame)
    all_frame_comps = []
    for i, (angles, landmarks) in enumerate(zip(all_angles, all_landmarks)):
        frame_comps = detect_all_compensations(landmarks, angles, frame_idx=i)
        all_frame_comps.append(frame_comps)

    # 5. Merge compensations across all frames
    compensations = merge_compensations(all_frame_comps)

    # 6. Rep counting + per-rep form scoring
    rep_counter = RepCounter(engine)
    rep_result = rep_counter.count_reps(detected_frames, all_angles, all_landmarks)

    # 7. Corrective exercise recommendations (NASM CES continuum)
    recommendations = get_recommendations(compensations)

    # 8. Joint angle summary (min/max/avg across all frames)
    angle_summary = _compute_video_summary(all_angles)

    # 9. AI coaching feedback via Gemini Flash
    feedback_data = {
        "exercise": exercise,
        "total_reps": rep_result.total_reps,
        "avg_score": rep_result.avg_score,
        "rep_scores": [r.score for r in rep_result.reps],
        "compensations": compensations,
        "joint_angle_summary": angle_summary,
        "fatigue_detected": rep_result.fatigue_detected,
        "fatigue_onset_rep": rep_result.fatigue_onset_rep,
        "tempo_analysis": rep_result.tempo_analysis,
    }
    coaching_feedback = await generate_coaching_feedback(feedback_data)

    elapsed = round(time.time() - start, 3)
    logger.info(
        "Exercise analysis: exercise=%s, reps=%d, avg_score=%.1f, compensations=%d, time=%.3fs",
        exercise,
        rep_result.total_reps,
        rep_result.avg_score,
        len(compensations),
        elapsed,
    )

    # Build rep data for response
    rep_data = [
        {
            "rep_number": r.rep_number,
            "score": r.score,
            "min_angle": r.min_angle,
            "max_angle": r.max_angle,
            "eccentric_duration": r.eccentric_duration,
            "concentric_duration": r.concentric_duration,
            "cues": r.cues,
        }
        for r in rep_result.reps
    ]

    return ExerciseAnalysisResponse(
        exercise=exercise,
        total_reps=rep_result.total_reps,
        avg_score=rep_result.avg_score,
        rep_scores=[r.score for r in rep_result.reps],
        reps=rep_data,
        fatigue_detected=rep_result.fatigue_detected,
        fatigue_onset_rep=rep_result.fatigue_onset_rep,
        tempo_analysis=rep_result.tempo_analysis,
        compensations=compensations,
        corrective_recommendations=recommendations,
        joint_angle_summary=angle_summary,
        coaching_feedback=coaching_feedback,
        video_metadata=result["video_metadata"],
        supported_exercises=supported_exercises(),
    )


# ── Supported Exercises ──────────────────────────────────────────────

@app.get("/exercises")
async def list_exercises():
    """List all supported exercises for form analysis, organized by category."""
    return {
        "total": len(supported_exercises()),
        "exercises": supported_exercises(),
        "categories": exercise_categories(),
    }


# ── Helpers ──────────────────────────────────────────────────────────

def _compute_video_summary(all_angles: list[dict]) -> dict:
    """Compute min/max/avg for each angle across all frames."""
    if not all_angles:
        return {"detected_frames": 0}

    summary = {"detected_frames": len(all_angles)}
    # Gather all angle keys
    keys = set()
    for a in all_angles:
        keys.update(a.keys())

    for key in sorted(keys):
        values = [a[key] for a in all_angles if key in a]
        if values:
            summary[key] = {
                "min": round(min(values), 1),
                "max": round(max(values), 1),
                "avg": round(sum(values) / len(values), 1),
            }

    return summary


# ── Entrypoint ────────────────────────────────────────────────────────

def _handle_sigterm(*_):
    logger.info("SIGTERM received, shutting down gracefully...")
    sys.exit(0)


if __name__ == "__main__":
    import uvicorn

    signal.signal(signal.SIGTERM, _handle_sigterm)
    uvicorn.run(
        "backend.services.form-analysis.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
