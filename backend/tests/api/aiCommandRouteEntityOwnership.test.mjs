/**
 * SCU G02 / T06+T07 — RED. Entity-owner authority must be RE-CHECKED at
 * /confirm, not only at /execute: between the mint (preview) and the confirm,
 * the target client's assignment can move to another trainer, or the
 * confirming user's own role can be revoked. Today the command lane re-checks
 * role/ownership in stepRBAC before minting and then trusts the stored
 * operation through /confirm — no ACCESS_CHANGED code exists anywhere in the
 * command lane (only the chat lane, aiChatAccessHardening, has one).
 *
 * Contract: if the owner lost access to the target between preview and
 * confirm, /confirm returns 403 with code ACCESS_CHANGED, ZERO effects
 * (executeConfirmedOperation never called), and no target details in the body
 * (an existence oracle over another owner's client).
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
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/commandDispatchEligibility.mjs', () => ({
  gateCommandFrontendDispatch: vi.fn(async () => ({ allowed: true, refusals: [] })),
  buildDispatchRefusalResponse: vi.fn(),
}));

const aiCommandRoutes = (await import('../../routes/aiCommandRoutes.mjs')).default;
const { prepareDestructiveOperation } = await import('../../services/ai/destructiveOperations.mjs');
const { resetPendingOperationStore } = await import('../../services/ai/pendingOperationStore.mjs');
const { renderDigestOf } = await import('../../services/ai/renderDigest.mjs');
const { getPendingOperationStore } = await import('../../services/ai/pendingOperationStore.mjs');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

async function mintTargetOp(userId = 7, clientId = 61) {
  return prepareDestructiveOperation({
    type: 'DELETE',
    endpoint: '/api/sessions/:id',
    commandType: 'cancel_session',
    commandParams: { sessionId: 184, clientId },
    userId,
    actorRole: 'trainer',
    description: `Cancel session 184 for Client-${clientId}`,
    affectedRecords: [{ id: 184, name: `Client-${clientId}` }],
    clientId,
  });
}

beforeEach(() => {
  resetPendingOperationStore();
  actingUser = { id: 7, role: 'trainer', firstName: 'T', lastName: 'R' };
  mockExecuteConfirmed.mockReset();
  mockExecuteConfirmed.mockResolvedValue({ success: true, type: 'executed', command: 'cancel_session' });
  mockRecordAudit.mockReset();
  mockQuery.mockReset();
  delete process.env.APPROVAL_RENDER_DIGEST;
});

describe('T07 — /confirm re-checks entity ownership (ACCESS_CHANGED)', () => {
  it('a target reassigned to another owner between mint and confirm is 403 ACCESS_CHANGED, zero effects', async () => {
    const pending = await mintTargetOp(7, 61);
    const op = await getPendingOperationStore().get(pending.operationId);
    const digest = await renderDigestOf(op);

    // The target client's assignment now belongs to trainer 42 — the minting
    // trainer (7) no longer owns it. The re-check must catch this.
    mockQuery.mockImplementation(async sql => /user-role-recheck/.test(sql) ? [{id:7,role:'trainer'}] : /target-user-recheck/.test(sql) ? [{id:61,role:'client'}] : [{clientId:61,trainerId:42,status:'active'}]);

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: digest, confirmChannel: 'tap' })
      .expect(403);

    expect(res.body.code).toBe('ACCESS_CHANGED');
    expect(mockExecuteConfirmed).not.toHaveBeenCalled();
    // No target details: the body must not reveal WHICH client moved.
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain('61');
    expect(bodyText).not.toContain('Client-');
    // The approval is untouched — the owner can re-issue.
    expect(await getPendingOperationStore().get(pending.operationId)).toBeTruthy();
  });

  it('a confirming user whose role was revoked is 403 ACCESS_CHANGED, zero effects', async () => {
    const pending = await mintTargetOp(7, 61);
    const op = await getPendingOperationStore().get(pending.operationId);
    const digest = await renderDigestOf(op);

    // The target still belongs to trainer 7, but 7 is now a deactivated client.
    mockQuery.mockImplementation(async (sql) => {
      if (/user-role-recheck/.test(String(sql))) return { rows: [{ id: 7, role: 'client', status: 'active' }] };
      if (/target-user-recheck/.test(String(sql))) return [{id:61,role:'client'}];
      return [{clientId:61,trainerId:7,status:'active'}];
    });

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: digest, confirmChannel: 'tap' })
      .expect(403);

    expect(res.body.code).toBe('ACCESS_CHANGED');
    expect(mockExecuteConfirmed).not.toHaveBeenCalled();
  });

  it('when ownership still holds at confirm time, the re-check passes and the op executes', async () => {
    const pending = await mintTargetOp(7, 61);
    const op = await getPendingOperationStore().get(pending.operationId);
    const digest = await renderDigestOf(op);

    mockQuery.mockImplementation(async (sql) => {
      if (/user-role-recheck/.test(String(sql))) return { rows: [{ id: 7, role: 'trainer', status: 'active' }] };
      if (/target-user-recheck/.test(String(sql))) return [{id:61,role:'client'}];
      return [{clientId:61,trainerId:7,status:'active'}];
    });

    const res = await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: digest, confirmChannel: 'tap' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockExecuteConfirmed).toHaveBeenCalledTimes(1);
  });
});

describe('T06 — the re-anchor happens BEFORE consume (no griefing, no double-exec)', () => {
  it('a lost-owner 403 leaves the approval intact for re-issue', async () => {
    const pending = await mintTargetOp(7, 61);
    const op = await getPendingOperationStore().get(pending.operationId);
    const digest = await renderDigestOf(op);
    mockQuery.mockImplementation(async sql => /user-role-recheck/.test(sql) ? [{id:7,role:'trainer'}] : /target-user-recheck/.test(sql) ? [{id:61,role:'client'}] : [{clientId:61,trainerId:99,status:'active'}]);

    await request(makeApp())
      .post('/api/ai-command/confirm')
      .send({ operationId: pending.operationId, renderedDigest: digest, confirmChannel: 'tap' })
      .expect(403);

    const survivor = await getPendingOperationStore().get(pending.operationId);
    expect(survivor).toBeTruthy();
    expect(survivor.createdBy).toBe(7);
  });
});
