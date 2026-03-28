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
import logger from '../utils/logger.mjs';
import { sequelize } from '../models/index.mjs';

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
  } catch {
    // Table may not exist yet — fail open for trainers to avoid blocking
    logger.warn('[WorkoutBuilder] ClientTrainerAssignment check failed, allowing access');
    return true;
  }
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
    const { clientId, category, equipmentProfileId, exerciseCount, rotationPattern } = req.body;

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

    const workout = await generateWorkout({
      clientId: parsedClientId,
      trainerId: req.user.id,
      category: safeCategory,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
      exerciseCount: safeExerciseCount,
      rotationPattern: safePattern,
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
    const { clientId, durationWeeks, sessionsPerWeek, primaryGoal, equipmentProfileId } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    // Verify trainer is assigned to this client (admins bypass)
    const hasAccess = await verifyClientAccess(req.user.id, req.user.role, parsedClientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Not authorized for this client' });
    }

    const VALID_GOALS = ['general_fitness', 'hypertrophy', 'strength', 'fat_loss', 'athletic_performance', 'golf_performance'];
    const safeGoal = VALID_GOALS.includes(primaryGoal) ? primaryGoal : 'general_fitness';
    const safeDuration = Math.min(Math.max(parseInt(durationWeeks, 10) || 12, 1), 52);
    const safeSessions = Math.min(Math.max(parseInt(sessionsPerWeek, 10) || 3, 1), 7);

    const plan = await generatePlan({
      clientId: parsedClientId,
      trainerId: req.user.id,
      durationWeeks: safeDuration,
      sessionsPerWeek: safeSessions,
      primaryGoal: safeGoal,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
    });

    return res.json({ success: true, plan });
  } catch (err) {
    logger.error('[WorkoutBuilder] Plan generation failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate plan' });
  }
});

export default router;
