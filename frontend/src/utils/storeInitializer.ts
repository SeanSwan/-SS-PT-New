/**
 * Redux Store Initializer
 * 
 * This utility ensures that the Redux store is properly initialized
 * before any components attempt to access it. It pre-loads critical
 * slices of the state to prevent "undefined" errors.
 */

import { setInitialState } from '../redux/slices/scheduleSlice';
import { store } from '../redux/store';

/**
 * Initialize all Redux store slices with default values
 * This prevents "undefined" errors when accessing state
 */
export const initializeReduxStore = () => {
  // Only initialize once
  if (window.__REDUX_ALREADY_INITIALIZED__) {
    console.log('Redux store already initialized, skipping');
    return;
  }
  
  console.log('Initializing Redux store with default values...');
  
  // Initialize schedule slice
  const initialState = store.getState();
  if (!initialState.schedule || !initialState.schedule.sessions) {
    console.log('Schedule slice not initialized, applying defaults');
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
  
  // Add other slices initialization as needed
  
  console.log('Redux store initialization complete');
  
  // Mark as initialized to prevent duplicate initializations
  window.__REDUX_ALREADY_INITIALIZED__ = true;
};

/**
 * Check store initialization status
 * @returns {boolean} true if store is properly initialized
 */
export const isStoreInitialized = () => {
  const state = store.getState();
  return (
    state &&
    state.schedule &&
    Array.isArray(state.schedule.sessions)
  );
};

export default { initializeReduxStore, isStoreInitialized };