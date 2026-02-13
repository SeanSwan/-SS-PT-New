"""
MCP Tool for getting gamification profiles.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    GetGamificationProfileInput,
    GetGamificationProfileOutput
)
from ..services import get_or_create_gamification_profile

logger = logging.getLogger("gamification_mcp_server.tools.profile_tool")

async def get_gamification_profile(input_data: GetGamificationProfileInput) -> GetGamificationProfileOutput:
    """
    Get a user's complete gamification profile.
    
    This tool retrieves all gamification-related data for a user, including:
    - Levels (overall and all categories)
    - Experience points and Energy Tokens
    - Achievements and streaks
    - Activity tracking statistics
    - Board position
    """
    try:
        # Get profile, creating if it doesn't exist
        profile = await get_or_create_gamification_profile(input_data.userId)
        
        # Build title based on level
        level_title = "Seeker"  # Default for level 0-1
        if profile.overallLevel >= 50:
            level_title = "Legend"
        elif profile.overallLevel >= 40:
            level_title = "Master"
        elif profile.overallLevel >= 30:
            level_title = "Warrior"
        elif profile.overallLevel >= 20:
            level_title = "Guardian"
        elif profile.overallLevel >= 10:
            level_title = "Adept"
        elif profile.overallLevel >= 5:
            level_title = "Initiate"
        
        return GetGamificationProfileOutput(
            profile=profile,
            message=f"Lv.{profile.overallLevel} {level_title} • {profile.energyTokens} ET • {profile.experiencePoints} XP"
        )
        
    except Exception as e:
        logger.error(f"Error in GetGamificationProfile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get gamification profile: {str(e)}"
        )
