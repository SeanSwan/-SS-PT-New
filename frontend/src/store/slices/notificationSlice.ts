/**
 * Canonical notification state, transport actions, and account lifecycle.
 *
 * Notifications are scoped to the authenticated owner. Every async result
 * carries the owner/generation captured at dispatch time so a late response
 * cannot repopulate a different account after logout or account switching.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { logger } from '@/utils/logger';

export type NotificationType =
  | 'orientation' | 'system' | 'order' | 'workout' | 'client' | 'admin'
  | 'session' | 'achievement' | 'reward' | 'social' | 'message'
  | 'measurement' | 'reminder' | 'progress' | 'info';

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
  recipientId?: string | number;
  sender?: NotificationSender;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  ownerKey: string | null;
  generation: number;
  activeFetchRequestId: string | null;
  deletingById: Record<string, boolean>;
  deleteErrors: Record<string, string | null>;
}

export interface NotificationRequestContext {
  ownerKey: string | null;
  generation: number;
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
  lastFetched: null,
  ownerKey: null,
  generation: 0,
  activeFetchRequestId: null,
  deletingById: {},
  deleteErrors: {},
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

export const normalizeNotification = (notification: Partial<Notification>): Notification => {
  if (!notification || typeof notification !== 'object') {
    throw new Error('Malformed notification payload');
  }
  const rawId = notification.id;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    throw new Error('Notification payload is missing a stable id');
  }
  return {
    ...notification,
    id: String(rawId),
    title: notification.title || 'Notification',
    message: notification.message || '',
    type: (notification.type || 'system') as NotificationType,
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString(),
    userId: notification.userId,
    recipientId: notification.recipientId,
    sender: normalizeSender(notification.sender),
  };
};

export const normalizeNotificationsPayload = (payload?: NotificationListResponse) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Malformed notifications response');
  }
  const body = unwrapApiData<NotificationListBody>(payload);
  if (!body || typeof body !== 'object' || !Array.isArray(body.notifications)) {
    throw new Error('Notifications response is missing its list');
  }
  const notifications = body.notifications.map(normalizeNotification);
  const unreadCount = Number.isFinite(body.unreadCount)
    ? Math.max(0, Number(body.unreadCount))
    : notifications.filter((notification) => !notification.read).length;

  return { notifications, unreadCount };
};

export const normalizeNotificationDetailPayload = (
  payload: NotificationDetailResponse | undefined,
  fallbackId: string,
) => {
  if (!fallbackId || String(fallbackId).trim() === '') {
    throw new Error('Notification detail is missing a stable id');
  }
  const notification = unwrapApiData<Partial<Notification>>(payload);
  if (!notification || typeof notification !== 'object' || notification.id === undefined || notification.id === null || String(notification.id).trim() === '') {
    throw new Error('Notification detail response is missing a stable id');
  }
  if (String(notification.id) !== String(fallbackId)) {
    throw new Error('Notification detail response id does not match the request');
  }
  return normalizeNotification({
    ...notification,
    id: notification.id,
    read: notification.read ?? true,
  });
};

const readContext = (getState: () => unknown, requestedOwnerKey?: string): NotificationRequestContext => {
  const notifications = (getState() as { notifications?: Partial<NotificationState> } | undefined)?.notifications;
  return {
    ownerKey: requestedOwnerKey ?? notifications?.ownerKey ?? null,
    generation: Number(notifications?.generation ?? 0),
  };
};

const withContext = <T extends object>(value: T, context: NotificationRequestContext) => ({
  ...value,
  ...context,
});

const isCurrentContext = (state: NotificationState, payload?: Partial<NotificationRequestContext>) => {
  if (!payload || (payload.ownerKey === undefined && payload.generation === undefined)) return true;
  return payload.ownerKey === state.ownerKey && payload.generation === state.generation;
};

const isCurrentFetch = (
  state: NotificationState,
  requestId: string,
  payload?: Partial<NotificationRequestContext>,
) => {
  return state.activeFetchRequestId === requestId && isCurrentContext(state, payload);
};

/** Confirmed mutations supersede any REST snapshot already in flight. */
const invalidateFetchSnapshot = (state: NotificationState) => {
  state.activeFetchRequestId = null;
  state.loading = false;
};

const failureMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || fallback);
  }
  return String(payload || fallback);
};

const contextFromFailure = (payload: unknown): Partial<NotificationRequestContext> | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = payload as Partial<NotificationRequestContext>;
  return value.ownerKey !== undefined || value.generation !== undefined ? value : undefined;
};

const recipientKey = (notification: { userId?: string | number; recipientId?: string | number }) => {
  const recipient = notification.userId ?? notification.recipientId;
  return recipient === undefined || recipient === null ? null : String(recipient);
};

/** Socket and reducer callers must use this guard before accepting a targeted event. */
export const isNotificationForOwner = (
  notification: Pick<Notification, 'userId' | 'recipientId'>,
  ownerKey: string | number | null | undefined,
) => {
  if (ownerKey === null || ownerKey === undefined || ownerKey === '') return false;
  const target = recipientKey(notification);
  return target !== null && target === String(ownerKey);
};

const scopeRestNotifications = (notifications: Notification[], ownerKey: string | null) => {
  if (!ownerKey) throw new Error('Notifications require an authenticated owner');
  if (notifications.some((notification) => recipientKey(notification) === null)) {
    throw new Error('Notification response is missing a recipient');
  }
  const owned = notifications.filter((notification) => isNotificationForOwner(notification, ownerKey));
  return {
    notifications: owned,
    unreadCount: owned.filter((notification) => !notification.read).length,
  };
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (requestedOwnerKey: string | undefined, { rejectWithValue, getState }) => {
    const context = readContext(getState, requestedOwnerKey);
    try {
      const response = await api.get('/api/notifications');
      return withContext(scopeRestNotifications(normalizeNotificationsPayload(response.data).notifications, context.ownerKey), context);
    } catch (error: any) {
      const message = error.message || 'Failed to fetch notifications';
      logger.warn('[Notifications] Failed to fetch notifications:', message);
      return rejectWithValue({ message, ...context });
    }
  },
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue, getState }) => {
    const context = readContext(getState);
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return withContext({ notification: normalizeNotificationDetailPayload(response.data, notificationId) }, context);
    } catch (error: any) {
      return rejectWithValue({ message: error.message || 'Failed to mark notification as read', ...context });
    }
  },
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue, getState }) => {
    const context = readContext(getState);
    try {
      const response = await api.put('/api/notifications/read-all');
      return withContext({ response: response.data }, context);
    } catch (error: any) {
      return rejectWithValue({ message: error.message || 'Failed to mark all notifications as read', ...context });
    }
  },
);

type DeleteNotificationRequest = string | { id: string };

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (request: DeleteNotificationRequest, { rejectWithValue, getState }) => {
    const id = typeof request === 'string' ? request : request.id;
    const context = readContext(getState);
    try {
      await api.delete(`/api/notifications/${id}`);
      return withContext({ id }, context);
    } catch (error: any) {
      return rejectWithValue({ id, message: error.message || 'Failed to delete notification', ...context });
    }
  },
);

const resetForOwner = (state: NotificationState, ownerKey: string | null) => {
  state.ownerKey = ownerKey;
  state.generation += 1;
  state.notifications = [];
  state.unreadCount = 0;
  state.loading = false;
  state.error = null;
  state.lastFetched = null;
  state.activeFetchRequestId = null;
  state.deletingById = {};
  state.deleteErrors = {};
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotificationOwner: (state, action: PayloadAction<string | number | null>) => {
      const ownerKey = action.payload === null || action.payload === undefined ? null : String(action.payload);
      if (state.ownerKey !== ownerKey) resetForOwner(state, ownerKey);
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      let notification: Notification;
      try {
        notification = normalizeNotification(action.payload);
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Malformed notification event';
        return;
      }
      if (state.ownerKey && !isNotificationForOwner(notification, state.ownerKey)) return;
      invalidateFetchSnapshot(state);
      const index = state.notifications.findIndex((item) => item.id === notification.id);
      if (index === -1) {
        state.notifications.unshift(notification);
        if (!notification.read) state.unreadCount += 1;
        return;
      }

      const wasUnread = !state.notifications[index].read;
      state.notifications[index] = notification;
      if (wasUnread !== !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount + (notification.read ? -1 : 1));
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      invalidateFetchSnapshot(state);
      const index = state.notifications.findIndex((n) => n.id === action.payload);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].read;
        state.notifications.splice(index, 1);
        if (wasUnread) state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearNotifications: (state) => {
      invalidateFetchSnapshot(state);
      state.notifications = [];
      state.unreadCount = 0;
    },
    resetError: (state) => {
      state.error = null;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      if (!Number.isFinite(action.payload)) return;
      invalidateFetchSnapshot(state);
      state.unreadCount = Math.max(0, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeFetchRequestId = action.meta.requestId;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        if (!isCurrentFetch(state, action.meta.requestId, action.payload)) return;
        state.loading = false;
        state.activeFetchRequestId = null;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        const payloadContext = contextFromFailure(action.payload);
        if (!isCurrentFetch(state, action.meta.requestId, payloadContext)) return;
        logger.warn('Notification fetch rejected:', action.payload);
        state.loading = false;
        state.activeFetchRequestId = null;
        state.error = failureMessage(action.payload, 'Failed to fetch notifications');
      })
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!isCurrentContext(state, payload)) return;
        state.loading = false;
        const detail = payload.notification;
        if (!detail) return;
        invalidateFetchSnapshot(state);
        const notification = state.notifications.find((n) => n.id === detail.id);
        if (notification && !notification.read) {
          Object.assign(notification, detail, { read: true });
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        const payloadContext = contextFromFailure(action.payload);
        if (!isCurrentContext(state, payloadContext)) return;
        state.loading = false;
        state.error = failureMessage(action.payload, 'Failed to mark notification as read');
      })
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        if (!isCurrentContext(state, action.payload)) return;
        invalidateFetchSnapshot(state);
        state.notifications.forEach((notification) => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        const payloadContext = contextFromFailure(action.payload);
        if (!isCurrentContext(state, payloadContext)) return;
        state.loading = false;
        state.error = failureMessage(action.payload, 'Failed to mark all notifications as read');
      })
      .addCase(deleteNotification.pending, (state, action) => {
        const id = typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg.id;
        state.deletingById[id] = true;
        state.deleteErrors[id] = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        if (!isCurrentContext(state, action.payload)) return;
        invalidateFetchSnapshot(state);
        const { id } = action.payload;
        state.deletingById[id] = false;
        state.deleteErrors[id] = null;
        const index = state.notifications.findIndex((notification) => notification.id === id);
        if (index !== -1) {
          if (!state.notifications[index].read) state.unreadCount = Math.max(0, state.unreadCount - 1);
          state.notifications.splice(index, 1);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        const payload = action.payload as { id?: string; message?: string; ownerKey?: string | null; generation?: number } | undefined;
        if (!isCurrentContext(state, payload)) return;
        const id = payload?.id || (typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg.id);
        state.deletingById[id] = false;
        state.deleteErrors[id] = failureMessage(payload, 'Failed to delete notification');
      });
  },
});

export const {
  setNotificationOwner,
  addNotification,
  removeNotification,
  clearNotifications,
  resetError,
  setUnreadCount,
} = notificationSlice.actions;

export default notificationSlice.reducer;
