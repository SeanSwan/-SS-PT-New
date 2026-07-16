/**
 * Exercise Familiarity Service — familiarity-aware plan generation
 * ================================================================
 * PURPOSE
 *   The Swan Coach generators (generateWorkout / generatePlan / guided
 *   candidates) were picking exercises a client has NEVER performed with
 *   their trainer (e.g. Barbell Back Squat for a machines-only client).
 *   This module derives a familiarity signal from the client's REAL logged
 *   history (workout_logs joined to workout_sessions by userId) and feeds
 *   the existing scoring/selection pipeline:
 *
 *   1. FAMILIAR-FIRST — exercises the client has logged before get a strong
 *      scoring boost (FAMILIAR_EXERCISE_BOOST), so ranking prefers them.
 *   2. NOVEL-CAPPED, NOT NOVEL-BANNED — at most MAX_NOVEL_EXERCISES_PER_DAY
 *      novel movements per generated day (soft cap: a day is never left
 *      short — if familiar options run out, novels fill the remainder).
 *   3. PROGRESSION-AWARE NOVELTY — novel exercises sharing muscles or
 *      movement pattern with a familiar one score higher (a progression of
 *      something they know), and novel free-weight barbell lifts are
 *      penalized when the history shows zero barbell work; higher NASM
 *      difficulty is penalized for novel picks.
 *   4. NEW-CLIENT EXEMPT — no history means everything is novel; behave
 *      exactly as today (no boost, no cap).
 *
 * FAIL-OPEN CONTRACT (Sean directive 2026-07-14): if the history query
 * fails for ANY reason, buildExerciseFamiliarity returns null with a
 * logged warning and generation proceeds exactly as before this feature.
 * Models are loaded via dynamic import inside the try/catch so mocked
 * test harnesses without workout models stay green.
 *
 * DATA TRUTH: workout_logs.exerciseName is free text — names are
 * normalized (lowercase, punctuation stripped, whitespace collapsed)
 * before matching against Exercise registry names/keys.
 *
 * CONSUMERS: workoutBuilderService.mjs (generateWorkout, generatePlan),
 * workoutBuilderCandidateService.mjs (guided candidates scoring only).
 */

import logger from '../utils/logger.mjs';

// Tunable constants — see header §1-3.
export const FAMILIAR_EXERCISE_BOOST = 6;          // score boost for exercises in history
export const PROGRESSION_KINSHIP_BONUS = 2;        // novel, but shares muscles/pattern with familiar
export const NOVEL_BARBELL_PENALTY = 4;            // novel barbell lift when history has no barbell work
export const NOVEL_DIFFICULTY_PENALTY_PER_LEVEL = 1; // per NASM level above 2, novel picks only
export const MAX_NOVEL_EXERCISES_PER_DAY = 2;      // soft cap on novel movements per generated day
const HISTORY_SESSION_LIMIT = 300;                 // most recent sessions considered
const HISTORY_LOG_LIMIT = 5000;                    // safety bound on log rows scanned

const FRIENDLY_NOVEL_EQUIPMENT = new Set(['machine', 'cable', 'bodyweight', 'band']);

/** Normalize a free-text exercise name for matching (case/whitespace/punctuation). */
export function normalizeExerciseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function exerciseNameForms(exercise = {}) {
  return [normalizeExerciseName(exercise.name), normalizeExerciseName(exercise.key)]
    .filter(Boolean);
}

function exerciseUsesBarbell(exercise = {}) {
  const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
  if (equipment.some((eq) => String(eq).toLowerCase().includes('barbell'))) return true;
  return exerciseNameForms(exercise).some((form) => form.includes('barbell'));
}

/** True when the client's logged history contains this exercise. */
export function isFamiliarExercise(exercise, familiarity) {
  if (!familiarity?.hasHistory) return false;
  return exerciseNameForms(exercise).some((form) => familiarity.familiarNames.has(form));
}

/**
 * Build the familiarity signal for a client from workout_logs joined to
 * workout_sessions by userId. Returns null (fail-open) on any failure.
 *
 * @param {number} clientId
 * @param {Array}  registry - exercise registry, used to enrich the logged
 *   free-text names with muscles/movement patterns for progression kinship.
 * @returns {Promise<null | {
 *   hasHistory: boolean,
 *   familiarNames: Set<string>,
 *   familiarMuscles: Set<string>,
 *   familiarPatterns: Set<string>,
 *   usesBarbell: boolean,
 * }>}
 */
export async function buildExerciseFamiliarity(clientId, registry = []) {
  try {
    // Dynamic import keeps this fail-open in harnesses that mock
    // models/index.mjs without the workout models.
    const models = await import('../models/index.mjs');
    const WorkoutSession = models.getWorkoutSession();
    const WorkoutLog = models.getWorkoutLog();
    if (!WorkoutSession?.findAll || !WorkoutLog?.findAll) {
      throw new Error('workout history models unavailable');
    }

    const sessions = await WorkoutSession.findAll({
      where: { userId: clientId },
      attributes: ['id'],
      order: [['date', 'DESC']],
      limit: HISTORY_SESSION_LIMIT,
      raw: true,
    });
    const sessionIds = (sessions || []).map((s) => s.id).filter(Boolean);
    if (sessionIds.length === 0) {
      return emptyFamiliarity();
    }

    const logs = await WorkoutLog.findAll({
      where: { sessionId: sessionIds },
      attributes: ['exerciseName'],
      limit: HISTORY_LOG_LIMIT,
      raw: true,
    });

    const familiarNames = new Set();
    for (const log of logs || []) {
      const normalized = normalizeExerciseName(log?.exerciseName);
      if (normalized) familiarNames.add(normalized);
    }
    if (familiarNames.size === 0) {
      return emptyFamiliarity();
    }

    // Enrich with registry metadata so novel picks can be scored as
    // progressions of familiar movements.
    const familiarMuscles = new Set();
    const familiarPatterns = new Set();
    let usesBarbell = false;
    for (const exercise of Array.isArray(registry) ? registry : []) {
      if (!exerciseNameForms(exercise).some((form) => familiarNames.has(form))) continue;
      for (const muscle of Array.isArray(exercise.muscles) ? exercise.muscles : []) {
        familiarMuscles.add(String(muscle).toLowerCase());
      }
      const pattern = exercise.movementPattern || exercise.nasmMovementPattern || exercise.category;
      if (pattern) familiarPatterns.add(String(pattern).toLowerCase());
      if (exerciseUsesBarbell(exercise)) usesBarbell = true;
    }
    // Free-text safety net: logged names mentioning barbell count as barbell history.
    if (!usesBarbell) {
      usesBarbell = [...familiarNames].some((name) => name.includes('barbell'));
    }

    return { hasHistory: true, familiarNames, familiarMuscles, familiarPatterns, usesBarbell };
  } catch (err) {
    // FAIL-OPEN: generation proceeds exactly as before this feature.
    logger.warn('[ExerciseFamiliarity] history lookup failed — generating without familiarity signal', {
      clientId,
      error: err?.message,
    });
    return null;
  }
}

function emptyFamiliarity() {
  return {
    hasHistory: false,
    familiarNames: new Set(),
    familiarMuscles: new Set(),
    familiarPatterns: new Set(),
    usesBarbell: false,
  };
}

/**
 * Familiarity scoring term for the existing candidate/selection ranking
 * (same shape as scoreExerciseForSwanCoachReadiness — additive integer).
 * Null/no-history familiarity contributes 0 (new-client exemption).
 */
export function scoreExerciseFamiliarity(exercise, familiarity) {
  if (!familiarity?.hasHistory) return 0;
  if (isFamiliarExercise(exercise, familiarity)) return FAMILIAR_EXERCISE_BOOST;

  // Novel exercise — prefer progressions of known work, easier movements,
  // and machine/cable/bodyweight over barbell when history has no barbell.
  let score = 0;
  const muscles = Array.isArray(exercise.muscles) ? exercise.muscles : [];
  const pattern = String(
    exercise.movementPattern || exercise.nasmMovementPattern || exercise.category || '',
  ).toLowerCase();
  const sharesKinship = muscles.some((m) => familiarity.familiarMuscles.has(String(m).toLowerCase()))
    || (pattern && familiarity.familiarPatterns.has(pattern));
  if (sharesKinship) score += PROGRESSION_KINSHIP_BONUS;

  if (!familiarity.usesBarbell && exerciseUsesBarbell(exercise)) {
    score -= NOVEL_BARBELL_PENALTY;
  } else if (!familiarity.usesBarbell) {
    const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
    if (equipment.some((eq) => FRIENDLY_NOVEL_EQUIPMENT.has(String(eq).toLowerCase()))) score += 1;
  }

  const level = Number(exercise.nasmLevel || 2);
  score -= Math.max(0, level - 2) * NOVEL_DIFFICULTY_PENALTY_PER_LEVEL;
  return score;
}

/**
 * Day-level novelty budget. One budget per GENERATED DAY (a full-body day
 * calls selection once per movement category — the budget is shared).
 * Returns null when the client has no history (new-client exemption).
 */
export function createNoveltyBudget(familiarity, maxNovel = MAX_NOVEL_EXERCISES_PER_DAY) {
  if (!familiarity?.hasHistory) return null;
  return { remaining: maxNovel };
}

/**
 * Cap-aware pick from an already-ranked list (highest score first).
 * Familiar exercises are always eligible; novel ones consume the shared
 * day budget. SOFT cap: if familiar options cannot fill the requested
 * count, skipped novels backfill in rank order so days are never short.
 */
export function selectWithNoveltyCap(rankedExercises, count, familiarity, noveltyBudget) {
  const ranked = Array.isArray(rankedExercises) ? rankedExercises : [];
  if (!familiarity?.hasHistory || !noveltyBudget) return ranked.slice(0, count);

  const picked = [];
  const skippedNovel = [];
  for (const exercise of ranked) {
    if (picked.length >= count) break;
    if (isFamiliarExercise(exercise, familiarity)) {
      picked.push(exercise);
    } else if (noveltyBudget.remaining > 0) {
      noveltyBudget.remaining -= 1;
      picked.push(exercise);
    } else {
      skippedNovel.push(exercise);
    }
  }
  // Soft-cap backfill — never return a short day because of the cap.
  for (const exercise of skippedNovel) {
    if (picked.length >= count) break;
    picked.push(exercise);
  }
  return picked;
}
