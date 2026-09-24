/**
 * /cancel writes into the approval namespace (finding F-11).
 * ==========================================================
 * The cancel route recorded a bare `outcome: 'cancelled'` while every other
 * point in the lifecycle recorded `approval:*`. That is not a cosmetic
 * inconsistency: the approval funnel reads its rows BY PREFIX, so cancellations
 * — the exit that says how often operators look at a read-back and back out —
 * were absent from the one metric they define. The funnel still rendered, and a
 * funnel missing an exit reads as complete rather than as broken, which is the
 * failure mode worth a test.
 *
 * The previous guard for this was a regex over the route file's source text. It
 * asserted that a string appeared, which a comment mentioning the string would
 * also satisfy, and which said nothing about whether a request produced a row.
 * This drives the mounted handler instead.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../middleware/authMiddleware.mjs', () => ({ protect: (_q, _s, n) => n() }));
vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: (_q, _s, n) => n(),
  aiCommandRateLimiter: (_q, _s, n) => n(),
}));
vi.mock('../../database.mjs', () => ({ default: { query: vi.fn() } }));
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn(async () => true) }));
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/commandDispatchEligibility.mjs', () => ({
  gateCommandFrontendDispatch: vi.fn(), buildDispatchRefusalResponse: vi.fn(),
}));
vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: vi.fn(), checkForConfirmation: vi.fn(), executeConfirmedOperation: vi.fn(),
}));

const cancelOperation = vi.fn();
vi.mock('../../services/ai/destructiveOperations.mjs', () => ({
  cancelOperation: (...a) => cancelOperation(...a),
  peekOperation: vi.fn(async () => ({ found: false, operation: null })),
  getPendingCount: vi.fn(async () => 0),
  assertOperationSigningKey: vi.fn(),
}));

const recordApprovalEvent = vi.fn(async () => true);
vi.mock('../../services/ai/approvalEvents.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, recordApprovalEvent: (...a) => recordApprovalEvent(...a) };
});

const { APPROVAL_EVENTS, approvalOutcomeToken } = await import('../../services/ai/approvalEvents.mjs');
const router = (await import('../../routes/aiCommandRoutes.mjs')).default;

const cancelHandler = (() => {
  const layer = router.stack.find((l) => l.route?.path === '/cancel' && l.route?.methods?.post);
  if (!layer) throw new Error('POST /cancel is not mounted — the walk broke, not the route');
  return layer.route.stack.at(-1).handle;
})();

async function postCancel(body) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  await cancelHandler({ body, user: { id: 7, role: 'trainer' } }, res, () => {});
  return res;
}

beforeEach(() => {
  cancelOperation.mockReset();
  recordApprovalEvent.mockClear();
});

describe('POST /cancel — approval namespace', () => {
  it('emits approval:cancelled when an operation is actually cancelled', async () => {
    cancelOperation.mockResolvedValue(true);
    const res = await postCancel({ operationId: 'op-1' });

    expect(res.body.success).toBe(true);
    expect(recordApprovalEvent).toHaveBeenCalledTimes(1);
    const entry = recordApprovalEvent.mock.calls[0][0];
    expect(entry.event).toBe(APPROVAL_EVENTS.CANCELLED);
    expect(entry.operationId).toBe('op-1');
    // The prefix is the whole point — the funnel reads by it.
    expect(approvalOutcomeToken(entry.event)).toBe('approval:cancelled');
  });

  it('emits NOTHING when there was no operation to cancel', async () => {
    // A cancel for an expired or already-consumed id must not inflate the
    // cancelled count; "the operator backed out" and "the operator was too late"
    // are different facts and the funnel is only useful if it can tell them apart.
    cancelOperation.mockResolvedValue(false);
    const res = await postCancel({ operationId: 'gone' });

    expect(res.body.success).toBe(false);
    expect(recordApprovalEvent).not.toHaveBeenCalled();
  });

  it('rejects a cancel with no operationId before touching the store', async () => {
    const res = await postCancel({});

    expect(res.statusCode).toBe(400);
    expect(cancelOperation).not.toHaveBeenCalled();
    expect(recordApprovalEvent).not.toHaveBeenCalled();
  });
});
