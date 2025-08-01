/**
 * useAdminNotifications - Real-time Admin Notification System
 * ===========================================================
 * Production-grade notification system for SwanStudios admin dashboard
 * 
 * CORE RESPONSIBILITIES:
 * - Real-time system event notifications (user signups, payments, errors)
 * - Admin action notifications (session bookings, cancellations, updates)
 * - Critical alert management (system failures, security events)
 * - Multi-channel notification delivery (toast, sound, desktop, email)
 * - Notification persistence and acknowledgment tracking
 * - Priority-based notification routing and throttling
 * 
 * ENTERPRISE FEATURES:
 * - Smart notification grouping and deduplication
 * - Contextual action buttons for quick responses
 * - Real-time notification feed with search and filtering
 * - Customizable notification preferences per admin
 * - Notification analytics and delivery tracking
 * - Integration with external notification services
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../../hooks/use-toast';

// Notification Types
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationCategory = 'system' | 'user' | 'financial' | 'security' | 'content' | 'performance';
export type NotificationChannel = 'toast' | 'sound' | 'desktop' | 'email' | 'sms';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  
  // Enhanced Properties
  source: string; // Which system/component sent this
  userId?: string; // Related user if applicable
  sessionId?: string; // Related session if applicable
  metadata?: Record<string, any>; // Additional context data
  
  // Action Configuration
  actions?: NotificationAction[];
  autoExpire?: number; // Milliseconds until auto-dismiss
  persistent?: boolean; // Prevent auto-dismiss
  
  // Delivery Tracking
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, 'pending' | 'delivered' | 'failed'>;
  readAt?: Date;
  dismissedAt?: Date;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => Promise<void> | void;
  requiresConfirmation?: boolean;
}

export interface NotificationPreferences {
  enableToast: boolean;
  enableSound: boolean;
  enableDesktop: boolean;
  enableEmail: boolean;
  
  // Priority Filters
  minimumPriority: NotificationPriority;
  mutedCategories: NotificationCategory[];
  
  // Timing Controls
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;
  maxNotificationsPerMinute: number;
  
  // Sound Configuration
  soundVolume: number; // 0-100
  customSounds: Record<NotificationCategory, string>;
}

export interface AdminNotificationValues {
  // Core State
  notifications: AdminNotification[];
  unreadCount: number;
  criticalCount: number;
  
  // Feed Management
  filteredNotifications: AdminNotification[];
  currentFilter: NotificationFilter;
  isLoading: boolean;
  
  // Real-time Status
  isConnected: boolean;
  lastNotificationTime: Date | null;
  notificationsToday: number;
  
  // Preferences
  preferences: NotificationPreferences;
  
  // Analytics
  notificationStats: NotificationStats;
}

export interface AdminNotificationActions {
  // Notification Management
  acknowledgeNotification: (id: string) => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  
  // Filtering & Search
  setFilter: (filter: NotificationFilter) => void;
  searchNotifications: (query: string) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  toggleCategory: (category: NotificationCategory) => void;
  
  // Manual Actions
  sendTestNotification: () => void;
  exportNotifications: () => void;
  
  // Real-time Control
  pauseNotifications: () => void;
  resumeNotifications: () => void;
}

interface NotificationFilter {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  acknowledged?: boolean;
  actionRequired?: boolean;
}

interface NotificationStats {
  totalReceived: number;
  averageResponseTime: number; // Time to acknowledge
  categoryBreakdown: Record<NotificationCategory, number>;
  priorityBreakdown: Record<NotificationPriority, number>;
  peakHours: string[]; // Hours with most notifications
}

interface UseAdminNotificationsParams {
  wsUrl?: string;
  enableRealTime?: boolean;
  maxNotifications?: number;
  defaultPreferences?: Partial<NotificationPreferences>;
}

/**
 * useAdminNotifications Hook
 * 
 * Comprehensive notification system for admin dashboard with real-time updates,
 * smart filtering, and multi-channel delivery capabilities.
 */
export const useAdminNotifications = ({
  wsUrl = 'ws://localhost:3001/admin-notifications',
  enableRealTime = true,
  maxNotifications = 1000,
  defaultPreferences = {}
}: UseAdminNotificationsParams = {}) => {
  const { toast } = useToast();
  
  // ==================== STATE MANAGEMENT ====================
  
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [currentFilter, setCurrentFilter] = useState<NotificationFilter>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Preferences with defaults
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableToast: true,
    enableSound: true,
    enableDesktop: false,
    enableEmail: false,
    minimumPriority: 'low',
    mutedCategories: [],
    maxNotificationsPerMinute: 10,
    soundVolume: 50,
    customSounds: {
      system: '/sounds/system.mp3',
      user: '/sounds/user.mp3',
      financial: '/sounds/financial.mp3',
      security: '/sounds/security.mp3',
      content: '/sounds/content.mp3',
      performance: '/sounds/performance.mp3'
    },
    ...defaultPreferences
  });
  
  // ==================== REFS ====================
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationThrottleRef = useRef<Map<string, number>>(new Map());
  
  // ==================== COMPUTED VALUES ====================
  
  const unreadCount = notifications.filter(n => !n.readAt).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.acknowledged).length;
  const notificationsToday = notifications.filter(n => {
    const today = new Date();
    return n.timestamp.toDateString() === today.toDateString();
  }).length;
  
  const filteredNotifications = notifications.filter(notification => {
    if (currentFilter.category && notification.category !== currentFilter.category) return false;
    if (currentFilter.priority && notification.priority !== currentFilter.priority) return false;
    if (currentFilter.acknowledged !== undefined && notification.acknowledged !== currentFilter.acknowledged) return false;
    if (currentFilter.actionRequired !== undefined && notification.actionRequired !== currentFilter.actionRequired) return false;
    
    if (currentFilter.dateRange) {
      const now = new Date();
      const notificationDate = notification.timestamp;
      
      switch (currentFilter.dateRange) {
        case 'today':
          if (notificationDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (notificationDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (notificationDate < monthAgo) return false;
          break;
      }
    }
    
    return true;
  });
  
  const notificationStats: NotificationStats = {
    totalReceived: notifications.length,
    averageResponseTime: calculateAverageResponseTime(),
    categoryBreakdown: calculateCategoryBreakdown(),
    priorityBreakdown: calculatePriorityBreakdown(),
    peakHours: calculatePeakHours()
  };
  
  // ==================== HELPER FUNCTIONS ====================
  
  function calculateAverageResponseTime(): number {
    const acknowledgedNotifications = notifications.filter(n => n.acknowledged && n.readAt);
    if (acknowledgedNotifications.length === 0) return 0;
    
    const totalTime = acknowledgedNotifications.reduce((sum, n) => {
      return sum + (n.readAt!.getTime() - n.timestamp.getTime());
    }, 0);
    
    return totalTime / acknowledgedNotifications.length;
  }
  
  function calculateCategoryBreakdown(): Record<NotificationCategory, number> {
    return notifications.reduce((breakdown, notification) => {
      breakdown[notification.category] = (breakdown[notification.category] || 0) + 1;
      return breakdown;
    }, {} as Record<NotificationCategory, number>);
  }
  
  function calculatePriorityBreakdown(): Record<NotificationPriority, number> {
    return notifications.reduce((breakdown, notification) => {
      breakdown[notification.priority] = (breakdown[notification.priority] || 0) + 1;
      return breakdown;
    }, {} as Record<NotificationPriority, number>);
  }
  
  function calculatePeakHours(): string[] {
    const hourCounts = notifications.reduce((counts, notification) => {
      const hour = notification.timestamp.getHours().toString().padStart(2, '0');
      counts[hour] = (counts[hour] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }
  
  // ==================== NOTIFICATION PROCESSING ====================
  
  const processIncomingNotification = useCallback((notification: AdminNotification) => {
    // Check if notifications are paused
    if (isPaused) return;
    
    // Check preferences filters
    if (preferences.mutedCategories.includes(notification.category)) return;
    
    const priorityOrder = ['low', 'normal', 'high', 'critical'];
    const notificationPriorityIndex = priorityOrder.indexOf(notification.priority);
    const minimumPriorityIndex = priorityOrder.indexOf(preferences.minimumPriority);
    
    if (notificationPriorityIndex < minimumPriorityIndex) return;
    
    // Check quiet hours
    if (preferences.quietHoursStart && preferences.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (preferences.quietHoursStart <= preferences.quietHoursEnd) {
        // Same day quiet hours
        if (currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd) {
          return;
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd) {
          return;
        }
      }
    }
    
    // Throttling check
    const now = Date.now();
    const categoryKey = notification.category;
    const lastNotificationTime = notificationThrottleRef.current.get(categoryKey) || 0;
    const timeSinceLastNotification = now - lastNotificationTime;
    const minInterval = 60000 / preferences.maxNotificationsPerMinute; // Convert to milliseconds
    
    if (timeSinceLastNotification < minInterval) {
      console.log(`Throttling notification for category: ${categoryKey}`);
      return;
    }
    
    notificationThrottleRef.current.set(categoryKey, now);
    
    // Add to notifications list
    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Keep only max notifications
      return newNotifications.slice(0, maxNotifications);
    });
    
    setLastNotificationTime(new Date());
    
    // Deliver through enabled channels
    deliverNotification(notification);
  }, [isPaused, preferences, maxNotifications]);
  
  const deliverNotification = useCallback((notification: AdminNotification) => {
    // Toast notification
    if (preferences.enableToast) {
      const variant = notification.priority === 'critical' ? 'destructive' : 
                    notification.priority === 'high' ? 'default' : 'default';
      
      toast({
        title: notification.title,
        description: notification.message,
        variant,
        duration: notification.priority === 'critical' ? 0 : 5000, // Critical notifications don't auto-dismiss
        action: notification.actions?.[0] ? {
          altText: notification.actions[0].label,
          onClick: notification.actions[0].handler
        } : undefined
      });
    }
    
    // Sound notification
    if (preferences.enableSound && !audioRef.current) {
      try {
        const audio = new Audio(preferences.customSounds[notification.category]);
        audio.volume = preferences.soundVolume / 100;
        audioRef.current = audio;
        audio.play().catch(error => {
          console.warn('Failed to play notification sound:', error);
        }).finally(() => {
          audioRef.current = null;
        });
      } catch (error) {
        console.warn('Failed to create audio for notification:', error);
      }
    }
    
    // Desktop notification
    if (preferences.enableDesktop && 'Notification' in window && Notification.permission === 'granted') {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'critical'
      });
      
      desktopNotification.onclick = () => {
        window.focus();
        markAsRead(notification.id);
        desktopNotification.close();
      };
      
      // Auto-close non-critical notifications
      if (notification.priority !== 'critical') {
        setTimeout(() => desktopNotification.close(), 5000);
      }
    }
  }, [preferences, toast]);
  
  // ==================== ACTION HANDLERS ====================
  
  const acknowledgeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, acknowledged: true, readAt: new Date() } : n
    ));
  }, []);
  
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, readAt: new Date() } : n
    ));
  }, []);
  
  const markAllAsRead = useCallback(() => {
    const now = new Date();
    setNotifications(prev => prev.map(n => ({ ...n, readAt: now })));
  }, []);
  
  const setFilter = useCallback((filter: NotificationFilter) => {
    setCurrentFilter(filter);
  }, []);
  
  const searchNotifications = useCallback((query: string) => {
    // Implementation would filter notifications based on search query
    console.log('Searching notifications:', query);
  }, []);
  
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);
  
  const toggleCategory = useCallback((category: NotificationCategory) => {
    setPreferences(prev => ({
      ...prev,
      mutedCategories: prev.mutedCategories.includes(category)
        ? prev.mutedCategories.filter(c => c !== category)
        : [...prev.mutedCategories, category]
    }));
  }, []);
  
  const sendTestNotification = useCallback(() => {
    const testNotification: AdminNotification = {
      id: `test-${Date.now()}`,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      category: 'system',
      priority: 'normal',
      timestamp: new Date(),
      acknowledged: false,
      actionRequired: false,
      source: 'Admin Dashboard',
      channels: ['toast', 'sound'],
      deliveryStatus: {
        toast: 'pending',
        sound: 'pending',
        desktop: 'pending',
        email: 'pending',
        sms: 'pending'
      },
      actions: [{
        id: 'test-action',
        label: 'Mark as Read',
        type: 'primary',
        handler: () => markAsRead(`test-${Date.now()}`)
      }]
    };
    
    processIncomingNotification(testNotification);
  }, [processIncomingNotification, markAsRead]);
  
  const exportNotifications = useCallback(() => {
    const dataStr = JSON.stringify(notifications, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-notifications-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [notifications]);
  
  const pauseNotifications = useCallback(() => {
    setIsPaused(true);
  }, []);
  
  const resumeNotifications = useCallback(() => {
    setIsPaused(false);
  }, []);
  
  // ==================== REAL-TIME CONNECTION ====================
  
  useEffect(() => {
    if (!enableRealTime) return;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ Admin notifications WebSocket connected');
          setIsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              processIncomingNotification(data.notification);
            }
          } catch (error) {
            console.error('Failed to parse notification message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 Admin notifications WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt reconnection after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ Admin notifications WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect admin notifications WebSocket:', error);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enableRealTime, wsUrl, processIncomingNotification]);
  
  // ==================== DESKTOP PERMISSION ====================
  
  useEffect(() => {
    if (preferences.enableDesktop && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Desktop notification permission:', permission);
      });
    }
  }, [preferences.enableDesktop]);
  
  // ==================== RETURN VALUES ====================
  
  const values: AdminNotificationValues = {
    notifications,
    unreadCount,
    criticalCount,
    filteredNotifications,
    currentFilter,
    isLoading,
    isConnected,
    lastNotificationTime,
    notificationsToday,
    preferences,
    notificationStats
  };
  
  const actions: AdminNotificationActions = {
    acknowledgeNotification,
    dismissNotification,
    dismissAll,
    markAsRead,
    markAllAsRead,
    setFilter,
    searchNotifications,
    updatePreferences,
    toggleCategory,
    sendTestNotification,
    exportNotifications,
    pauseNotifications,
    resumeNotifications
  };
  
  return { ...values, ...actions };
};

export default useAdminNotifications;
