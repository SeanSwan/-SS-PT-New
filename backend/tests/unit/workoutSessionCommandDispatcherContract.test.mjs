/**
 * Workout session command dispatcher contracts
 * ============================================
 * Locks AI-created planned workout sessions to real WorkoutSession fields.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ createdSession = {} } = {}) {
  vi.resetModules();

  const create = vi.fn(async (payload) => ({
    id: 'session-uuid-1',
    ...payload,
    ...createdSession,
  }));
  const WorkoutSession = { create };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ WorkoutSession }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, WorkoutSession, create };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workout session command dispatchers', () => {
  it('creates a planned trainer-led session from the command lane without leaking PII', async () => {
    const { dispatch, hasDispatcher, create } = await loadDispatcher();

    expect(hasDispatcher('create_workout_session')).toBe(true);

    const result = await dispatch('create_workout_session', {
      clientId: 42,
      date: '2026-06-02',
      notes: 'Keep the shoulder-friendly warmup.',
    }, {
      user: { id: 7, role: 'trainer', email: 'trainer@example.com' },
      resolvedClient: { id: 42, email: 'client@example.com' },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const payload = create.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      userId: 42,
      title: 'Planned workout - 2026-06-02',
      duration: 0,
      notes: 'Keep the shoulder-friendly warmup.',
      status: 'planned',
      sessionType: 'trainer-led',
      trainerId: 7,
      isActive: false,
      intensity: null,
    }));
    expect(payload.date.toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(payload).not.toHaveProperty('plannedStartTime');
    expect(result).toEqual({
      sessionId: 'session-uuid-1',
      clientId: 42,
      created: true,
      status: 'planned',
      sessionType: 'trainer-led',
      trainerId: 7,
      date: '2026-06-02',
      notesStored: true,
    });
    expect(JSON.stringify(result)).not.toContain('trainer@example.com');
    expect(JSON.stringify(result)).not.toContain('client@example.com');
    expect(JSON.stringify(result)).not.toContain('shoulder-friendly');
  });
});
