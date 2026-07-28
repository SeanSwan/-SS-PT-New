import { describe, expect, it } from 'vitest';

import {
  buildBroadcastRecipientWhere,
  normalizeBroadcastRequest,
} from '../../services/adminNotificationBroadcastService.mjs';

describe('adminNotificationBroadcastService', () => {
  it('normalizes broadcast requests without leaking invalid user ids', () => {
    const normalized = normalizeBroadcastRequest({
      title: '  Schedule update  ',
      content: '  Saturday sessions moved.  ',
      type: 'alert',
      audience: 'specific',
      channels: ['in-app', 'push', 99, 'in-app'],
      userIds: [7, '8', 7, 'bad', -4],
      link: '/dashboard/client/schedule',
    });

    expect(normalized.error).toBeNull();
    expect(normalized.value).toMatchObject({
      title: 'Schedule update',
      content: 'Saturday sessions moved.',
      type: 'alert',
      audience: 'specific',
      channels: ['in-app', 'push'],
      userIds: [7, 8],
      link: '/dashboard/client/schedule',
    });
  });

  it('rejects unsafe external broadcast links before fan-out', () => {
    const external = normalizeBroadcastRequest({
      title: 'Alert',
      content: 'Details',
      audience: 'clients',
      link: 'https://example.com/outside',
    });
    const protocolRelative = normalizeBroadcastRequest({
      title: 'Alert',
      content: 'Details',
      audience: 'clients',
      link: '//example.com/outside',
    });

    expect(external.error).toBe('Broadcast links must be internal SwanStudios paths');
    expect(protocolRelative.error).toBe('Broadcast links must be internal SwanStudios paths');
  });
  it('builds role-aware recipient filters and rejects empty specific broadcasts', () => {
    expect(buildBroadcastRecipientWhere({ audience: 'all' })).toEqual({});
    expect(buildBroadcastRecipientWhere({ audience: 'clients' })).toEqual({ role: 'client' });
    expect(buildBroadcastRecipientWhere({ audience: 'trainers' })).toEqual({ role: 'trainer' });
    expect(buildBroadcastRecipientWhere({ audience: 'admins' })).toEqual({ role: 'admin' });
    expect(buildBroadcastRecipientWhere({ audience: 'specific', userIds: [2, 3] })).toEqual({ id: [2, 3] });

    const normalized = normalizeBroadcastRequest({
      title: 'Hi',
      content: 'No one',
      audience: 'specific',
      userIds: [],
    });

    expect(normalized.error).toBe('userIds are required for specific audience broadcasts');
  });
});