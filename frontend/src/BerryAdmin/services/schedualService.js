// frontend/src/BerryAdmin/services/scheduleService.js
import axios from 'axios';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Get all sessions with optional filtering
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getSessions = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get(`${API_BASE_URL}/api/schedule`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} API response
 */
export const getSessionById = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get(`${API_BASE_URL}/api/schedule/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Book an available session
 * @param {string} sessionId - Session ID to book
 * @returns {Promise} API response
 */
export const bookSession = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/book`,
      { sessionId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error booking session:', error);
    throw error;
  }
};

/**
 * Request a new session
 * @param {Object} data - Session request data
 * @param {string} data.start - Start date/time (ISO format)
 * @param {string} data.end - End date/time (ISO format)
 * @param {string} data.notes - Notes about the session
 * @returns {Promise} API response
 */
export const requestSession = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/request`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error requesting session:', error);
    throw error;
  }
};

/**
 * Cancel a session
 * @param {string} sessionId - Session ID to cancel
 * @param {string} reason - Reason for cancellation
 * @returns {Promise} API response
 */
export const cancelSession = async (sessionId, reason = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.delete(
      `${API_BASE_URL}/api/schedule/cancel/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error cancelling session:', error);
    throw error;
  }
};

/**
 * Confirm a session (admin only)
 * @param {string} sessionId - Session ID to confirm
 * @returns {Promise} API response
 */
export const confirmSession = async (sessionId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/confirm/${sessionId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error confirming session:', error);
    throw error;
  }
};

/**
 * Mark a session as completed (admin/trainer only)
 * @param {string} sessionId - Session ID to mark as completed
 * @param {string} notes - Optional notes about the completed session
 * @returns {Promise} API response
 */
export const completeSession = async (sessionId, notes = '') => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/complete/${sessionId}`,
      { notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error completing session:', error);
    throw error;
  }
};

/**
 * Create available slots (admin only)
 * @param {Array} slots - Array of slot objects
 * @returns {Promise} API response
 */
export const createAvailableSlots = async (slots) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/available`,
      { slots },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating slots:', error);
    throw error;
  }
};

/**
 * Create recurring slots (admin only)
 * @param {Object} data - Recurring slots data
 * @param {string} data.startDate - Start date (ISO format)
 * @param {string} data.endDate - End date (ISO format)
 * @param {Array<number>} data.daysOfWeek - Day numbers (0-6, where 0 is Sunday)
 * @param {Array<string>} data.times - Time strings (HH:MM format)
 * @param {string} data.trainerId - Trainer ID (optional)
 * @param {string} data.location - Location (optional)
 * @param {number} data.duration - Duration in minutes (optional)
 * @returns {Promise} API response
 */
export const createRecurringSessions = async (data) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/recurring`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating recurring sessions:', error);
    throw error;
  }
};

/**
 * Assign a trainer to a session (admin only)
 * @param {string} sessionId - Session ID
 * @param {string} trainerId - Trainer ID
 * @returns {Promise} API response
 */
export const assignTrainer = async (sessionId, trainerId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/assign/${sessionId}`,
      { trainerId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error assigning trainer:', error);
    throw error;
  }
};

/**
 * Add notes to a session
 * @param {string} sessionId - Session ID
 * @param {string} notes - Notes text
 * @returns {Promise} API response
 */
export const addSessionNotes = async (sessionId, notes) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/notes/${sessionId}`,
      { notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding session notes:', error);
    throw error;
  }
};

/**
 * Get all trainers
 * @returns {Promise} API response with trainers list
 */
export const getTrainers = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get(
      `${API_BASE_URL}/api/users/trainers`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching trainers:', error);
    throw error;
  }
};

/**
 * Get all clients
 * @returns {Promise} API response with clients list
 */
export const getClients = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.get(
      `${API_BASE_URL}/api/users/clients`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

// Format events for react-big-calendar
export const formatEventsForCalendar = (sessions) => {
  if (!sessions || !Array.isArray(sessions)) return [];
  
  return sessions.map(session => {
    // Calculate end time if not provided
    const start = new Date(session.sessionDate);
    const end = session.endDate 
      ? new Date(session.endDate) 
      : new Date(start.getTime() + (session.duration || 60) * 60000);
    
    // Generate title based on session status
    let title = 'Session';
    
    if (session.status === 'available') {
      title = `Available ${session.trainer ? `(${session.trainer.firstName})` : ''}`;
    } else if (session.status === 'requested') {
      title = `Requested by ${session.client?.firstName || 'Client'}`;
    } else if (session.client) {
      const trainerInfo = session.trainer 
        ? ` with ${session.trainer.firstName}`
        : '';
      title = `${session.client.firstName}${trainerInfo}`;
    }
    
    return {
      id: session.id,
      title,
      start,
      end,
      status: session.status,
      confirmed: session.confirmed,
      client: session.client,
      trainer: session.trainer,
      location: session.location,
      notes: session.notes,
      privateNotes: session.privateNotes,
      duration: session.duration,
      allDay: false,
      resource: session
    };
  });
};

export default {
  getSessions,
  getSessionById,
  bookSession,
  requestSession,
  cancelSession,
  confirmSession,
  completeSession,
  createAvailableSlots,
  createRecurringSessions,
  assignTrainer,
  addSessionNotes,
  getTrainers,
  getClients,
  formatEventsForCalendar
};