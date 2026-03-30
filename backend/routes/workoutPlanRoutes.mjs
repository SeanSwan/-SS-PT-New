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
import { protect } from '../middleware/authMiddleware.mjs';
import { trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { getModel } from '../models/index.mjs';
import { Op } from '../database.mjs';
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Helper — get WorkoutPlan model safely
// PURPOSE: Lazy-load from model cache to avoid circular imports
// ─────────────────────────────────────────────────────────────
const getWorkoutPlan = () => getModel('WorkoutPlan');

// ─────────────────────────────────────────────────────────────
// SECTION: GET /api/workout-plans/debug-schema
// PURPOSE: TEMPORARY — diagnose column names in production table
// TODO: Remove after debugging is complete
// ─────────────────────────────────────────────────────────────
router.get('/debug-schema', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    // Check if table exists and what columns it has
    const [tableCheck] = await sequelize.query(
      `SELECT to_regclass('workout_plans') AS exists`
    );
    const tableExists = !!tableCheck?.[0]?.exists;

    if (!tableExists) {
      return res.json({ success: true, tableExists: false, columns: [] });
    }

    const [columns] = await sequelize.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
       WHERE table_name = 'workout_plans' ORDER BY ordinal_position`
    );

    // Try a raw count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM workout_plans`
    );

    // Try the Sequelize model
    let modelError = null;
    try {
      const WP = getWorkoutPlan();
      await WP.findAll({ limit: 1 });
    } catch (e) {
      modelError = e.message;
    }

    res.json({
      success: true,
      tableExists,
      columns: columns.map(c => ({ name: c.column_name, type: c.data_type })),
      rowCount: countResult?.[0]?.total,
      modelError
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split('\n').slice(0, 5) });
  }
});

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
    const { userId, status, trainerId } = req.query;

    const where = {};
    if (userId) where.userId = parseInt(userId, 10);
    if (trainerId) where.trainerId = parseInt(trainerId, 10);
    if (status) where.status = status;

    const plans = await WorkoutPlan.findAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, plans, count: plans.length });
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
router.get('/client/:userId', protect, trainerOrAdminOnly, async (req, res) => {
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
router.get('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const plan = await WorkoutPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }

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
router.post('/', protect, trainerOrAdminOnly, async (req, res) => {
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
router.put('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const plan = await WorkoutPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }

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
router.put('/:id/advance', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const plan = await WorkoutPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }

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
      if (week.sessions && week.sessions[dayIndex]) {
        week.sessions[dayIndex].completed = true;
        week.sessions[dayIndex].completedAt = new Date().toISOString();
        if (trainerNotes) {
          week.sessions[dayIndex].trainerNotes = trainerNotes;
        }
      }
    }

    // Calculate next position
    let nextWeek = currentWeek;
    let nextDay = currentDay + 1;
    let planCompleted = false;

    // Check if we need to advance to next week
    const currentWeekData = planData.weeks?.[weekIndex];
    const sessionsInWeek = currentWeekData?.sessions?.length || 0;

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
router.delete('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const plan = await WorkoutPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Workout plan not found' });
    }

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
function extractCurrentSession(plan) {
  const planData = plan.planData || { weeks: [] };
  const weekIndex = plan.currentWeek - 1;
  const dayIndex = plan.currentDay - 1;

  if (!planData.weeks || !planData.weeks[weekIndex]) {
    return null;
  }

  const week = planData.weeks[weekIndex];
  const session = week.sessions?.[dayIndex] || null;

  if (!session) return null;

  return {
    weekNumber: plan.currentWeek,
    weekFocus: week.focus || null,
    dayNumber: plan.currentDay,
    dayLabel: session.dayLabel || `Day ${plan.currentDay}`,
    session,
    totalWeeks: planData.weeks.length,
    totalSessionsThisWeek: week.sessions?.length || 0,
    isLastSessionOfWeek: plan.currentDay >= (week.sessions?.length || 0),
    isLastWeek: plan.currentWeek >= planData.weeks.length
  };
}

export default router;
