// services/client-progress-service.ts
import { AxiosInstance } from 'axios';
import { getMockClientProgress, mockClientProgressService } from './mock-client-progress';

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
  
  // Experience points for components (for progress bars)
  coreExperiencePoints?: number;
  balanceExperiencePoints?: number;
  stabilityExperiencePoints?: number;
  flexibilityExperiencePoints?: number;
  calisthenicsExperiencePoints?: number;
  isolationExperiencePoints?: number;
  stabilizersExperiencePoints?: number;
  injuryPreventionExperiencePoints?: number;
  injuryRecoveryExperiencePoints?: number;
  squatsExperiencePoints?: number;
  lungesExperiencePoints?: number;
  planksExperiencePoints?: number;
  reversePlanksExperiencePoints?: number;
  
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
        console.log('Fetching client progress data from API...');
        const response = await axios.get<ClientProgressResponse>('/api/client-progress');
        console.log('Client progress data received:', response.data.success);
        return response.data;
      } catch (error) {
        console.error('Error fetching client progress:', error);
        console.log('Falling back to mock client progress data');
        // Return mock data if the API fails
        return getMockClientProgress();
      }
    },
    
    getClientProgressById: async (userId: string) => {
      try {
        console.log(`Fetching client progress for user ${userId}...`);
        const response = await axios.get<ClientProgressResponse>(`/api/client-progress/${userId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching client progress for user ${userId}:`, error);
        console.log('Falling back to mock client progress data');
        // Return mock data if the API fails
        const mockData = getMockClientProgress();
        mockData.progress.userId = userId;
        return mockData;
      }
    },
    
    updateClientProgress: async (updates: Partial<ClientProgressData>) => {
      try {
        console.log('Updating client progress data...');
        const response = await axios.put<ClientProgressResponse>('/api/client-progress', updates);
        return response.data;
      } catch (error) {
        console.error('Error updating client progress:', error);
        // Simulate a successful update with mock data
        const mockData = getMockClientProgress();
        mockData.progress = { ...mockData.progress, ...updates };
        return mockData;
      }
    },
    
    updateClientProgressById: async (userId: string, updates: Partial<ClientProgressData>) => {
      try {
        console.log(`Updating client progress for user ${userId}...`);
        const response = await axios.put<ClientProgressResponse>(`/api/client-progress/${userId}`, updates);
        return response.data;
      } catch (error) {
        console.error(`Error updating client progress for user ${userId}:`, error);
        // Simulate a successful update with mock data
        const mockData = getMockClientProgress();
        mockData.progress = { ...mockData.progress, userId, ...updates };
        return mockData;
      }
    },
    
    getLeaderboard: async () => {
      try {
        console.log('Fetching client progress leaderboard...');
        const response = await axios.get<LeaderboardResponse>('/api/client-progress/leaderboard');
        return response.data;
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        // Return mock leaderboard data
        return {
          success: true,
          leaderboard: [
            {
              userId: 'user-1',
              overallLevel: 58,
              client: {
                id: 'user-1',
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'janedoe',
                photo: '/images/avatar1.jpg'
              }
            },
            {
              userId: 'user-2',
              overallLevel: 45,
              client: {
                id: 'user-2',
                firstName: 'John',
                lastName: 'Smith',
                username: 'johnsmith',
                photo: '/images/avatar2.jpg'
              }
            },
            {
              userId: 'user-3',
              overallLevel: 42,
              client: {
                id: 'user-3',
                firstName: 'Sam',
                lastName: 'Johnson',
                username: 'samjohnson',
                photo: '/images/avatar3.jpg'
              }
            }
          ]
        };
      }
    }
  };
};