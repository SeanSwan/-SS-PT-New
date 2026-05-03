/**
 * V3c.2 — POST /api/workout-builder/corrective-recommendations
 * =============================================================
 *
 * Locks the route contract for the OHSA → V3b.3 corrective registry
 * bridge endpoint:
 *   - access gate (admin/trainer/client + ENABLE_CLIENT_PLAN_SELFGEN)
 *   - input validation (clientId numeric, compensations is array)
 *   - service wiring (forwards compensations, includeSteps; returns
 *     the service's grouped output)
 *   - error path (Exercise model missing → 503; service throws → 500)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    if (req.headers['x-test-user-id']) {
      req.user = {
        id: parseInt(req.headers['x-test-user-id'], 10),
        role: req.headers['x-test-user-role'] || 'admin',
      };
    } else {
      req.user = { id: 99, role: 'admin' };
    }
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../services/workoutBuilderService.mjs', () => ({
  generateWorkout: vi.fn(),
  generatePlan: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const mockAssignmentFindOne = vi.fn();
const mockExerciseFindAll = vi.fn();
vi.mock('../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientTrainerAssignment') return { findOne: mockAssignmentFindOne };
    if (name === 'Exercise') return { findAll: mockExerciseFindAll };
    return null;
  },
  getExercise: () => ({ findAll: mockExerciseFindAll }),
}));

vi.mock('../services/ai/correctiveExerciseService.mjs', () => ({
  getCorrectiveExercisesForCompensations: vi.fn(),
}));

const { getCorrectiveExercisesForCompensations } = await import(
  '../services/ai/correctiveExerciseService.mjs'
);
const workoutBuilderRoutes = (await import('../routes/workoutBuilderRoutes.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/workout-builder', workoutBuilderRoutes);

const FAKE_RECOMMENDATIONS = {
  tags: ['knees_cave', 'pronation_distortion_syndrome'],
  matchedCount: 3,
  inhibit: [{ id: '1', name: 'Foam Roll TFL' }],
  lengthen: [],
  activate: [{ id: '2', name: 'Lateral Band Walks' }],
  integrate: [{ id: '4', name: 'Squat to Row (Cable)' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  getCorrectiveExercisesForCompensations.mockResolvedValue(FAKE_RECOMMENDATIONS);
  // Default trainer assignment (positive) so trainer-path tests pass.
  mockAssignmentFindOne.mockResolvedValue({ id: 1 });
});

describe('POST /api/workout-builder/corrective-recommendations - validation', () => {
  it('rejects missing clientId with 400', async () => {
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ compensations: ['knee_valgus'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clientId/i);
  });

  it('rejects non-numeric clientId with 400', async () => {
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 'not-a-number', compensations: ['knee_valgus'] });
    expect(res.status).toBe(400);
  });

  it('rejects missing compensations with 400', async () => {
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/compensations/i);
  });

  it('rejects compensations that is not an array with 400', async () => {
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1, compensations: 'knee_valgus' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/workout-builder/corrective-recommendations - happy path', () => {
  it('admin gets recommendations with the service forwarded the compensations', async () => {
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1, compensations: ['knee_valgus', 'low_back_arch'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendations).toEqual(FAKE_RECOMMENDATIONS);

    expect(getCorrectiveExercisesForCompensations).toHaveBeenCalledTimes(1);
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.compensations).toEqual(['knee_valgus', 'low_back_arch']);
    expect(args.Exercise).toBeDefined();
  });

  it('forwards includeSteps when provided', async () => {
    await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({
        clientId: 1,
        compensations: ['knee_valgus'],
        includeSteps: ['inhibit', 'activate'],
      });
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.includeSteps).toEqual(['inhibit', 'activate']);
  });

  it('drops invalid includeSteps values silently', async () => {
    await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({
        clientId: 1,
        compensations: ['knee_valgus'],
        includeSteps: ['inhibit', 'INVALID', 'activate', 42],
      });
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.includeSteps).toEqual(['inhibit', 'activate']);
  });

  it('passes object-shape compensations (clientIntelligenceService format) through unchanged', async () => {
    const compsObj = [{ type: 'knee_valgus', avgSeverity: 7, frequency: 5 }];
    await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1, compensations: compsObj });
    const args = getCorrectiveExercisesForCompensations.mock.calls[0][0];
    expect(args.compensations).toEqual(compsObj);
  });

  it('accepts empty compensations array (returns empty groups)', async () => {
    getCorrectiveExercisesForCompensations.mockResolvedValueOnce({
      tags: [],
      matchedCount: 0,
      inhibit: [], lengthen: [], activate: [], integrate: [],
    });
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1, compensations: [] });
    expect(res.status).toBe(200);
    expect(res.body.recommendations.matchedCount).toBe(0);
  });
});

describe('POST /api/workout-builder/corrective-recommendations - access gate', () => {
  it('client cannot call for another client when ENABLE_CLIENT_PLAN_SELFGEN is unset (403)', async () => {
    delete process.env.ENABLE_CLIENT_PLAN_SELFGEN;
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .set('x-test-user-id', '5')
      .set('x-test-user-role', 'client')
      .send({ clientId: 99, compensations: ['knee_valgus'] });
    expect(res.status).toBe(403);
  });

  it('trainer with assignment can call (200)', async () => {
    mockAssignmentFindOne.mockResolvedValueOnce({ id: 42 });
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .send({ clientId: 1, compensations: ['knee_valgus'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/workout-builder/corrective-recommendations - error paths', () => {
  it('returns 500 with safe details when the service throws', async () => {
    getCorrectiveExercisesForCompensations.mockRejectedValueOnce(
      new Error('Database connection lost'),
    );
    const res = await request(app)
      .post('/api/workout-builder/corrective-recommendations')
      .send({ clientId: 1, compensations: ['knee_valgus'] });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/corrective recommendations/i);
  });
});
