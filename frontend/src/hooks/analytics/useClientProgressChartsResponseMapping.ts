/**
 * useClientProgressChartsResponseMapping
 * ======================================
 *
 * Shared response mapper for the 12-chart workout progress proof contract.
 * Converts partial API outages into explicit unavailable counts while keeping
 * honest empty workout data as empty chart series.
 */

import {
  type AnchorLiftsBundle,
  type AttendanceBundle,
  type CanonicalProgressCharts,
  type SetsRepsBundle,
} from './useClientProgressCharts.types';
import { sanitizeClientProgressChartsBundle } from './useClientProgressChartsSanitizers';

const EMPTY_ATTENDANCE: AttendanceBundle = {
  data: [],
  reliabilityPercent: 0,
  totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
};

const EMPTY_SETS_REPS: SetsRepsBundle = { sets: [], reps: [] };

const EMPTY_ANCHOR_LIFTS: AnchorLiftsBundle = { data: {}, exercises: [] };

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
};

const arrayOrEmpty = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const isSuccessResponse = (response: any): boolean => (
  response && typeof response === 'object' && response.success === true
);

const successDataOrNull = (response: any): any => (
  isSuccessResponse(response) ? response.data ?? null : null
);

const numberOrZero = (value: unknown): number => (typeof value === 'number' ? value : 0);

const anchorLiftDataOrEmpty = (value: unknown): AnchorLiftsBundle['data'] => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as AnchorLiftsBundle['data']
    : {}
);

const listOrEmpty = (response: any): any[] => arrayOrEmpty(successDataOrNull(response));

const attendanceFrom = (response: any): AttendanceBundle => {
  if (!isSuccessResponse(response)) return EMPTY_ATTENDANCE;
  return {
    data: arrayOrEmpty(response.data),
    reliabilityPercent: numberOrZero(response.reliabilityPercent),
    totals: response.totals || EMPTY_ATTENDANCE.totals,
  };
};

const setsRepsFrom = (response: any): SetsRepsBundle => {
  const data = successDataOrNull(response);
  if (!data) return EMPTY_SETS_REPS;
  return {
    sets: arrayOrEmpty(data.sets),
    reps: arrayOrEmpty(data.reps),
  };
};

const anchorLiftsFrom = (response: any): AnchorLiftsBundle => {
  if (!isSuccessResponse(response)) return EMPTY_ANCHOR_LIFTS;
  return {
    data: anchorLiftDataOrEmpty(response.data),
    exercises: arrayOrEmpty(response.exercises),
  };
};

export const buildCanonicalProgressChartsFromResponses = (
  responses: any[],
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
  });
};

export const countUnavailableChartResponses = (responses: any[]) => (
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
].filter((series) => series.length > 0).length);
