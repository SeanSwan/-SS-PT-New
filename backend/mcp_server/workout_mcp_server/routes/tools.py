"""
FastAPI routes for MCP tools.
"""

from fastapi import APIRouter

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

router = APIRouter()

@router.post("/GetWorkoutRecommendations", response_model=GetWorkoutRecommendationsOutput)
async def workout_recommendations_route(input_data: GetWorkoutRecommendationsInput):
    """
    Get personalized exercise recommendations for a user.
    
    This tool provides exercise recommendations based on the user's goals,
    preferences, and progress. It can filter by equipment, muscle groups,
    and difficulty level.
    """
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
    return await generate_workout_plan(input_data)
