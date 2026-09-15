#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/exit.mjs
 * PURPOSE: The exit-code contract — named once, mapped in one function.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR03)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY IT MOVED OUT OF `commands.mjs`:
 *   Every command module needs the codes, and several of them are imported BY
 *   `commands.mjs` — which made each one a circular import of the module it was
 *   being registered in. A leaf module with no imports of its own removes the
 *   cycle rather than relying on ESM's live bindings to paper over it.
 *
 * THE CONTRACT (review HR03 — a scheduler reads these, a human reads the
 * sentences, and both must say the same thing):
 *   0 success · 1 work failed · 2 refused/blocked (nothing attempted)
 *   3 deferred (nothing wrong, nothing done — a budget, bound, throttle or
 *     canary suppression stopped it, and the next run continues)
 *
 * @module creator-brains/exit
 */

export const EXIT = Object.freeze({
  OK: 0, FAILED: 1, REFUSED: 2, DEFERRED: 3,
});

/**
 * Map a run record to an exit code. One place, so the meaning cannot drift.
 *
 * THE ORDER OF THE QUESTIONS IS THE CONTRACT:
 *   1. Did the run get to attempt anything? A held lock, a damaged store or a
 *      rejected configuration is a REFUSAL — "work failed" would misdescribe a
 *      run that never started.
 *   2. Was traffic deferred by a throttle with work still owed? That is
 *      DEFERRED, even though the canary carries the failure: the engine is
 *      healthy and the service said stop, so a scheduler should come back rather
 *      than raise an alarm (review HR23).
 *   3. Did the health check fail for any other reason? That is a FAILURE — a
 *      broken yt-dlp must not be filed as "nothing wrong".
 */
export function verdictExit(record) {
  if (!record) return EXIT.FAILED;
  if (record.ok) return EXIT.OK;
  const phases = record.phases || [];
  const deferred = (record.counts && record.counts.deferred) || 0;
  const failed = (record.counts && record.counts.failed) || 0;

  const refused = phases.find((p) => (p.name === 'preflight' || p.name === 'lock') && !p.ok);
  if (refused) return EXIT.REFUSED;

  const throttled = phases.find((p) => p.name === 'throttle' && !p.ok);
  if (throttled && deferred > 0) return EXIT.DEFERRED;

  // Same reasoning for a run that was allowed too little to start: the engine is
  // healthy, the bound stopped it, and the next run continues.
  const bounded = phases.find((p) => p.name === 'bound' && !p.ok);
  if (bounded && deferred > 0) return EXIT.DEFERRED;

  if (phases.some((p) => (p.name === 'canary' || p.name === 'circuit_breaker') && !p.ok)) return EXIT.FAILED;
  if (failed > 0) return EXIT.FAILED;
  if (deferred > 0) return EXIT.DEFERRED;
  return EXIT.FAILED;
}
