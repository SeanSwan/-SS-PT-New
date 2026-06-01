/**
 * ============================================================================
 * FILE: workoutPlanRoutes.mjs
 * PURPOSE: REST API for multi-week workout plan CRUD + session advancement
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides endpoints for creating, reading, updating,
 * and advancing through planned workout programs. The /advance endpoint is
 * the critical piece — it marks the current session complete and moves the
 * cursor to the next day/week so the AI can answer "what's next?"
 *
 * HOW IT FITS IN THE APP:
 *   AI generates plan → POST /api/workout-plans → stored in DB
 *   Trainer asks "what's next?" → AI reads GET /api/workout-plans/client/:userId
 *   Session done → PUT /api/workout-plans/:id/advance → cursor moves forward
 *
 * KEY DECISIONS:
 *   - All routes require protect + trainerOrAdminOnly (plans are trainer-managed)
 *   - Soft delete via status='completed' (no hard deletes)
 *   - /advance is atomic: marks session complete + advances cursor in one call
 */

import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import {
  verifyClientAccessByUserId,
  verifyClientAccessByPlanId,
  filterPlansByTrainerAssignment,
} from '../middleware/verifyClientAccess.mjs';
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
// L1 (2026-05-01): plan-shape helpers moved to a shared module so both
// workoutPlanRoutes (admin/trainer view) and clientWorkoutRoutes (logger
// view) can use the same extractor + adapter. See REV 3 receipt §C2.
import { extractCurrentSession } from '../services/workoutPlanShapeService.mjs';

const router = express.Router();

// Plan Library slice (REV 2 receipt §6.2). Activate handler retries on
// SQLSTATE 23505 (Postgres unique_violation), which fires when the partial
// unique index `workout_plans_one_active_per_user` catches a concurrent
// activate that slipped past the row lock.
const ACTIVATE_MAX_RETRIES = 2;
const isUniqueViolation = (err) =>
  err?.original?.code === '23505' || err?.parent?.code === '23505';
const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Helper — get WorkoutPlan model safely
// PURPOSE: Lazy-load from model cache to avoid circular imports
// ─────────────────────────────────────────────────────────────
const getWorkoutPlan = () => getModel('WorkoutPlan');

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/workout-plans
// PURPOSE: List workout plans with optional filters
// ─────────────────────────────────────────────────────────────

/**
 * List workout plans. Filters: userId, status, trainerId.
 * @route GET /api/workout-plans
 * @access Trainer/Admin
 */
router.get('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const { userId, clientId, status, trainerId } = req.query;

    const where = {};
    // Support both userId and clientId query params (frontend may use either)
    if (userId !== undefined || clientId !== undefined) {
      const targetUserId = parseStrictPositiveInteger(userId ?? clientId);
      if (!targetUserId) {
        return res.status(400).json({ success: false, message: 'Valid userId or clientId required' });
      }
      where.userId = targetUserId;
    }
    if (trainerId !== undefined) {
      const parsedTrainerId = parseStrictPositiveInteger(trainerId);
      if (!parsedTrainerId) {
        return res.status(400).json({ success: false, message: 'Valid trainerId required' });
      }
      where.trainerId = parsedTrainerId;
    }
    if (status) where.status = status;

    const plans = await WorkoutPlan.findAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    // Phase B IDOR mitigation: filter to trainer's assigned clients (admin sees all).
    const filteredPlans = await filterPlansByTrainerAssignment(req, plans);

    res.json({ success: true, plans: filteredPlans, count: filteredPlans.length });
  } catch (error) {
    logger.error('[WorkoutPlan] GET / error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch workout plans' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/workout-plans/client/:userId
// PURPOSE: Get the active plan for a specific client
// WHY: This is what the AI calls to answer "what's next in the workout?"
// ─────────────────────────────────────────────────────────────

/**
 * Get a client's active workout plan. Returns the most recent active plan.
 * @route GET /api/workout-plans/client/:userId
 * @access Trainer/Admin
 */
router.get('/client/:userId', protect, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const userId = parseInt(req.params.userId, 10);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid userId required' });
    }

    const plan = await WorkoutPlan.findOne({
      where: { userId, status: 'active' },
      order: [['updatedAt', 'DESC']]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'No active workout plan found for this client'
      });
    }

    // Extract current session info for the AI
    const currentSession = extractCurrentSession(plan);

    res.json({
      success: true,
      plan,
      currentSession
    });
  } catch (error) {
    logger.error('[WorkoutPlan] GET /client/:userId error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch client plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/workout-plans/:id
// PURPOSE: Get a single plan by ID with full detail
// ─────────────────────────────────────────────────────────────

/**
 * Get a specific workout plan by ID.
 * @route GET /api/workout-plans/:id
 * @access Trainer/Admin
 */
router.get('/:id', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    // Phase B: middleware attached req.workoutPlan; reuse instead of refetching.
    const plan = req.workoutPlan;
    const currentSession = extractCurrentSession(plan);

    res.json({ success: true, plan, currentSession });
  } catch (error) {
    logger.error('[WorkoutPlan] GET /:id error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/workout-plans
// PURPOSE: Create a new workout plan
// ─────────────────────────────────────────────────────────────

/**
 * Create a new workout plan for a client.
 * @route POST /api/workout-plans
 * @access Trainer/Admin
 */
router.post('/', protect, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'userId', bodyField: 'userId' }), async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const {
      userId, title, description, nasmPhase,
      startDate, endDate, durationWeeks, status,
      planData, progressNotes, createdBy, metadata
    } = req.body;

    if (!userId || !title) {
      return res.status(400).json({
        success: false,
        message: 'userId and title are required'
      });
    }

    // Validate nasmPhase range if provided
    if (nasmPhase !== undefined && (nasmPhase < 1 || nasmPhase > 5)) {
      return res.status(400).json({
        success: false,
        message: 'nasmPhase must be 1-5 (NASM OPT phases)'
      });
    }

    const plan = await WorkoutPlan.create({
      userId: parseInt(userId, 10),
      trainerId: req.user.id,
      title,
      description: description || null,
      nasmPhase: nasmPhase || null,
      startDate: startDate || null,
      endDate: endDate || null,
      durationWeeks: durationWeeks || 4,
      status: status || 'active',
      currentWeek: 1,
      currentDay: 1,
      planData: planData || { weeks: [] },
      progressNotes: progressNotes || [],
      createdBy: createdBy || 'trainer',
      metadata: metadata || {}
    });

    logger.info('[WorkoutPlan] Created plan #%d for client %d by trainer %d',
      plan.id, userId, req.user.id);

    res.status(201).json({ success: true, plan });
  } catch (error) {
    logger.error('[WorkoutPlan] POST / error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to create workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: PUT /api/workout-plans/:id
// PURPOSE: Update plan fields (title, planData, status, etc.)
// ─────────────────────────────────────────────────────────────

/**
 * Update a workout plan. Accepts partial updates.
 * @route PUT /api/workout-plans/:id
 * @access Trainer/Admin
 */
router.put('/:id', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    // Phase B: middleware attached req.workoutPlan; reuse instead of refetching.
    const plan = req.workoutPlan;

    // Whitelist updatable fields to prevent mass-assignment
    const allowedFields = [
      'title', 'description', 'nasmPhase', 'startDate', 'endDate',
      'durationWeeks', 'status', 'currentWeek', 'currentDay',
      'planData', 'progressNotes', 'metadata'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await plan.update(updates);

    logger.info('[WorkoutPlan] Updated plan #%d by user %d', plan.id, req.user.id);

    res.json({ success: true, plan });
  } catch (error) {
    logger.error('[WorkoutPlan] PUT /:id error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to update workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: PUT /api/workout-plans/:id/activate    (Plan Library slice)
// PURPOSE: Make this plan the canonical "active" plan for its client.
//          Demotes any sibling active plan(s) to 'paused' atomically.
// ─────────────────────────────────────────────────────────────

/**
 * Activate a plan as the client's current. Atomically demotes sibling
 * active plans to 'paused'.
 *
 * Concurrency strategy:
 *   1) Per-user row lock via `SELECT ... FOR UPDATE` serializes concurrent
 *      activates for the same client. Different clients don't lock each other.
 *   2) Partial unique index `workout_plans_one_active_per_user` is the DB-level
 *      backstop — any race that escapes the row lock raises SQLSTATE 23505.
 *   3) On 23505, retry up to ACTIVATE_MAX_RETRIES times before failing.
 *
 * @route PUT /api/workout-plans/:id/activate
 * @access Trainer (assigned client) / Admin
 */
router.put('/:id/activate', protect, trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    const WorkoutPlan = getWorkoutPlan();
    const targetPlan = req.workoutPlan; // attached by middleware

    for (let attempt = 0; attempt <= ACTIVATE_MAX_RETRIES; attempt++) {
      const t = await sequelize.transaction();
      try {
        // Lock all of this user's plans to serialize concurrent activates.
        await WorkoutPlan.findAll({
          where: { userId: targetPlan.userId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        // Demote sibling active plans to 'paused'.
        await WorkoutPlan.update(
          { status: 'paused' },
          {
            where: {
              userId: targetPlan.userId,
              status: 'active',
              id: { [Op.ne]: targetPlan.id },
            },
            transaction: t,
          },
        );

        // Activate the target. Refetch to get a fresh instance bound to the
        // transaction so .update() persists; req.workoutPlan was loaded
        // outside the transaction by the middleware.
        const fresh = await WorkoutPlan.findByPk(targetPlan.id, { transaction: t });
        if (!fresh) {
          await t.rollback();
          return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        await fresh.update({ status: 'active' }, { transaction: t });

        await t.commit();
        logger.info('[WorkoutPlan] Activated plan #%d for client %d (trainer %d)',
          fresh.id, fresh.userId, req.user.id);
        return res.json({ success: true, plan: fresh });
      } catch (err) {
        await t.rollback();
        if (isUniqueViolation(err) && attempt < ACTIVATE_MAX_RETRIES) {
          logger.warn('[WorkoutPlan] Activate race caught by unique index, retrying (attempt %d)', attempt);
          continue;
        }
        logger.error('[WorkoutPlan] Activate error: %s', err.message);
        return res.status(500).json({ success: false, message: 'Failed to activate plan' });
      }
    }
});

// ─────────────────────────────────────────────────────────────
// SECTION: POST /api/workout-plans/:id/duplicate    (Plan Library slice)
// PURPOSE: Server-side clone of an existing plan. New copy is always 'draft'
//          so the partial unique index never trips (drafts don't count toward
//          active uniqueness). Trainer can activate later if desired.
// ─────────────────────────────────────────────────────────────

/**
 * Duplicate a plan. Saved-plan list does NOT include `planData`, so the
 * frontend cannot construct an accurate copy; the clone happens server-side
 * to guarantee field fidelity. The duplicate is always status='draft' per
 * product rule "exactly one active plan per client."
 *
 * Body (optional): { title?: string }
 *
 * @route POST /api/workout-plans/:id/duplicate
 * @access Trainer (assigned client) / Admin
 */
router.post('/:id/duplicate', protect, trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    const WorkoutPlan = getWorkoutPlan();
    const original = req.workoutPlan;
    const { title } = req.body || {};

    try {
      // Deep-clone JSONB: serializing prevents accidental shared-reference
      // bugs at test time. JSONB persists fine either way; explicit clone
      // makes intent unambiguous.
      const clonedPlanData = original.planData
        ? JSON.parse(JSON.stringify(original.planData))
        : { weeks: [] };

      const copy = await WorkoutPlan.create({
        userId: original.userId,
        trainerId: req.user.id,
        title: (typeof title === 'string' && title.trim().length > 0)
          ? title.trim()
          : `${original.title} (copy)`,
        description: original.description,
        nasmPhase: original.nasmPhase,
        durationWeeks: original.durationWeeks,
        status: 'draft', // ALWAYS draft per product rule
        currentWeek: 1,
        currentDay: 1,
        planData: clonedPlanData,
        progressNotes: [],
        createdBy: 'trainer',
        metadata: { duplicatedFrom: original.id },
      });

      logger.info('[WorkoutPlan] Duplicated plan #%d -> #%d (client %d, trainer %d)',
        original.id, copy.id, original.userId, req.user.id);

      return res.status(201).json({ success: true, plan: copy });
    } catch (err) {
      logger.error('[WorkoutPlan] Duplicate error: %s', err.message);
      return res.status(500).json({ success: false, message: 'Failed to duplicate plan' });
    }
});

// ─────────────────────────────────────────────────────────────
// SECTION: PUT /api/workout-plans/:id/advance
// PURPOSE: Mark current session complete and advance to the next one
// WHY: This is the critical endpoint the AI calls after "we finished that"
// ─────────────────────────────────────────────────────────────

/**
 * Advance to the next session in the plan. Marks current session as
 * completed in the planData JSONB, then increments currentDay (and
 * currentWeek if needed). If the plan is fully done, sets status
 * to 'completed'.
 *
 * @route PUT /api/workout-plans/:id/advance
 * @access Trainer/Admin
 * @body { trainerNotes?: string } — optional notes for the completed session
 */
router.put('/:id/advance', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    // Phase B: middleware attached req.workoutPlan; reuse instead of refetching.
    const plan = req.workoutPlan;

    if (plan.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot advance a ${plan.status} plan. Only active plans can be advanced.`
      });
    }

    const planData = plan.planData || { weeks: [] };
    const { currentWeek, currentDay } = plan;
    const { trainerNotes } = req.body;

    // Mark the current session as completed in planData
    const weekIndex = currentWeek - 1;
    const dayIndex = currentDay - 1;

    if (planData.weeks && planData.weeks[weekIndex]) {
      const week = planData.weeks[weekIndex];
      // Support both "sessions" (legacy) and "days" (new frontend) keys
      const entries = week.sessions || week.days || [];
      if (entries[dayIndex]) {
        entries[dayIndex].completed = true;
        entries[dayIndex].completedAt = new Date().toISOString();
        if (trainerNotes) {
          entries[dayIndex].trainerNotes = trainerNotes;
        }
        // Write back to whichever key exists
        if (week.sessions) week.sessions = entries;
        else week.days = entries;
      }
    }

    // Calculate next position
    let nextWeek = currentWeek;
    let nextDay = currentDay + 1;
    let planCompleted = false;

    // Check if we need to advance to next week
    const currentWeekData = planData.weeks?.[weekIndex];
    const sessionsInWeek = (currentWeekData?.sessions || currentWeekData?.days)?.length || 0;

    if (nextDay > sessionsInWeek) {
      // Move to next week, day 1
      nextWeek = currentWeek + 1;
      nextDay = 1;

      // Check if plan is fully completed
      const totalWeeks = planData.weeks?.length || 0;
      if (nextWeek > totalWeeks) {
        planCompleted = true;
      }
    }

    // Apply updates
    const updates = {
      planData,
      currentWeek: planCompleted ? currentWeek : nextWeek,
      currentDay: planCompleted ? currentDay : nextDay,
      status: planCompleted ? 'completed' : 'active'
    };

    await plan.update(updates);

    // Extract the new current session (or null if completed)
    const nextSession = planCompleted ? null : extractCurrentSession(plan);

    logger.info('[WorkoutPlan] Advanced plan #%d: week %d day %d → %s',
      plan.id, currentWeek, currentDay,
      planCompleted ? 'COMPLETED' : `week ${nextWeek} day ${nextDay}`);

    res.json({
      success: true,
      plan,
      advanced: true,
      planCompleted,
      previousSession: { week: currentWeek, day: currentDay },
      nextSession
    });
  } catch (error) {
    logger.error('[WorkoutPlan] PUT /:id/advance error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to advance workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: DELETE /api/workout-plans/:id
// PURPOSE: Soft-delete by setting status to 'completed'
// WHY: Never hard-delete user workout data (audit trail)
// ─────────────────────────────────────────────────────────────

/**
 * Soft-delete a workout plan (sets status to 'completed').
 * @route DELETE /api/workout-plans/:id
 * @access Trainer/Admin
 */
router.delete('/:id', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    // Phase B: middleware attached req.workoutPlan; reuse instead of refetching.
    const plan = req.workoutPlan;

    await plan.update({ status: 'completed' });

    logger.info('[WorkoutPlan] Soft-deleted plan #%d by user %d', plan.id, req.user.id);

    res.json({ success: true, message: 'Workout plan archived' });
  } catch (error) {
    logger.error('[WorkoutPlan] DELETE /:id error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Helper Functions
// PURPOSE: Extract current session data from planData JSONB
// ─────────────────────────────────────────────────────────────

/**
 * Extract the current session from plan's JSONB planData based on
 * currentWeek and currentDay cursors. Returns null if no session found.
 *
 * @param {Object} plan - WorkoutPlan model instance
 * @returns {Object|null} Current session with week context
 */
// extractCurrentSession migrated to backend/services/workoutPlanShapeService.mjs
// (L1, 2026-05-01) — see REV 3 receipt §C2. Imported at top of this file.

export default router;
