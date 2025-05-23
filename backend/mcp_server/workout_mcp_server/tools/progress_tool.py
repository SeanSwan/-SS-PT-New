"""
MCP tool for client progress.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetClientProgressInput,
    GetClientProgressOutput,
    ClientProgress
)
from ..utils import make_api_request

logger = logging.getLogger("workout_mcp_server.tools.progress_tool")

async def get_client_progress(input_data: GetClientProgressInput) -> GetClientProgressOutput:
    """
    Get a client's progress data.
    
    This tool retrieves comprehensive progress data for a client, including:
    - Skill levels (strength, cardio, flexibility, balance, core)
    - Workout history metrics
    - Streak information
    - Personal records
    """
    try:
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get client progress: {str(e)}"
        )
