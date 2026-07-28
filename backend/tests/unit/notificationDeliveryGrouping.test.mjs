import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  Notification: {
    create: vi.fn(),
    findOne: vi.fn(),
    count: vi.fn(),
  },
  recordCommunicationAudit: vi.fn(),
  recordNotificationDelivery: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  io: null,
}));

vi.mock('../../models/index.mjs', () => ({
  getNotification: () => mocks.Notification,
  getUser: () => null,
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

const groupedNotification = (overrides = {}) => {
  const notification = {
    id: 901,
    userId: 42,
    title: 'Sean sent you a message',
    message: 'First message',
    type: 'message',
    category: 'messages',
    priority: 'normal',
    status: 'unread',
    read: false,
    groupKey: 'conversation:10',
    idempotencyKey: 'message:10:recipient:42',
    metadata: {
      conversationId: 10,
      messageId: 10,
      notificationGroup: {
        count: 1,
        idempotencyKeys: ['message:10:recipient:42'],
      },
    },
    update: vi.fn(async function update(payload) {
      Object.assign(this, payload);
      return this;
    }),
    ...overrides,
  };
  return notification;
};

describe('notification delivery grouping', () => {
  beforeEach(() => {
    mocks.Notification.create.mockReset();
    mocks.Notification.findOne.mockReset();
    mocks.Notification.count.mockReset();
    mocks.recordCommunicationAudit.mockReset();
    mocks.recordNotificationDelivery.mockReset();
    mocks.emit.mockReset();
    mocks.to.mockReset();
    mocks.to.mockReturnValue({ emit: mocks.emit });
    mocks.io = { to: mocks.to };

    mocks.Notification.count.mockResolvedValue(2);
    mocks.recordCommunicationAudit.mockResolvedValue({ success: true });
    mocks.recordNotificationDelivery.mockResolvedValue({ success: true });
  });

  it('updates the open grouped notification instead of creating a new row', async () => {
    const existing = groupedNotification();
    mocks.Notification.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const result = await createNotification({
      userId: 42,
      senderId: 7,
      title: 'Sean sent you a message',
      message: 'Second message',
      type: 'message',
      category: 'messages',
      priority: 'normal',
      status: 'unread',
      groupKey: 'conversation:10',
      idempotencyKey: 'message:11:recipient:42',
      metadata: { conversationId: 10, messageId: 11 },
      grouping: { mode: 'message_thread' },
      channels: ['in-app'],
    });

    expect(result).toMatchObject({ success: true, grouped: true });
    expect(mocks.Notification.create).not.toHaveBeenCalled();
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      title: '2 new messages in this conversation',
      message: 'Second message',
      idempotencyKey: 'message:11:recipient:42',
      metadata: expect.objectContaining({
        conversationId: 10,
        messageId: 11,
        notificationGroup: {
          count: 2,
          idempotencyKeys: ['message:10:recipient:42', 'message:11:recipient:42'],
        },
      }),
    }));
    expect(mocks.emit).toHaveBeenCalledWith('notification:new', existing);
    expect(mocks.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      notificationId: 901,
      channel: 'in_app',
      status: 'sent',
    }));
  });

  it('treats a replayed idempotency key inside a group as an idempotent replay', async () => {
    const existing = groupedNotification();
    mocks.Notification.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const result = await createNotification({
      userId: 42,
      title: 'Sean sent you a message',
      message: 'First message retry',
      type: 'message',
      category: 'messages',
      groupKey: 'conversation:10',
      idempotencyKey: 'message:10:recipient:42',
      metadata: { conversationId: 10, messageId: 10 },
      grouping: { mode: 'message_thread' },
      channels: ['in-app'],
    });

    expect(result).toMatchObject({ success: true, idempotentReplay: true, grouped: true });
    expect(existing.update).not.toHaveBeenCalled();
    expect(mocks.Notification.create).not.toHaveBeenCalled();
    expect(mocks.recordNotificationDelivery).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });
});