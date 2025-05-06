/**
 * Axios Configuration
 * 
 * This file configures Axios instances for making API requests.
 * - axiosInstance: For non-authenticated requests
 * - authAxiosInstance: For authenticated requests (includes Authorization header)
 */

import axios from 'axios';

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
    
    return Promise.reject(error);
  }
);

export default {
  axiosInstance,
  authAxiosInstance
};
