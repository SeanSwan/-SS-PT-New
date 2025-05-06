"""
Model exports.
"""

from .schemas import (
    MuscleGroup,
    Equipment,
    Exercise,
    SetData,
    WorkoutExercise,
    WorkoutSession,
    ClientProgress,
    WorkoutStat,
    WorkoutStatistics,
    WorkoutPlanDayExercise,
    WorkoutPlanDay,
    WorkoutPlan
)

from .input_output import (
    GetWorkoutRecommendationsInput,
    GetWorkoutRecommendationsOutput,
    GetClientProgressInput,
    GetClientProgressOutput,
    GetWorkoutStatisticsInput,
    GetWorkoutStatisticsOutput,
    LogWorkoutSessionInput,
    LogWorkoutSessionOutput,
    GenerateWorkoutPlanInput,
    GenerateWorkoutPlanOutput
)

__all__ = [
    # Schema models
    'MuscleGroup',
    'Equipment',
    'Exercise',
    'SetData',
    'WorkoutExercise',
    'WorkoutSession',
    'ClientProgress',
    'WorkoutStat',
    'WorkoutStatistics',
    'WorkoutPlanDayExercise',
    'WorkoutPlanDay',
    'WorkoutPlan',
    
    # Input/Output models
    'GetWorkoutRecommendationsInput',
    'GetWorkoutRecommendationsOutput',
    'GetClientProgressInput',
    'GetClientProgressOutput',
    'GetWorkoutStatisticsInput',
    'GetWorkoutStatisticsOutput',
    'LogWorkoutSessionInput',
    'LogWorkoutSessionOutput',
    'GenerateWorkoutPlanInput',
    'GenerateWorkoutPlanOutput'
]
