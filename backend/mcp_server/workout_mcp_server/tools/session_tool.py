"""
MCP tool for workout sessions.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    LogWorkoutSessionInput,
    LogWorkoutSessionOutput
)
from ..utils import make_api_request

logger = logging.getLogger("workout_mcp_server.tools.session_tool")

async def log_workout_session(input_data: LogWorkoutSessionInput) -> LogWorkoutSessionOutput:
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
