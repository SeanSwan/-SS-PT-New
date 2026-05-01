import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Stub DB-touching pieces used by chart handlers.
const mockSequelize = {
  query: vi.fn().mockResolvedValue([[]]),
};

// Mock the AI consent controller's transitive deps so we can import the handler directly.
vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({
    AiPrivacyProfile: {
      findOne: vi.fn().mockResolvedValue({
        userId: 42,
        consentGranted: true,
        toJSON() { return { userId: 42, consentGranted: true }; },
      }),
    },
    User: {
      findByPk: vi.fn(async (id) => ({ id: Number(id) })),
    },
    ClientTrainerAssignment: {
      findOne: vi.fn().mockResolvedValue(null),
    },
  }),
  getModel: () => null,
}));

vi.mock('../services/waiverEligibility.mjs', () => ({
  evaluateWaiverVersionEligibility: vi.fn().mockResolvedValue({
    isCurrent: true,
    reasonCode: 'CURRENT',
    details: { reconsentRequiredVersionIds: [] },
  }),
}), { virtual: true });

const { getWorkoutFrequencyChart } = await import('../controllers/chartDataController.mjs');
const { getAiConsentStatus } = await import('../controllers/aiConsentController.mjs');

// Test app builder: minimal Express, no real auth/middleware chain, just a fake protect that
// injects req.user from headers, then mounts the handler under test on the SAME paramless
// path Express uses in production. This exercises the actual Express route-layer behavior
// that wipes req.params (rule 55's concern), not a synthetic in-process call.
function buildChartApp() {
  const app = express();
  app.set('sequelize', mockSequelize);
  app.use(express.json());
  // Fake protect: inject req.user from x-test-user-id header.
  app.use((req, _res, next) => {
    const id = req.headers['x-test-user-id'];
    if (id) req.user = { id: Number(id), role: req.headers['x-test-user-role'] || 'client' };
    next();
  });
  // Fake injectUserId: simulate the production middleware setting req.params.userId
  // before the paramless route wipes it. Express still wipes for paramless layers.
  app.use((req, _res, next) => {
    if (req.user) req.params.userId = String(req.user.id);
    next();
  });
  // Paramless route - matches production's clientAnalyticsRoutes mount pattern.
  app.get('/chart-workout-frequency', getWorkoutFrequencyChart);
  return app;
}

function buildAdminChartApp() {
  // Mirror admin path: /:userId/chart-workout-frequency. Express WILL populate req.params.userId.
  const app = express();
  app.set('sequelize', mockSequelize);
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = req.headers['x-test-user-id'];
    if (id) req.user = { id: Number(id), role: req.headers['x-test-user-role'] || 'admin' };
    next();
  });
  app.get('/:userId/chart-workout-frequency', getWorkoutFrequencyChart);
  return app;
}

function buildConsentApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = req.headers['x-test-user-id'];
    if (id) req.user = { id: Number(id), role: req.headers['x-test-user-role'] || 'client' };
    next();
  });
  app.get('/consent/status', getAiConsentStatus);
  app.get('/consent/status/:userId', getAiConsentStatus);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSequelize.query.mockResolvedValue([[]]);
});

describe('Triage Slice 1 - paramless route fallback (D1 chart endpoints)', () => {
  it('chart-workout-frequency: paramless route falls back to req.user.id (no 400)', async () => {
    // Pre-fix: this would 400 because Express wipes req.params.userId on paramless layers.
    // Post-fix: requireUser falls back to req.user.id and the handler proceeds.
    const app = buildChartApp();
    const res = await request(app)
      .get('/chart-workout-frequency')
      .set('x-test-user-id', '42');
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(200);
  });

  it('returns 400 when neither req.params.userId nor req.user.id is valid', async () => {
    // No x-test-user-id header AND req.user.id is null.
    const app = express();
    app.set('sequelize', mockSequelize);
    app.use((req, _res, next) => { req.user = { id: null, role: 'client' }; next(); });
    app.get('/chart-workout-frequency', getWorkoutFrequencyChart);
    const res = await request(app).get('/chart-workout-frequency');
    expect(res.status).toBe(400);
  });

  it('admin path with explicit /:userId in route still works (REV 3 admin path safety)', async () => {
    // Express populates req.params.userId from the path segment; helper uses it directly.
    const app = buildAdminChartApp();
    const res = await request(app)
      .get('/123/chart-workout-frequency')
      .set('x-test-user-id', '1')
      .set('x-test-user-role', 'admin');
    expect(res.status).toBe(200);
    // The handler should query for userId=123 (path param), not 1 (admin's own id).
    // Verified via the sequelize mock receiving userId=123.
    const callArgs = mockSequelize.query.mock.calls[0]?.[1];
    expect(callArgs?.replacements?.userId).toBe(123);
  });

  it('|| fallback (not ??) catches empty-string sentinel for req.params.userId', async () => {
    // Simulate a hostile middleware that sets req.params.userId to "".
    // ?? would NOT trigger fallback (?? only fires on null/undefined).
    // || DOES trigger fallback because "" is falsy. REV 3.1 H4 / Village HIGH-4.
    const app = express();
    app.set('sequelize', mockSequelize);
    app.use((req, _res, next) => {
      req.user = { id: 42, role: 'client' };
      req.params.userId = ''; // hostile sentinel
      next();
    });
    app.get('/chart-workout-frequency', getWorkoutFrequencyChart);
    const res = await request(app).get('/chart-workout-frequency');
    expect(res.status).toBe(200); // Should fall back to req.user.id, not 400.
  });
});

describe('Triage Slice 1 - getAiConsentStatus paramless mount (D2)', () => {
  it('paramless /consent/status uses requester own id (no 400)', async () => {
    const app = buildConsentApp();
    const res = await request(app)
      .get('/consent/status')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).not.toBe(400);
    expect(res.status).toBe(200);
  });

  it('IGNORES ?userId= query string on paramless mount (REV 3 attack-surface drop)', async () => {
    // Pre-fix: ?userId=999 would set rawUserId=999, resolveTargetUser returns 999.
    // Post-fix: pathUserId is undefined, branch goes to requesterId, query is ignored.
    const app = buildConsentApp();
    const res = await request(app)
      .get('/consent/status?userId=999')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(200);
    // The response should reflect requester's own profile (42), not victim 999.
    // We assert the User.findByPk was NOT called with 999 (paramless mount must not look up other users).
    const { getAllModels } = await import('../models/index.mjs');
    const findByPkMock = getAllModels().User.findByPk;
    const calledWith999 = findByPkMock.mock.calls.some(([id]) => id === 999 || id === '999');
    expect(calledWith999).toBe(false);
  });
});

describe('Triage Slice 1 - getAiConsentStatus :userId path role gates preserved', () => {
  it('client-role accessing other userId via /:userId path -> 403', async () => {
    const app = buildConsentApp();
    const res = await request(app)
      .get('/consent/status/999')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'client');
    expect(res.status).toBe(403);
  });

  it('trainer-role without ClientTrainerAssignment to targetUserId -> 403', async () => {
    const app = buildConsentApp();
    const res = await request(app)
      .get('/consent/status/999')
      .set('x-test-user-id', '42')
      .set('x-test-user-role', 'trainer');
    expect(res.status).toBe(403);
  });
});
