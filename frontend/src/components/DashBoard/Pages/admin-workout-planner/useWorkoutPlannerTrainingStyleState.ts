/**
 * Hook: useWorkoutPlannerTrainingStyleState
 * Purpose: Keep Base vs Hardcore planner-generation controls out of the page shell.
 */

import { useCallback, useState } from 'react';
import type { HardcoreTrainingMethod, TrainingIntensityMode } from './WorkoutPlannerTypes';

export const useWorkoutPlannerTrainingStyleState = () => {
  const [trainingIntensityMode, setTrainingIntensityMode] = useState<TrainingIntensityMode>('base');
  const [hardcoreMethod, setHardcoreMethod] = useState<HardcoreTrainingMethod>('standard');

  const handleTrainingIntensityModeChange = useCallback((mode: TrainingIntensityMode) => {
    setTrainingIntensityMode(mode);
    if (mode === 'base') setHardcoreMethod('standard');
  }, []);

  return {
    trainingIntensityMode,
    hardcoreMethod,
    setHardcoreMethod,
    handleTrainingIntensityModeChange,
  };
};
