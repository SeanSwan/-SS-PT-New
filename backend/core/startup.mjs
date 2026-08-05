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
import { seedExercises } from '../scripts/seedExercises.mjs';
import logger from '../utils/logger.mjs';
import { assertPhase15ExerciseNoteColumn } from './schemaGuards/phase15ExerciseNoteGuard.mjs';
import { assertPhase16WorkoutSessionIntensityNullable } from './schemaGuards/phase16WorkoutSessionIntensityNullGuard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';
const ADMIN_ACCESS_CODE_MIN_LENGTH = 24;
const ADMIN_ACCESS_CODE_PLACEHOLDER_PATTERNS = [
  /admin-access-code-123/i,
  /change[-_ ]?me/i,
  /example/i,
  /password/i,
];

const adminAccessCodeFailure = (reason) => ({
  ok: false,
  reason,
  message: 'ADMIN_ACCESS_CODE must be a high-entropy production secret and must not use documented examples.',
});

export const shouldRunProductionDatabaseSync = ({
  nodeEnv = process.env.NODE_ENV,
  startupDatabaseRepair = process.env.STARTUP_DATABASE_REPAIR,
} = {}) => {
  if (startupDatabaseRepair === 'true') return true;
  if (startupDatabaseRepair === 'false') return false;
  return nodeEnv === 'production';
};

export const validateAdminAccessCode = ({
  nodeEnv = process.env.NODE_ENV,
  adminAccessCode = process.env.ADMIN_ACCESS_CODE,
} = {}) => {
  if (nodeEnv !== 'production') return { ok: true, skipped: true };

  const code = typeof adminAccessCode === 'string' ? adminAccessCode.trim() : '';
  if (!code) return adminAccessCodeFailure('missing');
  if (ADMIN_ACCESS_CODE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(code))) {
    return adminAccessCodeFailure('placeholder');
  }
  if (code.length < ADMIN_ACCESS_CODE_MIN_LENGTH) return adminAccessCodeFailure('too_short');
  if (new Set(code).size < 10) return adminAccessCodeFailure('low_entropy_shape');

  return { ok: true };
};

export const assertAdminAccessCode = (options = {}) => {
  const result = validateAdminAccessCode(options);
  if (!result.ok) {
    throw new Error(`${result.message} Reason: ${result.reason}.`);
  }
  return result;
};

/**
 * Create required directories for uploads and data
 */
const createRequiredDirectories = async () => {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/profiles'),
    path.join(__dirname, '../uploads/products'),
    path.join(__dirname, '../uploads/measurements'),
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
    } else if (!shouldRunProductionDatabaseSync()) {
      logger.info(
        'Database repair sync skipped outside production; set STARTUP_DATABASE_REPAIR=true to run it locally.',
      );
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

    // SWA-115 item 4 (2026-08-04): boot-time schema-drift tripwire. Warn-only —
    // logs every model whose table is missing from the live DB (the class that
    // shipped 12 table-less models undetected). Never blocks boot.
    try {
      const { default: getModels } = await import('../models/associations.mjs');
      const { runModelTableGuard } = await import('../utils/modelTableGuard.mjs');
      await runModelTableGuard(await getModels(), sequelize);
    } catch (guardError) {
      logger.warn(`[ModelTableGuard] wiring failed (non-critical): ${guardError.message}`);
    }

    // Phase 15.2 (2026-04-15): the Phase 15 schema guard has been moved
    // to `criticalDatabasePreflight()` and now runs PRE-LISTEN in
    // `initializeServer()` — before `startServer(app)` is called. The
    // guard in this background path was removed to avoid running it
    // twice. If `initializeDatabases()` is ever called standalone
    // (outside the normal boot), the preflight has already ensured
    // the column exists.
    //
    // See `criticalDatabasePreflight()` in this file for the real
    // fail-fast check.

    // Phase 11: Initialize E2EE encryption models
    try {
      const { initE2EEModels, syncE2EETables } = await import('../services/encryption/keyStoreService.mjs');
      initE2EEModels(sequelize);
      await syncE2EETables(sequelize);
      logger.info('E2EE encryption models initialized');

      // Register health data encryption hooks
      try {
        const { registerAllHealthEncryptionHooks } = await import('../services/encryption/healthDataEncryption.mjs');
        const getModels = (await import("../models/associations.mjs")).default;
        const allModels = await getModels();
        registerAllHealthEncryptionHooks(allModels);
      } catch (hookErr) {
        logger.warn('Health encryption hooks skipped:', hookErr.message);
      }
    } catch (e2eeError) {
      logger.warn('E2EE model init skipped (non-critical):', e2eeError.message);
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

  // Seed exercises — idempotent, skips if exercises already exist
  try {
    await seedExercises();
    logger.info('✅ Exercise seeding check complete');
  } catch (exerciseSeedError) {
    logger.warn(`⚠️  Exercise seeding failed (non-critical): ${exerciseSeedError.message}`);
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

  try {
    const io = initSocketIO(httpServer);
    if (io) {
      logger.info('Socket.io initialized successfully on primary server');
    } else {
      logger.warn('Socket.io initialization skipped on primary server');
    }
  } catch (socketError) {
    logger.warn('Socket.io initialization failed on primary server:', socketError.message);
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

// ─────────────────────────────────────────────────────────────
// SECTION: Phase 15.2 (2026-04-15) critical pre-listen preflight
//
// WHAT THIS IS:
// The minimal set of DB operations that MUST succeed before the server
// is allowed to start accepting HTTP requests. Failure here is fatal —
// the server process should exit, not limp along with silent route-
// level 500s.
//
// WHY PRE-LISTEN:
// The Phase 15.0 code added a dedicated `workout_logs."exerciseNote"`
// column and hard-referenced it in the WorkoutLog Sequelize model, the
// workout write/edit service, and Recovery Signal raw SQL. Without
// this column the server can boot, pass health checks, and then crash
// on the first admin workout write, edit, or client progress chart
// load. That "partially running" failure mode is worse than not
// starting at all — it passes Render health checks while silently
// serving broken routes to real users.
//
// WHAT'S IN THE PREFLIGHT:
//   1. sequelize.authenticate() — proves the DB is reachable.
//   2. runStartupMigrations() — applies any pending Sequelize CLI
//      migrations (including the Phase 15 migration that adds the
//      column). Logs a warning on failure but does not throw, because
//      the schema guard immediately after is the real safety net.
//   3. assertPhase15ExerciseNoteColumn(sequelize) — verifies the
//      column actually exists. Throws with an actionable "run the
//      migration" message if it doesn't.
//   4. assertPhase16WorkoutSessionIntensityNullable(sequelize) —
//      verifies workout_sessions.intensity is nullable. Throws with an
//      actionable message if still NOT NULL. Phase 16 writer lanes
//      persist null on untouched state; without this column opening,
//      every such save would fail with a Sequelize notNull violation.
//
// Everything else (associations verification, sync, seeders, E2EE,
// schedulers, Socket.io) is NON-CRITICAL and runs in the background
// AFTER the server is listening.
// ─────────────────────────────────────────────────────────────

/**
 * Critical database preflight — MUST succeed before `startServer`.
 * Exported for testability: startup-order tests can call this directly
 * with a mock sequelize to verify the fail-fast contract.
 *
 * @param {import('sequelize').Sequelize} seq - active Sequelize instance
 * @throws {Error} on DB connectivity failure or Phase 15 schema drift
 */
export const criticalDatabasePreflight = async (seq) => {
  // 1. DB reachability
  await seq.authenticate();
  logger.info('✅ PostgreSQL connection established (pre-listen preflight)');

  // 2. Pending migrations — best-effort; the schema guard is the
  //    real safety net if a migration fails silently.
  try {
    await runStartupMigrations();
    logger.info('✅ Startup migrations applied (pre-listen preflight)');
  } catch (migrationError) {
    logger.warn(
      `⚠️  Pre-listen migrations had issues (schema guard will verify): ${migrationError.message}`,
    );
  }

  // 3. Phase 15 schema guard — fail fast if the column is missing.
  await assertPhase15ExerciseNoteColumn(seq);

  // 4. Phase 16 schema guard — fail fast if workout_sessions.intensity
  //    is still NOT NULL. Writer lanes that persist null on untouched
  //    state depend on this migration having been applied.
  await assertPhase16WorkoutSessionIntensityNullable(seq);
};

/**
 * Initialize the complete server.
 *
 * Phase 15.2 (2026-04-15) startup contract:
 *
 *   CRITICAL PRE-LISTEN (synchronous, failure = process.exit)
 *     1. criticalDatabasePreflight() — DB auth + migrations + schema guard
 *     2. createRequiredDirectories()
 *
 *   SERVER LISTEN
 *     3. startServer(app) — HTTP listen, health checks pass from here
 *     4. setupGracefulShutdown()
 *
 *   NON-CRITICAL BACKGROUND (best-effort, failure = warn + continue)
 *     5. initializeDatabases() — full association verification, sync, E2EE
 *     6. seedInitialData() — storefront, waivers, exercises
 *     7. Schedulers + event bus
 *
 * The pre-listen step takes 2–5s on a warm Render instance (DB
 * authenticate ≈ 200ms, migrations ≈ 1s, guard introspection ≈ 500ms).
 * Render's default health-check timeout is 30–60s, so the window is
 * generous.
 */
export const initializeServer = async (app) => {
  try {
    logger.info('🌟 Starting SwanStudios Server initialization...');

    // ── CRITICAL PRE-LISTEN ─────────────────────────────────────
    // These must succeed before the server accepts requests. Failure
    // here means the DB is unreachable or the schema is drifted —
    // serving routes in that state would produce silent 500s instead
    // of a clear "fix and redeploy" signal.
    logger.info('🗄️  Running critical database preflight (pre-listen)...');
    logger.info('Running critical config preflight (pre-listen)...');
    assertAdminAccessCode();
    await criticalDatabasePreflight(sequelize);

    logger.info('📁 Creating required directories...');
    await createRequiredDirectories();

    // ── SERVER LISTEN ───────────────────────────────────────────
    // Only reached after the preflight passes. Health checks start
    // responding from this point.
    const serverObjects = await startServer(app);
    setupGracefulShutdown(serverObjects);

    logger.info('✅ Server is LISTENING — preflight passed, health checks active');
    logger.info('🔄 Non-critical background initialization starting...');

    // ── NON-CRITICAL BACKGROUND ─────────────────────────────────
    // Best-effort: seeders, schedulers, E2EE, event bus. Failures
    // are logged but do not take the server down — degraded
    // functionality is acceptable for these subsystems.
    setTimeout(async () => {
      try {
        logger.info('🗄️  Running full database initialization (background)...');
        await initializeDatabases();

        logger.info('🌱 Seeding initial data...');
        await seedInitialData();

        try {
          const { startWeeklyChallengeScheduler } = await import('../services/weeklyChallengeCron.mjs');
          startWeeklyChallengeScheduler();
        } catch (schedErr) {
          logger.warn(`Weekly challenge scheduler failed to start: ${schedErr.message}`);
        }

        try {
          const { startSessionReminderScheduler } = await import('../services/sessionReminderCron.mjs');
          startSessionReminderScheduler();
        } catch (reminderErr) {
          logger.warn(`Session reminder scheduler failed to start: ${reminderErr.message}`);
        }

        try {
          // Tier-0.3 follow-up engine. No-op unless SWAN_AUTOMATION_CRON_ENABLED=true (kill switch).
          const { startAutomationScheduler } = await import('../services/automationCron.mjs');
          startAutomationScheduler();
        } catch (automationErr) {
          logger.warn(`Automation scheduler failed to start: ${automationErr.message}`);
        }

        try {
          // Workout-OS C6b. No-op unless ENABLE_STALE_CLIENT_NUDGES=true (kill switch).
          const { startStaleClientNudgeScheduler } = await import('../services/staleClientNudgeCron.mjs');
          startStaleClientNudgeScheduler();
        } catch (nudgeErr) {
          logger.warn(`Stale-client nudge scheduler failed to start: ${nudgeErr.message}`);
        }

        try {
          // Nutrition Phase 3 S3.3. No-op unless ENABLE_NUTRITION_LOG_NUDGES=true (kill switch).
          const { startNutritionLogNudgeScheduler } = await import('../services/nutritionLogNudgeCron.mjs');
          startNutritionLogNudgeScheduler();
        } catch (nutritionNudgeErr) {
          logger.warn(`Nutrition log nudge scheduler failed to start: ${nutritionNudgeErr.message}`);
        }

        try {
          const { registerEventListeners } = await import('../services/eventBus.mjs');
          registerEventListeners();
        } catch (eventErr) {
          logger.warn(`Event bus registration failed: ${eventErr.message}`);
        }

        logger.info('✅ Background initialization completed successfully!');
      } catch (backgroundError) {
        logger.error(`⚠️  Background initialization failed: ${backgroundError.message}`);
        logger.error('🚑 Server continues running — preflight already passed, core routes safe');
      }
    }, 500);

    return serverObjects;
  } catch (error) {
    logger.error(`❌ Server startup failed: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

export default initializeServer;
