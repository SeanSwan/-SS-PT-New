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
import { createWorkoutCandidatesHandler } from './workoutBuilderCandidateRouteHandler.mjs';
import { buildSuggestedWorkouts } from '../services/suggestedWorkoutService.mjs';
import { ALLOWED_GOALS } from '../services/workoutBuilderGoalConfig.mjs';
import { normalizeTrainingStyle } from '../services/workoutBuilderTrainingStyle.mjs';
import { getCorrectiveExercisesForCompensations } from '../services/ai/correctiveExerciseService.mjs';
import { getExercise } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import {
  assertAssignmentOrAdmin,
  loadFreshCanGenerateFlag,
} from '../middleware/verifyClientAccess.mjs';

/**
 * L5 (2026-05-02) — Client self-service plan generation gate.
 *
 * Codex 2026-05-02 round-2 review prescribed this exact gate ordering for
 * the workout builder route after the role allowlist was expanded from
 * ['admin', 'trainer'] to ['admin', 'trainer', 'client', 'user']:
 *
 *   1. ENV flag (`ENABLE_CLIENT_PLAN_SELFGEN`) must be enabled before any
 *      client-equivalent roles can pass the gate. Default OFF - this is the
 *      kill-switch that lets us roll back without a code deploy.
 *   2. CLIENT-EQUIVALENT user must be requesting their OWN data
 *      (req.user.id === clientId).
 *      Without this, an authenticated client-equivalent user could try to
 *      generate plans for OTHER clients.
 *   3. CLIENT-EQUIVALENT user must have canGenerateWorkoutPlans = true per a FRESH DB
 *      read. JWT-based reads are unsafe — admin revocation must take
 *      effect on the next request, not at token rotation.
 *   4. TRAINER / ADMIN paths fall through to the existing
 *      `assertAssignmentOrAdmin` check. Self-bypass NEVER skips the
 *      permission flag check.
 *
 * Returns `null` when the request is allowed; otherwise sends the response
 * and returns the response object so callers can early-return.
 */
const CLIENT_SELFGEN_ENABLED = () =>
  process.env.ENABLE_CLIENT_PLAN_SELFGEN === 'true';

const isClientSelfServiceRole = (role) => role === 'client' || role === 'user';

async function enforceWorkoutGenAccess(req, res, parsedClientId) {
  const role = req.user?.role;
  const requesterId = Number(req.user?.id);

  if (isClientSelfServiceRole(role)) {
    // Step 1 — feature kill switch.
    if (!CLIENT_SELFGEN_ENABLED()) {
      return res
        .status(403)
        .json({ success: false, error: 'Client workout generation is not enabled' });
    }
    // Step 2 — self-only.
    if (requesterId !== parsedClientId) {
      return res
        .status(403)
        .json({ success: false, error: 'Not authorized for this client' });
    }
    // Step 3 — fresh DB read of the per-client flag. Self-bypass NEVER
    // skips this — that is the bug class Codex flagged in pre-impl review.
    const canGenerate = await loadFreshCanGenerateFlag(requesterId);
    if (!canGenerate) {
      return res.status(403).json({
        success: false,
        error: 'Workout plan generation is not enabled for your account',
      });
    }
    return null; // allowed
  }

  // Step 4 — trainer/admin path: existing assignment check.
  const hasAccess = await assertAssignmentOrAdmin(requesterId, role, parsedClientId);
  if (!hasAccess) {
    return res
      .status(403)
      .json({ success: false, error: 'Not authorized for this client' });
  }
  return null; // allowed
}

// Workout builder rate limiter: 10 requests/minute per IP (DB-intensive operations)
const workoutBuilderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many generation requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Trainer-client assignment check is delegated to the shared helper at
// backend/middleware/verifyClientAccess.mjs (assertAssignmentOrAdmin).
// One source-of-truth contract: client_trainer_assignments.status='active'.
// Codex 2026-04-30: prior local copy was a duplicate of the same logic;
// reuse the shared helper so future schema changes touch ONE place.

function parseOptionalPhase(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
}

/**
 * Map an internal Error.message to a UI-safe details string.
 *
 * Why this exists: prior commit cf08ee98a added `details: err.message` to
 * the 500 response so the frontend inline error display could surface real
 * causes. Codex / Village review (2026-05-01) flagged that as an info-leak
 * risk — internal error strings can carry stack hints, DB error fragments,
 * or third-party error metadata. This helper maps the small set of expected
 * trainer-facing errors to safe wording, and falls through to a generic
 * message for everything else.
 *
 * Add new mappings here when the service throws a new known error class.
 * NEVER pass through err.message directly.
 */
function safeWorkoutBuilderDetails(err) {
  const raw = String(err?.message || '');
  // Known classes — keep wording trainer-friendly, no stack/DB internals
  if (raw.includes('client context unavailable')) {
    return 'Unable to load client data. Verify the client has an active profile, pain entries, and an equipment profile.';
  }
  if (raw.includes('not have an active assignment')) {
    return 'You are not assigned to this client. Ask an admin to create the assignment.';
  }
  if (raw.includes('clientId is required') || raw.includes('trainerId is required')) {
    return 'Missing required client or trainer reference.';
  }
  if (raw.includes('Invalid trainer ID')) {
    return 'Trainer account not recognized. Sign out and sign in again.';
  }
  if (raw.toLowerCase().includes('equipment')) {
    return 'Equipment profile issue — please verify the client\'s equipment profile is set up.';
  }
  // Unknown class — generic message (no leak)
  return 'Generation failed. Please try again or contact support if it persists.';
}

const router = Router();

router.use(protect);
// L5 (2026-05-02): allowlist now includes 'client'/'user' so self-service plan
// generation is possible for client-equivalent accounts. Per-route
// enforceWorkoutGenAccess() applies the 4-step gate (env kill switch +
// self-only + fresh-DB flag) before any
// service call. Trainer/admin paths are unchanged (still go through
// assertAssignmentOrAdmin).
router.use(authorize(['admin', 'trainer', 'client', 'user']));
router.use(workoutBuilderLimiter);

/**
 * POST /api/workout-builder/generate
 * Generate a single intelligent workout.
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      clientId, category, equipmentProfileId, exerciseCount, rotationPattern,
      primaryGoal, nasmPhase, trainingIntensityMode, hardcoreMethod, readinessCheck,
      planningReviewAcknowledged, planningReviewReason,
    } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    // L5 (2026-05-02) — 4-step gate: env flag → self-only
    // (client-equivalent users) → fresh-DB canGenerateWorkoutPlans → assignment (trainers).
    const gateResult = await enforceWorkoutGenAccess(req, res, parsedClientId);
    if (gateResult !== null) return gateResult;

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
    const safeTrainingStyle = normalizeTrainingStyle({ trainingIntensityMode, hardcoreMethod });

    const workout = await generateWorkout({
      clientId: parsedClientId,
      trainerId: req.user.id,
      category: safeCategory,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
      exerciseCount: safeExerciseCount,
      rotationPattern: safePattern,
      primaryGoal: safeGoal,
      nasmPhase: safePhase,
      trainingIntensityMode: safeTrainingStyle.mode,
      hardcoreMethod: safeTrainingStyle.method,
      readinessCheck,
      planningReviewAcknowledged: planningReviewAcknowledged === true,
      planningReviewReason,
      planningReviewActorRole: req.user.role,
    });

    return res.json({ success: true, workout });
  } catch (err) {
    // Cortex P0 (§5.3): deterministic safety gate — surface the acknowledged-
    // review contract (409 review-required / 400 reason-required) to the UI.
    if (err.name === 'SwanCoachPlanningReviewError') {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        error: err.message,
        reviewRequiredSignals: err.reviewRequiredSignals,
        missingCriticalData: err.missingCriticalData,
      });
    }
    logger.error('[WorkoutBuilder] Generate failed:', err.message);
    // 2026-05-01 W1A-3: route err.message through safe-message dictionary
    // before surfacing to UI. Prevents leaking internal error strings,
    // stack hints, or DB fragments via the `details` field.
    return res.status(500).json({
      success: false,
      error: 'Failed to generate workout',
      details: safeWorkoutBuilderDetails(err),
    });
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
      startingPhaseOverride, trainingIntensityMode, hardcoreMethod, readinessCheck,
      planningReviewAcknowledged, planningReviewReason,
    } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    // L5 (2026-05-02) — 4-step gate: env flag → self-only
    // (client-equivalent users) → fresh-DB canGenerateWorkoutPlans → assignment (trainers).
    const gateResult = await enforceWorkoutGenAccess(req, res, parsedClientId);
    if (gateResult !== null) return gateResult;

    const safeGoal = ALLOWED_GOALS.includes(primaryGoal) ? primaryGoal : 'general_fitness';
    const safeDuration = Math.min(Math.max(parseInt(durationWeeks, 10) || 12, 1), 52);
    const safeSessions = Math.min(Math.max(parseInt(sessionsPerWeek, 10) || 3, 1), 7);
    // Phase A: optional trainer phase override. Drop silently if out of range
    // so the service falls back to client baseline.
    const safeOverride = parseOptionalPhase(startingPhaseOverride);
    const safeTrainingStyle = normalizeTrainingStyle({ trainingIntensityMode, hardcoreMethod });

    const plan = await generatePlan({
      clientId: parsedClientId,
      trainerId: req.user.id,
      durationWeeks: safeDuration,
      sessionsPerWeek: safeSessions,
      primaryGoal: safeGoal,
      startingPhaseOverride: safeOverride,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
      trainingIntensityMode: safeTrainingStyle.mode,
      hardcoreMethod: safeTrainingStyle.method,
      readinessCheck,
      planningReviewAcknowledged: planningReviewAcknowledged === true,
      planningReviewReason,
      planningReviewActorRole: req.user.role,
    });

    return res.json({ success: true, plan });
  } catch (err) {
    // Cortex P0 (§5.3): surface the acknowledged-review contract to the UI.
    if (err.name === 'SwanCoachPlanningReviewError') {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        error: err.message,
        reviewRequiredSignals: err.reviewRequiredSignals,
        missingCriticalData: err.missingCriticalData,
      });
    }
    logger.error('[WorkoutBuilder] Plan generation failed:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate plan',
      details: safeWorkoutBuilderDetails(err),
    });
  }
});

/**
 * GET /api/workout-builder/suggested/:clientId — Workout-OS C6.
 * READ-ONLY deterministic suggestions (nothing persists), so this carries its
 * OWN default-off flag instead of riding the client-selfgen WRITE kill-switch:
 * ENABLE_SUGGESTED_WORKOUTS=true enables the surface. Client/user roles are
 * self-scoped; trainer requires an active assignment; admin passes.
 */
router.get('/suggested/:clientId', async (req, res) => {
  try {
    if (process.env.ENABLE_SUGGESTED_WORKOUTS !== 'true') {
      return res.status(404).json({ success: false, message: 'Suggested workouts are not enabled' });
    }
    const parsedClientId = Number.parseInt(req.params.clientId, 10);
    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid clientId is required' });
    }
    const role = req.user?.role;
    const requesterId = Number(req.user?.id);
    if (role === 'client' || role === 'user') {
      if (requesterId !== parsedClientId) {
        return res.status(403).json({ success: false, message: 'Clients can only view their own suggestions' });
      }
    } else {
      const hasAccess = await assertAssignmentOrAdmin(requesterId, role, parsedClientId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'No active assignment for this client' });
      }
    }

    const result = await buildSuggestedWorkouts({
      clientId: parsedClientId,
      trainerId: requesterId,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[WorkoutBuilder] suggested-workouts failed', { message: error?.message });
    return res.status(500).json({ success: false, message: 'Unable to build suggestions right now' });
  }
});

router.post('/candidates', createWorkoutCandidatesHandler({
  enforceWorkoutGenAccess,
  safeWorkoutBuilderDetails,
}));

/**
 * POST /api/workout-builder/corrective-recommendations  (V3c.2)
 *
 * Bridges OHSA compensation data to the V3b.3 NASM CES corrective
 * registry (32 ces-* exercises). Returns the matching corrective
 * exercises grouped by CES protocol step
 * (inhibit | lengthen | activate | integrate).
 *
 * Body:
 *   - clientId       (required) — used for access-gate enforcement.
 *   - compensations  (required) — array of compensation type strings
 *                    (e.g. `['knee_valgus', 'low_back_arch']`) OR
 *                    objects in the clientIntelligenceService shape
 *                    (e.g. `[{ type: 'knee_valgus', avgSeverity: 7 }]`).
 *                    Unknown types are dropped silently.
 *   - includeSteps   (optional) — array of CES protocol step names
 *                    to include. Defaults to all four steps.
 *
 * Response: { success: true, recommendations: { tags, matchedCount,
 *   inhibit, lengthen, activate, integrate } }
 *
 * Access: same gate as /generate and /plan — admin/trainer can call
 * for any clientId; client-equivalent users can only call for their own (with the
 * ENABLE_CLIENT_PLAN_SELFGEN env flag).
 *
 * Note (V3c scope): this slice takes compensations directly in the
 * body. A future slice (V3c.4) will let the route auto-fetch from
 * the client's MovementProfile when compensations are omitted.
 */
router.post('/corrective-recommendations', async (req, res) => {
  try {
    const { clientId, compensations, includeSteps } = req.body;

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId) || parsedClientId < 1) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    if (!Array.isArray(compensations)) {
      return res.status(400).json({
        success: false,
        error: 'compensations must be an array',
      });
    }

    const gateResult = await enforceWorkoutGenAccess(req, res, parsedClientId);
    if (gateResult !== null) return gateResult;

    const Exercise = getExercise();
    if (!Exercise) {
      return res
        .status(503)
        .json({ success: false, error: 'Exercise model not available' });
    }

    const safeIncludeSteps = Array.isArray(includeSteps)
      ? includeSteps.filter(
          (s) => typeof s === 'string' && ['inhibit', 'lengthen', 'activate', 'integrate'].includes(s),
        )
      : undefined;

    const recommendations = await getCorrectiveExercisesForCompensations({
      compensations,
      Exercise,
      includeSteps: safeIncludeSteps,
    });

    return res.json({ success: true, recommendations });
  } catch (err) {
    logger.error('[WorkoutBuilder] Corrective recommendations failed:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch corrective recommendations',
      details: safeWorkoutBuilderDetails(err),
    });
  }
});

export default router;
