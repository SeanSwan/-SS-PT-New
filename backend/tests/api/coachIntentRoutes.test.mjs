import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetModel,
  mockAssignment,
  mockReadCoachIntent,
} = vi.hoisted(() => ({
  mockGetModel: vi.fn(),
  mockAssignment: vi.fn(),
  mockReadCoachIntent: vi.fn(),
}));

let actingUser = { id: 7, role: 'trainer' };
const rows = [
  {
    id: '11111111-1111-4111-8111-111111111111', actorId: 7, targetClientId: 44,
    commandType: 'log_workout', status: 'completed', operationId: 'op-1', proposalId: 'proposal-1',
    result: {
      schemaVersion: 1, recordRefs: [{ kind: 'daily_form', id: 91, version: 3 }],
      realAffectedCount: 1, reversibility: 'none', undoAvailable: false,
      providerError: 'do not expose', transcript: 'do not expose',
    },
    createdAt: new Date('2026-09-04T20:00:00.000Z'), updatedAt: new Date('2026-09-04T20:01:00.000Z'),
    completedAt: new Date('2026-09-04T20:01:00.000Z'), expiresAt: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222', actorId: 7, targetClientId: null,
    commandType: 'read_progress', status: 'unknown', operationId: null, proposalId: null,
    result: { state: 'unknown', reasonCode: 'CLIENT_TIMEOUT' },
    createdAt: new Date('2026-09-04T19:00:00.000Z'), updatedAt: new Date('2026-09-04T19:00:00.000Z'),
    completedAt: null, expiresAt: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333', actorId: 7, targetClientId: null,
    commandType: 'list_sessions', status: 'failed', operationId: null, proposalId: null,
    result: null, createdAt: new Date('2026-09-04T18:00:00.000Z'),
    updatedAt: new Date('2026-09-04T18:00:00.000Z'), completedAt: null, expiresAt: null,
  },
];

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...actingUser }; next(); },
}));
vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: (_req, _res, next) => next(),
  aiCommandRateLimiter: (_req, _res, next) => next(),
}));
vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mockAssignment,
}));
vi.mock('../../database.mjs', () => ({ default: {}, Op: { lt: Symbol('lt') } }));
vi.mock('../../models/index.mjs', () => ({ getModel: mockGetModel }));
vi.mock('../../services/ai/coachIntentService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  readCoachIntent: mockReadCoachIntent,
}));
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn() }));
vi.mock('../../services/ai/unhandledUtteranceAudit.mjs', () => ({ recordUnhandledUtterance: vi.fn() }));
vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: vi.fn(), executeConfirmedOperation: vi.fn(), checkForConfirmation: vi.fn(),
}));
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandDispatchEligibility.mjs', () => ({
  gateCommandFrontendDispatch: vi.fn(async () => ({ allowed: true, refusals: [] })),
  buildDispatchRefusalResponse: vi.fn(),
}));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/commandRegistry/index.mjs', () => ({
  getCommandsForRole: vi.fn(() => []), getAllCommandTypes: vi.fn(() => []), initializeRegistry: vi.fn(),
}));
vi.mock('../../services/ai/pendingOperationStore.mjs', () => ({
  getPendingOperationStore: vi.fn(() => ({ kind: 'test', durable: false })),
}));
vi.mock('../../services/ai/approvalEvents.mjs', () => ({
  recordApprovalEvent: vi.fn(), APPROVAL_EVENTS: {},
}));
vi.mock('../../services/ai/destructiveOperations.mjs', () => ({
  cancelOperation: vi.fn(), getPendingCount: vi.fn(async () => 0), peekOperation: vi.fn(),
}));

const aiCommandRoutes = (await import('../../routes/aiCommandRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

beforeEach(() => {
  actingUser = { id: 7, role: 'trainer' };
  mockAssignment.mockReset();
  mockAssignment.mockResolvedValue(true);
  mockReadCoachIntent.mockReset();
  mockGetModel.mockReset();
  mockGetModel.mockReturnValue({ findByPk: vi.fn(), findAll: vi.fn() });
});

describe('CoachIntent receipt reads', () => {
  it('returns a redacted semantic receipt to its actor without raw result payloads', async () => {
    mockReadCoachIntent.mockResolvedValue(rows[0]);

    const res = await request(makeApp()).get(`/api/ai-command/intents/${rows[0].id}`);
    expect(res.status).toBe(200);

    expect(res.body.success).toBe(true);
    expect(res.body.intent).toMatchObject({
      id: rows[0].id, commandType: 'log_workout', targetUserId: 44, status: 'completed',
    });
    expect(res.body.intent.result.recordRefs).toEqual([{ kind: 'daily_form', id: '91', version: 3 }]);
    expect(JSON.stringify(res.body)).not.toMatch(/do not expose|transcript|providerError/i);
  });

  it('uses the same 404 response for a missing intent and an unauthorized target read', async () => {
    actingUser = { id: 8, role: 'trainer' };
    mockReadCoachIntent.mockResolvedValueOnce(rows[0]).mockResolvedValueOnce(null);
    mockAssignment.mockResolvedValue(false);

    const denied = await request(makeApp())
      .get(`/api/ai-command/intents/${rows[0].id}`)
      .expect(404);
    const missing = await request(makeApp())
      .get('/api/ai-command/intents/44444444-4444-4444-8444-444444444444')
      .expect(404);

    expect(denied.body).toEqual(missing.body);
  });

  it('lists only the actor scope with an opaque next cursor and bounded result shape', async () => {
    const model = { findAll: vi.fn(async () => rows) };
    mockGetModel.mockReturnValue(model);

    const res = await request(makeApp()).get('/api/ai-command/intents?limit=2');
    expect(res.status).toBe(200);

    expect(model.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }));
    expect(res.body.intents).toHaveLength(2);
    expect(res.body.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.intents[0]).not.toHaveProperty('actorId');
    expect(JSON.stringify(res.body)).not.toMatch(/do not expose|transcript|providerError/i);
  });
});
