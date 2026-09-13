/**
 * Pain-entry WRITE routes vs the default self-registration role.
 *
 * Defect (hostile review, 2026-09-13): routes/painEntryRoutes.mjs:35,38,39,40 put
 * two guards on the same line that DISAGREED about `'user'` — the default role
 * minted by public self-registration (models/User.mjs:135):
 *
 *   authorize(['admin','trainer','client'])            -> literal roles.includes() -> HTTP 403
 *   verifyClientAccessByUserId({paramName:'userId'})   -> assertAssignmentOrAdmin
 *                                                         (verifyClientAccess.mjs:91-93)
 *                                                         maps 'user' -> self access: true
 *
 * The second guard is the real ownership gate and it already admits a `'user'`
 * account writing ITS OWN entry; the first denied it outright, so a freshly
 * self-registered account could not log its own pain entry.
 *
 * This suite mounts the REAL router with the REAL `authorize` (only `protect` is
 * stubbed, so the guard under test is not replaced by a stand-in) and the REAL
 * `verifyClientAccessByUserId`. The controller is stubbed because the subject is
 * the guard composition, not the persistence layer: a 201 therefore means "both
 * guards admitted the request and the handler ran".
 *
 * Fail-closed controls matter as much as the fix: `'user'` must still be denied
 * another client's entry (404) and must still be denied admin-only DELETE (403).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Stub ONLY `protect`; keep the real `authorize` — it is the guard under test.
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

vi.mock('../../controllers/painEntryController.mjs', () => ({
  getClientPainEntries: (_req, res) => res.json({ handler: 'getClientPainEntries' }),
  getActivePainEntries: (_req, res) => res.json({ handler: 'getActivePainEntries' }),
  createPainEntry: (_req, res) => res.status(201).json({ handler: 'createPainEntry' }),
  updatePainEntry: (_req, res) => res.json({ handler: 'updatePainEntry' }),
  resolvePainEntry: (_req, res) => res.json({ handler: 'resolvePainEntry' }),
  deletePainEntry: (_req, res) => res.json({ handler: 'deletePainEntry' }),
  painCheckIn: (_req, res) => res.status(201).json({ handler: 'painCheckIn' }),
  trainerPainDigest: (_req, res) => res.json({ handler: 'trainerPainDigest' }),
}));

const { default: painEntryRoutes } = await import('../../routes/painEntryRoutes.mjs');

const OWN_ID = '901';
const OTHER_ID = '902';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pain-entries', painEntryRoutes);
  return app;
};

const as = (req, id, role) => req.set('x-test-user-id', id).set('x-test-user-role', role);

describe('pain-entry write routes admit the default self-registration role', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  // The four routes that carried `authorize(['admin','trainer','client'])`.
  // `admitted` is the status the route's own controller stub returns, so any
  // other value means a GUARD refused the request before the handler ran.
  const writeRoutes = [
    { label: 'POST /:userId', admitted: 201, send: () => request(app).post(`/api/pain-entries/${OWN_ID}`) },
    { label: 'POST /:userId/check-in', admitted: 201, send: () => request(app).post(`/api/pain-entries/${OWN_ID}/check-in`) },
    { label: 'PUT /:userId/:entryId', admitted: 200, send: () => request(app).put(`/api/pain-entries/${OWN_ID}/77`) },
    { label: 'PUT /:userId/:entryId/resolve', admitted: 200, send: () => request(app).put(`/api/pain-entries/${OWN_ID}/77/resolve`) },
  ];

  it.each(writeRoutes)('lets a raw "user" account write its OWN entry: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'user').send({ painLevel: 4 });
    expect(response.status).toBe(admitted);
  });

  it.each(writeRoutes)('keeps the explicit "client" role working: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'client').send({ painLevel: 4 });
    expect(response.status).toBe(admitted);
  });

  it.each(writeRoutes)('keeps admin working: $label', async ({ send, admitted }) => {
    const response = await as(send(), OWN_ID, 'admin').send({ painLevel: 4 });
    expect(response.status).toBe(admitted);
  });

  it('does NOT widen a "user" account to another client\'s entry', async () => {
    const response = await as(request(app).post(`/api/pain-entries/${OTHER_ID}`), OWN_ID, 'user').send({ painLevel: 4 });
    // 404 (not 403) is the access guard's existence-hiding denial: the request
    // passed `authorize` and was refused by ownership.
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false });
  });

  it('does NOT widen a "client" account to another client\'s entry', async () => {
    const response = await as(request(app).post(`/api/pain-entries/${OTHER_ID}`), OWN_ID, 'client').send({ painLevel: 4 });
    expect(response.status).toBe(404);
  });

  it('still admits a trainer to the route (refused by ownership, not by authorize)', async () => {
    const response = await as(request(app).post(`/api/pain-entries/${OWN_ID}`), OWN_ID, 'trainer').send({ painLevel: 4 });
    // A 403 here would mean `authorize` rejected the trainer; the trainer is
    // refused by the assignment guard because no models cache exists in this
    // harness, which is the correct fail-closed path.
    expect(response.status).toBe(404);
  });

  it('keeps admin-only DELETE closed to "user" and "client"', async () => {
    const asUser = await as(request(app).delete(`/api/pain-entries/${OWN_ID}/77`), OWN_ID, 'user');
    const asClient = await as(request(app).delete(`/api/pain-entries/${OWN_ID}/77`), OWN_ID, 'client');
    expect(asUser.status).toBe(403);
    expect(asClient.status).toBe(403);
  });

  it('still serves the read routes to a "user" account reading its own entries', async () => {
    const response = await as(request(app).get(`/api/pain-entries/${OWN_ID}`), OWN_ID, 'user');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ handler: 'getClientPainEntries' });
  });
});
