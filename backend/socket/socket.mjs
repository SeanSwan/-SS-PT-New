/**
 * Socket.IO Server Initialization
 * ===============================
 *
 * Handles real-time communication for the messaging system.
 *
 * Blueprint Reference: docs/ai-workflow/MESSAGING-SYSTEM-BLUEPRINT.md
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.mjs';

// In-memory store for online users. For production, this should be moved to Redis.
const onlineUsers = new Map(); // Map<userId, socketId>

// This is a simplified version of the 'protect' middleware for sockets
const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await sequelize.query(
      'SELECT id, role, "firstName", "lastName", username, photo FROM users WHERE id = :id AND "isActive" = true AND "deletedAt" IS NULL',
      {
        replacements: { id: decoded.id },
        type: QueryTypes.SELECT,
      }
    );

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user; // Attach user to the socket object
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://sswanstudios.com',
        'https://www.sswanstudios.com'
      ],
      methods: ['GET', 'POST'],
    },
  });

  // Use authentication middleware for all connections
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} for user ${socket.user.id}`);
    onlineUsers.set(socket.user.id, socket.id);

    // Notify other users in shared conversations that this user is online
    socket.broadcast.emit('user_online', { userId: socket.user.id });

    // Join rooms for each conversation the user is part of
    socket.on('join_conversations', async (conversationIds) => {
      if (!Array.isArray(conversationIds)) return;

      // Verify user is a participant in these conversations
      const userConversations = await sequelize.query(
        `SELECT conversation_id FROM conversation_participants WHERE user_id = :userId AND conversation_id IN (:conversationIds)`,
        {
          replacements: { userId: socket.user.id, conversationIds },
          type: QueryTypes.SELECT,
        }
      );

      const validConversationIds = userConversations.map(c => c.conversation_id);
      validConversationIds.forEach(convId => {
        socket.join(convId);
        socket.to(convId).emit('user_online', { userId: socket.user.id });
        logger.info(`User ${socket.user.id} joined room ${convId}`);
      });
    });

    // Handle new messages
    socket.on('send_message', async ({ conversationId, content }) => {
      if (!conversationId || !content) return;

      try {
        // 1. Save message to database
        const [newMessage] = await sequelize.query(
          `INSERT INTO messages (conversation_id, sender_id, content, created_at)
           VALUES (:conversationId, :senderId, :content, NOW())
           RETURNING id, content, created_at, sender_id, conversation_id`,
          {
            replacements: { conversationId, senderId: socket.user.id, content },
            type: QueryTypes.INSERT,
          }
        );

        const messagePayload = { ...newMessage, sender: socket.user };

        // 2. Broadcast message to all participants in the conversation room
        io.to(conversationId).emit('new_message', messagePayload);
        logger.info(`Message sent in room ${conversationId} by user ${socket.user.id}`);

        // 3. Create and emit notifications to other participants
        const participants = await sequelize.query(
          `SELECT user_id FROM conversation_participants WHERE conversation_id = :conversationId AND user_id != :senderId`,
          { replacements: { conversationId, senderId: socket.user.id }, type: QueryTypes.SELECT }
        );

        for (const participant of participants) {
          const notificationContent = {
            from: socket.user.firstName,
            message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            conversationId: conversationId,
          };

          const [notification] = await sequelize.query(
            `INSERT INTO notifications (user_id, type, content, created_at)
             VALUES (:userId, 'new_message', :content::jsonb, NOW())
             RETURNING *`,
            {
              replacements: { userId: participant.user_id, content: JSON.stringify(notificationContent) },
              type: QueryTypes.INSERT,
            }
          );

          // Emit to the specific user's personal room/socket
          const recipientSocketId = onlineUsers.get(participant.user_id);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('new_notification', notification);
          }
        }
      } catch (error) {
        logger.error(`Error sending message for user ${socket.user.id} in room ${conversationId}:`, error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // Handle typing indicators
    socket.on('is_typing', ({ conversationId }) => {
      if (conversationId) {
        socket.to(conversationId).emit('user_typing', {
          conversationId,
          userId: socket.user.id,
          userName: socket.user.firstName,
        });
      }
    });

    // Handle read receipts
    socket.on('mark_as_read', async ({ conversationId, lastMessageId }) => {
      if (!conversationId || !lastMessageId) return;

      try {
        // 1. Find all message IDs that are unread by this user in this conversation
        const unreadMessages = await sequelize.query(
          `SELECT m.id FROM messages m
           WHERE m.conversation_id = :conversationId
           AND m.created_at <= (SELECT created_at FROM messages WHERE id = :lastMessageId)
           AND NOT EXISTS (
             SELECT 1 FROM message_receipts mr
             WHERE mr.message_id = m.id AND mr.user_id = :userId
           )`,
          {
            replacements: { conversationId, lastMessageId, userId: socket.user.id },
            type: QueryTypes.SELECT,
          }
        );

        const unreadMessageIds = unreadMessages.map((m: any) => m.id);

        if (unreadMessageIds.length > 0) {
          // 2. Insert receipts for these specific IDs
          const values = unreadMessageIds.map(id => `('${id}', ${socket.user.id}, NOW())`).join(',');
          await sequelize.query(
            `INSERT INTO message_receipts (message_id, user_id, read_at) VALUES ${values}
             ON CONFLICT (message_id, user_id) DO NOTHING`,
            { type: QueryTypes.INSERT }
          );

          // 3. Emit the list of updated message IDs for an efficient frontend update
          io.to(conversationId).emit('messages_read', {
            conversationId,
            userId: socket.user.id,
            userName: socket.user.firstName,
            readMessageIds: unreadMessageIds, // Efficient payload
          });
        }
      } catch (error) {
        logger.error(`Error marking message as read for user ${socket.user.id}:`, error);
      }
    });

    // Provide a list of online users for a given set of user IDs
    socket.on('query_online_status', (userIds, callback) => {
      const statuses = {};
      if (Array.isArray(userIds)) {
        userIds.forEach(id => {
          statuses[id] = onlineUsers.has(id);
        });
      }
      callback(statuses);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
      onlineUsers.delete(socket.user.id);
      socket.broadcast.emit('user_offline', { userId: socket.user.id });
    });
  });

  logger.info('🚀 Socket.IO server initialized');
  return io;
};