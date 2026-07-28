import { describe, expect, it } from 'vitest';

import {
  ACTION_STATUS_DISMISSED,
  ACTION_STATUS_RESOLVED,
  applyNotificationActionStatus,
  normalizeActionResolutionStatus,
} from '../../services/communications/notificationActionStatusService.mjs';

describe('notificationActionStatusService', () => {
  it('normalizes only terminal action-required statuses', () => {
    expect(normalizeActionResolutionStatus('resolved')).toBe(ACTION_STATUS_RESOLVED);
    expect(normalizeActionResolutionStatus('dismissed')).toBe(ACTION_STATUS_DISMISSED);
    expect(normalizeActionResolutionStatus('complete')).toBe(ACTION_STATUS_RESOLVED);
    expect(normalizeActionResolutionStatus('dismiss')).toBe(ACTION_STATUS_DISMISSED);
    expect(normalizeActionResolutionStatus('snoozed')).toBeNull();
    expect(normalizeActionResolutionStatus('open')).toBeNull();
  });

  it('applies resolved state without deleting the notification row', () => {
    const now = new Date('2026-07-01T10:00:00.000Z');
    const notification = {
      read: false,
      status: 'unread',
      requiresAction: true,
      actionStatus: 'pending',
      metadata: { source: 'session_change' },
    };

    const result = applyNotificationActionStatus(notification, {
      status: 'resolved',
      actorUserId: 14,
      now,
    });

    expect(result).toMatchObject({ success: true, actionStatus: ACTION_STATUS_RESOLVED });
    expect(notification.read).toBe(true);
    expect(notification.status).toBe('read');
    expect(notification.actionStatus).toBe(ACTION_STATUS_RESOLVED);
    expect(notification.openedAt.toISOString()).toBe('2026-07-01T10:00:00.000Z');
    expect(notification.metadata).toEqual({
      source: 'session_change',
      notificationAction: {
        type: 'resolve',
        status: ACTION_STATUS_RESOLVED,
        actorUserId: 14,
        resolvedAt: '2026-07-01T10:00:00.000Z',
      },
    });
  });

  it('normalizes aliases before mutating action state', () => {
    const now = new Date('2026-07-01T11:00:00.000Z');
    const notification = {
      read: false,
      status: 'unread',
      requiresAction: true,
      actionStatus: 'pending',
      metadata: {},
    };

    const result = applyNotificationActionStatus(notification, {
      status: 'dismiss',
      actorUserId: 14,
      now,
    });

    expect(result).toMatchObject({ success: true, actionStatus: ACTION_STATUS_DISMISSED });
    expect(notification.actionStatus).toBe(ACTION_STATUS_DISMISSED);
    expect(notification.metadata.notificationAction).toEqual({
      type: 'dismiss',
      status: ACTION_STATUS_DISMISSED,
      actorUserId: 14,
      dismissedAt: '2026-07-01T11:00:00.000Z',
    });
  });

  it('rejects non-action notifications before mutating them', () => {
    const notification = {
      read: false,
      status: 'unread',
      requiresAction: false,
      actionStatus: null,
      metadata: {},
    };

    const result = applyNotificationActionStatus(notification, { status: 'resolved', actorUserId: 14 });

    expect(result).toEqual({
      success: false,
      error: 'Notification does not require action.',
      statusCode: 400,
    });
    expect(notification.read).toBe(false);
    expect(notification.status).toBe('unread');
    expect(notification.actionStatus).toBeNull();
  });
});
