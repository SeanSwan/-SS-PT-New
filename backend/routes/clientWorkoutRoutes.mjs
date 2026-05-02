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
// L1 (2026-05-01): plan-shape helpers live in a shared service so this
// route and workoutPlanRoutes share one transformation layer (REV 3 §C2).
// L1 REV 2 (2026-05-02, Codex follow-up): the existing route-level
// re-exports were dropped — the only consumer was the test file at
// clientWorkoutRoutes.current.test.mjs:28, which now imports directly from
// the shared service.
import { toCurrentWorkoutPlanResponse } from '../services/workoutPlanShapeService.mjs';

const router = express.Router();

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

// Plan-shape helpers live in ../services/workoutPlanShapeService.mjs.
// Import them directly from the service in tests and other consumers —
// the L1 REV 2 (2026-05-02) cleanup removed the route-level re-exports
// after the test file was updated to point at the shared service.

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
