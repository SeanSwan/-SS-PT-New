/**
 * ============================================================================
 * FILE: workoutPlanRoutes.mjs
 * PURPOSE: REST API for multi-week workout plan CRUD + session advancement
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-07-15
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
 *   - Archive via terminal status='archived' with immutable lifecycle receipts
 *   - /advance is atomic: marks session complete + advances cursor in one call
 */

import express from 'express';
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
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';
import { getWorkoutPlanPdfDerivativeStatusesForPlans } from '../services/workoutPlanPdfDerivativeService.mjs';
import { readAssignmentCompletionContext } from '../services/clientTrainingAssignmentCompletionService.mjs';
import { resolveClientTrainingDateContext } from '../services/clientTrainingDateService.mjs';
import { advancePlanDataCursor } from '../services/clientTrainingPlanProgressService.mjs';

import {
  createWorkoutPlanRecord,
  mutateWorkoutPlanRecord,
  WorkoutPlanMutationError,
} from '../services/workoutPlanMutationService.mjs';
import {
  normalizeWorkoutPlanDataForPersistence,
  sanitizeWorkoutPlanMetadataForPersistence,
  sanitizeWorkoutPlanProgressNotesForPersistence,
} from '../services/workoutPlanDataPrivacyService.mjs';
import {
  buildDuplicatePlanMetadata,
  mergePlanMetadata,
  normalizeWorkoutPlanId,
  parseStrictPositiveInteger,
  selectCurrentWorkoutPlan,
  toPlainObject,
} from '../services/workoutPlanRouteHelpers.mjs';
import {
  workoutPlanPdfUploadMiddleware,
  handleWorkoutPlanPdfUpload,
} from './workoutPlanPdfUploadHandler.mjs';
import { handleWorkoutPlanPdfContent } from './workoutPlanPdfContentHandler.mjs';
import { handleWorkoutPlanPdfMetadataUpdate } from './workoutPlanPdfMetadataHandler.mjs';
import {
  handleWorkoutPlanPdfGenerate,
  handleWorkoutPlanPdfStatus,
} from './workoutPlanPdfDerivativeHandlers.mjs';
import {
  workoutPlanActivateHandler,
  workoutPlanArchiveHandler,
  workoutPlanStatusHandler,
} from './workoutPlanLifecycleHandlers.mjs';

const router = express.Router();

// Lifecycle routes use a stable per-client row lock plus the existing partial
// unique index workout_plans_one_active_per_user as a database backstop.
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
// fallow-ignore-next-line complexity
router.get('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const { userId, clientId, status, trainerId, scope } = req.query;

    // S24 (JARVIS §4.6): templates are trainer-scoped and never mix into
    // client lists. scope=templates returns ONLY the caller's own templates
    // (org sharing is a separate owner-gated flag, intentionally absent).
    if (scope === 'templates') {
      const templates = await WorkoutPlan.findAll({
        where: { isTemplate: true, trainerId: Number(req.user.id) },
        order: [['updatedAt', 'DESC']],
        limit: 50,
      });
      return res.json({ success: true, plans: templates, count: templates.length });
    }

    const where = { isTemplate: false };
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
// PURPOSE: Get the active client plan plus the visible plan-arc catalog
// WHY: This is what the AI calls to answer "what's next?" and "what plans exist?"
// ─────────────────────────────────────────────────────────────

/**
 * Get a client's active workout plan and plan-arc catalog.
 * Returns catalog-only context when saved draft/paused arcs exist but no plan is active yet.
 * @route GET /api/workout-plans/client/:userId
 * @access Trainer/Admin
 */
// fallow-ignore-next-line complexity
router.get('/client/:userId', protect, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const DailyWorkoutForm = getModel('DailyWorkoutForm');
    const User = getModel('User');
    const userId = parseInt(req.params.userId, 10);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid userId required' });
    }

    let plan = await WorkoutPlan.findOne({
      where: { userId, status: 'active' },
      order: [['updatedAt', 'DESC']]
    });

    const clientPlans = typeof WorkoutPlan.findAll === 'function'
      ? await WorkoutPlan.findAll({
        where: { userId, status: ['active', 'paused', 'draft'] },
        order: [['updatedAt', 'DESC']],
        limit: 20,
      })
      : plan ? [plan] : [];
    const catalogPlans = Array.isArray(clientPlans) ? clientPlans : [];
    plan = selectCurrentWorkoutPlan(plan, catalogPlans);

    if (!plan && catalogPlans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active workout plan found for this client'
      });
    }

    const client = await User.findByPk(userId, {
      attributes: ['id', 'timeZone', 'timeZoneConfigured'],
    });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Extract current session info for the AI when a live active arc exists.
    const currentSession = plan ? extractCurrentSession(plan) : null;
    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: userId,
    });
    const today = trainingDateContext.localDate;
    const completionContext = await readAssignmentCompletionContext(DailyWorkoutForm, {
      clientId: userId,
      date: today,
      onDateLookupError: (error) => logger.warn(
        '[WorkoutPlan] planned-assignment completion lookup failed: %s',
        error.message,
      ),
      onRecentLookupError: (error) => logger.warn(
        '[WorkoutPlan] recent homework completion lookup failed: %s',
        error.message,
      ),
    });
    const overviewPlanRows = catalogPlans.length ? catalogPlans : plan ? [plan] : [];
    const pdfDerivativesByPlanId = await getWorkoutPlanPdfDerivativeStatusesForPlans({
      sequelize,
      planIds: overviewPlanRows.map((row) => toPlainObject(row)?.id).filter(Boolean),
    });
    const plansWithPdfStatus = overviewPlanRows.map((row) => {
      const raw = toPlainObject(row);
      return {
        ...raw,
        pdfDerivative: pdfDerivativesByPlanId[String(raw.id)] || null,
      };
    });
    const activePlanWithPdfStatus = plan
      ? plansWithPdfStatus.find((row) => String(row.id) === String(plan.id)) || toPlainObject(plan)
      : null;
    const overview = buildClientTrainingOverview({
      activePlan: activePlanWithPdfStatus,
      plans: plansWithPdfStatus,
      currentSession,
      today,
      assignmentCompletions: completionContext.assignmentCompletions,
      recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
    });

    res.json({
      success: true,
      plan: plan || null,
      currentSession,
      todayAssignment: overview.todayAssignment,
      trainingPlanCatalog: overview.trainingPlanCatalog,
      homeworkSummary: overview.homeworkSummary,
      trainingDateContext,
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
/**
 * @route GET /api/workout-plans/backup/:userId — backup + staleness verdict
 * (charter v3 P2). MOUNTED BEFORE GET /:id — Rule 31: '/:id' would otherwise
 * swallow 'backup' as a plan id.
 */
router.get('/backup/:userId', protect, trainerOrAdminOnly,
  verifyClientAccessByUserId({ paramName: 'userId' }),
  async (req, res) => {
    try {
      const { getBackupPlan } = await import('../services/backupPlanService.mjs');
      const result = await getBackupPlan(parseInt(req.params.userId, 10));
      return res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[WorkoutPlan] backup fetch error: %s', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load backup plan' });
    }
  });

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
 * ─── Charter v3 P2: the AI BACKUP PLAN variant ─────────────────────────────
 * One data-grounded backup per client (deterministic registry pipeline —
 * real training history, never template filler). Trainer-chosen swap only;
 * nothing auto-activates.
 */

/** @route POST /api/workout-plans/backup/:userId/generate — create/refresh (in place) */
router.post('/backup/:userId/generate', protect, trainerOrAdminOnly,
  verifyClientAccessByUserId({ paramName: 'userId' }),
  async (req, res) => {
    try {
      const { generateBackupPlan } = await import('../services/backupPlanService.mjs');
      const {
        durationWeeks, sessionsPerWeek, primaryGoal, equipmentProfileId,
        planningReviewAcknowledged, planningReviewReason,
      } = req.body || {};
      const result = await generateBackupPlan({
        userId: parseInt(req.params.userId, 10),
        trainerId: req.user.id,
        durationWeeks: Math.min(Math.max(parseInt(durationWeeks, 10) || 4, 1), 52),
        sessionsPerWeek: Math.min(Math.max(parseInt(sessionsPerWeek, 10) || 3, 1), 7),
        primaryGoal,
        equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
        planningReviewAcknowledged: planningReviewAcknowledged === true,
        planningReviewReason: typeof planningReviewReason === 'string' ? planningReviewReason : null,
        planningReviewActorRole: req.user.role,
      });
      return res.status(result.refreshed ? 200 : 201).json({ success: true, ...result });
    } catch (err) {
      // Cortex P0 (§5.3): surface the deterministic safety gate's
      // acknowledged-review contract (409 review-required / 400
      // reason-required) instead of masking the block as a 500 — the same
      // mapping the workout-builder routes use, and the shape the
      // SafetyGateModal already parses.
      if (err.name === 'SwanCoachPlanningReviewError') {
        return res.status(err.status).json({
          success: false,
          code: err.code,
          error: err.message,
          reviewRequiredSignals: err.reviewRequiredSignals,
          missingCriticalData: err.missingCriticalData,
        });
      }
      const status = Number(err.statusCode);
      if (
        Number.isInteger(status)
        && status >= 400
        && status < 500
        && typeof err.code === 'string'
        && err.code.startsWith('WORKOUT_PLAN_')
      ) {
        return res.status(status).json({
          success: false,
          code: err.code || 'WORKOUT_PLAN_MUTATION_FAILED',
          message: err.message,
          ...(err.currentRevision ? { currentRevision: err.currentRevision } : {}),
        });
      }
      logger.error('[WorkoutPlan] backup generate error: %s', err.message);
      return res.status(500).json({ success: false, message: 'Failed to generate backup plan' });
    }
  });

/**
 * @route POST /api/workout-plans/blend — compose a NEW draft plan from picks
 * against two of the client's plans (charter v3 P3; typically primary + backup).
 * Body: { planAId, planBId, picks: [{source:'A'|'B', weekNumber, dayNumbers?}], title? }
 */
router.post('/blend', protect, trainerOrAdminOnly,
  // Shim: surface the A-side plan id as :id so the STANDARD access middleware
  // runs natively (service re-verifies both sources share one client).
  (req, res, next) => {
    const parsedA = normalizeWorkoutPlanId(req.body?.planAId);
    const parsedB = normalizeWorkoutPlanId(req.body?.planBId);
    if (!parsedA || !parsedB || parsedA === parsedB) {
      return res.status(400).json({ success: false, message: 'Two distinct source plan ids are required' });
    }
    req.params.id = parsedA;
    return next();
  },
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    try {
      const { picks, title } = req.body || {};
      const planAId = normalizeWorkoutPlanId(req.body?.planAId);
      const planBId = normalizeWorkoutPlanId(req.body?.planBId);
      const { blendPlans } = await import('../services/planBlendService.mjs');
      const result = await blendPlans({
        trainerId: req.user.id,
        planAId,
        planBId,
        picks,
        title,
      });
      return res.status(201).json({ success: true, blendedPlanId: result.blended.id, plan: result.blended });
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      if (status >= 500) logger.error('[WorkoutPlan] blend error: %s', error.message);
      return res.status(status).json({
        success: false,
        message: status >= 500 ? 'Failed to blend plans' : error.message,
      });
    }
  });

/** @route POST /api/workout-plans/:id/promote-backup — THE SWAP (transactional) */
router.post('/:id/promote-backup', protect, trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  async (req, res) => {
    try {
      const { promoteBackupPlan } = await import('../services/backupPlanService.mjs');
      const result = await promoteBackupPlan({
        planId: req.workoutPlan.id,
        trainerId: req.user.id,
      });
      return res.json({ success: true, promotedPlanId: result.promoted.id, archivedPlanIds: result.archived });
    } catch (error) {
      const status = Number(error?.statusCode);
      const isClientSafe = Number.isInteger(status)
        && status >= 400
        && status < 500
        && typeof error?.code === 'string'
        && error.code.startsWith('WORKOUT_PLAN_');
      if (isClientSafe) {
        return res.status(status).json({
          success: false,
          code: error.code,
          message: error.message,
          ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
        });
      }
      logger.error('[WorkoutPlan] promote-backup error: %s', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to promote backup plan',
      });
    }
  });

/**
 * Create a new workout plan for a client.
 * @route POST /api/workout-plans
 * @access Trainer/Admin
 */
// fallow-ignore-next-line complexity
// S24: template creation targets NO client — the handler below forces the
// caller's own id as owner and drops personal fields, so the client-access
// gate has nothing to protect on that path. The bypass is scoped to THIS
// route only (a body flag must never weaken the gate anywhere else).
const clientAccessUnlessTemplate = (req, res, next) => (
  req.body?.isTemplate === true
    ? next()
    : verifyClientAccessByUserId({ paramName: 'userId', bodyField: 'userId' })(req, res, next)
);

router.post('/', protect, trainerOrAdminOnly, clientAccessUnlessTemplate, async (req, res) => {
  try {
    const WorkoutPlan = getWorkoutPlan();
    const {
      userId, title, description, nasmPhase,
      startDate, endDate, durationWeeks,
      planData, progressNotes, createdBy, metadata
    } = req.body;

    if ((!userId && req.body.isTemplate !== true) || !title) {
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

    const safePlanData = normalizeWorkoutPlanDataForPersistence(planData);
    const safeProgressNotes = sanitizeWorkoutPlanProgressNotesForPersistence(progressNotes);
    const safeMetadata = sanitizeWorkoutPlanMetadataForPersistence(metadata);

    // S24 (JARVIS §4.6): a template is trainer-owned and client-scrubbed —
    // the server FORCES userId to the trainer's own id and drops personal
    // notes regardless of what the client sent (defense in depth over the
    // frontend scrub).
    const isTemplate = req.body.isTemplate === true;
    const templateMeta = isTemplate && req.body.templateMeta && typeof req.body.templateMeta === 'object'
      ? { name: String(req.body.templateMeta.name ?? title), phase: req.body.templateMeta.phase ?? null,
          split: req.body.templateMeta.split ?? null, weeks: req.body.templateMeta.weeks ?? null,
          tags: Array.isArray(req.body.templateMeta.tags) ? req.body.templateMeta.tags.slice(0, 12).map(String) : [] }
      : null;

    const plan = await createWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      values: {
        isTemplate,
        templateMeta,
        userId: isTemplate ? Number(req.user.id) : parseInt(userId, 10),
        trainerId: req.user.id,
        title,
        description: description || null,
        nasmPhase: nasmPhase || null,
        startDate: startDate || null,
        endDate: endDate || null,
        durationWeeks: durationWeeks || 4,
        status: 'draft',
        currentWeek: 1,
        currentDay: 1,
        planData: safePlanData,
        progressNotes: isTemplate ? null : safeProgressNotes,
        createdBy: createdBy || 'trainer',
        metadata: safeMetadata
      },
      pdfDerivativeIntent: {
        requestedBy: req.user.id,
        reason: 'canonical_save',
      },
    });

    logger.info('[WorkoutPlan] Created plan #%d for client %d by trainer %d',
      plan.id, userId, req.user.id);


    res.status(201).json({ success: true, plan, pdfDerivative: plan.pdfDerivative });
  } catch (error) {
    logger.error('[WorkoutPlan] POST / error: %s', error.message);
    res.status(500).json({ success: false, message: 'Failed to create workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: PUT /api/workout-plans/:id
// PURPOSE: Update prescribed/descriptive fields; lifecycle uses /status.
// ─────────────────────────────────────────────────────────────

/**
 * Update a workout plan. Accepts partial updates.
 * @route PUT /api/workout-plans/:id
 * @access Trainer/Admin
 */
// fallow-ignore-next-line complexity
router.put('/:id', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    // Middleware proves access; the mutation boundary then refetches and locks
    // the authoritative row before deriving metadata or content identity.
    const authorizedPlan = req.workoutPlan;

    if (req.body.status !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Use the status endpoint for workout plan lifecycle changes.',
      });
    }

    // Whitelist updatable fields to prevent mass-assignment.
    const allowedFields = [
      'title', 'description', 'nasmPhase', 'startDate', 'endDate',
      'durationWeeks', 'currentWeek', 'currentDay',
      'planData', 'progressNotes', 'metadata'
    ];

    const mutation = await mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan: getWorkoutPlan(),
      planId: authorizedPlan.id,
      expectedRevision: req.body.expectedRevision,
      updates: (lockedPlan) => {
        const updates = {};
        for (const field of allowedFields) {
          if (req.body[field] === undefined) continue;
          if (field === 'metadata') {
            updates[field] = mergePlanMetadata(lockedPlan, req.body[field]);
          } else if (field === 'planData') {
            updates[field] = normalizeWorkoutPlanDataForPersistence(req.body[field]);
          } else if (field === 'progressNotes') {
            updates[field] = sanitizeWorkoutPlanProgressNotesForPersistence(req.body[field]);
          } else {
            updates[field] = req.body[field];
          }
        }
        return updates;
      },
      pdfDerivativeIntent: {
        requestedBy: req.user.id,
        reason: 'canonical_save',
      },
    });
    const plan = mutation.plan;

    logger.info('[WorkoutPlan] Updated plan #%d by user %d', plan.id, req.user.id);


    res.json({ success: true, plan, pdfDerivative: mutation.pdfDerivative });
  } catch (error) {
    const status = Number(error?.statusCode);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
    }
    logger.error('[WorkoutPlan] PUT /:id error: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update workout plan' });
  }
});

/**
 * Attach or replace the professional PDF file reference for a saved plan.
 * Stores protected app URL metadata for already uploaded private PDFs.
 * Multipart upload lives at POST /:id/pdf/upload. RBAC is inherited from
 * verifyClientAccessByPlanId.
 *
 * @route PUT /api/workout-plans/:id/pdf
 * @access Trainer (assigned client) / Admin
 */
// fallow-ignore-next-line complexity
router.put(
  '/:id/pdf',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  handleWorkoutPlanPdfMetadataUpdate,
);

router.post(
  '/:id/pdf/generate',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  handleWorkoutPlanPdfGenerate,
);

router.get(
  '/:id/pdf/status',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  handleWorkoutPlanPdfStatus,
);

// ─────────────────────────────────────────────────────────────
/**
 * Upload and attach a professional PDF file for a saved plan.
 *
 * @route POST /api/workout-plans/:id/pdf/upload
 * @access Trainer (assigned client) / Admin
 */
router.post(
  '/:id/pdf/upload',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  workoutPlanPdfUploadMiddleware,
  handleWorkoutPlanPdfUpload,
);

/**
 * Stream the stored PDF through authenticated app delivery.
 *
 * @route GET /api/workout-plans/:id/pdf/content.pdf
 * @access Client owner, assigned trainer, or admin
 */
router.get(
  '/:id/pdf/content.pdf',
  protect,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  handleWorkoutPlanPdfContent,
);

/**
 * Legacy primary path now means activate. Active status is the only primary
 * truth; this compatibility route delegates to the audited lifecycle service.
 * @route PUT /api/workout-plans/:id/primary
 * @access Trainer (assigned client) / Admin
 */
router.put(
  '/:id/primary',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  workoutPlanActivateHandler,
);
/**
 * Apply an explicit audited lifecycle transition.
 * @route POST /api/workout-plans/:id/status
 * @access Trainer (assigned client) / Admin
 */
router.post(
  '/:id/status',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  workoutPlanStatusHandler,
);

/** Legacy activation path retained on the canonical lifecycle service. */
router.put(
  '/:id/activate',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  workoutPlanActivateHandler,
);

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
  // fallow-ignore-next-line complexity
  async (req, res) => {
    const WorkoutPlan = getWorkoutPlan();
    const original = req.workoutPlan;
    const { title } = req.body || {};

    try {
      // Clone through the planData privacy boundary so old plans cannot
      // re-copy contact details into new saved drafts.
      const clonedPlanData = normalizeWorkoutPlanDataForPersistence(original.planData);

      const copy = await createWorkoutPlanRecord({
        sequelize,
        WorkoutPlan,
        values: {
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
          metadata: buildDuplicatePlanMetadata(original),
        },
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
// fallow-ignore-next-line complexity
router.put('/:id/advance', protect, trainerOrAdminOnly, verifyClientAccessByPlanId({ paramName: 'id' }), async (req, res) => {
  try {
    const authorizedPlan = req.workoutPlan;
    let cursorAdvance;
    let currentWeek;
    let currentDay;
    let appliedUpdates;

    const mutation = await mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan: getWorkoutPlan(),
      planId: authorizedPlan.id,
      updates: (lockedPlan) => {
        if (lockedPlan.status !== 'active') {
          throw new WorkoutPlanMutationError(
            `Cannot advance a ${lockedPlan.status} plan. Only active plans can be advanced.`,
            { code: 'WORKOUT_PLAN_NOT_ACTIVE', statusCode: 400 },
          );
        }

        currentWeek = lockedPlan.currentWeek;
        currentDay = lockedPlan.currentDay;
        cursorAdvance = advancePlanDataCursor({
          planData: lockedPlan.planData || { weeks: [] },
          weekNumber: currentWeek,
          dayNumber: currentDay,
          completedAt: new Date().toISOString(),
          trainerNotes: req.body.trainerNotes,
        });
        if (!cursorAdvance.advanced) {
          throw new WorkoutPlanMutationError('Current plan session not found', {
            code: 'WORKOUT_PLAN_SESSION_NOT_FOUND',
            statusCode: 400,
          });
        }

        appliedUpdates = {
          planData: normalizeWorkoutPlanDataForPersistence(cursorAdvance.planData),
          currentWeek: cursorAdvance.planCompleted ? currentWeek : cursorAdvance.next.week,
          currentDay: cursorAdvance.planCompleted ? currentDay : cursorAdvance.next.day,
          status: cursorAdvance.planCompleted ? 'completed' : 'active',
        };
        return appliedUpdates;
      },
    });
    const responsePlan = { ...toPlainObject(mutation.plan), ...appliedUpdates };
    const nextSession = cursorAdvance.planCompleted
      ? null
      : extractCurrentSession(responsePlan);

    logger.info('[WorkoutPlan] Advanced plan #%d: week %d day %d → %s',
      mutation.plan.id, currentWeek, currentDay,
      cursorAdvance.planCompleted
        ? 'COMPLETED'
        : `week ${cursorAdvance.next.week} day ${cursorAdvance.next.day}`);

    return res.json({
      success: true,
      plan: responsePlan,
      advanced: true,
      planCompleted: cursorAdvance.planCompleted,
      previousSession: cursorAdvance.previous,
      nextSession,
    });
  } catch (error) {
    const status = Number(error?.statusCode);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
    }
    logger.error('[WorkoutPlan] PUT /:id/advance error: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to advance workout plan' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: DELETE /api/workout-plans/:id
// PURPOSE: Preserve compatibility while applying a real audited archive state.
// ─────────────────────────────────────────────────────────────

/**
 * Archive a workout plan without deleting its history or last PDF derivative.
 * @route DELETE /api/workout-plans/:id
 * @access Trainer/Admin
 */
router.delete(
  '/:id',
  protect,
  trainerOrAdminOnly,
  verifyClientAccessByPlanId({ paramName: 'id' }),
  workoutPlanArchiveHandler,
);

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
