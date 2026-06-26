/**
 * FILE: messagingMessageRepository.mjs
 * PURPOSE: Message write and sender lookup SQL for messaging.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

export async function createMessageRecord({ conversationId, senderId, content, transaction }) {
  const [rows] = await sequelize.query(
    `INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)
     VALUES (:conversationId, :senderId, :content, NOW(), NOW())
     RETURNING id, conversation_id, sender_id, content, created_at, updated_at`,
    { replacements: { conversationId, senderId, content }, transaction }
  );
  return rows[0] || rows;
}

export async function getSenderSummary(senderId) {
  const [sender] = await sequelize.query(
    `SELECT id,
            "firstName" || ' ' || "lastName" as name,
            "firstName",
            "lastName",
            username,
            photo,
            CASE WHEN role = 'user' THEN 'client' ELSE role END as role
     FROM "Users"
     WHERE id = :senderId`,
    { replacements: { senderId }, type: QueryTypes.SELECT }
  );
  return sender || null;
}
