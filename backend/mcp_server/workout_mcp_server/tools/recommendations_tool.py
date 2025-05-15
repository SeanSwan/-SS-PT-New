"""
MCP tool for exercise recommendations.
"""

import logging
import sys
import os
from pathlib import Path
from fastapi import HTTPException, status

# Set up import paths BEFORE any imports
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Try absolute imports first, then relative as fallback
try:
    from models import (
        GetWorkoutRecommendationsInput,
        GetWorkoutRecommendationsOutput
    )
    from utils import make_api_request
except ImportError:
    try:
        from ..models import (
            GetWorkoutRecommendationsInput,
            GetWorkoutRecommendationsOutput
        )
        from ..utils import make_api_request
    except ImportError as e:
        # Create minimal placeholders if all imports fail
        from pydantic import BaseModel
        
        class GetWorkoutRecommendationsInput(BaseModel):
            userId: str = ""
            goal: str = ""
            difficulty: str = ""
            equipment: list = []
            muscleGroups: list = []
            excludeExercises: list = []
            limit: int = 10
            rehabFocus: bool = False
            optPhase: str = ""
        
        class GetWorkoutRecommendationsOutput(BaseModel):
            exercises: list = []
            message: str = ""
        
        async def make_api_request(method, url, data=None):
            return {"error": "API request utility not available"}

logger = logging.getLogger("workout_mcp_server.tools.recommendations_tool")

async def get_workout_recommendations(input_data: GetWorkoutRecommendationsInput) -> GetWorkoutRecommendationsOutput:
    """
    Get personalized exercise recommendations for a user.
    
    This tool provides exercise recommendations based on the user's goals,
    preferences, and progress. It can filter by equipment, muscle groups,
    and difficulty level.
    """
    try:
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
            f"/exercises/recommended/{input_data.userId}", 
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workout recommendations: {str(e)}"
        )
