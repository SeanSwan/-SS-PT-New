import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import { isMainBoardExercise } from './BootcampBuilderPlacement';

function normalizeMainStationSortOrders(exercises: BootcampExercise[]): BootcampExercise[] {
  const mainIndexesByStation = new Map<number, number[]>();

  exercises.forEach((exercise, index) => {
    if (!isMainBoardExercise(exercise)) return;
    const stationIndex = Math.max(0, Math.floor(exercise.stationIndex ?? 0));
    const stationIndexes = mainIndexesByStation.get(stationIndex) ?? [];
    stationIndexes.push(index);
    mainIndexesByStation.set(stationIndex, stationIndexes);
  });

  return exercises.map((exercise, index) => {
    if (!isMainBoardExercise(exercise)) return exercise;
    const stationIndex = Math.max(0, Math.floor(exercise.stationIndex ?? 0));
    const sortedIndexes = (mainIndexesByStation.get(stationIndex) ?? []).sort(
      (left, right) => exercises[left].sortOrder - exercises[right].sortOrder,
    );
    const sortOrder = sortedIndexes.indexOf(index) + 1;
    return { ...exercise, stationIndex, sortOrder };
  });
}

function canEditMainExercise(exercises: BootcampExercise[], exerciseIndex: number): boolean {
  return Boolean(exercises[exerciseIndex] && isMainBoardExercise(exercises[exerciseIndex]));
}

export function moveMainExercise(
  exercises: BootcampExercise[],
  exerciseIndex: number,
  targetStationIndex: number,
): BootcampExercise[] {
  if (!canEditMainExercise(exercises, exerciseIndex)) return exercises;
  const stationIndex = Math.max(0, Math.floor(targetStationIndex));
  const nextOrder = exercises.reduce((max, exercise, index) => (
    index !== exerciseIndex
    && isMainBoardExercise(exercise)
    && Math.max(0, Math.floor(exercise.stationIndex ?? 0)) === stationIndex
      ? Math.max(max, exercise.sortOrder)
      : max
  ), 0) + 1;

  return normalizeMainStationSortOrders(exercises.map((exercise, index) => (
    index === exerciseIndex ? { ...exercise, stationIndex, sortOrder: nextOrder } : exercise
  )));
}

export function replaceMainExercise(
  exercises: BootcampExercise[],
  exerciseIndex: number,
  replacement: BootcampExercise,
): BootcampExercise[] {
  if (!canEditMainExercise(exercises, exerciseIndex)) return exercises;
  const source = exercises[exerciseIndex];

  return exercises.map((exercise, index) => (
    index === exerciseIndex
      ? { ...replacement, board: source.board ?? 'main', stationIndex: source.stationIndex, sortOrder: source.sortOrder, durationSec: source.durationSec, restSec: source.restSec }
      : exercise
  ));
}

export function duplicateMainExercise(exercises: BootcampExercise[], exerciseIndex: number): BootcampExercise[] {
  if (!canEditMainExercise(exercises, exerciseIndex)) return exercises;
  const source = exercises[exerciseIndex];
  const duplicate = { ...source, sortOrder: source.sortOrder + 0.5 };
  const updated = [...exercises];
  updated.splice(exerciseIndex + 1, 0, duplicate);
  return normalizeMainStationSortOrders(updated);
}
