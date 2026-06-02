/**
 * Client update command dispatcher contracts
 * ==========================================
 * Locks Coach profile updates to the same field whitelist as the mounted admin
 * client update route while returning only a flat PII-safe receipt.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ clientRecord = null } = {}) {
  vi.resetModules();

  const update = vi.fn(async () => clientRecord);
  const findOne = vi.fn(async () => clientRecord ? { ...clientRecord, update } : null);
  const User = { findOne };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return { ...dispatcher, findOne, update };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('client update command dispatcher', () => {
  it('updates only canonical profile fields and returns no client PII', async () => {
    const transaction = {
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
    };
    const sequelize = { transaction: vi.fn(async () => transaction) };
    const { dispatch, hasDispatcher, findOne, update } = await loadDispatcher({
      clientRecord: {
        id: 42,
        role: 'client',
        firstName: 'Hidden',
        email: 'hidden@example.test',
      },
    });

    expect(hasDispatcher('update_client')).toBe(true);

    const result = await dispatch('update_client', {
      clientId: 42,
      phone: '555-0100',
      fitnessGoal: 'Build strength without knee pain',
      clientSource: 'move_fitness',
      canGenerateWorkoutPlans: 'true',
      email: 'should-not-update@example.test',
      password: 'nope',
      isActive: false,
    }, {
      user: { id: 1, role: 'admin' },
      options: { sequelize },
    });

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 42, role: 'client' },
      transaction,
    });
    expect(update).toHaveBeenCalledWith({
      phone: '555-0100',
      fitnessGoal: 'Build strength without knee pain',
      clientSource: 'move_fitness',
      canGenerateWorkoutPlans: true,
    }, { transaction });
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({
      clientId: 42,
      found: true,
      updated: true,
      updatedFields: ['canGenerateWorkoutPlans', 'clientSource', 'fitnessGoal', 'phone'],
      clientSourceChanged: true,
      accountStatusChanged: false,
      isLockedChanged: false,
      canGenerateWorkoutPlansChanged: true,
    });
    expect(JSON.stringify(result)).not.toContain('Hidden');
    expect(JSON.stringify(result)).not.toContain('hidden@example.test');
    expect(JSON.stringify(update.mock.calls[0][0])).not.toContain('email');
    expect(JSON.stringify(update.mock.calls[0][0])).not.toContain('password');
    expect(JSON.stringify(update.mock.calls[0][0])).not.toContain('isActive');
  });

  it('returns a no-op receipt when the client is missing or no safe fields exist', async () => {
    const transaction = {
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
    };
    const sequelize = { transaction: vi.fn(async () => transaction) };
    const { dispatch, findOne, update } = await loadDispatcher();

    const missingResult = await dispatch('update_client', {
      clientId: 77,
      phone: '555-0111',
    }, {
      user: { id: 1, role: 'admin' },
      options: { sequelize },
    });

    expect(missingResult).toEqual({
      clientId: 77,
      found: false,
      updated: false,
      updatedFields: [],
      clientSourceChanged: false,
      accountStatusChanged: false,
      isLockedChanged: false,
      canGenerateWorkoutPlansChanged: false,
    });
    expect(update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
    expect(findOne).toHaveBeenCalled();
  });

  it('updates the selected client when params contain stale client identity', async () => {
    const { dispatch, findOne, update } = await loadDispatcher({
      clientRecord: { id: 42, role: 'client' },
    });

    const result = await dispatch('update_client', {
      clientId: 999,
      phone: '555-0142',
    }, {
      user: { id: 1, role: 'admin' },
      resolvedClient: { id: 42 },
    });

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 42, role: 'client' },
    });
    expect(update).toHaveBeenCalledWith({ phone: '555-0142' }, {});
    expect(result).toMatchObject({ clientId: 42, found: true, updated: true });
  });
});
