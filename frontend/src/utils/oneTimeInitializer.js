/**
 * One-Time Store Initializer
 * 
 * This module provides a way to initialize the Redux store exactly once
 * outside of React component lifecycle methods to avoid any render loops.
 */

// Import emergency admin fix to ensure it's loaded early
import './emergencyAdminFix';

// Import the necessary store and actions
import { store } from '../redux/store';
import { setInitialState } from '../redux/slices/scheduleSlice';

// This flag will be used to ensure we only initialize once
let storeInitialized = false;

/**
 * Initialize the Redux store once, safely outside of React's render cycle
 */
export function initializeStore() {
  // If already initialized, do nothing
  if (storeInitialized) {
    return;
  }
  
  console.log('[StoreInitializer] Initializing Redux store (one-time only)');
  
  try {
    // Initialize the schedule slice with default values
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
    
    // Mark as initialized
    storeInitialized = true;
    console.log('[StoreInitializer] Store initialization complete');
    
    // Also set the global flag for other components to check
    window.__REDUX_ALREADY_INITIALIZED__ = true;
  } catch (error) {
    console.error('[StoreInitializer] Error initializing store:', error);
  }
}

// Run the initialization immediately when this module is imported
initializeStore();