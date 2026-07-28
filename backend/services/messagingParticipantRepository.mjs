/**
 * FILE: messagingParticipantRepository.mjs
 * PURPOSE: Participant SQL helpers for messaging groups and direct threads.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

export async function fetchActiveUserIds(userIds) {
  const ids = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return [];

  const users = await sequelize.query(
    `SELECT id FROM "Users"
     WHERE id IN (:ids)
       AND "deletedAt" IS NULL
       AND ("isActive" = true OR "isActive" IS NULL)`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );

  return users.map((user) => Number(user.id));
}

export async function upsertConversationParticipant({ conversationId, userId, role, transaction }) {
  await sequelize.query(
    `INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at, deleted_at)
     VALUES (:conversationId, :userId, :role, NOW(), NULL)
     ON CONFLICT (conversation_id, user_id) DO UPDATE SET
       deleted_at = NULL,
       role = CASE
         WHEN conversation_participants.role = 'owner' THEN 'owner'
         WHEN conversation_participants.deleted_at IS NULL AND conversation_participants.role = 'admin' AND EXCLUDED.role = 'member' THEN 'admin'
         ELSE EXCLUDED.role
       END`,
    { replacements: { conversationId, userId, role }, transaction }
  );
}

export async function reviveParticipant(conversationId, userId) {
  await sequelize.query(
    `UPDATE conversation_participants
     SET deleted_at = NULL, archived_at = NULL, marked_unread_at = NULL
     WHERE conversation_id = :conversationId AND user_id = :userId`,
    { replacements: { conversationId, userId } }
  );
}

export async function getConversationMembership(conversationId, userId) {
  const [membership] = await sequelize.query(
    `SELECT c.id, c.type, c.name, cp.role as "viewerRole"
     FROM conversations c
     JOIN conversation_participants cp ON c.id = cp.conversation_id
     WHERE c.id = :conversationId
       AND cp.user_id = :userId
       AND cp.deleted_at IS NULL
     LIMIT 1`,
    { replacements: { conversationId, userId }, type: QueryTypes.SELECT }
  );
  return membership || null;
}

export async function getActiveParticipant(conversationId, userId) {
  const [participant] = await sequelize.query(
    `SELECT user_id as "userId", role
     FROM conversation_participants
     WHERE conversation_id = :conversationId
       AND user_id = :userId
       AND deleted_at IS NULL
     LIMIT 1`,
    { replacements: { conversationId, userId }, type: QueryTypes.SELECT }
  );
  return participant || null;
}

export async function updateParticipantRoleRecord({ conversationId, userId, role }) {
  await sequelize.query(
    `UPDATE conversation_participants
     SET role = :role
     WHERE conversation_id = :conversationId
       AND user_id = :userId
       AND deleted_at IS NULL`,
    { replacements: { conversationId, userId, role } }
  );
}

export async function softDeleteParticipant(conversationId, userId) {
  await sequelize.query(
    `UPDATE conversation_participants
     SET deleted_at = NOW()
     WHERE conversation_id = :conversationId
       AND user_id = :userId
       AND deleted_at IS NULL`,
    { replacements: { conversationId, userId } }
  );
}
