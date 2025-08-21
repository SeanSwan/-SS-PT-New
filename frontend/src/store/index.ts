/**
 * STORE INDEX - PRODUCTION SIMPLIFIED
 * Main Redux store configuration file with simplified setup for reliable builds
 * Redux Persist temporarily removed for production stability
 */
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

// Import reducers
import customizationReducer from './themeSlice';
import menuReducer from './menuSlice';
import orientationReducer from './slices/orientationSlice';
import notificationReducer from './slices/notificationSlice';
import authReducer from './slices/authSlice';

/**
 * COMBINE REDUCERS
 * Combines all separate reducer slices into a single root reducer
 * Each slice manages a specific part of the application state
 */
const rootReducer = combineReducers({
  customization: customizationReducer,
  menu: menuReducer,
  orientation: orientationReducer,
  notifications: notificationReducer,
  auth: authReducer,
});

/**
 * CONFIGURE STORE
 * Create the Redux store with standard configuration
 */
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

/**
 * TYPE DEFINITIONS
 * Export TypeScript types for the store state and dispatch function
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * EXPORTS
 * - Named export for the store to use with useSelector/useDispatch
 * - Dummy persister for compatibility with existing components
 */
export { store };

// Dummy persister for compatibility (until redux-persist is properly added)
export const persister = {
  purge: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  pause: () => {},
  persist: () => {},
};

// Default export is the store (for backward compatibility)
export default store;
