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
 * Default admin contact — every user gets a welcome conversation with Sean.
 * Looked up dynamically on first call, then cached for the process lifetime.
 */
let _defaultAdminId = null;
async function getDefaultAdminId() {
  if (_defaultAdminId) return _defaultAdminId;
  // Find the site owner (Sean Swan, ID 1) or fall back to any admin
  const [admin] = await sequelize.query(
    `SELECT id FROM "Users" WHERE id = 1
     UNION ALL
     SELECT id FROM "Users" WHERE role = 'admin' ORDER BY id LIMIT 1`,
    { type: QueryTypes.SELECT }
  );
  _defaultAdminId = admin?.id || null;
  return _defaultAdminId;
}

/**
 * Ensure a welcome conversation exists between a user and the default admin.
 * Called lazily when a user first opens messaging.
 */
async function ensureAdminConversation(userId) {
  const adminId = await getDefaultAdminId();
  if (!adminId || adminId === userId) return; // Admin doesn't need a convo with themselves

  // Check if a direct conversation already exists
  const [existing] = await sequelize.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = :userId
     JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = :adminId
     WHERE c.type = 'direct'
     LIMIT 1`,
    { replacements: { userId, adminId }, type: QueryTypes.SELECT }
  );
  if (existing) return; // Already have a conversation

  // Create the welcome conversation inside a transaction
  const trx = await sequelize.transaction();
  try {
    const [convRows] = await sequelize.query(
      `INSERT INTO conversations (type, name, created_at, updated_at)
       VALUES ('direct', NULL, NOW(), NOW()) RETURNING id`,
      { transaction: trx }
    );
    const convId = (convRows[0] || convRows).id;

    await sequelize.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
       VALUES (:convId, :userId, 'member', NOW()), (:convId, :adminId, 'member', NOW())`,
      { replacements: { convId, userId, adminId }, transaction: trx }
    );

    // Send a welcome message from Sean
    await sequelize.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)
       VALUES (:convId, :adminId, :content, NOW(), NOW())`,
      {
        replacements: {
          convId,
          adminId,
          content: `Welcome to SwanStudios! 🦢 I'm Sean, your coach. Feel free to message me anytime — whether it's about training, scheduling, or anything else. I'm here to help!`,
        },
        transaction: trx,
      }
    );

    await trx.commit();
    console.log(`Created welcome conversation (${convId}) between user ${userId} and admin ${adminId}`);
  } catch (err) {
    await trx.rollback();
    // Don't throw — this is a best-effort enhancement, not a hard requirement
    console.error('Failed to create welcome conversation:', err.message);
  }
}

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

    // Ensure the user has a welcome conversation with the admin (lazy, one-time)
    await ensureAdminConversation(userId);

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

  try {
    // Ensure messaging tables exist (auto-create if missing)
    const [tableCheck] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM pg_tables WHERE schemaname='public' AND tablename IN ('conversations','conversation_participants','messages','message_receipts')`,
      { type: QueryTypes.SELECT }
    );
    if (!tableCheck || parseInt(tableCheck.cnt) < 4) {
      console.log('Messaging tables missing — auto-creating...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY, type VARCHAR(20) NOT NULL DEFAULT 'direct',
          name VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS conversation_participants (
          id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL DEFAULT 'member', joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(conversation_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS message_receipts (
          id SERIAL PRIMARY KEY, message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(message_id, user_id)
        );
      `);
      console.log('Messaging tables created successfully');
    }

    // For direct conversations, check if one already exists between these two users
    if (type === 'direct' && participantIds.length === 1) {
      const [existing] = await sequelize.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = :creatorId
         JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = :participantId
         WHERE c.type = 'direct'
         LIMIT 1`,
        {
          replacements: { creatorId, participantId: participantIds[0] },
          type: QueryTypes.SELECT,
        }
      );
      if (existing) {
        const [existingConversation] = await sequelize.query(
          `SELECT c.id, c.type, c.name,
            (SELECT json_agg(json_build_object('id', u.id, 'name', u."firstName" || ' ' || u."lastName", 'photo', u.photo))
             FROM conversation_participants cp_inner JOIN users u ON u.id = cp_inner.user_id
             WHERE cp_inner.conversation_id = c.id) as participants
           FROM conversations c WHERE c.id = :conversationId`,
          { replacements: { conversationId: existing.id }, type: QueryTypes.SELECT }
        );
        return res.status(200).json(existingConversation);
      }
    }

    // Create conversation inside a transaction
    const trx = await sequelize.transaction();
    try {
      const [convRows] = await sequelize.query(
        `INSERT INTO conversations (type, name, created_at, updated_at) VALUES (:type, :name, NOW(), NOW()) RETURNING *`,
        {
          replacements: { type, name: type === 'group' ? name : null },
          transaction: trx,
        }
      );
      const conversation = convRows[0] || convRows;

      // Add participants
      for (const uid of allParticipantIds) {
        await sequelize.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at) VALUES (:convId, :uid, 'member', NOW())`,
          { replacements: { convId: conversation.id, uid }, transaction: trx }
        );
      }

      await trx.commit();

      // Fetch the full conversation object to return
      const [newConversation] = await sequelize.query(
        `SELECT c.id, c.type, c.name,
          (SELECT json_agg(json_build_object('id', u.id, 'name', u."firstName" || ' ' || u."lastName", 'photo', u.photo))
           FROM conversation_participants cp_inner JOIN users u ON u.id = cp_inner.user_id
           WHERE cp_inner.conversation_id = c.id) as participants
         FROM conversations c WHERE c.id = :conversationId`,
        {
          replacements: { conversationId: conversation.id },
          type: QueryTypes.SELECT,
        }
      );

      res.status(201).json(newConversation);
    } catch (insertError) {
      await trx.rollback();
      throw insertError;
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: `Failed to create conversation: ${error.message}` });
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
 *
 * If no query (or query < 2 chars), returns suggested users (up to 20)
 * so the modal shows available contacts immediately on open.
 *
 * Normalizes role: DB 'user' → 'client' for display.
 */
export const searchUsers = async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user.id;

  try {
    let users;

    if (!q || q.length < 2) {
      // Return suggested users — most recently active, non-deleted, excluding self
      users = await sequelize.query(
        `SELECT id, "firstName", "lastName", username, photo, role
         FROM users
         WHERE id != :currentUserId
           AND "deletedAt" IS NULL
         ORDER BY "lastLogin" DESC NULLS LAST, "createdAt" DESC
         LIMIT 20`,
        {
          replacements: { currentUserId },
          type: QueryTypes.SELECT,
        }
      );
    } else {
      // Search by name, username, or email
      users = await sequelize.query(
        `SELECT id, "firstName", "lastName", username, photo, role
         FROM users
         WHERE ( "firstName" ILIKE :query OR "lastName" ILIKE :query OR username ILIKE :query OR email ILIKE :query )
           AND id != :currentUserId
           AND "deletedAt" IS NULL
         ORDER BY "lastLogin" DESC NULLS LAST, "createdAt" DESC
         LIMIT 20`,
        {
          replacements: { query: `%${q}%`, currentUserId },
          type: QueryTypes.SELECT,
        }
      );
    }

    // Normalize role: DB default 'user' should display as 'client'
    const normalized = users.map(u => ({
      ...u,
      role: u.role === 'user' ? 'client' : u.role,
    }));

    res.json(normalized);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search for users.' });
  }
};

/**
 * Send a message to a conversation (REST fallback when Socket.IO is unavailable).
 * POST /api/messaging/conversations/:id/messages
 */
export const sendMessage = async (req, res) => {
  const { id: conversationId } = req.params;
  const senderId = req.user.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    // Verify user is a participant
    const [participant] = await sequelize.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = :conversationId AND user_id = :senderId`,
      { replacements: { conversationId, senderId }, type: QueryTypes.SELECT }
    );
    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation.' });
    }

    // Insert the message
    const [rows] = await sequelize.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at, updated_at)
       VALUES (:conversationId, :senderId, :content, NOW(), NOW()) RETURNING *`,
      { replacements: { conversationId, senderId, content: content.trim() } }
    );
    const message = rows[0] || rows;

    // Fetch sender info
    const [sender] = await sequelize.query(
      `SELECT id, "firstName" || ' ' || "lastName" as name, photo FROM users WHERE id = :senderId`,
      { replacements: { senderId }, type: QueryTypes.SELECT }
    );

    const fullMessage = { ...message, sender, conversation_id: conversationId };
    res.status(201).json(fullMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: `Failed to send message: ${error.message}` });
  }
};