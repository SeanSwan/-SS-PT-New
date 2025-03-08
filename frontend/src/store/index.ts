/**
 * STORE INDEX
 * Main Redux store configuration file that sets up:
 * - Redux store with Redux Toolkit
 * - Redux Persist for persistent state between page refreshes
 * - Combined reducers from multiple slices
 */
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage by default
import { combineReducers } from 'redux';

// Import reducers
import customizationReducer from './themeSlice';

/**
 * COMBINE REDUCERS
 * Combines all separate reducer slices into a single root reducer
 * Each slice manages a specific part of the application state
 */
const rootReducer = combineReducers({
  customization: customizationReducer,
  // Add other reducers here as needed
});

/**
 * PERSIST CONFIGURATION
 * Configure which parts of the state should be persisted
 * - key: The key under which the state is stored in localStorage
 * - storage: The storage engine (localStorage in this case)
 * - whitelist: Only these reducers will be persisted
 */
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['customization'], // Only persist these reducers
};

/**
 * CREATE PERSISTED REDUCER
 * Wraps the root reducer with persistence capabilities
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * CONFIGURE STORE
 * Create the Redux store with the persisted reducer
 * - Disable serializable check to allow Redux Persist to work
 */
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for persist
    }),
});

/**
 * CREATE PERSISTOR
 * This is the object that handles persisting and rehydrating the store
 */
export const persister = persistStore(store); // Export as "persister" to match berryIndex.jsx import

/**
 * TYPE DEFINITIONS
 * Export TypeScript types for the store state and dispatch function
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * EXPORTS
 * - Named export for the store to use with useSelector/useDispatch
 * - Named export for the persister to use with PersistGate
 */
export { store }; // Export store as named export to match berryIndex.jsx import

// Default export is the store (for backward compatibility)
export default store;