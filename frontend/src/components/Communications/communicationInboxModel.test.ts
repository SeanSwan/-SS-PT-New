import { describe, expect, it } from 'vitest';

import {
  COMMUNICATION_INBOX_BUCKETS,
  buildCommunicationInboxBuckets,
  getCommunicationNotificationBucket,
} from './communicationInboxModel';
import type { Notification } from '../../store/slices/notificationSlice';

const notification = (overrides: Partial<Notification>): Notification => ({
  id: String(overrides.id || 'n-1'),
  title: overrides.title || 'Notification',
  message: overrides.message || 'Body',
  type: overrides.type || 'system',
  read: overrides.read ?? false,
  createdAt: overrides.createdAt || '2026-06-30T20:00:00.000Z',
  ...overrides,
});

describe('communicationInboxModel', () => {
  it('keeps the Communications OS bucket order action-first and role-readable', () => {
    expect(COMMUNICATION_INBOX_BUCKETS.map(bucket => bucket.key)).toEqual([
      'action_required',
      'messages',
      'schedule',
      'training',
      'billing',
      'community',
      'achievements',
      'system',
      'admin',
    ]);
  });

  it('routes action-required notifications ahead of their base category', () => {
    expect(getCommunicationNotificationBucket(notification({
      category: 'training',
      requiresAction: true,
      actionStatus: 'pending',
    }))).toBe('action_required');

    expect(getCommunicationNotificationBucket(notification({
      category: 'training',
      requiresAction: true,
      actionStatus: 'completed',
    }))).toBe('training');
  });

  it('counts unread and total notifications by enterprise communications bucket', () => {
    const buckets = buildCommunicationInboxBuckets([
      notification({ id: 'a1', type: 'session', category: 'action_required', read: false }),
      notification({ id: 'm1', type: 'message', category: 'messages', read: false }),
      notification({ id: 'b1', type: 'order', category: 'billing', read: true }),
      notification({ id: 'c1', type: 'social', category: 'community', read: false }),
      notification({ id: 'r1', type: 'reward', category: 'achievements', read: false }),
      notification({ id: 'admin-1', type: 'admin', category: 'admin', read: true }),
      notification({ id: 's1', type: 'system', category: 'system', read: true }),
    ]);

    expect(buckets.find(bucket => bucket.key === 'action_required')).toMatchObject({ total: 1, unread: 1 });
    expect(buckets.find(bucket => bucket.key === 'messages')).toMatchObject({ total: 1, unread: 1 });
    expect(buckets.find(bucket => bucket.key === 'billing')).toMatchObject({ total: 1, unread: 0 });
    expect(buckets.find(bucket => bucket.key === 'community')).toMatchObject({ total: 1, unread: 1 });
    expect(buckets.find(bucket => bucket.key === 'achievements')).toMatchObject({ total: 1, unread: 1 });
    expect(buckets.find(bucket => bucket.key === 'admin')).toMatchObject({ total: 1, unread: 0 });
  });
});