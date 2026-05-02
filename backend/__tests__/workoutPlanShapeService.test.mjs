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

// ─────────────────────────────────────────────────────────────
// L1 REV 2 (2026-05-02) — Codex post-implementation review fixes.
//
//   1. extractCurrentSession must accept top-level planData.days[] and
//      planData.sessions[] for legacy single-week plans, so that the
//      cursor extractor and planDataToWorkoutDays agree on which shapes
//      are renderable. (Codex HIGH 2026-05-02.)
//
//   2. Empty arrays are truthy in JS — `week.sessions || week.days` would
//      pick a populated `days[]` only if `sessions` was undefined, not
//      when `sessions: []`. Both helpers must skip empty arrays and fall
//      through to populated siblings. (Codex MEDIUM 2026-05-02.)
// ─────────────────────────────────────────────────────────────

describe('extractCurrentSession — top-level days/sessions fallback (Codex HIGH 2026-05-02)', () => {
  it('extracts the current session from planData.days[] when no weeks[] is present', () => {
    const planTopLevelDays = {
      id: 'top-level-plan',
      currentWeek: 1,
      currentDay: 2,
      durationWeeks: 1,
      planData: {
        days: [
          { dayNumber: 1, name: 'Day 1', exercises: [{ exerciseId: 'a', exerciseName: 'A', sets: 3, reps: '10' }] },
          { dayNumber: 2, name: 'Day 2', exercises: [{ exerciseId: 'b', exerciseName: 'B', sets: 3, reps: '10' }] },
        ],
      },
    };
    const result = extractCurrentSession(planTopLevelDays);
    expect(result).not.toBeNull();
    expect(result.dayLabel).toBe('Day 2');
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseId).toBe('b');
    // C1 lift still applies on this path
    expect(result.exercises).toBe(result.session.exercises);
  });

  it('extracts the current session from planData.sessions[] alias too', () => {
    const planTopLevelSessions = {
      id: 'top-level-sessions',
      currentWeek: 1,
      currentDay: 1,
      durationWeeks: 1,
      planData: {
        sessions: [
          { dayNumber: 1, name: 'Only Day', exercises: [{ exerciseId: 'z', exerciseName: 'Z', sets: 3, reps: '10' }] },
        ],
      },
    };
    const result = extractCurrentSession(planTopLevelSessions);
    expect(result).not.toBeNull();
    expect(result.dayLabel).toBe('Only Day');
    expect(result.exercises[0].exerciseId).toBe('z');
  });

  it('agrees with planDataToWorkoutDays — both render the same plan shape', () => {
    const planTopLevelDays = {
      id: 'agreement-plan',
      currentWeek: 1,
      currentDay: 1,
      durationWeeks: 1,
      planData: {
        days: [{ dayNumber: 1, exercises: [{ exerciseId: 'agree', exerciseName: 'Agree', sets: 1, reps: '1' }] }],
      },
    };
    const session = extractCurrentSession(planTopLevelDays);
    const days = planDataToWorkoutDays(planTopLevelDays.planData, 1);
    // Receipt §C2: the two helpers must agree on supported legacy shapes
    expect(days).toHaveLength(1);
    expect(session).not.toBeNull();
    expect(session.exercises).toHaveLength(1);
  });
});

describe('Empty-array-truthy guard (Codex MEDIUM 2026-05-02)', () => {
  it('extractCurrentSession falls back to week.days[] when week.sessions is []', () => {
    const planEmptySessions = {
      currentWeek: 1,
      currentDay: 1,
      planData: {
        weeks: [
          {
            sessions: [],
            days: [
              { dayNumber: 1, name: 'Real Day', exercises: [{ exerciseId: 'real', exerciseName: 'Real', sets: 3, reps: '10' }] },
            ],
          },
        ],
      },
    };
    const result = extractCurrentSession(planEmptySessions);
    expect(result).not.toBeNull();
    expect(result.dayLabel).toBe('Real Day');
    expect(result.exercises[0].exerciseId).toBe('real');
  });

  it('planDataToWorkoutDays falls back to weeklySchedule when data.days is []', () => {
    const data = {
      days: [],
      weeklySchedule: [
        { dayNumber: 1, name: 'WS Day', exercises: [{ exerciseId: 'ws', exerciseName: 'WS' }] },
      ],
    };
    const days = planDataToWorkoutDays(data, 1);
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('WS Day');
  });

  it('planDataToWorkoutDays falls back from currentWeekData.days=[] to currentWeekData.sessions[]', () => {
    const data = {
      weeks: [
        {
          days: [],
          sessions: [
            { dayNumber: 1, name: 'Sessions Day', exercises: [{ exerciseId: 'sess', exerciseName: 'Sess' }] },
          ],
        },
      ],
    };
    const days = planDataToWorkoutDays(data, 1);
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Sessions Day');
  });
});

// ─────────────────────────────────────────────────────────────
// L1 REV 2 round-2 (Codex 2026-05-02 round-2 finding)
//
// extractCurrentSession() and planDataToWorkoutDays() must agree on
// which entry array wins when a week carries BOTH populated days[] and
// sessions[]. planDataToWorkoutDays + LongHorizonScheduleView already
// pick days[] first; the cursor extractor used to pick sessions[] first,
// which would render days[0] in the schedule but currentSession from
// sessions[0] - same week/day, two different "today's workout".
// ─────────────────────────────────────────────────────────────

describe('extractCurrentSession + planDataToWorkoutDays - precedence agreement', () => {
  it('both helpers pick the same entry when a week has populated days[] AND sessions[]', () => {
    const plan = {
      currentWeek: 1,
      currentDay: 1,
      planData: {
        weeks: [{
          days: [{ dayNumber: 1, name: 'DAYS_DAY', exercises: [{ exerciseId: 'day-ex', exerciseName: 'Day Ex' }] }],
          sessions: [{ dayNumber: 1, name: 'SESSIONS_DAY', exercises: [{ exerciseId: 'session-ex', exerciseName: 'Session Ex' }] }],
        }],
      },
    };

    const cursor = extractCurrentSession(plan);
    const flattened = planDataToWorkoutDays(plan.planData, 1);

    expect(cursor).not.toBeNull();
    expect(flattened).toHaveLength(1);
    // Both helpers must converge on the SAME entry (days[] wins).
    expect(cursor.dayLabel).toBe('DAYS_DAY');
    expect(flattened[0].name).toBe('DAYS_DAY');
    expect(cursor.exercises[0].exerciseId).toBe('day-ex');
  });
});
