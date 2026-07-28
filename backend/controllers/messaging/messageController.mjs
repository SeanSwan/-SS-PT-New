/**
 * FILE: messageController.mjs
 * PURPOSE: Message history, send fallback, and user search handlers.
 */

import { QueryTypes } from 'sequelize';
import {
  createMessageRecord,
  ensureMessagingTables,
  normalizeClientMessageId,
  getConversationMembership,
  getSenderSummary,
  sequelize,
  touchConversation,
} from '../../services/messagingRepository.mjs';
import {
  assertCanMessageConversation,
  getMessagingSearchScope,
  MESSAGING_POLICY_DENIED_MESSAGE,
} from '../../services/messagingPolicyService.mjs';
import {
  createMessageAttachments,
  getMessageAttachments,
  normalizeMessageAttachments,
} from '../../services/messagingAttachmentService.mjs';
import {
  getMessageActionContext,
  normalizeReplyToMessageId,
} from '../../services/messagingActionService.mjs';
import { createMessageNotificationEvent } from '../../services/communications/notificationOrchestratorService.mjs';
import { getMessageNotificationRecipients } from '../../services/messagingNotificationRecipientService.mjs';
import { getIO as getManagedSocketIO } from '../../socket/socketManager.mjs';

const SEND_MESSAGE_FAILED_MESSAGE = 'Failed to send message.';
const FETCH_MESSAGES_FAILED_MESSAGE = 'Failed to fetch messages.';
const SEARCH_USERS_FAILED_MESSAGE = 'Failed to search for users.';
const MAX_MESSAGE_LENGTH = 5000;

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

export const getMessagesForConversation = async (req, res) => {
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  const requestedLimit = toPositiveInt(req.query.limit) || 50;
  const limit = Math.min(requestedLimit, 500);
  const before = toPositiveInt(req.query.before);
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    await ensureMessagingTables();
    const membership = await getConversationMembership(conversationId, userId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of this conversation.' });

    const beforeClause = before
      ? 'AND m.created_at < (SELECT created_at FROM messages WHERE id = :before AND conversation_id = :conversationId)'
      : '';
    const messages = await sequelize.query(
      `SELECT
         m.id,
         m.content,
         m.created_at,
         m.updated_at,
         m.reply_to_message_id,
         m.client_message_id,
         m.edited_at,
         m.deleted_at,
         m.deleted_by,
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
         ) as sender,
         COALESCE((
           SELECT json_agg(json_build_object('userId', reader.id, 'userName', reader."firstName", 'readAt', mr.read_at))
           FROM message_receipts mr
           JOIN "Users" reader ON mr.user_id = reader.id
           WHERE mr.message_id = m.id
         ), '[]'::json) as "readBy",
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', ma.id,
             'kind', ma.kind,
             'title', ma.title,
             'url', ma.url,
             'entityType', ma.entity_type,
             'entityId', ma.entity_id,
             'metadata', ma.metadata,
             'scanStatus', ma.scan_status
           ) ORDER BY ma.created_at ASC, ma.id ASC)
           FROM message_attachments ma
           WHERE ma.message_id = m.id
         ), '[]'::json) as attachments,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', mr.id,
             'userId', mr.user_id,
             'reaction', mr.reaction,
             'createdAt', mr.created_at
           ) ORDER BY mr.created_at ASC, mr.id ASC)
           FROM message_reactions mr
           WHERE mr.message_id = m.id
         ), '[]'::json) as reactions,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', mp.id,
             'pinnedBy', mp.pinned_by,
             'createdAt', mp.created_at
           ) ORDER BY mp.created_at ASC, mp.id ASC)
           FROM message_pins mp
           WHERE mp.message_id = m.id
         ), '[]'::json) as pins,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', ms.id,
             'savedBy', ms.saved_by,
             'createdAt', ms.created_at
           ) ORDER BY ms.created_at ASC, ms.id ASC)
           FROM message_saves ms
           WHERE ms.message_id = m.id
         ), '[]'::json) as saves
       FROM messages m
       JOIN "Users" u ON m.sender_id = u.id
       WHERE m.conversation_id = :conversationId
         ${beforeClause}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT :limit`,
      { replacements: { conversationId, limit, before }, type: QueryTypes.SELECT }
    );

    return res.json(messages.reverse());
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    return res.status(500).json({ error: FETCH_MESSAGES_FAILED_MESSAGE });
  }
};

export const searchUsers = async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user?.id;
  const query = typeof q === 'string' ? q.trim().replace(/\s+/g, ' ') : '';
  if (!currentUserId) return res.status(401).json({ error: 'Authentication required.' });
  if (query.length < 2) return res.json([]);

  try {
    await ensureMessagingTables();
    const scope = await getMessagingSearchScope(currentUserId);
    if (!scope.unrestricted && scope.allowedUserIds.length === 0) return res.json([]);

    const blockedClause = scope.blockedUserIds?.length ? 'AND id NOT IN (:blockedUserIds)' : '';
    const scopeClause = scope.unrestricted ? blockedClause : `${blockedClause} AND id IN (:allowedUserIds)`;
    const replacements = {
      currentUserId,
      allowedUserIds: scope.allowedUserIds || [],
      blockedUserIds: scope.blockedUserIds || [],
    };
    const users = await sequelize.query(
      `SELECT id, "firstName", "lastName", username, photo, role, "lastActive", "lastLogin"
       FROM "Users"
       WHERE (
           "firstName" ILIKE :query
           OR "lastName" ILIKE :query
           OR ("firstName" || ' ' || "lastName") ILIKE :query
           OR username ILIKE :query
         )
         ${scopeClause}
         AND id != :currentUserId
         AND "deletedAt" IS NULL
         AND ("isActive" = true OR "isActive" IS NULL)
       ORDER BY COALESCE("lastActive", "lastLogin") DESC NULLS LAST, "createdAt" DESC
       LIMIT 20`,
      { replacements: { ...replacements, query: `%${query}%` }, type: QueryTypes.SELECT }
    );

    const normalized = users.map(u => ({
      ...u,
      role: u.role === 'user' ? 'client' : u.role,
      displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
      lastActive: u.lastActive || u.lastLogin || null,
    }));

    return res.json(normalized);
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: SEARCH_USERS_FAILED_MESSAGE });
  }
};

export const sendMessage = async (req, res) => {
  const conversationId = toPositiveInt(req.params.id);
  const senderId = req.user?.id;
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  const clientMessageId = normalizeClientMessageId(req.body?.clientMessageId);
  const normalizedAttachments = normalizeMessageAttachments(req.body?.attachments);
  const rawReplyToMessageId = req.body?.replyToMessageId ?? req.body?.reply_to_message_id;
  const hasReplyReference = rawReplyToMessageId !== undefined && rawReplyToMessageId !== null && String(rawReplyToMessageId).trim() !== '';
  const replyToMessageId = normalizeReplyToMessageId(rawReplyToMessageId);
  if (!conversationId || !senderId) return res.status(400).json({ error: 'Valid conversation ID is required.' });
  if (normalizedAttachments.error) return res.status(400).json({ error: normalizedAttachments.error });
  if (hasReplyReference && !replyToMessageId) return res.status(400).json({ error: 'Valid reply message ID is required.' });
  if (!content && normalizedAttachments.attachments.length === 0) return res.status(400).json({ error: 'Message content is required.' });
  if (content.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: 'Message content is too long.' });

  try {
    await ensureMessagingTables();
    const membership = await getConversationMembership(conversationId, senderId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of this conversation.' });

    const policy = await assertCanMessageConversation({ actorId: senderId, conversationId });
    if (!policy.allowed) return res.status(403).json({ error: MESSAGING_POLICY_DENIED_MESSAGE });

    if (replyToMessageId) {
      const replyMessage = await getMessageActionContext(replyToMessageId);
      if (!replyMessage || Number(replyMessage.conversationId) !== Number(conversationId) || replyMessage.deletedAt) {
        return res.status(400).json({ error: 'Reply target must be an active message in this conversation.' });
      }
    }

    const message = await createMessageRecord({
      conversationId,
      senderId,
      content: content || '[Attachment]',
      replyToMessageId,
      clientMessageId,
    });
    const attachmentMap = message.wasIdempotentReplay ? await getMessageAttachments([message.id]) : null;
    const attachments = message.wasIdempotentReplay
      ? attachmentMap?.get(Number(message.id)) || []
      : await createMessageAttachments({
        conversationId,
        messageId: message.id,
        createdBy: senderId,
        attachments: normalizedAttachments.attachments,
      });
    const sender = await getSenderSummary(senderId);
    const messagePayload = {
      ...message,
      sender,
      conversation_id: conversationId,
      reply_to_message_id: message.reply_to_message_id ?? replyToMessageId,
      clientMessageId: message.clientMessageId || clientMessageId,
      attachments,
    };

    if (message.wasIdempotentReplay) return res.status(200).json(messagePayload);

    await touchConversation(conversationId);
    getManagedSocketIO()?.to(String(conversationId)).emit('new_message', messagePayload);

    try {
      const participants = await getMessageNotificationRecipients({ conversationId, senderId });
      await createMessageNotificationEvent({
        actor: sender || req.user,
        recipients: participants,
        conversationId,
        messageId: message.id,
        content: content || '[Attachment]',
      });
    } catch (notificationError) {
      console.warn(`REST message notification fanout failed for conversation ${conversationId}:`, notificationError?.message || notificationError);
    }

    return res.status(201).json(messagePayload);
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: SEND_MESSAGE_FAILED_MESSAGE });
  }
};
