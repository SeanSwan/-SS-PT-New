/**
 * 🎮 GAMIFICATION MOCK DATA & TEMPLATES
 * =====================================
 * Initial test data, challenge templates, and sample content
 * for SwanStudios gamification system development and testing
 */

import type { 
  Challenge, 
  ChallengeTemplate,
  CreateChallengeRequest 
} from '../types/challenge.types';
import type { 
  Achievement,
  UserAchievementProgress 
} from '../types/achievement.types';
import type { 
  GamificationUser,
  Leaderboard,
  LeaderboardEntry,
  UserStatistics 
} from '../types/gamification.types';

// ================================================================
// CHALLENGE TEMPLATES FOR ADMIN
// ================================================================

export const challengeTemplates: ChallengeTemplate[] = [
  {
    id: 'template-weekly-cardio',
    name: '7-Day Cardio Challenge',
    description: 'Weekly cardio challenge focused on cardiovascular endurance',
    category: 'cardio',
    difficulty: 'intermediate',
    usageCount: 15,
    createdAt: '2024-01-01T00:00:00Z',
    templateData: {
      title: '7-Day Cardio Blast',
      shortDescription: 'Boost your cardiovascular fitness with this weekly challenge',
      description: 'Join this exciting 7-day cardio challenge designed to improve your cardiovascular endurance and burn calories. Perfect for intermediate fitness enthusiasts looking to push their limits.',
      type: 'weekly',
      difficulty: 'intermediate',
      category: 'cardio',
      targets: [{
        metric: 'workout_count',
        value: 5,
        unit: 'workouts',
        operator: 'greater_than'
      }],
      duration: {
        durationDays: 7,
        isRecurring: false
      },
      rewards: {
        xpPoints: 200,
        badgeName: 'Cardio Warrior',
        celebrationMessage: 'Amazing work! You\'ve completed the cardio challenge!'
      },
      isPublic: true,
      tags: ['cardio', 'weekly', 'endurance', 'fitness']
    }
  },
  {
    id: 'template-30day-strength',
    name: '30-Day Strength Builder',
    description: 'Monthly strength training progression challenge',
    category: 'strength',
    difficulty: 'advanced',
    usageCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    templateData: {
      title: '30-Day Strength Revolution',
      shortDescription: 'Build serious muscle with this comprehensive 30-day program',
      description: 'Transform your strength with this intensive 30-day challenge. Features progressive overload, compound movements, and expert-designed workouts to maximize muscle growth and power.',
      type: 'monthly',
      difficulty: 'advanced',
      category: 'strength',
      targets: [{
        metric: 'weight_lifted_kg',
        value: 5000,
        unit: 'kilograms',
        operator: 'greater_than'
      }],
      duration: {
        durationDays: 30,
        isRecurring: false
      },
      rewards: {
        xpPoints: 500,
        badgeName: 'Strength Titan',
        celebrationMessage: 'Incredible! You\'ve become a true strength champion!'
      },
      maxParticipants: 50,
      isPublic: true,
      tags: ['strength', 'monthly', 'muscle', 'advanced']
    }
  },
  {
    id: 'template-mindful-week',
    name: 'Mindful Movement Week',
    description: 'Focus on mindful exercises and meditation',
    category: 'mindfulness',
    difficulty: 'beginner',
    usageCount: 22,
    createdAt: '2024-01-01T00:00:00Z',
    templateData: {
      title: 'Mindful Movement & Meditation',
      shortDescription: 'Discover the power of mindful movement and inner peace',
      description: 'A gentle introduction to mindful movement combining yoga, meditation, and breathing exercises. Perfect for beginners seeking balance and stress relief.',
      type: 'weekly',
      difficulty: 'beginner',
      category: 'mindfulness',
      targets: [{
        metric: 'sessions_logged',
        value: 7,
        unit: 'sessions',
        operator: 'greater_than'
      }],
      duration: {
        durationDays: 7,
        isRecurring: false
      },
      rewards: {
        xpPoints: 150,
        badgeName: 'Zen Master',
        celebrationMessage: 'Namaste! You\'ve found your inner balance.'
      },
      isPublic: true,
      tags: ['mindfulness', 'yoga', 'meditation', 'beginner', 'wellness']
    }
  },
  {
    id: 'template-steps-challenge',
    name: '10K Steps Daily',
    description: 'Daily step challenge for active lifestyle',
    category: 'cardio',
    difficulty: 'beginner',
    usageCount: 45,
    createdAt: '2024-01-01T00:00:00Z',
    templateData: {
      title: '10,000 Steps Challenge',
      shortDescription: 'Walk your way to better health with 10K steps daily',
      description: 'Simple yet effective daily challenge to reach 10,000 steps. Great for building healthy habits and improving cardiovascular health through walking.',
      type: 'daily',
      difficulty: 'beginner',
      category: 'cardio',
      targets: [{
        metric: 'steps',
        value: 10000,
        unit: 'steps',
        operator: 'greater_than'
      }],
      duration: {
        durationDays: 1,
        isRecurring: true,
        recurringPattern: 'daily'
      },
      rewards: {
        xpPoints: 50,
        badgeName: 'Step Counter',
        celebrationMessage: 'Great job! You\'ve hit your daily step goal!'
      },
      isPublic: true,
      tags: ['steps', 'walking', 'daily', 'cardio', 'easy']
    }
  }
];

// ================================================================
// SAMPLE CHALLENGES FOR TESTING
// ================================================================

export const sampleChallenges: Challenge[] = [
  {
    id: 'challenge-001',
    title: 'Summer Shred Challenge',
    description: 'Get ready for summer with this intensive 21-day fitness challenge combining cardio, strength training, and nutrition guidance.',
    shortDescription: 'Transform your body in 21 days with our comprehensive summer fitness program',
    type: 'special',
    difficulty: 'advanced',
    category: 'hybrid',
    status: 'active',
    
    targets: [{
      metric: 'workout_count',
      value: 15,
      unit: 'workouts',
      operator: 'greater_than',
      description: 'Complete at least 15 workout sessions'
    }],
    
    duration: {
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2024-06-22T23:59:59Z',
      durationDays: 21,
      timezone: 'UTC',
      isRecurring: false
    },
    
    maxParticipants: 100,
    isPublic: true,
    requiresApproval: false,
    allowLateJoin: true,
    
    rewards: {
      xpPoints: 350,
      badgeId: 'summer-shred-2024',
      badgeName: 'Summer Shredder',
      badgeIcon: 'sun',
      celebrationMessage: 'Congratulations! You\'ve completed the Summer Shred Challenge and earned your badge!',
      isExclusive: true
    },
    
    allowTeams: false,
    enableLeaderboard: true,
    enableComments: true,
    
    createdBy: 'admin-001',
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-05-20T14:30:00Z',
    publishedAt: '2024-05-25T08:00:00Z',
    
    participationData: [
      {
        userId: 'user-001',
        userName: 'FitnessEnthusiast',
        joinedAt: '2024-06-01T09:00:00Z',
        status: 'in_progress',
        progress: {
          currentValue: 8,
          targetValue: 15,
          percentage: 53,
          lastUpdated: '2024-06-10T18:30:00Z'
        }
      },
      {
        userId: 'user-002',
        userName: 'StrengthSeeker',
        joinedAt: '2024-06-01T10:15:00Z',
        status: 'completed',
        progress: {
          currentValue: 16,
          targetValue: 15,
          percentage: 100,
          lastUpdated: '2024-06-18T20:45:00Z'
        },
        completedAt: '2024-06-18T20:45:00Z',
        ranking: 1
      }
    ],
    
    progressData: {
      totalParticipants: 45,
      activeParticipants: 38,
      completedParticipants: 7,
      averageProgress: 67,
      completionRate: 16,
      participationTrend: []
    },
    
    engagementMetrics: {
      views: 234,
      likes: 45,
      shares: 12,
      comments: 8
    },
    
    version: 1,
    isTemplate: false,
    tags: ['summer', 'transformation', 'advanced', 'hybrid'],
    searchKeywords: ['summer', 'shred', 'transformation', '21-day', 'fitness']
  },
  
  {
    id: 'challenge-002',
    title: 'Flexibility & Flow',
    description: 'Improve your flexibility and mobility with daily stretching and yoga sessions.',
    shortDescription: 'Daily flexibility and mobility improvement program',
    type: 'weekly',
    difficulty: 'beginner',
    category: 'flexibility',
    status: 'active',
    
    targets: [{
      metric: 'sessions_logged',
      value: 5,
      unit: 'sessions',
      operator: 'greater_than',
      description: 'Log at least 5 flexibility sessions'
    }],
    
    duration: {
      startDate: '2024-06-10T00:00:00Z',
      endDate: '2024-06-17T23:59:59Z',
      durationDays: 7,
      timezone: 'UTC',
      isRecurring: true,
      recurringPattern: 'weekly'
    },
    
    maxParticipants: 200,
    isPublic: true,
    requiresApproval: false,
    allowLateJoin: true,
    
    rewards: {
      xpPoints: 120,
      badgeId: 'flexibility-master',
      badgeName: 'Flexibility Master',
      badgeIcon: 'stretch',
      celebrationMessage: 'Amazing! Your flexibility journey is paying off!',
      isExclusive: false
    },
    
    allowTeams: true,
    maxTeamSize: 4,
    enableLeaderboard: true,
    enableComments: true,
    
    createdBy: 'admin-001',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-05T12:00:00Z',
    publishedAt: '2024-06-08T00:00:00Z',
    
    participationData: [
      {
        userId: 'user-003',
        userName: 'YogaFlow',
        joinedAt: '2024-06-10T07:00:00Z',
        status: 'in_progress',
        progress: {
          currentValue: 3,
          targetValue: 5,
          percentage: 60,
          lastUpdated: '2024-06-13T19:00:00Z'
        }
      }
    ],
    
    progressData: {
      totalParticipants: 78,
      activeParticipants: 72,
      completedParticipants: 6,
      averageProgress: 45,
      completionRate: 8,
      participationTrend: []
    },
    
    engagementMetrics: {
      views: 156,
      likes: 32,
      shares: 8,
      comments: 15
    },
    
    version: 1,
    isTemplate: false,
    tags: ['flexibility', 'yoga', 'mobility', 'beginner'],
    searchKeywords: ['flexibility', 'stretch', 'yoga', 'mobility', 'flow']
  }
];

// ================================================================
// SAMPLE ACHIEVEMENTS
// ================================================================

export const sampleAchievements: Achievement[] = [
  {
    id: 'achievement-first-workout',
    title: 'First Steps',
    description: 'Complete your very first workout session',
    shortDescription: 'Your fitness journey begins!',
    flavorText: 'Every champion started with a single step',
    category: 'milestone',
    type: 'milestone',
    tier: 'bronze',
    
    unlockCondition: 'automatic',
    criteria: {
      type: 'metric',
      metric: 'workout_count',
      value: 1,
      operator: 'greater_than'
    },
    
    isSecret: false,
    isRepeatable: false,
    
    badge: {
      id: 'first-workout-badge',
      name: 'First Steps Badge',
      iconName: 'play',
      tier: 'bronze',
      colors: {
        primary: '#CD7F32',
        secondary: '#B8860B',
        accent: '#F4A460',
        background: 'rgba(205, 127, 50, 0.1)'
      },
      animationType: 'bounce',
      particles: {
        enabled: true,
        type: 'sparkles',
        color: '#FFD700',
        density: 20
      },
      effects: {
        shadow: true,
        glow: false,
        reflection: false,
        metallic: true
      }
    },
    
    rewards: {
      xpPoints: 50,
      badge: {} as any, // Will be populated with badge data
      socialRewards: {
        shareableImage: 'https://example.com/first-workout-share.jpg',
        celebrationMessage: 'I just completed my first workout on SwanStudios! 💪',
        leaderboardHighlight: true,
        profileBadge: true
      }
    },
    
    rarity: 95, // 95% of users unlock this
    pointValue: 50,
    prestigeValue: 10,
    
    isActive: true,
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
    
    totalUnlocks: 1245,
    unlockRate: 95,
    averageUnlockTime: 1, // Days
    
    tags: ['beginner', 'milestone', 'first'],
    searchKeywords: ['first', 'workout', 'start', 'begin']
  },
  
  {
    id: 'achievement-week-warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    shortDescription: 'Seven days of consistent training',
    flavorText: 'Consistency is the mother of mastery',
    category: 'consistency',
    type: 'streak',
    tier: 'silver',
    
    unlockCondition: 'automatic',
    criteria: {
      type: 'streak',
      metric: 'streak_days',
      value: 7,
      operator: 'greater_than'
    },
    
    isSecret: false,
    isRepeatable: false,
    
    badge: {
      id: 'week-warrior-badge',
      name: 'Week Warrior Badge',
      iconName: 'calendar',
      tier: 'silver',
      colors: {
        primary: '#C0C0C0',
        secondary: '#A9A9A9',
        accent: '#E5E5E5',
        background: 'rgba(192, 192, 192, 0.1)'
      },
      animationType: 'glow',
      particles: {
        enabled: true,
        type: 'stars',
        color: '#FFFFFF',
        density: 30
      },
      effects: {
        shadow: true,
        glow: true,
        reflection: true,
        metallic: true
      }
    },
    
    rewards: {
      xpPoints: 150,
      badge: {} as any,
      socialRewards: {
        shareableImage: 'https://example.com/week-warrior-share.jpg',
        celebrationMessage: 'I just completed a 7-day workout streak! 🔥',
        leaderboardHighlight: true,
        profileBadge: true
      }
    },
    
    rarity: 35, // 35% of users unlock this
    pointValue: 150,
    prestigeValue: 75,
    
    isActive: true,
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
    
    totalUnlocks: 456,
    unlockRate: 35,
    averageUnlockTime: 14, // Days
    
    tags: ['streak', 'consistency', 'week'],
    searchKeywords: ['week', 'streak', 'consistent', 'seven', 'days']
  }
];

// ================================================================
// SAMPLE USERS
// ================================================================

export const sampleUsers: GamificationUser[] = [
  {
    userId: 'user-001',
    username: 'FitnessEnthusiast',
    displayName: 'Alex Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    
    level: 12,
    xpPoints: 2450,
    xpToNextLevel: 350,
    totalXpEarned: 2450,
    
    challengesJoined: 8,
    challengesCompleted: 5,
    challengesWon: 2,
    completionRate: 62.5,
    
    achievementsUnlocked: 15,
    totalAchievementPoints: 750,
    prestigeLevel: 3,
    rareAchievements: 2,
    
    currentStreak: 12,
    longestStreak: 23,
    streakFreezesUsed: 1,
    streakFreezesRemaining: 2,
    
    friendsCount: 8,
    followersCount: 12,
    challengeInvitesSent: 3,
    socialShares: 7,
    
    preferences: {
      difficulty: 'intermediate',
      categories: ['cardio', 'strength', 'flexibility'],
      notifications: true,
      privacy: 'public',
      theme: 'galaxy'
    },
    
    subscriptionTier: 'premium',
    premiumFeatures: ['advanced_analytics', 'custom_challenges', 'priority_support'],
    
    lastActive: '2024-06-13T18:30:00Z',
    joinedAt: '2024-03-15T10:00:00Z',
    totalSessions: 45,
    averageSessionDuration: 32 // minutes
  },
  
  {
    userId: 'user-002',
    username: 'StrengthSeeker',
    displayName: 'Maria Rodriguez',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    
    level: 18,
    xpPoints: 4320,
    xpToNextLevel: 180,
    totalXpEarned: 4320,
    
    challengesJoined: 12,
    challengesCompleted: 10,
    challengesWon: 4,
    completionRate: 83.3,
    
    achievementsUnlocked: 28,
    totalAchievementPoints: 1450,
    prestigeLevel: 7,
    rareAchievements: 5,
    
    currentStreak: 8,
    longestStreak: 45,
    streakFreezesUsed: 0,
    streakFreezesRemaining: 3,
    
    friendsCount: 15,
    followersCount: 23,
    challengeInvitesSent: 8,
    socialShares: 15,
    
    preferences: {
      difficulty: 'advanced',
      categories: ['strength', 'hybrid'],
      notifications: true,
      privacy: 'public',
      theme: 'dark'
    },
    
    subscriptionTier: 'pro',
    premiumFeatures: ['advanced_analytics', 'custom_challenges', 'priority_support', 'ai_coach', 'unlimited_challenges'],
    
    lastActive: '2024-06-13T20:15:00Z',
    joinedAt: '2024-02-01T08:00:00Z',
    totalSessions: 78,
    averageSessionDuration: 45 // minutes
  }
];

// ================================================================
// SAMPLE LEADERBOARD
// ================================================================

export const sampleLeaderboard: Leaderboard = {
  id: 'weekly-global-xp',
  type: 'global',
  period: 'weekly',
  metric: 'xp',
  title: 'Global XP Leaders',
  description: 'Top XP earners this week',
  
  entries: [
    {
      rank: 1,
      previousRank: 3,
      user: {
        id: 'user-002',
        username: 'StrengthSeeker',
        displayName: 'Maria Rodriguez',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        level: 18,
        subscriptionTier: 'pro'
      },
      score: 850,
      metric: 'xp',
      change: 2,
      details: {
        challengesCompleted: 3,
        achievementsUnlocked: 2,
        totalXp: 850
      },
      badge: {
        icon: 'crown',
        color: '#FFD700',
        description: 'Week Champion'
      },
      trend: {
        direction: 'up',
        percentage: 25
      }
    },
    {
      rank: 2,
      previousRank: 1,
      user: {
        id: 'user-001',
        username: 'FitnessEnthusiast',
        displayName: 'Alex Johnson',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        level: 12,
        subscriptionTier: 'premium'
      },
      score: 720,
      metric: 'xp',
      change: -1,
      details: {
        challengesCompleted: 2,
        achievementsUnlocked: 3,
        totalXp: 720
      },
      trend: {
        direction: 'down',
        percentage: 12
      }
    }
  ],
  
  totalEntries: 156,
  userRank: 45,
  
  periodStart: '2024-06-10T00:00:00Z',
  periodEnd: '2024-06-17T23:59:59Z',
  lastUpdated: '2024-06-13T20:00:00Z',
  nextUpdate: '2024-06-14T00:00:00Z',
  
  maxEntries: 100,
  minActivityRequired: 1,
  eligibilityRules: ['Must have at least 1 workout this week', 'Account must be active']
};

// ================================================================
// SAMPLE USER STATISTICS
// ================================================================

export const sampleUserStatistics: UserStatistics = {
  userId: 'user-001',
  period: {
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-13T23:59:59Z',
    type: 'weekly'
  },
  
  activity: {
    workouts: 5,
    caloriesBurned: 2340,
    minutesExercised: 225,
    stepsTaken: 58420,
    distanceCovered: 12.5
  },
  
  gamification: {
    xpEarned: 380,
    challengesJoined: 2,
    challengesCompleted: 1,
    achievementsUnlocked: 3,
    streakDays: 12,
    socialInteractions: 8
  },
  
  performance: {
    averageWorkoutIntensity: 7.2,
    improvementRate: 15.3,
    consistencyScore: 85,
    goalAchievementRate: 78
  },
  
  comparison: {
    previousPeriod: {
      improvement: 12.5,
      trend: 'improving'
    },
    peerAverage: {
      percentile: 75,
      comparison: 'above'
    }
  },
  
  predictions: {
    nextWeekActivity: 6,
    goalCompletionProbability: 82,
    recommendedChallenges: ['challenge-002', 'challenge-003']
  }
};

// ================================================================
// EXPORT ALL MOCK DATA
// ================================================================

export {
  challengeTemplates,
  sampleChallenges,
  sampleAchievements,
  sampleUsers,
  sampleLeaderboard,
  sampleUserStatistics
};

// ================================================================
// HELPER FUNCTIONS FOR GENERATING TEST DATA
// ================================================================

/**
 * Generate random user for testing
 */
export const generateRandomUser = (id: string): GamificationUser => {
  const usernames = ['FitnessGuru', 'WorkoutWarrior', 'HealthHero', 'FitnessFan', 'SwoleSeeker'];
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown'];
  
  const level = Math.floor(Math.random() * 25) + 1;
  const baseXp = Math.floor(Math.random() * 5000);
  
  return {
    userId: id,
    username: usernames[Math.floor(Math.random() * usernames.length)],
    displayName: names[Math.floor(Math.random() * names.length)],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    
    level,
    xpPoints: baseXp,
    xpToNextLevel: Math.floor(Math.random() * 500),
    totalXpEarned: baseXp,
    
    challengesJoined: Math.floor(Math.random() * 15),
    challengesCompleted: Math.floor(Math.random() * 10),
    challengesWon: Math.floor(Math.random() * 5),
    completionRate: Math.floor(Math.random() * 100),
    
    achievementsUnlocked: Math.floor(Math.random() * 30),
    totalAchievementPoints: Math.floor(Math.random() * 2000),
    prestigeLevel: Math.floor(Math.random() * 10),
    rareAchievements: Math.floor(Math.random() * 8),
    
    currentStreak: Math.floor(Math.random() * 30),
    longestStreak: Math.floor(Math.random() * 100),
    streakFreezesUsed: Math.floor(Math.random() * 3),
    streakFreezesRemaining: 3,
    
    friendsCount: Math.floor(Math.random() * 50),
    followersCount: Math.floor(Math.random() * 100),
    challengeInvitesSent: Math.floor(Math.random() * 20),
    socialShares: Math.floor(Math.random() * 30),
    
    preferences: {
      difficulty: 'auto',
      categories: ['cardio', 'strength'],
      notifications: true,
      privacy: 'public',
      theme: 'galaxy'
    },
    
    subscriptionTier: Math.random() > 0.7 ? 'premium' : 'free',
    premiumFeatures: [],
    
    lastActive: new Date().toISOString(),
    joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: Math.floor(Math.random() * 100),
    averageSessionDuration: Math.floor(Math.random() * 60) + 15
  };
};

/**
 * Generate test challenges
 */
export const generateTestChallenges = (count: number): Challenge[] => {
  const challenges: Challenge[] = [];
  
  for (let i = 0; i < count; i++) {
    // Implementation would generate random challenges
    // For brevity, returning empty array with proper typing
  }
  
  return challenges;
};
