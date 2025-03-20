/**
 * AuthContext.jsx
 * Enhanced authentication context with token refresh, improved error handling,
 * and proactive token renewal
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// Create the context
const AuthContext = createContext();

// Use relative URL for API when using proxy
const API_BASE_URL = ""; // Empty base URL for using with proxy

// Token refresh settings
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh token 5 minutes before expiry
const SESSION_EXPIRY_CHECK_INTERVAL = 60 * 1000; // Check token expiration every minute

// JWT token decoder (without requiring additional libraries)
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT token:", error);
    return null;
  }
};

// Create an axios instance for auth-related requests
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true // Enable cookies for CORS requests
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken") || null);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Refs for token refresh
  const isRefreshing = useRef(false);
  const failedQueue = useRef([]);
  const refreshTimerRef = useRef(null);
  
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

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    
    const decoded = parseJwt(token);
    if (!decoded) return true;
    
    // Get current time in seconds
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    return decoded.exp && decoded.exp < currentTime;
  }, []);

  // Get time until token expires in ms
  const getTimeUntilExpiry = useCallback((token) => {
    if (!token) return 0;
    
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return 0;
    
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    return expiryTime - Date.now();
  }, []);

  // Proactively refresh token before it expires
  const setupTokenRefreshTimer = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // If no token or refresh token, don't set up timer
    if (!token || !refreshToken) return;
    
    const timeUntilExpiry = getTimeUntilExpiry(token);
    
    // If token is already expired, don't set timer
    if (timeUntilExpiry <= 0) return;
    
    // Set timer to refresh token before it expires
    const refreshTime = Math.max(timeUntilExpiry - TOKEN_REFRESH_THRESHOLD_MS, 1000);
    
    refreshTimerRef.current = setTimeout(async () => {
      // Only try to refresh if we're still logged in
      if (token && refreshToken && !isRefreshing.current) {
        try {
          isRefreshing.current = true;
          
          const response = await authAxios.post(`/api/auth/refresh-token`, { refreshToken });
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens
          localStorage.setItem("token", newToken);
          localStorage.setItem("refreshToken", newRefreshToken);
          setToken(newToken);
          setRefreshToken(newRefreshToken);
          
          // Update auth header
          authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          
          console.log("Token proactively refreshed");
          isRefreshing.current = false;
          
          // Setup new timer for the new token
          setupTokenRefreshTimer();
        } catch (error) {
          console.error("Error refreshing token proactively:", error);
          isRefreshing.current = false;
          
          // If refresh fails due to expired refresh token, logout
          if (error.response && error.response.status === 401) {
            handleSessionExpired();
          }
        }
      }
    }, refreshTime);
    
    console.log(`Token refresh scheduled in ${Math.floor(refreshTime / 1000 / 60)} minutes`);
  }, [token, refreshToken, getTimeUntilExpiry]);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    console.log("Session expired - logging out");
    
    // Clear auth state
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    delete authAxios.defaults.headers.common["Authorization"];
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    
    // Set session expired flag to show message to user
    setSessionExpired(true);
    
    // Clear any refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Set up axios interceptors for automatic token handling
  useEffect(() => {
    // Request interceptor to add the token to all requests
    const requestInterceptor = authAxios.interceptors.request.use(
      config => {
        // Check if token is expired before making request
        if (token && isTokenExpired(token)) {
          // Don't add expired token to request
          // This will trigger a 401 and our response interceptor will handle it
          console.log("Token expired before request - not adding to headers");
        } else if (token) {
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
          
          const response = await authAxios.post(`/api/auth/refresh-token`, { 
            refreshToken 
          });
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in storage and state
          localStorage.setItem("token", newToken);
          localStorage.setItem("refreshToken", newRefreshToken);
          setToken(newToken);
          setRefreshToken(newRefreshToken);
          
          // Update auth header for future requests
          authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          
          // Process any queued requests
          processQueue(null, newToken);
          isRefreshing.current = false;
          
          // Set up a new refresh timer for the new token
          setupTokenRefreshTimer();
          
          // Retry the original request
          return authAxios(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing.current = false;
          
          // Clear auth state if refresh fails
          handleSessionExpired();
          
          return Promise.reject(refreshError);
        }
      }
    );

    // Clean up interceptors when component unmounts
    return () => {
      authAxios.interceptors.request.eject(requestInterceptor);
      authAxios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshToken, isTokenExpired, handleSessionExpired, setupTokenRefreshTimer]);

  // Setup token refresh timer when token changes
  useEffect(() => {
    if (token && refreshToken) {
      setupTokenRefreshTimer();
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [token, refreshToken, setupTokenRefreshTimer]);

  // Load user data on mount or when token changes
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        // Check if token is already expired
        if (isTokenExpired(token)) {
          console.log("Token already expired on load, attempting refresh");
          
          // If we have a refresh token, let the interceptors handle the refresh
          // Otherwise clear the auth state
          if (!refreshToken) {
            handleSessionExpired();
            return;
          }
        }
        
        setIsLoading(true);
        try {
          // Set axios default headers
          authAxios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          
          // Fetch user data - using the proxy route
          const response = await authAxios.get('/api/auth/profile');
          setUser(response.data.user);
          
          // Reset session expired state if successful
          if (sessionExpired) {
            setSessionExpired(false);
          }
        } catch (error) {
          console.error("Error loading user:", error);
          
          // Handle auth errors
          if (error.response && [401, 403].includes(error.response.status)) {
            // The interceptor will handle the token refresh if possible
            if (!isRefreshing.current) {
              // If we're not refreshing, then the refresh failed or wasn't attempted
              handleSessionExpired();
            }
          } else if (!error.response && error.request) {
            // Network error - server might be down
            console.error("Network error loading user - server might be down");
            // Don't clear auth state for network errors
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [token, refreshToken, isTokenExpired, handleSessionExpired, sessionExpired]);

  // Login function with enhanced error handling
  const login = async (username, password) => {
    try {
      const response = await authAxios.post(`/api/auth/login`, {
        username,
        password
      });

      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Reset session expired state
      setSessionExpired(false);
      
      // Save tokens to localStorage and state
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      // Set up refresh timer
      setupTokenRefreshTimer();
      
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
        throw new Error("Network error. Please check your internet connection and ensure the server is running.");
      } else {
        // Something else caused the error
        throw new Error("An unexpected error occurred. Please try again.");
      }
    }
  };

  // Register function with enhanced error handling
  const register = async (userData) => {
    try {
      const response = await authAxios.post(`/api/auth/register`, userData);
      
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Reset session expired state
      setSessionExpired(false);
      
      // Save tokens to localStorage and state
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      // Set up refresh timer
      setupTokenRefreshTimer();
      
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
        throw new Error("Network error. Please check your internet connection and ensure the server is running.");
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
      delete authAxios.defaults.headers.common["Authorization"];
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setSessionExpired(false);
      
      // Clear any refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token && !!user && !sessionExpired;
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
    changePassword,
    sessionExpired, // Expose session expired state to allow UI to show a message
    handleSessionExpired, // Allow components to trigger session expiration
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