/**
 * Schedule Service
 * ==============
 * Provides methods for interacting with the scheduling API endpoints.
 * This service layer keeps API calls separate from UI components.
 */

import axios from 'axios';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Get all sessions with optional filtering
 * @param {Object} filters - Optional query parameters for filtering
 * @returns {Promise} The API response
 */
export const getAllSessions = async (filters = {}) => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await axios.get(`${API_BASE_URL}/api/schedule${queryString}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

/**
 * Get a single session by ID
 * @param {string} sessionId - The session ID
 * @returns {Promise} The API response
 */
export const getSessionById = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/schedule/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Book an available session
 * @param {string} sessionId - The session ID to book
 * @returns {Promise} The API response
 */
export const bookSession = async (sessionId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/schedule/book`, { sessionId });
    return response.data;
  } catch (error) {
    console.error('Error booking session:', error);
    throw error;
  }
};

/**
 * Request a new session
 * @param {Object} requestData - Session request data
 * @param {string} requestData.start - Start date/time (ISO format)
 * @param {string} requestData.end - End date/time (ISO format)
 * @param {string} requestData.notes - Optional notes about the session
 * @returns {Promise} The API response
 */
export const requestSession = async (requestData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/schedule/request`, requestData);
      return response.data;
    } catch (error) {
      console.error('Error requesting session:', error);
      throw error;
    }
  };