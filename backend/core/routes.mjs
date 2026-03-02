/**
 * Routes Configuration Module
 * ===========================
 * Organized route setup for SwanStudios platform
 * Master Prompt v28 aligned - Clean architecture
 * Phase 11: Body measurement routes added
 *
 * Phase 8 Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Data Flow:
 * [Express App] -> [routes.mjs] -> [route modules] -> [controllers/services] -> [DB]
 */

import logger from '../utils/logger.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ===================== CORE ROUTES =====================
import authRoutes from '../routes/authRoutes.mjs';
import profileRoutes from '../routes/profileRoutes.mjs';
import healthRoutes from '../routes/healthRoutes.mjs';
import userRoutes from '../routes/userRoutes.mjs';

// ===================== USER MANAGEMENT =====================
import userManagementRoutes from '../routes/userManagementRoutes.mjs';
import sessionRoutes from '../routes/sessionRoutes.mjs';
import sessionPackageRoutes from '../routes/sessionPackageRoutes.mjs';
import packageRoutes from '../routes/packageRoutes.mjs';
// Temporarily disabled for deployment hotfix - will re-enable after verification
// import trainingSessionRoutes from '../routes/trainingSessionRoutes.mjs';

// ===================== BUSINESS LOGIC =====================
import cartRoutes from '../routes/cartRoutes.mjs';
import storefrontRoutes from '../routes/storeFrontRoutes.mjs';
// ARCHIVED: Legacy payment routes (moved to _ARCHIVED)
// import checkoutRoutes from '../routes/checkoutRoutes.mjs';
// import paymentRoutes from '../routes/paymentRoutes.mjs';
// NEW GENESIS CHECKOUT SYSTEM:
import v2PaymentRoutes from '../routes/v2PaymentRoutes.mjs';
import orderRoutes from '../routes/orderRoutes.mjs';
import financialRoutes from '../routes/financialRoutes.mjs';

// ===================== COMMUNICATION =====================
import contactRoutes from '../routes/contactRoutes.mjs';
import messagingRoutes from '../routes/messagingRoutes.mjs';
import notificationsApiRoutes from '../routes/notificationRoutes.mjs';
import smsRoutes from '../routes/smsRoutes.mjs';
import automationRoutes from '../routes/automationRoutes.mjs';

// ===================== FITNESS & WELLNESS =====================
import workoutRoutes from '../routes/workoutRoutes.mjs';
import workoutPlanRoutes from '../routes/workoutPlanRoutes.mjs';
import workoutSessionRoutes from '../routes/workoutSessionRoutes.mjs';
import bodyMeasurementRoutes from '../routes/bodyMeasurementRoutes.mjs';
import painEntryRoutes from '../routes/painEntryRoutes.mjs';
// CONSOLIDATED SESSION ROUTES (Phase 1: Backend Harmonization)
import sessionsRoutes from '../routes/sessions.mjs';
import scheduleRoutes from '../routes/scheduleRoutes.mjs';
import availabilityRoutes from '../routes/availability.mjs';
import sessionDeductionRoutes from '../routes/sessionDeductionRoutes.mjs';
import sessionTypeRoutes from '../routes/sessionTypeRoutes.mjs';

// ===================== GAMIFICATION & SOCIAL =====================
// LEGACY ROUTES - Replaced by V1 API (kept for backward compatibility)
// app.use('/api/gamification', gamificationRoutes);
// app.use('/api/gamification', gamificationApiRoutes);

// ===================== GAMIFICATION V1 API SYSTEM =====================
import gamificationV1Routes from '../routes/gamificationV1Routes.mjs';
import badgeRoutes from '../routes/badgeRoutes.mjs';
import socialRoutes from '../routes/social/index.mjs';
import goalRoutes from '../routes/goalRoutes.mjs';
import socialGoalRoutes from '../routes/socialGoalRoutes.mjs';
import streakRoutes from '../routes/streakRoutes.mjs';

// ===================== ADMIN & MANAGEMENT =====================
import adminRoutes from '../routes/adminRoutes.mjs';
import adminDebugRoutes from '../routes/admin.mjs';
import adminClientRoutes from '../routes/adminClientRoutes.mjs';
import adminPackageRoutes from '../routes/adminPackageRoutes.mjs';
import adminFinanceRoutes from '../routes/admin/adminFinanceRoutes.mjs';
import adminStoreRoutes from '../routes/admin/adminStoreRoutes.mjs';
import adminSpecialRoutes from '../routes/adminSpecialRoutes.mjs';
import adminMcpRoutes from '../routes/adminMcpRoutes.mjs';
import adminEnterpriseRoutes from '../routes/adminEnterpriseRoutes.mjs';
import adminContentModerationRoutes from '../routes/adminContentModerationRoutes.mjs';
import videoLibraryRoutes from '../routes/videoLibraryRoutes.mjs';
import publicVideoRoutes from '../routes/publicVideoRoutes.mjs';

// ===================== VIDEO CATALOG V2 ROUTES =====================
import videoCatalogAdminRoutes from '../routes/videoCatalogRoutes.mjs';
import videoCatalogPublicRoutes from '../routes/videoCatalogPublicRoutes.mjs';
import videoCatalogMemberRoutes from '../routes/videoCatalogMemberRoutes.mjs';
import youtubeImportRoutes from '../routes/youtubeImportRoutes.mjs';
import videoAnalyticsRoutes from '../routes/videoAnalyticsRoutes.mjs';
import videoCollectionRoutes from '../routes/videoCollectionRoutes.mjs';

import adminNotificationsRoutes from '../routes/adminNotificationsRoutes.mjs';
import adminOnboardingRoutes from '../routes/adminOnboardingRoutes.mjs';
import adminWorkoutLoggerRoutes from '../routes/adminWorkoutLoggerRoutes.mjs';
import adminReconciliationRoutes from '../routes/adminReconciliationRoutes.mjs';
import adminChargeCardRoutes from '../routes/adminChargeCardRoutes.mjs';
import adminWaiverRoutes from '../routes/adminWaiverRoutes.mjs';
import publicWaiverRoutes from '../routes/publicWaiverRoutes.mjs';

// ===================== ENTERPRISE ADMIN ANALYTICS & INTELLIGENCE =====================
// 🚀 Real Stripe Business Analytics (replaces mock data)
import analyticsRevenueRoutes from '../routes/admin/analyticsRevenueRoutes.mjs';
import analyticsUserRoutes from '../routes/admin/analyticsUserRoutes.mjs';
import analyticsSystemRoutes from '../routes/admin/analyticsSystemRoutes.mjs';
// ⚙️ Admin Settings Management (system, notifications, API keys, security)
import adminSettingsRoutes from '../routes/adminSettingsRoutes.mjs';
// 🤖 MCP Server Management and Monitoring (already imported above)
// 📦 Real Order Management with Stripe Integration
import adminOrdersRoutes from '../routes/adminOrdersRoutes.mjs';
// 🔍 Data Verification and Debugging
import adminDataVerificationRoutes from '../routes/adminDataVerificationRoutes.mjs';

// ===================== SPECIALIZED FEATURES =====================
import orientationRoutes from '../routes/orientationRoutes.mjs';
import onboardingRoutes from '../routes/onboardingRoutes.mjs';
import clientOnboardingRoutes from '../routes/clientOnboardingRoutes.mjs';
import clientDataRoutes from '../routes/clientDataRoutes.mjs';
import recommendationRoutes from '../routes/recommendationRoutes.mjs';
import foodScannerRoutes from '../routes/foodScannerRoutes.mjs';
import adminDashboardRoutes from '../routes/dashboard/adminDashboardRoutes.mjs';
import sharedDashboardRoutes from '../routes/dashboard/sharedDashboardRoutes.mjs';
import clientDashboardRoutes from '../routes/clientDashboardRoutes.mjs';
import clientProgressApiRoutes from '../routes/clientProgressApiRoutes.mjs';

// ===================== PHASE 2 TASK 5 - DASHBOARD TAB ROUTES =====================
import clientWorkoutRoutes from '../routes/clientWorkoutRoutes.mjs';
import clientNutritionRoutes from '../routes/clientNutritionRoutes.mjs';
import clientPhotoRoutes from '../routes/clientPhotoRoutes.mjs';
import clientNoteRoutes from '../routes/clientNoteRoutes.mjs';
import statsRoutes from '../routes/statsRoutes.mjs';

// ===================== ADVANCED INTEGRATIONS =====================
import mcpRoutes from '../routes/mcpRoutes.mjs';
import aiMonitoringRoutes from '../routes/aiMonitoringRoutes.mjs';
import aiRoutes from '../routes/aiRoutes.mjs';
import masterPromptRoutes from '../routes/masterPrompt/index.mjs';

// ===================== DEVELOPMENT & DEBUG =====================
import debugRoutes from '../routes/debug.mjs';
import devRoutes from '../routes/dev-routes.mjs';
import migrationRoutes from '../routes/migrationRoutes.mjs';
import debugAuthRoutes from '../routes/debugAuthRoutes.mjs';

// ===================== NASM PROTOCOL =====================
import clientProgressRoutes from '../routes/clientProgressRoutes.mjs';
import exerciseRoutes from '../routes/exerciseRoutes.mjs';
import roleRoutes from '../routes/roleRoutes.mjs';

// ===================== NASM WORKOUT TRACKING SYSTEM =====================
import clientTrainerAssignmentRoutes from '../routes/clientTrainerAssignmentRoutes.mjs';
import trainerPermissionsRoutes from '../routes/trainerPermissionsRoutes.mjs';
import dailyWorkoutFormRoutes from '../routes/dailyWorkoutFormRoutes.mjs';

// ===================== WEBHOOKS =====================
import stripeWebhookRouter from '../webhooks/stripeWebhook.mjs';

// ===================== MISCELLANEOUS =====================
import apiRoutes from '../routes/api.mjs';

/**
 * Setup all application routes in organized groups
 */
export const setupRoutes = async (app) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // ===================== BASIC ENDPOINTS =====================
  app.get('/', (req, res) => {
    res.json({
      message: 'SwanStudios API Server is running',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/test', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running correctly',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // ===================== HEALTH CHECK ROUTES =====================
  // Consolidated health endpoints - fixes P0 health check conflicts
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // ===================== CORE API ROUTES =====================
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/user', userRoutes);

  // ===================== USER MANAGEMENT ROUTES =====================
  app.use('/api/auth', userManagementRoutes);
  // REMOVED: app.use('/api/sessions', sessionRoutes); - replaced by unified sessionsRoutes below
  app.use('/api/session-packages', sessionPackageRoutes);
  app.use('/api/packages', packageRoutes);

  // ===================== ONBOARDING ROUTES (AI-POWERED PERSONAL TRAINING) =====================
  // Onboarding-to-Database Pipeline - transforms 85-question CLIENT-ONBOARDING-QUESTIONNAIRE.md
  // into Master Prompt JSON (v3.0 schema) for AI-powered coaching
  app.use('/api/onboarding', onboardingRoutes);
  // Phase 1 onboarding endpoints (questionnaire + NASM movement screen)
  app.use('/api/onboarding', clientOnboardingRoutes);
  app.use('/api/client-data', clientDataRoutes);
  // Temporarily disabled for deployment hotfix - will re-enable after verification
  // app.use('/api/training-sessions', trainingSessionRoutes);
  app.use('/api/roles', roleRoutes);
  
  // ===================== CLIENT-TRAINER ASSIGNMENT ROUTES (EARLY REGISTRATION) =====================
  // Place early to avoid conflicts with /api/sessions routes
  app.use('/api/client-trainer-assignments', clientTrainerAssignmentRoutes);
  app.use('/api/assignments', clientTrainerAssignmentRoutes);

  // ===================== BUSINESS LOGIC ROUTES =====================
  app.use('/api/cart', cartRoutes);
  app.use('/api/storefront', storefrontRoutes);

  // ===================== VIDEO CATALOG V2 ROUTES (MUST BE BEFORE LEGACY) =====================
  // Per hardening #14: v2 routes registered first so /api/v2/* is resolved before /api/* legacy
  app.use('/api/v2/videos', videoCatalogPublicRoutes);       // Public browse + watch (optionalAuth)
  app.use('/api/v2/videos', videoCatalogMemberRoutes);       // Member endpoints (protect)
  app.use('/api/v2/admin/videos', videoCatalogAdminRoutes);  // Admin CRUD + upload (admin)
  app.use('/api/v2/admin/youtube', youtubeImportRoutes);     // YouTube import (admin)
  app.use('/api/v2/admin/video-analytics', videoAnalyticsRoutes); // Analytics + job log (admin)
  app.use('/api/v2/admin/collections', videoCollectionRoutes); // Collection CRUD (admin)

  // ===================== LEGACY VIDEO ROUTES (unchanged) =====================
  app.use('/api/videos', publicVideoRoutes); // Public video library (no auth)
  // ARCHIVED: Legacy payment routes (moved to _ARCHIVED)
  // app.use('/api/checkout', checkoutRoutes);
  // app.use('/api/payments', paymentRoutes);
  // NEW GENESIS CHECKOUT SYSTEM:
  app.use('/api/v2/payments', v2PaymentRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/financial', financialRoutes);

  // ===================== COMMUNICATION ROUTES =====================
  app.use('/api/contact', contactRoutes);
  app.use('/api/messaging', messagingRoutes);
  app.use('/api/notifications', notificationsApiRoutes);
  app.use('/api/sms', smsRoutes);
  app.use('/api/automation', automationRoutes);

  // ===================== FITNESS & WELLNESS ROUTES =====================
  app.use('/api/workout', workoutRoutes);
  app.use('/api/workout/plans', workoutPlanRoutes);
  app.use('/api/workout/sessions', workoutSessionRoutes);
  
  // ===================== UNIFIED SESSIONS ROUTES (Phase 1: Backend Harmonization) =====================
  // Consolidated from enhancedScheduleRoutes + scheduleRoutes using unified session service
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/sessions/deductions', sessionDeductionRoutes); // Auto-deduction and payment application
  app.use('/api/session-types', sessionTypeRoutes); // Session type management (Phase 5)
  app.use('/api/schedule', scheduleRoutes); // Calendar view schedule endpoint
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/orientation', orientationRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/food-scanner', foodScannerRoutes);
  app.use('/api/measurements', bodyMeasurementRoutes);
  app.use('/api/pain-entries', painEntryRoutes);

  // ===================== GAMIFICATION & SOCIAL ROUTES =====================
  // V1 COMPREHENSIVE GAMIFICATION API (Production-Ready)
  app.use('/api/v1/gamification', gamificationV1Routes);

  // Enhanced Badge Management System (Phase 1)
  app.use('/api/badges', badgeRoutes);

  // Social routes (separate system)
  app.use('/api/social', socialRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/goals', socialGoalRoutes); // Social features: supporters, comments, likes, milestones
  app.use('/api/streaks', streakRoutes);

  // ===================== ADMIN & MANAGEMENT ROUTES =====================
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminDebugRoutes);

  // ✅ PHASE 2C FIX: Align endpoints with frontend expectations
  app.use('/api/admin', adminClientRoutes);            // Provides: /api/admin/clients/*

  // 🚨 CRITICAL: Video library routes MUST come BEFORE adminPackageRoutes
  // to prevent route conflict (adminPackageRoutes would intercept /api/admin/videos)
  // 📹 NASM Video Library (YouTube + uploads)
  app.use('/api/admin/videos', videoLibraryRoutes); // Frontend-compatible alias
  app.use('/api/admin/exercise-library', videoLibraryRoutes); // Original endpoint

  app.use('/api/admin/storefront', adminPackageRoutes); // Admin package CRUD (frontend uses /api/admin/storefront/*)

  // Gate admin MCP routes: opt-IN in production, opt-OUT in dev
  const ADMIN_MCP_ROUTES_ENABLED = isProduction
    ? process.env.ENABLE_MCP_ROUTES === 'true'
    : process.env.ENABLE_MCP_ROUTES !== 'false';
  if (ADMIN_MCP_ROUTES_ENABLED) {
    app.use('/api/admin', adminMcpRoutes);              // Provides: /api/admin/mcp/* endpoints
  }

  app.use('/api/admin/content', adminContentModerationRoutes); // Provides: /api/admin/content/* endpoints

  app.use('/api/admin', adminNotificationsRoutes); // Admin notifications API
  app.use('/api/admin', adminOnboardingRoutes); // Admin onboarding management API (Phase 1.2)
  app.use('/api/admin', adminWorkoutLoggerRoutes); // Phase 1B: Admin workout logging API

  app.use('/api/admin/finance', adminFinanceRoutes);
  app.use('/api/admin/store', adminStoreRoutes);
  app.use('/api/admin/specials', adminSpecialRoutes);
  app.use('/api/admin/analytics', analyticsRevenueRoutes);
  app.use('/api/admin/analytics', analyticsUserRoutes);
  app.use('/api/admin/analytics', analyticsSystemRoutes);
  app.use('/api/admin', adminEnterpriseRoutes);

  // ===================== ENTERPRISE ADMIN ANALYTICS & INTELLIGENCE =====================
  // ⚙️ Admin Settings Management (system, notifications, API keys, security)
  app.use('/api/admin/settings', adminSettingsRoutes);
  // 📦 Comprehensive Order Management with Real Stripe Integration
  app.use('/api/admin', adminOrdersRoutes);
  // 🔍 Data Verification and Debugging Tools (verify data accuracy)
  app.use('/api/admin', adminDataVerificationRoutes);
  // 🔧 Payment Reconciliation (ungranted session detection)
  app.use('/api/admin/reconciliation', adminReconciliationRoutes);
  // 💳 Admin Card-on-File Charging (Stripe capture-first + refund-on-failure)
  app.use('/api/admin/charge-card', adminChargeCardRoutes);
  // 📋 Waiver Admin (Phase 5W-D: review, approve/reject matches, manual link, revoke)
  app.use('/api/admin/waivers', adminWaiverRoutes);
  // 📋 Public Waiver (Phase 5W-G: QR/header waiver submission + version text retrieval)
  app.use('/api/public/waivers', publicWaiverRoutes);

  // ===================== DASHBOARD ROUTES =====================
  // Shared dashboard routes for all users (client, trainer, admin)
  app.use('/api/dashboard', sharedDashboardRoutes);

  // Admin-specific dashboard routes (metrics, health, video library stats)
  app.use('/api/admin/dashboard', adminDashboardRoutes);

  // Client-specific dashboard routes
  app.use('/api/client', clientDashboardRoutes);
  app.use('/api/client', clientProgressApiRoutes);

  // ===================== PHASE 2 TASK 5 - DASHBOARD TAB ROUTES =====================
  app.use('/api/workouts', clientWorkoutRoutes);      // GET /api/workouts/:userId/current
  app.use('/api/nutrition', clientNutritionRoutes);   // GET /api/nutrition/:userId/current
  app.use('/api/photos', clientPhotoRoutes);          // GET /api/photos/:userId
  app.use('/api/notes', clientNoteRoutes);            // GET/POST /api/notes/:userId
  app.use('/api/stats', statsRoutes);                 // GET /api/stats/:userId/summary

  // ===================== ADVANCED INTEGRATION ROUTES =====================
  app.use('/api/ai', aiRoutes);
  app.use('/api/mcp', mcpRoutes);
  app.use('/api/ai-monitoring', aiMonitoringRoutes);
  app.use('/api/master-prompt', masterPromptRoutes);

  // ===================== NASM PROTOCOL ROUTES =====================
  app.use('/api/client-progress', clientProgressRoutes);
  app.use('/api/exercises', exerciseRoutes);
  
  // ===================== NASM WORKOUT TRACKING SYSTEM ROUTES =====================
  // Note: client-trainer-assignments routes registered earlier to avoid conflicts
  app.use('/api/trainer-permissions', trainerPermissionsRoutes);
  app.use('/api/workout-forms', dailyWorkoutFormRoutes);

  // ===================== WEBHOOKS =====================
  app.use('/webhooks/stripe', stripeWebhookRouter);

  // ===================== DEVELOPMENT ROUTES =====================
  if (!isProduction) {
    app.use('/api/debug', debugRoutes);
    app.use('/api/debug', debugAuthRoutes); // Add auth debugging routes
    app.use('/api/dev', devRoutes);
    app.use('/api/migrations', migrationRoutes);
    
    // Debug page for auth testing
    app.get('/debug', (req, res) => {
      logger.info('Serving debug page');
      const debugHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>SwanStudios Auth Debug</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
              .result { background: #f1f1f1; padding: 10px; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; }
              input { padding: 8px; margin: 5px 0; display: block; width: 100%; box-sizing: border-box; }
          </style>
      </head>
      <body>
          <h1>SwanStudios Debug Panel</h1>
          <div>
              <h2>System Status</h2>
              <button class="button" onclick="testEndpoint('/health')">Test Health</button>
              <button class="button" onclick="testEndpoint('/api/debug/auth-check')">Test Auth</button>
              <div id="debugResult" class="result">Results will appear here...</div>
          </div>
          <script>
              async function testEndpoint(endpoint) {
                  document.getElementById('debugResult').textContent = 'Testing...';
                  try {
                      const response = await fetch(endpoint);
                      const data = await response.json();
                      document.getElementById('debugResult').textContent = JSON.stringify(data, null, 2);
                  } catch (error) {
                      document.getElementById('debugResult').textContent = 'Error: ' + error.message;
                  }
              }
          </script>
      </body>
      </html>
      `;
      res.status(200).send(debugHtml);
    });
  }

  // ===================== GENERAL API ROUTES (BEFORE SPA FALLBACK) =====================
  app.use('/api', apiRoutes);

  // ===================== ENHANCED SPA FALLBACK ROUTING (PRODUCTION) =====================
  if (isProduction) {
    // Use the robust paths determined in middleware setup
    const frontendDistPath = global.FRONTEND_DIST_PATH;
    const indexPath = global.FRONTEND_INDEX_PATH;
    
    if (frontendDistPath && indexPath && existsSync(indexPath)) {
      logger.info('🌌 Setting up SPA fallback routing...');
      
      // Enhanced SPA fallback with comprehensive route handling
      app.get('*', (req, res) => {
        const requestPath = req.path;
        const userAgent = req.get('User-Agent') || '';
        
        // Exclude API and webhook routes
        if (requestPath.startsWith('/api') || requestPath.startsWith('/webhooks')) {
          return res.status(404).json({ 
            success: false,
            error: 'API endpoint not found',
            path: requestPath,
            timestamp: new Date().toISOString()
          });
        }
        
        // Exclude static asset requests (but allow HTML files)
        const staticAssetPattern = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|xml|txt)$/i;
        if (staticAssetPattern.test(requestPath)) {
          return res.status(404).send('Static asset not found');
        }
        
        // Exclude common non-browser requests
        if (requestPath.includes('robots.txt') || 
            requestPath.includes('sitemap.xml') || 
            requestPath.includes('favicon.ico') ||
            requestPath.includes('.well-known')) {
          return res.status(404).send('Resource not found');
        }
        
        // Log SPA fallback (but reduce noise from bots)
        const isBrowserRequest = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
        if (isBrowserRequest) {
          logger.info(`🌌 SPA Fallback: ${requestPath} -> index.html`);
        } else {
          logger.debug(`🤖 Bot request SPA fallback: ${requestPath}`);
        }
        
        // Set proper headers for SPA
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Serve the React app
        res.sendFile(indexPath);
      });
      
      logger.info('✅ Enhanced SPA fallback routing configured successfully');
      logger.info(`🏠 Frontend served from: ${frontendDistPath}`);
      logger.info(`📄 Index.html path: ${indexPath}`);
    } else {
      logger.error('🚨 CRITICAL: Cannot configure SPA routing - frontend files not found!');
      logger.error(`Frontend path: ${frontendDistPath}`);
      logger.error(`Index path: ${indexPath}`);
      
      // Fallback error handler for missing frontend
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        res.status(503).json({
          error: 'Frontend not available',
          message: 'The frontend application is not properly built or deployed.',
          suggestion: 'Run "npm run build" in the frontend directory',
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  // Custom schedule endpoint removed - handled by unified sessions routes

  logger.info(`Routes configured successfully - ${isProduction ? 'Production' : 'Development'} mode`);
  logger.info('✅ All API endpoints registered and ready');
};

export default setupRoutes;
