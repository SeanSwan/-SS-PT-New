"""
Pydantic models for the workout system.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal

from pydantic import BaseModel, Field

class MuscleGroup(BaseModel):
    """Muscle group information."""
    id: str
    name: str
    shortName: str
    bodyRegion: Literal['upper_body', 'lower_body', 'core', 'full_body']
    
class Equipment(BaseModel):
    """Exercise equipment information."""
    id: str
    name: str
    category: str
    
class Exercise(BaseModel):
    """Exercise information."""
    id: str
    name: str
    description: str
    difficulty: Optional[str] = None
    category: Optional[str] = None
    exerciseType: Optional[str] = None
    isRehabExercise: Optional[bool] = False
    optPhase: Optional[str] = None
    muscleGroups: Optional[List[MuscleGroup]] = None
    equipment: Optional[List[Equipment]] = None

class SetData(BaseModel):
    """Data for a single exercise set."""
    setNumber: int
    setType: str = "working"
    repsGoal: Optional[int] = None
    repsCompleted: Optional[int] = None
    weightGoal: Optional[float] = None
    weightUsed: Optional[float] = None
    duration: Optional[int] = None
    distance: Optional[float] = None
    restGoal: Optional[int] = None
    restTaken: Optional[int] = None
    rpe: Optional[float] = None
    tempo: Optional[str] = None
    notes: Optional[str] = None
    isPR: Optional[bool] = False
    completedAt: Optional[datetime] = None

class WorkoutExercise(BaseModel):
    """Exercise within a workout session."""
    id: Optional[str] = None
    exerciseId: str
    orderInWorkout: Optional[int] = None
    performanceRating: Optional[int] = None
    difficultyRating: Optional[int] = None
    painLevel: Optional[int] = 0
    formRating: Optional[int] = None
    formNotes: Optional[str] = None
    isRehabExercise: Optional[bool] = False
    notes: Optional[str] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    sets: Optional[List[SetData]] = None
    exercise: Optional[Exercise] = None

class WorkoutSession(BaseModel):
    """Workout session data."""
    id: Optional[str] = None
    userId: str
    workoutPlanId: Optional[str] = None
    title: str
    description: Optional[str] = None
    plannedStartTime: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    status: str = "planned"
    duration: Optional[int] = None
    caloriesBurned: Optional[int] = None
    feelingRating: Optional[int] = None
    intensityRating: Optional[int] = None
    notes: Optional[str] = None
    exercises: Optional[List[WorkoutExercise]] = None

class ClientProgress(BaseModel):
    """Client progress data."""
    userId: str
    strengthLevel: int = 1
    cardioLevel: int = 1
    flexibilityLevel: int = 1
    balanceLevel: int = 1
    coreLevel: int = 1
    totalWorkouts: Optional[int] = 0
    totalSets: Optional[int] = 0
    totalReps: Optional[int] = 0
    totalWeight: Optional[float] = 0
    totalExercises: Optional[int] = 0
    lastWorkoutDate: Optional[datetime] = None
    currentStreak: Optional[int] = 0
    personalRecords: Optional[Dict[str, List[Dict[str, Any]]]] = None

class WorkoutStat(BaseModel):
    """Workout statistics data."""
    id: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    exerciseCount: Optional[int] = None
    intensity: Optional[int] = None

class WorkoutStatistics(BaseModel):
    """Comprehensive workout statistics."""
    totalWorkouts: int
    totalDuration: int
    totalExercises: int
    totalSets: int
    totalReps: int
    totalWeight: float
    averageIntensity: float
    weekdayBreakdown: List[int]
    exerciseBreakdown: Optional[List[Dict[str, Any]]] = None
    muscleGroupBreakdown: Optional[List[Dict[str, Any]]] = None
    intensityTrends: Optional[List[Dict[str, Any]]] = None
    recentWorkouts: Optional[List[WorkoutStat]] = None

class WorkoutPlanDayExercise(BaseModel):
    """Exercise within a workout plan day."""
    exerciseId: str
    orderInWorkout: Optional[int] = None
    setScheme: Optional[str] = None
    repGoal: Optional[str] = None
    restPeriod: Optional[int] = None
    tempo: Optional[str] = None
    intensityGuideline: Optional[str] = None
    supersetGroup: Optional[int] = None
    notes: Optional[str] = None
    isOptional: Optional[bool] = False
    alternateExerciseId: Optional[str] = None

class WorkoutPlanDay(BaseModel):
    """Day within a workout plan."""
    dayNumber: int
    name: str
    focus: Optional[str] = None
    dayType: str = "training"
    optPhase: Optional[str] = None
    notes: Optional[str] = None
    warmupInstructions: Optional[str] = None
    cooldownInstructions: Optional[str] = None
    estimatedDuration: Optional[int] = None
    sortOrder: Optional[int] = None
    exercises: Optional[List[WorkoutPlanDayExercise]] = None

class WorkoutPlan(BaseModel):
    """Workout plan data."""
    name: str
    description: Optional[str] = None
    trainerId: str
    clientId: str
    goal: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    status: str = "active"
    days: Optional[List[WorkoutPlanDay]] = None
