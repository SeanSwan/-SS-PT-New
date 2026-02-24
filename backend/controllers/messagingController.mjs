/**
 * Messaging Controller
 * ====================
 *
 * Handles business logic for the messaging system's REST API.
 *
 * Blueprint Reference: docs/ai-workflow/MESSAGING-SYSTEM-BLUEPRINT.md
 */

import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

/**
 * Get all conversations for the authenticated user.
 * GET /api/messaging/conversations
 */
export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    // Check if messaging tables exist before running complex query
    const [tableCheck] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM pg_tables WHERE schemaname='public' AND tablename IN ('conversations','conversation_participants','messages','message_receipts')`,
      { type: QueryTypes.SELECT }
    );
    if (!tableCheck || parseInt(tableCheck.cnt) < 4) {
      return res.json([]);  // Tables not yet created — return empty rather than 500
    }

    const conversations = await sequelize.query(
      `
      WITH user_conversations AS (
        SELECT conversation_id FROM conversation_participants WHERE user_id = :userId
      ),
      last_messages AS (
        SELECT
          conversation_id,
          content,
          created_at,
          sender_id,
          ROW_NUMBER() OVER(PARTITION BY conversation_id ORDER BY created_at DESC) as rn
        FROM messages
        WHERE conversation_id IN (SELECT conversation_id FROM user_conversations)
      )
      SELECT
        c.id,
        c.type,
        c.name,
        (
          SELECT json_agg(json_build_object('id', u.id, 'name', u."firstName" || ' ' || u."lastName", 'photo', u.photo))
          FROM conversation_participants cp_inner
          JOIN users u ON u.id = cp_inner.user_id
          WHERE cp_inner.conversation_id = c.id AND cp_inner.user_id != :userId
        ) as participants,
        json_build_object('content', lm.content, 'timestamp', lm.created_at) as "lastMessage",
        (
          SELECT COUNT(*)
          FROM messages m
          LEFT JOIN message_receipts mr ON m.id = mr.message_id AND mr.user_id = :userId
          WHERE m.conversation_id = c.id AND m.sender_id != :userId AND mr.id IS NULL
        ) as "unreadCount"
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN last_messages lm ON c.id = lm.conversation_id AND lm.rn = 1
      WHERE cp.user_id = :userId
      GROUP BY c.id, lm.content, lm.created_at
      ORDER BY lm.created_at DESC;
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

/**
 * Create a new conversation.
 * POST /api/messaging/conversations
 */
export const createConversation = async (req, res) => {
  const { type = 'direct', name, participantIds } = req.body;
  const creatorId = req.user.id;

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ error: 'At least one participant ID is required.' });
  }

  const allParticipantIds = [...new Set([creatorId, ...participantIds])];

  const trx = await sequelize.transaction();
  try {
    // Create conversation
    const [conversation] = await trx.query(
      `INSERT INTO conversations (type, name, created_at, updated_at) VALUES (:type, :name, NOW(), NOW()) RETURNING *`,
      {
        replacements: { type, name: type === 'group' ? name : null },
        type: QueryTypes.INSERT,
        transaction: trx,
      }
    );

    // Add participants
    const participantValues = allParticipantIds.map(userId => `('${conversation.id}', ${userId}, 'member', NOW())`).join(',');
    await trx.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at) VALUES ${participantValues}`,
      { transaction: trx }
    );

    await trx.commit();

    // Fetch the full conversation object to return
    const [newConversation] = await sequelize.query(
      `
      SELECT
        c.id, c.type, c.name,
        (
          SELECT json_agg(json_build_object('id', u.id, 'name', u."firstName" || ' ' || u."lastName", 'photo', u.photo))
          FROM conversation_participants cp_inner
          JOIN users u ON u.id = cp_inner.user_id
          WHERE cp_inner.conversation_id = c.id
        ) as participants
      FROM conversations c
      WHERE c.id = :conversationId
      `,
      {
        replacements: { conversationId: conversation.id },
        type: QueryTypes.SELECT,
      }
    );

    res.status(201).json(newConversation);
  } catch (error) {
    await trx.rollback();
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
};

/**
 * Get messages for a specific conversation with pagination.
 * GET /api/messaging/conversations/:id/messages
 */
export const getMessagesForConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before; // Cursor for pagination (message ID)

  try {
    // 1. Verify user is a participant
    const [participant] = await sequelize.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = :conversationId AND user_id = :userId`,
      {
        replacements: { conversationId, userId },
        type: QueryTypes.SELECT,
      }
    );

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }

    // 2. Fetch messages
    let whereClause = 'm.conversation_id = :conversationId';
    const replacements = { conversationId, limit };

    if (before) {
      whereClause += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = :before)`;
      replacements.before = before;
    }

    const messages = await sequelize.query(
      `
      SELECT
        m.id,
        m.content,
        m.created_at,
        m.sender_id,
        json_build_object(
          'id', u.id,
          'name', u."firstName" || ' ' || u."lastName",
          'photo', u.photo
        ) as sender,
        (
          SELECT json_agg(
            json_build_object(
              'userId', reader.id,
              'userName', reader."firstName"
            )
          )
          FROM message_receipts mr JOIN users reader ON mr.user_id = reader.id WHERE mr.message_id = m.id
        ) as "readBy"
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT :limit
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

/**
 * Search for users to start a conversation.
 * GET /api/messaging/users/search?q=...
 */
export const searchUsers = async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user.id;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const users = await sequelize.query(
      `SELECT id, "firstName", "lastName", username, photo
       FROM users
       WHERE ( "firstName" ILIKE :query OR "lastName" ILIKE :query OR username ILIKE :query OR email ILIKE :query )
         AND id != :currentUserId
       LIMIT 10`,
      {
        replacements: { query: `%${q}%`, currentUserId },
        type: QueryTypes.SELECT,
      }
    );
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search for users.' });
  }
};