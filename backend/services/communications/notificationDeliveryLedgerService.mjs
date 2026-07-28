/**
 * Notification delivery ledger service.
 *
 * Records per-channel delivery state for canonical notifications without
 * blocking notification creation when analytics persistence is unavailable.
 */
import logger from '../../utils/logger.mjs';
import { getNotificationDelivery } from '../../models/index.mjs';

export const DELIVERY_CHANNELS = ['in_app', 'push', 'email', 'sms'];
export const DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'skipped'];

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const toOptionalString = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
};

const toPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
};

export function normalizeDeliveryChannel(channel = 'in_app') {
  const normalized = String(channel || '').trim().toLowerCase();
  return DELIVERY_CHANNELS.includes(normalized) ? normalized : null;
}

export function normalizeDeliveryStatus(status = 'pending') {
  const normalized = String(status || '').trim().toLowerCase();
  return DELIVERY_STATUSES.includes(normalized) ? normalized : null;
}

export function buildNotificationDeliveryPayload(options = {}) {
  const notificationId = toPositiveInt(options.notificationId);
  const userId = toPositiveInt(options.userId);
  const channel = normalizeDeliveryChannel(options.channel || 'in_app');
  const status = normalizeDeliveryStatus(options.status || 'pending');
  if (!notificationId || !userId || !channel || !status) return null;

  const hasAttemptCount = options.attemptCount !== undefined && options.attemptCount !== null;
  const rawAttemptCount = Number(options.attemptCount);
  const attemptCount = hasAttemptCount
    ? Math.max(0, Number.isFinite(rawAttemptCount) ? Math.floor(rawAttemptCount) : 0)
    : (status === 'pending' || status === 'skipped' ? 0 : 1);

  return {
    notificationId,
    userId,
    channel,
    status,
    attemptCount,
    lastAttemptAt: options.lastAttemptAt ? new Date(options.lastAttemptAt) : (attemptCount > 0 ? new Date() : null),
    providerMessageId: toOptionalString(options.providerMessageId, 160),
    errorCode: toOptionalString(options.errorCode, 120),
    errorMessage: toOptionalString(options.errorMessage, 2000),
    metadata: toPlainObject(options.metadata),
  };
}

export async function recordNotificationDelivery(options = {}) {
  const payload = buildNotificationDeliveryPayload(options);
  if (!payload) {
    return { success: false, error: 'Valid notificationId, userId, channel, and status are required.' };
  }

  try {
    const NotificationDelivery = getNotificationDelivery();
    if (!NotificationDelivery) return { success: false, error: 'NotificationDelivery model not initialized.' };

    const [delivery, created] = await NotificationDelivery.findOrCreate({
      where: {
        notificationId: payload.notificationId,
        userId: payload.userId,
        channel: payload.channel,
      },
      defaults: payload,
    });

    if (!created) {
      const previousAttempts = Number(delivery.attemptCount) || 0;
      await delivery.update({
        ...payload,
        attemptCount: Math.max(previousAttempts, payload.attemptCount),
      });
    }

    return { success: true, delivery, created };
  } catch (error) {
    logger.warn(`Notification delivery ledger write failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
export const recordNotificationOpened = (options = {}) => recordNotificationDelivery({
  ...options,
  channel: options.channel || 'in_app',
  status: 'opened',
  attemptCount: 0,
});

export const recordNotificationClicked = (options = {}) => recordNotificationDelivery({
  ...options,
  channel: options.channel || 'in_app',
  status: 'clicked',
  attemptCount: 0,
});