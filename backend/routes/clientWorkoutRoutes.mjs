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

const toPlainObject = (value) => (value?.toJSON ? value.toJSON() : value);

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toExerciseName = (entry) => (
  entry?.exerciseName
  || entry?.name
  || entry?.exercise?.name
  || entry?.exercise?.exerciseName
  || 'Unknown Exercise'
);

const toCurrentPlanExercise = (entry, index) => {
  const exercise = toPlainObject(entry) || {};
  const name = toExerciseName(exercise);

  return {
    id: exercise.id || exercise.exerciseId || `plan-exercise-${index + 1}`,
    exerciseId: exercise.exerciseId || exercise.id || null,
    name,
    exerciseName: name,
    sets: exercise.sets ?? exercise.setScheme ?? 3,
    reps: exercise.reps ?? exercise.targetReps ?? exercise.repGoal ?? '10',
    targetReps: exercise.targetReps ?? exercise.reps ?? exercise.repGoal ?? '10',
    restSeconds: exercise.restSeconds ?? exercise.restTime ?? exercise.restPeriod ?? null,
    restTime: exercise.restTime ?? exercise.restSeconds ?? exercise.restPeriod ?? 60,
    tempo: exercise.tempo || '',
    notes: exercise.notes || '',
    videoUrl: exercise.videoUrl || exercise.exercise?.videoUrl || null,
  };
};

export const planDataToWorkoutDays = (planData, currentWeek = 1) => {
  const data = toPlainObject(planData) || {};
  const weeks = Array.isArray(data.weeks) ? data.weeks : [];
  const weekIndex = Math.max(toPositiveInteger(currentWeek, 1) - 1, 0);
  const currentWeekData = weeks[weekIndex] || weeks[0] || null;

  const entries = (
    (currentWeekData && (currentWeekData.days || currentWeekData.sessions))
    || data.days
    || data.sessions
    || data.weeklySchedule
    || []
  );

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry, index) => {
    const day = toPlainObject(entry) || {};
    const dayNumber = toPositiveInteger(day.dayNumber ?? day.day ?? index + 1, index + 1);
    const dayName = day.dayName || day.dayLabel || day.name || `Day ${dayNumber}`;
    const exercises = Array.isArray(day.exercises) ? day.exercises : [];

    return {
      id: day.id || `plan-day-${dayNumber}`,
      dayNumber,
      dayName,
      name: day.name || dayName,
      focus: day.focus || day.category || null,
      exercises: exercises.map(toCurrentPlanExercise),
    };
  });
};

export const toCurrentWorkoutPlanResponse = (plan) => {
  const raw = toPlainObject(plan) || {};
  const planData = raw.planData || raw.plan_data || { weeks: [] };
  const days = planDataToWorkoutDays(planData, raw.currentWeek);

  return {
    id: raw.id,
    name: raw.title,
    title: raw.title,
    description: raw.description,
    createdAt: raw.createdAt,
    durationWeeks: raw.durationWeeks,
    difficulty: raw.difficulty,
    tags: raw.tags || [],
    currentWeek: raw.currentWeek,
    currentDay: raw.currentDay,
    planData,
    days,
    frequency: `${raw.durationWeeks || 0} weeks`,
    duration: days.length ? `${days.length} days/week` : 'Custom',
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

    return res.status(200).json({
      success: true,
      data: formattedPlan,
      plan: formattedPlan
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
