"""
Workout MCP Server
=================

A Python-based MCP server that exposes workout tracking functionality through
the Model Context Protocol (MCP).

This server provides tools for:
- Retrieving workout recommendations
- Managing workout sessions
- Analyzing progress data
- Generating workout plans

To run this server:
```
python workout_mcp_server.py
```

The server will run on port 8000 by default.
"""

import os
import sys
import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Literal

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import requests

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("workout_mcp_server")

# Configure backend API connection
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:5000/api")
API_TOKEN = os.environ.get("API_TOKEN", "")

# Create FastAPI app
app = FastAPI(title="Workout MCP Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up MCP models

class MuscleGroup(BaseModel):
    """Muscle group information."""
    id: str
    name: str
    shortName: str
    bodyRegion: Literal['upper_body', 'lower_body', 'core', 'full_body']
    
class Equipment(BaseModel):
    """Exercise equipment information."""
    id: str
    name: str
    category: str
    
class Exercise(BaseModel):
    """Exercise information."""
    id: str
    name: str
    description: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    exerciseType: Optional[str] = None
    isRehabExercise: Optional[bool] = False
    optPhase: Optional[str] = None
    muscleGroups: Optional[List[MuscleGroup]] = None
    equipment: Optional[List[Equipment]] = None

class SetData(BaseModel):
    """Data for a single exercise set."""
    setNumber: int
    setType: str = "working"
    repsGoal: Optional[int] = None
    repsCompleted: Optional[int] = None
    weightGoal: Optional[float] = None
    weightUsed: Optional[float] = None
    duration: Optional[int] = None
    distance: Optional[float] = None
    restGoal: Optional[int] = None
    restTaken: Optional[int] = None
    rpe: Optional[float] = None
    tempo: Optional[str] = None
    notes: Optional[str] = None
    isPR: Optional[bool] = False
    completedAt: Optional[datetime] = None

class WorkoutExercise(BaseModel):
    """Exercise within a workout session."""
    id: Optional[str] = None
    exerciseId: str
    orderInWorkout: Optional[int] = None
    performanceRating: Optional[int] = None
    difficultyRating: Optional[int] = None
    painLevel: Optional[int] = 0
    formRating: Optional[int] = None
    formNotes: Optional[str] = None
    isRehabExercise: Optional[bool] = False
    notes: Optional[str] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    sets: Optional[List[SetData]] = None
    exercise: Optional[Exercise] = None

class WorkoutSession(BaseModel):
    """Workout session data."""
    id: Optional[str] = None
    userId: str
    workoutPlanId: Optional[str] = None
    title: str
    description: Optional[str] = None
    plannedStartTime: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    status: str = "planned"
    duration: Optional[int] = None
    caloriesBurned: Optional[int] = None
    feelingRating: Optional[int] = None
    intensityRating: Optional[int] = None
    notes: Optional[str] = None
    exercises: Optional[List[WorkoutExercise]] = None

class ClientProgress(BaseModel):
    """Client progress data."""
    userId: str
    strengthLevel: int = 1
    cardioLevel: int = 1
    flexibilityLevel: int = 1
    balanceLevel: int = 1
    coreLevel: int = 1
    totalWorkouts: Optional[int] = 0
    totalSets: Optional[int] = 0
    totalReps: Optional[int] = 0
    totalWeight: Optional[float] = 0
    totalExercises: Optional[int] = 0
    lastWorkoutDate: Optional[datetime] = None
    currentStreak: Optional[int] = 0
    personalRecords: Optional[Dict[str, List[Dict[str, Any]]]] = None

class WorkoutStat(BaseModel):
    """Workout statistics data."""
    id: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    exerciseCount: Optional[int] = None
    intensity: Optional[int] = None

class WorkoutStatistics(BaseModel):
    """Comprehensive workout statistics."""
    totalWorkouts: int
    totalDuration: int
    totalExercises: int
    totalSets: int
    totalReps: int
    totalWeight: float
    averageIntensity: float
    weekdayBreakdown: List[int]
    exerciseBreakdown: Optional[List[Dict[str, Any]]] = None
    muscleGroupBreakdown: Optional[List[Dict[str, Any]]] = None
    intensityTrends: Optional[List[Dict[str, Any]]] = None
    recentWorkouts: Optional[List[WorkoutStat]] = None

class WorkoutPlanDayExercise(BaseModel):
    """Exercise within a workout plan day."""
    exerciseId: str
    orderInWorkout: Optional[int] = None
    setScheme: Optional[str] = None
    repGoal: Optional[str] = None
    restPeriod: Optional[int] = None
    tempo: Optional[str] = None
    intensityGuideline: Optional[str] = None
    supersetGroup: Optional[int] = None
    notes: Optional[str] = None
    isOptional: Optional[bool] = False
    alternateExerciseId: Optional[str] = None

class WorkoutPlanDay(BaseModel):
    """Day within a workout plan."""
    dayNumber: int
    name: str
    focus: Optional[str] = None
    dayType: str = "training"
    optPhase: Optional[str] = None
    notes: Optional[str] = None
    warmupInstructions: Optional[str] = None
    cooldownInstructions: Optional[str] = None
    estimatedDuration: Optional[int] = None
    sortOrder: Optional[int] = None
    exercises: Optional[List[WorkoutPlanDayExercise]] = None

class WorkoutPlan(BaseModel):
    """Workout plan data."""
    name: str
    description: Optional[str] = None
    trainerId: str
    clientId: str
    goal: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    status: str = "active"
    days: Optional[List[WorkoutPlanDay]] = None

# MCP Tool Input/Output Models

class GetWorkoutRecommendationsInput(BaseModel):
    """Input for workout recommendations tool."""
    userId: str
    goal: Optional[str] = "general"
    difficulty: Optional[str] = "all"
    equipment: Optional[List[str]] = Field(default_factory=list)
    muscleGroups: Optional[List[str]] = Field(default_factory=list)
    excludeExercises: Optional[List[str]] = Field(default_factory=list)
    limit: Optional[int] = 10
    rehabFocus: Optional[bool] = False
    optPhase: Optional[str] = None

class GetWorkoutRecommendationsOutput(BaseModel):
    """Output for workout recommendations tool."""
    exercises: List[Exercise]
    message: str

class GetClientProgressInput(BaseModel):
    """Input for client progress tool."""
    userId: str

class GetClientProgressOutput(BaseModel):
    """Output for client progress tool."""
    progress: ClientProgress
    message: str

class GetWorkoutStatisticsInput(BaseModel):
    """Input for workout statistics tool."""
    userId: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    includeExerciseBreakdown: Optional[bool] = True
    includeMuscleGroupBreakdown: Optional[bool] = True
    includeWeekdayBreakdown: Optional[bool] = True
    includeIntensityTrends: Optional[bool] = True

class GetWorkoutStatisticsOutput(BaseModel):
    """Output for workout statistics tool."""
    statistics: WorkoutStatistics
    message: str

class LogWorkoutSessionInput(BaseModel):
    """Input for logging a workout session."""
    session: WorkoutSession

class LogWorkoutSessionOutput(BaseModel):
    """Output for logging a workout session."""
    session: WorkoutSession
    message: str

class GenerateWorkoutPlanInput(BaseModel):
    """Input for generating a workout plan."""
    trainerId: str
    clientId: str
    name: str
    description: Optional[str] = None
    goal: Optional[str] = "general"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    daysPerWeek: int = 3
    focusAreas: Optional[List[str]] = None
    difficulty: Optional[str] = "intermediate"
    optPhase: Optional[str] = None
    equipment: Optional[List[str]] = None

class GenerateWorkoutPlanOutput(BaseModel):
    """Output for generating a workout plan."""
    plan: WorkoutPlan
    message: str

# Global state for mock data mode
USE_MOCK_DATA = True  # Set to True when backend is not available

# Mock data for testing
def get_mock_exercises(limit: int = 10):
    """Return mock exercise data for testing."""
    mock_exercises = [
        {
            "id": "ex-1",
            "name": "Push-ups",
            "description": "Classic bodyweight exercise for chest and triceps",
            "difficulty": "beginner",
            "category": "strength",
            "exerciseType": "compound",
            "muscleGroups": [{"id": "chest", "name": "Chest", "shortName": "Chest", "bodyRegion": "upper_body"}],
            "equipment": [{"id": "bodyweight", "name": "Bodyweight", "category": "none"}]
        },
        {
            "id": "ex-2",
            "name": "Squats",
            "description": "Fundamental lower body exercise",
            "difficulty": "beginner",
            "category": "strength",
            "exerciseType": "compound",
            "muscleGroups": [{"id": "legs", "name": "Legs", "shortName": "Legs", "bodyRegion": "lower_body"}],
            "equipment": [{"id": "bodyweight", "name": "Bodyweight", "category": "none"}]
        },
        {
            "id": "ex-3",
            "name": "Plank",
            "description": "Core stability exercise",
            "difficulty": "beginner",
            "category": "core",
            "exerciseType": "isometric",
            "muscleGroups": [{"id": "core", "name": "Core", "shortName": "Core", "bodyRegion": "core"}],
            "equipment": [{"id": "bodyweight", "name": "Bodyweight", "category": "none"}]
        },
        {
            "id": "ex-4",
            "name": "Lunges",
            "description": "Unilateral leg exercise",
            "difficulty": "intermediate",
            "category": "strength",
            "exerciseType": "compound",
            "muscleGroups": [{"id": "legs", "name": "Legs", "shortName": "Legs", "bodyRegion": "lower_body"}],
            "equipment": [{"id": "bodyweight", "name": "Bodyweight", "category": "none"}]
        },
        {
            "id": "ex-5",
            "name": "Jumping Jacks",
            "description": "Cardio exercise with full body movement",
            "difficulty": "beginner",
            "category": "cardio",
            "exerciseType": "cardio",
            "muscleGroups": [{"id": "full_body", "name": "Full Body", "shortName": "Full", "bodyRegion": "full_body"}],
            "equipment": [{"id": "bodyweight", "name": "Bodyweight", "category": "none"}]
        }
    ]
    return mock_exercises[:limit]

def get_mock_client_progress(userId: str):
    """Return mock client progress data."""
    return {
        "userId": userId,
        "strengthLevel": 3,
        "cardioLevel": 2,
        "flexibilityLevel": 2,
        "balanceLevel": 1,
        "coreLevel": 3,
        "totalWorkouts": 15,
        "totalSets": 150,
        "totalReps": 2250,
        "totalWeight": 11250,
        "totalExercises": 45,
        "lastWorkoutDate": datetime.now().isoformat(),
        "currentStreak": 3,
        "personalRecords": {}
    }

def get_mock_workout_statistics(userId: str):
    """Return mock workout statistics."""
    return {
        "totalWorkouts": 15,
        "totalDuration": 900,  # 15 hours
        "totalExercises": 45,
        "totalSets": 150,
        "totalReps": 2250,
        "totalWeight": 11250,
        "averageIntensity": 7.5,
        "weekdayBreakdown": [3, 2, 3, 2, 3, 1, 1],  # Mon-Sun
        "exerciseBreakdown": [
            {"exerciseId": "ex-1", "name": "Push-ups", "count": 15},
            {"exerciseId": "ex-2", "name": "Squats", "count": 12},
            {"exerciseId": "ex-3", "name": "Plank", "count": 10}
        ],
        "muscleGroupBreakdown": [
            {"muscleGroup": "Chest", "count": 15},
            {"muscleGroup": "Legs", "count": 12},
            {"muscleGroup": "Core", "count": 10}
        ],
        "intensityTrends": [
            {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), "intensity": 7 + (i % 3)}
            for i in range(7)
        ],
        "recentWorkouts": [
            {
                "id": f"workout-{i}",
                "title": f"Workout {i+1}",
                "date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"),
                "duration": 60 + (i * 5)
            }
            for i in range(5)
        ]
    }

# API request helpers

async def make_api_request(method: str, path: str, data: Optional[Dict] = None, token: Optional[str] = None):
    """
    Make a request to the backend API.
    
    Args:
        method: HTTP method (GET, POST, PUT, DELETE)
        path: API path (without base URL)
        data: Request data (for POST/PUT)
        token: Authentication token
        
    Returns:
        Response data as dict
    """
    url = f"{BACKEND_API_URL}/{path.lstrip('/')}"
    headers = {
        'Content-Type': 'application/json'
    }
    
    if token or API_TOKEN:
        headers['Authorization'] = f"Bearer {token or API_TOKEN}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=data or {})
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data or {})
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data or {})
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, json=data or {})
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                error_message = error_data.get('message', str(e))
            except:
                error_message = f"API error: {e.response.status_code} - {str(e)}"
        else:
            error_message = f"API connection error: {str(e)}"
        
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=error_message
        )

# MCP routes

@app.post("/tools/GetWorkoutRecommendations", response_model=GetWorkoutRecommendationsOutput)
async def get_workout_recommendations(input_data: GetWorkoutRecommendationsInput):
    """
    Get personalized exercise recommendations for a user.
    
    This tool provides exercise recommendations based on the user's goals,
    preferences, and progress. It can filter by equipment, muscle groups,
    and difficulty level.
    """
    try:
        # Check if we should use mock data
        if USE_MOCK_DATA:
            logger.info("Using mock data for workout recommendations")
            exercises = get_mock_exercises(input_data.limit or 10)
            return GetWorkoutRecommendationsOutput(
                exercises=exercises,
                message=f"Found {len(exercises)} recommended exercises (mock data)."
            )
        
        # Convert input data to API params
        params = {
            "goal": input_data.goal,
            "difficulty": input_data.difficulty,
            "equipment": input_data.equipment,
            "muscleGroups": input_data.muscleGroups,
            "excludeExercises": input_data.excludeExercises,
            "limit": input_data.limit,
            "rehabFocus": input_data.rehabFocus,
            "optPhase": input_data.optPhase
        }
        
        # Make API request
        response = await make_api_request(
            "GET", 
            f"/exercises/recommendations/{input_data.userId}", 
            data=params
        )
        
        # Process response
        exercises = response.get("exercises", [])
        
        return GetWorkoutRecommendationsOutput(
            exercises=exercises,
            message=f"Found {len(exercises)} recommended exercises based on your criteria."
        )
    except Exception as e:
        logger.error(f"Error in GetWorkoutRecommendations: {str(e)}")
        # Fallback to mock data on error
        logger.info("Falling back to mock data due to error")
        exercises = get_mock_exercises(input_data.limit or 10)
        return GetWorkoutRecommendationsOutput(
            exercises=exercises,
            message=f"Found {len(exercises)} recommended exercises (mock data - backend unavailable)."
        )

@app.post("/tools/GetClientProgress", response_model=GetClientProgressOutput)
async def get_client_progress(input_data: GetClientProgressInput):
    """
    Get a client's progress data.
    
    This tool retrieves comprehensive progress data for a client, including:
    - Skill levels (strength, cardio, flexibility, balance, core)
    - Workout history metrics
    - Streak information
    - Personal records
    """
    try:
        # Check if we should use mock data
        if USE_MOCK_DATA:
            logger.info("Using mock data for client progress")
            progress = get_mock_client_progress(input_data.userId)
            return GetClientProgressOutput(
                progress=progress,
                message="Retrieved client progress data successfully (mock data)."
            )
        
        # Make API request
        response = await make_api_request(
            "GET", 
            f"/client-progress/{input_data.userId}"
        )
        
        # Process response
        progress = response.get("progress", {})
        
        if not progress:
            return GetClientProgressOutput(
                progress=ClientProgress(userId=input_data.userId),
                message="No progress data found for this client."
            )
        
        return GetClientProgressOutput(
            progress=progress,
            message="Retrieved client progress data successfully."
        )
    except Exception as e:
        logger.error(f"Error in GetClientProgress: {str(e)}")
        # Fallback to mock data on error
        logger.info("Falling back to mock data due to error")
        progress = get_mock_client_progress(input_data.userId)
        return GetClientProgressOutput(
            progress=progress,
            message="Retrieved client progress data (mock data - backend unavailable)."
        )

@app.post("/tools/GetWorkoutStatistics", response_model=GetWorkoutStatisticsOutput)
async def get_workout_statistics(input_data: GetWorkoutStatisticsInput):
    """
    Get comprehensive workout statistics for a user.
    
    This tool provides detailed workout statistics including:
    - Total workout metrics (count, duration, reps, sets, weight)
    - Exercise breakdown by frequency
    - Muscle group activation breakdown
    - Workout schedule patterns (weekday breakdown)
    - Intensity trends over time
    """
    try:
        # Check if we should use mock data
        if USE_MOCK_DATA:
            logger.info("Using mock data for workout statistics")
            statistics = get_mock_workout_statistics(input_data.userId)
            return GetWorkoutStatisticsOutput(
                statistics=statistics,
                message="Retrieved workout statistics successfully (mock data)."
            )
        
        # Convert input data to API params
        params = {
            "startDate": input_data.startDate,
            "endDate": input_data.endDate,
            "includeExerciseBreakdown": input_data.includeExerciseBreakdown,
            "includeMuscleGroupBreakdown": input_data.includeMuscleGroupBreakdown,
            "includeWeekdayBreakdown": input_data.includeWeekdayBreakdown,
            "includeIntensityTrends": input_data.includeIntensityTrends
        }
        
        # Make API request
        response = await make_api_request(
            "GET", 
            f"/workout/statistics/{input_data.userId}", 
            data=params
        )
        
        # Process response
        statistics = response.get("statistics", {})
        
        if not statistics:
            return GetWorkoutStatisticsOutput(
                statistics=WorkoutStatistics(
                    totalWorkouts=0,
                    totalDuration=0,
                    totalExercises=0,
                    totalSets=0,
                    totalReps=0,
                    totalWeight=0,
                    averageIntensity=0,
                    weekdayBreakdown=[0, 0, 0, 0, 0, 0, 0]
                ),
                message="No workout statistics found for this user."
            )
        
        return GetWorkoutStatisticsOutput(
            statistics=statistics,
            message="Retrieved workout statistics successfully."
        )
    except Exception as e:
        logger.error(f"Error in GetWorkoutStatistics: {str(e)}")
        # Fallback to mock data on error
        logger.info("Falling back to mock data due to error")
        statistics = get_mock_workout_statistics(input_data.userId)
        return GetWorkoutStatisticsOutput(
            statistics=statistics,
            message="Retrieved workout statistics (mock data - backend unavailable)."
        )

@app.post("/tools/LogWorkoutSession", response_model=LogWorkoutSessionOutput)
async def log_workout_session(input_data: LogWorkoutSessionInput):
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
    try:
        # Check if we're creating or updating a session
        if input_data.session.id:
            # Update existing session
            response = await make_api_request(
                "PUT", 
                f"/workout/sessions/{input_data.session.id}", 
                data=input_data.session.model_dump(exclude_none=True)
            )
            message = "Workout session updated successfully"
        else:
            # Create new session
            response = await make_api_request(
                "POST", 
                "/workout/sessions", 
                data=input_data.session.model_dump(exclude_none=True)
            )
            message = "New workout session created successfully"
        
        # Process response
        session = response.get("session", {})
        
        return LogWorkoutSessionOutput(
            session=session,
            message=message
        )
    except Exception as e:
        logger.error(f"Error in LogWorkoutSession: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log workout session: {str(e)}"
        )

@app.post("/tools/GenerateWorkoutPlan", response_model=GenerateWorkoutPlanOutput)
async def generate_workout_plan(input_data: GenerateWorkoutPlanInput):
    """
    Generate a personalized workout plan for a client.
    
    This tool creates a comprehensive workout plan based on the client's goals,
    preferences, and available equipment. It generates multiple workout days
    with appropriate exercises, set/rep schemes, and instructions.
    
    The generated plan can be used as a starting point for trainers or can be
    directly assigned to clients.
    """
    try:
        # Convert input to API format
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Set default dates if not provided
        start_date = input_data.startDate or current_date
        end_date = input_data.endDate
        if not end_date:
            # Default to 8 weeks if not specified
            end_date_obj = datetime.strptime(start_date, "%Y-%m-%d") + timedelta(weeks=8)
            end_date = end_date_obj.strftime("%Y-%m-%d")
        
        # Prepare the plan structure
        plan_data = {
            "name": input_data.name,
            "description": input_data.description,
            "trainerId": input_data.trainerId,
            "clientId": input_data.clientId,
            "goal": input_data.goal,
            "startDate": start_date,
            "endDate": end_date,
            "status": "active",
            "days": []
        }
        
        # First, get client progress data to customize the plan
        progress_response = await make_api_request(
            "GET", 
            f"/client-progress/{input_data.clientId}"
        )
        client_progress = progress_response.get("progress", {})
        
        # Then, get exercise recommendations based on goals and equipment
        exercise_params = {
            "goal": input_data.goal,
            "difficulty": input_data.difficulty,
            "equipment": input_data.equipment,
            "muscleGroups": input_data.focusAreas,
            "limit": 30,  # Get a good selection to choose from
            "optPhase": input_data.optPhase
        }
        
        exercises_response = await make_api_request(
            "GET", 
            f"/exercises/recommendations/{input_data.clientId}", 
            data=exercise_params
        )
        
        recommended_exercises = exercises_response.get("exercises", [])
        
        if not recommended_exercises:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No suitable exercises found with the given criteria"
            )
        
        # Group exercises by category
        exercise_categories = {}
        for exercise in recommended_exercises:
            category = exercise.get("category", "other")
            if category not in exercise_categories:
                exercise_categories[category] = []
            exercise_categories[category].append(exercise)
        
        # Create workout days based on daysPerWeek
        day_types = []
        if input_data.daysPerWeek == 3:
            # 3-day split (e.g., full body x3)
            day_types = ["full_body", "full_body", "full_body"]
        elif input_data.daysPerWeek == 4:
            # 4-day split (e.g., upper/lower split)
            day_types = ["upper_body", "lower_body", "upper_body", "lower_body"]
        elif input_data.daysPerWeek == 5:
            # 5-day split (e.g., push/pull/legs)
            day_types = ["push", "pull", "legs", "push", "pull"]
        elif input_data.daysPerWeek == 6:
            # 6-day PPL split
            day_types = ["push", "pull", "legs", "push", "pull", "legs"]
        else:
            # Default to full body workouts
            day_types = ["full_body"] * input_data.daysPerWeek
        
        # Generate days
        for i, day_type in enumerate(day_types):
            day_number = i + 1
            day = {
                "dayNumber": day_number,
                "name": f"{day_type.replace('_', ' ').title()} Day {day_number}",
                "focus": day_type,
                "dayType": "training",
                "optPhase": input_data.optPhase,
                "sortOrder": day_number,
                "exercises": []
            }
            
            # Select exercises for this day type
            selected_exercises = []
            
            if day_type == "full_body":
                # For full body, select some exercises from each major category
                categories_to_include = ["strength", "cardio", "core"]
                for category in categories_to_include:
                    if category in exercise_categories:
                        # Take 2-3 exercises from each category
                        exercises_to_include = exercise_categories[category][:3]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "upper_body":
                # For upper body, focus on upper body exercises
                relevant_categories = ["chest", "back", "shoulders", "arms"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "lower_body":
                # For lower body, focus on lower body exercises
                relevant_categories = ["legs", "glutes", "calves"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "push":
                # For push, focus on pushing movements
                relevant_categories = ["chest", "shoulders", "triceps"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "pull":
                # For pull, focus on pulling movements
                relevant_categories = ["back", "biceps", "traps"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:2]
                        selected_exercises.extend(exercises_to_include)
            elif day_type == "legs":
                # For legs, focus on leg exercises
                relevant_categories = ["legs", "glutes", "calves"]
                for category in relevant_categories:
                    if category in exercise_categories:
                        exercises_to_include = exercise_categories[category][:3]
                        selected_exercises.extend(exercises_to_include)
            
            # Always include some core exercises
            if "core" in exercise_categories:
                core_exercises = exercise_categories["core"][:2]
                selected_exercises.extend(core_exercises)
            
            # Limit to 6-8 exercises per day
            selected_exercises = selected_exercises[:8]
            
            # Add exercises to the day
            for j, exercise in enumerate(selected_exercises):
                # Determine appropriate set/rep scheme based on exercise type and goals
                set_scheme = "3x10"  # Default
                rep_goal = "10"
                rest_period = 60  # Default rest in seconds
                
                if input_data.goal == "strength":
                    set_scheme = "5x5"
                    rep_goal = "5"
                    rest_period = 120
                elif input_data.goal == "hypertrophy":
                    set_scheme = "4x8-12"
                    rep_goal = "8-12"
                    rest_period = 90
                elif input_data.goal == "endurance":
                    set_scheme = "3x15-20"
                    rep_goal = "15-20"
                    rest_period = 45
                
                # Customize based on exercise category
                category = exercise.get("category", "")
                if category == "cardio":
                    set_scheme = "1x15-30"
                    rep_goal = "15-30 min"
                    rest_period = 0
                
                # Add the exercise to the day
                day["exercises"].append({
                    "exerciseId": exercise["id"],
                    "orderInWorkout": j + 1,
                    "setScheme": set_scheme,
                    "repGoal": rep_goal,
                    "restPeriod": rest_period,
                    "notes": exercise.get("description", "")[:100] if exercise.get("description") else None
                })
            
            # Add the day to the plan
            plan_data["days"].append(day)
        
        # Make API request to create the plan
        response = await make_api_request(
            "POST", 
            "/workout/plans", 
            data=plan_data
        )
        
        # Process response
        plan = response.get("plan", {})
        
        return GenerateWorkoutPlanOutput(
            plan=plan,
            message=f"Generated a {input_data.daysPerWeek}-day workout plan with a focus on {input_data.goal or 'general fitness'}."
        )
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error in GenerateWorkoutPlan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate workout plan: {str(e)}"
        )

# MCP Index and Schema routes

@app.get("/tools")
async def list_tools():
    """List all available MCP tools."""
    return {
        "tools": [
            {
                "name": "GetWorkoutRecommendations",
                "description": "Get personalized exercise recommendations for a user.",
                "input_schema": GetWorkoutRecommendationsInput.schema(),
                "output_schema": GetWorkoutRecommendationsOutput.schema()
            },
            {
                "name": "GetClientProgress",
                "description": "Get a client's progress data.",
                "input_schema": GetClientProgressInput.schema(),
                "output_schema": GetClientProgressOutput.schema()
            },
            {
                "name": "GetWorkoutStatistics",
                "description": "Get comprehensive workout statistics for a user.",
                "input_schema": GetWorkoutStatisticsInput.schema(),
                "output_schema": GetWorkoutStatisticsOutput.schema()
            },
            {
                "name": "LogWorkoutSession",
                "description": "Log a workout session for a user.",
                "input_schema": LogWorkoutSessionInput.schema(),
                "output_schema": LogWorkoutSessionOutput.schema()
            },
            {
                "name": "GenerateWorkoutPlan",
                "description": "Generate a personalized workout plan for a client.",
                "input_schema": GenerateWorkoutPlanInput.schema(),
                "output_schema": GenerateWorkoutPlanOutput.schema()
            }
        ]
    }

@app.get("/")
async def root():
    """MCP Server root endpoint."""
    return {
        "name": "Workout MCP Server",
        "version": "1.0.0",
        "description": "MCP server for workout tracking functionality",
        "tools_endpoint": "/tools"
    }

@app.get("/schema")
async def schema():
    """Get the OpenAPI schema for this MCP server."""
    return app.openapi()

@app.get("/health")
async def health_check():
    """Check the health of the server."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": "Development" if os.environ.get("DEBUG", False) else "Production",
        "server": "Workout MCP Server (Standalone)",
        "backend_url": BACKEND_API_URL,
        "mock_mode": USE_MOCK_DATA
    }

@app.get("/metrics")
async def get_metrics():
    """Get server metrics."""
    import time
    from datetime import datetime
    
    # Basic server metrics
    return {
        "server": "Workout MCP Server (Standalone)",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": time.time() - (getattr(app, 'start_time', time.time())),
        "version": "1.0.0",
        "environment": "Development" if os.environ.get("DEBUG", False) else "Production",
        "backend_url": BACKEND_API_URL,
        "mock_mode": USE_MOCK_DATA
    }

# Error handler
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
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Set startup time for metrics."""
    import time
    app.start_time = time.time()
    logger.info("Standalone Workout MCP Server started")

if __name__ == "__main__":
    # Run the server
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
