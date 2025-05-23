"""
Model exports.
"""

# Use absolute imports to avoid relative import issues
import sys
import os
from pathlib import Path

# Ensure the parent directory is in the Python path
current_dir = Path(__file__).parent.parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

try:
    from models.enums import (
        ActivityType,
        RewardType,
        GameboardSpaceType,
        StreakType,
        AchievementCategory
    )

    from models.schemas import (
        GamificationProfile,
        Achievement,
        GameboardSpace,
        KindnessQuest,
        ActivityReward,
        Challenge
    )

    from models.input_output import (
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
except ImportError as e:
    # If absolute imports fail, try relative imports as fallback
    try:
        from .enums import (
            ActivityType,
            RewardType,
            GameboardSpaceType,
            StreakType,
            AchievementCategory
        )

        from .schemas import (
            GamificationProfile,
            Achievement,
            GameboardSpace,
            KindnessQuest,
            ActivityReward,
            Challenge
        )

        from .input_output import (
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
    except ImportError as e2:
        print(f"Error importing gamification models: {e} / {e2}")
        # Create minimal placeholders if all imports fail
        from pydantic import BaseModel
        from enum import Enum
        
        class ActivityType(Enum): PLACEHOLDER = "placeholder"
        class RewardType(Enum): PLACEHOLDER = "placeholder"
        class GameboardSpaceType(Enum): PLACEHOLDER = "placeholder"
        class StreakType(Enum): PLACEHOLDER = "placeholder"
        class AchievementCategory(Enum): PLACEHOLDER = "placeholder"
        
        class GamificationProfile(BaseModel): pass
        class Achievement(BaseModel): pass
        class GameboardSpace(BaseModel): pass
        class KindnessQuest(BaseModel): pass
        class ActivityReward(BaseModel): pass
        class Challenge(BaseModel): pass
        class LogActivityInput(BaseModel): pass
        class LogActivityOutput(BaseModel): pass
        class GetGamificationProfileInput(BaseModel): pass
        class GetGamificationProfileOutput(BaseModel): pass
        class GetAchievementsInput(BaseModel): pass
        class GetAchievementsOutput(BaseModel): pass
        class GetBoardPositionInput(BaseModel): pass
        class GetBoardPositionOutput(BaseModel): pass
        class RollDiceInput(BaseModel): pass
        class RollDiceOutput(BaseModel): pass
        class GetChallengesInput(BaseModel): pass
        class GetChallengesOutput(BaseModel): pass
        class JoinChallengeInput(BaseModel): pass
        class JoinChallengeOutput(BaseModel): pass
        class GetKindnessQuestsInput(BaseModel): pass
        class GetKindnessQuestsOutput(BaseModel): pass

__all__ = [
    'ActivityType',
    'RewardType',
    'GameboardSpaceType',
    'StreakType',
    'AchievementCategory',
    'GamificationProfile',
    'Achievement',
    'GameboardSpace',
    'KindnessQuest',
    'ActivityReward',
    'Challenge',
    'LogActivityInput',
    'LogActivityOutput',
    'GetGamificationProfileInput',
    'GetGamificationProfileOutput',
    'GetAchievementsInput',
    'GetAchievementsOutput',
    'GetBoardPositionInput',
    'GetBoardPositionOutput',
    'RollDiceInput',
    'RollDiceOutput',
    'GetChallengesInput',
    'GetChallengesOutput',
    'JoinChallengeInput',
    'JoinChallengeOutput',
    'GetKindnessQuestsInput',
    'GetKindnessQuestsOutput'
]
