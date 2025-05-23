"""
Input and output models for MCP tools.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any

from pydantic import BaseModel, Field, validator

from .enums import ActivityType, AchievementCategory
from .schemas import GamificationProfile, ActivityReward, Challenge, GameboardSpace, KindnessQuest

# MCP Tool Input/Output Models

class LogActivityInput(BaseModel):
    """Input for logging an activity."""
    userId: str
    activityType: ActivityType
    timestamp: Optional[datetime] = None
    value: int = 1  # For reps, sets, etc. Default is 1 for simple activities
    duration: Optional[int] = None  # In minutes if applicable
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('timestamp', pre=True, always=True)
    def set_timestamp(cls, v):
        """Set timestamp to current time if not provided."""
        return v or datetime.now()

class LogActivityOutput(BaseModel):
    """Output for logging an activity."""
    success: bool
    profile: GamificationProfile
    rewards: ActivityReward
    message: str

class GetGamificationProfileInput(BaseModel):
    """Input for getting a user's gamification profile."""
    userId: str

class GetGamificationProfileOutput(BaseModel):
    """Output for getting a user's gamification profile."""
    profile: GamificationProfile
    message: str

class GetAchievementsInput(BaseModel):
    """Input for getting available achievements."""
    userId: Optional[str] = None
    category: Optional[AchievementCategory] = None

class GetAchievementsOutput(BaseModel):
    """Output for getting available achievements."""
    achievements: List[Dict[str, Any]]
    earnedAchievements: List[str] = Field(default_factory=list)
    message: str

class GetBoardPositionInput(BaseModel):
    """Input for getting a user's position on the gamification board."""
    userId: str

class GetBoardPositionOutput(BaseModel):
    """Output for getting a user's position on the gamification board."""
    position: int
    currentSpace: GameboardSpace
    message: str

class RollDiceInput(BaseModel):
    """Input for rolling dice to move on the board."""
    userId: str
    energyTokensToSpend: int = 1  # Default cost is 1 ET per roll

class RollDiceOutput(BaseModel):
    """Output for rolling dice to move on the board."""
    diceValue: int
    newPosition: int
    oldPosition: int
    spaceVisited: GameboardSpace
    rewards: ActivityReward
    profile: GamificationProfile
    message: str

class GetChallengesInput(BaseModel):
    """Input for getting available challenges."""
    userId: Optional[str] = None
    active: Optional[bool] = True  # Only get active challenges by default

class GetChallengesOutput(BaseModel):
    """Output for getting available challenges."""
    challenges: List[Challenge]
    participatingIn: List[str] = Field(default_factory=list)
    completedChallenges: List[str] = Field(default_factory=list)
    message: str

class JoinChallengeInput(BaseModel):
    """Input for joining a challenge."""
    userId: str
    challengeId: str

class JoinChallengeOutput(BaseModel):
    """Output for joining a challenge."""
    success: bool
    challenge: Challenge
    message: str

class GetKindnessQuestsInput(BaseModel):
    """Input for getting available kindness quests."""
    userId: Optional[str] = None
    count: int = 3  # Number of quests to return

class GetKindnessQuestsOutput(BaseModel):
    """Output for getting available kindness quests."""
    quests: List[KindnessQuest]
    message: str
