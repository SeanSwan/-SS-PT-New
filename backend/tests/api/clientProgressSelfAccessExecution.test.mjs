/**
 * Client-progress routes vs the default self-registration role.
 *
 * Register §A2 (77-open-findings-register.md, THIRD WAVE). Two guard groups in
 * `routes/clientProgressRoutes.mjs` denied the default role (models/User.mjs:135
 * mints `'user'`; utils/clientAccess.mjs:23 makes it client-equivalent):
 *
 *   clientReadAccess (:26-30)  authorize(['client','trainer','admin'])
 *                              + verifyClientAccessByUserId({paramName:'clientId'})
 *     -> the paired-guard disagreement: `authorize` (authMiddleware.mjs:459-493)
 *        is a literal roles.includes() with no client-equivalence and 403s a
 *        `'user'` account before the ownership guard — which maps `'user' -> self`
 *        (verifyClientAccess.mjs:91-93) — can admit it to its OWN record.
 *
 *   currentClientAccess (:21-24)  [protect, authorize(['client','admin'])]
 *     -> NO verifyClientAccessByUserId here: the table's pairing signature does
 *        NOT hold for this group (reported as drift). It is the sibling shape —
 *        a single guard on a SELF-SCOPED endpoint (`req.user.id` only:
 *        controllers/clientProgressController.mjs:64,77) whose list omits the
 *        default role. Same consequence, same fix, not detectable by the pairing
 *        guard; this behavioural suite is what covers it.
 *
 * Live URL: `core/routes.mjs:768` mounts this router at `/api/client-progress`
 * (ahead of the `app.use('/api', apiRoutes)` fallback at :835).
 *
 * The REAL router and the REAL `authorize` run here; only `protect` and the
 * controller are stubbed, so any status other than the controller stub's own
 * means a GUARD refused the request.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Stub ONLY `protect`; keep the real `authorize` — it is a guard under test.
vi.mock('../../middleware/authMiddleware.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    protect: (req, _res, next) => {
      req.user = {
        id: req.get('x-test-user-id') || '901',
        role: req.get('x-test-user-role') || 'client',
      };
      next();
    },
  };
});

vi.mock('../../controllers/clientProgressController.mjs', () => ({
  getCurrentClientProgress: (_req, res) => res.json({ handler: 'getCurrentClientProgress' }),
  updateCurrentClientProgress: (_req, res) => res.json({ handler: 'updateCurrentClientProgress' }),
  getClientProgressLeaderboard: (_req, res) => res.json({ handler: 'getClientProgressLeaderboard' }),
  getClientWorkoutHistory: (_req, res) => res.json({ handler: 'getClientWorkoutHistory' }),
  getClientComparisonAnalytics: (_req, res) => res.json({ handler: 'getClientComparisonAnalytics' }),
  getClientGoals: (_req, res) => res.json({ handler: 'getClientGoals' }),
  createClientGoal: (_req, res) => res.status(201).json({ handler: 'createClientGoal' }),
  updateClientGoal: (_req, res) => res.json({ handler: 'updateClientGoal' }),
  getClientInjuryRiskAssessment: (_req, res) => res.json({ handler: 'getClientInjuryRiskAssessment' }),
  getTargetClientProgress: (_req, res) => res.json({ handler: 'getTargetClientProgress' }),
  updateTargetClientProgress: (_req, res) => res.json({ handler: 'updateTargetClientProgress' }),
  getClientProgress: (_req, res) => res.json({ handler: 'getClientProgress' }),
  getMeasurementHistory: (_req, res) => res.json({ handler: 'getMeasurementHistory' }),
  createMeasurement: (_req, res) => res.status(201).json({ handler: 'createMeasurement' }),
}));

const { default: clientProgressRoutes } = await import('../../routes/clientProgressRoutes.mjs');

const OWN_ID = '901';
const OTHER_ID = '902';
const BASE = '/api/client-progress';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(BASE, clientProgressRoutes);
  return app;
};

const as = (req, id, role) => req.set('x-test-user-id', id).set('x-test-user-role', role);

let app;
beforeEach(() => {
  app = buildApp();
});

// currentClientAccess (`:21-24`) — self-scoped, no path param.
const selfRoutes = [
  { label: 'GET /', admitted: 200, send: () => request(app).get(BASE) },
  { label: 'PUT /', admitted: 200, send: () => request(app).put(BASE) },
];

// clientReadAccess (`:26-30`) — six routes, `:clientId` ownership guard paired.
const ownedRoutes = [
  { label: 'GET /:clientId/workout-history', admitted: 200, send: (id) => request(app).get(`${BASE}/${id}/workout-history`) },
  { label: 'GET /:clientId/comparison', admitted: 200, send: (id) => request(app).get(`${BASE}/${id}/comparison`) },
  { label: 'GET /:clientId/goals', admitted: 200, send: (id) => request(app).get(`${BASE}/${id}/goals`) },
  { label: 'POST /:clientId/goals', admitted: 201, send: (id) => request(app).post(`${BASE}/${id}/goals`) },
  { label: 'PUT /:clientId/goals/:goalId', admitted: 200, send: (id) => request(app).put(`${BASE}/${id}/goals/77`) },
  { label: 'GET /:clientId/risk-assessment', admitted: 200, send: (id) => request(app).get(`${BASE}/${id}/risk-assessment`) },
];

describe('client-progress self-scoped routes admit the default self-registration role', () => {
  it.each(selfRoutes)('lets a raw "user" account read/update its OWN current progress: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'user');
    expect(response.status).toBe(admitted);
  });

  it.each(selfRoutes)('keeps the explicit "client" role working: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'client');
    expect(response.status).toBe(admitted);
  });

  it.each(selfRoutes)('keeps admin working: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'admin');
    expect(response.status).toBe(admitted);
  });
});

describe('client-progress owned routes admit the default self-registration role', () => {
  it.each(ownedRoutes)('lets a raw "user" account act on its OWN record: $label', async ({ send, admitted }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'user');
    expect(response.status).toBe(admitted);
  });

  it.each(ownedRoutes)('keeps "client", "trainer" and "admin" working: $label', async ({ send, admitted }) => {
    expect((await as(send(OWN_ID), OWN_ID, 'client')).status).toBe(admitted);
    expect((await as(send(OWN_ID), OWN_ID, 'admin')).status).toBe(admitted);
    // The trainer passes `authorize` and is refused by the assignment guard,
    // which fails closed because this harness has no populated model cache.
    // 404 (not 403) proves `authorize` admitted the trainer.
    expect((await as(send(OWN_ID), '905', 'trainer')).status).toBe(404);
  });
});

describe('client-progress owned routes do not widen', () => {
  it.each(ownedRoutes)('denies a "user" account another client\'s record at OWNERSHIP, not at authorize: $label', async ({ send }) => {
    const response = await as(send(OTHER_ID), OWN_ID, 'user');
    // 404 (not 403) is the ownership guard's existence-hiding denial: the request
    // passed `authorize` and was refused by ownership.
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false });
  });

  it.each(ownedRoutes)('denies a "client" account another client\'s record at ownership: $label', async ({ send }) => {
    expect((await as(send(OTHER_ID), OWN_ID, 'client')).status).toBe(404);
  });
});

describe('client-progress trainer/admin-only routes stay closed (untouched :32-36 group)', () => {
  const targetRoutes = [
    { label: 'GET /:userId', send: (id) => request(app).get(`${BASE}/${id}`) },
    { label: 'PUT /:userId', send: (id) => request(app).put(`${BASE}/${id}`) },
  ];

  it.each(targetRoutes)('rejects "user" with 403 from authorize: $label', async ({ send }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'user');
    expect(response.status).toBe(403);
  });

  it.each(targetRoutes)('rejects "client" with 403 from authorize: $label', async ({ send }) => {
    expect((await as(send(OWN_ID), OWN_ID, 'client')).status).toBe(403);
  });

  it.each(targetRoutes)('admits admin (universal override): $label', async ({ send }) => {
    expect((await as(send(OWN_ID), OWN_ID, 'admin')).status).toBe(200);
  });

  it.each(targetRoutes)('admits trainer past authorize, refused by ownership: $label', async ({ send }) => {
    expect((await as(send(OWN_ID), '905', 'trainer')).status).toBe(404);
  });
});

describe('client-progress leaderboard (protect only) is unchanged', () => {
  it('still serves a "user" account', async () => {
    const response = await as(request(app).get(`${BASE}/leaderboard`), OWN_ID, 'user');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ handler: 'getClientProgressLeaderboard' });
  });
});
