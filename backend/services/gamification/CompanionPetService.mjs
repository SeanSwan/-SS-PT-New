/**
 * CompanionPetService
 * ===================
 * Runtime lifecycle and row-locked state mutations for companion pets.
 *
 * Static pet tables live in companionPetConfig.mjs. Persisted JSON guards and
 * pure pet math live in companionPetState.mjs so this service stays focused on
 * database behavior.
 */
import logger from '../../utils/logger.mjs';
import { APPEARANCE_TRIGGERS, EVOLUTION_STAGES, PET_MOODS, PET_SPECIES } from './companionPetConfig.mjs';
import {
  PET_STATE_ATTRIBUTES,
  activityMatchesAffinity,
  calculateHealthFromNeeds,
  clampPetStat,
  getActiveAppearanceMods,
  getEvolutionStage,
  getMood,
  normalizeActivityAmount,
  normalizeActivityCounters,
  normalizePetState,
  toPetNumber,
} from './companionPetState.mjs';

export { EVOLUTION_STAGES, PET_SPECIES } from './companionPetConfig.mjs';

const MAX_PET_NAME_LENGTH = 50;

/**
 * Sanitize a user-supplied pet name at the service boundary (defense-in-depth,
 * independent of any controller-level validation). Collapses whitespace, strips
 * control characters and angle brackets (stored-XSS defense), trims, and caps
 * length. Returns '' for non-strings / empty / fully-stripped input so callers
 * can fall back to a safe default or reject.
 */
export const sanitizePetName = (value) => {
  if (typeof value !== 'string') return '';
  const collapsed = value.replace(/\s+/g, ' ');
  let cleaned = '';
  for (const ch of collapsed) {
    const code = ch.codePointAt(0);
    // Strip C0 controls (<0x20), DEL + C1 controls (0x7f-0x9f), and angle brackets.
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || ch === '<' || ch === '>') continue;
    cleaned += ch;
  }
  // Cap length by CODE POINT (not UTF-16 unit) so an astral glyph straddling the
  // boundary is never cut mid-surrogate into a lone (invalid) surrogate half.
  return [...cleaned.trim()].slice(0, MAX_PET_NAME_LENGTH).join('');
};

const buildInitialState = () => ({
  evolutionStage: 0,
  health: 80,
  mood: 'content',
  happiness: 60,
  birthDate: new Date().toISOString(),
  lastInteraction: new Date().toISOString(),
  appearanceMods: [],
  activityCounters: normalizeActivityCounters(),
  totalInteractions: 0,
});

const normalizeInventory = (value) => ({
  unlockedMods: Array.isArray(value?.unlockedMods) ? [...value.unlockedMods] : [],
  equippedMods: Array.isArray(value?.equippedMods) ? [...value.equippedMods] : [],
});

export class CompanionPetService {
  static async adoptPet(userId, species, petName) {
    if (!userId || typeof userId !== 'number') throw new Error('Invalid userId');
    if (!PET_SPECIES[species]) {
      throw new Error(`Invalid species: ${species}. Choose: ${Object.keys(PET_SPECIES).join(', ')}`);
    }
    const safeName = sanitizePetName(petName) || PET_SPECIES[species].name;

    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const transaction = await Gamification.sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw new Error('Gamification record not found');
      if (record.petSpecies) throw new Error('User already has a pet. Release current pet first.');

      await record.update({
        petSpecies: species,
        petName: safeName,
        petState: buildInitialState(),
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

  static async getPetData(userId) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const record = await Gamification.findOne({ where: { userId }, attributes: PET_STATE_ATTRIBUTES });

    if (!record || !record.petSpecies) {
      return { hasPet: false, pet: null };
    }

    const state = normalizePetState(record.petState);
    const inventory = normalizeInventory(record.petInventory);
    const species = PET_SPECIES[record.petSpecies] || PET_SPECIES.crystal_dragon;
    const level = toPetNumber(record.level, 1);
    const health = calculateHealthFromNeeds(record.needsState);
    const evolution = getEvolutionStage(level);
    const happiness = clampPetStat(toPetNumber(state.happiness, 50));
    const avgWellbeing = (health + happiness) / 2;
    const mood = getMood(avgWellbeing);
    const activityCounters = normalizeActivityCounters(state.activityCounters);
    const appearanceMods = getActiveAppearanceMods(activityCounters);
    const lastInteractionTime = typeof state.lastInteraction === 'string' ? Date.parse(state.lastInteraction) : NaN;
    const hoursSinceInteraction = Number.isFinite(lastInteractionTime)
      ? Math.max(0, (Date.now() - lastInteractionTime) / 3600000)
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
        happiness,
        birthDate: state.birthDate,
        lastInteraction: state.lastInteraction,
        hoursSinceInteraction: Math.round(hoursSinceInteraction),
        appearanceMods,
        equippedMods: inventory.equippedMods,
        unlockedMods: inventory.unlockedMods,
        activityCounters,
        totalInteractions: toPetNumber(state.totalInteractions, 0),
      },
    };
  }

  static async recordActivity(userId, activityType, amount = 1) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const transaction = await Gamification.sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!record || !record.petSpecies) {
        await transaction.rollback();
        return null;
      }

      const state = normalizePetState(record.petState);
      const inventory = normalizeInventory(record.petInventory);
      const counters = normalizeActivityCounters(state.activityCounters);
      const activityAmount = normalizeActivityAmount(amount);

      const counterKey = activityType;
      if (counters[counterKey] !== undefined) {
        counters[counterKey] = toPetNumber(counters[counterKey], 0) + activityAmount;
      }

      const newUnlocks = [];
      const trigger = APPEARANCE_TRIGGERS[counterKey];
      if (trigger) {
        for (let i = 0; i < trigger.thresholds.length; i += 1) {
          if (counters[counterKey] >= trigger.thresholds[i]) {
            const mod = trigger.mods[i];
            if (!inventory.unlockedMods.includes(mod)) {
              inventory.unlockedMods.push(mod);
              inventory.equippedMods.push(mod);
              newUnlocks.push(mod);
            }
          }
        }
      }

      const speciesInfo = PET_SPECIES[record.petSpecies];
      const affinityBonus = speciesInfo && activityMatchesAffinity(counterKey, speciesInfo.affinity) ? 8 : 3;
      state.happiness = clampPetStat(toPetNumber(state.happiness, 50) + affinityBonus);
      state.lastInteraction = new Date().toISOString();
      state.totalInteractions = toPetNumber(state.totalInteractions, 0) + 1;
      state.activityCounters = counters;

      await record.update({ petState: state, petInventory: inventory }, { transaction });
      await transaction.commit();

      return { newUnlocks, happiness: state.happiness };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async interact(userId, interactionType) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const transaction = await Gamification.sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!record || !record.petSpecies) {
        await transaction.rollback();
        return null;
      }

      const state = normalizePetState(record.petState);
      const boosts = { pet: 5, feed: 8, play: 10 };
      const boost = boosts[interactionType] || 5;

      state.happiness = clampPetStat(toPetNumber(state.happiness, 50) + boost);
      state.lastInteraction = new Date().toISOString();
      state.totalInteractions = toPetNumber(state.totalInteractions, 0) + 1;

      await record.update({ petState: state }, { transaction });
      await transaction.commit();

      return { happiness: state.happiness, interactionType };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async renamePet(userId, newName) {
    if (!userId || typeof userId !== 'number') throw new Error('Invalid userId');
    const safeName = sanitizePetName(newName);
    if (!safeName) throw new Error('Pet name cannot be empty');

    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const transaction = await Gamification.sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record || !record.petSpecies) throw new Error('No pet found');

      await record.update({ petName: safeName }, { transaction });
      await transaction.commit();

      return { name: safeName };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async releasePet(userId) {
    const { default: Gamification } = await import('../../models/Gamification.mjs');
    const transaction = await Gamification.sequelize.transaction();

    try {
      const record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record || !record.petSpecies) throw new Error('No pet found');

      await record.update({
        petSpecies: null,
        petName: null,
        petState: null,
        petInventory: null,
      }, { transaction });
      await transaction.commit();

      return { released: true };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static getSpeciesCatalog() {
    return Object.entries(PET_SPECIES).map(([id, info]) => ({ id, ...info }));
  }

  static getEvolutionConfig() {
    return { stages: EVOLUTION_STAGES, moods: PET_MOODS, species: this.getSpeciesCatalog() };
  }
}

export default CompanionPetService;
