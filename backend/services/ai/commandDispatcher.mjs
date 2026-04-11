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
 *   - FRONTEND_DISPATCH commands also return not_wired (handled by browser event bus, not server).
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
 *   exec-substrate-v4 (nutrition read slice):
 *   E01: view_nutrition_log   → DailyMacroLog.findAll today (flat daily summary)
 *   E02: view_macro_trends    → DailyMacroLog.findAll 7-day (averaged flat summary)
 *
 * ADDING FUTURE COMMANDS:
 *   1. Import the service function
 *   2. Add an entry to DISPATCHERS: 'command_type': async (params, ctx) => service.fn(...)
 *   3. Done — stepExecute picks it up automatically
 * ============================================================================
 */

import { Op } from 'sequelize';
import * as hermesService from '../hermes/hermesService.mjs';
import { logWorkoutForClient } from '../workout/workoutLogService.mjs';
import { getAllModels } from '../../models/index.mjs';
import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import logger from '../../utils/logger.mjs';

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
  [
    'view_nutrition_log',
    async (params, ctx) => {
      const clientId = params.clientId ?? ctx.resolvedClient?.id;
      const today = new Date().toISOString().slice(0, 10);
      const empty = { date: today, mealCount: 0, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
      try {
        const rows = await DailyMacroLog.findAll({
          where: { userId: clientId, date: today },
          attributes: ['calories', 'protein', 'carbs', 'fat'],
        });
        if (rows.length === 0) return empty;
        const round1 = (n) => Math.round(n * 10) / 10;
        return {
          date: today,
          mealCount: rows.length,
          totalCalories: round1(rows.reduce((s, r) => s + (r.calories || 0), 0)),
          totalProtein:  round1(rows.reduce((s, r) => s + (r.protein  || 0), 0)),
          totalCarbs:    round1(rows.reduce((s, r) => s + (r.carbs    || 0), 0)),
          totalFat:      round1(rows.reduce((s, r) => s + (r.fat      || 0), 0)),
        };
      } catch (err) {
        // Table may not exist in production yet — return honest empty result
        if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
          logger.warn('[CommandDispatcher] daily_macro_logs table not found — returning empty nutrition log');
          return empty;
        }
        throw err;
      }
    },
  ],
  [
    'view_macro_trends',
    async (params, ctx) => {
      const clientId = params.clientId ?? ctx.resolvedClient?.id;
      const endDate   = new Date().toISOString().slice(0, 10);
      const startD    = new Date();
      startD.setDate(startD.getDate() - 6);          // last 7 days inclusive
      const startDate = startD.toISOString().slice(0, 10);
      const empty = { daysLogged: 0, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, startDate, endDate };
      try {
        const rows = await DailyMacroLog.findAll({
          where: { userId: clientId, date: { [Op.between]: [startDate, endDate] } },
          attributes: ['date', 'calories', 'protein', 'carbs', 'fat'],
        });
        if (rows.length === 0) return empty;
        // Aggregate per day, then average across days that have entries
        const daily = {};
        for (const r of rows) {
          const d = r.date;
          if (!daily[d]) daily[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          daily[d].calories += r.calories || 0;
          daily[d].protein  += r.protein  || 0;
          daily[d].carbs    += r.carbs    || 0;
          daily[d].fat      += r.fat      || 0;
        }
        const days = Object.values(daily);
        const n = days.length;
        const round1 = (v) => Math.round((v / n) * 10) / 10;
        return {
          daysLogged:  n,
          avgCalories: round1(days.reduce((s, d) => s + d.calories, 0)),
          avgProtein:  round1(days.reduce((s, d) => s + d.protein,  0)),
          avgCarbs:    round1(days.reduce((s, d) => s + d.carbs,    0)),
          avgFat:      round1(days.reduce((s, d) => s + d.fat,      0)),
          startDate,
          endDate,
        };
      } catch (err) {
        // Table may not exist in production yet — return honest empty result
        if (err.name === 'SequelizeDatabaseError' && err.message?.includes('does not exist')) {
          logger.warn('[CommandDispatcher] daily_macro_logs table not found — returning empty macro trends');
          return empty;
        }
        throw err;
      }
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
