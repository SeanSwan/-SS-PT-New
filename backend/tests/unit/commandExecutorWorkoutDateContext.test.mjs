import { afterEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };

async function loadPipeline() {
  vi.resetModules();

  const resolveClient = vi.fn(async () => ({
    resolved: { id: 42, firstName: 'Ava', lastName: 'Strong' },
    suggestions: [],
    error: null,
  }));
  const classifyIntent = vi.fn(async () => ({
    intent: 'log_workout',
    clientRef: null,
    params: {
      exercises: [{ name: 'Bench Press', sets: 3, reps: 10 }],
    },
    confidence: 0.99,
  }));

  vi.doMock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent }));
  vi.doMock('../../services/ai/clientResolver.mjs', () => ({ resolveClient }));
  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    dispatch: vi.fn(async () => null),
    hasDispatcher: vi.fn(() => false),
  }));

  const registry = await import('../../services/ai/commandRegistry/index.mjs');
  registry.initializeRegistry();
  const executor = await import('../../services/ai/commandExecutor.mjs');

  return { ...executor };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('command executor workout date route context', () => {
  it('merges safe workoutDate into selected-client log_workout params before confirmation', async () => {
    const { executeCommandPipeline } = await loadPipeline();

    const ctx = await executeCommandPipeline('log bench press', adminUser, {
      selectedClientId: 42,
      routeContext: {
        source: 'clients-team',
        intent: 'daily_training_command',
        surface: 'client-training-command-bar',
        workoutDate: '2026-06-09',
      },
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(ctx.intent.params).toMatchObject({
      clientId: 42,
      date: '2026-06-09',
    });
    expect(ctx.result).toMatchObject({ type: 'not_wired' });
  });
});
