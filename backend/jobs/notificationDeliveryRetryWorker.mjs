/**
 * JOB: Notification Delivery Retry Worker
 * =======================================
 * Runs due in-app NotificationDelivery retry rows through the canonical
 * notification delivery service. Provider-specific email/SMS/push retries are
 * intentionally out of scope for this worker.
 */

import { retryInAppNotificationDeliveries } from '../services/notificationDeliveryService.mjs';
import logger from '../utils/logger.mjs';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_LIMIT = 25;

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createNotificationDeliveryRetryWorker({
  processor = retryInAppNotificationDeliveries,
  intervalMs = positiveInt(process.env.NOTIFICATION_DELIVERY_RETRY_INTERVAL_MS, DEFAULT_INTERVAL_MS),
  enabled = process.env.NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED === 'true',
  limit = positiveInt(process.env.NOTIFICATION_DELIVERY_RETRY_LIMIT, DEFAULT_LIMIT),
  log = logger,
} = {}) {
  let timer = null;
  let running = false;

  const runOnce = async () => {
    if (running) return { success: true, skipped: true, reason: 'already_running' };
    running = true;
    try {
      const result = await processor({ limit });
      if (result?.attempted > 0) {
        log.info(
          `[notificationDeliveryRetry] processed ${result.attempted} retry candidate(s): `
          + `sent=${result.sent || 0} skipped=${result.skipped || 0} failed=${result.failed || 0} stale=${result.stale || 0}`,
        );
      }
      return result;
    } catch (err) {
      const message = err?.message || String(err);
      log.error(`[notificationDeliveryRetry] run failed: ${message}`);
      return {
        success: false,
        attempted: 0,
        sent: 0,
        pending: 0,
        failed: 1,
        skipped: 0,
        stale: 0,
        error: message,
      };
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (timer) return false;
    if (!enabled) {
      log.info('[notificationDeliveryRetry] worker disabled; set NOTIFICATION_DELIVERY_RETRY_WORKER_ENABLED=true to start');
      return false;
    }
    timer = setInterval(() => { runOnce(); }, intervalMs);
    timer.unref?.();
    log.info(`[notificationDeliveryRetry] worker started at ${intervalMs}ms interval`);
    return true;
  };

  const stop = () => {
    if (!timer) return false;
    clearInterval(timer);
    timer = null;
    log.info('[notificationDeliveryRetry] worker stopped');
    return true;
  };

  return { start, stop, runOnce };
}

const worker = createNotificationDeliveryRetryWorker();

export const startNotificationDeliveryRetryWorker = () => worker.start();
export const stopNotificationDeliveryRetryWorker = () => worker.stop();
export default worker;