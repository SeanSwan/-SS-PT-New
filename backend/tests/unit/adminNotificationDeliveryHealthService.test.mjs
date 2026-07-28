import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminFindAll: vi.fn(),
  notificationFindAll: vi.fn(),
  deliveryFindAll: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    AdminNotification: {
      findAll: mocks.adminFindAll,
    },
    Notification: {
      findAll: mocks.notificationFindAll,
    },
    NotificationDelivery: {
      findAll: mocks.deliveryFindAll,
    },
  }),
  Op: {
    or: Symbol.for('or'),
    gt: Symbol.for('gt'),
    in: Symbol.for('in'),
  },
}));

import {
  getAdminNotificationDeliveryHealth,
  serializeAdminNotification,
} from '../../services/adminNotificationManagementService.mjs';

const broadcastRow = (overrides = {}) => ({
  id: overrides.id || 'broadcast-1',
  title: overrides.title || 'Schedule update',
  metadata: JSON.stringify({
    audience: { type: 'clients', count: 10 },
    channels: ['in-app'],
    type: 'system',
    delivery: { attempted: 10, created: 8, failed: 2 },
    ...(overrides.metadata || {}),
  }),
  createdAt: overrides.createdAt || '2026-06-30T20:00:00.000Z',
  isRead: false,
  actionRequired: false,
  actionTaken: false,
  type: 'system_alert',
  message: 'Schedule update body',
  ...overrides,
});

describe('admin notification delivery health', () => {
  beforeEach(() => {
    mocks.adminFindAll.mockReset();
    mocks.notificationFindAll.mockReset();
    mocks.deliveryFindAll.mockReset();
    mocks.notificationFindAll.mockResolvedValue([]);
    mocks.deliveryFindAll.mockResolvedValue([]);
  });

  it('serializes broadcast delivery metrics from metadata instead of assuming every recipient delivered', () => {
    const serialized = serializeAdminNotification(broadcastRow(), 99);

    expect(serialized.metrics).toMatchObject({
      sent: 10,
      delivered: 8,
      failed: 2,
      opened: 0,
    });
  });

  it('builds aggregate delivery health from recent admin broadcast metadata', async () => {
    mocks.adminFindAll.mockResolvedValue([
      broadcastRow({ id: 'ok', metadata: { delivery: { attempted: 5, created: 5, failed: 0 } } }),
      broadcastRow({ id: 'degraded', metadata: { delivery: { attempted: 10, created: 7, failed: 3 } } }),
      broadcastRow({ id: 'ignored', metadata: { delivery: null } }),
    ]);

    const result = await getAdminNotificationDeliveryHealth({ limit: 25 });

    expect(mocks.adminFindAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'title', 'metadata', 'createdAt'],
      limit: 25,
      order: [['createdAt', 'DESC']],
      raw: true,
    }));
    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.summary).toMatchObject({
      broadcasts: 2,
      attempted: 15,
      delivered: 12,
      failed: 3,
      deliveryRate: 80,
      failureRate: 20,
      status: 'degraded',
    });
    expect(result.body.recentBroadcasts).toHaveLength(2);
    expect(result.body.recentBroadcasts[1]).toMatchObject({
      id: 'degraded',
      status: 'degraded',
      delivery: { attempted: 10, created: 7, failed: 3 },
      deliverySource: 'metadata',
    });
  });

  it('prefers NotificationDelivery ledger rows over broadcast metadata when available', async () => {
    mocks.adminFindAll.mockResolvedValue([
      broadcastRow({ id: 100, metadata: { delivery: { attempted: 3, created: 3, failed: 0 } } }),
    ]);
    mocks.notificationFindAll.mockResolvedValue([
      { id: 501, relatedEntityId: 100 },
      { id: 502, relatedEntityId: 100 },
      { id: 503, relatedEntityId: 100 },
      { id: 504, relatedEntityId: 100 },
    ]);
    mocks.deliveryFindAll.mockResolvedValue([
      { notificationId: 501, channel: 'in_app', status: 'sent', attemptCount: 1 },
      { notificationId: 502, channel: 'in_app', status: 'failed', attemptCount: 2 },
      { notificationId: 503, channel: 'in_app', status: 'opened', attemptCount: 1 },
      { notificationId: 504, channel: 'push', status: 'clicked', attemptCount: 1 },
    ]);

    const result = await getAdminNotificationDeliveryHealth({ limit: 10 });

    expect(mocks.notificationFindAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'relatedEntityId'],
      raw: true,
      where: expect.objectContaining({
        relatedEntityType: 'admin_broadcast',
      }),
    }));
    expect(mocks.deliveryFindAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['notificationId', 'channel', 'status', 'attemptCount'],
      raw: true,
    }));
    expect(result.statusCode).toBe(200);
    expect(result.body.summary).toMatchObject({
      broadcasts: 1,
      attempted: 4,
      delivered: 3,
      failed: 1,
      opened: 2,
      clicked: 1,
      retryCount: 5,
      status: 'degraded',
    });
    expect(result.body.recentBroadcasts[0]).toMatchObject({
      id: 100,
      channels: ['in_app', 'push'],
      deliverySource: 'ledger',
      delivery: {
        attempted: 4,
        created: 3,
        failed: 1,
        sent: 3,
        opened: 2,
        clicked: 1,
        retryCount: 5,
      },
    });
  });
  it('marks pending-only ledger delivery as degraded instead of healthy', async () => {
    mocks.adminFindAll.mockResolvedValue([
      broadcastRow({ id: 101, metadata: { delivery: { attempted: 2, created: 2, failed: 0 } } }),
    ]);
    mocks.notificationFindAll.mockResolvedValue([
      { id: 601, relatedEntityId: 101 },
      { id: 602, relatedEntityId: 101 },
    ]);
    mocks.deliveryFindAll.mockResolvedValue([
      { notificationId: 601, channel: 'in_app', status: 'pending', attemptCount: 0 },
      { notificationId: 602, channel: 'in_app', status: 'pending', attemptCount: 0 },
    ]);

    const result = await getAdminNotificationDeliveryHealth({ limit: 10 });

    expect(result.body.summary).toMatchObject({
      attempted: 2,
      delivered: 0,
      failed: 0,
      pending: 2,
      status: 'degraded',
    });
    expect(result.body.recentBroadcasts[0]).toMatchObject({
      status: 'degraded',
      deliverySource: 'ledger',
      delivery: { attempted: 2, created: 0, failed: 0, pending: 2 },
    });
  });
});