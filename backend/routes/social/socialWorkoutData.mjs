const STRING_LIMITS = {
  title: 120,
  focus: 160,
  source: 32,
  duration: 32,
  exerciseCount: 24,
  totalWeight: 32,
  caloriesBurned: 24,
  notes: 500,
  name: 120,
  sets: 24,
  reps: 32,
  weight: 32,
  rest: 32,
};

const WORKOUT_FIELDS = [
  'title',
  'focus',
  'source',
  'duration',
  'exerciseCount',
  'totalWeight',
  'caloriesBurned',
  'notes',
];

const EXERCISE_FIELDS = ['name', 'sets', 'reps', 'weight', 'duration', 'rest', 'notes'];

function parseObject(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return text.slice(0, maxLength);
}

function sanitizeExercise(rawExercise) {
  const exercise = parseObject(rawExercise);
  if (!exercise) return null;

  const normalized = {};
  for (const field of EXERCISE_FIELDS) {
    const value = cleanText(exercise[field], STRING_LIMITS[field] ?? 80);
    if (value) normalized[field] = value;
  }

  return normalized.name ? normalized : null;
}

export function sanitizeWorkoutPostData(value) {
  const raw = parseObject(value);
  if (!raw) return null;

  const normalized = {};
  for (const field of WORKOUT_FIELDS) {
    const cleanValue = cleanText(raw[field], STRING_LIMITS[field] ?? 120);
    if (cleanValue) normalized[field] = cleanValue;
  }

  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises.slice(0, 12).map(sanitizeExercise).filter(Boolean)
    : [];

  if (exercises.length > 0) {
    normalized.exercises = exercises;
    if (!normalized.exerciseCount) normalized.exerciseCount = String(exercises.length);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getWorkoutDataFromMetadata(metadata) {
  const parsedMetadata = parseObject(metadata);
  if (!parsedMetadata) return null;
  return sanitizeWorkoutPostData(parsedMetadata.workoutData);
}

export function attachWorkoutDataToPost(post) {
  if (!post || typeof post !== 'object') return post;
  const workoutData = getWorkoutDataFromMetadata(post.metadata);
  return workoutData ? { ...post, workoutData } : post;
}