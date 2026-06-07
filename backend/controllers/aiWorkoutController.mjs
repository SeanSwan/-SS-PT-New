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
import { buildMasterPromptFromUserData } from '../services/masterPromptBuilder.mjs';
import { routeAiGeneration } from '../services/ai/providerRouter.mjs';
import { runValidationPipeline, validateApprovedDraftPlan } from '../services/ai/outputValidator.mjs';
import { buildDegradedResponse } from '../services/ai/degradedResponse.mjs';
import { releaseConcurrent } from '../services/ai/rateLimiter.mjs';
import { PROMPT_VERSION } from '../services/ai/types.mjs';
import { buildTemplateContext } from '../services/ai/templateContextBuilder.mjs';
import { buildProgressContext } from '../services/ai/progressContextBuilder.mjs';
import { buildUnifiedContext } from '../services/ai/contextBuilder.mjs';
import { buildMeasurementContext } from '../services/ai/measurementContextBuilder.mjs';
import { checkAiEligibility } from '../services/ai/aiEligibilityHelper.mjs';
import { buildSwanCoachPlanningApprovalGate } from '../services/swanCoachPlanningApprovalGateService.mjs';
import { buildWorkoutGenerationPlanningFingerprint } from '../services/swanCoachPlanningGenerationFingerprintService.mjs';
import { findExerciseByName, buildExerciseLookupMap } from '../utils/exerciseLookup.mjs';
import {
  ALLOWED_DAY_TYPES,
  ALLOWED_OPT_PHASES,
  OPT_PHASE_KEY_BY_NUMBER,
  normalizeDayType,
  normalizeOptPhase,
  toOptPhaseKey,
  preflightValidatePlan,
  persistWorkoutPlan,
} from '../utils/workoutPlanPersistence.mjs';

/**
 * fetchOptionalContext — DRY helper for non-blocking context fetches.
 * Returns null on failure, logs warning instead of crashing.
 */
const fetchOptionalContext = async (model, fetchFn, contextName) => {
  if (!model) return null;
  try {
    return await fetchFn();
  } catch (err) {
    logger.warn(`Failed to build ${contextName} (non-blocking):`, err.message);
    return null;
  }
};

// Shared workout plan utilities (DRY — used by both generate and approve flows)
const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const isValidWorkoutApprovalAuditLog = ({ auditLog, targetUserId, auditLogId }) => {
  if (!auditLog) return false;
  if (Number(auditLog.userId) !== Number(targetUserId)) {
    logger.warn('Workout approval audit log userId mismatch, skipping linkage', {
      auditLogId,
      targetUserId,
      auditLogUserId: auditLog.userId,
    });
    return false;
  }
  if (auditLog.requestType !== 'workout_generation') {
    logger.warn('Workout approval audit log requestType mismatch, skipping linkage', {
      auditLogId,
      requestType: auditLog.requestType,
    });
    return false;
  }
  if (auditLog.status && !['draft', 'success'].includes(auditLog.status)) {
    logger.warn('Workout approval audit log status invalid, skipping linkage', {
      auditLogId,
      status: auditLog.status,
    });
    return false;
  }
  return true;
};

// normalizeDayType, normalizeOptPhase, toOptPhaseKey imported from workoutPlanPersistence.mjs

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

// findExerciseByName imported from utils/exerciseLookup.mjs

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
  logger.info('[AI Workout] generateWorkoutPlan called', {
    method: req.method,
    path: req.originalUrl,
    requesterId: req.user?.id,
    targetUserId: req.body?.userId,
    mode: req.body?.mode,
  });

  const startTime = Date.now();
  const requesterId = req.user?.id;
  let auditLog = null;
  let eligibilityOverride = null;

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

    const parsed = Number(rawUserId);
    const targetUserId = (Number.isInteger(parsed) && parsed > 0) ? parsed
      : (requesterRole === 'client') ? requesterId
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
      AiConsentLog,
      BodyMeasurement,
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

    const eligibility = await checkAiEligibility({
      targetUserId,
      actorUserId: requesterId,
      actorRole: requesterRole,
      models,
      featureType: 'workout_generation',
    });

    if (eligibility.decision === 'deny') {
      return res.status(403).json({
        success: false,
        code: eligibility.reasonCode,
        message: 'AI consent check failed. Please ensure AI consent is granted for this user.',
      });
    }

    if (eligibility.decision === 'allow_with_override_warning') {
      const { overrideReason } = req.body || {};
      if (!overrideReason || typeof overrideReason !== 'string' || !overrideReason.trim()) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_OVERRIDE_REASON',
          message: 'Admin override requires an overrideReason when AI consent is not present.',
        });
      }

      eligibilityOverride = {
        actorUserId: requesterId,
        overrideAt: new Date().toISOString(),
        overrideReason: overrideReason.trim(),
        warning: 'AI_CONSENT_OVERRIDE_USED',
      };
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (eligibilityOverride && AiConsentLog) {
      await AiConsentLog.create({
        userId: targetUserId,
        action: 'override_used',
        sourceType: 'admin_override',
        actorUserId: requesterId,
        reason: eligibilityOverride.overrideReason,
        metadata: { endpoint: 'workout_generation' },
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
      // Auto-build from available user data instead of returning 404
      try {
        resolvedMasterPrompt = await buildMasterPromptFromUserData(targetUser);
        if (resolvedMasterPrompt) {
          // Save for future use so we don't rebuild every time
          await targetUser.update({ masterPromptJson: resolvedMasterPrompt });
          logger.info('Auto-generated masterPromptJson for user', { targetUserId });
        }
      } catch (buildErr) {
        logger.warn('Failed to auto-build masterPromptJson', { targetUserId, error: buildErr.message });
      }

      // Final fallback — generate a minimal valid prompt so generation never 404s
      if (!resolvedMasterPrompt || !isPlainObject(resolvedMasterPrompt)) {
        logger.info('Using minimal fallback masterPromptJson', { targetUserId });
        resolvedMasterPrompt = {
          version: '5.0',
          generatedAt: new Date().toISOString(),
          autoGenerated: true,
          clientProfile: {
            name: targetUser.firstName && targetUser.lastName
              ? `${targetUser.firstName} ${targetUser.lastName}`
              : targetUser.username || 'Client',
            dateOfBirth: targetUser.dateOfBirth || null,
            gender: targetUser.gender || null,
            weight: targetUser.weight || null,
            height: targetUser.height || null,
          },
          goals: {
            primary: targetUser.fitnessGoal || 'general_fitness',
            secondary: [],
            notes: null,
          },
          fitnessBackground: {
            experienceLevel: 'beginner',
            trainingExperience: null,
            currentActivityLevel: null,
            preferredExercises: [],
            dislikedExercises: [],
          },
          health: {
            concerns: targetUser.healthConcerns || null,
            medicalClearanceRequired: false,
            injuries: null,
          },
          movementAssessment: null,
          equipment: [{ profileName: 'Default', locationType: 'gym', items: [] }],
          trainingHistory: { totalSessions: 0, detailedRecent: [], historicalSummary: null },
          measurements: null,
          painAndInjuries: { activePainEntries: [], totalActiveIssues: 0 },
          bodyCompositionTrend: {
            measurements: [],
            weightTrend: 'insufficient_data',
            bodyFatTrend: 'insufficient_data',
            muscleTrend: 'insufficient_data',
          },
          trainerFlags: { criticalNotes: [] },
          activeGoals: [],
          consistency: {
            sessionsLast7Days: 0,
            sessionsLast30Days: 0,
            averageSessionsPerWeek: 0,
            longestStreak: 0,
            lastWorkoutDate: null,
            daysSinceLastWorkout: null,
          },
        };
      }
    }

    // --- Phase 1: De-identify masterPromptJson before AI call ---
    const deIdResult = deIdentify(resolvedMasterPrompt, {
      clientId: targetUser.id,
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
        // Fetch recent workout sessions — capped at 90 days / 100 sessions for performance
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const recentSessions = await WorkoutSession.findAll({
          where: { userId: targetUserId, date: { [Op.gte]: ninetyDaysAgo } },
          order: [['date', 'DESC']],
          limit: 100,
          include: WorkoutLog ? [{ model: WorkoutLog, as: 'logs', limit: 20, separate: true, order: [['createdAt', 'DESC']] }] : [],
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

    // Phase 11F: Fetch recent body measurements for AI context
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const measurementContext = await fetchOptionalContext(BodyMeasurement, async () => {
      const recentMeasurements = await BodyMeasurement.findAll({
        where: { userId: targetUserId, measurementDate: { [Op.gte]: sixMonthsAgo } },
        order: [['measurementDate', 'DESC']],
        limit: 50,
      });
      return recentMeasurements?.length > 0 ? buildMeasurementContext(recentMeasurements) : null;
    }, 'measurement context');

    // Phase 12: Fetch active pain/injury entries for AI context
    const { ClientPainEntry } = models;
    const painEntries = await fetchOptionalContext(ClientPainEntry, async () => {
      const entries = await ClientPainEntry.findAll({
        where: { userId: targetUserId, isActive: true },
        order: [['painLevel', 'DESC']],
        limit: 50,
      });
      if (entries?.length > 0) {
        logger.info('[AI Workout] Pain entries found for context', {
          userId: targetUserId,
          count: entries.length,
          severeCount: entries.filter(e => e.painLevel >= 7).length,
        });
      }
      return entries?.length > 0 ? entries : null;
    }, 'pain entries');

    // Phase 14: Fetch nutrition history for AI context (non-blocking)
    const { DailyMacroLog } = models;
    const nutritionContext = await fetchOptionalContext(DailyMacroLog, async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const macroLogs = await DailyMacroLog.findAll({
        where: { userId: targetUserId, date: { [Op.gte]: thirtyDaysAgo } },
        order: [['date', 'DESC']],
        limit: 90, // Up to 3 meals/day × 30 days
        attributes: ['date', 'mealType', 'calories', 'protein', 'carbs', 'fat', 'fiber'],
      });
      if (macroLogs.length === 0) return null;
      const totalDays = new Set(macroLogs.map(l => l.date?.toISOString?.()?.split('T')[0] || l.date)).size;
      const totals = macroLogs.reduce((acc, l) => ({
        calories: acc.calories + (l.calories || 0),
        protein: acc.protein + (l.protein || 0),
        carbs: acc.carbs + (l.carbs || 0),
        fat: acc.fat + (l.fat || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      logger.info('[AI Workout] Nutrition context built', { userId: targetUserId, daysLogged: totalDays });
      return {
        daysLogged: totalDays,
        totalEntries: macroLogs.length,
        avgDailyCalories: totalDays > 0 ? Math.round(totals.calories / totalDays) : null,
        avgDailyProtein: totalDays > 0 ? Math.round(totals.protein / totalDays) : null,
        avgDailyCarbs: totalDays > 0 ? Math.round(totals.carbs / totalDays) : null,
        avgDailyFat: totalDays > 0 ? Math.round(totals.fat / totalDays) : null,
      };
    }, 'nutrition context');

    // Phase 14: Fetch health history from waiver records (non-blocking)
    const { WaiverRecord } = models;
    const healthHistory = await fetchOptionalContext(WaiverRecord, async () => {
      const waiverRecord = await WaiverRecord.findOne({
        where: { userId: targetUserId },
        order: [['createdAt', 'DESC']],
        attributes: ['activityTypes', 'medicalConditions', 'injuries', 'medications', 'createdAt'],
      });
      if (!waiverRecord) return null;
      logger.info('[AI Workout] Health history loaded from waiver', { userId: targetUserId });
      return {
        activityTypes: waiverRecord.activityTypes || [],
        medicalConditions: waiverRecord.medicalConditions || [],
        injuries: waiverRecord.injuries || [],
        medications: waiverRecord.medications || [],
        waiverDate: waiverRecord.createdAt,
      };
    }, 'waiver health history');

    // Phase 14: Fetch movement analysis records (non-blocking)
    const { MovementAnalysis } = models;
    const movementAssessments = await fetchOptionalContext(MovementAnalysis, async () => {
      const analyses = await MovementAnalysis.findAll({
        where: { userId: targetUserId },
        order: [['createdAt', 'DESC']],
        limit: 5,
      });
      if (analyses.length === 0) return null;
      logger.info('[AI Workout] Movement analyses loaded', { userId: targetUserId, count: analyses.length });
      return analyses.map(a => a.get({ plain: true }));
    }, 'movement analyses');

    // Phase 15: Fetch equipment profiles for AI context (names only — 84% token reduction per consensus)
    const { EquipmentProfile, EquipmentItem } = models;
    const equipmentContext = await fetchOptionalContext(EquipmentProfile, async () => {
      // Find trainer's default profile (or any active profile)
      const trainerId = requesterRole === 'trainer' ? requesterId
        : requesterRole === 'admin' ? requesterId : null;
      if (!trainerId) return null;

      const profiles = await EquipmentProfile.findAll({
        where: { trainerId, isActive: true },
        order: [['isDefault', 'DESC'], ['updatedAt', 'DESC']],
        limit: 3,
        include: EquipmentItem ? [{
          model: EquipmentItem,
          as: 'items',
          where: { isActive: true, approvalStatus: 'approved' },
          required: false,
          attributes: ['name', 'category', 'resistanceType'],
        }] : [],
      });
      if (!profiles?.length) return null;

      // Flatten to unique equipment names by category (minimal tokens)
      const byCategory = {};
      for (const profile of profiles) {
        for (const item of (profile.items || [])) {
          const cat = item.category || 'other';
          if (!byCategory[cat]) byCategory[cat] = new Set();
          byCategory[cat].add(item.name);
        }
      }
      const result = {};
      for (const [cat, names] of Object.entries(byCategory)) {
        result[cat] = [...names];
      }
      logger.info('[AI Workout] Equipment context built', {
        userId: targetUserId,
        categories: Object.keys(result).length,
        totalItems: Object.values(result).reduce((s, arr) => s + arr.length, 0),
      });
      return result;
    }, 'equipment context');

    // Phase 5A: Build unified generation context
    const unifiedContext = buildUnifiedContext({
      deIdentifiedPayload: safePayload,
      nasmConstraints,
      templateContext,
      progressContext,
      measurementContext,
      painEntries: painEntries || [],
      nutritionContext,
      healthHistory,
      movementAssessments,
      equipmentContext,
      clientSource: ['swanstudios', 'move_fitness', 'external'].includes(targetUser.clientSource)
        ? targetUser.clientSource
        : 'swanstudios',
    });

    // Attach progress + unified context to serverConstraints for prompt enrichment
    if (progressContext && progressContext.recentSessionCount > 0) {
      serverConstraints.progressContext = progressContext;
    }
    if (unifiedContext.exerciseRecommendations?.length > 0) {
      serverConstraints.exerciseRecommendations = unifiedContext.exerciseRecommendations;
    }
    if (measurementContext) {
      serverConstraints.measurementTrends = measurementContext;
    }
    if (unifiedContext.painConstraints) {
      serverConstraints.painConstraints = unifiedContext.painConstraints;
    }
    if (unifiedContext.goalProgress) {
      serverConstraints.goalProgress = unifiedContext.goalProgress;
    }
    if (unifiedContext.nutritionSummary) {
      serverConstraints.nutritionSummary = unifiedContext.nutritionSummary;
    }
    if (unifiedContext.healthHistorySummary) {
      serverConstraints.healthHistory = unifiedContext.healthHistorySummary;
    }
    if (equipmentContext) {
      serverConstraints.availableEquipment = equipmentContext;
    }
    if (unifiedContext.movementContext) {
      serverConstraints.movementAssessments = unifiedContext.movementContext;
    }
    if (unifiedContext.clientSourceContext) {
      serverConstraints.clientSource = unifiedContext.clientSourceContext;
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
        ...(eligibilityOverride ? {
          tokenUsage: { ...(auditLog?.tokenUsage || {}), eligibilityOverride },
        } : {}),
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
    // Self-healing pipeline: validate → if non-PII failure, retry once with correction prompt
    const { result: providerResult } = routerOutcome;
    const validationOpts = {
      userName: originalName || undefined,
      optPhase: serverConstraints?.optPhase || undefined,
    };

    let validation = runValidationPipeline(providerResult.rawText, validationOpts);

    // --- Phase 3A-retry: Self-healing retry with correction prompt ---
    // Only retry structural/rule validation failures. Raw JSON parse errors should
    // stay explicit so the API contract and audit log remain deterministic.
    if (!validation.ok && validation.failStage === 'validation_error') {
      logger.warn('[Self-Heal] Validation failed, attempting retry with correction prompt', {
        failStage: validation.failStage,
        failReason: validation.failReason,
      });

      const correctionPrompt = `CRITICAL CORRECTION: Your previous output failed validation. Error: ${validation.failReason}. `
        + 'You MUST return valid JSON matching this exact schema: { "planName": string, "durationWeeks": number, '
        + '"summary": string, "days": [{ "dayNumber": number, "name": string, "focus": string, "exercises": '
        + '[{ "name": string, "setScheme": string, "repGoal": string, "restPeriod": number (0-600), '
        + '"tempo": string (format: "4/2/1" or "X/0/X"), "intensityGuideline": string }] }] }. '
        + 'Regenerate the workout with this exact structure. No markdown, no code fences, pure JSON only.';

      const retryOutcome = await routeAiGeneration({
        requestType: 'workout_generation',
        userId: targetUserId,
        deidentifiedPayload: safePayload,
        serverConstraints,
        payloadHash,
        promptVersion: PROMPT_VERSION,
        correctionPrompt,
      });

      if (retryOutcome.ok) {
        const retryValidation = runValidationPipeline(retryOutcome.result.rawText, validationOpts);
        if (retryValidation.ok) {
          logger.info('[Self-Heal] Retry succeeded after correction prompt');
          // Use the retried result
          validation = retryValidation;
          // Update providerResult reference for downstream (audit log, metrics)
          Object.assign(providerResult, retryOutcome.result);
        } else {
          logger.warn('[Self-Heal] Retry also failed validation', {
            failStage: retryValidation.failStage,
            failReason: retryValidation.failReason,
          });
          // Fall through to error handling below with original validation
        }
      } else {
        logger.warn('[Self-Heal] Retry router call failed', {
          errors: retryOutcome.errors?.map(e => e.code),
        });
      }
    }

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
          ...(eligibilityOverride ? { eligibilityOverride } : {}),
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
    const swanCoachPlanning = buildWorkoutGenerationPlanningFingerprint({
      aiPlan,
      safePayload,
      unifiedContext,
      progressContext,
      measurementContext,
      nutritionContext,
      nasmConstraints,
      equipmentContext,
    });

    // --- Phase 5A: Draft mode — return plan for coach review without persisting ---
    if (isDraftMode) {
      await updateAuditLog(auditLog, {
        provider: providerResult.provider,
        model: providerResult.model,
        status: 'draft',
        outputHash: hashPayload(providerResult.rawText),
        durationMs: routerDurationMs,
        tokenUsage: {
          ...(providerResult.tokenUsage || {}),
          swanCoachPlanning,
          ...(eligibilityOverride ? { eligibilityOverride } : {}),
        },
        promptVersion: PROMPT_VERSION,
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = providerResult.tokenUsage?.totalTokens || 0;
      updateMetrics('workoutGeneration', true, responseTime, tokensUsed, requesterId);

      return res.status(200).json({
        success: true,
        draft: true,
        planningSystem: 'swan_coach_planning',
        swanCoachPlanning,
        plan: aiPlan,
        generationMode: unifiedContext.generationMode,
        explainability: unifiedContext.explainability,
        safetyConstraints: unifiedContext.safetyConstraints,
        painConstraints: unifiedContext.painConstraints || null,
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

    // --- Pre-flight validation (before any transaction) ---
    const preflight = preflightValidatePlan(aiPlan);
    if (!preflight.valid) {
      return res.status(preflight.error.status).json(preflight.error.body);
    }

    // --- Persist workout plan (shared utility + manual transaction) ---
    const transaction = await sequelize.transaction();
    let workoutPlan, createdExerciseCount, unmatchedExercises;

    try {
      const persistResult = await persistWorkoutPlan({
        plan: aiPlan,
        userId: targetUserId,
        models: { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise },
        transaction,
        tags: ['ai_generated'],
      });
      workoutPlan = persistResult.workoutPlan;
      createdExerciseCount = persistResult.createdExerciseCount;
      unmatchedExercises = persistResult.unmatchedExercises;

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
          swanCoachPlanning,
          ...(eligibilityOverride ? { eligibilityOverride } : {}),
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
        planningSystem: 'swan_coach_planning',
        swanCoachPlanning,
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
      if (error.code === 'NO_EXERCISE_MATCHES') {
        return res.status(422).json({
          success: false,
          message: 'No exercises matched existing library entries',
          unmatchedExercises: error.unmatchedExercises || [],
        });
      }
      throw error;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateMetrics('workoutGeneration', false, responseTime, 0, req.user?.id);

    // Finalize audit log so no rows stay stuck in 'pending'
    await updateAuditLog(auditLog, {
      status: 'error',
      errorCode: error.code || 'INTERNAL_ERROR',
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 1000),
      durationMs: responseTime,
    });

    logger.error('AI workout generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to generate workout plan'
        : (error.message || 'Failed to generate workout plan'),
    });
  } finally {
    // Direct controller tests may call this without aiRateLimiter middleware.
    // In that case the controller still owns the lock lifecycle.
    if (!req.aiRateLimitManaged && requesterId) {
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
    const {
      userId: rawUserId,
      plan,
      auditLogId,
      trainerNotes,
      planningReviewAcknowledged,
    } = req.body || {};
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
    const {
      User,
      Exercise,
      WorkoutPlan,
      WorkoutPlanDay,
      WorkoutPlanDayExercise,
      ClientTrainerAssignment,
      AiConsentLog,
      AiInteractionLog,
    } = models;

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

    const eligibility = await checkAiEligibility({
      targetUserId: parsedUserId,
      actorUserId: requesterId,
      actorRole: requesterRole,
      models,
      featureType: 'workout_generation',
    });

    if (eligibility.decision === 'deny') {
      return res.status(403).json({
        success: false,
        code: eligibility.reasonCode,
        message: 'AI consent check failed. Please ensure AI consent is granted for this user.',
      });
    }

    let eligibilityOverride = null;
    if (eligibility.decision === 'allow_with_override_warning') {
      const { overrideReason } = req.body || {};
      if (!overrideReason || typeof overrideReason !== 'string' || !overrideReason.trim()) {
        return res.status(400).json({
          success: false,
          code: 'MISSING_OVERRIDE_REASON',
          message: 'Admin override requires an overrideReason when AI consent is not present.',
        });
      }

      eligibilityOverride = {
        actorUserId: requesterId,
        overrideAt: new Date().toISOString(),
        overrideReason: overrideReason.trim(),
        warning: 'AI_CONSENT_OVERRIDE_USED',
      };
    }

    if (eligibilityOverride && AiConsentLog) {
      await AiConsentLog.create({
        userId: parsedUserId,
        action: 'override_used',
        sourceType: 'admin_override',
        actorUserId: requesterId,
        reason: eligibilityOverride.overrideReason,
        metadata: { endpoint: 'workout_generation' },
      });
    }

    let approvalAuditLog = null;
    if (auditLogId && AiInteractionLog) {
      try {
        const auditLogRecord = await AiInteractionLog.findByPk(auditLogId);
        approvalAuditLog = isValidWorkoutApprovalAuditLog({
          auditLog: auditLogRecord,
          targetUserId: parsedUserId,
          auditLogId,
        }) ? auditLogRecord : null;
      } catch (logErr) {
        logger.warn('Failed to fetch audit log before approval gate:', logErr.message);
      }
    }

    const planningApprovalGate = buildSwanCoachPlanningApprovalGate({
      swanCoachPlanning: approvalAuditLog?.tokenUsage?.swanCoachPlanning,
      planningReviewAcknowledged,
      reviewerUserId: requesterId,
    });

    if (!planningApprovalGate.allowed) {
      return res.status(planningApprovalGate.error.status).json({
        success: false,
        code: planningApprovalGate.error.code,
        message: planningApprovalGate.error.message,
        reviewRequiredSignals: planningApprovalGate.error.reviewRequiredSignals,
        missingCriticalData: planningApprovalGate.error.missingCriticalData,
      });
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

    // --- 8. Pre-flight + persist validated draft ---
    const approvedPlan = draftValidation.normalizedDraft;
    const approvePreflight = preflightValidatePlan(approvedPlan);
    if (!approvePreflight.valid) {
      return res.status(approvePreflight.error.status).json(approvePreflight.error.body);
    }

    const transaction = await sequelize.transaction();
    let workoutPlan, createdExerciseCount, unmatchedExercises;

    try {
      const persistResult = await persistWorkoutPlan({
        plan: approvedPlan,
        userId: parsedUserId,
        models: { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise },
        transaction,
        tags: ['ai_generated', 'coach_approved'],
      });
      workoutPlan = persistResult.workoutPlan;
      createdExerciseCount = persistResult.createdExerciseCount;
      unmatchedExercises = persistResult.unmatchedExercises;

      await transaction.commit();

      // --- Phase 5A Hardening: Update audit log via tokenUsage merge (no metadata field) ---
      if (approvalAuditLog) {
        try {
          const existingTokenUsage = approvalAuditLog.tokenUsage || {};
          const swanCoachPlanningReview = planningApprovalGate.hasSwanCoachPlanning
            ? { swanCoachPlanningReview: planningApprovalGate.auditRecord }
            : {};
          await approvalAuditLog.update({
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
                ...swanCoachPlanningReview,
                ...(eligibilityOverride ? { eligibilityOverride } : {}),
              },
            },
          });
        } catch (logErr) {
          logger.warn('Failed to update audit log on approval:', logErr.message);
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
      if (error.code === 'NO_EXERCISE_MATCHES') {
        return res.status(422).json({
          success: false,
          message: 'No exercises matched existing library entries',
          unmatchedExercises: error.unmatchedExercises || [],
        });
      }
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
      message: 'Failed to approve workout plan',
    });
  }
};
