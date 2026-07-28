/**
 * FILE: messagingActionService.mjs
 * PURPOSE: Durable message actions for replies, edits, reactions, pins, and conversation state.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const MAX_MESSAGE_LENGTH = 5000;
const MAX_REACTION_LENGTH = 32;

const cleanText = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

export function normalizeEditMessagePayload(body = {}) {
  const content = cleanText(body.content);
  if (!content) return { error: 'Message content is required.', content };
  if (content.length > MAX_MESSAGE_LENGTH) return { error: 'Message content is too long.', content: '' };
  return { error: null, content };
}

export function normalizeReactionPayload(body = {}) {
  const reaction = cleanText(body.reaction).toLowerCase();
  if (!reaction) return { error: 'Reaction is required.', reaction };
  if (reaction.length > MAX_REACTION_LENGTH) return { error: 'Reaction is too long.', reaction: '' };
  return { error: null, reaction };
}

export function normalizeReplyToMessageId(value) {
  return toPositiveInt(value);
}

export async function getMessageActionContext(messageId) {
  const [message] = await sequelize.query(
    `SELECT id, conversation_id as "conversationId", sender_id as "senderId", deleted_at as "deletedAt"
     FROM messages
     WHERE id = :messageId`,
    { replacements: { messageId }, type: QueryTypes.SELECT }
  );
  return message || null;
}

export async function editMessageRecord({ messageId, content, updatedBy }) {
  const [rows] = await sequelize.query(
    `UPDATE messages
     SET content = :content, edited_at = NOW(), updated_at = NOW(), updated_by = :updatedBy
     WHERE id = :messageId AND deleted_at IS NULL
     RETURNING id, conversation_id, sender_id, content, created_at, updated_at, edited_at, updated_by as "updatedBy"`,
    { replacements: { messageId, content, updatedBy } }
  );
  return rows[0] || rows;
}

export async function softDeleteMessageRecord({ messageId, deletedBy }) {
  const [rows] = await sequelize.query(
    `UPDATE messages
     SET deleted_at = NOW(), deleted_by = :deletedBy, updated_at = NOW(), content = '[Message deleted]'
     WHERE id = :messageId AND deleted_at IS NULL
     RETURNING id, conversation_id, sender_id, deleted_at as "deletedAt", deleted_by as "deletedBy"`,
    { replacements: { messageId, deletedBy } }
  );
  return rows[0] || rows;
}

export async function upsertMessageReaction({ messageId, userId, reaction }) {
  const [rows] = await sequelize.query(
    `INSERT INTO message_reactions (message_id, user_id, reaction, created_at)
     VALUES (:messageId, :userId, :reaction, NOW())
     ON CONFLICT (message_id, user_id, reaction) DO UPDATE SET created_at = NOW()
     RETURNING id, message_id as "messageId", user_id as "userId", reaction, created_at as "createdAt"`,
    { replacements: { messageId, userId, reaction } }
  );
  return rows[0] || rows;
}

export async function deleteMessageReaction({ messageId, userId, reaction }) {
  await sequelize.query(
    `DELETE FROM message_reactions
     WHERE message_id = :messageId AND user_id = :userId AND reaction = :reaction`,
    { replacements: { messageId, userId, reaction } }
  );
  return { removed: true };
}

export async function pinMessageRecord({ messageId, userId }) {
  const [rows] = await sequelize.query(
    `INSERT INTO message_pins (message_id, pinned_by, created_at)
     VALUES (:messageId, :userId, NOW())
     ON CONFLICT (message_id, pinned_by) DO UPDATE SET created_at = NOW()
     RETURNING id, message_id as "messageId", pinned_by as "pinnedBy", created_at as "createdAt"`,
    { replacements: { messageId, userId } }
  );
  return rows[0] || rows;
}

export async function unpinMessageRecord({ messageId, userId }) {
  await sequelize.query(
    `DELETE FROM message_pins WHERE message_id = :messageId AND pinned_by = :userId`,
    { replacements: { messageId, userId } }
  );
  return { pinned: false };
}

export async function saveMessageRecord({ messageId, userId }) {
  const [rows] = await sequelize.query(
    `INSERT INTO message_saves (message_id, saved_by, created_at)
     VALUES (:messageId, :userId, NOW())
     ON CONFLICT (message_id, saved_by) DO UPDATE SET created_at = NOW()
     RETURNING id, message_id as "messageId", saved_by as "savedBy", created_at as "createdAt"`,
    { replacements: { messageId, userId } }
  );
  return rows[0] || rows;
}

export async function unsaveMessageRecord({ messageId, userId }) {
  await sequelize.query(
    `DELETE FROM message_saves WHERE message_id = :messageId AND saved_by = :userId`,
    { replacements: { messageId, userId } }
  );
  return { saved: false };
}

export async function archiveConversationForUser({ conversationId, userId }) {
  await sequelize.query(
    `UPDATE conversation_participants
     SET archived_at = NOW()
     WHERE conversation_id = :conversationId AND user_id = :userId AND deleted_at IS NULL`,
    { replacements: { conversationId, userId } }
  );
  return { archived: true };
}

export async function markConversationUnreadForUser({ conversationId, userId }) {
  await sequelize.query(
    `UPDATE conversation_participants
     SET marked_unread_at = NOW(), archived_at = NULL
     WHERE conversation_id = :conversationId AND user_id = :userId AND deleted_at IS NULL`,
    { replacements: { conversationId, userId } }
  );
  return { markedUnread: true };
}