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
  }),
  getUser: () => ({}),
}));

vi.mock('../database.mjs', () => ({
  default: { query: vi.fn() },
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

  const { default: clientTrainerAssignmentRoutes } = await import(
    '../routes/clientTrainerAssignmentRoutes.mjs'
  );

  app = express();
  app.use(express.json());
  app.use('/api/assignments', clientTrainerAssignmentRoutes);
});

describe('trainerOwnerCheck::stringNumberCoercion (production bug 2026-05-01)', () => {
  it('returns 200 + assignments when trainer (req.user.id="98") asks about own id (params.trainerId="98")', async () => {
    const res = await request(app)
      .get('/api/assignments/trainer/98')
      .set('x-test-user-id', '98')
      .set('x-test-user-role', 'trainer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalClients).toBe(3);
    expect(mockAssignmentFindAll).toHaveBeenCalledTimes(1);
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
