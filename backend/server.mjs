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
import { closeRedisConnection } from './config/session.mjs';
import logger from './utils/logger.mjs';

// Phase 3 PLAUD multi-clip merge — in-process workers + cron jobs
// (Slice 3.9). Both bootstrap functions self-gate on env flags
// (PLAUD_WORKER_ENABLED, PLAUD_TTL_CRON_ENABLED) and are no-ops
// when off — safe to call unconditionally.
import { startPlaudR2MirrorWorker, stopPlaudR2MirrorWorker } from './jobs/plaudR2MirrorWorker.mjs';
import { startPlaudCronJobs, stopPlaudCronJobs } from './jobs/plaudCronJobs.mjs';
import { startMarketingPublisherWorker, stopMarketingPublisherWorker } from './jobs/marketingPublisherWorker.mjs';
import { startNotificationDeliveryRetryWorker, stopNotificationDeliveryRetryWorker } from './jobs/notificationDeliveryRetryWorker.mjs';

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
let appInstance = null;

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
    appInstance = app; // Store reference for graceful shutdown
    // E-08: hand our resource cleanup to the single shutdown owner
    // (core/startup.mjs). Declared as a hoisted function below.
    if (app.locals) app.locals.shutdownCleanup = shutdownServerResources;

    // Initialize and start server
    logger.info('Initializing server components...');
    const serverObjects = await initializeServer(app);
    initializeSocket();

    // Phase 3 PLAUD: start in-process workers + cron jobs.
    // No-ops unless PLAUD_WORKER_ENABLED / PLAUD_TTL_CRON_ENABLED env
    // flags are 'true'. Default off; flip per-environment after smoke.
    try {
      startPlaudR2MirrorWorker();
      startPlaudCronJobs();
    } catch (plaudErr) {
      logger.error('PLAUD worker/cron bootstrap failed (non-fatal): %s', plaudErr.message);
    }

    try {
      startMarketingPublisherWorker();
    } catch (marketingErr) {
      logger.error('Marketing publisher worker bootstrap failed (non-fatal): %s', marketingErr.message);
    }

    try {
      startNotificationDeliveryRetryWorker();
    } catch (notificationRetryErr) {
      logger.error('Notification delivery retry worker bootstrap failed (non-fatal): %s', notificationRetryErr.message);
    }

    logger.info('🎉 SwanStudios Server is now ready to serve cosmic wellness!');

  } catch (error) {
    console.error('💥 Critical server startup failure:', error);
    logger.error(`Critical server startup failure: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
})();

// ===================== GRACEFUL SHUTDOWN =====================
// E-08 fix (hostile review seat 3).
//
// This file used to register its OWN SIGTERM/SIGINT handlers here. Module-scope
// registration happens BEFORE initializeServer() runs, so Node invoked this
// handler first on every Render deploy — and it exited the process immediately
// once Redis was closed. core/startup.mjs's careful sequence (close HTTP server ->
// close Socket.io -> close Postgres) was registered later and therefore never
// completed: in-flight requests were dropped and DB connections were severed
// mid-transaction on every deploy.
//
// There is now exactly ONE shutdown owner: setupGracefulShutdown() in
// core/startup.mjs, which calls this function via app.locals.shutdownCleanup.
// Declared as a hoisted function because server.mjs wires it into app.locals
// during async init, which can run before this line is reached.
export async function shutdownServerResources() {
  logger.info('Cleaning up server resources (workers, crons, Redis)');

  // Phase 3 PLAUD: stop the in-process workers + crons before exit
  try {
    stopPlaudR2MirrorWorker();
    stopPlaudCronJobs();
    stopMarketingPublisherWorker();
    stopNotificationDeliveryRetryWorker();
  } catch (err) {
    logger.warn('Worker/cron shutdown error: %s', err.message);
  }

  if (appInstance && appInstance.locals.redisClient) {
    await closeRedisConnection(appInstance.locals.redisClient);
  }

  logger.info('Server resource cleanup complete');
}

// Export app for testing purposes
export default async () => {
  return await createApp();
};
