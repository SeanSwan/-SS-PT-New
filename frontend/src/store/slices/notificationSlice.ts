/**
 * Notification Slice
 * Manages user notifications, unread counts, and canonical API response shapes.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { logger } from '@/utils/logger';

export type NotificationType =
  | 'orientation'
  | 'system'
  | 'order'
  | 'workout'
  | 'client'
  | 'admin'
  | 'session'
  | 'achievement'
  | 'reward'
  | 'social'
  | 'message'
  | 'measurement'
  | 'reminder'
  | 'progress'
  | 'info';

export interface NotificationSender {
  id?: string | number;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  photo?: string;
  profileImageUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
  image?: string;
  userId?: string | number;
  sender?: NotificationSender;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

interface NotificationListBody {
  notifications?: Partial<Notification>[];
  unreadCount?: number;
}

interface NotificationApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

type NotificationListResponse = NotificationListBody | NotificationApiEnvelope<NotificationListBody>;
type NotificationDetailResponse = Partial<Notification> | NotificationApiEnvelope<Partial<Notification>>;

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null
};

const unwrapApiData = <T>(payload: NotificationApiEnvelope<T> | T | undefined): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as NotificationApiEnvelope<T>).data;
    if (data !== undefined && data !== null) return data;
  }
  return (payload ?? {}) as T;
};

const normalizeSender = (sender: NotificationSender | undefined): NotificationSender | undefined => {
  if (!sender) return undefined;
  const name = sender.name || [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim();
  return {
    ...sender,
    id: sender.id,
    name: name || undefined,
    avatar: sender.avatar || sender.photo || sender.profileImageUrl,
  };
};

export const normalizeNotification = (notification: Partial<Notification>): Notification => ({
  ...notification,
  id: String(notification.id ?? globalThis.crypto?.randomUUID?.() ?? Date.now()),
  title: notification.title || 'Notification',
  message: notification.message || '',
  type: (notification.type || 'system') as NotificationType,
  read: Boolean(notification.read),
  createdAt: notification.createdAt || new Date().toISOString(),
  userId: notification.userId,
  sender: normalizeSender(notification.sender),
});

export const normalizeNotificationsPayload = (payload?: NotificationListResponse) => {
  const body = unwrapApiData<NotificationListBody>(payload);
  const notifications = Array.isArray(body.notifications)
    ? body.notifications.map(normalizeNotification)
    : [];
  const unreadCount = Number.isFinite(body.unreadCount)
    ? Number(body.unreadCount)
    : notifications.filter((notification) => !notification.read).length;

  return { notifications, unreadCount };
};

export const normalizeNotificationDetailPayload = (
  payload: NotificationDetailResponse | undefined,
  fallbackId: string,
) => {
  const notification = unwrapApiData<Partial<Notification>>(payload);
  return normalizeNotification({
    ...notification,
    id: notification.id ?? fallbackId,
    read: notification.read ?? true,
  });
};

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
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = normalizeNotification(action.payload);
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
