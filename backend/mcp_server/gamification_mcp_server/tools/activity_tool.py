"""
MCP Tool for logging activities.
"""

import logging
from fastapi import HTTPException, status

from ..models import (
    LogActivityInput,
    LogActivityOutput
)
from ..services import (
    get_or_create_gamification_profile,
    calculate_activity_rewards,
    apply_rewards_to_profile,
    save_gamification_profile
)

logger = logging.getLogger("gamification_mcp_server.tools.activity_tool")

async def log_activity(input_data: LogActivityInput) -> LogActivityOutput:
    """
    Log an activity and calculate rewards.
    
    This tool is the central hub for the gamification system. It processes:
    - Workout completions, stretching, foam rolling
    - Supplement logging (vitamins, greens)
    - Nutrition tracking (meals, protein goals, post-workout nutrition)
    - Community actions (kindness quests, good deeds)
    - Rep and set tracking
    
    It calculates appropriate rewards, updates achievements, streaks,
    and progression across all gamification elements.
    """
    try:
        # Get user profile
        profile = await get_or_create_gamification_profile(input_data.userId)
        
        # Calculate rewards
        rewards = await calculate_activity_rewards(
            input_data.userId,
            input_data.activityType,
            input_data.value,
            input_data.duration,
            input_data.metadata
        )
        
        # Apply rewards to profile
        updated_profile = await apply_rewards_to_profile(profile, rewards)
        
        # Save updated profile
        await save_gamification_profile(updated_profile)
        
        # Build success message
        message_parts = []
        
        # Add basic rewards
        if rewards.energyTokens > 0:
            message_parts.append(f"+{rewards.energyTokens} Energy Tokens")
        if rewards.experiencePoints > 0:
            message_parts.append(f"+{rewards.experiencePoints} XP")
        
        # Add level ups
        for level_type, level in rewards.levelUps.items():
            message_parts.append(f"{level_type.title()} Level Up to {level}!")
        
        # Add achievements
        for achievement in rewards.achievements:
            message_parts.append(f"Achievement Unlocked: {achievement.replace('_', ' ').title()}")
        
        # Add streak updates
        for streak_type, value in rewards.streakUpdates.items():
            if value >= 5:  # Only mention significant streaks
                message_parts.append(f"{streak_type.title()} Streak: {value} days")
        
        # Combine into message
        if message_parts:
            message = "Activity logged! " + " • ".join(message_parts)
        else:
            message = "Activity logged successfully."
        
        return LogActivityOutput(
            success=True,
            profile=updated_profile,
            rewards=rewards,
            message=message
        )
        
    except Exception as e:
        logger.error(f"Error in LogActivity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log activity: {str(e)}"
        )
