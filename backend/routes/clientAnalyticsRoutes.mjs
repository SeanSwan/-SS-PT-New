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
  // Phase 14 canonical 12 (workout/attendance-driven)
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
  // Legacy-but-truthful body-composition endpoints (other consumers)
  getWeightProgressionChart,
  getBodyFatTrendChart,
  getMacroSplitChart,
  // Phase 14 deprecated — return empty arrays to avoid 404 on legacy callers
} from '../controllers/chartDataController.mjs';
import { getNbaLiteHandler, getProgressPulseHandler, getWorkoutDayHandler, getWorkoutWeekHandler } from '../controllers/progressPulseController.mjs';
import { getRecoveryBoardHandler, postRecoveryCompletionHandler } from '../controllers/recoveryBoardController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { requireFeature } from '../middleware/requireTier.mjs';

const router = express.Router();
const requireGuardianAnalytics = requireFeature('analytics.advanced');
// D2 (Sean lock 2026-07-06): the teaser pair is Starter-visible; the key
// exists for the named contract + source locks (tier 'free' never 402s).
const requireTeaserAnalytics = requireFeature('analytics.teaser');

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
 * @desc    All-time exercise stats from workout logs
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
// SECTION: Phase 14 canonical client-progress chart endpoints (12)
//
// These 12 endpoints power the canonical `/dashboard/client/progress`
// route. Every single one reads from the truthful snake_case tables
// (`workout_logs`, `workout_sessions`, `body_measurements`) — no
// PascalCase joins, no demo data, no preview fallbacks. See
// `chartDataController.mjs` section header for the Phase 14 rebuild
// rationale and per-chart source-of-truth documentation.
//
// ENTITLEMENT: These are the Swan Guardian advanced progress cockpit. The
// frontend hides/locks this surface for Starter users, but this server-side gate
// is the source of truth so direct API calls cannot bypass the Ascension promise.
// A live 30-day premium trial is treated as eligible by requireTier.mjs.
// ─────────────────────────────────────────────────────────────

/** @route GET /api/client/analytics/progress-pulse (Slice 8.1 — Progress Intelligence) */
router.get('/progress-pulse', requireGuardianAnalytics, getProgressPulseHandler);
// D1 (Sean 2026-07-06): free-tier NBA rungs 1-3 — deliberately NO tier gate.
router.get('/nba-lite', getNbaLiteHandler);

// 4B.2/4B.3 (launch charter): Recovery Board — deterministic zero-LLM guidance
// + completion log. Guidance class, deliberately un-tier-gated (like nba-lite).
router.get('/recovery-board', getRecoveryBoardHandler);
router.post('/recovery-board/complete', postRecoveryCompletionHandler);

// Charter v3 P1: self-service plan-queue runway (days of programmed work left).
router.get('/plan-queue', async (req, res) => {
  try {
    const { getPlanQueueDepth } = await import('../services/planQueueService.mjs');
    const queue = await getPlanQueueDepth(Number(req.user?.id));
    return res.status(200).json({ success: true, queue });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not compute plan queue depth' });
  }
});

/** @route GET /api/client/analytics/workout-day?md=MM/DD (Slice 8.4 — chart drill-down) */
router.get('/workout-day', requireGuardianAnalytics, getWorkoutDayHandler);

/** @route GET /api/client/analytics/workout-week?md=MM/DD (Slice 9 — weekly drill-down) */
router.get('/workout-week', requireGuardianAnalytics, getWorkoutWeekHandler);

/** @route GET /api/client/analytics/chart-workout-frequency    (Phase 14 #1) */
router.get('/chart-workout-frequency', requireTeaserAnalytics, getWorkoutFrequencyChart);

/** @route GET /api/client/analytics/chart-attendance-reliability (Phase 14 #2) */
router.get('/chart-attendance-reliability', requireGuardianAnalytics, getAttendanceReliabilityChart);

/** @route GET /api/client/analytics/chart-weekly-volume          (Phase 14 #3) */
router.get('/chart-weekly-volume', requireTeaserAnalytics, getWeeklyVolumeChart);

/** @route GET /api/client/analytics/chart-sets-reps-trend        (Phase 14 #4) */
router.get('/chart-sets-reps-trend', requireGuardianAnalytics, getSetsRepsTrendChart);

/** @route GET /api/client/analytics/chart-duration-trend         (Phase 14 #5) */
router.get('/chart-duration-trend', requireGuardianAnalytics, getDurationTrendChart);

/** @route GET /api/client/analytics/chart-intensity-rpe-trend    (Phase 14 #6) */
router.get('/chart-intensity-rpe-trend', requireGuardianAnalytics, getIntensityRPETrendChart);

/** @route GET /api/client/analytics/chart-pr-timeline            (Phase 14 #7) */
router.get('/chart-pr-timeline', requireGuardianAnalytics, getPRTimelineChart);

/** @route GET /api/client/analytics/chart-anchor-lifts           (Phase 14 #8) */
router.get('/chart-anchor-lifts', requireGuardianAnalytics, getAnchorLiftsChart);

/** @route GET /api/client/analytics/chart-exercise-frequency     (Phase 14 #9) */
router.get('/chart-exercise-frequency', requireGuardianAnalytics, getExerciseFrequencyChart);

/** @route GET /api/client/analytics/chart-movement-pattern-balance (Phase 14 #10) */
router.get('/chart-movement-pattern-balance', requireGuardianAnalytics, getMovementPatternBalanceChart);

/** @route GET /api/client/analytics/chart-muscle-group-balance   (Phase 14 #11) */
router.get('/chart-muscle-group-balance', requireGuardianAnalytics, getMuscleGroupBalanceChart);

/** @route GET /api/client/analytics/chart-recovery-signal        (Phase 14 #12) */
router.get('/chart-recovery-signal', requireGuardianAnalytics, getRecoverySignalChart);

/** @route GET /api/client/analytics/chart-est-one-rm — weekly best Brzycki
 * est-1RM for the client's most-logged lift (charter v3 4c, Guardian-gated).
 * NOTE: chart-weight-progression / chart-body-fat-trend below stay UNGATED —
 * pre-existing consumers (useClientAnalytics gallery) depend on them; gating
 * is a one-line flip here if Sean tightens the tier decision later. */
router.get('/chart-est-one-rm', requireGuardianAnalytics, getEstOneRmTrendChart);

/** @route GET /api/client/analytics/exercise-timeline?exercise=NAME — the
 * Workout Rolodex drill (charter v3 4d): per-day heaviest set + set count
 * for one exercise across the client's full logged history. */
router.get('/exercise-timeline', requireGuardianAnalytics, getExerciseTimelineChart);

/** @route GET /api/client/analytics/ring-weekly-source — per-session facts
 * (raw ts + volume + duration) for the Apex Ascension Rings; the client
 * buckets the user-LOCAL week. Same tier gate as chart-weekly-volume so
 * this cannot bypass the gated weekly-volume data class. */
router.get('/ring-weekly-source', requireTeaserAnalytics, getWeeklyRingSourceChart);

// ─────────────────────────────────────────────────────────────
// SECTION: Legacy body-composition chart endpoints (truthful)
// Kept unchanged — used by the user profile / admin gallery, not part
// of the canonical 12. `body_measurements` and `daily_macro_logs` are
// the right snake_case tables.
// ─────────────────────────────────────────────────────────────

/** @route GET /api/client/analytics/chart-weight-progression */
router.get('/chart-weight-progression', getWeightProgressionChart);

/** @route GET /api/client/analytics/chart-body-fat-trend */
router.get('/chart-body-fat-trend', getBodyFatTrendChart);

/** @route GET /api/client/analytics/chart-macro-split */
router.get('/chart-macro-split', getMacroSplitChart);

// ─────────────────────────────────────────────────────────────
// SECTION: Deprecated Phase 14 aliases — return empty arrays
// These five endpoints used to rely on non-existent PascalCase tables
// (`"WorkoutSessions"`, `"WorkoutExercises"`, `"Exercises"`, `"Sets"`)
// and silently returned [] for every real user. They remain routed so
// any cached frontend bundle still running the old contract gets a
// valid 200 response instead of a 404 — but the payload is explicitly
// empty and tagged with the canonical replacement. Phase 15+ may
// remove these entirely once all consumers have migrated.
// ─────────────────────────────────────────────────────────────

export default router;
