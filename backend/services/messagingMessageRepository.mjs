/**
 * FILE: messagingMessageRepository.mjs
 * PURPOSE: Message write and sender lookup SQL for messaging.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const MAX_CLIENT_MESSAGE_ID_LENGTH = 100;

export function normalizeClientMessageId(value) {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length > 0 && next.length <= MAX_CLIENT_MESSAGE_ID_LENGTH ? next : null;
}

const isDuplicateKeyError = (error) => (
  error?.code === '23505' ||
  error?.parent?.code === '23505' ||
  error?.original?.code === '23505'
);

const normalizeMessageRow = (row, { wasIdempotentReplay = false } = {}) => {
  if (!row) return null;
  return {
    ...row,
    clientMessageId: row.client_message_id || null,
    wasIdempotentReplay,
  };
};

export async function findMessageByClientMessageId({ conversationId, senderId, clientMessageId, transaction }) {
  const normalizedClientMessageId = normalizeClientMessageId(clientMessageId);
  if (!normalizedClientMessageId) return null;

  const [message] = await sequelize.query(
    `SELECT id, conversation_id, sender_id, content, reply_to_message_id,
            client_message_id, updated_by as "updatedBy", created_at, updated_at
     FROM messages
     WHERE conversation_id = :conversationId
       AND sender_id = :senderId
       AND client_message_id = :clientMessageId
     LIMIT 1`,
    {
      replacements: { conversationId, senderId, clientMessageId: normalizedClientMessageId },
      type: QueryTypes.SELECT,
      transaction,
    }
  );
  return normalizeMessageRow(message, { wasIdempotentReplay: true });
}

export async function createMessageRecord({
  conversationId,
  senderId,
  content,
  replyToMessageId = null,
  clientMessageId = null,
  transaction,
}) {
  const normalizedClientMessageId = normalizeClientMessageId(clientMessageId);
  const existingMessage = await findMessageByClientMessageId({
    conversationId,
    senderId,
    clientMessageId: normalizedClientMessageId,
    transaction,
  });
  if (existingMessage) return existingMessage;

  try {
    const [rows] = await sequelize.query(
      `INSERT INTO messages (
         conversation_id, sender_id, content, reply_to_message_id, client_message_id, updated_by, created_at, updated_at
       ) VALUES (
         :conversationId, :senderId, :content, :replyToMessageId, :clientMessageId, :senderId, NOW(), NOW()
       )
       RETURNING id, conversation_id, sender_id, content, reply_to_message_id,
         client_message_id, updated_by as "updatedBy", created_at, updated_at`,
      {
        replacements: {
          conversationId,
          senderId,
          content,
          replyToMessageId,
          clientMessageId: normalizedClientMessageId,
        },
        transaction,
      }
    );
    return normalizeMessageRow(rows[0] || rows);
  } catch (error) {
    if (!normalizedClientMessageId || !isDuplicateKeyError(error)) throw error;
    const replayed = await findMessageByClientMessageId({
      conversationId,
      senderId,
      clientMessageId: normalizedClientMessageId,
      transaction,
    });
    if (replayed) return replayed;
    throw error;
  }
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
