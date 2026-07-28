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
import { createMessageNotificationEvent } from '../services/communications/notificationOrchestratorService.mjs';
import { getMessageNotificationRecipients } from '../services/messagingNotificationRecipientService.mjs';
import { createMessageRecord, ensureMessagingTables, normalizeClientMessageId } from '../services/messagingRepository.mjs';
import { assertCanMessageConversation, MESSAGING_POLICY_DENIED_MESSAGE } from '../services/messagingPolicyService.mjs';
import { isSocketRateLimited } from '../services/socketEventRateLimiter.mjs';
import { getIO as getManagedSocketIO } from './socketManager.mjs';
import { getJwtSecret, isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';

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

const addOnlineSocket = (userId, socketId) => {
  const normalizedUserId = toPositiveInt(userId);
  if (!normalizedUserId || !socketId) return false;
  const wasOnline = onlineUsers.has(normalizedUserId) && onlineUsers.get(normalizedUserId).size > 0;
  const socketIds = onlineUsers.get(normalizedUserId) || new Set();
  socketIds.add(socketId);
  onlineUsers.set(normalizedUserId, socketIds);
  return wasOnline;
};

const removeOnlineSocket = (userId, socketId) => {
  const normalizedUserId = toPositiveInt(userId);
  if (!normalizedUserId || !socketId) return false;
  const socketIds = onlineUsers.get(normalizedUserId);
  if (!socketIds) return false;
  socketIds.delete(socketId);
  if (socketIds.size > 0) return true;
  onlineUsers.delete(normalizedUserId);
  return false;
};

const isUserOnline = (userId) => {
  const normalizedUserId = toPositiveInt(userId);
  return Boolean(normalizedUserId && onlineUsers.get(normalizedUserId)?.size > 0);
};

const ackMessageSend = (ack, payload) => {
  if (typeof ack !== 'function') return;
  try {
    ack(payload);
  } catch (error) {
    logger.warn(`Messaging send ack failed: ${error.message}`);
  }
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
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId ?? decoded.id;
    const [user] = await sequelize.query(
      'SELECT id, role, "firstName", "lastName", username, photo FROM "Users" WHERE id = :id AND "isActive" = true AND "deletedAt" IS NULL',
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
    const wasOnline = addOnlineSocket(socket.user.id, socket.id);
    if (!wasOnline) socket.broadcast.emit('user_online', { userId: socket.user.id });

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

    socket.on('send_message', async (payload, ack) => {
      const { conversationId, content, clientMessageId, attachments, replyToMessageId } = payload || {};
      const normalizedConversationId = toPositiveInt(conversationId);
      const normalizedClientMessageId = normalizeClientMessageId(clientMessageId);
      const trimmedContent = typeof content === 'string' ? content.trim() : '';

      const failSend = (message) => {
        ackMessageSend(ack, { ok: false, clientMessageId: normalizedClientMessageId, error: message });
        socket.emit('error', { message });
      };

      if (isSocketRateLimited({ userId: socket.user.id, event: 'send_message', limit: 60, windowMs: 60 * 1000 })) return failSend('Too many messages. Please slow down.');
      if (!normalizedConversationId) return failSend('Valid conversation ID is required.');
      if (Array.isArray(attachments) && attachments.length > 0) return failSend('Attachments must be sent through the REST message endpoint.');
      if (replyToMessageId) return failSend('Replies with attachments or reply references must use REST.');
      if (!trimmedContent) return failSend('Message content is required.');
      if (trimmedContent.length > MAX_MESSAGE_LENGTH) return failSend('Message content is too long.');

      try {
        await ensureMessagingTables();
        if (!(await isActiveParticipant(normalizedConversationId, socket.user.id))) {
          failSend('You are not a member of this conversation.');
          return;
        }

        const policy = await assertCanMessageConversation({ actorId: socket.user.id, conversationId: normalizedConversationId });
        if (!policy.allowed) return failSend(MESSAGING_POLICY_DENIED_MESSAGE);

        const newMessage = await createMessageRecord({
          conversationId: normalizedConversationId,
          senderId: socket.user.id,
          content: trimmedContent,
          clientMessageId: normalizedClientMessageId,
        });
        const messagePayload = { ...newMessage, sender: socket.user, clientMessageId: normalizedClientMessageId };
        const roomName = String(normalizedConversationId);

        if (newMessage.wasIdempotentReplay) {
          ackMessageSend(ack, {
            ok: true,
            clientMessageId: normalizedClientMessageId,
            messageId: newMessage.id,
            createdAt: newMessage.created_at,
            message: messagePayload,
          });
          return;
        }

        io.to(roomName).emit('new_message', messagePayload);
        logger.info(`Message sent in room ${roomName} by user ${socket.user.id}`);

        ackMessageSend(ack, {
          ok: true,
          clientMessageId: normalizedClientMessageId,
          messageId: newMessage.id,
          createdAt: newMessage.created_at,
          message: messagePayload,
        });

        try {
          const participants = await getMessageNotificationRecipients({
            conversationId: normalizedConversationId,
            senderId: socket.user.id,
          });

          await createMessageNotificationEvent({
            actor: socket.user,
            recipients: participants,
            conversationId: normalizedConversationId,
            messageId: newMessage.id,
            content: trimmedContent,
          });
        } catch (notificationError) {
          logger.warn(`Message notification fanout failed for room ${roomName}: ${notificationError.message}`);
        }
      } catch (error) {
        logger.error(`Error sending message for user ${socket.user.id} in room ${normalizedConversationId}:`, error);
        failSend('Failed to send message.');
      }
    });

    socket.on('is_typing', ({ conversationId }) => {
      if (isSocketRateLimited({ userId: socket.user.id, event: 'is_typing', limit: 30, windowMs: 10 * 1000 })) return;
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

        await sequelize.query(
          `UPDATE conversation_participants
           SET marked_unread_at = NULL
           WHERE conversation_id = :conversationId
             AND user_id = :userId
             AND deleted_at IS NULL
             AND marked_unread_at IS NOT NULL`,
          {
            replacements: {
              conversationId: normalizedConversationId,
              userId: socket.user.id,
            },
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
        userIds.forEach(id => { statuses[id] = isUserOnline(id); });
      }
      if (typeof callback === 'function') callback(statuses);
    });

    socket.on('disconnect', () => {
      logger.info(`Messaging socket disconnected: ${socket.id}`);
      const stillOnline = removeOnlineSocket(socket.user.id, socket.id);
      if (!stillOnline) socket.broadcast.emit('user_offline', { userId: socket.user.id });
    });
  });

  logger.info('Messaging Socket.IO namespace initialized');
  return io;
};