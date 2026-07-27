/**
 * useClientProgressChartsResponseMapping
 * ======================================
 *
 * Shared response mapper for the 15-chart workout progress proof contract.
 * Converts partial API outages into explicit unavailable counts while keeping
 * honest empty workout data as empty chart series.
 */

import {
  type AnchorLiftsBundle,
  type AttendanceBundle,
  type CanonicalProgressCharts,
  type EstOneRmBundle,
  type SetsRepsBundle,
} from './useClientProgressCharts.types';
import {
  sanitizeClientProgressChartsBundle,
  type RawAnchorLiftsBundle,
  type RawAttendanceBundle,
  type RawEstOneRmBundle,
  type RawSetsRepsBundle,
} from './useClientProgressChartsSanitizers';

const EMPTY_ATTENDANCE: AttendanceBundle = {
  data: [],
  reliabilityPercent: 0,
  totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
};

const EMPTY_SETS_REPS: SetsRepsBundle = { sets: [], reps: [] };

const EMPTY_ANCHOR_LIFTS: AnchorLiftsBundle = { data: {}, exercises: [] };

const EMPTY_EST_ONE_RM: EstOneRmBundle = { exercise: null, data: [] };

export const EMPTY_CANONICAL_PROGRESS_CHARTS: CanonicalProgressCharts = {
  workoutFrequency: [],
  attendanceReliability: EMPTY_ATTENDANCE,
  weeklyVolume: [],
  setsRepsTrend: EMPTY_SETS_REPS,
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [],
  anchorLifts: EMPTY_ANCHOR_LIFTS,
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
  weightTrend: [],
  bodyFatTrend: [],
  estOneRm: EMPTY_EST_ONE_RM,
};

type ResponseRecord = Record<string, unknown>;

const isResponseRecord = (value: unknown): value is ResponseRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const arrayOrEmpty = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isSuccessResponse = (response: unknown): response is ResponseRecord & { success: true } => (
  isResponseRecord(response) && response.success === true
);

const successDataOrNull = (response: unknown): unknown => (
  isSuccessResponse(response) ? response.data ?? null : null
);

const numberOrZero = (value: unknown): number => (typeof value === 'number' ? value : 0);

const anchorLiftDataOrEmpty = (value: unknown): Record<string, unknown> => (
  isResponseRecord(value) ? value : {}
);

const listOrEmpty = (response: unknown): unknown[] => arrayOrEmpty(successDataOrNull(response));

const attendanceFrom = (response: unknown): RawAttendanceBundle => {
  if (!isSuccessResponse(response)) return EMPTY_ATTENDANCE;
  return {
    data: arrayOrEmpty(response.data),
    reliabilityPercent: numberOrZero(response.reliabilityPercent),
    totals: response.totals ?? EMPTY_ATTENDANCE.totals,
  };
};

const setsRepsFrom = (response: unknown): RawSetsRepsBundle => {
  const data = successDataOrNull(response);
  if (!isResponseRecord(data)) return EMPTY_SETS_REPS;
  return {
    sets: arrayOrEmpty(data.sets),
    reps: arrayOrEmpty(data.reps),
  };
};

const anchorLiftsFrom = (response: unknown): RawAnchorLiftsBundle => {
  if (!isSuccessResponse(response)) return EMPTY_ANCHOR_LIFTS;
  return {
    data: anchorLiftDataOrEmpty(response.data),
    exercises: arrayOrEmpty(response.exercises),
  };
};

const estOneRmFrom = (response: unknown): RawEstOneRmBundle => {
  if (!isSuccessResponse(response)) return EMPTY_EST_ONE_RM;
  return {
    exercise: typeof response.exercise === 'string' && response.exercise.trim() ? response.exercise : null,
    data: arrayOrEmpty(response.data),
  };
};

export const buildCanonicalProgressChartsFromResponses = (
  responses: readonly unknown[],
): CanonicalProgressCharts => {
  const [
    workoutFreqRes,
    attendanceRes,
    weeklyVolumeRes,
    setsRepsRes,
    durationRes,
    intensityRes,
    prRes,
    anchorLiftsRes,
    exerciseFreqRes,
    movementPatternRes,
    muscleGroupRes,
    recoveryRes,
    weightTrendRes,
    bodyFatTrendRes,
    estOneRmRes,
  ] = responses;

  return sanitizeClientProgressChartsBundle({
    workoutFrequency: listOrEmpty(workoutFreqRes),
    attendanceReliability: attendanceFrom(attendanceRes),
    weeklyVolume: listOrEmpty(weeklyVolumeRes),
    setsRepsTrend: setsRepsFrom(setsRepsRes),
    durationTrend: listOrEmpty(durationRes),
    intensityRpeTrend: listOrEmpty(intensityRes),
    prTimeline: listOrEmpty(prRes),
    anchorLifts: anchorLiftsFrom(anchorLiftsRes),
    exerciseFrequency: listOrEmpty(exerciseFreqRes),
    movementPatternBalance: listOrEmpty(movementPatternRes),
    muscleGroupBalance: listOrEmpty(muscleGroupRes),
    recoverySignal: listOrEmpty(recoveryRes),
    weightTrend: listOrEmpty(weightTrendRes),
    bodyFatTrend: listOrEmpty(bodyFatTrendRes),
    estOneRm: estOneRmFrom(estOneRmRes),
  });
};

export const countUnavailableChartResponses = (responses: readonly unknown[]) => (
  responses.filter((response) => !isSuccessResponse(response)).length
);

export const countNonEmptyCharts = (charts: CanonicalProgressCharts) => ([
  charts.workoutFrequency,
  charts.attendanceReliability.data,
  charts.weeklyVolume,
  charts.setsRepsTrend.sets,
  charts.durationTrend,
  charts.intensityRpeTrend,
  charts.prTimeline,
  charts.anchorLifts.exercises,
  charts.exerciseFrequency,
  charts.movementPatternBalance,
  charts.muscleGroupBalance,
  charts.recoverySignal,
  charts.weightTrend,
  charts.bodyFatTrend,
  charts.estOneRm.data,
].filter((series) => series.length > 0).length);
