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

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { meetsMinimumTier, tierDisplayName, featureLabel } from '../config/tierCatalog.mjs';
import { isGatingEnabled, resolveCurrentEntitlement } from './requireTier.mjs';

const COMMUNITY_MIN_TIER = 'elite';
const FEATURE_KEY = 'trainer.messaging';

/** Strict positive-integer coercion. Returns null for anything else. */
function toId(value) {
  if (value === null || value === undefined) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Every user id this actor has an ACTIVE assignment with, in either direction:
 * clients get their trainers, trainers get their clients.
 *
 * @param {number} userId
 * @returns {Promise<Set<number>|null>} null signals a lookup failure (deny).
 */
export async function loadAssignedCounterpartyIds(userId) {
  const id = toId(userId);
  if (!id) return null;

  try {
    const rows = await sequelize.query(
      `SELECT "trainerId" AS counterparty
         FROM client_trainer_assignments
        WHERE "clientId" = :id AND status = 'active'
        UNION
       SELECT "clientId" AS counterparty
         FROM client_trainer_assignments
        WHERE "trainerId" = :id AND status = 'active'`,
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return new Set(rows.map((r) => toId(r.counterparty)).filter(Boolean));
  } catch (error) {
    logger.warn('[MessagingAccess] assignment lookup failed — denying relationship lane', {
      userId: id,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}

/**
 * Active membership of a conversation, from the actor's point of view.
 *
 * Returns BOTH whether the actor is themselves an active participant and who
 * the other participants are. The membership half matters: without it, a
 * conversation whose only other member happened to be the actor's assigned
 * trainer would satisfy the subset test even though the actor is not in the
 * thread at all. Controllers do enforce membership downstream, but a gate that
 * depends on a later gate is authorization by luck.
 *
 * @returns {Promise<{actorIsMember:boolean, others:number[]}|null>}
 *          null signals a lookup failure (deny).
 */
export async function loadConversationMembers(conversationId, actorId) {
  const convId = toId(conversationId);
  const actor = toId(actorId);
  if (!convId || !actor) return null;

  try {
    const rows = await sequelize.query(
      `SELECT user_id AS "userId"
         FROM conversation_participants
        WHERE conversation_id = :convId
          AND deleted_at IS NULL`,
      { replacements: { convId }, type: QueryTypes.SELECT },
    );
    const all = rows.map((r) => toId(r.userId)).filter(Boolean);
    return {
      actorIsMember: all.includes(actor),
      others: all.filter((uid) => uid !== actor),
    };
  } catch (error) {
    logger.warn('[MessagingAccess] participant lookup failed — denying relationship lane', {
      conversationId: convId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
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

    if (scope === 'list') return next();

    if (scope === 'create') {
      const requested = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
      const ids = requested.map(toId).filter((id) => id && id !== actorId);
      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one participant is required.',
        });
      }
      const allInside = ids.every((id) => counterparties.has(id));
      if (!allInside) return sendOutsideRelationship(res);
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

    const allInside = membership.others.every((id) => counterparties.has(id));
    if (!allInside) return sendOutsideRelationship(res);

    req.messagingAccessLane = 'relationship';
    return next();
  };
}

export default requireMessagingAccess;
