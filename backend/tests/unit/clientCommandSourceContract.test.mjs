/**
 * clientCommandSourceContract.test.mjs
 * ====================================
 * Locks legacy AI client command schemas to the User.clientSource model
 * contract. New coach_action_proposal onboarding is preferred, but legacy
 * commands must not validate source values that Sequelize will reject.
 */
import { describe, expect, it } from 'vitest';
import clientCommands from '../../services/ai/commandRegistry/clientCommands.mjs';

const commandByType = (type) => clientCommands.find((command) => command.type === type);

describe('AI client command source contracts', () => {
  it('create_client accepts only canonical User.clientSource values', () => {
    const createClient = commandByType('create_client');

    expect(() => createClient.inputSchema.parse({
      firstName: 'Ava',
      lastName: 'Stone',
      email: 'ava@example.test',
      clientSource: 'swanstudios',
    })).not.toThrow();

    expect(() => createClient.inputSchema.parse({
      firstName: 'Ava',
      lastName: 'Stone',
      email: 'ava@example.test',
      clientSource: 'direct',
    })).toThrow();
  });

  it('create_external_client accepts Move Fitness or external only', () => {
    const createExternalClient = commandByType('create_external_client');

    expect(createExternalClient.inputSchema.parse({
      firstName: 'Mia',
      lastName: 'Reed',
      clientSource: 'move_fitness',
    }).clientSource).toBe('move_fitness');

    expect(() => createExternalClient.inputSchema.parse({
      firstName: 'Mia',
      lastName: 'Reed',
      clientSource: 'direct',
    })).toThrow();
  });

  it('export_client_list points at the dedicated admin export route', () => {
    const exportClientList = commandByType('export_client_list');

    expect(exportClientList.method).toBe('GET');
    expect(exportClientList.endpoint).toBe('/api/admin/clients/export');
    expect(exportClientList.inputSchema.parse({ format: 'csv' }).format).toBe('csv');
    expect(exportClientList.inputSchema.parse({
      format: 'json',
      status: 'active',
      clientSource: 'move_fitness',
    })).toEqual({
      format: 'json',
      status: 'active',
      clientSource: 'move_fitness',
    });
  });

  it('notify_client supplies the title required by the admin notification route', () => {
    const notifyClient = commandByType('notify_client');

    const parsed = notifyClient.inputSchema.parse({
      clientId: 42,
      message: 'Bring water to the next session.',
    });

    expect(notifyClient.endpoint).toBe('/api/admin/clients/:clientId/notify');
    expect(parsed.title).toBe('Coach update');
    expect(parsed.type).toBe('admin');
  });

  it('deactivate_client targets the canonical soft-delete route with explicit soft delete', () => {
    const deactivateClient = commandByType('deactivate_client');

    const parsed = deactivateClient.inputSchema.parse({ clientId: 42 });

    expect(deactivateClient.method).toBe('DELETE');
    expect(deactivateClient.endpoint).toBe('/api/admin/clients/:clientId');
    expect(parsed).toEqual({ clientId: 42, softDelete: true });
    expect(deactivateClient.destructive).toBe(true);
    expect(deactivateClient.requiresConfirmation).toBe(true);
  });

  it('lock_client targets the canonical User.isLocked field', () => {
    const lockClient = commandByType('lock_client');

    const parsed = lockClient.inputSchema.parse({ clientId: 42 });

    expect(lockClient.method).toBe('PUT');
    expect(lockClient.endpoint).toBe('/api/admin/clients/:clientId');
    expect(parsed).toEqual({ clientId: 42, isLocked: true });
    expect(lockClient.destructive).toBe(true);
    expect(lockClient.requiresConfirmation).toBe(true);
  });

  it('assign_trainer targets the canonical assignment board route without minting sessions', () => {
    const assignTrainer = commandByType('assign_trainer');

    const parsed = assignTrainer.inputSchema.parse({
      clientId: 42,
      trainerId: 7,
    });

    expect(assignTrainer.method).toBe('POST');
    expect(assignTrainer.endpoint).toBe('/api/assignments');
    expect(parsed).toEqual({
      clientId: 42,
      trainerId: 7,
      notes: 'Assigned via Swan Coach command center',
    });
    expect(assignTrainer.destructive).toBe(false);
    expect(assignTrainer.requiresConfirmation).toBe(true);
  });

  it('reset_client_password advertises the admin reset-email route only', () => {
    const resetClientPassword = commandByType('reset_client_password');

    expect(resetClientPassword.method).toBe('POST');
    expect(resetClientPassword.endpoint).toBe('/api/admin/clients/:clientId/send-password-reset');
    expect(resetClientPassword.inputSchema.parse({ clientId: 42 })).toEqual({ clientId: 42 });
    expect(resetClientPassword.destructive).toBe(false);
    expect(resetClientPassword.requiresConfirmation).toBe(true);
  });

  it('update_client mirrors the canonical admin profile update whitelist', () => {
    const updateClient = commandByType('update_client');

    const parsed = updateClient.inputSchema.parse({
      clientId: 42,
      phone: '555-0100',
      fitnessGoal: 'Build strength without knee pain',
      clientSource: 'move_fitness',
      accountStatus: 'active',
      canGenerateWorkoutPlans: 'true',
    });

    expect(updateClient.method).toBe('PUT');
    expect(updateClient.endpoint).toBe('/api/admin/clients/:clientId');
    expect(parsed).toEqual({
      clientId: 42,
      phone: '555-0100',
      fitnessGoal: 'Build strength without knee pain',
      clientSource: 'move_fitness',
      accountStatus: 'active',
      canGenerateWorkoutPlans: true,
    });
    expect(() => updateClient.inputSchema.parse({
      clientId: 42,
      email: 'new@example.test',
    })).toThrow();
    expect(() => updateClient.inputSchema.parse({ clientId: 42 })).toThrow();
  });
});
