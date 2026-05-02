import { describe, it, expect } from 'vitest';
import {
  extractCurrentSession,
  planDataToWorkoutDays,
  toCurrentWorkoutPlanResponse,
} from '../services/workoutPlanShapeService.mjs';

// ─────────────────────────────────────────────────────────────
// L1 (2026-05-01) — workoutPlanShapeService unit tests
//
// Covers receipt §6:
//   R3 — extractCurrentSession lifts exercises[] to top level (C1 lock).
//        Reference equality verified IN-MEMORY (no JSON round-trip).
//   R8 — backwards-compat for legacy weeklySchedule[] planData shape.
//        Synthesizes when entry has exercises[]; else returns null.
//   plus baseline coverage of planDataToWorkoutDays.
// ─────────────────────────────────────────────────────────────

const samplePlanWithWeeks = {
  id: 'plan-A',
  title: 'Phase 1 Plan',
  currentWeek: 1,
  currentDay: 2,
  durationWeeks: 4,
  planData: {
    weeks: [
      {
        weekNumber: 1,
        focus: 'Foundation',
        days: [
          {
            dayNumber: 1, name: 'Day 1: push',
            exercises: [{ exerciseId: 'fx-pushup', exerciseName: 'Push-Up', sets: 3, reps: '12-15' }],
          },
          {
            dayNumber: 2, name: 'Day 2: pull',
            exercises: [
              { exerciseId: 'fx-row', exerciseName: 'Row', sets: 3, reps: '10-12' },
              { exerciseId: 'fx-pullup', exerciseName: 'Pull-Up', sets: 3, reps: '5-8' },
            ],
          },
        ],
      },
    ],
  },
};

describe('extractCurrentSession — R3 (C1 lift, reference-equal in-memory)', () => {
  it('returns currentSession with exercises lifted to top level AND nested under session', () => {
    const result = extractCurrentSession(samplePlanWithWeeks);
    expect(result).not.toBeNull();
    expect(result.weekNumber).toBe(1);
    expect(result.dayNumber).toBe(2);
    // C1 lock: exercises array exposed at TWO paths
    expect(Array.isArray(result.exercises)).toBe(true);
    expect(Array.isArray(result.session.exercises)).toBe(true);
    // Reference-equal IN MEMORY (no JSON serialization)
    expect(result.exercises).toBe(result.session.exercises);
    expect(result.exercises).toHaveLength(2);
  });

  it('returns null when currentWeek is out of range', () => {
    const result = extractCurrentSession({ ...samplePlanWithWeeks, currentWeek: 99 });
    expect(result).toBeNull();
  });

  it('returns null when currentDay is out of range within the week', () => {
    const result = extractCurrentSession({ ...samplePlanWithWeeks, currentDay: 99 });
    expect(result).toBeNull();
  });

  it('supports week.sessions[] alias for week.days[]', () => {
    const planWithSessions = {
      ...samplePlanWithWeeks,
      planData: {
        weeks: [
          {
            weekNumber: 1,
            sessions: [{
              dayNumber: 1,
              exercises: [{ exerciseId: 'fx-x', exerciseName: 'X', sets: 1, reps: '5' }],
            }],
          },
        ],
      },
      currentDay: 1,
    };
    const result = extractCurrentSession(planWithSessions);
    expect(result).not.toBeNull();
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseId).toBe('fx-x');
  });
});

describe('extractCurrentSession — R8 (legacy weeklySchedule fallback)', () => {
  it('synthesizes a currentSession when legacy weeklySchedule entry has exercises[]', () => {
    const legacyPlan = {
      id: 'legacy-plan',
      currentWeek: 1,
      currentDay: 1,
      planData: {
        weeklySchedule: [
          {
            dayNumber: 1, name: 'Legacy Day',
            exercises: [{ exerciseId: 'legacy-ex-1', exerciseName: 'Legacy Squat', sets: 3, reps: '10' }],
          },
        ],
      },
    };
    const result = extractCurrentSession(legacyPlan);
    expect(result).not.toBeNull();
    expect(result.dayLabel).toBe('Legacy Day');
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseId).toBe('legacy-ex-1');
    // C1 lift on legacy path too
    expect(result.exercises).toBe(result.session.exercises);
  });

  it('returns null when legacy weeklySchedule entry has no exercises[] field', () => {
    const legacyPlanNoExercises = {
      id: 'legacy-noex',
      currentWeek: 1,
      currentDay: 1,
      planData: {
        weeklySchedule: [{ dayNumber: 1, focus: 'Some focus pattern' }],
      },
    };
    expect(extractCurrentSession(legacyPlanNoExercises)).toBeNull();
  });

  it('returns null when planData has neither weeks[] nor weeklySchedule[]', () => {
    expect(extractCurrentSession({ currentWeek: 1, currentDay: 1, planData: {} })).toBeNull();
  });

  it('returns null when plan has no planData at all', () => {
    expect(extractCurrentSession({ currentWeek: 1, currentDay: 1 })).toBeNull();
  });
});

describe('planDataToWorkoutDays', () => {
  it('flattens weeks[i].days[] for the current week', () => {
    const days = planDataToWorkoutDays(samplePlanWithWeeks.planData, 1);
    expect(days).toHaveLength(2);
    expect(days[0].dayNumber).toBe(1);
    expect(days[1].exercises).toHaveLength(2);
  });

  it('falls back to legacy weeklySchedule when no weeks[]', () => {
    const data = {
      weeklySchedule: [{ dayNumber: 1, name: 'Legacy', exercises: [{ exerciseId: 'x', exerciseName: 'X' }] }],
    };
    const days = planDataToWorkoutDays(data, 1);
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Legacy');
  });

  it('returns [] for empty planData', () => {
    expect(planDataToWorkoutDays({}, 1)).toEqual([]);
    expect(planDataToWorkoutDays(null, 1)).toEqual([]);
  });
});

describe('toCurrentWorkoutPlanResponse — embeds currentSession (C4)', () => {
  it('includes currentSession in the response object', () => {
    const formatted = toCurrentWorkoutPlanResponse(samplePlanWithWeeks);
    expect(formatted.currentSession).not.toBeNull();
    expect(formatted.currentSession.exercises).toHaveLength(2);
  });

  it('returns currentSession=null when plan has no extractable session', () => {
    const formatted = toCurrentWorkoutPlanResponse({
      id: 'p',
      currentWeek: 1,
      currentDay: 99,
      planData: { weeks: [] },
    });
    expect(formatted.currentSession).toBeNull();
  });

  it('preserves backward-compat fields (id, title, days, planData)', () => {
    const formatted = toCurrentWorkoutPlanResponse(samplePlanWithWeeks);
    expect(formatted.id).toBe('plan-A');
    expect(formatted.title).toBe('Phase 1 Plan');
    expect(Array.isArray(formatted.days)).toBe(true);
    expect(formatted.planData).toBeDefined();
  });
});
