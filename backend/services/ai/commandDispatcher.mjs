/**
 * ============================================================================
 * FILE: commandDispatcher.mjs
 * PURPOSE: Maps command types to service-function execution handlers
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the execution substrate for the command lane.
 * Called by stepExecute (Step 9) in commandExecutor.mjs.
 *
 * PATTERN:
 *   - Only commands with a registered handler in DISPATCHERS execute.
 *   - Commands with no handler return { type: 'not_wired' } via stepExecute (exec-substrate-v3).
 *     No command can produce a fake 'executed' response with null result.
 *   - FRONTEND_DISPATCH commands also return not_wired (handled client-side, not server).
 * REGISTERED COMMANDS:
 *   exec-substrate-v1:
 *   M01: create_hermes_task → hermesService.createTask
 *   M02: list_hermes_tasks  → hermesService.listTasks
 *   exec-substrate-v2 (first confirmed legacy slice):
 *   B03: log_workout        → workoutLogService.logWorkoutForClient
 *   exec-substrate-v3 (honesty fix + first read command):
 *   R01: view_workout_history → WorkoutSession.findAll (flat scalar summary)
 *   exec-substrate-v4 (nutrition read slice):
 *   E01: view_nutrition_log   → DailyMacroLog.findAll today → nutritionDispatchers
 *   E02: view_macro_trends    → DailyMacroLog.findAll 7-day → nutritionDispatchers
 *   exec-substrate-v5 (first confirmed nutrition write):
 *   E03: log_meals            → macroLogService.createMacroEntries → nutritionDispatchers
 *   exec-substrate-v6 (measurement reads + weigh-in write):
 *   D01: view_latest_measurements → BodyMeasurement.findOne | D02: log_weighin → measurementWriteService
 *   exec-substrate-v7 (pain vertical slice):
 *   H01: view_active_pain → ClientPainEntry.findAll isActive | H02: add_pain_entry → painWriteService
 *   exec-substrate-v8 (measurement read closure):
 *   D03: view_measurement_trends → BodyMeasurement 2x findOne + count (flat scalar delta)
 *   exec-substrate-v9 (destructive substrate fix + first destructive trainer slice):
 *   S01: cancel_session → sessionCancelService.cancelSessionForAI
 *   exec-substrate-v10 (schedule read slice):
 *   T01: view_today_schedule  → Session.findAll today (role-aware, status=['scheduled','confirmed','completed'])
 *   T02: view_week_schedule   → Session.findAll 7-day window (same filter, daysWithSessions + first slot)
 *   T01: view_today_sessions  → alias for view_today_schedule
 *   exec-substrate-v11 (pain follow-up slice):
 *   H03: resolve_pain_entry  → painFollowUpService.resolvePainEntry (exact-or-error bodyRegion resolution)
 *   H04: update_pain_entry   → painFollowUpService.updatePainEntryByRegion (same resolution)
 *   exec-substrate-v12 (full measurement write):
 *   D04: log_measurements    → measurementWriteService.logMeasurements (voice schema, shared enrichment)
 *   exec-substrate-v13 (availability read slice):
 *   A01: view_trainer_availability → availabilityService.getAvailabilityForTrainer (trainer self/admin explicit)
 *   exec-substrate-v14 (nutrition extraction + availability write):
 *   Extraction: log_meals / view_nutrition_log / view_macro_trends moved to nutritionDispatchers.mjs
 *   A02: create_availability_override → availabilityService.createOverride (single-row, no 'available' type)
 *   exec-substrate-v15 (availability slot read):
 *   A03: view_available_slots → availabilityService.getAvailableSlots (date-scoped open-slot summary)
 *   exec-substrate-v16 (PLAUD read commands):
 *   N01-N07: view/review/inspect/health intake commands → plaud + coach intake dispatchers
 *
 * ADD COMMANDS: Import service fn → add DISPATCHERS entry → stepExecute picks it up automatically.
 * ============================================================================
 */

import { Op } from 'sequelize';
import * as hermesService from '../hermes/hermesService.mjs';
import workoutService from '../workoutService.mjs';
import { logWorkoutForClient } from '../workout/workoutLogService.mjs';
import {
  CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES,
  NON_DEDUCTING_CLIENT_SOURCES,
  normalizePaidSessionCount,
} from '../sessionBillingPolicy.mjs';
import { createNotification } from '../../controllers/notificationController.mjs';
import defaultSequelize from '../../database.mjs';
import { getAllModels } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';
import {
  buildAtRiskComplianceClient,
  buildAtRiskComplianceQuery,
  sortAtRiskClients,
} from '../../utils/adminComplianceHelpers.mjs';
import {
  dispatchFlagSodiumIntake,
  dispatchScanFood,
  logMeals,
  viewNutritionLog,
  viewMacroTrends,
} from './dispatchers/nutritionDispatchers.mjs';
import { resolveCommandClientId } from './dispatchers/clientScope.mjs';
import { viewActivePain, addPainEntry, dispatchResolvePainEntry, dispatchUpdatePainEntry } from './dispatchers/painDispatchers.mjs';
import { viewLatestMeasurements, dispatchLogWeighIn, dispatchLogMeasurements, viewMeasurementTrends } from './dispatchers/measurementDispatchers.mjs';
import { dispatchCancelSession, dispatchViewTodaySchedule, dispatchViewWeekSchedule } from './dispatchers/sessionDispatchers.mjs';
import {
  dispatchRescheduleSession,
  dispatchScheduleSession,
} from './dispatchers/scheduleWriteDispatchers.mjs';
import {
  dispatchViewTrainerAvailability,
  dispatchCreateAvailabilityOverride,
  dispatchViewAvailableSlots,
} from './dispatchers/availabilityDispatchers.mjs';
import { dispatchSetAvailability } from './dispatchers/setAvailabilityDispatcher.mjs';
import {
  dispatchReviewNextPlaudIntake,
  dispatchViewPlaudIntakeQueue,
} from './dispatchers/plaudDispatchers.mjs';
import {
  dispatchPlaudAnalyzeClipSet,
  dispatchPlaudGroupSessionCandidates,
  dispatchPlaudListIntakeItems,
  dispatchPlaudMergeCandidateGroup,
  dispatchPlaudProposeClipOrder,
  dispatchPlaudRequestConfirmation,
} from './dispatchers/plaudStructuredActionDispatchers.mjs';
import {
  dispatchInspectCoachAudioPieces,
  dispatchInspectPlaudAudioPieces,
  dispatchReviewNextCoachIntake,
  dispatchViewCoachIntakeHealth,
  dispatchViewCoachIntakeQueue,
} from './dispatchers/coachIntakeDispatchers.mjs';
import {
  dispatchViewCoachIntakeRetention,
  dispatchViewCoachIntakeRetentionPurgePlan,
} from './dispatchers/coachIntakeRetentionDispatcher.mjs';
import { dispatchViewCoachIntakePreparedDraft } from './dispatchers/coachIntakeProposalDispatcher.mjs';
import { dispatchViewNasmPhase } from './dispatchers/nasmPhaseDispatcher.mjs';
import { dispatchDeleteWorkoutPlan } from './dispatchers/workoutPlanCommandDispatchers.mjs';
import { dispatchCreateWorkoutSession } from './dispatchers/workoutSessionCommandDispatchers.mjs';
import {
  dispatchPromoteToTrainer,
  dispatchRevokeTrainerPermission,
  dispatchListTrainers,
  dispatchSetTrainerPermissions,
  dispatchViewTrainerClients,
} from './dispatchers/trainerCommandDispatchers.mjs';
import { dispatchUpdateClient } from './dispatchers/clientProfileWriteDispatchers.mjs';
import {
  dispatchCreateGoal,
  dispatchUpdateGoalProgress,
  dispatchViewGoals,
} from './dispatchers/goalCommandDispatchers.mjs';
import {
  dispatchAwardBadge,
  dispatchViewLeaderboard,
  dispatchViewXpStreaks,
} from './dispatchers/gamificationCommandDispatchers.mjs';
import {
  dispatchScanCommandCenter,
  dispatchViewActiveUserCount,
  dispatchViewBusinessKpis,
  dispatchViewRecentSignups,
  dispatchViewRevenue,
  dispatchViewSystemHealth,
  dispatchViewUserEngagement,
  dispatchViewVisitorIntelligence,
} from './dispatchers/dashboardCommandDispatchers.mjs';
import {
  dispatchRunHealthCheck,
  dispatchViewAiSystemStatus,
  dispatchViewValidationResults,
} from './dispatchers/systemCommandDispatchers.mjs';
import {
  dispatchApprovePost,
  dispatchDeletePost,
  dispatchRejectPost,
  dispatchViewModerationQueue,
  dispatchViewModerationStats,
} from './dispatchers/socialModerationCommandDispatchers.mjs';
import {
  dispatchCreateClientProposal,
  dispatchCreateExternalClientProposal,
} from './dispatchers/clientOnboardingProposalDispatcher.mjs';
import { dispatchSendClientPasswordReset } from './dispatchers/clientCredentialCommandDispatchers.mjs';
import {
  dispatchMyProgress,
  dispatchScheduleMySession,
  dispatchMyStreaksBadges,
  dispatchMyWorkoutToday,
  dispatchMyXp,
} from './dispatchers/clientSelfServiceReadDispatchers.mjs';
import {
  dispatchExercisesToAvoid,
  dispatchTrackMyPain,
} from './dispatchers/clientSelfServicePainDispatchers.mjs';
import { dispatchLogMyNutrition } from './dispatchers/clientSelfServiceNutritionDispatchers.mjs';
import { dispatchRequestPlanAdjustment } from './dispatchers/clientPlanAdjustmentDispatcher.mjs';
import { dispatchOnboardingQuestions } from './dispatchers/onboardingQuestionsDispatcher.mjs';
import {
  calculateCompletionPercentage,
  computeDerivedFields,
  normalizeOnboardingQueueStatus,
} from '../../utils/onboardingHelpers.mjs';
import { transformQuestionnaireToMasterPrompt } from '../../controllers/onboardingController.mjs';

// ── Dispatcher Map ───────────────────────────────────────────────────────────

/**
 * Maps command type → async handler(params, ctx) → result object.
 * Every registered handler must return a flat result object (no nested arrays/objects)
 * so ExecutionResultCard can render each field as a DataRow.
 *
 * @type {Map<string, (params: Record<string, unknown>, ctx: import('./commandExecutor.mjs').CommandContext) => Promise<Record<string, unknown>>>}
 */
const dispatchViewWorkoutHistory = async (params, ctx, defaultLimit = 5) => {
  const { WorkoutSession, WorkoutLog } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const limit = Math.min(20, Math.max(1, Number(params.limit) || defaultLimit));
  const rows = await WorkoutSession.findAll({
    where: { userId: clientId },
    include: [{ model: WorkoutLog, as: 'logs' }],
    order: [['completedAt', 'DESC']],
    limit,
  });
  const last = rows[0];
  return {
    count: rows.length,
    lastSessionDate: last?.completedAt?.toISOString().slice(0, 10) ?? null,
    recentTitle: last?.title ?? null,
    totalSets: rows.reduce((s, r) => s + (r.totalSets || 0), 0),
    totalReps: rows.reduce((s, r) => s + (r.totalReps || 0), 0),
  };
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const toFiniteNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeSequelizeUpdateCount = (result) => {
  if (Array.isArray(result)) return Number(result[0] || 0);
  return Number(result || 0);
};

const parseBloodPressure = (value) => {
  const match = String(value || '').match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return { systolic: null, diastolic: null };
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const formatBloodPressure = (systolic, diastolic) => (
  systolic && diastolic ? `${systolic}/${diastolic}` : null
);

const dispatchFillBaselineMeasurements = async (params, ctx) => {
  const { ClientBaselineMeasurements } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const parsedBloodPressure = parseBloodPressure(params.bloodPressure);
  const bloodPressureSystolic = toFiniteNumberOrNull(
    params.bloodPressureSystolic ?? parsedBloodPressure.systolic
  );
  const bloodPressureDiastolic = toFiniteNumberOrNull(
    params.bloodPressureDiastolic ?? parsedBloodPressure.diastolic
  );
  const payload = {
    userId: clientId,
    recordedBy: ctx.user?.id,
    takenAt: params.takenAt ? new Date(params.takenAt) : new Date(),
    restingHeartRate: toFiniteNumberOrNull(params.restingHeartRate),
    bloodPressureSystolic,
    bloodPressureDiastolic,
    bodyWeight: toFiniteNumberOrNull(params.bodyWeight ?? params.weight),
    bodyFatPercentage: toFiniteNumberOrNull(params.bodyFatPercentage ?? params.bodyFat),
    injuryNotes: params.injuryNotes || null,
    painLevel: toFiniteNumberOrNull(params.painLevel) ?? 0,
    notes: params.notes || null,
  };
  const baseline = await ClientBaselineMeasurements.create(payload);

  return {
    baselineId: baseline?.id ?? null,
    clientId,
    bodyWeight: baseline?.bodyWeight ?? payload.bodyWeight,
    bodyFatPercentage: baseline?.bodyFatPercentage ?? payload.bodyFatPercentage,
    restingHeartRate: baseline?.restingHeartRate ?? payload.restingHeartRate,
    bloodPressure: formatBloodPressure(
      baseline?.bloodPressureSystolic ?? payload.bloodPressureSystolic,
      baseline?.bloodPressureDiastolic ?? payload.bloodPressureDiastolic
    ),
  };
};

const dispatchViewOnboardingStatus = async (params, ctx) => {
  const { ClientOnboardingQuestionnaire, ClientBaselineMeasurements } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const [questionnaire, baseline] = await Promise.all([
    ClientOnboardingQuestionnaire.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    }),
    ClientBaselineMeasurements.findOne({
      where: { userId: clientId },
      order: [['takenAt', 'DESC']],
    }),
  ]);

  if (!questionnaire) {
    return {
      clientId,
      questionnaireId: null,
      status: 'not_started',
      completionPercentage: 0,
      primaryGoal: null,
      trainingTier: null,
      healthRisk: null,
      movementScreenStatus: baseline ? 'recorded' : 'pending',
      baselineRecorded: Boolean(baseline),
      lastUpdatedAt: null,
    };
  }

  const movementScreenStatus = baseline
    ? baseline.nasmAssessmentScore !== null && baseline.nasmAssessmentScore !== undefined
      ? 'completed'
      : 'recorded'
    : 'pending';

  return {
    clientId,
    questionnaireId: questionnaire.id ?? null,
    status: questionnaire.status ?? null,
    completionPercentage: calculateCompletionPercentage(questionnaire.responsesJson),
    primaryGoal: questionnaire.primaryGoal ?? null,
    trainingTier: questionnaire.trainingTier ?? null,
    healthRisk: questionnaire.healthRisk ?? null,
    movementScreenStatus,
    baselineRecorded: Boolean(baseline),
    lastUpdatedAt: toDateOnly(questionnaire.updatedAt ?? questionnaire.createdAt),
  };
};

const dispatchViewOrientationQueue = async (params = {}) => {
  const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, Package } = getAllModels();
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, Number.parseInt(params.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const requestedStatus = params.status && params.status !== 'all' ? String(params.status) : null;
  const packageFilter = params.package && params.package !== 'all' ? String(params.package) : null;

  const { count, rows: users } = await User.findAndCountAll({
    where: {},
    include: [
      { model: Package, as: 'packages', required: false },
      {
        model: ClientOnboardingQuestionnaire,
        as: 'questionnaires',
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
      {
        model: ClientBaselineMeasurements,
        as: 'baselineMeasurements',
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
    ],
    limit,
    offset,
    distinct: true,
  });

  const entries = users
    .map((user) => {
      const latestQuestionnaire = user.questionnaires?.[0] || null;
      const latestBaseline = user.baselineMeasurements?.[0] || null;
      const activePackage = user.packages?.find((pkg) => pkg.status === 'active') || user.packages?.[0] || null;
      const queueStatus = normalizeOnboardingQueueStatus(latestQuestionnaire?.status);
      const movementStatus = latestBaseline?.nasmAssessmentScore !== null
        && latestBaseline?.nasmAssessmentScore !== undefined
        ? 'completed'
        : 'pending';

      return {
        userId: user.id,
        queueStatus,
        movementStatus,
        packageName: activePackage?.name ?? null,
      };
    })
    .filter((entry) => !requestedStatus || entry.queueStatus === requestedStatus)
    .filter((entry) => !packageFilter || entry.packageName === packageFilter);

  const countByStatus = (status) => entries.filter((entry) => entry.queueStatus === status).length;
  const firstAction = entries.find((entry) => (
    entry.queueStatus !== 'complete' || entry.movementStatus !== 'completed'
  ));

  return {
    totalCount: count,
    returnedCount: entries.length,
    completeCount: countByStatus('complete'),
    draftCount: countByStatus('draft'),
    notStartedCount: countByStatus('not_started'),
    archivedCount: countByStatus('archived'),
    movementPendingCount: entries.filter((entry) => entry.movementStatus !== 'completed').length,
    firstActionClientId: firstAction?.userId ?? null,
    page,
    limit,
  };
};

const dispatchStartOnboarding = async (params, ctx) => {
  const { ClientOnboardingQuestionnaire } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const existingQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
    where: { userId: clientId },
    order: [['createdAt', 'DESC']],
  });

  if (existingQuestionnaire) {
    return {
      clientId,
      questionnaireId: existingQuestionnaire.id ?? null,
      status: existingQuestionnaire.status ?? null,
      alreadyStarted: true,
      completionPercentage: calculateCompletionPercentage(existingQuestionnaire.responsesJson),
    };
  }

  const questionnaire = await ClientOnboardingQuestionnaire.create({
    userId: clientId,
    createdBy: ctx.user?.id ?? null,
    questionnaireVersion: '3.0',
    status: 'in_progress',
    responsesJson: {},
  });

  return {
    clientId,
    questionnaireId: questionnaire.id ?? null,
    status: questionnaire.status ?? 'in_progress',
    alreadyStarted: false,
    completionPercentage: 0,
  };
};

const dispatchSubmitOnboarding = async (params, ctx) => {
  const { ClientOnboardingQuestionnaire, User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const questionnaire = await ClientOnboardingQuestionnaire.findOne({
    where: { userId: clientId },
    order: [['createdAt', 'DESC']],
  });

  if (!questionnaire) {
    return {
      clientId,
      questionnaireId: null,
      status: 'not_started',
      submitted: false,
      reason: 'no_questionnaire',
      masterPromptCreated: false,
    };
  }

  const responsesJson = questionnaire.responsesJson || {};
  const derived = computeDerivedFields(responsesJson);
  const fullName = typeof responsesJson.fullName === 'string' ? responsesJson.fullName.trim() : '';
  const email = typeof responsesJson.email === 'string' ? responsesJson.email.trim() : '';
  const primaryGoal = typeof derived.primaryGoal === 'string' ? derived.primaryGoal.trim() : '';

  if (!fullName || !email || !primaryGoal) {
    return {
      clientId,
      questionnaireId: questionnaire.id ?? null,
      status: questionnaire.status ?? null,
      submitted: false,
      reason: 'missing_required_fields',
      completionPercentage: calculateCompletionPercentage(responsesJson),
      hasFullName: Boolean(fullName),
      hasEmail: Boolean(email),
      hasPrimaryGoal: Boolean(primaryGoal),
      masterPromptCreated: false,
    };
  }

  const completedAt = new Date();
  await questionnaire.update({
    ...derived,
    status: 'completed',
    completedAt,
  });

  const user = await User.findByPk(clientId);
  if (!user) {
    return {
      clientId,
      questionnaireId: questionnaire.id ?? null,
      status: 'completed',
      submitted: true,
      reason: 'client_user_not_found',
      completionPercentage: calculateCompletionPercentage(responsesJson),
      masterPromptCreated: false,
    };
  }

  const parsedWeight = Number.parseFloat(responsesJson.currentWeight);
  const weight = Number.isFinite(parsedWeight) ? parsedWeight : null;
  const heightFeet = Number.parseInt(responsesJson.heightFeet, 10);
  const heightInches = Number.parseInt(responsesJson.heightInches, 10);
  const height = Number.isFinite(heightFeet)
    ? (heightFeet * 12 + (Number.isFinite(heightInches) ? heightInches : 0))
    : null;
  const phone = typeof responsesJson.phone === 'string' ? responsesJson.phone : null;
  const gender = typeof responsesJson.gender === 'string' ? responsesJson.gender : null;

  await user.update({
    masterPromptJson: transformQuestionnaireToMasterPrompt(responsesJson, clientId),
    spiritName: `Client #${clientId}`,
    isOnboardingComplete: true,
    phone: phone !== null ? phone : user.phone,
    gender: gender !== null ? gender : user.gender,
    weight: weight !== null ? weight : user.weight,
    height: height !== null ? height : user.height,
    fitnessGoal: primaryGoal || user.fitnessGoal,
  });

  return {
    clientId,
    questionnaireId: questionnaire.id ?? null,
    status: 'completed',
    submitted: true,
    completionPercentage: calculateCompletionPercentage(responsesJson),
    masterPromptCreated: true,
  };
};

const dispatchViewClientProfile = async (params, ctx) => {
  const { User, ClientProgress, Session, WorkoutSession, Order } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const include = [
    { model: ClientProgress, as: 'clientProgress', required: false },
    { model: Session, as: 'clientSessions', required: false },
    { model: Order, as: 'orders', required: false, limit: 10, order: [['createdAt', 'DESC']] },
  ];

  if (User.associations?.workoutSessions) {
    include.push({
      model: WorkoutSession,
      as: 'workoutSessions',
      required: false,
      limit: 10,
      order: [['completedAt', 'DESC']],
    });
  }

  const client = await User.findOne({
    where: { id: clientId, role: 'client' },
    include,
    attributes: { exclude: ['password', 'refreshTokenHash'] },
  });

  if (!client) {
    return {
      clientId,
      found: false,
    };
  }

  const data = typeof client.toJSON === 'function' ? client.toJSON() : client;
  const workoutSessions = Array.isArray(data.workoutSessions) ? data.workoutSessions : [];
  const clientSessions = Array.isArray(data.clientSessions) ? data.clientSessions : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const lastWorkout = workoutSessions[0] || null;
  const nextSession = clientSessions[0] || null;

  return {
    clientId,
    found: true,
    isActive: data.isActive ?? null,
    clientSource: data.clientSource ?? null,
    availableSessions: data.availableSessions ?? null,
    fitnessGoal: data.fitnessGoal ?? null,
    onboardingComplete: Boolean(data.masterPromptJson),
    totalWorkouts: workoutSessions.length,
    totalOrders: orders.length,
    lastWorkoutDate: toDateOnly(lastWorkout?.completedAt ?? lastWorkout?.date),
    nextSessionDate: toDateOnly(nextSession?.sessionDate),
    latestWeight: data.clientProgress?.weight ?? data.weight ?? null,
  };
};

const dispatchListActiveClients = async (params, ctx) => {
  const { User, ClientTrainerAssignment } = getAllModels();
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.limit, 10) || 20));
  const status = params.status || 'active';
  const where = { role: 'client' };
  const include = [];

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  if (ctx.user?.role === 'trainer') {
    include.push({
      model: ClientTrainerAssignment,
      as: 'clientAssignments',
      required: true,
      where: { trainerId: ctx.user.id, status: 'active' },
      attributes: [],
    });
  }

  const result = await User.findAndCountAll({
    where,
    include,
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['password', 'refreshTokenHash', 'masterPromptJson'] },
  });

  const rows = Array.isArray(result.rows) ? result.rows : [];
  const clients = rows.map((row) => (typeof row.toJSON === 'function' ? row.toJSON() : row));
  const count = Array.isArray(result.count) ? result.count.length : Number(result.count) || 0;

  const activeCount = clients.filter((client) => client.isActive !== false).length;
  const inactiveCount = clients.filter((client) => client.isActive === false).length;
  const sourceFor = (client) => client.clientSource || 'swanstudios';
  const swanStudiosCount = clients.filter((client) => (
    !NON_DEDUCTING_CLIENT_SOURCES.has(sourceFor(client))
  )).length;
  const moveFitnessCount = clients.filter((client) => sourceFor(client) === 'move_fitness').length;
  const externalCount = clients.filter((client) => sourceFor(client) === 'external').length;
  const clientIds = clients
    .map((client) => client.id)
    .filter((id) => id !== undefined && id !== null);

  return {
    totalCount: count,
    returnedCount: clients.length,
    activeCount,
    inactiveCount,
    swanStudiosCount,
    moveFitnessCount,
    externalCount,
    firstClientId: clientIds[0] ?? null,
    clientIds: clientIds.length ? clientIds.join(', ') : null,
    page,
    limit,
  };
};

const dispatchExportClientList = async (params) => {
  const { User } = getAllModels();
  const format = params.format === 'json' ? 'json' : 'csv';
  const where = { role: 'client' };

  if (params.status === 'active') {
    where.isActive = true;
  } else if (params.status === 'inactive') {
    where.isActive = false;
  }

  if (['swanstudios', 'move_fitness', 'external'].includes(params.clientSource)) {
    where.clientSource = params.clientSource;
  }

  const searchParams = new URLSearchParams({ format });
  if (params.status === 'active' || params.status === 'inactive') {
    searchParams.set('status', params.status);
  }
  if (where.clientSource) {
    searchParams.set('clientSource', where.clientSource);
  }

  const matchingClients = await User.count({ where });

  return {
    exportReady: true,
    format,
    matchingClients: Number(matchingClients) || 0,
    downloadPath: `/api/admin/clients/export?${searchParams.toString()}`,
    includesPIIInCommandResult: false,
  };
};

const dispatchAtRiskClients = async (params, ctx) => {
  const sequelize = ctx.options?.sequelize || ctx.sequelize || defaultSequelize;
  const { sql, replacements } = buildAtRiskComplianceQuery({
    user: ctx.user,
    limit: params.limit || 20,
  });

  let rows = [];
  try {
    const [queryRows] = await sequelize.query(sql, { replacements });
    rows = Array.isArray(queryRows) ? queryRows : [];
  } catch (error) {
    logger.warn('[CommandDispatcher] at_risk_clients query failed: %s', error.message);
  }

  const atRisk = sortAtRiskClients(rows.map(buildAtRiskComplianceClient).filter(Boolean));
  const criticalCount = atRisk.filter((client) => client.riskLevel === 'critical').length;
  const warningCount = atRisk.filter((client) => client.riskLevel === 'warning').length;
  const watchCount = atRisk.filter((client) => client.riskLevel === 'watch').length;
  const freeTrackingCount = atRisk.filter((client) => client.isFreeTracking).length;
  const lowSessionPaidCount = atRisk.filter((client) => (
    !client.isFreeTracking
    && client.sessionsRemaining !== null
    && client.sessionsRemaining <= 2
  )).length;

  return {
    atRiskCount: atRisk.length,
    criticalCount,
    warningCount,
    watchCount,
    freeTrackingCount,
    lowSessionPaidCount,
    firstClientId: atRisk[0]?.id ?? null,
    highestRiskLevel: atRisk[0]?.riskLevel ?? null,
  };
};

const dispatchClientBillingOverview = async (params, ctx) => {
  const { User, Order, Session } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const client = await User.findOne({
    where: { id: clientId, role: 'client' },
    attributes: ['id', 'availableSessions', 'clientSource'],
  });

  if (!client) {
    return {
      clientId,
      found: false,
    };
  }

  const data = typeof client.toJSON === 'function' ? client.toJSON() : client;
  const clientSource = data.clientSource || 'swanstudios';
  const deductsSessions = !NON_DEDUCTING_CLIENT_SOURCES.has(clientSource);
  const [lastPurchase, pendingOrders, nextSession, recentSessions] = await Promise.all([
    Order.findOne({
      where: { userId: clientId, status: 'completed' },
      order: [['completedAt', 'DESC']],
      attributes: ['id', 'totalAmount', 'completedAt', 'paymentAppliedAt'],
    }),
    Order.findAll({
      where: { userId: clientId, status: { [Op.in]: ['pending_payment', 'pending'] } },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'totalAmount', 'status', 'createdAt'],
    }),
    Session.findOne({
      where: {
        userId: clientId,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        sessionDate: { [Op.gte]: new Date() },
      },
      order: [['sessionDate', 'ASC']],
      attributes: ['id', 'sessionDate', 'duration', 'status'],
    }),
    Session.findAll({
      where: { userId: clientId, status: 'completed' },
      order: [['sessionDate', 'DESC']],
      limit: 5,
      attributes: ['id', 'sessionDate', 'duration', 'status'],
    }),
  ]);

  const pendingTotal = pendingOrders.reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0
  );

  return {
    clientId,
    found: true,
    clientSource,
    deductsSessions,
    sessionsRemaining: deductsSessions ? normalizePaidSessionCount(data.availableSessions) : 0,
    hasLastPurchase: Boolean(lastPurchase),
    lastPurchaseAmount: lastPurchase ? Number(lastPurchase.totalAmount || 0) : null,
    lastPurchaseDate: toDateOnly(lastPurchase?.completedAt),
    paymentApplied: Boolean(lastPurchase?.paymentAppliedAt),
    pendingOrderCount: pendingOrders.length,
    pendingOrderTotal: pendingTotal,
    hasNextSession: Boolean(nextSession),
    nextSessionDate: toDateOnly(nextSession?.sessionDate),
    recentCompletedSessions: recentSessions.length,
    lastCompletedSessionDate: toDateOnly(recentSessions[0]?.sessionDate),
  };
};

const dispatchNotifyClient = async (params, ctx) => {
  const { User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const client = await User.findOne({
    where: { id: clientId, role: 'client' },
    attributes: ['id'],
  });

  if (!client) {
    return {
      clientId,
      found: false,
      notificationSent: false,
    };
  }

  const title = String(params.title || 'Coach update').trim();
  const message = String(params.message || '').trim();
  const type = String(params.type || 'admin').trim() || 'admin';

  const result = await createNotification({
    userId: Number(clientId),
    title,
    message,
    type,
    senderId: ctx.user?.id,
  });

  return {
    clientId,
    found: true,
    notificationSent: Boolean(result?.success),
    notificationId: result?.notification?.id ?? null,
    type,
  };
};

const dispatchLockClient = async (params, ctx) => {
  const { User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const sequelize = ctx.options?.sequelize || ctx.sequelize || defaultSequelize;
  const transaction = await sequelize.transaction();

  try {
    const client = await User.findOne({
      where: { id: clientId, role: 'client' },
      transaction,
    });

    if (!client) {
      await transaction.rollback();
      return {
        clientId,
        found: false,
        locked: false,
      };
    }

    await client.update({ isLocked: true }, { transaction });
    await transaction.commit();

    return {
      clientId,
      found: true,
      locked: true,
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('[CommandDispatcher] lock_client failed', {
      clientId,
      error: error.message,
    });
    throw error;
  }
};

const dispatchAssignTrainer = async (params, ctx) => {
  const { User, ClientTrainerAssignment } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const trainerId = Number(params.trainerId);
  const assignedBy = Number(ctx.user?.id);
  const notes = String(params.notes || 'Assigned via Swan Coach command center').trim()
    || 'Assigned via Swan Coach command center';
  const sequelize = ctx.options?.sequelize || ctx.sequelize || defaultSequelize;
  const transaction = await sequelize.transaction();

  try {
    const [client, trainer] = await Promise.all([
      User.findOne({
        where: {
          id: clientId,
          role: { [Op.in]: ['client', 'user'] },
        },
        transaction,
      }),
      User.findOne({
        where: {
          id: trainerId,
          role: { [Op.in]: ['trainer', 'admin'] },
        },
        transaction,
      }),
    ]);

    if (!client || !trainer || !Number.isSafeInteger(assignedBy)) {
      await transaction.rollback();
      return {
        clientId,
        trainerId,
        assigned: false,
        alreadyAssigned: false,
        assignmentId: null,
        priorAssignmentsDeactivated: 0,
      };
    }

    const existingAssignment = await ClientTrainerAssignment.findOne({
      where: { clientId, trainerId, status: 'active' },
      transaction,
    });

    if (existingAssignment) {
      await transaction.rollback();
      return {
        clientId,
        trainerId,
        assigned: false,
        alreadyAssigned: true,
        assignmentId: existingAssignment.id ?? null,
        priorAssignmentsDeactivated: 0,
      };
    }

    const deactivatedResult = await ClientTrainerAssignment.update(
      {
        status: 'inactive',
        deactivatedAt: new Date(),
        lastModifiedBy: assignedBy,
      },
      {
        where: { clientId, status: 'active' },
        transaction,
      }
    );

    const [rows] = await sequelize.query(
      `INSERT INTO client_trainer_assignments ("clientId", "trainerId", "assignedBy", notes, status, "createdAt", "updatedAt")
       VALUES (:clientId, :trainerId, :assignedBy, :notes, 'active', NOW(), NOW())
       RETURNING *`,
      {
        replacements: {
          clientId,
          trainerId,
          assignedBy,
          notes,
        },
        transaction,
      }
    );

    const assignmentId = rows?.[0]?.id ?? null;
    const assignment = assignmentId
      ? await ClientTrainerAssignment.findByPk(assignmentId, { transaction })
      : null;

    await transaction.commit();

    return {
      clientId,
      trainerId,
      assigned: true,
      alreadyAssigned: false,
      assignmentId: assignment?.id ?? assignmentId,
      priorAssignmentsDeactivated: normalizeSequelizeUpdateCount(deactivatedResult),
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('[CommandDispatcher] assign_trainer failed', {
      clientId,
      trainerId,
      error: error.message,
    });
    throw error;
  }
};

const dispatchDeactivateClient = async (params, ctx) => {
  const { User, Session } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const sequelize = ctx.options?.sequelize || ctx.sequelize || defaultSequelize;
  const transaction = await sequelize.transaction();

  try {
    const client = await User.findOne({
      where: { id: clientId, role: 'client' },
      transaction,
    });

    if (!client) {
      await transaction.rollback();
      return {
        clientId,
        found: false,
        deactivated: false,
      };
    }

    const accountDeactivatedAt = new Date();
    const accountRetentionUntil = new Date(accountDeactivatedAt);
    accountRetentionUntil.setMonth(accountRetentionUntil.getMonth() + 6);
    const preservedAvailableSessions = normalizePaidSessionCount(client.availableSessions);

    const cancelledCount = await Session.update(
      {
        status: 'cancelled',
        notes: 'Auto-cancelled: client account deactivated; retained for 6 months',
      },
      {
        where: {
          userId: clientId,
          status: { [Op.in]: CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES },
          sessionDate: { [Op.gt]: new Date() },
        },
        transaction,
      },
    );

    await client.update({
      isActive: false,
      accountDeactivatedAt,
      accountRetentionUntil,
    }, { transaction });

    await transaction.commit();

    return {
      clientId,
      found: true,
      deactivated: true,
      accountDeactivatedAt: accountDeactivatedAt.toISOString(),
      accountRetentionUntil: accountRetentionUntil.toISOString(),
      cancelledFutureSessions: cancelledCount?.[0] || 0,
      preservedAvailableSessions,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const dispatchViewWorkoutStatistics = async (params, ctx) => {
  const { WorkoutSession, WorkoutLog } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const rows = await WorkoutSession.findAll({
    where: { userId: clientId, status: 'completed' },
    include: [{ model: WorkoutLog, as: 'logs' }],
    order: [['completedAt', 'DESC']],
    limit: 100,
  });

  const exerciseCounts = new Map();
  let totalDuration = 0;
  let totalSets = 0;
  let totalReps = 0;
  let intensityTotal = 0;
  let intensityCount = 0;

  for (const row of rows) {
    totalDuration += Number(row.duration || 0);
    const logs = Array.isArray(row.logs) ? row.logs : [];
    totalSets += logs.length || Number(row.totalSets || 0);
    const logReps = logs.reduce((sum, log) => sum + Number(log.reps || 0), 0);
    totalReps += logReps || Number(row.totalReps || 0);

    const intensity = Number(row.intensity ?? row.intensityRating);
    if (Number.isFinite(intensity) && intensity > 0) {
      intensityTotal += intensity;
      intensityCount += 1;
    }

    for (const log of logs) {
      const exerciseName = String(log.exerciseName || '').trim();
      if (exerciseName) {
        exerciseCounts.set(exerciseName, (exerciseCounts.get(exerciseName) || 0) + 1);
      }
    }
  }

  const [topExercise = null, topExerciseSets = 0] =
    [...exerciseCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];

  return {
    totalWorkouts: rows.length,
    totalDuration,
    totalSets,
    totalReps,
    averageIntensity: intensityCount ? Number((intensityTotal / intensityCount).toFixed(1)) : null,
    lastWorkoutDate: toDateOnly(rows[0]?.completedAt || rows[0]?.date),
    topExercise,
    topExerciseSets,
  };
};

const dispatchViewExerciseRecommendations = async (params, ctx) => {
  const clientId = resolveCommandClientId(params, ctx);
  const limit = Math.min(10, Math.max(1, Number(params.limit) || 5));
  const exercises = await workoutService.getExerciseRecommendations(clientId, {
    goal: params.goal || 'general',
    difficulty: params.difficulty,
    equipment: Array.isArray(params.equipment) ? params.equipment : [],
    muscleGroups: Array.isArray(params.muscleGroups) ? params.muscleGroups : [],
    muscleGroupNames: Array.isArray(params.muscleGroupNames) ? params.muscleGroupNames : [],
    bodyRegions: Array.isArray(params.bodyRegions) ? params.bodyRegions : [],
    excludeExercises: Array.isArray(params.excludeExercises) ? params.excludeExercises : [],
    limit,
    rehabFocus: Boolean(params.rehabFocus),
    optPhase: params.optPhase,
  });
  const names = exercises
    .map((exercise) => String(exercise?.name || '').trim())
    .filter(Boolean)
    .slice(0, limit);

  return {
    recommendationCount: exercises.length,
    firstRecommendation: names[0] || null,
    topRecommendations: names.length ? names.join(', ') : null,
  };
};

const DISPATCHERS = new Map([
  [
    'log_workout',
    async (params, ctx) => {
      const sequelize = ctx.options?.sequelize || ctx.sequelize;
      // Service returns flat result; AI card uses exerciseCount/totalSets/xpAwarded
      return logWorkoutForClient({
        clientId: params.clientId,
        exercises: params.exercises || [],
        date: params.date,
        notes: params.notes,
        title: params.title,
        duration: params.duration,
        intensity: params.intensity,
        trainerId: ctx.user.id,
        sequelize,
      });
    },
  ],
  ['create_workout_session', dispatchCreateWorkoutSession],
  [
    'create_hermes_task',
    async (params, ctx) => {
      const task = hermesService.createTask({
        agentType: params.agentType,
        taskTitle: params.taskTitle,
        taskDescription: params.taskDescription,
        priority: params.priority || 'normal',
        requestedBy: ctx.user.id,
      });
      // Return card-friendly result — no nested arrays, no raw objects
      return {
        taskId: task.id,
        agentType: task.agentType,
        taskTitle: task.taskTitle,
        priority: task.priority,
        status: task.status,
        createdAt: task.createdAt,
      };
    },
  ],
  [
    'list_hermes_tasks',
    async (params, _ctx) => {
      const result = hermesService.listTasks({
        agentType: params.agentType || undefined,
        status: params.status || undefined,
      });
      // Flatten to card-friendly scalar fields — no array dump into DataRow
      return {
        count: result.count,
        pending: result.pending,
        completed: result.completed,
        failed: result.failed,
      };
    },
  ],
  ['log_meals',          logMeals],
  ['create_client', dispatchCreateClientProposal],
  ['create_external_client', dispatchCreateExternalClientProposal],
  ['view_client_profile', dispatchViewClientProfile],
  ['update_client', dispatchUpdateClient],
  ['list_active_clients', dispatchListActiveClients],
  ['export_client_list', dispatchExportClientList],
  ['at_risk_clients', dispatchAtRiskClients],
  ['client_billing_overview', dispatchClientBillingOverview],
  ['notify_client', dispatchNotifyClient],
  ['lock_client', dispatchLockClient],
  ['assign_trainer', dispatchAssignTrainer],
  ['assign_client_to_trainer', dispatchAssignTrainer],
  ['deactivate_client', dispatchDeactivateClient],
  ['reset_client_password', dispatchSendClientPasswordReset],
  ['view_goals', dispatchViewGoals],
  ['create_goal', dispatchCreateGoal],
  ['update_goal_progress', dispatchUpdateGoalProgress],
  ['view_leaderboard', dispatchViewLeaderboard],
  ['view_xp_streaks', dispatchViewXpStreaks],
  ['award_badge', dispatchAwardBadge],
  ['scan_command_center', dispatchScanCommandCenter],
  ['view_revenue', dispatchViewRevenue],
  ['view_business_kpis', dispatchViewBusinessKpis],
  ['view_recent_signups', dispatchViewRecentSignups],
  ['view_system_health', dispatchViewSystemHealth],
  ['view_user_engagement', dispatchViewUserEngagement],
  ['view_active_user_count', dispatchViewActiveUserCount],
  ['view_visitor_intelligence', dispatchViewVisitorIntelligence],
  ['view_validation_results', dispatchViewValidationResults],
  ['view_ai_system_status', dispatchViewAiSystemStatus],
  ['run_health_check', dispatchRunHealthCheck],
  ['view_moderation_queue', dispatchViewModerationQueue],
  ['view_moderation_stats', dispatchViewModerationStats],
  ['approve_post', dispatchApprovePost],
  ['reject_post', dispatchRejectPost],
  ['delete_post', dispatchDeletePost],
  ['my_workout_today', dispatchMyWorkoutToday],
  ['log_my_nutrition', dispatchLogMyNutrition],
  ['my_progress', dispatchMyProgress],
  ['my_xp', dispatchMyXp],
  ['my_streaks_badges', dispatchMyStreaksBadges],
  ['schedule_my_session', dispatchScheduleMySession],
  ['track_my_pain', dispatchTrackMyPain],
  ['exercises_to_avoid', dispatchExercisesToAvoid],
  ['request_plan_adjustment', dispatchRequestPlanAdjustment],
  [
    'view_workout_history',
    (params, ctx) => dispatchViewWorkoutHistory(params, ctx),
  ],
  [
    'view_last_workout',
    (params, ctx) => dispatchViewWorkoutHistory({ ...params, limit: 1 }, ctx, 1),
  ],
  ['view_workout_statistics', dispatchViewWorkoutStatistics],
  ['view_exercise_recommendations', dispatchViewExerciseRecommendations],
  ['delete_workout_plan', dispatchDeleteWorkoutPlan],
  ['view_nasm_phase', dispatchViewNasmPhase],
  ['list_trainers', dispatchListTrainers],
  ['promote_to_trainer', dispatchPromoteToTrainer],
  ['set_trainer_permissions', dispatchSetTrainerPermissions],
  ['revoke_trainer_permission', dispatchRevokeTrainerPermission],
  ['view_trainer_clients', dispatchViewTrainerClients],
  ['start_onboarding', dispatchStartOnboarding],
  ['submit_onboarding', dispatchSubmitOnboarding],
  ['onboarding_questions', dispatchOnboardingQuestions],
  ['view_onboarding_status', dispatchViewOnboardingStatus],
  ['view_orientation_queue', dispatchViewOrientationQueue],
  ['view_nutrition_log',      viewNutritionLog],
  ['scan_food',               dispatchScanFood],
  ['view_macro_trends',       viewMacroTrends],
  ['flag_sodium_intake',      dispatchFlagSodiumIntake],
  ['view_latest_measurements', viewLatestMeasurements],
  ['log_weighin',              dispatchLogWeighIn],
  ['log_measurements',         dispatchLogMeasurements],
  ['view_measurement_trends',  viewMeasurementTrends],
  ['view_active_pain',         viewActivePain],
  ['add_pain_entry',           addPainEntry],
  ['resolve_pain_entry',       dispatchResolvePainEntry],
  ['update_pain_entry',        dispatchUpdatePainEntry],
  ['cancel_session',           dispatchCancelSession],
  ['schedule_session',         dispatchScheduleSession],
  ['reschedule_session',       dispatchRescheduleSession],
  ['fill_baseline_measurements', dispatchFillBaselineMeasurements],
  ['view_today_schedule',         dispatchViewTodaySchedule],
  ['view_today_sessions',         dispatchViewTodaySchedule],    // alias — same handler
  ['view_week_schedule',          dispatchViewWeekSchedule],
  ['view_trainer_availability',    dispatchViewTrainerAvailability],
  ['view_available_slots',         dispatchViewAvailableSlots],
  ['create_availability_override', dispatchCreateAvailabilityOverride],
  ['set_availability',             dispatchSetAvailability],
  ['view_coach_intake_health',      dispatchViewCoachIntakeHealth],
  ['view_coach_intake_retention',   dispatchViewCoachIntakeRetention],
  ['view_coach_intake_retention_purge_plan', dispatchViewCoachIntakeRetentionPurgePlan],
  ['view_coach_intake_prepared_draft', dispatchViewCoachIntakePreparedDraft],
  ['view_coach_intake_queue',       dispatchViewCoachIntakeQueue],
  ['review_next_coach_intake',      dispatchReviewNextCoachIntake],
  ['inspect_coach_audio_pieces',    dispatchInspectCoachAudioPieces],
  ['view_plaud_intake_queue',      dispatchViewPlaudIntakeQueue],
  ['review_next_plaud_intake',     dispatchReviewNextPlaudIntake],
  ['inspect_plaud_audio_pieces',   dispatchInspectPlaudAudioPieces],
  ['plaud_list_intake_items',       dispatchPlaudListIntakeItems],
  ['plaud_analyze_clip_set',        dispatchPlaudAnalyzeClipSet],
  ['plaud_propose_clip_order',      dispatchPlaudProposeClipOrder],
  ['plaud_group_session_candidates', dispatchPlaudGroupSessionCandidates],
  ['plaud_merge_candidate_group',   dispatchPlaudMergeCandidateGroup],
  ['plaud_request_confirmation',    dispatchPlaudRequestConfirmation],
]);

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Check whether a command type has a registered dispatcher handler.
 * Used by stepConfirmation to decide whether to mint a real operationId
 * or return an honest 'not_wired' response.
 *
 * @param {string} commandType
 * @returns {boolean}
 */
export function hasDispatcher(commandType) {
  return DISPATCHERS.has(commandType);
}

/**
 * Dispatch a command to its registered handler.
 * Returns the handler's result, or null if no handler is registered.
 *
 * @param {string} commandType
 * @param {Record<string, unknown>} params - Validated params from ctx.intent.params
 * @param {Object} ctx - CommandContext (user, resolvedClient, etc.)
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function dispatch(commandType, params, ctx) {
  const handler = DISPATCHERS.get(commandType);
  if (!handler) return null;

  try {
    const result = await handler(params, ctx);
    logger.info('[CommandDispatcher] Command executed', {
      command: commandType,
      userId: ctx.user?.id,
      clientId: ctx.resolvedClient?.id || null,
    });
    return result;
  } catch (err) {
    logger.error('[CommandDispatcher] Handler threw', {
      command: commandType,
      error: err.message,
    });
    throw err; // Re-thrown — caught by the pipeline loop in executeCommandPipeline, which sets ctx.error
  }
}
