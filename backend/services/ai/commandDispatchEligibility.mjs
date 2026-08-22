/**
 * commandDispatchEligibility.mjs — the chat lane's dispatch gate, for the command lane
 * ===================================================================================
 * H6 (2026-08-21 whole-Coach hostile round 1 — Sol, HY3, GLM and Grok independently).
 *
 * The chat lane runs every AI_ADD_EXERCISE frontend action through
 * filterEligibleFrontendActions (registry membership + the client's pain exclusions
 * + the workout builder's review_required safety gate, all fail-closed) — "Cortex P0
 * §5.4: chat must not be a side door around the builder's review". The command lane
 * emitted the SAME event from `add_exercise_to_form` with no gate at all: saying
 * "add burpees to the workout" in the command bar staged an exercise the builder
 * would 409 and the chat lane would refuse.
 *
 * This is the one call both command-lane dispatch paths (/execute's
 * frontend_dispatch branch and /confirm's confirmed frontend dispatch) now make. It
 * reuses the chat lane's exact gate and the chat lane's exact loaders, so the two
 * lanes cannot drift apart again. Target resolution mirrors the chat lane too:
 * the selected client, else the requester's own context (template mode).
 *
 * Only AI_ADD_EXERCISE is gated — the eligibility service itself passes every
 * other event through untouched, exactly as it does for chat.
 */
import { filterEligibleFrontendActions } from './coachDispatchEligibilityService.mjs';

/**
 * @param {Object} args
 * @param {string} args.event           frontend event name the command would emit
 * @param {Object} args.payload         the validated command params
 * @param {number|null} args.targetClientId  selected/resolved client, if any
 * @param {Object} args.user            authenticated requester { id }
 * @returns {Promise<{ allowed: boolean, refusals: Array }>}
 */
export async function gateCommandFrontendDispatch({ event, payload, targetClientId, user }) {
  const eligibility = await filterEligibleFrontendActions({
    actions: [{ event, payload: payload || {} }],
    targetUserId: targetClientId || user?.id,
    requestingUserId: user?.id,
    loadRegistry: async () => {
      const { getExerciseRegistryFromDB } = await import('../variationEngine.mjs');
      return getExerciseRegistryFromDB();
    },
    loadClientContext: async (clientId, requesterId) => {
      const { getClientContext } = await import('../clientIntelligenceService.mjs');
      return getClientContext(clientId, requesterId);
    },
  });
  return {
    allowed: eligibility.allowed.length === 1,
    refusals: eligibility.refusals,
  };
}

/** Honest refusal payload shared by both routes. */
export function buildDispatchRefusalResponse(command, refusals) {
  const first = refusals[0] || {};
  return {
    success: false,
    type: 'error',
    code: 'DISPATCH_INELIGIBLE',
    error: first.reason
      ? `Swan Coach did not stage this: ${first.reason}.`
      : 'Swan Coach did not stage this — it did not pass the client safety check.',
    command: command?.type ?? null,
    refusals,
    fallbackToChat: false,
  };
}
