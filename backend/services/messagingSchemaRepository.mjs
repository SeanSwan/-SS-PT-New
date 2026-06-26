/**
 * FILE: messagingSchemaRepository.mjs
 * PURPOSE: Messaging schema bootstrap and default admin conversation setup.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { createConversationRecord, findDirectConversation } from './messagingConversationQueries.mjs';
import { createMessageRecord } from './messagingMessageRepository.mjs';
import { upsertConversationParticipant } from './messagingParticipantRepository.mjs';

let defaultAdminId = null;

export async function ensureMessagingTables() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL DEFAULT 'direct',
      name VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      UNIQUE(conversation_id, user_id)
    );

    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';

    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

    UPDATE conversation_participants
      SET role = 'member'
      WHERE role IS NULL OR role NOT IN ('owner', 'admin', 'member');

    ALTER TABLE conversation_participants
      ALTER COLUMN role SET DEFAULT 'member';

    ALTER TABLE conversation_participants
      ALTER COLUMN role SET NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_conversation_user
      ON conversation_participants(conversation_id, user_id);

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS message_receipts (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_receipts_message_user
      ON message_receipts(message_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_active
      ON conversation_participants(user_id, conversation_id)
      WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
      ON messages(conversation_id, created_at DESC, id DESC);
  `);
}

export async function getDefaultAdminId() {
  if (defaultAdminId) return defaultAdminId;

  const [admin] = await sequelize.query(
    `SELECT id
     FROM (
       SELECT id, 1 as priority FROM "Users"
       WHERE id = 2 AND "deletedAt" IS NULL
       UNION ALL
       SELECT id, 2 as priority FROM "Users"
       WHERE role = 'admin' AND "deletedAt" IS NULL
     ) admins
     ORDER BY priority, id
     LIMIT 1`,
    { type: QueryTypes.SELECT }
  );

  defaultAdminId = admin?.id || null;
  return defaultAdminId;
}

export async function ensureAdminConversation(userId) {
  const adminId = await getDefaultAdminId();
  if (!adminId || Number(adminId) === Number(userId)) return;

  const existing = await findDirectConversation(userId, adminId);
  if (existing) return;

  const trx = await sequelize.transaction();
  try {
    const conversation = await createConversationRecord({ type: 'direct', name: null, transaction: trx });
    await upsertConversationParticipant({ conversationId: conversation.id, userId, role: 'member', transaction: trx });
    await upsertConversationParticipant({ conversationId: conversation.id, userId: adminId, role: 'member', transaction: trx });
    await createMessageRecord({
      conversationId: conversation.id,
      senderId: adminId,
      content: 'Welcome to SwanStudios. I am Sean, your coach. Message me anytime about training, scheduling, or account questions.',
      transaction: trx,
    });
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    console.error('Failed to create welcome conversation:', error.message);
  }
}
