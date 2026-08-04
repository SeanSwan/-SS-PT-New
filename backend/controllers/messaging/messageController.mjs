/**
 * FILE: messageController.mjs
 * PURPOSE: Message history, send fallback, and user search handlers.
 */

import { QueryTypes } from 'sequelize';
import {
  createMessageRecord,
  ensureMessagingTables,
  getConversationMembership,
  getSenderSummary,
  sequelize,
  touchConversation,
} from '../../services/messagingRepository.mjs';
import { canSendToConversation, BLOCKED_MESSAGE } from '../../services/messaging/blockGuard.mjs';
import { checkMessageRate, MESSAGE_RATE_LIMITED } from '../../services/messaging/messageRateLimit.mjs';

const SEND_MESSAGE_FAILED_MESSAGE = 'Failed to send message.';
const FETCH_MESSAGES_FAILED_MESSAGE = 'Failed to fetch messages.';
const SEARCH_USERS_FAILED_MESSAGE = 'Failed to search for users.';
const MAX_MESSAGE_LENGTH = 5000;

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

/**
 * Escape LIKE/ILIKE wildcard metacharacters so user input is matched literally.
 * Backslash first (it is the default escape char), then % and _. Without this a
 * search of `%` matches the entire user table.
 */
const escapeLikePattern = (value) =>
  String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

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
         ), '[]'::json) as "readBy"
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

  try {
    const users = !query || query.length < 2
      ? await sequelize.query(
        `SELECT id, "firstName", "lastName", username, photo, role, "lastActive", "lastLogin"
         FROM "Users"
         WHERE id != :currentUserId
           AND "deletedAt" IS NULL
           AND ("isActive" = true OR "isActive" IS NULL)
         ORDER BY COALESCE("lastActive", "lastLogin") DESC NULLS LAST, "createdAt" DESC
         LIMIT 20`,
        { replacements: { currentUserId }, type: QueryTypes.SELECT }
      )
      : await sequelize.query(
        `SELECT id, "firstName", "lastName", username, photo, role, "lastActive", "lastLogin"
         FROM "Users"
         WHERE (
             "firstName" ILIKE :query
             OR "lastName" ILIKE :query
             OR ("firstName" || ' ' || "lastName") ILIKE :query
             OR username ILIKE :query
             OR email ILIKE :query
           )
           AND id != :currentUserId
           AND "deletedAt" IS NULL
           AND ("isActive" = true OR "isActive" IS NULL)
         ORDER BY COALESCE("lastActive", "lastLogin") DESC NULLS LAST, "createdAt" DESC
         LIMIT 20`,
        // Escape LIKE/ILIKE metacharacters before wrapping in %…%. Without this, a
        // query of `%` becomes `%%%` and matches every user — a one-character dump of
        // the whole directory (name, username, photo, role, activity). Escaping keeps
        // literal substring search intact while blocking wildcard injection. The
        // default backslash escape char applies (no ESCAPE clause needed).
        // Found 2026-08-04, security audit (Kimi hostile pass).
        { replacements: { query: `%${escapeLikePattern(query)}%`, currentUserId }, type: QueryTypes.SELECT }
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
  if (!conversationId || !senderId) return res.status(400).json({ error: 'Valid conversation ID is required.' });
  if (!content) return res.status(400).json({ error: 'Message content is required.' });
  if (content.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: 'Message content is too long.' });

  try {
    await ensureMessagingTables();
    const membership = await getConversationMembership(conversationId, senderId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of this conversation.' });

    // Blocking must actually block. Until 2026-07-27 this path checked
    // membership only, so a blocked user kept messaging through an existing
    // direct conversation and the Block button lied (rule 75).
    const blockCheck = await canSendToConversation(conversationId, senderId);
    if (!blockCheck.allowed) return res.status(403).json({ error: BLOCKED_MESSAGE });

    // Throttle AFTER authorization so a rejected sender cannot burn another
    // user's budget, and so 403 is never masked by 429.
    const rate = checkMessageRate(senderId);
    if (!rate.allowed) {
      res.set('Retry-After', String(Math.ceil((rate.retryAfterMs ?? 1000) / 1000)));
      return res.status(429).json({ error: MESSAGE_RATE_LIMITED });
    }

    const message = await createMessageRecord({ conversationId, senderId, content });
    await touchConversation(conversationId);
    const sender = await getSenderSummary(senderId);
    return res.status(201).json({ ...message, sender, conversation_id: conversationId });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: SEND_MESSAGE_FAILED_MESSAGE });
  }
};
