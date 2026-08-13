/**
 * JOB: Marketing Publisher Worker
 * ===============================
 * Runs due SwanStudios-native social publishing jobs on a short interval.
 *
 * NOTE: server.mjs already calls this worker bootstrap unconditionally. Until
 * the backend entrypoint is split into a dedicated jobs hub, this module also
 * starts/stops the schedule settlement worker through its own env gate.
 */

import nativeSocialPublishingService from '../services/nativeSocialPublishingService.mjs';
import {
  getStorageErrorCode,
  isSocialPublishingStorageUnavailableError,
} from '../services/socialPublishingStorageErrors.mjs';
import { startSessionSettlementWorker, stopSessionSettlementWorker } from './sessionSettlementWorker.mjs';
import logger from '../utils/logger.mjs';

export function createMarketingPublisherWorker({
  service = nativeSocialPublishingService,
  intervalMs = Number(process.env.MARKETING_PUBLISHER_WORKER_INTERVAL_MS || 60000),
  enabled = process.env.MARKETING_PUBLISHER_WORKER_ENABLED !== 'false',
  limit = 10,
  log = logger,
} = {}) {
  let timer = null;
  let running = false;
  let disabledReason = null;

  const disableForUnavailableStorage = (err) => {
    disabledReason = 'storage_unavailable';
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    log.warn(
      '[marketingPublisher] worker disabled: native social publishing storage is unavailable',
      {
        reason: disabledReason,
        code: getStorageErrorCode(err),
      },
    );
  };

  const runOnce = async () => {
    if (disabledReason) return [];
    if (running) return [];
    running = true;
    try {
      // Reap first. A job stranded in 'running' by a crash or a deploy is
      // invisible to the claim query below (which only looks at 'scheduled'),
      // so without this it stays in-flight forever and its history row never
      // resolves. Reaping only CLOSES jobs — it never publishes or requeues —
      // so it cannot interfere with the due-job pass that follows.
      if (typeof service.reapStuckJobs === 'function') {
        const reaped = await service.reapStuckJobs({});
        if (reaped.length > 0) log.warn(`[marketingPublisher] reaped ${reaped.length} stuck job(s)`);
      }

      const result = await service.runDueJobs({ limit });
      if (result.length > 0) log.info(`[marketingPublisher] processed ${result.length} due job(s)`);
      return result;
    } catch (err) {
      if (isSocialPublishingStorageUnavailableError(err)) {
        disableForUnavailableStorage(err);
        return [];
      }
      log.error(`[marketingPublisher] run failed: ${err.message}`);
      return [];
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (!enabled || timer) return false;
    timer = setInterval(() => { runOnce(); }, intervalMs);
    timer.unref?.();
    log.info(`[marketingPublisher] worker started at ${intervalMs}ms interval`);
    return true;
  };

  const stop = () => {
    if (!timer) return false;
    clearInterval(timer);
    timer = null;
    log.info('[marketingPublisher] worker stopped');
    return true;
  };

  return { start, stop, runOnce };
}

const worker = createMarketingPublisherWorker();

export const startMarketingPublisherWorker = () => {
  startSessionSettlementWorker();
  return worker.start();
};

export const stopMarketingPublisherWorker = () => {
  stopSessionSettlementWorker();
  return worker.stop();
};

export default worker;
