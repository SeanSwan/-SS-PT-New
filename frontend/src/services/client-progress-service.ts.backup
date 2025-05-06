// services/client-progress-service.ts
import { AxiosInstance } from 'axios';

export interface ClientProgressData {
  id: string;
  userId: string;
  overallLevel: number;
  experiencePoints: number;
  
  // NASM protocol categories
  coreLevel: number;
  balanceLevel: number;
  stabilityLevel: number;
  flexibilityLevel: number;
  calisthenicsLevel: number;
  isolationLevel: number;
  stabilizersLevel: number;
  injuryPreventionLevel: number;
  injuryRecoveryLevel: number;
  
  // Body part levels
  glutesLevel: number;
  calfsLevel: number;
  shouldersLevel: number;
  hamstringsLevel: number;
  absLevel: number;
  chestLevel: number;
  bicepsLevel: number;
  tricepsLevel: number;
  tibialisAnteriorLevel: number;
  serratusAnteriorLevel: number;
  latissimusDorsiLevel: number;
  hipsLevel: number;
  lowerBackLevel: number;
  wristsForearmLevel: number;
  neckLevel: number;
  
  // Exercise levels
  squatsLevel: number;
  lungesLevel: number;
  planksLevel: number;
  reversePlanksLevel: number;
  
  // Achievement tracking
  achievements: string[];
  achievementDates: { [key: string]: string };
  
  // Additional metrics
  progressNotes?: string;
  unlockedExercises: string[];
  workoutsCompleted: number;
  totalExercisesPerformed: number;
  streakDays: number;
  totalMinutes: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfileData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
}

export interface LeaderboardEntry {
  overallLevel: number;
  userId: string;
  client: ClientProfileData;
}

export interface ClientProgressResponse {
  success: boolean;
  message?: string;
  progress: ClientProgressData;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
}

export interface ClientProgressServiceInterface {
  getClientProgress: () => Promise<ClientProgressResponse>;
  getClientProgressById: (userId: string) => Promise<ClientProgressResponse>;
  updateClientProgress: (updates: Partial<ClientProgressData>) => Promise<ClientProgressResponse>;
  updateClientProgressById: (userId: string, updates: Partial<ClientProgressData>) => Promise<ClientProgressResponse>;
  getLeaderboard: () => Promise<LeaderboardResponse>;
}

export const createClientProgressService = (axios: AxiosInstance): ClientProgressServiceInterface => {
  return {
    getClientProgress: async () => {
      try {
        const response = await axios.get<ClientProgressResponse>('/api/client-progress');
        return response.data;
      } catch (error) {
        console.error('Error fetching client progress:', error);
        throw error;
      }
    },
    
    getClientProgressById: async (userId: string) => {
      try {
        const response = await axios.get<ClientProgressResponse>(`/api/client-progress/${userId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching client progress for user ${userId}:`, error);
        throw error;
      }
    },
    
    updateClientProgress: async (updates: Partial<ClientProgressData>) => {
      try {
        const response = await axios.put<ClientProgressResponse>('/api/client-progress', updates);
        return response.data;
      } catch (error) {
        console.error('Error updating client progress:', error);
        throw error;
      }
    },
    
    updateClientProgressById: async (userId: string, updates: Partial<ClientProgressData>) => {
      try {
        const response = await axios.put<ClientProgressResponse>(`/api/client-progress/${userId}`, updates);
        return response.data;
      } catch (error) {
        console.error(`Error updating client progress for user ${userId}:`, error);
        throw error;
      }
    },
    
    getLeaderboard: async () => {
      try {
        const response = await axios.get<LeaderboardResponse>('/api/client-progress/leaderboard');
        return response.data;
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }
    }
  };
};
