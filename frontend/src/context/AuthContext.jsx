// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Use an environment variable for the API base URL if available.
// In production, set REACT_APP_API_BASE_URL to your deployed backend URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/auth';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On initial load, validate any stored token
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          // Validate the token with the backend
          const response = await axios.get(`${API_BASE_URL}/validate-token`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data.user);
        } catch (error) {
          console.warn('Token validation failed. Using stored user data.');
          // Optionally, you could clear the token here to force re-login.
          setUser(JSON.parse(storedUser));
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  /**
   * Registers a new user.
   * Sends the complete user object to the backend.
   * On success, stores the returned user and token.
   */
  const register = async (newUser) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, newUser);
      if (response.data.user && response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  };

  /**
   * Logs in an existing user.
   * Sends username and password to the backend.
   * On success, stores the returned user and token.
   */
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
      if (response.data.user && response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  /**
   * Logs out the current user.
   * Clears local storage and resets the user state.
   */
  const logout = async () => {
    // Optionally, call a backend logout endpoint here if needed.
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to the AuthContext
export const useAuth = () => useContext(AuthContext);
