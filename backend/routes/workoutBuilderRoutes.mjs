/**
 * Intelligent Workout Builder Routes -- Phase 9b
 * ================================================
 * REST API for AI-powered workout generation.
 *
 * POST /api/workout-builder/generate    -- Generate single workout
 * POST /api/workout-builder/plan        -- Generate long-term plan
 */

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import rateLimit from 'express-rate-limit';
import { generateWorkout, generatePlan } from '../services/workoutBuilderService.mjs';
import { ALLOWED_GOALS } from '../services/workoutBuilderGoalConfig.mjs';
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

// Workout builder rate limiter: 10 requests/minute per IP (DB-intensive operations)
const workoutBuilderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many generation requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Client-trainer ownership check — admins bypass, trainers must be assigned
async function verifyClientAccess(userId, userRole, clientId) {
  if (userRole === 'admin') return true;
  try {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM "ClientTrainerAssignments" WHERE "trainerId" = :trainerId AND "clientId" = :clientId AND "isActive" = true LIMIT 1`,
      { replacements: { trainerId: userId, clientId }, type: sequelize.QueryTypes.SELECT }
    );
    return !!rows;
  } catch (err) {
    // Table may not exist yet — fail closed for security
    logger.warn('[WorkoutBuilder] ClientTrainerAssignment check failed, denying access', err?.message);
    return false;
  }
}

function parseOptionalPhase(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
}

const router = Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));
router.use(workoutBuilderLimiter);

/**
 * POST /api/workout-builder/generate
 * Generate a single intelligent workout.
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      clientId, category, equipmentProfileId, exerciseCount, rotationPattern,
      primaryGoal, nasmPhase,
    } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    // Verify trainer is assigned to this client (admins bypass)
    const hasAccess = await verifyClientAccess(req.user.id, req.user.role, parsedClientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not authorized for this client' });
    }

    const VALID_CATEGORIES = ['full_body', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
    const VALID_PATTERNS = ['standard', 'aggressive', 'conservative'];
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'full_body';
    const safePattern = VALID_PATTERNS.includes(rotationPattern) ? rotationPattern : 'standard';
    const safeExerciseCount = Math.min(Math.max(parseInt(exerciseCount, 10) || 6, 1), 20);
    // Phase A: optional goal+phase steering on single-workout path. Both are
    // absent-or-valid; invalid values are dropped silently so the service falls
    // back to general_fitness / client baseline.
    const safeGoal = ALLOWED_GOALS.includes(primaryGoal) ? primaryGoal : undefined;
    const safePhase = parseOptionalPhase(nasmPhase);

    const workout = await generateWorkout({
      clientId: parsedClientId,
      trainerId: req.user.id,
      category: safeCategory,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
      exerciseCount: safeExerciseCount,
      rotationPattern: safePattern,
      primaryGoal: safeGoal,
      nasmPhase: safePhase,
    });

    return res.json({ success: true, workout });
  } catch (err) {
    logger.error('[WorkoutBuilder] Generate failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate workout' });
  }
});

/**
 * POST /api/workout-builder/plan
 * Generate a long-term training plan.
 */
router.post('/plan', async (req, res) => {
  try {
    const {
      clientId, durationWeeks, sessionsPerWeek, primaryGoal, equipmentProfileId,
      startingPhaseOverride,
    } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    // Verify trainer is assigned to this client (admins bypass)
    const hasAccess = await verifyClientAccess(req.user.id, req.user.role, parsedClientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not authorized for this client' });
    }

    const safeGoal = ALLOWED_GOALS.includes(primaryGoal) ? primaryGoal : 'general_fitness';
    const safeDuration = Math.min(Math.max(parseInt(durationWeeks, 10) || 12, 1), 52);
    const safeSessions = Math.min(Math.max(parseInt(sessionsPerWeek, 10) || 3, 1), 7);
    // Phase A: optional trainer phase override. Drop silently if out of range
    // so the service falls back to client baseline.
    const safeOverride = parseOptionalPhase(startingPhaseOverride);

    const plan = await generatePlan({
      clientId: parsedClientId,
      trainerId: req.user.id,
      durationWeeks: safeDuration,
      sessionsPerWeek: safeSessions,
      primaryGoal: safeGoal,
      startingPhaseOverride: safeOverride,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
    });

    return res.json({ success: true, plan });
  } catch (err) {
    logger.error('[WorkoutBuilder] Plan generation failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate plan' });
  }
});

export default router;
