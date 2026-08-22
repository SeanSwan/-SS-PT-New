/**
 * commandExecutorClientRoleSelfScope.test.mjs
 * ===========================================
 * H1 (2026-08-21 whole-Coach hostile round 1, Fable seat). A client-role user
 * could read ANOTHER user's gamification profile through the command lane:
 *
 *   "show client #99's XP"
 *     → classifier: view_xp_streaks, params.clientId = 99   (LLM-extracted)
 *     → stepRbac: client is an allowed role for this command   ✓ passes
 *     → stepResolveClient: resolveClient('#99', { trainerId: undefined })
 *          — trainer scoping only applies to TRAINERS, so a client resolves
 *          any id unscoped
 *     → dispatchViewXpStreaks reads user 99's points / streaks / achievements
 *
 * The REST route for the same data (`GET /api/v1/gamification/users/:userId/
 * profile`) is guarded by authorizeResourceAccess('userId'). The command lane
 * mirrored the endpoint without the guard. The route-level envelope check
 * (assertAssignmentOrAdmin, which DOES enforce self-only for clients) only
 * covers `selectedClientId`, never the LLM-extracted params path.
 *
 * Root fix is structural, not per-command: the executor now scopes every
 * client/user-role caller to themselves in stepResolveClient, so any FUTURE
 * command allowed to clients with requiresClientRef inherits the guard.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const clientUser = { id: 42, role: 'client', firstName: 'Ava', lastName: 'Strong' };
const rawUser = { id: 42, role: 'user', firstName: 'Ava', lastName: 'Strong' };
const trainerUser = { id: 7, role: 'trainer', firstName: 'Tee', lastName: 'Coach' };

async function loadPipeline({ intent, resolvedClient, dispatch = async () => ({ ok: true }) }) {
  vi.resetModules();
  const resolveClient = vi.fn(async (ref) => ({
    resolved: resolvedClient ?? { id: Number(String(ref).replace(/\D/g, '')) || 42, firstName: 'X', lastName: 'Y' },
    suggestions: [],
    error: null,
  }));
  vi.doMock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent: vi.fn(async () => intent) }));
  vi.doMock('../../services/ai/clientResolver.mjs', () => ({ resolveClient }));
  vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({
    dispatch: vi.fn(dispatch),
    hasDispatcher: vi.fn(() => true),
  }));
  const registry = await import('../../services/ai/commandRegistry/index.mjs');
  registry.initializeRegistry();
  const executor = await import('../../services/ai/commandExecutor.mjs');
  return { ...executor, resolveClient };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

const xpIntentFor = (clientId) => ({ intent: 'view_xp_streaks', params: { clientId }, confidence: 0.97 });

describe('client-role self-scoping in the command lane (H1)', () => {
  it('H1-1: a client asking for ANOTHER user id is refused before resolution', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({ intent: xpIntentFor(99) });

    const ctx = await executeCommandPipeline("show client #99's XP", clientUser, { sequelize: {} });

    expect(ctx.error).toMatch(/your own/i);
    expect(ctx.resolvedClient).toBeNull();
    // Never even looks the other user up — the guard is before resolution.
    expect(resolveClient).not.toHaveBeenCalled();
  });

  it('H1-2: the raw "user" role can never resolve another user either (RBAC or self-scope, whichever fires first)', async () => {
    // view_xp_streaks does not list 'user' in roleRequired, so RBAC rejects it one
    // gate before self-scoping runs. Either gate is an acceptable rejection; the
    // invariant is that resolvedClient is NEVER another user. Asserting on the exact
    // message would pin gate ORDER, which is not the property under test.
    const { executeCommandPipeline, resolveClient } = await loadPipeline({ intent: xpIntentFor(99) });
    const ctx = await executeCommandPipeline("show client #99's XP", rawUser, { sequelize: {} });
    expect(ctx.error).toBeTruthy();
    expect(ctx.resolvedClient).toBeNull();
    expect(resolveClient).not.toHaveBeenCalled();
  });

  it('H1-3: a client-supplied selectedClientId for someone else is refused too', async () => {
    // Belt and braces: the route envelope checks selectedClientId already, but the
    // executor must not depend on the route for its own safety.
    const { executeCommandPipeline } = await loadPipeline({ intent: { intent: 'view_xp_streaks', params: {}, confidence: 0.97 } });
    const ctx = await executeCommandPipeline('show my XP', clientUser, { selectedClientId: 99, sequelize: {} });
    expect(ctx.error).toMatch(/your own/i);
    expect(ctx.resolvedClient).toBeNull();
  });

  it('H1-4: a client asking about THEMSELVES still works, and resolves to self', async () => {
    const { executeCommandPipeline } = await loadPipeline({ intent: xpIntentFor(42) });
    const ctx = await executeCommandPipeline('show my XP', clientUser, { sequelize: {} });
    expect(ctx.error).toBeFalsy();
    expect(ctx.resolvedClient?.id).toBe(42);
  });

  it('H1-5: a client with NO client ref resolves to self instead of being asked "which client?"', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({ intent: { intent: 'view_xp_streaks', params: {}, confidence: 0.97 } });
    const ctx = await executeCommandPipeline('show my XP', clientUser, { sequelize: {} });
    expect(ctx.error).toBeFalsy();
    expect(ctx.resolvedClient?.id).toBe(42);
    expect(resolveClient).not.toHaveBeenCalled();
  });

  it('H1-6: trainers are NOT affected — assignment scoping still flows through resolveClient', async () => {
    const { executeCommandPipeline, resolveClient } = await loadPipeline({ intent: xpIntentFor(55) });
    const ctx = await executeCommandPipeline("show client #55's XP", trainerUser, { sequelize: {} });
    expect(ctx.error).toBeFalsy();
    expect(resolveClient).toHaveBeenCalledWith('#55', expect.anything(), expect.objectContaining({ trainerId: 7 }));
  });
});

describe('previousContext PHI scrub (H5)', () => {
  it('H5: an email in previousContext is stripped BEFORE the classifier sees it', async () => {
    // Sol + Grok (round 1): previousContext was identity-sanitized by the route but
    // never PHI-scanned by the executor, so an email/phone/payment detail from an
    // earlier turn reached the external classifier verbatim.
    vi.resetModules();
    const classifyIntent = vi.fn(async () => ({ intent: 'chat', params: {}, confidence: 0.9 }));
    vi.doMock('../../services/ai/intentClassifier.mjs', () => ({ classifyIntent }));
    vi.doMock('../../services/ai/clientResolver.mjs', () => ({ resolveClient: vi.fn() }));
    vi.doMock('../../services/ai/commandDispatcher.mjs', () => ({ dispatch: vi.fn(), hasDispatcher: vi.fn(() => false) }));
    const registry = await import('../../services/ai/commandRegistry/index.mjs');
    registry.initializeRegistry();
    const { executeCommandPipeline } = await import('../../services/ai/commandExecutor.mjs');

    await executeCommandPipeline('what next', trainerUser, {
      sequelize: {},
      previousContext: 'Earlier the client said: reach me at someone@example.com about the plan',
    });

    expect(classifyIntent).toHaveBeenCalledTimes(1);
    const seen = classifyIntent.mock.calls[0][2]?.previousContext ?? '';
    expect(seen).not.toContain('someone@example.com');
    expect(seen).toMatch(/about the plan/);
  });
});
