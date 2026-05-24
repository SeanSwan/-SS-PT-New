/**
 * useSocialNotifications
 * ======================
 * Live in-app notification state for the Social Hub. Reads the canonical
 * /api/notifications API and never seeds local/demo notification data.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api.service';
import { logger } from '@/utils/logger';

export interface SocialNotificationSender {
  id?: number | string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
}

export interface SocialNotification {
  id: number | string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  persistent?: boolean | null;
  link?: string | null;
  image?: string | null;
  createdAt?: string;
  sender?: SocialNotificationSender | null;
}

interface NotificationsPayload {
  success?: boolean;
  message?: string;
  data?: {
    notifications?: SocialNotification[];
    unreadCount?: number;
  };
  notifications?: SocialNotification[];
  unreadCount?: number;
}

const EMPTY_STATE: SocialNotification[] = [];

function normalizePayload(payload: NotificationsPayload) {
  const body = payload.data ?? payload;
  const notifications = Array.isArray(body.notifications) ? body.notifications : EMPTY_STATE;
  const unreadCount = Number.isFinite(body.unreadCount)
    ? Number(body.unreadCount)
    : notifications.filter((notification) => !notification.read).length;

  return { notifications, unreadCount };
}

export function useSocialNotifications() {
  const [notifications, setNotifications] = useState<SocialNotification[]>(EMPTY_STATE);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<NotificationsPayload>('/api/notifications');
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Notification API returned an error');
      }

      const next = normalizePayload(response.data);
      setNotifications(next.notifications);
      setUnreadCount(next.unreadCount);
    } catch (err: any) {
      logger.warn('[useSocialNotifications] Unable to load notifications:', err.message);
      setNotifications(EMPTY_STATE);
      setUnreadCount(0);
      setError('Notifications are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId: SocialNotification['id']) => {
      const target = notifications.find((notification) => String(notification.id) === String(notificationId));
      if (!target || target.read) return;

      const previousNotifications = notifications;
      const previousUnreadCount = unreadCount;

      setNotifications((current) =>
        current.map((notification) =>
          String(notification.id) === String(notificationId)
            ? { ...notification, read: true }
            : notification,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await apiService.patch(`/api/notifications/${notificationId}/read`);
      } catch (err: any) {
        logger.warn('[useSocialNotifications] Unable to mark notification read:', err.message);
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        setError('Unable to update that notification.');
      }
    },
    [notifications, unreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);

    try {
      await apiService.patch('/api/notifications/read-all');
    } catch (err: any) {
      logger.warn('[useSocialNotifications] Unable to mark all notifications read:', err.message);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError('Unable to mark notifications read.');
    }
  }, [notifications, unreadCount]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh: () => fetchNotifications(false),
      markAsRead,
      markAllAsRead,
    }),
    [error, fetchNotifications, loading, markAllAsRead, markAsRead, notifications, unreadCount],
  );
}

export default useSocialNotifications;
