/**
 * BootcampDemoMode.stationCount.ts
 * PURPOSE: Keeps Bootcamp command and floor views from hiding assigned stations.
 */
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';

type StationCountSource = Pick<GeneratedBootcamp, 'stations' | 'stationCount' | 'exercises'>;

export function getBootcampFloorStationIndex(stationIndex: unknown): number {
  const parsedIndex = typeof stationIndex === 'number' ? stationIndex : Number(stationIndex);
  if (!Number.isFinite(parsedIndex) || parsedIndex < 0) return 0;
  return Math.floor(parsedIndex);
}

export function getBootcampFloorStationCount(bootcamp: StationCountSource, minimum = 1): number {
  const exerciseStationCount = bootcamp.exercises.reduce((highest, exercise) => {
    if (exercise.board && exercise.board !== 'main') return highest;
    const stationIndex = getBootcampFloorStationIndex(exercise.stationIndex);
    return Math.max(highest, Math.floor(stationIndex) + 1);
  }, 0);

  return Math.max(
    bootcamp.stations.length,
    bootcamp.stationCount || 0,
    exerciseStationCount,
    minimum,
  );
}
