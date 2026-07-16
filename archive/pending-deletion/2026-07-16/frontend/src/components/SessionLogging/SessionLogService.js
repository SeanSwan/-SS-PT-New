/**
 * Session Logging Service
 * 
 * A comprehensive service for voice-activated session logging:
 * - Handles voice commands and transcriptions for real-time workout logging
 * - Integrates with the scheduling system and gamification layer
 * - Processes exercise details, reps, sets, weights, rest times, etc.
 * - Supports trainer workflows during live training sessions
 */

import axios from 'axios';
import gamificationService from '../../services/gamification/gamification-service';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Remove trailing slash if present for consistent concatenation
const FORMATTED_API_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

// Create axios instance with enhanced config
const api = axios.create({
  baseURL: FORMATTED_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
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

// Exercise pattern matching constants for voice recognition
const EXERCISE_PATTERNS = {
  EXERCISE: /(?:exercise|movement|exercise is|did|doing|do|performing)\s+([a-zA-Z\s'-]+)/i,
  REPS: /(?:reps|repetitions)\s+(\d+)/i,
  SETS: /(?:sets|set)\s+(\d+)/i,
  WEIGHT: /(?:pounds|kilos|kilograms|kg|lbs|weight)\s+(\d+)/i,
  DURATION: /(?:seconds|minutes|duration)\s+(\d+)/i,
  REST: /(?:rest|break|pause)\s+(\d+)\s+(?:seconds|minutes)/i,
  WATER: /(?:water|hydration|drink|drank|drinking)\s+(\d+)\s+(?:ounces|oz|cups|glasses|milliliters|ml)/i,
  STRETCH: /(?:stretch|stretched|stretching)\s+([a-zA-Z\s'-]+)/i,
  CARDIO: /(?:cardio|cardio for|heart rate|pace|speed)\s+(\d+)\s+(?:minutes|seconds|bpm)/i,
  NOTE: /(?:note|observation|comment|observe)\s+(.+)/i
};

/**
 * Session Logging Service providing real-time workout tracking
 */
const sessionLogService = {
  /**
   * Log a workout session detail via text input
   * @param {string} sessionId - The session ID
   * @param {string} textInput - The text to process
   * @returns {Promise<Object>} Log result
   */
  logSessionDetail: async (sessionId, textInput) => {
    try {
      if (!sessionId || !textInput) {
        throw new Error('Missing required parameters');
      }

      const parsedDetails = sessionLogService.parseWorkoutText(textInput);
      if (Object.keys(parsedDetails).length === 0) {
        return { 
          success: false, 
          message: 'Could not parse any workout details from text' 
        };
      }

      const response = await api.post(`/api/sessions/${sessionId}/log`, parsedDetails);
      
      // Trigger gamification rewards for detailed logging
      try {
        // Award points for comprehensive logging
        if (parsedDetails.exercise && (parsedDetails.reps || parsedDetails.duration)) {
          await gamificationService.awardPoints('SESSION_DETAIL_LOGGED', sessionId, parsedDetails);
        }
      } catch (error) {
        console.error('Error with gamification award for session logging:', error);
        // Continue even if gamification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error logging session detail:', error);
      throw error;
    }
  },

  /**
   * Log a workout session detail via voice input
   * @param {string} sessionId - The session ID
   * @param {Blob} audioBlob - The voice recording to process
   * @returns {Promise<Object>} Log result
   */
  logSessionDetailVoice: async (sessionId, audioBlob) => {
    try {
      if (!sessionId || !audioBlob) {
        throw new Error('Missing required parameters');
      }

      // Create a FormData instance to send the audio file
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audioFile', audioBlob, 'voice_input.webm');

      // Use different headers for FormData
      const response = await axios.post(
        `${FORMATTED_API_URL}/api/sessions/${sessionId}/voice-log`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Trigger gamification rewards for voice logging
      try {
        if (response.data.parsedDetails && response.data.parsedDetails.exercise) {
          await gamificationService.awardPoints('SESSION_VOICE_LOGGED', sessionId, response.data.parsedDetails);
        }
      } catch (error) {
        console.error('Error with gamification award for voice logging:', error);
        // Continue even if gamification fails
      }
      
      return response.data;
    } catch (error) {
      console.error('Error logging session detail via voice:', error);
      throw error;
    }
  },

  /**
   * Get all logged details for a specific session
   * @param {string} sessionId - The session ID
   * @returns {Promise<Array>} Array of logged details
   */
  getSessionLogs: async (sessionId) => {
    try {
      const response = await api.get(`/api/sessions/${sessionId}/logs`);
      return response.data.logs || [];
    } catch (error) {
      console.error('Error fetching session logs:', error);
      throw error;
    }
  },

  /**
   * Parse workout text into structured data
   * @param {string} text - The text to parse
   * @returns {Object} Structured workout data
   */
  parseWorkoutText: (text) => {
    const result = {};
    
    // Try to extract exercise
    const exerciseMatch = text.match(EXERCISE_PATTERNS.EXERCISE);
    if (exerciseMatch && exerciseMatch[1]) {
      result.exercise = exerciseMatch[1].trim();
    }
    
    // Try to extract reps
    const repsMatch = text.match(EXERCISE_PATTERNS.REPS);
    if (repsMatch && repsMatch[1]) {
      result.reps = parseInt(repsMatch[1], 10);
    }
    
    // Try to extract sets
    const setsMatch = text.match(EXERCISE_PATTERNS.SETS);
    if (setsMatch && setsMatch[1]) {
      result.sets = parseInt(setsMatch[1], 10);
    }
    
    // Try to extract weight
    const weightMatch = text.match(EXERCISE_PATTERNS.WEIGHT);
    if (weightMatch && weightMatch[1]) {
      result.weight = parseInt(weightMatch[1], 10);
      
      // Try to determine weight unit
      if (text.includes('kg') || text.includes('kilos') || text.includes('kilograms')) {
        result.weightUnit = 'kg';
      } else {
        result.weightUnit = 'lbs'; // Default to pounds
      }
    }
    
    // Try to extract duration
    const durationMatch = text.match(EXERCISE_PATTERNS.DURATION);
    if (durationMatch && durationMatch[1]) {
      result.duration = parseInt(durationMatch[1], 10);
      
      // Try to determine duration unit
      if (text.includes('seconds') || text.includes('secs')) {
        result.durationUnit = 'seconds';
      } else {
        result.durationUnit = 'minutes'; // Default to minutes
      }
    }
    
    // Try to extract rest time
    const restMatch = text.match(EXERCISE_PATTERNS.REST);
    if (restMatch && restMatch[1]) {
      result.rest = parseInt(restMatch[1], 10);
      
      // Try to determine rest unit
      if (text.includes('seconds') || text.includes('secs')) {
        result.restUnit = 'seconds';
      } else {
        result.restUnit = 'minutes'; // Default to minutes
      }
    }
    
    // Try to extract water intake
    const waterMatch = text.match(EXERCISE_PATTERNS.WATER);
    if (waterMatch && waterMatch[1]) {
      result.water = parseInt(waterMatch[1], 10);
      
      // Try to determine water unit
      if (text.includes('ounces') || text.includes('oz')) {
        result.waterUnit = 'oz';
      } else if (text.includes('milliliters') || text.includes('ml')) {
        result.waterUnit = 'ml';
      } else {
        result.waterUnit = 'oz'; // Default to ounces
      }
    }
    
    // Try to extract stretch
    const stretchMatch = text.match(EXERCISE_PATTERNS.STRETCH);
    if (stretchMatch && stretchMatch[1]) {
      result.stretch = stretchMatch[1].trim();
    }
    
    // Try to extract cardio
    const cardioMatch = text.match(EXERCISE_PATTERNS.CARDIO);
    if (cardioMatch && cardioMatch[1]) {
      result.cardio = parseInt(cardioMatch[1], 10);
      
      // Try to determine cardio unit
      if (text.includes('bpm')) {
        result.cardioUnit = 'bpm';
      } else if (text.includes('seconds') || text.includes('secs')) {
        result.cardioUnit = 'seconds';
      } else {
        result.cardioUnit = 'minutes'; // Default to minutes
      }
    }
    
    // Try to extract notes
    const noteMatch = text.match(EXERCISE_PATTERNS.NOTE);
    if (noteMatch && noteMatch[1]) {
      result.notes = noteMatch[1].trim();
    }
    
    return result;
  },

  /**
   * Generate a session summary based on logged details
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} Session summary
   */
  generateSessionSummary: async (sessionId) => {
    try {
      const response = await api.get(`/api/sessions/${sessionId}/summary`);
      return response.data;
    } catch (error) {
      console.error('Error generating session summary:', error);
      throw error;
    }
  },

  /**
   * Get available exercise templates for quick logging
   * @returns {Promise<Array>} Array of exercise templates
   */
  getExerciseTemplates: async () => {
    try {
      const response = await api.get('/api/exercises/templates');
      return response.data.templates || [];
    } catch (error) {
      console.error('Error fetching exercise templates:', error);
      throw error;
    }
  }
};

export default sessionLogService;
