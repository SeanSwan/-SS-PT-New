/**
 * Developer Authentication Helper
 * 
 * This utility provides functions to quickly switch between user roles 
 * during development without needing to log in repeatedly.
 * 
 * IMPORTANT: This should ONLY be used during development and NEVER in production.
 */

import { setUser } from '../store/slices/authSlice';
import store from '../store';
import { clearMemoryStore } from './dev-memory-store';
import { logger } from '@/utils/logger';

// Create a manual setToken action since we might not have it exported from the authSlice
const setToken = (token: string | null) => ({
  type: 'auth/setToken',
  payload: token
});

/**
 * Retired compatibility helper.
 * Quick login used to bypass backend auth with fake users and fake tokens.
 */
export const devQuickLogin = (role: 'admin' | 'trainer' | 'client' | 'user') => {
  logger.warn(`[DEV MODE] Quick login for ${role} is retired. Use the real login flow with seeded backend users.`);
  throw new Error('Dev quick login is retired. Use real backend authentication.');
};

/**
 * Clear the current authentication with comprehensive cleanup
 * This enhanced version ensures all auth state is properly reset
 */
export const devLogout = () => {
  let reduxCleared = false;
  let localStorageCleared = false;
  let sessionStorageCleared = false;
  let memoryStoreCleared = false;
  
  try {
    // 1. Clear Redux store first
    try {
      store.dispatch(setUser(null));
      store.dispatch(setToken(null));
      reduxCleared = true;
      logger.log('[DEV MODE] Redux auth state cleared');
    } catch (reduxError) {
      logger.warn('[DEV MODE] Error clearing Redux state:', reduxError);
    }
    
    // 2. Clear localStorage with more comprehensive key removal
    try {
      // Primary auth keys
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('login_timestamp');
      
      // Additional auth-related keys that might exist
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_state');
      localStorage.removeItem('auth_expiry');
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('user_role');
      localStorage.removeItem('session_id');
      
      localStorageCleared = true;
      logger.log('[DEV MODE] localStorage auth items cleared');
    } catch (localStorageError) {
      logger.warn('[DEV MODE] Error clearing localStorage:', localStorageError);
    }
    
    // 3. Clear sessionStorage with comprehensive key removal
    try {
      // Mirror the same keys from localStorage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('login_timestamp');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_state');
      sessionStorage.removeItem('auth_expiry');
      sessionStorage.removeItem('user_preferences');
      sessionStorage.removeItem('user_role');
      sessionStorage.removeItem('session_id');
      
      sessionStorageCleared = true;
      logger.log('[DEV MODE] sessionStorage auth items cleared');
    } catch (sessionStorageError) {
      logger.warn('[DEV MODE] Error clearing sessionStorage:', sessionStorageError);
    }
    
    // 4. Clear memory store
    try {
      clearMemoryStore();
      memoryStoreCleared = true;
      logger.log('[DEV MODE] Memory store cleared');
    } catch (memoryError) {
      logger.warn('[DEV MODE] Error clearing memory store:', memoryError);
    }
    
    // Log overall result
    if (reduxCleared && localStorageCleared && sessionStorageCleared && memoryStoreCleared) {
      logger.log('[DEV MODE] Successfully logged out with all stores cleared');
    } else {
      logger.warn('[DEV MODE] Partial logout success - some stores may not have been cleared');
    }
  } catch (error) {
    console.error('[DEV MODE] Error during logout:', error);
    
    // Last-resort fallback: more aggressive clearing
    try {
      // Try completely clearing all storage
      logger.warn('[DEV MODE] Attempting aggressive storage clearing...');
      
      try { localStorage.clear(); } catch (e) { /* silent fail */ }
      try { sessionStorage.clear(); } catch (e) { /* silent fail */ }
      try { clearMemoryStore(); } catch (e) { /* silent fail */ }
      
      // Force null dispatch to Redux one more time
      try {
        store.dispatch({ type: 'auth/FORCE_LOGOUT' });
        store.dispatch(setUser(null));
        store.dispatch(setToken(null));
      } catch (e) { /* silent fail */ }
      
      logger.log('[DEV MODE] Emergency logout completed');
    } catch (e) {
      console.error('[DEV MODE] Complete failure clearing authentication');
    }
  }
};

/**
 * Check if the development helper is active
 */
export const isDevMode = () => {
  // In a real app, you would check environment variables
  // We'll just check for development environment
  return process.env.NODE_ENV === 'development';
};

/**
 * Get the current authenticated user (if any)
 * with improved error handling
 */
export const getCurrentUser = () => {
  try {
    // Safely access the Redux store state
    const state = store.getState();
    
    // Check if auth and user exist before trying to access
    if (state && state.auth && state.auth.user) {
      return state.auth.user;
    }
    
    // If not in Redux, try localStorage as fallback
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        return JSON.parse(userString);
      } catch (e) {
        logger.warn('[DEV MODE] Failed to parse user from localStorage');
      }
    }
    
    // No user found in Redux or localStorage
    return null;
  } catch (error) {
    logger.warn('[DEV MODE] Error accessing current user:', error);
    
    // Last resort: Check localStorage directly
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
    } catch (e) {
      // Truly nothing worked
      console.error('[DEV MODE] Complete failure accessing user data');
    }
    
    return null;
  }
};

/**
 * Retired compatibility helper.
 */
export const seedTestAccounts = async () => {
  logger.warn('[DEV MODE] Local fake account seeding is retired. Use backend seed scripts with explicit credentials.');
  return { success: false, message: 'Local fake account seeding is retired' };
};
