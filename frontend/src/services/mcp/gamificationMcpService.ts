/**
 * GamificationMcpService
 * 
 * Service for interacting with the Gamification MCP server.
 * Handles gamification features like profile data, achievements, challenges, quests, and game board.
 * 
 * This service is used by both the client and admin dashboards to provide a unified gamification
 * experience. It tracks user progress, achievements, challenges, and gameplay elements like
 * the game board and dice rolling. The data from this service is synchronized with workout
 * progress data to create a comprehensive view of the client's fitness journey.
 * 
 * @module services/mcp/gamificationMcpService
 */

import {
  GamificationMcpApi,
  GamificationProfile,
  Achievement,
  Challenge,
  KindnessQuest,
  BoardPosition,
  ServerStatus,
  McpApiResponse,
  GetGamificationProfileParams,
  GetAchievementsParams,
  GetBoardPositionParams,
  RollDiceParams,
  GetChallengesParams,
  JoinChallengeParams,
  GetKindnessQuestsParams,
  CompleteKindnessQuestParams,
  SuccessResponse,
  CompleteQuestResponse,
  DiceRollResult
} from '../../types/mcp/gamification.types';

// Mock data for development
const mockData = {
  profile: {
    level: 12,
    points: 2500,
    streak: 5,
    kindnessScore: 78,
    challengesCompleted: 8,
    questsCompleted: 15,
    powerups: 3,
    boosts: 2
  },
  achievements: [
    {
      id: 'achievement1',
      name: 'Workout Warrior',
      description: 'Complete 10 workouts',
      progress: 80,
      icon: 'dumbbell',
      color: '#00ffff'
    },
    {
      id: 'achievement2',
      name: 'Kindness Champion',
      description: 'Complete 5 kindness quests',
      progress: 100,
      completed: true,
      icon: 'heart',
      color: '#FF6B6B'
    },
    {
      id: 'achievement3',
      name: 'Social Butterfly',
      description: 'Connect with 3 other users',
      progress: 67,
      icon: 'users',
      color: '#7851a9'
    },
    {
      id: 'achievement4',
      name: 'Consistency King',
      description: 'Maintain a 7-day workout streak',
      progress: 40,
      icon: 'calendar',
      color: '#4CAF50'
    }
  ],
  boardPosition: {
    position: 23,
    lastRoll: 5,
    canRoll: true,
    nextRollTime: null
  },
  challenges: [
    {
      id: 'challenge1',
      name: '30-Day Plank Challenge',
      description: 'Increase your plank time every day for 30 days',
      progress: 60,
      joined: true,
      participants: 128,
      endDate: '2025-05-30T00:00:00Z'
    },
    {
      id: 'challenge2',
      name: 'Nutrition Master',
      description: 'Log your meals for 14 consecutive days',
      progress: 0,
      joined: false,
      participants: 56,
      endDate: '2025-06-15T00:00:00Z'
    },
    {
      id: 'challenge3',
      name: 'Dance Marathon',
      description: 'Complete 10 dance workouts in one month',
      progress: 30,
      joined: true,
      participants: 72,
      endDate: '2025-05-25T00:00:00Z'
    }
  ],
  quests: [
    {
      id: 'quest1',
      name: 'Motivate a Friend',
      description: 'Send a motivational message to a friend',
      completed: false,
      points: 50
    },
    {
      id: 'quest2',
      name: 'Share Your Knowledge',
      description: 'Help a beginner with a workout technique',
      completed: true,
      points: 100
    },
    {
      id: 'quest3',
      name: 'Community Support',
      description: 'Participate in a community challenge',
      completed: false,
      points: 150
    }
  ]
};

// Helper to simulate API delay
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// MCP service for gamification features
const gamificationMcpApi: GamificationMcpApi = {
  /**
   * Check server status
   */
  checkServerStatus: async () => {
    await simulateDelay();
    
    return {
      data: {
        status: 'online',
        version: '1.0.0',
        uptime: '2 days, 5 hours',
        message: 'Gamification MCP Server is running'
      }
    };
  },
  /**
   * Get the user's gamification profile
   */
  getGamificationProfile: async ({ userId }: { userId: string }) => {
    await simulateDelay();
    
    return {
      data: {
        profile: { ...mockData.profile }
      }
    };
  },
  
  /**
   * Get the user's achievements
   */
  getAchievements: async ({ 
    userId, 
    includeCompleted = true,
    includeInProgress = true 
  }: { 
    userId: string, 
    includeCompleted?: boolean,
    includeInProgress?: boolean
  }) => {
    await simulateDelay();
    
    let achievements = [...mockData.achievements];
    
    if (!includeCompleted) {
      achievements = achievements.filter(a => !a.completed);
    }
    
    if (!includeInProgress) {
      achievements = achievements.filter(a => a.completed || a.progress === 0);
    }
    
    return {
      data: {
        achievements
      }
    };
  },
  
  /**
   * Get the user's board position
   */
  getBoardPosition: async ({ userId }: { userId: string }) => {
    await simulateDelay();
    
    return {
      data: {
        position: { ...mockData.boardPosition }
      }
    };
  },
  
  /**
   * Roll the dice on the game board
   */
  rollDice: async ({ 
    userId, 
    useBoost = false 
  }: { 
    userId: string, 
    useBoost?: boolean
  }) => {
    await simulateDelay(1000); // Longer delay for rolling animation
    
    // Generate a random dice roll (1-6)
    const roll = Math.floor(Math.random() * 6) + 1;
    
    // Apply boost if used (doubles the roll)
    const finalRoll = useBoost ? roll * 2 : roll;
    
    // Calculate new position
    const currentPosition = mockData.boardPosition.position;
    const newPosition = currentPosition + finalRoll;
    
    // Determine if rewards were earned
    const earnedRewards = newPosition % 5 === 0; // Every 5 spaces earns a reward
    const pointsEarned = earnedRewards ? 50 : 0;
    
    // Update mock data
    mockData.boardPosition.position = newPosition;
    mockData.boardPosition.lastRoll = finalRoll;
    mockData.boardPosition.canRoll = false;
    mockData.boardPosition.nextRollTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours from now
    
    if (earnedRewards) {
      mockData.profile.points += pointsEarned;
    }
    
    if (useBoost) {
      mockData.profile.boosts -= 1;
    }
    
    return {
      data: {
        result: {
          roll: finalRoll,
          newPosition,
          rewardsEarned: earnedRewards,
          pointsEarned,
          nextRollTime: mockData.boardPosition.nextRollTime
        }
      }
    };
  },
  
  /**
   * Get the user's challenges
   */
  getChallenges: async ({ 
    userId, 
    limit = 10 
  }: { 
    userId: string, 
    limit?: number
  }) => {
    await simulateDelay();
    
    return {
      data: {
        challenges: mockData.challenges.slice(0, limit)
      }
    };
  },
  
  /**
   * Join a challenge
   */
  joinChallenge: async ({ 
    userId, 
    challengeId 
  }: { 
    userId: string, 
    challengeId: string
  }) => {
    await simulateDelay();
    
    // Update the mock data
    const challengeIndex = mockData.challenges.findIndex(c => c.id === challengeId);
    
    if (challengeIndex !== -1) {
      mockData.challenges[challengeIndex].joined = true;
    }
    
    return {
      data: {
        success: true
      }
    };
  },
  
  /**
   * Get the user's kindness quests
   */
  getKindnessQuests: async ({ 
    userId, 
    limit = 10 
  }: { 
    userId: string, 
    limit?: number
  }) => {
    await simulateDelay();
    
    return {
      data: {
        quests: mockData.quests.slice(0, limit)
      }
    };
  },
  
  /**
   * Complete a kindness quest
   */
  completeKindnessQuest: async ({ 
    userId, 
    questId 
  }: { 
    userId: string, 
    questId: string
  }) => {
    await simulateDelay();
    
    // Find the quest
    const questIndex = mockData.quests.findIndex(q => q.id === questId);
    
    if (questIndex !== -1) {
      const quest = mockData.quests[questIndex];
      
      // Mark as completed
      mockData.quests[questIndex].completed = true;
      
      // Update user's profile
      mockData.profile.points += quest.points;
      mockData.profile.kindnessScore += Math.floor(quest.points / 10);
      mockData.profile.questsCompleted += 1;
      
      return {
        data: {
          success: true,
          pointsEarned: quest.points,
          kindnessPoints: Math.floor(quest.points / 10)
        }
      };
    }
    
    return {
      data: {
        success: false,
        error: 'Quest not found'
      }
    };
  }
};

// Export as both default and named export for backward compatibility
export { gamificationMcpApi };
export default gamificationMcpApi;