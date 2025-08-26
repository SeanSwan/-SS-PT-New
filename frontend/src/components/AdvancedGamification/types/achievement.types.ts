/**
 * 🏆 ACHIEVEMENT SYSTEM TYPES - GAMIFICATION EXCELLENCE  
 * ======================================================
 * TypeScript definitions for SwanStudios achievement system
 * with badge tiers, unlock conditions, and celebration effects
 */

// ================================================================
// CORE ACHIEVEMENT INTERFACES
// ================================================================

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type AchievementCategory = 'fitness' | 'consistency' | 'milestone' | 'social' | 'special' | 'premium';
export type AchievementType = 'progress' | 'streak' | 'challenge' | 'social' | 'milestone' | 'rare';
export type UnlockCondition = 'automatic' | 'manual' | 'challenge_completion' | 'milestone' | 'social_action';

// ================================================================
// ACHIEVEMENT UNLOCK CRITERIA
// ================================================================

export interface AchievementCriteria {
  type: 'metric' | 'streak' | 'challenge' | 'social' | 'time_based' | 'composite';
  metric?: string; // e.g., 'workouts_completed', 'calories_burned', 'streak_days'
  value?: number;
  operator?: 'greater_than' | 'less_than' | 'equal_to' | 'between';
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  
  // Composite criteria (multiple conditions)
  conditions?: {
    metric: string;
    value: number;
    operator: string;
    required: boolean;
  }[];
  
  // Challenge-based criteria
  challengeIds?: string[];
  challengeType?: string;
  challengeDifficulty?: string;
  
  // Social criteria  
  socialAction?: 'friend_referral' | 'challenge_share' | 'leaderboard_rank' | 'team_participation';
  socialTarget?: number;
}

// ================================================================
// VISUAL BADGE SYSTEM
// ================================================================

export interface AchievementBadge {
  id: string;
  name: string;
  iconName: string; // Lucide icon name
  tier: AchievementTier;
  
  // Visual Properties
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  
  // Animation Properties
  animationType: 'bounce' | 'glow' | 'spin' | 'pulse' | 'shake' | 'scale';
  particles: {
    enabled: boolean;
    type: 'stars' | 'sparkles' | 'confetti' | 'flames';
    color: string;
    density: number;
  };
  
  // 3D Effects
  effects: {
    shadow: boolean;
    glow: boolean;
    reflection: boolean;
    metallic: boolean;
  };
}

// ================================================================
// ACHIEVEMENT REWARDS
// ================================================================

export interface AchievementReward {
  xpPoints: number;
  badge: AchievementBadge;
  
  // Special Rewards
  specialRewards?: {
    type: 'premium_access' | 'discount' | 'exclusive_content' | 'merchandise' | 'training_credit';
    value: string;
    description: string;
    expiresAt?: string;
  }[];
  
  // Social Recognition
  socialRewards: {
    shareableImage: string;
    celebrationMessage: string;
    leaderboardHighlight: boolean;
    profileBadge: boolean;
  };
  
  // Unlocks
  unlocks?: {
    newChallenges: string[];
    newFeatures: string[];
    premiumContent: string[];
  };
}

// ================================================================
// MAIN ACHIEVEMENT INTERFACE
// ================================================================

export interface Achievement {
  // Basic Information
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  flavorText?: string; // Fun description for engagement
  
  // Classification
  category: AchievementCategory;
  type: AchievementType;
  tier: AchievementTier;
  
  // Unlock System
  unlockCondition: UnlockCondition;
  criteria: AchievementCriteria;
  isSecret: boolean; // Hidden until unlocked
  isRepeatable: boolean;
  
  // Visual & Rewards
  badge: AchievementBadge;
  rewards: AchievementReward;
  
  // Rarity & Value
  rarity: number; // 1-100, higher is more rare
  pointValue: number;
  prestigeValue: number;
  
  // Prerequisites
  requiredAchievements?: string[];
  requiredLevel?: number;
  requiredSubscription?: 'free' | 'premium' | 'pro';
  
  // Analytics
  totalUnlocks: number;
  unlockRate: number; // percentage of users who have unlocked
  averageUnlockTime: number; // days from user registration
  
  // Admin Fields
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  
  // System Data
  tags: string[];
  searchKeywords: string[];
}

// ================================================================
// USER ACHIEVEMENT PROGRESS
// ================================================================

export interface UserAchievementProgress {
  achievementId: string;
  userId: string;
  
  // Progress Tracking
  currentValue: number;
  targetValue: number;
  progress: number; // 0-100 percentage
  
  // Status
  isUnlocked: boolean;
  isCompleted: boolean;
  unlockedAt?: string;
  completedAt?: string;
  
  // Progress History
  progressHistory: {
    date: string;
    value: number;
    increment: number;
    source: string; // what triggered the progress
  }[];
  
  // Streak Tracking (for streak-based achievements)
  streak?: {
    current: number;
    best: number;
    lastUpdate: string;
    isActive: boolean;
  };
  
  // Next Milestone
  nextMilestone?: {
    value: number;
    description: string;
    estimatedDays?: number;
  };
}

// ================================================================
// ACHIEVEMENT ANALYTICS
// ================================================================

export interface AchievementAnalytics {
  achievementId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Unlock Statistics
  unlocks: {
    total: number;
    newUnlocks: number;
    unlockRate: number;
    averageTime: number; // days to unlock
  };
  
  // Engagement Impact
  engagement: {
    motivationIncrease: number; // % increase in activity after unlock
    retentionImpact: number; // retention rate difference
    challengeParticipation: number; // challenges joined after unlock
  };
  
  // Progression Patterns
  progression: {
    fastestUnlock: number; // hours
    slowestUnlock: number; // hours  
    commonPathways: string[]; // common achievement sequences
  };
}

// ================================================================
// ADMIN MANAGEMENT INTERFACES
// ================================================================

export interface CreateAchievementRequest {
  title: string;
  description: string;
  shortDescription: string;
  category: AchievementCategory;
  type: AchievementType;
  tier: AchievementTier;
  criteria: AchievementCriteria;
  badgeConfig: Omit<AchievementBadge, 'id'>;
  rewards: Omit<AchievementReward, 'badge'>;
  isSecret: boolean;
  rarity: number;
  tags: string[];
}

export interface UpdateAchievementRequest extends Partial<CreateAchievementRequest> {
  id: string;
  isActive?: boolean;
}

export interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  templateData: Partial<CreateAchievementRequest>;
  usageCount: number;
}

export interface ManualAchievementGrant {
  userId: string;
  achievementId: string;
  reason: string;
  grantedBy: string; // admin ID
  skipCriteria: boolean;
  customMessage?: string;
}

// ================================================================
// CELEBRATION SYSTEM
// ================================================================

export interface AchievementCelebration {
  achievementId: string;
  userId: string;
  
  // Celebration Configuration
  animationType: 'fireworks' | 'confetti' | 'sparkles' | 'glow' | 'burst';
  duration: number; // milliseconds
  intensity: 'subtle' | 'normal' | 'epic';
  
  // Audio
  soundEffect?: string;
  volume: number;
  
  // Visual Effects
  colors: string[];
  particleCount: number;
  showBadge: boolean;
  showMessage: boolean;
  
  // Social Sharing
  autoShare: boolean;
  shareMessage: string;
  shareImage: string;
}

// ================================================================
// ACHIEVEMENT DISPLAY INTERFACES
// ================================================================

export interface AchievementDisplayConfig {
  showProgress: boolean;
  showRarity: boolean;
  showUnlockDate: boolean;
  showDescription: boolean;
  animateOnHover: boolean;
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'galaxy';
}

export interface AchievementGridFilter {
  categories?: AchievementCategory[];
  tiers?: AchievementTier[];
  types?: AchievementType[];
  unlocked?: boolean;
  rarity?: {
    min: number;
    max: number;
  };
  searchQuery?: string;
  sortBy: 'unlock_date' | 'rarity' | 'points' | 'title' | 'tier';
  sortOrder: 'asc' | 'desc';
}

// ================================================================
// API RESPONSE INTERFACES
// ================================================================

export interface UserAchievementsResponse {
  achievements: Achievement[];
  userProgress: UserAchievementProgress[];
  stats: {
    totalUnlocked: number;
    totalPoints: number;
    prestigeLevel: number;
    rarest: Achievement | null;
    newest: Achievement | null;
  };
  categories: {
    category: AchievementCategory;
    unlocked: number;
    total: number;
  }[];
}

export interface AchievementUnlockResponse {
  success: boolean;
  achievement: Achievement;
  userProgress: UserAchievementProgress;
  celebration: AchievementCelebration;
  newlyUnlocked: Achievement[]; // cascade unlocks
  message: string;
}

// ================================================================
// EXPORT ALL TYPES
// ================================================================

export type {
  Achievement,
  AchievementCriteria,
  AchievementBadge,
  AchievementReward,
  UserAchievementProgress,
  AchievementAnalytics,
  CreateAchievementRequest,
  UpdateAchievementRequest,
  AchievementTemplate,
  ManualAchievementGrant,
  AchievementCelebration,
  AchievementDisplayConfig,
  AchievementGridFilter,
  UserAchievementsResponse,
  AchievementUnlockResponse
};
