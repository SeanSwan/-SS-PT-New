/**
 * Card 1.1 — read-back + proof-of-render, at the HTTP boundary.
 *
 * The defect this closes: the confirmation UI rendered `ctx.intent.params` (what
 * the user asked) while the executor ran the STORED operation (what the server
 * minted, with a server-injected clientId). Two artifacts, divergent by
 * construction, and nothing detected a mismatch. A stale tab could display
 * operation A and confirm operation B's id.
 *
 * These drive the REAL destructiveOperations lane (in-process store) through the
 * REAL routes — only auth, guards, the DB and the executor are mocked, so the
 * mint → read-back → digest → confirm path is exercised end to end.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecuteConfirmed, mockRecordAudit, mockQuery } = vi.hoisted(() => ({
  mockExecuteConfirmed: vi.fn(),
  mockRecordAudit: vi.fn(),
  mockQuery: vi.fn(),
}));

let actingUser = { id: 7, role: 'trainer', firstName: 'T', lastName: 'R' };

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = { ...actingUser }; next(); },
}));
vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: (_req, _res, next) => next(),
  aiCommandRateLimiter: (_req, _res, next) => next(),
}));
vi.mock('../../database.mjs', () => ({ default: { query: mockQuery } }));
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: mockRecordAudit }));
vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: vi.fn(),
  executeConfirmedOperation: mockExecuteConfirmed,
  checkForConfirmation: vi.fn(),
}));
// Same module-level mocks the sibling route tests carry: these pull Sequelize
// models at import time, which cannot define() against a mocked database.
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/commandDispatchEligibility.mjs', () => ({
  gateCommandFrontendDispatch: vi.fn(async () => ({ allowed: true, refusals: [] })),
  buildDispatchRefusalResponse: vi.fn(),
}));

const aiCommandRoutes = (await import('../../routes/aiCommandRoutes.mjs')).default;
const { prepareDestructiveOperation, verifyAndRetrieveOperation } =
  await import('../../services/ai/destructiveOperations.mjs');
const { resetPendingOperationStore } = await import('../../services/ai/pendingOperationStore.mjs');
const { renderDigestOf } = await import('../../services/ai/renderDigest.mjs');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

async function mint(userId = 7) {
  return prepareDestructiveOperation({
    type: 'DELETE',
    endpoint: '/api/sessions/:id',
    commandType: 'cancel_session',
    commandParams: { sessionId: 184, clientId: 61 },
    userId,
    actorRole: 'trainer',
    description: 'Cancel session 184',
    affectedRecords: [{ id: 184 }],
  });
}

beforeEach(() => {
  resetPendingOperationStore();
  actingUser = { id: 7, role: 'trainer', firstName: 'T', lastName: 'R' };
  mockExecuteConfirmed.mockReset();
  mockExecuteConfirmed.mockResolvedValue({ success: true, type: 'executed', command: 'cancel_session' });
  mockRecordAudit.mockReset();
  delete process.env.APPROVAL_RENDER_DIGEST;
});

describe('GET /api/ai-command/pending/:operationId', () => {
  it('returns the STORED operation to its owner — and never the signature', async () => {
    const pending = await mint();
    const res = await request(makeApp()).get(`/api/ai-command/pending/${pending.operationId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.operation.id).toBe(pending.operationId);
    expect(res.body.operation.description).toBe('Cancel session 184');
    expect(res.body.operation.params).toEqual({ sessionId: 184, clientId: 61 });
    expect(res.body.operation).not.toHaveProperty('signature');
    expect(JSON.stringify(res.body)).not.toMatch(/signature/i);
  });

  it('a non-owner gets the SAME 404 body as a non-existent id — no existence oracle', async () => {
    const pending = await mint(7);
    actingUser = { id: 999, role: 'trainer' };
    const stolen = await request(makeApp()).get(`/api/ai-command/pending/${pending.operationId}`).expect(404);
    const missing = await request(makeApp())
      .get('/api/ai-command/pending/00000000-0000-4000-8000-000000000000').expect(404);
    expect(stolen.body).toEqual(missing.body);
  });

  it('reading does NOT consume — the owner can still confirm afterwards', async () => {
    const pending = await mint();
    await request(makeApp()).get(`/api/ai-command/pending/${pending.operationId}`).expect(200);
    const still = await verifyAndRetrieveOperation(pending.operationId, 7);
    expect(still.verified).toBe(true);
  });
});

describe('POST /api/ai-command/confirm — proof of render', () => {
  it('a matching digest confirms and executes', async () => {
    const pending = await mint();
    const read = await request(makeApp()).get(`/api/ai-command/pending/${pending.operationId}`).expect(200);
    const digest = renderDigestOf(read.body.operation);

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: digest })
      .expect(200);

    expect(res.body.type).toBe('executed');
    expect(mockExecuteConfirmed).toHaveBeenCalledTimes(1);
  });

  it('a WRONG digest is refused, is NOT consumed, and is counted', async () => {
    const pending = await mint();
    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: 'a'.repeat(64) })
      .expect(400);

    expect(res.body.code).toBe('render_mismatch');
    expect(mockExecuteConfirmed).not.toHaveBeenCalled();
    // Not consumed: the owner can still confirm it properly.
    const still = await verifyAndRetrieveOperation(pending.operationId, 7);
    expect(still.verified).toBe(true);
    expect(mockRecordAudit.mock.calls.some(([e]) => e.outcome === 'approval:render_mismatch')).toBe(true);
  });

  it('a digest for a DIFFERENT operation is refused — the stale-tab case', async () => {
    const opA = await mint();
    const opB = await mint();
    const readB = await request(makeApp()).get(`/api/ai-command/pending/${opB.operationId}`).expect(200);

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: opA.operationId, renderedDigest: renderDigestOf(readB.body.operation) })
      .expect(400);
    expect(res.body.code).toBe('render_mismatch');
  });

  it('a tampered description fails the digest — the field the human reads is covered', async () => {
    const pending = await mint();
    const read = await request(makeApp()).get(`/api/ai-command/pending/${pending.operationId}`).expect(200);
    const lying = { ...read.body.operation, description: 'Cancel ALL sessions' };

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: renderDigestOf(lying) })
      .expect(400);
    expect(res.body.code).toBe('render_mismatch');
  });

  it('observe mode (default): a missing digest still confirms — this ships before the sheet does', async () => {
    const pending = await mint();
    await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId })
      .expect(200);
    expect(mockExecuteConfirmed).toHaveBeenCalledTimes(1);
  });

  it('enforce mode: a missing digest is refused with its own code', async () => {
    process.env.APPROVAL_RENDER_DIGEST = 'enforce';
    const pending = await mint();
    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId })
      .expect(400);
    expect(res.body.code).toBe('render_digest_required');
    expect(mockExecuteConfirmed).not.toHaveBeenCalled();
  });

  it('an EXPIRED operation says expired, not "does not match" — the remedies differ', async () => {
    // Self-review finding (Opus, 2026-09-02): an operation that expired between
    // render and confirm was reported as render_mismatch, sending the operator
    // hunting for a discrepancy that does not exist. Re-open vs re-issue are
    // different actions, so they need different codes.
    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: '00000000-0000-4000-8000-000000000000', renderedDigest: 'a'.repeat(64) })
      .expect(400);
    expect(res.body.code).toBe('expired');
    expect(res.body.error).toMatch(/expired|no longer available/i);
    expect(mockExecuteConfirmed).not.toHaveBeenCalled();
  });

  it('a pending CONFIRMATION (non-destructive) mints a countable event too — half a funnel reads as complete', async () => {
    const { preparePendingConfirmation } = await import('../../services/ai/pendingConfirmations.mjs');
    mockRecordAudit.mockReset();
    await preparePendingConfirmation({
      commandType: 'log_workout', params: { exerciseName: 'Bench' }, clientId: 61,
      userId: 7, actorRole: 'trainer', description: 'Log a workout',
    });
    expect(mockRecordAudit.mock.calls.some(([e]) => e.outcome === 'approval:minted')).toBe(true);
  });

  it('even in observe mode a PRESENT-but-wrong digest is refused — the check is never theatre', async () => {
    const pending = await mint();
    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: 'not-hex' })
      .expect(400);
    expect(res.body.code).toBe('render_mismatch');
  });
});
