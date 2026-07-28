/**
 * FILE: messagingConversationQueries.mjs
 * PURPOSE: Conversation read/write SQL for SwanStudios messaging.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const conversationSelectSql = (extraWhere = '') => `
  WITH last_messages AS (
    SELECT
      conversation_id,
      content,
      created_at,
      sender_id,
      ROW_NUMBER() OVER(PARTITION BY conversation_id ORDER BY created_at DESC, id DESC) as rn
    FROM messages
  )
  SELECT
    c.id,
    c.type,
    c.name,
    c.created_at,
    c.updated_at,
    cp.role as "viewerRole",
    (cp.role IN ('owner', 'admin')) as "canManage",
    CASE
      WHEN cm.conversation_id IS NOT NULL AND (cm.muted_until IS NULL OR cm.muted_until > NOW()) THEN true
      ELSE false
    END as "isMuted",
    CASE
      WHEN cm.conversation_id IS NOT NULL AND (cm.muted_until IS NULL OR cm.muted_until > NOW()) THEN cm.muted_until
      ELSE NULL
    END as "mutedUntil",
    COALESCE((
      SELECT COUNT(*)::int
      FROM conversation_participants cp_count
      WHERE cp_count.conversation_id = c.id AND cp_count.deleted_at IS NULL
    ), 0) as "memberCount",
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', u.id,
        'name', u."firstName" || ' ' || u."lastName",
        'firstName', u."firstName",
        'lastName', u."lastName",
        'username', u.username,
        'photo', u.photo,
        'role', CASE WHEN u.role = 'user' THEN 'client' ELSE u.role END,
        'groupRole', cp_inner.role,
        'lastActive', COALESCE(u."lastActive", u."lastLogin")
      ) ORDER BY
        CASE cp_inner.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
        u."firstName",
        u."lastName"
      )
      FROM conversation_participants cp_inner
      JOIN "Users" u ON u.id = cp_inner.user_id
      WHERE cp_inner.conversation_id = c.id
        AND cp_inner.deleted_at IS NULL
        AND (c.type <> 'direct' OR cp_inner.user_id != :viewerId)
    ), '[]'::json) as participants,
    json_build_object(
      'content', lm.content,
      'timestamp', lm.created_at,
      'created_at', lm.created_at,
      'sender_id', lm.sender_id
    ) as "lastMessage",
    GREATEST(
      COALESCE((
        SELECT COUNT(*)::int
        FROM messages m
        LEFT JOIN message_receipts mr ON m.id = mr.message_id AND mr.user_id = :viewerId
        WHERE m.conversation_id = c.id
          AND m.sender_id != :viewerId
          AND mr.id IS NULL
      ), 0),
      CASE WHEN cp.marked_unread_at IS NOT NULL THEN 1 ELSE 0 END
    ) as "unreadCount"
  FROM conversations c
  JOIN conversation_participants cp ON c.id = cp.conversation_id
  LEFT JOIN conversation_mutes cm ON cm.conversation_id = c.id AND cm.user_id = :viewerId
  LEFT JOIN last_messages lm ON c.id = lm.conversation_id AND lm.rn = 1
  WHERE cp.user_id = :viewerId
    AND cp.deleted_at IS NULL
    AND cp.archived_at IS NULL
    ${extraWhere}
`;

export async function getConversationsForViewer(viewerId) {
  return sequelize.query(
    `${conversationSelectSql()} ORDER BY COALESCE(lm.created_at, c.updated_at) DESC, c.id DESC`,
    { replacements: { viewerId }, type: QueryTypes.SELECT }
  );
}

export async function getConversationForViewer(conversationId, viewerId) {
  const [conversation] = await sequelize.query(
    `${conversationSelectSql('AND c.id = :conversationId')} LIMIT 1`,
    { replacements: { conversationId, viewerId }, type: QueryTypes.SELECT }
  );
  return conversation || null;
}

export async function findDirectConversation(userId, participantId) {
  const [existing] = await sequelize.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = :userId
     JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = :participantId
     WHERE c.type = 'direct'
       AND NOT EXISTS (
         SELECT 1 FROM conversation_participants cp3
         WHERE cp3.conversation_id = c.id AND cp3.user_id NOT IN (:directIds)
       )
     LIMIT 1`,
    { replacements: { userId, participantId, directIds: [Number(userId), Number(participantId)] }, type: QueryTypes.SELECT }
  );
  return existing || null;
}

export async function createConversationRecord({ type, name, transaction }) {
  const [rows] = await sequelize.query(
    `INSERT INTO conversations (type, name, created_at, updated_at)
     VALUES (:type, :name, NOW(), NOW())
     RETURNING id, type, name, created_at, updated_at`,
    { replacements: { type, name }, transaction }
  );
  return rows[0] || rows;
}

export async function renameConversation(conversationId, name) {
  await sequelize.query(
    `UPDATE conversations
     SET name = :name, updated_at = NOW()
     WHERE id = :conversationId AND type = 'group'`,
    { replacements: { conversationId, name } }
  );
}

export async function touchConversation(conversationId, transaction) {
  await sequelize.query(
    `UPDATE conversations SET updated_at = NOW() WHERE id = :conversationId`,
    { replacements: { conversationId }, transaction }
  );
}
