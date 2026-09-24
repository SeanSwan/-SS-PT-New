/**
 * commandDispatchEligibility.test.mjs — H6 helper contract.
 * Proves the command lane calls the chat lane's gate with the chat lane's
 * target-resolution rule, and maps its answer honestly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const filterEligibleFrontendActions = vi.fn();
vi.mock('../../services/ai/coachDispatchEligibilityService.mjs', () => ({
  filterEligibleFrontendActions: (...a) => filterEligibleFrontendActions(...a),
}));

const { gateCommandFrontendDispatch, buildDispatchRefusalResponse } =
  await import('../../services/ai/commandDispatchEligibility.mjs');

beforeEach(() => filterEligibleFrontendActions.mockReset());

describe('gateCommandFrontendDispatch (H6)', () => {
  it('targets the selected client, else the requester (chat-lane rule), and reports allowed', async () => {
    filterEligibleFrontendActions.mockResolvedValue({ allowed: [{ event: 'AI_ADD_EXERCISE' }], refusals: [] });
    const r = await gateCommandFrontendDispatch({ event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'Squat' }, targetClientId: 42, user: { id: 7 } });
    expect(r).toEqual({ allowed: true, refusals: [] });
    expect(filterEligibleFrontendActions).toHaveBeenCalledWith(expect.objectContaining({
      actions: [{ event: 'AI_ADD_EXERCISE', payload: { exerciseName: 'Squat' } }],
      targetUserId: 42, requestingUserId: 7,
    }));

    await gateCommandFrontendDispatch({ event: 'AI_ADD_EXERCISE', payload: {}, targetClientId: null, user: { id: 7 } });
    expect(filterEligibleFrontendActions.mock.calls[1][0].targetUserId).toBe(7);
  });

  it('reports NOT allowed when the gate refuses, carrying the refusals through', async () => {
    const refusals = [{ code: 'PAIN_EXCLUDED', reason: 'shoulder flagged' }];
    filterEligibleFrontendActions.mockResolvedValue({ allowed: [], refusals });
    const r = await gateCommandFrontendDispatch({ event: 'AI_ADD_EXERCISE', payload: {}, targetClientId: 42, user: { id: 7 } });
    expect(r).toEqual({ allowed: false, refusals });
    const body = buildDispatchRefusalResponse({ type: 'add_exercise_to_form' }, refusals);
    expect(body).toMatchObject({ success: false, type: 'error', code: 'DISPATCH_INELIGIBLE', command: 'add_exercise_to_form', fallbackToChat: false });
    expect(body.error).toMatch(/shoulder flagged/);
  });

  it('passes the loaders the chat lane uses, so the two lanes cannot drift', async () => {
    filterEligibleFrontendActions.mockResolvedValue({ allowed: [{}], refusals: [] });
    await gateCommandFrontendDispatch({ event: 'AI_ADD_EXERCISE', payload: {}, targetClientId: 1, user: { id: 1 } });
    const args = filterEligibleFrontendActions.mock.calls[0][0];
    expect(typeof args.loadRegistry).toBe('function');
    expect(typeof args.loadClientContext).toBe('function');
  });
});
