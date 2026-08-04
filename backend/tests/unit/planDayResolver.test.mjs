/**
 * planDayResolver — S0 golden laws (Plan Surfacing Batch A).
 * ==========================================================
 * ONE date-truth: "what is my NEXT workout?" is a CURSOR question
 * (resolveNextDay ≡ extractCurrentSession — parity locked here so the
 * resolver can never drift from the shipped cursor reader), and "what
 * workout belongs to date D?" is a CALENDAR question answered by the SAME
 * basis chain the live projection layer uses (explicit day date →
 * plan-start offset → cursor offset). The logger's weekday-name matcher
 * (getPlanDayForDate) is DELETED in this slice — weekday matching cannot
 * distinguish W2·Tue from W5·Tue and is unsound, not merely different.
 */
import { describe, expect, it } from 'vitest';
import {
  RESOLVER_VERSION,
  resolveNextDay,
  resolveDayForDate,
} from '../../services/planDayResolver.mjs';
import { extractCurrentSession } from '../../services/workoutPlanShapeService.mjs';

const exercises = (names) => names.map((exerciseName, i) => ({
  exerciseId: `x${i}`, exerciseName, sets: 3, reps: 10,
}));

/** Canonical planner shape: weeks[] → days[] → exercises[]. */
const weekPlan = (overrides = {}) => ({
  id: 'plan-1',
  userId: 7,
  currentWeek: 2,
  currentDay: 2,
  contentRevision: 4,
  durationWeeks: 3,
  planData: {
    weeks: [1, 2, 3].map((weekNumber) => ({
      weekNumber,
      focus: `Week ${weekNumber} focus`,
      days: [1, 2, 3].map((dayNumber) => ({
        dayNumber,
        name: `W${weekNumber}D${dayNumber}`,
        exercises: exercises([`Bench W${weekNumber}D${dayNumber}`, `Row W${weekNumber}D${dayNumber}`]),
      })),
    })),
  },
  ...overrides,
});

describe('resolveNextDay — the cursor question', () => {
  it('answers from the cursor and carries basis + version', () => {
    const result = resolveNextDay(weekPlan());
    expect(result.basis).toBe('cursor');
    expect(result.resolverVersion).toBe(RESOLVER_VERSION);
    expect(result.weekNumber).toBe(2);
    expect(result.dayNumber).toBe(2);
    expect(result.exercises.map((e) => e.exerciseName)).toContain('Bench W2D2');
  });

  it('PARITY LAW: never disagrees with the shipped cursor reader', () => {
    for (const plan of [
      weekPlan(),
      weekPlan({ currentWeek: 1, currentDay: 3 }),
      // top-level legacy days[]
      { currentWeek: 1, currentDay: 2, planData: { days: [{ dayNumber: 1, exercises: exercises(['A']) }, { dayNumber: 2, exercises: exercises(['B']) }] } },
      // legacy weeklySchedule with exercises
      { currentWeek: 1, currentDay: 1, planData: { weeklySchedule: [{ dayNumber: 1, exercises: exercises(['C']) }] } },
      // no plan data at all
      { currentWeek: 1, currentDay: 1, planData: { weeks: [] } },
    ]) {
      const viaResolver = resolveNextDay(plan);
      const viaShipped = extractCurrentSession(plan);
      if (viaShipped === null) {
        expect(viaResolver.basis).toBe('none');
      } else {
        expect(viaResolver.session).toEqual(viaShipped.session);
        expect(viaResolver.exercises).toEqual(viaShipped.exercises);
      }
    }
  });

  it('empty plan resolves to basis none — never a guess', () => {
    const result = resolveNextDay({ planData: { weeks: [] } });
    expect(result.basis).toBe('none');
    expect(result.session).toBeNull();
  });
});

describe('resolveDayForDate — the calendar question (projection basis chain)', () => {
  it('explicit day date wins (basis: explicit)', () => {
    const plan = weekPlan();
    plan.planData.weeks[0].days[0].scheduledDate = '2026-08-04';
    const result = resolveDayForDate(plan, '2026-08-04');
    expect(result.basis).toBe('explicit');
    expect(result.weekNumber).toBe(1);
    expect(result.dayNumber).toBe(1);
  });

  it('plan startDate anchors the grid (basis: plan_start)', () => {
    // startDate Mon 2026-08-03 → W2 D2 = start + 7 + 1 = 2026-08-11
    const result = resolveDayForDate(weekPlan({ startDate: '2026-08-03' }), '2026-08-11');
    expect(result.basis).toBe('plan_start');
    expect(result.weekNumber).toBe(2);
    expect(result.dayNumber).toBe(2);
  });

  it('cursor offset is the last resort and needs a local date (basis: current_cursor)', () => {
    // cursor W2D2 projected onto localDate 2026-08-10 → W2D3 lands on the 11th
    const result = resolveDayForDate(weekPlan(), '2026-08-11', { localDate: '2026-08-10' });
    expect(result.basis).toBe('current_cursor');
    expect(result.weekNumber).toBe(2);
    expect(result.dayNumber).toBe(3);
  });

  it('a date outside the plan resolves to none — never a weekday guess', () => {
    const result = resolveDayForDate(weekPlan({ startDate: '2026-08-03' }), '2027-01-01');
    expect(result.basis).toBe('none');
    expect(result.day).toBeNull();
  });

  it('garbage input resolves to none, never throws', () => {
    expect(resolveDayForDate(null, 'not-a-date').basis).toBe('none');
    expect(resolveDayForDate(weekPlan(), undefined).basis).toBe('none');
  });
});
