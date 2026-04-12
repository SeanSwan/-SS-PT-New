/**
 * ============================================================================
 * FILE: CompanionPetService.mjs
 * PURPOSE: Tamagotchi companion pet — evolution, health, mood, appearance
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the virtual pet lifecycle. Pet health is derived
 * from Aegis HUD needs (no separate decay). Activity feeds pet evolution.
 * Neglect causes visual degradation visible on social feed.
 *
 * HOW IT FITS IN THE APP:
 *   AegisHudService (needs) → CompanionPetService (pet state) → Frontend SVG
 *   Workout logged → replenish needs → pet health recalculated → pet evolves
 */
import logger from '../../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Species Configuration
// PURPOSE: 5 species with unique visual traits and stat affinities
// ─────────────────────────────────────────────────────────────

export const PET_SPECIES = {
  crystal_dragon: {
    name: 'Crystal Dragon',
    element: 'ice',
    affinity: 'athletic',     // Grows fastest from workouts
    baseColor: '#60C0F0',
    accentColor: '#8B5CF6',
    description: 'A fierce dragon forged from crystalline ice. Thrives on physical challenge.',
  },
  iron_wolf: {
    name: 'Iron Wolf',
    element: 'steel',
    affinity: 'discipline',   // Grows fastest from streaks
    baseColor: '#C0C0C0',
    accentColor: '#878681',
    description: 'A loyal wolf with iron resolve. Rewards consistency above all.',
  },
  ember_phoenix: {
    name: 'Ember Phoenix',
    element: 'fire',
    affinity: 'vitality',     // Grows fastest from nutrition/sleep
    baseColor: '#F59E0B',
    accentColor: '#EF4444',
    description: 'A phoenix reborn from ember. Fueled by recovery and self-care.',
  },
  frost_swan: {
    name: 'Frost Swan',
    element: 'frost',
    affinity: 'recovery',     // Grows fastest from rest days + stretching
    baseColor: '#E0ECF4',
    accentColor: '#60C0F0',
    description: 'A graceful swan of living frost. Elegant strength through balance.',
  },
  shadow_panther: {
    name: 'Shadow Panther',
    element: 'shadow',
    affinity: 'social',       // Grows fastest from social interactions
    baseColor: '#8B5CF6',
    accentColor: '#C6A84B',
    description: 'A sleek panther of shadow and gold. Draws power from community.',
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Evolution Stages
// PURPOSE: 6 stages — pet visually evolves as user progresses
// ─────────────────────────────────────────────────────────────

export const EVOLUTION_STAGES = [
  { stage: 0, name: 'Egg',        minLevel: 0,  bodyScale: 0.5,  features: [] },
  { stage: 1, name: 'Hatchling',  minLevel: 1,  bodyScale: 0.65, features: ['eyes', 'body'] },
  { stage: 2, name: 'Juvenile',   minLevel: 5,  bodyScale: 0.8,  features: ['eyes', 'body', 'tail'] },
  { stage: 3, name: 'Adult',      minLevel: 15, bodyScale: 1.0,  features: ['eyes', 'body', 'tail', 'wings'] },
  { stage: 4, name: 'Elder',      minLevel: 30, bodyScale: 1.1,  features: ['eyes', 'body', 'tail', 'wings', 'crown'] },
  { stage: 5, name: 'Mythic',     minLevel: 60, bodyScale: 1.2,  features: ['eyes', 'body', 'tail', 'wings', 'crown', 'aura'] },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Mood Mapping
// PURPOSE: Map Aegis HUD average needs to pet mood + visual state
// ─────────────────────────────────────────────────────────────

const PET_MOODS = [
  { id: 'ecstatic',   minAvg: 85, emoji: '✨', animation: 'bounce',  description: 'Radiating joy' },
  { id: 'happy',      minAvg: 70, emoji: '😊', animation: 'wiggle',  description: 'Content and healthy' },
  { id: 'content',    minAvg: 55, emoji: '🙂', animation: 'idle',    description: 'Doing okay' },
  { id: 'tired',      minAvg: 40, emoji: '😐', animation: 'droop',   description: 'Needs attention' },
  { id: 'sad',        minAvg: 25, emoji: '😢', animation: 'shiver',  description: 'Feeling neglected' },
  { id: 'critical',   minAvg: 0,  emoji: '💀', animation: 'flicker', description: 'Fading away...' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Appearance Modifiers
// PURPOSE: Activity types grant visual upgrades to the pet
// ─────────────────────────────────────────────────────────────

const APPEARANCE_TRIGGERS = {
  // Strength workouts → armor pieces
  strength_workouts:  { thresholds: [5, 20, 50, 100], mods: ['iron_plates', 'steel_armor', 'crystal_armor', 'mythic_armor'] },
  // Cardio workouts → speed features
  cardio_workouts:    { thresholds: [5, 20, 50, 100], mods: ['speed_lines', 'wind_trail', 'lightning_wings', 'sonic_aura'] },
  // Streak days → glow effects
  streak_days:        { thresholds: [7, 30, 90, 365], mods: ['faint_glow', 'steady_glow', 'bright_aura', 'legendary_flame'] },
  // Social interactions → accessories
  social_actions:     { thresholds: [10, 50, 100, 200], mods: ['collar', 'cape', 'crown_jewel', 'royal_mantle'] },
  // Personal records → weapon upgrades
  personal_records:   { thresholds: [1, 5, 15, 30], mods: ['small_blade', 'longsword', 'crystal_lance', 'mythic_weapon'] },
};

const PET_STATE_ATTRIBUTES = ['petSpecies', 'petName', 'petState', 'petInventory', 'needsState', 'level'];

// ─────────────────────────────────────────────────────────────
// SECTION: Service Class
// ─────────────────────────────────────────────────────────────

export class CompanionPetService {

  /**
   * Adopt a new pet for a user
   */
  static async adoptPet(userId, species, petName) {
    if (!userId || typeof userId !== 'number') throw new Error('Invalid userId');
    if (!petName || typeof petName !== 'string') throw new Error('Invalid pet name');
    const { default: Gamification } = await import('../../models/Gamification.mjs');

    if (!PET_SPECIES[species]) {
      throw new Error(`Invalid species: ${species}. Choose: ${Object.keys(PET_SPECIES).join(', ')}`);
    }

    // Transaction + row lock prevents duplicate pet adoption from concurrent requests
    const sequelize = Gamification.sequelize;
    const transaction = await sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw new Error('Gamification record not found');

      if (record.petSpecies) {
        throw new Error('User already has a pet. Release current pet first.');
      }

      const initialState = {
        evolutionStage: 0,
        health: 80,
        mood: 'content',
        happiness: 60,
        birthDate: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        appearanceMods: [],
        activityCounters: {
          strength_workouts: 0,
          cardio_workouts: 0,
          streak_days: 0,
          social_actions: 0,
          personal_records: 0,
        },
        totalInteractions: 0,
      };

      await record.update({
        petSpecies: species,
        petName: petName || PET_SPECIES[species].name,
        petState: initialState,
        petInventory: { unlockedMods: [], equippedMods: [] },
      }, { transaction });

      await transaction.commit();
      logger.info(`Pet adopted: ${species} "${petName}" for user ${userId}`);

      return this.getPetData(userId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Get full pet state with health derived from Aegis HUD needs
   */
  static async getPetData(userId) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId }, attributes: PET_STATE_ATTRIBUTES });

    if (!record || !record.petSpecies) {
      return { hasPet: false, pet: null };
    }

    const state = record.petState || {};
    const species = PET_SPECIES[record.petSpecies] || PET_SPECIES.crystal_dragon;
    const level = record.level || 1;

    // Derive health from Aegis HUD needs
    const health = this._calculateHealthFromNeeds(record.needsState);

    // Determine evolution stage from level
    const evolution = this._getEvolutionStage(level);

    // Determine mood from health + happiness
    const avgWellbeing = (health + (state.happiness || 50)) / 2;
    const mood = this._getMood(avgWellbeing);

    // Calculate appearance modifiers
    const appearanceMods = this._getActiveAppearanceMods(state.activityCounters || {});

    // Time since last interaction (for neglect visuals)
    const hoursSinceInteraction = state.lastInteraction
      ? (Date.now() - new Date(state.lastInteraction).getTime()) / 3600000
      : 0;

    return {
      hasPet: true,
      pet: {
        species: record.petSpecies,
        speciesInfo: species,
        name: record.petName,
        level,
        evolution,
        health: Math.round(health),
        mood,
        happiness: state.happiness || 50,
        birthDate: state.birthDate,
        lastInteraction: state.lastInteraction,
        hoursSinceInteraction: Math.round(hoursSinceInteraction),
        appearanceMods,
        equippedMods: (record.petInventory?.equippedMods) || [],
        unlockedMods: (record.petInventory?.unlockedMods) || [],
        activityCounters: state.activityCounters || {},
        totalInteractions: state.totalInteractions || 0,
      },
    };
  }

  /**
   * Record an activity that affects pet state
   */
  static async recordActivity(userId, activityType, amount = 1) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId } });

    if (!record || !record.petSpecies) return null;

    const state = { ...record.petState };
    const inventory = { ...(record.petInventory || { unlockedMods: [], equippedMods: [] }) };
    const counters = state.activityCounters || {};

    // Increment counter
    const counterKey = activityType;
    if (counters[counterKey] !== undefined) {
      counters[counterKey] = (counters[counterKey] || 0) + amount;
    }

    // Check for newly unlocked appearance mods
    const newUnlocks = [];
    const trigger = APPEARANCE_TRIGGERS[counterKey];
    if (trigger) {
      for (let i = 0; i < trigger.thresholds.length; i++) {
        if (counters[counterKey] >= trigger.thresholds[i]) {
          const mod = trigger.mods[i];
          if (!inventory.unlockedMods.includes(mod)) {
            inventory.unlockedMods.push(mod);
            inventory.equippedMods.push(mod); // Auto-equip on unlock
            newUnlocks.push(mod);
          }
        }
      }
    }

    // Boost happiness from interaction (affinity bonus)
    const species = PET_SPECIES[record.petSpecies];
    const affinityBonus = species && this._activityMatchesAffinity(counterKey, species.affinity) ? 8 : 3;
    state.happiness = Math.min(100, (state.happiness || 50) + affinityBonus);
    state.lastInteraction = new Date().toISOString();
    state.totalInteractions = (state.totalInteractions || 0) + 1;
    state.activityCounters = counters;

    await record.update({ petState: state, petInventory: inventory });

    return { newUnlocks, happiness: state.happiness };
  }

  /**
   * Interact with pet (pet/feed/play) — boosts happiness
   */
  static async interact(userId, interactionType) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId } });

    if (!record || !record.petSpecies) return null;

    const state = { ...record.petState };
    const boosts = { pet: 5, feed: 8, play: 10 };
    const boost = boosts[interactionType] || 5;

    state.happiness = Math.min(100, (state.happiness || 50) + boost);
    state.lastInteraction = new Date().toISOString();
    state.totalInteractions = (state.totalInteractions || 0) + 1;

    await record.update({ petState: state });

    return { happiness: state.happiness, interactionType };
  }

  /**
   * Rename pet
   */
  static async renamePet(userId, newName) {
    if (!userId || typeof userId !== 'number') throw new Error('Invalid userId');
    if (!newName || typeof newName !== 'string') throw new Error('Invalid pet name');
    const safeName = newName.trim().slice(0, 50);
    if (!safeName) throw new Error('Pet name cannot be empty');
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId } });
    if (!record || !record.petSpecies) throw new Error('No pet found');

    await record.update({ petName: safeName });
    return { name: newName.slice(0, 50) };
  }

  /**
   * Release pet (allows adopting a new one)
   */
  static async releasePet(userId) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId } });
    if (!record || !record.petSpecies) throw new Error('No pet found');

    await record.update({
      petSpecies: null,
      petName: null,
      petState: null,
      petInventory: null,
    });

    return { released: true };
  }

  /**
   * Get species catalog for adoption UI
   */
  static getSpeciesCatalog() {
    return Object.entries(PET_SPECIES).map(([id, info]) => ({
      id,
      ...info,
    }));
  }

  /**
   * Get evolution stages config
   */
  static getEvolutionConfig() {
    return { stages: EVOLUTION_STAGES, moods: PET_MOODS, species: this.getSpeciesCatalog() };
  }

  // ─────────────────────────────────────────────────────────────
  // SECTION: Internal Helpers
  // ─────────────────────────────────────────────────────────────

  static _calculateHealthFromNeeds(needsState) {
    if (!needsState) return 50;
    const needs = ['athletic', 'recovery', 'social', 'discipline', 'vitality'];
    let total = 0;
    let count = 0;
    for (const key of needs) {
      if (needsState[key]) {
        total += needsState[key].value || 0;
        count++;
      }
    }
    return count > 0 ? total / count : 50;
  }

  static _getEvolutionStage(level) {
    let current = EVOLUTION_STAGES[0];
    for (const stage of EVOLUTION_STAGES) {
      if (level >= stage.minLevel) current = stage;
    }
    return current;
  }

  static _getMood(avgWellbeing) {
    for (const mood of PET_MOODS) {
      if (avgWellbeing >= mood.minAvg) return mood;
    }
    return PET_MOODS[PET_MOODS.length - 1];
  }

  static _activityMatchesAffinity(activityKey, affinity) {
    const map = {
      strength_workouts: 'athletic',
      cardio_workouts: 'athletic',
      streak_days: 'discipline',
      social_actions: 'social',
      personal_records: 'athletic',
    };
    return map[activityKey] === affinity;
  }

  static _getActiveAppearanceMods(counters) {
    const active = [];
    for (const [key, config] of Object.entries(APPEARANCE_TRIGGERS)) {
      const count = counters[key] || 0;
      // Find highest unlocked tier
      for (let i = config.thresholds.length - 1; i >= 0; i--) {
        if (count >= config.thresholds[i]) {
          active.push({ category: key, mod: config.mods[i], tier: i + 1 });
          break;
        }
      }
    }
    return active;
  }
}

export default CompanionPetService;
