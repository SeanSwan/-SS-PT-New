/**
 * exerciseIdentity.mjs — canonical exercise-name identity for proof unification (Kimi F1).
 * The two per-set sources key differently: WorkoutLog is free-text `exerciseName` (no FK),
 * WorkoutExercise→Set is `Exercise.name` (FK-backed). We unify on a NORMALIZED name.
 *
 * Identity policy (Slice-2, FROZEN): exact match after normalize — NO fuzzy/stemming/punctuation
 * stripping. A false MERGE would fabricate a PR on a screen literally called "proof" (unforgivable);
 * a false SPLIT only underreports a series (recoverable). So we bias to split.
 */
export const normalizeExerciseName = (raw) =>
  (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
