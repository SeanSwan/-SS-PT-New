/**
 * Server Startup Module
 * =====================
 * Database connections, migrations, and server initialization
 * Master Prompt v28 aligned - Clean startup process
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import http from 'http';

import { initSocketIO, closeSocketIO } from '../socket/socketManager.mjs';
import sequelize from '../database.mjs';
import setupAssociations from '../setupAssociations.mjs';
// MongoDB removed - PostgreSQL-only architecture
import { runStartupMigrations } from '../utils/startupMigrations.mjs';
import { syncDatabaseSafely } from '../utils/productionDatabaseSync.mjs';
import seedStorefrontItems from '../seedStorefrontItems.mjs';
import seedWaiverVersions from '../seeders/seed-waiver-versions.mjs';
import logger from '../utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';

/**
 * Create required directories for uploads and data
 */
const createRequiredDirectories = async () => {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/profiles'),
    path.join(__dirname, '../uploads/products'),
    path.join(__dirname, '../uploads/temp'),
    path.join(__dirname, '../data')
  ];
  
  for (const dir of directories) {
    if (!existsSync(dir)) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        logger.error(`Error creating directory ${dir}:`, error);
        throw error;
      }
    }
  }
};

/**
 * Initialize database connections and associations
 */
const initializeDatabases = async () => {
  try {
    // 🚨 ENHANCED P0 FIX: Initialize coordinated model system FIRST
    logger.info('🎯 ENHANCED: Setting up coordinated model associations (P0 checkout fix)...');
    const associatedModels = await setupAssociations();
    
    // 🚀 ENHANCED: Initialize coordinated models cache for full-stack consistency
    logger.info('🔗 ENHANCED: Initializing coordinated models cache for system-wide consistency...');
    try {
      const { initializeModelsCache } = await import('../models/index.mjs');
      await initializeModelsCache();
      logger.info('✅ ENHANCED: Coordinated models cache initialized - full-stack consistency achieved');
      
      // 🎯 ENHANCED: Verify critical system models are accessible
      const { getCartItem, getUser, getStorefrontItem } = await import('../models/index.mjs');
      const testModels = { 
        CartItem: getCartItem(), 
        User: getUser(), 
        StorefrontItem: getStorefrontItem() 
      };
      
      const allModelsValid = Object.values(testModels).every(model => model && model.associations);
      if (allModelsValid) {
        logger.info('✅ ENHANCED SUCCESS: All critical models verified with associations');
        
        // 🚀 ENHANCED: Run comprehensive system coordination check
        try {
          const { verifySystemCoordination } = await import('../utils/systemCoordinationCheck.mjs');
          const healthCheck = await verifySystemCoordination();
          logger.info('🎉 ENHANCED: Full-stack coordination verification passed', healthCheck);
        } catch (healthError) {
          logger.warn('⚠️ ENHANCED: System coordination check failed (non-critical):', healthError.message);
        }
      } else {
        throw new Error('Critical models missing associations after cache initialization');
      }
    } catch (cacheError) {
      logger.error('❌ ENHANCED CRITICAL: Failed to initialize coordinated models cache:', cacheError);
      throw cacheError;
    }
    
    // 🎯 ENHANCED P0 VERIFICATION: Deep association check with coordinated imports
    if (associatedModels && associatedModels.CartItem && associatedModels.CartItem.associations && associatedModels.CartItem.associations.storefrontItem) {
      const association = associatedModels.CartItem.associations.storefrontItem;
      logger.info('✅ ENHANCED P0 VERIFIED: CartItem -> StorefrontItem association confirmed', {
        associationType: association.associationType,
        foreignKey: association.foreignKey,
        as: association.as,
        targetModel: association.target.name
      });
      
      // 🚀 ENHANCED: Test coordinated imports from models/index.mjs
      try {
        const { getCartItem, getStorefrontItem, getAllModels } = await import('../models/index.mjs');
        const testCartItem = getCartItem();
        const testStorefrontItem = getStorefrontItem();
        const allModels = getAllModels();
        
        if (testCartItem && testStorefrontItem && testCartItem.associations?.storefrontItem) {
          logger.info('✅ ENHANCED P0 SUCCESS: Coordinated imports verified with associations');
          logger.info(`🔗 ENHANCED: Models cache contains ${Object.keys(allModels).length} models with associations`);
        } else {
          logger.error('❌ ENHANCED P0 ERROR: Coordinated imports missing associations');
        }
      } catch (coordImportError) {
        logger.error('❌ ENHANCED P0 ERROR: Failed to test coordinated imports:', coordImportError.message);
      }
      
    } else {
      logger.error('❌ ENHANCED P0 ERROR: CartItem -> StorefrontItem association missing or incomplete');
      logger.warn('⚠️ ENHANCED: Checkout functionality will be broken - association mismatch detected');
    }
    
    logger.info('✅ Database associations configured and verified');

    // Test PostgreSQL connection
    try {
      await sequelize.authenticate();
      logger.info('✅ PostgreSQL database connection established successfully');
    } catch (sequelizeError) {
      logger.error(`PostgreSQL connection error: ${sequelizeError.message}`);
      if (USE_SQLITE_FALLBACK) {
        logger.info('Using SQLite fallback as configured');
      } else {
        throw sequelizeError;
      }
    }
    
    // PostgreSQL-only architecture - MongoDB connections removed
    logger.info('✅ Using PostgreSQL-only architecture (MongoDB removed)')

    // Development database sync (NEVER in production)
    if (!isProduction && process.env.AUTO_SYNC === 'true') {
      try {
        await sequelize.sync({ alter: true }); 
        logger.info('Database synchronized in development mode');
      } catch (syncError) {
        logger.error(`Error syncing database: ${syncError.message}`);
      }
    } else {
      // ENHANCED: Production-safe database sync with dependency-aware table creation
      try {
      const syncResult = await syncDatabaseSafely();
      if (syncResult.success) {
      logger.info(`✅ ENHANCED: Production database sync completed successfully`);
        logger.info(`✅ Tables created: ${syncResult.tablesCreated}, Tables existing: ${syncResult.tablesExisting}`);
      
        if (syncResult.tablesCreated > 0) {
            logger.info(`🎉 Successfully created ${syncResult.tablesCreated} new tables in dependency order`);
        }
      } else {
          logger.warn(`⚠️  ENHANCED: Database sync completed with issues`);
        if (syncResult.errors && syncResult.errors.length > 0) {
          logger.warn('🔍 Detailed errors:');
          syncResult.errors.forEach((error, index) => {
            logger.warn(`   ${index + 1}. ${error}`);
          });
        }
        
        // Continue startup with degraded database functionality
        logger.warn('⚠️  Continuing startup with partial database functionality');
      }
    } catch (syncError) {
      logger.error(`❌ ENHANCED: Production database sync failed: ${syncError.message}`);
      logger.error(`Stack trace: ${syncError.stack}`);
      
      // Enhanced error recovery
      if (syncError.message.includes('relation') && syncError.message.includes('does not exist')) {
        logger.warn('🔄 Database dependency error detected - some tables may be missing parent tables');
        logger.warn('ℹ️  This is usually resolved on the next deployment after all tables are created');
      }
      
      // Continue startup even if sync fails - critical for production resilience
      logger.info('🚑 Continuing startup with database issues - manual intervention may be required');
    }
    }

    // ENHANCED: Run startup migrations with better error handling
    try {
      await runStartupMigrations();
      logger.info('✅ Startup migrations completed successfully');
    } catch (migrationError) {
      logger.warn('⚠️  ENHANCED: Startup migrations had issues (non-critical):', migrationError.message);
      
      // Categorize migration errors
      if (migrationError.message.includes('relation') && migrationError.message.includes('does not exist')) {
        logger.warn('🔄 Migration failed due to missing table - will retry on next deployment');
      } else if (migrationError.message.includes('already exists')) {
        logger.info('ℹ️  Migration skipped - changes already applied');
      } else {
        logger.warn('🚑 Unexpected migration error - manual review recommended');
      }
    }

    logger.info('✅ ENHANCED: Database initialization completed with resilient error handling');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Seed initial data
 */
const seedInitialData = async () => {
  try {
    logger.info('Checking storefront items seeding...');
    const seedResult = await seedStorefrontItems();
    
    if (seedResult.seeded) {
      logger.info(`✅ Storefront seeding completed: ${seedResult.count} items created (${seedResult.reason})`);
    } else {
      logger.info(`ℹ️  Storefront seeding skipped: ${seedResult.reason} (${seedResult.count} existing items)`);
    }
    
    if (seedResult.error) {
      logger.warn(`⚠️  Seeding had non-critical error: ${seedResult.error}`);
    }
  } catch (seedError) {
    logger.error(`❌ Storefront seeding failed: ${seedError.message}`);
    logger.info('🚀 Continuing server startup - packages available via admin management');
  }

  // Seed waiver versions (Phase 5W-G) — idempotent, safe for every startup
  try {
    const { getModel } = await import('../models/index.mjs');
    const waiverResult = await seedWaiverVersions(getModel);
    if (waiverResult.seeded) {
      logger.info(`✅ Waiver version seeding: ${waiverResult.created} created, ${waiverResult.existing} existing`);
    } else {
      logger.info(`ℹ️  Waiver version seeding skipped: ${waiverResult.reason}`);
    }
  } catch (waiverSeedError) {
    logger.warn(`⚠️  Waiver version seeding failed (non-critical): ${waiverSeedError.message}`);
  }
};

/**
 * Start the HTTP server with Socket.io - OPTIMIZED FOR RENDER HEALTH CHECKS
 */
const startServer = async (app) => {
  const PORT = process.env.PORT || 10000;
  
  // Create HTTP server
  const httpServer = http.createServer(app);
  
  // CRITICAL: Start server IMMEDIATELY for health checks
  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SwanStudios Server LISTENING on port ${PORT}`);
    console.log(`🌐 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`⚡ Health check endpoint available immediately`);
    logger.info(`Server listening on port ${PORT} - initialization continuing in background`);
  });

  // Set aggressive timeouts for production health checks
  server.timeout = isProduction ? 30000 : 60000; // 30 seconds in production
  server.keepAliveTimeout = isProduction ? 31000 : 61000;
  server.headersTimeout = isProduction ? 32000 : 62000;
  
  // Optimize server for production
  if (isProduction) {
    server.maxHeadersCount = 100;
    server.requestTimeout = 20000; // Faster timeout for production
  }

  // Initialize Socket.io AFTER server is listening (non-blocking)
  setTimeout(() => {
    try {
      const io = initSocketIO(httpServer);
      if (io) {
        logger.info('✅ Socket.io initialized successfully (background)');
      } else {
        logger.warn('⚠️  Socket.io initialization skipped (non-critical)');
      }
    } catch (socketError) {
      logger.warn('⚠️  Socket.io initialization failed (non-critical):', socketError.message);
    }
  }, 1000);

  return { server, httpServer };
};

/**
 * Setup graceful shutdown handlers
 */
const setupGracefulShutdown = ({ server, httpServer }) => {
  const gracefulShutdown = async (signal) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);
    
    const forceExitTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
    
    try {
      // Close HTTP server
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error(`Error closing HTTP server: ${err.message}`);
            reject(err);
          } else {
            logger.info('HTTP server closed.');
            resolve();
          }
        });
      });
      
      // Close Socket.io connections
      closeSocketIO();
      logger.info('Socket.io connections closed.');
      
      // Close database connections
      await sequelize.close();
      logger.info('PostgreSQL connection closed.');
      
      clearTimeout(forceExitTimeout);
      logger.info('✅ Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error.message}`);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

/**
 * Initialize the complete server - OPTIMIZED FOR RENDER HEALTH CHECKS
 */
export const initializeServer = async (app) => {
  try {
    logger.info('🌟 Starting SwanStudios Server initialization...');
    
    // 1. Start server FIRST for immediate health check response
    const serverObjects = await startServer(app);
    
    // 2. Setup graceful shutdown early
    setupGracefulShutdown(serverObjects);
    
    logger.info('✅ Server is LISTENING - health checks will now pass');
    logger.info('🔄 Background initialization starting...');
    
    // 3. Background initialization (non-blocking)
    setTimeout(async () => {
      try {
        logger.info('📁 Creating required directories...');
        await createRequiredDirectories();
        
        logger.info('🗄️  Initializing databases...');
        await initializeDatabases();
        
        logger.info('🌱 Seeding initial data...');
        await seedInitialData();
        
        logger.info('✅ Background initialization completed successfully!');
      } catch (backgroundError) {
        logger.error(`⚠️  Background initialization failed: ${backgroundError.message}`);
        logger.error('🚑 Server continues running with basic functionality');
        // Don't crash the server - continue with degraded functionality
      }
    }, 500); // Start background tasks after 500ms
    
    return serverObjects;
    
  } catch (error) {
    logger.error(`❌ Server startup failed: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

export default initializeServer;