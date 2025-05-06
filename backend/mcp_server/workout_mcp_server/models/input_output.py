"""
Input and output models for MCP tools.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime

from pydantic import BaseModel, Field

from .schemas import (
    Exercise, 
    ClientProgress, 
    WorkoutStatistics, 
    WorkoutSession,
    WorkoutPlan
)

class GetWorkoutRecommendationsInput(BaseModel):
    """Input for workout recommendations tool."""
    userId: str
    goal: Optional[str] = "general"
    difficulty: Optional[str] = "all"
    equipment: Optional[List[str]] = Field(default_factory=list)
    muscleGroups: Optional[List[str]] = Field(default_factory=list)
    excludeExercises: Optional[List[str]] = Field(default_factory=list)
    limit: Optional[int] = 10
    rehabFocus: Optional[bool] = False
    optPhase: Optional[str] = None

class GetWorkoutRecommendationsOutput(BaseModel):
    """Output for workout recommendations tool."""
    exercises: List[Exercise]
    message: str

class GetClientProgressInput(BaseModel):
    """Input for client progress tool."""
    userId: str

class GetClientProgressOutput(BaseModel):
    """Output for client progress tool."""
    progress: ClientProgress
    message: str

class GetWorkoutStatisticsInput(BaseModel):
    """Input for workout statistics tool."""
    userId: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    includeExerciseBreakdown: Optional[bool] = True
    includeMuscleGroupBreakdown: Optional[bool] = True
    includeWeekdayBreakdown: Optional[bool] = True
    includeIntensityTrends: Optional[bool] = True

class GetWorkoutStatisticsOutput(BaseModel):
    """Output for workout statistics tool."""
    statistics: WorkoutStatistics
    message: str

class LogWorkoutSessionInput(BaseModel):
    """Input for logging a workout session."""
    session: WorkoutSession

class LogWorkoutSessionOutput(BaseModel):
    """Output for logging a workout session."""
    session: WorkoutSession
    message: str

class GenerateWorkoutPlanInput(BaseModel):
    """Input for generating a workout plan."""
    trainerId: str
    clientId: str
    name: str
    description: Optional[str] = None
    goal: Optional[str] = "general"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    daysPerWeek: int = 3
    focusAreas: Optional[List[str]] = None
    difficulty: Optional[str] = "intermediate"
    optPhase: Optional[str] = None
    equipment: Optional[List[str]] = None

class GenerateWorkoutPlanOutput(BaseModel):
    """Output for generating a workout plan."""
    plan: WorkoutPlan
    message: str
