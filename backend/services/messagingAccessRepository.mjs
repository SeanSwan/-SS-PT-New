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

/** Strict positive-integer coercion. Returns null for anything else. */
export
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
