/**
 * Trainer promotion command dispatcher contracts
 * ==============================================
 * Locks role-escalation commands to PII-safe admin-only receipts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher(targetUser = null) {
  vi.resetModules();

  const userFindByPk = vi.fn(async () => targetUser);
  const User = { findByPk: userFindByPk };
  const ClientTrainerAssignment = {
    findAll: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => [0]),
    findByPk: vi.fn(async () => null),
  };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User, ClientTrainerAssignment }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    userFindByPk,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('trainer promotion command dispatcher', () => {
  it('wires promote_to_trainer to admin user role updates without PII leakage', async () => {
    const targetUser = {
      id: 88,
      role: 'user',
      firstName: 'Hidden',
      email: 'hidden@example.com',
      update: vi.fn(async (payload) => {
        targetUser.role = payload.role;
        return targetUser;
      }),
    };
    const { dispatch, hasDispatcher, userFindByPk } = await loadDispatcher(targetUser);

    expect(hasDispatcher('promote_to_trainer')).toBe(true);

    const result = await dispatch('promote_to_trainer', {
      userId: 88,
      newRole: 'trainer',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(userFindByPk).toHaveBeenCalledWith(88);
    expect(targetUser.update).toHaveBeenCalledWith({ role: 'trainer' });
    expect(result).toEqual({
      userId: 88,
      targetFound: true,
      previousRole: 'user',
      role: 'trainer',
      promoted: true,
      alreadyTrainer: false,
      blocked: false,
    });
    expect(JSON.stringify(result)).not.toContain('Hidden');
    expect(JSON.stringify(result)).not.toContain('hidden@example.com');
  });

  it('blocks promote_to_trainer from demoting admin accounts', async () => {
    const targetUser = {
      id: 1,
      role: 'admin',
      update: vi.fn(async () => targetUser),
    };
    const { dispatch, userFindByPk } = await loadDispatcher(targetUser);

    const result = await dispatch('promote_to_trainer', {
      userId: 1,
      newRole: 'trainer',
    }, {
      user: { id: 2, role: 'admin' },
    });

    expect(userFindByPk).toHaveBeenCalledWith(1);
    expect(targetUser.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      userId: 1,
      targetFound: true,
      previousRole: 'admin',
      role: 'admin',
      promoted: false,
      alreadyTrainer: false,
      blocked: true,
    });
  });
});
