/**
 * Render Lease Sweeper Cron
 * =========================
 * Reclaims render jobs whose worker died mid-render. Runs on an interval
 * (matches server patterns — see sessionReminderCron.mjs).
 *
 * WHY THIS EXISTS. `sweepExpiredLeases()` was written, unit-tested, and then wired to
 * NOTHING — a repo-wide grep found no caller outside the service and its own test. The
 * whole lease design assumes a reaper: a worker takes a lease, extends it by heartbeat,
 * and if it is `kill -9`'d mid-render the lease simply expires. With no sweeper running,
 * "expires" means nothing happens. The row sits in `leased` forever, the operator sees a
 * job that is permanently 47% done, and the retry that the retry-count column exists to
 * allow never fires.
 *
 * It is the same failure as the endpoint this shipped beside: a mechanism that reports a
 * state nobody advances. Building the reclaim logic and not scheduling it is indistinguishable
 * from not building it, except that it LOOKS handled in code review.
 *
 * SAFETY UNDER MULTIPLE INSTANCES: Render may run more than one web instance, so this
 * interval can fire concurrently. That is safe because the reclaim is a single SQL
 * UPDATE guarded by `lease_expires_at < now()` — a second sweeper finds zero rows.
 * Correctness lives in the WHERE clause, not in there being exactly one sweeper.
 */

import { sweepExpiredLeases } from './videoRenderJobService.mjs';
import logger from '../utils/logger.mjs';

/**
 * Leases are heartbeat-extended, so this only needs to be fast relative to an
 * operator noticing a stuck job — not relative to the heartbeat itself.
 */
export const SWEEP_INTERVAL_MS = 60 * 1000;

let timer = null;
let consecutiveFailures = 0;

async function runSweep() {
  try {
    // `sweepExpiredLeases()` returns { requeued, failed } — read from the service, not
    // assumed. The first version here guessed at an array-or-number and did
    // `Number(result || 0)`, which on an object is NaN; `NaN > 0` is false, so the
    // reaper would have run correctly and logged NOTHING, forever. An agent crash-loop
    // stranding jobs every minute would have produced zero output — a dead monitoring
    // path that looks identical to a healthy quiet one.
    const { requeued = 0, failed = 0 } = (await sweepExpiredLeases()) ?? {};
    consecutiveFailures = 0;

    // Only speak when something happened. A reaper that logs every minute trains
    // everyone to filter it out, which is how the interesting line gets missed.
    if (requeued > 0) {
      logger.warn(`[RenderLeaseSweeper] requeued ${requeued} job(s) from dead workers`);
    }
    // Distinct level and distinct sentence: these are NOT retried. Someone has a render
    // that will never complete, and that is the line worth paging on.
    if (failed > 0) {
      logger.error(
        `[RenderLeaseSweeper] ${failed} job(s) exhausted their attempts after worker death `
        + '— these will not retry',
      );
    }
  } catch (err) {
    consecutiveFailures += 1;
    // Escalate on repetition rather than on every miss: one failure is a blip, a
    // sustained run means the reclaim path is down and stuck jobs are accumulating
    // silently — exactly the condition this service exists to prevent.
    if (consecutiveFailures === 1 || consecutiveFailures % 10 === 0) {
      logger.error(
        `[RenderLeaseSweeper] sweep failed (${consecutiveFailures}x): ${err.message}`,
      );
    }
  }
}

export function startRenderLeaseSweeper() {
  if (timer) return timer;
  // Deliberately NOT run immediately at boot: during a deploy every instance starts at
  // once, and a thundering herd of sweeps against a fresh pool is a bad first act.
  timer = setInterval(runSweep, SWEEP_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref(); // never hold the process open
  logger.info(`[RenderLeaseSweeper] started (every ${SWEEP_INTERVAL_MS / 1000}s)`);
  return timer;
}

export function stopRenderLeaseSweeper() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info('[RenderLeaseSweeper] stopped');
}

export default { startRenderLeaseSweeper, stopRenderLeaseSweeper, SWEEP_INTERVAL_MS };
