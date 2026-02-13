# YOLO AI Form/Posture Analysis MCP Server Dockerfile
# Optimized for Render deployment with production-ready setup

# Use Python 3.11 slim image for smaller size and security
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_TIMEOUT=100

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Essential build tools
    gcc \
    g++ \
    make \
    # OpenCV dependencies
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    # Additional OpenCV dependencies for headless operation
    libglib2.0-0 \
    libice6 \
    libsm6 \
    libxext6 \
    libxrender1 \
    # Network tools
    wget \
    curl \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimization
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn \
    && rm -rf ~/.cache/pip/*

# Copy application code
COPY yolo_mcp_server.py .
COPY .env.example .env

# Create necessary directories
RUN mkdir -p /app/models \
    && mkdir -p /app/logs \
    && mkdir -p /app/tmp

# Set ownership to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Set default environment variables
ENV PORT=8002 \
    YOLO_MODEL_PATH=/app/models/yolov8n-pose.pt \
    CONFIDENCE_THRESHOLD=0.5 \
    IOU_THRESHOLD=0.5 \
    MAX_ACTIVE_SESSIONS=50 \
    FRAME_BUFFER_SIZE=30

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start command optimized for production
CMD ["sh", "-c", "python yolo_mcp_server.py"]

# Alternative production start command with gunicorn (uncomment if needed)
# CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8002", "yolo_mcp_server:app"]
