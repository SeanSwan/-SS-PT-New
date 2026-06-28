/**
 * ============================================================================
 * FILE: VaultDecryptionService.mjs
 * PURPOSE: Vault Decryption cosmetic reward reveal system
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages cosmetic vault reveal drops using
 * cryptographically secure RNG. Randomness only affects presentation rewards;
 * XP, streaks, and progression value stay in deterministic ledger services.
 *
 * HOW IT FITS IN THE APP: Called by GamificationEngine after point awards.
 * Frontend displays the "Vault Decryption" animation when a drop occurs.
 */

import crypto from 'crypto';
import {
  getTimestampMs,
  isPlainRecord,
  normalizeVaultDrop,
  toActivityLogArray,
} from './vaultDecryptionState.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Rarity Tiers
// PURPOSE: Drop rates and reward pools per rarity
// ─────────────────────────────────────────────────────────────

const RARITY_TIERS = {
  common: {
    label: 'Common',
    color: '#4070C0',     // Swan Lavender
    glowColor: '#4070C0',
    dropChance: 0.45,     // 45% of drops
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    decryptionTime: 1.5,  // seconds for animation
  },
  rare: {
    label: 'Rare',
    color: '#C6A84B',     // Gilded Fern
    glowColor: '#C6A84B',
    dropChance: 0.30,     // 30% of drops
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    decryptionTime: 2.5,
  },
  epic: {
    label: 'Epic',
    color: '#8B5CF6',     // Wing Purple
    glowColor: '#8B5CF6',
    dropChance: 0.18,     // 18% of drops
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    decryptionTime: 3.5,
  },
  legendary: {
    label: 'Legendary',
    color: '#60C0F0',     // Ice Wing
    glowColor: '#60C0F0',
    dropChance: 0.06,     // 6% of drops
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    decryptionTime: 5.0,
  },
  pearlescent: {
    label: 'Pearlescent',
    color: '#E0ECF4',     // Frost White (animated gradient in UI)
    glowColor: '#E0ECF4',
    dropChance: 0.01,     // 1% of drops
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    decryptionTime: 7.0,
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Loot Tables
// PURPOSE: Reward pools per rarity tier (cosmetic items)
// ─────────────────────────────────────────────────────────────

const LOOT_TABLES = {
  common: [
    { id: 'title_dedicated', type: 'title', name: 'The Dedicated', description: 'Profile title: "The Dedicated"' },
    { id: 'title_rising', type: 'title', name: 'Rising Star', description: 'Profile title: "Rising Star"' },
    { id: 'frame_bronze_leaf', type: 'avatar_frame', name: 'Fern Leaf Frame', description: 'Fern leaf avatar frame' },
    { id: 'emote_flex', type: 'emote', name: 'Flex Emote', description: 'Animated flex reaction' },
    { id: 'emote_fire', type: 'emote', name: 'Fire Emote', description: 'Animated fire reaction' },
    { id: 'banner_forest', type: 'profile_banner', name: 'Frozen Forest Banner', description: 'Profile banner: frozen forest' },
  ],
  rare: [
    { id: 'title_iron_will', type: 'title', name: 'Iron Will', description: 'Profile title: "Iron Will"' },
    { id: 'title_swan_disciple', type: 'title', name: 'Swan Disciple', description: 'Profile title: "Swan Disciple"' },
    { id: 'frame_gilded_vine', type: 'avatar_frame', name: 'Gilded Vine Frame', description: 'Gilded vine avatar frame' },
    { id: 'emote_thunder', type: 'emote', name: 'Thunder Emote', description: 'Animated thunder clap reaction' },
    { id: 'banner_sapphire', type: 'profile_banner', name: 'Sapphire Depths Banner', description: 'Profile banner: sapphire ocean' },
    { id: 'badge_sapphire_spark', type: 'badge', name: 'Sapphire Spark Badge', description: 'Profile badge: sapphire spark' },
  ],
  epic: [
    { id: 'title_apex_predator', type: 'title', name: 'Apex Predator', description: 'Profile title: "Apex Predator"' },
    { id: 'title_crystalline', type: 'title', name: 'Crystalline', description: 'Profile title: "Crystalline"' },
    { id: 'frame_purple_aurora', type: 'avatar_frame', name: 'Purple Aurora Frame', description: 'Animated purple aurora frame' },
    { id: 'emote_swan_dive', type: 'emote', name: 'Swan Dive', description: 'Animated swan dive celebration' },
    { id: 'banner_aurora', type: 'profile_banner', name: 'Aurora Borealis Banner', description: 'Animated aurora banner' },
    { id: 'badge_aurora_edge', type: 'badge', name: 'Aurora Edge Badge', description: 'Animated aurora badge' },
    { id: 'banner_crystal_wake', type: 'profile_banner', name: 'Crystal Wake Banner', description: 'Profile banner: crystalline wake' },
  ],
  legendary: [
    { id: 'title_obsidian_warrior', type: 'title', name: 'Frostwing Aegis', description: 'Profile title: "Frostwing Aegis"' },
    { id: 'frame_ice_crystal', type: 'avatar_frame', name: 'Ice Crystal Frame', description: 'Animated crystalline ice frame' },
    { id: 'emote_legendary_roar', type: 'emote', name: 'Legendary Roar', description: 'Full-screen legendary celebration' },
    { id: 'banner_void', type: 'profile_banner', name: 'Void Crystal Banner', description: 'Animated void crystal banner' },
    { id: 'badge_obsidian_crown', type: 'badge', name: 'Obsidian Crown Badge', description: 'Animated obsidian crown badge' },
    { id: 'banner_swan_summit', type: 'profile_banner', name: 'Swan Summit Banner', description: 'Profile banner: summit lights' },
  ],
  pearlescent: [
    { id: 'title_crystalline_swan', type: 'title', name: 'Grand Crystalline Swan', description: 'Profile title: "Grand Crystalline Swan" — rarest title' },
    { id: 'frame_pearlescent', type: 'avatar_frame', name: 'Pearlescent Frame', description: 'Animated pearlescent shimmer frame' },
    { id: 'banner_nebula', type: 'profile_banner', name: 'Nebula Crown Banner', description: 'Animated cosmic nebula banner' },
    { id: 'emote_prismatic_salute', type: 'emote', name: 'Prismatic Salute', description: 'Full-screen prismatic celebration' },
    { id: 'exclusive_badge', type: 'badge', name: 'Pearlescent Swan Badge', description: 'Ultra-rare animated badge' },
  ],
};

// ─────────────────────────────────────────────────────────────
// SECTION: Drop Triggers
// PURPOSE: Which actions can trigger a loot drop and their base chance
// ─────────────────────────────────────────────────────────────

const DROP_TRIGGERS = {
  workout_completed: { baseChance: 0.35, name: 'Workout Complete' },
  personal_record: { baseChance: 0.65, name: 'Personal Record' },
  streak_maintained: { baseChance: 0.20, name: 'Streak Day' },
  challenge_completed: { baseChance: 0.50, name: 'Challenge Complete' },
  achievement_unlocked: { baseChance: 0.80, name: 'Achievement Unlocked' },
  daily_login: { baseChance: 0.08, name: 'Daily Login' },
  social_post: { baseChance: 0.10, name: 'Social Post' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Core Service
// ─────────────────────────────────────────────────────────────

class VaultDecryptionService {
  /**
   * Roll for a loot drop based on the trigger action.
   * Uses crypto.getRandomValues for fair, secure RNG.
   * @returns {object|null} Drop result or null if no drop
   */
  static rollForDrop(actionType, userId) {
    const trigger = DROP_TRIGGERS[actionType];
    if (!trigger) return null;

    // Roll for whether a drop occurs at all
    const dropRoll = this.secureRandom();
    if (dropRoll > trigger.baseChance) return null;

    // A drop occurred! Roll for rarity
    const rarityRoll = this.secureRandom();
    const rarity = this.determineRarity(rarityRoll);
    const rarityConfig = RARITY_TIERS[rarity];

    // Pick a random item from the loot table
    const lootTable = LOOT_TABLES[rarity];
    const itemIndex = Math.floor(this.secureRandom() * lootTable.length);
    const item = lootTable[itemIndex];

    // Build the drop result
    const drop = {
      id: `drop_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      rarity,
      rarityLabel: rarityConfig.label,
      rarityColor: rarityConfig.color,
      glowColor: rarityConfig.glowColor,
      decryptionTime: rarityConfig.decryptionTime,
      xpBonus: 0,
      rewardMode: 'cosmetic_only',
      item: {
        ...item,
        rarity,
      },
      trigger: trigger.name,
      actionType,
      timestamp: new Date().toISOString(),
      // Idempotency key to prevent duplicate processing
      idempotencyKey: `vault_${userId}_${actionType}_${new Date().toISOString().slice(0, 13)}`,
    };

    return drop;
  }

  /**
   * Determine rarity from a 0-1 roll using cumulative probability.
   */
  static determineRarity(roll) {
    let cumulative = 0;
    for (const [rarity, config] of Object.entries(RARITY_TIERS)) {
      cumulative += config.dropChance;
      if (roll <= cumulative) return rarity;
    }
    return 'common'; // Fallback
  }

  /**
   * Cryptographically secure random number between 0 and 1.
   */
  static secureRandom() {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / (0xFFFFFFFF + 1);
  }

  /**
   * Get user's loot inventory (stored in Gamification.activityLog or dedicated field).
   * For MVP, we store drops in the gamification record's JSON field.
   */
  static async getUserInventory(gamificationRecord) {
    const activityLog = toActivityLogArray(gamificationRecord?.activityLog);
    return activityLog
      .filter(entry => entry.type === 'vault_drop' && isPlainRecord(entry.drop))
      .map(entry => normalizeVaultDrop(entry.drop, RARITY_TIERS))
      .filter(Boolean)
      .sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp));
  }

  /**
   * Record a drop in the user's activity log.
   */
  static async recordDrop(gamificationRecord, drop, options = {}) {
    if (!gamificationRecord || !isPlainRecord(drop)) return null;

    const activityLog = toActivityLogArray(gamificationRecord.activityLog);
    const safeDrop = normalizeVaultDrop(drop, RARITY_TIERS, new Date().toISOString());
    if (!safeDrop) return null;
    const { timestamp } = safeDrop;
    activityLog.push({
      type: 'vault_drop',
      drop: safeDrop,
      timestamp,
    });

    // Keep last 100 activity log entries
    const trimmedLog = activityLog.slice(-100);

    await gamificationRecord.update({ activityLog: trimmedLog }, options);

    return safeDrop;
  }

  /**
   * Get loot table configuration for the frontend.
   */
  static getConfig() {
    return {
      rarityTiers: RARITY_TIERS,
      dropTriggers: Object.entries(DROP_TRIGGERS).map(([key, config]) => ({
        actionType: key,
        ...config,
      })),
      // Don't expose full loot tables — just item counts per rarity
      lootCounts: Object.entries(LOOT_TABLES).reduce((acc, [rarity, items]) => {
        acc[rarity] = items.length;
        return acc;
      }, {}),
    };
  }
}

export { VaultDecryptionService, RARITY_TIERS, LOOT_TABLES, DROP_TRIGGERS };
export default VaultDecryptionService;
