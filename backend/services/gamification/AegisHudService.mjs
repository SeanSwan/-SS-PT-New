/**
 * ============================================================================
 * FILE: AegisHudService.mjs
 * PURPOSE: Aegis HUD needs calculation - decay on read, replenish on action.
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the five RPG needs bars: Athletic Power,
 * Recovery, Social Energy, Mental Discipline, and Vitality.
 *
 * HOW IT FITS IN THE APP: Called by gamificationController for Aegis HUD
 * endpoints. Also called by GamificationEngine after point awards to
 * auto-replenish relevant needs.
 */

import {
  ACTION_REPLENISH,
  MOODLETS,
  NEED_CONFIG,
  calculateMoodlet,
} from './aegisHudConfig.mjs';
import {
  clampNeedValue,
  getElapsedHours,
  normalizeNeedsState,
  persistAegisUpdate,
  roundNeedValue,
  toFiniteNumber,
} from './aegisHudState.mjs';

class AegisHudService {
  /**
   * Get the current needs state with decay applied.
   * Reads needsState from Gamification record, applies time-based decay,
   * persists the updated values, and returns the result.
   */
  static async getNeeds(gamificationRecord, updateOptions = {}) {
    if (!gamificationRecord) return this.getDefaultNeeds();

    const now = new Date();
    const needsState = normalizeNeedsState(gamificationRecord.needsState, now);
    const nowIso = now.toISOString();
    const updatedNeeds = {};
    const needValues = {};

    for (const [key, config] of Object.entries(NEED_CONFIG)) {
      const need = needsState[key];
      const decayAmount = getElapsedHours(now, need) * config.decayPerHour;
      const currentValue = roundNeedValue(clampNeedValue(need.value - decayAmount, config));

      updatedNeeds[key] = {
        value: currentValue,
        lastUpdated: nowIso,
      };
      needValues[key] = currentValue;
    }

    const moodlet = calculateMoodlet(needValues);

    await persistAegisUpdate(gamificationRecord, {
      needsState: updatedNeeds,
      lastNeedsCalculation: now,
      currentMoodlet: moodlet,
    }, updateOptions, 'needs decay');

    return this.formatResponse(updatedNeeds, moodlet, gamificationRecord);
  }

  /**
   * Replenish needs based on a user action.
   * Called after gamification point awards.
   */
  static async replenishFromAction(gamificationRecord, actionType, updateOptions = {}) {
    if (!gamificationRecord) return null;

    const replenishMap = ACTION_REPLENISH[actionType];
    if (!replenishMap) return null;

    const now = new Date();
    const needsState = normalizeNeedsState(gamificationRecord.needsState, now);
    const nowIso = now.toISOString();
    const updatedNeeds = {};

    for (const [key, config] of Object.entries(NEED_CONFIG)) {
      const need = needsState[key];
      const decayedValue = roundNeedValue(clampNeedValue(
        need.value - (getElapsedHours(now, need) * config.decayPerHour),
        config
      ));
      const replenishAmount = toFiniteNumber(replenishMap[key], 0);

      updatedNeeds[key] = {
        value: roundNeedValue(clampNeedValue(decayedValue + replenishAmount, config)),
        lastUpdated: nowIso,
      };
    }

    const needValues = {};
    for (const key of Object.keys(NEED_CONFIG)) {
      needValues[key] = updatedNeeds[key].value;
    }
    const moodlet = calculateMoodlet(needValues);

    await persistAegisUpdate(gamificationRecord, {
      needsState: updatedNeeds,
      lastNeedsCalculation: now,
      currentMoodlet: moodlet,
    }, updateOptions, 'replenishment');

    return this.formatResponse(updatedNeeds, moodlet, gamificationRecord);
  }

  /**
   * Manually set a specific need value (admin override).
   */
  static async setNeed(gamificationRecord, needKey, value, updateOptions = {}) {
    if (!NEED_CONFIG[needKey]) throw new Error(`Invalid need key: ${needKey}`);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Need value must be 0-100');

    const now = new Date();
    const updatedNeeds = normalizeNeedsState(gamificationRecord.needsState, now);
    updatedNeeds[needKey] = {
      value: roundNeedValue(clampNeedValue(value, NEED_CONFIG[needKey])),
      lastUpdated: now.toISOString(),
    };

    const needValues = {};
    for (const key of Object.keys(NEED_CONFIG)) {
      needValues[key] = updatedNeeds[key].value;
    }
    const moodlet = calculateMoodlet(needValues);

    await persistAegisUpdate(gamificationRecord, {
      needsState: updatedNeeds,
      currentMoodlet: moodlet,
      lastNeedsCalculation: now,
    }, updateOptions, 'admin need override');

    return this.formatResponse(updatedNeeds, moodlet, gamificationRecord);
  }

  static getDefaultNeedsState() {
    const now = new Date().toISOString();
    return {
      athletic: { value: 50, lastUpdated: now },
      recovery: { value: 50, lastUpdated: now },
      social: { value: 50, lastUpdated: now },
      discipline: { value: 50, lastUpdated: now },
      vitality: { value: 50, lastUpdated: now },
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

  static formatResponse(rawNeedsState, moodletId, gamificationRecord) {
    const moodletDef = MOODLETS.find((moodlet) => moodlet.id === moodletId)
      || MOODLETS[MOODLETS.length - 1];
    const needsState = normalizeNeedsState(rawNeedsState);

    const needs = Object.entries(NEED_CONFIG).map(([key, config]) => ({
      key,
      label: config.label,
      icon: config.icon,
      value: needsState[key].value,
      maxValue: config.maxValue,
      color: config.color,
      decayRate: config.decayPerHour,
      lastUpdated: needsState[key].lastUpdated,
    }));

    const overallHealth = Math.round(
      (needs.reduce((sum, need) => sum + need.value, 0) / needs.length) * 10
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
