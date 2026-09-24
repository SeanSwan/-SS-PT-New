/**
 * commandKillSwitch.test.mjs
 * ==========================
 * Slice F1 — write kill switch + audit outcomes through the REAL pipeline:
 *   - writes blocked when AI_COMMAND_WRITES_ENABLED=false; reads keep working
 *   - /confirm lane honors the switch (pending op minted before flip must not run)
 *   - RBAC escalation baseline: trainer on an admin-only command is denied AND audited
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import { recordCommandAudit } from '../../services/ai/commandAudit.mjs';
import { classifyIntent } from '../../services/ai/intentClassifier.mjs';
import { getCommand } from '../../services/ai/commandRegistry/index.mjs';
import { dispatch, hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import { startDebate } from '../../services/ai/debate/debateOrchestrator.mjs';
import { buildDebateClientContext } from '../../services/ai/debate/debateClientContextService.mjs';
import { resolveClient } from '../../services/ai/clientResolver.mjs';
import {
  executeCommandPipeline,
  executeConfirmedOperation,
} from '../../services/ai/commandExecutor.mjs';
import { COMMAND_WRITES_PAUSED_MESSAGE } from '../../services/ai/commandLaneControls.mjs';

vi.mock('../../models/AiCommandAuditLog.mjs', () => ({
  default: { create: vi.fn() },
}));
/**
 * Observe the audit at `recordCommandAudit`, not at the model.
 *
 * WHY THIS MOVED. These assertions used to read `AiCommandAuditLog.create`
 * calls. Card 1.0 gave the lane a second audit writer (`recordApprovalEvent`),
 * and with two callers the mocked model stopped being a reliable seam: vitest
 * resolved the `await import()` inside commandAudit.mjs to the MOCK for one
 * call and to the REAL Sequelize model for the next — the real one then tried
 * to reach Postgres, failed SASL auth, and was swallowed by the writer's
 * deliberate best-effort catch. The row vanished from the test's view while the
 * pipeline was in fact still asking for it (verified by probing the writer:
 * one module instance, same import specifier, two different resolutions).
 *
 * That mattered beyond a red test: a mock the code can silently escape reports
 * "no row was written" identically whether the pipeline stopped writing or the
 * test stopped watching. `recordCommandAudit` is a single statically-imported
 * binding, so it cannot split that way, and it carries exactly the fields these
 * assertions care about. Production is unaffected — one module registry, one
 * real model, both writes land.
 */
vi.mock('../../services/ai/commandAudit.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, recordCommandAudit: vi.fn(async () => true) };
});
vi.mock('../../services/ai/intentClassifier.mjs', () => ({
  classifyIntent: vi.fn(),
}));
vi.mock('../../services/ai/commandRegistry/index.mjs', () => ({
  getCommand: vi.fn(),
  getCommandsForRole: vi.fn(() => []),
  getAllCommandTypes: vi.fn(() => []),
  initializeRegistry: vi.fn(),
}));
vi.mock('../../services/ai/commandDispatcher.mjs', () => ({
  dispatch: vi.fn(),
  hasDispatcher: vi.fn(() => true),
}));
vi.mock('../../services/ai/debate/debateOrchestrator.mjs', () => ({
  startDebate: vi.fn(),
}));
vi.mock('../../services/ai/debate/debateClientContextService.mjs', () => ({
  buildDebateClientContext: vi.fn(),
}));
vi.mock('../../services/ai/clientResolver.mjs', () => ({
  resolveClient: vi.fn(),
}));

const createMock = vi.mocked(AiCommandAuditLog.create);
const auditMock = vi.mocked(recordCommandAudit);
const classifyMock = vi.mocked(classifyIntent);
const getCommandMock = vi.mocked(getCommand);
const dispatchMock = vi.mocked(dispatch);
const hasDispatcherMock = vi.mocked(hasDispatcher);
const startDebateMock = vi.mocked(startDebate);
const buildDebateClientContextMock = vi.mocked(buildDebateClientContext);
const resolveClientMock = vi.mocked(resolveClient);

const ADMIN = { id: 1, role: 'admin', firstName: 'Sean', lastName: 'S' };
const TRAINER = { id: 2, role: 'trainer', firstName: 'Tess', lastName: 'T' };

const WRITE_COMMAND = {
  type: 'log_workout',
  description: 'Log a workout',
  roleRequired: ['admin', 'trainer'],
  destructive: false,
  requiresConfirmation: true,
  requiresClientRef: false,
  selfService: false,
  inputSchema: null,
};

const READ_COMMAND = {
  type: 'view_workout_history',
  description: 'View workout history',
  roleRequired: ['admin', 'trainer'],
  destructive: false,
  requiresConfirmation: false,
  requiresClientRef: false,
  selfService: false,
  inputSchema: null,
};

const ADMIN_ONLY_COMMAND = {
  ...READ_COMMAND,
  type: 'view_business_kpis',
  description: 'View business KPIs',
  roleRequired: ['admin'],
};

const DEBATE_COMMAND = {
  type: 'build_workout_plan',
  description: 'Build a workout plan',
  roleRequired: ['admin', 'trainer'],
  destructive: false,
  requiresConfirmation: true,
  requiresClientRef: true,
  selfService: false,
  inputSchema: null,
  isDebateRequired: true,
};

const ENV_KEYS = ['AI_COMMAND_WRITES_ENABLED', 'AI_COMMANDS_ENABLED'];
const savedEnv = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  createMock.mockReset();
  createMock.mockResolvedValue({});
  auditMock.mockClear();
  classifyMock.mockReset();
  getCommandMock.mockReset();
  dispatchMock.mockReset();
  hasDispatcherMock.mockReset();
  hasDispatcherMock.mockReturnValue(true);
  startDebateMock.mockReset();
  startDebateMock.mockReturnValue('debate_job_42');
  buildDebateClientContextMock.mockReset();
  buildDebateClientContextMock.mockResolvedValue({ deIdentified: { alias: 'Client-42' } });
  resolveClientMock.mockReset();
  resolveClientMock.mockResolvedValue({
    resolved: { id: 42, firstName: 'Ava', lastName: 'Strong' },
    suggestions: [],
    error: null,
  });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

/** The audit entry the pipeline itself submitted, located by outcome. */
const auditRowWithOutcome = (outcome) =>
  auditMock.mock.calls.map((c) => c?.[0]).find((r) => r?.outcome === outcome);
const lastAuditRow = () => auditMock.mock.calls.at(-1)?.[0];
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

function primeIntent(commandType, command) {
  classifyMock.mockResolvedValue({
    intent: commandType,
    clientRef: null,
    params: {},
    confidence: 0.95,
  });
  getCommandMock.mockReturnValue(command);
}

describe('write kill switch (pipeline)', () => {
  it('blocks write commands when AI_COMMAND_WRITES_ENABLED=false', async () => {
    process.env.AI_COMMAND_WRITES_ENABLED = 'false';
    primeIntent('log_workout', WRITE_COMMAND);

    const ctx = await executeCommandPipeline('log a workout', ADMIN, {});

    expect(ctx.error).toBe(COMMAND_WRITES_PAUSED_MESSAGE);
    expect(ctx.stage).toBe('write_kill_switch');
    expect(dispatchMock).not.toHaveBeenCalled();

    await flushAsync();
    expect(lastAuditRow()?.outcome).toBe('blocked_killswitch');
  });

  it('lets read commands through while writes are paused', async () => {
    process.env.AI_COMMAND_WRITES_ENABLED = 'false';
    primeIntent('view_workout_history', READ_COMMAND);
    dispatchMock.mockResolvedValue({ type: 'history', sessions: [] });

    const ctx = await executeCommandPipeline('show workout history', ADMIN, {});

    expect(ctx.error).toBeNull();
    expect(dispatchMock).toHaveBeenCalledTimes(1);

    await flushAsync();
    expect(lastAuditRow()?.outcome).toBe('success');
  });

  it('executes writes normally when the flag is unset', async () => {
    primeIntent('log_workout', WRITE_COMMAND);

    const ctx = await executeCommandPipeline('log a workout', ADMIN, {});

    // requiresConfirmation commands mint a confirmation, not a direct execution
    expect(ctx.error).toBeNull();
    expect(ctx.result?.type).toBe('confirmation_required');

    await flushAsync();
    const row = auditRowWithOutcome('confirmation_required');
    expect(row?.outcome).toBe('confirmation_required');
    expect(row?.confirmationState).toBe('pending');
    // The approval funnel's other half must ALSO be there — a mint with no
    // `minted` event is the half-funnel that reads as complete (card 1.0).
    expect(auditRowWithOutcome('approval:minted')).toBeTruthy();
  });
});

describe('write kill switch (confirm lane)', () => {
  it('blocks executeConfirmedOperation when writes are paused', async () => {
    process.env.AI_COMMAND_WRITES_ENABLED = 'false';

    const result = await executeConfirmedOperation('op-123', ADMIN, null);

    expect(result.success).toBe(false);
    expect(result.message).toBe(COMMAND_WRITES_PAUSED_MESSAGE);
    expect(dispatchMock).not.toHaveBeenCalled();

    await flushAsync();
    const row = lastAuditRow();
    expect(row?.outcome).toBe('blocked_killswitch');
    expect(row?.confirmationState).toBe('confirmed');
    expect(row?.operationId).toBe('op-123');
  });
});

describe('debate command confirmation gate', () => {
  it('starts workout-plan debates only after the confirmed operation runs', async () => {
    hasDispatcherMock.mockReturnValue(false);
    primeIntent('build_workout_plan', DEBATE_COMMAND);
    const sequelize = {};

    const ctx = await executeCommandPipeline('build a workout plan', ADMIN, {
      selectedClientId: 42,
      sequelize,
    });

    expect(ctx.error).toBeNull();
    expect(ctx.result).toMatchObject({
      type: 'confirmation_required',
      command: 'build_workout_plan',
      isDestructive: false,
    });
    expect(startDebateMock).not.toHaveBeenCalled();

    const confirmed = await executeConfirmedOperation(ctx.result.operationId, ADMIN, sequelize);

    expect(confirmed).toMatchObject({
      success: true,
      type: 'debate_started',
      command: 'build_workout_plan',
      result: {
        jobId: 'debate_job_42',
        debateType: 'workout_plan',
      },
      client: { id: 42 },
    });
    expect(buildDebateClientContextMock).toHaveBeenCalledWith(42, sequelize, { id: 42 });
    expect(startDebateMock).toHaveBeenCalledWith(
      'workout_plan',
      { alias: 'Client-42' },
      ADMIN.id,
      expect.objectContaining({ clientId: 42 }),
    );
  });
});
describe('RBAC escalation baseline', () => {
  it('denies a trainer calling an admin-only command and audits the denial', async () => {
    primeIntent('view_business_kpis', ADMIN_ONLY_COMMAND);

    const ctx = await executeCommandPipeline('show business kpis', TRAINER, {});

    expect(ctx.error).toMatch(/don't have permission/i);
    expect(ctx.stage).toBe('rbac');
    expect(dispatchMock).not.toHaveBeenCalled();

    await flushAsync();
    const row = lastAuditRow();
    expect(row?.outcome).toBe('denied');
    expect(row?.userId).toBe(TRAINER.id);
    expect(row?.userRole).toBe('trainer');
    expect(row?.commandType).toBe('view_business_kpis');
  });
});
