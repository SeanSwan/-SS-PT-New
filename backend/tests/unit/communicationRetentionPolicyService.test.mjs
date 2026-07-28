import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const makeModel = () => ({
    count: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
  });

  const models = {
    Notification: makeModel(),
    NotificationDelivery: makeModel(),
    CommunicationAuditLog: makeModel(),
    AdminNotification: makeModel(),
  };

  return { models };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => mocks.models,
  Op: {
    lt: Symbol.for('lt'),
    or: Symbol.for('or'),
    gt: Symbol.for('gt'),
    in: Symbol.for('in'),
  },
}));

import { buildCommunicationRetentionPolicyReport } from '../../services/communications/communicationRetentionPolicyService.mjs';
import { getAdminNotificationRetentionReport } from '../../services/adminNotificationManagementService.mjs';

const now = new Date('2026-07-01T00:00:00.000Z');
const lt = Symbol.for('lt');

const resetModel = (model, countValue = 0) => {
  model.count.mockReset();
  model.destroy.mockReset();
  model.update.mockReset();
  model.count.mockResolvedValue(countValue);
};

describe('communication retention policy report', () => {
  beforeEach(() => {
    resetModel(mocks.models.Notification, 11);
    resetModel(mocks.models.NotificationDelivery, 7);
    resetModel(mocks.models.CommunicationAuditLog, 3);
    resetModel(mocks.models.AdminNotification, 5);
  });

  it('reports conservative retention windows without mutating communication data', async () => {
    const report = await buildCommunicationRetentionPolicyReport({ now });
    const byKey = Object.fromEntries(report.policies.map((policy) => [policy.key, policy]));

    expect(report).toMatchObject({
      generatedAt: now.toISOString(),
      destructiveAction: false,
      summary: {
        policies: 4,
        eligibleRows: 26,
        unavailableModels: 0,
      },
    });
    expect(byKey.notifications).toMatchObject({
      modelName: 'Notification',
      retentionDays: 365,
      timestampField: 'createdAt',
      eligibleCount: 11,
      action: 'review_archive_or_delete',
    });
    expect(byKey.notificationDeliveries).toMatchObject({
      modelName: 'NotificationDelivery',
      retentionDays: 180,
      eligibleCount: 7,
      action: 'purge_after_parent_retention',
    });
    expect(byKey.communicationAuditLogs).toMatchObject({
      modelName: 'CommunicationAuditLog',
      retentionDays: 2555,
      eligibleCount: 3,
      action: 'retain_for_compliance_review',
    });
    expect(byKey.adminNotifications).toMatchObject({
      modelName: 'AdminNotification',
      retentionDays: 365,
      eligibleCount: 5,
      expiredCount: 5,
      action: 'review_expired_admin_signal_archive',
    });

    expect(mocks.models.Notification.count.mock.calls[0][0].where.createdAt[lt].toISOString()).toBe('2025-07-01T00:00:00.000Z');
    expect(mocks.models.NotificationDelivery.count.mock.calls[0][0].where.createdAt[lt].toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(mocks.models.CommunicationAuditLog.count.mock.calls[0][0].where.createdAt[lt].toISOString()).toBe('2019-07-03T00:00:00.000Z');
    expect(mocks.models.AdminNotification.count.mock.calls[1][0].where.expiresAt[lt].toISOString()).toBe(now.toISOString());

    for (const model of Object.values(mocks.models)) {
      expect(model.destroy).not.toHaveBeenCalled();
      expect(model.update).not.toHaveBeenCalled();
    }
  });

  it('marks unavailable models degraded instead of failing the whole report', async () => {
    const originalDeliveryModel = mocks.models.NotificationDelivery;
    mocks.models.NotificationDelivery = null;

    const report = await buildCommunicationRetentionPolicyReport({ now });
    const deliveryPolicy = report.policies.find((policy) => policy.key === 'notificationDeliveries');

    expect(deliveryPolicy).toMatchObject({
      available: false,
      eligibleCount: null,
      error: 'model_unavailable',
    });
    expect(report.summary.unavailableModels).toBe(1);

    mocks.models.NotificationDelivery = originalDeliveryModel;
  });

  it('exposes the same report through the admin notification management service', async () => {
    const result = await getAdminNotificationRetentionReport({ now });

    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.retention).toMatchObject({
      destructiveAction: false,
      summary: { policies: 4 },
    });
  });
});