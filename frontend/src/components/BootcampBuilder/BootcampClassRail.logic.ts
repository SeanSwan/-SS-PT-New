import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { getGeneratedBootcampRuntimeSec } from './BootcampClassPlanAdapter';

export type BootcampWorkflowStage = 'build' | 'preflight' | 'run';

export interface BootcampRailStage {
  id: BootcampWorkflowStage;
  label: string;
  eyebrow: string;
  available: boolean;
}

export interface BootcampRailFact {
  label: string;
  value: string;
}

export interface BootcampRailPrimaryAction {
  label: string;
  targetStage?: BootcampWorkflowStage;
  disabled: boolean;
}

export interface BootcampClassRailModel {
  stages: BootcampRailStage[];
  facts: BootcampRailFact[];
  hardBlockers: string[];
  warnings: string[];
  primaryAction: BootcampRailPrimaryAction;
  stationDensity: 'roomy' | 'compact';
  activeStage: BootcampWorkflowStage;
  statusLabel: string;
}

const DAY_TYPE_LABELS: Record<GeneratedBootcamp['dayType'], string> = {
  lower_body: 'Lower Body',
  upper_body: 'Upper Body',
  cardio: 'Cardio',
  full_body: 'Full Body',
  custom: 'Custom',
};

const isMainBoardExercise = (exercise: GeneratedBootcamp['exercises'][number]): boolean => (
  !exercise.board || exercise.board === 'main'
);

const hasDemoMedia = (exercise: GeneratedBootcamp['exercises'][number]): boolean => Boolean(
  exercise.videoUrl
  || exercise.previewVideoUrl
  || exercise.catalogVideoSample?.videoUrl
);

const pluralize = (count: number, singular: string, plural = `${singular}s`): string => (
  count === 1 ? singular : plural
);

function getHardBlockers(bootcamp: GeneratedBootcamp): string[] {
  // R-H20 (contract §6 line 264): "If even baseline fails, return a Preflight budget failure
  // rather than certify the class." The server reports `certifiable:false` on the progression
  // record, and until it had a consumer nothing stopped: the class persisted and Run stayed
  // available. This is that consumer.
  //
  // GUARD, NOT LIVE BEHAVIOUR TODAY (external review, round 99, MED-1): `progression` is
  // produced only by the Sprint generator/regenerate paths and lives in
  // `slot.generatedClassData`, while this rail's data comes from `POST /api/bootcamp/generate`
  // — which never passes a work-interval modifier. Neither field can reach this file yet. The
  // rules are correct for the day a producer exists; they are not observable behaviour now.
  const budgetBlockers = bootcamp.progression?.certifiable === false
    ? ['The requested class time cannot fit even the baseline work interval, so this class is not run-ready. Shorten the target duration or reduce the work interval request.']
    : [];

  const mainExercises = bootcamp.exercises.filter(isMainBoardExercise);
  if (mainExercises.length === 0) {
    return [...budgetBlockers, 'The class has no main-board exercises.'];
  }

  const stationCount = Math.max(0, Math.trunc(bootcamp.stationCount || 0));
  if (stationCount === 0) return budgetBlockers;

  const occupiedStations = new Set(
    mainExercises
      .map((exercise) => Math.trunc(exercise.stationIndex ?? 0))
      .filter((stationIndex) => stationIndex >= 0 && stationIndex < stationCount),
  );

  return [
    ...budgetBlockers,
    ...Array.from({ length: stationCount }, (_, stationIndex) => stationIndex)
      .filter((stationIndex) => !occupiedStations.has(stationIndex))
      .map((stationIndex) => `Station ${stationIndex + 1} has no main-board exercise.`),
  ];
}

/**
 * R-H20 (contract §6 line 264, F2): an increase that was APPLIED without the work block ever
 * being compared against the requested time. `budgetStatus: 'not_checked'` says the server did
 * not verify the budget — truthfully, because a paced protocol keeps its exact timing, a
 * reduction cannot overrun, or the format's work-slot count is unknown (full_group / circuit /
 * hybrid). Only the last case can overrun a class that was changed, so the warning is keyed to
 * the record's own facts — an increase that actually took effect (`applied`) while the budget
 * went unchecked — and stays quiet on every path that changed nothing.
 *
 * Same MED-1 caveat as `getHardBlockers`: no current producer reaches this consumer.
 */
function getProgressionWarnings(bootcamp: GeneratedBootcamp): string[] {
  const progression = bootcamp.progression;
  if (!progression || progression.budgetStatus !== 'not_checked') return [];
  if (progression.applied !== true) return [];
  if (!(typeof progression.requestedModifier === 'number' && progression.requestedModifier > 1)) return [];
  return ['The time budget for the increased work interval could not be verified for this class format.'];
}

function getWarnings(bootcamp: GeneratedBootcamp): string[] {
  const mainExercises = bootcamp.exercises.filter(isMainBoardExercise);
  const missingDemoCount = mainExercises.filter((exercise) => !hasDemoMedia(exercise)).length;
  const bottleneckCount = (bootcamp.flowData ?? []).filter((flow) => flow.bottleneck).length;
  const compiledRuntimeMinutes = Math.ceil(getGeneratedBootcampRuntimeSec(bootcamp) / 60);
  const overTimeMinutes = Math.max(0, compiledRuntimeMinutes - 55);

  return [
    ...getProgressionWarnings(bootcamp),
    ...(missingDemoCount > 0
      ? [`${missingDemoCount} ${pluralize(missingDemoCount, 'exercise')} ${missingDemoCount === 1 ? 'has' : 'have'} no demo media.`]
      : []),
    ...(bottleneckCount > 0
      ? [`${bottleneckCount} flow ${pluralize(bottleneckCount, 'bottleneck')} need review.`]
      : []),
    ...(overTimeMinutes > 0
      ? [`The plan is ${overTimeMinutes} ${pluralize(overTimeMinutes, 'minute')} over the 55-minute window.`]
      : []),
  ];
}

export function getNextBootcampStage(
  bootcamp: GeneratedBootcamp | null,
  stage: BootcampWorkflowStage,
): BootcampWorkflowStage {
  if (!bootcamp) return 'build';
  if (stage === 'build') return 'preflight';
  if (stage === 'preflight' && getHardBlockers(bootcamp).length === 0) return 'run';
  return stage;
}

export function getBootcampClassRailModel(
  bootcamp: GeneratedBootcamp | null,
  activeStage: BootcampWorkflowStage,
): BootcampClassRailModel {
  const hardBlockers = bootcamp ? getHardBlockers(bootcamp) : [];
  const warnings = bootcamp ? getWarnings(bootcamp) : [];
  const canRun = Boolean(bootcamp) && hardBlockers.length === 0;
  const stages: BootcampRailStage[] = [
    { id: 'build', label: 'Build', eyebrow: 'Shape the plan', available: true },
    { id: 'preflight', label: 'Preflight', eyebrow: 'Prove readiness', available: Boolean(bootcamp) },
    { id: 'run', label: 'Run', eyebrow: 'Coach the room', available: canRun },
  ];

  const primaryAction: BootcampRailPrimaryAction = (() => {
    if (!bootcamp) return { label: 'Build a class to continue', disabled: true };
    if (activeStage === 'build') return { label: 'Prepare Class', targetStage: 'preflight', disabled: false };
    if (activeStage === 'preflight' && hardBlockers.length > 0) {
      return {
        label: `Resolve ${hardBlockers.length} ${pluralize(hardBlockers.length, 'blocker')}`,
        disabled: true,
      };
    }
    if (activeStage === 'preflight') return { label: 'Start Class', targetStage: 'run', disabled: false };
    return { label: 'Return to Preflight', targetStage: 'preflight', disabled: false };
  })();

  const facts: BootcampRailFact[] = bootcamp ? [
    { label: 'Class', value: bootcamp.name || 'Untitled Class' },
    { label: 'Rotation', value: DAY_TYPE_LABELS[bootcamp.dayType] ?? 'Custom' },
    { label: 'Stations', value: String(bootcamp.stationCount || 0) },
    { label: 'Capacity', value: String(bootcamp.expectedParticipants || 0) },
    { label: 'Planned', value: `${Math.ceil(getGeneratedBootcampRuntimeSec(bootcamp) / 60)} min` },
  ] : [
    { label: 'Class', value: 'Not built' },
    { label: 'Rotation', value: '?' },
    { label: 'Stations', value: '?' },
    { label: 'Capacity', value: '?' },
    { label: 'Planned', value: '?' },
  ];

  const statusLabel = !bootcamp
    ? 'Waiting for a class plan'
    : hardBlockers.length > 0
      ? `${hardBlockers.length} hard ${pluralize(hardBlockers.length, 'blocker')}`
      : warnings.length > 0
        ? `Run-ready with ${warnings.length} ${pluralize(warnings.length, 'warning')}`
        : 'Run-ready';

  return {
    stages,
    facts,
    hardBlockers,
    warnings,
    primaryAction,
    stationDensity: (bootcamp?.stationCount ?? 0) > 4 ? 'compact' : 'roomy',
    activeStage,
    statusLabel,
  };
}
