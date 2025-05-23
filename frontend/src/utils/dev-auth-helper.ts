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

// Create a manual setToken action since we might not have it exported from the authSlice
const setToken = (token: string | null) => ({
  type: 'auth/setToken',
  payload: token
});

// Pre-defined test users
const TEST_USERS = {
  admin: {
    id: 'admin-test-id',
    name: 'Admin Test',
    email: 'admin@swanstudios.com',
    role: 'admin',
    profileImageUrl: null,
    permissions: ['manage_users', 'manage_content', 'manage_sessions', 'manage_packages', 'manage_gamification', 'view_analytics'],
  },
  trainer: {
    id: 'trainer-test-id',
    name: 'Trainer Test',
    email: 'trainer@swanstudios.com',
    role: 'trainer',
    profileImageUrl: null,
    permissions: ['manage_sessions', 'view_clients', 'create_workouts'],
  },
  client: {
    id: 'client-test-id',
    name: 'Client Test',
    email: 'client@test.com',
    role: 'client',
    profileImageUrl: null,
    membership: 'premium',
    permissions: ['access_workouts', 'access_store'],
  },
  user: {
    id: 'user-test-id',
    name: 'User Test',
    email: 'user@test.com',
    role: 'user',
    profileImageUrl: null,
    permissions: ['access_social', 'create_posts'],
  }
};

// Mock JWT tokens (just for development UI consistency)
const MOCK_TOKENS = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi10ZXN0LWlkIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.mock-signature',
  trainer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0cmFpbmVyLXRlc3QtaWQiLCJyb2xlIjoidHJhaW5lciIsImlhdCI6MTUxNjIzOTAyMn0.mock-signature',
  client: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbGllbnQtdGVzdC1pZCIsInJvbGUiOiJjbGllbnQiLCJpYXQiOjE1MTYyMzkwMjJ9.mock-signature',
  user: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXRlc3QtaWQiLCJyb2xlIjoidXNlciIsImlhdCI6MTUxNjIzOTAyMn0.mock-signature'
};

/**
 * Quick login as a predefined test user (admin, trainer, client, or user)
 * This bypasses the normal authentication flow for development purposes
 */
export const devQuickLogin = (role: 'admin' | 'trainer' | 'client' | 'user') => {
  // 1. Set user in Redux store
  store.dispatch(setUser(TEST_USERS[role]));
  
  // 2. Set fake JWT token
  store.dispatch(setToken(MOCK_TOKENS[role]));
  
  // 3. Store in localStorage for persistence
  localStorage.setItem('token', MOCK_TOKENS[role]);
  localStorage.setItem('user', JSON.stringify(TEST_USERS[role]));
  
  console.log(`[DEV MODE] Logged in as ${role}`);
  
  return TEST_USERS[role];
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
      console.log('[DEV MODE] Redux auth state cleared');
    } catch (reduxError) {
      console.warn('[DEV MODE] Error clearing Redux state:', reduxError);
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
      console.log('[DEV MODE] localStorage auth items cleared');
    } catch (localStorageError) {
      console.warn('[DEV MODE] Error clearing localStorage:', localStorageError);
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
      console.log('[DEV MODE] sessionStorage auth items cleared');
    } catch (sessionStorageError) {
      console.warn('[DEV MODE] Error clearing sessionStorage:', sessionStorageError);
    }
    
    // 4. Clear memory store
    try {
      clearMemoryStore();
      memoryStoreCleared = true;
      console.log('[DEV MODE] Memory store cleared');
    } catch (memoryError) {
      console.warn('[DEV MODE] Error clearing memory store:', memoryError);
    }
    
    // Log overall result
    if (reduxCleared && localStorageCleared && sessionStorageCleared && memoryStoreCleared) {
      console.log('[DEV MODE] Successfully logged out with all stores cleared');
    } else {
      console.warn('[DEV MODE] Partial logout success - some stores may not have been cleared');
    }
  } catch (error) {
    console.error('[DEV MODE] Error during logout:', error);
    
    // Last-resort fallback: more aggressive clearing
    try {
      // Try completely clearing all storage
      console.warn('[DEV MODE] Attempting aggressive storage clearing...');
      
      try { localStorage.clear(); } catch (e) { /* silent fail */ }
      try { sessionStorage.clear(); } catch (e) { /* silent fail */ }
      try { clearMemoryStore(); } catch (e) { /* silent fail */ }
      
      // Force null dispatch to Redux one more time
      try {
        store.dispatch({ type: 'auth/FORCE_LOGOUT' });
        store.dispatch(setUser(null));
        store.dispatch(setToken(null));
      } catch (e) { /* silent fail */ }
      
      console.log('[DEV MODE] Emergency logout completed');
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
        console.warn('[DEV MODE] Failed to parse user from localStorage');
      }
    }
    
    // No user found in Redux or localStorage
    return null;
  } catch (error) {
    console.warn('[DEV MODE] Error accessing current user:', error);
    
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
 * Helper to run database seeding for test accounts
 * This would typically connect to a backend endpoint
 */
export const seedTestAccounts = async () => {
  try {
    // In a real implementation, this would call an API endpoint
    // For example:
    // const response = await fetch('/api/dev/seed-test-accounts', { method: 'POST' });
    // return response.json();
    
    console.log('[DEV MODE] Seeded test accounts');
    return { success: true, message: 'Test accounts created successfully' };
  } catch (error) {
    console.error('[DEV MODE] Failed to seed test accounts', error);
    return { success: false, message: 'Failed to seed test accounts' };
  }
};
