/**
 * Enhanced Schedule Service
 * 
 * A comprehensive service for the enhanced scheduling system:
 * - Provides all CRUD operations for sessions
 * - Handles API connections with proper error management
 * - Formats data for display in the calendar
 * - Supports all scheduling operations for different user roles
 * - Integrates with the gamification system for session-based rewards
 */

import axios from 'axios';
import moment from 'moment';

// Import gamification service for integrated rewards
import gamificationService from './gamification/gamification-service';

// Get API base URL from environment variables and fix formatting
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Remove trailing slash if present for consistent concatenation
const FORMATTED_API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// Create axios instance with enhanced config and fixed URL base
const api = axios.create({
  baseURL: FORMATTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout to allow for slower operations
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  // Success handler
  (response) => response,
  
  // Error handler
  (error) => {
    // Network errors (no response)
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your internet connection.',
      });
    }
    
    // API errors with response
    if (error.response) {
      // Unauthorized - clear token
      if (error.response.status === 401) {
        console.warn('Authorization has expired or is invalid.');
        localStorage.removeItem('token');
      }
      
      // Server errors
      if (error.response.status >= 500) {
        console.error('Server error:', error.response.status, error.response.data);
        error.message = 'Server error. Please try again later.';
      }
      
      // Client errors
      if (error.response.status === 404) {
        console.error('Resource not found:', error.config.url);
        error.message = 'The requested resource was not found.';
      }
      
      if (error.response.status === 403) {
        console.error('Permission denied');
        error.message = 'You do not have permission to perform this action.';
      }
      
      if (error.response.status === 409) {
        console.error('Conflict:', error.response.data);
        error.message = error.response.data.message || 'This operation caused a conflict.';
      }
      
      // Include server message in the error if available
      if (error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      }
    }
    
    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      error.message = 'Request timed out. Please try again.';
    }
    
    return Promise.reject(error);
  }
);

// Enhanced Schedule Service
const enhancedScheduleService = {
  /**
   * Fetch all sessions with optional filters
   * @returns {Promise<Array>} Array of sessions
   */
  getSessions: async () => {
    try {
      // Validate token availability
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Using our enhanced API endpoint
      const response = await api.get('/api/sessions');
      
      // Validate received data
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
      
      // Ensure dates are properly parsed
      return response.data.map(session => {
        // Convert string dates to Date objects if needed
        const start = typeof session.start === 'string' ? new Date(session.start) : session.start;
        const end = typeof session.end === 'string' ? new Date(session.end) : session.end;
        
        return {
          ...session,
          start,
          end
        };
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  },
  
  /**
   * Get session statistics
   * @returns {Promise<Object>} Stats object
   */
  getScheduleStats: async () => {
    try {
      const response = await api.get('/api/sessions/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching schedule stats:', error);
      throw error;
    }
  },
  
  /**
   * Get all trainers for selection
   * @returns {Promise<Array>} Array of trainer users
   */
  getTrainers: async () => {
    try {
      const response = await api.get('/api/sessions/users/trainers');
      
      // Validate response
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid trainer data received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching trainers:', error);
      throw error;
    }
  },
  
  /**
   * Get all clients for selection (admin only)
   * @returns {Promise<Array>} Array of client users
   */
  getClients: async () => {
    try {
      const response = await api.get('/api/sessions/users/clients');
      
      // Validate response
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid client data received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },
  
  /**
   * Book a session for the current user
   * @param {string} sessionId - ID of the session to book
   * @returns {Promise<Object>} Booking result
   */
  bookSession: async (sessionId) => {
    try {
      // Input validation
      if (!sessionId) {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.post(`/api/sessions/${sessionId}/book`);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Trigger gamification rewards for booking a session
      try {
        const gamificationResult = await gamificationService.recordSessionAction(sessionId, 'booked');
        // Include any achievements or rewards in the response
        response.data.gamification = gamificationResult;
      } catch (gamificationError) {
        console.error('Gamification error when booking session:', gamificationError);
        // Continue even if gamification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error booking session:', error);
      throw error;
    }
  },
  
  /**
   * Create new available session slots (admin only)
   * @param {Object} data - Session creation data
   * @returns {Promise<Object>} Creation result
   */
  createAvailableSessions: async (data) => {
    try {
      // Input validation
      if (!data.sessions || !Array.isArray(data.sessions) || data.sessions.length === 0) {
        throw new Error('No valid session slots provided');
      }
      
      // Validate each session
      data.sessions.forEach(session => {
        if (!session.start) {
          throw new Error('All session slots must have a start time');
        }
        
        const startTime = new Date(session.start);
        
        if (isNaN(startTime.getTime())) {
          throw new Error('Invalid date format in session slots');
        }
        
        if (startTime <= new Date()) {
          throw new Error('Cannot create sessions in the past');
        }
      });
      
      const response = await api.post('/api/sessions', data);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating session slots:', error);
      throw error;
    }
  },
  
  /**
   * Create recurring sessions (admin only)
   * @param {Object} recurringData - Recurring session pattern
   * @returns {Promise<Object>} Creation result
   */
  createRecurringSessions: async (recurringData) => {
    try {
      // Input validation performed by component
      
      const response = await api.post('/api/sessions/recurring', recurringData);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      throw error;
    }
  },
  
  /**
   * Assign a trainer to a session (admin only)
   * @param {string} sessionId - Session ID
   * @param {string} trainerId - Trainer ID
   * @returns {Promise<Object>} Assignment result
   */
  assignTrainer: async (sessionId, trainerId) => {
    try {
      // Input validation done by component
      
      const response = await api.patch(`/api/sessions/${sessionId}/assign`, { trainerId });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error assigning trainer:', error);
      throw error;
    }
  },
  
  /**
   * Cancel a session
   * @param {string} sessionId - Session ID
   * @param {string} reason - Optional reason for cancellation
   * @returns {Promise<Object>} Cancellation result
   */
  cancelSession: async (sessionId, reason = '') => {
    try {
      // Input validation done by component
      
      const response = await api.patch(`/api/sessions/${sessionId}/cancel`, { reason });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  },
  
  /**
   * Mark a session as completed (trainer/admin only)
   * @param {string} sessionId - Session ID
   * @param {string} notes - Optional private notes
   * @returns {Promise<Object>} Completion result
   */
  completeSession: async (sessionId, notes = '') => {
    try {
      // Input validation done by component
      
      const response = await api.patch(`/api/sessions/${sessionId}/complete`, { notes });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Award points and trigger gamification rewards for completing a session
      try {
        // Only award points to the client who attended the session
        if (response.data.userId) {
          const gamificationResult = await gamificationService.recordSessionAction(sessionId, 'completed');
          
          // Include any achievements or rewards in the response
          response.data.gamification = gamificationResult;
          
          // Check if completing this session maintains a streak
          const streakInfo = await gamificationService.getStreakInfo();
          response.data.streakInfo = streakInfo;
        }
      } catch (gamificationError) {
        console.error('Gamification error when completing session:', gamificationError);
        // Continue even if gamification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  },
  
  /**
   * Confirm a session (trainer/admin only)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Confirmation result
   */
  confirmSession: async (sessionId) => {
    try {
      // Input validation done by component
      
      const response = await api.patch(`/api/sessions/${sessionId}/confirm`);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Award points for attending a confirmed session
      try {
        // Only award points to the client who will attend the session
        if (response.data.userId) {
          const gamificationResult = await gamificationService.recordSessionAction(sessionId, 'attended');
          // Include any achievements or rewards in the response
          response.data.gamification = gamificationResult;
        }
      } catch (gamificationError) {
        console.error('Gamification error when confirming session:', gamificationError);
        // Continue even if gamification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error confirming session:', error);
      throw error;
    }
  },
  
  /**
   * Get session details by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session details
   */
  getSessionById: async (sessionId) => {
    try {
      // Input validation done by component
      
      const response = await api.get(`/api/sessions/${sessionId}`);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Convert date strings to Date objects
      const session = response.data.session;
      return {
        ...session,
        start: new Date(session.start),
        end: new Date(session.end),
      };
    } catch (error) {
      console.error('Error fetching session details:', error);
      throw error;
    }
  }
};

export default enhancedScheduleService;
