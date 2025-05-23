/**
 * Redux Store Configuration
 * 
 * This file configures the Redux store for the SwanStudios application:
 * - Sets up the root reducer with all slices
 * - Configures middleware
 * - Defines the RootState and AppDispatch types
 */

import { configureStore } from '@reduxjs/toolkit';
import scheduleReducer, { setInitialState } from './slices/scheduleSlice';
import notificationReducer from '../store/slices/notificationSlice';
import authReducer from '../store/slices/authSlice';
import uiReducer from '../store/slices/uiSlice';
import appReducer from '../store/slices/appSlice';
// Import other reducers as needed

export const store = configureStore({
  reducer: {
    schedule: scheduleReducer,
    notifications: notificationReducer,
    auth: authReducer,
    ui: uiReducer,
    app: appReducer,
    // Add other reducers here
  },
  // Additional middleware and devtools configuration
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allow non-serializable values like Date objects
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Initialize the Redux store with default values to prevent undefined errors
// This ensures the schedule slice is always populated
const initialState = store.getState();
if (!initialState.schedule || !initialState.schedule.sessions) {
  console.warn('Schedule state not properly initialized, applying default state');
  store.dispatch(setInitialState({
      sessions: [],
      trainers: [],
      clients: [],
      stats: {
        total: 0,
        available: 0,
        booked: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        blocked: 0,
        upcoming: 0
      },
      status: 'idle',
      error: null,
      fetched: false
  }));
}

// Initialize notifications state if needed
if (!initialState.notifications) {
  console.warn('Notifications state not properly initialized');
  // The notificationReducer will handle initialization with its default state
  // This is just a placeholder to show we checked for it
}
