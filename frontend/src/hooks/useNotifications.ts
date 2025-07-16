/**
 * useNotifications Hook
 * ====================
 * Hook for managing notifications in the Universal Master Schedule and other components.
 * Provides methods to display, dismiss, and manage notification states.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './use-toast';

// Types
export interface Notification {
  id: string;
  type: 'session_created' | 'session_updated' | 'session_cancelled' | 'assignment_created' | 'assignment_updated' | 'info' | 'success' | 'warning' | 'error';
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

// Mock notification storage (in a real app, this would come from a backend)
let mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'session_created',
    title: 'Session Created',
    message: 'New training session has been created for tomorrow at 2:00 PM',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
  },
  {
    id: '2',
    type: 'assignment_created',
    title: 'Client Assigned',
    message: 'New client has been assigned to trainer Sarah Johnson',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    type: 'session_updated',
    title: 'Session Rescheduled',
    message: 'Training session with John Doe has been moved to 4:00 PM',
    read: true,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
];

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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get unread notifications count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: Notification['type']) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [newNotification, ...prev]);
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
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Simulate real-time notifications (in a real app, this would be WebSocket or polling)
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add a notification every 30 seconds (for demo purposes)
      if (Math.random() < 0.1) { // 10% chance
        const randomNotifications = [
          {
            type: 'session_created' as const,
            title: 'New Session Available',
            message: 'A new training session slot has become available',
            read: false,
          },
          {
            type: 'session_updated' as const,
            title: 'Session Updated',
            message: 'A training session has been updated',
            read: false,
          },
          {
            type: 'assignment_created' as const,
            title: 'New Assignment',
            message: 'A new client-trainer assignment has been created',
            read: false,
          },
        ];

        const randomNotification = randomNotifications[Math.floor(Math.random() * randomNotifications.length)];
        addNotification(randomNotification);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [addNotification]);

  // Clean up expired notifications
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(notification => {
          if (!notification.expiresAt) return true;
          return new Date(notification.expiresAt) > now;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

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
    refresh: () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    },
  };
};

export default useNotifications;
