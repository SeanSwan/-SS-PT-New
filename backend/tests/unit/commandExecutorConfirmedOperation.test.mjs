import { afterEach, describe, expect, it, vi } from 'vitest';

const adminUser = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };

async function loadConfirmedOperationHarness({ hasDispatcher = false, dispatchResult = null } = {}) {
  vi.resetModules();

  const dispatch = vi.fn(async () => dispatchResult);
  const hasDispatcherMock = vi.fn(() => hasDispatcher);

  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    dispatch,
    hasDispatcher: hasDispatcherMock,
  }));

  const destructiveOperations = await import('../../services/ai/destructiveOperations.mjs');
  const commandExecutor = await import('../../services/ai/commandExecutor.mjs');

  return {
    ...destructiveOperations,
    ...commandExecutor,
    dispatch,
    hasDispatcher: hasDispatcherMock,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('command executor confirmed operation guard', () => {
  it('does not report success for pending confirmations whose dispatcher is missing', async () => {
    const { preparePendingConfirmation, executeConfirmedOperation, dispatch } =
      await loadConfirmedOperationHarness({ hasDispatcher: false });

    const pending = preparePendingConfirmation({
      commandType: 'future_confirmed_command',
      params: { clientId: 42 },
      clientId: 42,
      userId: adminUser.id,
      description: 'Future confirmed command',
    });

    const result = await executeConfirmedOperation(pending.operationId, adminUser, {});

    expect(dispatch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      type: 'not_wired',
      command: 'future_confirmed_command',
      client: { id: 42 },
    });
  });

  it('returns a frontend dispatch receipt for confirmed browser-side commands', async () => {
    const { preparePendingConfirmation, executeConfirmedOperation, dispatch } =
      await loadConfirmedOperationHarness({ hasDispatcher: false });

    const pending = preparePendingConfirmation({
      commandType: 'submit_workout_form',
      params: { intensity: 8, notes: 'Strong finish' },
      clientId: 42,
      userId: adminUser.id,
      description: 'Submit the current workout form',
      frontendEvent: 'AI_SUBMIT_WORKOUT',
    });

    const result = await executeConfirmedOperation(pending.operationId, adminUser, {});

    expect(dispatch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'submit_workout_form',
      event: 'AI_SUBMIT_WORKOUT',
      payload: { intensity: 8, notes: 'Strong finish' },
      client: { id: 42 },
    });
  });
});
