/**
 * Body-map evidence routes vs the default self-registration role.
 *
 * Register §A2 (77-open-findings-register.md, THIRD WAVE). Defect: two guards on
 * the same line DISAGREED about `'user'` — the role minted by public
 * self-registration (models/User.mjs:135) and client-equivalent per
 * utils/clientAccess.mjs:23:
 *
 *   authorize(['admin','trainer','client'])           -> literal roles.includes()
 *                                                        (authMiddleware.mjs:459-493) -> 403
 *   verifyClientAccessByUserId({paramName:'userId'})  -> assertAssignmentOrAdmin
 *                                                        (verifyClientAccess.mjs:91-93)
 *                                                        maps 'user' -> self: true
 *
 * The ownership guard already admitted a `'user'` account acting on its OWN
 * record; `authorize` denied it before that guard could run. Consequence: a
 * freshly self-registered account could not upload or delete its own body-map
 * evidence.
 *
 * Live URL: `core/routes.mjs:835` mounts `routes/api.mjs` at `/api`, which mounts
 * this router at `/body-map-evidence` (`routes/api.mjs:45`).
 *
 * This suite mounts the REAL router with the REAL `authorize` — only `protect` is
 * stubbed, so neither guard under test is replaced by a stand-in. The controller
 * is stubbed because the subject is the guard composition, not the persistence
 * layer: a 201/200 therefore means "both guards admitted the request and the
 * handler ran".
 *
 * Fail-closed controls matter as much as the fix: `'user'` must still be denied
 * another client's record (404, the ownership guard's existence-hiding denial —
 * not a 403 from `authorize`), and the two staff-only routes (:29 analyze, :30
 * review) must stay closed to client-equivalent roles.
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

vi.mock('../../controllers/bodyMapEvidenceController.mjs', () => ({
  listBodyMapEvidence: (_req, res) => res.json({ handler: 'listBodyMapEvidence' }),
  createBodyMapEvidence: (_req, res) => res.status(201).json({ handler: 'createBodyMapEvidence' }),
  analyzeBodyMapEvidence: (_req, res) => res.json({ handler: 'analyzeBodyMapEvidence' }),
  reviewBodyMapEvidence: (_req, res) => res.json({ handler: 'reviewBodyMapEvidence' }),
  deleteBodyMapEvidence: (_req, res) => res.json({ handler: 'deleteBodyMapEvidence' }),
}));

const { default: bodyMapEvidenceRoutes } = await import('../../routes/bodyMapEvidenceRoutes.mjs');

const OWN_ID = '901';
const OTHER_ID = '902';
const BASE = '/api/body-map-evidence';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(BASE, bodyMapEvidenceRoutes);
  return app;
};

const as = (req, id, role) => req.set('x-test-user-id', id).set('x-test-user-role', role);

// `admitted` is the status the route's own controller stub returns, so any other
// value means a GUARD refused the request before the handler ran.
const clientWriteRoutes = [
  { label: 'POST /:userId/:entryId', admitted: 201, send: (id) => request(app).post(`${BASE}/${id}/55`) },
  { label: 'DELETE /:userId/:entryId/:mediaId', admitted: 200, send: (id) => request(app).delete(`${BASE}/${id}/55/77`) },
];

let app;
beforeEach(() => {
  app = buildApp();
});

describe('body-map evidence client write routes admit the default self-registration role', () => {
  it.each(clientWriteRoutes)('lets a raw "user" account act on its OWN record: $label', async ({ send, admitted }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'user');
    expect(response.status).toBe(admitted);
  });

  it.each(clientWriteRoutes)('keeps the explicit "client" role working: $label', async ({ send, admitted }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'client');
    expect(response.status).toBe(admitted);
  });

  it.each(clientWriteRoutes)('keeps admin working: $label', async ({ send, admitted }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'admin');
    expect(response.status).toBe(admitted);
  });
});

describe('body-map evidence client write routes do not widen', () => {
  it.each(clientWriteRoutes)('denies a "user" account another client\'s record at OWNERSHIP, not at authorize: $label', async ({ send }) => {
    const response = await as(send(OTHER_ID), OWN_ID, 'user');
    // 404 (not 403) is the ownership guard's existence-hiding denial: the request
    // passed `authorize` and was refused by ownership.
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false });
  });

  it.each(clientWriteRoutes)('denies a "client" account another client\'s record at ownership: $label', async ({ send }) => {
    const response = await as(send(OTHER_ID), OWN_ID, 'client');
    expect(response.status).toBe(404);
  });

  it.each(clientWriteRoutes)('refuses a trainer at ownership, not at authorize: $label', async ({ send }) => {
    const response = await as(send(OWN_ID), '905', 'trainer');
    // A 403 would mean `authorize` rejected the trainer. The trainer passes
    // `authorize` and is refused by the assignment guard, which fails closed
    // because this harness has no populated model cache.
    expect(response.status).toBe(404);
  });
});

describe('body-map evidence staff-only routes stay closed', () => {
  // :29 and :30 are `authorize(['admin','trainer'])` — no 'client' in the list,
  // deliberately untouched by this fix. Behavioural proof rather than a source pin.
  const staffOnlyRoutes = [
    { label: 'POST /:userId/:entryId/:mediaId/analyze', send: (id) => request(app).post(`${BASE}/${id}/55/77/analyze`) },
    { label: 'PUT /:userId/:entryId/:mediaId/review', send: (id) => request(app).put(`${BASE}/${id}/55/77/review`) },
  ];

  it.each(staffOnlyRoutes)('rejects "user" with 403 from authorize: $label', async ({ send }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'user');
    expect(response.status).toBe(403);
  });

  it.each(staffOnlyRoutes)('rejects "client" with 403 from authorize: $label', async ({ send }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'client');
    expect(response.status).toBe(403);
  });

  it.each(staffOnlyRoutes)('admits admin (universal override): $label', async ({ send }) => {
    const response = await as(send(OWN_ID), OWN_ID, 'admin');
    expect(response.status).toBe(200);
  });
});

describe('body-map evidence read route (no authorize; ownership guard only)', () => {
  it('already served a "user" account its own list, and still does', async () => {
    const response = await as(request(app).get(`${BASE}/${OWN_ID}/55`), OWN_ID, 'user');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ handler: 'listBodyMapEvidence' });
  });

  it('still denies a "user" account another client\'s list', async () => {
    const response = await as(request(app).get(`${BASE}/${OTHER_ID}/55`), OWN_ID, 'user');
    expect(response.status).toBe(404);
  });
});
