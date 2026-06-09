/**
 * Client workout-history helpers — unit tests
 * ============================================
 * Covers the pure helpers backing GET /api/client-progress/:clientId/workout-history.
 * This is the truth-restoration route that replaces the silent July-2024 mock
 * fallback on the client dashboard (enhanced-progress-analytics-service.ts).
 *
 * Regression intent: before this route existed, the client dashboard swallowed
 * a 404 and rendered fabricated history. These tests lock the contract so the
 * helpers never silently drift away from the real WorkoutSession shape.
 */
import { describe, expect, it } from 'vitest';
import {
  parseWorkoutHistoryTimeframe,
  toWorkoutHistoryEntry,
} from '../../services/clientProgress/workoutHistoryReadModel.mjs';

describe('parseWorkoutHistoryTimeframe', () => {
  it('maps the named windows used by the frontend service', () => {
    expect(parseWorkoutHistoryTimeframe('1month')).toBe(30);
    expect(parseWorkoutHistoryTimeframe('3months')).toBe(90);
    expect(parseWorkoutHistoryTimeframe('6months')).toBe(180);
    expect(parseWorkoutHistoryTimeframe('1year')).toBe(365);
  });

  it('returns null for "all" so the route skips the date filter', () => {
    expect(parseWorkoutHistoryTimeframe('all')).toBeNull();
  });

  it('defaults unknown/empty input to 90 days (matches frontend default)', () => {
    expect(parseWorkoutHistoryTimeframe(undefined)).toBe(90);
    expect(parseWorkoutHistoryTimeframe('')).toBe(90);
    expect(parseWorkoutHistoryTimeframe('garbage')).toBe(90);
  });

  it('is case-insensitive', () => {
    expect(parseWorkoutHistoryTimeframe('3MONTHS')).toBe(90);
  });
});

describe('toWorkoutHistoryEntry', () => {
  it('maps a real WorkoutSession row to the WorkoutHistoryEntry shape', () => {
    const session = {
      id: 'abc-123',
      title: 'Push Day — Chest + Triceps',
      date: new Date('2026-04-10T15:30:00.000Z'),
      duration: 55,
      intensity: 8,
      notes: 'Felt strong',
    };
    expect(toWorkoutHistoryEntry(session)).toEqual({
      date: '2026-04-10',
      type: 'Push Day — Chest + Triceps',
      duration: 55,
      intensity: 8,
      notes: 'Felt strong',
    });
  });

  it('unwraps Sequelize instances via toJSON()', () => {
    const instance = {
      toJSON: () => ({
        title: 'Leg Day',
        date: '2026-04-11T10:00:00.000Z',
        duration: 45,
        intensity: 7,
        notes: null,
      }),
    };
    const entry = toWorkoutHistoryEntry(instance);
    expect(entry.date).toBe('2026-04-11');
    expect(entry.type).toBe('Leg Day');
    expect(entry.duration).toBe(45);
    expect(entry.intensity).toBe(7);
    expect(entry.notes).toBeUndefined();
  });

  it('falls back to "Workout" when title is missing', () => {
    const entry = toWorkoutHistoryEntry({
      date: '2026-04-01T00:00:00.000Z',
      duration: 30,
      intensity: 5,
    });
    expect(entry.type).toBe('Workout');
  });

  it('preserves missing intensity as null rather than inventing a zero rating', () => {
    const entry = toWorkoutHistoryEntry({
      title: 'Mobility',
      date: '2026-04-05T00:00:00.000Z',
      duration: null,
      intensity: undefined,
    });
    expect(entry.duration).toBe(0);
    expect(entry.intensity).toBeNull();
  });

  it('returns null date for invalid dates instead of crashing', () => {
    const entry = toWorkoutHistoryEntry({
      title: 'Bad row',
      date: 'not-a-date',
      duration: 10,
      intensity: 5,
    });
    expect(entry.date).toBeNull();
    expect(entry.type).toBe('Bad row');
  });
});
