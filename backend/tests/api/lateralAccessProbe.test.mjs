/**
 * ============================================================================
 * AUTHENTICATED LATERAL-ACCESS PROBE  (launch audit S6, 2026-07-28, SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The launch audit's route sweep resolved guards at mount/router/inline level
 * and concluded "232 id-accepting routes, 204 guarded, 0 unguarded". An
 * independent hostile review (Kimi K3) correctly rejected that as over-claimed:
 * it was validated by ONE unauthenticated probe, so it proves only that the
 * front door is locked. It says nothing about user A, holding a VALID session,
 * requesting user B's id — which is the actual week-one incident shape for a
 * product with real trainers and real clients.
 *
 * This probe closes that gap where it is load-bearing: the two guards that the
 * overwhelming majority of those 204 routes delegate to. If these deny lateral
 * access when mounted in a REAL Express app — real param parsing, real async
 * middleware sequencing, real next()/short-circuit behaviour — then every route
 * that applies them denies it too.
 *
 * WHAT IT DOES NOT COVER (stated honestly rather than implied)
 * - Routes that authorize INSIDE the controller instead of via middleware.
 * - Mount-order shadowing between routers (resolved separately for
 *   /api/onboarding; not swept exhaustively).
 * - The socket plane (covered by messagingBlockGuard.test.mjs for blocking, not
 *   for general lateral reads).
 * ============================================================================
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignment: { findOne: vi.fn() },
  user: { findByPk: vi.fn() },
}));

vi.mock('../../models/ClientTrainerAssignment.mjs', () => ({
  default: { findOne: (...a) => mocks.assignment.findOne(...a) },
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') return { findOne: (...a) => mocks.assignment.findOne(...a) };
    if (name === 'User') return { findByPk: (...a) => mocks.user.findByPk(...a) };
    throw new Error(`unexpected model ${name}`);
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { authorizeResourceAccess } = await import('../../middleware/authMiddleware.mjs');
const { verifyClientAccessByUserId } = await import('../../middleware/verifyClientAccess.mjs');

const VICTIM = 777;   // the account whose data must not leak
const ATTACKER = 42;  // a fully authenticated, legitimate user

/** Build a real Express app that injects `session` then applies `guard`. */
function appWith(guard, session) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = session; next(); });
  app.get('/:userId/data', guard, (req, res) => res.status(200).json({ leaked: req.params.userId }));
  app.post('/:userId/data', guard, (req, res) => res.status(200).json({ wrote: req.params.userId }));
  return app;
}

beforeEach(() => {
  mocks.assignment.findOne.mockReset();
  mocks.user.findByPk.mockReset();
});

// ---------------------------------------------------------------------------
describe('authorizeResourceAccess — lateral access with a VALID session', () => {
  const guard = authorizeResourceAccess('userId');

  it('DENIES a client reading another client', async () => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'client' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('leaked');
  });

  it('DENIES a client WRITING to another client', async () => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'client' })).post(`/${VICTIM}/data`).send({});
    expect(res.status).toBe(403);
  });

  it('DENIES a trainer with NO active assignment to the target', async () => {
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(403);
    expect(mocks.assignment.findOne).toHaveBeenCalled();
  });

  it('requires the assignment to be ACTIVE, not merely present', async () => {
    mocks.assignment.findOne.mockResolvedValue(null);
    await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    const where = mocks.assignment.findOne.mock.calls[0][0].where;
    expect(where.status).toBe('active');
    expect(where.trainerId).toBe(ATTACKER);
    expect(where.clientId).toBe(VICTIM);
  });

  it('ALLOWS a trainer WITH an active assignment', async () => {
    mocks.assignment.findOne.mockResolvedValue({ id: 1 });
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  it('ALLOWS a user to reach their own record', async () => {
    const res = await request(appWith(guard, { id: VICTIM, role: 'client' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  // protect stores req.user.id as a string in production — a strict === would
  // break self-access, and a loose == would be a different bug. Lock the shape.
  it('ALLOWS self-access when the session id arrives as a STRING', async () => {
    const res = await request(appWith(guard, { id: String(VICTIM), role: 'client' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  it('ALLOWS an admin (operator by design)', async () => {
    const res = await request(appWith(guard, { id: 1, role: 'admin' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  it('DENIES an unrecognised role outright', async () => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'moderator' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(403);
  });

  // A thrown lookup must not become an accidental allow.
  it('does NOT fall through to 200 when the assignment lookup throws', async () => {
    mocks.assignment.findOne.mockRejectedValue(new Error('db down'));
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).not.toBe(200);
    expect([403, 500]).toContain(res.status);
  });

  it.each([
    ['id padded with spaces', ` ${VICTIM} `],
    ['id with a numeric prefix', `${VICTIM}abc`],
  ])('does not leak via %s', async (_label, raw) => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'client' })).get(`/${encodeURIComponent(raw)}/data`);
    expect(res.status).not.toBe(200);
  });
});

// ---------------------------------------------------------------------------
describe('verifyClientAccessByUserId — lateral access with a VALID session', () => {
  const guard = verifyClientAccessByUserId({ paramName: 'userId' });

  it('DENIES a client reading another client', async () => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'client' })).get(`/${VICTIM}/data`);
    expect(res.status).not.toBe(200);
  });

  it('DENIES a trainer with no active assignment', async () => {
    mocks.assignment.findOne.mockResolvedValue(null);
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).not.toBe(200);
  });

  it('ALLOWS a trainer with an active assignment', async () => {
    mocks.assignment.findOne.mockResolvedValue({ id: 1 });
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  it('ALLOWS self-access', async () => {
    const res = await request(appWith(guard, { id: VICTIM, role: 'client' })).get(`/${VICTIM}/data`);
    expect(res.status).toBe(200);
  });

  // 404-not-403 on cross-user access is deliberate: it stops an attacker
  // iterating ids from distinguishing "exists but not yours" from "absent".
  it('does not confirm existence of another user\'s record', async () => {
    const res = await request(appWith(guard, { id: ATTACKER, role: 'client' })).get(`/${VICTIM}/data`);
    expect([403, 404]).toContain(res.status);
  });

  it('FAILS CLOSED when the assignment lookup throws', async () => {
    mocks.assignment.findOne.mockRejectedValue(new Error('db down'));
    const res = await request(appWith(guard, { id: ATTACKER, role: 'trainer' })).get(`/${VICTIM}/data`);
    expect(res.status).not.toBe(200);
  });
});

// ---------------------------------------------------------------------------
/**
 * ASSIGNMENT REVOCATION (launch audit S7 — Fable ruling item 10)
 *
 * "Trainer-with-ACTIVE-assignment" is only a real control if ending the
 * assignment ends the access NOW. A fired or reassigned trainer whose existing
 * session keeps working until their token rotates is a week-one-to-week-four
 * incident. Both guards must re-read assignment state per request rather than
 * trusting anything cached in the session/JWT.
 */
describe('assignment revocation cuts access on the very next request', () => {
  it.each([
    ['authorizeResourceAccess', () => authorizeResourceAccess('userId')],
    ['verifyClientAccessByUserId', () => verifyClientAccessByUserId({ paramName: 'userId' })],
  ])('%s — same session, active then revoked', async (_label, makeGuard) => {
    const session = { id: ATTACKER, role: 'trainer' };
    const app = appWith(makeGuard(), session);

    // 1. assignment ACTIVE -> allowed
    mocks.assignment.findOne.mockResolvedValue({ id: 1 });
    expect((await request(app).get(`/${VICTIM}/data`)).status).toBe(200);

    // 2. assignment revoked in the DB. Session/token unchanged.
    mocks.assignment.findOne.mockResolvedValue(null);
    expect((await request(app).get(`/${VICTIM}/data`)).status).not.toBe(200);
  });

  it('re-queries assignment state on EVERY request (no memoisation)', async () => {
    const app = appWith(authorizeResourceAccess('userId'), { id: ATTACKER, role: 'trainer' });
    mocks.assignment.findOne.mockResolvedValue({ id: 1 });

    await request(app).get(`/${VICTIM}/data`);
    await request(app).get(`/${VICTIM}/data`);
    await request(app).get(`/${VICTIM}/data`);

    // Three requests must mean three fresh lookups — a cached grant would be
    // indistinguishable from a stale permission.
    expect(mocks.assignment.findOne).toHaveBeenCalledTimes(3);
  });
});
