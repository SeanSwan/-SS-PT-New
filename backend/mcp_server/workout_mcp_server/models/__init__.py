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
    from models.schemas import (
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

    from models.input_output import (
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
except ImportError as e:
    # If absolute imports fail, try relative imports as fallback
    try:
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
    except ImportError as e2:
        print(f"Error importing workout models: {e} / {e2}")
        # Create minimal placeholders if all imports fail
        from pydantic import BaseModel
        
        class MuscleGroup(BaseModel): pass
        class Equipment(BaseModel): pass
        class Exercise(BaseModel): pass
        class SetData(BaseModel): pass
        class WorkoutExercise(BaseModel): pass
        class WorkoutSession(BaseModel): pass
        class ClientProgress(BaseModel): pass
        class WorkoutStat(BaseModel): pass
        class WorkoutStatistics(BaseModel): pass
        class WorkoutPlanDayExercise(BaseModel): pass
        class WorkoutPlanDay(BaseModel): pass
        class WorkoutPlan(BaseModel): pass
        class GetWorkoutRecommendationsInput(BaseModel): pass
        class GetWorkoutRecommendationsOutput(BaseModel): pass
        class GetClientProgressInput(BaseModel): pass
        class GetClientProgressOutput(BaseModel): pass
        class GetWorkoutStatisticsInput(BaseModel): pass
        class GetWorkoutStatisticsOutput(BaseModel): pass
        class LogWorkoutSessionInput(BaseModel): pass
        class LogWorkoutSessionOutput(BaseModel): pass
        class GenerateWorkoutPlanInput(BaseModel): pass
        class GenerateWorkoutPlanOutput(BaseModel): pass

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
