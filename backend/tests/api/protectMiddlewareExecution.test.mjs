/**
 * ============================================================================
 * FILE: protectMiddlewareExecution.test.mjs
 * PURPOSE: Execute the REAL `protect` middleware. Every other authz suite in
 *          this repo mocks it, so all of them prove authorization *given* a
 *          correct `req.user` — and none proves `req.user` is correct.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-15
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * Handoff D named this the single largest standing assumption in the
 * authorization lane: ~211 user-scoped handlers are guarded by decisions made
 * from `req.user.id` and `req.user.role`, and nothing anywhere executed the
 * code that populates them. A suite that stubs
 *   protect: (req,_res,next) => { req.user = {...}; next(); }
 * has assumed the answer to the only question that matters.
 *
 * WHAT IS AND IS NOT MOCKED — this is the whole point of the file
 *   REAL: protect, jsonwebtoken (sign AND verify), getJwtSecret, toStringId,
 *         the token-type check, the active/locked gates, express routing.
 *   MOCK: the User model ONLY (`getUser` from models/index.mjs), because a
 *         Postgres row is not available here. The mock is the DATABASE, not the
 *         auth logic. Nothing that makes a security decision is stubbed.
 *
 * THE ASSERTION THAT MATTERS MOST
 * `role` is re-read from the database row, never taken from the token payload.
 * A token whose claims say `role: 'admin'` must yield `req.user.role ===
 * 'client'` if the DB says client. Without that property, every `role === 'admin'`
 * check in the codebase is forgeable by anyone who can mint a token. It holds —
 * and now it is pinned, so a future refactor that "optimises away" the DB lookup
 * fails CI instead of shipping a privilege escalation.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Must exist before the middleware module is imported, since getJwtSecret reads
// process.env at call time and refuses obviously-weak secrets.
const TEST_SECRET = 'test-only-jwt-secret-for-protect-execution-suite-0123456789';
process.env.JWT_SECRET = TEST_SECRET;

const mocks = vi.hoisted(() => ({ findByPk: vi.fn() }));

// The DATABASE is mocked. The middleware under test is not.
vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mocks.findByPk }),
}));

const { protect } = await import('../../middleware/authMiddleware.mjs');

/** A row as Sequelize would hand it back: numeric PK, role authoritative. */
const dbUser = (over = {}) => ({
  id: 4242,
  role: 'client',
  username: 'client_a',
  email: 'a@example.test',
  isActive: true,
  isLocked: false,
  password: 'hashed-never-expose-this',
  ...over,
});

const sign = (payload, opts = {}) => jwt.sign(
  { id: 4242, tokenType: 'access', ...payload },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: '15m', ...opts },
);

function app() {
  const a = express();
  a.use(express.json());
  // Echo whatever protect produced, so assertions read the real object.
  a.get('/probe', protect, (req, res) => res.json({ user: req.user, impersonation: req.impersonation ?? null }));
  return a;
}

const get = (token) => {
  const r = request(app()).get('/probe');
  return token === undefined ? r : r.set('Authorization', `Bearer ${token}`);
};

beforeAll(() => {
  // If the secret were unset/weak, getJwtSecret throws and EVERY test below
  // would "pass" its 401 expectation for the wrong reason.
  expect(process.env.JWT_SECRET).toBe(TEST_SECRET);
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByPk.mockResolvedValue(dbUser());
});

describe('protect — the middleware every other authz suite assumes', () => {
  it('CONTROL — a valid token populates req.user and reaches the handler', async () => {
    // Without this, every negative assertion below would also pass against a
    // middleware that simply rejects everything.
    const res = await get(sign({}));

    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.role).toBe('client');
    expect(mocks.findByPk).toHaveBeenCalledWith(4242);
  });

  describe('the token is not trusted for anything except identity', () => {
    it('ROLE COMES FROM THE DATABASE, NOT THE TOKEN — the escalation that must not work', async () => {
      // The whole codebase authorizes on req.user.role. If protect copied the
      // role out of the JWT payload, anyone able to mint a token for their own
      // account could claim admin. It re-reads the row instead.
      mocks.findByPk.mockResolvedValue(dbUser({ role: 'client' }));

      const res = await get(sign({ role: 'admin', isAdmin: true, permissions: ['*'] }));

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('client');
      expect(res.body.user.role).not.toBe('admin');
    });

    it('the response carries no password hash, however the row was shaped', async () => {
      const res = await get(sign({}));

      expect(res.body.user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('hashed-never-expose-this');
    });

    it('req.user.id is a STRING — the contract every downstream guard compares against', async () => {
      // authMiddleware:357 runs toStringId(user.id). Guards across the repo
      // normalize both sides because of it; four of five authz suites stub a
      // NUMBER here, so this is the only place the real type is pinned.
      const res = await get(sign({}));

      expect(typeof res.body.user.id).toBe('string');
      expect(res.body.user.id).toBe('4242');
    });

    it('identity is the DB row, not the claim — a token cannot rename its own user', async () => {
      // Claims that contradict the row must lose: the row is looked up by
      // decoded.id, and every field on req.user is taken from that row.
      mocks.findByPk.mockResolvedValue(dbUser({ id: 4242, username: 'client_a', email: 'a@example.test' }));

      const res = await get(sign({ username: 'admin_impostor', email: 'attacker@example.test' }));

      expect(res.body.user.username).toBe('client_a');
      expect(res.body.user.email).toBe('a@example.test');
    });
  });

  describe('tokens that must be refused', () => {
    it('no Authorization header at all → 401', async () => {
      const res = await get(undefined);
      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('a tampered payload fails the signature → 401', async () => {
      // Re-encode the middle segment to claim admin, keep the original
      // signature. This is the attack the signature exists to stop.
      const good = sign({});
      const [h, p, s] = good.split('.');
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
      payload.id = 9999;
      const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`;

      const res = await get(forged);

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('an unsigned alg:none token → 401 — NOTE: this passes on jsonwebtoken alone', async () => {
      // HONEST LABEL. Mutation-tested 2026-08-15: deleting `algorithms:['HS256']`
      // from protect leaves this test GREEN, because jsonwebtoken v9 refuses
      // `alg: none` unless you explicitly opt in. So this pins the LIBRARY's
      // default, not our pinning. Kept because the default is worth a tripwire
      // if the library is ever swapped or downgraded — but the test that
      // actually defends the pinning is the HS512 one below.
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 4242, tokenType: 'access' })).toString('base64url');

      const res = await get(`${header}.${payload}.`);

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('a token signed HS512 with the CORRECT secret → 401, because algorithms are pinned', async () => {
      // THIS is the assertion that defends `algorithms: ['HS256']`. The token is
      // signed with the real secret, so only the algorithm restriction can
      // refuse it. Verified by mutation: remove the pinning and this test — and
      // only this test — turns red.
      //
      // Why pinning matters beyond this case: it is the standing defence against
      // algorithm-confusion. Today the secret is symmetric, so the classic
      // RS256-public-key-as-HMAC-secret attack does not apply; if this app ever
      // moves to an asymmetric key, an unpinned verify becomes a full auth
      // bypass. The pin is cheap and must not be "cleaned up".
      const hs512 = jwt.sign({ id: 4242, tokenType: 'access' }, TEST_SECRET, {
        algorithm: 'HS512', expiresIn: '15m',
      });

      const res = await get(hs512);

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('a REFRESH token cannot be used as an access token → 401', async () => {
      const res = await get(sign({ tokenType: 'refresh' }));

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('an expired token → 401', async () => {
      const res = await get(sign({}, { expiresIn: '-1s' }));

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });

    it('a token signed with a DIFFERENT secret → 401', async () => {
      const foreign = jwt.sign({ id: 4242, tokenType: 'access' }, 'a-completely-different-secret-value-here', {
        algorithm: 'HS256', expiresIn: '15m',
      });

      const res = await get(foreign);

      expect(res.status).toBe(401);
      expect(mocks.findByPk).not.toHaveBeenCalled();
    });
  });

  describe('account state gates — a valid signature is not enough', () => {
    it('a token for a deleted user → 401', async () => {
      mocks.findByPk.mockResolvedValue(null);

      const res = await get(sign({}));

      expect(res.status).toBe(401);
    });

    it('a DEACTIVATED account → 403, even with a perfectly valid token', async () => {
      // This is the gate that lives ONLY in protect. Every suite that stubs
      // protect would happily authorize a deactivated user.
      mocks.findByPk.mockResolvedValue(dbUser({ isActive: false }));

      const res = await get(sign({}));

      expect(res.status).toBe(403);
    });

    it('a LOCKED account → 403, so an admin block kills live tokens too', async () => {
      mocks.findByPk.mockResolvedValue(dbUser({ isLocked: true }));

      const res = await get(sign({}));

      expect(res.status).toBe(403);
    });
  });

  describe('impersonation — the claim that unlocks a waiver bypass', () => {
    // WHY THIS IS HERE: waiverGate.mjs:131 does `if (req.impersonation?.actorId)
    // return next()`, skipping the signed-waiver requirement outright. So the
    // condition that SETS req.impersonation is a security gate, and nothing
    // executed it. Note the deliberate asymmetry with `role`: the actor's role
    // is read from the TOKEN here, not the database. That is sound only because
    // the token is signed and only an admin endpoint mints these claims — which
    // makes the guard below the thing holding it up.

    it('CONTROL — a proper admin impersonation token DOES set req.impersonation', async () => {
      // Without this, the negative tests below would pass against a protect
      // that never sets req.impersonation at all.
      const res = await get(sign({
        impersonation: true, impersonatedBy: 77, impersonationActorRole: 'admin',
      }));

      expect(res.status).toBe(200);
      expect(res.body.impersonation).toMatchObject({ actorId: '77', targetUserId: '4242' });
    });

    it('a NON-ADMIN actor role must NOT grant impersonation', async () => {
      // The waiver bypass hangs on this comparison. If it ever loosened to a
      // truthiness check, any token carrying impersonation claims would skip
      // the gate.
      const res = await get(sign({
        impersonation: true, impersonatedBy: 77, impersonationActorRole: 'client',
      }));

      expect(res.status).toBe(200);
      expect(res.body.impersonation).toBeNull();
    });

    it('impersonation:true with no actor id grants nothing', async () => {
      const res = await get(sign({ impersonation: true, impersonationActorRole: 'admin' }));

      expect(res.body.impersonation).toBeNull();
    });

    it('a truthy-but-not-true impersonation claim grants nothing (strict ===)', async () => {
      const res = await get(sign({
        impersonation: 'yes', impersonatedBy: 77, impersonationActorRole: 'admin',
      }));

      expect(res.body.impersonation).toBeNull();
    });

    it('an ordinary token never carries impersonation', async () => {
      const res = await get(sign({}));

      expect(res.body.impersonation).toBeNull();
    });
  });

  describe('the crossing', () => {
    it("user A's token never yields user B's identity", async () => {
      // The lane's founding question, asked of the layer that answers it.
      mocks.findByPk.mockImplementation(async (id) => (
        id === 501 ? dbUser({ id: 501, role: 'client', username: 'user_a' })
          : dbUser({ id: 502, role: 'admin', username: 'user_b' })
      ));

      const res = await get(sign({ id: 501 }));

      expect(res.body.user.id).toBe('501');
      expect(res.body.user.username).toBe('user_a');
      expect(res.body.user.role).toBe('client');
      expect(mocks.findByPk).toHaveBeenCalledWith(501);
      expect(mocks.findByPk).not.toHaveBeenCalledWith(502);
    });
  });
});
