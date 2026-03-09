"""Pydantic models for API request/response validation."""

from pydantic import BaseModel, Field


class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class ImageDimensions(BaseModel):
    width: int
    height: int


class ImageAnalysisResponse(BaseModel):
    detected: bool
    landmarks: list[Landmark]
    joint_angles: dict[str, float]
    image_dimensions: ImageDimensions


class FrameData(BaseModel):
    frame_index: int
    timestamp_sec: float
    landmarks: list[Landmark]
    detected: bool
    joint_angles: dict[str, float] = Field(default_factory=dict)


class VideoMetadata(BaseModel):
    fps: float
    total_frames: int
    processed_frames: int
    width: int
    height: int
    duration_sec: float


class VideoAnalysisResponse(BaseModel):
    frames: list[FrameData]
    video_metadata: VideoMetadata
    summary: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str = "0.1.0"


class RepData(BaseModel):
    rep_number: int
    score: float
    min_angle: float
    max_angle: float
    eccentric_duration: float
    concentric_duration: float
    cues: list[dict] = Field(default_factory=list)


class ExerciseAnalysisResponse(BaseModel):
    exercise: str
    total_reps: int
    avg_score: float
    rep_scores: list[float] = Field(default_factory=list)
    reps: list[RepData] = Field(default_factory=list)
    fatigue_detected: bool = False
    fatigue_onset_rep: int | None = None
    tempo_analysis: dict = Field(default_factory=dict)
    compensations: list[dict] = Field(default_factory=list)
    corrective_recommendations: list[dict] = Field(default_factory=list)
    joint_angle_summary: dict = Field(default_factory=dict)
    coaching_feedback: dict = Field(default_factory=dict)
    video_metadata: VideoMetadata | None = None
    supported_exercises: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
