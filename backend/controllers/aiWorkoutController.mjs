/**
 * FILE: aiWorkoutController.mjs
 * SYSTEM: AI Workout Generation (NASM-Aware)
 *
 * PURPOSE:
 * - Generate structured workout plans via the AI provider router.
 * - Enforce NASM OPT phase guidance and safety constraints from movement screen data.
 *
 * ARCHITECTURE:
 * ```mermaid
 * graph TD
 *   A[Client/Trainer Request] --> B[aiWorkoutController]
 *   B --> C[Provider Router]
 *   C --> D[OpenAI Adapter]
 *   C --> E[Anthropic Adapter]
 *   C --> F[Gemini Adapter]
 *   C --> G[Degraded Mode]
 *   B --> H[Output Validator]
 *   B --> I[WorkoutPlan Tables]
 * ```
 *
 * DATA FLOW (Phase 3A — 18-step pipeline):
 * 1. Auth + kill switch (middleware)
 * 2. Rate limiter (middleware)
 * 3. RBAC check
 * 4. Per-user consent check
 * 5. Resolve masterPromptJson
 * 6. De-identify payload (fail-closed)
 * 7. Build server-derived NASM constraints
 * 8. Create audit log (pending)
 * 9. Call provider router (failover chain)
 * 10. If router fails → degraded response (HTTP 200, template suggestions)
 * 11. PII detection scan (reject-on-detect)
 * 12. Zod schema validation
 * 13. Rule-engine validation
 * 14. Persist workout plan
 * 15. Update audit log (success)
 * 16. Return success response
 *
 * CREATED: 2026-01-10
 * LAST MODIFIED: 2026-02-24 (Phase 3A: Provider router integration)
 */
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { updateMetrics } from '../routes/aiMonitoringRoutes.mjs';
import { deIdentify, hashPayload } from '../services/deIdentificationService.mjs';
import { routeAiGeneration } from '../services/ai/providerRouter.mjs';
import { runValidationPipeline, validateApprovedDraftPlan } from '../services/ai/outputValidator.mjs';
import { buildDegradedResponse } from '../services/ai/degradedResponse.mjs';
import { releaseConcurrent } from '../services/ai/rateLimiter.mjs';
import { PROMPT_VERSION } from '../services/ai/types.mjs';
import { buildTemplateContext } from '../services/ai/templateContextBuilder.mjs';
import { buildProgressContext } from '../services/ai/progressContextBuilder.mjs';
import { buildUnifiedContext } from '../services/ai/contextBuilder.mjs';

const ALLOWED_DAY_TYPES = new Set([
  'training',
  'active_recovery',
  'rest',
  'assessment',
  'specialization',
]);
const ALLOWED_OPT_PHASES = new Set([
  'stabilization_endurance',
  'strength_endurance',
  'hypertrophy',
  'maximal_strength',
  'power',
]);
const OPT_PHASE_KEY_BY_NUMBER = {
  1: 'stabilization_endurance',
  2: 'strength_endurance',
  3: 'hypertrophy',
  4: 'maximal_strength',
  5: 'power',
};

const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeDayType = (dayType) => {
  if (!dayType || typeof dayType !== 'string') {
    return 'training';
  }
  return ALLOWED_DAY_TYPES.has(dayType) ? dayType : 'training';
};

const normalizeOptPhase = (optPhase) => {
  if (!optPhase || typeof optPhase !== 'string') {
    return null;
  }
  return ALLOWED_OPT_PHASES.has(optPhase) ? optPhase : null;
};

const toOptPhaseKey = (optPhase) => {
  if (!optPhase) {
    return null;
  }
  if (typeof optPhase === 'string') {
    return normalizeOptPhase(optPhase);
  }
  if (typeof optPhase === 'number') {
    return OPT_PHASE_KEY_BY_NUMBER[optPhase] || null;
  }
  if (typeof optPhase === 'object' && typeof optPhase.phase === 'number') {
    return OPT_PHASE_KEY_BY_NUMBER[optPhase.phase] || null;
  }
  return null;
};

const OHSA_LABELS = {
  feetTurnout: 'feet turnout',
  feetFlattening: 'feet flattening',
  kneeValgus: 'knee valgus',
  kneeVarus: 'knee varus',
  excessiveForwardLean: 'excessive forward lean',
  lowBackArch: 'low back arch',
  armsFallForward: 'arms fall forward',
  forwardHead: 'forward head',
  asymmetricWeightShift: 'asymmetric weight shift',
};

const extractOhsaCompensations = (ohsa) => {
  if (!ohsa || typeof ohsa !== 'object') {
    return [];
  }

  const results = [];
  const addComp = (key, value) => {
    if (!value || value === 'none') {
      return;
    }
    const label = OHSA_LABELS[key] || key;
    results.push(`${value} ${label}`.trim());
  };

  const anterior = ohsa.anteriorView || {};
  const lateral = ohsa.lateralView || {};

  addComp('feetTurnout', anterior.feetTurnout);
  addComp('feetFlattening', anterior.feetFlattening);
  addComp('kneeValgus', anterior.kneeValgus);
  addComp('kneeVarus', anterior.kneeVarus);
  addComp('excessiveForwardLean', lateral.excessiveForwardLean);
  addComp('lowBackArch', lateral.lowBackArch);
  addComp('armsFallForward', lateral.armsFallForward);
  addComp('forwardHead', lateral.forwardHead);
  addComp('asymmetricWeightShift', ohsa.asymmetricWeightShift);

  return results;
};

const extractPosturalDeviations = (posturalAssessment) => {
  if (!posturalAssessment || typeof posturalAssessment !== 'object') {
    return [];
  }

  return Object.values(posturalAssessment)
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
};

const buildNasmConstraints = (baseline, masterPrompt) => {
  if (!baseline) {
    return null;
  }

  const primaryGoal = masterPrompt?.goals?.primary || 'general_fitness';
  const optPhaseDetails = baseline.nasmAssessmentScore !== null
    ? baseline.constructor.selectOPTPhase(baseline.nasmAssessmentScore ?? 0, primaryGoal)
    : null;
  const optPhaseKey = toOptPhaseKey(optPhaseDetails);

  return {
    parqClearance: !baseline.medicalClearanceRequired,
    medicalClearanceRequired: baseline.medicalClearanceRequired ?? false,
    nasmAssessmentScore: baseline.nasmAssessmentScore ?? null,
    ohsaCompensations: extractOhsaCompensations(baseline.overheadSquatAssessment),
    posturalDeviations: extractPosturalDeviations(baseline.posturalAssessment),
    correctiveExercises: baseline.correctiveExerciseStrategy ?? null,
    optPhase: optPhaseKey,
    optPhaseConfig: optPhaseDetails ?? null,
    primaryGoal,
    trainingTier: masterPrompt?.package?.tier ?? null,
    performanceData: baseline.performanceAssessments ?? null,
  };
};

const findExerciseByName = async (Exercise, name, transaction) => {
  if (!name) {
    return null;
  }

  const trimmed = String(name).trim();
  if (!trimmed) {
    return null;
  }

  const exactMatch = await Exercise.findOne({
    where: { name: { [Op.iLike]: trimmed } },
    transaction,
  });

  if (exactMatch) {
    return exactMatch;
  }

  return Exercise.findOne({
    where: { name: { [Op.iLike]: `%${trimmed}%` } },
    transaction,
  });
};

/**
 * Update the audit log entry. Non-blocking — failures are logged but don't break the request.
 */
async function updateAuditLog(auditLog, fields) {
  if (!auditLog) return;
  try {
    await auditLog.update(fields);
  } catch (logErr) {
    logger.warn('Failed to update AI audit log:', logErr.message);
  }
}

export const generateWorkoutPlan = async (req, res) => {
  const startTime = Date.now();
  const requesterId = req.user?.id;
  let auditLog = null;

  try {
    const { userId: rawUserId, masterPromptJson, mode } = req.body || {};
    const isDraftMode = mode === 'draft';
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const parsedUserId = Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;
    const targetUserId = Number.isInteger(rawUserId)
      ? rawUserId
      : Number.isInteger(parsedUserId)
        ? parsedUserId
        : requesterRole === 'client'
          ? requesterId
          : null;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid userId',
      });
    }

    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Clients can only generate plans for themselves',
      });
    }

    const models = getAllModels();
    const {
      User,
      Exercise,
      WorkoutPlan,
      WorkoutPlanDay,
      WorkoutPlanDayExercise,
      ClientTrainerAssignment,
      ClientBaselineMeasurements,
    } = models;

    if (requesterRole === 'trainer') {
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: targetUserId,
          trainerId: requesterId,
          status: 'active',
        },
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          code: 'AI_ASSIGNMENT_DENIED',
          message: 'Access denied: Trainer is not assigned to this client',
        });
      }
    } else if (requesterRole !== 'admin' && requesterRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid role for workout generation',
      });
    }

    // --- Phase 1: Per-user AI consent check (AFTER RBAC) ---
    const { AiPrivacyProfile } = models;
    if (AiPrivacyProfile) {
      const consentProfile = await AiPrivacyProfile.findOne({
        where: { userId: targetUserId },
      });

      if (!consentProfile) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has not been granted. Please complete the AI consent flow before using AI-powered features.',
          code: 'AI_CONSENT_MISSING',
        });
      }

      if (!consentProfile.aiEnabled) {
        return res.status(403).json({
          success: false,
          message: 'AI features are currently disabled for this account.',
          code: 'AI_CONSENT_DISABLED',
        });
      }

      if (consentProfile.withdrawnAt) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has been withdrawn. Please re-consent to use AI-powered features.',
          code: 'AI_CONSENT_WITHDRAWN',
        });
      }
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let resolvedMasterPrompt = masterPromptJson ?? targetUser.masterPromptJson;
    if (typeof resolvedMasterPrompt === 'string') {
      try {
        resolvedMasterPrompt = JSON.parse(resolvedMasterPrompt);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'masterPromptJson must be valid JSON',
        });
      }
    }

    if (!resolvedMasterPrompt || !isPlainObject(resolvedMasterPrompt)) {
      return res.status(404).json({
        success: false,
        message: 'Master Prompt JSON not found for this user',
      });
    }

    // --- Phase 1: De-identify masterPromptJson before AI call ---
    const deIdResult = deIdentify(resolvedMasterPrompt, {
      spiritName: targetUser.spiritName || undefined,
    });

    if (!deIdResult) {
      logger.warn('AI workout generation blocked: de-identification failed (fail-closed)', {
        targetUserId,
      });
      return res.status(400).json({
        success: false,
        message: 'Unable to prepare data for AI processing. Please ensure your profile is complete.',
        code: 'DEIDENTIFICATION_FAILED',
      });
    }

    const { deIdentified: safePayload, strippedFields } = deIdResult;
    logger.info('De-identification complete', {
      targetUserId,
      strippedFields,
      strippedCount: strippedFields.length,
    });

    // --- Phase 1: Constraints are server-derived only (NASM baseline) ---
    const latestBaseline = await ClientBaselineMeasurements.findOne({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
    });
    const nasmConstraints = buildNasmConstraints(latestBaseline, resolvedMasterPrompt);
    const serverConstraints = {};
    if (nasmConstraints) {
      serverConstraints.nasm = nasmConstraints;
      if (nasmConstraints.optPhase) {
        serverConstraints.optPhase = nasmConstraints.optPhase;
        serverConstraints.optPhaseConfig = nasmConstraints.optPhaseConfig ?? null;
      }
    }

    // Phase 4A: Resolve NASM templates from constraints (zero PII, pure protocol data)
    const templateContext = buildTemplateContext(nasmConstraints);
    if (templateContext) {
      serverConstraints.templateContext = templateContext;
    }

    // Phase 5A: Build progress context from recent workout sessions
    const { WorkoutSession, WorkoutLog } = models;
    let progressContext = null;
    if (WorkoutSession) {
      try {
        const recentSessions = await WorkoutSession.findAll({
          where: { userId: targetUserId },
          order: [['date', 'DESC']],
          limit: 30,
          include: WorkoutLog ? [{ model: WorkoutLog, as: 'logs' }] : [],
        });

        if (recentSessions && recentSessions.length > 0) {
          const sessionData = recentSessions.map(s => {
            const plain = s.get({ plain: true });
            return {
              ...plain,
              workoutLogs: plain.logs || [],
            };
          });
          progressContext = buildProgressContext(sessionData);
        }
      } catch (progressErr) {
        logger.warn('Failed to build progress context (non-blocking):', progressErr.message);
      }
    }

    // Phase 5A: Build unified generation context
    const unifiedContext = buildUnifiedContext({
      deIdentifiedPayload: safePayload,
      nasmConstraints,
      templateContext,
      progressContext,
    });

    // Attach progress + unified context to serverConstraints for prompt enrichment
    if (progressContext && progressContext.recentSessionCount > 0) {
      serverConstraints.progressContext = progressContext;
    }
    if (unifiedContext.exerciseRecommendations?.length > 0) {
      serverConstraints.exerciseRecommendations = unifiedContext.exerciseRecommendations;
    }

    const payloadHash = hashPayload(safePayload);

    // --- Phase 3A: Create audit log entry (pending) ---
    const { AiInteractionLog } = models;
    if (AiInteractionLog) {
      try {
        auditLog = await AiInteractionLog.create({
          userId: targetUserId,
          provider: 'pending',
          model: 'pending',
          requestType: 'workout_generation',
          payloadHash,
          status: 'pending',
          promptVersion: PROMPT_VERSION,
        });
      } catch (logErr) {
        logger.warn('Failed to create AI audit log (non-blocking):', logErr.message);
      }
    }

    // --- Phase 3A: Route through provider chain ---
    // Resolve the user's original name for PII detection in provider output
    const originalName = resolvedMasterPrompt?.client?.name;
    const routerStartMs = Date.now();

    const routerOutcome = await routeAiGeneration({
      requestType: 'workout_generation',
      userId: targetUserId,
      deidentifiedPayload: safePayload,
      serverConstraints,
      payloadHash,
      promptVersion: PROMPT_VERSION,
    });

    const routerDurationMs = Date.now() - routerStartMs;

    logger.info('[Router] Outcome', {
      ok: routerOutcome.ok,
      failoverTrace: routerOutcome.failoverTrace,
      durationMs: routerDurationMs,
    });

    // --- Phase 3A: Handle router failure → degraded mode (HTTP 200) ---
    if (!routerOutcome.ok) {
      // Check if all errors are auth-related (config error, not transient)
      const allAuth = routerOutcome.errors.length > 0
        && routerOutcome.errors.every(e => e.code === 'PROVIDER_AUTH');
      const allRateLimit = routerOutcome.errors.length > 0
        && routerOutcome.errors.every(e => e.code === 'PROVIDER_RATE_LIMIT');

      await updateAuditLog(auditLog, {
        provider: 'degraded',
        model: 'none',
        status: 'degraded',
        errorCode: routerOutcome.errors[0]?.code || 'UNKNOWN_PROVIDER_ERROR',
        durationMs: routerDurationMs,
      });

      const responseTime = Date.now() - startTime;
      updateMetrics('workoutGeneration', false, responseTime, 0, requesterId);

      if (allAuth) {
        return res.status(502).json({
          success: false,
          code: 'AI_CONFIG_ERROR',
          message: 'AI provider configuration error. Please contact support.',
        });
      }

      if (allRateLimit) {
        return res.status(429).json({
          success: false,
          code: 'AI_RATE_LIMITED',
          message: 'AI providers are rate-limited. Please try again shortly.',
        });
      }

      // Standard degraded response (HTTP 200)
      return res.status(200).json(
        buildDegradedResponse(routerOutcome.errors, routerOutcome.failoverTrace)
      );
    }

    // --- Phase 3A: Validate provider output (PII → Zod → Rules) ---
    const { result: providerResult } = routerOutcome;

    const validation = runValidationPipeline(providerResult.rawText, {
      userName: originalName || undefined,
    });

    if (!validation.ok) {
      const statusMap = {
        pii_leak: 422,
        parse_error: 502,
        validation_error: 422,
      };
      const codeMap = {
        pii_leak: 'AI_PII_LEAK',
        parse_error: 'AI_PARSE_ERROR',
        validation_error: 'AI_VALIDATION_ERROR',
      };

      await updateAuditLog(auditLog, {
        provider: providerResult.provider,
        model: providerResult.model,
        status: validation.failStage,
        errorCode: validation.failStage,
        durationMs: routerDurationMs,
        tokenUsage: {
          ...(providerResult.tokenUsage || {}),
          ...(templateContext ? {
            templateRefs: templateContext.templateRefs,
            primaryTemplateId: templateContext.primaryTemplateId,
            registryVersion: templateContext.registryVersion,
          } : {}),
        },
      });

      const responseTime = Date.now() - startTime;
      updateMetrics('workoutGeneration', false, responseTime, 0, requesterId);

      return res.status(statusMap[validation.failStage] || 500).json({
        success: false,
        code: codeMap[validation.failStage] || 'AI_VALIDATION_ERROR',
        message: validation.failStage === 'pii_leak'
          ? 'AI output contained personal information and was rejected for privacy.'
          : validation.failStage === 'parse_error'
            ? 'AI response was not valid JSON'
            : `AI output validation failed: ${validation.failReason}`,
      });
    }

    // Log warnings from rule engine (non-blocking)
    if (validation.warnings.length > 0) {
      logger.info('[Validator] Warnings on AI output', { warnings: validation.warnings });
    }

    const aiPlan = validation.data;

    // --- Phase 5A: Draft mode — return plan for coach review without persisting ---
    if (isDraftMode) {
      await updateAuditLog(auditLog, {
        provider: providerResult.provider,
        model: providerResult.model,
        status: 'draft',
        outputHash: hashPayload(providerResult.rawText),
        durationMs: routerDurationMs,
        tokenUsage: providerResult.tokenUsage || {},
        promptVersion: PROMPT_VERSION,
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = providerResult.tokenUsage?.totalTokens || 0;
      updateMetrics('workoutGeneration', true, responseTime, tokensUsed, requesterId);

      return res.status(200).json({
        success: true,
        draft: true,
        plan: aiPlan,
        generationMode: unifiedContext.generationMode,
        explainability: unifiedContext.explainability,
        safetyConstraints: unifiedContext.safetyConstraints,
        exerciseRecommendations: unifiedContext.exerciseRecommendations,
        warnings: [
          ...(unifiedContext.explainability?.progressFlags || []),
          ...(unifiedContext.explainability?.safetyFlags || []),
          ...(validation.warnings || []),
        ],
        missingInputs: unifiedContext.missingInputs,
        provider: providerResult.provider,
        auditLogId: auditLog?.id || null,
      });
    }

    // --- Persist workout plan (unchanged from Phase 1) ---
    const transaction = await sequelize.transaction();
    const unmatchedExercises = [];
    let createdExerciseCount = 0;

    try {
      const durationWeeks = Number.isFinite(Number(aiPlan.durationWeeks))
        ? Math.max(1, Number(aiPlan.durationWeeks))
        : 4;

      const workoutPlan = await WorkoutPlan.create(
        {
          userId: targetUserId,
          title: aiPlan.planName || 'AI Workout Plan',
          description: aiPlan.summary || 'AI-generated workout plan',
          durationWeeks,
          status: 'active',
          tags: ['ai_generated'],
        },
        { transaction }
      );

      const days = Array.isArray(aiPlan.days) ? aiPlan.days : [];
      for (let i = 0; i < days.length; i += 1) {
        const day = days[i] || {};
        const dayNumber = Number.isFinite(Number(day.dayNumber)) ? Number(day.dayNumber) : i + 1;

        const workoutPlanDay = await WorkoutPlanDay.create(
          {
            workoutPlanId: workoutPlan.id,
            dayNumber,
            name: day.name || `Day ${dayNumber}`,
            focus: day.focus || null,
            dayType: normalizeDayType(day.dayType),
            optPhase: normalizeOptPhase(day.optPhase),
            notes: day.notes || null,
            warmupInstructions: day.warmupInstructions || null,
            cooldownInstructions: day.cooldownInstructions || null,
            estimatedDuration: Number.isFinite(Number(day.estimatedDuration))
              ? Number(day.estimatedDuration)
              : null,
            sortOrder: Number.isFinite(Number(day.sortOrder)) ? Number(day.sortOrder) : i + 1,
          },
          { transaction }
        );

        const exercises = Array.isArray(day.exercises) ? day.exercises : [];
        for (let j = 0; j < exercises.length; j += 1) {
          const exercise = exercises[j] || {};
          const exerciseName = exercise.name ? String(exercise.name) : '';
          const exerciseRecord = await findExerciseByName(Exercise, exerciseName, transaction);

          if (!exerciseRecord) {
            unmatchedExercises.push({ dayNumber, name: exerciseName });
            continue;
          }

          await WorkoutPlanDayExercise.create(
            {
              workoutPlanDayId: workoutPlanDay.id,
              exerciseId: exerciseRecord.id,
              orderInWorkout: Number.isFinite(Number(exercise.orderInWorkout))
                ? Number(exercise.orderInWorkout)
                : j + 1,
              setScheme: exercise.setScheme || null,
              repGoal: exercise.repGoal || null,
              restPeriod: Number.isFinite(Number(exercise.restPeriod))
                ? Number(exercise.restPeriod)
                : null,
              tempo: exercise.tempo || null,
              intensityGuideline: exercise.intensityGuideline || null,
              notes: exercise.notes || null,
              isOptional: Boolean(exercise.isOptional),
            },
            { transaction }
          );

          createdExerciseCount += 1;
        }
      }

      if (createdExerciseCount === 0) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          message: 'No exercises matched existing library entries',
          unmatchedExercises,
        });
      }

      await transaction.commit();

      // --- Update audit log: success ---
      await updateAuditLog(auditLog, {
        provider: providerResult.provider,
        model: providerResult.model,
        status: 'success',
        outputHash: hashPayload(providerResult.rawText),
        durationMs: routerDurationMs,
        tokenUsage: {
          ...(providerResult.tokenUsage || {}),
          ...(templateContext ? {
            templateRefs: templateContext.templateRefs,
            primaryTemplateId: templateContext.primaryTemplateId,
            registryVersion: templateContext.registryVersion,
          } : {}),
        },
        promptVersion: PROMPT_VERSION,
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = providerResult.tokenUsage?.totalTokens || 0;
      updateMetrics('workoutGeneration', true, responseTime, tokensUsed, requesterId);

      const workouts = (Array.isArray(aiPlan.days) ? aiPlan.days : []).map((day) => ({
        day: day.name || `Day ${day.dayNumber || ''}`.trim(),
        exercises: (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) => ({
          name: exercise.name,
          sets: exercise.setScheme,
          reps: exercise.repGoal,
          weight: exercise.weight || null,
        })),
      }));

      return res.status(200).json({
        success: true,
        draft: false,
        planId: workoutPlan.id,
        summary: aiPlan.summary || 'Workout plan generated',
        workouts,
        unmatchedExercises,
        generationMode: unifiedContext.generationMode,
        explainability: unifiedContext.explainability,
        warnings: [
          ...(unifiedContext.explainability?.progressFlags || []),
          ...(unifiedContext.explainability?.safetyFlags || []),
          ...(validation.warnings || []),
        ],
        missingInputs: unifiedContext.missingInputs,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateMetrics('workoutGeneration', false, responseTime, 0, req.user?.id);

    // Finalize audit log so no rows stay stuck in 'pending'
    await updateAuditLog(auditLog, {
      status: 'error',
      errorCode: 'INTERNAL_ERROR',
      durationMs: responseTime,
    });

    logger.error('AI workout generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate workout plan',
    });
  } finally {
    // Always release the concurrent rate-limit lock
    if (requesterId) {
      releaseConcurrent(requesterId);
    }
  }
};

/**
 * Phase 5A: Approve and persist a draft workout plan.
 *
 * POST /api/ai/workout-generation/approve
 * Body: { userId, plan, auditLogId?, trainerNotes? }
 *
 * The plan object should match the AI output schema (planName, days, exercises).
 * The coach/trainer may have modified exercises before approval.
 */
export const approveDraftPlan = async (req, res) => {
  try {
    const { userId: rawUserId, plan, auditLogId, trainerNotes } = req.body || {};
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    // --- 1. Auth check ---
    if (!requesterId || !requesterRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // --- 2. Role check: Only trainers and admins can approve drafts ---
    if (requesterRole !== 'trainer' && requesterRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only trainers and admins can approve workout plans',
      });
    }

    // --- 3. Input presence ---
    const parsedUserId = Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;
    if (!parsedUserId) {
      return res.status(400).json({ success: false, message: 'Missing or invalid userId' });
    }

    if (!plan || typeof plan !== 'object') {
      return res.status(400).json({ success: false, message: 'Missing plan data' });
    }

    const models = getAllModels();
    const { User, Exercise, WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, ClientTrainerAssignment } = models;

    // --- 4. Target user existence check ---
    const targetUser = await User.findByPk(parsedUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // --- 5. Trainer assignment RBAC (mirrors generation path — BEFORE validation) ---
    if (requesterRole === 'trainer' && ClientTrainerAssignment) {
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedUserId,
          trainerId: requesterId,
          status: 'active',
        },
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          code: 'AI_ASSIGNMENT_DENIED',
          message: 'Access denied: Trainer is not assigned to this client',
        });
      }
    }

    // --- 6. Re-check AI consent at approval time (BEFORE validation) ---
    const { AiPrivacyProfile } = models;
    if (AiPrivacyProfile) {
      const consentProfile = await AiPrivacyProfile.findOne({
        where: { userId: parsedUserId },
      });

      if (!consentProfile) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has not been granted. Please complete the AI consent flow before using AI-powered features.',
          code: 'AI_CONSENT_MISSING',
        });
      }

      if (!consentProfile.aiEnabled) {
        return res.status(403).json({
          success: false,
          message: 'AI features are currently disabled for this account.',
          code: 'AI_CONSENT_DISABLED',
        });
      }

      if (consentProfile.withdrawnAt) {
        return res.status(403).json({
          success: false,
          message: 'AI consent has been withdrawn. Please re-consent to use AI-powered features.',
          code: 'AI_CONSENT_WITHDRAWN',
        });
      }
    }

    // --- 7. Validate edited draft (AFTER authz + consent) ---
    const draftValidation = validateApprovedDraftPlan({ draft: plan });
    if (!draftValidation.valid) {
      return res.status(422).json({
        success: false,
        message: 'Approved draft validation failed',
        code: 'APPROVED_DRAFT_INVALID',
        errors: draftValidation.errors,
        warnings: draftValidation.warnings,
      });
    }

    // --- 8. Persist validated draft ---
    const approvedPlan = draftValidation.normalizedDraft;
    const transaction = await sequelize.transaction();
    const unmatchedExercises = [];
    let createdExerciseCount = 0;

    try {
      const durationWeeks = Number.isFinite(Number(approvedPlan.durationWeeks))
        ? Math.max(1, Number(approvedPlan.durationWeeks))
        : 4;

      const workoutPlan = await WorkoutPlan.create(
        {
          userId: parsedUserId,
          title: approvedPlan.planName || 'AI Workout Plan (Coach Approved)',
          description: approvedPlan.summary || 'AI-generated workout plan approved by coach',
          durationWeeks,
          status: 'active',
          tags: ['ai_generated', 'coach_approved'],
        },
        { transaction }
      );

      const days = Array.isArray(approvedPlan.days) ? approvedPlan.days : [];
      for (let i = 0; i < days.length; i += 1) {
        const day = days[i] || {};
        const dayNumber = Number.isFinite(Number(day.dayNumber)) ? Number(day.dayNumber) : i + 1;

        const workoutPlanDay = await WorkoutPlanDay.create(
          {
            workoutPlanId: workoutPlan.id,
            dayNumber,
            name: day.name || `Day ${dayNumber}`,
            focus: day.focus || null,
            dayType: normalizeDayType(day.dayType),
            optPhase: normalizeOptPhase(day.optPhase),
            notes: day.notes || null,
            warmupInstructions: day.warmupInstructions || null,
            cooldownInstructions: day.cooldownInstructions || null,
            estimatedDuration: Number.isFinite(Number(day.estimatedDuration))
              ? Number(day.estimatedDuration)
              : null,
            sortOrder: Number.isFinite(Number(day.sortOrder)) ? Number(day.sortOrder) : i + 1,
          },
          { transaction }
        );

        const exercises = Array.isArray(day.exercises) ? day.exercises : [];
        for (let j = 0; j < exercises.length; j += 1) {
          const exercise = exercises[j] || {};
          const exerciseName = exercise.name ? String(exercise.name) : '';
          const exerciseRecord = await findExerciseByName(Exercise, exerciseName, transaction);

          if (!exerciseRecord) {
            unmatchedExercises.push({ dayNumber, name: exerciseName });
            continue;
          }

          await WorkoutPlanDayExercise.create(
            {
              workoutPlanDayId: workoutPlanDay.id,
              exerciseId: exerciseRecord.id,
              orderInWorkout: Number.isFinite(Number(exercise.orderInWorkout))
                ? Number(exercise.orderInWorkout)
                : j + 1,
              setScheme: exercise.setScheme || null,
              repGoal: exercise.repGoal || null,
              restPeriod: Number.isFinite(Number(exercise.restPeriod))
                ? Number(exercise.restPeriod)
                : null,
              tempo: exercise.tempo || null,
              intensityGuideline: exercise.intensityGuideline || null,
              notes: exercise.notes || null,
              isOptional: Boolean(exercise.isOptional),
            },
            { transaction }
          );

          createdExerciseCount += 1;
        }
      }

      if (createdExerciseCount === 0) {
        await transaction.rollback();
        return res.status(422).json({
          success: false,
          message: 'No exercises matched existing library entries',
          unmatchedExercises,
        });
      }

      await transaction.commit();

      // --- Phase 5A Hardening: Update audit log via tokenUsage merge (no metadata field) ---
      if (auditLogId) {
        const { AiInteractionLog } = models;
        if (AiInteractionLog) {
          try {
            const existingLog = await AiInteractionLog.findByPk(auditLogId);
            if (existingLog) {
              const existingTokenUsage = existingLog.tokenUsage || {};
              await existingLog.update({
                status: 'approved',
                tokenUsage: {
                  ...existingTokenUsage,
                  approval: {
                    approvedAt: new Date().toISOString(),
                    approvedByUserId: requesterId,
                    sourceType: 'coach_approved',
                    trainerNotes: trainerNotes || null,
                    validationPassed: true,
                    warningsCount: draftValidation.warnings.length,
                  },
                },
              });
            }
          } catch (logErr) {
            logger.warn('Failed to update audit log on approval:', logErr.message);
          }
        }
      }

      logger.info('Draft workout plan approved and persisted', {
        planId: workoutPlan.id,
        approvedBy: requesterId,
        clientUserId: parsedUserId,
        exerciseCount: createdExerciseCount,
      });

      return res.status(200).json({
        success: true,
        planId: workoutPlan.id,
        sourceType: 'coach_approved',
        summary: approvedPlan.summary || 'Workout plan approved and saved',
        unmatchedExercises,
        validationWarnings: draftValidation.warnings,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Draft plan approval failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve workout plan',
    });
  }
};
