import { APPEARANCE_TRIGGERS } from './companionPetConfig.mjs';
import { EVOLUTION_STAGES, PET_MOODS } from './companionPetConfig.mjs';

export const PET_STATE_ATTRIBUTES = ['petSpecies', 'petName', 'petState', 'petInventory', 'needsState', 'level'];

const NEED_KEYS = ['athletic', 'recovery', 'social', 'discipline', 'vitality'];
const ACTIVITY_AFFINITY_MAP = {
  strength_workouts: 'athletic',
  cardio_workouts: 'athletic',
  nutrition_logs: 'vitality',
  recovery_actions: 'recovery',
  streak_days: 'discipline',
  social_actions: 'social',
  personal_records: 'athletic',
};

const isPetRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const toPetNumber = (value, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const clampPetStat = (value) => Math.min(100, Math.max(0, toPetNumber(value, 50)));

export const normalizeActivityAmount = (value) => (
  Number.isInteger(value) && value > 0 && value <= 100 ? value : 1
);

export const normalizePetState = (value) => (
  isPetRecord(value) ? { ...value } : {}
);

export const normalizeActivityCounters = (value) => {
  const source = isPetRecord(value) ? value : {};
  return Object.keys(APPEARANCE_TRIGGERS).reduce((counters, key) => {
    counters[key] = Math.max(0, toPetNumber(source[key], 0));
    return counters;
  }, {});
};

export const calculateHealthFromNeeds = (needsState) => {
  const source = isPetRecord(needsState) ? needsState : {};
  let total = 0;
  let count = 0;

  for (const key of NEED_KEYS) {
    const need = isPetRecord(source[key]) ? source[key] : null;
    if (need) {
      total += toPetNumber(need.value, 0);
      count += 1;
    }
  }

  return count > 0 ? total / count : 50;
};

export const getEvolutionStage = (level) => {
  const safeLevel = Math.max(0, toPetNumber(level, 1));
  let current = EVOLUTION_STAGES[0];

  for (const stage of EVOLUTION_STAGES) {
    if (safeLevel >= stage.minLevel) current = stage;
  }

  return current;
};

export const getMood = (avgWellbeing) => {
  const safeWellbeing = toPetNumber(avgWellbeing, 50);
  for (const mood of PET_MOODS) {
    if (safeWellbeing >= mood.minAvg) return mood;
  }
  return PET_MOODS[PET_MOODS.length - 1];
};

export const activityMatchesAffinity = (activityKey, affinity) => (
  ACTIVITY_AFFINITY_MAP[activityKey] === affinity
);

export const getActiveAppearanceMods = (counters) => {
  const active = [];
  for (const [key, config] of Object.entries(APPEARANCE_TRIGGERS)) {
    const count = toPetNumber(counters?.[key], 0);
    for (let i = config.thresholds.length - 1; i >= 0; i--) {
      if (count >= config.thresholds[i]) {
        active.push({ category: key, mod: config.mods[i], tier: i + 1 });
        break;
      }
    }
  }
  return active;
};
