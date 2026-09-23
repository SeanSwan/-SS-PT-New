/**
 * ============================================================================
 * FILE: reconciliationQueue.mjs
 * PURPOSE: Run the checkout-reconciliation sweep as a DURABLE BullMQ repeatable
 *          job instead of a process-local setInterval.
 *
 * WHY (SWA-225 EX-3). The sweeper releases stale pending carts — money-adjacent
 * work. As a setInterval it has three properties nobody chose:
 *   1. it dies on every deploy, and Render deploys on every push to main;
 *   2. a missed window is simply lost — there is no catch-up;
 *   3. it fires once per process, so a second instance doubles the sweep.
 * BullMQ persists the schedule in Redis, so a restart resumes it, a missed
 * window is picked up, and one worker holds the job across the fleet.
 *
 * NOTHING ABOUT THE SWEEP ITSELF MOVES. The processor calls the existing
 * `runSweep` from services/checkoutReconciliationCron.mjs — the same function
 * the interval calls. This slice changes WHEN the sweep runs, never WHAT it does,
 * so a regression here cannot be a reconciliation-logic regression.
 *
 * FLAG-GATED AND OFF BY DEFAULT. `USE_BULLMQ_RECONCILIATION=true` opts in;
 * absent, core/startup.mjs keeps the interval untouched. Turning it on is a
 * deliberate act after the survive-restart proof.
 *
 * lockDuration IS DELIBERATE AND LOAD-BEARING. BullMQ's default stalled-job
 * lock is 30s. The sweep runs on a 5-minute cadence and can legitimately take
 * longer than 30s against a large cart table — at which point BullMQ would
 * declare the job stalled and hand it to a second worker WHILE THE FIRST IS
 * STILL RUNNING. Two concurrent sweeps racing over the same stale carts is the
 * exact double-run the interval was replaced to prevent. 10 minutes (2x the
 * interval) with concurrency:1 makes that impossible.
 *
 * FAIL-OPEN. No REDIS_URL means this returns null and the caller keeps the
 * interval. A queue that cannot start must never leave the money path with no
 * sweeper at all.
 * ============================================================================
 */
import logger from '../../utils/logger.mjs';
import { SWEEP_INTERVAL_MS, runSweep } from '../../services/checkoutReconciliationCron.mjs';

export const RECONCILIATION_QUEUE_NAME = 'checkout-reconciliation';

/** Fixed id: re-registering the same repeatable on every boot is then a no-op
 *  rather than an accumulating pile of duplicate schedules. */
export const RECONCILIATION_JOB_ID = 'checkout-reconciliation-sweep';

/** 2x the sweep interval — see the lockDuration note above. */
export const RECONCILIATION_LOCK_MS = 2 * SWEEP_INTERVAL_MS;

let queue = null;
let worker = null;

/**
 * The job processor, exported so it can be EXECUTED in a test.
 *
 * It was originally an inline arrow inside the Worker construction, which made
 * it unreachable without a live Redis — and that mattered: the control for
 * "the processor runs the exact shared sweep" could not fail, because under
 * Vite's ESM transform a mis-named import resolves to `undefined` instead of
 * raising a link error, and nothing ever called it. Exporting the function is
 * what turns that control into a real one.
 */
export async function processSweepJob() {
  await runSweep();
}

/** ioredis options BullMQ requires, matching the shape used by config/session.mjs. */
function connectionOptions() {
  return {
    // BullMQ blocks on BRPOPLPUSH; a retry ceiling would abort those long polls.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

/**
 * Start the durable sweeper. Returns null when Redis is unavailable so the
 * caller can fall back to the interval.
 * @returns {Promise<{ queue: unknown, worker: unknown } | null>}
 */
export async function startReconciliationQueue() {
  if (queue && worker) return { queue, worker };

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.error('[ReconciliationQueue] USE_BULLMQ_RECONCILIATION is on but REDIS_URL is unset — cannot start the durable sweeper.');
    return null;
  }

  let Queue;
  let Worker;
  try {
    ({ Queue, Worker } = await import('bullmq'));
  } catch (error) {
    logger.error(`[ReconciliationQueue] bullmq unavailable: ${error.message}`);
    return null;
  }

  try {
    const connection = { url, ...connectionOptions() };

    queue = new Queue(RECONCILIATION_QUEUE_NAME, { connection });
    await queue.upsertJobScheduler(
      RECONCILIATION_JOB_ID,
      { every: SWEEP_INTERVAL_MS },
      {
        name: 'sweep',
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      },
    );

    worker = new Worker(
      RECONCILIATION_QUEUE_NAME,
      processSweepJob,
      {
        connection,
        concurrency: 1,
        lockDuration: RECONCILIATION_LOCK_MS,
        stalledInterval: 60_000,
      },
    );

    // A worker error must never take the process down; the sweep is best-effort
    // and the next scheduled run is only minutes away.
    worker.on('failed', (job, error) => {
      logger.error(`[ReconciliationQueue] sweep failed (attempt ${job?.attemptsMade}): ${error?.message}`);
    });
    worker.on('error', (error) => {
      logger.error(`[ReconciliationQueue] worker error: ${error?.message}`);
    });

    logger.info('[ReconciliationQueue] durable sweeper started', {
      intervalMs: SWEEP_INTERVAL_MS,
      lockDurationMs: RECONCILIATION_LOCK_MS,
    });
    return { queue, worker };
  } catch (error) {
    logger.error(`[ReconciliationQueue] failed to start: ${error.message}`);
    queue = null;
    worker = null;
    return null;
  }
}

/** Graceful shutdown; safe to call when nothing was started. */
export async function stopReconciliationQueue() {
  try {
    await worker?.close();
    await queue?.close();
  } catch (error) {
    logger.warn(`[ReconciliationQueue] shutdown warning: ${error.message}`);
  } finally {
    worker = null;
    queue = null;
  }
}

/** Test-only reset of the module singletons. */
export function __resetReconciliationQueueForTests() {
  queue = null;
  worker = null;
}

export default {
  startReconciliationQueue,
  stopReconciliationQueue,
  RECONCILIATION_QUEUE_NAME,
  RECONCILIATION_JOB_ID,
  RECONCILIATION_LOCK_MS,
};
