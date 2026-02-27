/**
 * Long-Horizon Plan Controller — Phase 5C-C / 5C-D
 * ==================================================
 * Generation (5C-C) + Approval/Persistence (5C-D) for
 * 3/6/12 month NASM-aligned periodization plans via AI.
 *
 * Exports:
 *   generateLongHorizonPlan  — POST /api/ai/long-horizon/generate
 *   approveLongHorizonPlan   — POST /api/ai/long-horizon/approve
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { getAllModels } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { deIdentify, hashPayload } from '../services/deIdentificationService.mjs';
import { routeAiGeneration } from '../services/ai/providerRouter.mjs';
import { runLongHorizonValidationPipeline } from '../services/ai/longHorizonOutputValidator.mjs';
import { buildDegradedResponse } from '../services/ai/degradedResponse.mjs';
import { releaseConcurrent } from '../services/ai/rateLimiter.mjs';
import { PROMPT_VERSION } from '../services/ai/types.mjs';
import { buildTemplateContext } from '../services/ai/templateContextBuilder.mjs';
import { buildLongHorizonContext } from '../services/ai/longHorizonContextBuilder.mjs';
import { buildLongHorizonPrompt, LONG_HORIZON_SYSTEM_MESSAGE } from '../services/ai/longHorizonPromptBuilder.mjs';
import { updateMetrics } from '../routes/aiMonitoringRoutes.mjs';
import { checkAiEligibility } from '../services/ai/aiEligibilityHelper.mjs';
import { validateLongHorizonApproval } from '../services/ai/longHorizonApprovalValidator.mjs';
import { stableStringify } from '../services/ai/stableStringify.mjs';

// ── Allowed horizons ────────────────────────────────────────────────
const VALID_HORIZONS = new Set([3, 6, 12]);

// ── OPT Phase helpers (shared with aiWorkoutController) ─────────────
const OPT_PHASE_KEY_BY_NUMBER = {
  1: 'stabilization_endurance',
  2: 'strength_endurance',
  3: 'hypertrophy',
  4: 'maximal_strength',
  5: 'power',
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

function toOptPhaseKey(optPhase) {
  if (!optPhase) return null;
  if (typeof optPhase === 'number') return OPT_PHASE_KEY_BY_NUMBER[optPhase] || null;
  if (typeof optPhase === 'object' && typeof optPhase.phase === 'number') {
    return OPT_PHASE_KEY_BY_NUMBER[optPhase.phase] || null;
  }
  return null;
}

function extractOhsaCompensations(ohsa) {
  if (!ohsa || typeof ohsa !== 'object') return [];
  const results = [];
  const add = (key, value) => {
    if (!value || value === 'none') return;
    results.push(`${value} ${OHSA_LABELS[key] || key}`.trim());
  };
  const ant = ohsa.anteriorView || {};
  const lat = ohsa.lateralView || {};
  add('feetTurnout', ant.feetTurnout);
  add('feetFlattening', ant.feetFlattening);
  add('kneeValgus', ant.kneeValgus);
  add('kneeVarus', ant.kneeVarus);
  add('excessiveForwardLean', lat.excessiveForwardLean);
  add('lowBackArch', lat.lowBackArch);
  add('armsFallForward', lat.armsFallForward);
  add('forwardHead', lat.forwardHead);
  add('asymmetricWeightShift', ohsa.asymmetricWeightShift);
  return results;
}

function buildNasmConstraints(baseline, masterPrompt) {
  if (!baseline) return null;
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
    correctiveExercises: baseline.correctiveExerciseStrategy ?? null,
    optPhase: optPhaseKey,
    optPhaseConfig: optPhaseDetails ?? null,
    primaryGoal,
  };
}

// ── Audit log helper (non-blocking) ─────────────────────────────────
async function updateAuditLog(auditLog, fields) {
  if (!auditLog) return;
  try {
    await auditLog.update(fields);
  } catch (logErr) {
    logger.warn('Failed to update AI audit log:', logErr.message);
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ── Main endpoint ───────────────────────────────────────────────────

/**
 * POST /api/ai/long-horizon/generate
 *
 * Request body:
 *   { userId: number, horizonMonths: 3|6|12 }
 *
 * Always returns draft (5C-C). Approval/persist in 5C-D.
 */
export const generateLongHorizonPlan = async (req, res) => {
  const startTime = Date.now();
  const requesterId = req.user?.id;
  let auditLog = null;
  let eligibilityOverride = null;

  try {
    const { userId: rawUserId, horizonMonths: rawHorizon } = req.body || {};
    const requesterRole = req.user?.role;

    // ── Step 4: Auth validation ─────────────────────────────────
    if (!requesterId || !requesterRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // ── Validate horizonMonths ──────────────────────────────────
    const horizonMonths = Number(rawHorizon);
    if (!VALID_HORIZONS.has(horizonMonths)) {
      return res.status(400).json({
        success: false,
        message: 'horizonMonths must be 3, 6, or 12',
      });
    }

    // ── Step 5: Target user resolution ──────────────────────────
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

    // ── Step 6: Client role isolation ───────────────────────────
    if (requesterRole === 'client' && targetUserId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Clients can only generate plans for themselves',
      });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment, ClientBaselineMeasurements } = models;

    // ── Step 7: Trainer assignment check ────────────────────────
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
      // ── Step 8: Role validation ─────────────────────────────
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid role for plan generation',
      });
    }

    // ── Step 9: AI eligibility check ────────────────────────────
    const eligibility = await checkAiEligibility({
      targetUserId,
      actorUserId: requesterId,
      actorRole: requesterRole,
      models,
    });

    if (eligibility.decision === 'deny') {
      return res.status(403).json({
        success: false,
        code: eligibility.reasonCode,
        message: 'AI consent check failed. Please ensure AI consent is granted for this user.',
      });
    }

    // Admin override requires overrideReason (symmetric with approval)
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
      logger.info('[LH-Generate] Admin override used', { requesterId, targetUserId });
    }

    // ── Step 10: User lookup + masterPromptJson ─────────────────
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    let resolvedMasterPrompt = targetUser.masterPromptJson;
    if (typeof resolvedMasterPrompt === 'string') {
      try {
        resolvedMasterPrompt = JSON.parse(resolvedMasterPrompt);
      } catch {
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

    // ── Step 11: De-identification (fail-closed) ────────────────
    const deIdResult = deIdentify(resolvedMasterPrompt, {
      spiritName: targetUser.spiritName || undefined,
    });

    if (!deIdResult) {
      logger.warn('Long-horizon generation blocked: de-identification failed (fail-closed)', {
        targetUserId,
      });
      return res.status(400).json({
        success: false,
        code: 'DEIDENTIFICATION_FAILED',
        message: 'Unable to prepare data for AI processing. Please ensure your profile is complete.',
      });
    }

    const { deIdentified: safePayload, strippedFields } = deIdResult;
    logger.info('Long-horizon de-identification complete', {
      targetUserId,
      strippedCount: strippedFields.length,
    });

    // ── Step 12: NASM constraints (server-derived) ──────────────
    const latestBaseline = await ClientBaselineMeasurements.findOne({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
    });
    const nasmConstraints = buildNasmConstraints(latestBaseline, resolvedMasterPrompt);

    const templateContext = buildTemplateContext(nasmConstraints);

    // ── Step 13: Long-horizon context (5C-B) ────────────────────
    let longHorizonContext = null;
    try {
      longHorizonContext = await buildLongHorizonContext(
        targetUserId,
        horizonMonths,
        models,
      );
    } catch (ctxErr) {
      logger.warn('Failed to build long-horizon context (non-blocking):', ctxErr.message);
    }

    // ── Build prompt ────────────────────────────────────────────
    const promptText = buildLongHorizonPrompt({
      deidentifiedPayload: safePayload,
      horizonMonths,
      longHorizonContext,
      nasmConstraints,
      templateContext,
    });

    const payloadHash = hashPayload(safePayload);

    // ── Step 14: Audit log creation (pending) ───────────────────
    const { AiInteractionLog } = models;
    if (AiInteractionLog) {
      try {
        auditLog = await AiInteractionLog.create({
          userId: targetUserId,
          provider: 'pending',
          model: 'pending',
          requestType: 'long_horizon_generation',
          payloadHash,
          status: 'pending',
          promptVersion: PROMPT_VERSION,
        });
      } catch (logErr) {
        logger.warn('Failed to create AI audit log (non-blocking):', logErr.message);
      }
    }

    // ── Step 15: Provider routing (failover chain) ──────────────
    const originalName = resolvedMasterPrompt?.client?.name;
    const routerStartMs = Date.now();

    const routerOutcome = await routeAiGeneration({
      requestType: 'long_horizon_generation',
      userId: targetUserId,
      deidentifiedPayload: safePayload,
      serverConstraints: {
        longHorizonContext,
        templateContext,
        horizonMonths,
      },
      // Pass pre-built prompt + system message so adapters use long-horizon
      // prompt instead of the default workout prompt (CRITICAL: without these,
      // adapters fall back to buildWorkoutPrompt + WORKOUT_SYSTEM_MESSAGE).
      prompt: promptText,
      systemMessage: LONG_HORIZON_SYSTEM_MESSAGE,
      payloadHash,
      promptVersion: PROMPT_VERSION,
    });

    const routerDurationMs = Date.now() - routerStartMs;

    logger.info('[LH-Router] Outcome', {
      ok: routerOutcome.ok,
      failoverTrace: routerOutcome.failoverTrace,
      durationMs: routerDurationMs,
    });

    // ── Step 16: Degraded mode handling ─────────────────────────
    if (!routerOutcome.ok) {
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
      updateMetrics('longHorizonGeneration', false, responseTime, 0, requesterId);

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

      return res.status(200).json(
        buildDegradedResponse(routerOutcome.errors, routerOutcome.failoverTrace),
      );
    }

    // ── Step 17: Output validation (PII → Zod → Rules) ─────────
    const { result: providerResult } = routerOutcome;

    const validation = runLongHorizonValidationPipeline(providerResult.rawText, {
      userName: originalName || undefined,
      requestedHorizon: horizonMonths,
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
          ...(eligibilityOverride ? { eligibilityOverride } : {}),
        },
      });

      const responseTime = Date.now() - startTime;
      updateMetrics('longHorizonGeneration', false, responseTime, 0, requesterId);

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
      logger.info('[LH-Validator] Warnings on AI output', { warnings: validation.warnings });
    }

    const aiPlan = validation.data;

    // ── Step 18: Draft response ─────────────────────────────────
    // Persist validatedPlanHash for 5C-D sourceType comparison
    const validatedPlanHash = hashPayload(stableStringify(aiPlan));
    await updateAuditLog(auditLog, {
      provider: providerResult.provider,
      model: providerResult.model,
      status: 'draft',
      outputHash: hashPayload(providerResult.rawText),
      durationMs: routerDurationMs,
      tokenUsage: {
        ...(providerResult.tokenUsage || {}),
        validatedPlanHash,
        ...(eligibilityOverride ? { eligibilityOverride } : {}),
      },
      promptVersion: PROMPT_VERSION,
    });

    const responseTime = Date.now() - startTime;
    const tokensUsed = providerResult.tokenUsage?.totalTokens || 0;
    updateMetrics('longHorizonGeneration', true, responseTime, tokensUsed, requesterId);

    return res.status(200).json({
      success: true,
      draft: true,
      plan: aiPlan,
      horizonMonths,
      warnings: validation.warnings,
      provider: providerResult.provider,
      auditLogId: auditLog?.id || null,
    });
  } catch (err) {
    logger.error('Long-horizon generation failed:', err);

    await updateAuditLog(auditLog, {
      status: 'error',
      errorCode: err.code || 'UNHANDLED_ERROR',
      ...(eligibilityOverride ? {
        tokenUsage: { ...(auditLog?.tokenUsage || {}), eligibilityOverride },
      } : {}),
    });

    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during plan generation',
    });
  } finally {
    // Always release the concurrent rate-limit lock
    if (requesterId) {
      releaseConcurrent(requesterId);
    }
  }
};

// ── Approval endpoint (5C-D) ───────────────────────────────────────

/**
 * POST /api/ai/long-horizon/approve
 *
 * Request body:
 *   { userId, plan, horizonMonths, auditLogId, overrideReason?, trainerNotes? }
 *
 * Validates edited/unedited AI draft and persists LongTermProgramPlan
 * + ProgramMesocycleBlock rows in a single transaction.
 *
 * Security ordering:
 *   auth → role(admin/trainer) → input validation → target user exists →
 *   assignment RBAC → AI eligibility re-check → plan validation →
 *   transaction persist → audit log update → response
 */
export const approveLongHorizonPlan = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  try {
    // ── Step 1: Auth ──────────────────────────────────────────────
    if (!requesterId || !requesterRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // ── Step 2: Role gate (admin/trainer only) ────────────────────
    if (requesterRole !== 'admin' && requesterRole !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only trainers and admins can approve plans',
      });
    }

    // ── Step 3: Input validation ──────────────────────────────────
    const {
      userId: rawUserId,
      plan,
      horizonMonths: rawHorizon,
      auditLogId: rawAuditLogId,
      overrideReason,
      trainerNotes,
    } = req.body || {};

    const targetUserId = Number.isFinite(Number(rawUserId)) ? Number(rawUserId) : null;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid userId',
      });
    }

    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DRAFT_PAYLOAD',
        message: 'Missing or invalid plan object',
      });
    }

    const horizonMonths = Number(rawHorizon);
    if (!VALID_HORIZONS.has(horizonMonths)) {
      return res.status(400).json({
        success: false,
        message: 'horizonMonths must be 3, 6, or 12',
      });
    }

    // horizonMonths mismatch check
    if (plan.horizonMonths !== undefined && plan.horizonMonths !== horizonMonths) {
      return res.status(400).json({
        success: false,
        code: 'HORIZON_MISMATCH',
        message: 'Request horizonMonths does not match plan.horizonMonths',
      });
    }

    const auditLogId = Number.isFinite(Number(rawAuditLogId)) ? Number(rawAuditLogId) : null;
    if (!auditLogId) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_AUDIT_LOG_ID',
        message: 'auditLogId is required for AI plan approval',
      });
    }

    // ── Step 4: Target user exists ────────────────────────────────
    const models = getAllModels();
    const {
      User,
      ClientTrainerAssignment,
      LongTermProgramPlan,
      ProgramMesocycleBlock,
      AiInteractionLog,
    } = models;

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ── Step 5: Trainer assignment RBAC ───────────────────────────
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
    }

    // ── Step 6: AI eligibility re-check ───────────────────────────
    const eligibility = await checkAiEligibility({
      targetUserId,
      actorUserId: requesterId,
      actorRole: requesterRole,
      models,
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
      logger.info('[LH-Approve] Admin override used', { requesterId, targetUserId });
    }

    // ── Step 7: Plan validation ───────────────────────────────────
    const approvalValidation = validateLongHorizonApproval({
      plan,
      requestedHorizon: horizonMonths,
    });

    if (!approvalValidation.valid) {
      return res.status(422).json({
        success: false,
        code: 'APPROVED_DRAFT_INVALID',
        message: 'Approved draft validation failed',
        errors: approvalValidation.errors,
        warnings: approvalValidation.warnings,
      });
    }

    const normalizedPlan = approvalValidation.normalizedPlan;

    // ── Step 7b: Server-derived goalProfile ───────────────────────
    let resolvedMasterPrompt = targetUser.masterPromptJson;
    if (typeof resolvedMasterPrompt === 'string') {
      try {
        resolvedMasterPrompt = JSON.parse(resolvedMasterPrompt);
      } catch {
        resolvedMasterPrompt = null;
      }
    }

    const clientGoals = resolvedMasterPrompt?.client?.goals || resolvedMasterPrompt?.goals;
    const rawSecondary = clientGoals?.secondary || clientGoals?.secondaryGoals;
    const rawConstraints = clientGoals?.constraints;
    const goalProfile = clientGoals
      ? {
          primaryGoal: String(clientGoals.primary || clientGoals.primaryGoal || 'general_fitness'),
          secondaryGoals: Array.isArray(rawSecondary) ? rawSecondary.filter(g => typeof g === 'string') : [],
          constraints: Array.isArray(rawConstraints) ? rawConstraints.filter(c => typeof c === 'string') : [],
        }
      : { primaryGoal: 'general_fitness' };

    // ── Step 7c: Server-derived sourceType ────────────────────────
    let sourceType = 'ai_assisted_edited'; // Safe default
    let validatedAuditLog = null;

    if (AiInteractionLog) {
      try {
        const auditLogRecord = await AiInteractionLog.findByPk(auditLogId);

        // Check 1: Log exists
        if (!auditLogRecord) {
          logger.info('[LH-Approve] auditLogId not found, skipping linkage', { auditLogId });
        }
        // Check 2: Correct userId
        else if (auditLogRecord.userId !== targetUserId) {
          logger.warn('[LH-Approve] auditLogId userId mismatch, skipping linkage', {
            auditLogId,
            expected: targetUserId,
            actual: auditLogRecord.userId,
          });
        }
        // Check 3: Correct requestType
        else if (auditLogRecord.requestType !== 'long_horizon_generation') {
          logger.warn('[LH-Approve] auditLogId requestType mismatch, skipping linkage', {
            auditLogId,
            expected: 'long_horizon_generation',
            actual: auditLogRecord.requestType,
          });
        }
        // Check 4: Allowed status
        else if (!['draft', 'success'].includes(auditLogRecord.status)) {
          logger.warn('[LH-Approve] auditLogId status invalid for approval, skipping linkage', {
            auditLogId,
            status: auditLogRecord.status,
          });
        }
        // All checks passed
        else {
          validatedAuditLog = auditLogRecord;

          // Compare validatedPlanHash for sourceType derivation
          const storedHash = auditLogRecord.tokenUsage?.validatedPlanHash;
          if (storedHash) {
            const approvalHash = hashPayload(stableStringify(normalizedPlan));
            sourceType = (approvalHash === storedHash) ? 'ai_assisted' : 'ai_assisted_edited';
          }
          // No stored hash → default ai_assisted_edited (already set)
        }
      } catch (lookupErr) {
        logger.warn('[LH-Approve] Failed to lookup audit log, skipping linkage', {
          auditLogId,
          error: lookupErr.message,
        });
      }
    }

    // ── Step 8: Transactional persistence ─────────────────────────
    const transaction = await sequelize.transaction();
    let createdPlan;

    try {
      createdPlan = await LongTermProgramPlan.create(
        {
          userId: targetUserId,
          horizonMonths,
          status: 'approved',
          planName: normalizedPlan.planName,
          summary: normalizedPlan.summary || null,
          goalProfile,
          sourceType,
          aiGenerationRequestId: validatedAuditLog ? auditLogId : null,
          createdByUserId: requesterId,
          approvedByUserId: requesterId,
          approvedAt: new Date(),
          metadata: {
            warnings: approvalValidation.warnings,
            promptVersion: PROMPT_VERSION,
            ...(eligibilityOverride ? { eligibilityOverride } : {}),
          },
        },
        { transaction },
      );

      const blocks = normalizedPlan.blocks || [];
      for (const block of blocks) {
        await ProgramMesocycleBlock.create(
          {
            planId: createdPlan.id,
            sequence: block.sequence,
            nasmFramework: block.nasmFramework,
            optPhase: block.optPhase ?? null,
            phaseName: block.phaseName,
            focus: block.focus || null,
            durationWeeks: block.durationWeeks,
            sessionsPerWeek: block.sessionsPerWeek ?? null,
            entryCriteria: block.entryCriteria || null,
            exitCriteria: block.exitCriteria || null,
            constraintsSnapshot: null,
            notes: block.notes || null,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (persistErr) {
      await transaction.rollback();
      logger.error('[LH-Approve] Transaction failed, rolled back:', persistErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to persist approved plan',
      });
    }

    // ── Step 9: Audit log update (non-blocking) ───────────────────
    if (validatedAuditLog) {
      try {
        const approvalMeta = {
          approvedAt: new Date().toISOString(),
          approvedByUserId: requesterId,
          sourceType,
          trainerNotes: trainerNotes || null,
          validationPassed: true,
          warningsCount: approvalValidation.warnings.length,
          ...(eligibilityOverride ? { eligibilityOverride } : {}),
        };
        await validatedAuditLog.update({
          status: 'approved',
          tokenUsage: {
            ...(validatedAuditLog.tokenUsage || {}),
            approval: approvalMeta,
          },
        });
      } catch (auditErr) {
        logger.warn('[LH-Approve] Failed to update audit log (non-blocking):', auditErr.message);
      }
    }

    // ── Step 10: Response ─────────────────────────────────────────
    return res.status(200).json({
      success: true,
      planId: createdPlan.id,
      sourceType,
      summary: normalizedPlan.summary || normalizedPlan.planName,
      blockCount: (normalizedPlan.blocks || []).length,
      validationWarnings: approvalValidation.warnings,
      eligibilityWarnings: eligibility.warnings,
    });
  } catch (err) {
    logger.error('[LH-Approve] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during plan approval',
    });
  }
};
