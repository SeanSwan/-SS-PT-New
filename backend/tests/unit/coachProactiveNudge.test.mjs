/**
 * G10 — proactive nudge engine tests (T38/T39).
 *
 * T38: opting out while a weekly briefing is queued delivers NOTHING; consent
 * is rechecked at the delivery instant, not just at queue time.
 * T39: DST-aware local quiet hours (20:00–08:00), duplicate same-day
 * triggers, snooze, weekly dedupe, and the one-per-day cap.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  DELIVERY_DECISIONS,
  deliverNudge,
  planNudgeDelivery,
} from '../../services/ai/coachProactiveNudge.mjs';

describe('G10/T38 — opt-out during a queued briefing', () => {
  it('delivers nothing when the owner opted out between queueing and delivery', async () => {
    const plan = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), // 18:00 in UTC+1 — outside quiet hours
      timezoneOffsetMinutes: 60,
      consented: true,
      category: 'weekly_briefing',
    });
    expect(plan.decision).toBe(DELIVERY_DECISIONS.DUE);

    const writer = vi.fn(async () => ({ notificationId: 1 }));
    const out = await deliverNudge({
      plan,
      nudge: { kind: 'weekly_briefing' },
      writer,
      // Opt-out happened AFTER queueing: the delivery-time recheck sees it.
      recheck: { consented: false, accessValid: true, evidenceFresh: true },
    });

    expect(out.delivered).toBe(false);
    expect(out.reason).toBe('consent_recheck_failed');
    expect(writer).not.toHaveBeenCalled();
  });

  it('delivers exactly once when every delivery-time recheck passes', async () => {
    const plan = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'),
      timezoneOffsetMinutes: 60,
      consented: true,
      category: 'weekly_briefing',
    });
    const writer = vi.fn(async () => ({ notificationId: 2 }));
    const out = await deliverNudge({
      plan,
      nudge: { kind: 'weekly_briefing' },
      writer,
      recheck: { consented: true, accessValid: true, evidenceFresh: true },
    });
    expect(out.delivered).toBe(true);
    expect(writer).toHaveBeenCalledTimes(1);
  });

  it('blocks delivery when access or freshness rechecks fail', async () => {
    const plan = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'),
      timezoneOffsetMinutes: 60,
      consented: true,
    });
    const noAccess = await deliverNudge({ plan, writer: vi.fn(), recheck: { consented: true, accessValid: false, evidenceFresh: true } });
    const stale = await deliverNudge({ plan, writer: vi.fn(), recheck: { consented: true, accessValid: true, evidenceFresh: false } });
    expect(noAccess.reason).toBe('access_recheck_failed');
    expect(stale.reason).toBe('freshness_recheck_failed');
  });
});

describe('G10/T39 — DST quiet hours, duplicates, snooze, caps, dedupe', () => {
  it('applies quiet hours in LOCAL time across DST offsets', () => {
    // Summer UTC+2: 19:00Z == 21:00 local -> quiet.
    expect(planNudgeDelivery({
      now: new Date('2026-07-15T19:00:00Z'), timezoneOffsetMinutes: 120, consented: true,
    }).decision).toBe(DELIVERY_DECISIONS.QUIET_HOURS);
    // Winter UTC+1: 19:00Z == 20:00 local -> quiet (boundary inclusive).
    expect(planNudgeDelivery({
      now: new Date('2026-01-15T19:00:00Z'), timezoneOffsetMinutes: 60, consented: true,
    }).decision).toBe(DELIVERY_DECISIONS.QUIET_HOURS);
    // Winter UTC+1: 18:59Z == 19:59 local -> allowed.
    expect(planNudgeDelivery({
      now: new Date('2026-01-15T18:59:00Z'), timezoneOffsetMinutes: 60, consented: true,
    }).decision).toBe(DELIVERY_DECISIONS.DUE);
    // 08:00 local is the end boundary -> allowed.
    expect(planNudgeDelivery({
      now: new Date('2026-07-15T06:00:00Z'), timezoneOffsetMinutes: 120, consented: true,
    }).decision).toBe(DELIVERY_DECISIONS.DUE);
  });

  it('caps at one nudge per local day even with duplicate triggers', () => {
    const lastDeliveredAt = new Date('2026-07-15T09:00:00Z');
    const secondTrigger = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), timezoneOffsetMinutes: 60,
      consented: true, lastDeliveredAt,
    });
    expect(secondTrigger.decision).toBe(DELIVERY_DECISIONS.DAILY_CAP);
    // Next local day is fine.
    const nextDay = planNudgeDelivery({
      now: new Date('2026-07-16T17:00:00Z'), timezoneOffsetMinutes: 60,
      consented: true, lastDeliveredAt,
    });
    expect(nextDay.decision).toBe(DELIVERY_DECISIONS.DUE);
  });

  it('honors snooze until it expires', () => {
    const snoozed = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), timezoneOffsetMinutes: 60, consented: true,
      snoozedUntil: new Date('2026-07-16T00:00:00Z'),
    });
    expect(snoozed.decision).toBe(DELIVERY_DECISIONS.SNOOZED);

    const expired = planNudgeDelivery({
      now: new Date('2026-07-16T17:00:00Z'), timezoneOffsetMinutes: 60, consented: true,
      snoozedUntil: new Date('2026-07-16T00:00:00Z'),
    });
    expect(expired.decision).toBe(DELIVERY_DECISIONS.DUE);
  });

  it('dedupes the same category within 7 clear days but allows day 8', () => {
    const lastCategoryAt = { weekly_briefing: new Date('2026-07-08T12:00:00Z') };
    expect(planNudgeDelivery({
      now: new Date('2026-07-14T12:00:00Z'), timezoneOffsetMinutes: 0, consented: true,
      category: 'weekly_briefing', lastCategoryAt,
    }).decision).toBe(DELIVERY_DECISIONS.WEEKLY_DEDUPE);
    expect(planNudgeDelivery({
      now: new Date('2026-07-15T12:00:00Z'), timezoneOffsetMinutes: 0, consented: true,
      category: 'weekly_briefing', lastCategoryAt,
    }).decision).toBe(DELIVERY_DECISIONS.DUE);
    // A different category is not deduped by this one's history.
    expect(planNudgeDelivery({
      now: new Date('2026-07-09T12:00:00Z'), timezoneOffsetMinutes: 0, consented: true,
      category: 'streak_celebration', lastCategoryAt,
    }).decision).toBe(DELIVERY_DECISIONS.DUE);
  });

  it('hostile round 2: every decision carries the candidate local hour for support', () => {
    const quiet = planNudgeDelivery({
      now: new Date('2026-07-15T19:00:00Z'), timezoneOffsetMinutes: 120, consented: true,
    });
    expect(quiet.localHourAtCandidate).toBe(21);
    const due = planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), timezoneOffsetMinutes: 60, consented: true,
    });
    expect(due.localHourAtCandidate).toBe(18);
  });

  it('never delivers without explicit opt-in and never against a master disable', () => {
    expect(planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), consented: false,
    }).decision).toBe(DELIVERY_DECISIONS.NOT_CONSENTED);
    expect(planNudgeDelivery({
      now: new Date('2026-07-15T17:00:00Z'), consented: true, enabled: false,
    }).decision).toBe(DELIVERY_DECISIONS.DISABLED);
  });
});
