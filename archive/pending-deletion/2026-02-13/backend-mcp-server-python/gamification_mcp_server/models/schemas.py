"""
Pydantic models for the gamification system.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from pydantic import BaseModel, Field

from .enums import ActivityType, AchievementCategory, GameboardSpaceType

class GamificationProfile(BaseModel):
    """User's complete gamification profile data."""
    userId: str
    overallLevel: int = 0
    experiencePoints: int = 0
    energyTokens: int = 0
    strengthLevel: int = 0
    strengthExperiencePoints: int = 0
    cardioLevel: int = 0
    cardioExperiencePoints: int = 0
    flexibilityLevel: int = 0
    flexibilityExperiencePoints: int = 0
    balanceLevel: int = 0
    balanceExperiencePoints: int = 0
    coreLevel: int = 0
    coreExperiencePoints: int = 0
    nutritionLevel: int = 0
    nutritionExperiencePoints: int = 0
    recoveryLevel: int = 0
    recoveryExperiencePoints: int = 0
    communityLevel: int = 0
    communityExperiencePoints: int = 0
    streaks: Dict[str, int] = Field(default_factory=dict)
    achievements: List[str] = Field(default_factory=list)
    achievementDates: Dict[str, str] = Field(default_factory=dict)
    boardPosition: int = 0
    workoutsCompleted: int = 0
    stretchesCompleted: int = 0
    foamRollsCompleted: int = 0
    vitaminsLogged: int = 0
    greensLogged: int = 0
    mealsLogged: int = 0
    proteinGoalsHit: int = 0
    kindnessQuestsCompleted: int = 0
    goodDeedsReported: int = 0
    challengesCompleted: int = 0
    totalSets: int = 0
    totalReps: int = 0
    lastActivityDate: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class Achievement(BaseModel):
    """Achievement metadata."""
    id: str
    name: str
    description: str
    category: AchievementCategory
    requirement: str
    requiredValue: int
    iconUrl: Optional[str] = None
    rewardEt: int = 0
    rewardXp: int = 0
    
class GameboardSpace(BaseModel):
    """Space on the gamification board."""
    id: int
    type: GameboardSpaceType
    name: str
    description: str
    rewardEt: int = 0
    rewardXp: int = 0
    challengeType: Optional[str] = None
    challengeDescription: Optional[str] = None
    iconUrl: Optional[str] = None
    tip: Optional[str] = None

class KindnessQuest(BaseModel):
    """Kindness quest definition."""
    id: str
    name: str
    description: str
    difficulty: str
    rewardEt: int
    rewardXp: int
    verifiable: bool = False
    verificationMethod: Optional[str] = None

class ActivityReward(BaseModel):
    """Rewards earned for an activity."""
    energyTokens: int = 0
    experiencePoints: int = 0
    strengthXp: int = 0
    cardioXp: int = 0
    flexibilityXp: int = 0
    balanceXp: int = 0
    coreXp: int = 0
    nutritionXp: int = 0
    recoveryXp: int = 0
    communityXp: int = 0
    achievements: List[str] = Field(default_factory=list)
    streakUpdates: Dict[str, int] = Field(default_factory=dict)
    levelUps: Dict[str, int] = Field(default_factory=dict)
    boardMovement: int = 0
    
class Challenge(BaseModel):
    """Challenge definition."""
    id: str
    name: str
    description: str
    startDate: datetime
    endDate: datetime
    targetValue: int
    activityType: ActivityType
    rewardEt: int
    rewardXp: int
    participants: List[str] = Field(default_factory=list)
    completedBy: List[str] = Field(default_factory=list)
