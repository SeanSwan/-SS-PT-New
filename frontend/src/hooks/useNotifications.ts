/**
 * useNotifications Hook
 * ====================
 * Hook for managing notifications in the Universal Master Schedule and other components.
 * Provides methods to display, dismiss, and manage notification states.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../services/api.service';
import { logger } from '@/utils/logger';
import { useToast } from './use-toast';

// Types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  userId?: string;
  data?: any;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationOptions {
  persist?: boolean;
  autoClose?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface NotificationsPayload {
  success?: boolean;
  message?: string;
  data?: {
    notifications?: Partial<Notification>[];
    unreadCount?: number;
  };
  notifications?: Partial<Notification>[];
  unreadCount?: number;
}

const EMPTY_NOTIFICATIONS: Notification[] = [];

function isActiveNotification(notification: Notification) {
  return !notification.expiresAt || new Date(notification.expiresAt) > new Date();
}

function normalizeNotification(notification: Partial<Notification>): Notification {
  return {
    ...notification,
    id: String(notification.id ?? globalThis.crypto?.randomUUID?.() ?? Date.now()),
    type: notification.type || 'info',
    title: notification.title || 'Notification',
    message: notification.message || '',
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString(),
  };
}

function normalizePayload(payload: NotificationsPayload) {
  const body = payload.data ?? payload;
  const notifications = Array.isArray(body.notifications)
    ? body.notifications.map(normalizeNotification).filter(isActiveNotification)
    : EMPTY_NOTIFICATIONS;
  const unreadCount = Number.isFinite(body.unreadCount)
    ? Number(body.unreadCount)
    : notifications.filter((notification) => !notification.read).length;

  return { notifications, unreadCount };
}

/**
 * useNotifications Hook
 * 
 * Provides notification management functionality including:
 * - Displaying toast notifications
 * - Managing persistent notifications
 * - Marking notifications as read
 * - Filtering notifications by type
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(EMPTY_NOTIFICATIONS);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await apiService.get<NotificationsPayload>('/api/notifications');
      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Notification API returned an error');
      }

      const next = normalizePayload(response.data);
      setNotifications(next.notifications);
      setServerUnreadCount(next.unreadCount);
    } catch (error: any) {
      logger.warn('[useNotifications] Unable to load notifications:', error.message);
      setNotifications(EMPTY_NOTIFICATIONS);
      setServerUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get unread notifications count
  const unreadCount = useMemo(() => {
    return serverUnreadCount || notifications.filter(n => !n.read).length;
  }, [notifications, serverUnreadCount]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: Notification['type']) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [newNotification, ...prev]);
    if (!newNotification.read) {
      setServerUnreadCount((count) => count + 1);
    }
    return newNotification;
  }, []);

  // Show toast notification
  const showToast = useCallback((
    message: string,
    options: NotificationOptions = {}
  ) => {
    const {
      type = 'info',
      autoClose = 5000,
      position = 'top-right'
    } = options;

    // Convert type to variant for the project's toast system
    let variant: 'default' | 'destructive' = 'default';
    if (type === 'error') {
      variant = 'destructive';
    }

    const title = type === 'success' ? 'Success' : 
                  type === 'error' ? 'Error' : 
                  type === 'warning' ? 'Warning' : 
                  'Info';

    toast({ title, description: message, variant });
  }, [toast]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
        : notification
      )
    );
    setServerUnreadCount((count) => Math.max(0, count - 1));

    try {
      await apiService.patch(`/api/notifications/${notificationId}/read`);
    } catch (error: any) {
      logger.warn('[useNotifications] Unable to mark notification read:', error.message);
      setNotifications(previousNotifications);
      setServerUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setServerUnreadCount(0);

    try {
      await apiService.patch('/api/notifications/read-all');
    } catch (error: any) {
      logger.warn('[useNotifications] Unable to mark all notifications read:', error.message);
      setNotifications(previousNotifications);
      setServerUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount]);

  // Remove notification
  const removeNotification = useCallback(async (notificationId: string) => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    const removedNotification = notifications.find((notification) => notification.id === notificationId);

    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    if (removedNotification && !removedNotification.read) {
      setServerUnreadCount((count) => Math.max(0, count - 1));
    }

    try {
      await apiService.delete(`/api/notifications/${notificationId}`);
    } catch (error: any) {
      logger.warn('[useNotifications] Unable to remove notification:', error.message);
      setNotifications(previousNotifications);
      setServerUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setServerUnreadCount(0);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Notification management methods
  const notificationMethods = {
    // Toast notifications
    success: (message: string, options?: NotificationOptions) => 
      showToast(message, { ...options, type: 'success' }),
    error: (message: string, options?: NotificationOptions) => 
      showToast(message, { ...options, type: 'error' }),
    warning: (message: string, options?: NotificationOptions) => 
      showToast(message, { ...options, type: 'warning' }),
    info: (message: string, options?: NotificationOptions) => 
      showToast(message, { ...options, type: 'info' }),
  };

  return {
    // Notification data
    notifications,
    unreadCount,
    isLoading,
    
    // Notification methods
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getNotificationsByType,
    
    // Toast methods
    toast: notificationMethods,
    showToast,
    
    // Utility methods
    refresh: () => fetchNotifications(false),
  };
};

export default useNotifications;
