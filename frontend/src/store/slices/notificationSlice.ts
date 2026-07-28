/**
 * Notification Slice
 * Manages user notifications, unread counts, and canonical API response shapes.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { logger } from '@/utils/logger';
import {
  normalizeNotification,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
} from './notificationPayloadNormalization';
import type { Notification, NotificationState } from './notificationTypes';

export type {
  Notification,
  NotificationAction,
  NotificationPriority,
  NotificationSender,
  NotificationState,
  NotificationType,
} from './notificationTypes';
export {
  normalizeNotification,
  normalizeNotificationDetailPayload,
  normalizeNotificationsPayload,
} from './notificationPayloadNormalization';

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null
};

export const DEFAULT_SNOOZE_DURATION_MINUTES = 60;

export interface SnoozeNotificationArgs {
  notificationId: string;
  durationMinutes?: number;
}

export interface ResolveNotificationActionArgs {
  notificationId: string;
  status: 'resolved' | 'dismissed';
}

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/notifications');
      return normalizeNotificationsPayload(response.data);
    } catch (error: any) {
      logger.warn('[Notifications] Failed to fetch notifications:', error.message);
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return normalizeNotificationDetailPayload(response.data, notificationId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAsClicked = createAsyncThunk(
  'notifications/markAsClicked',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/click`);
      return normalizeNotificationDetailPayload(response.data, notificationId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notification as clicked');
    }
  }
);

export const snoozeNotification = createAsyncThunk(
  'notifications/snooze',
  async (
    { notificationId, durationMinutes = DEFAULT_SNOOZE_DURATION_MINUTES }: SnoozeNotificationArgs,
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/snooze`, { durationMinutes });
      return normalizeNotificationDetailPayload(response.data, notificationId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to snooze notification');
    }
  },
);

export const resolveNotificationAction = createAsyncThunk(
  'notifications/resolveAction',
  async (
    { notificationId, status }: ResolveNotificationActionArgs,
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/action-status`, { status });
      return normalizeNotificationDetailPayload(response.data, notificationId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update notification action');
    }
  },
);
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/notifications/read-all');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Partial<Notification>>) => {
      const notification = normalizeNotification(action.payload);
      const existingIndex = state.notifications.findIndex((item) => item.id === notification.id);

      if (existingIndex !== -1) {
        const wasUnread = !state.notifications[existingIndex].read;
        state.notifications[existingIndex] = {
          ...state.notifications[existingIndex],
          ...notification,
        };
        if (wasUnread && notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && !notification.read) {
          state.unreadCount += 1;
        }
        return;
      }

      state.notifications.unshift(notification);
      if (!notification.read) state.unreadCount += 1;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].read;
        state.notifications.splice(index, 1);
        if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    resetError: (state) => {
      state.error = null;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        logger.warn('Notification fetch rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.loading = false;
        const notification = state.notifications.find(n => n.id === action.payload.id);
        if (notification && !notification.read) {
          Object.assign(notification, action.payload, { read: true });
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(markAsClicked.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsClicked.fulfilled, (state, action) => {
        state.loading = false;
        const notification = state.notifications.find(n => n.id === action.payload.id);
        if (notification) {
          const wasUnread = !notification.read;
          Object.assign(notification, action.payload, { read: true });
          if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsClicked.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(snoozeNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(snoozeNotification.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          const wasUnread = !state.notifications[index].read;
          state.notifications.splice(index, 1);
          if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(snoozeNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(resolveNotificationAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveNotificationAction.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.notifications.findIndex(n => n.id === action.payload.id);
        if (index !== -1) {
          const wasUnread = !state.notifications[index].read;
          state.notifications.splice(index, 1);
          if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(resolveNotificationAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.loading = false;
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  resetError,
  setUnreadCount
} = notificationSlice.actions;

export default notificationSlice.reducer;
