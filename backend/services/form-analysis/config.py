"""Configuration for the Form Analysis microservice."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings loaded from environment variables."""

    # Service
    host: str = "0.0.0.0"
    port: int = 8100
    debug: bool = False

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173", "https://sswanstudios.com"]

    # Upload limits
    max_file_size_mb: int = 100
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]
    allowed_video_types: list[str] = ["video/mp4", "video/quicktime", "video/webm"]

    # Analysis
    max_video_frames: int = 10000
    job_timeout_seconds: int = 120
    pose_model_complexity: int = 2  # 0=lite, 1=full, 2=heavy

    model_config = {"env_prefix": "FORM_ANALYSIS_"}


settings = Settings()
