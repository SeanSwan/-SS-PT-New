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

/**
 * Is this env value an intentional "off"? — card 1.5, finding FF23.
 *
 * The original check was `!== 'false'`, and its comment celebrated that a typo
 * could never cause an outage. The inverted property is the dangerous one: a
 * typo could never STOP one. `False`, `FALSE`, ` false `, `0`, `no` all left the
 * lane hot, and an operator reaching for a kill switch mid-incident types
 * whatever their fingers produce. For a kill switch, availability-of-disable
 * dominates availability-of-service.
 *
 * Recognised: false/FALSE/False, 0, no, off — trimmed, case-insensitive.
 * Anything else (including empty and unset) leaves the flag ON.
 */
export function parsesAsDisabled(value) {
  if (typeof value !== 'string') return false;
  return ['false', '0', 'no', 'off'].includes(value.trim().toLowerCase());
}

/**
 * A value that is neither canonical-off nor plausibly-on. Logged at boot so an
 * operator who typed `AI_COMMANDS_ENABLED=flase` finds out from the logs rather
 * than from an incident that would not stop.
 */
export function isNonCanonicalFlagValue(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const v = value.trim().toLowerCase();
  return !['false', '0', 'no', 'off', 'true', '1', 'yes', 'on'].includes(v);
}

/** Whole command lane on/off. Default ON; any recognised "off" disables. */
export function isCommandLaneEnabled() {
  return !parsesAsDisabled(process.env.AI_COMMANDS_ENABLED);
}

/** Effective switch state, for /health — an incident needs the truth, not the env string. */
export function describeLaneControls() {
  return {
    commandsEnabled: isCommandLaneEnabled(),
    writesEnabled: areCommandWritesEnabled(),
    nonCanonicalValues: [
      ['AI_COMMANDS_ENABLED', process.env.AI_COMMANDS_ENABLED],
      ['AI_COMMAND_WRITES_ENABLED', process.env.AI_COMMAND_WRITES_ENABLED],
    ].filter(([, v]) => isNonCanonicalFlagValue(v)).map(([k]) => k),
  };
}

/**
 * Write/destructive commands on/off. Default ON; any recognised "off" disables
 * (false / 0 / no / off, trimmed and case-insensitive — see parsesAsDisabled).
 * A command counts as a write when its registry entry declares
 * `destructive: true` OR `requiresConfirmation: true` (per the V1 spec,
 * reads never require confirmation).
 */
export function areCommandWritesEnabled() {
  return !parsesAsDisabled(process.env.AI_COMMAND_WRITES_ENABLED);
}

export const COMMAND_WRITES_PAUSED_MESSAGE =
  'Swan Coach actions are temporarily paused by the administrator. Read-only questions still work. No data was changed.';

export const COMMAND_LANE_PAUSED_MESSAGE =
  'Swan Coach commands are temporarily disabled. Please try again later.';
