/**
 * Trainer permission command dispatcher contracts
 * ==============================================
 * Locks Swan Coach permission grants to active trainer rows and flat receipts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  trainer = { id: 7, role: 'trainer', email: 'hidden.trainer@example.com' },
  existingPermissions = [],
  createdPermission = { id: 8801 },
  permission = null,
} = {}) {
  vi.resetModules();

  const permissionRow = permission
    ? {
        ...permission,
        update: permission.update || vi.fn(async (payload) => ({ ...permission, ...payload })),
      }
    : null;
  const User = {
    findOne: vi.fn(async () => trainer),
    findAndCountAll: vi.fn(async () => ({ count: 0, rows: [] })),
  };
  const ClientTrainerAssignment = {
    findAll: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    update: vi.fn(async () => [0]),
    findByPk: vi.fn(async () => null),
  };
  const queuedExistingPermissions = [...existingPermissions];
  const TrainerPermissions = {
    findOne: vi.fn(async () => queuedExistingPermissions.shift() ?? null),
    create: vi.fn(async (payload) => ({ ...createdPermission, ...payload })),
    findByPk: vi.fn(async () => permissionRow),
  };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User, ClientTrainerAssignment, TrainerPermissions }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    User,
    TrainerPermissions,
    permissionRow,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('trainer permission command dispatchers', () => {
  it('grants trainer permissions without leaking trainer PII', async () => {
    const { dispatch, hasDispatcher, User, TrainerPermissions } = await loadDispatcher({
      existingPermissions: [
        null,
        { id: 4402, trainerId: 7, permissionType: 'view_progress', isActive: true },
      ],
    });

    expect(hasDispatcher('set_trainer_permissions')).toBe(true);

    const result = await dispatch('set_trainer_permissions', {
      trainerId: 7,
      permissions: ['edit_workouts', 'view_progress'],
      reason: 'Temporary intake coverage',
    }, {
      user: { id: 1, role: 'admin', email: 'admin@example.com' },
    });

    expect(User.findOne).toHaveBeenCalledWith({
      where: { id: 7, role: 'trainer' },
      attributes: ['id', 'role'],
    });
    expect(TrainerPermissions.findOne).toHaveBeenCalledTimes(2);
    expect(TrainerPermissions.create).toHaveBeenCalledWith(expect.objectContaining({
      trainerId: 7,
      permissionType: 'edit_workouts',
      grantedBy: 1,
      isActive: true,
      // `notes` is the real trainer_permissions audit column; the drifted `reason`
      // column never existed in the DB (schema verified 2026-07-29, rule 58).
      notes: 'Temporary intake coverage',
    }));
    expect(TrainerPermissions.create.mock.calls[0][0]).not.toHaveProperty('reason');
    expect(result).toEqual({
      trainerId: 7,
      trainerFound: true,
      requestedPermissionCount: 2,
      grantedPermissionCount: 1,
      skippedExistingCount: 1,
      criticalPermissionCount: 1,
      firstGrantedPermissionId: 8801,
    });
    expect(JSON.stringify(result)).not.toContain('hidden.trainer@example.com');
    expect(JSON.stringify(result)).not.toContain('admin@example.com');
  });

  it('revokes trainer permissions through model-backed lifecycle fields only', async () => {
    const { dispatch, hasDispatcher, TrainerPermissions, permissionRow } = await loadDispatcher({
      permission: {
        id: 9901,
        trainerId: 7,
        permissionType: 'edit_workouts',
        isActive: true,
        reason: 'Original coverage',
      },
    });

    expect(hasDispatcher('revoke_trainer_permission')).toBe(true);

    const result = await dispatch('revoke_trainer_permission', {
      permissionId: 9901,
      reason: 'Scope changed',
    }, {
      user: { id: 1, role: 'admin', email: 'admin@example.com' },
    });

    expect(TrainerPermissions.findByPk).toHaveBeenCalledWith(9901);
    // Real lifecycle columns are revokedAt + notes; the revoking admin is preserved inside
    // the notes text because the table has no revoked-by column. The previously asserted
    // deactivatedAt/deactivatedBy/reason fields never existed in the DB (rule 58).
    expect(permissionRow.update).toHaveBeenCalledWith(expect.objectContaining({
      isActive: false,
      notes: 'Scope changed (revoked by admin 1)',
    }));
    expect(permissionRow.update.mock.calls[0][0].revokedAt).toBeInstanceOf(Date);
    expect(permissionRow.update.mock.calls[0][0]).not.toHaveProperty('deactivatedAt');
    expect(permissionRow.update.mock.calls[0][0]).not.toHaveProperty('deactivatedBy');
    expect(permissionRow.update.mock.calls[0][0]).not.toHaveProperty('reason');
    expect(result).toEqual({
      permissionId: 9901,
      permissionFound: true,
      revoked: true,
      trainerId: 7,
      permissionType: 'edit_workouts',
      deactivatedBy: 1,
    });
    expect(JSON.stringify(result)).not.toContain('admin@example.com');
  });
});
