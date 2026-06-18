import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { FORMAT_CONFIG } from './BootcampBuilderConstants';
import type { BuildMode } from './BootcampBuilderPage.constants';

export interface BootcampCommandMetric {
  label: string;
  value: string;
  detail: string;
}

export interface BootcampCommandDeckModel {
  readinessScore: number;
  readinessLabel: string;
  readinessTone: 'ready' | 'steady' | 'warning' | 'danger';
  nextAction: string;
  missingDemoCount: number;
  bottleneckCount: number;
  metrics: BootcampCommandMetric[];
}

const modeLabels: Record<BuildMode, string> = {
  ai: 'Swan Coach',
  manual: 'Manual',
  hybrid: 'Hybrid',
};

function hasExerciseDemoMedia(exercise: BootcampExercise): boolean {
  return Boolean(exercise.videoUrl || exercise.catalogVideoSample?.videoUrl);
}

function getMainExercises(bootcamp: GeneratedBootcamp): BootcampExercise[] {
  return bootcamp.exercises.filter((exercise) => !exercise.board || exercise.board === 'main');
}

function getStationGroups(bootcamp: GeneratedBootcamp, exercises: BootcampExercise[]): BootcampExercise[][] {
  const stationCount = bootcamp.stations.length || bootcamp.stationCount || 0;
  return Array.from({ length: stationCount }, (_, stationIndex) => (
    exercises
      .filter((exercise) => (exercise.stationIndex ?? 0) === stationIndex)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  ));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getReadinessLabel(score: number): BootcampCommandDeckModel['readinessLabel'] {
  if (score >= 90) return 'TV-ready';
  if (score >= 76) return 'Run-ready';
  if (score >= 56) return 'Needs tune-up';
  return 'Build required';
}

function getReadinessTone(score: number): BootcampCommandDeckModel['readinessTone'] {
  if (score >= 90) return 'ready';
  if (score >= 76) return 'steady';
  if (score >= 56) return 'warning';
  return 'danger';
}

export function getBootcampCommandDeckModel(
  bootcamp: GeneratedBootcamp,
  buildMode: BuildMode,
  floorMode: boolean,
): BootcampCommandDeckModel {
  const format = FORMAT_CONFIG[bootcamp.classFormat];
  const mainExercises = getMainExercises(bootcamp);
  const stationGroups = getStationGroups(bootcamp, mainExercises);
  const stationCount = stationGroups.length;
  const expectedPerStation = format?.isStationBased ? format.exercisesPerStation : 0;
  const completeStationCount = expectedPerStation > 0
    ? stationGroups.filter((group) => group.length >= expectedPerStation).length
    : stationCount;
  const emptyStationIndex = stationGroups.findIndex((group) => group.length === 0);
  const weakStationIndex = stationGroups.findIndex((group) => (
    expectedPerStation > 0 && group.length > 0 && group.length < expectedPerStation
  ));
  const videoReadyCount = mainExercises.filter(hasExerciseDemoMedia).length;
  const missingDemoCount = Math.max(0, mainExercises.length - videoReadyCount);
  const bottleneckCount = (bootcamp.flowData ?? []).filter((flow) => flow.bottleneck).length;
  const overTime = bootcamp.totalClassMin > 55;
  const demoCoveragePenalty = mainExercises.length > 0
    ? Math.round((missingDemoCount / mainExercises.length) * 24)
    : 24;
  const emptyPenalty = emptyStationIndex >= 0
    ? stationGroups.filter((group) => group.length === 0).length * 18
    : 0;
  const weakPenalty = stationGroups.filter((group) => (
    expectedPerStation > 0 && group.length > 0 && group.length < expectedPerStation
  )).length * 8;
  const readinessScore = clampScore(
    100
    - (mainExercises.length === 0 ? 28 : 0)
    - emptyPenalty
    - weakPenalty
    - demoCoveragePenalty
    - (overTime ? 15 : 0)
    - (bottleneckCount * 8),
  );
  const nextAction = (() => {
    if (mainExercises.length === 0) return 'Add exercises from the SwanStudios Rolodex or generate with Swan Coach.';
    if (emptyStationIndex >= 0) return `Fill Station ${emptyStationIndex + 1} before saving.`;
    if (weakStationIndex >= 0) return `Finish Station ${weakStationIndex + 1} before saving.`;
    if (overTime) return 'Trim timing below 55 minutes.';
    if (missingDemoCount > 0) return `Add demo videos for ${missingDemoCount} exercises before floor mode.`;
    if (bottleneckCount > 0) return `Review ${bottleneckCount} station flow bottleneck${bottleneckCount > 1 ? 's' : ''}.`;
    return floorMode ? 'Demo Mode is live. Keep the station board on screen.' : 'Save template, export PDF, or launch Demo Mode.';
  })();

  return {
    readinessScore,
    readinessLabel: getReadinessLabel(readinessScore),
    readinessTone: getReadinessTone(readinessScore),
    nextAction,
    missingDemoCount,
    bottleneckCount,
    metrics: [
      {
        label: 'Stations',
        value: stationCount > 0 ? `${completeStationCount}/${stationCount} live` : 'Group',
        detail: expectedPerStation > 0 ? `${expectedPerStation} exercises per station` : 'No station rotation',
      },
      {
        label: 'Demo media',
        value: `${videoReadyCount}/${mainExercises.length}`,
        detail: missingDemoCount === 0 ? 'Floor visuals ready' : `${missingDemoCount} media slots open`,
      },
      {
        label: 'Time cap',
        value: `${bootcamp.totalClassMin}/55`,
        detail: overTime ? 'Trim before class' : 'Inside class window',
      },
      {
        label: 'Mode',
        value: modeLabels[buildMode],
        detail: bootcamp.aiGenerated ? 'Generated class' : 'Trainer-controlled edits',
      },
    ],
  };
}
