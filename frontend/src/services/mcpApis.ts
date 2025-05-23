/**
 * MCP API Services
 * This file contains mock implementations of the MCP APIs that can be used
 * as a fallback when the actual MCP servers are not available.
 */

// Mock Workout MCP API
export const workoutMcpApi = {
  checkServerStatus: async () => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => resolve({ status: 'ok' }), 500);
    });
  },
  
  getWorkoutRecommendations: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            workouts: [
              {
                id: '1',
                name: 'Lower Body Strength',
                type: 'Strength',
                duration: 45,
                exercises: [1, 2, 3, 4, 5, 6, 7, 8],
                level: 3
              },
              {
                id: '2',
                name: 'Core Stability',
                type: 'Core',
                duration: 30,
                exercises: [1, 2, 3, 4, 5, 6],
                level: 2
              },
              {
                id: '3',
                name: 'Upper Body Power',
                type: 'Strength',
                duration: 40,
                exercises: [1, 2, 3, 4, 5, 6, 7],
                level: 3
              },
              {
                id: '4',
                name: 'HIIT Cardio',
                type: 'Cardio',
                duration: 25,
                exercises: [1, 2, 3, 4, 5],
                level: 4
              }
            ]
          }
        });
      }, 600);
    });
  },
  
  getClientProgress: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            sessionsCompleted: 12,
            totalSessions: 20,
            daysActive: 24,
            weeklyProgress: 85
          }
        });
      }, 700);
    });
  },
  
  getWorkoutStatistics: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            totalWorkouts: 48,
            totalTime: 1440, // minutes
            averageIntensity: 7.5,
            exerciseBreakdown: [
              { name: 'Squats', count: 15 },
              { name: 'Deadlifts', count: 12 },
              { name: 'Push-ups', count: 18 }
            ],
            muscleGroupBreakdown: [
              { name: 'Legs', percentage: 35 },
              { name: 'Core', percentage: 25 },
              { name: 'Back', percentage: 20 },
              { name: 'Chest', percentage: 15 },
              { name: 'Arms', percentage: 5 }
            ]
          }
        });
      }, 800);
    });
  }
};

// Mock Gamification MCP API
export const gamificationMcpApi = {
  checkServerStatus: async () => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => resolve({ status: 'ok' }), 500);
    });
  },
  
  logActivity: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            success: true,
            pointsEarned: 50,
            newAchievements: []
          }
        });
      }, 600);
    });
  },
  
  getGamificationProfile: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            level: 22,
            progress: 65,
            points: 2250,
            streak: 24,
            attributes: {
              strength: { level: 24, progress: 70 },
              cardio: { level: 18, progress: 45 },
              flexibility: { level: 20, progress: 60 },
              balance: { level: 19, progress: 50 }
            }
          }
        });
      }, 700);
    });
  },
  
  getAchievements: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: [
            {
              id: '1',
              name: 'Strength Master',
              description: 'Complete 10 strength workouts',
              progress: 8,
              totalRequired: 10,
              tier: 'silver',
              completed: false,
              icon: 'dumbbell'
            },
            {
              id: '2',
              name: 'Consistency Champion',
              description: 'Work out 5 days in a row',
              progress: 5,
              totalRequired: 5,
              tier: 'gold',
              completed: true,
              icon: 'award'
            },
            {
              id: '3',
              name: 'Flexibility Guru',
              description: 'Reach level 10 in flexibility',
              progress: 6,
              totalRequired: 10,
              tier: 'bronze',
              completed: false,
              icon: 'activity'
            }
          ]
        });
      }, 800);
    });
  },
  
  getBoardPosition: async (params: any) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            position: 42,
            totalUsers: 156,
            percentile: 73
          }
        });
      }, 700);
    });
  }
};
