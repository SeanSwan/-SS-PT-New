/**
 * useSocialNotifications
 * ======================
 * Adapter over the shared notification center for Social Hub and dashboard tabs.
 */

import { useCallback, useMemo } from 'react';

import { useNotificationCenter } from './useNotificationCenter';
import type { Notification as CenterNotification, NotificationSender } from '../store/slices/notificationSlice';

export interface SocialNotificationSender extends NotificationSender {
  profilePicture?: string | null;
}

export interface SocialNotification extends Omit<CenterNotification, 'sender' | 'image'> {
  persistent?: boolean | null;
  image?: string | null;
  sender?: SocialNotificationSender | null;
}

function toSocialNotification(notification: CenterNotification): SocialNotification {
  const sender = notification.sender
    ? {
        ...notification.sender,
        profilePicture:
          notification.sender.profileImageUrl || notification.sender.photo || notification.sender.avatar || null,
      }
    : null;

  return {
    ...notification,
    image: notification.image ?? null,
    sender,
  };
}

export function useSocialNotifications() {
  const notificationCenter = useNotificationCenter({ fetchOnMount: true });
  const notifications = useMemo(
    () => notificationCenter.notifications.map(toSocialNotification),
    [notificationCenter.notifications],
  );

  const markAsRead = useCallback(
    async (notificationId: SocialNotification['id']) => {
      await notificationCenter.markAsRead(notificationId);
    },
    [notificationCenter],
  );

  const markAsClicked = useCallback(
    async (notificationId: SocialNotification['id']) => {
      await notificationCenter.markAsClicked(notificationId);
    },
    [notificationCenter],
  );

  return useMemo(
    () => ({
      notifications,
      unreadCount: notificationCenter.unreadCount,
      loading: notificationCenter.loading,
      error: notificationCenter.error,
      refresh: notificationCenter.refresh,
      markAsRead,
      markAsClicked,
      markAllAsRead: notificationCenter.markAllAsRead,
      snoozeNotification: notificationCenter.snoozeNotification,
    }),
    [markAsClicked, markAsRead, notificationCenter, notifications],
  );
}

export default useSocialNotifications;
