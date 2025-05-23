"""
MCP Tool for getting achievements.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetAchievementsInput,
    GetAchievementsOutput
)
from ..services import (
    get_achievements, 
    get_or_create_gamification_profile
)

logger = logging.getLogger("gamification_mcp_server.tools.achievement_tool")

async def get_user_achievements(input_data: GetAchievementsInput) -> GetAchievementsOutput:
    """
    Get available achievements and user progress.
    
    This tool retrieves all achievements in the system, optionally filtered by category.
    If a userId is provided, it also returns which achievements have been earned.
    """
    try:
        # Get all achievements (optionally filtered by category)
        achievements = get_achievements(input_data.category)
        
        # Get earned achievements if userId provided
        earned_achievements = []
        if input_data.userId:
            profile = await get_or_create_gamification_profile(input_data.userId)
            earned_achievements = profile.achievements
        
        # Convert achievements to dictionaries for output
        achievement_dicts = [a.dict() for a in achievements]
        
        return GetAchievementsOutput(
            achievements=achievement_dicts,
            earnedAchievements=earned_achievements,
            message=f"Found {len(achievements)} achievements, {len(earned_achievements)} earned."
        )
        
    except Exception as e:
        logger.error(f"Error in GetAchievements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get achievements: {str(e)}"
        )
