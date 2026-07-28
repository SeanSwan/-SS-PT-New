import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  Notification: {
    create: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
  recordCommunicationAudit: vi.fn(),
  recordNotificationDelivery: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  io: null,
}));

vi.mock('../../models/index.mjs', () => ({
  getNotification: () => mocks.Notification,
  getUser: () => mocks.User,
}));

vi.mock('../../services/communications/communicationAuditLogService.mjs', () => ({
  recordCommunicationAudit: mocks.recordCommunicationAudit,
}));

vi.mock('../../services/communications/notificationDeliveryLedgerService.mjs', async () => {
  const actual = await vi.importActual('../../services/communications/notificationDeliveryLedgerService.mjs');
  return {
    ...actual,
    recordNotificationDelivery: mocks.recordNotificationDelivery,
  };
});

vi.mock('../../socket/socketManager.mjs', () => ({
  getIO: () => mocks.io,
}));

const { createNotification } = await import('../../services/notificationDeliveryService.mjs');

const createdNotification = (overrides = {}) => ({
  id: 901,
  userId: 42,
  title: 'New message',
  message: 'A trainer sent a message.',
  ...overrides,
});

describe('notification delivery channel policy', () => {
  beforeEach(() => {
    mocks.Notification.create.mockReset();
    mocks.Notification.findOne.mockReset();
    mocks.Notification.count.mockReset();
    mocks.User.findByPk.mockReset();
    mocks.User.findAll.mockReset();
    mocks.recordCommunicationAudit.mockReset();
    mocks.recordNotificationDelivery.mockReset();
    mocks.emit.mockReset();
    mocks.to.mockReset();
    mocks.to.mockReturnValue({ emit: mocks.emit });
    mocks.io = { to: mocks.to };

    mocks.Notification.create.mockResolvedValue(createdNotification());
    mocks.Notification.findOne.mockResolvedValue(null);
    mocks.Notification.count.mockResolvedValue(4);
    mocks.recordCommunicationAudit.mockResolvedValue({ success: true });
    mocks.recordNotificationDelivery.mockResolvedValue({ success: true });
  });

  it('records requested provider channels as pending or skipped based on user category preferences', async () => {
    mocks.User.findByPk.mockResolvedValue({
      id: 42,
      emailNotifications: true,
      smsNotifications: true,
      notificationPreferences: {
        channels: { email: true, sms: false, push: true },
        categories: {
          messages: { inApp: true, email: true, sms: false, push: false },
        },
      },
    });

    const result = await createNotification({
      userId: 42,
      senderId: 7,
      title: 'New message',
      message: 'A trainer sent a message.',
      type: 'message',
      category: 'messages',
      priority: 'normal',
      channels: ['in-app', 'email', 'sms', 'push', 'fax', 'email'],
      idempotencyKey: 'message:501:recipient:42',
    });

    expect(result.success).toBe(true);
    expect(mocks.to).toHaveBeenCalledWith('user:42');
    expect(mocks.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({ id: 901 }));
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledTimes(4);
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      channel: 'in_app',
      notificationId: 901,
      status: 'sent',
      userId: 42,
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      channel: 'email',
      notificationId: 901,
      status: 'pending',
      userId: 42,
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(3, expect.objectContaining({
      channel: 'sms',
      errorCode: 'preference_disabled',
      notificationId: 901,
      status: 'skipped',
      userId: 42,
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(4, expect.objectContaining({
      channel: 'push',
      errorCode: 'preference_disabled',
      notificationId: 901,
      status: 'skipped',
      userId: 42,
    }));
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        deliveryStatus: 'sent',
        deliveryChannels: {
          in_app: 'sent',
          email: 'pending',
          sms: 'skipped',
          push: 'skipped',
        },
      }),
    }));
  });

  it('fails closed for provider channels when user preferences cannot be loaded', async () => {
    mocks.User.findByPk.mockResolvedValue(null);

    const result = await createNotification({
      userId: 42,
      title: 'Schedule update',
      message: 'Your schedule changed.',
      type: 'schedule',
      category: 'schedule',
      channels: ['in-app', 'email'],
    });

    expect(result.success).toBe(true);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledTimes(2);
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      channel: 'in_app',
      status: 'sent',
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      channel: 'email',
      errorCode: 'preference_unavailable',
      status: 'skipped',
    }));
  });
  it('skips non-urgent provider channels during stored quiet hours', async () => {
    mocks.User.findByPk.mockResolvedValue({
      id: 42,
      emailNotifications: true,
      smsNotifications: true,
      notificationPreferences: {
        channels: { email: true, sms: true, push: true },
        categories: {
          schedule: { inApp: true, email: true, sms: true, push: true },
        },
        quietHours: {
          enabled: true,
          start: '21:00',
          end: '07:00',
          timezone: 'UTC',
        },
      },
    });

    const result = await createNotification({
      userId: 42,
      title: 'Schedule update',
      message: 'Your schedule changed.',
      type: 'schedule',
      category: 'schedule',
      priority: 'normal',
      channels: ['email'],
      deliveryPolicyNow: new Date('2026-07-01T05:30:00.000Z'),
    });

    expect(result.success).toBe(true);
    expect(mocks.emit).not.toHaveBeenCalledWith('notification:new', expect.anything());
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      errorCode: 'quiet_hours_active',
      status: 'skipped',
    }));
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        deliveryStatus: 'skipped',
        deliveryChannels: { email: 'skipped' },
      }),
    }));
  });

  it('allows critical provider channels to queue during quiet hours', async () => {
    mocks.User.findByPk.mockResolvedValue({
      id: 42,
      emailNotifications: true,
      smsNotifications: true,
      notificationPreferences: {
        channels: { email: true, sms: true, push: true },
        categories: {
          action_required: { inApp: true, email: true, sms: true, push: true },
        },
        quietHours: {
          enabled: true,
          start: '21:00',
          end: '07:00',
          timezone: 'UTC',
        },
        digestFrequency: 'daily',
      },
    });

    const result = await createNotification({
      userId: 42,
      title: 'Action required',
      message: 'Please review this urgent update.',
      type: 'action_required',
      category: 'action_required',
      priority: 'critical',
      channels: ['email'],
      deliveryPolicyNow: new Date('2026-07-01T05:30:00.000Z'),
    });

    expect(result.success).toBe(true);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      errorCode: undefined,
      status: 'pending',
    }));
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        deliveryStatus: 'pending',
        deliveryChannels: { email: 'pending' },
      }),
    }));
  });

  it('defers provider channels for digest users while keeping in-app immediate', async () => {
    mocks.User.findByPk.mockResolvedValue({
      id: 42,
      emailNotifications: true,
      smsNotifications: true,
      notificationPreferences: {
        channels: { email: true, sms: true, push: true },
        categories: { messages: { inApp: true, email: true, sms: true, push: true } },
        digestFrequency: 'hourly',
      },
    });

    const result = await createNotification({
      userId: 42,
      title: 'New message',
      message: 'A trainer sent a message.',
      type: 'message',
      category: 'messages',
      priority: 'normal',
      channels: ['in-app', 'email', 'push'],
    });

    expect(result.success).toBe(true);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledTimes(3);
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      channel: 'in_app',
      status: 'sent',
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      channel: 'email',
      errorCode: 'digest_deferred',
      status: 'skipped',
    }));
    expect(mocks.recordNotificationDelivery).toHaveBeenNthCalledWith(3, expect.objectContaining({
      channel: 'push',
      errorCode: 'digest_deferred',
      status: 'skipped',
    }));
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        deliveryChannels: { in_app: 'sent', email: 'skipped', push: 'skipped' },
      }),
    }));
  });
});
