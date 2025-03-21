/**
 * AuthContext.jsx
 * Enhanced authentication context with token refresh, improved error handling,
 * and proactive token renewal with CORS fixes
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { API_BASE_URL, AUTH_CONFIG } from "../config";

// Create the context
const AuthContext = createContext();

// Token refresh settings
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh token 5 minutes before expiry
const SESSION_EXPIRY_CHECK_INTERVAL = 60 * 1000; // Check token expiration every minute

/**
 * JWT token decoder with enhanced error handling
 * @param {string} token - JWT token to decode
 * @returns {object|null} Decoded token payload or null if invalid
 */
const parseJwt = (token) => {
  try {
    // Handle undefined/null tokens gracefully
    if (!token) {
      // Silent handling in production
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Warning: Attempted to parse undefined or null token");
      }
      return null;
    }
    
    // Check if token is a string
    if (typeof token !== 'string') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Warning: Token is not a string", typeof token);
      }
      return null;
    }
    
    const parts = token.split('.');
    // Verify token has the expected JWT format (header.payload.signature)
    if (parts.length !== 3) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Warning: Token does not have the expected JWT format");
      }
      return null;
    }
    
    // Extra safety - ensure second part exists and is not empty
    if (!parts[1] || parts[1].trim() === '') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Warning: Token payload section is empty");
      }
      return null;
    }
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
    
    // Safer base64 decoding
    let decodedData;
    try {
      decodedData = atob(paddedBase64);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Warning: Failed to decode base64 token payload", e);
      }
      return null;
    }
    
    const jsonPayload = decodeURIComponent(
      decodedData.split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error parsing JWT token:", error);
    }
    return null;
  }
};

/**
 * Log authentication actions in production for debugging
 * @param {string} action - Action description
 * @param {object} details - Additional details to log
 */
const logAuthAction = (action, details = {}) => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`Auth: ${action}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};

// Create a custom axios instance factory with CORS compatibility
const createAxiosInstance = (baseURL = API_BASE_URL, timeout = 15000) => {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout
  });
  
  // Add request interceptor to log all requests
  instance.interceptors.request.use(
    (config) => {
      // Log outgoing request in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🚀 Request: ${config.method.toUpperCase()} ${config.url}`, { 
          headers: config.headers,
          data: config.data
        });
      }
      return config;
    },
    (error) => {
      console.error("Request error:", error);
      return Promise.reject(error);
    }
  );
  
  // Add response interceptor to log all responses
  instance.interceptors.response.use(
    (response) => {
      // Log response in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Response: ${response.status} ${response.config.url}`, { 
          headers: response.headers,
          data: response.data
        });
      }
      return response;
    },
    (error) => {
      // Log error in both environments
      console.error(`❌ Response error: ${error.config?.url || 'unknown'}`, error);
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Create an axios instance for auth-related requests
const authAxios = createAxiosInstance();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem(AUTH_CONFIG.tokenKey) || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem(AUTH_CONFIG.refreshTokenKey) || null);
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
          logAuthAction('Proactive token refresh attempt');
          
          // Use a direct axios call to avoid circular dependencies with authAxios
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, 
            { refreshToken },
            {
              headers: {
                "Content-Type": "application/json"
              },
              withCredentials: true,
              timeout: 15000
            }
          );
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens
          localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
          localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
          setToken(newToken);
          setRefreshToken(newRefreshToken);
          
          // Update auth header
          authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          
          logAuthAction('Token proactively refreshed', { success: true });
          isRefreshing.current = false;
          
          // Setup new timer for the new token
          setupTokenRefreshTimer();
        } catch (error) {
          logAuthAction('Proactive token refresh failed', { 
            error: error.message,
            status: error.response?.status
          });
          isRefreshing.current = false;
          
          // If refresh fails due to expired refresh token, logout
          if (error.response && error.response.status === 401) {
            handleSessionExpired();
          }
        }
      }
    }, refreshTime);
    
    logAuthAction('Token refresh scheduled', {
      minutesUntilRefresh: Math.floor(refreshTime / 1000 / 60)
    });
  }, [token, refreshToken, getTimeUntilExpiry]);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    logAuthAction('Session expired - logging out');
    
    // Clear auth state
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
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
          logAuthAction('Token expired before request', { url: config.url });
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
        logAuthAction('Token refresh attempt', { 
          url: originalRequest.url,
          method: originalRequest.method
        });
        
        // Try to refresh the token
        try {
          // Check if we have a refresh token
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }
          
          // Use direct axios call to avoid circular dependencies
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, 
            { refreshToken },
            {
              headers: {
                "Content-Type": "application/json"
              },
              withCredentials: true,
              timeout: 15000
            }
          );
          
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in storage and state
          localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
          localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
          setToken(newToken);
          setRefreshToken(newRefreshToken);
          
          // Process any queued requests
          processQueue(null, newToken);
          isRefreshing.current = false;
          
          // Set up a new refresh timer for the new token
          setupTokenRefreshTimer();
          logAuthAction('Token refresh success');
          
          // Retry the original request
          return authAxios(originalRequest);
        } catch (refreshError) {
          logAuthAction('Token refresh failed', { 
            error: refreshError.message,
            status: refreshError.response?.status
          });
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
      // Validate that token exists and is a proper JWT before proceeding
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        // Check if token is already expired
        if (isTokenExpired(token)) {
          logAuthAction('Token already expired on load, attempting refresh');
          
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
          const response = await authAxios.get('/auth/profile');
          setUser(response.data.user);
          
          // Reset session expired state if successful
          if (sessionExpired) {
            setSessionExpired(false);
          }
          
          logAuthAction('User profile loaded successfully', { 
            userId: response.data.user.id
          });
        } catch (error) {
          logAuthAction('Error loading user', { 
            error: error.message,
            status: error.response?.status
          });
          
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
      logAuthAction('Login attempt', { username });
      
      // Try testing the connection first to check for CORS issues
      try {
        await axios.options(`${API_BASE_URL}/auth/login`, {
          headers: {
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization"
          },
          timeout: 5000
        });
      } catch (optionsError) {
        console.warn("Preflight check failed, continuing with login attempt:", optionsError.message);
      }
      
      // Use direct axios instead of authAxios for login to avoid circular dependencies
      const response = await axios.post(`${API_BASE_URL}/auth/login`, 
        { username, password },
        {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true,
          timeout: 15000
        }
      );

      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Reset session expired state
      setSessionExpired(false);
      
      // Save tokens to localStorage and state
      localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
      localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      // Set up refresh timer
      setupTokenRefreshTimer();
      
      logAuthAction('Login success', { userId: user.id });
      
      return { success: true, user };
    } catch (error) {
      logAuthAction('Login error', { 
        error: error.message, 
        status: error.response?.status
      });
      
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
      logAuthAction('Registration attempt');
      
      // Use direct axios instead of authAxios for registration
      const response = await axios.post(`${API_BASE_URL}/auth/register`, 
        userData,
        {
          headers: {
            "Content-Type": "application/json"
          },
          withCredentials: true,
          timeout: 15000
        }
      );
      
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      // Reset session expired state
      setSessionExpired(false);
      
      // Save tokens to localStorage and state
      localStorage.setItem(AUTH_CONFIG.tokenKey, newToken);
      localStorage.setItem(AUTH_CONFIG.refreshTokenKey, newRefreshToken);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(user);
      
      // Set default authorization header
      authAxios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      
      // Set up refresh timer
      setupTokenRefreshTimer();
      
      logAuthAction('Registration success', { userId: user.id });
      
      return { success: true, user };
    } catch (error) {
      logAuthAction('Registration error', { 
        error: error.message,
        status: error.response?.status
      });
      
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
      logAuthAction('Logout attempt');
      
      // Call the backend to invalidate the refresh token if we have one
      if (token && refreshToken) {
        await authAxios.post("/auth/logout");
      }
    } catch (error) {
      logAuthAction('Logout API error', { error: error.message });
    } finally {
      // Clear auth state regardless of API success
      localStorage.removeItem(AUTH_CONFIG.tokenKey);
      localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
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
      
      logAuthAction('Logout completed');
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    // More robust authentication check - validate token format too
    const isValidToken = !!token && typeof token === 'string' && token.split('.').length === 3;
    return isValidToken && !!user && !sessionExpired;
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const response = await authAxios.put("/auth/profile", userData);
      
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error("Update profile error:", error);
      
      if (error.response?.data?.errors) {
        const errorMessage = error.response.data.errors
          .map(err => `${err.field}: ${err.message}`)
          .join(", ");
        throw new Error(`Validation error: ${errorMessage}`);
      }
      
      throw new Error(error.response?.data?.message || 
                     "Failed to update profile.");
    }
  };

  // Change user password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAxios.put("/auth/password", {
        currentPassword,
        newPassword
      });
      
      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      console.error("Password change error:", error);
      
      throw new Error(error.response?.data?.message || 
                     "Failed to change password.");
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