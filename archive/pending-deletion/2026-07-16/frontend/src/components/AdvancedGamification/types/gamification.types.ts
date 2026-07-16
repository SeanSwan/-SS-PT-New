/**
 * 🎮 GAMIFICATION SYSTEM TYPES - CORE INTERFACES
 * ===============================================
 * General gamification system types for user management,
 * leaderboards, statistics, and system configuration
 */

import type { Challenge, ParticipationRecord } from './challenge.types';
import type { Achievement, UserAchievementProgress } from './achievement.types';

// ================================================================
// USER GAMIFICATION PROFILE
// ================================================================

export interface GamificationUser {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  
  // Experience System
  level: number;
  xpPoints: number;
  xpToNextLevel: number;
  totalXpEarned: number;
  
  // Participation Stats
  challengesJoined: number;
  challengesCompleted: number;
  challengesWon: number;
  completionRate: number;
  
  // Achievement Stats
  achievementsUnlocked: number;
  totalAchievementPoints: number;
  prestigeLevel: number;
  rareAchievements: number;
  
  // Streak System
  currentStreak: number;
  longestStreak: number;
  streakFreezesUsed: number;
  streakFreezesRemaining: number;
  
  // Social Stats
  friendsCount: number;
  followersCount: number;
  challengeInvitesSent: number;
  socialShares: number;
  
  // Preferences
  preferences: {
    difficulty: 'auto' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
    categories: string[];
    notifications: boolean;
    privacy: 'public' | 'friends' | 'private';
    theme: 'light' | 'dark' | 'galaxy';
  };
  
  // Subscription
  subscriptionTier: 'free' | 'premium' | 'pro';
  subscriptionExpires?: string;
  premiumFeatures: string[];
  
  // Analytics
  lastActive: string;
  joinedAt: string;
  totalSessions: number;
  averageSessionDuration: number;
}

// ================================================================
// LEADERBOARD SYSTEM
// ================================================================

export type LeaderboardType = 'global' | 'friends' | 'local' | 'challenge' | 'category';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
export type LeaderboardMetric = 'xp' | 'challenges_completed' | 'streak' | 'achievements' | 'activity_score';

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    level: number;
    subscriptionTier: string;
  };
  score: number;
  metric: LeaderboardMetric;
  change: number; // rank change from previous period
  
  // Additional Context
  details?: {
    challengesCompleted?: number;
    streakDays?: number;
    achievementsUnlocked?: number;
    totalXp?: number;
  };
  
  // Visual Elements
  badge?: {
    icon: string;
    color: string;
    description: string;
  };
  
  // Trend Data
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  title: string;
  description: string;
  
  // Entries
  entries: LeaderboardEntry[];
  totalEntries: number;
  userRank?: number;
  userEntry?: LeaderboardEntry;
  
  // Time Information
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  nextUpdate: string;
  
  // Configuration
  maxEntries: number;
  minActivityRequired: number;
  eligibilityRules: string[];
  
  // Rewards
  rewards?: {
    rank: number;
    reward: {
      type: string;
      value: string;
      description: string;
    };
  }[];
}

// ================================================================
// STATISTICS & ANALYTICS
// ================================================================

export interface UserStatistics {
  userId: string;
  period: {
    startDate: string;
    endDate: string;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  };
  
  // Activity Stats
  activity: {
    workouts: number;
    caloriesBurned: number;
    minutesExercised: number;
    stepsTaken: number;
    distanceCovered: number;
  };
  
  // Gamification Stats
  gamification: {
    xpEarned: number;
    challengesJoined: number;
    challengesCompleted: number;
    achievementsUnlocked: number;
    streakDays: number;
    socialInteractions: number;
  };
  
  // Performance Metrics
  performance: {
    averageWorkoutIntensity: number;
    improvementRate: number;
    consistencyScore: number;
    goalAchievementRate: number;
  };
  
  // Comparative Analysis
  comparison: {
    previousPeriod: {
      improvement: number;
      trend: 'improving' | 'stable' | 'declining';
    };
    peerAverage: {
      percentile: number;
      comparison: 'above' | 'at' | 'below';
    };
  };
  
  // Predictions
  predictions?: {
    nextWeekActivity: number;
    goalCompletionProbability: number;
    recommendedChallenges: string[];
  };
}

export interface SystemStatistics {
  period: {
    startDate: string;
    endDate: string;
  };
  
  // User Engagement
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
    averageSessionDuration: number;
  };
  
  // Challenge Performance
  challenges: {
    totalChallenges: number;
    activeChallenges: number;
    averageParticipation: number;
    completionRate: number;
    mostPopularCategory: string;
  };
  
  // Achievement System
  achievements: {
    totalUnlocks: number;
    newAchievements: number;
    averageUnlockTime: number;
    mostRareAchievement: string;
  };
  
  // Platform Health
  performance: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
    userSatisfaction: number;
  };
}

// ================================================================
// NOTIFICATION SYSTEM
// ================================================================

export type NotificationType = 
  | 'achievement_unlocked'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_reminder'
  | 'leaderboard_update'
  | 'friend_activity'
  | 'streak_milestone'
  | 'level_up'
  | 'system_update';

export interface GamificationNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Visual Elements
  icon: string;
  color: string;
  image?: string;
  
  // Interaction
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  
  // Data Payload
  data?: {
    achievementId?: string;
    challengeId?: string;
    leaderboardId?: string;
    userId?: string;
    xpGained?: number;
    [key: string]: any;
  };
  
  // Timing
  createdAt: string;
  scheduledFor?: string;
  expiresAt?: string;
  
  // Delivery
  channels: ('app' | 'email' | 'push' | 'sms')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

// ================================================================
// SYSTEM CONFIGURATION
// ================================================================

export interface GamificationSettings {
  // Experience System
  xp: {
    workoutBase: number;
    challengeMultiplier: number;
    streakBonus: number;
    levelCurve: 'linear' | 'exponential' | 'logarithmic';
    maxLevel: number;
  };
  
  // Challenge System
  challenges: {
    maxActivePerUser: number;
    defaultDuration: number;
    participationRewards: boolean;
    autoGenerateEnabled: boolean;
    difficultyAdjustment: boolean;
  };
  
  // Achievement System
  achievements: {
    celebrationDuration: number;
    rarityThresholds: {
      common: number;
      rare: number;
      epic: number;
      legendary: number;
    };
    secretAchievements: boolean;
  };
  
  // Social Features
  social: {
    leaderboardsEnabled: boolean;
    friendSystemEnabled: boolean;
    sharingEnabled: boolean;
    commentsEnabled: boolean;
  };
  
  // Notifications
  notifications: {
    defaultEnabled: boolean;
    maxPerDay: number;
    quietHours: {
      start: string;
      end: string;
    };
    channels: string[];
  };
  
  // Premium Features
  premium: {
    enabled: boolean;
    trialDuration: number;
    exclusiveFeatures: string[];
    upgradePrompts: boolean;
  };
}

// ================================================================
// API INTERFACES
// ================================================================

export interface GamificationDashboardResponse {
  user: GamificationUser;
  activeChallenges: Challenge[];
  recentAchievements: Achievement[];
  leaderboardPosition: LeaderboardEntry[];
  statistics: UserStatistics;
  notifications: GamificationNotification[];
  recommendations: {
    challenges: Challenge[];
    achievements: Achievement[];
    friends: GamificationUser[];
  };
}

export interface LeaderboardResponse {
  leaderboard: Leaderboard;
  userPosition?: LeaderboardEntry;
  nearbyRanks: LeaderboardEntry[];
  filters: {
    type: LeaderboardType;
    period: LeaderboardPeriod;
    metric: LeaderboardMetric;
  };
}

// ================================================================
// SEARCH AND FILTERING
// ================================================================

export interface GamificationSearchFilters {
  query?: string;
  categories?: string[];
  difficulty?: string[];
  type?: string[];
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  rewards?: {
    minXp: number;
    maxXp: number;
    hasBadge: boolean;
    hasSpecialReward: boolean;
  };
  social?: {
    hasParticipants: boolean;
    friendsOnly: boolean;
    teamBased: boolean;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

// ================================================================
// ERROR HANDLING
// ================================================================

export interface GamificationError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  action?: string;
}

export interface GamificationResponse<T = any> {
  success: boolean;
  data?: T;
  error?: GamificationError;
  message?: string;
  timestamp: string;
}

// ================================================================
// EXPORT ALL TYPES
// ================================================================

export type {
  GamificationUser,
  LeaderboardEntry,
  Leaderboard,
  UserStatistics,
  SystemStatistics,
  GamificationNotification,
  GamificationSettings,
  GamificationDashboardResponse,
  LeaderboardResponse,
  GamificationSearchFilters,
  GamificationError,
  GamificationResponse
};
