import logger from '../utils/logger.mjs';
import {
  deliverNotificationWithPolicy,
  emitNotificationToUser,
} from './communications/notificationDeliveryPolicyService.mjs';
import { recordCommunicationAudit } from './communications/communicationAuditLogService.mjs';
import { recordNotificationDelivery } from './communications/notificationDeliveryLedgerService.mjs';
import {
  claimNotificationDeliveryRetry,
  getRetryableNotificationDeliveries,
} from './communications/notificationDeliveryRetryQueueService.mjs';
import { getNotification, getUser } from '../models/index.mjs';
import { getIO } from '../socket/socketManager.mjs';
import {
  isNotificationIdempotencyConflict,
  normalizeNotificationCreateOptions,
} from './notificationPayloadService.mjs';
import { mergeGroupedNotification } from './communications/notificationGroupingService.mjs';

const RETRY_STATUSES = ['sent', 'pending', 'failed', 'skipped'];

const toPositiveInt = (value, fallback = null) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : fallback;
};

const retryMetadataFor = (delivery) => ({
  retry: { deliveryId: delivery?.id || null },
});

const incrementRetrySummary = (summary, status) => {
  const key = RETRY_STATUSES.includes(status) ? status : 'failed';
  summary[key] += 1;
};

const auditDeliveryStatusFor = (channelStatuses = {}) => {
  if (channelStatuses.in_app) return channelStatuses.in_app;
  const statuses = Object.values(channelStatuses);
  return ['failed', 'pending', 'sent', 'skipped'].find((status) => statuses.includes(status)) || 'skipped';
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

function emitNotificationToAdminRoom(notification) {
  try {
    const io = getIO();
    if (!io) return;

    io.to('admin').emit('notification:new', notification);
  } catch (error) {
    logger.warn(`Socket emit to admin room failed: ${error.message}`);
  }
}

async function recordRetryResult({ delivery, claimedDelivery, status, errorCode, errorMessage }) {
  const notificationId = toPositiveInt(claimedDelivery?.notificationId, toPositiveInt(delivery?.notificationId));
  const userId = toPositiveInt(claimedDelivery?.userId, toPositiveInt(delivery?.userId));
  const attemptCount = toPositiveInt(
    claimedDelivery?.attemptCount,
    (toPositiveInt(delivery?.attemptCount, 0) || 0) + 1,
  );

  const result = await recordNotificationDelivery({
    notificationId,
    userId,
    channel: 'in_app',
    status,
    attemptCount,
    errorCode,
    errorMessage,
    metadata: retryMetadataFor(delivery),
  });

  if (!result.success) {
    logger.warn(`Notification retry ledger write skipped: ${result.error}`);
  }
}

export async function retryInAppNotificationDeliveries(options = {}) {
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
    const retryOptions = { ...options, channels: ['in_app'] };
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
      const notificationId = toPositiveInt(claimedDelivery.notificationId, toPositiveInt(delivery.notificationId));
      const notification = notificationId ? await Notification.findByPk(notificationId) : null;
      if (!notification) {
        await recordRetryResult({
          delivery,
          claimedDelivery,
          status: 'skipped',
          errorCode: 'notification_not_found',
          errorMessage: 'Notification record missing during retry.',
        });
        summary.skipped += 1;
        continue;
      }

      if (isTerminalNotification(notification, options.now)) {
        await recordRetryResult({
          delivery,
          claimedDelivery,
          status: 'skipped',
          errorCode: 'notification_not_retryable',
          errorMessage: 'Notification already read, archived, or expired during retry.',
        });
        summary.skipped += 1;
        continue;
      }

      const userId = toPositiveInt(claimedDelivery.userId, toPositiveInt(delivery.userId, notification.userId));
      const status = await emitNotificationToUser(userId, notification);
      await recordRetryResult({ delivery, claimedDelivery, status });
      incrementRetrySummary(summary, status);
    }

    return summary;
  } catch (error) {
    logger.error('Notification delivery retry processor failed:', error.message, { stack: error.stack });
    return { ...summary, success: false, error: error.message };
  }
}

export { retryProviderNotificationDeliveries } from './communications/notificationProviderRetryService.mjs';
async function deliverAndAuditNotification({ notificationPayload, notification, options, action }) {
  const deliverySummary = await deliverNotificationWithPolicy({
    notificationPayload,
    notification,
    channels: options?.channels,
    now: options?.deliveryPolicyNow || options?.now,
  });
  const deliveryStatus = auditDeliveryStatusFor(deliverySummary.channelStatuses);

  const auditResult = await recordCommunicationAudit({
    eventId: notificationPayload.idempotencyKey || `notification:${notification.id}`,
    actorId: notificationPayload.senderId,
    recipientId: notificationPayload.userId,
    notificationId: notification.id,
    action,
    entityType: notificationPayload.relatedEntityType || notificationPayload.type,
    entityId: notificationPayload.relatedEntityId,
    metadata: {
      type: notificationPayload.type,
      category: notificationPayload.category,
      priority: notificationPayload.priority,
      deliveryStatus,
      deliveryChannels: deliverySummary.channelStatuses,
    },
  });
  if (!auditResult.success) {
    logger.warn(`Communication audit skipped for notification ${notification.id}: ${auditResult.error}`);
  }
}

export const createNotification = async (options) => {
  try {
    const Notification = getNotification();
    if (!Notification) {
      logger.error('Notification model not initialized');
      return { success: false, error: 'Model not initialized' };
    }

    const notificationPayload = normalizeNotificationCreateOptions(options);
    if (!notificationPayload.userId) {
      return { success: false, error: 'Recipient userId is required' };
    }

    if (notificationPayload.idempotencyKey) {
      const existingNotification = await Notification.findOne({
        where: {
          userId: notificationPayload.userId,
          idempotencyKey: notificationPayload.idempotencyKey,
        },
      });

      if (existingNotification) {
        return { success: true, notification: existingNotification, idempotentReplay: true };
      }
    }

    const groupedResult = await mergeGroupedNotification({
      Notification,
      notificationPayload,
      grouping: options?.grouping,
    });
    if (groupedResult.idempotentReplay) {
      return { success: true, notification: groupedResult.notification, idempotentReplay: true, grouped: true };
    }
    if (groupedResult.notification) {
      await deliverAndAuditNotification({
        notificationPayload,
        notification: groupedResult.notification,
        options,
        action: 'notification.grouped',
      });
      return { success: true, notification: groupedResult.notification, grouped: true };
    }

    let notification;
    try {
      notification = await Notification.create(notificationPayload);
    } catch (createError) {
      if (!notificationPayload.idempotencyKey || !isNotificationIdempotencyConflict(createError)) {
        throw createError;
      }

      notification = await Notification.findOne({
        where: {
          userId: notificationPayload.userId,
          idempotencyKey: notificationPayload.idempotencyKey,
        },
      });

      if (!notification) throw createError;
      return { success: true, notification, idempotentReplay: true };
    }

    logger.info(`Created ${notificationPayload.type} notification for user ${notificationPayload.userId}`);
    await deliverAndAuditNotification({
      notificationPayload,
      notification,
      options,
      action: 'notification.created',
    });

    return { success: true, notification };
  } catch (error) {
    logger.error('Error in createNotification:', error.message, { stack: error.stack });
    return { success: false, error: error.message };
  }
};

export const createAndEmit = createNotification;

export const createAdminNotification = async (options = {}) => {
  try {
    const User = getUser();
    if (!User) {
      logger.error('User model not initialized');
      return { success: false, error: 'Model not initialized' };
    }

    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    const notifications = [];

    for (const admin of adminUsers) {
      const result = await createNotification({
        ...options,
        userId: admin.id,
        type: options.type || 'admin',
        category: options.category || 'admin',
        priority: options.priority || 'high',
        status: options.status || 'unread',
        read: false,
      });

      if (!result.success) {
        throw new Error(result.error || 'Admin notification creation failed');
      }

      notifications.push(result.notification);
      if (!result.idempotentReplay) {
        emitNotificationToAdminRoom(result.notification);
      }
    }

    logger.info(`Created ${options.type || 'admin'} notification for ${adminUsers.length} admin users`);
    return { success: true, notifications };
  } catch (error) {
    logger.error('Error in createAdminNotification:', error.message, { stack: error.stack });
    return { success: false, error: error.message };
  }
};

export const createAdminAndEmit = createAdminNotification;