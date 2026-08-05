import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dailyWorkoutFormUpdate, dailyWorkoutFormFindByPk, userFindByPk, assignmentFindOne } = vi.hoisted(() => ({
  dailyWorkoutFormUpdate: vi.fn(),
  dailyWorkoutFormFindByPk: vi.fn(),
  userFindByPk: vi.fn(),
  assignmentFindOne: vi.fn(),
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'trainer' };
    next();
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

// This suite exercises PAYLOAD VALIDATION, so the trainer↔client assignment gate added by
// the 2026-08-04 authz sweep is stubbed to pass. The gate itself is real and must stay wired:
// the "authorization gate" test at the bottom of this file locks it against removal.
vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  verifyClientAccessByUserId: () => (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: { findByPk: userFindByPk },
    DailyWorkoutForm: { update: dailyWorkoutFormUpdate, findByPk: dailyWorkoutFormFindByPk },
    ClientTrainerAssignment: { findOne: assignmentFindOne },
  }),
}));

const workoutSummaryRouteSource = readFileSync(resolve(process.cwd(), 'routes/workoutSummaryRoutes.mjs'), 'utf8');

const workoutSummaryRoutes = (await import('../../routes/workoutSummaryRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/workout-summaries', workoutSummaryRoutes);
  return app;
}

describe('workout summary route payload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `role` and an active assignment row are required since the launch audit
    // (2026-08-03) put `ensureClientAccess` in front of this route — the mock
    // registry must model a real assigned client, not a role-less stub.
    userFindByPk.mockResolvedValue({
      id: 42,
      role: 'client',
      firstName: 'Client',
      lastName: 'Example',

      email: null,
    });
    assignmentFindOne.mockResolvedValue({ id: 1, clientId: 42, trainerId: 7, status: 'active' });
    dailyWorkoutFormFindByPk.mockResolvedValue({ id: 'f1f4f73e-cc3d-4a7f-81c1-419e5fd931f7', clientId: 42 });
    dailyWorkoutFormUpdate.mockResolvedValue([1]);
  });

  it('loads the canonical backend email sender when a summary email is requested', () => {
    expect(workoutSummaryRouteSource).toContain("await import('../emailService.mjs')");
    expect(workoutSummaryRouteSource).not.toContain(
      "await import('../services/emailService.mjs')",
    );
  });

  it('rejects malformed client IDs before ORM lookup', async () => {
    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send({
        clientId: 'admin-library',
        formId: 'f1f4f73e-cc3d-4a7f-81c1-419e5fd931f7',
      })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: 'Valid clientId is required',
    });
    expect(userFindByPk).not.toHaveBeenCalled();
    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('rejects malformed form IDs instead of generating a fake saved summary', async () => {
    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send({
        clientId: 42,
        formId: 'not-a-workout-form-id',
      })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: 'Valid formId is required',
    });
    expect(userFindByPk).not.toHaveBeenCalled();
    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-array exercise payloads before summary aggregation', async () => {
    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send({
        clientId: 42,
        exercises: { exerciseName: 'Push Up' },
      })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: 'exercises must be an array',
    });
    expect(userFindByPk).not.toHaveBeenCalled();
    expect(dailyWorkoutFormUpdate).not.toHaveBeenCalled();
  });

  it('normalizes numeric client IDs before client lookup and summary persistence', async () => {
    const formId = 'f1f4f73e-cc3d-4a7f-81c1-419e5fd931f7';

    const response = await request(makeApp())
      .post('/api/workout-summaries')
      .send({
        clientId: '42',
        formId,
        exercises: [
          {
            exerciseName: 'Push Up',
            sets: [{ weight: 0, reps: 12, rpe: 7 }],
            formRating: 4,
          },
        ],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.formId).toBe(formId);
    expect(userFindByPk).toHaveBeenCalledWith(42, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });
    expect(dailyWorkoutFormUpdate).toHaveBeenCalledWith(
      { clientSummary: expect.stringContaining('Push Up') },
      // Scoped by clientId too: `where: { id }` alone let any trainer overwrite ANY
      // client's summary by supplying its form id (authz sweep 2026-08-04).
      { where: { id: formId, clientId: 42 } },
    );
  });
});

describe('workout summary authorization gate (authz sweep 2026-08-04)', () => {
  // Source-level lock: `protect + trainerOrAdminOnly` was the entire guard, which let any
  // trainer write to any client's form, resolve any user's identity (200-vs-404 oracle), and
  // send a SwanStudios-branded email containing attacker-supplied text to any user's address.
  it('wires the trainer-to-client assignment check on the POST route', () => {
    expect(workoutSummaryRouteSource).toContain(
      "import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs'",
    );
    expect(workoutSummaryRouteSource).toMatch(
      /router\.post\(\s*'\/',\s*protect,\s*trainerOrAdminOnly,\s*verifyClientAccessByUserId\(\{\s*bodyField:\s*'clientId'\s*\}\)/,
    );
  });

  it('scopes the form update to the authorized client, never by form id alone', () => {
    expect(workoutSummaryRouteSource).toMatch(/where:\s*\{\s*id:\s*normalizedFormId,\s*clientId:\s*parsedClientId\s*\}/);
    expect(workoutSummaryRouteSource).not.toMatch(/where:\s*\{\s*id:\s*normalizedFormId\s*\}/);
  });
});
