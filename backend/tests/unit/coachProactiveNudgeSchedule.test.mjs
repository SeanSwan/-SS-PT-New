/**
 * G10 wiring slice — local quiet hours (DST-safe), the one-per-local-day cap,
 * per-category weekly dedupe, snooze, restart durability and scheduler
 * registration for the cron-pattern tick in `services/coachProactiveNudgeCron.mjs`.
 *
 * The DST property is asserted by passing the SAME UTC wall clock on a summer
 * and a winter instant: the engine never guesses the offset, so the tick must
 * derive it from the client's zone AT the candidate instant. The restart
 * property is asserted by discarding all module state (vi.resetModules) while
 * keeping the durable ledger — caps and dedupe must still hold.
 */
import { Op } from 'sequelize';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({ getUser: vi.fn(), getWorkoutSession: vi.fn() }));
vi.mock('../../controllers/notificationController.mjs', () => ({ createNotification: vi.fn() }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const {
  runCoachProactiveNudgeTick,
  coachNudgeType,
  coachNudgeSnoozeUntil,
  timeZoneOffsetMinutesAt,
  startCoachProactiveNudgeScheduler,
  stopCoachProactiveNudgeScheduler,
  NUDGE_CATEGORY,
  EVIDENCE_WINDOW_DAYS,
} = await import('../../services/coachProactiveNudgeCron.mjs');

const ENABLED = { ENABLE_COACH_PROACTIVE_NUDGES: 'true' };
const DAY_MS = 24 * 60 * 60 * 1000;

const client = (id = 1, extra = {}) => ({
  id,
  role: 'client',
  isActive: true,
  timeZone: 'America/Los_Angeles',
  notificationPreferences: { coachProactiveNudges: true },
  ...extra,
});

const makeLedger = (seed = [], claimInstant = () => new Date()) => {
  const rows = seed.map((row) => ({ ...row }));
  const query = vi.fn(async (sql, { bind }) => {
    if (/^INSERT INTO nudge_dispatches/.test(sql.trim())) {
      const [userId, nudgeType, localDate] = bind;
      const clash = rows.some((r) => r.userId === userId && r.nudgeType === nudgeType && r.localDate === localDate);
      if (clash) return [];
      rows.push({ userId, nudgeType, localDate, createdAt: claimInstant() });
      return [{ id: rows.length }];
    }
    const mine = rows.filter((r) => r.userId === bind[0] && String(r.nudgeType).startsWith('coach_proactive:'));
    const lastByType = new Map();
    for (const row of mine) {
      const previous = lastByType.get(row.nudgeType);
      if (!previous || new Date(row.createdAt).getTime() > new Date(previous).getTime()) {
        lastByType.set(row.nudgeType, row.createdAt);
      }
    }
    return [...lastByType].map(([nudgeType, lastAt]) => ({ nudgeType, lastAt }));
  });
  return { rows, sequelize: { query } };
};

const NOW = new Date('2026-07-15T17:00:00Z'); // 10:00 America/Los_Angeles — outside quiet hours

const harness = ({ clients = [client()], evidence = { 1: true }, now = NOW, seed = [] } = {}) => {
  const notify = vi.fn(async () => ({ success: true }));
  const User = {
    findAll: vi.fn().mockResolvedValue(clients),
    findByPk: vi.fn(async (id) => clients.find((c) => c.id === id) ?? null),
  };
  const findOne = vi.fn(async ({ where }) => (evidence[where.userId] ? { id: `session-${where.userId}` } : null));
  const ledger = makeLedger(seed, () => now);
  return {
    notify,
    ledger,
    findOne,
    deps: { User, WorkoutSession: { findOne }, sequelize: ledger.sequelize, notify, env: ENABLED, now },
  };
};

const run = (options) => {
  const h = harness(options);
  return runCoachProactiveNudgeTick(h.deps).then((out) => ({ ...h, out }));
};

describe('G10 wiring — quiet hours are local and DST-safe', () => {
  it('derives the offset in effect AT the candidate instant, not a fixed one', () => {
    expect(timeZoneOffsetMinutesAt(new Date('2026-07-15T17:00:00Z'), 'America/Los_Angeles')).toBe(-420);
    expect(timeZoneOffsetMinutesAt(new Date('2026-01-15T17:00:00Z'), 'America/Los_Angeles')).toBe(-480);
    expect(timeZoneOffsetMinutesAt(new Date('2026-01-15T17:00:00Z'), 'Not/AZone')).toBe(timeZoneOffsetMinutesAt(new Date('2026-01-15T17:00:00Z'), 'America/Los_Angeles'));
  });

  it('treats the same UTC clock differently in summer and winter (20:00 vs 19:00 local)', async () => {
    const summer = await run({ now: new Date('2026-07-16T03:00:00Z') }); // 20:00 PDT -> quiet
    const winter = await run({ now: new Date('2026-01-16T03:00:00Z') }); // 19:00 PST -> allowed
    expect(summer.out.nudged).toBe(0);
    expect(summer.notify).not.toHaveBeenCalled();
    expect(winter.out.nudged).toBe(1);
  });

  it('allows the 08:00 local boundary and blocks the 20:00 local boundary', async () => {
    const open = await run({ now: new Date('2026-07-15T15:00:00Z') }); // 08:00 PDT
    const closed = await run({ now: new Date('2026-07-15T03:00:00Z') }); // 20:00 PDT (previous local day)
    expect(open.out.nudged).toBe(1);
    expect(closed.out.nudged).toBe(0);
  });

  it('reads completed sessions inside the freshness window for its evidence', async () => {
    const at = new Date('2026-07-15T17:00:00Z');
    const { findOne } = await run({ now: at });
    const { where } = findOne.mock.calls[0][0];
    expect(where.status).toBe('completed');
    expect(where.completedAt[Op.gte].toISOString())
      .toBe(new Date(at.getTime() - EVIDENCE_WINDOW_DAYS * DAY_MS).toISOString());
  });
});

describe('G10 wiring — caps and dedupe read from durable state', () => {
  it('caps at one nudge per local day even when the ledger row is another category', async () => {
    const sameDay = await run({
      now: new Date('2026-07-15T17:00:00Z'),
      seed: [{ userId: 1, nudgeType: coachNudgeType('streak_celebration'), localDate: '2026-07-15', createdAt: new Date('2026-07-15T15:00:00Z') }],
    });
    const older = await run({
      now: new Date('2026-07-15T17:00:00Z'),
      seed: [{ userId: 1, nudgeType: coachNudgeType('streak_celebration'), localDate: '2026-07-12', createdAt: new Date('2026-07-12T15:00:00Z') }],
    });
    expect(sameDay.out.nudged).toBe(0);
    expect(older.out.nudged).toBe(1);
  });

  it('dedupes the same category inside 7 clear days but allows day 8', async () => {
    const threeDays = await run({
      now: new Date('2026-07-15T17:00:00Z'),
      seed: [{ userId: 1, nudgeType: coachNudgeType(NUDGE_CATEGORY), localDate: '2026-07-12', createdAt: new Date('2026-07-12T17:00:00Z') }],
    });
    const eightDays = await run({
      now: new Date('2026-07-15T17:00:00Z'),
      seed: [{ userId: 1, nudgeType: coachNudgeType(NUDGE_CATEGORY), localDate: '2026-07-07', createdAt: new Date('2026-07-07T17:00:00Z') }],
    });
    expect(threeDays.out.nudged).toBe(0);
    expect(eightDays.out.nudged).toBe(1);
  });
});

describe('G10 wiring — snooze', () => {
  it('honours a future snooze, allows an expired one, and fails closed on garbage', async () => {
    const snoozed = await run({ clients: [client(1, { notificationPreferences: { coachProactiveNudges: true, coachNudgeSnoozedUntil: '2026-07-16T00:00:00Z' } })] });
    const expired = await run({ clients: [client(1, { notificationPreferences: { coachProactiveNudges: true, coachNudgeSnoozedUntil: '2026-07-14T00:00:00Z' } })] });
    const garbage = await run({ clients: [client(1, { notificationPreferences: { coachProactiveNudges: true, coachNudgeSnoozedUntil: 'not-a-timestamp' } })] });
    expect(snoozed.out.nudged).toBe(0);
    expect(expired.out.nudged).toBe(1);
    expect(garbage.out.nudged).toBe(0);
    expect(garbage.notify).not.toHaveBeenCalled();
    expect(coachNudgeSnoozeUntil({ notificationPreferences: { coachNudgeSnoozedUntil: 'not-a-timestamp' } })).toBe('not-a-timestamp');
    expect(coachNudgeSnoozeUntil({ notificationPreferences: {} })).toBeNull();
  });
});

describe('G10 wiring — restart behaviour', () => {
  it('still enforces the daily cap and weekly dedupe with fresh module state', async () => {
    const now = new Date('2026-07-15T17:00:00Z');
    const first = harness({ now });
    expect((await runCoachProactiveNudgeTick(first.deps)).nudged).toBe(1);
    expect(first.ledger.rows).toHaveLength(1);

    const staleTick = runCoachProactiveNudgeTick;
    vi.resetModules();
    const fresh = await import('../../services/coachProactiveNudgeCron.mjs');
    expect(fresh.runCoachProactiveNudgeTick).not.toBe(staleTick); // module state really is new

    // Same process, new module instance, same durable ledger, same local day.
    const afterRestart = await fresh.runCoachProactiveNudgeTick({ ...first.deps });
    expect(afterRestart.nudged).toBe(0);
    expect(first.notify).toHaveBeenCalledTimes(1);

    // A week later the per-category dedupe is what still blocks, on the same ledger.
    const nextDay = new Date(now.getTime() + DAY_MS);
    expect((await fresh.runCoachProactiveNudgeTick({ ...first.deps, now: nextDay })).nudged).toBe(0);
    const afterWindow = new Date(now.getTime() + 8 * DAY_MS);
    expect((await fresh.runCoachProactiveNudgeTick({ ...first.deps, now: afterWindow })).nudged).toBe(1);
  });
});

describe('G10 wiring — scheduler registration', () => {
  it('arms only when the master switch is on and releases both timers on stop', async () => {
    vi.useFakeTimers();
    try {
      delete process.env.ENABLE_COACH_PROACTIVE_NUDGES;
      expect(startCoachProactiveNudgeScheduler()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      process.env.ENABLE_COACH_PROACTIVE_NUDGES = 'true';
      expect(startCoachProactiveNudgeScheduler()).toBe(true);
      expect(startCoachProactiveNudgeScheduler()).toBe(true);
      expect(vi.getTimerCount()).toBe(2);
      stopCoachProactiveNudgeScheduler();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stopCoachProactiveNudgeScheduler();
      vi.useRealTimers();
      delete process.env.ENABLE_COACH_PROACTIVE_NUDGES;
    }
  });

  it('is mounted in the real service startup path, not merely exported', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('../../core/startup.mjs', import.meta.url), 'utf8');
    expect(source).toContain("await import('../services/coachProactiveNudgeCron.mjs')");
    expect(source).toContain('startCoachProactiveNudgeScheduler()');
  });
});
