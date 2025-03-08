/**
 * AuthContext.jsx
 * Provides authentication state and functions throughout the application
 */
import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

// Create the context
const AuthContext = createContext();

// Get API base URL from environment variable or use default
// IMPORTANT: Changed from 8080 to 5000 to match the backend port
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  // Check token and load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Set axios default headers
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          
          // Fetch user data
          const response = await axios.get(`${API_BASE_URL}/api/auth/profile`);
          setUser(response.data.user);
        } catch (error) {
          console.error("Error loading user:", error);
          // Clear localStorage and state if token is invalid
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [token]);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { token, user } = response.data;
      
      // Save token to localStorage and state
      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);
      
      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      
      // Provide a user-friendly error message
      if (error.response) {
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

  // Register function
  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      
      const { token, user } = response.data;
      
      // Save token to localStorage and state
      localStorage.setItem("token", token);
      setToken(token);
      setUser(user);
      
      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      return { success: true, user };
    } catch (error) {
      console.error("Registration error:", error);
      
      // Provide a user-friendly error message
      if (error.response) {
        // Check for specific error types
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

  // Logout function
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem("token");
    
    // Reset auth state
    setToken(null);
    setUser(null);
    
    // Remove authorization header
    delete axios.defaults.headers.common["Authorization"];
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token;
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/auth/profile`, 
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error("Update profile error:", error);
      
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to update profile.");
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
    login,
    register,
    logout,
    isAuthenticated,
    updateProfile
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