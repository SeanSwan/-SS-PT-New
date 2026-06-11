/**
 * clientAccess.test.mjs
 * =====================
 * Slice A1 — the fail-closed authorization matrix. This is the heart of the
 * Context Engine's security posture.
 */
import { describe, it, expect, vi } from 'vitest';
import { checkClientAccess } from '../../services/ai/contextEngine/clientAccess.mjs';

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
