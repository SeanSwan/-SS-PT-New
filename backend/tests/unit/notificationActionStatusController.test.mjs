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

describe('resolveNotificationAction controller', () => {
  it('resolves only the authenticated user owned action-required notification', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:00:00.000Z'));

    const notification = {
      id: 88,
      userId: 5,
      read: false,
      status: 'unread',
      requiresAction: true,
      actionStatus: 'open',
      metadata: { source: 'waiver' },
      save: vi.fn(async () => notification),
    };
    const Notification = {
      findOne: vi.fn(async () => notification),
    };
    const { resolveNotificationAction } = await loadController(Notification);

    const res = makeRes();
    await resolveNotificationAction({
      params: { id: '88' },
      user: { id: 5 },
      body: { status: 'resolved' },
    }, res);

    expect(Notification.findOne).toHaveBeenCalledWith({ where: { id: '88', userId: 5 } });
    expect(notification.read).toBe(true);
    expect(notification.status).toBe('read');
    expect(notification.actionStatus).toBe('resolved');
    expect(notification.metadata.notificationAction).toMatchObject({
      type: 'resolve',
      status: 'resolved',
      actorUserId: 5,
      resolvedAt: '2026-07-01T10:00:00.000Z',
    });
    expect(notification.save).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Notification action resolved successfully',
      data: notification,
    });
  });

  it('rejects invalid terminal statuses before touching notification rows', async () => {
    const Notification = {
      findOne: vi.fn(),
    };
    const { resolveNotificationAction } = await loadController(Notification);

    const res = makeRes();
    await resolveNotificationAction({
      params: { id: '88' },
      user: { id: 5 },
      body: { status: 'snoozed' },
    }, res);

    expect(Notification.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Notification action status must be resolved or dismissed.',
    });
  });
});
