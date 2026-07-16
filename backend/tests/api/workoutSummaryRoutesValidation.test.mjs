import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dailyWorkoutFormUpdate, userFindByPk } = vi.hoisted(() => ({
  dailyWorkoutFormUpdate: vi.fn(),
  userFindByPk: vi.fn(),
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'trainer' };
    next();
  },
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: { findByPk: userFindByPk },
    DailyWorkoutForm: { update: dailyWorkoutFormUpdate },
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
    userFindByPk.mockResolvedValue({
      id: 42,
      firstName: 'Client',
      lastName: 'Example',

      email: null,
    });
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
      { where: { id: formId } },
    );
  });
});
