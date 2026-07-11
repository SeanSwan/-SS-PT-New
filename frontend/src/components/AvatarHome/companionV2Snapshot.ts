export interface CompanionV2Snapshot {
  hasPet: boolean;
  name: string;
  species: string;
  stage: number;
  stageLabel: string;
  health: number;
  happiness: number;
  moodLabel: string;
  totalInteractions: number;
}

const STAGE_NAMES = ['Egg', 'Hatchling', 'Juvenile', 'Adult', 'Elder', 'Mythic'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const safeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const safeNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const clampStage = (value: unknown): number => {
  const stage = Math.floor(safeNumber(value));
  return Math.max(0, Math.min(STAGE_NAMES.length - 1, stage));
};

const getStageLabel = (stage: number, label: unknown): string =>
  safeString(label, STAGE_NAMES[stage] || STAGE_NAMES[0]);

export const normalizeCompanionV2Snapshot = (value: unknown): CompanionV2Snapshot => {
  if (!isRecord(value) || value.hasPet !== true || !isRecord(value.pet)) {
    return {
      hasPet: false,
      name: '',
      species: '',
      stage: 0,
      stageLabel: STAGE_NAMES[0],
      health: 0,
      happiness: 0,
      moodLabel: 'content',
      totalInteractions: 0,
    };
  }

  const pet = value.pet;
  const evolution = isRecord(pet.evolution) ? pet.evolution : {};
  const mood = isRecord(pet.mood) ? pet.mood : {};
  const stage = clampStage(evolution.stage);

  return {
    hasPet: true,
    name: safeString(pet.name, 'Companion'),
    species: safeString(pet.species),
    stage,
    stageLabel: getStageLabel(stage, evolution.label),
    health: safeNumber(pet.health),
    happiness: safeNumber(pet.happiness),
    moodLabel: safeString(mood.label, 'content'),
    totalInteractions: safeNumber(pet.totalInteractions),
  };
};
