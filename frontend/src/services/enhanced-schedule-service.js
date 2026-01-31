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

// Set mock data mode for development and testing
const setMockDataMode = () => {
  // In development mode, use mock data by default
  if (import.meta.env.DEV) {
    localStorage.setItem('use_mock_data', 'true');
    console.log('Development mode detected - Mock data mode activated by default');
    return true;
  }
  
  // In production mode, only use mock data if explicitly set
  return localStorage.getItem('use_mock_data') === 'true';
};

// Initialize mock data flag
const USING_MOCK_DATA = setMockDataMode();

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
    
    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
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

// Status color mapping
const statusColors = {
  available: '#4caf50',      // Green
  booked: '#2196f3',         // Blue
  scheduled: '#2196f3',      // Blue
  confirmed: '#9c27b0',      // Purple
  completed: '#757575',      // Gray
  cancelled: '#f44336',      // Red
  requested: '#ffd700',      // Gold for orientation requests  
  blocked: '#212121'         // Dark Gray/Black for blocked time
};

// Mock data for development use when server is unavailable
const MOCK_SESSIONS = [
  {
    id: 'mock-session-1',
    title: 'Available Session',
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(11, 0, 0, 0)),
    status: 'available',
    location: 'Main Studio',
    duration: 60
  },
  {
    id: 'mock-blocked-1',
    title: 'Blocked Time (Unavailable)',
    start: new Date(new Date().setHours(13, 0, 0, 0)),
    end: new Date(new Date().setHours(14, 0, 0, 0)),
    status: 'blocked',
    location: 'Main Studio',
    reason: 'Gym Maintenance',
    duration: 60
  },
  {
    id: 'mock-session-2',
    title: 'Booked Session',
    start: new Date(new Date().setHours(14, 0, 0, 0)),
    end: new Date(new Date().setHours(15, 0, 0, 0)),
    status: 'booked',
    location: 'Main Studio',
    userId: '123',
    client: { firstName: 'John', lastName: 'Doe' },
    duration: 60
  },
  {
    id: 'mock-session-3',
    title: 'Confirmed Session',
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    status: 'confirmed',
    location: 'Training Room A',
    userId: '123',
    trainerId: '456',
    client: { firstName: 'John', lastName: 'Doe' },
    trainer: { firstName: 'Jane', lastName: 'Smith' },
    duration: 60
  },
  {
    id: 'mock-session-4',
    title: 'Completed Session',
    start: new Date(new Date().setDate(new Date().getDate() - 1)),
    end: new Date(new Date().setDate(new Date().getDate() - 1)),
    status: 'completed',
    location: 'Outdoor Area',
    userId: '123',
    trainerId: '456',
    client: { firstName: 'John', lastName: 'Doe' },
    trainer: { firstName: 'Jane', lastName: 'Smith' },
    duration: 60
  },
  {
    id: 'mock-orientation-1',
    title: 'Orientation Request (Pending Approval)',
    start: new Date(new Date().setDate(new Date().getDate() + 2)),
    end: new Date(new Date().setDate(new Date().getDate() + 2)),
    status: 'requested',
    location: 'Main Studio',
    client: { 
      firstName: 'Emma', 
      lastName: 'Wilson',
      email: 'emma.wilson@example.com',
      phone: '555-123-4567'
    },
    notes: 'Looking to start a fitness program for weight loss and strength training.',
    duration: 30
  }
];

const MOCK_TRAINERS = [
  { id: '456', firstName: 'Jane', lastName: 'Smith', role: 'trainer' },
  { id: '789', firstName: 'Mike', lastName: 'Johnson', role: 'trainer' }
];

const MOCK_CLIENTS = [
  { id: '123', firstName: 'John', lastName: 'Doe', role: 'client' },
  { id: '234', firstName: 'Sarah', lastName: 'Wilson', role: 'client' }
];

const MOCK_STATS = {
  totalSessions: 5,  // Updated to include blocked session
  bookedSessions: 1,
  availableSessions: 1,
  blockedSessions: 1, // Added for blocked sessions
  completedSessions: 1,
  userBookedSessions: 2,
  totalClients: 2,
  totalTrainers: 2
};

// Helper function to check if we should use mock data
const shouldUseMockData = () => {
  // Production: Only use mock data if explicitly enabled
  if (!import.meta.env.DEV) {
    return localStorage.getItem('use_mock_data') === 'true';
  }
  
  // Development: Use mock data by default or if explicitly enabled
  return USING_MOCK_DATA || localStorage.getItem('use_mock_data') === 'true';
};

// Enhanced Schedule Service
const enhancedScheduleService = {
  /**
   * Fetch all sessions with optional filters
   * @returns {Promise<Array>} Array of sessions
   */
  getSessions: async () => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock session data');
        return MOCK_SESSIONS;
      }
      
      // Validate token availability
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Using our enhanced API endpoint (matches backend routes)
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
      
      // If in development mode, return mock data on error
      if (import.meta.env.DEV) {
        console.warn('API error - using mock session data');
        localStorage.setItem('use_mock_data', 'true');
        return MOCK_SESSIONS;
      }
      
      throw error;
    }
  },
  
  /**
   * Get session statistics
   * @returns {Promise<Object>} Stats object
   */
  getScheduleStats: async () => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock stats data');
        return { stats: MOCK_STATS };
      }
      
      const response = await api.get('/api/sessions/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching schedule stats:', error);
      
      // If in development mode, return mock data on error
      if (import.meta.env.DEV) {
        console.warn('API error - using mock stats data');
        return { stats: MOCK_STATS };
      }
      
      throw error;
    }
  },
  
  /**
   * Get all trainers for selection
   * @returns {Promise<Array>} Array of trainer users
   */
  getTrainers: async () => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock trainer data');
        return MOCK_TRAINERS;
      }
      
      const response = await api.get('/api/sessions/users/trainers');
      
      // Validate response
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid trainer data received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching trainers:', error);
      
      // If in development mode, return mock data on error
      if (import.meta.env.DEV) {
        console.warn('API error - using mock trainer data');
        return MOCK_TRAINERS;
      }
      
      throw error;
    }
  },
  
  /**
   * Get all clients for selection (admin only)
   * @returns {Promise<Array>} Array of client users
   */
  getClients: async () => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock client data');
        return MOCK_CLIENTS;
      }
      
      const response = await api.get('/api/sessions/users/clients');
      
      // Validate response
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid client data received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      
      // If in development mode, return mock data on error
      if (import.meta.env.DEV) {
        console.warn('API error - using mock client data');
        return MOCK_CLIENTS;
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for booking session');
        // Find the session in mock data and update its status
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw new Error('Session not found');
        }
        
        // Update the session status
        MOCK_SESSIONS[sessionIndex].status = 'booked';
        MOCK_SESSIONS[sessionIndex].userId = '123'; // Mock user ID
        MOCK_SESSIONS[sessionIndex].client = MOCK_CLIENTS[0]; // First mock client
        
        // Return mock response with gamification data
        return {
          success: true,
          sessionId,
          gamification: {
            success: true,
            pointsAwarded: 50,
            newTotal: 250,
            achievements: [{
              id: 'first-booking',
              title: 'First Booking Achievement'
            }]
          }
        };
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
      
      // If in development mode, use mock data on error
      if (import.meta.env.DEV && !shouldUseMockData()) {
        console.warn('API error - using mock data for booking');
        localStorage.setItem('use_mock_data', 'true');
        // Return a mock success response
        return {
          success: true,
          sessionId,
          gamification: {
            success: true,
            pointsAwarded: 50,
            newTotal: 250
          }
        };
      }
      
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

        // Note: Past date validation removed - admin can create past sessions for backfilling
        // Backend enforces role-based restrictions
      });
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for creating available sessions');
        
        // Create a new available session in mock data for each session in the input
        const newSessions = data.sessions.map(session => ({
          id: `mock-session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: 'Available Session',
          start: new Date(session.start),
          end: new Date(session.end || moment(session.start).add(session.duration || 60, 'minutes').toDate()),
          status: 'available',
          location: session.location || 'Main Studio',
          notes: session.notes || '',
          trainerId: session.trainerId,
          trainer: session.trainerId ? (
            MOCK_TRAINERS.find(t => t.id === session.trainerId) || null
          ) : null,
          duration: session.duration || 60
        }));
        
        // Add all new sessions to our mock data - create a new array instead of modifying the existing one
        // This avoids the "Cannot add property X, object is not extensible" error
        const updatedSessions = [...MOCK_SESSIONS];
        updatedSessions.push(...newSessions);
        
        // Replace the global MOCK_SESSIONS with our updated array
        Object.assign(MOCK_SESSIONS, updatedSessions);
        
        // Return mock response
        return {
          success: true,
          sessions: newSessions
        };
      }
      
      const response = await api.post('/api/sessions', data);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating session slots:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for session creation');
        
        // Try the mock implementation
        return enhancedScheduleService.createAvailableSessions(data);
      }
      
      throw error;
    }
  },

  /**
  * Create a new blocked time slot (admin/trainer only)
  * @param {Object} data - Blocked time data 
  * @returns {Promise<Object>} Creation result
  */
  createBlockedTime: async (data) => {
  try {
  // Input validation
  if (!data || !data.start) {
  throw new Error('Invalid blocked time data');
  }
  
  const startTime = new Date(data.start);
  
  if (isNaN(startTime.getTime())) {
  throw new Error('Invalid date format');
  }

  // Note: Past date validation removed - admin can create blocked time in past for corrections
  // Backend enforces role-based restrictions
  
  // Check if we should use mock data
  if (shouldUseMockData()) {
  console.log('Using mock data for creating blocked time');
  
  // Create a new blocked time in mock data
  const newBlockedTime = {
  id: `mock-blocked-${Date.now()}`,
  title: `Blocked: ${data.reason || 'Unavailable'}`,
  start: new Date(data.start),
  end: new Date(data.end || moment(data.start).add(data.duration || 60, 'minutes').toDate()),
  status: 'blocked',
  location: data.location || 'Main Studio',
  reason: data.reason || 'Blocked Time',
  duration: data.duration || 60,
    trainerId: data.trainerId || null,
    isRecurring: data.isRecurring || false,
    recurringPattern: data.recurringPattern || null
  };
  
  let newBlockedTimes = [newBlockedTime];
  
  // Generate recurring blocked times if needed
  if (data.isRecurring && data.recurringPattern) {
    const recurringTimes = generateRecurringBlockedTimes(
      newBlockedTime, 
    data.recurringPattern
  );
    newBlockedTimes = newBlockedTimes.concat(recurringTimes);
    }
    
    // Add the new blocked time(s) using the same approach to avoid extensibility errors
    const updatedSessions = [...MOCK_SESSIONS];
  updatedSessions.push(...newBlockedTimes);
  
    // Replace the global MOCK_SESSIONS with our updated array
    Object.assign(MOCK_SESSIONS, updatedSessions);
    
    // Return mock response - only return the first one for UI simplicity
  return {
      success: true,
      session: newBlockedTime,
      recurringCount: newBlockedTimes.length - 1
      };
  }
  
  // Assume the API has an endpoint for creating blocked time
  const response = await api.post('/api/sessions/block', {
  ...data,
  status: 'blocked'
  });
  
  // Validate response
  if (!response.data) {
    throw new Error('Empty response received from server');
  }
    
      return response.data;
    } catch (error) {
      console.error('Error creating blocked time:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for blocked time creation');
        
        // Try the mock implementation
        return enhancedScheduleService.createBlockedTime(data);
      }
      
      throw error;
    }
  },
  
  /**
   * Helper function to generate recurring blocked time slots
   * @param {Object} baseBlockedTime - The base blocked time configuration
   * @param {Object} pattern - Recurring pattern (days of week, until date, etc)
   * @returns {Array} Generated recurring blocked times
   */
  generateRecurringBlockedTimes: function(baseBlockedTime, pattern) {
    const { daysOfWeek, untilDate } = pattern;
    const recurringTimes = [];
    
    // Calculate duration in minutes
    const startTime = new Date(baseBlockedTime.start);
    const endTime = new Date(baseBlockedTime.end);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMins = Math.round(durationMs / (1000 * 60));
    
    // Get the day of week and time from the base blocked time
    const baseDay = startTime.getDay();
    const baseHour = startTime.getHours();
    const baseMinute = startTime.getMinutes();
    
    // Start from a week after the base date to avoid duplicates
    const currentDate = new Date(startTime);
    currentDate.setDate(currentDate.getDate() + 7);
    
    // End date is either the specified until date or a default of 1 year
    const endDate = pattern.untilDate 
      ? new Date(pattern.untilDate) 
      : new Date(startTime.getFullYear() + 1, startTime.getMonth(), startTime.getDate());
    
    // Generate recurrences
    while (currentDate <= endDate) {
      const currentDay = currentDate.getDay();
      
      // Check if current day matches the recurring pattern
      if (daysOfWeek.includes(currentDay)) {
        // Create a new date for this occurrence at the same time
        const occurrenceStart = new Date(currentDate);
        occurrenceStart.setHours(baseHour, baseMinute, 0, 0);
        
        // Create end time
        const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMins * 60 * 1000);
        
        // Create a new blocked time based on the template
        const newOccurrence = {
          id: `mock-blocked-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: baseBlockedTime.title,
          start: occurrenceStart,
          end: occurrenceEnd,
          status: 'blocked',
          location: baseBlockedTime.location,
          reason: baseBlockedTime.reason,
          duration: durationMins,
          trainerId: baseBlockedTime.trainerId,
          isRecurring: true,
          recurringPattern: pattern,
          // Link to parent for identification
          parentBlockedTimeId: baseBlockedTime.id
        };
        
        recurringTimes.push(newOccurrence);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return recurringTimes;
  },
  
  /**
   * Create recurring sessions (admin only)
   * @param {Object} recurringData - Recurring session pattern
   * @returns {Promise<Object>} Creation result
   */
  createRecurringSessions: async (recurringData) => {
    try {
      // Input validation performed by component
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for creating recurring sessions');
        
        // Generate recurring sessions based on the pattern
        const generatedSessions = [];
        const startDate = moment(recurringData.startDate);
        const endDate = moment(recurringData.endDate);
        
        // Iterate through each day between start and end dates
        for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, 'days')) {
          // Check if this day of week is included in the pattern
          if (recurringData.daysOfWeek.includes(date.day())) {
            // Create sessions for each time slot
            recurringData.times.forEach(timeString => {
              const [hours, minutes] = timeString.split(':').map(Number);
              
              const sessionStart = date.clone().hour(hours).minute(minutes).second(0);
              const sessionEnd = sessionStart.clone().add(recurringData.duration, 'minutes');
              
              // Only add if start time is in the future
              if (sessionStart.isAfter(moment())) {
                const newSession = {
                  id: `mock-session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  title: 'Available Session',
                  start: sessionStart.toDate(),
                  end: sessionEnd.toDate(),
                  status: 'available',
                  location: recurringData.location,
                  trainerId: recurringData.trainerId,
                  trainer: recurringData.trainerId ? (
                    MOCK_TRAINERS.find(t => t.id === recurringData.trainerId) || null
                  ) : null,
                  duration: recurringData.duration
                };
                
                generatedSessions.push(newSession);
              }
            });
          }
        }
        
        // Add all generated sessions to our mock data - create a new array instead of modifying the existing one
        // This avoids the "Cannot add property X, object is not extensible" error
        const updatedSessions = [...MOCK_SESSIONS];
        updatedSessions.push(...generatedSessions);
        
        // Replace the global MOCK_SESSIONS with our updated array
        Object.assign(MOCK_SESSIONS, updatedSessions);
        
        // Return mock response
        return generatedSessions;
      }
      
      const response = await api.post('/api/sessions/recurring', recurringData);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for recurring session creation');
        
        // Try the mock implementation
        return enhancedScheduleService.createRecurringSessions(recurringData);
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for assigning trainer');
        
        // Find the session in mock data
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw new Error('Session not found');
        }
        
        // Find the trainer in mock data
        const trainer = MOCK_TRAINERS.find(t => t.id === trainerId);
        if (!trainer) {
          throw new Error('Trainer not found');
        }
        
        // Update the session's trainer
        MOCK_SESSIONS[sessionIndex].trainerId = trainerId;
        MOCK_SESSIONS[sessionIndex].trainer = {
          id: trainer.id,
          firstName: trainer.firstName,
          lastName: trainer.lastName
        };
        
        // Return mock response
        return {
          success: true,
          sessionId,
          trainerId
        };
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/assign`, { trainerId });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error assigning trainer:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for trainer assignment');
        
        // Try the mock implementation
        return enhancedScheduleService.assignTrainer(sessionId, trainerId);
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for cancelling session');
        
        // Find the session in mock data
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw new Error('Session not found');
        }
        
        // Store the original status
        const originalStatus = MOCK_SESSIONS[sessionIndex].status;
        
        // Update the session status
        MOCK_SESSIONS[sessionIndex].status = 'cancelled';
        MOCK_SESSIONS[sessionIndex].cancellationReason = reason;
        
        // Return mock response
        return {
          success: true,
          sessionId,
          previousStatus: originalStatus
        };
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/cancel`, { reason });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error cancelling session:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for session cancellation');
        
        // Try the mock implementation
        return enhancedScheduleService.cancelSession(sessionId, reason);
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for completing session');
        
        // Find the session in mock data
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw new Error('Session not found');
        }
        
        // Update the session status
        MOCK_SESSIONS[sessionIndex].status = 'completed';
        MOCK_SESSIONS[sessionIndex].notes = notes;
        
        // Return mock response with gamification data
        const mockUserId = MOCK_SESSIONS[sessionIndex].userId;
        const gamificationData = mockUserId ? {
          success: true,
          pointsAwarded: 100,
          newTotal: 350,
          achievements: [{
            id: 'session-completion',
            title: 'Session Completed'
          }]
        } : null;
        
        return {
          success: true,
          sessionId,
          gamification: gamificationData,
          streakInfo: mockUserId ? {
            currentStreak: 3,
            bestStreak: 5,
            streakMaintained: true
          } : null
        };
      }
      
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
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for session completion');
        
        // Try the mock implementation
        return enhancedScheduleService.completeSession(sessionId, notes);
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for confirming session');
        
        // Find the session in mock data
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
          throw new Error('Session not found');
        }
        
        // Update the session status
        MOCK_SESSIONS[sessionIndex].status = 'confirmed';
        
        // Return mock response with gamification data
        const mockUserId = MOCK_SESSIONS[sessionIndex].userId;
        const gamificationData = mockUserId ? {
          success: true,
          pointsAwarded: 25,
          newTotal: 275,
          achievements: []
        } : null;
        
        return {
          success: true,
          sessionId,
          gamification: gamificationData
        };
      }
      
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
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for session confirmation');
        
        // Try the mock implementation
        return enhancedScheduleService.confirmSession(sessionId);
      }
      
      throw error;
    }
  },
  
  /**
   * Get session details by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session details
   */
  /**
   * Delete a blocked time slot
   * @param {string} blockedTimeId - ID of the blocked time to delete
   * @param {boolean} removeAll - If true, removes all recurring instances
   * @returns {Promise<Object>} Deletion result
   */
  deleteBlockedTime: async (blockedTimeId, removeAll = false) => {
    try {
      // Input validation
      if (!blockedTimeId) {
        throw new Error('Blocked time ID is required');
      }
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for deleting blocked time');
        
        // Find the blocked time
        const blockedIndex = MOCK_SESSIONS.findIndex(s => s.id === blockedTimeId && s.status === 'blocked');
        
        if (blockedIndex === -1) {
          throw new Error('Blocked time not found');
        }
        
        const blockedTime = MOCK_SESSIONS[blockedIndex];
        
        // Handle recurring deletion if needed
        if (removeAll && blockedTime.isRecurring) {
          // This is a parent blocked time, remove all children too
          const removedSessions = [];
          
          // Create a new array without the removed sessions
          const updatedSessions = MOCK_SESSIONS.filter(session => {
            const isParent = session.id === blockedTimeId;
            const isChild = session.parentBlockedTimeId === blockedTimeId;
            
            if (isParent || isChild) {
              removedSessions.push(session);
              return false;
            }
            return true;
          });
          
          // Replace the global MOCK_SESSIONS with our updated array
          Object.assign(MOCK_SESSIONS, updatedSessions);
          
          return {
            success: true,
            message: `Deleted blocked time and ${removedSessions.length - 1} recurring instances`,
            removedCount: removedSessions.length
          };
        } else if (removeAll && blockedTime.parentBlockedTimeId) {
          // This is a child, remove all instances including parent
          const parentId = blockedTime.parentBlockedTimeId;
          const removedSessions = [];
          
          // Create a new array without the removed sessions
          const updatedSessions = MOCK_SESSIONS.filter(session => {
            const isParent = session.id === parentId;
            const isChild = session.parentBlockedTimeId === parentId;
            
            if (isParent || isChild) {
              removedSessions.push(session);
              return false;
            }
            return true;
          });
          
          // Replace the global MOCK_SESSIONS with our updated array
          Object.assign(MOCK_SESSIONS, updatedSessions);
          
          return {
            success: true,
            message: `Deleted blocked time series (${removedSessions.length} instances)`,
            removedCount: removedSessions.length
          };
        } else {
          // Just remove the single blocked time
          const updatedSessions = MOCK_SESSIONS.filter(s => s.id !== blockedTimeId);
          
          // Replace the global MOCK_SESSIONS with our updated array
          Object.assign(MOCK_SESSIONS, updatedSessions);
          
          return {
            success: true,
            message: 'Deleted blocked time slot',
            removedCount: 1
          };
        }
      }
      
      // Regular API mode
      const endpoint = removeAll 
        ? `/api/sessions/block/${blockedTimeId}?removeAll=true`
        : `/api/sessions/block/${blockedTimeId}`;
        
      const response = await api.delete(endpoint);
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting blocked time:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for blocked time deletion');
        
        // Try the mock implementation
        return enhancedScheduleService.deleteBlockedTime(blockedTimeId, removeAll);
      }
      
      throw error;
    }
  },
  
  /**
   * Schedule an orientation session (for new potential clients)
   * @param {Object} orientationData - Orientation session data
   * @returns {Promise<Object>} Creation result
   */
  scheduleOrientation: async (orientationData) => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for scheduling orientation');
        
        // Create a new orientation session in mock data
        const newOrientation = {
          id: `mock-orientation-${Date.now()}`,
          title: 'Orientation Request (Pending Approval)',
          start: new Date(orientationData.start),
          end: new Date(orientationData.end),
          status: 'requested',
          location: orientationData.location || 'Main Studio',
          client: {
            firstName: orientationData.name.split(' ')[0] || 'New',
            lastName: orientationData.name.split(' ').slice(1).join(' ') || 'Client',
            email: orientationData.email,
            phone: orientationData.phone
          },
          notes: orientationData.goals,
          duration: orientationData.duration || 30
        };
        
        // Add the new orientation using the same approach to avoid extensibility errors
        const updatedSessions = [...MOCK_SESSIONS];
        updatedSessions.push(newOrientation);
        
        // Replace the global MOCK_SESSIONS with our updated array
        Object.assign(MOCK_SESSIONS, updatedSessions);
        
        // Return mock response
        return {
          success: true,
          session: newOrientation
        };
      }
      
      // Assume the API has an endpoint for creating orientation sessions
      const response = await api.post('/api/sessions/orientation', {
        ...orientationData,
        status: 'requested'
      });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error scheduling orientation:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for orientation scheduling');
        
        // Try the mock implementation
        return enhancedScheduleService.scheduleOrientation(orientationData);
      }
      
      throw error;
    }
  },
  
  /**
   * Resolve an orientation request (admin only)
   * @param {string} orientationId - Orientation session ID 
   * @param {boolean} approved - Whether the request is approved
   * @returns {Promise<Object>} Resolution result
   */
  resolveOrientationRequest: async (orientationId, approved) => {
    try {
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for resolving orientation');
        
        // Find the orientation session in mock data
        const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === orientationId);
        if (sessionIndex === -1) {
          throw new Error('Orientation session not found');
        }
        
        // Update the session status based on approval
        MOCK_SESSIONS[sessionIndex].status = approved ? 'confirmed' : 'cancelled';
        MOCK_SESSIONS[sessionIndex].title = approved ? 
          `Orientation with ${MOCK_SESSIONS[sessionIndex].client.firstName}` : 
          'Cancelled Orientation';
        
        // Return mock response
        return {
          success: true,
          sessionId: orientationId,
          approved,
          status: MOCK_SESSIONS[sessionIndex].status
        };
      }
      
      // Assume the API has an endpoint for resolving orientation sessions
      const response = await api.patch(`/api/sessions/${orientationId}/resolve-orientation`, {
        approved,
        status: approved ? 'confirmed' : 'cancelled'
      });
      
      // Validate response
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error resolving orientation request:', error);
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for orientation resolution');
        
        // Try the mock implementation
        return enhancedScheduleService.resolveOrientationRequest(orientationId, approved);
      }
      
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
      
      // Check if we should use mock data
      if (shouldUseMockData()) {
        console.log('Using mock data for session details');
        
        // Find the session in mock data
        const session = MOCK_SESSIONS.find(s => s.id === sessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        
        // Return mock response
        return {
          ...session,
          start: new Date(session.start),
          end: new Date(session.end),
        };
      }
      
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
      
      // If in development mode and we explicitly don't want to use mock data yet, now we should
      if (import.meta.env.DEV && !shouldUseMockData()) {
        localStorage.setItem('use_mock_data', 'true');
        console.warn('API error - switching to mock data for session details');
        
        // Try the mock implementation
        return enhancedScheduleService.getSessionById(sessionId);
      }
      
      throw error;
    }
  }
};

export default enhancedScheduleService;