import { afterEach, describe, expect, it, vi } from 'vitest';

const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
};

const loadController = async (Notification) => {
  vi.resetModules();
  vi.doMock('../../models/index.mjs', () => ({
    getNotification: () => Notification,
    getUser: () => null,
  }));
  vi.doMock('../../services/notificationDeliveryService.mjs', () => ({
    createAdminAndEmit: vi.fn(),
    createAdminNotification: vi.fn(),
    createAndEmit: vi.fn(),
    createNotification: vi.fn(),
  }));
  vi.doMock('../../controllers/notificationPreferencesController.mjs', () => ({
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  }));
  vi.doMock('../../services/communications/notificationDeliveryLedgerService.mjs', () => ({
    recordNotificationClicked: vi.fn(async () => ({ success: true })),
    recordNotificationOpened: vi.fn(async () => ({ success: true })),
  }));
  return import('../../controllers/notificationController.mjs');
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('snoozeNotification controller', () => {
  it('snoozes only the authenticated user owned notification', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));

    const notification = {
      id: 77,
      userId: 5,
      read: false,
      status: 'unread',
      actionStatus: 'open',
      metadata: { existing: true },
      save: vi.fn(async () => notification),
    };
    const Notification = {
      findOne: vi.fn(async () => notification),
    };
    const { snoozeNotification } = await loadController(Notification);

    const res = makeRes();
    await snoozeNotification({
      params: { id: '77' },
      user: { id: 5 },
      body: { durationMinutes: '45' },
    }, res);

    expect(Notification.findOne).toHaveBeenCalledWith({ where: { id: '77', userId: 5 } });
    expect(notification.read).toBe(true);
    expect(notification.status).toBe('snoozed');
    expect(notification.actionStatus).toBe('snoozed');
    expect(notification.expiresAt.toISOString()).toBe('2026-07-01T00:45:00.000Z');
    expect(notification.metadata.notificationAction).toMatchObject({
      type: 'snooze',
      durationMinutes: 45,
      snoozedAt: '2026-07-01T00:00:00.000Z',
      snoozedUntil: '2026-07-01T00:45:00.000Z',
    });
    expect(notification.save).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Notification snoozed successfully',
      data: notification,
    });
  });

  it('rejects out-of-range durations before touching notification rows', async () => {
    const Notification = {
      findOne: vi.fn(),
    };
    const { snoozeNotification } = await loadController(Notification);

    const res = makeRes();
    await snoozeNotification({
      params: { id: '77' },
      user: { id: 5 },
      body: { durationMinutes: 10081 },
    }, res);

    expect(Notification.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Snooze duration must be between 5 and 10080 minutes.',
    });
  });
});
