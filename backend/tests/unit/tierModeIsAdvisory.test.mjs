/**
 * APPROVAL_TIER_MODE is advisory, and /health must say so.
 * ========================================================
 * Self-review round 3, 2026-09-03. `APPROVAL_TIER_MODE` is read in exactly one
 * place in the executor — a log line. F-01 made a tier refusal short-circuit in
 * BOTH modes (authorization must never be a rollout flag), and the ceremony the
 * sheet renders travels in the envelope regardless of mode. So the flag changes
 * a log field and a health string, and nothing else.
 *
 * That is fine as a state of affairs and dangerous as a presentation: /health
 * listed it beside `renderDigest` and `channel`, which DO gate behaviour, under
 * a comment about knowing "whether each check is ENFORCING or merely counting".
 * An incident commander reading that would flip it and believe they had hardened
 * the lane, at the one moment being wrong is expensive.
 *
 * These pin the truth in both directions: the flag changes no behaviour, and the
 * endpoint admits it. If someone WIRES the flag later, the first test fails and
 * points at the second — update the disclosure in the same change, or /health
 * starts under-promising instead of over-promising, which is the same bug.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
vi.mock('../../services/ai/destructiveOperations.mjs', () => ({
  peekOperation: vi.fn(async () => ({ found: false, operation: null })),
  cancelOperation: vi.fn(), getPendingCount: vi.fn(async () => 0), assertOperationSigningKey: vi.fn(),
}));
vi.mock('../../services/ai/commandRegistry/index.mjs', () => ({
  getAllCommandTypes: () => ['log_workout', 'cancel_session'],
  getCommand: vi.fn(), getCommandsForRole: vi.fn(() => []), initializeRegistry: vi.fn(),
}));

const router = (await import('../../routes/aiCommandRoutes.mjs')).default;

const healthHandler = (() => {
  const layer = router.stack.find((l) => l.route?.path === '/health' && l.route?.methods?.get);
  if (!layer) throw new Error('GET /health is not mounted — the walk broke, not the route');
  return layer.route.stack.at(-1).handle;
})();

async function getHealth(role) {
  const res = {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; },
  };
  await healthHandler({ user: { id: 1, role } }, res, () => {});
  return res.body;
}

const SAVED = process.env.APPROVAL_TIER_MODE;
beforeEach(() => { delete process.env.APPROVAL_TIER_MODE; });
afterEach(() => {
  if (SAVED === undefined) delete process.env.APPROVAL_TIER_MODE;
  else process.env.APPROVAL_TIER_MODE = SAVED;
});

describe('APPROVAL_TIER_MODE disclosure', () => {
  it('the tier mode is reported WITH its effect, not as a bare enforce/observe', async () => {
    const body = await getHealth('admin');
    expect(body.approvalModes.tier).toMatchObject({ mode: 'observe' });
    expect(body.approvalModes.tier.effect).toMatch(/advisory/i);
  });

  it('flipping it to enforce changes the label and still says advisory', async () => {
    process.env.APPROVAL_TIER_MODE = 'enforce';
    const body = await getHealth('admin');
    expect(body.approvalModes.tier.mode).toBe('enforce');
    expect(body.approvalModes.tier.effect).toMatch(/advisory/i);
  });

  it('the checks that DO gate behaviour stay plain strings — the shape marks the difference', async () => {
    const body = await getHealth('admin');
    expect(typeof body.approvalModes.renderDigest).toBe('string');
    expect(typeof body.approvalModes.channel).toBe('string');
    expect(body.approvalModes.channel).toBe('enforce');
  });
});

describe('/health operational posture is operator-only', () => {
  it('an admin sees the posture', async () => {
    const body = await getHealth('admin');
    expect(body.approvalModes).toBeTruthy();
    expect(body.approvalStore).toBeTruthy();
    expect(body.controls).toBeTruthy();
  });

  it('a CLIENT sees liveness and nothing about enforcement', async () => {
    // "Is the destructive-approval proof actually enforcing, and are approvals
    // durable?" is the reconnaissance an insider wants before trying a stale-tab
    // replay. Health for everyone; posture for the people who respond to it.
    const body = await getHealth('client');
    expect(body.success).toBe(true);
    expect(body.status).toBeTruthy();
    expect(body.approvalModes).toBeUndefined();
    expect(body.approvalStore).toBeUndefined();
    expect(body.approvalStoreDurable).toBeUndefined();
    expect(body.controls).toBeUndefined();
  });
});
