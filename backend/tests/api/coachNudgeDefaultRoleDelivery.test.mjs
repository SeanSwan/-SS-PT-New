/**
 * The proactive-nudge audience vs the default self-registration role.
 *
 * Defect (hostile review, 2026-09-13, found by probe): the delivery path in
 * `services/coachProactiveNudgeCron.mjs` selected its audience with the literal
 * `role: 'client'` query (:205) and re-checked it with the literal
 * `user.role === 'client'` (:168). `'user'` is the DEFAULT role minted by public
 * self-registration (models/User.mjs:135) and is client-equivalent everywhere
 * else (utils/clientAccess.mjs:23). So the consent surface served a `'user'`
 * account correctly — it could opt in, and the consent predicate returned true —
 * while delivery silently skipped it:
 *
 *   two consented accounts, role 'client' and role 'user'
 *     -> consent predicate: true for BOTH
 *     -> tick result:       nudged 1
 *     -> notify targets:    [11]      (the 'client' account only)
 *
 * This suite reproduces exactly that probe. The `User.findAll` stand-in APPLIES
 * the role predicate the service asks for (rather than ignoring it), because the
 * audience filter IS the subject here. It throws on any role-filter shape it
 * does not understand, so a future change cannot silently turn this suite into a
 * filter-agnostic false green.
 *
 * Negative control: a consented TRAINER and ADMIN are in the same sweep and must
 * not be nudged, so "delete the audience filter" cannot pass.
 */
import { describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

vi.mock('../../models/index.mjs', () => ({ getUser: vi.fn(), getWorkoutSession: vi.fn() }));
vi.mock('../../controllers/notificationController.mjs', () => ({ createNotification: vi.fn() }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { runCoachProactiveNudgeTick } = await import('../../services/coachProactiveNudgeCron.mjs');

const ENABLED = { ENABLE_COACH_PROACTIVE_NUDGES: 'true' };
// 17:00Z = 10:00 America/Los_Angeles — outside 20:00-08:00 local quiet hours.
const NOW = new Date('2026-07-15T17:00:00Z');

const account = (id, role) => ({
  id,
  role,
  isActive: true,
  timeZone: 'America/Los_Angeles',
  notificationPreferences: { coachProactiveNudges: true },
});

/**
 * Mirrors the real Sequelize predicate. `Op.in` is the same symbol the service
 * builds its filter with, so the comparison is exact.
 */
const roleMatches = (filter, role) => {
  if (filter === undefined) return true;
  if (typeof filter === 'string') return filter === role;
  if (filter && Array.isArray(filter[Op.in])) return filter[Op.in].includes(role);
  throw new Error(`unsupported role filter shape: ${JSON.stringify(filter)}`);
};

const harness = (clients) => {
  const notify = vi.fn(async () => ({ success: true }));
  const audienceFilters = [];
  const User = {
    findAll: vi.fn(async ({ where = {} } = {}) => {
      audienceFilters.push(where.role);
      return clients.filter((client) => roleMatches(where.role, client.role));
    }),
    findByPk: vi.fn(async (id) => clients.find((client) => client.id === id) ?? null),
  };
  const WorkoutSession = { findOne: vi.fn(async () => ({ id: 'session-1' })) };
  const rows = [];
  const sequelize = {
    query: vi.fn(async (sql, { bind }) => {
      if (/^INSERT INTO nudge_dispatches/.test(String(sql).trim())) {
        const [userId, nudgeType, localDate] = bind;
        if (rows.some((r) => r.userId === userId && r.nudgeType === nudgeType && r.localDate === localDate)) return [];
        rows.push({ userId, nudgeType, localDate, createdAt: NOW });
        return [{ id: rows.length }];
      }
      return [];
    }),
  };
  return {
    notify,
    rows,
    audienceFilters,
    deps: { User, WorkoutSession, sequelize, notify, env: ENABLED, now: NOW },
  };
};

describe('proactive-nudge delivery reaches the client-equivalent default role', () => {
  it('nudges both consented accounts — the explicit "client" AND the default "user"', async () => {
    const client = account(11, 'client');
    const user = account(12, 'user');
    const h = harness([client, user]);

    const out = await runCoachProactiveNudgeTick(h.deps);

    expect(out.nudged).toBe(2);
    const targeted = h.notify.mock.calls.map(([payload]) => payload.userId).sort((a, b) => a - b);
    expect(targeted).toEqual([11, 12]);
    // One durable ledger claim per delivered nudge, and no more.
    expect(h.rows.map((row) => row.userId).sort((a, b) => a - b)).toEqual([11, 12]);
  });

  it('asks the database for the client-equivalent audience, not the literal "client" role', async () => {
    const h = harness([account(11, 'client'), account(12, 'user')]);
    await runCoachProactiveNudgeTick(h.deps);

    expect(h.audienceFilters).toHaveLength(1);
    const filter = h.audienceFilters[0];
    expect(filter && Array.isArray(filter[Op.in])).toBe(true);
    expect([...filter[Op.in]].sort()).toEqual(['client', 'user']);
  });

  it('does NOT nudge a consented trainer or admin', async () => {
    const h = harness([
      account(11, 'client'),
      account(12, 'user'),
      account(13, 'trainer'),
      account(14, 'admin'),
    ]);

    const out = await runCoachProactiveNudgeTick(h.deps);

    expect(out.nudged).toBe(2);
    const targeted = h.notify.mock.calls.map(([payload]) => payload.userId);
    expect(targeted).not.toContain(13);
    expect(targeted).not.toContain(14);
    expect(h.rows.map((row) => row.userId)).not.toContain(13);
    expect(h.rows.map((row) => row.userId)).not.toContain(14);
  });

  it('still refuses a client-equivalent account that never opted in', async () => {
    const optedOut = { ...account(12, 'user'), notificationPreferences: {} };
    const h = harness([account(11, 'client'), optedOut]);

    const out = await runCoachProactiveNudgeTick(h.deps);

    expect(out.nudged).toBe(1);
    expect(h.notify.mock.calls.map(([payload]) => payload.userId)).toEqual([11]);
  });

  it('still refuses a client-equivalent account whose delivery-time recheck fails', async () => {
    const deactivated = { ...account(12, 'user'), isActive: false };
    // findAll mirrors the `isActive: { [Op.not]: false }` clause by hand: the
    // account is visible to the sweep, so the refusal must come from the recheck.
    const h = harness([account(11, 'client'), deactivated]);
    h.deps.User.findAll = vi.fn(async () => [account(11, 'client'), deactivated]);

    const out = await runCoachProactiveNudgeTick(h.deps);

    expect(out.nudged).toBe(1);
    expect(h.notify.mock.calls.map(([payload]) => payload.userId)).toEqual([11]);
  });
});
