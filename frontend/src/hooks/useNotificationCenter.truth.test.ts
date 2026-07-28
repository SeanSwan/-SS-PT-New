import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('useNotificationCenter source contract', () => {
  it('centralizes notification API, socket, and Redux orchestration', () => {
    const centerSource = stripComments(read('src/hooks/useNotificationCenter.ts'));
    const headerSource = stripComments(read('src/components/Header/EnhancedNotificationSection.tsx'));
    const socialHookSource = stripComments(read('src/hooks/useSocialNotifications.ts'));
    const legacyHookSource = stripComments(read('src/hooks/useNotifications.ts'));

    expect(centerSource).toContain("import { useSocket } from '../context/SocketContext'");
    expect(centerSource).toContain("from '../store/slices/notificationSlice'");
    expect(centerSource).toContain('dispatch(fetchNotifications())');
    expect(centerSource).toContain('markAsClicked as markNotificationClicked');
    expect(centerSource).toContain('snoozeNotification as snoozeNotificationAction');
    expect(centerSource).toContain('dispatch(markNotificationClicked(String(notificationId)))');
    expect(centerSource).toContain('dispatch(snoozeNotificationAction({ notificationId: String(notificationId), durationMinutes }))');
    expect(centerSource).toContain("socket.on('notification:new'");
    expect(centerSource).toContain("socket.on('notification:count'");
    expect(centerSource).toContain('api.delete(`/api/notifications/${notificationId}`)');

    expect(headerSource).toContain('useNotificationCenter({ subscribeToSocket: true');
    expect(headerSource).toContain('markAsClicked: markNotificationClicked');
    expect(headerSource).toContain('await markNotificationClicked(notification.id);');
    expect(headerSource).not.toContain("socket.on('notification:new'");
    expect(headerSource).not.toContain("socket.on('notification:count'");
    expect(headerSource).not.toContain('api.delete(`/api/notifications/${id}`).catch(() => {});');

    expect(socialHookSource).toContain('useNotificationCenter({ fetchOnMount: true');
    expect(socialHookSource).toContain('notificationCenter.markAsClicked(notificationId)');
    expect(socialHookSource).not.toContain("apiService.get<NotificationsPayload>('/api/notifications')");
    expect(socialHookSource).not.toContain('apiService.patch');

    expect(legacyHookSource).toContain('useNotificationCenter({ fetchOnMount: true');
    expect(legacyHookSource).not.toContain("apiService.get<NotificationsPayload>('/api/notifications')");
    expect(legacyHookSource).not.toContain('apiService.patch');
  });
});
