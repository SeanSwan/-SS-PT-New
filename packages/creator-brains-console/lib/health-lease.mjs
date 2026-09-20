/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-lease.mjs
 * PURPOSE: Who owns the shared probe worker — the reset rule, and the lease that
 *          decides when it may run.
 * PART OF: Creator Brains Console (blueprint 05 §1; 08 Operations)
 * SLICE: S0H (R3-03, Astra round 3)
 * ============================================================================
 *
 * WHY THIS MODULE EXISTS (R3-03). The probe worker and the health cache are
 * PROCESS-GLOBAL — one worker, one cache, however many stores are open. The reset
 * closes the worker and empties the cache, and until round 3 nothing in the bridge
 * ever called it: `api.mjs` re-exported it, `server.mjs` shut down without it, and
 * a source search found no production caller at all. An embedding host that
 * stopped a bridge while its process stayed alive therefore kept an idle worker
 * thread and a live cache entry. The lifecycle tests could not see it, because
 * they invoke the reset DIRECTLY — a test that calls the cleanup itself cannot
 * observe a missing production connection to it.
 *
 * WHY THE RESET RULE LIVES HERE AND NOT IN `health.mjs`. There are now two ways to
 * ask for a reset — explicitly, and implicitly by being the last owner to let go —
 * and a rule stated in two places is a rule that drifts (R2-01). So it is stated
 * ONCE, here, and `health.mjs` re-exports it under the name callers already use.
 *
 * WHY THE LAST OWNER, AND NOT EVERY SHUTDOWN. Two bridges may serve two stores
 * from one process. Retiring the shared worker when the FIRST of them stops would
 * pull it out from under the second — a shutdown that breaks a running service.
 * The lease counts live bridges, and only the release that reaches zero retires.
 *
 * @module creator-brains-console/lib/health-lease
 */

import { clearCaches } from './health-cache.mjs';
import { resetProbeChannel } from './health-probe.mjs';

/**
 * Close the probe worker and forget every root's reading.
 *
 * Idempotent, and safe at any time — the test suites call it between cases, which
 * is why it stays exported under its original name.
 */
export function resetHealthResources() {
  clearCaches();
  resetProbeChannel();
}

/** Live bridges holding the shared probe. */
let owners = 0;

/** Take a lease. Every successful `startBridge` takes exactly one. */
export function acquireHealthOwner() {
  owners += 1;
  return owners;
}

/**
 * Give a lease back, and retire the shared worker when the LAST one goes.
 *
 * A release with no matching acquire is a NO-OP rather than a reset: a stray call
 * must not be able to tear the worker out from under a bridge that is still
 * serving. That is why the count is checked BEFORE it is decremented — a release
 * from zero is not "the last owner left", it is a caller that never took one.
 */
export function releaseHealthOwner() {
  if (owners === 0) return 0;
  owners -= 1;
  if (owners === 0) resetHealthResources();
  return owners;
}

/** How many bridges currently hold the shared probe. Test seam and diagnostic. */
export function healthOwnerCount() {
  return owners;
}
