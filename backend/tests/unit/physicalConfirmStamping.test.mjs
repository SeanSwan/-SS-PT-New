/**
 * The DECISION reaches the OPERATION — the link F-03 is worthless without.
 * ========================================================================
 * The M3 split has three parts and I had tested two of them:
 *
 *   1. the tier DECIDES `physical`            — covered (spokenNameVsSelection)
 *   2. the mint STAMPS it on the operation    — NOT COVERED
 *   3. /confirm ENFORCES it against a channel — covered (physicalConfirmChannelSplit)
 *      and the signature BINDS it             — covered (storeSeam A23, pendingLane)
 *
 * With part 2 untested, `requiresPhysicalConfirm: false` hardcoded at the mint
 * would leave every one of those suites green while the feature did nothing at
 * all: the enforcement would be correct about a flag that was never true, and
 * the signature would faithfully bind a constant. That is the "exists ≠ works"
 * shape — three green files describing a chain with a cut wire in the middle.
 *
 * These drive the real pipeline and read the STORED record, so the wire has to
 * be connected for them to pass.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyIntent } from '../../services/ai/intentClassifier.mjs';
import { getCommand } from '../../services/ai/commandRegistry/index.mjs';
import { hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import { resolveClient } from '../../services/ai/clientResolver.mjs';
import { executeCommandPipeline } from '../../services/ai/commandExecutor.mjs';
import {
  getPendingOperationStore, resetPendingOperationStore,
} from '../../services/ai/pendingOperationStore.mjs';

vi.mock('../../models/AiCommandAuditLog.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../services/ai/commandAudit.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, recordCommandAudit: vi.fn(async () => true) };
});
vi.mock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent: vi.fn() }));
vi.mock('../../services/ai/commandRegistry/index.mjs', () => ({
  getCommand: vi.fn(), getCommandsForRole: vi.fn(() => []),
  getAllCommandTypes: vi.fn(() => []), initializeRegistry: vi.fn(),
}));
vi.mock('../../services/ai/commandDispatcher.mjs', () => ({
  dispatch: vi.fn(), hasDispatcher: vi.fn(() => true),
}));
vi.mock('../../services/ai/debate/debateOrchestrator.mjs', () => ({ startDebate: vi.fn() }));
vi.mock('../../services/ai/debate/debateClientContextService.mjs', () => ({
  buildDebateClientContext: vi.fn(),
}));
vi.mock('../../services/ai/clientResolver.mjs', () => ({ resolveClient: vi.fn() }));

const TRAINER = { id: 2, role: 'trainer', firstName: 'Tess', lastName: 'T' };

/**
 * A handle is enough — resolveClient is mocked. But it must be PRESENT:
 * stepResolveClient bails without one, leaving `ctx.clientIdentity` unset, and
 * the tier then falls back to the params/resolved pair. That fallback reads
 * locked=null / target=61 and escalates via `unlocked_target` — so the first
 * draft of this file passed while never exercising the spoken-vs-selected
 * comparison it claims to test. Hence the reason assertions below: a test that
 * can reach the same verdict down a different road is not testing the road.
 */
const SEQUELIZE = {};

const SAFE_WRITE = {
  type: 'log_workout',
  description: 'Log a workout',
  roleRequired: ['admin', 'trainer'],
  destructive: false,
  requiresConfirmation: true,
  /**
   * TRUE, and it is load-bearing: `stepResolveClient` returns immediately when
   * this is false, so `ctx.clientIdentity` is never populated and the F-05a
   * spoken-vs-selected comparison never runs. The first draft of this file used
   * false (copied from another suite) and the tier fell back to the
   * params/resolved pair — reaching `physical: true` via `unlocked_target`
   * instead of `cross_client`, i.e. the right answer down the wrong road.
   */
  requiresClientRef: true,
  selfService: false,
  inputSchema: null,
};

const DESTRUCTIVE = {
  ...SAFE_WRITE,
  type: 'cancel_session',
  description: 'Cancel a session',
  destructive: true,
  method: 'DELETE',
  endpoint: '/api/sessions/:id',
};

/**
 * KAYLA is selected; JORDAN is spoken. That disagreement is the whole scenario —
 * the operator says one name while a different client is on screen.
 */
const KAYLA = { id: 61, firstName: 'Client', lastName: '61' };
const JORDAN = { id: 47, firstName: 'Client', lastName: '47' };

function primeIntent(command, params = {}) {
  classifyIntent.mockResolvedValue({
    intent: command.type, clientRef: 'jordan', params, confidence: 0.95,
  });
  getCommand.mockReturnValue(command);
  hasDispatcher.mockReturnValue(true);
  // First call resolves the SELECTION, the F-05a lookup resolves the SPOKEN name.
  resolveClient.mockImplementation(async (ref) => (
    ref === 'jordan'
      ? { resolved: JORDAN, candidates: [] }
      : { resolved: KAYLA, candidates: [] }
  ));
}

/** The record as STORED — not the envelope the route hands back. */
async function storedOperationFrom(ctx) {
  const id = ctx.result?.operationId;
  expect(id, 'the pipeline did not mint an operation').toBeTruthy();
  return getPendingOperationStore().get(id);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPendingOperationStore();
});
afterEach(() => resetPendingOperationStore());

describe('the M3 verdict reaches the stored operation', () => {
  it('VOICE + a different client named ⇒ the SAFE-WRITE op is stamped physical', async () => {
    primeIntent(SAFE_WRITE, { clientId: 61 });

    const ctx = await executeCommandPipeline("log Jordan's workout", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'voice' },
    });
    const stored = await storedOperationFrom(ctx);

    expect(stored.requiresPhysicalConfirm).toBe(true);
    // The verdict must come from the SPOKEN-vs-SELECTED disagreement, not from
    // some other escalation that happens to land on the same boolean.
    expect(ctx.confirmationTier.reasons).toContain('cross_client');
    expect(ctx.confirmationTier.reasons).toContain('voice_identity_crossing');
  });

  it('VOICE + a different client named ⇒ the DESTRUCTIVE op is stamped physical too', async () => {
    // Both mint paths must carry it. They are separate call sites, and a stamp
    // wired into one of them is the "second code path inherits nothing" failure
    // this program has already hit once.
    primeIntent(DESTRUCTIVE, { clientId: 61, sessionId: 184 });

    const ctx = await executeCommandPipeline("cancel Jordan's session", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'voice' },
    });
    const stored = await storedOperationFrom(ctx);

    expect(stored.requiresPhysicalConfirm).toBe(true);
    expect(ctx.confirmationTier.reasons).toContain('cross_client');
  });

  it('TYPED, same disagreement ⇒ NOT physical — text is a channel that cannot mishear', async () => {
    // The negative control that keeps this honest. If the stamp were hardcoded
    // true, every assertion above would still pass and the enforcement would
    // start refusing ordinary typed work.
    primeIntent(SAFE_WRITE, { clientId: 61 });

    const ctx = await executeCommandPipeline("log Jordan's workout", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'text' },
    });
    const stored = await storedOperationFrom(ctx);

    // Still cross-client — the operator DID name someone else. What changes is
    // the channel: text cannot mishear, so the disagreement is shown, not gated.
    expect(ctx.confirmationTier.reasons).toContain('cross_client');
    expect(stored.requiresPhysicalConfirm).toBe(false);
  });

  it('VOICE with NO identity disagreement ⇒ NOT physical — voice alone is not the trigger', async () => {
    classifyIntent.mockResolvedValue({
      intent: SAFE_WRITE.type, clientRef: null, params: { clientId: 61 }, confidence: 0.95,
    });
    getCommand.mockReturnValue(SAFE_WRITE);
    hasDispatcher.mockReturnValue(true);
    resolveClient.mockResolvedValue({ resolved: KAYLA, candidates: [] });

    const ctx = await executeCommandPipeline('log a workout', TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'voice' },
    });
    const stored = await storedOperationFrom(ctx);

    expect(stored.requiresPhysicalConfirm).toBe(false);
    expect(ctx.confirmationTier.reasons).not.toContain('cross_client');
  });

  it('a routeContext with NO inputMode is UNPROVEN, not assumed safe', async () => {
    /**
     * The second half of the inert-M3 bug. Repairing the property path was not
     * enough: no caller sent `inputMode` at all, so a `?? 'text'` default kept
     * answering "safe channel" for every request. A default that supplies the
     * permissive answer turns "nobody told us" into "we checked".
     *
     * This is the shape every real caller had on the day the bug was found, so
     * it is the case most worth pinning.
     */
    primeIntent(SAFE_WRITE, { clientId: 61 });

    const ctx = await executeCommandPipeline("log Jordan's workout", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { source: 'coach-command-center', intent: null },
    });
    const stored = await storedOperationFrom(ctx);

    expect(stored.requiresPhysicalConfirm).toBe(true);
    expect(ctx.confirmationTier.reasons).toContain('unproven_channel_identity_crossing');
    // Not the voice reason — we do not know it was voice, only that we cannot
    // show it was safe. The audit trail must not claim more than that.
    expect(ctx.confirmationTier.reasons).not.toContain('voice_identity_crossing');
  });

  it('a declared UI channel is safe — the typed lane is not collateral damage', async () => {
    primeIntent(SAFE_WRITE, { clientId: 61 });

    const ctx = await executeCommandPipeline("log Jordan's workout", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'ui' },
    });
    const stored = await storedOperationFrom(ctx);

    expect(stored.requiresPhysicalConfirm).toBe(false);
    expect(ctx.confirmationTier.reasons).toContain('cross_client');
  });

  it('params.clientId is NORMALIZED to the resolved client — which is why the tier does not compare it', async () => {
    /**
     * R2-6 (GLM 5.3 round 2) asked why, with a lock present, a params-sourced
     * target is never compared against it — `cross_client` cannot fire from
     * `params.clientId !== lockedClientId`.
     *
     * Verified, and the answer is that the comparison would be a tautology:
     * stepResolveClient WRITES the resolved client back into params
     * (`ctx.intent.params.clientId = resolved.id`), so by the time the tier runs
     * the two values are the same object's id twice over. That is precisely the
     * self-comparison card 1.2 shipped and F-05a was created to escape, and
     * re-adding it would restore an alarm that cannot fire while looking like
     * coverage.
     *
     * The identities that CAN disagree are the selection and the spoken name,
     * and those are what ctx.clientIdentity carries. This test pins the
     * normalization so that if it ever stops happening, the reasoning above
     * stops being true and somebody is told.
     */
    primeIntent(SAFE_WRITE, { clientId: 999 });   // params disagree with the lock ON ENTRY

    const ctx = await executeCommandPipeline('log a workout', TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'ui' },
    });

    // The selection won and params was rewritten to match it — C0.5's law.
    expect(ctx.intent.params.clientId).toBe(61);
    expect(ctx.resolvedClient.id).toBe(61);
    // So a params-vs-lock comparison here would compare 61 with 61, forever.
    expect(ctx.clientIdentity.lockedClientId).toBe(61);
  });

  it('the stamped operation also carries its client binding top-level (F-12)', async () => {
    primeIntent(DESTRUCTIVE, { clientId: 61, sessionId: 184 });

    const ctx = await executeCommandPipeline("cancel Jordan's session", TRAINER, {
      selectedClientId: 61,
      sequelize: SEQUELIZE,
      routeContext: { inputMode: 'voice' },
    });
    const stored = await storedOperationFrom(ctx);

    // The render digest and the sheet's chip both read this. Before F-12 it was
    // reachable only inside `params`, so a consumer reading operation.clientId
    // got undefined and rendered "no client" over an operation that had one.
    expect(stored.clientId).toBe(61);
  });
});
