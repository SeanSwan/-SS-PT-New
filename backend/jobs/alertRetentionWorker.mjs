/**
 * alertRetentionWorker.mjs
 * ========================
 * SWA-138 S4b — retention for the admin alert surfaces (HY3 A5).
 *
 * Two unbounded stores need pruning:
 *
 *  1. AdminNotification — has expiresAt + a cleanup static that nothing ever
 *     called, so expired rows accumulated forever.
 *  2. notification_read_state — introduced in S4a. One row per (admin, alert)
 *     ack/archive. Computed finance alerts mint NEW stable ids as conditions
 *     recur, so without pruning this table grows without bound. That leak is
 *     mine; this closes it.
 *
 * Conservative by construction, matching sessionSettlementWorker: disabled
 * unless ALERT_RETENTION_WORKER_ENABLED=true, interval-floored, non-overlapping,
 * and it only ever deletes rows older than the configured retention window.
 */
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';
import NotificationReadState from '../models/NotificationReadState.mjs';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const MIN_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_READ_STATE_RETENTION_DAYS = 120;
const MIN_RETENTION_DAYS = 30;

let intervalHandle = null;
let running = false;

function resolveIntervalMs() {
  const configured = Number(process.env.ALERT_RETENTION_WORKER_INTERVAL_MS);
  if (Number.isFinite(configured) && configured >= MIN_INTERVAL_MS) return configured;
  return DEFAULT_INTERVAL_MS;
}

export function resolveReadStateRetentionDays() {
  const configured = Number(process.env.ALERT_READ_STATE_RETENTION_DAYS);
  if (Number.isFinite(configured) && configured >= MIN_RETENTION_DAYS) return configured;
  return DEFAULT_READ_STATE_RETENTION_DAYS;
}

/**
 * Prune read-state rows whose alert is long settled. A row is prunable only if
 * it was acked/archived AND has not been touched inside the retention window —
 * an alert an admin is still actively working is never removed.
 */
export async function pruneReadState(now = new Date()) {
  const days = resolveReadStateRetentionDays();
  const cutoff = new Date(now.getTime() - days * 86400000);
  const removed = await NotificationReadState.destroy({
    where: {
      updatedAt: { [Op.lt]: cutoff },
      [Op.or]: [
        { readAt: { [Op.ne]: null } },
        { archivedAt: { [Op.ne]: null } },
      ],
    },
  });
  return { removed, cutoff, retentionDays: days };
}

/** AdminNotification ships its own expiry cleanup; call it if present. */
export async function pruneExpiredAdminNotifications() {
  try {
    const { default: AdminNotification } = await import('../models/financial/AdminNotification.mjs');
    if (typeof AdminNotification?.cleanupExpiredNotifications !== 'function') {
      return { removed: 0, skipped: 'no cleanup method' };
    }
    const removed = await AdminNotification.cleanupExpiredNotifications();
    return { removed: Number(removed) || 0 };
  } catch (error) {
    logger.warn('[alertRetentionWorker] admin-notification cleanup skipped: %s', error?.message || error);
    return { removed: 0, skipped: 'error' };
  }
}

export async function runAlertRetentionSweep() {
  if (running) {
    logger.info('[alertRetentionWorker] sweep already running, skipping overlap');
    return null;
  }
  running = true;
  try {
    const readState = await pruneReadState();
    const notifications = await pruneExpiredAdminNotifications();
    logger.info(
      '[alertRetentionWorker] pruned %d read-state rows (>%dd) and %d expired notifications',
      readState.removed, readState.retentionDays, notifications.removed,
    );
    return { readState, notifications };
  } catch (error) {
    logger.error('[alertRetentionWorker] sweep failed: %s', error?.message || error);
    return null;
  } finally {
    running = false;
  }
}

export function startAlertRetentionWorker() {
  if (process.env.ALERT_RETENTION_WORKER_ENABLED !== 'true') {
    logger.info('[alertRetentionWorker] ALERT_RETENTION_WORKER_ENABLED != true — not starting');
    return null;
  }
  if (intervalHandle) {
    logger.warn('[alertRetentionWorker] already started, skipping');
    return intervalHandle;
  }
  const intervalMs = resolveIntervalMs();
  logger.info('[alertRetentionWorker] starting with interval %dms', intervalMs);
  runAlertRetentionSweep().catch((error) => {
    logger.error('[alertRetentionWorker] startup sweep failed: %s', error?.message || error);
  });
  intervalHandle = setInterval(() => {
    runAlertRetentionSweep().catch((error) => {
      logger.error('[alertRetentionWorker] interval sweep failed: %s', error?.message || error);
    });
  }, intervalMs);
  return intervalHandle;
}

export function stopAlertRetentionWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export const _internal = { resolveIntervalMs, MIN_INTERVAL_MS, MIN_RETENTION_DAYS };
