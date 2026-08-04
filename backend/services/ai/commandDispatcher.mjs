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
 *   M01: create_hermes_task → hermesCommandDispatchers.dispatchCreateHermesTask
 *   M02: list_hermes_tasks  → hermesCommandDispatchers.dispatchListHermesTasks
 *   exec-substrate-v2 (canonical workout diary slice):
 *   B03: log_workout        → workoutLogWriteDispatcher.dispatchLogWorkout
 *   exec-substrate-v3 (honesty fix + first read command):
 *   R01: view_workout_history/view_last_workout → workoutReadDispatchers
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
 *   exec-substrate-v17 (Coach Context Engine, Slice A1):
 *   G09: brief_client → briefClientDispatcher (cross-domain de-identified brief; fail-closed clientAccess gate)
 *   exec-substrate-v18 (Day Sheet, Slice A2):
 *   G10: brief_my_day → dayBriefDispatcher (trainer own-day / admin all-day; de-identified per-client flags; gamification joins engine profile domain)
 *   exec-substrate-v19 (Equipment Intelligence, Slice S6):
 *   O01-O04: equipment_list_profiles / equipment_list_items / equipment_gap_report (T0 reads)
 *            + equipment_add_item (confirmed manual-status write) → equipmentDispatchers
 *
 * ADD COMMANDS: Import service fn → add DISPATCHERS entry → stepExecute picks it up automatically.
 * ============================================================================
 */

import logger from '../../utils/logger.mjs';
import {
  dispatchFlagSodiumIntake,
  dispatchScanFood,
  logMeals,
  viewNutritionLog,
  viewMacroTrends,
} from './dispatchers/nutritionDispatchers.mjs';
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
import { dispatchBriefClient } from './dispatchers/briefClientDispatcher.mjs';
import { dispatchBriefMyDay } from './dispatchers/dayBriefDispatcher.mjs';
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
import { dispatchAssignTrainer } from './dispatchers/trainerAssignmentWriteDispatcher.mjs';
import {
  dispatchDeactivateClient,
  dispatchLockClient,
} from './dispatchers/clientAccountWriteDispatchers.mjs';
import {
  dispatchAtRiskClients,
  dispatchClientBillingOverview,
  dispatchExportClientList,
  dispatchListActiveClients,
} from './dispatchers/clientAdminReadDispatchers.mjs';
import { dispatchNotifyClient } from './dispatchers/clientNotificationWriteDispatcher.mjs';
import {
  dispatchViewExerciseRecommendations,
  dispatchViewLastWorkout,
  dispatchViewWorkoutHistory,
  suggestWorkout,
} from './dispatchers/workoutReadDispatchers.mjs';
import {
  dispatchCreateHermesTask,
  dispatchListHermesTasks,
} from './dispatchers/hermesCommandDispatchers.mjs';
import { dispatchLogWorkout } from './dispatchers/workoutLogWriteDispatcher.mjs';
import { dispatchViewWorkoutStatistics } from './dispatchers/workoutStatisticsReadDispatcher.mjs';
import { dispatchUpdateClient } from './dispatchers/clientProfileWriteDispatchers.mjs';
import { dispatchViewClientProfile } from './dispatchers/clientProfileReadDispatcher.mjs';
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
import { dispatchStartOnboarding } from './dispatchers/onboardingStartDispatcher.mjs';
import { dispatchOnboardingQuestions } from './dispatchers/onboardingQuestionsDispatcher.mjs';
import { dispatchSubmitOnboarding } from './dispatchers/onboardingSubmitDispatcher.mjs';
import { dispatchViewOnboardingStatus } from './dispatchers/onboardingStatusDispatcher.mjs';
import { dispatchFillBaselineMeasurements } from './dispatchers/onboardingBaselineDispatcher.mjs';
import { dispatchViewOrientationQueue } from './dispatchers/onboardingQueueDispatcher.mjs';
import {
  dispatchEquipmentAddItem,
  dispatchEquipmentGapReport,
  dispatchEquipmentListItems,
  dispatchEquipmentListProfiles,
} from './dispatchers/equipmentDispatchers.mjs';

// ── Dispatcher Map ───────────────────────────────────────────────────────────

/**
 * Maps command type → async handler(params, ctx) → result object.
 * Every registered handler must return a flat result object (no nested arrays/objects)
 * so ExecutionResultCard can render each field as a DataRow.
 *
 * @type {Map<string, (params: Record<string, unknown>, ctx: import('./commandExecutor.mjs').CommandContext) => Promise<Record<string, unknown>>>}
 */
const DISPATCHERS = new Map([
  ['log_workout', dispatchLogWorkout],
  ['create_workout_session', dispatchCreateWorkoutSession],
  ['create_hermes_task', dispatchCreateHermesTask],
  ['list_hermes_tasks', dispatchListHermesTasks],
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
  ['brief_client', dispatchBriefClient],
  ['brief_my_day', dispatchBriefMyDay],
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
  ['view_workout_history', dispatchViewWorkoutHistory],
  ['view_last_workout', dispatchViewLastWorkout],
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
  ['suggest_workout',          suggestWorkout],
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
  ['equipment_list_profiles',       dispatchEquipmentListProfiles],
  ['equipment_list_items',          dispatchEquipmentListItems],
  ['equipment_gap_report',          dispatchEquipmentGapReport],
  ['equipment_add_item',            dispatchEquipmentAddItem],
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

const logDispatchSuccess = ({ commandType, ctx }) => {
  logger.info('[CommandDispatcher] Command executed', {
    command: commandType,
    userId: ctx.user?.id,
    clientId: ctx.resolvedClient?.id || null,
  });
};

const logDispatchFailure = ({ commandType, err }) => {
  logger.error('[CommandDispatcher] Handler threw', {
    command: commandType,
    error: err.message,
  });
};

const executeHandler = async ({ commandType, handler, params, ctx }) => {
  try {
    const result = await handler(params, ctx);
    logDispatchSuccess({ commandType, ctx });
    return result;
  } catch (err) {
    logDispatchFailure({ commandType, err });
    throw err;
  }
};

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

  return executeHandler({ commandType, handler, params, ctx });
}
