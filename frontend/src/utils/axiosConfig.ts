/**
 * Axios Configuration
 * 
 * This file configures Axios instances for making API requests.
 * - axiosInstance: For non-authenticated requests
 * - authAxiosInstance: For authenticated requests (includes Authorization header)
 */

import axios from 'axios';
import { setupEnhancedMockApiInterceptor } from '../services/enhanced-mock-api-service';

// API base URL from environment variables
// In production, use correct backend URL
// In development, use localhost for direct connection
const API_BASE_URL = import.meta.env.PROD
  ? 'https://ss-pt-new.onrender.com'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000');

// Format the API URL: remove trailing slash if present
const FORMATTED_API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// Regular axios instance for non-authenticated requests
export const axiosInstance = axios.create({
  baseURL: FORMATTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Authenticated axios instance (automatically adds auth token from localStorage)
export const authAxiosInstance = axios.create({
  baseURL: FORMATTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add a request interceptor to include the auth token in every request
authAxiosInstance.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
authAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session expiration (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Check if it's not a login request causing the 401
      if (!error.config.url.includes('/auth/login')) {
        console.error('Session expired. Redirecting to login...');
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('login_timestamp');

        // Redirect to login (if not already there)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
    }

    // Degraded-mode flag: backend returns { degraded: true } when a service is temporarily unavailable
    const errorData = error.response?.data as Record<string, unknown> | undefined;
    if (errorData?.degraded === true) {
      (error as any).isDegraded = true;
    }

    return Promise.reject(error);
  }
);

// Setup enhanced mock API interceptor for development environments - DISABLED FOR REAL BACKEND
// Only enable if explicitly needed for testing
if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_FORCE_MOCK_MODE === 'true') {
  setupEnhancedMockApiInterceptor(axiosInstance);
  setupEnhancedMockApiInterceptor(authAxiosInstance);
  console.log('🔄 Enhanced mock API interceptor enabled for development (includes storefront support)');
} else {
  console.log('🔄 Mock API interceptor DISABLED - using real backend');
}

export default {
  axiosInstance,
  authAxiosInstance
};