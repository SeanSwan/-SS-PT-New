/**
 * Client Progress Service
 * 
 * Service for managing client progress data through SwanStudios backend APIs.
 */

import apiService from '../api.service';

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
      const response = await apiService.get(`/api/client-progress/${userId}`);
      return {
        success: true,
        progress: response.data.progress
      };
    } catch (err) {
      console.error('Error fetching client progress:', err);
      return {
        success: false,
        error: 'Failed to fetch client progress data'
      };
    }
  },
  
  /**
   * Update client progress by user ID
   * Updates progress data in the backend API
    */
  updateClientProgressById: async (userId: string, progressData: Partial<ClientProgress>) => {
    try {
      const response = await apiService.put(`/api/client-progress/${userId}`, progressData);
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
   * Fetches leaderboard data from the backend API.
   */
  getLeaderboard: async () => {
    try {
      const response = await apiService.get('/api/client-progress/leaderboard');
      return {
        success: true,
        leaderboard: response.data.leaderboard
      };
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      return {
        success: false,
        error: 'Failed to fetch leaderboard data'
      };
    }
  },
  
  /**
   * Get achievements by user ID
   * Fetches achievements data from SwanStudios gamification APIs.
   */
  getAchievementsByUserId: async (userId: string) => {
    try {
      const response = await apiService.get(`/api/v1/gamification/users/${userId}/achievements`);
      const profile = response.data?.profile || response.data;
      
      return {
        success: true,
        achievements: profile?.userAchievements || profile?.achievements || []
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
   * Activity logging now routes through typed backend actions, not MCP side effects.
   */
  logClientActivity: async (userId: string, activityType: string, activityData: any) => {
    try {
      await apiService.post('/api/gamification/users/' + userId + '/points', {
        userId,
        points: activityData?.points || 1,
        source: activityType,
        sourceId: activityData?.sourceId,
        description: activityData?.description || `Client activity: ${activityType}`,
        metadata: activityData
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
