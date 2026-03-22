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
import { protect, authorize, requireOwnershipOrTrainer } from '../middleware/authMiddleware.mjs';

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
// PURPOSE: All-time exercise history + variety stats from materialized view
// WHY: Powers Exercise Rolodex full-page chart + gamification variety score
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/:userId/exercise-history
 * @desc    Get all-time exercise stats (frequency, volume, PRs) via MV
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
// SECTION: Victory chart data endpoints (9 charts)
// PURPOSE: Pre-shaped data for each Victory chart component
// WHY: Server-side aggregation — frontend receives chart-ready arrays
// ─────────────────────────────────────────────────────────────

router.get('/:userId/chart-workout-frequency', requireOwnershipOrTrainer, getWorkoutFrequencyChart);
router.get('/:userId/chart-weight-progression', requireOwnershipOrTrainer, getWeightProgressionChart);
router.get('/:userId/chart-muscle-group-focus', requireOwnershipOrTrainer, getMuscleGroupFocusChart);
router.get('/:userId/chart-macro-split', requireOwnershipOrTrainer, getMacroSplitChart);
router.get('/:userId/chart-cardio-endurance', requireOwnershipOrTrainer, getCardioEnduranceChart);
router.get('/:userId/chart-session-frequency', requireOwnershipOrTrainer, getSessionFrequencyChart);
router.get('/:userId/chart-body-fat-trend', requireOwnershipOrTrainer, getBodyFatTrendChart);
router.get('/:userId/chart-muscle-recovery', requireOwnershipOrTrainer, getMuscleRecoveryChart);
router.get('/:userId/chart-rpe-by-exercise', requireOwnershipOrTrainer, getRPEByExerciseChart);

export default router;
