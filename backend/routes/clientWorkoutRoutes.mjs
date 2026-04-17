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
    const { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise } = models;

    // Find the most recent active workout plan for this user
    let plan = null;

    if (WorkoutPlan) {
      plan = await WorkoutPlan.findOne({
        where: {
          userId: clientId,
          status: 'active'
        },
        order: [['createdAt', 'DESC']],
        include: WorkoutPlanDay ? [{
          model: WorkoutPlanDay,
          as: 'days',
          include: WorkoutPlanDayExercise ? [{
            model: WorkoutPlanDayExercise,
            as: 'exercises',
            include: Exercise ? [{
              model: Exercise,
              as: 'exercise'
            }] : []
          }] : []
        }] : []
      });
    }

    if (!plan) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.'
      });
    }

    // Format the response
    const formattedPlan = {
      id: plan.id,
      name: plan.title,
      description: plan.description,
      createdAt: plan.createdAt,
      durationWeeks: plan.durationWeeks,
      difficulty: plan.difficulty,
      tags: plan.tags || [],
      days: plan.days?.map(day => ({
        id: day.id,
        dayNumber: day.dayNumber,
        name: day.name,
        exercises: day.exercises?.map(ex => ({
          id: ex.id,
          name: ex.exercise?.name || ex.exerciseName || 'Unknown Exercise',
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          videoUrl: ex.exercise?.videoUrl
        })) || []
      })) || [],
      frequency: `${plan.durationWeeks} weeks`,
      duration: plan.days?.length ? `${plan.days.length} days/week` : 'Custom'
    };

    return res.status(200).json({
      success: true,
      data: formattedPlan
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
