/**
 * useExerciseGamification.ts
 * ==========================
 * 
 * Custom hook for managing admin exercise gamification system
 * Tracks achievements, progress, and provides real-time gamification features
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time achievement tracking
 * - Admin progress monitoring
 * - Level progression system
 * - Streak tracking
 * - Points and experience management
 * - Achievement celebrations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';
import { useToast } from '../../../../../../hooks/use-toast';

// === INTERFACES ===

interface AdminAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointValue: number;
  condition: {
    type: 'exercise_created' | 'video_uploaded' | 'user_engagement' | 'quality_score' | 'streak';
    threshold: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  unlockedAt?: string;
  progress?: number;
  isUnlocked: boolean;
  isNew?: boolean;
}

interface AdminStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalPoints: number;
  streak: number;
  longestStreak: number;
  totalExercisesCreated: number;
  totalVideosUploaded: number;
  avgQualityScore: number;
  userEngagementScore: number;
  lastActivityDate: string;
}

interface GamificationProgress {
  action: string;
  xpGained: number;
  pointsGained: number;
  newLevel?: number;
  newAchievements?: AdminAchievement[];
  timestamp: string;
}

interface UseExerciseGamificationReturn {
  adminStats: AdminStats | null;
  achievements: AdminAchievement[];
  availableAchievements: AdminAchievement[];
  recentProgress: GamificationProgress[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateProgress: (action: string, metadata?: any) => Promise<GamificationProgress>;
  unlockAchievement: (achievementId: string) => Promise<AdminAchievement[]>;
  refreshStats: () => Promise<void>;
  resetStreak: () => Promise<void>;
  calculateNextLevel: (currentXP: number) => { level: number; requiredXP: number };
}

// === CONSTANTS ===

const LEVEL_XP_REQUIREMENTS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000,
  20000, 26000, 33000, 41000, 50000, 60000, 71000, 83000, 96000, 110000
];

const XP_REWARDS = {
  exercise_created: 50,
  video_uploaded: 25,
  quality_score_improvement: 10,
  user_engagement: 5,
  daily_streak: 20,
  weekly_streak: 100,
  monthly_streak: 500,
};

const POINT_MULTIPLIERS = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  platinum: 3,
};

// Mock achievements data (replace with API calls)
const MOCK_ACHIEVEMENTS: AdminAchievement[] = [
  {
    id: 'first_exercise',
    name: 'Exercise Pioneer',
    description: 'Create your first exercise in the system',
    icon: '🏃‍♂️',
    tier: 'bronze',
    pointValue: 100,
    condition: { type: 'exercise_created', threshold: 1 },
    isUnlocked: true,
    unlockedAt: '2025-01-15T10:00:00Z',
    progress: 100
  },
  {
    id: 'exercise_architect',
    name: 'Exercise Architect',
    description: 'Create 10 exercises with video demonstrations',
    icon: '🏗️',
    tier: 'silver',
    pointValue: 500,
    condition: { type: 'exercise_created', threshold: 10 },
    isUnlocked: true,
    unlockedAt: '2025-01-20T14:30:00Z',
    progress: 100
  },
  {
    id: 'video_master',
    name: 'Video Master',
    description: 'Upload 50 high-quality exercise demonstration videos',
    icon: '🎬',
    tier: 'gold',
    pointValue: 1000,
    condition: { type: 'video_uploaded', threshold: 50 },
    isUnlocked: true,
    unlockedAt: '2025-01-25T09:15:00Z',
    progress: 100
  },
  {
    id: 'nasm_guardian',
    name: 'NASM Guardian',
    description: 'Maintain 95%+ NASM compliance score for 30 days',
    icon: '🛡️',
    tier: 'gold',
    pointValue: 1500,
    condition: { type: 'quality_score', threshold: 95, timeframe: 'monthly' },
    isUnlocked: true,
    unlockedAt: '2025-01-28T16:45:00Z',
    progress: 100
  },
  {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Your exercises have been used 1000+ times by users',
    icon: '👥',
    tier: 'platinum',
    pointValue: 2000,
    condition: { type: 'user_engagement', threshold: 1000 },
    isUnlocked: true,
    unlockedAt: '2025-02-01T11:20:00Z',
    progress: 100
  },
  {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Maintain a 30-day exercise creation streak',
    icon: '🔥',
    tier: 'platinum',
    pointValue: 2500,
    condition: { type: 'streak', threshold: 30 },
    isUnlocked: false,
    progress: 17 // 17/30 days
  },
  {
    id: 'exercise_legend',
    name: 'Exercise Legend',
    description: 'Create 100 exercises with perfect NASM compliance',
    icon: '👑',
    tier: 'platinum',
    pointValue: 5000,
    condition: { type: 'exercise_created', threshold: 100 },
    isUnlocked: false,
    progress: 74 // 74/100 exercises
  }
];

// Mock admin stats (replace with API calls)
const MOCK_ADMIN_STATS: AdminStats = {
  level: 12,
  currentXP: 8470,
  nextLevelXP: 10000,
  totalPoints: 15420,
  streak: 5,
  longestStreak: 17,
  totalExercisesCreated: 74,
  totalVideosUploaded: 58,
  avgQualityScore: 96.3,
  userEngagementScore: 892,
  lastActivityDate: '2025-02-01T14:30:00Z'
};

// === UTILITY FUNCTIONS ===

const calculateLevel = (xp: number): { level: number; currentLevelXP: number; nextLevelXP: number } => {
  let level = 1;
  let currentLevelXP = 0;
  let nextLevelXP = LEVEL_XP_REQUIREMENTS[1];
  
  for (let i = 1; i < LEVEL_XP_REQUIREMENTS.length; i++) {
    if (xp >= LEVEL_XP_REQUIREMENTS[i]) {
      level = i + 1;
      currentLevelXP = LEVEL_XP_REQUIREMENTS[i];
      nextLevelXP = LEVEL_XP_REQUIREMENTS[i + 1] || LEVEL_XP_REQUIREMENTS[i] + 10000;
    } else {
      break;
    }
  }
  
  return { level, currentLevelXP, nextLevelXP };
};

const calculatePoints = (xp: number, tier: string = 'bronze'): number => {
  const multiplier = POINT_MULTIPLIERS[tier as keyof typeof POINT_MULTIPLIERS] || 1;
  return Math.floor(xp * multiplier);
};

const isStreakActive = (lastActivityDate: string): boolean => {
  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 48; // 48-hour grace period
};

// === CUSTOM HOOK ===

export const useExerciseGamification = (): UseExerciseGamificationReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [recentProgress, setRecentProgress] = useState<GamificationProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const progressTimeoutRef = useRef<NodeJS.Timeout>();
  const achievementCheckRef = useRef<NodeJS.Timeout>();
  
  // Initialize data
  const initializeGamification = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const [statsResponse, achievementsResponse] = await Promise.all([
      //   fetch('/api/admin/gamification/stats'),
      //   fetch('/api/admin/gamification/achievements')
      // ]);
      
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      setAdminStats(MOCK_ADMIN_STATS);
      setAchievements(MOCK_ACHIEVEMENTS);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize gamification:', err);
      setError('Failed to load gamification data');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Update progress
  const updateProgress = useCallback(async (
    action: string, 
    metadata?: any
  ): Promise<GamificationProgress> => {
    try {
      // Calculate XP gained
      const xpGained = XP_REWARDS[action as keyof typeof XP_REWARDS] || 10;
      const pointsGained = calculatePoints(xpGained);
      
      // Update admin stats
      if (adminStats) {
        const newXP = adminStats.currentXP + xpGained;
        const newPoints = adminStats.totalPoints + pointsGained;
        const levelInfo = calculateLevel(newXP);
        
        // Check for level up
        const leveledUp = levelInfo.level > adminStats.level;
        
        // Update streak if applicable
        let newStreak = adminStats.streak;
        if (action === 'exercise_created') {
          const isConsecutive = isStreakActive(adminStats.lastActivityDate);
          newStreak = isConsecutive ? adminStats.streak + 1 : 1;
        }
        
        const updatedStats: AdminStats = {
          ...adminStats,
          level: levelInfo.level,
          currentXP: newXP,
          nextLevelXP: levelInfo.nextLevelXP,
          totalPoints: newPoints,
          streak: newStreak,
          longestStreak: Math.max(adminStats.longestStreak, newStreak),
          lastActivityDate: new Date().toISOString(),
          // Update specific counters based on action
          ...(action === 'exercise_created' && { 
            totalExercisesCreated: adminStats.totalExercisesCreated + 1 
          }),
          ...(action === 'video_uploaded' && { 
            totalVideosUploaded: adminStats.totalVideosUploaded + 1 
          })
        };
        
        setAdminStats(updatedStats);
        
        // Create progress entry
        const progress: GamificationProgress = {
          action,
          xpGained,
          pointsGained,
          newLevel: leveledUp ? levelInfo.level : undefined,
          timestamp: new Date().toISOString()
        };
        
        setRecentProgress(prev => [progress, ...prev.slice(0, 9)]); // Keep last 10
        
        // Show level up notification
        if (leveledUp) {
          toast({
            title: "Level Up! 🎉",
            description: `Congratulations! You've reached Level ${levelInfo.level}!`,
            variant: "success",
          });
        }
        
        // TODO: Send update to API
        // await fetch('/api/admin/gamification/progress', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ action, metadata, progress })
        // });
        
        return progress;
      }
      
      throw new Error('Admin stats not available');
    } catch (err) {
      console.error('Failed to update progress:', err);
      throw err;
    }
  }, [adminStats, toast]);
  
  // Unlock achievement
  const unlockAchievement = useCallback(async (action: string): Promise<AdminAchievement[]> => {
    try {
      if (!adminStats) return [];
      
      const newlyUnlocked: AdminAchievement[] = [];
      
      // Check each achievement
      const updatedAchievements = achievements.map(achievement => {
        if (achievement.isUnlocked) return achievement;
        
        // Check if conditions are met
        let progress = 0;
        let shouldUnlock = false;
        
        switch (achievement.condition.type) {
          case 'exercise_created':
            progress = (adminStats.totalExercisesCreated / achievement.condition.threshold) * 100;
            shouldUnlock = adminStats.totalExercisesCreated >= achievement.condition.threshold;
            break;
          case 'video_uploaded':
            progress = (adminStats.totalVideosUploaded / achievement.condition.threshold) * 100;
            shouldUnlock = adminStats.totalVideosUploaded >= achievement.condition.threshold;
            break;
          case 'quality_score':
            progress = (adminStats.avgQualityScore / achievement.condition.threshold) * 100;
            shouldUnlock = adminStats.avgQualityScore >= achievement.condition.threshold;
            break;
          case 'user_engagement':
            progress = (adminStats.userEngagementScore / achievement.condition.threshold) * 100;
            shouldUnlock = adminStats.userEngagementScore >= achievement.condition.threshold;
            break;
          case 'streak':
            progress = (adminStats.streak / achievement.condition.threshold) * 100;
            shouldUnlock = adminStats.streak >= achievement.condition.threshold;
            break;
        }
        
        const updatedAchievement = {
          ...achievement,
          progress: Math.min(100, Math.max(0, progress))
        };
        
        if (shouldUnlock && !achievement.isUnlocked) {
          updatedAchievement.isUnlocked = true;
          updatedAchievement.unlockedAt = new Date().toISOString();
          updatedAchievement.isNew = true;
          newlyUnlocked.push(updatedAchievement);
        }
        
        return updatedAchievement;
      });
      
      setAchievements(updatedAchievements);
      
      // Add points for unlocked achievements
      if (newlyUnlocked.length > 0 && adminStats) {
        const bonusPoints = newlyUnlocked.reduce((sum, ach) => sum + ach.pointValue, 0);
        setAdminStats(prev => prev ? {
          ...prev,
          totalPoints: prev.totalPoints + bonusPoints
        } : null);
        
        // Show achievement notifications
        newlyUnlocked.forEach(achievement => {
          setTimeout(() => {
            toast({
              title: `Achievement Unlocked! ${achievement.icon}`,
              description: `${achievement.name}: ${achievement.description}`,
              variant: "success",
            });
          }, 500);
        });
      }
      
      // TODO: Send to API
      // if (newlyUnlocked.length > 0) {
      //   await fetch('/api/admin/gamification/achievements/unlock', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ achievements: newlyUnlocked.map(a => a.id) })
      //   });
      // }
      
      return newlyUnlocked;
    } catch (err) {
      console.error('Failed to unlock achievements:', err);
      return [];
    }
  }, [adminStats, achievements, toast]);
  
  // Refresh stats
  const refreshStats = useCallback(async () => {
    await initializeGamification();
  }, [initializeGamification]);
  
  // Reset streak
  const resetStreak = useCallback(async () => {
    if (adminStats) {
      setAdminStats(prev => prev ? { ...prev, streak: 0 } : null);
      
      // TODO: Send to API
      // await fetch('/api/admin/gamification/streak/reset', { method: 'POST' });
    }
  }, [adminStats]);
  
  // Calculate next level
  const calculateNextLevel = useCallback((currentXP: number) => {
    return calculateLevel(currentXP);
  }, []);
  
  // Get available achievements (not yet unlocked)
  const availableAchievements = achievements.filter(a => !a.isUnlocked);
  
  // Initialize on mount
  useEffect(() => {
    initializeGamification();
  }, [initializeGamification]);
  
  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
      if (achievementCheckRef.current) {
        clearTimeout(achievementCheckRef.current);
      }
    };
  }, []);
  
  return {
    adminStats,
    achievements,
    availableAchievements,
    recentProgress,
    isLoading,
    error,
    updateProgress,
    unlockAchievement,
    refreshStats,
    resetStreak,
    calculateNextLevel
  };
};

export default useExerciseGamification;
