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
 * Migration 4: Add password reset columns to Users table
 * - resetPasswordToken (VARCHAR) - HMAC-SHA256 hashed token for lookup
 * - resetPasswordExpires (TIMESTAMPTZ) - token expiry time
 * - Partial index on resetPasswordToken for O(1) lookups
 */
async function migrateResetPasswordColumns() {
  const addColumnIfMissing = async (table, column, definition) => {
    try {
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = '${table}' AND column_name = '${column}';`
      );
      if (cols && cols.length > 0) return;

      logger.info(`[Migration] Adding ${table}.${column}...`);
      await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition};`);
      logger.info(`[Migration] ${table}.${column} added successfully`);
    } catch (error) {
      logger.warn(`[Migration] ${table}.${column} add failed (non-critical): ${error.message}`);
    }
  };

  await addColumnIfMissing('Users', 'resetPasswordToken', 'VARCHAR(255)');
  await addColumnIfMissing('Users', 'resetPasswordExpires', 'TIMESTAMPTZ');

  // Partial index for O(1) token lookups
  try {
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_users_reset_password_token
       ON "Users" ("resetPasswordToken")
       WHERE "resetPasswordToken" IS NOT NULL;`
    );
  } catch (error) {
    logger.warn(`[Migration] reset password index creation failed (non-critical): ${error.message}`);
  }
}

/**
 * Migration 5: Ensure shopping_carts has columns expected by ShoppingCart model.
 * Handles environments where a subset of cart migrations were applied.
 */
async function migrateShoppingCartColumns() {
  const addColumnIfMissing = async (column, definition) => {
    try {
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'shopping_carts' AND column_name = '${column}';`
      );
      if (cols && cols.length > 0) return;

      logger.info(`[Migration] Adding shopping_carts.${column}...`);
      await sequelize.query(`ALTER TABLE shopping_carts ADD COLUMN "${column}" ${definition};`);
      logger.info(`[Migration] shopping_carts.${column} added successfully`);
    } catch (error) {
      logger.warn(`[Migration] shopping_carts.${column} add failed (non-critical): ${error.message}`);
    }
  };

  try {
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'shopping_carts';`
    );
    if (!tables || tables.length === 0) {
      logger.info('[Migration] shopping_carts table does not exist yet, skipping');
      return;
    }

    await addColumnIfMissing('paymentIntentId', 'VARCHAR(255)');
    await addColumnIfMissing('total', 'DECIMAL(10,2) DEFAULT 0.00');
    await addColumnIfMissing('checkoutSessionId', 'VARCHAR(255)');
    await addColumnIfMissing('paymentStatus', 'VARCHAR(255)');
    await addColumnIfMissing('completedAt', 'TIMESTAMPTZ');
    await addColumnIfMissing('lastActivityAt', 'TIMESTAMPTZ');
    await addColumnIfMissing('checkoutSessionExpired', 'BOOLEAN DEFAULT false NOT NULL');
    await addColumnIfMissing('sessionsGranted', 'BOOLEAN DEFAULT false NOT NULL');
    await addColumnIfMissing('stripeSessionData', 'TEXT');
    await addColumnIfMissing('customerInfo', 'TEXT');
    await addColumnIfMissing('subtotal', 'DECIMAL(10,2)');
    await addColumnIfMissing('tax', 'DECIMAL(10,2)');
    await addColumnIfMissing('lastCheckoutAttempt', 'TIMESTAMPTZ');

    // Ensure enum supports newer payment states when enum type exists.
    try {
      const [enumRows] = await sequelize.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_shopping_carts_status';
      `);
      if (enumRows && enumRows.length > 0) {
        await sequelize.query(`ALTER TYPE enum_shopping_carts_status ADD VALUE IF NOT EXISTS 'pending_payment';`);
        await sequelize.query(`ALTER TYPE enum_shopping_carts_status ADD VALUE IF NOT EXISTS 'cancelled';`);
      }
    } catch (enumError) {
      logger.warn(`[Migration] shopping_carts status enum update skipped: ${enumError.message}`);
    }

    // Ensure shopping_carts.userId FK references canonical "Users"(id).
    // Some legacy environments point to lowercase users(id), which breaks
    // cart creation for accounts created in "Users".
    try {
      const [fkRows] = await sequelize.query(`
        SELECT
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'shopping_carts'
          AND kcu.column_name = 'userId';
      `);

      const hasUsersTarget = (fkRows || []).some((row) => row.foreign_table_name === 'Users');
      if (!hasUsersTarget) {
        logger.info('[Migration] Repairing shopping_carts.userId FK to reference "Users"(id)...');
        await sequelize.query(`ALTER TABLE shopping_carts DROP CONSTRAINT IF EXISTS "shopping_carts_userId_fkey";`);
        await sequelize.query(`
          ALTER TABLE shopping_carts
          ADD CONSTRAINT "shopping_carts_userId_fkey"
          FOREIGN KEY ("userId")
          REFERENCES "Users"(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
          NOT VALID;
        `);
        logger.info('[Migration] shopping_carts.userId FK now references "Users"(id)');
      }
    } catch (fkError) {
      logger.warn(`[Migration] shopping_carts FK alignment skipped: ${fkError.message}`);
    }
  } catch (error) {
    logger.warn(`[Migration] shopping_carts schema fix failed (non-critical): ${error.message}`);
  }
}

/**
 * Migration 6: Fix FK constraints on Phase 1B tables that reference
 * lowercase "users" instead of the actual "Users" table.
 * Same pattern as shopping_carts FK fix in Migration 5.
 */
async function migratePhase1bForeignKeys() {
  const fixTableColumnFk = async (tableName, columnName, onDeleteAction) => {
    try {
      const [tableCheck] = await sequelize.query(
        `SELECT tablename FROM pg_tables WHERE tablename = '${tableName}';`
      );
      if (!tableCheck || tableCheck.length === 0) {
        logger.info(`[Migration] ${tableName} table does not exist yet, skipping FK fix`);
        return;
      }

      const [fkRows] = await sequelize.query(`
        SELECT
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = '${tableName}'
          AND kcu.column_name = '${columnName}';
      `);

      const hasUsersTarget = (fkRows || []).some((row) => row.foreign_table_name === 'Users');
      if (hasUsersTarget) {
        logger.info(`[Migration] ${tableName}.${columnName} FK already references "Users" — OK`);
        return;
      }

      logger.info(`[Migration] Repairing ${tableName}.${columnName} FK to reference "Users"(id)...`);

      // Drop all existing FK constraints on this column
      for (const fk of (fkRows || [])) {
        await sequelize.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}";`);
        logger.info(`[Migration]   Dropped ${fk.constraint_name} -> "${fk.foreign_table_name}"`);
      }

      // Re-create with correct reference
      const constraintName = `${tableName}_${columnName}_Users_fk`;
      await sequelize.query(`
        ALTER TABLE "${tableName}"
        ADD CONSTRAINT "${constraintName}"
        FOREIGN KEY ("${columnName}")
        REFERENCES "Users"(id)
        ON UPDATE CASCADE
        ON DELETE ${onDeleteAction}
        NOT VALID;
      `);
      logger.info(`[Migration]   Created ${constraintName} -> "Users"(id)`);
    } catch (error) {
      logger.warn(`[Migration] ${tableName}.${columnName} FK fix failed (non-critical): ${error.message}`);
    }
  };

  // client_onboarding_questionnaires
  await fixTableColumnFk('client_onboarding_questionnaires', 'userId', 'CASCADE');
  await fixTableColumnFk('client_onboarding_questionnaires', 'createdBy', 'SET NULL');

  // workout_sessions
  await fixTableColumnFk('workout_sessions', 'userId', 'CASCADE');
  await fixTableColumnFk('workout_sessions', 'trainerId', 'CASCADE');
}

/**
 * Migration 7: Add deleted_at column to conversation_participants
 * Enables per-user conversation soft delete (hide from one participant).
 */
async function migrateConversationParticipantsDeletedAt() {
  try {
    const [tables] = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE tablename = 'conversation_participants';`
    );
    if (!tables || tables.length === 0) {
      logger.info('[Migration] conversation_participants table does not exist yet, skipping');
      return;
    }

    const [cols] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'conversation_participants' AND column_name = 'deleted_at';`
    );
    if (cols && cols.length > 0) {
      logger.info('[Migration] conversation_participants.deleted_at already exists - no change needed');
      return;
    }

    logger.info('[Migration] Adding deleted_at to conversation_participants...');
    await sequelize.query(
      `ALTER TABLE conversation_participants ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;`
    );
    logger.info('[Migration] conversation_participants.deleted_at added successfully');
  } catch (error) {
    logger.warn(`[Migration] conversation_participants.deleted_at failed (non-critical): ${error.message}`);
  }
}

/**
 * Migration 8: Fix Sean Swan's lastName (id=2) if empty
 * The admin account has lastName="" which displays as "Sean " in messages.
 */
async function migrateSeanSwanLastName() {
  try {
    const [result] = await sequelize.query(
      `UPDATE "Users" SET "lastName" = 'Swan'
       WHERE id = 2 AND ("lastName" IS NULL OR TRIM("lastName") = '')
       RETURNING id, "firstName", "lastName";`,
      { type: QueryTypes.SELECT }
    );
    if (result) {
      logger.info(`[Migration] Fixed Sean Swan lastName: "${result.firstName} ${result.lastName}"`);
    } else {
      logger.info('[Migration] Sean Swan lastName already set - no change needed');
    }
  } catch (error) {
    logger.warn(`[Migration] Sean Swan lastName fix failed (non-critical): ${error.message}`);
  }
}

/**
 * Migration 9: Soft-delete unwanted test/duplicate accounts
 * Sets deletedAt on users that should be removed for a cleaner slate.
 * IDs: 3, 4, 33, 34, 55, 56
 * Keeps: 2 (Sean Swan), 5 (Jasmine Swan), 35 (Vickie Valdez), 57 (QABot Tester)
 */
async function migrateCleanupTestUsers() {
  try {
    const idsToDelete = [3, 4, 33, 34, 55, 56];
    const [already] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM "Users"
       WHERE id IN (${idsToDelete.join(',')}) AND "deletedAt" IS NULL;`,
      { type: QueryTypes.SELECT }
    );

    const count = parseInt(already?.cnt || '0');
    if (count === 0) {
      logger.info('[Migration] Test user cleanup already done - no active users to delete');
      return;
    }

    await sequelize.query(
      `UPDATE "Users" SET "deletedAt" = NOW()
       WHERE id IN (${idsToDelete.join(',')}) AND "deletedAt" IS NULL;`
    );
    logger.info(`[Migration] Soft-deleted ${count} test/duplicate users (IDs: ${idsToDelete.join(', ')})`);
  } catch (error) {
    logger.warn(`[Migration] Test user cleanup failed (non-critical): ${error.message}`);
  }
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
    await migrateResetPasswordColumns();
    await migrateShoppingCartColumns();
    await migratePhase1bForeignKeys();
    await migrateConversationParticipantsDeletedAt();
    await migrateSeanSwanLastName();
    await migrateCleanupTestUsers();

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
