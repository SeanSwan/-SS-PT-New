/**
 * Launch audit lane 5 (2026-08-03) — trainer dashboard.
 *
 * REGRESSION: POST /api/workout-summaries was gated by `protect` +
 * `trainerOrAdminOnly` ONLY. It never checked that the caller is assigned to
 * the client whose id is in the body. Any authenticated trainer could:
 *   1. enumerate any user id and read back firstName/lastName in the summary,
 *   2. overwrite `clientSummary` on any DailyWorkoutForm row, and
 *   3. send attacker-controlled prose to any user's email from the platform
 *      sender (`sendEmail: true`).
 *
 * DENIAL-CODE note (integration merge 2026-08-05): these assertions originally
 * required 403. The route now denies in ROUTE MIDDLEWARE
 * (`verifyClientAccessByUserId`) rather than inside the handler, and that
 * middleware deliberately answers **404 "Resource not found"** — refusing to
 * confirm that the id exists at all. That is strictly stronger than 403, which
 * is itself an existence oracle over the id space (the very enumeration abuse
 * this route was fixed for). Updated to pin the stronger behaviour; the
 * security property under test is unchanged — denied, no write, no email.
 *
 * These tests drive the route as an UNASSIGNED trainer and require denial with
 * no ORM write and no mail send, plus an assigned-trainer happy path so the
 * guard cannot be "fixed" by denying everyone.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dailyWorkoutFormUpdate,
  dailyWorkoutFormFindByPk,
  userFindByPk,
  assignmentFindOne,
  sendEmailMock,
} = vi.hoisted(() => ({
  dailyWorkoutFormUpdate: vi.fn(),
  dailyWorkoutFormFindByPk: vi.fn(),
  userFindByPk: vi.fn(),
  assignmentFindOne: vi.fn(),
  sendEmailMock: vi.fn(),
}));

const currentUser = { id: 7, role: 'trainer' };

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

// Integration 2026-08-05: the access check moved into `verifyClientAccessByUserId`,
// which resolves the model via `getModel(...)` — a DIFFERENT export of this same
// module than the `getAllModels()` the handler uses. Mocking only `getAllModels`
// left `getModel` undefined, the middleware's try/catch fail-closed on the throw,
// and even a correctly-assigned trainer got 404. Both exports are mocked now, so
// the happy path exercises the real allow decision rather than passing by luck.
const MOCK_MODELS = {
  User: { findByPk: userFindByPk },
  DailyWorkoutForm: { update: dailyWorkoutFormUpdate, findByPk: dailyWorkoutFormFindByPk },
  ClientTrainerAssignment: { findOne: assignmentFindOne },
};

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => MOCK_MODELS,
  getModel: (name) => {
    const model = MOCK_MODELS[name];
    // Mirror the real getModel contract: THROW on a cache miss (it does not
    // return null) — otherwise this mock would hide a genuine lookup bug.
    if (!model) throw new Error(`Model not in cache: ${name}`);
    return model;
  },
}));

vi.mock('../../emailService.mjs', () => ({ sendEmail: sendEmailMock }));

const workoutSummaryRoutes = (await import('../../routes/workoutSummaryRoutes.mjs')).default;

const CLIENT_ID = 42;
const FORM_ID = 'f1f4f73e-cc3d-4a7f-81c1-419e5fd931f7';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/workout-summaries', workoutSummaryRoutes);
  return app;
};

const body = (overrides = {}) => ({
  clientId: CLIENT_ID,
  exercises: [{ exerciseName: 'Push Up', sets: [{ weight: 0, reps: 12, rpe: 7 }] }],
  ...overrides,
});

describe('POST /api/workout-summaries trainer assignment scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.id = 7;
    currentUser.role = 'trainer';
    userFindByPk.mockResolvedValue({
      id: CLIENT_ID,
      role: 'client',
      firstName: 'Client',
      lastName: 'Example',
      email: 'client@example.test',
    });
    dailyWorkoutFormUpdate.mockResolvedValue([1]);
    dailyWorkoutFormFindByPk.mockResolvedValue({ id: FORM_ID, clientId: CLIENT_ID });
    assignmentFindOne.mockResolvedValue(null);
    sendEmailMock.mockResolvedValue(undefined);
  });

  it('refuses an unassigned trainer and leaks no client name', async () => {
    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send(body())
      .expect(404); // see DENIAL-CODE note in header

    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('Example');
    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does not email an unassigned trainer\'s target client', async () => {
    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ sendEmail: true }))
      .expect(404); // see DENIAL-CODE note in header

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does not overwrite a workout form the trainer cannot reach', async () => {
    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ formId: FORM_ID }))
      .expect(404); // see DENIAL-CODE note in header

    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('refuses when the formId belongs to a different client than clientId', async () => {
    assignmentFindOne.mockResolvedValue({ id: 1, clientId: CLIENT_ID, trainerId: 7, status: 'active' });
    dailyWorkoutFormFindByPk.mockResolvedValue({ id: FORM_ID, clientId: 999 });

    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ formId: FORM_ID }))
      // Stays 403, NOT 404: the caller IS authorized for this clientId, so the
      // middleware admits them and the HANDLER rejects the cross-client formId.
      // No existence oracle is created — the id being probed is a form the
      // caller already has legitimate reason to reference — so the stronger
      // anti-enumeration 404 the middleware uses does not apply here.
      .expect(403);

    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('allows an assigned trainer through', async () => {
    assignmentFindOne.mockResolvedValue({ id: 1, clientId: CLIENT_ID, trainerId: 7, status: 'active' });

    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ formId: FORM_ID }))
      .expect(200);

    expect(response.body.success).toBe(true);
    // Integration 2026-08-05: the persist is now SCOPED to the authorized
    // client. `where: { id }` alone let an authorized caller overwrite ANY
    // form in the system by supplying its id — the cross-tenant WRITE this
    // route was fixed for. Pinning the stronger two-key scope, because an
    // assertion that accepts the id-only form would let that hole return.
    expect(dailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { clientSummary: expect.stringContaining('Push Up') },
      { where: { id: FORM_ID, clientId: CLIENT_ID } },
    );
  });

  it('allows an admin through without an assignment row', async () => {
    currentUser.id = 1;
    currentUser.role = 'admin';

    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body())
      .expect(200);

    expect(assignmentFindOne).not.toHaveBeenCalled();
  });

  it('escapes client-supplied prose before it reaches the HTML email body', async () => {
    assignmentFindOne.mockResolvedValue({ id: 1, clientId: CLIENT_ID, trainerId: 7, status: 'active' });

    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({
        sendEmail: true,
        sessionNotes: '<img src=x onerror="alert(1)">',
      }))
      .expect(200);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const { html } = sendEmailMock.mock.calls[0][0];
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});
