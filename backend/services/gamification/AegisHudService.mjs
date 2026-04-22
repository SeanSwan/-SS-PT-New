/**
 * ============================================================================
 * FILE: AegisHudService.mjs
 * PURPOSE: Aegis HUD needs calculation — decay on read, replenish on action
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the 5 RPG needs bars (Athletic Power, Recovery,
 * Social Energy, Mental Discipline, Vitality). Calculates time-based decay on
 * read and replenishes needs when users perform actions.
 *
 * HOW IT FITS IN THE APP: Called by gamificationController for Aegis HUD
 * endpoints. Also called by GamificationEngine after point awards to
 * auto-replenish relevant needs.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Need Definitions
// PURPOSE: Configure each need's decay rate, replenish sources, and thresholds
// ─────────────────────────────────────────────────────────────

const NEED_CONFIG = {
  athletic: {
    label: 'Athletic Power',
    icon: 'dumbbell',
    decayPerHour: 1.2,
    maxValue: 100,
    minValue: 0,
    color: '#8B5CF6', // Wing Purple
  },
  recovery: {
    label: 'Recovery',
    icon: 'heart-pulse',
    decayPerHour: 0.8,
    maxValue: 100,
    minValue: 0,
    color: '#60C0F0', // Ice Wing
  },
  social: {
    label: 'Social Energy',
    icon: 'users',
    decayPerHour: 1.0,
    maxValue: 100,
    minValue: 0,
    color: '#C6A84B', // Gilded Fern
  },
  discipline: {
    label: 'Mental Discipline',
    icon: 'brain',
    decayPerHour: 0.6,
    maxValue: 100,
    minValue: 0,
    color: '#50A0F0', // Arctic Cyan
  },
  vitality: {
    label: 'Vitality',
    icon: 'zap',
    decayPerHour: 0.5,
    maxValue: 100,
    minValue: 0,
    color: '#4070C0', // Swan Lavender
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Action → Need Replenishment Map
// PURPOSE: Defines how much each action replenishes each need
// ─────────────────────────────────────────────────────────────

const ACTION_REPLENISH = {
  workout_completed: {
    athletic: 25,
    recovery: -10,  // Hard workouts drain recovery
    discipline: 10,
    vitality: 15,
  },
  exercise_completed: {
    athletic: 5,
    vitality: 3,
  },
  stretching_completed: {
    recovery: 30,
    athletic: 5,
    vitality: 10,
  },
  social_post: {
    social: 20,
    vitality: 5,
  },
  social_comment: {
    social: 10,
    vitality: 3,
  },
  social_like: {
    social: 5,
  },
  daily_login: {
    vitality: 10,
    discipline: 5,
  },
  streak_maintained: {
    discipline: 15,
    vitality: 5,
  },
  challenge_completed: {
    discipline: 20,
    athletic: 10,
    vitality: 10,
  },
  rest_day: {
    recovery: 35,
    vitality: 15,
  },
  personal_record: {
    athletic: 30,
    discipline: 15,
    vitality: 20,
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Moodlet Calculation
// PURPOSE: Derives a mood badge from the current needs state
// ─────────────────────────────────────────────────────────────

const MOODLETS = [
  { id: 'peak_form', label: 'Peak Form', icon: 'crown', minAvg: 85, priority: 1 },
  { id: 'energized', label: 'Energized', icon: 'zap', condition: (n) => n.athletic >= 80 && n.vitality >= 70, priority: 2 },
  { id: 'social_butterfly', label: 'Social Butterfly', icon: 'sparkles', condition: (n) => n.social >= 80, priority: 3 },
  { id: 'iron_will', label: 'Iron Will', icon: 'shield', condition: (n) => n.discipline >= 80, priority: 4 },
  { id: 'well_rested', label: 'Well Rested', icon: 'moon', condition: (n) => n.recovery >= 80, priority: 5 },
  { id: 'balanced', label: 'Balanced', icon: 'scale', minAvg: 60, priority: 6 },
  { id: 'recovering', label: 'Recovering', icon: 'bandage', condition: (n) => n.recovery < 25, priority: 7 },
  { id: 'drained', label: 'Drained', icon: 'battery-low', condition: (n) => n.vitality < 20, priority: 8 },
  { id: 'hermit', label: 'Hermit Mode', icon: 'ghost', condition: (n) => n.social < 15, priority: 9 },
  { id: 'neutral', label: 'Neutral', icon: 'minus', minAvg: 0, priority: 99 },
];

/**
 * Calculate moodlet from current need values.
 * Returns the highest-priority matching moodlet.
 */
function calculateMoodlet(needValues) {
  const avg = Object.values(needValues).reduce((sum, v) => sum + v, 0) / 5;

  for (const moodlet of MOODLETS) {
    if (moodlet.minAvg !== undefined && avg >= moodlet.minAvg) {
      return moodlet.id;
    }
    if (moodlet.condition && moodlet.condition(needValues)) {
      return moodlet.id;
    }
  }

  return 'neutral';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Core Service
// ─────────────────────────────────────────────────────────────

class AegisHudService {
  /**
   * Get the current needs state with decay applied.
   * Reads needsState from Gamification record, applies time-based decay,
   * persists the updated values, and returns the result.
   */
  static async getNeeds(gamificationRecord) {
    if (!gamificationRecord) return this.getDefaultNeeds();

    const needsState = gamificationRecord.needsState || this.getDefaultNeedsState();
    const now = new Date();

    // Apply decay to each need based on hours elapsed
    const updatedNeeds = {};
    const needValues = {};

    for (const [key, config] of Object.entries(NEED_CONFIG)) {
      const need = needsState[key] || { value: 50, lastUpdated: now.toISOString() };
      const lastUpdated = new Date(need.lastUpdated);
      const hoursElapsed = (now - lastUpdated) / (1000 * 60 * 60);

      // Apply decay (minimum 0)
      const decayAmount = hoursElapsed * config.decayPerHour;
      const currentValue = Math.max(config.minValue, Math.round((need.value - decayAmount) * 10) / 10);

      updatedNeeds[key] = {
        value: currentValue,
        lastUpdated: now.toISOString(),
      };

      needValues[key] = currentValue;
    }

    // Calculate moodlet
    const moodlet = calculateMoodlet(needValues);

    // Persist updated state
    try {
      await gamificationRecord.update({
        needsState: updatedNeeds,
        lastNeedsCalculation: now,
        currentMoodlet: moodlet,
      });
    } catch (err) {
      console.error('[AegisHUD] Failed to persist needs decay:', err.message);
    }

    return this.formatResponse(updatedNeeds, moodlet, gamificationRecord);
  }

  /**
   * Replenish needs based on a user action.
   * Called after gamification point awards.
   */
  static async replenishFromAction(gamificationRecord, actionType) {
    if (!gamificationRecord) return null;

    const replenishMap = ACTION_REPLENISH[actionType];
    if (!replenishMap) return null;

    const needsState = gamificationRecord.needsState || this.getDefaultNeedsState();
    const now = new Date();

    // First apply decay, then add replenishment
    for (const [key, config] of Object.entries(NEED_CONFIG)) {
      const need = needsState[key] || { value: 50, lastUpdated: now.toISOString() };
      const lastUpdated = new Date(need.lastUpdated);
      const hoursElapsed = (now - lastUpdated) / (1000 * 60 * 60);

      // Apply decay
      let currentValue = need.value - (hoursElapsed * config.decayPerHour);

      // Apply replenishment (can be negative for draining actions like hard workouts → recovery)
      const replenishAmount = replenishMap[key] || 0;
      currentValue = Math.max(config.minValue, Math.min(config.maxValue, currentValue + replenishAmount));
      currentValue = Math.round(currentValue * 10) / 10;

      needsState[key] = {
        value: currentValue,
        lastUpdated: now.toISOString(),
      };
    }

    // Calculate moodlet
    const needValues = {};
    for (const key of Object.keys(NEED_CONFIG)) {
      needValues[key] = needsState[key].value;
    }
    const moodlet = calculateMoodlet(needValues);

    // Persist
    try {
      await gamificationRecord.update({
        needsState,
        lastNeedsCalculation: now,
        currentMoodlet: moodlet,
      });
    } catch (err) {
      console.error('[AegisHUD] Failed to persist replenishment:', err.message);
    }

    return this.formatResponse(needsState, moodlet, gamificationRecord);
  }

  /**
   * Manually set a specific need value (admin override).
   */
  static async setNeed(gamificationRecord, needKey, value) {
    if (!NEED_CONFIG[needKey]) throw new Error(`Invalid need key: ${needKey}`);
    if (value < 0 || value > 100) throw new Error('Need value must be 0-100');

    const needsState = gamificationRecord.needsState || this.getDefaultNeedsState();
    needsState[needKey] = {
      value: Math.round(value * 10) / 10,
      lastUpdated: new Date().toISOString(),
    };

    const needValues = {};
    for (const key of Object.keys(NEED_CONFIG)) {
      needValues[key] = needsState[key].value;
    }
    const moodlet = calculateMoodlet(needValues);

    await gamificationRecord.update({
      needsState,
      currentMoodlet: moodlet,
      lastNeedsCalculation: new Date(),
    });

    return this.formatResponse(needsState, moodlet, gamificationRecord);
  }

  // ── Helpers ──

  static getDefaultNeedsState() {
    const now = new Date().toISOString();
    return {
      athletic:   { value: 50, lastUpdated: now },
      recovery:   { value: 50, lastUpdated: now },
      social:     { value: 50, lastUpdated: now },
      discipline: { value: 50, lastUpdated: now },
      vitality:   { value: 50, lastUpdated: now },
    };
  }

  static getDefaultNeeds() {
    const state = this.getDefaultNeedsState();
    return {
      needs: Object.entries(NEED_CONFIG).map(([key, config]) => ({
        key,
        label: config.label,
        icon: config.icon,
        value: state[key].value,
        maxValue: config.maxValue,
        color: config.color,
        decayRate: config.decayPerHour,
        lastUpdated: state[key].lastUpdated,
      })),
      moodlet: { id: 'neutral', label: 'Neutral', icon: 'minus' },
      overallHealth: 50,
    };
  }

  static formatResponse(needsState, moodletId, gamificationRecord) {
    const moodletDef = MOODLETS.find(m => m.id === moodletId) || MOODLETS[MOODLETS.length - 1];

    const needs = Object.entries(NEED_CONFIG).map(([key, config]) => ({
      key,
      label: config.label,
      icon: config.icon,
      value: needsState[key]?.value ?? 50,
      maxValue: config.maxValue,
      color: config.color,
      decayRate: config.decayPerHour,
      lastUpdated: needsState[key]?.lastUpdated,
    }));

    const overallHealth = Math.round(
      needs.reduce((sum, n) => sum + n.value, 0) / needs.length * 10
    ) / 10;

    return {
      needs,
      moodlet: {
        id: moodletDef.id,
        label: moodletDef.label,
        icon: moodletDef.icon,
      },
      overallHealth,
      userId: gamificationRecord?.userId,
      jobClass: gamificationRecord?.jobClass || null,
    };
  }
}

export { AegisHudService, NEED_CONFIG, ACTION_REPLENISH, MOODLETS };
export default AegisHudService;
