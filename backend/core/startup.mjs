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
import { connectToMongoDB, getMongoDBStatus } from '../mongodb-connect.mjs';
import { runStartupMigrations } from '../utils/startupMigrations.mjs';
import { syncDatabaseSafely } from '../utils/productionDatabaseSync.mjs';
import seedStorefrontItems from '../seedStorefrontItems.mjs';
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
    // Set up model associations first
    await setupAssociations();
    logger.info('Database associations configured');

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
    
    // Connect to MongoDB for workout tracking
    if (!USE_SQLITE_FALLBACK) {
      try {
        const mongoResult = await connectToMongoDB();
        if (mongoResult.db) {
          logger.info('✅ MongoDB connection established successfully');
        } else {
          logger.warn('MongoDB connection failed but continuing with PostgreSQL');
        }
      } catch (mongoError) {
        logger.error(`MongoDB connection error: ${mongoError.message}`);
        logger.info('Continuing with PostgreSQL only');
      }
    }

    // Development database sync (NEVER in production)
    if (!isProduction && process.env.AUTO_SYNC === 'true') {
      try {
        await sequelize.sync({ alter: true }); 
        logger.info('Database synchronized in development mode');
      } catch (syncError) {
        logger.error(`Error syncing database: ${syncError.message}`);
      }
    } else {
      // Production-safe database sync - only creates missing tables
      try {
        const syncResult = await syncDatabaseSafely();
        if (syncResult.success) {
          logger.info(`✅ Production database sync completed: ${syncResult.tablesCreated} tables created, ${syncResult.tablesExisting} already existed`);
        } else {
          logger.warn(`⚠️  Database sync completed with issues: ${syncResult.errors.join(', ')}`);
        }
      } catch (syncError) {
        logger.error(`❌ Production database sync failed: ${syncError.message}`);
        // Continue startup even if sync fails
      }
    }

    // Run startup migrations
    try {
      await runStartupMigrations();
      logger.info('Startup migrations completed');
    } catch (migrationError) {
      logger.warn('Startup migrations had issues (non-critical):', migrationError.message);
    }

    logger.info('✅ Database initialization completed');
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
};

/**
 * Start the HTTP server with Socket.io
 */
const startServer = async (app) => {
  const PORT = process.env.PORT || 10000;
  
  // Create HTTP server
  const httpServer = http.createServer(app);
  
  // Initialize Socket.io
  const io = initSocketIO(httpServer);
  if (io) {
    logger.info('✅ Socket.io initialized successfully for real-time notifications');
  } else {
    logger.warn('⚠️  Failed to initialize Socket.io. Real-time notifications will not be available.');
  }
  
  // Start listening
  const server = httpServer.listen(PORT, () => {
    console.log(`🚀 SwanStudios Server running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode on port ${PORT}`);
    console.log(`🌐 Server available at: http://localhost:${PORT}/`);
    logger.info(`Server started successfully on port ${PORT} at ${new Date().toISOString()}`);
  });

  // Set server timeout and handle graceful connections
  server.timeout = 60000; // 60 seconds
  server.keepAliveTimeout = 61000; // Slightly higher than timeout
  server.headersTimeout = 62000; // Higher than keepAliveTimeout
  
  // Optimize server for production
  if (isProduction) {
    server.maxHeadersCount = 100;
    server.requestTimeout = 30000;
  }

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
 * Initialize the complete server
 */
export const initializeServer = async (app) => {
  try {
    logger.info('🌟 Starting SwanStudios Server initialization...');
    
    // 1. Create required directories
    await createRequiredDirectories();
    
    // 2. Initialize databases
    await initializeDatabases();
    
    // 3. Seed initial data
    await seedInitialData();
    
    // 4. Start server
    const serverObjects = await startServer(app);
    
    // 5. Setup graceful shutdown
    setupGracefulShutdown(serverObjects);
    
    logger.info('✅ SwanStudios Server initialization completed successfully!');
    return serverObjects;
    
  } catch (error) {
    logger.error(`❌ Server initialization failed: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

export default initializeServer;