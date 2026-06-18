/**
 * JOB: Marketing Publisher Worker
 * ===============================
 * Runs due SwanStudios-native social publishing jobs on a short interval.
 */

import nativeSocialPublishingService from '../services/nativeSocialPublishingService.mjs';
import {
  getStorageErrorCode,
  isSocialPublishingStorageUnavailableError,
} from '../services/socialPublishingStorageErrors.mjs';
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

export const startMarketingPublisherWorker = () => worker.start();
export const stopMarketingPublisherWorker = () => worker.stop();
export default worker;
