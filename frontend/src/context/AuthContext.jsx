/**
 * AuthContext.jsx
 * Enhanced authentication context with token refresh and improved error handling
 * Built on top of your existing implementation while adding new capabilities
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// Create the context
const AuthContext = createContext();

// Get API base URL from environment variable or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Create an axios instance for auth-related requests
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken") || null);
  
  // Keep track of token refresh attempts to prevent infinite loops
  const isRefreshing = useRef(false);
  // Queue of failed requests that will be retried after token refresh
  const failedQueue = useRef([]);
  
  // Process the queued requests after a token refresh
  const processQueue = (error, newToken = null) => {
    failedQueue.current.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(newToken);
      }
    });
    
    failedQueue.current = [];
  };

  // Set up axios interceptors for automatic token handling
  useEffect(() => {
    // Request interceptor to add the token to all requests
    const requestInterceptor = authAxios.interceptors.request.use(
      config => {
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor to handle token expiration
    const responseInterceptor = authAxios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        // If the error is not 401 or the request has already been retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        
        // Mark as retried to prevent infinite loops
        originalRequest._retry = true;
        
        // If we're already refreshing the token, queue this request
        if (isRefreshing.current) {
          return new Promise((resolve, reject) => {
            failedQueue.current.push({ resolve, reject });
          })
            .then(newToken => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              return authAxios(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }
        
        isRefreshing.current = true;
        
        // Try to refresh the token
        try {
          // Check if we have a refresh token
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }
          
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, { 
            refreshToken 
          });
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in storage and state
          localStorage.setItem("token", newToken);
          localStorage.setItem("refreshToken", newRefreshToken);
          setToken(newToken);
          setRefreshToken(newRefreshToken);
          
          // Update auth header for future requests
          axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          
          // Process any queued requests
          processQueue(null, newToken);
          isRefreshing.current = false;
          
          // Retry the original request
          return authAxios(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing.current = false;
          
          // Clear auth state if refresh fails
          logout();
          
          return Promise.reject(refreshError);
        }
      }
    );

    // Clean up interceptors when component unmounts
    return () => {
      authAxios.interceptors.request.eject(requestInterceptor);
      authAxios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshToken]);

  // Load user data on mount or when token changes
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Set axios default headers
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          
          // Fetch user data
          const response = await authAxios.get(`/api/auth/profile`);
          setUser(response.data.user);
        } catch (error) {
          console.error("Error loading user:", error);
          
          // Only clear if we genuinely have an auth error, not a network error
          if (error.response && [401, 403].includes(error.response.status)) {
            // Don't attempt to refresh token here - that's handled by the interceptor
            // Just clear the state if the refresh failed
            if (isRefreshing.current === false) {
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              setToken(null);
              setRefreshToken(null);
              setUser(null);
            }
          }
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [token]);

  // Login function with enhanced error handling
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Save tokens to localStorage and state
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      
      // Provide a user-friendly error message
      if (error.response) {
        // Handle specific status codes
        if (error.response.status === 429) {
          throw new Error("Too many login attempts. Please try again later.");
        }
        
        // The server responded with an error status
        throw new Error(error.response.data.message || "Login failed. Please check your credentials.");
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error("Network error. Please check your internet connection.");
      } else {
        // Something else caused the error
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Register function with enhanced error handling
  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Save tokens to localStorage and state
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      return { success: true, user };
    } catch (error) {
      console.error("Registration error:", error);
      
      // Provide a user-friendly error message
      if (error.response) {
        // Handle validation errors
        if (error.response.data.errors) {
          const errorMessage = error.response.data.errors
            .map(err => `${err.field}: ${err.message}`)
            .join(", ");
          throw new Error(`Validation error: ${errorMessage}`);
        }
        
        // Handle specific error types
        if (error.response.status === 409) {
          throw new Error("Username or email already exists. Please try another.");
        }
        
        throw new Error(error.response.data.message || "Registration failed. Please try again.");
      } else if (error.request) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Logout function with token invalidation
  const logout = async () => {
    try {
      // Call the backend to invalidate the refresh token if we have one
      if (token && refreshToken) {
        await authAxios.post("/api/auth/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear auth state regardless of API success
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common["Authorization"];
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const response = await authAxios.put("/api/auth/profile", userData);
      
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error("Update profile error:", error);
      
      if (error.response) {
        // Handle validation errors
        if (error.response.data.errors) {
          const errorMessage = error.response.data.errors
            .map(err => `${err.field}: ${err.message}`)
            .join(", ");
          throw new Error(`Validation error: ${errorMessage}`);
        }
        
        throw new Error(error.response.data.message || "Failed to update profile.");
      } else if (error.request) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Change user password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAxios.put("/api/auth/password", {
        currentPassword,
        newPassword
      });
      
      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("Password change error:", error);
      
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to change password.");
      } else if (error.request) {
        throw new Error("Network error. Please check your internet connection.");
      } else {
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Provide the auth context value
  const value = {
    user,
    isLoading,
    token,
    authAxios, // Provide the pre-configured axios instance
    login,
    register,
    logout,
    isAuthenticated,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;