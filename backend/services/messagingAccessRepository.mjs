/**
 * FILE: messagingAccessRepository.mjs
 * PURPOSE: SQL the messaging authorization gate needs, kept out of the gate.
 * CREATED: 2026-08-22 · extracted so requireMessagingAccess stays under the
 *          300-line cap after the pre-push panel fixes, and to match this
 *          codebase's convention of keeping raw SQL in a repository module
 *          (see messagingParticipantRepository.mjs).
 *
 * SCHEMA NOTE (verified against the tree, not memory):
 *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
 *                                ("clientId", "trainerId"), status text.
 *   conversation_participants  : snake_case table AND columns.
 *   The Sequelize model declaring 'ConversationParticipants' with camelCase
 *   columns is DRIFTED; every runtime query uses the snake_case form here.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { toStrictPositiveInt } from './messagingGroupPolicy.mjs';

// ONE parser, imported — not a second copy kept identical by a comment. The
// previous duplicate was byte-equal to toStrictPositiveInt and would have
// drifted the first time either side was edited (ox-alpha).
export const toId = toStrictPositiveInt;

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
      `SELECT cp.user_id AS "userId",
              CASE WHEN u.id IS NULL THEN NULL
                   WHEN u.role = 'user' THEN 'client'
                   ELSE u.role END AS "platformRole"
         FROM conversation_participants cp
         LEFT JOIN "Users" u ON u.id = cp.user_id
        WHERE cp.conversation_id = :convId
          AND cp.deleted_at IS NULL`,
      { replacements: { convId }, type: QueryTypes.SELECT },
    );
    // LEFT JOIN, not INNER: Users is paranoid (soft-delete). An INNER JOIN made a
    // soft-deleted stranger VANISH from `others`, so a thread of {me, trainer,
    // deleted-stranger} looked like {me, trainer} and `every()` flipped to true
    // — fail-OPEN on exactly the row you'd least expect (ox-alpha). A missing
    // user row now surfaces as role null, which no reachability rule accepts.
    const all = rows
      .map((r) => ({ id: toId(r.userId), role: r.platformRole ?? null }))
      .filter((r) => r.id);
    return {
      actorIsMember: all.some((r) => r.id === actor),
      others: all.filter((r) => r.id !== actor),
    };
  } catch (error) {
    logger.warn('[MessagingAccess] participant lookup failed — denying relationship lane', {
      conversationId: convId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}


/**
 * The single rule for "may this actor write into a thread with these other
 * members". REST (requireMessagingAccess) and the socket (isRelationshipWrite
 * Allowed) both call THIS — two inlined copies of the same predicate is the
 * exact REST-vs-socket divergence that produced the original messaging bypass,
 * re-seeded (GLM 5.3). A member with a null role (missing/soft-deleted user
 * row) is never reachable: fail closed.
 */
export function othersAreReachable(others, counterparties) {
  if (!Array.isArray(others) || others.length === 0) return false;
  return others.every(
    (m) => m.role !== null && (counterparties.has(m.id) || m.role === 'admin' || m.role === 'trainer'),
  );
}

/**
 * Is this actor allowed to write into this conversation under the RELATIONSHIP
 * lane? Shared by the REST middleware and the websocket handler.
 *
 * WHY THIS EXISTS. The relationship lane shipped as Express middleware on
 * messagingRoutes only. `socket/socket.mjs` is a complete second way to send a
 * message and checked membership alone, so a free-tier client with an active
 * assignment could be 403'd by REST on an old community thread and still write
 * to it over the socket. Two post-ship reviewers (ox-alpha, GLM 5.3) flagged the
 * socket path independently, and that file's OWN comment already says it:
 * "Fixing only REST would have been a false fix — this socket handler is a
 * complete second way to send." The lane fix reproduced the exact mistake the
 * file warns about.
 *
 * Returns true when the write is permitted. FAIL-CLOSED: any lookup failure
 * denies, matching the middleware.
 *
 * PRECONDITION — the caller MUST have already established that the actor is an
 * active participant of this conversation. Staff and community-entitled actors
 * short-circuit here WITHOUT a membership query, deliberately: that query is on
 * the per-message hot path and the two callers both check membership first
 * (socket.mjs via isActiveParticipant, REST via the conversation scope). Grok
 * 4.6 flagged that the name promises more than the body verifies — it decides
 * the LANE, not membership. Do not call it as a standalone authorization.
 *
 * @param {{id:*, role?:string}} actor
 * @param {number} conversationId
 * @param {boolean} hasCommunityAccess  already-resolved entitlement
 */
export async function isRelationshipWriteAllowed(actor, conversationId, hasCommunityAccess) {
  if (actor?.role === 'admin' || actor?.role === 'trainer') return true;
  if (hasCommunityAccess) return true;

  const actorId = toId(actor?.id);
  if (!actorId) return false;

  const counterparties = await loadAssignedCounterpartyIds(actorId);
  if (!counterparties || counterparties.size === 0) return false;

  const membership = await loadConversationMembers(conversationId, actorId);
  if (membership === null) return false;
  if (!membership.actorIsMember) return false;
  if (membership.others.length === 0) return false;

  // Staff count as reachable, EXACTLY as the list filter counts them.
  //
  // The list was widened to keep the auto-created admin support thread visible;
  // this gate was not, so that thread became visible-but-unwritable and answered
  // a reply with "You can message your assigned trainer here" — on a thread
  // containing an admin, not a trainer. A read-only dead end with lying copy is
  // worse than the hidden thread it replaced. GLM 5.3 caught the asymmetry.
  //
  // `platformRole` comes from Users.role, never the per-conversation role, so a
  // client holding conversation-admin in a group cannot spoof staff here.
  return othersAreReachable(membership.others, counterparties);
}
