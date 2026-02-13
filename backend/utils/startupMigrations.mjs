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
 * Migration 1: Ensure admin_settings has a 'category' column
 * - The table was created with only (id, settings, createdAt, updatedAt)
 * - We need a 'category' column to store which settings category each row belongs to
 * - Also adds a UNIQUE constraint on category for findOrCreate support
 */
async function migrateAdminSettingsCategory() {
  try {
    // Check if table exists
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'admin_settings';`
    );
    if (!tables || tables.length === 0) {
      logger.info('[Migration] admin_settings table does not exist yet, skipping');
      return;
    }

    // Check if category column already exists
    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'admin_settings' AND column_name = 'category';`
    );

    if (cols && cols.length > 0) {
      logger.info('[Migration] admin_settings.category column already exists - no change needed');
      return;
    }

    // Also check for userId/user_id (legacy column name)
    const [legacyCols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'admin_settings' AND column_name IN ('userId', 'user_id');`
    );

    if (legacyCols && legacyCols.length > 0) {
      // Rename legacy column to 'category'
      const oldName = legacyCols[0].column_name;
      logger.info(`[Migration] Renaming admin_settings.${oldName} to category...`);
      await sequelize.query(
        `ALTER TABLE admin_settings RENAME COLUMN "${oldName}" TO category;`
      );
      // Ensure it's VARCHAR
      await sequelize.query(
        `ALTER TABLE admin_settings ALTER COLUMN category TYPE VARCHAR(255);`
      );
      logger.info('[Migration] Renamed to category successfully');
      return;
    }

    // No category or userId column exists - add category column
    logger.info('[Migration] Adding category column to admin_settings...');
    await sequelize.query(
      `ALTER TABLE admin_settings ADD COLUMN category VARCHAR(255);`
    );

    // Add unique index on category for findOrCreate support
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_category ON admin_settings(category);`
    );

    logger.info('[Migration] admin_settings.category column added successfully');
  } catch (error) {
    logger.warn(`[Migration] admin_settings category fix failed (non-critical): ${error.message}`);
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
 * Migration 3: Add stabilization sprint columns to existing tables
 * - Users: forcePasswordChange (BOOLEAN), bannerPhoto (VARCHAR)
 * - session_types: creditsRequired (INTEGER)
 * - daily_workout_forms: trainer_notes (TEXT), client_summary (TEXT)
 * These columns were added to models but sequelize.sync({ alter }) may fail
 * if any model has constraint errors, so we add them explicitly here.
 */
async function migrateStabilizationColumns() {
  // Helper: add column if it doesn't exist
  const addColumnIfMissing = async (table, column, definition) => {
    try {
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = '${table}' AND column_name = '${column}';`
      );
      if (cols && cols.length > 0) return; // already exists

      logger.info(`[Migration] Adding ${table}.${column}...`);
      await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition};`);
      logger.info(`[Migration] ${table}.${column} added successfully`);
    } catch (error) {
      logger.warn(`[Migration] ${table}.${column} add failed (non-critical): ${error.message}`);
    }
  };

  // Users table - camelCase columns (no underscored option)
  await addColumnIfMissing('Users', 'forcePasswordChange', 'BOOLEAN DEFAULT false');
  await addColumnIfMissing('Users', 'bannerPhoto', 'VARCHAR(255)');

  // session_types table
  await addColumnIfMissing('session_types', 'creditsRequired', 'INTEGER DEFAULT 1');

  // daily_workout_forms table - uses snake_case field mappings
  await addColumnIfMissing('daily_workout_forms', 'trainer_notes', 'TEXT');
  await addColumnIfMissing('daily_workout_forms', 'client_summary', 'TEXT');
}

/**
 * Run all startup migrations - called during server initialization.
 * Each migration is idempotent and wrapped in its own try/catch.
 */
export async function runStartupMigrations() {
  try {
    logger.info('[Migrations] Running startup migrations...');

    await migrateAdminSettingsCategory();
    await migrateMessagingTables();
    await migrateStabilizationColumns();

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
