/**
 * commandExecutorStrictOutcome.test.mjs
 * ======================================
 * Classification and registry failures must never become conversational chat.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };

async function loadPipeline(intent) {
  vi.resetModules();
  const classifyIntent = vi.fn(async () => intent);

  vi.doMock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent }));
  vi.doMock('../../services/ai/clientResolver.mjs', () => ({
    resolveClient: vi.fn(),
  }));
  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    dispatch: vi.fn(),
    hasDispatcher: vi.fn(() => false),
  }));

  const registry = await import('../../services/ai/commandRegistry/index.mjs');
  registry.initializeRegistry();
  return import('../../services/ai/commandExecutor.mjs');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('command executor strict outcomes', () => {
  it('short-circuits a classifier parse failure with a typed no-change outcome', async () => {
    const { executeCommandPipeline } = await loadPipeline({
      intent: 'classification_error',
      clientRef: null,
      params: { code: 'PARSE_FAIL' },
      confidence: 0,
    });

    const ctx = await executeCommandPipeline('rearrange this workout', adminUser, {
      routeContext: { surface: 'workout-planner' },
      sequelize: {},
    });

    expect(ctx.intent.intent).toBe('classification_error');
    expect(ctx.error).toMatch(/could not safely interpret/i);
    expect(ctx.result).toEqual({
      type: 'error',
      code: 'PARSE_FAIL',
      message: 'Swan Coach could not safely interpret that request. No data was changed.',
    });
  });

  it('returns UNKNOWN_INTENT rather than rewriting an unregistered intent to chat', async () => {
    const { executeCommandPipeline } = await loadPipeline({
      intent: 'model_invented_command',
      clientRef: null,
      params: {},
      confidence: 0.99,
    });

    const ctx = await executeCommandPipeline('invent a command', adminUser, { sequelize: {} });

    expect(ctx.intent.intent).toBe('model_invented_command');
    expect(ctx.error).toMatch(/did not match a registered/i);
    expect(ctx.result).toEqual({
      type: 'error',
      code: 'UNKNOWN_INTENT',
      message: 'That request did not match a registered Swan Coach command. No data was changed.',
    });
  });
});
