/**
 * useNotifications Hook
 * =====================
 * Legacy notification utility API backed by the shared notification center.
 */

import { useCallback, useMemo } from 'react';

import { useToast } from './use-toast';
import { useNotificationCenter } from './useNotificationCenter';
import type { Notification as CenterNotification } from '../store/slices/notificationSlice';

export interface Notification extends Omit<CenterNotification, 'type'> {
  type: string;
  data?: any;
  expiresAt?: string;
}

export interface NotificationOptions {
  persist?: boolean;
  autoClose?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

function toLegacyNotification(notification: CenterNotification): Notification {
  return { ...notification };
}

function isActiveNotification(notification: Notification) {
  return !notification.expiresAt || new Date(notification.expiresAt) > new Date();
}

export const useNotifications = () => {
  const notificationCenter = useNotificationCenter({ fetchOnMount: true });
  const { toast } = useToast();
  const notifications = useMemo(
    () => notificationCenter.notifications.map(toLegacyNotification).filter(isActiveNotification),
    [notificationCenter.notifications],
  );

  const unreadCount = useMemo(
    () => notificationCenter.unreadCount || notifications.filter((notification) => !notification.read).length,
    [notificationCenter.unreadCount, notifications],
  );

  const getNotificationsByType = useCallback(
    (type: Notification['type']) => notifications.filter((notification) => notification.type === type),
    [notifications],
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notification,
        id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      notificationCenter.addNotification(newNotification);
      return newNotification;
    },
    [notificationCenter],
  );

  const showToast = useCallback(
    (message: string, options: NotificationOptions = {}) => {
      const { type = 'info' } = options;
      const variant = type === 'error' ? 'destructive' : 'default';
      const title =
        type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info';
      toast({ title, description: message, variant });
    },
    [toast],
  );

  const notificationMethods = useMemo(
    () => ({
      success: (message: string, options?: NotificationOptions) => showToast(message, { ...options, type: 'success' }),
      error: (message: string, options?: NotificationOptions) => showToast(message, { ...options, type: 'error' }),
      warning: (message: string, options?: NotificationOptions) => showToast(message, { ...options, type: 'warning' }),
      info: (message: string, options?: NotificationOptions) => showToast(message, { ...options, type: 'info' }),
    }),
    [showToast],
  );

  return {
    notifications,
    unreadCount,
    isLoading: notificationCenter.loading,
    addNotification,
    markAsRead: notificationCenter.markAsRead,
    markAllAsRead: notificationCenter.markAllAsRead,
    removeNotification: notificationCenter.removeNotification,
    clearAll: notificationCenter.clearNotifications,
    getNotificationsByType,
    toast: notificationMethods,
    showToast,
    refresh: notificationCenter.refresh,
  };
};

export default useNotifications;
