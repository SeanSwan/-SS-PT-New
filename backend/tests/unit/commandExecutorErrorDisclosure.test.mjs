import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const adminUser = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };
const commandExecutorSource = readFileSync(
  resolve(__dirname, '../../services/ai/commandExecutor.mjs'),
  'utf8'
);

async function loadHarnessWithThrowingDispatcher() {
  vi.resetModules();

  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    hasDispatcher: vi.fn(() => true),
    dispatch: vi.fn(async () => {
      throw new Error('database host and schema leaked from dispatcher');
    }),
  }));

  const destructiveOperations = await import('../../services/ai/destructiveOperations.mjs');
  const commandExecutor = await import('../../services/ai/commandExecutor.mjs');
  // Production always has an initialized registry: aiCommandRoutes.mjs calls
  // initializeRegistry() at module load, in the same module that serves /confirm. The
  // confirm lane re-checks the caller's role against the registry at redemption, so a
  // harness that resets modules and skips this models a state the server never reaches.
  const registry = await import('../../services/ai/commandRegistry/index.mjs');
  registry.initializeRegistry();


  return {
    ...destructiveOperations,
    ...commandExecutor,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('command executor client-safe error disclosure', () => {
  it('does not expose dispatcher exception details in confirmed operation results', async () => {
    const { preparePendingConfirmation, executeConfirmedOperation } =
      await loadHarnessWithThrowingDispatcher();

    const pending = preparePendingConfirmation({
      commandType: 'log_workout',
      params: { clientId: 42, title: 'Upper body' },
      clientId: 42,
      userId: adminUser.id,
      description: 'Log workout for Client #42',
    });

    const result = await executeConfirmedOperation(pending.operationId, adminUser, {});

    expect(result).toMatchObject({
      success: false,
      type: 'error',
      message: 'Swan Coach could not complete that confirmed operation. No data was changed.',
    });
    expect(result.message).not.toContain('database host');
    expect(result.message).not.toContain('schema');
  });

  it('keeps pipeline and confirm catch blocks off raw err.message user copy', () => {
    expect(commandExecutorSource).toContain("const COMMAND_PIPELINE_FAILED_MESSAGE = 'Swan Coach command lane failed. No data was changed.';");
    expect(commandExecutorSource).toContain("const COMMAND_CONFIRM_FAILED_MESSAGE = 'Swan Coach could not complete that confirmed operation. No data was changed.';");
    expect(commandExecutorSource).not.toContain('ctx.error = `Internal error during ${ctx.stage}: ${err.message}`;');
    expect(commandExecutorSource).not.toContain("message: err.message || 'Execution failed. Please try again.'");
    expect(commandExecutorSource).not.toContain("message: err.message || 'Execution failed.'");
  });
});
