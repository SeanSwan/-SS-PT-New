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
      logging: (sql) => {
        // Only log constraint-related operations
        if (sql.includes('CONSTRAINT') || sql.includes('INDEX')) {
          logger.debug(`DB Constraint: ${sql}`);
        }
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

    // Step 3: Sync indexes and constraints (safer approach)
    const constraintResult = await syncIndexesAndConstraints();
    
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
