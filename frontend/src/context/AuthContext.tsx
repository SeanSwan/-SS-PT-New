/**
 * AuthContext.tsx
 * 
 * Provides authentication state and methods throughout the application.
 * Handles user login, logout, session persistence, and role-based authorization.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Format the API URL: remove trailing slash if present
const FORMATTED_API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// API paths should start with /api but not have duplicated /api/api
// Since we're using Vite's proxy, we can use relative paths

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer' | 'client' | 'user';
  profileImage?: string;
  specialties?: string[];
  createdAt: string;
  updatedAt: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  signup: (userData: any) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
  hasRole: (roles: string | string[]) => boolean;
  authAxios: typeof api; // Export the axios instance
}

// Create axios instance with auth header and fixed URL path
const api = axios.create({
  baseURL: FORMATTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Add 10s timeout for better error handling
});

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => ({}),
  logout: () => {},
  signup: async () => {},
  updateUser: async () => {},
  clearError: () => {},
  hasRole: () => false,
  authAxios: api,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Add token to axios default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Fetch user profile - using /api prefix to match backend routes
        const response = await api.get('/api/auth/me');
        setUser(response.data);
        setToken(storedToken);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        // Clear invalid token
        localStorage.removeItem('token');
        setToken(null);
        setError('Session expired. Please log in again.');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Add request interceptor to include auth token
  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Clean up interceptor on unmount
    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Login function with improved error handling
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Using the /api prefix to match backend routes
      console.log(`Attempting login to ${FORMATTED_API_URL}/api/auth/login`);
      // Send email as username to match backend validation expectations
      const response = await api.post('/api/auth/login', { username: email, password });
      
      // Validate response data
      if (!response.data || !response.data.token) {
        throw new Error('Invalid server response - missing token');
      }
      
      const { token, user } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Update state
      setToken(token);
      setUser(user);
      
      // Return the response data so the component can access it
      return response.data;
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error handling with more specific error messages
      let errorMessage = '';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (err.response) {
        // Server responded with an error
        if (err.response.status === 404) {
          errorMessage = 'Authentication service not found. Please contact support.';
        } else if (err.response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your username and password.';
        } else {
          errorMessage = err.response.data?.message || 'Authentication failed. Please try again.';
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else caused the error
        errorMessage = err.message || 'Failed to log in. Please try again.';
      }
      
      setError(errorMessage);
      
      // Return error info in a structured way for components to use
      throw {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // Update state
    setToken(null);
    setUser(null);
  };

  // Signup function
  const signup = async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/api/auth/register', userData);
      const { token, user } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Update state
      setToken(token);
      setUser(user);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Failed to sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateUser = async (userData: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.patch('/api/auth/profile', userData);
      
      // Update state
      setUser(response.data);
    } catch (err: any) {
      console.error('Update user error:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Check if user has a specific role
  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    
    // Convert single role to array
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    return roleArray.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        logout,
        signup,
        updateUser,
        clearError,
        hasRole,
        authAxios: api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
