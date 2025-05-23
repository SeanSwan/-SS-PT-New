// services/mock-client-progress.ts
import { ClientProgressData, ClientProgressResponse } from './client-progress-service';

/**
 * Creates mock client progress data for development and fallback purposes
 * @returns A mock client progress response
 */
export const getMockClientProgress = (): ClientProgressResponse => {
  const mockProgressData: ClientProgressData = {
    id: 'mock-progress-id',
    userId: 'mock-user-id',
    overallLevel: 27,
    experiencePoints: 65,
    
    // NASM protocol categories
    coreLevel: 35,
    balanceLevel: 22,
    stabilityLevel: 28,
    flexibilityLevel: 40,
    calisthenicsLevel: 30,
    isolationLevel: 18,
    stabilizersLevel: 25,
    injuryPreventionLevel: 15,
    injuryRecoveryLevel: 10,
    
    // Body part levels
    glutesLevel: 38,
    calfsLevel: 25,
    shouldersLevel: 30,
    hamstringsLevel: 35,
    absLevel: 42,
    chestLevel: 28,
    bicepsLevel: 22,
    tricepsLevel: 24,
    tibialisAnteriorLevel: 18,
    serratusAnteriorLevel: 15,
    latissimusDorsiLevel: 32,
    hipsLevel: 27,
    lowerBackLevel: 33,
    wristsForearmLevel: 20,
    neckLevel: 19,
    
    // Exercise levels
    squatsLevel: 45,
    lungesLevel: 32,
    planksLevel: 40,
    reversePlanksLevel: 28,
    
    // Experience points for each category (for progress bars)
    coreExperiencePoints: 70,
    balanceExperiencePoints: 45,
    stabilityExperiencePoints: 60,
    flexibilityExperiencePoints: 25,
    calisthenicsExperiencePoints: 60,
    isolationExperiencePoints: 30,
    stabilizersExperiencePoints: 50,
    injuryPreventionExperiencePoints: 80,
    injuryRecoveryExperiencePoints: 20,
    
    // Exercise-specific experience
    squatsExperiencePoints: 70,
    lungesExperiencePoints: 60,
    planksExperiencePoints: 80,
    reversePlanksExperiencePoints: 50,
    
    // Achievement tracking
    achievements: [
      'core-10',
      'balance-10',
      'flexibility-10',
      'calisthenics-10',
      'squats-10',
      'lunges-10',
      'planks-10'
    ],
    achievementDates: {
      'core-10': '2024-02-15',
      'balance-10': '2024-03-02',
      'flexibility-10': '2024-02-20',
      'calisthenics-10': '2024-03-10',
      'squats-10': '2024-02-10',
      'lunges-10': '2024-02-25',
      'planks-10': '2024-03-05'
    },
    
    // Additional metrics
    progressNotes: 'Making good progress on core strength and flexibility.',
    unlockedExercises: ['squats', 'lunges', 'planks', 'push-ups', 'crunches'],
    workoutsCompleted: 42,
    totalExercisesPerformed: 568,
    streakDays: 7,
    totalMinutes: 1240,
    
    // Timestamps
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-04-05T00:00:00.000Z'
  };
  
  return {
    success: true,
    message: 'Mock client progress data loaded successfully',
    progress: mockProgressData
  };
};

/**
 * Mock client progress service that can be used as a fallback
 * when the real service fails or for development purposes
 */
export const mockClientProgressService = {
  getClientProgress: async () => {
    return getMockClientProgress();
  },
  
  getClientProgressById: async (userId: string) => {
    const response = getMockClientProgress();
    response.progress.userId = userId;
    return response;
  },
  
  updateClientProgress: async (updates: Partial<ClientProgressData>) => {
    const response = getMockClientProgress();
    response.progress = { ...response.progress, ...updates };
    return response;
  },
  
  updateClientProgressById: async (userId: string, updates: Partial<ClientProgressData>) => {
    const response = getMockClientProgress();
    response.progress = { ...response.progress, userId, ...updates };
    return response;
  },
  
  getLeaderboard: async () => {
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
};
