"""
YOLO AI Form/Posture Analysis MCP Server
======================================

A Python-based MCP server that uses YOLO (You Only Look Once) AI for real-time
pose detection and form analysis during workouts. This server provides:

- Real-time pose detection from video streams
- Exercise form analysis and scoring
- Safety alerts for improper movements
- Performance improvement suggestions
- Movement quality metrics

To run this server:
```
python yolo_mcp_server.py
```

The server will run on port 8002 by default.
Production deployment optimized for Render.
"""

import os
import sys
import json
import uuid
import asyncio
import logging
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple, Set
from collections import deque, defaultdict
import threading
import time
from pathlib import Path

import uvicorn
import cv2
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import ultralytics
from ultralytics import YOLO
import base64
from io import BytesIO

# Set up comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('yolo_mcp_server.log')
    ]
)
logger = logging.getLogger("yolo_mcp_server")

# Environment configuration
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000/api")
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n-pose.pt")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.5"))
IOU_THRESHOLD = float(os.environ.get("IOU_THRESHOLD", "0.5"))
MAX_ACTIVE_SESSIONS = int(os.environ.get("MAX_ACTIVE_SESSIONS", "50"))
FRAME_BUFFER_SIZE = int(os.environ.get("FRAME_BUFFER_SIZE", "30"))

# Create FastAPI app
app = FastAPI(
    title="YOLO AI Form/Posture Analysis MCP Server",
    description="Real-time pose detection and form analysis for workout training",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# YOLO Models and Constants
class PoseKeypoints:
    """COCO-style pose keypoint indices for human pose detection."""
    NOSE = 0
    LEFT_EYE = 1
    RIGHT_EYE = 2
    LEFT_EAR = 3
    RIGHT_EAR = 4
    LEFT_SHOULDER = 5
    RIGHT_SHOULDER = 6
    LEFT_ELBOW = 7
    RIGHT_ELBOW = 8
    LEFT_WRIST = 9
    RIGHT_WRIST = 10
    LEFT_HIP = 11
    RIGHT_HIP = 12
    LEFT_KNEE = 13
    RIGHT_KNEE = 14
    LEFT_ANKLE = 15
    RIGHT_ANKLE = 16

# Data Models
class Point2D(BaseModel):
    """2D point with x, y coordinates."""
    x: float
    y: float
    confidence: Optional[float] = None

class PoseData(BaseModel):
    """Pose detection data for a single person."""
    keypoints: Dict[str, Point2D]
    bbox: Optional[Tuple[float, float, float, float]] = None
    confidence: float
    timestamp: datetime

class ExerciseMetrics(BaseModel):
    """Exercise-specific form metrics."""
    exercise_name: str
    form_score: float = Field(description="Form score from 0-100")
    safety_score: float = Field(description="Safety score from 0-100")
    key_angles: Dict[str, float] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    rep_count: int = 0
    current_phase: str = "unknown"
    movement_quality: float = 0.0

class AnalysisSession(BaseModel):
    """Active analysis session data."""
    session_id: str
    user_id: str
    exercise_id: Optional[str] = None
    exercise_name: Optional[str] = None
    started_at: datetime
    last_updated: datetime
    is_active: bool = True
    current_pose: Optional[PoseData] = None
    frame_count: int = 0
    total_frames: int = 0
    current_metrics: Optional[ExerciseMetrics] = None
    pose_history: List[PoseData] = Field(default_factory=list)

class StartFormAnalysisInput(BaseModel):
    """Input for starting form analysis."""
    user_id: str
    exercise_id: Optional[str] = None
    exercise_name: Optional[str] = None
    camera_config: Optional[Dict[str, Any]] = None
    analysis_settings: Optional[Dict[str, Any]] = None

class StopFormAnalysisInput(BaseModel):
    """Input for stopping form analysis."""
    session_id: str

class GetRealTimeFeedbackInput(BaseModel):
    """Input for getting real-time feedback."""
    session_id: str

class FormAnalysisOutput(BaseModel):
    """Output for form analysis operations."""
    session_id: str
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class RealTimeFeedbackOutput(BaseModel):
    """Output for real-time feedback."""
    session_id: str
    current_metrics: Optional[ExerciseMetrics] = None
    pose_data: Optional[PoseData] = None
    frame_info: Dict[str, Any]
    success: bool
    message: str

# Global state management
class SessionManager:
    """Manages active analysis sessions with thread safety."""
    
    def __init__(self):
        self.sessions: Dict[str, AnalysisSession] = {}
        self.websockets: Dict[str, WebSocket] = {}
        self.lock = threading.Lock()
    
    def create_session(self, user_id: str, **kwargs) -> str:
        """Create a new analysis session."""
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self.lock:
            if len(self.sessions) >= MAX_ACTIVE_SESSIONS:
                # Remove oldest inactive session
                oldest_session = min(
                    [s for s in self.sessions.values() if not s.is_active],
                    key=lambda x: x.last_updated,
                    default=None
                )
                if oldest_session:
                    del self.sessions[oldest_session.session_id]
            
            session = AnalysisSession(
                session_id=session_id,
                user_id=user_id,
                started_at=now,
                last_updated=now,
                **kwargs
            )
            self.sessions[session_id] = session
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[AnalysisSession]:
        """Get a session by ID."""
        with self.lock:
            return self.sessions.get(session_id)
    
    def update_session(self, session_id: str, **updates):
        """Update a session with new data."""
        with self.lock:
            if session_id in self.sessions:
                for key, value in updates.items():
                    setattr(self.sessions[session_id], key, value)
                self.sessions[session_id].last_updated = datetime.now()
    
    def stop_session(self, session_id: str):
        """Stop an analysis session."""
        with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id].is_active = False
                self.sessions[session_id].last_updated = datetime.now()
            if session_id in self.websockets:
                del self.websockets[session_id]
    
    def add_websocket(self, session_id: str, websocket: WebSocket):
        """Add a WebSocket connection for a session."""
        with self.lock:
            self.websockets[session_id] = websocket
    
    def get_websocket(self, session_id: str) -> Optional[WebSocket]:
        """Get a WebSocket connection for a session."""
        with self.lock:
            return self.websockets.get(session_id)

# Initialize global instances
session_manager = SessionManager()
yolo_model = None

class YOLOAnalyzer:
    """Real-time YOLO-based pose analysis."""
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.exercise_analyzers = {
            'squat': self.analyze_squat,
            'deadlift': self.analyze_deadlift,
            'bench_press': self.analyze_bench_press,
            'overhead_press': self.analyze_overhead_press,
            'plank': self.analyze_plank,
            'default': self.analyze_default
        }
    
    def load_model(self):
        """Load the YOLO model."""
        try:
            # Download default model if not exists
            if not os.path.exists(MODEL_PATH):
                logger.info(f"Downloading YOLO model to {MODEL_PATH}")
                self.model = YOLO(MODEL_PATH)  # This will download if needed
            else:
                logger.info(f"Loading existing YOLO model from {MODEL_PATH}")
                self.model = YOLO(MODEL_PATH)
            
            # Verify model has pose detection capability
            if hasattr(self.model, 'names') and self.model.task != 'pose':
                logger.warning("Loaded model may not support pose detection")
            
            self.model_loaded = True
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {str(e)}")
            logger.error(traceback.format_exc())
            raise RuntimeError(f"Model loading failed: {str(e)}")
    
    def process_frame(self, frame_data: bytes) -> Tuple[Optional[PoseData], np.ndarray]:
        """Process a single frame for pose detection."""
        try:
            # Decode frame
            if isinstance(frame_data, str):
                # Base64 encoded image
                image_data = base64.b64decode(frame_data.split(',')[-1])
                image_array = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            else:
                # Direct bytes
                image_array = np.frombuffer(frame_data, np.uint8)
                frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.error("Failed to decode frame")
                return None, None
            
            # Run YOLO inference
            results = self.model(frame, conf=CONFIDENCE_THRESHOLD, iou=IOU_THRESHOLD)
            
            # Extract pose data
            pose_data = self.extract_pose_data(results, frame.shape)
            
            # Draw keypoints on frame for visualization
            annotated_frame = results[0].plot() if results and len(results) > 0 else frame
            
            return pose_data, annotated_frame
            
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}")
            logger.error(traceback.format_exc())
            return None, None
    
    def extract_pose_data(self, results, frame_shape: Tuple[int, int, int]) -> Optional[PoseData]:
        """Extract pose data from YOLO results."""
        try:
            if not results or len(results) == 0:
                return None
            
            result = results[0]
            
            # Check if pose keypoints are available
            if not hasattr(result, 'keypoints') or result.keypoints is None:
                logger.warning("No pose keypoints found in results")
                return None
            
            keypoints = result.keypoints.xy.cpu().numpy()
            confidences = result.keypoints.conf.cpu().numpy()
            
            if len(keypoints) == 0:
                return None
            
            # Take the first (most confident) detection
            person_keypoints = keypoints[0]
            person_confidences = confidences[0]
            
            # Convert to Point2D objects
            pose_keypoints = {}
            keypoint_names = [
                'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
                'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
            ]
            
            for i, (x, y) in enumerate(person_keypoints):
                if i < len(keypoint_names):
                    pose_keypoints[keypoint_names[i]] = Point2D(
                        x=float(x),
                        y=float(y),
                        confidence=float(person_confidences[i])
                    )
            
            # Extract bounding box if available
            bbox = None
            if hasattr(result, 'boxes') and result.boxes is not None and len(result.boxes) > 0:
                box = result.boxes.xyxy.cpu().numpy()[0]
                bbox = (float(box[0]), float(box[1]), float(box[2]), float(box[3]))
            
            return PoseData(
                keypoints=pose_keypoints,
                bbox=bbox,
                confidence=float(np.mean(person_confidences)),
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error extracting pose data: {str(e)}")
            logger.error(traceback.format_exc())
            return None
    
    def analyze_exercise(self, exercise_name: str, pose_data: PoseData, 
                        pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze exercise form based on pose data."""
        exercise_analyzer = self.exercise_analyzers.get(
            exercise_name.lower().replace(' ', '_'),
            self.exercise_analyzers['default']
        )
        return exercise_analyzer(pose_data, pose_history)
    
    def calculate_angle(self, point1: Point2D, point2: Point2D, point3: Point2D) -> float:
        """Calculate angle between three points."""
        try:
            # Vector from point2 to point1
            v1 = np.array([point1.x - point2.x, point1.y - point2.y])
            # Vector from point2 to point3
            v2 = np.array([point3.x - point2.x, point3.y - point2.y])
            
            # Calculate angle
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
            return np.degrees(angle)
        except:
            return 0.0
    
    def analyze_squat(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze squat form."""
        issues = []
        improvements = []
        key_angles = {}
        form_score = 100.0
        safety_score = 100.0
        
        try:
            keypoints = pose_data.keypoints
            
            # Check knee angle
            if all(k in keypoints for k in ['left_hip', 'left_knee', 'left_ankle']):
                knee_angle = self.calculate_angle(
                    keypoints['left_hip'], 
                    keypoints['left_knee'], 
                    keypoints['left_ankle']
                )
                key_angles['left_knee'] = knee_angle
                
                # Analyze knee position
                if knee_angle < 90:
                    issues.append("Knees collapsing inward")
                    form_score -= 15
                    improvements.append("Keep knees tracking over toes")
            
            # Check back angle
            if all(k in keypoints for k in ['left_shoulder', 'left_hip', 'left_knee']):
                back_angle = self.calculate_angle(
                    keypoints['left_shoulder'],
                    keypoints['left_hip'],
                    keypoints['left_knee']
                )
                key_angles['back_angle'] = back_angle
                
                if back_angle < 45 or back_angle > 75:
                    issues.append("Improper back position")
                    form_score -= 10
                    improvements.append("Maintain neutral spine")
            
            # Check depth
            if all(k in keypoints for k in ['left_hip', 'left_knee']):
                hip_y = keypoints['left_hip'].y
                knee_y = keypoints['left_knee'].y
                
                if hip_y < knee_y:  # Hip below knee means good depth
                    pass
                else:
                    issues.append("Insufficient squat depth")
                    form_score -= 20
                    improvements.append("Squat deeper - hips below knees")
            
        except Exception as e:
            logger.error(f"Error analyzing squat: {str(e)}")
            issues.append("Analysis error occurred")
            form_score = 50.0
        
        return ExerciseMetrics(
            exercise_name="squat",
            form_score=max(0, form_score),
            safety_score=max(0, safety_score),
            key_angles=key_angles,
            issues=issues,
            improvements=improvements,
            current_phase="analysis",
            movement_quality=form_score * 0.8
        )
    
    def analyze_deadlift(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze deadlift form."""
        issues = []
        improvements = []
        key_angles = {}
        form_score = 100.0
        safety_score = 100.0
        
        try:
            keypoints = pose_data.keypoints
            
            # Check back position
            if all(k in keypoints for k in ['left_shoulder', 'left_hip', 'left_knee']):
                back_angle = self.calculate_angle(
                    keypoints['left_shoulder'],
                    keypoints['left_hip'],
                    keypoints['left_knee']
                )
                key_angles['back_angle'] = back_angle
                
                if back_angle < 30:
                    issues.append("Back rounding detected")
                    safety_score -= 25
                    improvements.append("Keep back straight and chest up")
            
            # Check bar path (simulated)
            if len(pose_history) > 5:
                # Check for consistent vertical movement
                hip_positions = [p.keypoints.get('left_hip', Point2D(x=0, y=0)).x 
                               for p in pose_history[-6:] if 'left_hip' in p.keypoints]
                if hip_positions:
                    hip_deviation = np.std(hip_positions)
                    if hip_deviation > 10:  # Arbitrary threshold
                        issues.append("Bar drifting forward")
                        form_score -= 15
                        improvements.append("Keep bar close to body")
            
        except Exception as e:
            logger.error(f"Error analyzing deadlift: {str(e)}")
            issues.append("Analysis error occurred")
            form_score = 50.0
        
        return ExerciseMetrics(
            exercise_name="deadlift",
            form_score=max(0, form_score),
            safety_score=max(0, safety_score),
            key_angles=key_angles,
            issues=issues,
            improvements=improvements,
            current_phase="analysis",
            movement_quality=form_score * 0.9
        )
    
    def analyze_bench_press(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze bench press form."""
        issues = []
        improvements = []
        key_angles = {}
        form_score = 100.0
        safety_score = 100.0
        
        try:
            keypoints = pose_data.keypoints
            
            # Check elbow angle
            if all(k in keypoints for k in ['left_shoulder', 'left_elbow', 'left_wrist']):
                elbow_angle = self.calculate_angle(
                    keypoints['left_shoulder'],
                    keypoints['left_elbow'],
                    keypoints['left_wrist']
                )
                key_angles['left_elbow'] = elbow_angle
                
                if elbow_angle > 90:
                    issues.append("Elbows flaring too wide")
                    safety_score -= 15
                    improvements.append("Keep elbows at 45-degree angle")
            
            # Check wrist alignment
            if all(k in keypoints for k in ['left_elbow', 'left_wrist']):
                # Simplified check for wrist position
                elbow_y = keypoints['left_elbow'].y
                wrist_y = keypoints['left_wrist'].y
                
                if abs(elbow_y - wrist_y) > 20:
                    issues.append("Wrist not aligned with elbow")
                    form_score -= 10
                    improvements.append("Keep wrists straight under elbows")
            
        except Exception as e:
            logger.error(f"Error analyzing bench press: {str(e)}")
            issues.append("Analysis error occurred")
            form_score = 50.0
        
        return ExerciseMetrics(
            exercise_name="bench_press",
            form_score=max(0, form_score),
            safety_score=max(0, safety_score),
            key_angles=key_angles,
            issues=issues,
            improvements=improvements,
            current_phase="analysis",
            movement_quality=form_score * 0.85
        )
    
    def analyze_overhead_press(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze overhead press form."""
        issues = []
        improvements = []
        key_angles = {}
        form_score = 100.0
        safety_score = 100.0
        
        try:
            keypoints = pose_data.keypoints
            
            # Check shoulder mobility
            if all(k in keypoints for k in ['left_shoulder', 'left_elbow', 'left_wrist']):
                shoulder_angle = self.calculate_angle(
                    keypoints['left_elbow'],
                    keypoints['left_shoulder'],
                    keypoints['left_wrist']
                )
                key_angles['shoulder_elevation'] = shoulder_angle
                
                # Check for adequate overhead reach
                shoulder_y = keypoints['left_shoulder'].y
                wrist_y = keypoints['left_wrist'].y
                
                if wrist_y > shoulder_y - 50:  # Wrist not far enough overhead
                    issues.append("Insufficient overhead reach")
                    form_score -= 20
                    improvements.append("Press weights directly overhead")
            
            # Check core stability (simplified)
            if all(k in keypoints for k in ['left_shoulder', 'left_hip']):
                # Check for excessive back arch
                shoulder_x = keypoints['left_shoulder'].x
                hip_x = keypoints['left_hip'].x
                
                if abs(shoulder_x - hip_x) > 30:
                    issues.append("Excessive back arch")
                    safety_score -= 15
                    improvements.append("Maintain tight core")
            
        except Exception as e:
            logger.error(f"Error analyzing overhead press: {str(e)}")
            issues.append("Analysis error occurred")
            form_score = 50.0
        
        return ExerciseMetrics(
            exercise_name="overhead_press",
            form_score=max(0, form_score),
            safety_score=max(0, safety_score),
            key_angles=key_angles,
            issues=issues,
            improvements=improvements,
            current_phase="analysis",
            movement_quality=form_score * 0.8
        )
    
    def analyze_plank(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Analyze plank form."""
        issues = []
        improvements = []
        key_angles = {}
        form_score = 100.0
        safety_score = 100.0
        
        try:
            keypoints = pose_data.keypoints
            
            # Check plank angle
            if all(k in keypoints for k in ['left_shoulder', 'left_hip', 'left_ankle']):
                plank_angle = self.calculate_angle(
                    keypoints['left_shoulder'],
                    keypoints['left_hip'],
                    keypoints['left_ankle']
                )
                key_angles['body_line'] = plank_angle
                
                # Check for straight body line
                if plank_angle < 170 or plank_angle > 190:
                    issues.append("Body not in straight line")
                    form_score -= 15
                    improvements.append("Maintain straight line from head to heels")
            
            # Check hip position
            if all(k in keypoints for k in ['left_shoulder', 'left_hip', 'left_knee']):
                shoulder_y = keypoints['left_shoulder'].y
                hip_y = keypoints['left_hip'].y
                knee_y = keypoints['left_knee'].y
                
                # Check for sagging hips
                if hip_y > (shoulder_y + knee_y) / 2 + 20:
                    issues.append("Hips sagging")
                    form_score -= 20
                    improvements.append("Engage core to lift hips")
                
                # Check for raised hips
                elif hip_y < (shoulder_y + knee_y) / 2 - 20:
                    issues.append("Hips too high")
                    form_score -= 10
                    improvements.append("Lower hips slightly")
            
        except Exception as e:
            logger.error(f"Error analyzing plank: {str(e)}")
            issues.append("Analysis error occurred")
            form_score = 50.0
        
        return ExerciseMetrics(
            exercise_name="plank",
            form_score=max(0, form_score),
            safety_score=max(0, safety_score),
            key_angles=key_angles,
            issues=issues,
            improvements=improvements,
            current_phase="analysis",
            movement_quality=form_score * 0.9
        )
    
    def analyze_default(self, pose_data: PoseData, pose_history: List[PoseData]) -> ExerciseMetrics:
        """Default analysis for unknown exercises."""
        return ExerciseMetrics(
            exercise_name="unknown",
            form_score=75.0,
            safety_score=85.0,
            key_angles={},
            issues=["Exercise not recognized"],
            improvements=["Select a specific exercise for detailed analysis"],
            current_phase="general_analysis",
            movement_quality=70.0
        )

# Initialize analyzer
yolo_analyzer = YOLOAnalyzer()

# MCP API Endpoints

@app.post("/tools/StartFormAnalysis", response_model=FormAnalysisOutput)
async def start_form_analysis(input_data: StartFormAnalysisInput):
    """
    Start real-time form analysis for a user.
    
    This tool initiates a new form analysis session that can process video
    frames in real-time to detect pose and analyze exercise form.
    """
    try:
        # Ensure YOLO model is loaded
        if not yolo_analyzer.model_loaded:
            yolo_analyzer.load_model()
        
        # Create new session
        session_id = session_manager.create_session(
            user_id=input_data.user_id,
            exercise_id=input_data.exercise_id,
            exercise_name=input_data.exercise_name
        )
        
        return FormAnalysisOutput(
            session_id=session_id,
            success=True,
            message="Form analysis session started successfully",
            data={
                "user_id": input_data.user_id,
                "exercise_name": input_data.exercise_name,
                "started_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error starting form analysis: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start form analysis: {str(e)}"
        )

@app.post("/tools/StopFormAnalysis", response_model=FormAnalysisOutput)
async def stop_form_analysis(input_data: StopFormAnalysisInput):
    """
    Stop an active form analysis session.
    
    This tool stops the real-time analysis and provides a summary of the session.
    """
    try:
        session = session_manager.get_session(input_data.session_id)
        if not session:
            return FormAnalysisOutput(
                session_id=input_data.session_id,
                success=False,
                message="Session not found"
            )
        
        # Stop the session
        session_manager.stop_session(input_data.session_id)
        
        # Generate session summary
        summary = {
            "total_frames": session.total_frames,
            "duration": (datetime.now() - session.started_at).total_seconds(),
            "average_form_score": getattr(session.current_metrics, 'form_score', 0) if session.current_metrics else 0,
            "final_metrics": session.current_metrics.dict() if session.current_metrics else None
        }
        
        return FormAnalysisOutput(
            session_id=input_data.session_id,
            success=True,
            message="Form analysis session stopped successfully",
            data=summary
        )
    except Exception as e:
        logger.error(f"Error stopping form analysis: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop form analysis: {str(e)}"
        )

@app.post("/tools/GetRealTimeFeedback", response_model=RealTimeFeedbackOutput)
async def get_real_time_feedback(input_data: GetRealTimeFeedbackInput):
    """
    Get real-time feedback for an active analysis session.
    
    This tool provides the current pose data, form metrics, and recommendations
    for an ongoing analysis session.
    """
    try:
        session = session_manager.get_session(input_data.session_id)
        if not session:
            return RealTimeFeedbackOutput(
                session_id=input_data.session_id,
                success=False,
                message="Session not found",
                frame_info={}
            )
        
        if not session.is_active:
            return RealTimeFeedbackOutput(
                session_id=input_data.session_id,
                success=False,
                message="Session is not active",
                frame_info={}
            )
        
        # Get current pose and metrics
        frame_info = {
            "frame_count": session.frame_count,
            "total_frames": session.total_frames,
            "fps": session.frame_count / max((datetime.now() - session.started_at).total_seconds(), 1),
            "last_updated": session.last_updated.isoformat()
        }
        
        return RealTimeFeedbackOutput(
            session_id=input_data.session_id,
            current_metrics=session.current_metrics,
            pose_data=session.current_pose,
            frame_info=frame_info,
            success=True,
            message="Real-time feedback retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting real-time feedback: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get real-time feedback: {str(e)}"
        )

# WebSocket endpoint for real-time video processing
@app.websocket("/ws/form-analysis/{session_id}")
async def websocket_form_analysis(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time video frame processing.
    
    Clients can send video frames to this endpoint and receive real-time
    pose detection and form analysis results.
    """
    await websocket.accept()
    logger.info(f"WebSocket connection established for session: {session_id}")
    
    try:
        # Get session
        session = session_manager.get_session(session_id)
        if not session:
            await websocket.send_text(json.dumps({
                "error": "Session not found",
                "session_id": session_id
            }))
            await websocket.close()
            return
        
        # Add websocket to session manager
        session_manager.add_websocket(session_id, websocket)
        
        # Ensure YOLO model is loaded
        if not yolo_analyzer.model_loaded:
            yolo_analyzer.load_model()
        
        while True:
            try:
                # Receive frame data
                data = await websocket.receive_text()
                frame_data = json.loads(data)
                
                if frame_data.get("type") == "frame":
                    # Process frame
                    frame_bytes = frame_data.get("data")
                    if frame_bytes:
                        # Analyze frame
                        pose_data, annotated_frame = yolo_analyzer.process_frame(frame_bytes)
                        
                        # Update session
                        session_manager.update_session(
                            session_id,
                            current_pose=pose_data,
                            frame_count=session.frame_count + 1,
                            total_frames=session.total_frames + 1
                        )
                        
                        # Analyze exercise if pose detected
                        if pose_data and session.exercise_name:
                            # Add to pose history (keep last 30)
                            session.pose_history.append(pose_data)
                            if len(session.pose_history) > FRAME_BUFFER_SIZE:
                                session.pose_history.pop(0)
                            
                            # Analyze exercise form
                            metrics = yolo_analyzer.analyze_exercise(
                                session.exercise_name,
                                pose_data,
                                session.pose_history
                            )
                            
                            # Update session with metrics
                            session_manager.update_session(
                                session_id,
                                current_metrics=metrics
                            )
                        
                        # Prepare response
                        response = {
                            "type": "analysis",
                            "session_id": session_id,
                            "timestamp": datetime.now().isoformat(),
                            "pose_detected": pose_data is not None,
                            "metrics": session.current_metrics.dict() if session.current_metrics else None
                        }
                        
                        # Send annotated frame if requested
                        if frame_data.get("include_annotated") and annotated_frame is not None:
                            # Encode frame as base64
                            _, buffer = cv2.imencode('.jpg', annotated_frame)
                            frame_b64 = base64.b64encode(buffer).decode('utf-8')
                            response["annotated_frame"] = f"data:image/jpeg;base64,{frame_b64}"
                        
                        await websocket.send_text(json.dumps(response))
                
                elif frame_data.get("type") == "ping":
                    # Handle ping/pong for keepalive
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }))
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session: {session_id}")
                break
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await websocket.send_text(json.dumps({
                    "error": f"Processing error: {str(e)}",
                    "session_id": session_id
                }))
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        # Clean up
        session_manager.stop_session(session_id)

# Health check and management endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    model_status = "loaded" if yolo_analyzer.model_loaded else "not_loaded"
    active_sessions = len([s for s in session_manager.sessions.values() if s.is_active])
    
    return {
        "status": "healthy",
        "model_status": model_status,
        "active_sessions": active_sessions,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics")
async def get_metrics():
    """Get server metrics."""
    total_sessions = len(session_manager.sessions)
    active_sessions = len([s for s in session_manager.sessions.values() if s.is_active])
    
    # Calculate average session duration
    completed_sessions = [s for s in session_manager.sessions.values() if not s.is_active]
    avg_duration = 0
    if completed_sessions:
        durations = [(s.last_updated - s.started_at).total_seconds() for s in completed_sessions]
        avg_duration = sum(durations) / len(durations)
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "model_loaded": yolo_analyzer.model_loaded,
        "average_session_duration": avg_duration,
        "server_uptime": time.time() - app.start_time if hasattr(app, 'start_time') else 0
    }

# MCP tool listing and schema endpoints
@app.get("/tools")
async def list_tools():
    """List all available MCP tools."""
    return {
        "tools": [
            {
                "name": "StartFormAnalysis",
                "description": "Start real-time form analysis for a user.",
                "input_schema": StartFormAnalysisInput.schema(),
                "output_schema": FormAnalysisOutput.schema()
            },
            {
                "name": "StopFormAnalysis",
                "description": "Stop an active form analysis session.",
                "input_schema": StopFormAnalysisInput.schema(),
                "output_schema": FormAnalysisOutput.schema()
            },
            {
                "name": "GetRealTimeFeedback",
                "description": "Get real-time feedback for an active analysis session.",
                "input_schema": GetRealTimeFeedbackInput.schema(),
                "output_schema": RealTimeFeedbackOutput.schema()
            }
        ]
    }

@app.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "YOLO AI Form/Posture Analysis MCP Server",
        "version": "1.0.0",
        "description": "Real-time pose detection and form analysis for workout training",
        "tools_endpoint": "/tools",
        "websocket_endpoint": "/ws/form-analysis/{session_id}",
        "model_loaded": yolo_analyzer.model_loaded
    }

@app.get("/schema")
async def schema():
    """Get the OpenAPI schema for this MCP server."""
    return app.openapi()

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with proper JSON response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handle generic exceptions with proper JSON response."""
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Server startup tasks."""
    app.start_time = time.time()
    logger.info("YOLO MCP Server starting up...")
    
    # Pre-load YOLO model in background
    def load_model_async():
        try:
            yolo_analyzer.load_model()
            logger.info("YOLO model loaded successfully during startup")
        except Exception as e:
            logger.error(f"Failed to load YOLO model during startup: {str(e)}")
    
    # Start model loading in background thread
    model_thread = threading.Thread(target=load_model_async)
    model_thread.daemon = True
    model_thread.start()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Server shutdown tasks."""
    logger.info("YOLO MCP Server shutting down...")
    
    # Stop all active sessions
    for session_id in list(session_manager.sessions.keys()):
        session_manager.stop_session(session_id)
    
    logger.info("Server shutdown complete")

if __name__ == "__main__":
    # Run the server
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        access_log=True
    )
