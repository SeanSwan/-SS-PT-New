/**
 * Boot Camp Class Builder Routes -- Phase 10
 * ============================================
 * REST API for AI-powered group fitness class generation.
 *
 * POST   /api/bootcamp/generate         Generate a boot camp class
 * POST   /api/bootcamp/save             Save generated class as template
 * GET    /api/bootcamp/templates        List saved templates
 * POST   /api/bootcamp/log              Log a class that was taught
 * GET    /api/bootcamp/history          Class history
 * GET    /api/bootcamp/spaces           List space profiles
 * POST   /api/bootcamp/spaces           Create space profile
 * PUT    /api/bootcamp/spaces/:id       Update space profile
 * GET    /api/bootcamp/trends           List exercise trends
 * POST   /api/bootcamp/trends/:id/approve  Approve a trend
 */

import { Router } from 'express';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import eventBus from '../services/eventBus.mjs';
import { protect, authorize } from '../middleware/auth.mjs';
import { FORMAT_CONFIG } from '../services/bootcamp/bootcampConstants.mjs';
// H29b: the reserved Sprint-confirmation key prefix, imported rather than re-typed so the
// reservation cannot drift from the key the confirmation actually mints.
import { SPRINT_SLOT_PREFIX } from '../services/bootcamp/bootcampTaughtIdentity.mjs';
// The same vocabulary tables the save contract enforces (R2-12).
import {
  CLASS_STYLES,
  INTENSITY_CATEGORIES,
} from '../services/bootcamp/bootcampTemplateRules.mjs';
// §5 line 222's vocabulary has its own module (the rules module is at the rule-4 cap), and it
// is imported ONCE: an earlier version left a second import of the same binding here, which is
// a duplicate declaration — the route module did not parse at all.
import { isTrainerAttestedSummary } from '../services/bootcamp/bootcampExecutionSummary.mjs';
import {
  generateBootcampClass,
  saveBootcampTemplate,
  logBootcampClass,
  getClassHistory,
  getTemplates,
  createSpaceProfile,
  getSpaceProfiles,
  updateSpaceProfile,
  getExerciseTrends,
  approveExerciseTrend,
  queryExercisesForBootcamp,
} from '../services/bootcampService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

const VALID_FORMATS = Object.freeze(Object.keys(FORMAT_CONFIG));
const VALID_DAY_TYPES = ['lower_body', 'upper_body', 'cardio', 'full_body', 'custom'];
const NOT_FOUND_PATTERN = /not found/i;

// 409 is included for H29: contract §5 line 303 specifies "changed request 409" when an
// operation key is reused with a different payload. Widening the bound is safe because
// exposure is still OPT-IN — a service must also set `exposeToClient`, and the message is
// authored by us, not by a driver or provider.
const CLIENT_SAFE_STATUSES = new Set([400, 403, 404, 409]);

const getBootcampRouteErrorResponse = (
  err = {},
  notFoundError = 'Resource not found',
  fallbackError = 'Request failed'
) => {
  // Exposure is OPT-IN and status-bounded: a service must set BOTH
  // `exposeToClient` and a 4xx status before its own message reaches the
  // client. Anything else — including an unexpected 5xx whose message may carry
  // driver or credential detail — is reported with the caller's generic text.
  if (err && err.exposeToClient === true && CLIENT_SAFE_STATUSES.has(err.status)
      && typeof err.message === 'string' && err.message) {
    return { status: err.status, error: err.message };
  }

  if (NOT_FOUND_PATTERN.test(String(err.message || ''))) {
    return { status: 404, error: notFoundError };
  }

  return { status: 500, error: fallbackError };
};

// POST /api/bootcamp/generate
router.post('/generate', async (req, res) => {
  try {
    const {
      classFormat, classStyle, dayType, intensityCategory,
      stationCount, exercisesPerStation,
      targetDuration, expectedParticipants,
      spaceProfileId, equipmentProfileId,
      name, includeStretch, stretchDurationMin, exclusionKeys,
    } = req.body;

    // R2-12: these were a THIRD hand-maintained copy of the two vocabularies,
    // alongside the model ENUMs and bootcampTemplateRules. Unlocked copies drift,
    // so the route now reads the same tables the save contract enforces.
    const VALID_STYLES = CLASS_STYLES;
    const VALID_INTENSITIES = INTENSITY_CATEGORIES;

    const hasCustomStructure = stationCount != null || exercisesPerStation != null;
    const safeFormat = VALID_FORMATS.includes(classFormat) ? classFormat : hasCustomStructure ? 'custom' : '4x4_r2';
    const safeStationCount = stationCount == null ? undefined : Math.min(Math.max(parseInt(stationCount, 10) || 4, 1), 6);
    const safeExercisesPerStation = exercisesPerStation == null ? undefined : Math.min(Math.max(parseInt(exercisesPerStation, 10) || 4, 1), 5);
    const safeDayType = VALID_DAY_TYPES.includes(dayType) ? dayType : 'full_body';
    const safeDuration = Math.min(Math.max(parseInt(targetDuration, 10) || 45, 20), 90);
    const safeParticipants = Math.min(Math.max(parseInt(expectedParticipants, 10) || 12, 1), 50);
    const safeExclusionKeys = (Array.isArray(exclusionKeys) ? exclusionKeys : [])
      .filter(key => typeof key === 'string')
      .map(key => key.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 100);

    const result = await generateBootcampClass({
      trainerId: req.user.id,
      requesterRole: req.user.role,
      classFormat: safeFormat,
      stationCount: safeStationCount,
      exercisesPerStation: safeExercisesPerStation,
      classStyle: VALID_STYLES.includes(classStyle) ? classStyle : 'standard',
      dayType: safeDayType,
      intensityCategory: VALID_INTENSITIES.includes(intensityCategory) ? intensityCategory : undefined,
      targetDuration: safeDuration,
      expectedParticipants: safeParticipants,
      spaceProfileId: spaceProfileId ? parseInt(spaceProfileId, 10) : undefined,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : undefined,
      name: typeof name === 'string' ? name.slice(0, 200) : undefined,
      includeStretch: includeStretch !== false,
      stretchDurationMin: Math.min(Math.max(parseInt(stretchDurationMin, 10) || 3, 1), 10),
      exclusionKeys: new Set(safeExclusionKeys),
    });

    return res.json({ success: true, bootcamp: result });
  } catch (err) {
    logger.error('[Bootcamp] Generate failed:', err.message);
    if (err?.statusCode === 403 && err?.code === 'BOOTCAMP_PROFILE_ACCESS_DENIED') {
      return res.status(403).json({ success: false, code: err.code, error: 'Access denied' });
    }
    return res.status(500).json({ success: false, error: 'Failed to generate boot camp class' });
  }
});

// POST /api/bootcamp/save
router.post('/save', async (req, res) => {
  try {
    const { generatedClass } = req.body;
    if (!generatedClass) {
      return res.status(400).json({ success: false, error: 'generatedClass is required' });
    }

    // S06: the role is taken from the authenticated request, never from the body.
    const template = await saveBootcampTemplate(generatedClass, req.user.id, {
      requesterRole: req.user.role,
    });
    return res.json({ success: true, templateId: template.id });
  } catch (err) {
    // Standard mapping: malformed 400, denied 403 (non-disclosing), else 500.
    if (err?.status === 400 || err?.status === 403) {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        error: err.status === 403 ? 'Access denied' : err.message,
      });
    }
    logger.error('[Bootcamp] Save failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save template' });
  }
});

// GET /api/bootcamp/templates
router.get('/templates', async (req, res) => {
  try {
    const { classFormat, dayType, limit } = req.query;
    const templates = await getTemplates(req.user.id, {
      classFormat: VALID_FORMATS.includes(classFormat) ? classFormat : undefined,
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : undefined,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
    return res.json({ success: true, templates });
  } catch (err) {
    logger.error('[Bootcamp] Templates fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load templates' });
  }
});

// POST /api/bootcamp/log
router.post('/log', async (req, res) => {
  try {
    const { operationKey, templateId, classDate, dayType, actualParticipants, exercisesUsed, modificationsMade, trainerNotes, classRating, energyLevel, overflowActivated, executionSummary } = req.body;

    if (!classDate || !Array.isArray(exercisesUsed) || exercisesUsed.length === 0) {
      return res.status(400).json({ success: false, error: 'classDate and a non-empty exercisesUsed array are required' });
    }

    // H29 / R-H04 (contract §5 line 218): "New write endpoints require an operation key."
    // A stable identity is what lets a retried write collapse onto ONE class log instead of
    // appending a second one — and because attendance idempotency is keyed per class-log id,
    // a duplicate class identity defeats attendance deduplication downstream even when each
    // attendance transaction is itself correct.
    if (typeof operationKey !== 'string' || operationKey.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'operationKey is required (run:<uuid> for a class run; the Sprint confirmation mints its own)',
      });
    }

    // H29b: the `sprint-slot:` namespace is RESERVED for the Sprint confirmation path, whose
    // key it mints itself (`sprintConfirmSlot.mjs`). Accepting one here let a caller squat a
    // slot's identity with an unrelated log: the confirmation then hit
    // `resolveIdempotentLog`'s changed-payload 409, which is not a client-safe SPRINT error,
    // so the trainer got a generic 400 and the slot could never be confirmed or re-logged.
    if (operationKey.trim().startsWith(SPRINT_SLOT_PREFIX)) {
      return res.status(400).json({
        success: false,
        error: `${SPRINT_SLOT_PREFIX}<slotId> is reserved for Sprint confirmation and cannot be used here`,
      });
    }

    const log = await logBootcampClass({
      trainerId: req.user.id,
      // H29: the caller-supplied identity, normalized (length-capped, non-empty) in the
      // service so a junk key cannot reach the unique index.
      operationKey,
      // BE-F8a: the RAW value is passed through. The previous
      // `templateId ? parseInt(templateId, 10) : null` accepted '12abc' as 12
      // and turned 'abc' into NaN (a 500). Ownership is enforced in the service.
      templateId: templateId ?? null,
      classDate,
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : null,
      actualParticipants: actualParticipants ? parseInt(actualParticipants, 10) : null,
      exercisesUsed,
      modificationsMade: modificationsMade ?? null,
      trainerNotes: typeof trainerNotes === 'string' ? trainerNotes.slice(0, 2000) : null,
      classRating: classRating ? Math.min(Math.max(parseInt(classRating, 10), 1), 5) : null,
      energyLevel: ['low', 'medium', 'high', 'explosive'].includes(energyLevel) ? energyLevel : null,
      overflowActivated: !!overflowActivated,
      // §5 line 222: `executionSummary` distinguishes a trainer-attested PRESCRIPTION from a
      // runner-MEASURED record. This endpoint is the UI's write path, and the UI supplies the
      // former; `runner_measured` requires a runner that actually measured, so a client
      // asserting it here is stored as null rather than as a measurement claim nobody made
      // (external review, round 99, LOW-1).
      executionSummary: isTrainerAttestedSummary(executionSummary) ? executionSummary : null,
    });

    eventBus.safeEmit('bootcamp:classLogged', {
      trainerId: req.user.id,
      dayType: log.dayType,
      exerciseCount: Array.isArray(exercisesUsed) ? exercisesUsed.length : 0,
      logId: log.id,
    });

    return res.json({ success: true, logId: log.id });
  } catch (err) {
    logger.error('[Bootcamp] Log failed:', err.message);
    const { status, error } = getBootcampRouteErrorResponse(
      err,
      'Template not found',
      'Failed to log class'
    );
    return res.status(status).json({ success: false, error });
  }
});

// GET /api/bootcamp/history
/**
 * SWA-105 Slice 8 — attendance log-back. Closes the Product Core Loop: every
 * registered attendee gets a real DailyWorkoutForm; guests get roster rows.
 * Idempotent per class; ownership enforced inside the service (404, never
 * existence-confirming). Body: { attendees: [{userId} | {guest}] }. A legitimate
 * zero-attendee class requires { attendees: [], noShowConfirmed: true }.
 */
router.post('/class-logs/:id/attendance', async (req, res) => {
  // DEFAULT-OFF PRODUCT GATE (SWA-105): the write path is now transactionally
  // serialized on the class-log row and uses batched authorization/insertion.
  // It remains dormant until the roster-check-in UI is ready and explicitly enabled.
  if (process.env.SWAN_BOOTCAMP_ATTENDANCE_ENABLED !== 'true') {
    return res.status(503).json({
      success: false,
      message: 'Bootcamp attendance log-back is not yet enabled.',
    });
  }
  try {
    const { recordBootcampAttendance } = await import('../services/bootcamp/bootcampAttendance.mjs');
    const { getBootcampClassLog, getAllModels } = await import('../models/index.mjs');
    const { default: ClientTrainerAssignment } = await import('../models/ClientTrainerAssignment.mjs');
    const models = getAllModels();
    const ClassLog = getBootcampClassLog();

    const result = await recordBootcampAttendance(
      {
        runAtomically: (operation) => sequelize.transaction(async (transaction) =>
          operation({
            getClassLog: (id) => ClassLog.findByPk(id, {
              transaction,
              lock: transaction.LOCK.UPDATE,
            }),
            createWorkoutForms: async (forms) => {
              if (forms.length === 0) return [];
              if (!models.DailyWorkoutForm) {
                throw new Error('DailyWorkoutForm model unavailable');
              }
              const rows = await models.DailyWorkoutForm.bulkCreate(
                forms.map((form) => ({
                  clientId: form.clientId,
                  trainerId: Number(req.user.id),
                  date: form.date,
                  formData: { ...form.formData, idempotencyKey: form.idempotencyKey },
                  sessionDeducted: form.sessionDeducted,
                  mcpProcessed: form.mcpProcessed,
                  submittedAt: new Date(),
                  // HOSTILE-REVIEW FIX (F1, HIGH): `validate: true` below runs each row's
                  // validators BEFORE sequelize injects timestamps
                  // (node_modules/sequelize/lib/model.js:1598-1613 validate, :1652-1665
                  // inject). DailyWorkoutForm declares createdAt/updatedAt explicitly with
                  // `allowNull: false` and NO defaultValue (models/DailyWorkoutForm.mjs:332-341),
                  // so every row failed with "createdAt cannot be null" — every attendance
                  // write with >=1 registered attendee became a 500 and the whole Core-Loop
                  // slice died. Setting them here makes validation pass while keeping the
                  // canonical checks live (probed: self-attendance, empty exercises and a
                  // future date are still rejected).
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })),
                { transaction, returning: true, validate: true },
              );
              return rows.map((row) => row.id);
            },
            saveClassLog: (log, patch) => log.update(patch, { transaction }),
            verifyClientAccessBatch: async (clientIds) => {
              if (clientIds.length === 0) return true;
              const assignedCount = await ClientTrainerAssignment.count({
                where: {
                  trainerId: Number(req.user.id),
                  clientId: { [Op.in]: clientIds },
                  status: 'active',
                },
                distinct: true,
                col: 'clientId',
                transaction,
              });
              return assignedCount === clientIds.length;
            },
          })),
      },
      {
        classLogId: Number(req.params.id),
        trainerId: Number(req.user.id),
        requesterRole: req.user.role,
        attendees: req.body?.attendees,
        noShowConfirmed: req.body?.noShowConfirmed === true,
      },
    );

    res.status(result.alreadyRecorded ? 200 : 201).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode ?? 500;
    if (status >= 500) logger.error('[Bootcamp] attendance failed:', error);
    res.status(status).json({ success: false, message: status >= 500 ? 'Attendance recording failed' : error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { dayType, limit, offset } = req.query;
    const result = await getClassHistory(req.user.id, {
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : undefined,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
      offset: Math.max(parseInt(offset, 10) || 0, 0),
    });
    return res.json({ success: true, logs: result.rows, total: result.count });
  } catch (err) {
    logger.error('[Bootcamp] History fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

// GET /api/bootcamp/spaces
router.get('/spaces', async (req, res) => {
  try {
    const spaces = await getSpaceProfiles(req.user.id);
    return res.json({ success: true, spaces });
  } catch (err) {
    logger.error('[Bootcamp] Spaces fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load spaces' });
  }
});

// POST /api/bootcamp/spaces
router.post('/spaces', async (req, res) => {
  try {
    const { name, locationName, totalAreaSqft, maxStations, maxPerStation, hasOutdoorAccess, outdoorDescription, notes } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const space = await createSpaceProfile({
      trainerId: req.user.id,
      name: name.slice(0, 100),
      locationName: typeof locationName === 'string' ? locationName.slice(0, 200) : null,
      totalAreaSqft: totalAreaSqft ? parseInt(totalAreaSqft, 10) : null,
      maxStations: maxStations ? Math.min(parseInt(maxStations, 10), 20) : null,
      maxPerStation: maxPerStation ? Math.min(parseInt(maxPerStation, 10), 10) : 4,
      hasOutdoorAccess: !!hasOutdoorAccess,
      outdoorDescription: typeof outdoorDescription === 'string' ? outdoorDescription.slice(0, 500) : null,
      notes: typeof notes === 'string' ? notes.slice(0, 1000) : null,
    });

    return res.json({ success: true, space });
  } catch (err) {
    logger.error('[Bootcamp] Space create failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create space' });
  }
});

// PUT /api/bootcamp/spaces/:id
router.put('/spaces/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Valid space ID required' });
    }

    const space = await updateSpaceProfile(id, req.user.id, req.body);
    return res.json({ success: true, space });
  } catch (err) {
    logger.error('[Bootcamp] Space update failed:', err.message);
    const { status, error } = getBootcampRouteErrorResponse(
      err,
      'Space profile not found',
      'Failed to update space'
    );
    return res.status(status).json({ success: false, error });
  }
});

// GET /api/bootcamp/trends
router.get('/trends', async (req, res) => {
  try {
    const { source, isApproved, limit } = req.query;
    const trends = await getExerciseTrends({
      source,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
    });
    return res.json({ success: true, trends });
  } catch (err) {
    logger.error('[Bootcamp] Trends fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load trends' });
  }
});

// POST /api/bootcamp/trends/:id/approve
router.post('/trends/:id/approve', authorize(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Valid trend ID required' });
    }

    const trend = await approveExerciseTrend(id, req.user.id);
    return res.json({ success: true, trend });
  } catch (err) {
    logger.error('[Bootcamp] Trend approve failed:', err.message);
    const { status, error } = getBootcampRouteErrorResponse(
      err,
      'Exercise trend not found',
      'Failed to approve trend'
    );
    return res.status(status).json({ success: false, error });
  }
});

// GET /api/bootcamp/exercises — Search Exercise Rolodex for bootcamp use
router.get('/exercises', async (req, res) => {
  try {
    const { muscleGroups, equipment, minDifficulty, maxDifficulty, optPhase, bodyPart, limit } = req.query;

    const exercises = await queryExercisesForBootcamp({
      muscleGroups: muscleGroups ? String(muscleGroups).split(',').map(s => s.trim()) : [],
      availableEquipment: equipment ? String(equipment).split(',').map(s => s.trim()) : [],
      minDifficulty: minDifficulty ? parseInt(minDifficulty, 10) : 0,
      maxDifficulty: maxDifficulty ? parseInt(maxDifficulty, 10) : 1000,
      optPhase: optPhase ? parseInt(optPhase, 10) : undefined,
      bodyPartCategory: bodyPart || undefined,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });

    return res.json({ success: true, exercises, count: exercises.length });
  } catch (err) {
    logger.error('[Bootcamp] Exercise search failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to search exercises' });
  }
});

export default router;
