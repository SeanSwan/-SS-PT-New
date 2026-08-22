import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildCommandContextEnvelope, mockExecuteCommandPipeline, mockGetCommandExecutionLane, mockQuery, mockGateDispatch, mockExecuteConfirmed, mockRecordAudit } = vi.hoisted(() => ({
  mockGateDispatch: vi.fn(),
  mockExecuteConfirmed: vi.fn(),
  mockRecordAudit: vi.fn(),
  mockBuildCommandContextEnvelope: vi.fn(),
  mockExecuteCommandPipeline: vi.fn(),
  mockGetCommandExecutionLane: vi.fn(),
  mockQuery: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };
    next();
  },
}));

vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: (_req, _res, next) => next(),
  aiCommandRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: mockQuery },
}));

// H6: the chat lane's eligibility gate is now applied to command-lane dispatches.
// Default ALLOW so the pre-existing dispatch tests keep their meaning; the H6
// cases below flip it.
vi.mock('../../services/ai/commandDispatchEligibility.mjs', async () => {
  const actual = await vi.importActual('../../services/ai/commandDispatchEligibility.mjs');
  return { ...actual, gateCommandFrontendDispatch: mockGateDispatch };
});
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: mockRecordAudit }));

vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: mockExecuteCommandPipeline,
  executeConfirmedOperation: mockExecuteConfirmed,
  checkForConfirmation: vi.fn(),
}));

vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({
  buildCommandContextEnvelope: mockBuildCommandContextEnvelope,
}));

vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({
  getCommandExecutionLane: mockGetCommandExecutionLane,
}));

const aiCommandRoutesModule = await import('../../routes/aiCommandRoutes.mjs');
const aiCommandRoutes = aiCommandRoutesModule.default;
const { normalizePreviousContext } = aiCommandRoutesModule;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

const baseCtx = {
  error: null,
  resolvedClient: null,
  metadata: { timing: { totalMs: 3 } },
};

describe('aiCommandRoutes frontend dispatch responses', () => {
  beforeEach(() => {
    mockGateDispatch.mockReset();
    mockGateDispatch.mockResolvedValue({ allowed: true, refusals: [] });
    mockRecordAudit.mockReset();
    mockExecuteConfirmed.mockReset();
    mockExecuteCommandPipeline.mockReset();
    mockBuildCommandContextEnvelope.mockReset();
    mockBuildCommandContextEnvelope.mockResolvedValue({
      schemaVersion: '1.0',
      contextStatus: 'READY',
      surfaceId: 'workout-planner',
      actor: { id: 7, role: 'admin' },
      permissions: { readEntity: true, mutateEntity: true },
      capabilities: ['conversation', 'plan:mutate'],
      entity: { type: 'workout_plan', id: 'plan-1', clientId: 42, version: '7' },
      correlationId: 'corr-123',
      promptVersion: 'swan-command-context-v1',
    });
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
    mockGetCommandExecutionLane.mockImplementation((command) => {
      if (command.type === 'block_user_posting') {
        return {
          executionLane: 'manual_only',
          canExecute: false,
          manualOnly: true,
          manualOnlyReason: 'user-level posting bans do not yet have a canonical route or model field',
        };
      }
      if (command.type === 'add_exercise_to_form' || command.type === 'submit_workout_form') {
        return {
          executionLane: 'frontend_event',
          canExecute: true,
          manualOnly: false,
          manualOnlyReason: null,
        };
      }
      return {
        executionLane: 'server_dispatch',
        canExecute: true,
        manualOnly: false,
        manualOnlyReason: null,
      };
    });
  });

  it('redacts accessible client identities from command text and previous context before classification', async () => {
    mockQuery.mockResolvedValue([{
      id: 61,
      firstName: 'Jackie',
      lastName: 'Reed',
      email: 'jackie.reed@example.com',
      phone: '555-123-4567',
    }]);
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {}, confidence: 1 },
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'Schedule Jackie Reed tomorrow',
        previousContext: 'Jackie Reed prefers mornings',
        selectedClientId: 61,
      })
      .expect(200);

    expect(mockExecuteCommandPipeline).toHaveBeenCalledWith(
      'Schedule Client #61 tomorrow',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        selectedClientId: 61,
        previousContext: 'Client #61 prefers mornings',
      }),
    );
  });

  it('fails closed before classification when the identity roster is unavailable', async () => {
    mockQuery.mockRejectedValue(new Error('database unavailable'));

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'Schedule Jackie Reed tomorrow' })
      .expect(503);

    expect(response.body).toMatchObject({
      success: false,
      code: 'AI_IDENTITY_REDACTION_UNAVAILABLE',
    });
    expect(mockExecuteCommandPipeline).not.toHaveBeenCalled();
  });

  it('returns a typed browser event for safe workout-form commands', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: {
        intent: 'add_exercise_to_form',
        params: { exerciseName: 'Push Up', sets: 3, reps: 10 },
      },
      command: {
        type: 'add_exercise_to_form',
        description: 'Add an exercise to the current workout form with optional set details',
        method: 'FRONTEND_DISPATCH',
        endpoint: 'AI_ADD_EXERCISE',
        frontendEvent: 'AI_ADD_EXERCISE',
        requiresConfirmation: false,
      },
      result: { type: 'not_wired', message: 'client-side event' },
    });

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'add push ups' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      event: 'AI_ADD_EXERCISE',
      payload: { exerciseName: 'Push Up', sets: 3, reps: 10 },
      fallbackToChat: false,
    });
  });


  it('H6-1: refuses an AI_ADD_EXERCISE dispatch the eligibility gate rejects, and audits the denial', async () => {
    // Whole-Coach hostile round 1 (Sol/HY3/GLM/Grok): the command lane emitted
    // AI_ADD_EXERCISE with none of the chat lane's registry + pain + review gates.
    mockGateDispatch.mockResolvedValue({
      allowed: false,
      refusals: [{ event: 'AI_ADD_EXERCISE', exerciseName: 'Burpee', code: 'PAIN_EXCLUDED', reason: 'knee flagged in the last 72h' }],
    });
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'add_exercise_to_form', params: { exerciseName: 'Burpee', sets: 3, reps: 10 } },
      command: { type: 'add_exercise_to_form', description: 'Add an exercise', method: 'FRONTEND_DISPATCH', endpoint: 'AI_ADD_EXERCISE', frontendEvent: 'AI_ADD_EXERCISE', requiresConfirmation: false },
      result: { type: 'not_wired' },
    });

    const response = await request(makeApp()).post('/api/ai-command/execute').send({ message: 'add burpees', selectedClientId: 42 }).expect(200);

    expect(response.body).toMatchObject({ success: false, type: 'error', code: 'DISPATCH_INELIGIBLE', fallbackToChat: false });
    expect(response.body.error).toMatch(/knee flagged/);
    expect(response.body.event).toBeUndefined();
    expect(mockGateDispatch).toHaveBeenCalledWith(expect.objectContaining({ event: 'AI_ADD_EXERCISE', targetClientId: 42 }));
    expect(mockRecordAudit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'denied', errorCode: 'DISPATCH_INELIGIBLE', commandType: 'add_exercise_to_form' }));
  });

  it('H6-2: the confirmed-dispatch path is gated too - confirmation is about intent, not client safety', async () => {
    mockExecuteConfirmed.mockResolvedValue({ success: true, type: 'frontend_dispatch', command: 'add_exercise_to_form', event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'Burpee' }, client: { id: 42 }, message: 'confirmed' });
    mockGateDispatch.mockResolvedValue({ allowed: false, refusals: [{ code: 'EXERCISE_NOT_IN_REGISTRY', reason: 'exercise could not be matched' }] });

    const response = await request(makeApp()).post('/api/ai-command/confirm').send({ operationId: 'op-1' }).expect(200);

    expect(response.body).toMatchObject({ success: false, code: 'DISPATCH_INELIGIBLE' });
    expect(response.body.event).toBeUndefined();
    expect(mockGateDispatch).toHaveBeenCalledWith(expect.objectContaining({ event: 'AI_ADD_EXERCISE', targetClientId: 42 }));
  });

  it('H6-3: a non-gated frontend event passes straight through (the gate allows it)', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'toggle_nasm_item', params: { item: 'warmup' } },
      command: { type: 'toggle_nasm_item', description: 'Toggle', method: 'FRONTEND_DISPATCH', endpoint: 'AI_TOGGLE_NASM_ITEM', frontendEvent: 'AI_TOGGLE_NASM_ITEM', requiresConfirmation: false },
      result: { type: 'not_wired' },
    });
    const response = await request(makeApp()).post('/api/ai-command/execute').send({ message: 'toggle warmup' }).expect(200);
    expect(response.body).toMatchObject({ success: true, type: 'frontend_dispatch', event: 'AI_TOGGLE_NASM_ITEM' });
  });

  it('returns the authoritative server expiry for confirmation cards', async () => {
    const expiresAt = '2026-07-17T12:02:00.000Z';
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'log_workout', params: { clientId: 42 } },
      command: { type: 'log_workout', destructive: false },
      result: { type: 'confirmation_required', message: 'Confirm?', operationId: 'op-42', expiresAt, command: 'log_workout', params: { clientId: 42 }, isDestructive: false },
    });
    const response = await request(makeApp()).post('/api/ai-command/execute').send({ message: 'log workout', selectedClientId: 42 }).expect(200);
    expect(response.body).toMatchObject({ success: true, type: 'confirmation_required', operationId: 'op-42', expiresAt });
  });
  it('passes through manual-only not-wired command receipts without frontend dispatch', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'block_user_posting', params: { userId: 88, blocked: true } },
      command: {
        type: 'block_user_posting',
        description: 'Block a user from posting',
        method: 'POST',
        endpoint: '/api/social/moderation/users/:userId/block-posting',
        requiresConfirmation: true,
      },
      result: {
        type: 'not_wired',
        manualOnly: true,
        reason: 'user-level posting bans do not yet have a canonical route or model field',
        message: 'User-level posting bans require a canonical route or model field. No data was changed.',
      },
    });

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'reset client password' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'not_wired',
      command: 'block_user_posting',
      manualOnly: true,
      reason: 'user-level posting bans do not yet have a canonical route or model field',
    });
    expect(response.body.type).not.toBe('frontend_dispatch');
  });

  it('returns a no-change receipt if a command reaches the route with a null result', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'future_command', params: {} },
      command: {
        type: 'future_command',
        description: 'Future command',
        method: 'POST',
        endpoint: '/api/future',
      },
      result: null,
    });

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'run future command' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      type: 'not_wired',
      command: 'future_command',
      manualOnly: false,
      reason: null,
    });
    expect(response.body.message).toContain('No data was changed.');
  });

  it('normalizes selected-client context before passing it to the command pipeline', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'log today workout',
        selectedClientId: '42',
        selectedClientName: 'Private Client Name',
      })
      .expect(200);

    expect(mockExecuteCommandPipeline).toHaveBeenLastCalledWith(
      'log today workout',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        selectedClientId: 42,
        selectedClientName: null,
      }),
    );
  });

  it('passes only safe route context tokens to the command pipeline', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'we did squats 3 sets of 10',
        selectedClientId: 42,
        previousContext: 'y'.repeat(50_000),
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
          clientName: 'Private Client Name',
          notes: 'contains free text that should not reach the command pipeline',
        },
      })
      .expect(200);
    // Piggybacked integration assertion: the route caps previousContext in-line.
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.previousContext).toHaveLength(2000);

    expect(mockExecuteCommandPipeline).toHaveBeenLastCalledWith(
      'we did squats 3 sets of 10',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
        },
      }),
    );
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.routeContext).not.toHaveProperty('clientName');
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.routeContext).not.toHaveProperty('notes');
  });

  it('builds the trusted context envelope from server auth plus narrow client hints', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'rearrange this workout',
        selectedClientId: 42,
        entityId: '11111111-1111-4111-8111-111111111111',
        entityVersion: '7',
        correlationId: 'corr-123',
        routeContext: {
          surface: 'workout-planner',
          role: 'admin',
          capabilities: ['plan:mutate:anything'],
          notes: 'free text must not enter the envelope request',
        },
      })
      .expect(200);

    expect(mockBuildCommandContextEnvelope).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({ id: 7, role: 'admin' }),
      request: {
        surfaceHint: 'workout-planner',
        selectedClientId: 42,
        entityId: '11111111-1111-4111-8111-111111111111',
        entityVersion: '7',
        correlationId: 'corr-123',
      },
      loadPlan: expect.any(Function),
      authorizeClient: expect.any(Function),
    }));
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.contextEnvelope).toBe(
      mockBuildCommandContextEnvelope.mock.results[0].value
        ? await mockBuildCommandContextEnvelope.mock.results[0].value
        : null,
    );
  });

  it('returns typed classifier failures without opening the chat fallback', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      error: 'Swan Coach could not safely interpret that request. No data was changed.',
      stage: 'validate',
      intent: {
        intent: 'classification_error',
        params: { code: 'PARSE_FAIL' },
        confidence: 0,
      },
      command: null,
      result: {
        type: 'error',
        code: 'PARSE_FAIL',
        message: 'Swan Coach could not safely interpret that request. No data was changed.',
      },
    });

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'rearrange this workout' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: false,
      type: 'error',
      code: 'PARSE_FAIL',
      error: 'Swan Coach could not safely interpret that request. No data was changed.',
      fallbackToChat: false,
    });
  });

  it('preserves safe scheduled-session route context for workout logging commands', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'log the booked workout',
        selectedClientId: 42,
        routeContext: {
          source: 'coach-command-center',
          intent: 'log_workout',
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
          scheduledSessionNotes: 'free text must not pass',
        },
      })
      .expect(200);

    expect(mockExecuteCommandPipeline).toHaveBeenLastCalledWith(
      'log the booked workout',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        routeContext: {
          source: 'coach-command-center',
          intent: 'log_workout',
          scheduledSessionId: '777',
          scheduledSessionDate: '2026-06-07',
          scheduledSessionCredits: 2,
        },
      }),
    );
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.routeContext).not.toHaveProperty('scheduledSessionNotes');
  });

  it('preserves zero-credit scheduled-session context for free-tracking workout logging commands', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'log the free-tracking booked workout',
        selectedClientId: 42,
        routeContext: {
          source: 'coach-command-center',
          intent: 'log_workout',
          scheduledSessionId: '778',
          scheduledSessionDate: '2026-06-08',
          scheduledSessionCredits: 0,
        },
      })
      .expect(200);

    expect(mockExecuteCommandPipeline).toHaveBeenLastCalledWith(
      'log the free-tracking booked workout',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        routeContext: {
          source: 'coach-command-center',
          intent: 'log_workout',
          scheduledSessionId: '778',
          scheduledSessionDate: '2026-06-08',
          scheduledSessionCredits: 0,
        },
      }),
    );
  });
  it('caps previousContext before it reaches the classifier prompt (cost/injection guard)', () => {
    // Pure-unit — the route path is asserted by piggyback in the routeContext
    // test above (this suite shares one user against a real 10/min limiter).
    expect(normalizePreviousContext('x'.repeat(50_000))).toHaveLength(2000);
    expect(normalizePreviousContext({ nested: 'object' })).toBeUndefined();
    expect(normalizePreviousContext('   ')).toBeUndefined();
    expect(normalizePreviousContext('  Planner mode: single-day builder.  ')).toBe('Planner mode: single-day builder.');
  });

  it('rejects malformed selected-client ids instead of letting stale client refs take over', async () => {
    mockExecuteCommandPipeline.mockResolvedValue({
      ...baseCtx,
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });

    const response = await request(makeApp())
      .post('/api/ai-command/execute')
      .send({ message: 'log today workout', selectedClientId: '42junk' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      code: 'COMMAND_SELECTED_CLIENT_ID_INVALID',
    });
    expect(mockExecuteCommandPipeline).not.toHaveBeenCalled();
  });

  it('lists command execution lanes so the UI can separate ready actions from manual workflows', async () => {
    const response = await request(makeApp())
      .get('/api/ai-command/commands')
      .expect(200);

    const commandsByType = Object.fromEntries(
      response.body.commands.map((command) => [command.type, command]),
    );

    expect(commandsByType.view_client_profile).toMatchObject({
      executionLane: 'server_dispatch',
      canExecute: true,
      manualOnly: false,
    });
    expect(commandsByType.add_exercise_to_form).toMatchObject({
      executionLane: 'frontend_event',
      canExecute: true,
      manualOnly: false,
    });
    expect(commandsByType.submit_workout_form).toMatchObject({
      executionLane: 'frontend_event',
      canExecute: true,
      manualOnly: false,
    });
    expect(commandsByType.reset_client_password).toMatchObject({
      executionLane: 'server_dispatch',
      canExecute: true,
      manualOnly: false,
    });
    expect(commandsByType.reset_client_password.manualOnlyReason).toBeNull();
  });
});
