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
// L1 REV 2 (2026-05-02, Codex follow-up): plan shape stays in the shared
// service. The history-row mapper lives in a shared service for route/tests.
import { toCurrentWorkoutPlanResponse } from '../services/workoutPlanShapeService.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';
import { buildClientTrainingAssignmentPicker } from '../services/clientTrainingAssignmentPickerService.mjs';
import { readAssignmentCompletionContext } from '../services/clientTrainingAssignmentCompletionService.mjs';
import { toClientWorkoutHistoryRow as mapClientWorkoutHistoryRow } from '../services/clientWorkoutHistoryRowService.mjs';
import { selectCurrentWorkoutPlan } from '../services/workoutPlanRouteHelpers.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'INTERNAL_ERROR';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  code: INTERNAL_ERROR,
});

const parseBoundedPositiveInteger = (value, { defaultValue, maxValue }) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: defaultValue };
  }

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    return { ok: false };
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false };
  }

  return { ok: true, value: Math.min(parsed, maxValue) };
};

const currentDateOnly = () => new Date().toISOString().slice(0, 10);

// Workout-history row mapping lives in clientWorkoutHistoryRowService.mjs.

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
    const { WorkoutPlan, DailyWorkoutForm } = models;
    const today = currentDateOnly();

    let plan = null;
    let clientPlans = [];

    if (WorkoutPlan) {
      plan = await WorkoutPlan.findOne({
        where: { userId: clientId, status: 'active' },
        order: [['createdAt', 'DESC']],
      });
      if (typeof WorkoutPlan.findAll === 'function') {
        clientPlans = await WorkoutPlan.findAll({
          where: { userId: clientId, status: ['active', 'paused', 'draft'] },
          order: [['updatedAt', 'DESC']],
          limit: 20,
        });
      }
    }
    plan = selectCurrentWorkoutPlan(plan, clientPlans);
    const completionContext = await readAssignmentCompletionContext(DailyWorkoutForm, {
      clientId,
      date: today,
      onDateLookupError: (error) => logger.warn(
        'Daily workout planned-assignment completion lookup failed:',
        error.message,
      ),
      onRecentLookupError: (error) => logger.warn(
        'Daily workout recent homework completion lookup failed:',
        error.message,
      ),
    });

    if (!plan) {
      const overview = buildClientTrainingOverview({
        activePlan: null,
        plans: clientPlans,
        today,
        recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
      });
      const assignmentPicker = buildClientTrainingAssignmentPicker({
        plans: clientPlans,
        today,
        assignmentCompletions: completionContext.assignmentCompletions,
      });
      return res.status(200).json({
        success: true,
        data: null,
        plan: null,
        todayAssignment: overview.todayAssignment,
        trainingPlanCatalog: overview.trainingPlanCatalog,
        homeworkSummary: overview.homeworkSummary,
        assignmentPicker,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.',
      });
    }

    const formattedPlan = toCurrentWorkoutPlanResponse(plan);
    const currentSession = formattedPlan.currentSession || null;
    const overview = buildClientTrainingOverview({
      activePlan: plan,
      plans: clientPlans.length > 0 ? clientPlans : [plan],
      currentSession,
      today,
      assignmentCompletions: completionContext.assignmentCompletions,
      recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
    });
    const assignmentPicker = buildClientTrainingAssignmentPicker({
      plans: clientPlans.length > 0 ? clientPlans : [plan],
      today,
      assignmentCompletions: completionContext.assignmentCompletions,
    });
    const enrichedPlan = {
      ...formattedPlan,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
      homeworkSummary: overview.homeworkSummary,
      assignmentPicker,
    };

    return res.status(200).json({
      success: true,
      data: enrichedPlan,
      plan: enrichedPlan,
      currentSession,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
      homeworkSummary: overview.homeworkSummary,
      assignmentPicker,
    });
  } catch (error) {
    logger.error('Error fetching current workout:', error);
    return sendInternalError(res, 'Server error fetching workout plan');
  }
});

/**
 * GET /api/workouts/:userId/history
 * Get the client's workout history.
 */
router.get('/:userId/history', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { WorkoutSession, Session, DailyWorkoutForm } = models;
    // Cap history reads at 100 so the DailyWorkoutForm JSONB join cannot
    // become an unbounded dashboard query.
    const parsedLimit = parseBoundedPositiveInteger(req.query.limit, {
      defaultValue: 10,
      maxValue: 100,
    });
    if (!parsedLimit.ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit',
      });
    }
    const { value: limit } = parsedLimit;

    let history = [];

    // Try WorkoutSession model first. Filter to completed sessions so
    // planned/in-progress rows never render as history cards.
    //
    // Phase 1 Slice 1.2 (2026-05-03): include the dailyForms
    // association so the mapper can derive exerciseCount from
    // formData.exercises.length. WorkoutSession.totalSets is the
    // count of SETS, not exercises — they're not interchangeable.
    // The mapper falls back gracefully if dailyForms isn't joined
    // (e.g. if the model isn't available in this models bundle).
    if (WorkoutSession) {
      const include = [];
      if (DailyWorkoutForm) {
        // Slice 1.2 Codex R1 LOW: ORDER the included dailyForms by
        // createdAt DESC so the mapper's `dailyForms[0]` selection
        // is deterministic when multiple forms exist for the same
        // session (race conditions, manual writes, etc.). The
        // route-level 409 guard makes duplicates rare in practice,
        // but a deterministic order is cheap insurance.
        include.push({
          model: DailyWorkoutForm,
          as: 'dailyForms',
          attributes: ['id', 'formData', 'createdAt'],
          required: false,
          separate: true,
          // Secondary sort on `id DESC` is the tie-breaker — when
          // two forms share createdAt to the millisecond, primary-key
          // order is the deterministic fallback. Codex Slice 1.2 R2
          // LOW caught the missing tie-breaker.
          order: [['createdAt', 'DESC'], ['id', 'DESC']],
          limit: 1,
        });
      }
      const sessions = await WorkoutSession.findAll({
        where: { userId: clientId, status: 'completed' },
        order: [['completedAt', 'DESC']],
        limit,
        attributes: ['id', 'title', 'date', 'completedAt', 'createdAt', 'duration', 'totalSets'],
        include,
      });
      history = sessions.map(mapClientWorkoutHistoryRow);
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
    return sendInternalError(res, 'Server error fetching workout history');
  }
});

export default router;
