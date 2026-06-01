import type { Exercise } from './useWorkoutMcp';

type RawExercise = Exercise & Record<string, unknown>;
type ExerciseMuscleGroups = NonNullable<Exercise['muscleGroups']>;
type ExerciseEquipment = NonNullable<Exercise['equipment']>;

const slug = (value: unknown): string => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const parseList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [trimmed];
    }
  }

  return [value];
};

const normalizeDifficulty = (difficulty: unknown): string | undefined => {
  if (difficulty === undefined || difficulty === null || difficulty === '') return undefined;
  if (typeof difficulty === 'string') {
    const normalized = difficulty.trim().toLowerCase();
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return normalized;
    difficulty = numeric;
  }

  const numeric = Number(difficulty);
  if (!Number.isFinite(numeric)) return undefined;
  if (numeric <= 333) return 'beginner';
  if (numeric <= 666) return 'intermediate';
  return 'advanced';
};

const normalizeMuscleGroups = (exercise: RawExercise): ExerciseMuscleGroups => {
  if (Array.isArray(exercise.muscleGroups) && exercise.muscleGroups.length > 0) {
    return exercise.muscleGroups as ExerciseMuscleGroups;
  }

  return [...parseList(exercise.primaryMuscles), ...parseList(exercise.secondaryMuscles)]
    .map((item) => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const name = String(row.name || row.shortName || '').trim();
        if (!name) return null;
        return {
          id: String(row.id || slug(name)),
          name,
          shortName: String(row.shortName || name),
          bodyRegion: String(row.bodyRegion || ''),
        };
      }

      const name = String(item || '').trim();
      if (!name) return null;
      return { id: slug(name), name, shortName: name, bodyRegion: '' };
    })
    .filter(Boolean) as ExerciseMuscleGroups;
};

const normalizeEquipment = (exercise: RawExercise): ExerciseEquipment => {
  if (Array.isArray(exercise.equipment) && exercise.equipment.length > 0) {
    return exercise.equipment as ExerciseEquipment;
  }

  return parseList(exercise.equipmentNeeded)
    .map((item) => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const name = String(row.name || row.category || '').trim();
        if (!name) return null;
        return {
          id: String(row.id || slug(name)),
          name,
          category: String(row.category || 'equipment'),
        };
      }

      const name = String(item || '').trim();
      if (!name) return null;
      return { id: slug(name), name, category: 'equipment' };
    })
    .filter(Boolean) as ExerciseEquipment;
};

export const normalizeWorkoutRecommendationExercises = (rawExercises: unknown[]): Exercise[] => (
  rawExercises.map((raw, index) => {
    const exercise = (raw && typeof raw === 'object' ? raw : {}) as RawExercise;
    const normalized: Exercise = {
      ...exercise,
      id: String(exercise.id || slug(exercise.name) || `exercise-${index + 1}`),
      name: String(exercise.name || 'Unnamed exercise'),
      description: typeof exercise.description === 'string' ? exercise.description : '',
    };

    const category = exercise.category || exercise.exerciseType || exercise.bodyPartCategory;
    if (category) normalized.category = String(category);

    const difficulty = normalizeDifficulty(exercise.difficulty);
    if (difficulty) normalized.difficulty = difficulty;

    const muscleGroups = normalizeMuscleGroups(exercise);
    if (muscleGroups.length > 0) normalized.muscleGroups = muscleGroups;

    const equipment = normalizeEquipment(exercise);
    if (equipment.length > 0) normalized.equipment = equipment;

    return normalized;
  })
);
