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
 * These tests drive the route as an UNASSIGNED trainer and require a 403 with
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

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: { findByPk: userFindByPk },
    DailyWorkoutForm: { update: dailyWorkoutFormUpdate, findByPk: dailyWorkoutFormFindByPk },
    ClientTrainerAssignment: { findOne: assignmentFindOne },
  }),
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
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('Example');
    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does not email an unassigned trainer\'s target client', async () => {
    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ sendEmail: true }))
      .expect(403);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('does not overwrite a workout form the trainer cannot reach', async () => {
    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ formId: FORM_ID }))
      .expect(403);

    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('refuses when the formId belongs to a different client than clientId', async () => {
    assignmentFindOne.mockResolvedValue({ id: 1, clientId: CLIENT_ID, trainerId: 7, status: 'active' });
    dailyWorkoutFormFindByPk.mockResolvedValue({ id: FORM_ID, clientId: 999 });

    await request(makeApp())
      .post('/api/workout-summaries')
      .send(body({ formId: FORM_ID }))
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
    expect(dailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { clientSummary: expect.stringContaining('Push Up') },
      { where: { id: FORM_ID } },
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
