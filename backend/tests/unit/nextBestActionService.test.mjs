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

describe('coach audience (Slice 8.5)', () => {
  it('keeps the ranking but swaps to third-person coach voice with no CTA', () => {
    const pulse = basePulse({ pushPull: { ratio: 1.6, label: 'push_heavy' } });
    const trainee = computeNextBestAction(pulse, { now: MONDAY });
    const coach = computeNextBestAction(pulse, { now: MONDAY, audience: 'coach' });
    expect(coach.primary.code).toBe(trainee.primary.code); // same ladder
    expect(coach.primary.title).toContain('Push-heavy month');
    expect(coach.primary.cta).toBeNull();
    for (const a of [coach.primary, ...coach.secondary]) {
      expect(a.cta).toBeNull();
      expect(`${a.title} ${a.message}`).not.toMatch(/\byour?\b/i); // no second person
    }
  });

  it('covers every rung with coach copy (no fallthrough to trainee voice)', () => {
    const scenarios = [
      ['log_first_workout', basePulse({ lastWorkout: { date: null, daysAgo: null } })],
      ['return_after_gap', basePulse({ lastWorkout: { daysAgo: 15 } })],
      ['streak_at_risk', basePulse({ streak: { weeklyCurrent: 3, daysThisWeek: 1, currentWeekPending: true } })],
      ['balance_push', basePulse({ pushPull: { ratio: 0.5, label: 'pull_heavy' } })],
      ['add_variety', basePulse({ variety: { score: 20, patternsCovered: 2 } })],
      ['volume_drop', basePulse({ volume: { thisWeek: 1000, priorWeek: 5000, deltaPct: -80 } })],
      ['celebrate_streak', basePulse({ streak: { weeklyCurrent: 6, daysThisWeek: 2, currentWeekPending: false } })],
      ['keep_momentum', basePulse()],
    ];
    for (const [expectedCode, pulse] of scenarios) {
      const { primary } = computeNextBestAction(pulse, { now: FRIDAY, audience: 'coach' });
      expect(primary.code).toBe(expectedCode);
      expect(primary.message.length).toBeGreaterThan(10);
      expect(primary.message).not.toMatch(/\byour?\b/i);
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

describe('Phase 1.5a — coach-guided context rungs', () => {
  const ctx = (over = {}) => ({
    plan: null, pain: null, nextSession: null, credits: null,
    hasTrainer: false, recentDays: [], ...over,
  });
  const planToday = {
    isLoggable: true, dayLabel: 'Lower Body Strength', title: 'Week 4 Day 2',
    exerciseCount: 5, firstExerciseName: 'Goblet Squat',
  };

  it('rest_day fires on 3 consecutive trained days incl. today and outranks streak_at_risk', () => {
    const pulse = basePulse({
      streak: { currentWeekPending: true, daysThisWeek: 1, weekTarget: 3, weeklyCurrent: 2 },
      lastWorkout: { date: '2026-07-03', daysAgo: 0 },
    });
    const recentDays = ['2026-07-03', '2026-07-02', '2026-07-01'];
    const { primary } = computeNextBestAction(pulse, { now: FRIDAY }, ctx({ recentDays }));
    expect(primary.code).toBe('rest_day');
    expect(primary.cta).toBeNull();
  });

  it('rest_day fires on severe active pain (>=7) with comfort framing', () => {
    const pulse = basePulse();
    const { primary, constraints } = computeNextBestAction(pulse, { now: FRIDAY }, ctx({
      pain: { activeCount: 2, maxLevel: 8, regions: ['lower_back', 'left_knee'] },
    }));
    expect(primary.code).toBe('rest_day');
    expect(constraints).not.toBeNull();
    expect(constraints.regions).toEqual(['lower_back', 'left_knee']);
    expect(constraints.note).toMatch(/comfortable ranges/i);
  });

  it('rest_day does NOT fire from consecutive days when today is untrained', () => {
    const pulse = basePulse();
    const recentDays = ['2026-07-02', '2026-07-01', '2026-06-30'];
    const { primary } = computeNextBestAction(pulse, { now: FRIDAY }, ctx({ recentDays }));
    expect(primary.code).not.toBe('rest_day');
  });

  it('plan_next wins over adaptive balance/variety/volume rungs (coach-guided default)', () => {
    const pulse = basePulse({
      pushPull: { label: 'push_heavy', ratio: 3 },
      variety: { score: 20, patternsCovered: 2 },
      lastWorkout: { date: '2026-07-02', daysAgo: 1 },
    });
    const { primary, secondary } = computeNextBestAction(pulse, { now: FRIDAY }, ctx({ plan: planToday }));
    expect(primary.code).toBe('plan_next');
    expect(primary.title).toContain('Lower Body Strength');
    expect(primary.message).toContain('Goblet Squat + 4 more');
    expect(secondary.map((a) => a.code)).toContain('balance_pull');
  });

  it('plan_next loses to return_after_gap and rest_day', () => {
    const gapPulse = basePulse({ lastWorkout: { date: '2026-06-20', daysAgo: 13 } });
    const gap = computeNextBestAction(gapPulse, { now: FRIDAY }, ctx({ plan: planToday }));
    expect(gap.primary.code).toBe('return_after_gap');

    const restPulse = basePulse({ lastWorkout: { date: '2026-07-03', daysAgo: 0 } });
    const rest = computeNextBestAction(restPulse, { now: FRIDAY }, ctx({
      plan: planToday, recentDays: ['2026-07-03', '2026-07-02', '2026-07-01'],
    }));
    expect(rest.primary.code).toBe('rest_day');
  });

  it('plan_next is skipped when today is already trained', () => {
    const pulse = basePulse({ lastWorkout: { date: '2026-07-03', daysAgo: 0 } });
    const { primary } = computeNextBestAction(pulse, { now: FRIDAY }, ctx({ plan: planToday }));
    expect(primary.code).not.toBe('plan_next');
  });

  it('credit_nudge appears secondary-only for client role with low balance and a trainer', () => {
    const pulse = basePulse();
    const low = ctx({ credits: { availableSessions: 1 }, hasTrainer: true });
    const client = computeNextBestAction(pulse, { now: FRIDAY, role: 'client' }, low);
    expect(client.primary.code).not.toBe('credit_nudge');
    expect(client.secondary.map((a) => a.code)).toContain('credit_nudge');
    expect(client.secondary.length).toBeLessThanOrEqual(2);

    const user = computeNextBestAction(pulse, { now: FRIDAY, role: 'user' }, low);
    expect(user.secondary.map((a) => a.code)).not.toContain('credit_nudge');

    const noTrainer = computeNextBestAction(pulse, { now: FRIDAY, role: 'client' }, ctx({
      credits: { availableSessions: 1 }, hasTrainer: false,
    }));
    expect(noTrainer.secondary.map((a) => a.code)).not.toContain('credit_nudge');
  });

  it('never uses treatment or medical language in pain-derived copy', () => {
    const { primary, constraints } = computeNextBestAction(basePulse(), { now: FRIDAY }, ctx({
      pain: { activeCount: 1, maxLevel: 9, regions: ['right_shoulder'] },
    }));
    const text = `${primary.title} ${primary.message} ${constraints?.note ?? ''}`.toLowerCase();
    for (const banned of ['treat', 'therapy', 'diagnos', 'heal', 'rehab', 'medical advice', 'injury protocol']) {
      expect(text).not.toContain(banned);
    }
  });

  it('response stays additive: meta marks the rules engine and legacy keys survive', () => {
    const result = computeNextBestAction(basePulse(), { now: FRIDAY }, ctx());
    expect(result.meta).toEqual({ engine: 'rules', version: 2 });
    expect(result.primary).toBeDefined();
    expect(Array.isArray(result.secondary)).toBe(true);
    expect(result.constraints).toBeNull();

    const legacy = computeNextBestAction(basePulse(), { now: FRIDAY });
    expect(legacy.primary).toBeDefined();
    expect(legacy.meta).toEqual({ engine: 'rules', version: 2 });
  });

  it('coach audience keeps coach voice for the new rungs (no CTA)', () => {
    const pulse = basePulse({ lastWorkout: { date: '2026-07-02', daysAgo: 1 } });
    const { primary } = computeNextBestAction(pulse, { now: FRIDAY, audience: 'coach' }, ctx({ plan: planToday }));
    expect(primary.code).toBe('plan_next');
    expect(primary.title).toBe('Planned session due today');
    expect(primary.cta).toBeNull();
  });
});
