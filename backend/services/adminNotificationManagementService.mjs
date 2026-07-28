/**
 * Admin notification management service.
 * Keeps admin notification list, serialization, and bulk actions out of the route file.
 */

import { getAllModels, Op } from '../models/index.mjs';
import { buildCommunicationRetentionPolicyReport } from './communications/communicationRetentionPolicyService.mjs';
import {
  buildLedgerDeliveryByAdminNotification,
  serializeDeliveryHealthRow,
  summarizeDeliveryHealth,
} from './adminNotificationDeliveryHealthLedgerService.mjs';

const emptyStats = { total: 0, unread: 0, highPriority: 0, actionRequired: 0 };
export const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch (error) {
    return {};
  }
};

const toNonNegativeInt = (value) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 0;
};

const normalizeDelivery = (metadata = {}) => {
  const delivery = metadata.delivery;
  if (!delivery || typeof delivery !== 'object') return null;

  const created = toNonNegativeInt(delivery.created);
  const failed = toNonNegativeInt(delivery.failed);
  const minimumAttempted = created + failed;
  const attempted = Math.max(toNonNegativeInt(delivery.attempted), minimumAttempted);

  if (attempted <= 0 && minimumAttempted <= 0) return null;

  return { attempted, created, failed };
};

const fallbackDelivery = (audienceCount) => ({
  attempted: audienceCount,
  created: audienceCount,
  failed: 0,
});

const mapAdminTypeToUi = (adminType, metadata) => {
  if (metadata?.type) return metadata.type;

  const alertTypes = ['security_alert', 'performance_alert', 'payment_failed', 'refund_request'];
  const marketingTypes = ['purchase', 'high_value_purchase', 'revenue_milestone'];

  if (alertTypes.includes(adminType)) return 'alert';
  if (marketingTypes.includes(adminType)) return 'marketing';
  if (adminType === 'new_user') return 'user';
  return 'system';
};

export const serializeAdminNotification = (notification, adminCount) => {
  const metadata = parseMetadata(notification.metadata);
  const audience = metadata.audience || { type: 'all', count: adminCount };
  const channels = Array.isArray(metadata.channels) ? metadata.channels : ['in-app'];
  const audienceCount = Number(audience.count || adminCount || 0);
  const delivery = normalizeDelivery(metadata) || fallbackDelivery(audienceCount);
  const status = notification.actionRequired && !notification.actionTaken ? 'scheduled' : 'sent';

  return {
    id: notification.id,
    title: notification.title,
    content: notification.message,
    type: mapAdminTypeToUi(notification.type, metadata),
    status,
    audience: { type: audience.type || 'all', count: audienceCount },
    channels,
    createdAt: notification.createdAt,
    scheduledFor: notification.expiresAt || null,
    sentAt: notification.createdAt,
    metrics: {
      sent: delivery.attempted,
      delivered: delivery.created,
      failed: delivery.failed,
      opened: notification.isRead ? delivery.created : 0,
      clicked: 0,
    },
    template: metadata.template || null,
  };
};

const fallbackSummary = (notifications) => ({
  total: notifications.length,
  unread: notifications.filter((item) => !item.isRead).length,
  highPriority: notifications.filter((item) => ['high', 'critical'].includes(item.priority)).length,
  actionRequired: notifications.filter((item) => item.actionRequired && !item.actionTaken).length,
});

const emptyListResponse = () => ({
  statusCode: 200,
  body: { success: true, notifications: [], stats: emptyStats, degraded: true },
});

export async function listAdminNotifications() {
  try {
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    const User = models.User;

    if (!AdminNotification) return emptyListResponse();

    const adminCount = User ? await User.count({ where: { role: 'admin' } }) : 0;
    let notifications = [];

    try {
      notifications = await AdminNotification.findAll({
        where: { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] },
        order: [['createdAt', 'DESC']],
        limit: 200,
        raw: true,
      });
    } catch (findErr) {
      console.warn('[adminNotifications] findAll failed (table may be missing columns):', findErr.message);
      return emptyListResponse();
    }

    let summary;
    try {
      summary = AdminNotification.getNotificationSummary
        ? await AdminNotification.getNotificationSummary()
        : fallbackSummary(notifications);
    } catch (summaryErr) {
      console.warn('[adminNotifications] getNotificationSummary failed:', summaryErr.message);
      summary = { ...fallbackSummary(notifications), highPriority: 0, actionRequired: 0 };
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        notifications: notifications.map((notification) => {
          try {
            return serializeAdminNotification(notification, adminCount);
          } catch {
            return {
              id: notification.id,
              title: notification.title || 'Notification',
              content: notification.message || '',
              type: 'system',
            };
          }
        }),
        stats: summary,
      },
    };
  } catch (error) {
    console.error('[adminNotifications] Error fetching notifications:', error.message);
    return {
      statusCode: 500,
      body: { success: false, message: 'Failed to fetch notifications', degraded: true },
    };
  }
}

export async function getAdminNotificationDeliveryHealth({ limit = 50 } = {}) {
  try {
    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    if (!AdminNotification) {
      return {
        statusCode: 500,
        body: { success: false, message: 'Notification model unavailable' },
      };
    }

    const cappedLimit = Math.min(Math.max(toNonNegativeInt(limit) || 50, 1), 200);
    const notifications = await AdminNotification.findAll({
      attributes: ['id', 'title', 'metadata', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: cappedLimit,
      raw: true,
    });

    const ledgerDeliveryByAdminNotification = await buildLedgerDeliveryByAdminNotification({
      models,
      adminNotificationIds: notifications.map((notification) => notification.id),
    });

    const recentBroadcasts = notifications
      .map((notification) => serializeDeliveryHealthRow(notification, ledgerDeliveryByAdminNotification))
      .filter(Boolean);

    return {
      statusCode: 200,
      body: {
        success: true,
        summary: summarizeDeliveryHealth(recentBroadcasts),
        recentBroadcasts,
      },
    };
  } catch (error) {
    console.error('[adminNotifications] Error fetching delivery health:', error.message);
    return {
      statusCode: 500,
      body: { success: false, message: 'Failed to fetch delivery health', degraded: true },
    };
  }
}

export async function getAdminNotificationRetentionReport(options = {}) {
  try {
    const retention = await buildCommunicationRetentionPolicyReport(options);
    return {
      statusCode: 200,
      body: { success: true, retention },
    };
  } catch (error) {
    console.error('[adminNotifications] Error fetching retention report:', error.message);
    return {
      statusCode: 500,
      body: { success: false, message: 'Failed to fetch retention report', degraded: true },
    };
  }
}

export async function bulkAdminNotificationAction({ ids, action, adminUserId }) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { statusCode: 400, body: { success: false, message: 'ids must be a non-empty array' } };
    }

    if (!['archive', 'delete'].includes(action)) {
      return { statusCode: 400, body: { success: false, message: "action must be 'archive' or 'delete'" } };
    }

    const models = getAllModels();
    const AdminNotification = models.AdminNotification;
    if (!AdminNotification) {
      return { statusCode: 500, body: { success: false, message: 'Notification model unavailable' } };
    }

    let processed = 0;
    if (action === 'delete') {
      processed = await AdminNotification.destroy({ where: { id: { [Op.in]: ids } } });
    } else {
      const [affectedCount] = await AdminNotification.update(
        { isRead: true, readAt: new Date(), readBy: adminUserId },
        { where: { id: { [Op.in]: ids } } }
      );
      processed = affectedCount;
    }

    return { statusCode: 200, body: { success: true, processed } };
  } catch (error) {
    console.error('[adminNotifications] Error in bulk operation:', error.message);
    return { statusCode: 500, body: { success: false, message: 'Failed to process bulk operation' } };
  }
}
