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

    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS marked_unread_at TIMESTAMPTZ DEFAULT NULL;

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

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100);

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL;

    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS message_receipts (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_receipts_message_user
      ON message_receipts(message_id, user_id);

    CREATE TABLE IF NOT EXISTS user_blocks (
      id SERIAL PRIMARY KEY,
      blocker_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_mutes (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      muted_until TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS message_reports (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      reporter_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      reason VARCHAR(40) NOT NULL,
      details TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE message_reports
      ADD COLUMN IF NOT EXISTS resolver_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL;

    ALTER TABLE message_reports
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ DEFAULT NULL;

    ALTER TABLE message_reports
      ADD COLUMN IF NOT EXISTS resolution_note TEXT;

    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
      ON user_blocks(blocker_id, blocked_id);

    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
      ON user_blocks(blocked_id, blocker_id);

    CREATE INDEX IF NOT EXISTS idx_conversation_mutes_user
      ON conversation_mutes(user_id, conversation_id);

    CREATE TABLE IF NOT EXISTS message_reactions (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      reaction VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id, reaction)
    );

    CREATE TABLE IF NOT EXISTS message_pins (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      pinned_by INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, pinned_by)
    );

    CREATE TABLE IF NOT EXISTS message_saves (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      saved_by INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, saved_by)
    );

    CREATE TABLE IF NOT EXISTS message_attachments (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      kind VARCHAR(40) NOT NULL,
      title VARCHAR(140) NOT NULL,
      url TEXT,
      entity_type VARCHAR(40),
      entity_id INTEGER,
      metadata JSONB,
      scan_status VARCHAR(30) NOT NULL DEFAULT 'not_required',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_message_reactions_message
      ON message_reactions(message_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_message_pins_message
      ON message_pins(message_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_message_saves_message
      ON message_saves(message_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_message_saves_saved_by
      ON message_saves(saved_by, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_reply_to
      ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_messages_updated_by
      ON messages(updated_by)
      WHERE updated_by IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_message_attachments_message
      ON message_attachments(message_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_message_reports_message
      ON message_reports(message_id, status);
    CREATE INDEX IF NOT EXISTS idx_message_reports_status_created
      ON message_reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_active
      ON conversation_participants(user_id, conversation_id)
      WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
      ON messages(conversation_id, created_at DESC, id DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_conversation_client_message
      ON messages(conversation_id, sender_id, client_message_id)
      WHERE client_message_id IS NOT NULL;
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
