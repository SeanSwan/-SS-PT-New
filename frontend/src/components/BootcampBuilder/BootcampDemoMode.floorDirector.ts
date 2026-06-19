/**
 * BootcampDemoMode.floorDirector.ts
 * PURPOSE: Pure floor-board model for station focus, demo readiness, and TV controls.
 */
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { getBootcampFloorStationCount, getBootcampFloorStationIndex } from './BootcampDemoMode.stationCount';

export interface FloorDirectorStationCard {
  stationIndex: number;
  stationName: string;
  exerciseCount: number;
  demoReadyCount: number;
  readinessLabel: string;
  isActive: boolean;
}

export interface FloorDirectorModel {
  activeStationIndex: number;
  activeStationName: string;
  primaryCue: string;
  summaryLabel: string;
  stationCards: FloorDirectorStationCard[];
}

function hasDemoMedia(exercise: BootcampExercise): boolean {
  return Boolean(exercise.videoUrl || exercise.previewVideoUrl || exercise.catalogVideoSample?.videoUrl);
}

function getStationExercises(bootcamp: GeneratedBootcamp, stationIndex: number): BootcampExercise[] {
  return bootcamp.exercises
    .filter((exercise) => (
      (!exercise.board || exercise.board === 'main')
      && getBootcampFloorStationIndex(exercise.stationIndex) === stationIndex
    ))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getPrimaryCue(activeCard: FloorDirectorStationCard): string {
  if (activeCard.exerciseCount === 0) return `${activeCard.stationName} needs exercises`;
  const missingDemoCount = activeCard.exerciseCount - activeCard.demoReadyCount;
  if (missingDemoCount > 0) {
    return `${activeCard.stationName} needs ${missingDemoCount} demo video${missingDemoCount > 1 ? 's' : ''}`;
  }
  return `${activeCard.stationName} is ready for the floor`;
}

export function getFloorDirectorModel(bootcamp: GeneratedBootcamp, activeStationIndex = 0): FloorDirectorModel {
  const stationCount = getBootcampFloorStationCount(bootcamp);
  const clampedActiveStationIndex = Math.min(Math.max(activeStationIndex, 0), stationCount - 1);
  const stationCards = Array.from({ length: stationCount }, (_, stationIndex) => {
    const station = bootcamp.stations[stationIndex];
    const exercises = getStationExercises(bootcamp, stationIndex);
    const demoReadyCount = exercises.filter(hasDemoMedia).length;
    return {
      stationIndex,
      stationName: station?.stationName ?? `Station ${stationIndex + 1}`,
      exerciseCount: exercises.length,
      demoReadyCount,
      readinessLabel: `${demoReadyCount}/${exercises.length} demos`,
      isActive: stationIndex === clampedActiveStationIndex,
    };
  });
  const totalExercises = stationCards.reduce((sum, card) => sum + card.exerciseCount, 0);
  const totalReady = stationCards.reduce((sum, card) => sum + card.demoReadyCount, 0);
  const activeCard = stationCards[clampedActiveStationIndex] ?? stationCards[0];

  return {
    activeStationIndex: clampedActiveStationIndex,
    activeStationName: activeCard?.stationName ?? 'Station 1',
    primaryCue: activeCard ? getPrimaryCue(activeCard) : 'Add exercises from the Rolodex',
    summaryLabel: `${totalReady}/${totalExercises} demos ready`,
    stationCards,
  };
}
