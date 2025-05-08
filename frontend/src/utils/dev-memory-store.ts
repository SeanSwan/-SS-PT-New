/**
 * Development Memory Store
 * 
 * A simple in-memory store that can be used as a last resort fallback
 * when both Redux and localStorage are unavailable during development.
 * 
 * This is intended ONLY for development mode to prevent crashes when
 * authentication state is inaccessible through normal means.
 */

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImageUrl: string | null;
  permissions: string[];
  [key: string]: any;
};

interface MemoryStore {
  user: User | null;
  token: string | null;
  initialized: boolean;
}

// Memory store singleton instance
const memoryStore: MemoryStore = {
  user: null,
  token: null,
  initialized: false
};

/**
 * Initialize the memory store from localStorage if available
 */
export const initializeMemoryStore = (): void => {
  if (memoryStore.initialized) return;
  
  try {
    // Try to initialize from localStorage
    const userString = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userString) {
      memoryStore.user = JSON.parse(userString);
    }
    
    if (token) {
      memoryStore.token = token;
    }
    
    memoryStore.initialized = true;
    console.debug('[DEV MODE] Memory store initialized from localStorage');
  } catch (error) {
    console.warn('[DEV MODE] Failed to initialize memory store from localStorage', error);
    // Still mark as initialized even if it failed
    memoryStore.initialized = true;
  }
};

/**
 * Set user in memory store
 */
export const setUserInMemory = (user: User | null): void => {
  memoryStore.user = user;
  
  // Try to sync with localStorage for consistency
  try {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.warn('[DEV MODE] Failed to sync user to localStorage', error);
  }
};

/**
 * Set token in memory store
 */
export const setTokenInMemory = (token: string | null): void => {
  memoryStore.token = token;
  
  // Try to sync with localStorage for consistency
  try {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.warn('[DEV MODE] Failed to sync token to localStorage', error);
  }
};

/**
 * Get user from memory store
 */
export const getUserFromMemory = (): User | null => {
  // Ensure memory store is initialized
  if (!memoryStore.initialized) {
    initializeMemoryStore();
  }
  
  return memoryStore.user;
};

/**
 * Get token from memory store
 */
export const getTokenFromMemory = (): string | null => {
  // Ensure memory store is initialized
  if (!memoryStore.initialized) {
    initializeMemoryStore();
  }
  
  return memoryStore.token;
};

/**
 * Clear memory store
 */
export const clearMemoryStore = (): void => {
  memoryStore.user = null;
  memoryStore.token = null;
  
  // Try to sync with localStorage for consistency
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  } catch (error) {
    console.warn('[DEV MODE] Failed to clear localStorage', error);
  }
};

export default {
  initializeMemoryStore,
  setUserInMemory,
  setTokenInMemory,
  getUserFromMemory,
  getTokenFromMemory,
  clearMemoryStore
};