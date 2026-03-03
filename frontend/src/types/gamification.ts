/**
 * Gamification System Types
 * =========================
 * Shared type definitions for the SwanStudios gamification system.
 * Mirrors the backend tier/level/achievement models so the frontend
 * can render progress data and compute level previews client-side.
 *
 * Architecture:
 *   Backend (Sequelize) -> REST API -> These types -> React Query hooks -> UI
 *
 * Tier ladder:  bronze_forge (1-10) -> silver_edge (11-25) -> titanium_core (26-50)
 *               -> obsidian_warrior (51-99) -> crystalline_swan (100+)
 *
 * Level formula:  level = floor(0.1 * sqrt(totalPoints))
 */

// ===== Tier System =====

export type TierName =
  | 'bronze_forge'
  | 'silver_edge'
  | 'titanium_core'
  | 'obsidian_warrior'
  | 'crystalline_swan';

export interface TierDisplay {
  name: string;       // "Bronze Forge"
  emoji: string;      // "🔨"
  color: string;      // "#CD7F32"
  levelRange: string; // "1-10"
}

export const TIER_DISPLAY: Record<TierName, TierDisplay> = {
  bronze_forge:      { name: 'Bronze Forge',      emoji: '🔨', color: '#CD7F32', levelRange: '1-10'  },
  silver_edge:       { name: 'Silver Edge',       emoji: '⚔️', color: '#C0C0C0', levelRange: '11-25' },
  titanium_core:     { name: 'Titanium Core',     emoji: '🛡️', color: '#878681', levelRange: '26-50' },
  obsidian_warrior:  { name: 'Obsidian Warrior',  emoji: '⚫', color: '#3D3D3D', levelRange: '51-99' },
  crystalline_swan:  { name: 'Crystalline Swan',  emoji: '🦢', color: '#60C0F0', levelRange: '100'   },
};

// ===== Skill Trees =====

export type SkillTree =
  | 'awakening'
  | 'forge_nasm'
  | 'iron_gravity'
  | 'tribe_social'
  | 'free_spirit'
  | 'unbroken_streaks';

export interface SkillTreeDisplay {
  name: string;
  emoji: string;
  description: string;
  color: string; // Crystalline Swan palette color
}

export const SKILL_TREE_DISPLAY: Record<SkillTree, SkillTreeDisplay> = {
  awakening:        { name: 'The Awakening',  emoji: '🌅', description: 'Onboarding & first steps',   color: '#E0ECF4' },
  forge_nasm:       { name: 'The Forge',      emoji: '🔥', description: 'Education & certification',  color: '#C6A84B' },
  iron_gravity:     { name: 'Iron & Gravity',  emoji: '🏋️', description: 'Workout performance',       color: '#50A0F0' },
  tribe_social:     { name: 'The Tribe',      emoji: '👥', description: 'Community engagement',       color: '#4070C0' },
  free_spirit:      { name: 'The Free Spirit', emoji: '🧘', description: 'Holistic wellness',          color: '#22C55E' },
  unbroken_streaks: { name: 'The Unbroken',   emoji: '🔗', description: 'Consistency & dedication',   color: '#60C0F0' },
};

// ===== Rarity =====

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#4070C0',   // Swan Lavender
  rare:      '#C6A84B',   // Gilded Fern
  epic:      '#60C0F0',   // Ice Wing
  legendary: 'linear-gradient(135deg, #002060, #60C0F0, #C6A84B)', // Animated
};

// ===== Achievement =====

export interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  iconEmoji: string;
  iconUrl?: string;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special';
  rarity: Rarity;
  xpReward: number;
  requiredPoints: number;
  maxProgress: number;
  skillTree: SkillTree;
  skillTreeOrder: number;
  templateId: string;
  tierLevel: number;
  isHidden: boolean;
  isSecret: boolean;
  difficulty: number; // 1-5 (INTEGER, matches backend model)
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  earnedAt: string | null;
  xpAwarded: number;
  pointsAwarded: number;
  achievement: Achievement; // Joined data
}

// ===== Level Progress =====

export interface LevelProgress {
  level: number;
  tier: TierName;
  tierDisplay: TierDisplay;
  currentPoints: number;
  pointsIntoLevel: number;
  pointsNeededForNext: number;
  progressPercent: number;
  nextLevelAt: number;
}

// ===== Gamification Profile =====

export interface GamificationProfile {
  userId: number;
  level: number;
  tier: TierName;
  points: number;
  levelProgress: LevelProgress;
  stats: {
    totalWorkouts: number;
    streakDays: number;
    totalExercises: number;
    achievementsEarned: number;
    achievementsTotal: number;
  };
  recentAchievements: UserAchievement[];
}

// ===== Frontend Leveling Utilities (mirrors backend formulas) =====

/**
 * Calculate the level for a given total point count.
 * Formula: level = floor(0.1 * sqrt(totalPoints))
 */
export function calculateLevel(totalPoints: number): number {
  if (totalPoints <= 0) return 0;
  return Math.floor(0.1 * Math.sqrt(totalPoints));
}

/**
 * Calculate the minimum total points required to reach a specific level.
 * Inverse of calculateLevel: points = ceil((level / 0.1)^2)
 */
export function pointsForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.ceil(Math.pow(level / 0.1, 2));
}

/**
 * Determine which tier a given level falls into.
 */
export function getTier(level: number): TierName {
  if (level >= 100) return 'crystalline_swan';
  if (level >= 51)  return 'obsidian_warrior';
  if (level >= 26)  return 'titanium_core';
  if (level >= 11)  return 'silver_edge';
  return 'bronze_forge';
}

/**
 * Build a full LevelProgress snapshot from a raw point total.
 * Used for instant client-side previews without waiting for the API.
 */
export function getLevelProgress(totalPoints: number): LevelProgress {
  const level = calculateLevel(totalPoints);
  const tier = getTier(level);
  const currentLevelPoints = pointsForLevel(level);
  const nextLevelPoints = pointsForLevel(level + 1);
  const pointsIntoLevel = totalPoints - currentLevelPoints;
  const pointsNeededForNext = nextLevelPoints - currentLevelPoints;

  return {
    level,
    tier,
    tierDisplay: TIER_DISPLAY[tier],
    currentPoints: totalPoints,
    pointsIntoLevel,
    pointsNeededForNext,
    progressPercent:
      pointsNeededForNext > 0
        ? Math.min(100, (pointsIntoLevel / pointsNeededForNext) * 100)
        : 100,
    nextLevelAt: nextLevelPoints,
  };
}
