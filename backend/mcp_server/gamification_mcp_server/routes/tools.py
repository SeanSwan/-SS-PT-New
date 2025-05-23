"""FastAPI routes for MCP tools."""

import sys
import os
from pathlib import Path
from fastapi import APIRouter

# Set up import paths BEFORE any imports
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Import models and tools using absolute imports only
try:
    # Use absolute imports directly
    from models import (
        LogActivityInput,
        LogActivityOutput,
        GetGamificationProfileInput,
        GetGamificationProfileOutput,
        GetAchievementsInput,
        GetAchievementsOutput,
        GetBoardPositionInput,
        GetBoardPositionOutput,
        RollDiceInput,
        RollDiceOutput,
        GetChallengesInput,
        GetChallengesOutput,
        JoinChallengeInput,
        JoinChallengeOutput,
        GetKindnessQuestsInput,
        GetKindnessQuestsOutput
    )
    from tools import (
        log_activity,
        get_gamification_profile,
        get_user_achievements,
        get_board_position,
        roll_dice_and_move,
        get_user_challenges,
        join_challenge,
        get_available_kindness_quests
    )
    IMPORTS_AVAILABLE = True
    print("SUCCESS: Successfully imported gamification modules using absolute imports")
except ImportError as e:
    print(f"Warning: Import failed: {e}")
    # Create placeholder models and functions
    from pydantic import BaseModel
    
    class LogActivityInput(BaseModel):
        pass
    class LogActivityOutput(BaseModel):
        pass
    class GetGamificationProfileInput(BaseModel):
        pass
    class GetGamificationProfileOutput(BaseModel):
        pass
    class GetAchievementsInput(BaseModel):
        pass
    class GetAchievementsOutput(BaseModel):
        pass
    class GetBoardPositionInput(BaseModel):
        pass
    class GetBoardPositionOutput(BaseModel):
        pass
    class RollDiceInput(BaseModel):
        pass
    class RollDiceOutput(BaseModel):
        pass
    class GetChallengesInput(BaseModel):
        pass
    class GetChallengesOutput(BaseModel):
        pass
    class JoinChallengeInput(BaseModel):
        pass
    class JoinChallengeOutput(BaseModel):
        pass
    class GetKindnessQuestsInput(BaseModel):
        pass
    class GetKindnessQuestsOutput(BaseModel):
        pass
    
    # Create placeholder functions
    async def log_activity(input_data):
        return {"error": "Service not available - import failed"}
    async def get_gamification_profile(input_data):
        return {"error": "Service not available - import failed"}
    async def get_user_achievements(input_data):
        return {"error": "Service not available - import failed"}
    async def get_board_position(input_data):
        return {"error": "Service not available - import failed"}
    async def roll_dice_and_move(input_data):
        return {"error": "Service not available - import failed"}
    async def get_user_challenges(input_data):
        return {"error": "Service not available - import failed"}
    async def join_challenge(input_data):
        return {"error": "Service not available - import failed"}
    async def get_available_kindness_quests(input_data):
        return {"error": "Service not available - import failed"}
    
    IMPORTS_AVAILABLE = False

router = APIRouter()

@router.post("/LogActivity", response_model=LogActivityOutput)
async def log_activity_route(input_data: LogActivityInput):
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
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await log_activity(input_data)

@router.post("/GetGamificationProfile", response_model=GetGamificationProfileOutput)
async def get_gamification_profile_route(input_data: GetGamificationProfileInput):
    """
    Get a user's complete gamification profile.
    
    This tool retrieves all gamification-related data for a user, including:
    - Levels (overall and all categories)
    - Experience points and Energy Tokens
    - Achievements and streaks
    - Activity tracking statistics
    - Board position
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await get_gamification_profile(input_data)

@router.post("/GetAchievements", response_model=GetAchievementsOutput)
async def get_achievements_route(input_data: GetAchievementsInput):
    """
    Get available achievements and user progress.
    
    This tool retrieves all achievements in the system, optionally filtered by category.
    If a userId is provided, it also returns which achievements have been earned.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await get_user_achievements(input_data)

@router.post("/GetBoardPosition", response_model=GetBoardPositionOutput)
async def get_board_position_route(input_data: GetBoardPositionInput):
    """
    Get a user's position on the gamification board.
    
    This tool retrieves the user's current position on the Wholesome Warrior's
    Path map and returns information about the current space they're on.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await get_board_position(input_data)

@router.post("/RollDice", response_model=RollDiceOutput)
async def roll_dice_route(input_data: RollDiceInput):
    """
    Roll dice to move on the gamification board.
    
    This tool allows the user to spend Energy Tokens (ET) to roll
    a dice and move on the Wholesome Warrior's Path map. It handles:
    - Deducting ET cost
    - Rolling the dice
    - Moving the player
    - Processing the space landed on (rewards, challenges, etc.)
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await roll_dice_and_move(input_data)

@router.post("/GetChallenges", response_model=GetChallengesOutput)
async def get_challenges_route(input_data: GetChallengesInput):
    """
    Get available challenges.
    
    This tool retrieves all currently available challenges that the user
    can participate in. It also indicates which challenges the user
    has already joined or completed.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await get_user_challenges(input_data)

@router.post("/JoinChallenge", response_model=JoinChallengeOutput)
async def join_challenge_route(input_data: JoinChallengeInput):
    """
    Join a challenge.
    
    This tool allows a user to join a specific challenge, adding them
    to the participants list and setting up progress tracking.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await join_challenge(input_data)

@router.post("/GetKindnessQuests", response_model=GetKindnessQuestsOutput)
async def get_kindness_quests_route(input_data: GetKindnessQuestsInput):
    """
    Get available kindness quests.
    
    This tool retrieves a random selection of kindness quests that the user
    can undertake, along with their rewards and verification requirements.
    """
    if not IMPORTS_AVAILABLE:
        return {"error": "Gamification service is currently unavailable"}
    return await get_available_kindness_quests(input_data)

# Add health check for this module
@router.get("/tools/health")
async def tools_health():
    """Check if the tools module is working correctly."""
    return {
        "status": "healthy" if IMPORTS_AVAILABLE else "degraded",
        "imports_available": IMPORTS_AVAILABLE,
        "tools": [
            "log_activity",
            "get_gamification_profile",
            "get_user_achievements",
            "get_board_position",
            "roll_dice_and_move",
            "get_user_challenges",
            "join_challenge",
            "get_available_kindness_quests"
        ]
    }
