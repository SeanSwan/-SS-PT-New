/**
 * ============================================================================
 * FILE: aiPlanGenerationCrossUserInvariant.test.mjs
 * PURPOSE: Probe + invariant for the two AMBIGUOUS hand-rolled role gates in the
 *          `'user'`-class (register §A3): controllers/aiWorkoutController.mjs:288
 *          and controllers/longHorizonController.mjs:201.
 * RULES OBSERVED: rule 17 (dual-pass), rule 51 (confidence tags), rule 55
 *                 (diagnostic probe requirement). PLAN: do not fix — report.
 * ============================================================================
 *
 * WHY THESE TWO ARE NOT §A2 DEFECTS. `authorize([...])` appears nowhere in
 * routes/aiRoutes.mjs:51-58 or :76-83 — the chain is
 * `protect → aiKillSwitch → requireSubscription('pro') → aiRateLimiter →
 * controller`. There is no second guard to disagree with, so the §A2 pairing
 * signature does not apply. The controller's own whitelist
 * (`requesterRole !== 'admin' && requesterRole !== 'client'` → 403) is the ONLY
 * role gate, and it FAILS CLOSED for `'user'`. Whether these paths are meant to
 * be client-facing at all is a product decision, so this file deliberately does
 * NOT assert that `'user'` must be admitted or must be refused.
 *
 * WHAT IT DOES ASSERT — the invariant that must hold under EITHER decision:
 * a requester may never cause plan generation for a DIFFERENT user through these
 * two paths. [VERIFIED by executed probe: today the role gate is what enforces
 * it for `'user'`, and the self-isolation guard
 * (aiWorkoutController.mjs:252 / longHorizonController.mjs:174) covers ONLY
 * `'client'`.]
 *
 * The failure this guards against is a PARTIAL client-equivalence fix: adding
 * `'user'` to :288/:201 alone would let a `'user'` supply an arbitrary
 * `userId` and reach the provider for someone else, because the `'user'` falls
 * past the `'client'`-only self-isolation guard and the `'client'`-only
 * targetUserId fallback (:243 / :162). A correct fix must move all three sites
 * onto `isClientEquivalentRole` together. This test stays TRUE under a correct
 * full fix (the isolation guard then refuses the cross-user case for `'user'`
 * too) and goes RED under the naive one.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/index.mjs', () => ({ getAllModels: vi.fn() }));
vi.mock('../../database.mjs', () => ({ default: { transaction: vi.fn() } }));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../routes/aiMonitoringRoutes.mjs', () => ({ updateMetrics: vi.fn() }));
vi.mock('../../services/deIdentificationService.mjs', () => ({
  deIdentify: vi.fn(() => ({ deIdentified: { client: {} }, strippedFields: [] })),
  hashPayload: vi.fn(() => 'hash'),
}));
vi.mock('../../services/ai/providerRouter.mjs', () => ({
  routeAiGeneration: vi.fn(), registerAdapter: vi.fn(),
}));
vi.mock('../../services/ai/rateLimiter.mjs', () => ({ releaseConcurrent: vi.fn() }));
vi.mock('../../services/ai/types.mjs', () => ({ PROMPT_VERSION: 'probe' }));
vi.mock('../../services/ai/degradedResponse.mjs', () => ({
  buildDegradedResponse: vi.fn(() => ({ success: true, degraded: true })),
}));
vi.mock('../../services/ai/templateContextBuilder.mjs', () => ({
  buildTemplateContext: vi.fn(() => ({})),
}));
vi.mock('../../services/ai/longHorizonPromptBuilder.mjs', () => ({
  buildLongHorizonPrompt: vi.fn(() => 'prompt'),
  LONG_HORIZON_SYSTEM_MESSAGE: 'system',
}));
vi.mock('../../services/ai/longHorizonContextBuilder.mjs', () => ({
  buildLongHorizonContext: vi.fn(async () => null),
}));
// The discriminator: if this is reached, the role gate ADMITTED the request.
vi.mock('../../services/ai/aiEligibilityHelper.mjs', () => ({
  checkAiEligibility: vi.fn(async () => ({ decision: 'deny', reasonCode: 'PROBE_REACHED_ELIGIBILITY' })),
}));

const { getAllModels } = await import('../../models/index.mjs');
const { checkAiEligibility } = await import('../../services/ai/aiEligibilityHelper.mjs');
const { generateWorkoutPlan } = await import('../../controllers/aiWorkoutController.mjs');
const { generateLongHorizonPlan } = await import('../../controllers/longHorizonController.mjs');

const SELF = 901;
const OTHER = 902;

const mockRes = () => {
  const res = { statusCode: null, body: null, headersSent: false };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.sendStatus = (code) => { res.statusCode = code; return res; };
  res.setHeader = () => res;
  return res;
};

// A trainer assignment always resolves, so the `'trainer'` branch is not the
// thing under observation, and models never hit a database.
const mockModels = () => ({
  User: { findByPk: vi.fn(async () => ({ id: OTHER, role: 'client' })) },
  ClientTrainerAssignment: { findOne: vi.fn(async () => ({ id: 1, status: 'active' })) },
  ClientBaselineMeasurements: { findOne: vi.fn(async () => null) },
  AiConsentLog: { findOne: vi.fn(async () => null) },
});

const run = async (handler, { id, role }, body) => {
  const res = mockRes();
  await handler({ user: { id, role }, body }, res);
  return { status: res.statusCode, body: res.body, reachedEligibility: checkAiEligibility.mock.calls.length > 0 };
};

beforeEach(() => {
  getAllModels.mockReturnValue(mockModels());
  checkAiEligibility.mockClear();
});

const paths = [
  { label: 'aiWorkoutController.generateWorkoutPlan (:288)', handler: () => generateWorkoutPlan, body: (userId) => ({ userId, masterPromptJson: null }) },
  { label: 'longHorizonController.generateLongHorizonPlan (:201)', handler: () => generateLongHorizonPlan, body: (userId) => ({ userId, horizonMonths: 6 }) },
];

describe('AI plan generation — cross-user invariant (ambiguous sites, NOT fixed)', () => {
  it.each(paths)('$label: a "user" requester targeting ANOTHER user never reaches the provider', async ({ handler, body }) => {
    const observed = await run(handler(), { id: SELF, role: 'user' }, body(OTHER));
    expect(observed.reachedEligibility).toBe(false);
    expect(observed.status).toBe(403);
  });

  it.each(paths)('$label: an "admin" requester DOES reach the provider (gate is not blanket)', async ({ handler, body }) => {
    const observed = await run(handler(), { id: SELF, role: 'admin' }, body(OTHER));
    expect(observed.reachedEligibility).toBe(true);
  });

  it.each(paths)('$label: a "client" requester targeting ANOTHER user is refused by the self-isolation guard', async ({ handler, body }) => {
    const observed = await run(handler(), { id: SELF, role: 'client' }, body(OTHER));
    expect(observed.reachedEligibility).toBe(false);
    expect(observed.status).toBe(403);
    expect(String(observed.body?.message || '')).toMatch(/only generate .* for themselves/i);
  });

  it.each(paths)('$label: the self-isolation guard is "client"-only, which is why the role gate is load-bearing today', async ({ handler, body }) => {
    // Same cross-user request, role changed: the message identifies WHICH guard
    // refused it. For `'user'` it is the role gate, not the isolation guard —
    // so removing the role gate alone would not be caught by anything here.
    const asUser = await run(handler(), { id: SELF, role: 'user' }, body(OTHER));
    const asClient = await run(handler(), { id: SELF, role: 'client' }, body(OTHER));
    expect(String(asUser.body?.message || '')).toMatch(/invalid role/i);
    expect(String(asClient.body?.message || '')).toMatch(/only generate .* for themselves/i);
  });

  it.each(paths)('$label: a "user" requester with NO userId is refused before the role gate at all', async ({ handler, body }) => {
    // targetUserId falls back to requesterId only for 'client' (:243 / :162), so
    // a 'user' cannot even self-target — the shape is client-only end to end.
    const observed = await run(handler(), { id: SELF, role: 'user' }, body(undefined));
    expect(observed.status).toBe(400);
    expect(observed.reachedEligibility).toBe(false);
  });
});
