import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adminUser = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };
const clientUser = { id: 42, role: 'client', firstName: 'Ava', lastName: 'Strong' };
const rawUser = { id: 42, role: 'user', firstName: 'Ava', lastName: 'Strong' };

async function loadPipeline({
  intent,
  resolvedClient = { id: 42, firstName: 'Ava', lastName: 'Strong' },
  hasDispatcher = () => false,
  dispatch = async () => null,
}) {
  vi.resetModules();

  const resolveClient = vi.fn(async () => ({
    resolved: resolvedClient,
    suggestions: [],
    error: null,
  }));
  const classifyIntent = vi.fn(async () => intent);

  vi.doMock('../../services/ai/intentClassifier.mjs', () => ({
    classifyIntent,
  }));
  vi.doMock('../../services/ai/clientResolver.mjs', () => ({
    resolveClient,
  }));
  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    dispatch: vi.fn(dispatch),
    hasDispatcher: vi.fn(hasDispatcher),
  }));

  const registry = await import('../../services/ai/commandRegistry/index.mjs');
  registry.initializeRegistry();
  const executor = await import('../../services/ai/commandExecutor.mjs');

  return { ...executor, resolveClient, classifyIntent };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('command executor client reference validation', () => {
  it('does not reject a selected-client onboarding command before client resolution', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'start_onboarding',
        params: {},
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('start onboarding', adminUser, {
      selectedClientId: 42,
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(ctx.intent.params.clientId).toBe(42);
    expect(resolveClient).toHaveBeenCalledWith('#42', {}, expect.any(Object));
    expect(ctx.result).toMatchObject({ type: 'not_wired', command: 'start_onboarding' });
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('does not resolve malformed selected-client ids from service callers', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'start_onboarding',
        params: {},
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('start onboarding', adminUser, {
      selectedClientId: '42junk',
      sequelize: {},
    });

    expect(resolveClient).not.toHaveBeenCalled();
    expect(String(ctx.error ?? '')).toMatch(/which client/i);
  });

  it('passes route context into command intent classification without client identity', async () => {
    const { executeCommandPipeline, classifyIntent } = await loadPipeline({
      intent: {
        intent: 'chat',
        clientRef: null,
        params: {},
        confidence: 1,
      },
    });

    const ctx = await executeCommandPipeline('we did squats 3 sets of 10', adminUser, {
      selectedClientId: 42,
      routeContext: {
        source: 'clients-team',
        intent: 'daily_training_command',
        surface: 'client-training-command-bar',
      },
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(classifyIntent).toHaveBeenCalledWith(
      'we did squats 3 sets of 10',
      'admin',
      expect.objectContaining({
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
        },
      }),
    );
  });

  it('merges safe scheduled-session route context into log-workout validation params', async () => {
    const { executeCommandPipeline } = await loadPipeline({
      intent: {
        intent: 'log_workout',
        clientRef: null,
        params: {
          exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
        },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('log booked squats', adminUser, {
      selectedClientId: 42,
      routeContext: {
        source: 'coach-command-center',
        intent: 'log_workout',
        scheduledSessionId: '777',
        scheduledSessionDate: '2026-06-07',
        scheduledSessionCredits: 2,
      },
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(ctx.intent.params).toMatchObject({
      clientId: 42,
      scheduledSessionId: '777',
      date: '2026-06-07',
    });
    expect(ctx.intent.params).not.toHaveProperty('scheduledSessionCredits');
  });

  it('does not require a numeric clientId before resolving a spoken client name', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'start_onboarding',
        clientRef: 'Ava Strong',
        params: {},
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('start onboarding for Ava Strong', adminUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).toHaveBeenCalledWith('Ava Strong', {}, expect.any(Object));
    expect(ctx.intent.params.clientId).toBe(42);
    expect(ctx.result).toMatchObject({ type: 'not_wired', command: 'start_onboarding' });
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('keeps the selected client authoritative when classifier output carries stale client identity', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'view_workout_history',
        clientRef: 'Wrong Client',
        params: { clientId: 999, limit: 3 },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('show workout history', adminUser, {
      selectedClientId: 42,
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).toHaveBeenCalledWith('#42', {}, expect.any(Object));
    expect(ctx.intent.params.clientId).toBe(42);
    expect(ctx.result).toMatchObject({ type: 'not_wired' });
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('prepares a real confirmation before sending a client password reset link', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'reset_client_password',
        clientRef: 'Ava Strong',
        params: {},
        confidence: 0.99,
      },
      hasDispatcher: (commandType) => commandType === 'reset_client_password',
    });

    const ctx = await executeCommandPipeline('reset Ava Strong password', adminUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).toHaveBeenCalledWith('Ava Strong', {}, expect.any(Object));
    expect(ctx.command?.type).toBe('reset_client_password');
    expect(ctx.result).toMatchObject({
      type: 'confirmation_required',
      command: 'reset_client_password',
      operationId: expect.any(String),
      expiresAt: expect.any(String),
      isDestructive: false,
    });
    expect(ctx.result.message).toMatch(/send a secure password reset email/i);
  });

  it('executes the confirmed password reset email without passing a new password', async () => {
    const dispatch = vi.fn(async () => ({ credentialAction: 'password_reset_email' }));
    const { executeCommandPipeline, executeConfirmedOperation } = await loadPipeline({
      intent: {
        intent: 'reset_client_password',
        clientRef: 'Ava Strong',
        params: {},
        confidence: 0.99,
      },
      hasDispatcher: (commandType) => commandType === 'reset_client_password',
      dispatch,
    });

    const ctx = await executeCommandPipeline('send password reset to Ava Strong', adminUser, {
      sequelize: {},
    });
    const confirmed = await executeConfirmedOperation(ctx.result.operationId, adminUser, {});

    expect(confirmed).toMatchObject({
      success: true,
      type: 'executed',
      command: 'reset_client_password',
    });
    expect(dispatch).toHaveBeenCalledWith(
      'reset_client_password',
      { clientId: 42 },
      expect.objectContaining({ user: adminUser }),
    );
    expect(JSON.stringify(dispatch.mock.calls[0][1])).not.toMatch(/newPassword|password/i);
  });

  it('classifies user-level posting bans as manual-only when no canonical ban surface exists', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'block_user_posting',
        params: { userId: 88, blocked: true },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('block user 88 from posting', adminUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
    expect(ctx.command?.type).toBe('block_user_posting');
    expect(ctx.pendingOperation).toBeNull();
    expect(ctx.result).toMatchObject({
      type: 'not_wired',
      command: 'block_user_posting',
      manualOnly: true,
    });
    expect(ctx.result.reason).toMatch(/canonical route or model field/i);
    expect(ctx.result.message).toMatch(/manual admin workflow/i);
  });

  it('classifies AI Village runs as manual-only pending explicit Sean approval', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'run_ai_village',
        params: { staged: true },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('run ai village validation on staged files', adminUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
    expect(ctx.command?.type).toBe('run_ai_village');
    expect(ctx.pendingOperation).toBeNull();
    expect(ctx.result).toMatchObject({
      type: 'not_wired',
      command: 'run_ai_village',
      manualOnly: true,
    });
    expect(ctx.result.reason).toMatch(/explicit Sean approval/i);
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('classifies NASM level updates as manual-only until phase mapping exists', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'update_nasm_level',
        params: { category: 'coreLevel', level: 3 },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('advance selected client core to phase 3', adminUser, {
      selectedClientId: 42,
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).toHaveBeenCalledWith('#42', {}, expect.any(Object));
    expect(ctx.command?.type).toBe('update_nasm_level');
    expect(ctx.pendingOperation).toBeNull();
    expect(ctx.result).toMatchObject({
      type: 'not_wired',
      command: 'update_nasm_level',
      manualOnly: true,
    });
    expect(ctx.result.reason).toMatch(/1-5 NASM phase/i);
    expect(ctx.result.reason).toMatch(/0-1000/i);
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('prepares workout form submit as a confirmed frontend dispatch', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'submit_workout_form',
        params: { intensity: 7 },
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('submit this workout', adminUser, {
      sequelize: {},
      contextEnvelope: {
        schemaVersion: '1.0',
        contextStatus: 'READY',
        surfaceId: 'workout-logger',
        actor: { id: adminUser.id, role: adminUser.role },
        capabilities: ['conversation', 'workout-form:mutate'],
      },
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
    expect(ctx.command?.type).toBe('submit_workout_form');
    expect(ctx.result).toMatchObject({
      type: 'confirmation_required',
      command: 'submit_workout_form',
      operationId: expect.any(String),
    });
    expect(ctx.result.message).toMatch(/confirm/i);
  });

  it('classifies client photo uploads as manual-only because AI text cannot provide a browser file', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'upload_client_photo',
        params: {},
        confidence: 0.99,
      },
    });

    const ctx = await executeCommandPipeline('upload a photo for selected client', adminUser, {
      selectedClientId: 42,
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).toHaveBeenCalledWith('#42', {}, expect.any(Object));
    expect(ctx.command?.type).toBe('upload_client_photo');
    expect(ctx.pendingOperation).toBeNull();
    expect(ctx.result).toMatchObject({
      type: 'not_wired',
      command: 'upload_client_photo',
      manualOnly: true,
    });
    expect(ctx.result.reason).toMatch(/browser file selection/i);
    expect(ctx.result.message).toMatch(/no data was changed/i);
  });

  it('prepares client plan adjustment requests as confirmed client-note queue writes', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'request_plan_adjustment',
        params: { reason: 'My knee hurts when I squat.' },
        confidence: 0.99,
      },
      hasDispatcher: (commandType) => commandType === 'request_plan_adjustment',
    });

    const ctx = await executeCommandPipeline('request a plan adjustment', clientUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
    expect(ctx.command?.type).toBe('request_plan_adjustment');
    expect(ctx.result).toMatchObject({
      type: 'confirmation_required',
      command: 'request_plan_adjustment',
      operationId: expect.any(String),
    });
    expect(ctx.result.message).toMatch(/confirm/i);
  });

  it('prepares raw-user client-equivalent plan adjustment requests without RBAC denial', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({
      intent: {
        intent: 'request_plan_adjustment',
        params: { reason: 'My knee hurts when I squat.' },
        confidence: 0.99,
      },
      hasDispatcher: (commandType) => commandType === 'request_plan_adjustment',
    });

    const ctx = await executeCommandPipeline('request a plan adjustment', rawUser, {
      sequelize: {},
    });

    expect(ctx.error).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
    expect(ctx.command?.type).toBe('request_plan_adjustment');
    expect(ctx.result).toMatchObject({
      type: 'confirmation_required',
      command: 'request_plan_adjustment',
      operationId: expect.any(String),
    });
    expect(ctx.result.message).toMatch(/confirm/i);
  });

  it('prepares client onboarding review drafts without a separate command confirmation', async () => {
    const cases = [
      {
        command: 'create_client',
        params: {
          firstName: 'Sean',
          lastName: 'Swan',
          email: 'sean@example.com',
          clientSource: 'swanstudios',
        },
        input: 'add Sean Swan as a Swan Studios client',
        proposalId: 'proposal-swan-1',
      },
      {
        command: 'create_external_client',
        params: {
          firstName: 'Ava',
          lastName: 'Strong',
          email: 'ava@example.com',
          clientSource: 'move_fitness',
        },
        input: 'add Ava Strong from Move Fitness',
        proposalId: 'proposal-move-1',
      },
    ];

    for (const testCase of cases) {
      const { executeCommandPipeline, resolveClient } = await loadPipeline({
        intent: {
          intent: testCase.command,
          params: testCase.params,
          confidence: 0.99,
        },
        hasDispatcher: (commandType) => commandType === testCase.command,
        dispatch: async () => ({
          proposalId: testCase.proposalId,
          proposalType: 'client_onboarding',
          hasPreparedDraft: true,
          reviewRequired: true,
        }),
      });

      const ctx = await executeCommandPipeline(testCase.input, adminUser, {
        sequelize: {},
      });

      expect(ctx.error).toBeNull();
      expect(resolveClient).not.toHaveBeenCalled();
      expect(ctx.command?.type).toBe(testCase.command);
      expect(ctx.result).toMatchObject({
        proposalId: testCase.proposalId,
        proposalType: 'client_onboarding',
        hasPreparedDraft: true,
        reviewRequired: true,
      });
      expect(ctx.result?.type).not.toBe('confirmation_required');
    }
  });

  it('does not tell users a future command was enabled when no data changed', () => {
    const source = readFileSync(resolve(process.cwd(), 'services/ai/commandExecutor.mjs'), 'utf8');

    expect(source).not.toContain('Ask Sean to enable it');
    expect(source).toMatch(/not yet wired for execution\. No data was changed/);
  });
});
