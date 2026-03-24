/**
 * ============================================================================
 * FILE: clientAnalyticsRoutes.mjs
 * PURPOSE: Client-safe analytics routes — userId derived from JWT, never from URL
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides /api/client/analytics/* endpoints where the
 * userId is ALWAYS derived from req.user.id (JWT token). No :userId parameter
 * in the URL prevents IDOR attacks on client-facing routes.
 *
 * HOW IT FITS IN THE APP: Client Dashboard → useClientAnalytics hook → these routes
 * KEY DECISIONS: Wraps existing analytics controller functions with JWT-derived userId.
 *   Admin/trainer routes still use /api/analytics/:userId with IDOR middleware.
 *
 * SECURITY: These routes are client-safe — users can ONLY access their own data.
 */

import express from 'express';
import {
  getStrengthProfile,
  getVolumeProgression,
  getSessionUsage,
  getClientPersonalRecords,
  getFrequencyStats,
  getAnalyticsDashboard,
  getExerciseHistory,
  getExerciseVariety
} from '../controllers/analyticsController.mjs';
import {
  getWorkoutFrequencyChart,
  getWeightProgressionChart,
  getMuscleGroupFocusChart,
  getMacroSplitChart,
  getCardioEnduranceChart,
  getSessionFrequencyChart,
  getBodyFatTrendChart,
  getMuscleRecoveryChart,
  getRPEByExerciseChart
} from '../controllers/chartDataController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Authentication gate
// PURPOSE: All client analytics routes require valid JWT
// ─────────────────────────────────────────────────────────────
router.use(protect);

// ─────────────────────────────────────────────────────────────
// SECTION: JWT userId injection middleware
// PURPOSE: Injects req.user.id as req.params.userId so existing
// controllers work without modification
// WHY: Reuses existing controller logic while eliminating IDOR risk
// ─────────────────────────────────────────────────────────────
const injectUserId = (req, res, next) => {
  req.params.userId = String(req.user.id);
  next();
};

router.use(injectUserId);

// ─────────────────────────────────────────────────────────────
// SECTION: Core analytics endpoints (client-safe, no :userId)
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/client/analytics/dashboard
 * @desc    Comprehensive analytics dashboard for logged-in user
 * @access  Any authenticated user (own data only)
 */
router.get('/dashboard', getAnalyticsDashboard);

/**
 * @route   GET /api/client/analytics/strength-profile
 * @desc    Strength profile radar chart data
 * @access  Any authenticated user (own data only)
 */
router.get('/strength-profile', getStrengthProfile);

/**
 * @route   GET /api/client/analytics/volume-progression
 * @desc    Volume progression over time
 * @access  Any authenticated user (own data only)
 */
router.get('/volume-progression', getVolumeProgression);

/**
 * @route   GET /api/client/analytics/session-usage
 * @desc    Session usage stats (solo vs trainer-led)
 * @access  Any authenticated user (own data only)
 */
router.get('/session-usage', getSessionUsage);

/**
 * @route   GET /api/client/analytics/personal-records
 * @desc    Personal records with Brzycki 1RM estimates
 * @access  Any authenticated user (own data only)
 */
router.get('/personal-records', getClientPersonalRecords);

/**
 * @route   GET /api/client/analytics/frequency
 * @desc    Workout frequency stats
 * @access  Any authenticated user (own data only)
 */
router.get('/frequency', getFrequencyStats);

/**
 * @route   GET /api/client/analytics/exercise-history
 * @desc    All-time exercise stats from materialized view
 * @access  Any authenticated user (own data only)
 */
router.get('/exercise-history', getExerciseHistory);

/**
 * @route   GET /api/client/analytics/exercise-variety
 * @desc    Exercise variety stats for gamification
 * @access  Any authenticated user (own data only)
 */
router.get('/exercise-variety', getExerciseVariety);

// ─────────────────────────────────────────────────────────────
// SECTION: Victory chart data endpoints (client-safe)
// PURPOSE: Pre-shaped data for each Victory chart component
// ─────────────────────────────────────────────────────────────

/** @route GET /api/client/analytics/chart-workout-frequency */
router.get('/chart-workout-frequency', getWorkoutFrequencyChart);

/** @route GET /api/client/analytics/chart-weight-progression */
router.get('/chart-weight-progression', getWeightProgressionChart);

/** @route GET /api/client/analytics/chart-muscle-group-focus */
router.get('/chart-muscle-group-focus', getMuscleGroupFocusChart);

/** @route GET /api/client/analytics/chart-macro-split */
router.get('/chart-macro-split', getMacroSplitChart);

/** @route GET /api/client/analytics/chart-cardio-endurance */
router.get('/chart-cardio-endurance', getCardioEnduranceChart);

/** @route GET /api/client/analytics/chart-session-frequency */
router.get('/chart-session-frequency', getSessionFrequencyChart);

/** @route GET /api/client/analytics/chart-body-fat-trend */
router.get('/chart-body-fat-trend', getBodyFatTrendChart);

/** @route GET /api/client/analytics/chart-muscle-recovery */
router.get('/chart-muscle-recovery', getMuscleRecoveryChart);

/** @route GET /api/client/analytics/chart-rpe-by-exercise */
router.get('/chart-rpe-by-exercise', getRPEByExerciseChart);

export default router;
