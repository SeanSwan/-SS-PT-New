/**
 * FILE: messagingSafetyService.mjs
 * PURPOSE: Server-side message search and safety-governance SQL for messaging.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { recordCommunicationAudit } from './communications/communicationAuditLogService.mjs';

const REPORT_REASONS = new Set(['harassment', 'spam', 'abuse', 'inappropriate', 'privacy', 'safety', 'other']);
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 25;
const MAX_REPORT_DETAILS = 2000;

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const cleanText = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');
const toIsoString = (value) => (value instanceof Date ? value.toISOString() : value || null);

export function normalizeMessageSearchQuery(queryParams = {}) {
  const query = cleanText(queryParams.q ?? queryParams.query);
  const requestedLimit = toPositiveInt(queryParams.limit) || DEFAULT_SEARCH_LIMIT;

  if (query.length < 2) return { error: 'Search query must be at least 2 characters.', query, limit: requestedLimit };
  return { error: null, query, limit: Math.min(requestedLimit, MAX_SEARCH_LIMIT) };
}

export function normalizeReportPayload(body = {}) {
  const reason = cleanText(body.reason).toLowerCase();
  const details = cleanText(body.details).slice(0, MAX_REPORT_DETAILS);

  if (!REPORT_REASONS.has(reason)) return { error: 'Unsupported report reason.', reason, details };
  return { error: null, reason, details };
}

export function normalizeMuteUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= new Date()) return null;
  return date;
}

export async function searchMessagesForConversation({ conversationId, query, limit }) {
  return sequelize.query(
    `SELECT
       m.id,
       m.content,
       m.created_at,
       m.updated_at,
       m.sender_id,
       m.conversation_id,
       json_build_object(
         'id', u.id,
         'name', u."firstName" || ' ' || u."lastName",
         'firstName', u."firstName",
         'lastName', u."lastName",
         'username', u.username,
         'photo', u.photo,
         'role', CASE WHEN u.role = 'user' THEN 'client' ELSE u.role END
       ) as sender
     FROM messages m
     JOIN "Users" u ON m.sender_id = u.id
     WHERE m.conversation_id = :conversationId
       AND m.content ILIKE :query
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT :limit`,
    { replacements: { conversationId, query: `%${query}%`, limit }, type: QueryTypes.SELECT }
  );
}

export async function getMessageConversationContext(messageId) {
  const [message] = await sequelize.query(
    `SELECT id, conversation_id as "conversationId", sender_id as "senderId"
     FROM messages
     WHERE id = :messageId`,
    { replacements: { messageId }, type: QueryTypes.SELECT }
  );
  return message || null;
}

export async function createMessageReport({ messageId, reporterId, reason, details }) {
  const [rows] = await sequelize.query(
    `INSERT INTO message_reports (message_id, reporter_id, reason, details, status, created_at, updated_at)
     VALUES (:messageId, :reporterId, :reason, :details, 'open', NOW(), NOW())
     RETURNING id, message_id as "messageId", reporter_id as "reporterId", reason, details, status, created_at as "createdAt"`,
    { replacements: { messageId, reporterId, reason, details: details || null } }
  );
  const report = rows[0] || rows;
  const context = await getMessageConversationContext(messageId);
  await recordCommunicationAudit({
    eventId: report?.id ? `message-report:${report.id}` : null,
    actorId: reporterId,
    recipientId: context?.senderId,
    action: 'message.reported',
    entityType: 'message',
    entityId: messageId,
    metadata: { reportId: report?.id ?? null, reason, conversationId: context?.conversationId ?? null },
  });
  return report;
}

export async function blockMessagingUserRecord({ blockerId, blockedUserId }) {
  if (Number(blockerId) === Number(blockedUserId)) return { error: 'You cannot block yourself.', block: null };

  const [target] = await sequelize.query(
    `SELECT id FROM "Users" WHERE id = :blockedUserId AND "deletedAt" IS NULL`,
    { replacements: { blockedUserId }, type: QueryTypes.SELECT }
  );
  if (!target) return { error: 'User not found.', block: null };

  const [rows] = await sequelize.query(
    `INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
     VALUES (:blockerId, :blockedUserId, NOW())
     ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET created_at = user_blocks.created_at
     RETURNING id, blocker_id as "blockerId", blocked_id as "blockedUserId", created_at as "createdAt"`,
    { replacements: { blockerId, blockedUserId } }
  );
  const block = rows[0] || rows;
  await recordCommunicationAudit({
    eventId: block?.id ? `user-block:${block.id}` : `user-block:${blockerId}:${blockedUserId}`,
    actorId: blockerId,
    recipientId: blockedUserId,
    action: 'user.blocked',
    entityType: 'user',
    entityId: blockedUserId,
    metadata: { blockId: block?.id ?? null },
  });
  return { error: null, block };
}

export async function unblockMessagingUserRecord({ blockerId, blockedUserId }) {
  await sequelize.query(
    `DELETE FROM user_blocks WHERE blocker_id = :blockerId AND blocked_id = :blockedUserId`,
    { replacements: { blockerId, blockedUserId } }
  );
  await recordCommunicationAudit({
    eventId: `user-unblock:${blockerId}:${blockedUserId}`,
    actorId: blockerId,
    recipientId: blockedUserId,
    action: 'user.unblocked',
    entityType: 'user',
    entityId: blockedUserId,
  });
  return { unblocked: true };
}

export async function muteConversationRecord({ conversationId, userId, mutedUntil }) {
  const [rows] = await sequelize.query(
    `INSERT INTO conversation_mutes (conversation_id, user_id, muted_until, created_at, updated_at)
     VALUES (:conversationId, :userId, :mutedUntil, NOW(), NOW())
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET muted_until = :mutedUntil, updated_at = NOW()
     RETURNING conversation_id as "conversationId", user_id as "userId", muted_until as "mutedUntil"`,
    { replacements: { conversationId, userId, mutedUntil } }
  );
  const mute = rows[0] || rows;
  await recordCommunicationAudit({
    eventId: `conversation-mute:${conversationId}:${userId}`,
    actorId: userId,
    action: 'conversation.muted',
    entityType: 'conversation',
    entityId: conversationId,
    metadata: { mutedUntil: toIsoString(mute?.mutedUntil) },
  });
  return mute;
}

export async function unmuteConversationRecord({ conversationId, userId }) {
  await sequelize.query(
    `DELETE FROM conversation_mutes WHERE conversation_id = :conversationId AND user_id = :userId`,
    { replacements: { conversationId, userId } }
  );
  await recordCommunicationAudit({
    eventId: `conversation-unmute:${conversationId}:${userId}`,
    actorId: userId,
    action: 'conversation.unmuted',
    entityType: 'conversation',
    entityId: conversationId,
  });
  return { muted: false };
}