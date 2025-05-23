/**
 * Gamification Service
 * 
 * A comprehensive service for the gamification system:
 * - Handles user points, streaks, achievements, and levels
 * - Integrates with the scheduling system for session-based rewards
 * - Provides notifications for gamification events
 * - Supports the "Addictive Gamification Strategy" outlined in the project
 */

import axios from 'axios';

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

// Define point values for different actions
const POINT_VALUES = {
  SESSION_BOOKED: 25,
  SESSION_ATTENDED: 100,
  SESSION_COMPLETED: 150,
  STREAK_DAY: 20,
  PROFILE_COMPLETE: 50,
  FIRST_SESSION: 200,
  WEEKLY_GOAL_MET: 300,
  MONTHLY_GOAL_MET: 1000,
};

/**
 * Gamification Service providing access to all gamification features
 */
const gamificationService = {
  /**
   * Get the user's current gamification status
   * @returns {Promise<Object>} User's gamification data
   */
  getUserGamificationData: async () => {
    try {
      const response = await api.get('/api/gamification/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      throw error;
    }
  },

  /**
   * Award points to the user for an action
   * @param {string} actionType - The type of action
   * @param {string} entityId - ID of the entity associated with the action (e.g., sessionId)
   * @param {Object} metadata - Additional data about the action
   * @returns {Promise<Object>} Award result
   */
  awardPoints: async (actionType, entityId, metadata = {}) => {
    try {
      const response = await api.post('/api/gamification/points', {
        actionType,
        entityId,
        metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error awarding points:', error);
      // Don't throw to prevent blocking main flow
      return { success: false, error: error.message };
    }
  },

  /**
   * Record a session-related action and award appropriate points
   * @param {string} sessionId - ID of the session
   * @param {string} action - Action type (booked, attended, completed)
   * @returns {Promise<Object>} Award result with any earned achievements
   */
  recordSessionAction: async (sessionId, action) => {
    try {
      let actionType;
      switch (action) {
        case 'booked':
          actionType = 'SESSION_BOOKED';
          break;
        case 'attended':
          actionType = 'SESSION_ATTENDED';
          break;
        case 'completed':
          actionType = 'SESSION_COMPLETED';
          break;
        default:
          throw new Error(`Invalid session action: ${action}`);
      }

      const response = await api.post('/api/gamification/sessions/action', {
        sessionId,
        actionType
      });
      
      return response.data;
    } catch (error) {
      console.error('Error recording session action:', error);
      // Don't throw to prevent blocking main flow
      return { success: false, error: error.message };
    }
  },

  /**
   * Get user's current streak information
   * @returns {Promise<Object>} Streak data
   */
  getStreakInfo: async () => {
    try {
      const response = await api.get('/api/gamification/streaks');
      return response.data;
    } catch (error) {
      console.error('Error fetching streak info:', error);
      throw error;
    }
  },

  /**
   * Get user's achievements
   * @returns {Promise<Array>} List of achievements
   */
  getAchievements: async () => {
    try {
      const response = await api.get('/api/gamification/achievements');
      return response.data.achievements || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  },

  /**
   * Get user's current level and progress
   * @returns {Promise<Object>} Level data
   */
  getLevelInfo: async () => {
    try {
      const response = await api.get('/api/gamification/level');
      return response.data;
    } catch (error) {
      console.error('Error fetching level info:', error);
      throw error;
    }
  },

  /**
   * Get leaderboard data
   * @param {string} type - Leaderboard type (global, friends, local)
   * @param {string} timeframe - Time period (weekly, monthly, allTime)
   * @returns {Promise<Array>} Leaderboard entries
   */
  getLeaderboard: async (type = 'global', timeframe = 'weekly') => {
    try {
      const response = await api.get(`/api/gamification/leaderboard?type=${type}&timeframe=${timeframe}`);
      return response.data.leaderboard || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get available challenges for the user
   * @returns {Promise<Array>} List of challenges
   */
  getChallenges: async () => {
    try {
      const response = await api.get('/api/gamification/challenges');
      return response.data.challenges || [];
    } catch (error) {
      console.error('Error fetching challenges:', error);
      throw error;
    }
  },

  /**
   * Join a challenge
   * @param {string} challengeId - ID of the challenge to join
   * @returns {Promise<Object>} Join result
   */
  joinChallenge: async (challengeId) => {
    try {
      const response = await api.post(`/api/gamification/challenges/${challengeId}/join`);
      return response.data;
    } catch (error) {
      console.error('Error joining challenge:', error);
      throw error;
    }
  },

  /**
   * Track progress for a challenge
   * @param {string} challengeId - ID of the challenge
   * @param {number} progress - Current progress value
   * @returns {Promise<Object>} Updated challenge progress
   */
  updateChallengeProgress: async (challengeId, progress) => {
    try {
      const response = await api.patch(`/api/gamification/challenges/${challengeId}/progress`, {
        progress
      });
      return response.data;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      throw error;
    }
  },
  
  /**
   * Get point values for different actions
   * @returns {Object} Point values
   */
  getPointValues: () => {
    return { ...POINT_VALUES };
  }
};

export default gamificationService;
