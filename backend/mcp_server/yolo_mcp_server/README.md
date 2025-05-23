# YOLO AI Form/Posture Analysis MCP Server

## Overview

The YOLO AI Form/Posture Analysis MCP Server provides real-time pose detection and exercise form analysis for the SwanStudios platform. This server uses the YOLOv8 pose estimation model to analyze user movements during workouts and provide immediate feedback on form, safety, and technique.

## Features

### Core Functionality
- **Real-time Pose Detection**: Uses YOLOv8 for accurate human pose estimation
- **Exercise-Specific Analysis**: Custom analyzers for squat, deadlift, bench press, overhead press, and plank
- **Form Scoring**: Provides quantitative scores (0-100) for form quality and safety
- **Safety Alerts**: Detects potentially dangerous movements and provides warnings
- **Progressive Analysis**: Tracks movement patterns over time for better insights

### Technical Features
- **WebSocket Support**: Real-time bidirectional communication for live video analysis
- **Session Management**: Handles multiple concurrent analysis sessions
- **Production Ready**: Optimized for deployment on Render with Docker
- **Error Handling**: Comprehensive error handling and logging
- **Health Checks**: Built-in health monitoring and metrics endpoints

## Architecture

### MCP Server Tools
1. **StartFormAnalysis**: Initiates a new analysis session
2. **StopFormAnalysis**: Ends an analysis session with summary
3. **GetRealTimeFeedback**: Retrieves current pose and form metrics

### WebSocket Interface
- Endpoint: `/ws/form-analysis/{session_id}`
- Accepts video frames as base64 encoded images
- Returns real-time pose detection and form analysis results

## Installation

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd backend/mcp_server/yolo_mcp_server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp .env.example .env

# Run the server
python yolo_mcp_server.py
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t yolo-mcp-server .

# Run the container
docker run -p 8002:8002 -e PORT=8002 yolo-mcp-server
```

## Render Deployment

### Prerequisites
1. Render account with Docker support
2. GitHub repository connected to Render
3. Environment variables configured

### Deployment Steps

1. **Create Render Service**
   - Service Type: Web Service
   - Environment: Docker
   - Build & Deploy: Automatic deploys from main branch

2. **Environment Variables**
   ```
   PORT=8002
   BACKEND_API_URL=https://your-backend.onrender.com/api
   API_TOKEN=your_production_token
   YOLO_MODEL_PATH=yolov8n-pose.pt
   CONFIDENCE_THRESHOLD=0.5
   IOU_THRESHOLD=0.5
   MAX_ACTIVE_SESSIONS=20
   ```

3. **Health Check Configuration**
   - Path: `/health`
   - Timeout: 30s
   - Interval: 60s

### Performance Optimization for Render

1. **Resource Configuration**
   - CPU: 2+ cores recommended
   - RAM: 4GB+ recommended
   - Storage: 1GB+ for model caching

2. **Model Loading**
   - Models are downloaded on first use
   - Consider pre-building images with models for faster startup

3. **Session Limits**
   - Adjust `MAX_ACTIVE_SESSIONS` based on available resources
   - Monitor memory usage with concurrent sessions

## Usage

### Starting an Analysis Session

```python
import requests

# Start analysis
response = requests.post(
    "http://localhost:8002/tools/StartFormAnalysis",
    json={
        "user_id": "user123",
        "exercise_name": "squat"
    }
)
session_id = response.json()["session_id"]
```

### WebSocket Video Processing

```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:8002/ws/form-analysis/${sessionId}`);

// Send video frame
const frameData = {
    type: "frame",
    data: base64ImageData,
    include_annotated: true
};
ws.send(JSON.stringify(frameData));

// Receive analysis results
ws.onmessage = (event) => {
    const result = JSON.parse(event.data);
    if (result.type === "analysis") {
        console.log("Form Score:", result.metrics.form_score);
        console.log("Safety Score:", result.metrics.safety_score);
        console.log("Issues:", result.metrics.issues);
    }
};
```

### Getting Real-time Feedback

```python
# Get current feedback
response = requests.post(
    "http://localhost:8002/tools/GetRealTimeFeedback",
    json={
        "session_id": session_id
    }
)
feedback = response.json()
```

## Supported Exercises

### Current Implementations
1. **Squat**: Monitors knee tracking, depth, and back position
2. **Deadlift**: Analyzes bar path and back posture
3. **Bench Press**: Checks elbow flare and wrist alignment
4. **Overhead Press**: Evaluates shoulder mobility and core stability
5. **Plank**: Measures body alignment and hip position

### Adding New Exercises
To add a new exercise analyzer:

1. Create a new method in `YOLOAnalyzer` class
2. Add the method to `self.exercise_analyzers` dictionary
3. Implement exercise-specific form analysis logic
4. Return `ExerciseMetrics` object with analysis results

## Monitoring

### Health Check
- Endpoint: `/health`
- Returns: Server status, model status, active sessions

### Metrics
- Endpoint: `/metrics`
- Returns: Performance metrics, session statistics

### Logs
- Default location: `logs/yolo_mcp_server.log`
- Configurable via `LOG_FILE` environment variable

## Troubleshooting

### Common Issues

1. **Model Download Fails**
   - Check internet connectivity
   - Verify `YOLO_MODEL_PATH` configuration
   - Ensure sufficient disk space

2. **High Memory Usage**
   - Reduce `MAX_ACTIVE_SESSIONS`
   - Decrease `FRAME_BUFFER_SIZE`
   - Monitor concurrent connections

3. **WebSocket Disconnections**
   - Check network stability
   - Implement reconnection logic in client
   - Monitor server resources

### Debug Mode
Set `LOG_LEVEL=DEBUG` for verbose logging

## Security Considerations

1. **Input Validation**: All inputs are validated with Pydantic models
2. **Error Handling**: Sensitive information is not exposed in error messages
3. **Resource Limits**: Session limits prevent resource exhaustion
4. **CORS Configuration**: Adjust for production security requirements

## Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new exercise analyzers
3. Update documentation for API changes
4. Use type hints throughout the codebase

## License

This software is part of the SwanStudios platform and follows the project's licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Contact the development team
