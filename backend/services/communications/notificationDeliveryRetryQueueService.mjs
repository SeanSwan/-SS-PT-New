/**
 * Notification delivery retry queue service.
 *
 * Selects and claims due NotificationDelivery rows for a future delivery worker.
 * This service does not send notifications; it only provides retry-safe queue state.
 */
import logger from '../../utils/logger.mjs';
import { getNotificationDelivery, Op } from '../../models/index.mjs';

export const RETRYABLE_DELIVERY_STATUSES = ['failed', 'pending'];

export const DEFAULT_DELIVERY_RETRY_OPTIONS = Object.freeze({
  maxAttempts: 3,
  baseDelayMs: 60_000,
  maxDelayMs: 15 * 60_000,
  limit: 50,
  queryMultiplier: 5,
});

const toNonNegativeInt = (value) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 0;
};

const toPositiveInt = (value, fallback) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : fallback;
};

const normalizeDate = (value, fallback = new Date()) => {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const normalizeMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {};
};

const normalizeStatuses = (statuses) => {
  const source = Array.isArray(statuses) && statuses.length ? statuses : RETRYABLE_DELIVERY_STATUSES;
  const normalized = source
    .map((status) => String(status || '').trim().toLowerCase())
    .filter((status) => RETRYABLE_DELIVERY_STATUSES.includes(status));
  return [...new Set(normalized)].length ? [...new Set(normalized)] : RETRYABLE_DELIVERY_STATUSES;
};

const normalizeChannels = (channels) => {
  if (!Array.isArray(channels) || channels.length === 0) return [];
  return [...new Set(channels
    .map((channel) => String(channel || '').trim().toLowerCase())
    .filter(Boolean))];
};

const plainDelivery = (delivery) => (
  delivery && typeof delivery.get === 'function' ? delivery.get({ plain: true }) : delivery
);

const deliveryStatus = (delivery) => String(delivery?.status || '').trim().toLowerCase();

export function getNotificationDeliveryRetryDelayMs(attemptCount, options = {}) {
  const attempt = toNonNegativeInt(attemptCount);
  if (attempt <= 0) return 0;

  const baseDelayMs = toPositiveInt(options.baseDelayMs, DEFAULT_DELIVERY_RETRY_OPTIONS.baseDelayMs);
  const maxDelayMs = toPositiveInt(options.maxDelayMs, DEFAULT_DELIVERY_RETRY_OPTIONS.maxDelayMs);
  return Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
}

export function isRetryableNotificationDelivery(delivery, options = {}) {
  const row = plainDelivery(delivery);
  if (!row) return false;

  const statuses = normalizeStatuses(options.statuses);
  const channels = normalizeChannels(options.channels);
  if (!statuses.includes(deliveryStatus(row))) return false;
  if (channels.length && !channels.includes(String(row.channel || '').toLowerCase())) return false;

  const attemptCount = toNonNegativeInt(row.attemptCount);
  const maxAttempts = toPositiveInt(options.maxAttempts, DEFAULT_DELIVERY_RETRY_OPTIONS.maxAttempts);
  if (attemptCount >= maxAttempts) return false;

  const retryDelayMs = getNotificationDeliveryRetryDelayMs(attemptCount, options);
  if (retryDelayMs <= 0 || !row.lastAttemptAt) return true;

  const now = normalizeDate(options.now);
  const lastAttemptAt = normalizeDate(row.lastAttemptAt, null);
  if (!lastAttemptAt) return true;
  return now.getTime() - lastAttemptAt.getTime() >= retryDelayMs;
}

export function selectRetryableNotificationDeliveries(deliveries = [], options = {}) {
  const limit = toPositiveInt(options.limit, DEFAULT_DELIVERY_RETRY_OPTIONS.limit);
  return (Array.isArray(deliveries) ? deliveries : [])
    .filter((delivery) => isRetryableNotificationDelivery(delivery, options))
    .slice(0, limit);
}

export async function getRetryableNotificationDeliveries(options = {}) {
  try {
    const NotificationDelivery = getNotificationDelivery();
    if (!NotificationDelivery) return [];

    const limit = toPositiveInt(options.limit, DEFAULT_DELIVERY_RETRY_OPTIONS.limit);
    const queryMultiplier = toPositiveInt(options.queryMultiplier, DEFAULT_DELIVERY_RETRY_OPTIONS.queryMultiplier);
    const maxAttempts = toPositiveInt(options.maxAttempts, DEFAULT_DELIVERY_RETRY_OPTIONS.maxAttempts);
    const statuses = normalizeStatuses(options.statuses);
    const channels = normalizeChannels(options.channels);
    const where = {
      status: { [Op.in]: statuses },
      attemptCount: { [Op.lt]: maxAttempts },
    };

    if (channels.length) where.channel = { [Op.in]: channels };

    const candidates = await NotificationDelivery.findAll({
      where,
      order: [
        ['lastAttemptAt', 'ASC'],
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: limit * queryMultiplier,
    });

    return selectRetryableNotificationDeliveries(candidates, { ...options, limit });
  } catch (error) {
    logger.warn(`Notification delivery retry queue unavailable: ${error.message}`);
    return [];
  }
}

export async function claimNotificationDeliveryRetry(delivery, options = {}) {
  const row = plainDelivery(delivery);
  const deliveryId = toPositiveInt(row?.id, null);
  if (!row || !deliveryId) {
    return { success: false, error: 'NotificationDelivery row id is required.' };
  }

  if (!isRetryableNotificationDelivery(row, options)) {
    return { success: false, error: 'NotificationDelivery row is not retryable.' };
  }

  try {
    const NotificationDelivery = getNotificationDelivery();
    if (!NotificationDelivery || typeof NotificationDelivery.update !== 'function') {
      return { success: false, error: 'NotificationDelivery model is not available.' };
    }

    const now = normalizeDate(options.now);
    const previousAttemptCount = toNonNegativeInt(row.attemptCount);
    const statuses = normalizeStatuses(options.statuses);
    const metadata = normalizeMetadata(row.metadata);
    const payload = {
      status: 'pending',
      attemptCount: previousAttemptCount + 1,
      lastAttemptAt: now,
      errorCode: null,
      errorMessage: null,
      metadata: {
        ...metadata,
        retry: {
          claimedAt: now.toISOString(),
          previousAttemptCount,
          previousStatus: deliveryStatus(row),
        },
      },
    };

    const [updatedCount] = await NotificationDelivery.update(payload, {
      where: {
        id: deliveryId,
        status: { [Op.in]: statuses },
        attemptCount: previousAttemptCount,
      },
    });

    if (toNonNegativeInt(updatedCount) <= 0) {
      return {
        success: false,
        error: 'NotificationDelivery row was already claimed or is no longer retryable.',
      };
    }

    const updatedDelivery = typeof NotificationDelivery.findByPk === 'function'
      ? await NotificationDelivery.findByPk(deliveryId)
      : { ...row, ...payload };
    return { success: true, delivery: updatedDelivery || { ...row, ...payload } };
  } catch (error) {
    logger.warn(`Notification delivery retry claim failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}