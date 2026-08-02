import { getBootcampFloorStationIndex } from './BootcampDemoMode.stationCount';

type BootcampPlacementExercise = {
  board?: string;
  exerciseName?: string;
  stationIndex?: number;
  durationSec?: number;
  restSec?: number;
};

export function isMainBoardExercise(exercise: BootcampPlacementExercise): boolean {
  return !exercise.board || exercise.board === 'main';
}

export function getMainBoardExercises<T extends BootcampPlacementExercise>(exercises: T[] = []): T[] {
  return exercises.filter(isMainBoardExercise);
}

export function getMainBoardExclusionKeys(exercises: BootcampPlacementExercise[] = []): string[] {
  return Array.from(new Set(getMainBoardExercises(exercises).flatMap((exercise) => {
    const name = exercise.exerciseName?.trim();
    return name ? [name, name.toLowerCase().replace(/\s+/g, '_')] : [];
  })));
}
export function countMainBoardExercisesByStation(exercises: BootcampPlacementExercise[] = []): Map<number, number> {
  const stationCounts = new Map<number, number>();

  for (const exercise of getMainBoardExercises(exercises)) {
    const station = getBootcampFloorStationIndex(exercise.stationIndex);
    stationCounts.set(station, (stationCounts.get(station) || 0) + 1);
  }

  return stationCounts;
}

export function getMainBoardWorkoutSeconds(
  exercises: BootcampPlacementExercise[] = [],
  fallbackDurationSec: number,
  fallbackRestSec: number,
): number {
  return getMainBoardExercises(exercises).reduce(
    (sum, exercise) => sum + (exercise.durationSec || fallbackDurationSec) + (exercise.restSec || fallbackRestSec),
    0,
  );
}

export function getNextMainBoardSortOrder(
  exercises: BootcampPlacementExercise[] = [],
  stationIndex: number,
): number {
  return getMainBoardExercises(exercises).filter(
    exercise => getBootcampFloorStationIndex(exercise.stationIndex) === stationIndex,
  ).length + 1;
}
