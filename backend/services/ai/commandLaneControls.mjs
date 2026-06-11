/**
 * Command Lane Controls — Kill-Switch Flags
 * =========================================
 * Env-based emergency controls for the Swan Coach command lane.
 * Mirrors the aiKillSwitch house pattern (middleware/aiConsent.mjs):
 * flags are DEFAULT-ENABLED and only disable on the explicit string 'false',
 * so a missing or typo'd env var can never dark-launch an outage.
 *
 *   AI_COMMANDS_ENABLED=false        → the whole command lane returns 503
 *                                      (enforced in middleware/aiCommandGuards.mjs)
 *   AI_COMMAND_WRITES_ENABLED=false  → write/destructive commands are blocked,
 *                                      read commands keep working
 *                                      (enforced in commandExecutor.mjs)
 *
 * Slice F1 — Command-Lane Security Foundation (2026-06-10)
 */

/** Whole command lane on/off. Default ON; only 'false' disables. */
export function isCommandLaneEnabled() {
  return process.env.AI_COMMANDS_ENABLED !== 'false';
}

/**
 * Write/destructive commands on/off. Default ON; only 'false' disables.
 * A command counts as a write when its registry entry declares
 * `destructive: true` OR `requiresConfirmation: true` (per the V1 spec,
 * reads never require confirmation).
 */
export function areCommandWritesEnabled() {
  return process.env.AI_COMMAND_WRITES_ENABLED !== 'false';
}

export const COMMAND_WRITES_PAUSED_MESSAGE =
  'Swan Coach actions are temporarily paused by the administrator. Read-only questions still work. No data was changed.';

export const COMMAND_LANE_PAUSED_MESSAGE =
  'Swan Coach commands are temporarily disabled. Please try again later.';
