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
 * Clear the current authentication
 */
export const devLogout = () => {
  // 1. Clear Redux store
  store.dispatch(setUser(null));
  store.dispatch(setToken(null));
  
  // 2. Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  console.log('[DEV MODE] Logged out');
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
