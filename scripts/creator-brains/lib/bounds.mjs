#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/bounds.mjs
 * PURPOSE: The per-run execution bound — how much work ONE run may attempt —
 *          and the single validator for every run-configuration number.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR23):
 *   "implement an explicit per-run duration/work bound". There was none. The
 *   only limit was the rolling-hour transport budget, and a run that spent it
 *   was still free to keep enumerating, probing, fetching and building for as
 *   long as the wall clock allowed — a scheduled task with no upper bound is a
 *   task that can still be running when its next invocation arrives.
 *
 * TWO BOUNDS, BECAUSE THEY FAIL DIFFERENTLY:
 *   - WORK (`maxOps`): transport operations this run may spend, counting the
 *     enumeration walks and the canary that the hourly budget does not reserve.
 *   - TIME (`maxMinutes`): wall clock from the moment the run opened. Slow
 *     network, a hung yt-dlp and a huge corpus all spend work slowly.
 *
 * THEY ARE ENFORCED WHERE THE TRAFFIC IS, NOT WHERE THE FLAG IS PARSED:
 *   `openBounds().stop()` is consulted by the reserve wrapper every transport
 *   operation goes through, so a caller cannot opt out by looping somewhere
 *   else, and every refusal is counted as DEFERRED with a reason that names the
 *   bound. A bound that can be bypassed by forgetting to check it is decoration.
 *
 * WHY VALIDATION IS ALSO HERE:
 *   `0`, `''`, `NaN` and `Infinity` are the four ways a numeric limit silently
 *   becomes "no limit" (`perHour || DEFAULT`, the HR01 defect). Every run-config
 *   number — ops, minutes, the no-caption window — is validated by one function
 *   so both entry points (the CLI and the scheduled runner) refuse the same
 *   values for the same reason.
 *
 * @module creator-brains/bounds
 */

import { NO_TRACK_RETRY_HOURS } from './fsm.mjs';

export class BoundsError extends Error {}

/** Defaults. Both finite, both owner-settable, neither reachable by accident. */
export const DEFAULT_MAX_MINUTES = 45;
export const MAX_MAX_MINUTES = 24 * 60;
export const DEFAULT_MAX_OPS = null; // null => "one rolling hour's worth"

/** Refuse anything that is not an explicit positive integer. */
function positiveInt(value, what, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    throw new BoundsError(
      `${what} must be a positive whole number (got ${JSON.stringify(value)}) — `
      + 'refusing to run without a real limit',
    );
  }
  return n;
}

/** Minutes for a run. */
export function validateMinutes(value, fallback = DEFAULT_MAX_MINUTES) {
  const n = positiveInt(value, 'maxMinutes', { max: MAX_MAX_MINUTES });
  return n === null ? fallback : n;
}

/** Transport operations for a run. `null` fallback means "derive from the cap". */
export function validateOps(value, fallback = DEFAULT_MAX_OPS) {
  const n = positiveInt(value, 'maxOps');
  return n === null ? fallback : n;
}

/** Hours in the no-caption retry window (review HR23 / blueprint CB-05). */
export function validateNoTrackHours(value, fallback = NO_TRACK_RETRY_HOURS) {
  const n = positiveInt(value, 'noTrackHours', { max: MAX_MAX_MINUTES });
  return n === null ? fallback : n;
}

/**
 * Validate the whole run configuration in one place.
 *
 * `maxOps` defaults to the caller's hourly cap: a single run may not spend more
 * transport operations than one rolling hour is allowed, which keeps the two
 * limits from contradicting each other. The canary and the enumeration walks are
 * inside this bound even though they are outside the hourly reservations, so the
 * default is a genuine ceiling rather than a restatement of the budget.
 */
export function validateRunConfig({
  maxMinutes, maxOps, noTrackHours, perHour = 60,
} = {}) {
  const resolved = {
    maxMinutes: validateMinutes(maxMinutes, DEFAULT_MAX_MINUTES),
    maxOps: validateOps(maxOps, validateOps(perHour)),
    noTrackHours: validateNoTrackHours(noTrackHours),
  };
  return { ...resolved, maxMs: resolved.maxMinutes * 60_000 };
}

/**
 * Open a run's bound.
 *
 * `opsUsed` reports the operations already reserved this run (the persistent
 * budget's own tally). `charge()` adds the operations the budget does not see —
 * the canary and each enumeration walk — so `ops()` is the honest total.
 */
export function openBounds({
  now = () => Date.now(), maxMinutes = DEFAULT_MAX_MINUTES, maxOps = null, opsUsed = () => 0,
} = {}) {
  const limitOps = validateOps(maxOps) === null ? Number.MAX_SAFE_INTEGER : validateOps(maxOps);
  const limitMs = validateMinutes(maxMinutes) * 60_000;
  const startedAt = now();
  let charged = 0;

  const bounds = {
    maxMs: limitMs,
    maxMinutes: Math.round(limitMs / 60_000),
    maxOps: limitOps === Number.MAX_SAFE_INTEGER ? null : limitOps,
    startedAt,
    deadline: startedAt + limitMs,
    /** Add operations the transport budget does not reserve (canary, walks). */
    charge(n = 1) { charged += n; return bounds; },
    ops() { return charged + (Number(opsUsed()) || 0); },
    state() {
      const elapsedMs = now() - startedAt;
      return {
        maxMinutes: bounds.maxMinutes,
        maxOps: bounds.maxOps,
        startedAt: new Date(startedAt).toISOString(),
        elapsedMs,
        leftMs: Math.max(0, bounds.deadline - now()),
        ops: bounds.ops(),
        unit: 'yt-dlp transport operations, including discovery walks and the canary',
      };
    },
    /**
     * `null` while the run may continue; otherwise the sentence that explains
     * why it must stop. Called before every transport operation.
     */
    stop() {
      const ops = bounds.ops();
      if (ops >= limitOps) {
        return `run work bound reached: ${ops}/${limitOps} transport operations `
          + '(raise with --max-ops=N, or let the next run continue)';
      }
      if (now() >= bounds.deadline) {
        return `run duration bound reached: ${Math.round((now() - startedAt) / 1000)}s `
          + `of ${bounds.maxMinutes} min (raise with --max-minutes=N)`;
      }
      return null;
    },
    /**
     * Is there room to START a unit that costs `n` operations?
     *
     * `stop()` answers "may I make one more request?". This answers the other
     * question a caller with a known up-front cost must ask — the canary costs
     * two, a discovery walk up to one per tab — so a bound too small for the work
     * refuses it rather than being discovered mid-flight and overshot.
     */
    allows(n = 1) {
      return bounds.ops() + n <= limitOps;
    },
  };
  return bounds;
}
