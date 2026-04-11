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
 *   - Commands with no handler return null → pipeline returns { executed, result: null }
 *     (existing behavior unchanged for all 99 pre-Hermes commands).
 *   - New commands get real execution by adding an entry here + its service function.
 *
 * WHY SERVICE FUNCTIONS, NOT HTTP:
 *   Internal HTTP calls to localhost are circular, auth-entangled, and fragile.
 *   Service functions are directly importable, testable, and have no network overhead.
 *
 * REGISTERED COMMANDS:
 *   exec-substrate-v1:
 *   M01: create_hermes_task → hermesService.createTask
 *   M02: list_hermes_tasks  → hermesService.listTasks
 *
 *   exec-substrate-v2 (first confirmed legacy slice):
 *   B03: log_workout        → workoutLogService.logWorkoutForClient
 *
 *   exec-substrate-v3 (honesty fix + first read command):
 *   R01: view_workout_history → WorkoutSession.findAll (flat scalar summary)
 *
 * ADDING FUTURE COMMANDS:
 *   1. Import the service function
 *   2. Add an entry to DISPATCHERS: 'command_type': async (params, ctx) => service.fn(...)
 *   3. Done — stepExecute picks it up automatically
 * ============================================================================
 */

import * as hermesService from '../hermes/hermesService.mjs';
import { logWorkoutForClient } from '../workout/workoutLogService.mjs';
import { getAllModels } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

// ── Dispatcher Map ───────────────────────────────────────────────────────────

/**
 * Maps command type → async handler(params, ctx) → result object.
 * Return null to pass through (unchanged behavior).
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
