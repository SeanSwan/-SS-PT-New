"""
Service for managing gamification profiles.
"""

import logging
from datetime import datetime
from fastapi import HTTPException, status

from ..models import GamificationProfile
from ..utils import make_api_request

logger = logging.getLogger("gamification_mcp_server.profile_service")

async def get_or_create_gamification_profile(userId: str) -> GamificationProfile:
    """
    Get or create a gamification profile for a user.
    
    Args:
        userId: User ID
        
    Returns:
        GamificationProfile
    """
    try:
        # Try to get existing profile from client progress
        response = await make_api_request("GET", f"/client-progress/{userId}")
        progress = response.get("progress", {})
        
        if progress:
            # Map to GamificationProfile structure
            return GamificationProfile(
                userId=userId,
                overallLevel=progress.get("overallLevel", 0),
                experiencePoints=progress.get("experiencePoints", 0),
                energyTokens=progress.get("energyTokens", 0),
                strengthLevel=progress.get("strengthLevel", 0),
                strengthExperiencePoints=progress.get("strengthExperiencePoints", 0),
                cardioLevel=progress.get("cardioLevel", 0),
                cardioExperiencePoints=progress.get("cardioExperiencePoints", 0),
                flexibilityLevel=progress.get("flexibilityLevel", 0),
                flexibilityExperiencePoints=progress.get("flexibilityExperiencePoints", 0),
                balanceLevel=progress.get("balanceLevel", 0),
                balanceExperiencePoints=progress.get("balanceExperiencePoints", 0),
                coreLevel=progress.get("coreLevel", 0),
                coreExperiencePoints=progress.get("coreExperiencePoints", 0),
                nutritionLevel=progress.get("nutritionLevel", 0),
                nutritionExperiencePoints=progress.get("nutritionExperiencePoints", 0),
                recoveryLevel=progress.get("recoveryLevel", 0),
                recoveryExperiencePoints=progress.get("recoveryExperiencePoints", 0),
                communityLevel=progress.get("communityLevel", 0),
                communityExperiencePoints=progress.get("communityExperiencePoints", 0),
                streaks=progress.get("streaks", {}),
                achievements=progress.get("achievements", []),
                achievementDates=progress.get("achievementDates", {}),
                boardPosition=progress.get("boardPosition", 0),
                workoutsCompleted=progress.get("workoutsCompleted", 0),
                stretchesCompleted=progress.get("stretchesCompleted", 0),
                foamRollsCompleted=progress.get("foamRollsCompleted", 0),
                vitaminsLogged=progress.get("vitaminsLogged", 0),
                greensLogged=progress.get("greensLogged", 0),
                mealsLogged=progress.get("mealsLogged", 0),
                proteinGoalsHit=progress.get("proteinGoalsHit", 0),
                kindnessQuestsCompleted=progress.get("kindnessQuestsCompleted", 0),
                goodDeedsReported=progress.get("goodDeedsReported", 0),
                challengesCompleted=progress.get("challengesCompleted", 0),
                totalSets=progress.get("totalSets", 0),
                totalReps=progress.get("totalReps", 0),
                lastActivityDate=progress.get("lastActivityDate"),
                createdAt=progress.get("createdAt"),
                updatedAt=progress.get("updatedAt")
            )
        
        # Create new profile
        logger.info(f"Creating new gamification profile for user {userId}")
        
        # Initialize with default values
        profile = GamificationProfile(
            userId=userId,
            overallLevel=0,
            experiencePoints=0,
            energyTokens=10,  # Start with 10 energy tokens
            streaks={
                "activity": 0,
                "stretch": 0,
                "foam_roll": 0,
                "vitamin": 0,
                "greens": 0,
                "protein_goal": 0
            },
            lastActivityDate=datetime.now(),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        # Save to backend
        await save_gamification_profile(profile)
        
        return profile
    
    except Exception as e:
        logger.error(f"Error getting/creating gamification profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get/create gamification profile: {str(e)}"
        )

async def save_gamification_profile(profile: GamificationProfile) -> bool:
    """
    Save a gamification profile to the backend.
    
    Args:
        profile: GamificationProfile to save
        
    Returns:
        bool: Success status
    """
    try:
        # Convert to client progress format
        client_progress_data = {
            "userId": profile.userId,
            "overallLevel": profile.overallLevel,
            "experiencePoints": profile.experiencePoints,
            "energyTokens": profile.energyTokens,
            "strengthLevel": profile.strengthLevel,
            "strengthExperiencePoints": profile.strengthExperiencePoints,
            "cardioLevel": profile.cardioLevel,
            "cardioExperiencePoints": profile.cardioExperiencePoints,
            "flexibilityLevel": profile.flexibilityLevel,
            "flexibilityExperiencePoints": profile.flexibilityExperiencePoints,
            "balanceLevel": profile.balanceLevel,
            "balanceExperiencePoints": profile.balanceExperiencePoints,
            "coreLevel": profile.coreLevel,
            "coreExperiencePoints": profile.coreExperiencePoints,
            "nutritionLevel": profile.nutritionLevel,
            "nutritionExperiencePoints": profile.nutritionExperiencePoints,
            "recoveryLevel": profile.recoveryLevel,
            "recoveryExperiencePoints": profile.recoveryExperiencePoints,
            "communityLevel": profile.communityLevel,
            "communityExperiencePoints": profile.communityExperiencePoints,
            "streaks": profile.streaks,
            "achievements": profile.achievements,
            "achievementDates": profile.achievementDates,
            "boardPosition": profile.boardPosition,
            "workoutsCompleted": profile.workoutsCompleted,
            "stretchesCompleted": profile.stretchesCompleted,
            "foamRollsCompleted": profile.foamRollsCompleted,
            "vitaminsLogged": profile.vitaminsLogged,
            "greensLogged": profile.greensLogged,
            "mealsLogged": profile.mealsLogged,
            "proteinGoalsHit": profile.proteinGoalsHit,
            "kindnessQuestsCompleted": profile.kindnessQuestsCompleted,
            "goodDeedsReported": profile.goodDeedsReported,
            "challengesCompleted": profile.challengesCompleted,
            "totalSets": profile.totalSets,
            "totalReps": profile.totalReps,
            "lastActivityDate": profile.lastActivityDate.isoformat() if profile.lastActivityDate else None
        }
        
        # Update client progress via API
        response = await make_api_request(
            "PUT", 
            f"/client-progress/{profile.userId}", 
            data=client_progress_data
        )
        
        return response.get("success", False)
    
    except Exception as e:
        logger.error(f"Error saving gamification profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save gamification profile: {str(e)}"
        )
