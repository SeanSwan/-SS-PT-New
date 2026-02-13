"""
Service for calculating and applying rewards.
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from ..models import (
    ActivityType, 
    GamificationProfile, 
    ActivityReward
)
from .profile_service import get_or_create_gamification_profile

logger = logging.getLogger("gamification_mcp_server.rewards_service")

async def calculate_activity_rewards(
    userId: str, 
    activityType: ActivityType, 
    value: int = 1, 
    duration: Optional[int] = None, 
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityReward:
    """
    Calculate rewards for an activity.
    
    Args:
        userId: User ID
        activityType: Type of activity
        value: Activity value (e.g., reps, sets)
        duration: Activity duration in minutes (if applicable)
        metadata: Additional activity metadata
        
    Returns:
        ActivityReward: Calculated rewards
    """
    # Initialize reward object
    rewards = ActivityReward()
    
    # Get user profile for level-based calculations
    profile = await get_or_create_gamification_profile(userId)
    
    # Base reward values (these could be moved to config/database later)
    reward_config = {
        ActivityType.WORKOUT: {"et": 5, "xp": 50, "categories": ["strength", "cardio", "core"]},
        ActivityType.STRETCH: {"et": 8, "xp": 30, "categories": ["flexibility", "recovery"]},
        ActivityType.FOAM_ROLL: {"et": 8, "xp": 30, "categories": ["recovery"]},
        ActivityType.LOG_VITAMIN: {"et": 10, "xp": 20, "categories": ["nutrition"]},
        ActivityType.LOG_GREENS: {"et": 10, "xp": 20, "categories": ["nutrition"]},
        ActivityType.LOG_MEAL: {"et": 5, "xp": 10, "categories": ["nutrition"]},
        ActivityType.HIT_PROTEIN_GOAL: {"et": 8, "xp": 40, "categories": ["nutrition"]},
        ActivityType.POST_WORKOUT_NUTRITION: {"et": 8, "xp": 30, "categories": ["nutrition"]},
        ActivityType.KINDNESS_QUEST: {"et": 15, "xp": 40, "categories": ["community"]},
        ActivityType.DAILY_GOOD_DEED: {"et": 5, "xp": 20, "categories": ["community"]},
        ActivityType.SHARE_EXPERIENCE: {"et": 3, "xp": 10, "categories": ["community"]},
        ActivityType.DAILY_LOGIN: {"et": 2, "xp": 5, "categories": []},
        ActivityType.COMPLETE_CHALLENGE: {"et": 20, "xp": 100, "categories": []},
        ActivityType.SET_COMPLETED: {"et": 1, "xp": 3, "categories": []},
        ActivityType.REP_COMPLETED: {"et": 0.1, "xp": 0.5, "categories": []}
    }
    
    # Get base rewards for this activity type
    base_reward = reward_config.get(activityType, {"et": 0, "xp": 0, "categories": []})
    
    # Calculate Energy Tokens (ET)
    et_reward = base_reward["et"]
    
    # Scale rewards by value/duration if applicable
    if activityType in [ActivityType.STRETCH, ActivityType.FOAM_ROLL] and duration:
        # Scale by minutes but cap at reasonable amount
        et_reward = min(base_reward["et"] * (duration / 5), base_reward["et"] * 5)
    elif activityType in [ActivityType.SET_COMPLETED, ActivityType.REP_COMPLETED]:
        # Scale directly by value (e.g., number of reps)
        et_reward = base_reward["et"] * value
    
    # Apply bonuses based on streaks and other factors
    streak_bonus = 1.0  # Base multiplier
    
    # Check for streak bonuses
    if activityType in [ActivityType.WORKOUT, ActivityType.STRETCH, ActivityType.FOAM_ROLL]:
        activity_streak = profile.streaks.get("activity", 0)
        if activity_streak >= 7:
            streak_bonus += 0.25  # +25% for 7+ day streak
        elif activity_streak >= 3:
            streak_bonus += 0.1   # +10% for 3+ day streak
    
    # Apply multipliers
    et_reward = round(et_reward * streak_bonus)
    
    # Calculate Experience Points (XP)
    xp_reward = base_reward["xp"]
    
    # Scale XP similarly to ET
    if activityType in [ActivityType.STRETCH, ActivityType.FOAM_ROLL] and duration:
        xp_reward = min(base_reward["xp"] * (duration / 5), base_reward["xp"] * 5)
    elif activityType in [ActivityType.SET_COMPLETED, ActivityType.REP_COMPLETED]:
        xp_reward = base_reward["xp"] * value
    
    # Apply XP bonus
    xp_reward = round(xp_reward * streak_bonus)
    
    # Assign the base rewards
    rewards.energyTokens = et_reward
    rewards.experiencePoints = xp_reward
    
    # Distribute category-specific XP
    for category in base_reward["categories"]:
        category_xp = round(xp_reward / len(base_reward["categories"]))
        
        if category == "strength":
            rewards.strengthXp = category_xp
        elif category == "cardio":
            rewards.cardioXp = category_xp
        elif category == "flexibility":
            rewards.flexibilityXp = category_xp
        elif category == "balance":
            rewards.balanceXp = category_xp
        elif category == "core":
            rewards.coreXp = category_xp
        elif category == "nutrition":
            rewards.nutritionXp = category_xp
        elif category == "recovery":
            rewards.recoveryXp = category_xp
        elif category == "community":
            rewards.communityXp = category_xp
    
    # Check for achievements (simplified example)
    # This would actually be a much more complex database lookup and check
    if activityType == ActivityType.WORKOUT:
        profile.workoutsCompleted += 1
        if profile.workoutsCompleted == 10:
            rewards.achievements.append("workout_warrior_bronze")
        elif profile.workoutsCompleted == 50:
            rewards.achievements.append("workout_warrior_silver")
        elif profile.workoutsCompleted == 100:
            rewards.achievements.append("workout_warrior_gold")
    elif activityType == ActivityType.STRETCH:
        profile.stretchesCompleted += 1
        if profile.stretchesCompleted == 10:
            rewards.achievements.append("flexibility_fan_bronze")
    elif activityType == ActivityType.FOAM_ROLL:
        profile.foamRollsCompleted += 1
        if profile.foamRollsCompleted == 10:
            rewards.achievements.append("recovery_ritualist_bronze")
    elif activityType == ActivityType.LOG_VITAMIN:
        profile.vitaminsLogged += 1
        if profile.vitaminsLogged == 10:
            rewards.achievements.append("vitamin_virtuoso_bronze")
    elif activityType == ActivityType.LOG_GREENS:
        profile.greensLogged += 1
        if profile.greensLogged == 10:
            rewards.achievements.append("greens_guru_bronze")
    elif activityType == ActivityType.HIT_PROTEIN_GOAL:
        profile.proteinGoalsHit += 1
        if profile.proteinGoalsHit == 10:
            rewards.achievements.append("protein_pro_bronze")
    elif activityType == ActivityType.KINDNESS_QUEST:
        profile.kindnessQuestsCompleted += 1
        if profile.kindnessQuestsCompleted == 5:
            rewards.achievements.append("community_champion_bronze")
    
    # Update streaks
    streak_updates = {}
    
    # Activity streak (any workout, stretch, foam roll)
    if activityType in [ActivityType.WORKOUT, ActivityType.STRETCH, ActivityType.FOAM_ROLL]:
        # Check if it's been less than 48 hours since last activity
        # This gives a 1-day grace period for streaks
        if profile.lastActivityDate:
            hours_since_last = (datetime.now() - profile.lastActivityDate).total_seconds() / 3600
            if hours_since_last < 48:
                streak_updates["activity"] = profile.streaks.get("activity", 0) + 1
            else:
                streak_updates["activity"] = 1  # Reset streak to 1
        else:
            streak_updates["activity"] = 1  # First activity
    
    # Specific activity type streaks
    if activityType == ActivityType.STRETCH:
        streak_updates["stretch"] = profile.streaks.get("stretch", 0) + 1
    elif activityType == ActivityType.FOAM_ROLL:
        streak_updates["foam_roll"] = profile.streaks.get("foam_roll", 0) + 1
    elif activityType == ActivityType.LOG_VITAMIN:
        streak_updates["vitamin"] = profile.streaks.get("vitamin", 0) + 1
    elif activityType == ActivityType.LOG_GREENS:
        streak_updates["greens"] = profile.streaks.get("greens", 0) + 1
    elif activityType == ActivityType.HIT_PROTEIN_GOAL:
        streak_updates["protein_goal"] = profile.streaks.get("protein_goal", 0) + 1
    
    rewards.streakUpdates = streak_updates
    
    # Calculate level ups based on XP gains
    level_ups = {}
    
    # Overall level
    total_xp = profile.experiencePoints + rewards.experiencePoints
    xp_needed_overall = 100 + (profile.overallLevel * 25)
    if total_xp >= xp_needed_overall:
        level_ups["overall"] = profile.overallLevel + 1
    
    # Category levels
    # Strength
    if rewards.strengthXp > 0:
        total_strength_xp = profile.strengthExperiencePoints + rewards.strengthXp
        xp_needed_strength = 50 + (profile.strengthLevel * 15)
        if total_strength_xp >= xp_needed_strength:
            level_ups["strength"] = profile.strengthLevel + 1
    
    # Cardio
    if rewards.cardioXp > 0:
        total_cardio_xp = profile.cardioExperiencePoints + rewards.cardioXp
        xp_needed_cardio = 50 + (profile.cardioLevel * 15)
        if total_cardio_xp >= xp_needed_cardio:
            level_ups["cardio"] = profile.cardioLevel + 1
    
    # Flexibility
    if rewards.flexibilityXp > 0:
        total_flexibility_xp = profile.flexibilityExperiencePoints + rewards.flexibilityXp
        xp_needed_flexibility = 50 + (profile.flexibilityLevel * 15)
        if total_flexibility_xp >= xp_needed_flexibility:
            level_ups["flexibility"] = profile.flexibilityLevel + 1
    
    # Balance
    if rewards.balanceXp > 0:
        total_balance_xp = profile.balanceExperiencePoints + rewards.balanceXp
        xp_needed_balance = 50 + (profile.balanceLevel * 15)
        if total_balance_xp >= xp_needed_balance:
            level_ups["balance"] = profile.balanceLevel + 1
    
    # Core
    if rewards.coreXp > 0:
        total_core_xp = profile.coreExperiencePoints + rewards.coreXp
        xp_needed_core = 50 + (profile.coreLevel * 15)
        if total_core_xp >= xp_needed_core:
            level_ups["core"] = profile.coreLevel + 1
    
    # Nutrition
    if rewards.nutritionXp > 0:
        total_nutrition_xp = profile.nutritionExperiencePoints + rewards.nutritionXp
        xp_needed_nutrition = 50 + (profile.nutritionLevel * 15)
        if total_nutrition_xp >= xp_needed_nutrition:
            level_ups["nutrition"] = profile.nutritionLevel + 1
    
    # Recovery
    if rewards.recoveryXp > 0:
        total_recovery_xp = profile.recoveryExperiencePoints + rewards.recoveryXp
        xp_needed_recovery = 50 + (profile.recoveryLevel * 15)
        if total_recovery_xp >= xp_needed_recovery:
            level_ups["recovery"] = profile.recoveryLevel + 1
    
    # Community
    if rewards.communityXp > 0:
        total_community_xp = profile.communityExperiencePoints + rewards.communityXp
        xp_needed_community = 50 + (profile.communityLevel * 15)
        if total_community_xp >= xp_needed_community:
            level_ups["community"] = profile.communityLevel + 1
    
    rewards.levelUps = level_ups
    
    # Board movement is not calculated here, but would be handled by the roll dice function
    
    return rewards

async def apply_rewards_to_profile(profile: GamificationProfile, rewards: ActivityReward) -> GamificationProfile:
    """
    Apply rewards to a gamification profile.
    
    Args:
        profile: User's gamification profile
        rewards: Rewards to apply
        
    Returns:
        Updated GamificationProfile
    """
    # Update Energy Tokens and Experience Points
    profile.energyTokens += rewards.energyTokens
    profile.experiencePoints += rewards.experiencePoints
    
    # Update category-specific XP
    profile.strengthExperiencePoints += rewards.strengthXp
    profile.cardioExperiencePoints += rewards.cardioXp
    profile.flexibilityExperiencePoints += rewards.flexibilityXp
    profile.balanceExperiencePoints += rewards.balanceXp
    profile.coreExperiencePoints += rewards.coreXp
    profile.nutritionExperiencePoints += rewards.nutritionXp
    profile.recoveryExperiencePoints += rewards.recoveryXp
    profile.communityExperiencePoints += rewards.communityXp
    
    # Apply streak updates
    for streak_type, value in rewards.streakUpdates.items():
        profile.streaks[streak_type] = value
    
    # Apply level ups
    for level_type, new_level in rewards.levelUps.items():
        if level_type == "overall":
            profile.overallLevel = new_level
        elif level_type == "strength":
            profile.strengthLevel = new_level
            profile.strengthExperiencePoints = 0  # Reset XP after level up
        elif level_type == "cardio":
            profile.cardioLevel = new_level
            profile.cardioExperiencePoints = 0
        elif level_type == "flexibility":
            profile.flexibilityLevel = new_level
            profile.flexibilityExperiencePoints = 0
        elif level_type == "balance":
            profile.balanceLevel = new_level
            profile.balanceExperiencePoints = 0
        elif level_type == "core":
            profile.coreLevel = new_level
            profile.coreExperiencePoints = 0
        elif level_type == "nutrition":
            profile.nutritionLevel = new_level
            profile.nutritionExperiencePoints = 0
        elif level_type == "recovery":
            profile.recoveryLevel = new_level
            profile.recoveryExperiencePoints = 0
        elif level_type == "community":
            profile.communityLevel = new_level
            profile.communityExperiencePoints = 0
    
    # Add achievements
    for achievement in rewards.achievements:
        if achievement not in profile.achievements:
            profile.achievements.append(achievement)
            profile.achievementDates[achievement] = datetime.now().isoformat()
    
    # Update board position if needed
    if rewards.boardMovement > 0:
        profile.boardPosition += rewards.boardMovement
    
    # Update lastActivityDate
    profile.lastActivityDate = datetime.now()
    profile.updatedAt = datetime.now()
    
    return profile
