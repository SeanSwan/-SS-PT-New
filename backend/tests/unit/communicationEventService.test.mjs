import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
}));

vi.mock('../../services/notificationDeliveryService.mjs', () => ({
  createNotification: mocks.createNotification,
}));

const {
  createCommunicationEvent,
  normalizeCommunicationEvent,
} = await import('../../services/communications/communicationEventService.mjs');

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('communicationEventService', () => {
  beforeEach(() => {
    mocks.createNotification.mockReset();
  });

  it('normalizes Swan communication events before notification fanout', () => {
    const normalized = normalizeCommunicationEvent({
      eventType: ' Message.Created ',
      actorId: '7',
      recipientIds: [2, '3', 2, 'bad', -1],
      notificationType: 'message',
      category: 'messages',
      priority: 'high',
      title: '  New trainer message  ',
      body: '  Check the updated warmup.  ',
      link: '/dashboard/client/messages?conversationId=8',
      image: 'https://cdn.example.test/ignored.png',
      channels: ['in-app', 'push', 'in-app', 'fax'],
      actions: [
        { label: ' Open ', type: 'link', href: '/dashboard/client/messages' },
        { label: 'Run unsafe action', type: 'api', endpoint: '/api/admin/delete' },
      ],
      entityType: ' conversation ',
      entityId: '8',
      metadata: { conversationId: 8 },
      requiresAction: true,
      idempotencyKey: 'message:501',
    });

    expect(normalized.error).toBeNull();
    expect(normalized.value).toMatchObject({
      eventType: 'message.created',
      actorId: 7,
      recipients: [{ userId: 2 }, { userId: 3 }],
      notificationType: 'message',
      category: 'messages',
      priority: 'high',
      title: 'New trainer message',
      body: 'Check the updated warmup.',
      link: '/dashboard/client/messages?conversationId=8',
      image: null,
      channels: ['in-app', 'push'],
      actions: [{ label: 'Open', type: 'link', href: '/dashboard/client/messages' }],
      entityType: 'conversation',
      entityId: 8,
      metadata: { conversationId: 8 },
      requiresAction: true,
      idempotencyKey: 'message:501',
    });
  });


  it('normalizes mixed-case enum values from server callers', () => {
    const normalized = normalizeCommunicationEvent({
      eventType: 'Payment.Failed',
      actorId: 7,
      recipientIds: [2],
      notificationType: 'Order',
      category: 'Billing',
      priority: 'Critical',
      title: 'Payment failed',
      body: 'Billing review required.',
      channels: ['IN_APP', 'EMAIL'],
    });

    expect(normalized.error).toBeNull();
    expect(normalized.value).toMatchObject({
      eventType: 'payment.failed',
      notificationType: 'order',
      category: 'billing',
      priority: 'critical',
      channels: ['in-app', 'email'],
    });
  });
  it('rejects events without required server-owned fields', () => {
    expect(normalizeCommunicationEvent({ eventType: 'session.booked', recipientIds: [1], title: 'Hi', body: 'Body' }).error).toBeNull();
    expect(normalizeCommunicationEvent({ recipientIds: [1], title: 'Hi', body: 'Body' }).error).toBe('eventType is required');
    expect(normalizeCommunicationEvent({ eventType: 'session.booked', title: 'Hi', body: 'Body' }).error).toBe('At least one recipient is required');
    expect(normalizeCommunicationEvent({ eventType: 'session.booked', recipientIds: [1], body: 'Body' }).error).toBe('title is required');
    expect(normalizeCommunicationEvent({ eventType: 'session.booked', recipientIds: [1], title: 'Hi' }).error).toBe('body is required');
  });

  it('fans out notifications with per-recipient idempotency and reports partial failures', async () => {
    mocks.createNotification.mockImplementation(async (payload) => {
      if (payload.userId === 3) return { success: false, error: 'provider write failed' };
      return { success: true, notification: { id: payload.userId + 1000, ...payload } };
    });

    const result = await createCommunicationEvent({
      eventType: 'session.cancelled',
      actorId: 7,
      recipientIds: [2, 3, 2],
      notificationType: 'session',
      category: 'schedule',
      priority: 'urgent',
      title: 'Session cancelled',
      body: 'Tonight\'s appointment was cancelled.',
      link: '/dashboard/client/schedule',
      actions: [{ label: 'Review schedule', type: 'link', href: '/dashboard/client/schedule' }],
      entityType: 'session',
      entityId: 88,
      metadata: { sessionId: 88 },
      channels: ['in-app', 'email'],
      requiresAction: true,
      idempotencyKey: 'session:88:cancelled',
    });

    expect(mocks.createNotification).toHaveBeenCalledTimes(2);
    expect(mocks.createNotification).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: 2,
      senderId: 7,
      title: 'Session cancelled',
      message: 'Tonight\'s appointment was cancelled.',
      type: 'session',
      category: 'schedule',
      priority: 'urgent',
      link: '/dashboard/client/schedule',
      relatedEntityType: 'session',
      relatedEntityId: 88,
      requiresAction: true,
      channels: ['in-app', 'email'],
      idempotencyKey: 'session:88:cancelled:recipient:2',
      metadata: { eventType: 'session.cancelled', sessionId: 88 },
      actions: [{ label: 'Review schedule', type: 'link', href: '/dashboard/client/schedule' }],
    }));
    expect(mocks.createNotification).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: 3,
      idempotencyKey: 'session:88:cancelled:recipient:3',
    }));

    expect(result).toMatchObject({
      success: false,
      attempted: 2,
      notifications: [expect.objectContaining({ id: 1002, userId: 2 })],
      failures: [{ userId: 3, error: 'provider write failed' }],
    });
  });

  it('wires admin broadcast fanout through the generic communication event service', () => {
    const orchestrator = read('services/communications/notificationOrchestratorService.mjs');
    expect(orchestrator).toContain("from './communicationEventService.mjs'");
    expect(orchestrator).toContain('createCommunicationEvent({');
    expect(orchestrator).toContain("eventType: 'admin.broadcast.created'");
  });
});