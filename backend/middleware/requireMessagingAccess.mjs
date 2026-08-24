/**
 * ============================================================================
 * FILE: requireMessagingAccess.mjs
 * PURPOSE: Messaging authorization — relationship lane OR subscription lane
 * CREATED: 2026-08-21 · Wave 1 Slice 1 (client-dashboard remediation)
 * ============================================================================
 *
 * WHAT THIS FILE DOES
 * Replaces the blanket `requireTier('elite','trainer.messaging')` gate on
 * /api/messaging. That gate conflated a COACHING capability with a BILLING
 * tier: `tier` is written only by subscription checkout, and no package or
 * session-purchase controller writes it — so a client on a $33,600 training
 * package stays `tier: 'free'` and was 402'd out of contacting the trainer
 * they are paying. The permission key itself is named `trainer.messaging`.
 *
 * TWO LANES, evaluated in this order:
 *
 *   1. COMMUNITY lane  — `requireTier('elite')` semantics, unchanged.
 *      Elite/premium (and live trials, per requireTier's TRIAL_EFFECTIVE_TIER)
 *      keep FULL messaging: any participant, any conversation. The social-DM
 *      monetization rule is preserved exactly as-is (owner decision Q1: Yes).
 *
 *   2. RELATIONSHIP lane — NEW. A user with an active ClientTrainerAssignment
 *      may message ONLY their assigned counterparties, regardless of tier.
 *      Scoped deliberately: this is an accountability and safety channel
 *      (pain, injury, schedule), not a free pass into community DMs.
 *
 * Staff (admin/trainer) bypass first, matching requireTier's existing
 * behavior, so no trainer-side workflow changes.
 *
 * FAIL-CLOSED: any error resolving the relationship denies the relationship
 * lane. It never falls through to "allow". The community lane keeps
 * requireTier's own JWT-claim fallback for transient DB trouble.
 *
 * SCHEMA NOTE (verified against the tree, not memory — CLAUDE.md rule 58):
 *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
 *                                ("clientId", "trainerId"), status text.
 *   conversation_participants  : snake_case table AND columns
 *                                (conversation_id, user_id, deleted_at).
 *   The Sequelize model declares tableName 'ConversationParticipants' with
 *   camelCase columns — that model is DRIFTED. Every runtime query in this
 *   codebase (19 references) uses the snake_case form used here.
 *
 * ID NOTE: `protect` stores req.user.id as a STRING (authMiddleware toStringId).
 * Every comparison here goes through toId() so string/number mismatches cannot
 * silently deny a legitimate user — the exact bug fixed in
 * checkTrainerClientRelationship on 2026-04-18.
 */

import logger from '../utils/logger.mjs';
import {
  toId,
  loadAssignedCounterpartyIds,
  loadConversationMembers,
} from '../services/messagingAccessRepository.mjs';
import { meetsMinimumTier, tierDisplayName, featureLabel } from '../config/tierCatalog.mjs';
import { isGatingEnabled, resolveCurrentEntitlement } from './requireTier.mjs';

const COMMUNITY_MIN_TIER = 'elite';
const FEATURE_KEY = 'trainer.messaging';

/**
 * True when every participant id in the request body is an assigned
 * counterparty. Vacuously true when the body carries none.
 *
 * Used by BOTH the create and conversation scopes: "who may I put in a thread"
 * must be one rule, or the stricter scope is bypassable via the looser one.
 */
function assertRequestedParticipantsAllowed(req, counterparties, actorId) {
  // adminIds is included deliberately: promoting an unrelated user to admin of a
  // coach thread is the same escalation as adding them (Sol, pre-push panel).
  const requested = [
    ...(Array.isArray(req.body?.participantIds) ? req.body.participantIds : []),
    ...(Array.isArray(req.body?.adminIds) ? req.body.adminIds : []),
  ];
  const ids = requested.map(toId).filter((id) => id && id !== actorId);
  if (ids.length === 0) return true;
  return ids.every((id) => counterparties.has(id));
}

/** requireTier-compatible 402 so the frontend paywall interceptor is unchanged. */
function sendTierRequired(res, entitlement) {
  const { actualTier = 'free', effectiveTier = 'free', isTrial = false } = entitlement || {};
  return res.status(402).json({
    success: false,
    message: `This feature requires ${tierDisplayName(COMMUNITY_MIN_TIER)} or higher.`,
    code: 'TIER_REQUIRED',
    featureName: featureLabel(FEATURE_KEY),
    feature: FEATURE_KEY,
    requiredTier: COMMUNITY_MIN_TIER,
    currentTier: actualTier,
    effectiveTier,
    isTrial,
    upgradeUrl: '/ascension',
  });
}

/** 403 for a relationship user reaching outside their assigned counterparties. */
function sendOutsideRelationship(res) {
  return res.status(403).json({
    success: false,
    message: 'You can message your assigned trainer here. Upgrade to message other members.',
    code: 'OUTSIDE_COACHING_RELATIONSHIP',
    feature: FEATURE_KEY,
    upgradeUrl: '/ascension',
  });
}

/**
 * @param {Object}  options
 * @param {'list'|'create'|'conversation'} options.scope
 *   list         — GET /conversations. Already self-scoped by the controller,
 *                  so any active assignment is sufficient.
 *   create       — POST /conversations. body.participantIds must be a subset
 *                  of the actor's assigned counterparties.
 *   conversation — routes carrying :id. Every OTHER active participant must be
 *                  an assigned counterparty.
 */
export function requireMessagingAccess({ scope = 'conversation' } = {}) {
  return async (req, res, next) => {
    // Lane 0 — staff bypass, identical to requireTier's.
    if (req.user?.role === 'admin' || req.user?.role === 'trainer') return next();

    // Emergency kill switch, identical to requireTier's.
    if (!isGatingEnabled()) return next();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Lane 1 — COMMUNITY. Unchanged elite/trial semantics; full access.
    let entitlement = null;
    try {
      entitlement = await resolveCurrentEntitlement(req);
      if (meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER)) return next();
    } catch (error) {
      // resolveCurrentEntitlement already falls back to the JWT claim
      // internally; a throw here means something worse. Fall through to the
      // relationship lane rather than 500 — a paying client with an active
      // assignment must still reach their trainer.
      logger.warn('[MessagingAccess] entitlement resolution threw — trying relationship lane', {
        userId: req.user?.id,
        errorName: error instanceof Error ? error.name : typeof error,
      });
    }

    // Lane 2 — RELATIONSHIP. Tier is irrelevant from here down.
    const actorId = toId(req.user.id);
    const counterparties = await loadAssignedCounterpartyIds(actorId);

    // null = lookup failed (fail closed). Empty set = genuinely no assignment.
    if (!counterparties || counterparties.size === 0) {
      return sendTierRequired(res, entitlement);
    }

    if (scope === 'list') {
      // Relationship-only viewers must not see legacy community threads.
      //
      // Pre-push panel (GLM 5.3 and Sol, independently): the list response
      // carries last-message preview text and participant names/photos. Passing
      // the gate on "has any assignment" therefore widened access for a
      // downgraded subscriber who kept a trainer -- previously 402 and nothing,
      // now previews of threads whose read endpoints 403. Hand the controller
      // the counterparty set so it can narrow the result to relationship
      // threads. The gate decides access; the controller decides scope.
      req.messagingAccessLane = 'relationship';
      req.messagingCounterparties = counterparties;
      return next();
    }

    if (scope === 'create') {
      const requested = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
      const ids = requested.map(toId).filter((id) => id && id !== actorId);
      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one participant is required.',
        });
      }
      if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
        return sendOutsideRelationship(res);
      }
      req.messagingAccessLane = 'relationship';
      return next();
    }

    // scope === 'conversation'
    const membership = await loadConversationMembers(req.params?.id, actorId);
    if (membership === null) return sendOutsideRelationship(res); // fail closed

    // The actor must actually be in the thread, and it must not be an empty or
    // unknown conversation. Both are denied through the relationship lane.
    if (!membership.actorIsMember) return sendOutsideRelationship(res);
    if (membership.others.length === 0) return sendOutsideRelationship(res);

    // `others` now carries {id, role} so both gates can honour staff the same
    // way — widening the list without widening the write is what produced the
    // visible-but-unwritable admin thread. Mirrors isRelationshipWriteAllowed.
    const allInside = membership.others.every(
      (m) => counterparties.has(m.id) || m.role === 'admin' || m.role === 'trainer',
    );
    if (!allInside) return sendOutsideRelationship(res);

    // Validate anyone being ADDED, not just who is already here.
    //
    // Found by the pre-push panel (DeepSeek v4 Flash and Qwen 3.8 independently).
    // POST /conversations/:id/participants carries new users in the body. Without
    // this check the membership test above passes trivially — the thread's only
    // other member IS your assigned trainer — and the controller then adds an
    // arbitrary stranger, handing them the full message history. Creating such a
    // thread was already blocked by the `create` scope; adding to one was not,
    // which made the create-scope restriction bypassable in two steps.
    if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
      return sendOutsideRelationship(res);
    }

    req.messagingAccessLane = 'relationship';
    return next();
  };
}

/**
 * Resolve the two messaging capabilities for the authenticated actor, using the
 * SAME rules the middleware enforces. Exported so `GET /api/messaging/
 * capabilities` cannot drift from the gate it describes — a frontend that
 * recomputes entitlement locally is how the original bug survived (the server
 * treats a live trial as elite, the UI did not).
 *
 * @returns {Promise<{canMessageAssignedCoach:boolean, canUseCommunityDirectMessages:boolean}>}
 */
export async function resolveMessagingCapabilities(req) {
  if (req.user?.role === 'admin' || req.user?.role === 'trainer') {
    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
  }
  if (!isGatingEnabled()) {
    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
  }
  if (!req.user) {
    return { canMessageAssignedCoach: false, canUseCommunityDirectMessages: false };
  }

  let community = false;
  try {
    const entitlement = await resolveCurrentEntitlement(req);
    community = meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER);
  } catch {
    community = false;
  }

  const counterparties = await loadAssignedCounterpartyIds(toId(req.user.id));
  const hasRelationship = !!counterparties && counterparties.size > 0;

  return {
    // Community access implies the coach thread too.
    canMessageAssignedCoach: community || hasRelationship,
    canUseCommunityDirectMessages: community,
  };
}

export default requireMessagingAccess;
