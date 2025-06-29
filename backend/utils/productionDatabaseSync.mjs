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
    
    // Step 2: Sync indexes and constraints (safer approach)
    const constraintResult = await syncIndexesAndConstraints();
    
    // Enhanced Summary with detailed error categorization
    const summary = {
      success: tableResult.success && constraintResult.success,
      tablesCreated: tableResult.createdCount || 0,
      tablesExisting: tableResult.existingCount || 0,
      missingTables: tableResult.missingTables || [],
      errors: [],
      warnings: [],
      errorBreakdown: {
        foreignKeyErrors: 0,
        missingParentTables: 0,
        constraintErrors: 0,
        creationErrors: 0
      }
    };
    
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
      logger.info(`📊 Summary: ${summary.tablesCreated} tables created, ${summary.tablesExisting} existing`);
      
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
