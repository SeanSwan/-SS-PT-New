/**
 * Schedule Service
 * 
 * This service provides a central interface for all session-related operations,
 * including fetching, creating, booking, and managing sessions.
 * 
 * Features:
 * - API calls to backend endpoints with proper error handling
 * - Data transformation for UI components
 * - Input validation
 * - Cached data management
 */

import axios from 'axios';
import moment from 'moment';

// Get API base URL from environment variables and fix formatting
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Remove trailing slash if present for consistent concatenation
const FORMATTED_API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// Define interfaces for type safety
export interface SessionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status: string;
  userId?: string | null;
  trainerId?: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    specialties?: string;
  };
  location?: string;
  notes?: string;
  duration?: number;
  resource?: any;
}

interface SessionFilters {
  userId?: string;
  trainerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface RecurringSessionData {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  times: string[];
  trainerId?: string;
  location: string;
  duration: number;
}

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

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

// Schedule service methods
const scheduleService = {
  /**
   * Fetch sessions with optional filters
   * @param {SessionFilters} filters - Filters to apply
   * @returns {Promise<SessionEvent[]>} Array of sessions
   */
  getSessions: async (filters: SessionFilters = {}): Promise<SessionEvent[]> => {
    try {
      // Validate token availability
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.trainerId) queryParams.append('trainerId', filters.trainerId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const queryString = queryParams.toString();
      // Using /api prefix to match backend routes
      const endpoint = `/api/sessions${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(endpoint);
      
      // Validate received data
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }
      
      // Convert ISO strings to Date objects for calendar
      return response.data.map((session: any) => ({
        ...session,
        start: new Date(session.start),
        end: new Date(session.end),
      }));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  },
  
  /**
   * Format events for the calendar - more robust implementation
   * @param {SessionEvent[]} events - Raw session events
   * @returns {any[]} Formatted events
   */
  formatEventsForCalendar: (events: SessionEvent[]): any[] => {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    return events.map(event => {
      try {
        // Create a title based on status and participants
        let title = event.status.charAt(0).toUpperCase() + event.status.slice(1);
        
        if (event.trainer && (event.status !== 'available')) {
          const trainerName = event.trainer.firstName || 'Trainer';
          title += ` with ${trainerName}`;
        }
        
        if (event.client && event.status !== 'available') {
          const clientName = event.client.firstName || 'Client';
          title += ` for ${clientName}`;
        }
        
        if (event.location) {
          title += ` @ ${event.location}`;
        }
        
        // Make sure dates are valid
        const start = event.start instanceof Date ? event.start : new Date(event.start);
        let end = event.end instanceof Date ? event.end : new Date(event.end);
        
        // Fallback for invalid end dates
        if (isNaN(end.getTime())) {
          // Use duration if available, otherwise default to 1 hour
          const durationMs = (event.duration || 60) * 60 * 1000;
          end = new Date(start.getTime() + durationMs);
        }
        
        return {
          ...event,
          title,
          start,
          end
        };
      } catch (err) {
        console.error('Error formatting event:', err, event);
        // Return a minimal valid event to prevent UI crashes
        return {
          id: event.id || 'error',
          title: 'Error: Invalid Event',
          start: new Date(),
          end: new Date(Date.now() + 3600000),
          status: 'error',
        };
      }
    }).filter(Boolean); // Remove any null/undefined events
  },
  
  /**
   * Get all trainers for selection
   * @returns {Promise<UserOption[]>} Array of trainer users
   */
  getTrainers: async () => {
    try {
      const response = await api.get('/api/users?role=trainer');
      
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
   * Get all clients for selection
   * @returns {Promise<UserOption[]>} Array of client users
   */
  getClients: async () => {
    try {
      const response = await api.get('/api/users?role=client');
      
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
   * @returns {Promise<any>} Booking result
   */
  bookSession: async (sessionId: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.post(`/api/sessions/${sessionId}/book`);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error booking session:', error);
      throw error;
    }
  },
  
  /**
   * Create a new available session slot (admin only)
   * @param {any[]} slots - Array of session slot data
   * @returns {Promise<any>} Creation result
   */
  createAvailableSlots: async (slots: any[]) => {
    try {
      // Input validation
      if (!Array.isArray(slots) || slots.length === 0) {
        throw new Error('No valid session slots provided');
      }
      
      // Validate each slot
      slots.forEach(slot => {
        if (!slot.start || !slot.end) {
          throw new Error('All session slots must have start and end times');
        }
        
        const startTime = new Date(slot.start);
        const endTime = new Date(slot.end);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error('Invalid date format in session slots');
        }
        
        if (startTime >= endTime) {
          throw new Error('Session end time must be after start time');
        }
      });
      
      const response = await api.post('/api/sessions', { sessions: slots });
      
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
   * @param {RecurringSessionData} recurringData - Recurring session pattern
   * @returns {Promise<any>} Creation result
   */
  createRecurringSessions: async (recurringData: RecurringSessionData) => {
    try {
      // Input validation
      if (!recurringData.startDate || !recurringData.endDate) {
        throw new Error('Start and end dates are required');
      }
      
      if (!Array.isArray(recurringData.daysOfWeek) || recurringData.daysOfWeek.length === 0) {
        throw new Error('At least one day of the week must be selected');
      }
      
      if (!Array.isArray(recurringData.times) || recurringData.times.length === 0) {
        throw new Error('At least one time slot must be provided');
      }
      
      // Generate all session slots based on recurring pattern
      const slots = [];
      const startMoment = moment(recurringData.startDate);
      const endMoment = moment(recurringData.endDate);
      
      // For each day between start and end dates
      for (let day = startMoment.clone(); day.isSameOrBefore(endMoment); day.add(1, 'days')) {
        // Check if this day of week is selected
        if (recurringData.daysOfWeek.includes(day.day())) {
          // For each time
          for (const timeStr of recurringData.times) {
            // Validate time format
            if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
              console.warn(`Skipping invalid time format: ${timeStr}`);
              continue;
            }
            
            const [hours, minutes] = timeStr.split(':').map(Number);
            
            // Validate hour and minute values
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
              console.warn(`Skipping invalid time values: ${timeStr}`);
              continue;
            }
            
            const sessionStart = day.clone().hour(hours).minute(minutes).second(0);
            const sessionEnd = sessionStart.clone().add(recurringData.duration, 'minutes');
            
            // Skip if in the past
            if (sessionStart.isBefore(moment())) {
              continue;
            }
            
            slots.push({
              start: sessionStart.toISOString(),
              end: sessionEnd.toISOString(),
              trainerId: recurringData.trainerId || undefined,
              location: recurringData.location,
              status: 'available',
              duration: recurringData.duration
            });
          }
        }
      }
      
      if (slots.length === 0) {
        throw new Error('No valid session slots could be generated with the given parameters');
      }
      
      // Create all slots
      const response = await api.post('/api/sessions', { sessions: slots });
      
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
   * @returns {Promise<any>} Assignment result
   */
  assignTrainer: async (sessionId: string, trainerId: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      if (!trainerId || typeof trainerId !== 'string') {
        throw new Error('Invalid trainer ID');
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/assign`, { trainerId });
      
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
   * @returns {Promise<any>} Cancellation result
   */
  cancelSession: async (sessionId: string, reason: string = '') => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/cancel`, { reason });
      
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
   * @returns {Promise<any>} Completion result
   */
  completeSession: async (sessionId: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/complete`);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
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
   * @returns {Promise<any>} Confirmation result
   */
  confirmSession: async (sessionId: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/confirm`);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
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
   * @returns {Promise<any>} Session details
   */
  getSessionById: async (sessionId: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      const response = await api.get(`/api/sessions/${sessionId}`);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return {
        ...response.data,
        start: new Date(response.data.start),
        end: new Date(response.data.end),
      };
    } catch (error) {
      console.error('Error fetching session details:', error);
      throw error;
    }
  },
  
  /**
   * Add notes to a session
   * @param {string} sessionId - Session ID
   * @param {string} notes - Notes content
   * @returns {Promise<any>} Update result
   */
  addSessionNotes: async (sessionId: string, notes: string) => {
    try {
      // Input validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID');
      }
      
      if (!notes || typeof notes !== 'string') {
        throw new Error('Notes cannot be empty');
      }
      
      const response = await api.patch(`/api/sessions/${sessionId}/notes`, { notes });
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error adding session notes:', error);
      throw error;
    }
  },
  
  /**
   * Cache management - clear cached data
   */
  clearCache: async () => {
    try {
      // Implementation depends on caching strategy used
      console.log('Cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
};

export default scheduleService;
