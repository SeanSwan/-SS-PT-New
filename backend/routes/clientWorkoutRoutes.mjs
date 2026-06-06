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
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';

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

// ─────────────────────────────────────────────────────────────
// Workout-history row mapper (exported for unit tests)
// Matches the real WorkoutSession schema written by workoutLogService
// (title, duration, totalSets, completedAt) — NOT the stale legacy
// fields (workoutName, durationMinutes, exercisesCompleted) which
// never existed on the model and silently rendered blank cards.
//
// Phase 1 Slice 1.2 (2026-05-03): semantic correctness fix. The
// pre-Slice-1.2 mapper output had `exercises: totalSets`, which the
// frontend rendered as "X exercises" — but `totalSets` is the count
// of SETS across all exercises, not the count of distinct exercises.
// A trainer logging 6 exercises with 4 sets each saw "24 exercises"
// on the dashboard.
//
// This mapper now outputs:
//   setsCount: <totalSets>             — accurate set count
//   exerciseCount: <distinct count>    — derived from the joined
//                                        DailyWorkoutForm.formData
//                                        when available, or null
//                                        when the form wasn't joined
//   exercises: <legacy alias>          — DEPRECATED. Codex Slice 1.2
//                                        R1 caught the clean-break as
//                                        too aggressive without a
//                                        verified consumer inventory.
//                                        Kept for one release as
//                                        `exerciseCount ?? totalSets`
//                                        — truthful when known,
//                                        backward-compat when unknown.
//                                        Remove when consumer
//                                        inventory is verified.
// Frontend consumers in this repo migrated to setsCount/exerciseCount
// in the same commit; the alias only protects out-of-tree consumers.
// ─────────────────────────────────────────────────────────────
// fallow-ignore-next-line unused-export, complexity
export const toClientWorkoutHistoryRow = (session) => {
  const raw = session?.toJSON ? session.toJSON() : session;
  const duration = Number.isFinite(raw?.duration) ? raw.duration : null;
  const totalSets = Number.isFinite(raw?.totalSets) ? raw.totalSets : 0;
  const dateValue = raw?.completedAt || raw?.date || raw?.createdAt || null;

  // Slice 1.2: derive exerciseCount from the joined dailyForms
  // association. WorkoutSession.hasMany(DailyWorkoutForm, as: 'dailyForms').
  // Include latest form's exercises array length when available.
  // Falls back to null (not 0) when the association wasn't joined,
  // so frontend can distinguish "no data" from "0 exercises."
  //
  // Slice 1.3 (2026-05-03): also extract the exercise NAMES from the
  // same form so the dashboard can render "Squat, Bench, Deadlift"
  // instead of just "6 exercises". Names come from
  // formData.exercises[].exerciseName (with `.name` as fallback —
  // both shapes are observed across writers, e.g.
  // dailyWorkoutFormRoutes.mjs:745 and :1344). Non-string / blank
  // names are dropped.
  let exerciseCount = null;
  let exerciseNames = null;
  const forms = raw?.dailyForms;
  if (Array.isArray(forms) && forms.length > 0) {
    // formData may be JSON-stringified from raw queries or parsed
    // from the JSONB column. Defensive parse.
    let formData = forms[0]?.formData;
    if (typeof formData === 'string') {
      try { formData = JSON.parse(formData); } catch { formData = null; }
    }
    if (formData && Array.isArray(formData.exercises)) {
      exerciseCount = formData.exercises.length;
      // Slice 1.3: build the names array. Always emit an array
      // (possibly empty) when the form was joined so consumers can
      // distinguish "joined-but-empty" from "not-joined-at-all" via
      // null vs []. The deprecation alias for `exercises:` keeps
      // working because we never overwrite it with this names array.
      const names = [];
      for (const ex of formData.exercises) {
        const candidate = (typeof ex?.exerciseName === 'string' && ex.exerciseName.trim())
          || (typeof ex?.name === 'string' && ex.name.trim())
          || null;
        if (candidate) names.push(candidate);
      }
      exerciseNames = names;
    }
  }

  return {
    id: raw?.id,
    name: (raw?.title && String(raw.title).trim()) || 'Workout',
    date: dateValue,
    duration: duration && duration > 0 ? `${duration} min` : null,
    setsCount: totalSets,
    exerciseCount,
    // Slice 1.3 (2026-05-03): list of distinct exercise names for
    // the dashboard preview. Array (possibly empty) when the form
    // was joined; null when join didn't happen. Frontend handles
    // truncation ("Squat, Bench, Deadlift +3 more") since the size
    // depends on screen real estate.
    exerciseNames,
    // Codex Slice 1.2 Round 1 MEDIUM 1 — keep `exercises` as a
    // DEPRECATED alias for one release so unknown consumers
    // (mobile app, internal tools, cached frontend builds, third-
    // party integrations) don't break on the contract change.
    // When exerciseCount is known, prefer it (the truthful value);
    // when null, fall back to totalSets (the pre-Slice-1.2 behavior,
    // wrong but stable). Frontend consumers in this repo migrated to
    // setsCount/exerciseCount in the same commit; this alias only
    // protects out-of-tree consumers. Remove when consumer
    // inventory is verified.
    exercises: exerciseCount ?? totalSets,
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
    let clientPlans = [];

    if (WorkoutPlan) {
      plan = await WorkoutPlan.findOne({
        where: {
          userId: clientId,
          status: 'active'
        },
        order: [['createdAt', 'DESC']],
      });
      if (typeof WorkoutPlan.findAll === 'function') {
        clientPlans = await WorkoutPlan.findAll({
          where: {
            userId: clientId,
            status: ['active', 'paused', 'draft'],
          },
          order: [['updatedAt', 'DESC']],
          limit: 20,
        });
      }
    }

    if (!plan) {
      const overview = buildClientTrainingOverview({
        activePlan: null,
        plans: clientPlans,
      });
      return res.status(200).json({
        success: true,
        data: null,
        plan: null,
        todayAssignment: overview.todayAssignment,
        trainingPlanCatalog: overview.trainingPlanCatalog,
        message: 'No workout plan assigned yet. Your trainer will create one after your assessment.'
      });
    }

    const formattedPlan = toCurrentWorkoutPlanResponse(plan);
    // L1 (REV 3 §C4): currentSession is embedded inside formattedPlan
    // (so data.currentSession AND plan.currentSession both expose it)
    // AND lifted to top level for direct access.
    const currentSession = formattedPlan.currentSession || null;
    const overview = buildClientTrainingOverview({
      activePlan: plan,
      plans: clientPlans.length > 0 ? clientPlans : [plan],
      currentSession,
    });
    const enrichedPlan = {
      ...formattedPlan,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
    };

    return res.status(200).json({
      success: true,
      data: enrichedPlan,
      plan: enrichedPlan,
      currentSession,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
    });
  } catch (error) {
    logger.error('Error fetching current workout:', error);
    return sendInternalError(res, 'Server error fetching workout plan');
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
    return sendInternalError(res, 'Server error fetching workout history');
  }
});

export default router;
