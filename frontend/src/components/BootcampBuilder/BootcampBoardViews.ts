import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import { getLowImpactSwap } from './BootcampExerciseAlternatives';

type BoardExercise = Pick<BootcampExercise, 'board' | 'exerciseName' | 'stationIndex' | 'sourceExerciseName'>
  & Partial<Pick<BootcampExercise, 'easyVariation' | 'kneeMod' | 'ankleMod' | 'backMod' | 'shoulderMod'>>;

function groupByStation<T extends Pick<BootcampExercise, 'stationIndex'>>(exercises: T[]): Record<number, T[]> {
  return exercises.reduce<Record<number, T[]>>((acc, exercise) => {
    const key = exercise.stationIndex ?? -1;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exercise);
    return acc;
  }, {});
}

export function buildBootcampBoardViews<T extends BoardExercise>(exercises: T[] = []) {
  const mainExercises = exercises.filter(exercise => !exercise.board || exercise.board === 'main');
  const jointFriendlyExercises = exercises.filter(exercise => exercise.board === 'alternative');
  const lowImpactExercises = exercises.filter(exercise => exercise.board === 'lowImpact');

  const stationExercises = groupByStation(mainExercises);
  const jointFriendlyByStation = groupByStation(jointFriendlyExercises);
  const lowImpactByStation = groupByStation(lowImpactExercises);

  return {
    mainExercises,
    stationExercises,
    jointFriendlyExercises,
    lowImpactExercises,
    jointFriendlyByStation,
    lowImpactByStation,
    getJointFriendlyExercises: (stationIndex: number) => (
      jointFriendlyByStation[stationIndex]?.length ? jointFriendlyByStation[stationIndex] : stationExercises[stationIndex] ?? []
    ),
    getLowImpactExercises: (stationIndex: number) => (
      lowImpactByStation[stationIndex]?.length ? lowImpactByStation[stationIndex] : stationExercises[stationIndex] ?? []
    ),
  };
}

export function getLowImpactDisplay(exercise: BoardExercise): { sourceName: string; swapName: string } {
  if (exercise.board === 'lowImpact') {
    return {
      sourceName: exercise.sourceExerciseName || 'Main exercise',
      swapName: exercise.exerciseName,
    };
  }

  return {
    sourceName: exercise.exerciseName,
    swapName: getLowImpactSwap({
      easyVariation: exercise.easyVariation ?? null,
      kneeMod: exercise.kneeMod ?? null,
      ankleMod: exercise.ankleMod ?? null,
      backMod: exercise.backMod ?? null,
      shoulderMod: exercise.shoulderMod ?? null,
    }),
  };
}
