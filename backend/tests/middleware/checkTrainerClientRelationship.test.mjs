/**
 * checkTrainerClientRelationship — client self-access regression guard
 * ====================================================================
 *
 * Phase 16.2 round 5 (2026-04-18): the canonical `/dashboard/client/log-workout`
 * save path was hard-403'd on every attempt because `req.user.id` is stored as
 * a string by `protect` (authMiddleware.mjs:359 via toStringId), while the
 * self-access gate in checkTrainerClientRelationship compared it to a
 * parseInt'd clientId with strict equality — string === number is always false.
 *
 * This test exercises the middleware directly as a function to lock the fix.
 * It is behavioral, not source-text, because the string/number drift is a
 * runtime bug that wouldn't surface from a source regex alone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUTH_FILE = resolve(__dirname, '../../middleware/authMiddleware.mjs');
const authSource = readFileSync(AUTH_FILE, 'utf8');

// Mock ClientTrainerAssignment so the trainer branch can run without a DB.
vi.mock('../../models/ClientTrainerAssignment.mjs', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

// Stub the logger to keep test output clean.
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { checkTrainerClientRelationship } = await import('../../middleware/authMiddleware.mjs');
const { default: ClientTrainerAssignment } = await import('../../models/ClientTrainerAssignment.mjs');

function mockRes() {
  const res = {
    statusCode: 200,
    jsonBody: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.jsonBody = body; return this; },
  };
  return res;
}

describe('checkTrainerClientRelationship — string/number drift fix (Phase 16.2 round 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a client to access their own data when req.user.id is a string and body.clientId is a number', async () => {
    // Canonical failure mode before the fix: protect stored req.user.id as '91'
    // (string) and the middleware compared '91' === 91 → false → 403.
    const req = {
      user: { id: '91', role: 'client' },
      params: {},
      body: { clientId: 91 },
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toBeNull();
  });

  it('allows a member-role user to access their own workout-form data', async () => {
    const req = {
      user: { id: '91', role: 'user' },
      params: {},
      body: { clientId: 91 },
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toBeNull();
  });

  it('allows a client to access their own data when both sides are strings', async () => {
    // Second common shape: clientId comes from params as a string.
    const req = {
      user: { id: '91', role: 'client' },
      params: { clientId: '91' },
      body: {},
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('denies a client trying to access a different user\'s data (403)', async () => {
    const req = {
      user: { id: '91', role: 'client' },
      params: {},
      body: { clientId: 92 },
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.jsonBody?.success).toBe(false);
  });

  it('admin passthrough works regardless of id shape', async () => {
    const req = {
      user: { id: '1', role: 'admin' },
      params: { clientId: '91' },
      body: {},
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    // Admin branch must NOT hit the ClientTrainerAssignment lookup.
    expect(ClientTrainerAssignment.findOne).not.toHaveBeenCalled();
  });

  it('trainer with active assignment passes through with numeric trainerId lookup', async () => {
    // Lock the Sequelize lookup shape — trainerId must be numeric, not the
    // string form from req.user.id. Before the fix, `trainerId: req.user.id`
    // passed a string into a where clause against an INT column.
    ClientTrainerAssignment.findOne.mockResolvedValue({ id: 1, status: 'active' });

    const req = {
      user: { id: '10', role: 'trainer' },
      params: {},
      body: { clientId: 91 },
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(ClientTrainerAssignment.findOne).toHaveBeenCalledWith({
      where: {
        trainerId: 10,   // <- numeric, not '10'
        clientId: 91,
        status: 'active',
      },
    });
  });

  it('trainer without an active assignment is denied', async () => {
    ClientTrainerAssignment.findOne.mockResolvedValue(null);

    const req = {
      user: { id: '10', role: 'trainer' },
      params: {},
      body: { clientId: 91 },
      path: '/api/workout-forms',
    };
    const res = mockRes();
    const next = vi.fn();

    await checkTrainerClientRelationship(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});

describe('checkTrainerClientRelationship — source-level anti-regression locks', () => {
  it('derives userNumericId via parseInt(req.user.id, 10)', () => {
    expect(authSource).toMatch(
      /const\s+userNumericId\s*=\s*parseInt\(\s*req\.user\.id\s*,\s*10\s*\)\s*;/
    );
  });

  it('client/member self-access gate compares numeric ids, not req.user.id against parseInt result', () => {
    // Positive lock: the fixed comparison shape.
    expect(authSource).toMatch(
      /isWorkoutSelfAccessRole\(req\.user\.role\) && userNumericId === clientId|\(req\.user\.role === 'client' \|\| req\.user\.role === 'user'\) && userNumericId === clientId/
    );
    // Negative lock: the broken pre-fix shape must not come back.
    expect(authSource).not.toMatch(
      /req\.user\.role === 'client' && req\.user\.id === clientId\b/
    );
  });

  it('trainer assignment lookup uses numeric trainerId (not req.user.id string)', () => {
    // Positive lock: the ClientTrainerAssignment.findOne where clause inside
    // checkTrainerClientRelationship must use `userNumericId`, not the raw
    // string `req.user.id`. Before the fix, Sequelize got a string into an
    // INT column (worked by coercion, but semantically drifty). After the
    // fix, the where is cleanly numeric.
    const idx = authSource.indexOf('export const checkTrainerClientRelationship');
    expect(idx).toBeGreaterThan(-1);
    const endIdx = authSource.indexOf('export const', idx + 1);
    const slice = authSource.slice(idx, endIdx > -1 ? endIdx : authSource.length);

    // Locate the findOne where clause and lock it to userNumericId.
    const whereMatch = slice.match(/findOne\(\{\s*where:\s*\{([\s\S]*?)\}/);
    expect(whereMatch).toBeTruthy();
    const whereBlock = whereMatch[1];
    expect(whereBlock).toMatch(/trainerId:\s*userNumericId/);
    expect(whereBlock).not.toMatch(/trainerId:\s*req\.user\.id/);
  });
  // ── Kimi security audit F1: confused-deputy guard (2026-08-04) ──────────
  describe('F1 — params/body clientId confused-deputy guard', () => {
    it('REJECTS 400 when params.clientId and body.clientId disagree (the IDOR primitive)', async () => {
      // The attack: a trainer authorized for client A (params) smuggles client
      // B (body) that a downstream handler might act on. Must fail loudly.
      const req = {
        user: { id: '7', role: 'trainer' },
        params: { clientId: '10' },
        body: { clientId: '99' },
        path: '/api/clients/10/sessions',
      };
      const res = mockRes();
      const next = vi.fn();
      await checkTrainerClientRelationship(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.message).toMatch(/disagree/i);
    });

    it('pins req.authorizedClientId to the authorized id for handlers to consume', async () => {
      ClientTrainerAssignment.findOne.mockResolvedValue({ id: 1 }); // assigned
      const req = {
        user: { id: '7', role: 'trainer' },
        params: { clientId: '10' },
        body: {},
        path: '/api/clients/10/sessions',
      };
      const res = mockRes();
      const next = vi.fn();
      await checkTrainerClientRelationship(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.authorizedClientId).toBe(10);
    });

    it('allows the request when params and body agree', async () => {
      const req = {
        user: { id: '91', role: 'client' },
        params: { clientId: '91' },
        body: { clientId: '91' },
        path: '/api/workout-forms',
      };
      const res = mockRes();
      const next = vi.fn();
      await checkTrainerClientRelationship(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('a single source (only params, or only body) is unaffected', async () => {
      ClientTrainerAssignment.findOne.mockResolvedValue({ id: 1 });
      const req = {
        user: { id: '7', role: 'trainer' },
        params: {},
        body: { clientId: '10' },
        path: '/api/workout-forms',
      };
      const res = mockRes();
      const next = vi.fn();
      await checkTrainerClientRelationship(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.authorizedClientId).toBe(10);
    });
  });
});
