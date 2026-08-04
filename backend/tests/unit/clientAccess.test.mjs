/**
 * clientAccess.test.mjs
 * =====================
 * Slice A1 — the fail-closed authorization matrix. This is the heart of the
 * Context Engine's security posture.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  checkClientAccess,
  REAL_RELATIONSHIP_STATUSES,
  SESSION_HISTORY_WINDOW_DAYS,
  sessionHistoryCutoff,
} from '../../services/ai/contextEngine/clientAccess.mjs';

const ASSIGNMENT_SQL = /client_trainer_assignments/;
const SESSION_SQL = /FROM sessions/;

function fakeSequelize({ assignmentRows = [], sessionRows = [], throwOn = null } = {}) {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql) => {
      if (throwOn && throwOn.test(sql)) throw new Error('db error');
      if (ASSIGNMENT_SQL.test(sql)) return assignmentRows;
      if (SESSION_SQL.test(sql)) return sessionRows;
      return [];
    }),
  };
}

const ADMIN = { id: 1, role: 'admin' };
const TRAINER = { id: 2, role: 'trainer' };
const CLIENT = { id: 3, role: 'client' };
const USER = { id: 4, role: 'user' };

describe('checkClientAccess matrix', () => {
  it('admin → any client, no queries needed', async () => {
    const sequelize = fakeSequelize();
    const r = await checkClientAccess(ADMIN, 999, sequelize);
    expect(r).toEqual({ allowed: true, via: 'admin', reason: null });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('client → self allowed, other client denied', async () => {
    expect((await checkClientAccess(CLIENT, 3, fakeSequelize())).allowed).toBe(true);
    const denied = await checkClientAccess(CLIENT, 5, fakeSequelize());
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('not_self');
  });

  it('user role → self only', async () => {
    expect((await checkClientAccess(USER, 4, fakeSequelize())).allowed).toBe(true);
    expect((await checkClientAccess(USER, 3, fakeSequelize())).allowed).toBe(false);
  });

  it('trainer → allowed via active assignment', async () => {
    const r = await checkClientAccess(TRAINER, 7, fakeSequelize({ assignmentRows: [{ 1: 1 }] }));
    expect(r.allowed).toBe(true);
    expect(r.via).toBe('assignment');
  });

  it('trainer → allowed via session history when no assignment', async () => {
    const r = await checkClientAccess(TRAINER, 7, fakeSequelize({ sessionRows: [{ 1: 1 }] }));
    expect(r.allowed).toBe(true);
    expect(r.via).toBe('session_history');
  });

  it('trainer → DENIED when neither assignment nor session exists', async () => {
    const r = await checkClientAccess(TRAINER, 7, fakeSequelize());
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('not_assigned');
  });

  it('FAIL-CLOSED: trainer denied when verification query throws', async () => {
    const r = await checkClientAccess(TRAINER, 7, fakeSequelize({ throwOn: ASSIGNMENT_SQL }));
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('verification_error');
  });

  it('FAIL-CLOSED: trainer denied without a sequelize instance', async () => {
    const r = await checkClientAccess(TRAINER, 7, null);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('verification_error');
  });

  it('rejects invalid inputs (no user, bad clientId, unknown role)', async () => {
    expect((await checkClientAccess(null, 7, fakeSequelize())).allowed).toBe(false);
    expect((await checkClientAccess(TRAINER, 'abc', fakeSequelize())).allowed).toBe(false);
    expect((await checkClientAccess(TRAINER, -1, fakeSequelize())).allowed).toBe(false);
    expect((await checkClientAccess({ id: 9, role: 'visitor' }, 7, fakeSequelize())).allowed).toBe(false);
  });

  it.each([
    ['array client id', ['7']],
    ['decimal string client id', '7.0'],
    ['whitespace-padded client id', ' 7'],
    ['leading-zero client id', '007'],
    ['object client id', { toString: () => '7' }],
    ['boolean client id', true],
  ])('rejects coercive target client ids: %s', async (_label, targetClientId) => {
    const sequelize = fakeSequelize({ assignmentRows: [{ 1: 1 }] });
    const r = await checkClientAccess(TRAINER, targetClientId, sequelize);
    expect(r).toEqual({ allowed: false, via: null, reason: 'invalid_request' });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('pending assignments grant NOTHING (only status=active matches)', async () => {
    // The SQL itself filters status='active'; simulate the DB returning no rows
    // for a pending-only assignment and assert denial.
    const sequelize = fakeSequelize({ assignmentRows: [], sessionRows: [] });
    const r = await checkClientAccess(TRAINER, 7, sequelize);
    expect(r.allowed).toBe(false);
    const assignmentCall = sequelize.query.mock.calls.find(([sql]) => ASSIGNMENT_SQL.test(sql));
    expect(assignmentCall[0]).toMatch(/status = 'active'/);
  });
});

/**
 * The session-history fallback is BOUNDED (Sean's ruling, 2026-07-30).
 *
 * Before: `SELECT 1 FROM sessions WHERE trainerId=? AND userId=?` — no status
 * filter, no date bound. One row, including a CANCELLED session from any date,
 * granted permanent Coach context access. So unassigning a trainer revoked their
 * photos/notes/nutrition (utils/clientAccess.mjs) but NOT their Coach access:
 * unassignment was not a complete revocation.
 *
 * WHAT THESE TESTS PROVE, precisely: that the guard ASKS the right question — the
 * emitted SQL carries a status allowlist and a recency bound, and the bound
 * parameters are correct. They do NOT prove Postgres' evaluation of that SQL; the
 * fake sequelize returns whatever rows it is handed regardless of the WHERE clause,
 * which is exactly why the pre-existing "allowed via session history" test kept
 * passing while the query was unbounded. End-to-end proof would need seeded
 * production rows, which is not something a test may create.
 */
describe('session-history fallback is bounded, not unlimited', () => {
  const sessionCall = (sequelize) => sequelize.query.mock.calls.find(([sql]) => SESSION_SQL.test(sql));

  it('filters on a status allowlist and a sessionDate floor', async () => {
    const sequelize = fakeSequelize({ assignmentRows: [], sessionRows: [] });
    await checkClientAccess(TRAINER, 7, sequelize);

    const [sql, opts] = sessionCall(sequelize);
    expect(sql).toMatch(/status IN \(:realStatuses\)/);
    expect(sql).toMatch(/"sessionDate" >= :sessionHistoryCutoff/);
    expect(sql).toMatch(/"sessionDate" IS NOT NULL/);
    expect(opts.replacements.realStatuses).toEqual(REAL_RELATIONSHIP_STATUSES);
    expect(opts.replacements.sessionHistoryCutoff).toBeInstanceOf(Date);
  });

  it.each(['cancelled', 'available', 'blocked', 'requested'])(
    'a %s session can never grant access',
    (status) => {
      // Verified against the live enum_sessions_status. `cancelled` is the case
      // that motivated the ruling: a session that never happened must not confer
      // standing access to a client's history.
      expect(REAL_RELATIONSHIP_STATUSES).not.toContain(status);
    },
  );

  it('counts the statuses that DO evidence a real working relationship', () => {
    expect(REAL_RELATIONSHIP_STATUSES).toEqual(
      expect.arrayContaining(['completed', 'confirmed', 'scheduled', 'booked', 'assigned']),
    );
  });

  it('the cutoff is the configured window in the past, not the epoch', () => {
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    const cutoff = sessionHistoryCutoff(now);
    const daysBack = (now - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysBack).toBe(SESSION_HISTORY_WINDOW_DAYS);
    expect(SESSION_HISTORY_WINDOW_DAYS).toBeGreaterThan(0);
    // A regression to "no bound" would show up as an absurdly old cutoff.
    expect(SESSION_HISTORY_WINDOW_DAYS).toBeLessThanOrEqual(365);
  });

  it('the allowlist is frozen so a caller cannot widen it at runtime', () => {
    expect(Object.isFrozen(REAL_RELATIONSHIP_STATUSES)).toBe(true);
  });
});
