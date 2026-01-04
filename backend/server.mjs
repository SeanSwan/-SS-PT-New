/**
 * SwanStudios - Simplified Main Server
 * ====================================
 * Master Prompt v28 aligned - Clean, modular, production-ready architecture
 * 
 * This is the simplified entry point for the SwanStudios backend server.
 * Complex initialization logic has been moved to dedicated modules for better
 * maintainability and reduced risk of server crashes.
 * 
 * Environment refresh: 2025-07-01T22:26 - Force restart for Stripe env vars
 * Account validation fix: 2025-07-01T22:29 - Fixed frontend validator logic
 * Environment validation: 2025-07-01T22:32 - Simplified to environment consistency
 */

// ===================== ENVIRONMENT SETUP =====================
// PHASE 1: Load environment first
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get paths for environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

// Load environment variables FIRST (critical for Redis blocker)
if (existsSync(envPath)) {
  console.log(`[Server] Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Server] Warning: .env file not found. Using environment variables from system.`);
  dotenv.config();
}

// PHASE 2: Redis Error Suppression for Production
// Suppress ioredis unhandled error events on Render deployment
import './utils/redisErrorSuppressor.mjs';

// PHASE 3: Continue with normal imports
// Environment configuration already completed above

// ===================== REDIS STATUS =====================
// Redis connection handling is now managed by redisWrapper.mjs

// ===================== CORE IMPORTS =====================
import { checkApiKeys } from './utils/apiKeyChecker.mjs';
import { createApp } from './core/app.mjs';
import { initializeServer } from './core/startup.mjs';
import { initializeModelsCache } from './models/index.mjs';
import { initializeSocket } from './socket/socket.mjs';
import logger from './utils/logger.mjs';

// ===================== GLOBAL ERROR HANDLERS =====================
// Prevent server crashes from unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { promise, reason: reason?.message || reason });
  // Log but don't crash the server in production
  if (process.env.NODE_ENV === 'production') {
    logger.error('Critical: Unhandled rejection in production. Server will continue.', { timestamp: new Date().toISOString() });
  } else {
    logger.error('Critical: Unhandled rejection in development. Server will shut down for safety.', { timestamp: new Date().toISOString() });
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Always exit on uncaught exceptions
  process.exit(1);
});

// ===================== MAIN SERVER EXECUTION =====================
(async () => {
  try {
    // Environment info
    const isProduction = process.env.NODE_ENV === 'production';
    const USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';
    
    console.log(`[Server] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`[Server] Database: ${USE_SQLITE_FALLBACK ? 'SQLITE (Fallback)' : (isProduction ? 'RENDER POSTGRES' : 'POSTGRESQL + MONGODB')}`);
    
    // Redis status will be handled by redisWrapper.mjs
    
    // Check API keys early
    checkApiKeys();
    
    // 🎯 CRITICAL: Initialize models cache BEFORE app creation to prevent import timing issues
    logger.info('🚀 Initializing models cache for production readiness...');
    try {
      await initializeModelsCache();
      logger.info('✅ Models cache initialized successfully - all routes can now access models');
    } catch (modelsError) {
      logger.error('💥 CRITICAL: Models cache initialization failed:', modelsError);
      throw new Error(`Models initialization failed: ${modelsError.message}`);
    }
    
    // Create Express application
    logger.info('Creating Express application...');
    const app = await createApp();
    
    // Initialize and start server
    logger.info('Initializing server components...');
    const httpServer = await initializeServer(app);
    initializeSocket(httpServer);
    
    logger.info('🎉 SwanStudios Server is now ready to serve cosmic wellness!');
    
  } catch (error) {
    console.error('💥 Critical server startup failure:', error);
    logger.error(`Critical server startup failure: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
})();

// Export app for testing purposes
export default async () => {
  return await createApp();
};