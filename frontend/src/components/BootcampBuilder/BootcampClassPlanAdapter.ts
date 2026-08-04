/**
 * ============================================================================
 * FILE: BootcampClassPlanAdapter.ts
 * PURPOSE: Adapt the live generator payload into the portable ClassPlan seam.
 * SOURCE OF TRUTH: shared/bootcamp-core classPlan.mjs + timeline.mjs.
 * PRIVACY: Aggregate class facts only; no participant identity is representable.
 * ============================================================================
 */
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { FORMAT_CONFIG, ROTATION_SEC } from './BootcampBuilderConstants';
import { createClassPlan, createExerciseSlot } from '../../../../shared/bootcamp-core/classPlan.mjs';
import { expandSegments } from '../../../../shared/bootcamp-core/timeline.mjs';

export interface PortableTimelineSegment {
  phase: string;
  blockIndex: number;
  round: number | null;
  visit: number | null;
  position: number | null;
  stationIndex: number | null;
  slotId: string | null;
  label: string;
  durationSec: number;
}

export interface PortableClassPlan {
  structure: {
    shape: 'stations' | 'full_group';
    stationCount: number;
    exercisesPerStation: number;
    rounds: number;
    workSec: number;
    restSec: number;
    stationTransitionSec: number;
    roundBreakSec: number;
  };
  blocks: Array<{ kind: 'warmup' | 'work' | 'cooldown'; slots: PortableSlot[] }>;
  stations: Array<{ stationIndex: number; label: string; equipmentRefs: string[] }>;
  [key: string]: unknown;
}

interface PortableSlot {
  slotId: string;
  exerciseRef: string;
  stationIndex: number | null;
  displayName: string;
  workSec: number | null;
  restSec: number | null;
  [key: string]: unknown;
}

const mainExercises = (bootcamp: GeneratedBootcamp) => bootcamp.exercises
  .filter((exercise) => !exercise.board || exercise.board === 'main');

const safeSeconds = (value: number | undefined, fallback: number): number => (
  Number.isFinite(value) ? Math.max(5, Math.trunc(value as number)) : fallback
);

const exerciseRef = (name: string, station: number, position: number): string => (
  `generated:${station}:${position}:${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
);

const minutesAsSeconds = (value: number | undefined): number => (
  Number.isFinite(value) ? Math.max(0, Math.trunc((value as number) * 60)) : 0
);

const toSlot = (exercise: ReturnType<typeof mainExercises>[number], station: number | null, position: number) => (
  createExerciseSlot({
    slotId: `slot:${station ?? 'all'}:${position}:${exercise.exerciseName}`,
    exerciseRef: exercise.exerciseLibraryId ?? exerciseRef(exercise.exerciseName, station ?? 0, position),
    stationIndex: station,
    displayName: exercise.exerciseName,
    workSec: safeSeconds(exercise.durationSec, 40),
    restSec: Math.max(0, Math.trunc(exercise.restSec || 0)),
    equipmentRefs: exercise.equipmentRequired ? [exercise.equipmentRequired] : [],
    variants: [exercise.easyVariation, exercise.mediumVariation, exercise.hardVariation]
      .filter(Boolean).map((label, index) => ({ key: `level-${index + 1}`, label })),
  })
);

const isStationFormat = (bootcamp: GeneratedBootcamp): boolean => (
  FORMAT_CONFIG[bootcamp.classFormat]?.isStationBased ?? bootcamp.stationCount > 0
);

export function toPortableClassPlan(bootcamp: GeneratedBootcamp): PortableClassPlan {
  const exercises = mainExercises(bootcamp);
  const stationShape = isStationFormat(bootcamp);
  const stationCount = stationShape ? Math.max(1, Math.trunc(bootcamp.stationCount || 1)) : 0;
  const grouped = Array.from({ length: stationCount }, () => [] as typeof exercises);
  exercises.forEach((exercise) => {
    const station = Math.max(0, Math.min(stationCount - 1, Math.trunc(exercise.stationIndex ?? 0)));
    if (stationShape) grouped[station].push(exercise);
  });
  grouped.forEach((group) => group.sort((a, b) => a.sortOrder - b.sortOrder));
  const exercisesPerStation = stationShape
    ? Math.max(1, Math.trunc(bootcamp.exercisesPerStation || Math.max(0, ...grouped.map((group) => group.length))))
    : exercises.length;
  const workSec = Math.max(5, Math.trunc(bootcamp.exerciseDurationSec
    || Math.max(0, ...exercises.map((exercise) => exercise.durationSec)) || 40));
  const restSec = Math.max(0, ...exercises.map((exercise) => Math.trunc(exercise.restSec || 0)));
  const workSlots = stationShape && exercises.length > 0
    ? grouped.flatMap((group, station) => Array.from({ length: exercisesPerStation }, (_, position) => {
      const item = group[position];
      return item ? toSlot(item, station, position) : createExerciseSlot({
        slotId: `slot:${station}:${position}:recovery`, exerciseRef: 'generated:recovery',
        stationIndex: station, displayName: 'Recovery', workSec, restSec,
      });
    }))
    : [...exercises].sort((a, b) => a.sortOrder - b.sortOrder)
      .map((exercise, position) => toSlot(exercise, null, position));
  const warmupSlots = [...(bootcamp.stretches ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stretch, index) => createExerciseSlot({
      slotId: `warmup:${index}:${stretch.exerciseName}`, exerciseRef: `generated:warmup:${index}`,
      displayName: stretch.exerciseName, workSec: safeSeconds(stretch.durationSec, 30), restSec: 0,
    }));
  const declaredStretchSec = minutesAsSeconds(bootcamp.stretchDurationMin);
  const scheduledWarmupSlots = warmupSlots.length > 0 || declaredStretchSec === 0
    ? warmupSlots
    : [createExerciseSlot({
      slotId: 'warmup:flexibility-prep', exerciseRef: 'generated:flexibility-prep',
      displayName: 'Flexibility Prep', workSec: declaredStretchSec, restSec: 0,
    })];
  const hasRunnableWork = workSlots.length > 0;
  const demoSec = hasRunnableWork ? minutesAsSeconds(bootcamp.demoDuration) : 0;
  const clearSec = hasRunnableWork ? minutesAsSeconds(bootcamp.clearDuration) : 0;
  const openingSlots = [
    ...(demoSec > 0 ? [createExerciseSlot({
      slotId: 'opening:coach-demo', exerciseRef: 'generated:coach-demo',
      displayName: 'Coach Demo', workSec: demoSec, restSec: 0,
    })] : []),
    ...scheduledWarmupSlots,
  ];
  const closingSlots = clearSec > 0 ? [createExerciseSlot({
    slotId: 'closing:clear-floor', exerciseRef: 'generated:clear-floor',
    displayName: 'Clear Floor', workSec: clearSec, restSec: 0,
  })] : [];
  return createClassPlan({
    name: bootcamp.name,
    intent: { dayTypeId: bootcamp.dayType, targetDurationMin: bootcamp.targetDuration,
      headcount: bootcamp.expectedParticipants, mode: 'strict' },
    structure: { shape: stationShape ? 'stations' : 'full_group', stationCount,
      exercisesPerStation, rounds: Math.max(1, Math.trunc(bootcamp.rounds || 1)),
      workSec, restSec, stationTransitionSec: stationShape ? ROTATION_SEC : 0, roundBreakSec: 0 },
    blocks: [
      ...(openingSlots.length && hasRunnableWork ? [{ kind: 'warmup', slots: openingSlots }] : []),
      ...(hasRunnableWork ? [{ kind: 'work', slots: workSlots }] : []),
      ...(closingSlots.length ? [{ kind: 'cooldown', slots: closingSlots }] : []),
    ],
    stations: stationShape ? Array.from({ length: stationCount }, (_, stationIndex) => ({
      stationIndex,
      label: bootcamp.stations[stationIndex]?.stationName ?? `Station ${stationIndex + 1}`,
      equipmentRefs: [],
    })) : [],
    provenance: { generator: bootcamp.aiGenerated ? 'brain' : 'deterministic',
      brainModel: bootcamp.aiGenerated ? 'legacy-generator' : null },
  });
}

export function expandGeneratedBootcampSegments(bootcamp: GeneratedBootcamp): PortableTimelineSegment[] {
  return expandSegments(toPortableClassPlan(bootcamp)) as PortableTimelineSegment[];
}

export function getGeneratedBootcampRuntimeSec(bootcamp: GeneratedBootcamp): number {
  return expandGeneratedBootcampSegments(bootcamp)
    .reduce((total, segment) => total + Math.max(0, segment.durationSec), 0);
}


export function stationCuesForSegment(plan: PortableClassPlan, segment: PortableTimelineSegment): string[] {
  const workBlock = plan.blocks.find((block) => block.kind === 'work');
  if (!workBlock) return [];
  if (plan.structure.shape === 'full_group') {
    return [workBlock.slots.find((slot) => slot.slotId === segment.slotId)?.displayName ?? segment.label];
  }
  if (segment.phase === 'station_transition') {
    return plan.stations.map((station) => `${station.label} → next station`);
  }
  const position = segment.position ?? 0;
  return plan.stations.map((station) => workBlock.slots
    .filter((slot) => slot.stationIndex === station.stationIndex)[position]?.displayName ?? 'Recovery');
}