import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { FORMAT_CONFIG } from './BootcampBuilderConstants';
import type { BuildMode } from './BootcampBuilderPage.constants';
import { getBootcampFloorStationCount, getBootcampFloorStationIndex } from './BootcampDemoMode.stationCount';

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
  repairQueue: string[];
  missingDemoCount: number;
  bottleneckCount: number;
  equipmentShortage: boolean;
  equipmentAlertLabel: string | null;
  metrics: BootcampCommandMetric[];
}

const modeLabels: Record<BuildMode, string> = {
  ai: 'Swan Coach',
  manual: 'Manual',
  hybrid: 'Hybrid',
};

function hasExerciseDemoMedia(exercise: BootcampExercise): boolean {
  return Boolean(exercise.videoUrl || exercise.previewVideoUrl || exercise.catalogVideoSample?.videoUrl);
}

function getMainExercises(bootcamp: GeneratedBootcamp): BootcampExercise[] {
  return bootcamp.exercises.filter((exercise) => !exercise.board || exercise.board === 'main');
}

function getStationGroups(bootcamp: GeneratedBootcamp, exercises: BootcampExercise[]): BootcampExercise[][] {
  const stationCount = getBootcampFloorStationCount(bootcamp, 0);
  return Array.from({ length: stationCount }, (_, stationIndex) => (
    exercises
      .filter((exercise) => getBootcampFloorStationIndex(exercise.stationIndex) === stationIndex)
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

function getMissingEquipmentNames(bootcamp: GeneratedBootcamp): string[] {
  const counts = bootcamp.equipmentReadiness?.missingEquipmentCounts ?? {};
  return Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([name]) => name.trim())
    .filter(Boolean);
}

function getEquipmentReadinessMessage(bootcamp: GeneratedBootcamp): string | null {
  const message = bootcamp.equipmentReadiness?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

function hasEquipmentShortage(bootcamp: GeneratedBootcamp): boolean {
  const readiness = bootcamp.equipmentReadiness;
  if (!readiness) return false;
  const allowed = Number(readiness.allowedCount);
  const required = Number(readiness.requiredSlots);
  const countShortage = Number.isFinite(allowed) && Number.isFinite(required) && required > 0 && allowed < required;
  return (
    readiness.type === 'insufficient_equipment'
    || readiness.code === 'insufficient_equipment'
    || countShortage
  );
}

function getEquipmentRepairLabel(bootcamp: GeneratedBootcamp): string {
  const missing = getMissingEquipmentNames(bootcamp).slice(0, 3);
  if (missing.length > 0) return `Add or map equipment: ${missing.join(', ')}`;
  return getEquipmentReadinessMessage(bootcamp) ?? 'Add or map missing equipment before teaching this class';
}

function getEquipmentAlertLabel(bootcamp: GeneratedBootcamp): string | null {
  if (!hasEquipmentShortage(bootcamp)) return null;
  const missing = getMissingEquipmentNames(bootcamp).slice(0, 3);
  return missing.length > 0 ? `Equipment shortage: ${missing.join(', ')}` : getEquipmentReadinessMessage(bootcamp) ?? 'Equipment shortage';
}

function getEquipmentMetric(bootcamp: GeneratedBootcamp): BootcampCommandMetric {
  const readiness = bootcamp.equipmentReadiness;
  if (!readiness) {
    return {
      label: 'Equipment',
      value: 'Any',
      detail: 'No strict profile',
    };
  }

  const allowed = Number(readiness.allowedCount ?? 0);
  const required = Number(readiness.requiredSlots ?? 0);
  const rejected = Number(readiness.rejectedCount ?? 0);
  return {
    label: 'Equipment',
    value: required > 0 ? `${allowed}/${required}` : `${allowed} kept`,
    detail: hasEquipmentShortage(bootcamp)
      ? `${rejected} unavailable exercises removed`
      : `${rejected} filtered out`,
  };
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
  const expectedPerStation = typeof bootcamp.exercisesPerStation === 'number' && bootcamp.exercisesPerStation > 0
    ? bootcamp.exercisesPerStation
    : format?.isStationBased ? format.exercisesPerStation : 0;
  const completeStationCount = expectedPerStation > 0
    ? stationGroups.filter((group) => group.length >= expectedPerStation).length
    : stationCount;
  const emptyStationIndex = stationGroups.findIndex((group) => group.length === 0);
  const weakStationIndex = stationGroups.findIndex((group) => (
    expectedPerStation > 0 && group.length > 0 && group.length < expectedPerStation
  ));
  const emptyStationIndices = stationGroups
    .map((group, index) => (group.length === 0 ? index : -1))
    .filter((index) => index >= 0);
  const weakStationIndices = stationGroups
    .map((group, index) => (
      expectedPerStation > 0 && group.length > 0 && group.length < expectedPerStation ? index : -1
    ))
    .filter((index) => index >= 0);
  const videoReadyCount = mainExercises.filter(hasExerciseDemoMedia).length;
  const missingDemoCount = Math.max(0, mainExercises.length - videoReadyCount);
  const bottleneckCount = (bootcamp.flowData ?? []).filter((flow) => flow.bottleneck).length;
  const overTime = bootcamp.totalClassMin > 55;
  const overTimeMin = Math.max(0, bootcamp.totalClassMin - 55);
  const equipmentShortage = hasEquipmentShortage(bootcamp);
  const equipmentAlertLabel = getEquipmentAlertLabel(bootcamp);
  const equipmentRepairLabel = getEquipmentRepairLabel(bootcamp);
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
    - (equipmentShortage ? 18 : 0)
    - (bottleneckCount * 8),
  );
  const nextAction = (() => {
    if (mainExercises.length === 0) return 'Add exercises from the SwanStudios Rolodex or generate with Swan Coach.';
    if (emptyStationIndex >= 0) return `Fill Station ${emptyStationIndex + 1} before saving.`;
    if (weakStationIndex >= 0) return `Finish Station ${weakStationIndex + 1} before saving.`;
    if (equipmentShortage) return equipmentRepairLabel;
    if (overTime) return 'Trim timing below 55 minutes.';
    if (missingDemoCount > 0) return `Add demo videos for ${missingDemoCount} exercises before floor mode.`;
    if (bottleneckCount > 0) return `Review ${bottleneckCount} station flow bottleneck${bottleneckCount > 1 ? 's' : ''}.`;
    return floorMode ? 'Demo Mode is live. Keep the station board on screen.' : 'Save template, export PDF, or launch Demo Mode.';
  })();
  const repairQueue = [
    ...emptyStationIndices.map((stationIndex) => `Fill S${stationIndex + 1}`),
    ...weakStationIndices.map((stationIndex) => `Finish S${stationIndex + 1} to ${expectedPerStation} exercises`),
    ...(equipmentShortage ? [equipmentRepairLabel] : []),
    ...(missingDemoCount > 0 ? [`Add ${missingDemoCount} demo video${missingDemoCount > 1 ? 's' : ''}`] : []),
    ...(overTimeMin > 0 ? [`Trim ${overTimeMin} minute${overTimeMin > 1 ? 's' : ''} from class time`] : []),
    ...(bottleneckCount > 0 ? [`Review ${bottleneckCount} flow bottleneck${bottleneckCount > 1 ? 's' : ''}`] : []),
  ];

  return {
    readinessScore,
    readinessLabel: getReadinessLabel(readinessScore),
    readinessTone: getReadinessTone(readinessScore),
    nextAction,
    repairQueue,
    missingDemoCount,
    bottleneckCount,
    equipmentShortage,
    equipmentAlertLabel,
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
      getEquipmentMetric(bootcamp),
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
