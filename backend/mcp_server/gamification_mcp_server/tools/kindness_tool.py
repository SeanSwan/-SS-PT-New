"""
MCP Tool for kindness quests.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetKindnessQuestsInput,
    GetKindnessQuestsOutput
)
from ..services import get_kindness_quests

logger = logging.getLogger("gamification_mcp_server.tools.kindness_tool")

async def get_available_kindness_quests(input_data: GetKindnessQuestsInput) -> GetKindnessQuestsOutput:
    """
    Get available kindness quests.
    
    This tool retrieves a random selection of kindness quests that the user
    can undertake, along with their rewards and verification requirements.
    """
    try:
        # Get a selection of kindness quests
        quests = get_kindness_quests(input_data.count)
        
        return GetKindnessQuestsOutput(
            quests=quests,
            message=f"Found {len(quests)} kindness quests for you to try!"
        )
        
    except Exception as e:
        logger.error(f"Error in GetKindnessQuests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get kindness quests: {str(e)}"
        )
