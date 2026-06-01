export interface ExerciseSelectorExercise {
  id: string;
  name: string;
  exerciseType: string;
  primaryMuscles: string[];
  difficulty: number;
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedRest?: number;
}

interface ExerciseFilterParams {
  filterMuscle: string;
  filterType: string;
  searchQuery: string;
  selectedExerciseIds: string[];
}

export const EXERCISE_LIBRARY_URL = '/api/exercises/library';

export const EXERCISE_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'core', label: 'Core' },
  { value: 'balance', label: 'Balance' },
  { value: 'stability', label: 'Stability' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'stabilizers', label: 'Stabilizers' },
  { value: 'injury_prevention', label: 'Injury Prevention' },
  { value: 'injury_recovery', label: 'Injury Recovery' },
  { value: 'compound', label: 'Compound' }
];

export const MUSCLE_GROUPS = [
  { value: 'all', label: 'All Muscles' },
  { value: 'Glutes', label: 'Glutes' },
  { value: 'Calves', label: 'Calves' },
  { value: 'Shoulders', label: 'Shoulders' },
  { value: 'Hamstrings', label: 'Hamstrings' },
  { value: 'Abs', label: 'Abs' },
  { value: 'Chest', label: 'Chest' },
  { value: 'Biceps', label: 'Biceps' },
  { value: 'Triceps', label: 'Triceps' },
  { value: 'Lower Back', label: 'Lower Back' },
  { value: 'Quadriceps', label: 'Quadriceps' },
  { value: 'Core', label: 'Core' }
];

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [value];
  } catch {
    return [value];
  }
};

const includesText = (value: string, query: string): boolean =>
  value.toLowerCase().includes(query.toLowerCase());

export const normalizeExercises = (rows: unknown): ExerciseSelectorExercise[] =>
  (Array.isArray(rows) ? rows : []).map((row: any) => ({
    id: String(row?.id || ''),
    name: String(row?.name || 'Unknown Exercise'),
    exerciseType: String(row?.exerciseType || 'exercise'),
    primaryMuscles: parseStringArray(row?.primaryMuscles),
    difficulty: Number(row?.difficulty) || 0,
    recommendedSets: Number(row?.recommendedSets) || undefined,
    recommendedReps: Number(row?.recommendedReps) || undefined,
    recommendedRest: Number(row?.recommendedRest) || undefined
  })).filter(exercise => exercise.id);

export const getExerciseLevel = (difficulty: number): number =>
  Math.max(1, Math.ceil((Number(difficulty) || 0) / 100));

export const getVisibleMuscles = (exercise: ExerciseSelectorExercise): string[] =>
  exercise.primaryMuscles.slice(0, 3);

export const getHiddenMuscleCount = (exercise: ExerciseSelectorExercise): number =>
  Math.max(0, exercise.primaryMuscles.length - 3);

export const getFilteredExercises = (
  exercises: ExerciseSelectorExercise[],
  { filterMuscle, filterType, searchQuery, selectedExerciseIds }: ExerciseFilterParams
): ExerciseSelectorExercise[] => {
  const query = searchQuery.trim();

  return exercises.filter(exercise => {
    const isAlreadySelected = selectedExerciseIds.includes(exercise.id);
    const matchesSearch = !query || includesText(exercise.name, query) || includesText(exercise.exerciseType, query);
    const matchesType = filterType === 'all' || exercise.exerciseType === filterType;
    const matchesMuscle = filterMuscle === 'all' || exercise.primaryMuscles.includes(filterMuscle);

    return !isAlreadySelected && matchesSearch && matchesType && matchesMuscle;
  });
};
