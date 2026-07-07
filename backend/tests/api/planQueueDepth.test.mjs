/**
 * planQueueDepth.test.mjs — charter v3 P1 locks (Plan-Ahead OS core)
 * ====================================================================
 * Queue depth = how much programmed work remains ahead of the client's plan
 * cursor, expressed as estimated CALENDAR days (remaining training days ÷
 * cadence × 7). Locks: pure math across the modern weeks[].days[] shape,
 * cursor edges, rest-day exclusion, legacy single-week fallback, threshold
 * semantics (default 14, urgent < 7), and the coach-audience NBA rung +
 * route wiring.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { computePlanQueueDepth, PLAN_QUEUE_THRESHOLD_DAYS } from '../../services/planQueueService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

const day = (n, type = 'training') => ({ dayNumber: n, dayType: type, exercises: [{ name: 'X' }] });
const week = (weekNumber, days) => ({ weekNumber, days });

/** 4 weeks × 3 training days + 1 rest day per week. */
const planData = {
  weeks: [1, 2, 3, 4].map((w) =>
    week(w, [day(1), day(2), day(3), day(4, 'rest')])
  ),
};

describe('computePlanQueueDepth', () => {
  it('counts remaining training days from the cursor and estimates calendar days', () => {
    const result = computePlanQueueDepth(planData, { durationWeeks: 4, currentWeek: 1, currentDay: 1 });
    // 12 training days remain (cursor at the very start), cadence 3/wk → 28 cal days.
    expect(result.remainingTrainingDays).toBe(12);
    expect(result.trainingDaysPerWeek).toBe(3);
    expect(result.estimatedCalendarDaysLeft).toBe(28);
    expect(result.belowThreshold).toBe(false);
    expect(result.urgent).toBe(false);
  });

  it('excludes rest days and respects the mid-plan cursor', () => {
    const result = computePlanQueueDepth(planData, { durationWeeks: 4, currentWeek: 3, currentDay: 2 });
    // Week 3: days 2,3 remain (day 4 = rest); week 4: 3 training days → 5 total.
    expect(result.remainingTrainingDays).toBe(5);
    expect(result.estimatedCalendarDaysLeft).toBe(Math.round((5 / 3) * 7)); // 12
    expect(result.belowThreshold).toBe(true);
    expect(result.urgent).toBe(false);
  });

  it('flags urgent when under 7 estimated days', () => {
    const result = computePlanQueueDepth(planData, { durationWeeks: 4, currentWeek: 4, currentDay: 2 });
    // Only days 2,3 of the final week remain → ~5 calendar days.
    expect(result.remainingTrainingDays).toBe(2);
    expect(result.urgent).toBe(true);
    expect(result.belowThreshold).toBe(true);
  });

  it('handles the legacy single-week shape by projecting across durationWeeks', () => {
    const legacy = { days: [day(1), day(2), day(3)] };
    const result = computePlanQueueDepth(legacy, { durationWeeks: 4, currentWeek: 2, currentDay: 1 });
    // Weeks 2-4 × 3 days = 9 remaining, cadence 3 → 21 days.
    expect(result.remainingTrainingDays).toBe(9);
    expect(result.estimatedCalendarDaysLeft).toBe(21);
  });

  it('returns empty-honest for missing/exhausted plans', () => {
    expect(computePlanQueueDepth(null, { durationWeeks: 4, currentWeek: 1, currentDay: 1 }).remainingTrainingDays).toBe(0);
    const done = computePlanQueueDepth(planData, { durationWeeks: 4, currentWeek: 5, currentDay: 1 });
    expect(done.remainingTrainingDays).toBe(0);
    expect(done.estimatedCalendarDaysLeft).toBe(0);
    expect(done.belowThreshold).toBe(true);
    expect(done.urgent).toBe(true);
  });

  it('threshold default is the charter V3-A value', () => {
    expect(PLAN_QUEUE_THRESHOLD_DAYS).toBe(14);
  });
});

describe('wiring contracts', () => {
  it('NBA context fetches plan queue and the engine carries a coach-only plan_queue_low rung', () => {
    const context = read('../../services/nextBestActionContext.mjs');
    const engine = read('../../services/nextBestActionService.mjs');
    expect(context).toMatch(/planQueue/);
    expect(engine).toMatch(/plan_queue_low/);
    // Coach-only: the rung must be audience-gated.
    const rungBlock = engine.slice(engine.indexOf('plan_queue_low') - 400, engine.indexOf('plan_queue_low') + 400);
    expect(rungBlock).toMatch(/audience === 'coach'/);
  });

  it('the self-service endpoint is mounted on the client analytics router', () => {
    const routes = read('../../routes/clientAnalyticsRoutes.mjs');
    expect(routes).toMatch(/router\.get\('\/plan-queue'/);
  });
});
