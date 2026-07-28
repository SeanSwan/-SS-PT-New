/**
 * Provider-channel notification delivery retry processor.
 *
 * Email, SMS, and push retries only run through explicitly supplied provider
 * handlers. Missing providers are recorded as skipped so delivery analytics stay
 * honest without pretending an external send happened.
 */
import logger from '../../utils/logger.mjs';
import { getNotification } from '../../models/index.mjs';
import { recordNotificationDelivery } from './notificationDeliveryLedgerService.mjs';
import {
  claimNotificationDeliveryRetry,
  getRetryableNotificationDeliveries,
} from './notificationDeliveryRetryQueueService.mjs';

const PROVIDER_RETRY_CHANNELS = ['email', 'sms', 'push'];
const RETRY_STATUSES = ['sent', 'pending', 'failed', 'skipped'];

const toPositiveInt = (value, fallback = null) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : fallback;
};

const providerRetryMetadataFor = (delivery, channel) => ({
  retry: { deliveryId: delivery?.id || null, providerChannel: channel },
});

const normalizeProviderChannels = (channels) => {
  const source = Array.isArray(channels) && channels.length ? channels : PROVIDER_RETRY_CHANNELS;
  const normalized = source
    .map((channel) => String(channel || '').trim().toLowerCase())
    .filter((channel) => PROVIDER_RETRY_CHANNELS.includes(channel));
  const unique = [...new Set(normalized)];
  return unique.length ? unique : PROVIDER_RETRY_CHANNELS;
};

const providerChannelFor = (delivery, claimedDelivery) => {
  const [channel] = normalizeProviderChannels([claimedDelivery?.channel || delivery?.channel]);
  return channel;
};

const providerHandlerFor = (providers = {}, channel) => {
  const handler = providers && typeof providers === 'object' ? providers[channel] : null;
  return typeof handler === 'function' ? handler : null;
};

const normalizeProviderRetryResult = (result = {}) => {
  const payload = result && typeof result === 'object' ? result : {};
  const status = String(payload.status || 'failed').trim().toLowerCase();
  return {
    status: RETRY_STATUSES.includes(status) ? status : 'failed',
    providerMessageId: payload.providerMessageId || null,
    errorCode: payload.errorCode || null,
    errorMessage: payload.errorMessage || null,
  };
};

const incrementRetrySummary = (summary, status) => {
  const key = RETRY_STATUSES.includes(status) ? status : 'failed';
  summary[key] += 1;
};

const isTerminalNotification = (notification, now = new Date()) => {
  if (!notification) return true;
  if (notification.read || notification.archivedAt) return true;
  if (!notification.expiresAt) return false;

  const expiresAt = notification.expiresAt instanceof Date
    ? notification.expiresAt
    : new Date(notification.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt <= now;
};

async function recordProviderRetryResult({
  delivery,
  claimedDelivery,
  channel,
  status,
  errorCode,
  errorMessage,
  providerMessageId = null,
}) {
  const notificationId = toPositiveInt(claimedDelivery?.notificationId, toPositiveInt(delivery?.notificationId));
  const userId = toPositiveInt(claimedDelivery?.userId, toPositiveInt(delivery?.userId));
  const attemptCount = toPositiveInt(
    claimedDelivery?.attemptCount,
    (toPositiveInt(delivery?.attemptCount, 0) || 0) + 1,
  );

  const result = await recordNotificationDelivery({
    notificationId,
    userId,
    channel,
    status,
    attemptCount,
    providerMessageId,
    errorCode,
    errorMessage,
    metadata: providerRetryMetadataFor(delivery, channel),
  });

  if (!result.success) {
    logger.warn(`Provider notification retry ledger write skipped: ${result.error}`);
  }
}

export async function retryProviderNotificationDeliveries(options = {}) {
  const summary = {
    success: true,
    attempted: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
    stale: 0,
  };

  try {
    const channels = normalizeProviderChannels(options.channels);
    const retryOptions = { ...options, channels };
    const deliveries = await getRetryableNotificationDeliveries(retryOptions);
    summary.attempted = deliveries.length;

    if (deliveries.length === 0) return summary;

    const Notification = getNotification();
    for (const delivery of deliveries) {
      const claim = await claimNotificationDeliveryRetry(delivery, retryOptions);
      if (!claim.success) {
        summary.stale += 1;
        continue;
      }

      const claimedDelivery = claim.delivery || delivery;
      const channel = providerChannelFor(delivery, claimedDelivery);
      const notificationId = toPositiveInt(claimedDelivery.notificationId, toPositiveInt(delivery.notificationId));
      const notification = notificationId ? await Notification.findByPk(notificationId) : null;

      if (!notification) {
        await recordProviderRetryResult({
          delivery,
          claimedDelivery,
          channel,
          status: 'skipped',
          errorCode: 'notification_not_found',
          errorMessage: 'Notification record missing during provider retry.',
        });
        summary.skipped += 1;
        continue;
      }

      if (isTerminalNotification(notification, options.now)) {
        await recordProviderRetryResult({
          delivery,
          claimedDelivery,
          channel,
          status: 'skipped',
          errorCode: 'notification_not_retryable',
          errorMessage: 'Notification already read, archived, or expired during provider retry.',
        });
        summary.skipped += 1;
        continue;
      }

      const provider = providerHandlerFor(options.providers, channel);
      if (!provider) {
        await recordProviderRetryResult({
          delivery,
          claimedDelivery,
          channel,
          status: 'skipped',
          errorCode: 'provider_not_configured',
          errorMessage: `No ${channel} notification provider configured for retry.`,
        });
        summary.skipped += 1;
        continue;
      }

      try {
        const providerResult = normalizeProviderRetryResult(await provider({
          delivery,
          claimedDelivery,
          notification,
          channel,
        }));
        await recordProviderRetryResult({
          delivery,
          claimedDelivery,
          channel,
          status: providerResult.status,
          providerMessageId: providerResult.providerMessageId,
          errorCode: providerResult.errorCode,
          errorMessage: providerResult.errorMessage,
        });
        incrementRetrySummary(summary, providerResult.status);
      } catch (providerError) {
        await recordProviderRetryResult({
          delivery,
          claimedDelivery,
          channel,
          status: 'failed',
          errorCode: 'provider_exception',
          errorMessage: providerError?.message || 'Provider retry failed.',
        });
        summary.failed += 1;
      }
    }

    return summary;
  } catch (error) {
    logger.error('Provider notification delivery retry processor failed:', error.message, { stack: error.stack });
    return { ...summary, success: false, error: error.message };
  }
}