/**
 * JOB: Marketing Publisher Worker
 * ===============================
 * Runs due SwanStudios-native social publishing jobs on a short interval.
 */

import nativeSocialPublishingService from '../services/nativeSocialPublishingService.mjs';
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

  const runOnce = async () => {
    if (running) return [];
    running = true;
    try {
      const result = await service.runDueJobs({ limit });
      if (result.length > 0) log.info(`[marketingPublisher] processed ${result.length} due job(s)`);
      return result;
    } catch (err) {
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
