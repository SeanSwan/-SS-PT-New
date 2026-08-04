/**
 * Production-Safe Database Synchronization
 * ========================================
 * Creates missing tables in proper dependency order
 * CRITICAL FIX: Prevents foreign key creation errors
 * Safe for production environments
 */

import sequelize from '../database.mjs';
import getModels from '../models/associations.mjs';
import logger from './logger.mjs';
import { createTablesInOrder, validateTableOrder } from './tableCreationOrder.mjs';

/**
 * Gate for the MUTATIVE `sequelize.sync({ alter })` boot step.
 *
 * Fail-closed by design: mutative DDL against a live production database must
 * be an explicit, deliberate act, never a side effect of deploying. Additive
 * table/column creation is unaffected and still runs on every boot.
 *
 * Break-glass: STARTUP_SCHEMA_ALTER=true for one deploy, then unset.
 */
export const shouldRunSchemaAlter = ({
  startupSchemaAlter = process.env.STARTUP_SCHEMA_ALTER,
} = {}) => startupSchemaAlter === 'true';

/**
 * Check if a table exists in the database
 */
const tableExists = async (tableName) => {
  try {
    const [results] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}';`
    );
    return results.length > 0;
  } catch (error) {
    // For SQLite, use a different query
    try {
      const [results] = await sequelize.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`
      );
      return results.length > 0;
    } catch (sqliteError) {
      logger.warn(`Could not check table existence for ${tableName}: ${error.message}`);
      return false;
    }
  }
};

/**
 * Create missing tables safely using dependency order
 * CRITICAL FIX: Creates tables in proper order to prevent foreign key errors
 */
const createMissingTables = async () => {
  try {
    logger.info('🔍 ENHANCED: Checking for missing database tables with dependency management...');
    
    // Get all models
    const models = await getModels();
    
    // Validate table creation order first
    const orderValidation = validateTableOrder(models);
    logger.info(`📋 Table validation: ${orderValidation.tableCount} tables found, ${orderValidation.missingFromOrder.length} not in dependency order`);
    
    // Create tables in proper dependency order
    const creationResults = await createTablesInOrder(models);
    
    if (creationResults.errors.length > 0) {
      logger.warn(`⚠️  Some table creation errors occurred:`);
      creationResults.errors.forEach(error => {
        logger.warn(`   - ${error.table}: ${error.error}`);
      });
    }
    
    logger.info('🎉 Missing tables creation completed!');
    
    return {
      success: creationResults.errors.length === 0,
      existingCount: creationResults.skipped.length,
      createdCount: creationResults.created.length,
      missingTables: creationResults.created,
      errors: creationResults.errors
    };
    
  } catch (error) {
    logger.error(`❌ Error during dependency-aware table creation: ${error.message}`);
    return {
      success: false,
      error: error.message,
      existingCount: 0,
      createdCount: 0,
      missingTables: []
    };
  }
};

/**
 * Add missing columns that migrations may not have applied in production.
 * Each entry is checked individually — if the column already exists, it's skipped.
 */
const MISSING_COLUMNS = [
  // gallery_photos.source_type — added in 20260311000000 migration
  {
    table: 'gallery_photos',
    column: 'source_type',
    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "source_type" VARCHAR(20) NOT NULL DEFAULT 'jpeg';`,
  },
  // gallery_photos thumbnail variant columns — added in 20260312000002 migration
  {
    table: 'gallery_photos',
    column: 'medium_key',
    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "medium_key" VARCHAR(500);`,
  },
  {
    table: 'gallery_photos',
    column: 'medium_url',
    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "medium_url" TEXT;`,
  },
  {
    table: 'gallery_photos',
    column: 'thumb_key',
    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "thumb_key" VARCHAR(500);`,
  },
  // gallery_visitors geo columns — added in 20260311000100 migration
  {
    table: 'gallery_visitors',
    column: 'country',
    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "country" VARCHAR(100);`,
  },
  {
    table: 'gallery_visitors',
    column: 'city',
    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "city" VARCHAR(100);`,
  },
  {
    table: 'gallery_visitors',
    column: 'region',
    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "region" VARCHAR(100);`,
  },
  {
    table: 'gallery_visitors',
    column: 'latitude',
    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "latitude" DOUBLE PRECISION;`,
  },
  {
    table: 'gallery_visitors',
    column: 'longitude',
    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "longitude" DOUBLE PRECISION;`,
  },
  // Users privacy + client source columns — added in 20260315 migrations
  {
    table: 'Users',
    column: 'clientSource',
    sql: `ALTER TABLE "Users" ADD COLUMN "clientSource" VARCHAR(50) NOT NULL DEFAULT 'swanstudios';`,
  },
  {
    table: 'Users',
    column: 'profileVisibility',
    sql: `ALTER TABLE "Users" ADD COLUMN "profileVisibility" VARCHAR(255) NOT NULL DEFAULT 'public';`,
  },
  {
    table: 'Users',
    column: 'showBadges',
    sql: `ALTER TABLE "Users" ADD COLUMN "showBadges" BOOLEAN NOT NULL DEFAULT true;`,
  },
  {
    table: 'Users',
    column: 'showAchievements',
    sql: `ALTER TABLE "Users" ADD COLUMN "showAchievements" BOOLEAN NOT NULL DEFAULT true;`,
  },
  {
    table: 'Users',
    column: 'showStats',
    sql: `ALTER TABLE "Users" ADD COLUMN "showStats" BOOLEAN NOT NULL DEFAULT true;`,
  },
  {
    table: 'Users',
    column: 'showWorkoutHistory',
    sql: `ALTER TABLE "Users" ADD COLUMN "showWorkoutHistory" BOOLEAN NOT NULL DEFAULT false;`,
  },
  {
    table: 'Users',
    column: 'showLevel',
    sql: `ALTER TABLE "Users" ADD COLUMN "showLevel" BOOLEAN NOT NULL DEFAULT true;`,
  },
  // Subscription tracking columns — added in 20260322 migration
  {
    table: 'Users',
    column: 'subscriptionTier',
    sql: `ALTER TABLE "Users" ADD COLUMN "subscriptionTier" VARCHAR(20) DEFAULT 'free';`,
  },
  {
    table: 'Users',
    column: 'aiMessagesUsedThisMonth',
    sql: `ALTER TABLE "Users" ADD COLUMN "aiMessagesUsedThisMonth" INTEGER DEFAULT 0;`,
  },
  {
    table: 'Users',
    column: 'aiGenerationsUsedThisMonth',
    sql: `ALTER TABLE "Users" ADD COLUMN "aiGenerationsUsedThisMonth" INTEGER DEFAULT 0;`,
  },
  {
    table: 'Users',
    column: 'aiUsageResetDate',
    sql: `ALTER TABLE "Users" ADD COLUMN "aiUsageResetDate" TIMESTAMP WITH TIME ZONE;`,
  },
  // Achievements enhancement columns — added in 20260315 migrations
  {
    table: 'Achievements',
    column: 'targetRoles',
    sql: `ALTER TABLE "Achievements" ADD COLUMN "targetRoles" JSONB NOT NULL DEFAULT '["user"]';`,
  },
  {
    table: 'Achievements',
    column: 'rewardType',
    sql: `ALTER TABLE "Achievements" ADD COLUMN "rewardType" VARCHAR(255) NOT NULL DEFAULT 'badge';`,
  },
  {
    table: 'Achievements',
    column: 'issuance',
    sql: `ALTER TABLE "Achievements" ADD COLUMN "issuance" VARCHAR(255) NOT NULL DEFAULT 'auto';`,
  },
  {
    table: 'Achievements',
    column: 'rewards',
    sql: `ALTER TABLE "Achievements" ADD COLUMN "rewards" JSONB NOT NULL DEFAULT '[]';`,
  },
];

const addMissingColumns = async () => {
  const added = [];
  const skipped = [];
  const errors = [];

  for (const { table, column, sql } of MISSING_COLUMNS) {
    try {
      // Check whether the table exists first
      const [tableRows] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';`
      );
      if (tableRows.length === 0) {
        skipped.push(`${table}.${column} (table does not exist yet)`);
        continue;
      }

      // Check whether the column already exists
      const [colRows] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}';`
      );
      if (colRows.length > 0) {
        skipped.push(`${table}.${column}`);
        continue;
      }

      // Column is missing — add it
      await sequelize.query(sql);
      added.push(`${table}.${column}`);
      logger.info(`  ✅ Added missing column: ${table}.${column}`);
    } catch (err) {
      // "already exists" is fine — treat as skipped
      if (err.message && err.message.includes('already exists')) {
        skipped.push(`${table}.${column}`);
      } else {
        errors.push({ table, column, error: err.message });
        logger.warn(`  ⚠️  Failed to add column ${table}.${column}: ${err.message}`);
      }
    }
  }

  logger.info(`🔧 Missing-column check: ${added.length} added, ${skipped.length} already present, ${errors.length} errors`);
  return { added, skipped, errors };
};

/**
 * Sync indexes and foreign keys safely
 * ENHANCED: Better error handling for constraint creation with detailed categorization
 */
const syncIndexesAndConstraints = async () => {
  try {
    logger.info('🔗 ENHANCED: Syncing database indexes and constraints with enhanced error handling...');
    
    // Use safer sync options that won't drop existing constraints
    await sequelize.sync({ 
      alter: { 
        drop: false  // Never drop existing constraints
      },
      hooks: false,  // Skip hooks for performance
      // Launch audit 2026-08-04: the previous filter logged only statements
      // containing CONSTRAINT/INDEX — at debug level — which made the
      // genuinely dangerous statements (ALTER COLUMN ... TYPE, SET NOT NULL)
      // invisible in production logs exactly when they matter. Every DDL
      // statement this step emits is now recorded at info, because if this
      // step ever runs it is a break-glass event that must be auditable.
      logging: (sql) => {
        logger.info(`[schema-alter DDL] ${sql}`);
      }
    });
    
    logger.info('✅ Database indexes and constraints synced successfully');
    return { success: true };
  } catch (error) {
    // Enhanced error categorization with better diagnostics
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('does not exist')) {
      const tableName = error.message.match(/relation "([^"]+)" does not exist/)?.[1] || 'unknown';
      logger.warn(`⚠️  Constraint sync skipped - missing parent table: ${tableName}`);
      logger.info(`🔄 This will be resolved when parent table '${tableName}' is created in dependency order`);
      return { success: false, error: error.message, type: 'missing_parent_table', missingTable: tableName };
    } else if (errorMessage.includes('already exists')) {
      logger.info('ℹ️  Constraints already exist - skipping duplicate creation');
      return { success: true, warning: 'constraints_already_exist' };
    } else if (errorMessage.includes('foreign key')) {
      logger.warn(`🔑 Foreign key constraint error: ${error.message}`);
      return { success: false, error: error.message, type: 'foreign_key_error' };
    } else if (errorMessage.includes('constraint')) {
      logger.warn(`🔗 General constraint error: ${error.message}`);
      return { success: false, error: error.message, type: 'constraint_error' };
    } else {
      logger.warn(`⚠️  Index/constraint sync had issues: ${error.message}`);
      return { success: false, error: error.message, type: 'sync_error' };
    }
  }
};

/**
 * Main production-safe database sync function
 */
export const syncDatabaseSafely = async () => {
  try {
    logger.info('🚀 Starting production-safe database synchronization...');
    
    // Step 1: Create missing tables
    const tableResult = await createMissingTables();

    // Step 2: Add missing columns that migrations may not have applied
    const columnResult = await addMissingColumns();

    // Step 3: Sync indexes and constraints — MUTATIVE DDL, OFF BY DEFAULT.
    //
    // Launch audit 2026-08-04 (Kimi K3 hostile review, verified in-repo):
    // this step runs `sequelize.sync({ alter })`, which does NOT merely add
    // indexes — it emits `ALTER COLUMN ... TYPE` / `SET NOT NULL` /
    // `ADD CONSTRAINT` against the LIVE production database, driven by model
    // definitions. This repo has a documented history of models disagreeing
    // with the live schema (Achievement.id, ProgressData.userId and
    // UserFollow were all corrected UUID->INTEGER in the 2026-08-03 batch
    // *because the models were wrong*), so healing "toward the models" can
    // heal toward the wrong target. Realistic failure modes: an uncastable
    // type change aborts boot (restart loop); a castable one rewrites the
    // table under ACCESS EXCLUSIVE (lock brownout); a lossy-but-legal one
    // silently coerces live data with no error at all.
    //
    // Steps 1 and 2 above are ADDITIVE and stay on — they are what creates
    // the intentionally boot-created tables.
    //
    // Break-glass: set STARTUP_SCHEMA_ALTER=true for a single deploy, then
    // unset it. To *detect* drift without mutating anything, run the
    // read-only auditor instead: `node backend/scripts/audit-schema-drift.mjs`.
    const constraintResult = shouldRunSchemaAlter()
      ? await syncIndexesAndConstraints()
      : (logger.info(
          '⏭️  Schema ALTER sync skipped (mutative DDL disabled by default). '
          + 'Set STARTUP_SCHEMA_ALTER=true to force it for one deploy; '
          + 'use scripts/audit-schema-drift.mjs to detect drift read-only.',
        ), { success: true, skipped: true });
    
    // Enhanced Summary with detailed error categorization
    const summary = {
      success: tableResult.success && constraintResult.success && columnResult.errors.length === 0,
      tablesCreated: tableResult.createdCount || 0,
      tablesExisting: tableResult.existingCount || 0,
      columnsAdded: columnResult.added.length,
      missingTables: tableResult.missingTables || [],
      errors: [],
      warnings: [],
      errorBreakdown: {
        foreignKeyErrors: 0,
        missingParentTables: 0,
        constraintErrors: 0,
        creationErrors: 0,
        columnErrors: columnResult.errors.length
      }
    };

    // Add column errors/warnings to summary
    if (columnResult.errors.length > 0) {
      columnResult.errors.forEach(e => {
        summary.errors.push(`Column add error ${e.table}.${e.column}: ${e.error}`);
      });
    }
    
    // Categorize table creation errors
    if (tableResult.errors && tableResult.errors.length > 0) {
      tableResult.errors.forEach(error => {
        if (error.type === 'missing_parent_table') {
          summary.errorBreakdown.missingParentTables++;
          summary.warnings.push(`Missing parent table: ${error.table} - ${error.error}`);
        } else if (error.error.includes('foreign key')) {
          summary.errorBreakdown.foreignKeyErrors++;
          summary.errors.push(`Foreign key error in ${error.table}: ${error.error}`);
        } else {
          summary.errorBreakdown.creationErrors++;
          summary.errors.push(`Table creation error in ${error.table}: ${error.error}`);
        }
      });
    }
    
    if (!tableResult.success && tableResult.error) {
      summary.errors.push(`Table creation: ${tableResult.error}`);
    }
    
    if (!constraintResult.success) {
      summary.errorBreakdown.constraintErrors++;
      if (constraintResult.type === 'missing_parent_table') {
        summary.warnings.push(`Constraint sync: ${constraintResult.error}`);
      } else {
        summary.errors.push(`Constraint sync: ${constraintResult.error}`);
      }
    }
    
    // Enhanced reporting
    if (summary.success) {
      logger.info('🎉 ENHANCED: Production-safe database sync completed successfully!');
      logger.info(`📊 Summary: ${summary.tablesCreated} tables created, ${summary.tablesExisting} existing, ${summary.columnsAdded} columns added`);
      
      if (summary.warnings.length > 0) {
        logger.info('ℹ️  Non-critical warnings:');
        summary.warnings.forEach(warning => logger.info(`   ⚠️  ${warning}`));
      }
    } else {
      logger.warn('⚠️  ENHANCED: Database sync completed with some issues');
      
      // Report error breakdown
      const breakdown = summary.errorBreakdown;
      if (breakdown.missingParentTables > 0) {
        logger.warn(`🔗 Missing parent tables: ${breakdown.missingParentTables} (will resolve on next deployment)`);
      }
      if (breakdown.foreignKeyErrors > 0) {
        logger.warn(`🔑 Foreign key errors: ${breakdown.foreignKeyErrors}`);
      }
      if (breakdown.constraintErrors > 0) {
        logger.warn(`🔗 Constraint errors: ${breakdown.constraintErrors}`);
      }
      if (breakdown.creationErrors > 0) {
        logger.warn(`🛠️  Creation errors: ${breakdown.creationErrors}`);
      }
      
      if (summary.errors.length > 0) {
        logger.warn('🔍 Critical issues encountered:');
        summary.errors.forEach(error => logger.warn(`   ❌ ${error}`));
      }
      
      if (summary.warnings.length > 0) {
        logger.warn('🔍 Non-critical warnings:');
        summary.warnings.forEach(warning => logger.warn(`   ⚠️  ${warning}`));
      }
    }
    
    // Add diagnostic information for troubleshooting
    if (summary.errorBreakdown.missingParentTables > 0) {
      logger.info('📝 TROUBLESHOOTING: Missing parent table errors are usually resolved on the next deployment');
      logger.info('   These occur when child tables try to create foreign keys to tables that haven\'t been created yet');
      logger.info('   The dependency-aware table creation will create parent tables first on subsequent runs');
    }
    
    return summary;
    
  } catch (error) {
    logger.error(`❌ Production database sync failed: ${error.message}`);
    throw error;
  }
};

export default syncDatabaseSafely;
