import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState, AppDispatch } from '../redux/store';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { logger } from '@/utils/logger';
import {
  addNotification as addNotificationAction,
  clearNotifications as clearNotificationsAction,
  fetchNotifications,
  markAllAsRead as markAllNotificationsAsRead,
  markAsClicked as markNotificationClicked,
  markAsRead as markNotificationAsRead,
  removeNotification as removeNotificationAction,
  resolveNotificationAction as resolveNotificationActionThunk,
  setUnreadCount,
  snoozeNotification as snoozeNotificationAction,
  type Notification,
} from '../store/slices/notificationSlice';

interface NotificationCountPayload {
  count?: number;
  unreadCount?: number;
}

interface UseNotificationCenterOptions {
  fetchOnMount?: boolean;
  subscribeToSocket?: boolean;
}

export function useNotificationCenter({
  fetchOnMount = false,
  subscribeToSocket = false,
}: UseNotificationCenterOptions = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const { socket } = useSocket();
  const { notifications, unreadCount, loading, error } = useSelector(
    (state: RootState) => state.notifications,
  );

  const refresh = useCallback(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (fetchOnMount) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, fetchOnMount]);

  useEffect(() => {
    if (!subscribeToSocket || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      dispatch(addNotificationAction(notification));
    };

    const handleNotificationCount = (data: NotificationCountPayload) => {
      dispatch(setUnreadCount(data.unreadCount ?? data.count ?? 0));
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleNotificationCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleNotificationCount);
    };
  }, [dispatch, socket, subscribeToSocket]);

  const addNotification = useCallback(
    (notification: Partial<Notification>) => {
      dispatch(addNotificationAction(notification));
    },
    [dispatch],
  );

  const markAsRead = useCallback(
    async (notificationId: string | number) => {
      await dispatch(markNotificationAsRead(String(notificationId)));
    },
    [dispatch],
  );

  const markAsClicked = useCallback(
    async (notificationId: string | number) => {
      await dispatch(markNotificationClicked(String(notificationId)));
    },
    [dispatch],
  );

  const snoozeNotification = useCallback(
    async (notificationId: string | number, durationMinutes = 60) => {
      await dispatch(snoozeNotificationAction({ notificationId: String(notificationId), durationMinutes }));
    },
    [dispatch],
  );

  const resolveNotificationAction = useCallback(
    async (notificationId: string | number, status: 'resolved' | 'dismissed') => {
      await dispatch(resolveNotificationActionThunk({ notificationId: String(notificationId), status }));
    },
    [dispatch],
  );
  const markAllAsRead = useCallback(async () => {
    await dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  const removeNotification = useCallback(
    async (notificationId: string | number) => {
      dispatch(removeNotificationAction(String(notificationId)));
      try {
        await api.delete(`/api/notifications/${notificationId}`);
      } catch (deleteError: any) {
        logger.warn('[useNotificationCenter] Unable to delete notification:', deleteError.message);
        dispatch(fetchNotifications());
      }
    },
    [dispatch],
  );

  const clearNotifications = useCallback(() => {
    dispatch(clearNotificationsAction());
  }, [dispatch]);

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      addNotification,
      markAsRead,
      markAsClicked,
      snoozeNotification,
      resolveNotificationAction,
      markAllAsRead,
      removeNotification,
      clearNotifications,
    }),
    [
      addNotification,
      clearNotifications,
      error,
      loading,
      markAllAsRead,
      markAsClicked,
      markAsRead,
      notifications,
      refresh,
      removeNotification,
      resolveNotificationAction,
      snoozeNotification,
      unreadCount,
    ],
  );
}

export default useNotificationCenter;
