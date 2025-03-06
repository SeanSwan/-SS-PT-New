/**
 * Update your store/index.ts file to include persister configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import your reducers
import themeReducer from './themeSlice';
// Import other reducers as needed

// Create persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['theme', 'customization'] // Specify which reducers to persist
};

// Create a root reducer with all your reducers
const rootReducer = {
  theme: themeReducer,
  // Add other reducers here
  customization: (state = { isOpen: [], opened: true }, action) => {
    let id;
    switch (action.type) {
      case 'SET_MENU':
        return {
          ...state,
          opened: action.opened
        };
      case 'MENU_TOGGLE':
        id = action.id;
        return {
          ...state,
          isOpen: [id]
        };
      case 'SET_FONT_FAMILY':
        return {
          ...state,
          fontFamily: action.fontFamily
        };
      case 'SET_BORDER_RADIUS':
        return {
          ...state,
          borderRadius: action.borderRadius
        };
      default:
        return state;
    }
  }
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, (state, action) => {
  return Object.keys(rootReducer).reduce((acc, key) => {
    acc[key] = rootReducer[key](state ? state[key] : undefined, action);
    return acc;
  }, {} as any);
});

// Configure the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persisted store
export const persister = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;