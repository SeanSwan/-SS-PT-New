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
import { planDataToAllWeeks, toCurrentWorkoutPlanResponse } from '../services/workoutPlanShapeService.mjs';
import { resolveDayForDate } from '../services/planDayResolver.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';
import { buildClientTrainingAssignmentPicker } from '../services/clientTrainingAssignmentPickerService.mjs';
import { readAssignmentCompletionContext } from '../services/clientTrainingAssignmentCompletionService.mjs';
import { toClientWorkoutHistoryRow as mapClientWorkoutHistoryRow } from '../services/clientWorkoutHistoryRowService.mjs';
import {
  normalizeWorkoutPlanId,
  selectCurrentWorkoutPlan,
} from '../services/workoutPlanRouteHelpers.mjs';
import { resolveClientTrainingDateContext } from '../services/clientTrainingDateService.mjs';
import { getWorkoutPlanPdfDerivativeStatusesForPlans } from '../services/workoutPlanPdfDerivativeService.mjs';

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

    const { clientId, client, models } = access;
    const { WorkoutPlan, DailyWorkoutForm } = models;
    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client?.timeZone,
      storedTimeZoneConfigured: client?.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: clientId,
    });
    const today = trainingDateContext.localDate;

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
    const overviewPlanRows = clientPlans.length > 0 ? clientPlans : plan ? [plan] : [];
    const planIds = overviewPlanRows
      .map((row) => String((row.toJSON?.() ?? row)?.id || ''))
      .filter(Boolean);
    let pdfStatuses;
    try {
      pdfStatuses = await getWorkoutPlanPdfDerivativeStatusesForPlans({
        sequelize: WorkoutPlan?.sequelize,
        planIds,
      });
    } catch (error) {
      logger.warn('Plan PDF derivative status lookup failed:', error.message);
      pdfStatuses = Object.fromEntries(planIds.map((planId) => [
        planId,
        { enabled: true, state: 'unavailable' },
      ]));
    }
    const plansWithPdfStatus = overviewPlanRows.map((row) => {
      const raw = row.toJSON?.() ?? row;
      return { ...raw, pdfDerivative: pdfStatuses[String(raw.id)] || null };
    });
    const activePlanWithPdfStatus = plan
      ? plansWithPdfStatus.find((row) => String(row.id) === String(plan.id)) || (plan.toJSON?.() ?? plan)
      : null;
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
        plans: plansWithPdfStatus,
        today,
        recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
      });
      const assignmentPicker = buildClientTrainingAssignmentPicker({
        plans: plansWithPdfStatus,
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
        trainingDateContext,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.',
      });
    }

    const formattedPlan = toCurrentWorkoutPlanResponse(plan);
    const currentSession = formattedPlan.currentSession || null;
    // S0 (Plan Surfacing): ?forDate=YYYY-MM-DD answers the CALENDAR question
    // via the one basis-chain authority. /current stays the cursor endpoint —
    // this is an additive field, never a second next-workout truth.
    const forDate = typeof req.query.forDate === 'string' ? req.query.forDate : null;
    const dayForDate = forDate
      ? resolveDayForDate(plan, forDate, { localDate: today })
      : undefined;
    const overview = buildClientTrainingOverview({
      activePlan: activePlanWithPdfStatus,
      plans: plansWithPdfStatus,
      currentSession,
      today,
      assignmentCompletions: completionContext.assignmentCompletions,
      recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
    });
    const assignmentPicker = buildClientTrainingAssignmentPicker({
      plans: plansWithPdfStatus,
      today,
      assignmentCompletions: completionContext.assignmentCompletions,
    });
    const enrichedPlan = {
      ...formattedPlan,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
      homeworkSummary: overview.homeworkSummary,
      assignmentPicker,
      trainingDateContext,
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
      trainingDateContext,
      ...(dayForDate !== undefined ? { dayForDate } : {}),
    });
  } catch (error) {
    logger.error('Error fetching current workout:', error);
    return sendInternalError(res, 'Server error fetching workout plan');
  }
});

/**
 * GET /api/workouts/:userId/plans/:planId
 * Full structure of ONE plan the client owns — EVERY week -> day -> exercise.
 *
 * Why this exists: `/current` deliberately returns only the CURRENT week
 * (planDataToWorkoutDays(planData, currentWeek)), so the client-facing Plan
 * Detail modal would otherwise render one week and call it "your plan".
 *
 * READ-ONLY BY DESIGN. Trainer-indispensability doctrine (Sean 2026-07-11):
 * the client may SEE every plan, but only a trainer/admin may switch which one
 * is active. There is deliberately NO client-scoped activate/edit here — plan
 * activation stays trainerOrAdminOnly in workoutPlanRoutes.mjs. Do not "helpfully"
 * add a write path to this router.
 *
 * IDOR: two distinct checks, both required.
 *   1. ensureClientAccess — may the caller read THIS :userId at all?
 *      (self, or their trainer/admin.)
 *   2. plan.userId === clientId — does the requested :planId actually BELONG to
 *      that client? Without (2), an authenticated client could pass their OWN
 *      userId with SOMEONE ELSE'S planId and read a stranger's program.
 *      A 404 (not 403) is returned on mismatch so the endpoint never confirms
 *      that a foreign plan id exists.
 */
router.get('/:userId/plans/:planId', protect, async (req, res) => {
  try {
    const planId = normalizeWorkoutPlanId(req.params.planId);
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Invalid plan id.' });
    }

    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { WorkoutPlan } = models;
    if (!WorkoutPlan) {
      return sendInternalError(res, 'Server error fetching workout plan');
    }

    // Ownership is enforced in the QUERY (userId is part of the where clause),
    // so a foreign plan can never be loaded in the first place.
    const plan = await WorkoutPlan.findOne({
      where: { id: planId, userId: clientId },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }

    const formatted = toCurrentWorkoutPlanResponse(plan);
    const planRecord = plan.toJSON ? plan.toJSON() : plan;

    return res.status(200).json({
      success: true,
      data: {
        id: formatted.id,
        title: formatted.title,
        description: formatted.description,
        status: planRecord.status,
        durationWeeks: formatted.durationWeeks,
        difficulty: formatted.difficulty,
        currentWeek: formatted.currentWeek,
        currentDay: formatted.currentDay,
        createdAt: formatted.createdAt,
        // The whole program — this is what /current cannot give us.
        weeks: planDataToAllWeeks(planRecord.planData || planRecord.plan_data),
        currentSession: formatted.currentSession,
      },
    });
  } catch (error) {
    logger.error('Error fetching client plan detail:', error);
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
