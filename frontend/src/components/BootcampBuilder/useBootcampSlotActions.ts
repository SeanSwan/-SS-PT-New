import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { getMainBoardWorkoutSeconds } from './BootcampBuilderPlacement';
import { duplicateMainExercise, moveMainExercise } from './BootcampDraftOps';

interface UseBootcampSlotActionsOptions {
  includeStretch: boolean;
  setBootcamp: Dispatch<SetStateAction<GeneratedBootcamp | null>>;
  setActiveStation: Dispatch<SetStateAction<number | null>>;
}

export function useBootcampSlotActions({
  includeStretch,
  setBootcamp,
  setActiveStation,
}: UseBootcampSlotActionsOptions) {
  const handleDeleteExercise = useCallback((globalIndex: number) => {
    setBootcamp((current) => {
      if (!current) return current;
      const exercises = current.exercises.filter((_, index) => index !== globalIndex);
      const totalWorkoutMin = Math.ceil(getMainBoardWorkoutSeconds(exercises, 35, 15) / 60);
      return {
        ...current,
        exercises,
        totalWorkoutMin,
        demoDuration: 5,
        clearDuration: 5,
        stretchDurationMin: includeStretch ? 3 : 0,
        includeStretch,
        totalClassMin: totalWorkoutMin + (includeStretch ? 13 : 10),
      };
    });
  }, [includeStretch, setBootcamp]);

  const handleDuplicateExercise = useCallback((globalIndex: number) => {
    setBootcamp((current) => current ? { ...current, exercises: duplicateMainExercise(current.exercises, globalIndex) } : current);
  }, [setBootcamp]);

  const handleMoveExercise = useCallback((globalIndex: number, targetStationIndex: number) => {
    setBootcamp((current) => current ? { ...current, exercises: moveMainExercise(current.exercises, globalIndex, targetStationIndex) } : current);
    setActiveStation(targetStationIndex);
  }, [setActiveStation, setBootcamp]);

  return { handleDeleteExercise, handleDuplicateExercise, handleMoveExercise };
}
