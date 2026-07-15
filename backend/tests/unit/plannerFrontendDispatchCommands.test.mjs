/**
 * Planner FRONTEND_DISPATCH commands — blueprint dictation-planner-logger S2.
 * Proves: the five planner_* registry entries, the deterministic surface
 * remap (planner dock ↔ logger family, pinned BOTH ways), a full REAL
 * pipeline round-trip through the route (only the LLM classifier is mocked),
 * and the standard role-denied envelope for client callers.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClassifyIntent, mockUser } = vi.hoisted(() => ({
  mockClassifyIntent: vi.fn(),
  mockUser: { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { ...mockUser };
    next();
  },
}));

vi.mock('../../database.mjs', () => ({
  default: {},
}));

vi.mock('../../services/ai/intentClassifier.mjs', () => ({
  classifyIntent: mockClassifyIntent,
}));

// FRONTEND_DISPATCH never reaches the dispatcher; mocking it keeps the heavy
// model/service import chain (sequelize model init) out of this unit suite.
vi.mock('../../services/ai/commandDispatcher.mjs', () => ({
  dispatch: vi.fn(async () => null),
  hasDispatcher: vi.fn(() => false),
}));

const aiCommandRoutes = (await import('../../routes/aiCommandRoutes.mjs')).default;
const { getCommand } = await import('../../services/ai/commandRegistry/index.mjs');
const { applySurfaceIntentRemap } = await import('../../services/ai/surfaceIntentRemap.mjs');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

const intent = (type, params = {}) => ({ intent: type, clientRef: null, params, confidence: 0.95 });

const PLANNER_COMMANDS = [
  { type: 'planner_add_exercise', event: 'AI_PLANNER_ADD_EXERCISE', phrase: 'add goblet squats to the plan, three sets of twelve', params: { exerciseName: 'Goblet Squat', sets: 3, reps: 12 } },
  { type: 'planner_swap_exercise', event: 'AI_PLANNER_SWAP_EXERCISE', phrase: 'swap leg press for box squat', params: { fromExerciseName: 'Leg Press', toExerciseName: 'Box Squat' } },
  { type: 'planner_remove_exercise', event: 'AI_PLANNER_REMOVE_EXERCISE', phrase: 'remove leg press from the plan', params: { exerciseName: 'Leg Press' } },
  { type: 'planner_update_exercise', event: 'AI_PLANNER_UPDATE_EXERCISE', phrase: 'make box squat two sets', params: { exerciseName: 'Box Squat', sets: 2 } },
  { type: 'planner_generate_workout', event: 'AI_PLANNER_GENERATE', phrase: 'give me a leg day for this client', params: { category: 'legs' } },
];

describe('planner FRONTEND_DISPATCH commands (blueprint S2)', () => {
  beforeEach(() => {
    mockClassifyIntent.mockReset();
    mockUser.role = 'admin';
  });

  it('registers all five planner commands as admin/trainer-only frontend dispatches', () => {
    for (const { type, event } of PLANNER_COMMANDS) {
      const command = getCommand(type);
      expect(command, `${type} missing from registry`).toBeTruthy();
      expect(command.method).toBe('FRONTEND_DISPATCH');
      expect(command.frontendEvent).toBe(event);
      expect(command.requiresConfirmation).toBe(false);
      expect(command.destructive).toBe(false);
      expect(command.roleRequired).toEqual(['admin', 'trainer']);
      expect(command.roleRequired).not.toContain('client');
    }
  });

  it('remaps logger twins to the planner family on the workout-planner surface', () => {
    const add = applySurfaceIntentRemap(intent('add_exercise_to_form', { exerciseName: 'Goblet Squat' }), { surface: 'workout-planner' });
    expect(add.intent).toBe('planner_add_exercise');
    expect(add.params).toEqual({ exerciseName: 'Goblet Squat' });
    const update = applySurfaceIntentRemap(intent('update_set_data', { exerciseName: 'Leg Press', sets: 2 }), { surface: 'workout-planner' });
    expect(update.intent).toBe('planner_update_exercise');
  });

  it('remaps planner twins back to the logger family on the workout-logger surface', () => {
    const add = applySurfaceIntentRemap(intent('planner_add_exercise', { exerciseName: 'Goblet Squat' }), { surface: 'workout-logger' });
    expect(add.intent).toBe('add_exercise_to_form');
    const update = applySurfaceIntentRemap(intent('planner_update_exercise', { exerciseName: 'Leg Press' }), { surface: 'workout-logger' });
    expect(update.intent).toBe('update_set_data');
  });

  it('leaves intents untouched for foreign or missing surfaces and chat intents', () => {
    const foreign = applySurfaceIntentRemap(intent('add_exercise_to_form'), { surface: 'client-training-command-bar' });
    expect(foreign.intent).toBe('add_exercise_to_form');
    const noSurface = applySurfaceIntentRemap(intent('add_exercise_to_form'), null);
    expect(noSurface.intent).toBe('add_exercise_to_form');
    const chat = applySurfaceIntentRemap(intent('chat'), { surface: 'workout-planner' });
    expect(chat.intent).toBe('chat');
  });

  for (const { type, event, phrase, params } of PLANNER_COMMANDS) {
    it(`round-trips "${phrase}" through the REAL pipeline to a ${event} dispatch`, async () => {
      mockClassifyIntent.mockResolvedValue(intent(type, params));

      const response = await request(makeApp())
        .post('/api/ai-command/execute')
        .send({ message: phrase, routeContext: { surface: 'workout-planner' } })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        type: 'frontend_dispatch',
        command: type,
        event,
        payload: params,
        fallbackToChat: false,
      });
    });
  }

  it('coerces LLM string numerics — "sets":"3" reaches the payload as the number 3 (prod incident 2026-07-15)', async () => {
    // Live-prod QA caught Gemini emitting {"sets":"3","reps":"12"} as strings;
    // bare z.number() rejected them with "Expected number, received string".
    mockClassifyIntent.mockResolvedValue(intent('planner_add_exercise', { exerciseName: 'Goblet Squat', sets: '3', reps: '12' }));

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'add goblet squats, three sets of twelve', routeContext: { surface: 'workout-planner' } })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'planner_add_exercise',
      payload: { exerciseName: 'Goblet Squat', sets: 3 },
    });
  });

  it('disambiguates "add goblet squat" to the PLANNER family when the planner surface is active', async () => {
    // The LLM classifier picks the logger command; the surface remap must win.
    mockClassifyIntent.mockResolvedValue(intent('add_exercise_to_form', { exerciseName: 'Goblet Squat' }));

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'add goblet squat', routeContext: { surface: 'workout-planner' } })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'planner_add_exercise',
      event: 'AI_PLANNER_ADD_EXERCISE',
    });
    expect(response.body.payload.exerciseName).toBe('Goblet Squat');
  });

  it('disambiguates "add goblet squat" to the LOGGER family when the logger surface is active', async () => {
    mockClassifyIntent.mockResolvedValue(intent('planner_add_exercise', { exerciseName: 'Goblet Squat' }));

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'add goblet squat', routeContext: { surface: 'workout-logger' } })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      event: 'AI_ADD_EXERCISE',
    });
    expect(response.body.payload.exerciseName).toBe('Goblet Squat');
  });

  it('returns the standard role-denied envelope for client callers of planner_* commands', async () => {
    mockUser.role = 'client';
    mockClassifyIntent.mockResolvedValue(intent('planner_swap_exercise', { fromExerciseName: 'Leg Press', toExerciseName: 'Box Squat' }));

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'swap leg press for box squat', routeContext: { surface: 'workout-planner' } })
      .expect(200);

    expect(response.body).toMatchObject({ success: false, type: 'error', stage: 'rbac' });
    expect(response.body.error).toMatch(/don't have permission/i);
    expect(response.body.error).toMatch(/admin or trainer/i);
  });
});
