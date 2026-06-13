/**
 * exerciseLibraryContract
 * =======================
 *
 * Shapes the client-safe exercise library payload consumed by the shared
 * WorkoutLogger Rolodex. This keeps the `/api/exercises/library` route thin
 * while preserving one clear contract for client, trainer, and Coach-assisted
 * logging surfaces.
 */

const LIBRARY_BASE_ATTRIBUTES = [
  'id',
  'name',
  'exerciseType',
  'primaryMuscles',
  'secondaryMuscles',
  'exercise_key',
  'bodyPartCategory',
  'difficulty',
  'equipmentNeeded',
  'source',
  'description',
];

const LIBRARY_OPTIONAL_ATTRIBUTES = [
  'videoUrl',
  'imageUrl',
  'thumbnailUrl',
  'defaultTempo',
  'defaultRestSeconds',
  'recommendedSets',
  'recommendedReps',
  'recommendedDuration',
  'restInterval',
  'optPhases',
  'nasmMovementPattern',
  'canBePerformedAtHome',
  'easyVariation',
  'hardVariation',
  'kneeMod',
  'shoulderMod',
  'ankleMod',
  'wristMod',
  'backMod',
  'elbowMod',
  'footMod',
  'hipMod',
];

const getAvailableAttributes = (Exercise) => (
  Exercise?.rawAttributes ? new Set(Object.keys(Exercise.rawAttributes)) : null
);

export const getLibraryAttributes = (Exercise) => {
  const available = getAvailableAttributes(Exercise);
  if (!available) return [...LIBRARY_BASE_ATTRIBUTES, ...LIBRARY_OPTIONAL_ATTRIBUTES];
  return [...LIBRARY_BASE_ATTRIBUTES, ...LIBRARY_OPTIONAL_ATTRIBUTES]
    .filter(attribute => available.has(attribute));
};

export const getLibraryWhere = (Exercise) => {
  const available = getAvailableAttributes(Exercise);
  return !available || available.has('isActive') ? { isActive: true } : {};
};

const parseJsonField = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try {
    let parsed = typeof val === 'string' ? JSON.parse(val) : val;
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return typeof val === 'string' ? [val] : [];
  }
};

const nullableText = (value) => (typeof value === 'string' && value.trim() ? value : null);

const nullableNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return null;
};

export const formatLibraryExercise = (ex) => {
  const equipment = parseJsonField(ex.equipmentNeeded);
  return {
    id: ex.id,
    name: ex.name,
    exerciseKey: ex.exercise_key || '',
    exerciseType: ex.exerciseType || '',
    bodyPartCategory: ex.bodyPartCategory || 'Full Body',
    primaryMuscles: parseJsonField(ex.primaryMuscles),
    secondaryMuscles: parseJsonField(ex.secondaryMuscles),
    difficulty: ex.difficulty || 0,
    equipment,
    equipmentNeeded: equipment,
    source: ex.source || 'swanstudios',
    description: ex.description || null,
    videoUrl: nullableText(ex.videoUrl),
    imageUrl: nullableText(ex.imageUrl),
    thumbnailUrl: nullableText(ex.thumbnailUrl),
    defaultTempo: nullableText(ex.defaultTempo),
    defaultRestSeconds: nullableNumber(ex.defaultRestSeconds),
    recommendedSets: nullableNumber(ex.recommendedSets),
    recommendedReps: nullableNumber(ex.recommendedReps),
    recommendedDuration: nullableNumber(ex.recommendedDuration),
    restInterval: nullableNumber(ex.restInterval),
    optPhases: parseJsonField(ex.optPhases),
    nasmMovementPattern: nullableText(ex.nasmMovementPattern),
    canBePerformedAtHome: Boolean(ex.canBePerformedAtHome),
    easyVariation: nullableText(ex.easyVariation),
    hardVariation: nullableText(ex.hardVariation),
    kneeMod: nullableText(ex.kneeMod),
    shoulderMod: nullableText(ex.shoulderMod),
    ankleMod: nullableText(ex.ankleMod),
    wristMod: nullableText(ex.wristMod),
    backMod: nullableText(ex.backMod),
    elbowMod: nullableText(ex.elbowMod),
    footMod: nullableText(ex.footMod),
    hipMod: nullableText(ex.hipMod),
  };
};
