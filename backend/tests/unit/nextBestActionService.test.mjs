/**
 * nextBestActionService — Slice 8.2 Progress Intelligence tests
 * =============================================================
 * Locks every rung of the priority ladder, the injectable clock, the
 * care-first copy constraints (no forbidden wellness terms, no guilt
 * language), and the embedded-in-pulse controller contract.
 */
import { describe, it, expect, vi } from 'vitest';

import {
  computeNextBestAction,
  daysLeftInIsoWeek,
  getNextBestAction,
} from '../../services/nextBestActionService.mjs';
import { getProgressPulseHandler } from '../../controllers/progressPulseController.mjs';

const basePulse = (over = {}) => ({
  streak: { weeklyCurrent: 2, weeklyLongest: 3, weekTarget: 2, daysThisWeek: 2, currentWeekPending: false, ...over.streak },
  pushPull: { pushVolume: 1000, pullVolume: 1000, ratio: 1, label: 'balanced', ...over.pushPull },
  variety: { score: 70, distinctExercises: 8, patternsCovered: 4, patternsTotal: 6, ...over.variety },
  volume: { thisWeek: 5000, priorWeek: 5000, deltaPct: 0, ...over.volume },
  lastWorkout: { date: '2026-07-01', daysAgo: 1, ...over.lastWorkout },
});

const FRIDAY = new Date('2026-07-03T12:00:00Z');
const MONDAY = new Date('2026-06-29T12:00:00Z');

describe('daysLeftInIsoWeek', () => {
  it('counts inclusive days to Sunday', () => {
    expect(daysLeftInIsoWeek(MONDAY)).toBe(7);
    expect(daysLeftInIsoWeek(FRIDAY)).toBe(3);
    expect(daysLeftInIsoWeek(new Date('2026-07-05T12:00:00Z'))).toBe(1); // Sunday
  });
});

describe('computeNextBestAction — priority ladder', () => {
  it('no history → log_first_workout is primary', () => {
    const pulse = basePulse({ lastWorkout: { date: null, daysAgo: null } });
    const { primary } = computeNextBestAction(pulse, { now: FRIDAY });
    expect(primary.code).toBe('log_first_workout');
    expect(primary.cta.href).toBe('/dashboard/client/workouts');
  });

  it('7+ day gap outranks balance and variety', () => {
    const pulse = basePulse({
      lastWorkout: { date: '2026-06-20', daysAgo: 12 },
      pushPull: { ratio: 1.6, label: 'push_heavy' },
    });
    const { primary, secondary } = computeNextBestAction(pulse, { now: FRIDAY });
    expect(primary.code).toBe('return_after_gap');
    expect(secondary.map((s) => s.code)).toContain('balance_pull');
  });

  it('streak_at_risk fires only late in an under-target week with recent training', () => {
    const risk = basePulse({
      streak: { weeklyCurrent: 3, daysThisWeek: 1, currentWeekPending: true },
    });
    expect(computeNextBestAction(risk, { now: FRIDAY }).primary.code).toBe('streak_at_risk');
    // Early in the week → not urgent yet
    expect(computeNextBestAction(risk, { now: MONDAY }).primary.code).not.toBe('streak_at_risk');
  });

  it('push_heavy → balance_pull; pull_heavy → balance_push', () => {
    const push = basePulse({ pushPull: { ratio: 1.6, label: 'push_heavy' } });
    expect(computeNextBestAction(push, { now: MONDAY }).primary.code).toBe('balance_pull');
    const pull = basePulse({ pushPull: { ratio: 0.6, label: 'pull_heavy' } });
    expect(computeNextBestAction(pull, { now: MONDAY }).primary.code).toBe('balance_push');
  });

  it('low variety fires below balance, above default', () => {
    const pulse = basePulse({ variety: { score: 25, patternsCovered: 2 } });
    expect(computeNextBestAction(pulse, { now: MONDAY }).primary.code).toBe('add_variety');
  });

  it('null variety score (no data) never fires add_variety', () => {
    const pulse = basePulse({ variety: { score: null, patternsCovered: 0, distinctExercises: 0 } });
    const codes = [computeNextBestAction(pulse, { now: MONDAY }).primary.code];
    expect(codes).not.toContain('add_variety');
  });

  it('volume_drop is framed neutrally (recovery-week aware)', () => {
    const pulse = basePulse({ volume: { thisWeek: 2000, priorWeek: 5000, deltaPct: -60 } });
    const { primary } = computeNextBestAction(pulse, { now: MONDAY });
    expect(primary.code).toBe('volume_drop');
    expect(primary.message).toContain('planned recovery week');
  });

  it('4+ week streak with nothing urgent → celebrate_streak', () => {
    const pulse = basePulse({ streak: { weeklyCurrent: 5, daysThisWeek: 2, currentWeekPending: false } });
    const { primary } = computeNextBestAction(pulse, { now: MONDAY });
    expect(primary.code).toBe('celebrate_streak');
    expect(primary.title).toContain('5 weeks');
  });

  it('healthy default → keep_momentum, always with a CTA', () => {
    const { primary, secondary } = computeNextBestAction(basePulse(), { now: MONDAY });
    expect(primary.code).toBe('keep_momentum');
    expect(primary.cta.href).toBeTruthy();
    expect(secondary.length).toBeLessThanOrEqual(2);
  });

  it('care-first copy: no forbidden wellness terms, no guilt language, in ANY rule output', () => {
    const scenarios = [
      basePulse({ lastWorkout: { date: null, daysAgo: null } }),
      basePulse({ lastWorkout: { daysAgo: 20 } }),
      basePulse({ streak: { daysThisWeek: 0, currentWeekPending: true } }),
      basePulse({ pushPull: { ratio: 2, label: 'push_heavy' } }),
      basePulse({ variety: { score: 10, patternsCovered: 1 } }),
      basePulse({ volume: { thisWeek: 0, priorWeek: 9000, deltaPct: -100 } }),
      basePulse({ streak: { weeklyCurrent: 12 } }),
      basePulse(),
    ];
    for (const pulse of scenarios) {
      const { primary, secondary } = computeNextBestAction(pulse, { now: FRIDAY });
      const text = JSON.stringify([primary, ...secondary]).toLowerCase();
      for (const banned of ['yoga', 'meditat', 'zen', 'lazy', 'failure', 'excuse', 'shame', 'guilt']) {
        expect(text).not.toContain(banned);
      }
    }
  });
});

describe('getNextBestAction (DB-backed) + controller embedding', () => {
  const emptySequelize = () => ({ query: vi.fn(async () => [[]]) });

  it('composes decision + pulse from live queries', async () => {
    const result = await getNextBestAction(emptySequelize(), 42, { now: FRIDAY });
    expect(result.primary.code).toBe('log_first_workout');
    expect(result.pulse.streak).toBeDefined();
  });

  it('progress-pulse response embeds nextBestAction (single round trip)', async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    await getProgressPulseHandler(
      { params: { userId: '42' }, app: { get: () => emptySequelize() } },
      res,
    );
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.nextBestAction.primary.code).toBe('log_first_workout');
    expect(body.data.nextBestAction.secondary.length).toBeLessThanOrEqual(2);
  });
});
