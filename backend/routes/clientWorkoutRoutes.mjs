/**
 * Client Workout Routes
 * =====================
 * API endpoints for client workout data
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';
// L1 (2026-05-01): plan-shape helpers migrated to a shared service so this
// route and workoutPlanRoutes share one transformation layer. See REV 3
// receipt §C2. Re-exported below for backwards compat with existing test
// (clientWorkoutRoutes.current.test.mjs:28 imports planDataToWorkoutDays).
import {
  planDataToWorkoutDays as _planDataToWorkoutDays,
  toCurrentWorkoutPlanResponse as _toCurrentWorkoutPlanResponse,
  extractCurrentSession,
} from '../services/workoutPlanShapeService.mjs';

const router = express.Router();

// Re-exports for backwards compat. Existing test file imports these
// directly from this route module (line 28 of the test).
export const planDataToWorkoutDays = _planDataToWorkoutDays;
export const toCurrentWorkoutPlanResponse = _toCurrentWorkoutPlanResponse;

// ─────────────────────────────────────────────────────────────
// Workout-history row mapper (exported for unit tests)
// Matches the real WorkoutSession schema written by workoutLogService
// (title, duration, totalSets, completedAt) — NOT the stale legacy
// fields (workoutName, durationMinutes, exercisesCompleted) which
// never existed on the model and silently rendered blank cards.
// ─────────────────────────────────────────────────────────────
export const toClientWorkoutHistoryRow = (session) => {
  const raw = session?.toJSON ? session.toJSON() : session;
  const duration = Number.isFinite(raw?.duration) ? raw.duration : null;
  const totalSets = Number.isFinite(raw?.totalSets) ? raw.totalSets : 0;
  const dateValue = raw?.completedAt || raw?.date || raw?.createdAt || null;
  return {
    id: raw?.id,
    name: (raw?.title && String(raw.title).trim()) || 'Workout',
    date: dateValue,
    duration: duration && duration > 0 ? `${duration} min` : null,
    exercises: totalSets,
  };
};

// (Plan-shape helpers were migrated to ../services/workoutPlanShapeService.mjs
// in L1, 2026-05-01. They are re-exported above for backwards compat with
// existing tests that import them directly from this route file.)

/**
 * GET /api/workouts/:userId/current
 * Get the client's currently active workout plan
 */
router.get('/:userId/current', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { WorkoutPlan } = models;

    // Find the most recent active workout plan for this user
    let plan = null;

    if (WorkoutPlan) {
      plan = await WorkoutPlan.findOne({
        where: {
          userId: clientId,
          status: 'active'
        },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!plan) {
      return res.status(200).json({
        success: true,
        data: null,
        plan: null,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.'
      });
    }

    const formattedPlan = toCurrentWorkoutPlanResponse(plan);
    // L1 (REV 3 §C4): currentSession is embedded inside formattedPlan
    // (so data.currentSession AND plan.currentSession both expose it)
    // AND lifted to top level for direct access.
    const currentSession = formattedPlan.currentSession || null;

    return res.status(200).json({
      success: true,
      data: formattedPlan,
      plan: formattedPlan,
      currentSession,
    });
  } catch (error) {
    logger.error('Error fetching current workout:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching workout plan',
      error: error.message
    });
  }
});

/**
 * GET /api/workouts/:userId/history
 * Get the client's workout history (completed sessions)
 */
router.get('/:userId/history', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { WorkoutSession, Session } = models;
    const limit = parseInt(req.query.limit) || 10;

    let history = [];

    // Try WorkoutSession model first. Filter to completed sessions so
    // planned/in-progress rows never render as history cards.
    if (WorkoutSession) {
      const sessions = await WorkoutSession.findAll({
        where: { userId: clientId, status: 'completed' },
        order: [['completedAt', 'DESC']],
        limit,
        attributes: ['id', 'title', 'date', 'completedAt', 'createdAt', 'duration', 'totalSets'],
      });
      history = sessions.map(toClientWorkoutHistoryRow);
    }

    // Also check completed training sessions
    if (Session && history.length < limit) {
      const trainingSessions = await Session.findAll({
        where: {
          userId: clientId,
          status: 'completed'
        },
        order: [['sessionDate', 'DESC']],
        limit: limit - history.length
      });

      const sessionHistory = trainingSessions.map(s => ({
        id: s.id,
        name: 'Training Session',
        date: s.sessionDate,
        duration: s.duration ? `${s.duration} min` : null,
        type: 'session'
      }));

      history = [...history, ...sessionHistory];
    }

    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching workout history:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching workout history',
      error: error.message
    });
  }
});

export default router;
