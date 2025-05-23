/**
 * Store Initialization Safeguard
 * 
 * This utility provides a safe way to initialize the Redux store once
 * before React components mount, preventing infinite update loops.
 */

import { store } from '../redux/store';
import { setInitialState as setScheduleInitialState } from '../redux/slices/scheduleSlice';
// Import the main store and the notificationSlice for initialization
import mainStore from '../store';
import { clearNotifications } from '../store/slices/notificationSlice';

// Global initialization flag
window.__REDUX_STORE_INITIALIZED__ = false;

/**
 * Initialize the Redux store exactly once, before any components render
 * This should be called from main.jsx before React rendering begins
 */
export function safeInitializeStore() {
  // Skip if already initialized
  if (window.__REDUX_STORE_INITIALIZED__) {
    console.log('[SafeInitializer] Redux store already initialized, skipping');
    return;
  }

  console.log('[SafeInitializer] Performing safe one-time store initialization');
  
  try {
    // Initialize schedule slice with default state in the redux/store
    store.dispatch(setScheduleInitialState({
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
    
    // Initialize notifications slice in the main store
    mainStore.dispatch(clearNotifications());
    
    // Set global flag to prevent re-initialization
    window.__REDUX_STORE_INITIALIZED__ = true;
    
    console.log('[SafeInitializer] Store safely initialized');
  } catch (error) {
    console.error('[SafeInitializer] Store initialization failed:', error);
  }
}

/**
 * Check if store is already initialized
 * Components can call this to avoid redundant initialization
 */
export function isStoreInitialized() {
  return !!window.__REDUX_STORE_INITIALIZED__;
}

// Run the initialization immediately when this module is imported
safeInitializeStore();
