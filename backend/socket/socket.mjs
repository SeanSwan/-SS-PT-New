/**
 * Socket.IO Server Initialization
 * ===============================
 *
 * Handles real-time communication for the messaging system.
 */

import jwt from 'jsonwebtoken';
import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.mjs';
import { getIO as getManagedSocketIO } from './socketManager.mjs';
import { getJwtSecret, isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';
import { canSendToConversation, BLOCKED_MESSAGE } from '../services/messaging/blockGuard.mjs';
import { checkMessageRate, MESSAGE_RATE_LIMITED } from '../services/messaging/messageRateLimit.mjs';
import { isRelationshipWriteAllowed } from '../services/messagingAccessRepository.mjs';
import { resolveCurrentEntitlement, isGatingEnabled } from '../middleware/requireTier.mjs';
import { meetsMinimumTier } from '../config/tierCatalog.mjs';

const onlineUsers = new Map();
const MAX_MESSAGE_LENGTH = 5000;

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const normalizeConversationIds = (conversationIds) => {
  if (!Array.isArray(conversationIds)) return [];
  return [...new Set(conversationIds.map(toPositiveInt).filter(Boolean))];
};

async function isActiveParticipant(conversationId, userId) {
  const [participant] = await sequelize.query(
    `SELECT 1
     FROM conversation_participants
     WHERE conversation_id = :conversationId
       AND user_id = :userId
       AND deleted_at IS NULL
     LIMIT 1`,
    { replacements: { conversationId, userId }, type: QueryTypes.SELECT }
  );
  return Boolean(participant);
}

const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided'));

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    // Only access tokens open a socket — a refresh / force-password-change temp
    // token (signature-valid because the refresh secret defaults to JWT_SECRET)
    // must NOT authenticate a live connection.
    // Launch audit 2026-08-04: this was `decoded.tokenType && decoded.tokenType
    // !== 'access'` — truthiness-gated, so a token OMITTING tokenType passed
    // straight through, contradicting the guarantee the comment above makes.
    // No signer omits it today (all three set tokenType:'access'), so failing
    // closed breaks nothing now and removes the trap for any future signer.
    if (decoded.tokenType !== 'access') {
      return next(new Error('Authentication error: Invalid token type'));
    }
    const userId = decoded.userId ?? decoded.id;
    const [user] = await sequelize.query(
      'SELECT id, role, "firstName", "lastName", username, photo FROM "Users" WHERE id = :id AND "isActive" = true AND "isLocked" = false AND "deletedAt" IS NULL',
      { replacements: { id: userId }, type: QueryTypes.SELECT }
    );

    if (!user) return next(new Error('Authentication error: User not found'));
    socket.user = user;
    return next();
  } catch (error) {
    if (isJwtSecretConfigurationError(error)) {
      logger.error('JWT_SECRET not configured for messaging socket authentication');
      return next(new Error('Authentication error: Server configuration error'));
    }
    return next(new Error('Authentication error: Invalid token'));
  }
};

export const initializeSocket = () => {
  const managedIO = getManagedSocketIO();
  if (!managedIO) {
    logger.warn('Messaging Socket.IO namespace skipped because primary Socket.IO is not initialized');
    return null;
  }

  const io = managedIO.of('/messaging');
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`Messaging socket connected: ${socket.id} for user ${socket.user.id}`);
    onlineUsers.set(socket.user.id, socket.id);
    socket.broadcast.emit('user_online', { userId: socket.user.id });

    socket.on('join_conversations', async (conversationIds) => {
      const normalizedIds = normalizeConversationIds(conversationIds);
      if (normalizedIds.length === 0) return;

      try {
        const userConversations = await sequelize.query(
          `SELECT conversation_id
           FROM conversation_participants
           WHERE user_id = :userId
             AND conversation_id IN (:conversationIds)
             AND deleted_at IS NULL`,
          { replacements: { userId: socket.user.id, conversationIds: normalizedIds }, type: QueryTypes.SELECT }
        );

        userConversations.forEach((conversation) => {
          const roomName = String(conversation.conversation_id);
          socket.join(roomName);
          socket.to(roomName).emit('user_online', { userId: socket.user.id });
          logger.info(`User ${socket.user.id} joined messaging room ${roomName}`);
        });
      } catch (error) {
        logger.error(`Error joining messaging rooms for user ${socket.user.id}:`, error);
      }
    });

    socket.on('send_message', async ({ conversationId, content }) => {
      const normalizedConversationId = toPositiveInt(conversationId);
      const trimmedContent = typeof content === 'string' ? content.trim() : '';
      if (!normalizedConversationId || !trimmedContent || trimmedContent.length > MAX_MESSAGE_LENGTH) return;

      try {
        if (!(await isActiveParticipant(normalizedConversationId, socket.user.id))) {
          socket.emit('error', { message: 'You are not a member of this conversation.' });
          return;
        }

        // Same throttle as REST. Without it, a limiter on the REST path alone
        // would be bypassed by emitting 'send_message' over the websocket.
        const rate = checkMessageRate(socket.user.id);
        if (!rate.allowed) {
          socket.emit('error', { message: MESSAGE_RATE_LIMITED, retryAfterMs: rate.retryAfterMs });
          return;
        }

        // Throttle FIRST: the lane check below costs up to three DB round-trips
        // (entitlement, assignments, members). Running it before the limiter let
        // an unthrottled emit loop force that work per message (GLM 5.3).
        // Same RELATIONSHIP lane as the REST path. The lane shipped as Express
        // middleware only, so a free-tier client with an active assignment was
        // 403'd by REST on an old community thread and could still write to it
        // here — exactly the failure this file's next comment warns about, and
        // flagged independently by two post-ship reviewers.
        let hasCommunityAccess = false;
        try {
          const entitlement = await resolveCurrentEntitlement({ user: socket.user });
          hasCommunityAccess = meetsMinimumTier(entitlement.effectiveTier, 'elite');
        } catch {
          hasCommunityAccess = false; // fail closed, same as the middleware
        }
        if (!isGatingEnabled()) hasCommunityAccess = true;

        if (!(await isRelationshipWriteAllowed(socket.user, normalizedConversationId, hasCommunityAccess))) {
          socket.emit('error', { message: 'You can message your assigned trainer here.' });
          return;
        }

        // Same block check as the REST path. Fixing only REST would have been a
        // false fix — this socket handler is a complete second way to send.
        const blockCheck = await canSendToConversation(normalizedConversationId, socket.user.id);
        if (!blockCheck.allowed) {
          socket.emit('error', { message: BLOCKED_MESSAGE });
          return;
        }

        const [rows] = await sequelize.query(
          `INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)
           VALUES (:conversationId, :senderId, :content, NOW(), NOW())
           RETURNING id, content, created_at, updated_at, sender_id, conversation_id`,
          { replacements: { conversationId: normalizedConversationId, senderId: socket.user.id, content: trimmedContent } }
        );
        const newMessage = rows[0] || rows;
        const messagePayload = { ...newMessage, sender: socket.user };
        const roomName = String(normalizedConversationId);

        io.to(roomName).emit('new_message', messagePayload);
        logger.info(`Message sent in room ${roomName} by user ${socket.user.id}`);

        const participants = await sequelize.query(
          `SELECT user_id
           FROM conversation_participants
           WHERE conversation_id = :conversationId
             AND user_id != :senderId
             AND deleted_at IS NULL`,
          { replacements: { conversationId: normalizedConversationId, senderId: socket.user.id }, type: QueryTypes.SELECT }
        );

        for (const participant of participants) {
          const notificationContent = {
            from: socket.user.firstName,
            message: trimmedContent.substring(0, 50) + (trimmedContent.length > 50 ? '...' : ''),
            conversationId: normalizedConversationId,
          };
          const [notificationRows] = await sequelize.query(
            `INSERT INTO notifications (user_id, type, content, created_at)
             VALUES (:userId, 'new_message', :content::jsonb, NOW())
             RETURNING *`,
            { replacements: { userId: participant.user_id, content: JSON.stringify(notificationContent) } }
          );

          const recipientSocketId = onlineUsers.get(participant.user_id);
          if (recipientSocketId) io.to(recipientSocketId).emit('new_notification', notificationRows[0] || notificationRows);
        }
      } catch (error) {
        logger.error(`Error sending message for user ${socket.user.id} in room ${normalizedConversationId}:`, error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('is_typing', ({ conversationId }) => {
      const normalizedConversationId = toPositiveInt(conversationId);
      if (!normalizedConversationId) return;
      const roomName = String(normalizedConversationId);
      if (!socket.rooms.has(roomName)) return;
      socket.to(roomName).emit('user_typing', {
        conversationId: normalizedConversationId,
        userId: socket.user.id,
        userName: socket.user.firstName,
      });
    });

    socket.on('mark_as_read', async ({ conversationId, lastMessageId }) => {
      const normalizedConversationId = toPositiveInt(conversationId);
      const normalizedLastMessageId = toPositiveInt(lastMessageId);
      if (!normalizedConversationId || !normalizedLastMessageId) return;

      try {
        if (!(await isActiveParticipant(normalizedConversationId, socket.user.id))) return;
        const readRows = await sequelize.query(
          `WITH inserted AS (
             INSERT INTO message_receipts (message_id, user_id, read_at)
             SELECT m.id, :userId, NOW()
             FROM messages m
             WHERE m.conversation_id = :conversationId
               AND m.created_at <= (
                 SELECT created_at FROM messages
                 WHERE id = :lastMessageId AND conversation_id = :conversationId
               )
               AND NOT EXISTS (
                 SELECT 1 FROM message_receipts mr
                 WHERE mr.message_id = m.id AND mr.user_id = :userId
               )
             ON CONFLICT (message_id, user_id) DO NOTHING
             RETURNING message_id
           )
           SELECT message_id FROM inserted`,
          {
            replacements: {
              conversationId: normalizedConversationId,
              lastMessageId: normalizedLastMessageId,
              userId: socket.user.id,
            },
            type: QueryTypes.SELECT,
          }
        );

        const readMessageIds = readRows.map(row => row.message_id);
        if (readMessageIds.length > 0) {
          io.to(String(normalizedConversationId)).emit('messages_read', {
            conversationId: normalizedConversationId,
            userId: socket.user.id,
            userName: socket.user.firstName,
            readMessageIds,
          });
        }
      } catch (error) {
        logger.error(`Error marking message as read for user ${socket.user.id}:`, error);
      }
    });

    socket.on('query_online_status', (userIds, callback) => {
      const statuses = {};
      if (Array.isArray(userIds)) {
        userIds.forEach(id => { statuses[id] = onlineUsers.has(id); });
      }
      if (typeof callback === 'function') callback(statuses);
    });

    socket.on('disconnect', () => {
      logger.info(`Messaging socket disconnected: ${socket.id}`);
      onlineUsers.delete(socket.user.id);
      socket.broadcast.emit('user_offline', { userId: socket.user.id });
    });
  });

  logger.info('Messaging Socket.IO namespace initialized');
  return io;
};
