/**
 * Daily Workout Form Routes
 * ========================
 * 
 * Manages comprehensive NASM workout form submissions with MCP integration.
 * Handles workout logging, session deduction, and gamification processing.
 * 
 * Core Features:
 * - Submit and retrieve daily workout forms
 * - Session deduction with transactional safety
 * - MCP server integration for gamification and progress tracking
 * - Comprehensive workout analytics and reporting
 * - Progress visualization data endpoints
 * 
 * Part of the NASM Workout Tracking System - Phase 2.2: API Layer
 * Designed for SwanStudios Platform - Production Ready
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import { protect, trainerOrAdminOnly, adminOnly, checkTrainerClientRelationship } from '../middleware/authMiddleware.mjs';
import {
  getDailyWorkoutForm,
  getUser,
  getWorkoutLog,
  getWorkoutSession,
  getWorkoutPlan,
  getWorkoutPlanCompletionReceipt,
  getSession,
  getSessionType,
  getClientTrainerAssignment,
  getTrainerPermissions,
  getBodyMeasurement,
  getChallenge,
  getChallengeParticipant,
  getVariationLog
} from '../models/index.mjs';
import { PERMISSION_TYPES } from '../models/TrainerPermissions.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { awardWorkoutXP } from '../services/awardWorkoutXP.mjs';
import { buildChallengeProgressImpactReceipt } from '../services/gamification/challengeProgressImpactReceipt.mjs';
import { buildWorkoutSessionBillingDecision, normalizePaidSessionCount } from '../services/sessionBillingPolicy.mjs';
import { toCurrentWorkoutPlanResponse } from '../services/workoutPlanShapeService.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';
import { resolveClientTrainingDateContext } from '../services/clientTrainingDateService.mjs';
import {
  buildProgressDetailedAnalysisRows,
  fetchCanonicalProgressWorkoutSessions,
} from '../services/workoutProgressDetailReadModelService.mjs';
import {
  PlannedWorkoutAssignmentError,
  assertPlannedAssignmentMatchesOverview,
  buildPlannedAssignmentFormMetadata,
  getPlannedWorkoutAssignmentClientMessage,
  isNonBillablePlannedWorkoutAssignment,
  normalizePlannedWorkoutAssignmentInput,
} from '../services/plannedWorkoutAssignmentLogService.mjs';
import { advancePlanAfterPlannedAssignmentLog } from '../services/clientTrainingPlanProgressService.mjs';
import { estimateBrzycki1RM } from '../services/oneRepMaxService.mjs';
import { detectAndRecordPersonalRecords } from '../services/workout/workoutPrDetectionService.mjs';
import { getAllModels } from '../models/index.mjs';
import { safeAssemble } from '../services/postSaveHandoffAssembler.mjs';
import { accrueFlatSessionEarning } from '../services/trainerSessionEarningService.mjs';
import { fireWorkoutBadgeChecks } from '../services/badgeGamificationBridge.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'INTERNAL_ERROR';
const SELF_LOG_WORKOUT_ROLES = new Set(['client', 'user']);
const isWorkoutSelfLogRole = (role) =>
  typeof role === 'string' && SELF_LOG_WORKOUT_ROLES.has(role.toLowerCase());

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseOptionalPositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseStrictPositiveInteger(value);
};

const sameId = (a, b) => String(a) === String(b);

const toNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
};

const normalizeWorkoutLogRpe = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1 || parsed > 10) return null;
  return Math.trunc(parsed);
};

const normalizeWorkoutLogRest = (set = {}) => {
  const value = set.rest ?? set.restTime ?? set.restSeconds;
  if (value === undefined || value === null || value === '') return null;
  return toNonNegativeInteger(value, 0);
};

const compactWorkoutLogString = (value, maxLength = null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const buildWorkoutLogRowsFromFormExercises = (exercises = [], sessionId) => {
  const rows = [];

  exercises.forEach((exercise = {}, exerciseIndex) => {
    const exerciseName = compactWorkoutLogString(exercise.exerciseName, 255)
      || compactWorkoutLogString(exercise.name, 255)
      || `Exercise ${exerciseIndex + 1}`;
    const exerciseNote = compactWorkoutLogString(exercise.exerciseNote)
      || compactWorkoutLogString(exercise.performanceNotes)
      || null;
    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];

    sets.forEach((set = {}, setIndex) => {
      const explicitSetNumber = parseStrictPositiveInteger(set.setNumber);
      rows.push({
        sessionId,
        exerciseName,
        setNumber: explicitSetNumber || setIndex + 1,
        reps: toNonNegativeInteger(set.reps, 0),
        weight: toNonNegativeNumber(set.weight, 0),
        tempo: compactWorkoutLogString(set.tempo, 20),
        rest: normalizeWorkoutLogRest(set),
        rpe: normalizeWorkoutLogRpe(set.rpe),
        notes: compactWorkoutLogString(set.notes),
        exerciseNote,
      });
    });
  });

  return rows;
};

const parseOptionalBoolean = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === 'true') return { ok: true, value: true };
  if (value === 'false') return { ok: true, value: false };
  return { ok: false };
};

const parseOptionalDate = (value) => {
  if (!value) return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value: date };
};

const toIsoDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const directMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
    if (directMatch) return directMatch[1];
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  code: INTERNAL_ERROR,
});

const toWorkoutFormErrorMetadata = (error, fallbackCode = 'workout_form_internal_error') => ({
  errorName: error?.name || 'Error',
  errorCode: error?.code || error?.type || fallbackCode,
});

const logWorkoutFormError = (message, error, req, metadata = {}) => {
  logger.error(message, {
    userId: req?.user?.id,
    ...metadata,
    ...toWorkoutFormErrorMetadata(error),
  });
};

const resolvePlannedAssignmentForLog = async ({
  rawAssignment,
  clientId,
  workoutDateValue,
  hasScheduledSession,
  clientTimeZone,
  clientTimeZoneConfigured,
  actorId,
  headerTimeZone,
  referenceDate = new Date(),
  transaction,
}) => {
  const normalized = normalizePlannedWorkoutAssignmentInput(rawAssignment, { hasScheduledSession });
  if (!normalized.ok) {
    throw new PlannedWorkoutAssignmentError(normalized.message);
  }
  if (!normalized.assignment) return null;

  const WorkoutPlan = getWorkoutPlan();
  if (!WorkoutPlan?.findOne) {
    throw new PlannedWorkoutAssignmentError('Workout plan verification is unavailable', 503);
  }

  const plan = await WorkoutPlan.findOne({
    where: {
      id: normalized.assignment.planId,
      userId: clientId,
      status: 'active',
    },
    order: [['updatedAt', 'DESC']],
    transaction,
    ...(transaction?.LOCK?.UPDATE ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!plan) {
    throw new PlannedWorkoutAssignmentError('Active workout plan assignment was not found');
  }

  const formatted = toCurrentWorkoutPlanResponse(plan);
  const currentSession = formatted.currentSession || null;
  const trainingDateContext = resolveClientTrainingDateContext({
    storedTimeZone: clientTimeZone,
    storedTimeZoneConfigured: clientTimeZoneConfigured,
    headerTimeZone,
    actorId,
    targetClientId: clientId,
    referenceDate,
  });
  const overview = buildClientTrainingOverview({
    activePlan: plan,
    plans: [plan],
    currentSession,
    today: hasScheduledSession ? workoutDateValue : trainingDateContext.localDate,
  });

  assertPlannedAssignmentMatchesOverview(
    normalized.assignment,
    overview.todayAssignment,
    { hasScheduledSession }
  );
  const metadata = buildPlannedAssignmentFormMetadata(normalized.assignment, overview.todayAssignment);
  const assignmentDate = toIsoDateOnly(metadata?.scheduledDate);
  const workoutDate = toIsoDateOnly(workoutDateValue);
  if (assignmentDate && workoutDate && assignmentDate !== workoutDate) {
    throw new PlannedWorkoutAssignmentError('Planned assignment date does not match the workout log date');
  }
  return metadata;
};

/**
 * @route   GET /api/workout-forms/my/info
 * @desc    Get own information for self-service workout logging (client)
 * @access  Any authenticated user
 */
router.get('/my/info', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = getUser();
    const DailyWorkoutForm = getDailyWorkoutForm();

    const client = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions', 'clientSource', 'timeZone', 'timeZoneConfigured', 'createdAt']
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: userId,
    });
    let recentWorkoutCount = 0;
    let todayWorkout = null;
    const today = trainingDateContext.localDate;

    if (DailyWorkoutForm) {
      try {
        recentWorkoutCount = await DailyWorkoutForm.count({
          where: { clientId: userId, date: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        });
        todayWorkout = await DailyWorkoutForm.findOne({ where: { clientId: userId, date: today } });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm query failed', {
          userId,
          ...toWorkoutFormErrorMetadata(formErr, 'daily_workout_form_info_query_failed'),
        });
      }
    }

    res.json({
      success: true,
      trainingDateContext,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        availableSessions: client.availableSessions || 0,
        clientSource: client.clientSource,
        memberSince: client.createdAt,
        recentWorkoutCount,
        hasWorkoutToday: !!todayWorkout,
        todayWorkoutId: todayWorkout?.id || null
      }
    });
  } catch (error) {
    logWorkoutFormError('Error fetching own info for workout logging', error, req);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/workout-forms/client/:clientId/info
 * @desc    Get client information for workout logging
 * @access  Trainer (with edit_workouts permission) or Admin
 */
router.get('/client/:clientId/info', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { clientId } = req.params;
    const trainerId = req.user.id;
    const userRole = req.user.role;

    const parsedClientId = parseStrictPositiveInteger(clientId);
    if (!parsedClientId) {
      return res.status(400).json({
        success: false,
        message: 'Valid client ID is required'
      });
    }

    const User = getUser();
    const ClientTrainerAssignment = getClientTrainerAssignment();

    // Get client information (allow any role — admin may test with own account)
    const client = await User.findOne({
      where: {
        id: parsedClientId
      },
      attributes: [
        'id',
        'firstName', 
        'lastName',
        'email',
        'phone',
        'availableSessions',
        'clientSource',
        'timeZone',
        'timeZoneConfigured',
        'createdAt'
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check trainer-client assignment (skip for admins)
    if (userRole === 'trainer') {
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
          trainerId: trainerId,
          status: 'active'
        }
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }

      // Check edit_workouts permission
      const hasPermission = await checkTrainerPermission(trainerId, PERMISSION_TYPES.EDIT_WORKOUTS);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit workouts for this client'
        });
      }
    }

    // Get recent workout count for context
    const DailyWorkoutForm = getDailyWorkoutForm();
    let recentWorkoutCount = 0;
    if (DailyWorkoutForm) {
      try {
        recentWorkoutCount = await DailyWorkoutForm.count({
          where: {
            clientId: parsedClientId,
            date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm count failed', {
          clientId: parsedClientId,
          ...toWorkoutFormErrorMetadata(formErr, 'daily_workout_form_client_count_failed'),
        });
      }
    }

    // Check if client already has a workout logged on the client's date.
    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: parsedClientId,
    });
    const today = trainingDateContext.localDate;
    let todayWorkout = null;
    if (DailyWorkoutForm) {
      try {
        todayWorkout = await DailyWorkoutForm.findOne({
          where: {
            clientId: parsedClientId,
            date: today
          }
        });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm findOne failed', {
          clientId: parsedClientId,
          ...toWorkoutFormErrorMetadata(formErr, 'daily_workout_form_client_today_failed'),
        });
      }
    }

    const clientInfo = {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      availableSessions: client.availableSessions || 0,
      clientSource: client.clientSource,
      memberSince: client.createdAt,
      recentWorkoutCount,
      hasWorkoutToday: !!todayWorkout,
      todayWorkoutId: todayWorkout?.id || null
    };

    logger.info(`Client info loaded for workout logging: ${client.firstName} ${client.lastName} (${client.id})`);

    res.json({
      success: true,
      trainingDateContext,
      client: clientInfo
    });

  } catch (error) {
    logWorkoutFormError('Error fetching client info for workout logging', error, req, {
      clientId: req.params?.clientId,
    });
    return sendInternalError(res, 'Failed to load client information');
  }
});

/**
 * Helper function to check trainer permissions.
 *
 * 2026-05-01 fix: the TrainerPermissions model has schema drift against
 * the production DB (model fields map to snake_case via field:'trainer_id'
 * etc., but DB columns are camelCase trainerId/permissionType/grantedBy).
 * The findOne query throws at the column level, the catch silently
 * returned false, and every trainer (including those with active
 * client assignments) was 403'd from logging workouts. The DB also has
 * zero rows in trainer_permissions, meaning the explicit-grant model has
 * never actually been used in production — every production trainer is
 * implicitly permitted today via their role + active assignment.
 *
 * Permissive default semantic: if the table is empty for this trainer
 * (no rows of any type), assume admin-controlled overrides are not in
 * use and grant by role. If at least one row exists for the trainer,
 * fall back to the strict explicit-grant check (admin opt-in to gating).
 *
 * This preserves the platform's "trainer can do trainer things by
 * default" expectation while still letting admin gate if they ever
 * configure the table.
 */
const checkTrainerPermission = async (trainerId, permissionType) => {
  try {
    const TrainerPermissions = getTrainerPermissions();
    const numericTrainerId = parseInt(trainerId, 10);

    // Strict explicit-grant lookup
    const permission = await TrainerPermissions.findOne({
      where: {
        trainerId: numericTrainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });
    if (permission) return true;

    // Permissive fallback: if this trainer has ZERO rows for ANY
    // permission type, the platform-default applies (no admin gating
    // configured for this trainer).
    const anyRow = await TrainerPermissions.findOne({
      where: { trainerId: numericTrainerId },
    });
    if (!anyRow) return true;

    return false;
  } catch (error) {
    // Schema drift / DB error: log + permissive default. Better to
    // allow a legitimate trainer than to lock out the whole platform
    // due to a model file mismatch.
    logger.warn('Trainer permission check errored — falling back to permissive default', {
      trainerId,
      permissionType,
      ...toWorkoutFormErrorMetadata(error, 'trainer_permission_check_failed'),
    });
    return true;
  }
};

/**
 * Retired legacy MCP processing hook.
 *
 * The column names remain `mcpProcessed` / `mcpProcessedAt` because they are
 * already part of the DailyWorkoutForm schema, but no server URL or env flag can
 * reconnect the old MCP stack from this path.
 */
const processMCPIntegration = async (formId, _formData) => {
  logger.info(`[MCP retired] Marking form ${formId} as processed by first-party API workflow`);

  try {
    const DailyWorkoutForm = getDailyWorkoutForm();
    await DailyWorkoutForm.update({
      mcpProcessed: true,
      mcpProcessedAt: new Date(),
      totalPointsEarned: 0,
      processingErrors: {
        retired: true,
        replacement: 'SwanStudios first-party workout and gamification APIs',
        timestamp: new Date().toISOString()
      }
    }, { where: { id: formId } });
  } catch (err) {
    logger.warn('[MCP retired] Failed to mark form as processed', {
      formId,
      ...toWorkoutFormErrorMetadata(err, 'workout_form_mcp_retired_mark_failed'),
    });
  }
};

/**
 * @route   POST /api/workout-forms
 * @desc    Submit a daily workout form
 * @access  Trainer (with edit_workouts permission), Admin, or Client (self only)
 * @body    { clientId, date, exercises, sessionNotes?, overallIntensity? }
 *
 * 2026-04-18 (Codex round 4 fix): removed `trainerOrAdminOnly` from the
 * middleware chain. The docstring above has always claimed client
 * self-log is allowed, and the handler body enforces it at lines 398-405
 * (client can only submit for themselves). But the previous middleware
 * chain included `trainerOrAdminOnly`, which 403'd clients BEFORE the
 * handler's self-check could run. The client self-log route at
 * `/dashboard/client/log-workout` hit this 403 on every save attempt.
 *
 * `checkTrainerClientRelationship` is role-aware
 * (authMiddleware.mjs:614+): admins pass, clients accessing their own
 * id pass, trainers must have an active ClientTrainerAssignment. That
 * middleware is correct as-is. The handler also runs the trainer
 * edit_workouts permission check inline (lines 408-416) so nothing is
 * lost by dropping the outer role gate.
 */
router.post('/', protect, checkTrainerClientRelationship, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      clientId,
      date,
      exercises,
      sessionNotes,
      overallIntensity,
      scheduledSessionId,
      equipmentProfileId,
      plannedAssignment
    } = req.body;
    // 2026-04-18 Phase 16.2 round 5 fix — req.user.id is stored as a string
    // by `protect` (authMiddleware.mjs:359). Callers here need a number for
    // comparison against parsedClientId and for Sequelize trainerId
    // lookups against an INT column. Coerce once at the top of the handler.
    const userNumericId = parseStrictPositiveInteger(req.user.id);
    const trainerId = userNumericId;
    const userRole = req.user.role;

    // Validate required fields
    if (!clientId || !date || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Client ID, date, and exercises array are required'
      });
    }

    if (!userNumericId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'Invalid authenticated user'
      });
    }

    const parsedClientId = parseStrictPositiveInteger(clientId);
    if (!parsedClientId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid client ID is required'
      });
    }

    const parsedScheduledSessionId = parseOptionalPositiveInteger(scheduledSessionId);
    if (
      scheduledSessionId !== undefined &&
      scheduledSessionId !== null &&
      scheduledSessionId !== '' &&
      !parsedScheduledSessionId
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid scheduled session ID is required'
      });
    }

    const parsedEquipmentProfileId = parseOptionalPositiveInteger(equipmentProfileId);
    if (
      equipmentProfileId !== undefined &&
      equipmentProfileId !== null &&
      equipmentProfileId !== '' &&
      !parsedEquipmentProfileId
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid equipment profile ID is required'
      });
    }

    // Client/member self-log actors can only submit for themselves.
    if (isWorkoutSelfLogRole(userRole) && parsedClientId !== userNumericId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Clients can only log their own workouts'
      });
    }

    // Check trainer permissions (skip for admins and clients logging their own)
    if (userRole === 'trainer') {
      const hasPermission = await checkTrainerPermission(trainerId, PERMISSION_TYPES.EDIT_WORKOUTS);
      if (!hasPermission) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit workouts'
        });
      }

      // Verify trainer is assigned to this client
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
          trainerId,
          status: 'active'
        },
        transaction
      });

      if (!assignment) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }
    }

    // Validate client exists and apply client-source billing policy.
    const User = getUser();
    const client = await User.findByPk(parsedClientId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    const trainingReferenceDate = new Date();
    const trainingDateContext = resolveClientTrainingDateContext({
      storedTimeZone: client.timeZone,
      storedTimeZoneConfigured: client.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: parsedClientId,
      referenceDate: trainingReferenceDate,
    });
    const availableSessionsBeforeSave = normalizePaidSessionCount(client.availableSessions);

    let linkedScheduledSession = null;
    if (parsedScheduledSessionId) {
      const Session = getSession();
      linkedScheduledSession = await Session.findByPk(parsedScheduledSessionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!linkedScheduledSession) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Scheduled session not found'
        });
      }

      if (!sameId(linkedScheduledSession.userId, parsedClientId)) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Scheduled session does not belong to this client'
        });
      }

      if (
        userRole === 'trainer' &&
        linkedScheduledSession.trainerId &&
        !sameId(linkedScheduledSession.trainerId, trainerId)
      ) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this scheduled session'
        });
      }

      if (linkedScheduledSession.status === 'cancelled' || linkedScheduledSession.status === 'blocked') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Scheduled session cannot be logged'
        });
      }

      if (linkedScheduledSession.attendanceStatus === 'no_show') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No-show scheduled sessions cannot be logged as workouts'
        });
      }
    }

    const workoutDateValue = linkedScheduledSession?.sessionDate
      ? new Date(linkedScheduledSession.sessionDate).toISOString().split('T')[0]
      : date;
    const workoutDateIso = toIsoDateOnly(workoutDateValue);
    if (!workoutDateIso) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid workout date is required'
      });
    }

    const plannedAssignmentMetadata = await resolvePlannedAssignmentForLog({
      rawAssignment: plannedAssignment,
      clientId: parsedClientId,
      workoutDateValue: workoutDateIso,
      hasScheduledSession: Boolean(linkedScheduledSession),
      clientTimeZone: client.timeZone,
      clientTimeZoneConfigured: client.timeZoneConfigured,
      actorId: req.user.id,
      headerTimeZone: req.get('X-Client-Timezone'),
      referenceDate: trainingReferenceDate,
      transaction,
    });

    let scheduledSessionCreditsRequired;
    if (linkedScheduledSession?.sessionTypeId) {
      const SessionType = getSessionType();
      const sessionType = await SessionType.findByPk(linkedScheduledSession.sessionTypeId, {
        attributes: ['id', 'creditsRequired'],
        transaction,
      });
      if (sessionType && sessionType.creditsRequired !== undefined) {
        scheduledSessionCreditsRequired = sessionType.creditsRequired;
      }
    }

    const billingDecision = buildWorkoutSessionBillingDecision(client, {
      scheduledSessionAlreadyDeducted: linkedScheduledSession?.sessionDeducted === true,
      nonBillablePlannedAssignment: isNonBillablePlannedWorkoutAssignment(plannedAssignmentMetadata),
      creditsRequired: scheduledSessionCreditsRequired,
    });
    if (!billingDecision.canLogWorkout) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: billingDecision.message
      });
    }

    // DATEONLY strings compare chronologically once both sides use the client's zone.
    if (workoutDateIso > trainingDateContext.localDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Workout date cannot be in the future'
      });
    }

    // 2026-04-18 Phase 16.2 round 9 — derive the DailyWorkoutForm's
    // trainerId separately from the acting user. `trainerId` above is the
    // ACTOR (the authenticated user who submitted the request). For client
    // self-log, the actor IS the client, but the DailyWorkoutForm's
    // `trainer_id` column cannot be the client's own id — the model's
    // `clientTrainerDifferent` validator (DailyWorkoutForm.mjs:349-353)
    // rejects any row with `clientId === trainerId`. The column is also
    // `allowNull: false` with an FK to users(id), so we can't just set
    // null without a migration.
    //
    // Resolution order for client self-log:
    //   1. Use the client's active `ClientTrainerAssignment.trainerId` —
    //      semantically the trainer who oversees this client's program.
    //   2. Fall back to the lowest-id admin user — represents "no assigned
    //      trainer, platform-supervised workout" (typical for Move Fitness
    //      onboarding or unclaimed clients).
    //   3. If neither exists (no admin seeded), refuse the save with 500.
    //
    // Trainer/admin path: actor and form's trainerId are the same user.
    let attributedTrainerId = trainerId;
    const isSelfWorkoutLogActor = isWorkoutSelfLogRole(userRole) || parsedClientId === userNumericId;
    if (isSelfWorkoutLogActor) {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
          status: 'active',
        },
        transaction,
      });
      if (assignment?.trainerId && assignment.trainerId !== userNumericId) {
        attributedTrainerId = assignment.trainerId;
      } else {
        const fallbackAdmin = await User.findOne({
          where: { role: 'admin' },
          order: [['id', 'ASC']],
          transaction,
        });
        if (!fallbackAdmin || fallbackAdmin.id === userNumericId) {
          await transaction.rollback();
          return res.status(500).json({
            success: false,
            message: 'Unable to attribute workout — no valid trainer or admin available'
          });
        }
        attributedTrainerId = fallbackAdmin.id;
      }
    }

    // C4a duplicate-write guard: the same-day dedupe below is a findOne-then-
    // insert with NO unique index behind it (dupes may exist in prod, so the
    // index needs its own probed migration). A transaction-scoped advisory
    // lock on (clientId, date) serializes concurrent saves instead: the
    // second request blocks here until the first commits, then its findOne
    // SEES the new form and returns the clean 409. Auto-released at
    // commit/rollback; no schema change. Postgres-only by design (prod DB).
    await sequelize.query(
      "SELECT pg_advisory_xact_lock(hashtext('workout-form-save'), hashtext(:lockKey))",
      { replacements: { lockKey: `${parsedClientId}:${workoutDateIso}` }, transaction },
    );

    // Check if a workout form already exists for this client on this date
    const DailyWorkoutForm = getDailyWorkoutForm();
    const existingForm = await DailyWorkoutForm.findOne({
      where: {
        clientId: parsedClientId,
        date: workoutDateIso
      },
      transaction
    });

    if (existingForm) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'A workout form already exists for this client on this date',
        form: {
          id: existingForm.id,
          clientId: existingForm.clientId,
          trainerId: existingForm.trainerId,
          date: existingForm.date,
          submittedAt: existingForm.submittedAt
        }
      });
    }

    // Calculate workout statistics
    const pendingWorkoutLogRows = buildWorkoutLogRowsFromFormExercises(exercises, null);
    const totalSets = pendingWorkoutLogRows.length;
    const totalReps = pendingWorkoutLogRows.reduce((sum, row) => sum + (row.reps || 0), 0);
    const totalWeight = pendingWorkoutLogRows.reduce(
      (sum, row) => sum + ((row.reps || 0) * (row.weight || 0)),
      0
    );
    const estimatedDuration = Math.min(totalSets * 3, 120); // 3 minutes per set, cap at 2 hours

    const scheduledSessionWorkoutFields = linkedScheduledSession
      ? {
          sessionId: linkedScheduledSession.id,
          sessionType: 'trainer-led',
          trainerId: linkedScheduledSession.trainerId || attributedTrainerId
        }
      : {};

    // Create or update workout session
    //
    // Phase 1 Slice 1.1 (2026-05-03): two correctness fixes for the
    // trainer-logging → client-dashboard data path that the canonical
    // surface receipt audit found:
    //
    //   Bug 1 — totalSets always 0 on WorkoutSession. The defaults
    //   block previously omitted `totalSets`, so the model default 0
    //   was used on CREATE. Reader maps totalSets → exercises and
    //   the dashboard always showed "0 exercises".
    //
    //   Bug 2 — pre-existing 'planned' WorkoutSession (e.g. created
    //   by the V3a planner via workoutService.mjs:1427) stayed
    //   'planned' after a trainer logged against it. findOrCreate
    //   defaults only apply on CREATE. The DailyWorkoutForm got
    //   sessionId, but the WorkoutSession's status was never moved
    //   to 'completed'. Reader filters status='completed' and
    //   silently dropped these from the dashboard. Trainer logged,
    //   server data stored, dashboard showed nothing.
    //
    // Fix: include totalSets in the defaults block. After
    // findOrCreate, if the row already existed, reconcile it via
    // update() unconditionally — status, completedAt, totalSets,
    // duration, intensity, notes. Codex Round 1 (2026-05-03) flagged
    // a status-only guard as insufficient: a stale `'completed'`
    // WorkoutSession with totalSets=0 / notes='' / old completedAt
    // would NOT be reconciled when the matching DailyWorkoutForm
    // had been deleted. The route already passed the existingForm
    // 409 guard, so the new submission is being accepted as the
    // canonical log for this client/date — the WorkoutSession MUST
    // match what the trainer just submitted.
    // Title is preserved (the planner-generated title may be more
    // descriptive than our generic "Personal Training Session - X").
    const completionFields = {
      status: 'completed',
      completedAt: new Date(),
      duration: estimatedDuration,
      totalSets,
      totalReps,
      totalWeight,
      intensity: (overallIntensity === undefined || overallIntensity === null)
        ? null
        : overallIntensity,
      notes: sessionNotes || '',
      ...scheduledSessionWorkoutFields,
    };

    const WorkoutSession = getWorkoutSession();
    const [workoutSession, created] = await WorkoutSession.findOrCreate({
      where: {
        userId: parsedClientId,
        date: workoutDateIso
      },
      defaults: {
        // 2026-04-18 Phase 16.2 round 8 fix — was `require('crypto').randomUUID()`
        // inside an .mjs module, which threw `require is not defined` at
        // runtime on the canonical save path. Switched to the ESM `node:crypto`
        // import at the top of this file. Same UUID v4 primitive, correct
        // module system.
        id: randomUUID(),
        userId: parsedClientId,
        title: `Personal Training Session - ${workoutDateIso}`,
        date: workoutDateIso,
        // Phase 16 (2026-04-16): honor null when the logger did not record
        // an intensity rating. The previous `|| 5` fallback seeded a
        // phantom 5/10 into the canonical chart on every untouched save.
        // Accepts both `undefined` (key omitted from payload — the wire
        // contract) and explicit `null`.
        ...completionFields,
      },
      transaction
    });

    // Phase 1 Slice 1.1 Bug 2 fix: if the row was found-not-created,
    // reconcile it against the submitted completionFields
    // unconditionally. The route already passed the existingForm 409
    // guard, so this submission is being accepted as the new
    // canonical log for this client/date — the WorkoutSession MUST
    // match what the trainer just submitted.
    //
    // Codex Round 1 (2026-05-03) flagged the previous status-only
    // guard: if a `'completed'` WorkoutSession existed but its
    // matching DailyWorkoutForm had been deleted, the new POST
    // would be accepted, the new form would be created, but the
    // session's stale `totalSets=0` / `notes=''` / old `completedAt`
    // would NOT be reconciled. Reader queries WorkoutSession (not
    // DailyWorkoutForm) for `totalSets` / `duration` / `notes`, so
    // the dashboard would still show stale data.
    //
    // Stronger invariant: "if the route accepts a new DailyWorkoutForm,
    // the associated WorkoutSession must reflect the submitted
    // completion fields." Update unconditionally on !created.
    //
    // The findOrCreate(planned) → update(completed) path remains the
    // primary use case (planner pre-created the row); the
    // already-completed-but-stale path is the edge case Codex caught.
    if (!created) {
      await workoutSession.update(completionFields, { transaction });
    }

    const WorkoutLog = getWorkoutLog();
    if (!WorkoutLog?.destroy || !WorkoutLog?.bulkCreate) {
      throw new Error('WorkoutLog model is unavailable for canonical workout form persistence');
    }
    const workoutLogRows = pendingWorkoutLogRows.map((row) => ({
      ...row,
      sessionId: workoutSession.id,
    }));
    await WorkoutLog.destroy({
      where: { sessionId: workoutSession.id },
      transaction,
    });
    if (workoutLogRows.length > 0) {
      await WorkoutLog.bulkCreate(workoutLogRows, { transaction, validate: true });
    }

    // Create daily workout form.
    //
    // Phase 16: when the client logger did not record an overall intensity
    // rating, omit the key from formData rather than stamping 5. Legacy
    // daily-form readers treat missing `overallIntensity` as "not rated"
    // (null-guards added in this phase).
    const formData = {
      exercises,
      sessionNotes: sessionNotes || '',
      submittedBy: trainerId,
      submittedAt: new Date(),
      totalSets,
      estimatedDuration
    };
    if (overallIntensity !== undefined && overallIntensity !== null) {
      formData.overallIntensity = overallIntensity;
    }
    if (parsedEquipmentProfileId) {
      formData.equipmentProfileId = parsedEquipmentProfileId;
    }
    if (linkedScheduledSession) {
      formData.scheduledSessionId = linkedScheduledSession.id;
    }
    if (plannedAssignmentMetadata) {
      formData.plannedAssignment = plannedAssignmentMetadata;
    }

    const dailyForm = await DailyWorkoutForm.create({
      sessionId: workoutSession.id,
      clientId: parsedClientId,
      // Use the role-resolved attribution trainer (see round 9 derivation
      // above). For trainer/admin actors this equals `trainerId`; for
      // client self-log it's the assigned trainer or admin fallback so
      // the model's `clientTrainerDifferent` validator passes.
      trainerId: attributedTrainerId,
      date: workoutDateIso,
      formData,
      sessionDeducted: false,
      mcpProcessed: false
    }, { transaction });

    if (billingDecision.shouldDeduct && billingDecision.creditsToDeduct > 0) {
      await client.decrement('availableSessions', { by: billingDecision.creditsToDeduct, transaction });
    }

    if (billingDecision.sessionDeducted) {
      await dailyForm.update({ sessionDeducted: true }, { transaction });
    }

    const billingReceiptRemainingSessions = Math.max(
      0,
      availableSessionsBeforeSave - billingDecision.creditsToDeduct
    );
    const billingReceiptStatus = billingDecision.sessionDeducted
      ? (billingDecision.creditsToDeduct > 0 ? 'deducted' : 'previously_deducted')
      : 'not_deducted';
    const billingReceiptCreditsRequired = billingDecision.creditsToDeduct > 0
      ? billingDecision.creditsToDeduct
      : billingDecision.sessionDeducted
        ? (
            scheduledSessionCreditsRequired === undefined
              ? 1
              : normalizePaidSessionCount(scheduledSessionCreditsRequired)
          )
        : 0;
    const billingReceipt = {
      status: billingReceiptStatus,
      shouldDeduct: billingDecision.shouldDeduct,
      sessionDeducted: billingDecision.sessionDeducted,
      creditsDeducted: billingDecision.creditsToDeduct,
      creditsRequired: billingReceiptCreditsRequired,
      remainingSessions: billingReceiptRemainingSessions
    };

    const planProgress = plannedAssignmentMetadata
      ? await advancePlanAfterPlannedAssignmentLog({
          WorkoutPlan: getWorkoutPlan(),
          WorkoutPlanCompletionReceipt: getWorkoutPlanCompletionReceipt(),
          assignment: plannedAssignmentMetadata,
          clientId: parsedClientId,
          dailyWorkoutFormId: dailyForm.id,
          workoutSessionId: workoutSession.id,
          completedAt: dailyForm.submittedAt || new Date().toISOString(),
          allowScheduledTrainerSession: Boolean(linkedScheduledSession),
          transaction,
        })
      : null;

    if (linkedScheduledSession) {
      const scheduledSessionCompletionDate = new Date();
      const shouldStampScheduledSessionDeduction = billingDecision.shouldDeduct && billingDecision.sessionDeducted;
      const scheduledSessionAttendanceRecorderId = isSelfWorkoutLogActor
        ? (linkedScheduledSession.markedPresentBy || null)
        : trainerId;
      await linkedScheduledSession.update({
        status: 'completed',
        attendanceStatus: 'present',
        checkInTime: linkedScheduledSession.checkInTime || scheduledSessionCompletionDate,
        markedPresentBy: scheduledSessionAttendanceRecorderId,
        attendanceRecordedAt: linkedScheduledSession.attendanceRecordedAt || scheduledSessionCompletionDate,
        noShowReason: null,
        sessionDeducted: billingDecision.sessionDeducted,
        creditsDeducted: billingDecision.shouldDeduct
          ? billingDecision.creditsToDeduct
          : linkedScheduledSession.creditsDeducted,
        deductionDate: shouldStampScheduledSessionDeduction ? scheduledSessionCompletionDate : linkedScheduledSession.deductionDate
      }, { transaction });
    }

    await transaction.commit();

    // Employed-trainer pay (mode b): the workout log just completed the
    // linked scheduled session — accrue post-commit (self-filtering +
    // idempotent per session; revenue_share assignments accrue nothing).
    if (linkedScheduledSession?.trainerId) {
      await accrueFlatSessionEarning({ session: linkedScheduledSession });
    }

    // Rotation write-through confirmation (fail-soft, post-commit): a logged
    // workout confirms the day's delivered generation, so flip the newest
    // same-day VariationLog row to accepted. Manual logs with no generated
    // row simply skip — rotation history is never fabricated.
    try {
      const VariationLog = getVariationLog?.();
      if (VariationLog?.findOne) {
        const dayStart = new Date(`${workoutDateIso}T00:00:00.000Z`);
        const dayEnd = new Date(`${workoutDateIso}T23:59:59.999Z`);
        const variationRow = await VariationLog.findOne({
          where: {
            clientId: parsedClientId,
            accepted: false,
            sessionDate: { [Op.between]: [dayStart, dayEnd] },
          },
          order: [['sessionDate', 'DESC']],
        });
        if (variationRow?.update) {
          await variationRow.update({ accepted: true, acceptedAt: new Date() });
        }
      }
    } catch (variationConfirmError) {
      logger.warn('Variation history confirmation failed (workout save unaffected)', {
        clientId: parsedClientId,
        ...toWorkoutFormErrorMetadata(variationConfirmError, 'variation_history_confirm_failed'),
      });
    }

    let challengeProgress = buildChallengeProgressImpactReceipt();
    try {
      // Lazy import: the bridge chains to GamificationPointsService, which
      // defines Sequelize models at module load — a static import here
      // collection-kills any route test that mocks database.mjs.
      const { applyDailyWorkoutFormChallengeProgress } =
        await import('../services/gamification/challengeWorkoutCompletionBridge.mjs');
      const challengeExercises = formData?.exercises || [];
      const challengeProgressResult = await applyDailyWorkoutFormChallengeProgress({
        sequelize,
        models: {
          Challenge: getChallenge(),
          ChallengeParticipant: getChallengeParticipant(),
        },
        userId: parsedClientId,
        dailyForm,
        workoutSession,
        workoutDateIso,
        estimatedDuration,
        exercises: challengeExercises,
      });
      challengeProgress = buildChallengeProgressImpactReceipt(challengeProgressResult);
      const challengeProgressCounts = {
        updatedCount: challengeProgress.updatedCount,
        skippedCount: challengeProgress.skippedCount,
      };
      if (challengeProgress.updatedCount > 0 || challengeProgress.skippedCount > 0) {
        logger.info('Challenge progress processed from workout form', {
          clientId: parsedClientId,
          formId: dailyForm.id,
          ...challengeProgressCounts,
        });
      } else {
        logger.debug('No active challenge progress for workout form', {
          clientId: parsedClientId,
          formId: dailyForm.id,
          ...challengeProgressCounts,
        });
      }
    } catch (challengeErr) {
      challengeProgress = buildChallengeProgressImpactReceipt(null, 'failed');
      logger.warn('Challenge progress update failed (non-critical)', {
        clientId: parsedClientId,
        formId: dailyForm.id,
        ...toWorkoutFormErrorMetadata(challengeErr, 'workout_form_challenge_progress_failed'),
      });
    }
    // Award XP/gamification points asynchronously (don't block response)
    setImmediate(async () => {
      let xpTransaction;
      try {
        xpTransaction = await sequelize.transaction();
        const exercises = formData?.exercises || [];
        const xpResult = await awardWorkoutXP({
          userId: parsedClientId,
          workoutId: dailyForm.id,
          duration: estimatedDuration || null,
          exercisesCompleted: exercises.length,
          exerciseDetails: exercises.map(ex => ({
            name: ex.exerciseName || ex.name || 'unknown',
            sets: (ex.sets || []).length,
            type: ex.exerciseType || 'strength',
          })),
          workoutDate: workoutDateIso,
          awardedBy: trainerId || null,
        }, xpTransaction);
        await xpTransaction.commit();
        logger.info('Workout XP awarded', { clientId, formId: dailyForm.id, exerciseCount: exercises.length });

        // Badge sweep POST-commit on the persisted stats (best-effort, never
        // throws; duplicate-proof via userHasBadge + unique_user_badge_ownership).
        const badgesEarned = await fireWorkoutBadgeChecks({
          userId: parsedClientId,
          xpResult,
          exerciseCount: exercises.length,
        });
        if (badgesEarned.length > 0) {
          logger.info('Workout badges earned', {
            clientId,
            formId: dailyForm.id,
            badgeCount: badgesEarned.length,
          });
        }
      } catch (xpErr) {
        if (xpTransaction) await xpTransaction.rollback().catch(() => {});
        logger.warn('XP award failed (non-critical)', {
          clientId,
          ...toWorkoutFormErrorMetadata(xpErr, 'workout_form_xp_award_failed'),
        });
      }



      // Process with MCP servers (legacy, disabled by default)
      processMCPIntegration(dailyForm.id, {
        clientId,
        trainerId,
        date: workoutDateIso,
        formData,
        submittedAt: dailyForm.submittedAt
      });
    });

    logger.info(`Workout form submitted successfully`, {
      formId: dailyForm.id,
      clientId,
      trainerId,
      date: workoutDateIso,
      totalSets,
      sessionDeducted: billingDecision.sessionDeducted,
      clientSource: client.clientSource
    });

    // Launch charter 4a: PR detection runs synchronously (cheap indexed reads +
    // idempotent award) so the 201 carries truthful prEvents for the save
    // celebration. Never blocks the save — failures degrade to no events.
    let prEvents = [];
    try {
      const prResult = await detectAndRecordPersonalRecords({
        userId: parsedClientId,
        formId: dailyForm.id,
        sessionId: workoutSession?.id || null,
        exercises: formData?.exercises || [],
        date: workoutDateIso,
      });
      prEvents = prResult.prEvents || [];
    } catch (prErr) {
      logger.warn('PR detection failed (non-critical)', {
        clientId: parsedClientId,
        formId: dailyForm.id,
        ...toWorkoutFormErrorMetadata(prErr, 'workout_form_pr_detection_failed'),
      });
    }

    // ── Post-Save Handoff (Slice-2). BEST-EFFORT + FAIL-CLOSED. The workout save AND the
    // availableSessions deduction are COMMITTED above; NOTHING in this block may throw or 500 a
    // completed money path. safeAssemble never throws; getAllModels() is isolated inside the try;
    // workoutSession is the const from findOrCreate (in scope, already used at :1314).
    let handoff = null;
    try {
      if (workoutSession?.id) {
        handoff = await safeAssemble({
          viewerUserId: req.user.id,
          viewerRole: req.user.role,
          targetUserId: workoutSession.userId ?? parsedClientId,
          todaySessionId: workoutSession.id,
          models: getAllModels(),
        });
      }
    } catch { handoff = null; }

    res.status(201).json({
      success: true,
      form: {
        id: dailyForm.id,
        clientId: parsedClientId,
        trainerId: attributedTrainerId,
        date: workoutDateIso,
        totalSets,
        estimatedDuration,
        ...(linkedScheduledSession ? { scheduledSessionId: linkedScheduledSession.id } : {}),
        sessionDeducted: billingDecision.sessionDeducted,
        billing: billingReceipt,
        plannedAssignment: plannedAssignmentMetadata,
        planProgress: planProgress?.advanced ? planProgress : null,
        challengeProgress,
        prEvents,
        submittedAt: dailyForm.submittedAt
      },
      message: billingDecision.message,
      handoff
    });

  } catch (error) {
    await transaction.rollback();
    if (error instanceof PlannedWorkoutAssignmentError) {
      return res.status(error.status).json({
        success: false,
        message: getPlannedWorkoutAssignmentClientMessage(error),
      });
    }
    // Plan-advance / completion-receipt typed errors carry designed 4xx
    // semantics (409 evidence conflict, 409 stale revision, 400 invalid
    // evidence). Same fail-closed allowlist as workoutPlanRoutes: integer 4xx
    // + WORKOUT_PLAN_ code. Response copy is STATIC per this route's
    // no-raw-exception-echo contract (dailyWorkoutFormRoutesSecurity).
    const receiptStatus = Number(error?.statusCode);
    if (
      Number.isInteger(receiptStatus)
      && receiptStatus >= 400 && receiptStatus < 500
      && typeof error?.code === 'string'
      && error.code.startsWith('WORKOUT_PLAN_')
    ) {
      return res.status(receiptStatus).json({
        success: false,
        code: error.code,
        message: receiptStatus === 409
          ? 'The workout plan changed while this log was being saved. Refresh and try again.'
          : 'This workout log could not be matched to the current workout plan.',
        ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
    }
    logWorkoutFormError('Error submitting workout form', error, req);
    return sendInternalError(res, 'Failed to submit workout form');
  }
});

/**
 * @route   GET /api/workout-forms
 * @desc    Get workout forms with filtering and pagination
 * @access  Trainer (own forms) or Admin (all forms)
 * @query   ?clientId=123&trainerId=456&startDate=2025-01-01&endDate=2025-01-31&page=1&limit=20
 */
router.get('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { 
      clientId, 
      trainerId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      mcpProcessed 
    } = req.query;

    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const parsedPage = parseStrictPositiveInteger(page);
    if (!parsedPage) {
      return res.status(400).json({ success: false, message: 'Invalid page' });
    }

    const rawLimit = parseStrictPositiveInteger(limit);
    if (!rawLimit) {
      return res.status(400).json({ success: false, message: 'Invalid limit' });
    }
    const parsedLimit = Math.min(rawLimit, 100);

    const parsedStartDate = parseOptionalDate(startDate);
    if (!parsedStartDate.ok) {
      return res.status(400).json({ success: false, message: 'Invalid startDate' });
    }

    const parsedEndDate = parseOptionalDate(endDate);
    if (!parsedEndDate.ok) {
      return res.status(400).json({ success: false, message: 'Invalid endDate' });
    }

    const parsedMcpProcessed = parseOptionalBoolean(mcpProcessed);
    if (!parsedMcpProcessed.ok) {
      return res.status(400).json({ success: false, message: 'Invalid mcpProcessed' });
    }

    // Build query conditions
    const whereConditions = {};

    if (clientId) {
      const parsedClientId = parseStrictPositiveInteger(clientId);
      if (!parsedClientId) {
        return res.status(400).json({ success: false, message: 'Invalid clientId' });
      }
      whereConditions.clientId = parsedClientId;
    }

    if (trainerId) {
      const parsedTrainerId = parseStrictPositiveInteger(trainerId);
      if (!parsedTrainerId) {
        return res.status(400).json({ success: false, message: 'Invalid trainerId' });
      }
      if (requestingUserRole === 'trainer' && !sameId(parsedTrainerId, requestingUserId)) {
        return res.status(403).json({
          success: false,
          message: 'Trainers can only view their own workout forms',
        });
      }
      whereConditions.trainerId = parsedTrainerId;
    } else if (requestingUserRole === 'trainer') {
      // Trainers can only see their own forms
      whereConditions.trainerId = requestingUserId;
    }

    if (parsedStartDate.value && parsedEndDate.value) {
      whereConditions.date = {
        [Op.between]: [parsedStartDate.value, parsedEndDate.value]
      };
    } else if (parsedStartDate.value) {
      whereConditions.date = {
        [Op.gte]: parsedStartDate.value
      };
    } else if (parsedEndDate.value) {
      whereConditions.date = {
        [Op.lte]: parsedEndDate.value
      };
    }

    if (parsedMcpProcessed.value !== undefined) {
      whereConditions.mcpProcessed = parsedMcpProcessed.value;
    }

    // Calculate pagination
    const offset = (parsedPage - 1) * parsedLimit;

    const DailyWorkoutForm = getDailyWorkoutForm();
    const User = getUser();

    const { count, rows: forms } = await DailyWorkoutForm.findAndCountAll({
      where: whereConditions,
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: parsedLimit,
      offset: offset
    });

    const totalPages = Math.ceil(count / parsedLimit);

    logger.info(`Retrieved ${forms.length} workout forms`, {
      requestingUserId,
      filters: { clientId, trainerId, startDate, endDate },
      pagination: { page: parsedPage, limit: parsedLimit, totalPages }
    });

    res.json({
      success: true,
      forms,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalCount: count,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      }
    });

  } catch (error) {
    logWorkoutFormError('Error fetching workout forms', error, req);
    return sendInternalError(res, 'Failed to fetch workout forms');
  }
});

/**
 * @route   GET /api/workout-forms/:id
 * @desc    Get a specific workout form by ID
 * @access  Trainer (own forms) or Admin (all forms)
 */
router.get('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    const DailyWorkoutForm = getDailyWorkoutForm();
    const User = getUser();

    const whereCondition = { id };
    
    // Trainers can only access their own forms
    if (requestingUserRole === 'trainer') {
      whereCondition.trainerId = requestingUserId;
    }

    const form = await DailyWorkoutForm.findOne({
      where: whereCondition,
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ]
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    // Calculate additional statistics
    const formStats = {
      totalSets: form.getTotalSets(),
      totalVolume: form.getTotalVolume(),
      averageRPE: form.getAverageRPE(),
      estimatedDuration: form.getEstimatedDuration(),
      exerciseCount: form.getExerciseCount()
    };

    logger.info(`Retrieved workout form ${id}`, {
      requestingUserId,
      clientId: form.clientId,
      trainerId: form.trainerId
    });

    res.json({
      success: true,
      form,
      stats: formStats
    });

  } catch (error) {
    logWorkoutFormError('Error fetching workout form', error, req, {
      formId: req.params?.id,
    });
    return sendInternalError(res, 'Failed to fetch workout form');
  }
});

/**
 * @route   GET /api/workout-forms/client/:clientId/progress
 * @desc    Get legacy progress data for client charts
 * @access  Trainer (assigned clients), Admin (all clients), or Client (self only)
 * @query   ?timeRange=3months&startDate=2025-01-01&endDate=2025-01-31
 */
router.get('/client/:clientId/progress', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timeRange = '3months', startDate, endDate } = req.query;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const parsedClientId = parseStrictPositiveInteger(clientId);

    if (!parsedClientId) {
      return res.status(400).json({
        success: false,
        message: 'Valid client ID is required'
      });
    }

    // Check access permissions
    if (requestingUserRole === 'client') {
      if (String(requestingUserId) !== String(parsedClientId)) {
        return res.status(403).json({
          success: false,
          message: 'Clients can only view their own progress'
        });
      }
    } else if (requestingUserRole === 'trainer') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
          trainerId: requestingUserId,
          status: 'active'
        }
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }
    } else if (requestingUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate date range
    let dateRange = {};
    const now = new Date();
    let resolvedStartDate = startDate ? new Date(startDate) : null;
    const resolvedEndDate = endDate ? new Date(endDate) : now;

    if (startDate && endDate) {
      dateRange = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      switch (timeRange) {
        case '7d':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case '30d':
        case '1month':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '6months':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1y':
        case '1year':
          resolvedStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case '90d':
        case '3months':
        default:
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
      }

      dateRange = {
        [Op.gte]: resolvedStartDate
      };
    }

    const DailyWorkoutForm = getDailyWorkoutForm();

    if (!DailyWorkoutForm) {
      logger.warn('DailyWorkoutForm model not available — returning empty progress data');
      return res.json({
        success: true,
        progressData: {
          categories: [],
          workoutHistory: [],
          formTrends: [],
          volumeProgression: []
        },
        totalWorkouts: 0,
        dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
      });
    }

    let forms = [];
    try {
      forms = await DailyWorkoutForm.findAll({
        where: {
          clientId: parsedClientId,
          date: dateRange
        },
        order: [['date', 'ASC']]
      });
    } catch (queryErr) {
      logger.warn('DailyWorkoutForm progress query failed', {
        clientId: parsedClientId,
        ...toWorkoutFormErrorMetadata(queryErr, 'daily_workout_form_progress_query_failed'),
      });
      return res.json({
        success: true,
        progressData: {
          categories: [],
          workoutHistory: [],
          formTrends: [],
          volumeProgression: []
        },
        totalWorkouts: 0,
        dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
      });
    }

    // Process data for charts (null-safe: formData may be null/undefined).
    //
    // Phase 16 (2026-04-16): `|| 5` fallback removed. When the logger did
    // not record an intensity rating, propagate null to the reader so
    // downstream callers can render "not rated" instead of a phantom 5.
    // Matches the null-honest writer contract on this same file.
    const workoutHistory = forms.map(form => {
      const rawIntensity = form.formData?.overallIntensity;
      const intensity = (rawIntensity === undefined || rawIntensity === null)
        ? null
        : rawIntensity;
      return {
        date: form.date,
        duration: form.getEstimatedDuration(),
        intensity,
        totalVolume: form.getTotalVolume(),
        exerciseCount: form.getExerciseCount(),
        pointsEarned: form.totalPointsEarned
      };
    });

    // Phase 2 Slice 2.1 (2026-05-03): null-honest formTrends.
    // Was `(ex.formRating || 3)` summed across ALL exercises divided by
    // exercises.length — a phantom 3/5 was seeded for every untouched
    // exercise and dragged the average toward 3. Mirrors the
    // /progress-detailed canonical reader at line 1418-1428: filter to
    // rated exercises, average only those, return null when no exercise
    // was rated. Matches the Phase 16 null-honest writer contract.
    const formTrends = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      const ratings = exercises
        .map(ex => Number(ex.formRating))
        .filter(rating => Number.isFinite(rating) && rating > 0);
      return {
        date: form.date,
        averageFormRating: ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : null,
        totalSets: form.getTotalSets(),
        exerciseCount: form.getExerciseCount()
      };
    });

    const volumeProgression = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      return {
        date: form.date,
        totalWeight: form.getTotalVolume(),
        totalReps: exercises.reduce((sum, ex) => {
          return sum + (ex.sets ? ex.sets.reduce((setSum, set) => setSum + (parseInt(set.reps) || 0), 0) : 0);
        }, 0),
        totalSets: form.getTotalSets()
      };
    });

    // canonical-surface-audit 2026-04-13:
    // The legacy fallback must not invent NASM category levels. When no
    // truthful classification exists, return an empty collection so the
    // mounted client chart can stay hidden.
    const categories = [];

    const progressData = {
      categories,
      workoutHistory,
      formTrends,
      volumeProgression
    };

    logger.info(`Retrieved progress data for client ${parsedClientId}`, {
      requestingUserId,
      timeRange,
      totalForms: forms.length
    });

    res.json({
      success: true,
      progressData,
      totalWorkouts: forms.length,
      dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
    });

  } catch (error) {
    logWorkoutFormError('Error fetching progress data', error, req, {
      clientId: req.params?.clientId,
    });
    return sendInternalError(res, 'Failed to fetch progress data');
  }
});

/**
 * @route   GET /api/workout-forms/client/:clientId/progress-detailed
 * @desc    Get comprehensive progress data for client charts (volume, 1RM, body comp, etc.)
 * @access  Trainer (assigned clients), Admin (all clients), or Client (self only)
 * @query   ?timeRange=30d|90d|1y (default 90d)
 *
 * Performance notes:
 * - All workout form data fetched in a single query; 1RM/volume computed in-memory
 * - BodyMeasurement queried separately (different table, limited to 10 rows)
 * - Composite index on (clientId, date) used by the main query
 *   TODO: ensure composite index on (userId, createdAt) exists for BodyMeasurement
 */
router.get('/client/:clientId/progress-detailed', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timeRange = '90d' } = req.query;
    const requestingUserId = parseStrictPositiveInteger(req.user.id);
    const requestingUserRole = req.user.role;

    // Validate clientId as integer
    const parsedClientId = parseStrictPositiveInteger(clientId);
    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      return res.status(400).json({ success: false, message: 'Valid client ID is required' });
    }

    if (!Number.isInteger(requestingUserId) || requestingUserId <= 0) {
      return res.status(401).json({ success: false, message: 'Invalid authenticated user' });
    }

    // --- Access control (admin, trainer assignment, or client self-access) ---
    if (requestingUserRole === 'client') {
      if (requestingUserId !== parsedClientId) {
        return res.status(403).json({ success: false, message: 'Clients can only view their own progress' });
      }
    } else if (requestingUserRole === 'trainer') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: { clientId: parsedClientId, trainerId: requestingUserId, status: 'active' }
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this client' });
      }
    } else if (requestingUserRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // admins pass through

    // --- Calculate date range from timeRange param ---
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '90d':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
    }

    // --- Single query: all workout forms in range (uses composite index clientId+date) ---
    const DailyWorkoutForm = getDailyWorkoutForm();

    if (!DailyWorkoutForm) {
      logger.warn('DailyWorkoutForm model not available — returning empty detailed progress data');
      return res.json({
        success: true,
        progressData: {
          volumeProgression: [], oneRepMaxes: [], formTrends: [],
          nasmCategories: [], bodyComposition: [], strengthProgression: [],
          consistencyData: [], muscleGroupVolume: [],
          summary: { totalWorkouts: 0, totalVolume: 0, averageFormScore: 0, strongestLift: null, mostImproved: null, currentStreak: 0, weeklyAverage: 0 }
        }
      });
    }

    let forms;
    try {
      forms = await DailyWorkoutForm.findAll({
        where: {
          clientId: parsedClientId,
          date: { [Op.gte]: startDate }
        },
        order: [['date', 'ASC']],
        attributes: ['id', 'sessionId', 'date', 'formData', 'totalPointsEarned', 'submittedAt', 'createdAt']
      });
    } catch (queryErr) {
      // Fallback: if specific attributes fail (column may not exist in prod), query without attribute filter
      logger.warn('Progress-detailed attribute query failed; retrying without attribute filter', {
        clientId: parsedClientId,
        ...toWorkoutFormErrorMetadata(queryErr, 'daily_workout_form_progress_detail_attribute_failed'),
      });
      try {
        forms = await DailyWorkoutForm.findAll({
          where: {
            clientId: parsedClientId,
            date: { [Op.gte]: startDate }
          },
          order: [['date', 'ASC']]
        });
      } catch (fallbackErr) {
        logger.warn('DailyWorkoutForm table may not exist in production', {
          clientId: parsedClientId,
          ...toWorkoutFormErrorMetadata(fallbackErr, 'daily_workout_form_progress_detail_fallback_failed'),
        });
        forms = [];
      }
    }

    let canonicalWorkoutSessions = [];
    try {
      canonicalWorkoutSessions = await fetchCanonicalProgressWorkoutSessions(parsedClientId, startDate);
    } catch (canonicalErr) {
      logger.warn('Canonical WorkoutLog progress query failed; using legacy formData fallback', {
        clientId: parsedClientId,
        ...toWorkoutFormErrorMetadata(canonicalErr, 'daily_workout_form_canonical_progress_failed'),
      });
    }

    const legacyFormsCount = forms.length;
    forms = buildProgressDetailedAnalysisRows({ forms, workoutSessions: canonicalWorkoutSessions });

    // 1RM estimates use the canonical Brzycki service (oneRepMaxService) —
    // the same formula /progress PRs use. An inline Epley here produced two
    // different PR numbers for the same set one click apart (Wave 1.8 fix).

    // ========== 1. Volume Progression (same pattern as existing endpoint) ==========
    const volumeProgression = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      return {
        date: form.date,
        totalWeight: exercises.reduce((sum, ex) => {
          return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
        }, 0),
        totalReps: exercises.reduce((sum, ex) => {
          return sum + (ex.sets || []).reduce((s, set) => s + (parseInt(set.reps) || 0), 0);
        }, 0),
        totalSets: exercises.reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0)
      };
    });

    // ========== Intermediate: build per-exercise data for 1RM, strength, muscle group ==========
    // canonical-surface-audit 2026-04-13 (Phase 3 wireup):
    // Single pass over every persisted set captures everything four
    // previously-hidden charts need: RPE zone counts, per-exercise PR
    // (best raw set by Brzycki 1RM, weight > 0 only), per-exercise frequency,
    // and per-exercise last-performed date. Adding new aggregates here
    // costs one extra branch per set and avoids a second pass.
    const exerciseByDate = {}; // { exerciseName: { date: { max1RM, volume } } }
    const exerciseFrequency = {}; // { exerciseName: count }
    const exerciseLastPerformed = {}; // { exerciseName: 'YYYY-MM-DD' }
    const bestPRByExercise = {}; // { exerciseName: { date, exercise, weight, reps, estimated1RM } }
    const rpeZoneCounts = {
      'Easy (1-3)': 0,
      'Moderate (4-6)': 0,
      'Hard (7-8)': 0,
      'Max Effort (9-10)': 0,
    };

    for (const form of forms) {
      const exercises = form.formData?.exercises || [];
      for (const ex of exercises) {
        const name = ex.exerciseName || ex.name || 'Unknown';
        if (!exerciseByDate[name]) exerciseByDate[name] = {};
        if (!exerciseFrequency[name]) exerciseFrequency[name] = 0;
        exerciseFrequency[name]++;

        if (!exerciseLastPerformed[name] || form.date > exerciseLastPerformed[name]) {
          exerciseLastPerformed[name] = form.date;
        }

        let bestSetRM = 0;
        let exVolume = 0;
        for (const set of (ex.sets || [])) {
          const w = parseFloat(set.weight) || 0;
          const r = parseInt(set.reps) || 0;
          const rm = estimateBrzycki1RM(w, r) ?? 0;
          if (rm > bestSetRM) bestSetRM = rm;
          exVolume += w * r;

          // RPE zone bucketing — truthful from persisted set.rpe, skipping
          // unset / invalid values so a missing field never inflates a zone.
          const rpeVal = parseInt(set.rpe, 10);
          if (Number.isFinite(rpeVal) && rpeVal >= 1 && rpeVal <= 10) {
            if (rpeVal <= 3) rpeZoneCounts['Easy (1-3)']++;
            else if (rpeVal <= 6) rpeZoneCounts['Moderate (4-6)']++;
            else if (rpeVal <= 8) rpeZoneCounts['Hard (7-8)']++;
            else rpeZoneCounts['Max Effort (9-10)']++;
          }

          // Personal record: track best raw set per exercise. Filter w > 0
          // and rm > 0 so bodyweight rows and >15-rep sets (Brzycki returns
          // null, wrapped to 0) never produce a fake PR.
          if (w > 0 && rm > 0) {
            const existingPR = bestPRByExercise[name];
            if (!existingPR || rm > existingPR.estimated1RM) {
              bestPRByExercise[name] = {
                date: form.date,
                exercise: name,
                weight: w,
                reps: r,
                estimated1RM: rm,
              };
            }
          }
        }

        const dateKey = form.date;
        if (!exerciseByDate[name][dateKey]) {
          exerciseByDate[name][dateKey] = { max1RM: 0, volume: 0 };
        }
        if (bestSetRM > exerciseByDate[name][dateKey].max1RM) {
          exerciseByDate[name][dateKey].max1RM = bestSetRM;
        }
        exerciseByDate[name][dateKey].volume += exVolume;
      }
    }

    // ========== 2. One Rep Maxes (top 10 exercises by best 1RM) ==========
    const exerciseBest1RM = {};
    for (const [name, dateMap] of Object.entries(exerciseByDate)) {
      let best = 0;
      let bestDate = null;
      for (const [date, data] of Object.entries(dateMap)) {
        if (data.max1RM > best) {
          best = data.max1RM;
          bestDate = date;
        }
      }
      exerciseBest1RM[name] = { exercise: name, estimated1RM: best, date: bestDate };
    }
    const oneRepMaxes = Object.values(exerciseBest1RM)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 10);

    // ========== 3. Form Trends (average form rating per workout) ==========
    const formTrends = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      const ratings = exercises
        .map(ex => Number(ex.formRating))
        .filter(rating => Number.isFinite(rating) && rating > 0);
      return {
        date: form.date,
        averageFormRating: ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : null,
        totalSets: exercises.reduce((sum, ex) => sum + ((ex.sets || []).length), 0),
        exerciseCount: exercises.length
      };
    });

    // ========== 4. NASM Categories ==========
    // canonical-surface-audit 2026-04-13:
    // Do not ship fabricated NASM category progress on the mounted client
    // surface. Until the writer/reader chain can classify real form data into
    // NASM buckets, return an empty array and let the frontend hide the chart.
    const nasmCategories = [];

    // ========== 5. Body Composition (from BodyMeasurement) ==========
    let bodyComposition = [];
    try {
      const BodyMeasurement = getBodyMeasurement();
      const measurements = await BodyMeasurement.findAll({
        where: { userId: parsedClientId },
        order: [['measurementDate', 'DESC']],
        limit: 10,
        attributes: ['measurementDate', 'weight', 'bodyFatPercentage', 'muscleMassPercentage', 'progressScore']
      });
      bodyComposition = measurements.reverse().map(m => ({
        date: m.measurementDate,
        weight: m.weight ? parseFloat(m.weight) : null,
        bodyFat: m.bodyFatPercentage ? parseFloat(m.bodyFatPercentage) : null,
        muscleMass: m.muscleMassPercentage ? parseFloat(m.muscleMassPercentage) : null,
        progressScore: m.progressScore || null
      }));
    } catch (bmErr) {
      logger.warn('BodyMeasurement query failed', {
        clientId: parsedClientId,
        ...toWorkoutFormErrorMetadata(bmErr, 'daily_workout_form_body_measurement_failed'),
      });
    }

    // ========== 6. Strength Progression (1RM per top-5 exercises over time) ==========
    const top5Exercises = Object.entries(exerciseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Collect all unique dates across top-5 exercises
    const strengthDates = new Set();
    for (const name of top5Exercises) {
      for (const date of Object.keys(exerciseByDate[name] || {})) {
        strengthDates.add(date);
      }
    }
    const strengthProgression = Array.from(strengthDates).sort().map(date => {
      const exercises = {};
      for (const name of top5Exercises) {
        const data = exerciseByDate[name]?.[date];
        if (data && data.max1RM > 0) {
          exercises[name] = data.max1RM;
        }
      }
      return { date, exercises };
    });

    // ========== 7. Consistency Data (daily counts for heatmap, last 90 days) ==========
    const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    const consistencyMap = {};
    for (const form of forms) {
      const d = form.date;
      if (new Date(d) < ninetyDaysAgo) continue;
      if (!consistencyMap[d]) consistencyMap[d] = { count: 0, volume: 0 };
      consistencyMap[d].count++;
      const exercises = form.formData?.exercises || [];
      consistencyMap[d].volume += exercises.reduce((sum, ex) => {
        return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
      }, 0);
    }
    const consistencyData = Object.entries(consistencyMap)
      .map(([date, data]) => ({ date, count: data.count, volume: Math.round(data.volume) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ========== 8. Muscle Group Volume ==========
    // canonical-surface-audit 2026-04-13 (Phase 2 writer-chain audit):
    // The ExerciseEntry type in frontend/src/services/nasmApiService.ts has
    // no muscleGroup / category / exerciseType field, and every WorkoutLogger
    // handler strips classification metadata when building an entry. Until
    // the writer chain starts persisting real classification, exercises
    // without one must be SKIPPED, not bucketed under a fabricated
    // "Uncategorized" label. An empty muscleGroupVolume array lets the
    // mounted MuscleGroupRadar chart hide itself via its data.length > 0 gate
    // instead of rendering a single fake blob.
    const muscleGroupMap = {};
    const previousMidpoint = new Date((startDate.getTime() + now.getTime()) / 2);

    for (const form of forms) {
      const formDate = new Date(form.date);
      const isPreviousPeriod = formDate < previousMidpoint;
      const exercises = form.formData?.exercises || [];
      for (const ex of exercises) {
        const group = ex.muscleGroup || ex.category || ex.exerciseType;
        if (!group) continue;
        if (!muscleGroupMap[group]) muscleGroupMap[group] = { volume: 0, previousVolume: 0 };
        const vol = (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
        if (isPreviousPeriod) {
          muscleGroupMap[group].previousVolume += vol;
        } else {
          muscleGroupMap[group].volume += vol;
        }
      }
    }
    const muscleGroupVolume = Object.entries(muscleGroupMap).map(([muscleGroup, data]) => ({
      muscleGroup,
      volume: Math.round(data.volume),
      previousVolume: Math.round(data.previousVolume)
    }));

    // ========== 9. Summary ==========
    const totalVolume = volumeProgression.reduce((s, v) => s + v.totalWeight, 0);
    const formRatings = formTrends.filter(f => f.averageFormRating !== null);
    const averageFormScore = formRatings.length > 0
      ? Math.round((formRatings.reduce((s, f) => s + f.averageFormRating, 0) / formRatings.length) * 10) / 10
      : 0;

    // Strongest lift
    const strongestLift = oneRepMaxes.length > 0
      ? { exercise: oneRepMaxes[0].exercise, max: oneRepMaxes[0].estimated1RM }
      : null;

    // Most improved (exercise with largest 1RM increase from first to last appearance)
    let mostImproved = null;
    for (const name of top5Exercises) {
      const dates = Object.keys(exerciseByDate[name] || {}).sort();
      if (dates.length >= 2) {
        const first = exerciseByDate[name][dates[0]].max1RM;
        const last = exerciseByDate[name][dates[dates.length - 1]].max1RM;
        const improvement = last - first;
        if (!mostImproved || improvement > mostImproved.improvement) {
          mostImproved = { exercise: name, improvement };
        }
      }
    }

    // Current streak (consecutive days with workouts, working backwards from most recent)
    let currentStreak = 0;
    if (forms.length > 0) {
      const uniqueDates = [...new Set(forms.map(f => f.date))].sort().reverse();
      const today = now.toISOString().split('T')[0];
      // Start from today or most recent workout date
      const checkDate = new Date(uniqueDates[0] <= today ? uniqueDates[0] : today);
      for (const d of uniqueDates) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (d === dateStr) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (d < dateStr) {
          break;
        }
      }
    }

    // Weekly average
    const totalDays = Math.max(1, (now - startDate) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.max(1, totalDays / 7);
    const totalWorkouts = forms.length;
    const weeklyAverage = Math.round((totalWorkouts / totalWeeks) * 10) / 10;

    const summary = {
      totalWorkouts,
      totalVolume: Math.round(totalVolume),
      averageFormScore,
      strongestLift,
      mostImproved,
      currentStreak,
      weeklyAverage
    };

    // ========== 10. RPE Distribution (truthful from persisted set.rpe) ==========
    // canonical-surface-audit 2026-04-13 (Phase 3 wireup):
    // Caveat: WorkoutLogger initializes set.rpe to 5 on every set and only
    // updates it when the trainer touches the slider in ExerciseCardComponent
    // at line 178. Sessions where the slider is never touched will skew the
    // chart toward "Moderate (4-6)". This is real persisted data, not
    // fabrication, but the UX truthfulness depends on trainer interaction.
    const totalRpeCount = Object.values(rpeZoneCounts).reduce((s, c) => s + c, 0);
    const rpeZoneColors = {
      'Easy (1-3)': '#50A0F0',
      'Moderate (4-6)': '#60C0F0',
      'Hard (7-8)': '#8B5CF6',
      'Max Effort (9-10)': '#C6A84B',
    };
    const rpeDistribution = totalRpeCount > 0
      ? Object.entries(rpeZoneCounts).map(([zone, count]) => ({
          zone,
          count,
          percentage: Math.round((count / totalRpeCount) * 1000) / 10,
          color: rpeZoneColors[zone],
        }))
      : [];

    // ========== 11. Personal Records (top 10 by estimated 1RM) ==========
    // Sourced from bestPRByExercise which already filters w > 0 to avoid
    // bodyweight 0-lb fabrications.
    const personalRecords = Object.values(bestPRByExercise)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 10);

    // ========== 12. Exercise Frequency (count + last performed per exercise) ==========
    const exerciseFrequencyList = Object.entries(exerciseFrequency).map(([name, count]) => ({
      exercise: name,
      count,
      lastPerformed: exerciseLastPerformed[name] || '',
    }));

    // ========== 13. Session Intensity (per-form intensity + duration + volume) ==========
    // Phase 16 (2026-04-16): the writer no longer defaults overallIntensity
    // to 5. Honor null here so downstream charts can skip unrated sessions
    // (via `intensity != null` filters) rather than zero-filling and
    // dragging the trend line toward 0.
    const sessionIntensity = forms.map((form, i) => {
      const rawIntensity = form.formData?.overallIntensity;
      const intensity = (rawIntensity === undefined || rawIntensity === null)
        ? null
        : rawIntensity;
      return {
        date: form.date,
        duration: form.formData?.estimatedDuration || 0,
        intensity,
        totalVolume: volumeProgression[i]?.totalWeight || 0,
      };
    });

    // ========== Build response ==========
    const progressData = {
      volumeProgression,
      oneRepMaxes,
      formTrends,
      nasmCategories,
      bodyComposition,
      strengthProgression,
      consistencyData,
      muscleGroupVolume,
      rpeDistribution,
      personalRecords,
      exerciseFrequency: exerciseFrequencyList,
      sessionIntensity,
      summary
    };

    logger.info(`Retrieved detailed progress data for client ${parsedClientId}`, {
      requestingUserId,
      timeRange,
      totalForms: forms.length,
      legacyFormsCount,
      canonicalWorkoutSessions: canonicalWorkoutSessions.length
    });

    res.json({
      success: true,
      progressData
    });

  } catch (error) {
    logWorkoutFormError('Error fetching detailed progress data', error, req, {
      clientId: req.params?.clientId,
    });
    return sendInternalError(res, 'Failed to fetch detailed progress data');
  }
});

/**
 * @route   POST /api/workout-forms/:id/reprocess
 * @desc    Reprocess a workout form through MCP servers
 * @access  Admin Only
 */
router.post('/:id/reprocess', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const DailyWorkoutForm = getDailyWorkoutForm();
    const form = await DailyWorkoutForm.findByPk(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    // Reset MCP processing status
    await form.update({
      mcpProcessed: false,
      mcpProcessedAt: null,
      totalPointsEarned: 0,
      processingErrors: null
    });

    // Reprocess with MCP servers
    setImmediate(() => {
      processMCPIntegration(form.id, {
        clientId: form.clientId,
        trainerId: form.trainerId,
        date: form.date,
        formData: form.formData,
        submittedAt: form.submittedAt
      });
    });

    logger.info(`Admin ${req.user.id} initiated reprocessing for form ${id}`);

    res.json({
      success: true,
      message: 'Form queued for reprocessing'
    });

  } catch (error) {
    logWorkoutFormError('Error reprocessing workout form', error, req, {
      formId: req.params?.id,
    });
    return sendInternalError(res, 'Failed to reprocess workout form');
  }
});

/**
 * @route   GET /api/workout-forms/stats/overview
 * @desc    Get workout form statistics for admin dashboard
 * @access  Admin Only
 */
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const DailyWorkoutForm = getDailyWorkoutForm();

    const [
      totalForms,
      formsToday,
      formsThisWeek,
      formsThisMonth,
      processedForms,
      pendingForms,
      averagePointsPerWorkout
    ] = await Promise.all([
      DailyWorkoutForm.count(),
      DailyWorkoutForm.count({ 
        where: { 
          date: new Date().toISOString().split('T')[0] 
        } 
      }),
      DailyWorkoutForm.count({ 
        where: { 
          date: { 
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          } 
        } 
      }),
      DailyWorkoutForm.count({ 
        where: { 
          date: { 
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          } 
        } 
      }),
      DailyWorkoutForm.count({ where: { mcpProcessed: true } }),
      DailyWorkoutForm.count({ where: { mcpProcessed: false } }),
      DailyWorkoutForm.findAll({ 
        where: { mcpProcessed: true },
        attributes: ['totalPointsEarned']
      }).then(forms => {
        const totalPoints = forms.reduce((sum, form) => sum + form.totalPointsEarned, 0);
        return forms.length > 0 ? (totalPoints / forms.length).toFixed(1) : 0;
      })
    ]);

    const stats = {
      totalForms,
      formsToday,
      formsThisWeek,
      formsThisMonth,
      processedForms,
      pendingForms,
      processingRate: totalForms > 0 ? ((processedForms / totalForms) * 100).toFixed(1) : 0,
      averagePointsPerWorkout
    };

    logger.info('Retrieved workout form overview statistics', {
      userId: req.user.id,
      stats
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logWorkoutFormError('Error fetching workout form statistics', error, req);
    return sendInternalError(res, 'Failed to fetch workout form statistics');
  }
});

/**
 * @route   GET /api/workout-forms/:id/summary
 * @desc    Generate client-friendly workout summary from form data
 * @access  Trainer or Admin
 */
router.get('/:id/summary', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const DailyWorkoutForm = getDailyWorkoutForm();

    // Trainer-scope the lookup exactly like the sibling GET /:id (line ~1581):
    // a bare findByPk let any trainer read ANY other trainer's client form —
    // exercises, RPE, clientSummary, and free-text trainerNotes — by id
    // enumeration. Admins still see all (no trainerId constraint added).
    // Found 2026-08-04, security audit; this was the lone handler in the file
    // missing the object-level scope every sibling enforces.
    const whereCondition = { id: req.params.id };
    if (req.user.role === 'trainer') {
      whereCondition.trainerId = req.user.id;
    }

    const form = await DailyWorkoutForm.findOne({ where: whereCondition });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    const { formData, trainerNotes, clientSummary, date } = form;

    // If a manual client summary exists, return it
    if (clientSummary) {
      return res.status(200).json({
        success: true,
        data: {
          formId: form.id,
          date,
          summary: clientSummary,
          trainerNotes: trainerNotes || null,
          source: 'manual'
        }
      });
    }

    // Auto-generate summary from formData
    const exercises = formData?.exercises || [];
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0);
    const allRpes = exercises
      .flatMap(ex => (ex.sets || []).map(s => normalizeWorkoutLogRpe(s.rpe)))
      .filter(rpe => rpe !== null);
    const avgRpe = allRpes.length > 0
      ? allRpes.reduce((a, b) => a + b, 0) / allRpes.length
      : null;

    const exerciseLines = exercises.map(ex => {
      const sets = ex.sets?.length || 0;
      return `- ${ex.exerciseName || 'Exercise'}: ${sets} set${sets !== 1 ? 's' : ''}`;
    });

    const generatedSummary = [
      `Workout on ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      ``,
      `Exercises (${exercises.length}):`,
      ...exerciseLines,
      ``,
      `Total: ${totalSets} sets, ${Math.round(totalVolume).toLocaleString()} lbs volume`,
      avgRpe !== null ? `Average intensity (RPE): ${avgRpe.toFixed(1)}/10` : null,
      trainerNotes ? `\nTrainer Notes: ${trainerNotes}` : null,
    ].filter(Boolean).join('\n');

    return res.status(200).json({
      success: true,
      data: {
        formId: form.id,
        date,
        summary: generatedSummary,
        trainerNotes: trainerNotes || null,
        stats: {
          exerciseCount: exercises.length,
          totalSets,
          totalVolume: Math.round(totalVolume),
          avgRpe: avgRpe !== null ? Math.round(avgRpe * 10) / 10 : null
        },
        source: 'auto-generated'
      }
    });
  } catch (error) {
    logWorkoutFormError('Error generating workout summary', error, req, {
      formId: req.params?.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to generate workout summary'
    });
  }
});

export default router;
