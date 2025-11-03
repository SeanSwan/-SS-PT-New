/**
 * Notification Slice
 * Manages the state for user notifications including unread counts and notification data
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Define the notification interface
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'orientation' | 'system' | 'order' | 'workout' | 'client' | 'admin';
  read: boolean;
  createdAt: string;
  link?: string;
  image?: string;
  userId: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Define the notification state interface
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null
};

// Async thunks
// Mock notification data for fallback when backend is unavailable
const mockNotifications: Notification[] = [
  {
    id: 'mock-1',
    title: 'Welcome to SwanStudios',
    message: 'Thanks for joining! Your fitness journey begins here.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
    userId: 'current-user'
  },
  {
    id: 'mock-2',
    title: 'New Workout Plan Available',
    message: 'Your trainer has created a new workout plan for you.',
    type: 'workout',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    userId: 'current-user',
    link: '/workout-plans'
  },
  {
    id: 'mock-3',
    title: 'Reminder: Upcoming Session',
    message: 'You have a training session scheduled for tomorrow at 2:00 PM.',
    type: 'client',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    userId: 'current-user'
  }
];

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Call the API to fetch notifications
      const response = await api.get('/notifications');
      return response.data;
    } catch (error: any) {
      // Silently handle 503 errors (service unavailable) without console warnings
      const is503Error = error.response?.status === 503 || error.message?.includes('503');

      if (!is503Error) {
        console.warn('[Notifications] Failed to fetch notifications, using mock data:', error.message);
      }

      // Instead of rejecting, provide mock data as graceful fallback
      return {
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.read).length
      };
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      // Call the API to mark a notification as read
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      // Call the API to mark all notifications as read
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

// Create the slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a new notification (for real-time updates)
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    // Remove a notification
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const wasUnread = !state.notifications[index].read;
        state.notifications.splice(index, 1);
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    // Reset error state
    resetError: (state) => {
      state.error = null;
    },
    // Manually set unread count (for badge synchronization)
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // Make sure we have valid data, even if the response is empty or partially empty
        state.notifications = action.payload?.notifications || [];
        state.unreadCount = action.payload?.unreadCount || 0;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        console.warn('Notification fetch rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
        // On error, keep existing notifications rather than clearing them
        // This preserves user experience when backend connections fail temporarily
      })
      
      // Handle markAsRead
      .addCase(markAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.loading = false;
        // Find and update the notification
        const notification = state.notifications.find(n => n.id === action.payload.id);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle markAllAsRead
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.loading = false;
        // Mark all as read
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
