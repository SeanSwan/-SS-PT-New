/**
 * Redux Store Configuration
 * 
 * This file configures the Redux store for the SwanStudios application:
 * - Sets up the root reducer with all slices
 * - Configures middleware
 * - Defines the RootState and AppDispatch types
 */

import { configureStore } from '@reduxjs/toolkit';
import scheduleReducer from './slices/scheduleSlice';
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
