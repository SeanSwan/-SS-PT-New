import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claimNotificationDeliveryRetry: vi.fn(),
  getRetryableNotificationDeliveries: vi.fn(),
  recordNotificationDelivery: vi.fn(),
  recordCommunicationAudit: vi.fn(),
  findByPk: vi.fn(),
  count: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  io: null,
}));

vi.mock('../../services/communications/notificationDeliveryRetryQueueService.mjs', () => ({
  claimNotificationDeliveryRetry: mocks.claimNotificationDeliveryRetry,
  getRetryableNotificationDeliveries: mocks.getRetryableNotificationDeliveries,
}));

vi.mock('../../services/communications/notificationDeliveryLedgerService.mjs', () => ({
  recordNotificationDelivery: mocks.recordNotificationDelivery,
}));

vi.mock('../../services/communications/communicationAuditLogService.mjs', () => ({
  recordCommunicationAudit: mocks.recordCommunicationAudit,
}));

vi.mock('../../models/index.mjs', () => ({
  getNotification: () => ({
    count: mocks.count,
    findByPk: mocks.findByPk,
    create: vi.fn(),
    findOne: vi.fn(),
  }),
  getUser: () => ({ findAll: vi.fn() }),
}));

vi.mock('../../socket/socketManager.mjs', () => ({
  getIO: () => mocks.io,
}));

vi.mock('../../services/notificationPayloadService.mjs', () => ({
  isNotificationIdempotencyConflict: vi.fn(() => false),
  normalizeNotificationCreateOptions: vi.fn((options) => options),
}));

const { retryInAppNotificationDeliveries, retryProviderNotificationDeliveries } = await import('../../services/notificationDeliveryService.mjs');

const now = new Date('2026-06-30T20:00:00.000Z');

const deliveryRow = (overrides = {}) => ({
  id: 701,
  notificationId: 501,
  userId: 42,
  channel: 'in_app',
  status: 'failed',
  attemptCount: 1,
  ...overrides,
});

const notificationRow = (overrides = {}) => ({
  id: 501,
  userId: 42,
  read: false,
  title: 'Training update',
  message: 'Your trainer sent an update.',
  ...overrides,
});

describe('notification delivery retry processor', () => {
  beforeEach(() => {
    mocks.claimNotificationDeliveryRetry.mockReset();
    mocks.getRetryableNotificationDeliveries.mockReset();
    mocks.recordNotificationDelivery.mockReset();
    mocks.recordCommunicationAudit.mockReset();
    mocks.findByPk.mockReset();
    mocks.count.mockReset();
    mocks.emit.mockReset();
    mocks.to.mockReset();
    mocks.to.mockReturnValue({ emit: mocks.emit });
    mocks.io = { to: mocks.to };
    mocks.recordNotificationDelivery.mockResolvedValue({ success: true });
    mocks.count.mockResolvedValue(3);
  });

  it('claims due in-app deliveries, re-emits notifications, and records the retry result', async () => {
    const delivery = deliveryRow();
    mocks.getRetryableNotificationDeliveries.mockResolvedValue([delivery]);
    mocks.claimNotificationDeliveryRetry.mockResolvedValue({
      success: true,
      delivery: deliveryRow({ attemptCount: 2 }),
    });
    mocks.findByPk.mockResolvedValue(notificationRow());

    const result = await retryInAppNotificationDeliveries({ limit: 5, now });

    expect(mocks.getRetryableNotificationDeliveries).toHaveBeenCalledWith(expect.objectContaining({
      channels: ['in_app'],
      limit: 5,
      now,
    }));
    expect(mocks.claimNotificationDeliveryRetry).toHaveBeenCalledWith(delivery, expect.objectContaining({ now }));
    expect(mocks.to).toHaveBeenCalledWith('user:42');
    expect(mocks.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({ id: 501 }));
    expect(mocks.emit).toHaveBeenCalledWith('notification:count', { unreadCount: 3 });
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 2,
      channel: 'in_app',
      notificationId: 501,
      status: 'sent',
      userId: 42,
      metadata: { retry: { deliveryId: 701 } },
    }));
    expect(result).toEqual({
      success: true,
      attempted: 1,
      sent: 1,
      pending: 0,
      failed: 0,
      skipped: 0,
      stale: 0,
    });
  });

  it('tracks stale claims and records skipped delivery when the notification row is gone', async () => {
    const stale = deliveryRow({ id: 801, notificationId: 601, attemptCount: 1 });
    const missing = deliveryRow({ id: 802, notificationId: 602, attemptCount: 1 });
    mocks.getRetryableNotificationDeliveries.mockResolvedValue([stale, missing]);
    mocks.claimNotificationDeliveryRetry
      .mockResolvedValueOnce({ success: false, error: 'already claimed' })
      .mockResolvedValueOnce({ success: true, delivery: deliveryRow({ id: 802, notificationId: 602, attemptCount: 2 }) });
    mocks.findByPk.mockResolvedValue(null);

    const result = await retryInAppNotificationDeliveries({ limit: 10, now });

    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 2,
      channel: 'in_app',
      errorCode: 'notification_not_found',
      notificationId: 602,
      status: 'skipped',
      userId: 42,
    }));
    expect(result).toEqual({
      success: true,
      attempted: 2,
      sent: 0,
      pending: 0,
      failed: 0,
      skipped: 1,
      stale: 1,
    });
  });
  it('skips terminal notifications without re-emitting stale user-facing events', async () => {
    const delivery = deliveryRow({ id: 901, notificationId: 701, attemptCount: 1 });
    mocks.getRetryableNotificationDeliveries.mockResolvedValue([delivery]);
    mocks.claimNotificationDeliveryRetry.mockResolvedValue({
      success: true,
      delivery: deliveryRow({ id: 901, notificationId: 701, attemptCount: 2 }),
    });
    mocks.findByPk.mockResolvedValue(notificationRow({ id: 701, read: true }));

    const result = await retryInAppNotificationDeliveries({ limit: 5, now });

    expect(mocks.emit).not.toHaveBeenCalledWith('notification:new', expect.anything());
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 2,
      channel: 'in_app',
      errorCode: 'notification_not_retryable',
      notificationId: 701,
      status: 'skipped',
      userId: 42,
    }));
    expect(result).toEqual({
      success: true,
      attempted: 1,
      sent: 0,
      pending: 0,
      failed: 0,
      skipped: 1,
      stale: 0,
    });
  });
  it('claims provider-channel deliveries and records configured provider results', async () => {
    const delivery = deliveryRow({ id: 1001, channel: 'email', status: 'failed', attemptCount: 1 });
    const emailProvider = vi.fn(async () => ({ status: 'sent', providerMessageId: 'email-provider-123' }));
    mocks.getRetryableNotificationDeliveries.mockResolvedValue([delivery]);
    mocks.claimNotificationDeliveryRetry.mockResolvedValue({
      success: true,
      delivery: deliveryRow({ id: 1001, channel: 'email', attemptCount: 2 }),
    });
    mocks.findByPk.mockResolvedValue(notificationRow({ id: 501 }));

    const result = await retryProviderNotificationDeliveries({ limit: 5, now, providers: { email: emailProvider } });

    expect(mocks.getRetryableNotificationDeliveries).toHaveBeenCalledWith(expect.objectContaining({
      channels: ['email', 'sms', 'push'],
      limit: 5,
      now,
    }));
    expect(emailProvider).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      notification: expect.objectContaining({ id: 501 }),
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 2,
      channel: 'email',
      notificationId: 501,
      providerMessageId: 'email-provider-123',
      status: 'sent',
      userId: 42,
      metadata: { retry: { deliveryId: 1001, providerChannel: 'email' } },
    }));
    expect(result).toEqual({
      success: true,
      attempted: 1,
      sent: 1,
      pending: 0,
      failed: 0,
      skipped: 0,
      stale: 0,
    });
  });

  it('skips provider-channel retries when no explicit provider is configured', async () => {
    const delivery = deliveryRow({ id: 1101, channel: 'sms', status: 'pending', attemptCount: 1 });
    mocks.getRetryableNotificationDeliveries.mockResolvedValue([delivery]);
    mocks.claimNotificationDeliveryRetry.mockResolvedValue({
      success: true,
      delivery: deliveryRow({ id: 1101, channel: 'sms', attemptCount: 2 }),
    });
    mocks.findByPk.mockResolvedValue(notificationRow({ id: 501 }));

    const result = await retryProviderNotificationDeliveries({ limit: 5, now });

    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 2,
      channel: 'sms',
      errorCode: 'provider_not_configured',
      notificationId: 501,
      status: 'skipped',
      userId: 42,
      metadata: { retry: { deliveryId: 1101, providerChannel: 'sms' } },
    }));
    expect(result).toEqual({
      success: true,
      attempted: 1,
      sent: 0,
      pending: 0,
      failed: 0,
      skipped: 1,
      stale: 0,
    });
  });
});
