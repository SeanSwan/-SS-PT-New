/**
 * Admin notification delivery health ledger helpers.
 * Keeps NotificationDelivery aggregation separate from admin notification CRUD.
 */

import { Op } from '../models/index.mjs';

export const emptyDeliverySummary = {
  broadcasts: 0,
  attempted: 0,
  delivered: 0,
  failed: 0,
  pending: 0,
  sent: 0,
  opened: 0,
  clicked: 0,
  retryCount: 0,
  skipped: 0,
  deliveryRate: 0,
  failureRate: 0,
  status: 'empty',
};

const SUCCESS_STATUSES = new Set(['sent', 'delivered', 'opened', 'clicked']);
const DELIVERED_STATUSES = new Set(['delivered', 'opened', 'clicked']);
const OPENED_STATUSES = new Set(['opened', 'clicked']);

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch {
    return {};
  }
};

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const toNonNegativeInt = (value) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 0;
};

const percentOf = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const deliveryStatusFor = ({ attempted, created, failed }) => {
  if (attempted <= 0) return 'empty';
  if (created <= 0 && failed > 0) return 'failed';
  if (created <= 0) return 'degraded';
  if (failed > 0) return 'degraded';
  return 'healthy';
};

const normalizeMetadataDelivery = (metadata = {}) => {
  const delivery = metadata.delivery;
  if (!delivery || typeof delivery !== 'object') return null;

  const created = toNonNegativeInt(delivery.created);
  const failed = toNonNegativeInt(delivery.failed);
  const minimumAttempted = created + failed;
  const attempted = Math.max(toNonNegativeInt(delivery.attempted), minimumAttempted);

  if (attempted <= 0 && minimumAttempted <= 0) return null;
  return { attempted, created, failed };
};

const emptyLedgerDelivery = () => ({
  attempted: 0,
  created: 0,
  failed: 0,
  pending: 0,
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  retryCount: 0,
  skipped: 0,
});

const applyLedgerRow = (summary, deliveryRow) => {
  const status = String(deliveryRow.status || 'pending').toLowerCase();
  summary.retryCount += toNonNegativeInt(deliveryRow.attemptCount);

  if (status === 'skipped') {
    summary.skipped += 1;
    return;
  }

  summary.attempted += 1;
  if (status === 'pending') summary.pending += 1;
  if (status === 'failed') summary.failed += 1;
  if (SUCCESS_STATUSES.has(status)) {
    summary.created += 1;
    summary.sent += 1;
  }
  if (DELIVERED_STATUSES.has(status)) summary.delivered += 1;
  if (OPENED_STATUSES.has(status)) summary.opened += 1;
  if (status === 'clicked') summary.clicked += 1;
};

export async function buildLedgerDeliveryByAdminNotification({ models, adminNotificationIds }) {
  const Notification = models.Notification;
  const NotificationDelivery = models.NotificationDelivery;
  const ids = (Array.isArray(adminNotificationIds) ? adminNotificationIds : [])
    .map(toPositiveInt)
    .filter(Boolean);

  if (!Notification || !NotificationDelivery || ids.length === 0) return new Map();

  try {
    const notifications = await Notification.findAll({
      attributes: ['id', 'relatedEntityId'],
      where: {
        relatedEntityType: 'admin_broadcast',
        relatedEntityId: { [Op.in]: ids },
      },
      raw: true,
    });

    const canonicalToAdmin = new Map();
    for (const notification of notifications) {
      const notificationId = toPositiveInt(notification.id);
      const adminNotificationId = toPositiveInt(notification.relatedEntityId);
      if (notificationId && adminNotificationId) canonicalToAdmin.set(notificationId, adminNotificationId);
    }

    const notificationIds = Array.from(canonicalToAdmin.keys());
    if (notificationIds.length === 0) return new Map();

    const deliveries = await NotificationDelivery.findAll({
      attributes: ['notificationId', 'channel', 'status', 'attemptCount'],
      where: { notificationId: { [Op.in]: notificationIds } },
      raw: true,
    });

    const byAdmin = new Map();
    const channelsByAdmin = new Map();
    for (const delivery of deliveries) {
      const adminNotificationId = canonicalToAdmin.get(toPositiveInt(delivery.notificationId));
      if (!adminNotificationId) continue;
      if (!byAdmin.has(adminNotificationId)) {
        byAdmin.set(adminNotificationId, emptyLedgerDelivery());
        channelsByAdmin.set(adminNotificationId, new Set());
      }
      applyLedgerRow(byAdmin.get(adminNotificationId), delivery);
      const channel = typeof delivery.channel === 'string' ? delivery.channel.trim() : '';
      if (channel) channelsByAdmin.get(adminNotificationId).add(channel);
    }

    for (const [adminNotificationId, delivery] of byAdmin.entries()) {
      delivery.channels = Array.from(channelsByAdmin.get(adminNotificationId) || []).sort();
    }

    return byAdmin;
  } catch (error) {
    console.warn('[adminNotifications] Delivery ledger unavailable, falling back to metadata:', error.message);
    return new Map();
  }
}

export function serializeDeliveryHealthRow(notification, ledgerDeliveryByAdmin = new Map()) {
  const metadata = parseMetadata(notification.metadata);
  const ledgerDelivery = ledgerDeliveryByAdmin.get(toPositiveInt(notification.id));
  const delivery = ledgerDelivery || normalizeMetadataDelivery(metadata);
  if (!delivery) return null;

  return {
    id: notification.id,
    title: notification.title || 'Admin broadcast',
    createdAt: notification.createdAt,
    audience: metadata.audience || { type: 'all', count: delivery.attempted },
    channels: ledgerDelivery?.channels?.length
      ? ledgerDelivery.channels
      : Array.isArray(metadata.channels) ? metadata.channels : ['in-app'],
    delivery,
    deliverySource: ledgerDelivery ? 'ledger' : 'metadata',
    deliveryRate: percentOf(delivery.created, delivery.attempted),
    failureRate: percentOf(delivery.failed, delivery.attempted),
    status: deliveryStatusFor(delivery),
  };
}

export function summarizeDeliveryHealth(rows) {
  if (!rows.length) return { ...emptyDeliverySummary };

  const totals = rows.reduce((summary, row) => ({
    broadcasts: summary.broadcasts + 1,
    attempted: summary.attempted + row.delivery.attempted,
    delivered: summary.delivered + row.delivery.created,
    failed: summary.failed + row.delivery.failed,
    pending: summary.pending + toNonNegativeInt(row.delivery.pending),
    sent: summary.sent + toNonNegativeInt(row.delivery.sent),
    opened: summary.opened + toNonNegativeInt(row.delivery.opened),
    clicked: summary.clicked + toNonNegativeInt(row.delivery.clicked),
    retryCount: summary.retryCount + toNonNegativeInt(row.delivery.retryCount),
    skipped: summary.skipped + toNonNegativeInt(row.delivery.skipped),
  }), { ...emptyDeliverySummary, deliveryRate: 0, failureRate: 0, status: 'empty' });

  return {
    ...totals,
    deliveryRate: percentOf(totals.delivered, totals.attempted),
    failureRate: percentOf(totals.failed, totals.attempted),
    status: deliveryStatusFor({
      attempted: totals.attempted,
      created: totals.delivered,
      failed: totals.failed,
    }),
  };
}