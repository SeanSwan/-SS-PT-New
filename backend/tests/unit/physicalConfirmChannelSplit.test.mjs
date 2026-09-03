/**
 * M3 channel split — the mishearing channel cannot authorize (finding F-03).
 * ==========================================================================
 * The rule "a voice confirmation may not authorize an act that crosses client
 * identity" existed twice before this: as prose in a comment, and as an exported
 * client helper (`allowedConfirmChannels`) that no caller ever invoked. Both
 * forms are unenforceable — the first by nature, the second because an exported
 * function with no consumer is decoration that reads as a control.
 *
 * The split is now: the MINT decides (that is where the spoken-name versus
 * selection evidence exists) and stamps `requiresPhysicalConfirm` on the signed
 * operation; `/confirm` enforces (that is where the channel is declared). These
 * tests drive the mounted handler, so a check moved, renamed, or made
 * conditional on a flag fails here rather than passing on a comment.
 *
 * HONEST SCOPE, and it belongs in the test file too so nobody reads a green
 * suite as more than it is: `confirmChannel` is the CLIENT'S word. A hostile
 * client claims 'tap' and passes. What this closes is the ACCIDENTAL path —
 * ambient speech, a misheard "yes", a surface that never learned the rule —
 * which is the path the original incident actually took. Calling it
 * authentication would be a lie; it is a seatbelt.
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
  executeCommandPipeline: vi.fn(),
  checkForConfirmation: vi.fn(),
  executeConfirmedOperation: vi.fn(async () => ({ success: true, type: 'executed' })),
}));

const peekOperation = vi.fn();
vi.mock('../../services/ai/destructiveOperations.mjs', () => ({
  peekOperation: (...a) => peekOperation(...a),
  cancelOperation: vi.fn(),
  getPendingCount: vi.fn(async () => 0),
  assertOperationSigningKey: vi.fn(),
}));

const { executeConfirmedOperation } = await import('../../services/ai/commandExecutor.mjs');
const router = (await import('../../routes/aiCommandRoutes.mjs')).default;

/** The mounted POST /confirm handler — the router's own copy, not a re-import. */
const confirmHandler = (() => {
  const layer = router.stack.find((l) => l.route?.path === '/confirm' && l.route?.methods?.post);
  if (!layer) throw new Error('POST /confirm is not mounted — the walk broke, not the route');
  return layer.route.stack.at(-1).handle;
})();

async function postConfirm(body) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  await confirmHandler({ body, user: { id: 7, role: 'trainer' } }, res, () => {});
  return res;
}

const PHYSICAL_OP = {
  id: 'op-physical', commandType: 'cancel_session', requiresPhysicalConfirm: true,
  createdBy: 7, params: { clientId: 42 },
};
const ORDINARY_OP = {
  id: 'op-ordinary', commandType: 'log_workout', requiresPhysicalConfirm: false,
  createdBy: 7, params: { clientId: 42 },
};

beforeEach(() => {
  peekOperation.mockReset();
  vi.mocked(executeConfirmedOperation).mockClear();
  vi.mocked(executeConfirmedOperation).mockResolvedValue({ success: true, type: 'executed' });
});

describe('M3 channel split at /confirm', () => {
  it('refuses a VOICE confirmation of an operation that requires physical confirm', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: PHYSICAL_OP });
    const res = await postConfirm({ operationId: 'op-physical', confirmChannel: 'voice' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('physical_confirm_required');
    // The refusal must happen BEFORE consumption: a refused ceremony that has
    // already burned the operation forces a re-issue and teaches the operator
    // that refusals cost them their approval.
    expect(executeConfirmedOperation).not.toHaveBeenCalled();
  });

  it('refuses when NO channel is declared — unproven is not the same as safe', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: PHYSICAL_OP });
    const res = await postConfirm({ operationId: 'op-physical' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('physical_confirm_required');
    expect(executeConfirmedOperation).not.toHaveBeenCalled();
  });

  it('refuses an unrecognised channel rather than falling through to allow', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: PHYSICAL_OP });
    const res = await postConfirm({ operationId: 'op-physical', confirmChannel: 'telepathy' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('physical_confirm_required');
  });

  it('accepts a TAP confirmation of the same operation', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: PHYSICAL_OP });
    const res = await postConfirm({ operationId: 'op-physical', confirmChannel: 'tap' });

    expect(res.statusCode).toBe(200);
    expect(executeConfirmedOperation).toHaveBeenCalledTimes(1);
  });

  it('accepts KEYBOARD — a physical control, not a spoken one', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: PHYSICAL_OP });
    const res = await postConfirm({ operationId: 'op-physical', confirmChannel: 'keyboard' });

    expect(res.statusCode).toBe(200);
    expect(executeConfirmedOperation).toHaveBeenCalledTimes(1);
  });

  it('leaves an ordinary operation alone — voice still confirms what it may confirm', async () => {
    peekOperation.mockResolvedValue({ found: true, operation: ORDINARY_OP });
    const res = await postConfirm({ operationId: 'op-ordinary', confirmChannel: 'voice' });

    expect(res.statusCode).toBe(200);
    expect(executeConfirmedOperation).toHaveBeenCalledTimes(1);
  });

  it('does not invent a refusal for an operation the store no longer holds', async () => {
    // An expired operation must reach the executor's own not-found handling and
    // report as expired. Refusing it here as `physical_confirm_required` would
    // send the operator hunting for a client mismatch that does not exist.
    peekOperation.mockResolvedValue({ found: false, operation: null });
    const res = await postConfirm({ operationId: 'gone', confirmChannel: 'voice' });

    expect(res.body?.code).not.toBe('physical_confirm_required');
    expect(executeConfirmedOperation).toHaveBeenCalledTimes(1);
  });
});
