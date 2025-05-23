/**
 * Client Progress Service
 * 
 * Service for managing client progress data, integrating with both the backend API
 * and the workout/gamification MCP servers to provide a unified API for progress tracking.
 */

import { authAxios } from '../../utils/axios-config';
import workoutMcpApi from '../mcp/workoutMcpService';
import gamificationMcpApi from '../mcp/gamificationMcpService';

// Type definitions
export interface ClientProgress {
  id?: string;
  userId: string;
  overallLevel?: number;
  experiencePoints?: number;
  
  // NASM Protocol Levels
  coreLevel?: number;
  balanceLevel?: number;
  stabilityLevel?: number;
  flexibilityLevel?: number;
  calisthenicsLevel?: number;
  isolationLevel?: number;
  stabilizersLevel?: number;
  injuryPreventionLevel?: number;
  injuryRecoveryLevel?: number;
  
  // Body Part Levels
  glutesLevel?: number;
  calfsLevel?: number;
  shouldersLevel?: number;
  hamstringsLevel?: number;
  absLevel?: number;
  chestLevel?: number;
  bicepsLevel?: number;
  tricepsLevel?: number;
  tibialisAnteriorLevel?: number;
  serratusAnteriorLevel?: number;
  latissimusDorsiLevel?: number;
  hipsLevel?: number;
  lowerBackLevel?: number;
  wristsForearmLevel?: number;
  neckLevel?: number;
  
  // Exercise Levels
  squatsLevel?: number;
  lungesLevel?: number;
  planksLevel?: number;
  reversePlanksLevel?: number;
  
  // Achievements
  achievements?: string[];
  achievementDates?: Record<string, string>;
  
  // Additional fields
  progressNotes?: string;
  unlockedExercises?: string[];
  workoutsCompleted?: number;
  totalExercisesPerformed?: number;
  streakDays?: number;
  totalMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  overallLevel: number;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

// Service functions
export const clientProgressService = {
  /**
   * Get client progress by user ID
   * Fetches progress data from the backend API
   */
  getClientProgressById: async (userId: string) => {
    try {
      // First try to get from backend API
      const response = await authAxios.get(`/api/client-progress/${userId}`);
      return {
        success: true,
        progress: response.data.progress
      };
    } catch (err) {
      console.error('Error fetching client progress from API:', err);
      
      try {
        // Fallback to MCP server if backend API fails
        const mcpResponse = await workoutMcpApi.getClientProgress({ userId });
        
        if (mcpResponse.data?.progress) {
          return {
            success: true,
            progress: mcpResponse.data.progress
          };
        }
        
        throw new Error('Failed to fetch client progress from both API and MCP');
      } catch (mcpErr) {
        console.error('Error fetching client progress from MCP:', mcpErr);
        return {
          success: false,
          error: 'Failed to fetch client progress data'
        };
      }
    }
  },
  
  /**
   * Update client progress by user ID
   * Updates progress data in the backend API
   */
  updateClientProgressById: async (userId: string, progressData: Partial<ClientProgress>) => {
    try {
      const response = await authAxios.put(`/api/client-progress/${userId}`, progressData);
      return {
        success: true,
        progress: response.data.progress
      };
    } catch (err) {
      console.error('Error updating client progress:', err);
      return {
        success: false,
        error: 'Failed to update client progress data'
      };
    }
  },
  
  /**
   * Get leaderboard data
   * Fetches leaderboard data from the backend API or MCP server
   */
  getLeaderboard: async () => {
    try {
      // First try to get from backend API
      const response = await authAxios.get('/api/client-progress/leaderboard');
      return {
        success: true,
        leaderboard: response.data.leaderboard
      };
    } catch (err) {
      console.error('Error fetching leaderboard from API:', err);
      
      // For now, return mock data as fallback
      // In a real implementation, this could try to fetch from MCP server
      return {
        success: false,
        error: 'Failed to fetch leaderboard data'
      };
    }
  },
  
  /**
   * Get achievements by user ID
   * Fetches achievements data from the gamification MCP server
   */
  getAchievementsByUserId: async (userId: string) => {
    try {
      const response = await gamificationMcpApi.getAchievements({ 
        userId,
        includeCompleted: true
      });
      
      return {
        success: true,
        achievements: response.data?.achievements || []
      };
    } catch (err) {
      console.error('Error fetching achievements:', err);
      return {
        success: false,
        error: 'Failed to fetch achievement data'
      };
    }
  },
  
  /**
   * Log client activity
   * Logs activity to both backend API and gamification MCP server
   */
  logClientActivity: async (userId: string, activityType: string, activityData: any) => {
    try {
      // Log to backend API
      await authAxios.post('/api/client-progress/activity', {
        userId,
        activityType,
        activityData
      });
      
      // Log to gamification MCP server
      await gamificationMcpApi.logActivity({
        userId,
        activityType,
        activityData
      });
      
      return {
        success: true
      };
    } catch (err) {
      console.error('Error logging client activity:', err);
      return {
        success: false,
        error: 'Failed to log client activity'
      };
    }
  }
};

export default clientProgressService;