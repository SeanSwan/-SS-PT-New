import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('notification orchestrator source contract', () => {
  it('creates message notifications through the canonical Notification controller shape', () => {
    const source = readSource('services/communications/notificationOrchestratorService.mjs');
    const notificationModel = readSource('models/Notification.mjs');

    expect(source).toContain('createMessageNotificationEvent');
    expect(source).toContain('createNotification');
    expect(source).toContain("type: 'message'");
    expect(source).toContain('senderId: actorId');
    expect(source).toContain('relatedEntityType: \'conversation\'');
    expect(source).toContain('conversationId');
    expect(source).toContain("grouping: { mode: 'message_thread' }");
    expect(source).not.toContain('INSERT INTO notifications');
    expect(source).not.toContain('user_id');
    expect(source).not.toContain('content::jsonb');
    expect(notificationModel).toContain("'message'");
  });
});
describe('createMessageNotificationEvent preview preferences', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unmock('../../controllers/notificationController.mjs');
    vi.unmock('../../models/index.mjs');
    vi.unmock('../../utils/logger.mjs');
  });

  it('redacts the message body per recipient when previews are disabled', async () => {
    const createNotification = vi.fn(async (payload) => ({
      success: true,
      notification: { id: payload.userId, ...payload },
    }));
    const User = {
      findByPk: vi.fn(async (id) => ({
        id,
        emailNotifications: true,
        smsNotifications: false,
        notificationPreferences: {
          showPreview: id !== 2,
        },
      })),
    };

    vi.doMock('../../controllers/notificationController.mjs', () => ({ createNotification }));
    vi.doMock('../../models/index.mjs', () => ({ getUser: () => User }));
    vi.doMock('../../utils/logger.mjs', () => ({ default: { warn: vi.fn() } }));

    const { createMessageNotificationEvent } = await import(
      '../../services/communications/notificationOrchestratorService.mjs'
    );

    await createMessageNotificationEvent({
      actor: { id: 1, firstName: 'Sean' },
      recipients: [
        { userId: 2, role: 'client' },
        { userId: 3, role: 'trainer' },
      ],
      conversationId: 10,
      messageId: 99,
      content: 'Meet me by the side door with the rehab notes.',
    });

    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(User.findByPk).toHaveBeenCalledWith(2, expect.objectContaining({
      attributes: ['id', 'emailNotifications', 'smsNotifications', 'notificationPreferences'],
    }));

    const payloads = createNotification.mock.calls.map(([payload]) => payload);
    const hidden = payloads.find((payload) => payload.userId === 2);
    const visible = payloads.find((payload) => payload.userId === 3);

    expect(hidden.message).toBe('New message received.');
    expect(visible.message).toBe('Meet me by the side door with the rehab notes.');
    expect(hidden.metadata).toEqual({ conversationId: 10, messageId: 99 });
  });

  it('uses the generic body when preview preference lookup fails', async () => {
    const createNotification = vi.fn(async (payload) => ({
      success: true,
      notification: { id: payload.userId, ...payload },
    }));
    const warn = vi.fn();
    const User = {
      findByPk: vi.fn(async () => {
        throw new Error('database offline');
      }),
    };

    vi.doMock('../../controllers/notificationController.mjs', () => ({ createNotification }));
    vi.doMock('../../models/index.mjs', () => ({ getUser: () => User }));
    vi.doMock('../../utils/logger.mjs', () => ({ default: { warn } }));

    const { createMessageNotificationEvent } = await import(
      '../../services/communications/notificationOrchestratorService.mjs'
    );

    await createMessageNotificationEvent({
      actor: { id: 1, firstName: 'Sean' },
      recipients: [{ userId: 2, role: 'client' }],
      conversationId: 10,
      messageId: 100,
      content: 'Private session note that should not be exposed.',
    });

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification.mock.calls[0][0].message).toBe('New message received.');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Notification preview preference lookup failed for user 2')
    );
  });
});
