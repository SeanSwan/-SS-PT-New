"""FastAPI routes for MCP tools."""

import sys
import os
from pathlib import Path
from fastapi import APIRouter

# Set up import paths BEFORE any imports
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Import models and tools using absolute imports only
try:
    # Use absolute imports directly
    from models import (
        GetWorkoutRecommendationsInput,
        GetWorkoutRecommendationsOutput,
        GetClientProgressInput,
        GetClientProgressOutput,
        GetWorkoutStatisticsInput,
        GetWorkoutStatisticsOutput,
        LogWorkoutSessionInput,
        LogWorkoutSessionOutput,
        GenerateWorkoutPlanInput,
        GenerateWorkoutPlanOutput
    )
    from tools import (
        get_workout_recommendations,
        get_client_progress,
        get_workout_statistics,
        log_workout_session,
        generate_workout_plan
    )
    IMPORTS_AVAILABLE = True
    print("SUCCESS: Successfully imported workout modules using absolute imports")
except ImportError as e:
    print(f"Warning: Import failed: {e}")
    # Create placeholder models and functions
    from pydantic import BaseModel
    
    class GetWorkoutRecommendationsInput(BaseModel):
        pass
    class GetWorkoutRecommendationsOutput(BaseModel):
        pass
    class GetClientProgressInput(BaseModel):
        pass
    class GetClientProgressOutput(BaseModel):
        pass
    class GetWorkoutStatisticsInput(BaseModel):
        pass
    class GetWorkoutStatisticsOutput(BaseModel):
        pass
    class LogWorkoutSessionInput(BaseModel):
        pass
    class LogWorkoutSessionOutput(BaseModel):
        pass
    class GenerateWorkoutPlanInput(BaseModel):
        pass
    class GenerateWorkoutPlanOutput(BaseModel):
        pass
    
    # Create placeholder functions
    async def get_workout_recommendations(input_data):
        return {"error": "Service not available - import failed"}
    async def get_client_progress(input_data):
        return {"error": "Service not available - import failed"}
    async def get_workout_statistics(input_data):
        return {"error": "Service not available - import failed"}
    async def log_workout_session(input_data):
        return {"error": "Service not available - import failed"}
    async def generate_workout_plan(input_data):
        return {"error": "Service not available - import failed"}
    
    IMPORTS_AVAILABLE = False

router = APIRouter()

@router.post("/GetWorkoutRecommendations", response_model=GetWorkoutRecommendationsOutput)
async def workout_recommendations_route(input_data: GetWorkoutRecommendationsInput):
    """
    Get personalized exercise recommendations for a user.
    
    This tool provides exercise recommendations based on the user's goals,
    preferences, and progress. It can filter by equipment, muscle groups,
    and difficulty level.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Workout recommendations service is currently unavailable"}
    return await get_workout_recommendations(input_data)

@router.post("/GetClientProgress", response_model=GetClientProgressOutput)
async def client_progress_route(input_data: GetClientProgressInput):
    """
    Get a client's progress data.
    
    This tool retrieves comprehensive progress data for a client, including:
    - Skill levels (strength, cardio, flexibility, balance, core)
    - Workout history metrics
    - Streak information
    - Personal records
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Client progress service is currently unavailable"}
    return await get_client_progress(input_data)

@router.post("/GetWorkoutStatistics", response_model=GetWorkoutStatisticsOutput)
async def workout_statistics_route(input_data: GetWorkoutStatisticsInput):
    """
    Get comprehensive workout statistics for a user.
    
    This tool provides detailed workout statistics including:
    - Total workout metrics (count, duration, reps, sets, weight)
    - Exercise breakdown by frequency
    - Muscle group activation breakdown
    - Workout schedule patterns (weekday breakdown)
    - Intensity trends over time
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Workout statistics service is currently unavailable"}
    return await get_workout_statistics(input_data)

@router.post("/LogWorkoutSession", response_model=LogWorkoutSessionOutput)
async def log_workout_session_route(input_data: LogWorkoutSessionInput):
    """
    Log a workout session for a user.
    
    This tool creates or updates a workout session with exercises and sets.
    It can be used to:
    - Create a new planned workout
    - Start a workout (changing status to 'in_progress')
    - Complete a workout (changing status to 'completed')
    - Update exercises and sets with performance data
    
    The tool handles progress tracking and gamification updates automatically.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Workout logging service is currently unavailable"}
    return await log_workout_session(input_data)

@router.post("/GenerateWorkoutPlan", response_model=GenerateWorkoutPlanOutput)
async def generate_workout_plan_route(input_data: GenerateWorkoutPlanInput):
    """
    Generate a personalized workout plan for a client.
    
    This tool creates a comprehensive workout plan based on the client's goals,
    preferences, and available equipment. It generates multiple workout days
    with appropriate exercises, set/rep schemes, and instructions.
    
    The generated plan can be used as a starting point for trainers or can be
    directly assigned to clients.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Workout plan generation service is currently unavailable"}
    return await generate_workout_plan(input_data)

# Add health check for this module
@router.get("/tools/health")
async def tools_health():
    """Check if the tools module is working correctly."""
    return {
        "status": "healthy" if IMPORTS_AVAILABLE else "degraded",
        "imports_available": IMPORTS_AVAILABLE,
        "tools": [
            "get_workout_recommendations",
            "get_client_progress", 
            "get_workout_statistics",
            "log_workout_session",
            "generate_workout_plan"
        ]
    }
