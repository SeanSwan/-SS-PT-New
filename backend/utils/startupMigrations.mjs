/**
 * Startup Migrations - Production Database Patches
 * =================================================
 * Runs idempotent migrations on server startup.
 * Each migration checks preconditions before executing (safe to re-run).
 *
 * Called from: core/startup.mjs → initializeDatabases()
 */

import sequelize from '../database.mjs';
import logger from './logger.mjs';

/**
 * Migration 1: Fix admin_settings.userId column type
 * - Controller queries with string keys ('system', 'notifications', 'security')
 * - Column was UUID, causing cast errors on findOne with string literals
 * - Changes to VARCHAR(255) which accepts both UUIDs and category keys
 */
async function migrateAdminSettingsUserId() {
  try {
    // Check if table exists
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'admin_settings';`
    );
    if (!tables || tables.length === 0) {
      logger.info('[Migration] admin_settings table does not exist yet, skipping userId fix');
      return;
    }

    // Check current column type
    const [columns] = await sequelize.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'admin_settings' AND column_name = 'userId';`
    );

    if (!columns || columns.length === 0) {
      logger.info('[Migration] admin_settings.userId column not found, skipping');
      return;
    }

    const currentType = columns[0].data_type;
    if (currentType === 'character varying') {
      logger.info('[Migration] admin_settings.userId already VARCHAR - no change needed');
      return;
    }

    logger.info(`[Migration] Changing admin_settings.userId from ${currentType} to VARCHAR(255)...`);
    await sequelize.query(
      `ALTER TABLE admin_settings ALTER COLUMN "userId" TYPE VARCHAR(255) USING "userId"::VARCHAR(255);`
    );
    logger.info('[Migration] admin_settings.userId changed to VARCHAR(255) successfully');
  } catch (error) {
    logger.warn(`[Migration] admin_settings userId fix failed (non-critical): ${error.message}`);
  }
}

/**
 * Migration 2: Create messaging tables
 * - conversations, conversation_participants, messages, message_receipts
 * - Required by messagingController.mjs (raw SQL queries)
 * - Uses IF NOT EXISTS for safety
 */
async function migrateMessagingTables() {
  try {
    // Check if conversations table already exists
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'conversations';`
    );
    if (tables && tables.length > 0) {
      logger.info('[Migration] messaging tables already exist - no change needed');
      return;
    }

    logger.info('[Migration] Creating messaging tables...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL DEFAULT 'direct',
        name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_receipts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(message_id, user_id)
      );
    `);

    // Indexes for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_message_receipts_msg ON message_receipts(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON message_receipts(user_id);
    `);

    logger.info('[Migration] Messaging tables created successfully');
  } catch (error) {
    logger.warn(`[Migration] Messaging tables creation failed (non-critical): ${error.message}`);
  }
}

/**
 * Run all startup migrations - called during server initialization.
 * Each migration is idempotent and wrapped in its own try/catch.
 */
export async function runStartupMigrations() {
  try {
    logger.info('[Migrations] Running startup migrations...');

    await migrateAdminSettingsUserId();
    await migrateMessagingTables();

    logger.info('[Migrations] All startup migrations completed');
    return true;
  } catch (error) {
    logger.error('[Migrations] Startup migrations failed:', error.message);
    return false;
  }
}

export default {
  runStartupMigrations
};
