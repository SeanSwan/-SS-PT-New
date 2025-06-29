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
 * ENHANCED: Better error handling for constraint creation
 */
const syncIndexesAndConstraints = async () => {
  try {
    logger.info('🔗 ENHANCED: Syncing database indexes and constraints...');
    
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
    // Be more specific about constraint errors
    if (error.message.includes('does not exist')) {
      logger.warn(`⚠️  Constraint sync skipped - missing parent table: ${error.message}`);
      return { success: false, error: error.message, type: 'missing_parent_table' };
    } else if (error.message.includes('already exists')) {
      logger.info('ℹ️  Constraints already exist - skipping duplicate creation');
      return { success: true, warning: 'constraints_already_exist' };
    } else {
      logger.warn(`⚠️  Index/constraint sync had issues: ${error.message}`);
      return { success: false, error: error.message, type: 'constraint_error' };
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
    
    // Summary
    const summary = {
      success: tableResult.success && constraintResult.success,
      tablesCreated: tableResult.createdCount || 0,
      tablesExisting: tableResult.existingCount || 0,
      missingTables: tableResult.missingTables || [],
      errors: []
    };
    
    if (!tableResult.success) {
      summary.errors.push(`Table creation: ${tableResult.error}`);
    }
    
    if (!constraintResult.success) {
      summary.errors.push(`Constraint sync: ${constraintResult.error}`);
    }
    
    if (summary.success) {
      logger.info('🎉 ENHANCED: Production-safe database sync completed successfully!');
      logger.info(`📊 Summary: ${summary.tablesCreated} tables created, ${summary.tablesExisting} existing`);
    } else {
      logger.warn('⚠️  ENHANCED: Database sync completed with some issues');
      if (summary.errors.length > 0) {
        logger.warn('🔍 Issues encountered:');
        summary.errors.forEach(error => logger.warn(`   - ${error}`));
      }
    }
    
    return summary;
    
  } catch (error) {
    logger.error(`❌ Production database sync failed: ${error.message}`);
    throw error;
  }
};

export default syncDatabaseSafely;
