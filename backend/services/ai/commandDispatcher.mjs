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
 *   N01/N02: view_plaud_intake_queue + review_next_plaud_intake → plaudDispatchers
 *
 * ADD COMMANDS: Import service fn → add DISPATCHERS entry → stepExecute picks it up automatically.
 * ============================================================================
 */

import * as hermesService from '../hermes/hermesService.mjs';
import { logWorkoutForClient } from '../workout/workoutLogService.mjs';
import { getAllModels } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';
import { logMeals, viewNutritionLog, viewMacroTrends } from './dispatchers/nutritionDispatchers.mjs';
import { viewActivePain, addPainEntry, dispatchResolvePainEntry, dispatchUpdatePainEntry } from './dispatchers/painDispatchers.mjs';
import { viewLatestMeasurements, dispatchLogWeighIn, dispatchLogMeasurements, viewMeasurementTrends } from './dispatchers/measurementDispatchers.mjs';
import { dispatchCancelSession, dispatchViewTodaySchedule, dispatchViewWeekSchedule } from './dispatchers/sessionDispatchers.mjs';
import {
  dispatchViewTrainerAvailability,
  dispatchCreateAvailabilityOverride,
  dispatchViewAvailableSlots,
} from './dispatchers/availabilityDispatchers.mjs';
import {
  dispatchReviewNextPlaudIntake,
  dispatchViewPlaudIntakeQueue,
} from './dispatchers/plaudDispatchers.mjs';

// ── Dispatcher Map ───────────────────────────────────────────────────────────

/**
 * Maps command type → async handler(params, ctx) → result object.
 * Every registered handler must return a flat result object (no nested arrays/objects)
 * so ExecutionResultCard can render each field as a DataRow.
 *
 * @type {Map<string, (params: Record<string, unknown>, ctx: import('./commandExecutor.mjs').CommandContext) => Promise<Record<string, unknown>>>}
 */
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
  [
    'view_workout_history',
    async (params, ctx) => {
      const { WorkoutSession, WorkoutLog } = getAllModels();
      const clientId = params.clientId ?? ctx.resolvedClient?.id;
      const limit = Math.min(20, Math.max(1, Number(params.limit) || 5));
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
    },
  ],
  ['view_nutrition_log',      viewNutritionLog],
  ['view_macro_trends',       viewMacroTrends],
  ['view_latest_measurements', viewLatestMeasurements],
  ['log_weighin',              dispatchLogWeighIn],
  ['log_measurements',         dispatchLogMeasurements],
  ['view_measurement_trends',  viewMeasurementTrends],
  ['view_active_pain',         viewActivePain],
  ['add_pain_entry',           addPainEntry],
  ['resolve_pain_entry',       dispatchResolvePainEntry],
  ['update_pain_entry',        dispatchUpdatePainEntry],
  ['cancel_session',           dispatchCancelSession],
  ['view_today_schedule',         dispatchViewTodaySchedule],
  ['view_today_sessions',         dispatchViewTodaySchedule],    // alias — same handler
  ['view_week_schedule',          dispatchViewWeekSchedule],
  ['view_trainer_availability',    dispatchViewTrainerAvailability],
  ['view_available_slots',         dispatchViewAvailableSlots],
  ['create_availability_override', dispatchCreateAvailabilityOverride],
  ['view_plaud_intake_queue',      dispatchViewPlaudIntakeQueue],
  ['review_next_plaud_intake',     dispatchReviewNextPlaudIntake],
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
