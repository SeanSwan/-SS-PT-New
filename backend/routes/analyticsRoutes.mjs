/**
 * ============================================================================
 * FILE: analyticsRoutes.mjs
 * PURPOSE: Analytics API routes with IDOR-protected ownership checks
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22 (CRITICAL IDOR fix applied)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines REST routes for client analytics data.
 * All /:userId endpoints are protected by requireOwnershipOrTrainer middleware
 * so users can only access their own data (or trainer/admin can access clients).
 *
 * HOW IT FITS IN THE APP: Express router → mounted at /api/analytics
 * KEY DECISIONS: IDOR middleware applied at router level for all :userId routes
 */
import express from 'express';
import {
  getStrengthProfile,
  getVolumeProgression,
  getSessionUsage,
  getClientPersonalRecords,
  getFrequencyStats,
  getNASMProgress,
  getNASMRecommendations,
  getAnalyticsDashboard,
  getExerciseHistory,
  getExerciseVariety
} from '../controllers/analyticsController.mjs';
import {
  // Phase 14 canonical 12 (same functions mounted under :userId for admin/trainer view)
  getWorkoutFrequencyChart,
  getAttendanceReliabilityChart,
  getWeeklyVolumeChart,
  getSetsRepsTrendChart,
  getDurationTrendChart,
  getIntensityRPETrendChart,
  getPRTimelineChart,
  getAnchorLiftsChart,
  getExerciseFrequencyChart,
  getMovementPatternBalanceChart,
  getMuscleGroupBalanceChart,
  getRecoverySignalChart,
  getEstOneRmTrendChart,
  getExerciseTimelineChart,
  getWeeklyRingSourceChart,
  // Legacy-but-truthful body-composition endpoints
  getWeightProgressionChart,
  getBodyFatTrendChart,
  getMacroSplitChart,
  // Phase 14 deprecated — routed but return empty
} from '../controllers/chartDataController.mjs';
import { getNextBestActionHandler } from '../controllers/progressPulseController.mjs';
import { protect, authorize, requireOwnershipOrTrainer } from '../middleware/authMiddleware.mjs';
import { requireTier } from '../middleware/requireTier.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Authentication gate
// PURPOSE: All analytics routes require valid JWT
// ─────────────────────────────────────────────────────────────
router.use(protect);

// ─────────────────────────────────────────────────────────────
// SECTION: Non-parameterized routes (no :userId — no IDOR risk)
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/nasm-recommendations/:level
 * @desc    Get NASM phase recommendations by level
 * @access  Any authenticated user
 */
router.get('/nasm-recommendations/:level', getNASMRecommendations);

// ─────────────────────────────────────────────────────────────
// SECTION: IDOR-protected :userId routes
// PURPOSE: All routes below check ownership (self, trainer, or admin)
// WHY: AI Village CRITICAL finding — prevents unauthorized data access
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/:userId/dashboard
 * @desc    Get comprehensive analytics dashboard
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/dashboard', requireOwnershipOrTrainer, getAnalyticsDashboard);

/**
 * @route   GET /api/analytics/:userId/strength-profile
 * @desc    Get strength profile for radar chart
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/strength-profile', requireOwnershipOrTrainer, getStrengthProfile);

/**
 * @route   GET /api/analytics/:userId/volume-progression
 * @desc    Get volume progression over time
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/volume-progression', requireOwnershipOrTrainer, getVolumeProgression);

/**
 * @route   GET /api/analytics/:userId/session-usage
 * @desc    Get session usage statistics (solo vs trainer-led)
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/session-usage', requireOwnershipOrTrainer, getSessionUsage);

/**
 * @route   GET /api/analytics/:userId/personal-records
 * @desc    Get personal records
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/personal-records', requireOwnershipOrTrainer, getClientPersonalRecords);

/**
 * @route   GET /api/analytics/:userId/frequency
 * @desc    Get workout frequency statistics
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/frequency', requireOwnershipOrTrainer, getFrequencyStats);

/**
 * @route   GET /api/analytics/:userId/nasm-progress
 * @desc    Get NASM progression status
 * @access  Trainer (assigned), Admin
 */
router.get('/:userId/nasm-progress', requireOwnershipOrTrainer, authorize(['admin', 'trainer']), getNASMProgress);

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Rolodex endpoints
// PURPOSE: All-time exercise history + variety stats from workout logs
// WHY: Powers Exercise Rolodex full-page chart + gamification variety score
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/:userId/exercise-history
 * @desc    Get all-time exercise stats (frequency, volume, PRs) from workout logs
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/exercise-history', requireOwnershipOrTrainer, getExerciseHistory);

/**
 * @route   GET /api/analytics/:userId/exercise-variety
 * @desc    Get exercise variety stats for gamification (new this month, muscle groups)
 * @access  Owner, Trainer (assigned), Admin
 */
router.get('/:userId/exercise-variety', requireOwnershipOrTrainer, getExerciseVariety);

// ─────────────────────────────────────────────────────────────
// SECTION: Victory chart data endpoints (9 charts — Guardian+)
// PURPOSE: Pre-shaped data for each Victory chart component
// WHY: Server-side aggregation — frontend receives chart-ready arrays
// TIER: pro (Guardian) — full analytics gallery is a premium feature
// ─────────────────────────────────────────────────────────────

// Phase 14 canonical 12 — parameterized :userId admin/trainer routes.
// Same tier gate + ownership check; same controller functions. The
// canonical client-facing routes live in `clientAnalyticsRoutes.mjs`
// under `/api/client/analytics/*` without a `:userId` in the URL.
// Slice 8.5 — coach-voiced next-best-action for the admin/trainer surface.
router.get('/:userId/next-best-action',               requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getNextBestActionHandler);

router.get('/:userId/chart-workout-frequency',        requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getWorkoutFrequencyChart);
router.get('/:userId/chart-attendance-reliability',   requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getAttendanceReliabilityChart);
router.get('/:userId/chart-weekly-volume',            requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getWeeklyVolumeChart);
router.get('/:userId/chart-sets-reps-trend',          requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getSetsRepsTrendChart);
router.get('/:userId/chart-duration-trend',           requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getDurationTrendChart);
router.get('/:userId/chart-intensity-rpe-trend',      requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getIntensityRPETrendChart);
router.get('/:userId/chart-pr-timeline',              requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getPRTimelineChart);
router.get('/:userId/chart-anchor-lifts',             requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getAnchorLiftsChart);
router.get('/:userId/chart-exercise-frequency',       requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getExerciseFrequencyChart);
router.get('/:userId/chart-movement-pattern-balance', requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getMovementPatternBalanceChart);
router.get('/:userId/chart-muscle-group-balance',     requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getMuscleGroupBalanceChart);
router.get('/:userId/chart-recovery-signal',          requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getRecoverySignalChart);
router.get('/:userId/chart-est-one-rm',               requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getEstOneRmTrendChart);
router.get('/:userId/exercise-timeline',              requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getExerciseTimelineChart);
router.get('/:userId/ring-weekly-source',             requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getWeeklyRingSourceChart);

// Legacy body-composition (truthful, unchanged)
router.get('/:userId/chart-weight-progression', requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getWeightProgressionChart);
router.get('/:userId/chart-body-fat-trend',     requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getBodyFatTrendChart);
router.get('/:userId/chart-macro-split',        requireTier('pro', 'charts.full'), requireOwnershipOrTrainer, getMacroSplitChart);

export default router;
