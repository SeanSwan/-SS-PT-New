/**
 * G10 wiring slice — consent, master disable and the T38 delivery-time
 * recheck, exercised through the real cron-pattern tick that plan 44 named
 * (`services/coachProactiveNudgeCron.mjs`), which mounts the already-reviewed
 * engine (`services/ai/coachProactiveNudge.mjs`) — plan 44 put that engine's
 * cron registration out of scope for itself and left it to this slice.
 *
 * This file locks the DELIVERY path only: explicit opt-in (default OFF), the
 * master disable, and the property that a nudge whose owner opted out (or
 * whose evidence/access changed) between plan time and delivery time produces
 * ZERO delivered cards and ZERO ledger claims. The writer is injected, so the
 * suite observes exactly how many cards the service would have written.
 * Schedule caps, quiet hours, snooze and restart live in the sibling file.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({ getUser: vi.fn(), getWorkoutSession: vi.fn() }));
vi.mock('../../controllers/notificationController.mjs', () => ({ createNotification: vi.fn() }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const {
  runCoachProactiveNudgeTick,
  isCoachProactiveNudgeEnabled,
  hasCoachProactiveNudgeConsent,
  coachNudgeType,
  NUDGE_CATEGORY,
  COACH_NUDGE_LINK,
  NOTIFICATION_TYPE,
} = await import('../../services/coachProactiveNudgeCron.mjs');

const ENABLED = { ENABLE_COACH_PROACTIVE_NUDGES: 'true' };
// 17:00Z = 10:00 America/Los_Angeles — outside 20:00-08:00 local quiet hours.
const NOW = new Date('2026-07-15T17:00:00Z');

const optedInClient = (id = 1, extra = {}) => ({
  id,
  role: 'client',
  isActive: true,
  timeZone: 'America/Los_Angeles',
  notificationPreferences: { coachProactiveNudges: true },
  ...extra,
});

/**
 * Durable `nudge_dispatches` stand-in. It is deliberately NOT module state:
 * rows outlive ticks and module resets, which is what makes the later restart
 * assertions meaningful. The INSERT branch mirrors the real atomic
 * `ON CONFLICT (userId, nudgeType, localDate) DO NOTHING ... RETURNING id`.
 */
const makeLedger = (seed = [], claimInstant = () => NOW) => {
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

/**
 * Per-client read sequencing: call 1 is the plan-time evidence probe, call 2
 * is the delivery-time freshness recheck — the same two reads the service
 * makes, so a test can move the world in between.
 */
const harness = ({
  clients,
  evidence = {},
  evidenceAtDelivery,
  consentAtDelivery,
  accessAtDelivery = {},
  claimAt = () => NOW,
  notifyImpl,
} = {}) => {
  const notify = vi.fn(notifyImpl ?? (async () => ({ success: true })));
  const evidenceCalls = new Map();
  const User = {
    findAll: vi.fn().mockResolvedValue(clients),
    findByPk: vi.fn(async (id) => {
      const base = clients.find((c) => c.id === id);
      if (!base) return null;
      const next = { ...base, ...(accessAtDelivery[id] ?? {}) };
      if (consentAtDelivery && id in consentAtDelivery) next.notificationPreferences = consentAtDelivery[id];
      return next;
    }),
  };
  const WorkoutSession = {
    findOne: vi.fn(async ({ where }) => {
      const seen = (evidenceCalls.get(where.userId) ?? 0) + 1;
      evidenceCalls.set(where.userId, seen);
      const source = seen === 1 ? evidence : (evidenceAtDelivery ?? evidence);
      return source[where.userId] ? { id: `session-${where.userId}` } : null;
    }),
  };
  const ledger = makeLedger([], claimAt);
  return {
    notify,
    ledger,
    deps: { User, WorkoutSession, sequelize: ledger.sequelize, notify, env: ENABLED, now: NOW },
  };
};

describe('G10 wiring — master disable and explicit opt-in', () => {
  it('is OFF unless the kill switch is the literal string "true"', () => {
    expect(isCoachProactiveNudgeEnabled({})).toBe(false);
    expect(isCoachProactiveNudgeEnabled({ ENABLE_COACH_PROACTIVE_NUDGES: 'TRUE' })).toBe(false);
    expect(isCoachProactiveNudgeEnabled({ ENABLE_COACH_PROACTIVE_NUDGES: true })).toBe(false);
    expect(isCoachProactiveNudgeEnabled(ENABLED)).toBe(true);
  });

  it('requires an explicit boolean opt-in and never opts anyone in by default', () => {
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: null })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: {} })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: '{"coachProactiveNudges":false}' })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: { coachProactiveNudges: 'true' } })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: { coachProactiveNudges: 1 } })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: 'not-json' })).toBe(false);
    expect(hasCoachProactiveNudgeConsent({ notificationPreferences: { coachProactiveNudges: true } })).toBe(true);
  });

  it('delivers nothing while the master disable is in force, even for an opted-in client', async () => {
    const { notify, ledger, deps } = harness({ clients: [optedInClient()], evidence: { 1: true } });
    const out = await runCoachProactiveNudgeTick({ ...deps, env: {} });
    expect(out.nudged).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    expect(ledger.rows).toHaveLength(0);
  });

  it('delivers nothing to a client who never opted in — and does not even read the ledger for them', async () => {
    const clients = [
      optedInClient(1, { notificationPreferences: null }),
      optedInClient(2, { notificationPreferences: {} }),
      optedInClient(3, { notificationPreferences: { coachProactiveNudges: 'true' } }),
    ];
    const { notify, ledger, deps } = harness({ clients, evidence: { 1: true, 2: true, 3: true } });
    const out = await runCoachProactiveNudgeTick(deps);
    expect(out.nudged).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    // Opt-in is checked BEFORE any delivery-side work, not only at the recheck.
    expect(ledger.sequelize.query).not.toHaveBeenCalled();
  });
});

describe('G10/T38 — the delivery-time recheck, not the queue-time check, decides', () => {
  it('delivers nothing when the owner opts out between plan time and delivery time', async () => {
    const { notify, ledger, deps } = harness({
      clients: [optedInClient()],
      evidence: { 1: true },
      consentAtDelivery: { 1: { coachProactiveNudges: false } },
    });
    const out = await runCoachProactiveNudgeTick(deps);
    expect(out.nudged).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    expect(ledger.rows).toHaveLength(0);
  });

  it('delivers nothing when the evidence goes stale before the delivery instant', async () => {
    const { notify, ledger, deps } = harness({
      clients: [optedInClient()],
      evidence: { 1: true },
      evidenceAtDelivery: {},
    });
    const out = await runCoachProactiveNudgeTick(deps);
    expect(out.nudged).toBe(0);
    expect(notify).not.toHaveBeenCalled();
    expect(ledger.rows).toHaveLength(0);
  });

  it('delivers nothing when the target has lost access before the delivery instant', async () => {
    const deactivated = harness({
      clients: [optedInClient()],
      evidence: { 1: true },
      accessAtDelivery: { 1: { isActive: false } },
    });
    const reassigned = harness({
      clients: [optedInClient()],
      evidence: { 1: true },
      accessAtDelivery: { 1: { role: 'trainer' } },
    });
    expect((await runCoachProactiveNudgeTick(deactivated.deps)).nudged).toBe(0);
    expect((await runCoachProactiveNudgeTick(reassigned.deps)).nudged).toBe(0);
    expect(deactivated.notify).not.toHaveBeenCalled();
    expect(reassigned.notify).not.toHaveBeenCalled();
    expect(deactivated.ledger.rows).toHaveLength(0);
    expect(reassigned.ledger.rows).toHaveLength(0);
  });
});

describe('G10 wiring — the successful in-app delivery path', () => {
  it('writes exactly one in-app card for an opted-in client whose recheck passes', async () => {
    const { notify, ledger, deps } = harness({ clients: [optedInClient()], evidence: { 1: true } });
    const out = await runCoachProactiveNudgeTick(deps);

    expect(out.nudged).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      type: NOTIFICATION_TYPE,
      link: COACH_NUDGE_LINK,
    }));
    const insert = ledger.sequelize.query.mock.calls.find(([sql]) => /^INSERT INTO nudge_dispatches/.test(sql.trim()));
    expect(insert[1].bind).toEqual([1, coachNudgeType(NUDGE_CATEGORY), '2026-07-15']);
  });

  it('never throws when the injected writer fails, and the sweep survives it', async () => {
    const notifyImpl = vi.fn(async ({ userId }) => {
      if (userId === 1) throw new Error('notification backend down');
      return { success: true };
    });
    const { deps } = harness({
      clients: [optedInClient(1), optedInClient(2)],
      evidence: { 1: true, 2: true },
      notifyImpl,
    });
    await expect(runCoachProactiveNudgeTick(deps)).resolves.toMatchObject({ nudged: 1 });
    expect(notifyImpl).toHaveBeenCalledTimes(2);
  });
});
