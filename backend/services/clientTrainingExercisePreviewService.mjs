/**
 * Client Training Exercise Preview Service
 * ========================================
 *
 * Produces LLM-safe exercise prescription previews for Swan Coach read
 * context. The preview intentionally includes only exercise name plus
 * structured prescription fields. It excludes notes, media URLs, plan titles,
 * PDF metadata, storage keys, and other freeform text.
 */

const asArray = (value) => (Array.isArray(value) ? value : []);
const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const summarizeExercisePreview = (exercise = {}) => {
  const entry = toPlainObject(exercise) || {};
  const exerciseName = compactString(firstPresent(
    entry.exerciseName,
    entry.name,
    entry.exercise?.name,
    entry.exercise?.exerciseName,
  ));
  if (!exerciseName) return null;

  const rawSets = firstPresent(entry.sets, entry.setCount, entry.setScheme);
  const setCount = Array.isArray(rawSets) ? rawSets.length : toPositiveNumber(rawSets);
  const reps = firstPresent(entry.targetReps, entry.reps, entry.repGoal);
  const tempo = compactString(firstPresent(entry.tempo, entry.cadence));
  const rest = firstPresent(entry.restTime, entry.restSeconds, entry.restPeriod, entry.rest);
  const preview = { exerciseName };
  if (setCount) preview.sets = setCount;
  if (reps !== undefined && reps !== null && reps !== '') preview.reps = reps;
  if (tempo) preview.tempo = tempo;
  if (rest !== undefined && rest !== null && rest !== '') preview.rest = rest;
  return preview;
};

export const summarizeAssignmentExercises = (exercises, { limit = 12 } = {}) => (
  asArray(exercises)
    .map(summarizeExercisePreview)
    .filter(Boolean)
    .slice(0, limit)
);
