/**
 * 🎮 GAMIFICATION HELPER UTILITIES
 * =================================
 * Reusable utility functions for gamification calculations,
 * formatting, validation, and common operations
 */

import type { 
  Challenge, 
  ChallengeType, 
  ChallengeDifficulty,
  ChallengeCategory,
  ParticipationRecord 
} from '../types/challenge.types';
import type { 
  Achievement, 
  AchievementTier,
  UserAchievementProgress 
} from '../types/achievement.types';
import type { 
  GamificationUser,
  LeaderboardEntry 
} from '../types/gamification.types';

// ================================================================
// XP & LEVEL CALCULATIONS
// ================================================================

/**
 * Calculate XP required for a specific level
 */
export const calculateXpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  // Exponential curve: level^2 * 100 + (level-1) * 50
  return Math.floor(Math.pow(level, 2) * 100 + (level - 1) * 50);
};

/**
 * Calculate user level from total XP
 */
export const calculateLevelFromXp = (totalXp: number): number => {
  if (totalXp <= 0) return 1;
  
  let level = 1;
  let xpRequired = 0;
  
  while (xpRequired <= totalXp) {
    level++;
    xpRequired = calculateXpForLevel(level);
  }
  
  return Math.max(1, level - 1);
};

/**
 * Calculate XP needed for next level
 */
export const calculateXpToNextLevel = (currentXp: number): number => {
  const currentLevel = calculateLevelFromXp(currentXp);
  const nextLevelXp = calculateXpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXp - currentXp);
};

/**
 * Calculate XP progress percentage for current level
 */
export const calculateLevelProgress = (currentXp: number): number => {
  const currentLevel = calculateLevelFromXp(currentXp);
  const currentLevelXp = calculateXpForLevel(currentLevel);
  const nextLevelXp = calculateXpForLevel(currentLevel + 1);
  
  if (nextLevelXp === currentLevelXp) return 100;
  
  const progress = ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
};

// ================================================================
// CHALLENGE CALCULATIONS
// ================================================================

/**
 * Calculate challenge difficulty score (1-10)
 */
export const calculateChallengeDifficulty = (
  challenge: Challenge,
  userLevel: number
): number => {
  const baseScore = {
    'beginner': 2,
    'intermediate': 4,
    'advanced': 7,
    'expert': 9
  }[challenge.difficulty];
  
  // Adjust for user level
  const levelAdjustment = Math.max(-2, Math.min(2, (userLevel - 5) * 0.3));
  
  // Adjust for challenge type
  const typeAdjustment = {
    'daily': -0.5,
    'weekly': 0,
    'monthly': 1,
    'special': 1.5,
    'community': 0.5
  }[challenge.type];
  
  return Math.min(10, Math.max(1, baseScore - levelAdjustment + typeAdjustment));
};

/**
 * Calculate challenge completion rate
 */
export const calculateChallengeCompletionRate = (challenge: Challenge): number => {
  const completed = challenge.participationData.filter(p => p.status === 'completed').length;
  const total = challenge.participationData.length;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

/**
 * Calculate estimated challenge duration in hours
 */
export const estimateChallengeDuration = (challenge: Challenge): number => {
  const baseDuration = {
    'daily': 2,
    'weekly': 8,
    'monthly': 20,
    'special': 12,
    'community': 15
  }[challenge.type];
  
  const difficultyMultiplier = {
    'beginner': 0.7,
    'intermediate': 1.0,
    'advanced': 1.5,
    'expert': 2.0
  }[challenge.difficulty];
  
  return Math.round(baseDuration * difficultyMultiplier);
};

/**
 * Calculate challenge reward value
 */
export const calculateChallengeRewardValue = (challenge: Challenge): number => {
  let baseValue = challenge.rewards.xpPoints;
  
  // Add badge value
  if (challenge.rewards.badgeId) {
    baseValue += 50; // Base badge value
  }
  
  // Add special reward value
  if (challenge.rewards.specialReward) {
    baseValue += 100;
  }
  
  // Difficulty multiplier
  const difficultyMultiplier = {
    'beginner': 1.0,
    'intermediate': 1.2,
    'advanced': 1.5,
    'expert': 2.0
  }[challenge.difficulty];
  
  return Math.round(baseValue * difficultyMultiplier);
};

// ================================================================
// ACHIEVEMENT CALCULATIONS
// ================================================================

/**
 * Calculate achievement rarity score
 */
export const calculateAchievementRarity = (achievement: Achievement): string => {
  const rate = achievement.unlockRate;
  
  if (rate >= 50) return 'Common';
  if (rate >= 20) return 'Uncommon';
  if (rate >= 5) return 'Rare';
  if (rate >= 1) return 'Epic';
  return 'Legendary';
};

/**
 * Calculate achievement points based on rarity and tier
 */
export const calculateAchievementPoints = (
  tier: AchievementTier,
  rarity: number
): number => {
  const basePoints = {
    'bronze': 10,
    'silver': 25,
    'gold': 50,
    'platinum': 100,
    'diamond': 200
  }[tier];
  
  // Rarity multiplier (1-100 rarity becomes 1.0-3.0 multiplier)
  const rarityMultiplier = 1 + (rarity / 50);
  
  return Math.round(basePoints * rarityMultiplier);
};

/**
 * Calculate time until achievement unlock (prediction)
 */
export const estimateAchievementUnlockTime = (
  progress: UserAchievementProgress,
  userActivity: number // activities per day
): number => {
  if (progress.isCompleted || userActivity <= 0) return 0;
  
  const remainingProgress = progress.targetValue - progress.currentValue;
  const averageDailyProgress = userActivity * 0.7; // 70% of activities contribute
  
  return Math.ceil(remainingProgress / averageDailyProgress);
};

// ================================================================
// LEADERBOARD CALCULATIONS
// ================================================================

/**
 * Calculate user rank change
 */
export const calculateRankChange = (
  currentRank: number,
  previousRank: number
): { change: number; direction: 'up' | 'down' | 'stable'; percentage: number } => {
  const change = previousRank - currentRank; // Positive means rank improved
  
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (change > 0) direction = 'up';
  else if (change < 0) direction = 'down';
  
  const percentage = previousRank > 0 ? Math.abs((change / previousRank) * 100) : 0;
  
  return { change, direction, percentage: Math.round(percentage) };
};

/**
 * Calculate leaderboard activity score
 */
export const calculateActivityScore = (
  workouts: number,
  challengesCompleted: number,
  achievementsUnlocked: number,
  streakDays: number
): number => {
  const workoutScore = workouts * 10;
  const challengeScore = challengesCompleted * 25;
  const achievementScore = achievementsUnlocked * 15;
  const streakScore = Math.min(streakDays * 2, 100); // Cap at 100
  
  return workoutScore + challengeScore + achievementScore + streakScore;
};

// ================================================================
// FORMATTING UTILITIES
// ================================================================

/**
 * Format numbers with appropriate suffixes (1K, 1M, etc.)
 */
export const formatNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
};

/**
 * Format duration in human-readable format
 */
export const formatDuration = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) return `${days} day${days === 1 ? '' : 's'}`;
  return `${days}d ${remainingHours}h`;
};

/**
 * Format percentage with appropriate precision
 */
export const formatPercentage = (value: number): string => {
  if (value === 0) return '0%';
  if (value < 1) return '< 1%';
  if (value >= 99.5) return '100%';
  return `${Math.round(value)}%`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
};

// ================================================================
// VALIDATION UTILITIES
// ================================================================

/**
 * Check if user can join a challenge
 */
export const canUserJoinChallenge = (
  challenge: Challenge,
  user: GamificationUser
): { canJoin: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  
  // Check if challenge is active
  if (challenge.status !== 'active') {
    reasons.push('Challenge is not currently active');
  }
  
  // Check start date
  const now = new Date();
  const startDate = new Date(challenge.duration.startDate);
  if (now < startDate) {
    reasons.push('Challenge has not started yet');
  }
  
  // Check end date
  const endDate = new Date(challenge.duration.endDate);
  if (now > endDate && !challenge.allowLateJoin) {
    reasons.push('Challenge has ended');
  }
  
  // Check participant limit
  if (challenge.maxParticipants && 
      challenge.participationData.length >= challenge.maxParticipants) {
    reasons.push('Challenge is full');
  }
  
  // Check if already joined
  if (challenge.participationData.some(p => p.userId === user.userId)) {
    reasons.push('Already joined this challenge');
  }
  
  // Check subscription requirements
  if (challenge.rewards.specialReward?.type === 'premium_access' && 
      user.subscriptionTier === 'free') {
    reasons.push('Premium subscription required for rewards');
  }
  
  return {
    canJoin: reasons.length === 0,
    reasons
  };
};

/**
 * Generate challenge recommendations for user
 */
export const generateChallengeRecommendations = (
  challenges: Challenge[],
  user: GamificationUser,
  limit: number = 3
): Challenge[] => {
  return challenges
    .filter(challenge => {
      const { canJoin } = canUserJoinChallenge(challenge, user);
      return canJoin;
    })
    .map(challenge => ({
      ...challenge,
      _score: calculateRecommendationScore(challenge, user)
    }))
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .slice(0, limit)
    .map(({ _score, ...challenge }) => challenge); // Remove score field
};

/**
 * Calculate recommendation score for a challenge
 */
const calculateRecommendationScore = (
  challenge: Challenge,
  user: GamificationUser
): number => {
  let score = 0;
  
  // Category preference
  if (user.preferences.categories.includes(challenge.category)) {
    score += 30;
  }
  
  // Difficulty matching
  const userDifficulty = user.preferences.difficulty === 'auto' 
    ? getLevelBasedDifficulty(user.level)
    : user.preferences.difficulty;
  
  if (challenge.difficulty === userDifficulty) {
    score += 25;
  }
  
  // Challenge type variety
  // (This would need user's challenge history to calculate properly)
  score += Math.random() * 20; // Placeholder for variety score
  
  // Participation rate (higher is better for engagement)
  score += challenge.progressData.totalParticipants * 0.1;
  
  // Reward value
  score += calculateChallengeRewardValue(challenge) * 0.05;
  
  return score;
};

/**
 * Get recommended difficulty based on user level
 */
const getLevelBasedDifficulty = (level: number): ChallengeDifficulty => {
  if (level <= 5) return 'beginner';
  if (level <= 15) return 'intermediate';
  if (level <= 30) return 'advanced';
  return 'expert';
};

// ================================================================
// COLOR & THEME UTILITIES
// ================================================================

/**
 * Get tier colors for achievements and challenges
 */
export const getTierColors = (tier: AchievementTier) => {
  const colors = {
    bronze: {
      primary: '#CD7F32',
      secondary: '#B8860B',
      accent: '#F4A460',
      background: 'rgba(205, 127, 50, 0.1)'
    },
    silver: {
      primary: '#C0C0C0',
      secondary: '#A9A9A9',
      accent: '#E5E5E5',
      background: 'rgba(192, 192, 192, 0.1)'
    },
    gold: {
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FFFF99',
      background: 'rgba(255, 215, 0, 0.1)'
    },
    platinum: {
      primary: '#E5E4E2',
      secondary: '#BCC6CC',
      accent: '#FFFFFF',
      background: 'rgba(229, 228, 226, 0.1)'
    },
    diamond: {
      primary: '#B9F2FF',
      secondary: '#4FC3F7',
      accent: '#E1F5FE',
      background: 'rgba(185, 242, 255, 0.1)'
    }
  };
  
  return colors[tier];
};

/**
 * Get difficulty colors
 */
export const getDifficultyColors = (difficulty: ChallengeDifficulty) => {
  const colors = {
    beginner: { primary: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)' },
    intermediate: { primary: '#FF9800', background: 'rgba(255, 152, 0, 0.1)' },
    advanced: { primary: '#F44336', background: 'rgba(244, 67, 54, 0.1)' },
    expert: { primary: '#9C27B0', background: 'rgba(156, 39, 176, 0.1)' }
  };
  
  return colors[difficulty];
};

/**
 * Get category colors
 */
export const getCategoryColors = (category: ChallengeCategory) => {
  const colors = {
    cardio: { primary: '#FF5722', icon: '🏃' },
    strength: { primary: '#795548', icon: '💪' },
    flexibility: { primary: '#9C27B0', icon: '🧘' },
    nutrition: { primary: '#4CAF50', icon: '🥗' },
    mindfulness: { primary: '#3F51B5', icon: '🧠' },
    social: { primary: '#E91E63', icon: '👥' },
    hybrid: { primary: '#00BCD4', icon: '⚡' }
  };
  
  return colors[category];
};

// ================================================================
// ANIMATION UTILITIES
// ================================================================

/**
 * Get animation configuration for achievement unlock
 */
export const getUnlockAnimation = (tier: AchievementTier) => {
  return {
    bronze: { duration: 800, intensity: 'normal', particles: 20 },
    silver: { duration: 1000, intensity: 'normal', particles: 30 },
    gold: { duration: 1200, intensity: 'epic', particles: 50 },
    platinum: { duration: 1500, intensity: 'epic', particles: 75 },
    diamond: { duration: 2000, intensity: 'epic', particles: 100 }
  }[tier];
};

// ================================================================
// EXPORT ALL UTILITIES
// ================================================================

export {
  calculateXpForLevel,
  calculateLevelFromXp,
  calculateXpToNextLevel,
  calculateLevelProgress,
  calculateChallengeDifficulty,
  calculateChallengeCompletionRate,
  estimateChallengeDuration,
  calculateChallengeRewardValue,
  calculateAchievementRarity,
  calculateAchievementPoints,
  estimateAchievementUnlockTime,
  calculateRankChange,
  calculateActivityScore,
  formatNumber,
  formatDuration,
  formatPercentage,
  formatRelativeTime,
  canUserJoinChallenge,
  generateChallengeRecommendations,
  getTierColors,
  getDifficultyColors,
  getCategoryColors,
  getUnlockAnimation
};
