// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create the AuthContext
export const AuthContext = createContext();

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:5000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for a stored user and validate the token.
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
          try {
            const response = await axios.get(`${API_BASE_URL}/validate-token`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setUser(response.data.user);
          } catch (error) {
            console.warn('Token validation failed, falling back to localStorage.');
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Registration function that sends a new user's data to the backend.
  const register = async (newUser) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, newUser);
      console.log('Registration successful:', response.data.message);
      // If the API returns a user object and a token, store them.
      if (response.data.user && response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      // Log full error details to help with debugging.
      console.error(
        'Registration failed:',
        JSON.stringify(error.response?.data, null, 2) || error.message
      );
      throw error;
    }
  };

  // Login function using a username and password.
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
      const userData = response.data.user;
      const token = response.data.token;

      // Save user and token to localStorage.
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);

      setUser(userData);
      return userData;
    } catch (error) {
      console.error(
        'Login failed:',
        JSON.stringify(error.response?.data, null, 2) || error.message
      );
      throw error;
    }
  };

  // Logout function to clear user data.
  const logout = async () => {
    try {
      const token = localStorage.getItem('token');

      if (token) {
        await axios.post(`${API_BASE_URL}/logout`, null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error(
        'Logout failed:',
        JSON.stringify(error.response?.data, null, 2) || error.message
      );
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to the AuthContext
export const useAuth = () => useContext(AuthContext);
