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
import appearanceProfileRoutes from '../routes/appearanceProfileRoutes.mjs';
import healthRoutes from '../routes/healthRoutes.mjs';
import publicConfigRoutes from '../routes/publicConfigRoutes.mjs';
import adminFlagRoutes from '../routes/adminFlagRoutes.mjs';
import crystallizeRoutes from '../routes/crystallizeRoutes.mjs';
import dashboardV2Routes from '../routes/dashboardV2Routes.mjs';
import userRoutes from '../routes/userRoutes.mjs';

// ===================== USER MANAGEMENT =====================
import userManagementRoutes from '../routes/userManagementRoutes.mjs';
import sessionPackageRoutes from '../routes/sessionPackageRoutes.mjs';
import packageRoutes from '../routes/packageRoutes.mjs';
// trainingSessionRoutes was disabled for a deployment hotfix and never re-enabled.
// The module was deleted 2026-07-27 (launch audit). Session endpoints are served
// by sessionRoutes / sessions.mjs / sessionPackageRoutes above.

// ===================== BUSINESS LOGIC =====================
import cartRoutes from '../routes/cartRoutes.mjs';
import storefrontRoutes from '../routes/storeFrontRoutes.mjs';
// NOTE (corrected 2026-07-29, rule 75): the legacy checkoutRoutes.mjs and
// paymentRoutes.mjs were DELETED in commit a4c26a9ac (Genesis Checkout), not
// "moved to _ARCHIVED" — there is no _ARCHIVED directory anywhere in the repo, so
// the old comment sent anyone looking for them on a hunt for a folder that does
// not exist. Their commented-out import + mount lines are removed with it: they
// referenced modules that are gone, so uncommenting them (a plausible move for
// someone trying to "re-enable legacy checkout") would crash Render at boot with
// ERR_MODULE_NOT_FOUND. The replacement is v2PaymentRoutes below.
// NEW GENESIS CHECKOUT SYSTEM:
import v2PaymentRoutes from '../routes/v2PaymentRoutes.mjs';
import orderRoutes from '../routes/orderRoutes.mjs';
import financialRoutes from '../routes/financialRoutes.mjs';
import offlinePaymentRoutes from '../routes/offlinePaymentRoutes.mjs';
import achPaymentRoutes from '../routes/achPaymentRoutes.mjs';
import adminPaymentSettingsRoutes from '../routes/adminPaymentSettingsRoutes.mjs';

// ===================== COMMUNICATION =====================
import contactRoutes from '../routes/contactRoutes.mjs';
import telemetryRoutes from '../routes/telemetryRoutes.mjs'; // P0-4 SWA-29 public funnel beacon
import newsletterRoutes from '../routes/newsletterRoutes.mjs';
import marketingUnsubscribeRoutes from '../routes/marketingUnsubscribeRoutes.mjs';
import consultRequestRoutes from '../routes/consultRequestRoutes.mjs';
import messagingRoutes from '../routes/messagingRoutes.mjs';
import encryptionRoutes from '../routes/encryptionRoutes.mjs';
import notificationsApiRoutes from '../routes/notificationRoutes.mjs';
import smsRoutes from '../routes/smsRoutes.mjs';
import smsWebhookRoutes from '../routes/smsWebhookRoutes.mjs';
import automationRoutes from '../routes/automationRoutes.mjs';
import supportIssueRoutes from '../routes/supportIssueRoutes.mjs';
import adminSupportIssueRoutes from '../routes/adminSupportIssueRoutes.mjs';

// ===================== FITNESS & WELLNESS =====================
import workoutRoutes from '../routes/workoutRoutes.mjs';
import workoutPlanRoutes from '../routes/workoutPlanRoutes.mjs';
import trainingPlanProjectionRoutes from '../routes/trainingPlanProjectionRoutes.mjs';
import workoutSessionRoutes from '../routes/workoutSessionRoutes.mjs';
import bodyMeasurementRoutes from '../routes/bodyMeasurementRoutes.mjs';
import wearableDataRoutes from '../routes/wearableDataRoutes.mjs';
import painEntryRoutes from '../routes/painEntryRoutes.mjs';
import formAnalysisRoutes from '../routes/formAnalysisRoutes.mjs';
import customExerciseRoutes from '../routes/customExerciseRoutes.mjs';
import equipmentRoutes from '../routes/equipmentRoutes.mjs';
import variationRoutes from '../routes/variationRoutes.mjs';
import clientIntelligenceRoutes from '../routes/clientIntelligenceRoutes.mjs';
import workoutBuilderRoutes from '../routes/workoutBuilderRoutes.mjs';
import oracleRoutes from '../routes/oracleRoutes.mjs';
import bootcampRoutes from '../routes/bootcampRoutes.mjs';
import sprintRoutes from '../routes/sprintRoutes.mjs';
import workoutLogUploadRoutes from '../routes/workoutLogUploadRoutes.mjs';
import coachIntakeRoutes from '../routes/coachIntakeRoutes.mjs';
import coachProposalRoutes from '../routes/coachProposalRoutes.mjs';
import scheduleAiRoutes from '../routes/scheduleAiRoutes.mjs';
// Phase 3 PLAUD multi-clip merge ingestion (Slice 3.5 + 3.7)
import plaudClipsRoutes from '../routes/plaud/plaudClipsRoutes.mjs';
import plaudIntakeRoutes from '../routes/plaud/plaudIntakeRoutes.mjs';
import { mergeActionRouter, mergeRequestsRouter } from '../routes/plaud/plaudMergeRoutes.mjs';
// Phase 5 Slice 5.5 — Applaud Auto-Ingestion webhook is LAZY-IMPORTED inside
// setupRoutes only when the feature flag is on. Static import was a Codex
// NC-CRIT-1 finding (route module would load even when flag off, exposing
// production to crashes from any import-time error in the webhook stack).
// CONSOLIDATED SESSION ROUTES (Phase 1: Backend Harmonization)
import sessionsRoutes from '../routes/sessions.mjs';
import scheduleRoutes from '../routes/scheduleRoutes.mjs';
import availabilityRoutes from '../routes/availability.mjs';
import sessionDeductionRoutes from '../routes/sessionDeductionRoutes.mjs';
import sessionTypeRoutes from '../routes/sessionTypeRoutes.mjs';

// ===================== GAMIFICATION & SOCIAL =====================
// Gamification is served ENTIRELY by gamificationV1Routes, mounted below at
// BOTH /api/v1/gamification and /api/gamification. The former legacy modules
// (gamificationRoutes.mjs, gamificationApiRoutes.mjs) were deleted 2026-07-27:
// their mounts had been commented out here while a stale comment still claimed
// they were "kept for backward compatibility", which sent a security audit
// chasing a file no request could ever reach. Do not resurrect them — add to
// gamificationV1Routes instead.

// ===================== LIVE STREAMING & CREATOR ECONOMY =====================
import liveStreamRoutes from '../routes/liveStreamRoutes.mjs';
import creatorEconomyRoutes from '../routes/creatorEconomyRoutes.mjs';

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
import adminSocialPublishingRoutes from '../routes/adminSocialPublishingRoutes.mjs';
import adminMarketingCalendarRoutes from '../routes/adminMarketingCalendarRoutes.mjs';
import adminMarketingReadinessRoutes from '../routes/adminMarketingReadinessRoutes.mjs';
import adminMarketingCampaignRoutes from '../routes/adminMarketingCampaignRoutes.mjs';
import videoSessionRoutes from '../routes/videoSessionRoutes.mjs';
import avatarHomeRoutes from '../routes/avatarHomeRoutes.mjs';
import badgeCreatorRoutes from '../routes/badgeCreatorRoutes.mjs';
import olympicRoutes from '../routes/olympicRoutes.mjs';
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
import adminComplianceRoutes from '../routes/adminComplianceRoutes.mjs';

// ===================== ENTERPRISE ADMIN ANALYTICS & INTELLIGENCE =====================
// 🚀 Real Stripe Business Analytics (replaces mock data)
import analyticsRevenueRoutes from '../routes/admin/analyticsRevenueRoutes.mjs';
import analyticsUserRoutes from '../routes/admin/analyticsUserRoutes.mjs';
import analyticsSystemRoutes from '../routes/admin/analyticsSystemRoutes.mjs';
// ⚙️ Admin Settings Management (system, notifications, API keys, security)
import adminSettingsRoutes from '../routes/adminSettingsRoutes.mjs';
// Retired AI bridge compatibility routes (already imported above)
// 📦 Real Order Management with Stripe Integration
import adminOrdersRoutes from '../routes/adminOrdersRoutes.mjs';
// 🔍 Data Verification and Debugging
import adminDataVerificationRoutes from '../routes/adminDataVerificationRoutes.mjs';

// ===================== CLIENT ANALYTICS & COMMUNICATION DRAFTS =====================
import analyticsRoutes from '../routes/analyticsRoutes.mjs';
import clientAnalyticsRoutes from '../routes/clientAnalyticsRoutes.mjs';
import communicationDraftRoutes from '../routes/communicationDraftRoutes.mjs';

// ===================== ACCOUNT CLAIMING (Crystalline Link Protocol) =====================
import claimRoutes from '../routes/claimRoutes.mjs';

// ===================== SPECIALIZED FEATURES =====================
import orientationRoutes from '../routes/orientationRoutes.mjs';
import movementAnalysisRoutes from '../routes/movementAnalysisRoutes.mjs';
import onboardingRoutes from '../routes/onboardingRoutes.mjs';
import clientOnboardingRoutes from '../routes/clientOnboardingRoutes.mjs';
import clientOnboardRoutes from '../routes/clientOnboardRoutes.mjs';
import clientDataRoutes from '../routes/clientDataRoutes.mjs';
import recommendationRoutes from '../routes/recommendationRoutes.mjs';
import foodScannerRoutes from '../routes/foodScannerRoutes.mjs';
import foodScannerExplainRoutes from '../routes/foodScannerExplainRoutes.mjs';
import adminDashboardRoutes from '../routes/dashboard/adminDashboardRoutes.mjs';
import sharedDashboardRoutes from '../routes/dashboard/sharedDashboardRoutes.mjs';
import clientDashboardRoutes from '../routes/clientDashboardRoutes.mjs';
import clientProgressApiRoutes from '../routes/clientProgressApiRoutes.mjs';

// ===================== PHASE 2 TASK 5 - DASHBOARD TAB ROUTES =====================
import clientWorkoutRoutes from '../routes/clientWorkoutRoutes.mjs';
import workoutSummaryRoutes from '../routes/workoutSummaryRoutes.mjs';
import clientNutritionRoutes from '../routes/clientNutritionRoutes.mjs';
import clientPhotoRoutes from '../routes/clientPhotoRoutes.mjs';
import clientNoteRoutes from '../routes/clientNoteRoutes.mjs';
import statsRoutes from '../routes/statsRoutes.mjs';

// ===================== ADVANCED INTEGRATIONS =====================
import mcpRoutes from '../routes/mcpRoutes.mjs';
import aiMonitoringRoutes from '../routes/aiMonitoringRoutes.mjs';
import aiRoutes from '../routes/aiRoutes.mjs';
import aiChatRoutes from '../routes/aiChatRoutes.mjs';
import aiStreamSpikeRoutes from '../routes/aiStreamSpikeRoutes.mjs';
import aiCommandRoutes from '../routes/aiCommandRoutes.mjs';
import hermesRoutes from '../routes/hermesRoutes.mjs';
import aiDebateRoutes from '../routes/aiDebateRoutes.mjs';
import aiBffRoutes from '../routes/aiBffRoutes.mjs';
import aiVillageRoutes from '../routes/aiVillageRoutes.mjs';
import dailyMacroRoutes from '../routes/dailyMacroRoutes.mjs';
import dailyMacroRosterTriageRoutes from '../routes/dailyMacroRosterTriageRoutes.mjs';
import hydrationRoutes from '../routes/hydrationRoutes.mjs';
import restaurantRoutes from '../routes/restaurantRoutes.mjs';
import gardeningRoutes from '../routes/gardeningRoutes.mjs';
import farmFinderRoutes from '../routes/farmFinderRoutes.mjs';
import supplementRoutes from '../routes/supplementRoutes.mjs';
import mealPlanRoutes from '../routes/mealPlanRoutes.mjs';
import subscriptionRoutes from '../routes/subscriptionRoutes.mjs';
import adminAiUsageRoutes from '../routes/adminAiUsageRoutes.mjs';
import creditsRoutes from '../routes/creditsRoutes.mjs';
import commissionRoutes from '../routes/commissionRoutes.mjs';
import freeApiRoutes from '../routes/freeApiRoutes.mjs';
import masterPromptRoutes from '../routes/masterPrompt/index.mjs';
import customPackageRoutes from '../routes/customPackageRoutes.mjs';

// ===================== PHOTO GALLERY & LEAD GENERATION =====================
import galleryRoutes from '../routes/galleryRoutes.mjs';
import adminGalleryRoutes from '../routes/adminGalleryRoutes.mjs';

// ===================== IMMIGRATION TRACKING =====================
import immigrationRoutes from '../routes/immigrationRoutes.mjs';

// ===================== CRM LEAD MANAGEMENT =====================
import leadRoutes from '../routes/leadRoutes.mjs';
import leadCaptureRoutes from '../routes/leadCaptureRoutes.mjs'; // PRISM: public email-only capture (POST /capture)

// ===================== DEVELOPMENT & DEBUG =====================
import debugRoutes from '../routes/debug.mjs';
import devRoutes from '../routes/dev-routes.mjs';
import migrationRoutes from '../routes/migrationRoutes.mjs';
import debugAuthRoutes from '../routes/debugAuthRoutes.mjs';

// ===================== NASM PROTOCOL =====================
import clientProgressRoutes from '../routes/clientProgressRoutes.mjs';
import exerciseRoutes from '../routes/exerciseRoutes.mjs';
import recoveryRoutes from '../routes/recoveryRoutes.mjs';
import calculatorRoutes from '../routes/calculatorRoutes.mjs';
import roleRoutes from '../routes/roleRoutes.mjs';

// ===================== NASM WORKOUT TRACKING SYSTEM =====================
import clientTrainerAssignmentRoutes from '../routes/clientTrainerAssignmentRoutes.mjs';
import trainerPermissionsRoutes from '../routes/trainerPermissionsRoutes.mjs';
import dailyWorkoutFormRoutes from '../routes/dailyWorkoutFormRoutes.mjs';

// ===================== WEBHOOKS =====================
import stripeWebhookRouter from '../webhooks/stripeWebhook.mjs';
import prodigiWebhookRouter from '../routes/print/prodigiWebhookRoutes.mjs';

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
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/test', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running correctly',
      timestamp: new Date().toISOString()
    });
  });

  // ===================== HEALTH CHECK ROUTES =====================
  // Consolidated health endpoints - fixes P0 health check conflicts
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/config', publicConfigRoutes); // Dashboards v2 public feature flags (unauthenticated booleans)
  app.use('/api/achievements', crystallizeRoutes); // Dashboards v2 Crystallize write (owner-scoped)
  app.use('/api/dashboard', dashboardV2Routes); // Dashboards v2 summary (role-gated, finance server-flag)

  // ===================== CORE API ROUTES =====================
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/appearance', appearanceProfileRoutes); // FUSION F1: per-user Smart Lens appearance (GET/PUT /profile, auth-scoped)
  app.use('/api/user', userRoutes);

  // ===================== USER MANAGEMENT ROUTES =====================
  app.use('/api/auth', userManagementRoutes);
  // NOTE (corrected 2026-07-28, SWA-71): the DIRECT mount of sessionRoutes was removed here, but
  // sessionRoutes is STILL SERVED — it is mounted at routes/api.mjs:26 and reaches requests through
  // the `app.use('/api', apiRoutes)` fallback further down this file. The previous comment said
  // "REMOVED" without qualification, which read as "this router is gone". It is not.
  //
  // It survives because 4 admin endpoints exist ONLY there and nowhere else:
  //   POST /api/sessions/allocate-from-order   GET /api/sessions/user-summary/:userId
  //   POST /api/sessions/add-to-user           GET /api/sessions/allocation-health
  // All four are protect + adminOnly. Migrating them into sessions.mjs is the real fix; until then
  // this is a KNOWN, INTENTIONAL competing surface rather than an accidental one. Tracked on SWA-71.
  //
  // Anything single-segment under /api/sessions is claimed first by sessions.mjs, which is mounted
  // here at line ~384. A path that exists ONLY in sessionRoutes is therefore unreachable by GET —
  // it will either hit a real sessions.mjs route or fall into `router.get("/:id")` and return
  // `400 Invalid session id`. Do NOT add new single-segment routes to sessionRoutes; they will be
  // dead on arrival, and dead-but-present routes are how unguarded copies survive unnoticed.
  app.use('/api/session-packages', sessionPackageRoutes);
  app.use('/api/packages', packageRoutes);

  // ===================== ONBOARDING ROUTES (AI-POWERED PERSONAL TRAINING) =====================
  // Onboarding-to-Database Pipeline - transforms 85-question CLIENT-ONBOARDING-QUESTIONNAIRE.md
  // into Master Prompt JSON (v3.0 schema) for AI-powered coaching
  app.use('/api/onboarding', onboardingRoutes);
  // Phase 1 onboarding endpoints (questionnaire + NASM movement screen)
  app.use('/api/onboarding', clientOnboardingRoutes);
  // AI-powered client onboarding (single transactional endpoint)
  app.use('/api/clients/onboard', clientOnboardRoutes);
  app.use('/api/client-data', clientDataRoutes);
  // (removed 2026-07-27) /api/training-sessions — trainingSessionRoutes deleted; see note at imports.
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
  // Legacy /api/checkout and the legacy /api/payments router are gone (deleted in
  // a4c26a9ac; see the note at the imports). NOTE: /api/payments itself is still a
  // LIVE path — offlinePaymentRoutes serves it a few lines below — so "legacy
  // payment routes were removed" must not be read as "/api/payments is unmounted".
  // NEW GENESIS CHECKOUT SYSTEM:
  app.use('/api/v2/payments', v2PaymentRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/financial', financialRoutes);
  app.use('/api/payments', offlinePaymentRoutes);
  app.use('/api/payments/ach', achPaymentRoutes);
  app.use('/api/admin/payment-settings', adminPaymentSettingsRoutes);

  // ===================== COMMUNICATION ROUTES =====================
  app.use('/api/contact', contactRoutes);
  app.use('/api/telemetry', telemetryRoutes); // PUBLIC funnel beacon (P0-4): client-allowlist + rate-limited
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/marketing', marketingUnsubscribeRoutes); // PUBLIC lead-nurture one-click unsubscribe (CAN-SPAM)
  app.use('/api/consult-request', consultRequestRoutes);  // PUBLIC "book a free consult" → lead scheduled + owner confirm
  app.use('/api/messaging', messagingRoutes);
  app.use('/api/encryption', encryptionRoutes);
  app.use('/api/notifications', notificationsApiRoutes);
  app.use('/api/sms/webhooks', smsWebhookRoutes);
  app.use('/api/sms', smsRoutes);
  app.use('/api/automation', automationRoutes);
  app.use('/api/support/issues', supportIssueRoutes);
  app.use('/api/admin/support/issues', adminSupportIssueRoutes);

  // ===================== FITNESS & WELLNESS ROUTES =====================
  // IMPORTANT: /api/workout/plans MUST mount BEFORE /api/workout to prevent route shadowing
  // (Express matches broader mounts first — /api/workout would catch /plans requests)
  app.use('/api/workout-plans', workoutPlanRoutes);
  app.use('/api/workout/plans', workoutPlanRoutes); // Legacy mount point for backward compat
  app.use('/api/workout', workoutRoutes);
  app.use('/api/workout/sessions', workoutSessionRoutes);
  app.use('/api/training-plan-projections', trainingPlanProjectionRoutes);
  
  // ===================== UNIFIED SESSIONS ROUTES (Phase 1: Backend Harmonization) =====================
  // Consolidated from enhancedScheduleRoutes + scheduleRoutes using unified session service
  app.use('/api/sessions/deductions', sessionDeductionRoutes); // Auto-deduction and payment application
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/session-types', sessionTypeRoutes); // Session type management (Phase 5)
  app.use('/api/schedule', scheduleRoutes); // Calendar view schedule endpoint
  app.use('/api/schedule-ai', scheduleAiRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/orientation', orientationRoutes);
  app.use('/api/movement-analysis', movementAnalysisRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/food-scanner', foodScannerExplainRoutes);
  app.use('/api/food-scanner', foodScannerRoutes);
  app.use('/api/measurements', bodyMeasurementRoutes);
  app.use('/api/wearable-data', wearableDataRoutes);
  app.use('/api/pain-entries', painEntryRoutes);
  app.use('/api/form-analysis', formAnalysisRoutes);
  app.use('/api/custom-exercises', customExerciseRoutes);
  app.use('/api/equipment-profiles', equipmentRoutes);
  app.use('/api/variation', variationRoutes);
  app.use('/api/client-intelligence', clientIntelligenceRoutes);
  app.use('/api/workout-builder', workoutBuilderRoutes);
  app.use('/api/oracle', oracleRoutes);
  app.use('/api/bootcamp', bootcampRoutes);
  app.use('/api/bootcamp/sprints', sprintRoutes);
  app.use('/api/workout-logs', workoutLogUploadRoutes);
  app.use('/api/coach/intake', coachIntakeRoutes);
  app.use('/api/coach/proposals', coachProposalRoutes);
  // Phase 3 PLAUD: clip lifecycle (upload, list, delete) + merge orchestration.
  // Router is mounted always; plaudFeatureFlag middleware returns structured 503 when off.
  app.use('/api/plaud/clips', plaudClipsRoutes);
  app.use('/api/plaud/intake', plaudIntakeRoutes);
  app.use('/api/plaud/merge', mergeActionRouter);
  app.use('/api/plaud/merge-requests', mergeRequestsRouter);

  // Phase 5 PLAUD Auto-Ingestion: Applaud webhook receiver.
  // Codex CR-5: route is mounted ONLY when feature flag is on; otherwise the
  // URL returns Express 404 (NO 503 path in v1.2). Codex HIGH-7: mount-time
  // env validation refuses to mount on misconfiguration.
  // Codex NC-CRIT-1: webhook route module is LAZY-IMPORTED only when the
  // feature flag is on. Static import would expose production to crashes
  // from any import-time error in the webhook stack even with flag=off.
  if (process.env.PLAUD_APPLAUD_WEBHOOK_ENABLED === 'true') {
    try {
      const { default: plaudWebhookRoutes, shouldMountApplaudWebhookRoute }
        = await import('../routes/plaud/plaudWebhookRoutes.mjs');
      if (await shouldMountApplaudWebhookRoute()) {
        app.use('/api/plaud/webhook', plaudWebhookRoutes);
      }
    } catch (mountErr) {
      // Fail-closed: any unexpected error during lazy-import or mount-decision
      // skips the mount and logs. The route stays absent (404).
      console.error('[plaudApplaudWebhook] lazy-import or mount-decision threw — route NOT mounted:', mountErr.message);
    }
  }

  // ===================== CLIENT ANALYTICS (IDOR-PROTECTED) =====================
  app.use('/api/analytics', analyticsRoutes);             // Client workout analytics (owner/trainer/admin)
  app.use('/api/client/analytics', clientAnalyticsRoutes); // Client-safe analytics (JWT-derived userId, no IDOR risk)
  app.use('/api/trainer/drafts', communicationDraftRoutes); // AI communication draft approval

  // ===================== GAMIFICATION & SOCIAL ROUTES =====================
  // V1 COMPREHENSIVE GAMIFICATION API (Production-Ready)
  app.use('/api/v1/gamification', gamificationV1Routes);
  // Mount at legacy path too — frontend components use /api/gamification/*
  app.use('/api/gamification', gamificationV1Routes);

  // Enhanced Badge Management System (Phase 1)
  app.use('/api/badges', badgeRoutes);

  // Social routes (separate system)
  app.use('/api/social', socialRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/goals', socialGoalRoutes); // Social features: supporters, comments, likes, milestones
  app.use('/api/streaks', streakRoutes);

  // Live Streaming & Creator Economy (Phase 2 — routes ready, features coming soon)
  app.use('/api/live-streams', liveStreamRoutes);
  app.use('/api/creators', creatorEconomyRoutes);

  // ===================== ADMIN & MANAGEMENT ROUTES =====================
  app.use('/api/admin/flags', adminFlagRoutes); // Launch Control (admin-only; self-gates protect+authorize)
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

  // Gate retired admin bridge routes behind explicit opt-in. Bridge management is
  // retired from the default runtime after the Render cost reduction pass.
  const ADMIN_MCP_ROUTES_ENABLED = process.env.ENABLE_MCP_ROUTES === 'true';
  if (ADMIN_MCP_ROUTES_ENABLED) {
    app.use('/api/admin', adminMcpRoutes);              // Provides retired /api/admin/mcp/* compatibility endpoints
  }

  app.use('/api/admin/content', adminContentModerationRoutes); // Provides: /api/admin/content/* endpoints
  app.use('/api/admin/social-publishing', adminSocialPublishingRoutes); // Native social publishing
  app.use('/api/admin/marketing-calendar', adminMarketingCalendarRoutes); // Persisted Marketing calendar + PT awareness
  app.use('/api/admin/marketing-readiness', adminMarketingReadinessRoutes); // Read-only marketing subsystem readiness cockpit
  app.use('/api/admin/marketing-campaigns', adminMarketingCampaignRoutes); // Campaign spine CRUD (Marketing OS Slice 2)
  app.use('/api/video-sessions', videoSessionRoutes); // Video chat for remote assessments (LiveKit)
  app.use('/api/avatar-home', avatarHomeRoutes); // 3D avatar home — unlocks at Level 10
  app.use('/api/admin/badge-creator', badgeCreatorRoutes); // AI badge generation via Gemini Nano Banana
  app.use('/api/olympics', olympicRoutes); // Virtual Olympics — Ghost Racing competitive events

  // Public tab icon overrides — needed by all roles on dashboard init
  app.get('/api/badge-tab-icons', async (_req, res) => {
    try {
      const { default: Badge } = (await import('../models/Badge.mjs'));
      const overrides = await Badge.findAll({
        where: { criteriaType: 'custom_criteria' },
        attributes: ['criteria', 'imageUrl', 'name'],
      });
      const iconMap = {};
      for (const b of overrides) {
        const criteria = typeof b.criteria === 'string' ? JSON.parse(b.criteria) : (b.criteria || {});
        const assignment = criteria.assignment || {};
        if (assignment.assignedTo === 'tab' && assignment.assignedTarget) {
          iconMap[assignment.assignedTarget] = { imageUrl: b.imageUrl, name: b.name };
        }
      }
      res.json({ success: true, data: iconMap });
    } catch {
      res.json({ success: true, data: {} }); // Fail open — use default icons
    }
  });

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
  // 🔗 Account Claiming (Crystalline Link Protocol — QR/SWAN-XXXX invite codes)
  app.use('/api/claim', claimRoutes);
  // Client Compliance, Business KPIs, and Automated Check-Ins
  app.use('/api/admin', adminComplianceRoutes);

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
  app.use('/api/workout-summaries', workoutSummaryRoutes); // POST /api/workout-summaries
  app.use('/api/nutrition', clientNutritionRoutes);   // GET /api/nutrition/:userId/current
  app.use('/api/photos', clientPhotoRoutes);          // GET /api/photos/:userId
  app.use('/api/notes', clientNoteRoutes);            // GET/POST /api/notes/:userId
  app.use('/api/stats', statsRoutes);                 // GET /api/stats/:userId/summary

  // ===================== R2 PHOTO SERVE PROXY =====================
  // Photos stored in R2 get URLs like /api/serve-photo/photos/banners/57/2026-03/uuid.jpg
  // The /api/ prefix ensures Render routes these to the backend (not the static site).
  app.get('/api/serve-photo/photos/:category/:userId/:yearMonth/:filename', async (req, res) => {
    try {
      const { category, userId, yearMonth, filename } = req.params;
      const objectKey = `photos/${category}/${userId}/${yearMonth}/${filename}`;

      if (!['profiles', 'banners', 'banner-collage', 'measurements', 'social', 'social-photos', 'social-videos', 'products'].includes(category) ||
          !/^\d+$/.test(userId) ||
          !/^\d{4}-\d{2}$/.test(yearMonth) ||
          !/^[\w-]+\.\w+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid photo path' });
      }

      // Sensitive categories (body/health photos) require a short-TTL signed
      // URL — a leaked bare link must NOT be permanently public. The API mints
      // signatures on every measurement response; plain <img> tags work
      // because the signature rides the query string. FAIL-CLOSED.
      const { SENSITIVE_PHOTO_CATEGORIES, verifySignedPhotoPath } =
        await import('../services/photoUrlSigner.mjs');
      if (SENSITIVE_PHOTO_CATEGORIES.has(category)) {
        const barePath = `/api/serve-photo/${objectKey}`;
        if (!verifySignedPhotoPath(barePath, req.query.exp, req.query.sig)) {
          return res.status(401).json({ error: 'Signed URL required or expired' });
        }
      }

      const { r2Configured, getR2Client } = await import('../services/r2StorageService.mjs');
      if (r2Configured) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const client = getR2Client();

        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v' };

        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          ResponseContentType: mimeMap[ext] || 'image/jpeg',
          ResponseContentDisposition: 'inline',
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        return res.redirect(302, signedUrl);
      }

      // Fallback: try local uploads dir
      const localPath = path.join(process.cwd(), 'uploads', category, filename);
      if (existsSync(localPath)) {
        return res.sendFile(localPath);
      }

      return res.status(404).json({ error: 'Photo not found' });
    } catch (err) {
      logger.error('[PhotoServeProxy] Error serving photo: %s', err.message);
      return res.status(500).json({ error: 'Failed to serve photo' });
    }
  });

  // ===================== R2 GALLERY PHOTO SERVE PROXY =====================
  // Gallery photos stored in R2 get URLs like /api/serve-photo/gallery/{slug}/{number}.jpg
  app.get('/api/serve-photo/gallery/:slug/:filename', async (req, res) => {
    try {
      const { slug, filename } = req.params;

      if (!/^[a-z0-9-]+$/.test(slug) || !/^[\w-]+\.\w+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid gallery photo path' });
      }

      const objectKey = `gallery/${slug}/${filename}`;

      const { r2Configured, getR2Client } = await import('../services/r2StorageService.mjs');
      if (r2Configured) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const client = getR2Client();

        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v' };

        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          ResponseContentType: mimeMap[ext] || 'image/jpeg',
          ResponseContentDisposition: 'inline',
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        return res.redirect(302, signedUrl);
      }

      return res.status(404).json({ error: 'Gallery photo not found' });
    } catch (err) {
      logger.error('[GalleryPhotoServeProxy] Error serving gallery photo: %s', err.message);
      return res.status(500).json({ error: 'Failed to serve gallery photo' });
    }
  });

  // ===================== ADVANCED INTEGRATION ROUTES =====================
  app.use('/api/ai', aiRoutes);
  // B1b SSE spike (throwaway, kill-switched, admin-only). Mounted BEFORE
  // /api/ai-chat so it owns this exact path; aiChatRoutes defines no
  // /stream-spike route today, so no shadow either way — mount order is
  // pinned here to keep that true if aiChatRoutes grows (rule 31).
  app.use('/api/ai-chat/stream-spike', aiStreamSpikeRoutes);
  app.use('/api/ai-chat', aiChatRoutes);
  app.use('/api/ai-command', aiCommandRoutes);
  app.use('/api/hermes', hermesRoutes);
  app.use('/api/ai/debate', aiDebateRoutes);
  app.use('/api/admin/ai-bff', aiBffRoutes);
  app.use('/api/ai-village', aiVillageRoutes);
  app.use('/api/macros', dailyMacroRosterTriageRoutes);
  app.use('/api/macros', dailyMacroRoutes);
  app.use('/api/hydration', hydrationRoutes);
  app.use('/api/restaurant', restaurantRoutes);
  app.use('/api/gardening', gardeningRoutes);
  app.use('/api/farms', farmFinderRoutes);
  app.use('/api/supplements', supplementRoutes);
  app.use('/api/meal-plans', mealPlanRoutes);
  app.use('/api/free', freeApiRoutes);

  const MCP_ROUTES_ENABLED = process.env.ENABLE_MCP_ROUTES === 'true';
  if (MCP_ROUTES_ENABLED) {
    app.use('/api/mcp', mcpRoutes)
  } else {
    const disabledLegacyMcpRoute = (_req, res) => res.status(410).json({
      success: false,
      message: 'Legacy MCP routes are decommissioned. Use SwanStudios API routes instead.',
      replacement: '/api/gamification, /api/workout, /api/client/analytics, /api/ai-command'
    });
    app.all('/api/mcp', disabledLegacyMcpRoute);
    app.all('/api/mcp/*', disabledLegacyMcpRoute);
  }
  app.use('/api/ai-monitoring', aiMonitoringRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/admin', adminAiUsageRoutes);
  app.use('/api', creditsRoutes);
  app.use('/api/commissions', commissionRoutes);
  app.use('/api/master-prompt', masterPromptRoutes);

  // ===================== CUSTOM PACKAGES =====================
  app.use('/api/custom-packages', customPackageRoutes);

  // ===================== PHOTO GALLERY & LEAD GENERATION =====================
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/admin/gallery', adminGalleryRoutes);

  // ===================== IMMIGRATION TRACKING (Admin Mini-App) =====================
  app.use('/api/immigration', immigrationRoutes);

  // ===================== CRM LEAD MANAGEMENT =====================
  // PRISM public capture MUST mount before the protected leadRoutes: it defines only POST /capture
  // (flag-gated, public); every other /api/leads/* falls through to the protected router below.
  app.use('/api/leads', leadCaptureRoutes);
  app.use('/api/leads', leadRoutes);

  // ===================== NASM PROTOCOL ROUTES =====================
  app.use('/api/client-progress', clientProgressRoutes);
  app.use('/api/exercises', exerciseRoutes);
  app.use('/api/recovery', recoveryRoutes);
  app.use('/api/calculators', calculatorRoutes);

  // ===================== NASM WORKOUT TRACKING SYSTEM ROUTES =====================
  // Note: client-trainer-assignments routes registered earlier to avoid conflicts
  app.use('/api/trainer-permissions', trainerPermissionsRoutes);
  app.use('/api/workout-forms', dailyWorkoutFormRoutes);

  // ===================== WEBHOOKS =====================
  app.use('/webhooks/stripe', stripeWebhookRouter);
  // Alias: Stripe dashboard is configured to POST /api/webhook/stripe
  app.use('/api/webhook/stripe', stripeWebhookRouter);
  // Prodigi print-lab status callbacks (Slice 3c) — shared-secret auth inside the router.
  app.use('/api/print/webhooks', prodigiWebhookRouter);

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

  // ===================== R2 PHOTO PROXY (BEFORE SPA FALLBACK) =====================
  // Serve photos stored in Cloudflare R2. Photos are stored with keys like
  // "photos/profiles/57/2026-03/uuid.jpg" — the browser requests /photos/...
  // which must be proxied to R2 before the SPA catch-all rejects it as a static asset.
  app.get('/photos/:category/:userId/:yearMonth/:filename', async (req, res) => {
    try {
      const { category, userId, yearMonth, filename } = req.params;
      const objectKey = `photos/${category}/${userId}/${yearMonth}/${filename}`;

      // Validate parameters
      if (!['profiles', 'banners', 'banner-collage', 'measurements', 'social', 'social-photos', 'social-videos'].includes(category) ||
          !/^\d+$/.test(userId) ||
          !/^\d{4}-\d{2}$/.test(yearMonth) ||
          !/^[\w-]+\.\w+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid photo path' });
      }

      const { r2Configured, getR2Client } = await import('../services/r2StorageService.mjs');
      if (r2Configured) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const client = getR2Client();

        const ext = filename.split('.').pop().toLowerCase();
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v' };

        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          ResponseContentType: mimeMap[ext] || 'image/jpeg',
          ResponseContentDisposition: 'inline',
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        return res.redirect(302, signedUrl);
      }

      // Fallback: try local uploads dir
      const localPath = path.join(process.cwd(), 'uploads', category, filename);
      if (existsSync(localPath)) {
        return res.sendFile(localPath);
      }

      return res.status(404).json({ error: 'Photo not found' });
    } catch (err) {
      logger.error('[PhotoProxy] Error serving photo: %s', err.message);
      return res.status(500).json({ error: 'Failed to serve photo' });
    }
  });

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
        
        // Exclude static asset requests (but allow HTML files and /photos/* proxy paths)
        if (!requestPath.startsWith('/photos/')) {
          const staticAssetPattern = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|xml|txt)$/i;
          if (staticAssetPattern.test(requestPath)) {
            return res.status(404).send('Static asset not found');
          }
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
      logger.warn('SPA fallback routing not configured because frontend dist is unavailable in this backend service.');
      logger.info(`Frontend path: ${frontendDistPath}`);
      logger.info(`Index path: ${indexPath}`);
      
      // Fallback error handler for missing frontend
      app.get('*', (req, res) => {
        const requestPath = req.path || '';
        if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }

        if (
          requestPath.includes('robots.txt') ||
          requestPath.includes('sitemap.xml') ||
          requestPath.includes('favicon.ico') ||
          requestPath.includes('.well-known')
        ) {
          return res.status(404).send('Resource not found');
        }

        if (!requestPath.startsWith('/photos/')) {
          const staticAssetPattern = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|xml|txt)$/i;
          if (staticAssetPattern.test(requestPath)) {
            return res.status(404).send('Static asset not found');
          }
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
