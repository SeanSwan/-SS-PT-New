"""
MCP tool for workout statistics.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetWorkoutStatisticsInput,
    GetWorkoutStatisticsOutput,
    WorkoutStatistics
)
from ..utils import make_api_request

logger = logging.getLogger("workout_mcp_server.tools.statistics_tool")

async def get_workout_statistics(input_data: GetWorkoutStatisticsInput) -> GetWorkoutStatisticsOutput:
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workout statistics: {str(e)}"
        )
