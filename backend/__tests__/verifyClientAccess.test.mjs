import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ─────────────────────────────────────────────────────────────
// Mock setup - must precede the SUT import.
// ─────────────────────────────────────────────────────────────

const mockSequelizeQuery = vi.fn();
const mockFindByPk = vi.fn();

vi.mock('../database.mjs', () => ({
  default: {
    query: mockSequelizeQuery,
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'WorkoutPlan') {
      return { findByPk: mockFindByPk };
    }
    return null;
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const {
  assertAssignmentOrAdmin,
  verifyClientAccessByUserId,
  verifyClientAccessByPlanId,
  filterPlansByTrainerAssignment,
} = await import('../middleware/verifyClientAccess.mjs');

// Helper: build a tiny app that mounts the middleware on a paramless or paramfull route
// and reports back what happened (status + req.workoutPlan if attached).
function buildPlanIdApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'client',
      };
    }
    next();
  });
  const mw = verifyClientAccessByPlanId(options);
  app.get('/plans/:id', mw, (req, res) => {
    res.json({
      success: true,
      planAttached: !!req.workoutPlan,
      planId: req.workoutPlan?.id,
      planUserId: req.workoutPlan?.userId,
    });
  });
  return app;
}

function buildUserIdApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'client',
      };
    }
    next();
  });
  const mw = verifyClientAccessByUserId(options);
  app.get('/data/:userId', mw, (_req, res) => res.json({ success: true }));
  app.post('/data', mw, (_req, res) => res.json({ success: true }));
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no assignment exists (returns empty rows)
  mockSequelizeQuery.mockResolvedValue([null]);
});

// ─────────────────────────────────────────────────────────────
// assertAssignmentOrAdmin - pure helper
// ─────────────────────────────────────────────────────────────
describe('assertAssignmentOrAdmin', () => {
  it('admin role returns true regardless of clientId', async () => {
    const result = await assertAssignmentOrAdmin(1, 'admin', 999);
    expect(result).toBe(true);
    // Admin should NOT trigger a SQL lookup (short-circuit at line 1)
    expect(mockSequelizeQuery).not.toHaveBeenCalled();
  });

  it('client role returns true when userId === clientId', async () => {
    const result = await assertAssignmentOrAdmin(42, 'client', 42);
    expect(result).toBe(true);
  });

  it('client role returns false when userId !== clientId (cross-user attempt)', async () => {
    const result = await assertAssignmentOrAdmin(42, 'client', 999);
    expect(result).toBe(false);
  });

  it('trainer role returns true when ClientTrainerAssignment row exists', async () => {
    mockSequelizeQuery.mockResolvedValue([{ '?column?': 1 }]);
    const result = await assertAssignmentOrAdmin(1, 'trainer', 42);
    expect(result).toBe(true);
    expect(mockSequelizeQuery).toHaveBeenCalledOnce();
    const callArgs = mockSequelizeQuery.mock.calls[0][1];
    expect(callArgs.replacements.trainerId).toBe(1);
    expect(callArgs.replacements.clientId).toBe(42);
  });

  it('trainer role returns false when no assignment row', async () => {
    mockSequelizeQuery.mockResolvedValue([null]);
    const result = await assertAssignmentOrAdmin(1, 'trainer', 42);
    expect(result).toBe(false);
  });

  it('trainer role fails closed when SQL throws (table missing or query error)', async () => {
    mockSequelizeQuery.mockRejectedValue(new Error('relation "ClientTrainerAssignments" does not exist'));
    const result = await assertAssignmentOrAdmin(1, 'trainer', 42);
    expect(result).toBe(false); // Fail-closed semantics preserved.
  });

  it('unknown role returns false (deny by default)', async () => {
    const result = await assertAssignmentOrAdmin(1, 'guest', 42);
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// verifyClientAccessByPlanId middleware
// ─────────────────────────────────────────────────────────────
describe('verifyClientAccessByPlanId middleware', () => {
  it('admin gets 200 and req.workoutPlan attached', async () => {
    mockFindByPk.mockResolvedValue({ id: 'abc-123', userId: 999 });
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.planAttached).toBe(true);
    expect(res.body.planId).toBe('abc-123');
    expect(res.body.planUserId).toBe(999);
  });

  it('plan not found returns 404', async () => {
    mockFindByPk.mockResolvedValue(null);
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/nonexistent')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('trainer WITH assignment to plan.userId gets 200', async () => {
    mockFindByPk.mockResolvedValue({ id: 'abc-123', userId: 42 });
    mockSequelizeQuery.mockResolvedValue([{ '?column?': 1 }]); // assignment exists
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(200);
    expect(res.body.planAttached).toBe(true);
  });

  it('trainer WITHOUT assignment returns 404 (NOT 403, prevents existence leak)', async () => {
    mockFindByPk.mockResolvedValue({ id: 'abc-123', userId: 42 });
    mockSequelizeQuery.mockResolvedValue([null]); // no assignment
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
  });

  it('client accessing own plan gets 200', async () => {
    mockFindByPk.mockResolvedValue({ id: 'abc-123', userId: 42 });
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(200);
    expect(res.body.planAttached).toBe(true);
  });

  it('client accessing OTHER user plan returns 404 (existence-leak protection)', async () => {
    mockFindByPk.mockResolvedValue({ id: 'abc-123', userId: 42 });
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '99')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
  });

  it('missing path param returns 400', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    // Mount without :id in path on a different route to avoid Express's 404
    app.get('/plans/', verifyClientAccessByPlanId({ paramName: 'id' }), (_req, res) => {
      res.json({ success: true });
    });
    const res = await request(app).get('/plans/');
    expect(res.status).toBe(400);
  });

  it('findByPk throws -> 500', async () => {
    mockFindByPk.mockRejectedValue(new Error('DB connection lost'));
    const app = buildPlanIdApp();
    const res = await request(app)
      .get('/plans/abc-123')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
// verifyClientAccessByUserId middleware
// ─────────────────────────────────────────────────────────────
describe('verifyClientAccessByUserId middleware', () => {
  it('admin reaches handler regardless of param userId', async () => {
    const app = buildUserIdApp();
    const res = await request(app)
      .get('/data/999')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(200);
  });

  it('trainer without assignment returns 404 on path-param target', async () => {
    mockSequelizeQuery.mockResolvedValue([null]);
    const app = buildUserIdApp();
    const res = await request(app)
      .get('/data/999')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(404);
  });

  it('client accessing own /data/:userId reaches handler', async () => {
    const app = buildUserIdApp();
    const res = await request(app)
      .get('/data/42')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(200);
  });

  it('client accessing /data/<other> returns 404', async () => {
    const app = buildUserIdApp();
    const res = await request(app)
      .get('/data/99')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(404);
  });

  it('falls back to body.userId on POST when no path param', async () => {
    const app = buildUserIdApp({ paramName: 'userId', bodyField: 'userId' });
    const res = await request(app)
      .post('/data')
      .send({ userId: 42 })
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(200);
  });

  it('400 when neither param nor body userId is present', async () => {
    const app = buildUserIdApp({ paramName: 'userId', bodyField: 'userId' });
    const res = await request(app)
      .post('/data')
      .send({})
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(400);
  });

  it('400 on non-numeric userId param', async () => {
    const app = buildUserIdApp();
    const res = await request(app)
      .get('/data/notanumber')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// filterPlansByTrainerAssignment utility
// ─────────────────────────────────────────────────────────────
describe('filterPlansByTrainerAssignment', () => {
  it('admin gets all plans unchanged', async () => {
    const plans = [
      { id: '1', userId: 42 },
      { id: '2', userId: 99 },
      { id: '3', userId: 7 },
    ];
    const req = { user: { id: 1, role: 'admin' } };
    const result = await filterPlansByTrainerAssignment(req, plans);
    expect(result).toEqual(plans);
  });

  it('client gets only plans where userId === self', async () => {
    const plans = [
      { id: '1', userId: 42 },
      { id: '2', userId: 99 },
      { id: '3', userId: 42 },
    ];
    const req = { user: { id: 42, role: 'client' } };
    const result = await filterPlansByTrainerAssignment(req, plans);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.userId === 42)).toBe(true);
  });

  it('trainer filters to assigned-client plans (per-plan SQL lookup)', async () => {
    // First plan: assigned. Second: not assigned. Third: assigned.
    mockSequelizeQuery
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([null])
      .mockResolvedValueOnce([{ '?column?': 1 }]);
    const plans = [
      { id: '1', userId: 42 },
      { id: '2', userId: 99 },
      { id: '3', userId: 7 },
    ];
    const req = { user: { id: 1, role: 'trainer' } };
    const result = await filterPlansByTrainerAssignment(req, plans);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('unknown role returns empty array (deny by default)', async () => {
    const plans = [{ id: '1', userId: 42 }];
    const req = { user: { id: 1, role: 'guest' } };
    const result = await filterPlansByTrainerAssignment(req, plans);
    expect(result).toEqual([]);
  });

  it('non-array input returns input unchanged', async () => {
    const req = { user: { id: 1, role: 'admin' } };
    const result = await filterPlansByTrainerAssignment(req, null);
    expect(result).toBe(null);
  });
});
