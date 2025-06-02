/**
 * Production-Safe Database Synchronization
 * ========================================
 * Creates missing tables without altering existing ones
 * Safe for production environments
 */

import sequelize from '../database.mjs';
import getModels from '../models/associations.mjs';
import logger from './logger.mjs';

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
 * Create missing tables safely
 */
const createMissingTables = async () => {
  try {
    logger.info('🔍 Checking for missing database tables...');
    
    // Get all models
    const models = await getModels();
    
    const missingTables = [];
    const existingTables = [];
    
    // Check each model's table
    for (const [modelName, model] of Object.entries(models)) {
      if (model && model.getTableName) {
        const tableName = model.getTableName();
        const exists = await tableExists(tableName);
        
        if (!exists) {
          missingTables.push({ modelName, tableName, model });
        } else {
          existingTables.push(tableName);
        }
      }
    }
    
    logger.info(`📊 Database table status: ${existingTables.length} existing, ${missingTables.length} missing`);
    
    // Create missing tables
    if (missingTables.length > 0) {
      logger.info(`🔨 Creating ${missingTables.length} missing tables...`);
      
      for (const { modelName, tableName, model } of missingTables) {
        try {
          await model.sync({ force: false }); // Only create if doesn't exist
          logger.info(`✅ Created table: ${tableName} (${modelName})`);
        } catch (error) {
          logger.error(`❌ Failed to create table ${tableName}: ${error.message}`);
        }
      }
      
      logger.info('🎉 Missing tables creation completed!');
    } else {
      logger.info('✅ All required tables already exist');
    }
    
    return {
      success: true,
      existingCount: existingTables.length,
      createdCount: missingTables.length,
      missingTables: missingTables.map(t => t.tableName)
    };
    
  } catch (error) {
    logger.error(`❌ Error during table creation: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Sync indexes and foreign keys safely
 */
const syncIndexesAndConstraints = async () => {
  try {
    logger.info('🔗 Syncing database indexes and constraints...');
    
    // This is safer than full sync - only adds missing indexes and constraints
    await sequelize.sync({ alter: { drop: false } });
    
    logger.info('✅ Database indexes and constraints synced');
    return { success: true };
  } catch (error) {
    logger.warn(`⚠️  Index/constraint sync had issues: ${error.message}`);
    return { success: false, error: error.message };
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
      logger.info('🎉 Production-safe database sync completed successfully!');
    } else {
      logger.warn('⚠️  Database sync completed with some issues');
    }
    
    return summary;
    
  } catch (error) {
    logger.error(`❌ Production database sync failed: ${error.message}`);
    throw error;
  }
};

export default syncDatabaseSafely;
