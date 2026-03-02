/**
 * SwanStudios Gamification -- Logarithmic Leveling System
 * =======================================================
 * Based on Octalysis Framework + Self-Determination Theory
 *
 * Architecture:
 * ```
 *   totalPoints --> calculateLevel() --> level
 *   level       --> getTier()         --> tier key
 *   tier key    --> getTierDisplay()   --> { name, emoji, color }
 *   totalPoints --> getLevelProgress() --> full progress snapshot
 * ```
 *
 * Tier Progression:
 *   Bronze Forge       (Levels  1-10)   - Onboarding & first wins
 *   Silver Edge        (Levels 11-25)   - Building consistency
 *   Titanium Core      (Levels 26-50)   - Intermediate mastery
 *   Obsidian Warrior   (Levels 51-99)   - Advanced dedication
 *   Crystalline Swan   (Level 100)      - Legendary status
 *
 * Formula:  Level  = floor(0.1 * sqrt(totalPoints))
 * Inverse:  Points = ceil((level / 0.1)^2)
 *
 * Sample progression:
 *   Level  1  =       100 pts
 *   Level  5  =     2,500 pts
 *   Level 10  =    10,000 pts
 *   Level 25  =    62,500 pts
 *   Level 50  =   250,000 pts
 *   Level 100 = 1,000,000 pts
 */

// ---------------------------------------------------------------------------
// Core leveling functions
// ---------------------------------------------------------------------------

/**
 * Calculate the player level from a total point balance.
 * @param {number} totalPoints - Cumulative XP earned
 * @returns {number} Current level (0+)
 */
export function calculateLevel(totalPoints) {
  if (totalPoints <= 0) return 0;
  return Math.floor(0.1 * Math.sqrt(totalPoints));
}

/**
 * Return the minimum total points required to reach a given level.
 * @param {number} level - Target level
 * @returns {number} Points threshold (ceiling to avoid float gaps)
 */
export function pointsForLevel(level) {
  if (level <= 0) return 0;
  return Math.ceil(Math.pow(level / 0.1, 2));
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

/**
 * Map a numeric level to its tier key.
 * @param {number} level
 * @returns {string} Tier key (snake_case)
 */
export function getTier(level) {
  if (level >= 100) return 'crystalline_swan';
  if (level >= 51)  return 'obsidian_warrior';
  if (level >= 26)  return 'titanium_core';
  if (level >= 11)  return 'silver_edge';
  return 'bronze_forge';
}

/**
 * Return display metadata for a tier key.
 * @param {string} tier - One of the tier keys from getTier()
 * @returns {{ name: string, emoji: string, color: string }}
 */
export function getTierDisplay(tier) {
  const map = {
    bronze_forge:     { name: 'Bronze Forge',      emoji: '\u{1F528}', color: '#CD7F32' },
    silver_edge:      { name: 'Silver Edge',        emoji: '\u{2694}\uFE0F', color: '#C0C0C0' },
    titanium_core:    { name: 'Titanium Core',      emoji: '\u{1F6E1}\uFE0F', color: '#878681' },
    obsidian_warrior: { name: 'Obsidian Warrior',   emoji: '\u{26AB}', color: '#3D3D3D' },
    crystalline_swan: { name: 'Crystalline Swan',   emoji: '\u{1F9A2}', color: '#60C0F0' },
  };
  return map[tier] || map.bronze_forge;
}

// ---------------------------------------------------------------------------
// Composite progress snapshot
// ---------------------------------------------------------------------------

/**
 * Build a full progress object for a player's current point total.
 * Useful for rendering XP bars, tier badges, and "next level" hints.
 *
 * @param {number} totalPoints
 * @returns {{
 *   level: number,
 *   tier: string,
 *   tierDisplay: { name: string, emoji: string, color: string },
 *   currentPoints: number,
 *   pointsIntoLevel: number,
 *   pointsNeededForNext: number,
 *   progressPercent: number,
 *   nextLevelAt: number
 * }}
 */
export function getLevelProgress(totalPoints) {
  const currentLevel       = calculateLevel(totalPoints);
  const currentLevelPoints = pointsForLevel(currentLevel);
  const nextLevelPoints    = pointsForLevel(currentLevel + 1);
  const pointsIntoLevel    = totalPoints - currentLevelPoints;
  const pointsNeededForNext = nextLevelPoints - currentLevelPoints;

  return {
    level:              currentLevel,
    tier:               getTier(currentLevel),
    tierDisplay:        getTierDisplay(getTier(currentLevel)),
    currentPoints:      totalPoints,
    pointsIntoLevel,
    pointsNeededForNext,
    progressPercent:    pointsNeededForNext > 0
      ? Math.min(100, (pointsIntoLevel / pointsNeededForNext) * 100)
      : 100,
    nextLevelAt:        nextLevelPoints,
  };
}

// ---------------------------------------------------------------------------
// Points configuration -- canonical XP values for trackable actions
// ---------------------------------------------------------------------------

export const POINTS_CONFIG = {
  // Workouts
  completeWorkout:     50,
  personalRecord:      100,
  completeAssessment:  75,

  // Social
  createPost:          10,
  receiveLike:         5,
  addComment:          5,
  followUser:          5,

  // Streaks
  dailyLogin:          10,
  streakBonus3Day:     25,
  streakBonus7Day:     75,
  streakBonus30Day:    300,
  streakBonus90Day:    1000,
  streakBonus365Day:   5000,

  // Education
  completeModule:      50,
  watchTutorial:       15,

  // Holistic wellness
  logNutrition:        15,
  logRecovery:         15,
  logMeditation:       20,
  logSleep:            10,
};

// ---------------------------------------------------------------------------
// Default export (convenience for CommonJS-style consumers)
// ---------------------------------------------------------------------------

export default {
  calculateLevel,
  pointsForLevel,
  getTier,
  getTierDisplay,
  getLevelProgress,
  POINTS_CONFIG,
};
