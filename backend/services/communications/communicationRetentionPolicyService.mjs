/**
 * Communication retention policy report service.
 * Read-only counts for notification, delivery, and audit retention review.
 */

import { getAllModels, Op } from '../../models/index.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

export const COMMUNICATION_RETENTION_POLICIES = Object.freeze([
  {
    key: 'notifications',
    label: 'Canonical user notifications',
    modelName: 'Notification',
    timestampField: 'createdAt',
    retentionDays: 365,
    action: 'review_archive_or_delete',
  },
  {
    key: 'notificationDeliveries',
    label: 'Notification delivery ledger',
    modelName: 'NotificationDelivery',
    timestampField: 'createdAt',
    retentionDays: 180,
    action: 'purge_after_parent_retention',
  },
  {
    key: 'communicationAuditLogs',
    label: 'Communication audit logs',
    modelName: 'CommunicationAuditLog',
    timestampField: 'createdAt',
    retentionDays: 2555,
    action: 'retain_for_compliance_review',
  },
  {
    key: 'adminNotifications',
    label: 'Admin notification signals',
    modelName: 'AdminNotification',
    timestampField: 'createdAt',
    retentionDays: 365,
    expiryField: 'expiresAt',
    action: 'review_expired_admin_signal_archive',
  },
]);

const toDate = (value = new Date()) => {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const buildRetentionCutoff = ({ now = new Date(), retentionDays }) => {
  const current = toDate(now);
  return new Date(current.getTime() - retentionDays * DAY_MS);
};

const countRows = async ({ model, field, before }) => model.count({
  where: { [field]: { [Op.lt]: before } },
});

async function reportPolicy(policy, models, now) {
  const model = models?.[policy.modelName];
  const cutoffAt = buildRetentionCutoff({ now, retentionDays: policy.retentionDays });
  const base = {
    ...policy,
    cutoffAt: cutoffAt.toISOString(),
    available: Boolean(model && typeof model.count === 'function'),
  };

  if (!base.available) {
    return { ...base, eligibleCount: null, error: 'model_unavailable' };
  }

  try {
    const eligibleCount = await countRows({ model, field: policy.timestampField, before: cutoffAt });
    const expiryReport = policy.expiryField
      ? { expiredCount: await countRows({ model, field: policy.expiryField, before: now }) }
      : {};

    return { ...base, eligibleCount, ...expiryReport };
  } catch (error) {
    return { ...base, eligibleCount: null, error: 'count_failed' };
  }
}

export async function buildCommunicationRetentionPolicyReport({ now = new Date(), models = getAllModels() } = {}) {
  const generatedAt = toDate(now);
  const policies = await Promise.all(
    COMMUNICATION_RETENTION_POLICIES.map((policy) => reportPolicy(policy, models, generatedAt))
  );
  const eligibleRows = policies.reduce((total, policy) => (
    typeof policy.eligibleCount === 'number' ? total + policy.eligibleCount : total
  ), 0);
  const unavailableModels = policies.filter((policy) => !policy.available).length;

  return {
    generatedAt: generatedAt.toISOString(),
    destructiveAction: false,
    summary: {
      policies: policies.length,
      eligibleRows,
      unavailableModels,
    },
    policies,
  };
}