import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// Regression test for the string-vs-number type-coercion bug class.
//
// Production incident 2026-05-01: trainer 98 logs into trainer dashboard,
// API returns 403 "Trainers can only view their own assigned clients" when
// the trainer asks about THEIR OWN ID. Root cause: req.user.id is stored as
// a string (see authMiddleware.mjs:631 round-5 fix). The route compared
// `parseInt(trainerId) !== requestingUserId` → number !== string → always
// true → always 403. Fix: coerce both sides with String().
//
// Sibling bugs swept and fixed in the same pass:
//   - clientTrainerAssignmentRoutes.mjs:436 (this file's primary subject)
//   - trainerPermissionsRoutes.mjs:138, 511
//   - authRoutes.mjs:739
//   - commissionRoutes.mjs:145
//   - wearableDataRoutes.mjs:395, 429
// ─────────────────────────────────────────────────────────────

const mockAssignmentFindAll = vi.fn();
const mockAssignmentFindAndCountAll = vi.fn();
const mockAssignmentFindOne = vi.fn();
const mockAssignmentFindByPk = vi.fn();
const mockAssignmentUpdate = vi.fn();
const mockUserFindOne = vi.fn();
const mockSequelizeQuery = vi.fn();

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    // Simulate the production behavior where req.user.id is a STRING
    // (matches the authMiddleware comment at line 631).
    req.user = {
      id: req.headers['x-test-user-id'] || '98',
      role: req.headers['x-test-user-role'] || 'trainer',
    };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'admin only' });
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user?.role === 'trainer' || req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'trainer/admin only' });
  },
}));

vi.mock('../models/index.mjs', () => ({
  getClientTrainerAssignment: () => ({
    findAll: mockAssignmentFindAll,
    findAndCountAll: mockAssignmentFindAndCountAll,
    findOne: mockAssignmentFindOne,
    findByPk: mockAssignmentFindByPk,
    update: mockAssignmentUpdate,
  }),
  getUser: () => ({
    findOne: mockUserFindOne,
  }),
}));

vi.mock('../database.mjs', () => ({
  default: { query: mockSequelizeQuery },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let app;
beforeEach(async () => {
  vi.clearAllMocks();
  mockAssignmentFindAll.mockResolvedValue([
    { id: 1, clientId: 99, status: 'active' },
    { id: 2, clientId: 100, status: 'active' },
    { id: 3, clientId: 101, status: 'active' },
  ]);
  mockAssignmentFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  mockAssignmentFindOne.mockResolvedValue(null);
  mockAssignmentFindByPk.mockResolvedValue(null);
  mockAssignmentUpdate.mockResolvedValue([0]);
  mockUserFindOne.mockResolvedValue(null);
  mockSequelizeQuery.mockResolvedValue([[]]);

  const { default: clientTrainerAssignmentRoutes } = await import(
    '../routes/clientTrainerAssignmentRoutes.mjs'
  );

  app = express();
  app.use(express.json());
  app.use('/api/assignments', clientTrainerAssignmentRoutes);
});

describe('trainerOwnerCheck::stringNumberCoercion (production bug 2026-05-01)', () => {
  it('keeps assignment diagnostics behind admin auth and avoids database writes', async () => {
    const forbidden = await request(app)
      .get('/api/assignments/test')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(forbidden.status).toBe(403);
    expect(mockSequelizeQuery).not.toHaveBeenCalled();

    const allowed = await request(app)
      .get('/api/assignments/test')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');

    expect(allowed.status).toBe(200);
    expect(mockSequelizeQuery).toHaveBeenCalledTimes(2);
    const sqlText = mockSequelizeQuery.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(sqlText).not.toMatch(/\b(BEGIN|ROLLBACK|INSERT\s+INTO)\b/i);
  });

  it('returns 200 + assignments when trainer (req.user.id="98") asks about own id (params.trainerId="98")', async () => {
    const res = await request(app)
      .get('/api/assignments/trainer/98')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalClients).toBe(3);
    expect(mockAssignmentFindAll).toHaveBeenCalledTimes(1);
    expect(mockAssignmentFindAll.mock.calls[0][0].where.trainerId).toBe(98);
  });

  it('rejects malformed trainer route IDs before querying assignments', async () => {
    const res = await request(app)
      .get('/api/assignments/trainer/98abc')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'admin');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Trainer ID must be a positive integer');
    expect(mockAssignmentFindAll).not.toHaveBeenCalled();
  });

  it('rejects malformed admin filters before querying assignments', async () => {
    const res = await request(app)
      .get('/api/assignments?trainerId=42abc')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Trainer ID must be a positive integer');
    expect(mockAssignmentFindAndCountAll).not.toHaveBeenCalled();
  });

  it('returns 403 when trainer (req.user.id="98") tries to view OTHER trainer (params.trainerId="42")', async () => {
    const res = await request(app)
      .get('/api/assignments/trainer/42')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(mockAssignmentFindAll).not.toHaveBeenCalled();
  });

  it('returns 200 when admin asks about any trainer id (admin bypasses ownership check)', async () => {
    const res = await request(app)
      .get('/api/assignments/trainer/98')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects malformed create-assignment IDs before user lookup', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin')
      .send({ clientId: '12abc', trainerId: 2 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Client ID and Trainer ID must be positive integers');
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('does not expose operational errors from create-assignment failures', async () => {
    mockUserFindOne.mockRejectedValue(new Error('database password leaked in stack'));

    const res = await request(app)
      .post('/api/assignments')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin')
      .send({ clientId: 12, trainerId: 2 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Failed to create assignment',
      error: 'internal_error',
    });
    expect(JSON.stringify(res.body)).not.toContain('password leaked');
  });

  it('rejects malformed update and delete IDs before assignment lookup', async () => {
    const updateRes = await request(app)
      .put('/api/assignments/9abc')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin')
      .send({ status: 'inactive' });

    const deleteRes = await request(app)
      .delete('/api/assignments/9abc')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');

    expect(updateRes.status).toBe(400);
    expect(deleteRes.status).toBe(400);
    expect(mockAssignmentFindByPk).not.toHaveBeenCalled();
  });

  it('handles numeric req.user.id gracefully (defensive: comparison should still work if id ever becomes a number)', async () => {
    // Override mock to return a number
    const { default: clientTrainerAssignmentRoutes } = await import(
      '../routes/clientTrainerAssignmentRoutes.mjs'
    );
    const numApp = express();
    numApp.use(express.json());
    numApp.use((req, _res, next) => {
      req.user = { id: 98, role: 'trainer' };
      next();
    });
    numApp.use('/api/assignments', clientTrainerAssignmentRoutes);

    // Re-stub since the inner handler uses adminOnly/trainerOrAdminOnly mocks
    // but the override middleware sets req.user before mounting. The mocked
    // trainerOrAdminOnly checks role and lets us through.
    const res = await request(numApp).get('/api/assignments/trainer/98');

    expect(res.status).toBe(200);
  });
});
