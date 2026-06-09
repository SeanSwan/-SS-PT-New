// backend/services/clientProgress/workoutHistoryReadModel.mjs

import { unwrapRow } from './progressScoring.mjs';

const TIMEFRAME_DAYS = new Map([
  ['1month', 30],
  ['3months', 90],
  ['6months', 180],
  ['1year', 365],
  ['all', null],
]);

const toIsoDateOnly = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toISOString().split('T')[0]
    : null;
};

const valueOrDefault = (value, fallback) => (value ? value : fallback);

const finiteNumberOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

export const parseWorkoutHistoryTimeframe = (timeframe) => {
  const key = String(timeframe || '').toLowerCase();
  return TIMEFRAME_DAYS.has(key) ? TIMEFRAME_DAYS.get(key) : 90;
};

export const toWorkoutHistoryEntry = (session) => {
  const raw = unwrapRow(session) || {};
  return {
    date: toIsoDateOnly(raw.date),
    type: valueOrDefault(raw.title, 'Workout'),
    duration: finiteNumberOr(raw.duration, 0),
    intensity: finiteNumberOr(raw.intensity, null),
    notes: valueOrDefault(raw.notes, undefined),
  };
};
