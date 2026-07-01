/**
 * sessionSettlementWorker.mjs
 * ===========================
 * In-process settlement sweeper for Universal Master Schedule.
 *
 * The worker is intentionally conservative: it calls the existing deterministic
 * session deduction service on an interval and is disabled by default unless
 * SESSION_SETTLEMENT_WORKER_ENABLED=true. This closes the manual-only gap
 * without giving AI or the browser authority to perform write operations.
 */
import logger from '../utils/logger.mjs';
import { processSessionDeductions } from '../services/sessionDeductionService.mjs';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;

let intervalHandle = null;
let running = false;

function resolveIntervalMs() {
  const configured = Number(process.env.SESSION_SETTLEMENT_WORKER_INTERVAL_MS);
  if (Number.isFinite(configured) && configured >= MIN_INTERVAL_MS) return configured;
  return DEFAULT_INTERVAL_MS;
}

export async function runSessionSettlementSweep() {
  if (running) {
    logger.info('[sessionSettlementWorker] sweep already running, skipping overlap');
    return null;
  }

  running = true;
  try {
    const result = await processSessionDeductions();
    logger.info('[sessionSettlementWorker] sweep completed', {
      processed: result?.processed ?? 0,
      deducted: result?.deducted ?? 0,
      noCredits: result?.noCredits?.length ?? 0,
      deferred: result?.deferred?.length ?? 0,
      errors: result?.errors?.length ?? 0,
    });
    return result;
  } catch (error) {
    logger.error('[sessionSettlementWorker] sweep failed: %s', error?.message || error);
    return null;
  } finally {
    running = false;
  }
}

export function startSessionSettlementWorker() {
  if (process.env.SESSION_SETTLEMENT_WORKER_ENABLED !== 'true') {
    logger.info('[sessionSettlementWorker] SESSION_SETTLEMENT_WORKER_ENABLED != true — not starting');
    return;
  }

  if (intervalHandle) {
    logger.warn('[sessionSettlementWorker] already started, skipping');
    return;
  }

  const intervalMs = resolveIntervalMs();
  logger.info('[sessionSettlementWorker] starting with interval %dms', intervalMs);

  runSessionSettlementSweep().catch((error) => {
    logger.error('[sessionSettlementWorker] startup sweep failed: %s', error?.message || error);
  });

  intervalHandle = setInterval(() => {
    runSessionSettlementSweep().catch((error) => {
      logger.error('[sessionSettlementWorker] interval sweep failed: %s', error?.message || error);
    });
  }, intervalMs);

  if (intervalHandle.unref) intervalHandle.unref();
}

export function stopSessionSettlementWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logger.info('[sessionSettlementWorker] stopped');
}

export const _internal = {
  DEFAULT_INTERVAL_MS,
  MIN_INTERVAL_MS,
  resolveIntervalMs,
};
