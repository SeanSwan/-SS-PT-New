/**
 * Gamification MCP Service
 * 
 * Service for interacting with the Gamification MCP server that implements
 * the "Wholesome Warrior's Path" gamification system for the SwanStudios 
 * fitness application.
 */

import axios from 'axios';
import { handleMcpError, notifyMcpError } from './utils/mcp-error-handler';

// Import configuration
import { MCP_CONFIG } from '../../config/env-config';

// Get base URL from configuration
const GAMIFICATION_MCP_URL = MCP_CONFIG.GAMIFICATION_MCP_URL;

// Auth token from environment or local storage
const getAuthToken = () => {
  return localStorage.getItem(MCP_CONFIG.AUTH_TOKEN_KEY) || process.env.REACT_APP_API_TOKEN || '';
};

// Create axios instance with default config
const mcpAxios = axios.create({
  baseURL: GAMIFICATION_MCP_URL,
  timeout: MCP_CONFIG.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
mcpAxios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Wrap API calls with error handling
const handleRequest = async (requestFn: () => Promise<any>) => {
  try {
    return await requestFn();
  } catch (error) {
    const formattedError = handleMcpError(error, 'Gamification');
    notifyMcpError(formattedError);
    throw formattedError;
  }
};

// Type definitions for gamification MCP
export interface LogActivityParams {
  userId: string;
  activityType: string;
  activityData: any;
}

export interface GamificationProfileParams {
  userId: string;
}

export interface AchievementsParams {
  userId: string;
  category?: string;
  includeCompleted?: boolean;
  includeInProgress?: boolean;
}

export interface BoardPositionParams {
  userId: string;
}

export interface RollDiceParams {
  userId: string;
  useBoost?: boolean;
}

export interface ChallengesParams {
  userId: string;
  category?: string;
  status?: string;
  limit?: number;
}

export interface JoinChallengeParams {
  userId: string;
  challengeId: string;
}

export interface KindnessQuestsParams {
  userId: string;
  status?: string;
  limit?: number;
}

// API service for gamification MCP
export const gamificationMcpApi = {
  /**
   * Track user activities and calculate rewards
   */
  logActivity: (params: LogActivityParams) =>
    handleRequest(() => mcpAxios.post(`/tools/LogActivity`, params)),
  
  /**
   * Retrieve a user's gamification profile
   */
  getGamificationProfile: (params: GamificationProfileParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetGamificationProfile`, params)),
  
  /**
   * Get available achievements
   */
  getAchievements: (params: AchievementsParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetAchievements`, params)),
  
  /**
   * Get a user's position on the game board
   */
  getBoardPosition: (params: BoardPositionParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetBoardPosition`, params)),
  
  /**
   * Move on the game board
   */
  rollDice: (params: RollDiceParams) =>
    handleRequest(() => mcpAxios.post(`/tools/RollDice`, params)),
  
  /**
   * Get available challenges
   */
  getChallenges: (params: ChallengesParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetChallenges`, params)),
  
  /**
   * Participate in a challenge
   */
  joinChallenge: (params: JoinChallengeParams) =>
    handleRequest(() => mcpAxios.post(`/tools/JoinChallenge`, params)),
  
  /**
   * Get available kindness quests
   */
  getKindnessQuests: (params: KindnessQuestsParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetKindnessQuests`, params)),
  
  /**
   * Process nutrition data from food intake
   * This will receive food intake data from the workout MCP server
   * and calculate gamification rewards based on nutrition choices
   */
  processFoodIntake: (params: any) =>
    handleRequest(() => mcpAxios.post(`/tools/ProcessFoodIntake`, params)),
    
  /**
   * Check if the MCP server is running
   */
  checkServerStatus: () =>
    handleRequest(() => mcpAxios.get(`/`)),
};

export default gamificationMcpApi;