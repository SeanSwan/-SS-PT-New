/**
 * Trainer command registry source contracts
 * =========================================
 * Locks trainer-management command metadata to mounted backend routes so Swan
 * Coach does not promise stale /api/sessions paths for assignment truth.
 */
import { describe, expect, it } from 'vitest';
import trainerCommands from '../../services/ai/commandRegistry/trainerCommands.mjs';

const byType = (type) => trainerCommands.find((command) => command.type === type);

describe('trainer command registry contracts', () => {
  it('preserves list_trainers roster filters through schema validation', () => {
    const parsed = byType('list_trainers').inputSchema.parse({
      includeAdmin: true,
      limit: 20,
      page: 2,
    });

    expect(parsed).toEqual({
      includeAdmin: true,
      limit: 20,
      page: 2,
    });
  });

  it('points promote_to_trainer at the canonical admin user role-update route', () => {
    const promoteCommand = byType('promote_to_trainer');
    const parsed = promoteCommand.inputSchema.parse({
      userId: 88,
      newRole: 'trainer',
    });

    expect(promoteCommand).toMatchObject({
      method: 'PUT',
      endpoint: '/api/admin/users/:id',
      destructive: true,
      requiresConfirmation: true,
    });
    expect(parsed).toEqual({
      userId: 88,
      newRole: 'trainer',
    });
    expect(() => promoteCommand.inputSchema.parse({
      userId: 88,
      newRole: 'admin',
    })).toThrow();
  });

  it('points view_trainer_clients at the canonical assignment route', () => {
    expect(byType('view_trainer_clients')).toMatchObject({
      method: 'GET',
      endpoint: '/api/client-trainer-assignments/trainer/:trainerId',
      destructive: false,
      requiresConfirmation: false,
    });
  });

  it('points assign_client_to_trainer at the canonical assignment write route', () => {
    const assignCommand = byType('assign_client_to_trainer');
    const parsed = assignCommand.inputSchema.parse({
      clientId: 42,
      trainerId: 7,
      notes: 'Move client to primary trainer board',
    });

    expect(assignCommand).toMatchObject({
      method: 'POST',
      endpoint: '/api/assignments',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(parsed).toEqual({
      clientId: 42,
      trainerId: 7,
      notes: 'Move client to primary trainer board',
    });
  });

  it('points set_trainer_permissions at the canonical grant route', () => {
    const permissionsCommand = byType('set_trainer_permissions');
    const parsed = permissionsCommand.inputSchema.parse({
      trainerId: 7,
      permissions: ['edit_workouts', 'view_progress'],
      reason: 'Temporary intake coverage',
    });

    expect(permissionsCommand).toMatchObject({
      method: 'POST',
      endpoint: '/api/trainer-permissions/grant',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(parsed).toEqual({
      trainerId: 7,
      permissions: ['edit_workouts', 'view_progress'],
      reason: 'Temporary intake coverage',
    });
  });

  it('points revoke_trainer_permission at the canonical revoke route', () => {
    const revokeCommand = byType('revoke_trainer_permission');
    const parsed = revokeCommand.inputSchema.parse({
      permissionId: 8801,
      reason: 'Coverage period ended',
    });

    expect(revokeCommand).toMatchObject({
      method: 'PUT',
      endpoint: '/api/trainer-permissions/:permissionId/revoke',
      destructive: true,
      requiresConfirmation: true,
    });
    expect(parsed).toEqual({
      permissionId: 8801,
      reason: 'Coverage period ended',
    });
  });
});
