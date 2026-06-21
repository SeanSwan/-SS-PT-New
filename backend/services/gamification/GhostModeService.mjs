/**
 * ============================================================================
 * FILE: GhostModeService.mjs
 * PURPOSE: Ghost Mode - compete against your own previous workout performance
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Retrieves a user's best previous workout matching the
 * current category/muscle group and creates a "ghost" comparison. During the
 * workout, the user sees their previous reps/weight/volume as a target to beat.
 * Beating the ghost triggers a "Ghost Defeated" celebration. Real XP awards
 * must come from server-verified workout completion, not client comparison data.
 *
 * HOW IT FITS IN THE APP: Called from workout logger when Ghost Mode is toggled on.
 * The service queries WorkoutSessions for matching previous workouts and formats
 * the ghost data for real-time comparison.
 */

// -------------------------------------------------------------
// SECTION: Ghost Data Structure
// PURPOSE: Defines what ghost data looks like for comparison
// -------------------------------------------------------------

// -------------------------------------------------------------
// SECTION: Cosmetic Ghost Rewards
// -------------------------------------------------------------

const GHOST_BONUSES = {
  ghost_defeated: 0,         // Beat ghost's total volume
  ghost_crushed: 0,          // Beat ghost by 10%+
  ghost_dominated: 0,        // Beat ghost by 25%+
  ghost_matched: 0,          // Matched ghost within 5%
  personal_record_ghost: 0,  // Set a PR while in ghost mode
};
const GHOST_REWARD_MODE = 'cosmetic_only';
const GHOST_REWARD_TRUST = 'client_submitted_comparison';
const noGhostComparison = () => ({
  result: 'no_comparison',
  bonusXP: 0,
  bonuses: [],
  rewardMode: GHOST_REWARD_MODE,
  trustStatus: GHOST_REWARD_TRUST,
});

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const toFiniteNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== 'string') return 0;

  const normalized = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNonNegativeNumber = (value) => Math.max(0, toFiniteNumber(value));
const toNonNegativeInteger = (value) => {
  const parsed = toFiniteNumber(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const getWorkoutExercises = (workoutData) => (
  Array.isArray(workoutData?.exercises) ? workoutData.exercises : []
);

// -------------------------------------------------------------
// SECTION: Core Service
// -------------------------------------------------------------

class GhostModeService {
  /**
   * Get the best matching previous workout to serve as the ghost.
   * Prioritizes: same category, then same day-of-week, then highest volume.
   */
  static async getGhost(userId, options = {}) {
    const { category = 'full_body', muscleGroup = null, exerciseIds = [] } = options;

    // Dynamic import to avoid circular dependencies
    const db = (await import('../../database.mjs')).default;

    try {
      const normalizedCategory = typeof category === 'string' && category.trim()
        ? category.trim()
        : 'full_body';
      const categoryFilterEnabled = normalizedCategory !== 'full_body';
      const muscleGroupFilterEnabled = typeof muscleGroup === 'string' && muscleGroup.trim();
      const exerciseIdFilterEnabled = Array.isArray(exerciseIds) && exerciseIds.length > 0;

      const query = `
        WITH log_rows AS (
          SELECT
            ws.id,
            ws.date,
            ws.notes,
            ws."createdAt",
            ws."totalWeight",
            ws."totalSets",
            ws."totalReps",
            wl."exerciseName",
            wl."setNumber",
            wl.reps,
            wl.weight,
            e.id AS "exerciseId"
          FROM workout_sessions ws
          JOIN workout_logs wl ON wl."sessionId" = ws.id
          LEFT JOIN "Exercises" e ON LOWER(e.name) = LOWER(wl."exerciseName")
          WHERE ws."userId" = :userId
            AND ws.status = 'completed'
            ${categoryFilterEnabled ? 'AND (e."bodyPartCategory" = :category OR e."primaryMuscles"::text ILIKE :categoryLike)' : ''}
            ${muscleGroupFilterEnabled ? 'AND (e."bodyPartCategory" = :muscleGroup OR e."primaryMuscles"::text ILIKE :muscleGroupLike)' : ''}
            ${exerciseIdFilterEnabled ? 'AND e.id IN (:exerciseIds)' : ''}
        ),
        exercise_totals AS (
          SELECT
            id,
            date,
            notes,
            "createdAt",
            "exerciseName",
            MAX("exerciseId") AS "exerciseId",
            COUNT(*)::int AS sets,
            COALESCE(SUM(reps), 0)::int AS reps,
            COALESCE(MAX(weight), 0)::float AS weight,
            COALESCE(SUM(COALESCE(weight, 0) * COALESCE(reps, 0)), 0)::float AS volume,
            MAX("totalWeight") AS "storedTotalWeight",
            MAX("totalSets") AS "storedTotalSets",
            MAX("totalReps") AS "storedTotalReps"
          FROM log_rows
          GROUP BY id, date, notes, "createdAt", "exerciseName"
        ),
        session_totals AS (
          SELECT
            id,
            date,
            notes,
            "createdAt",
            COALESCE(NULLIF(MAX("storedTotalWeight"), 0), SUM(volume), 0)::float AS "totalVolume",
            COALESCE(NULLIF(MAX("storedTotalSets"), 0), SUM(sets), 0)::int AS "totalSets",
            COALESCE(NULLIF(MAX("storedTotalReps"), 0), SUM(reps), 0)::int AS "totalReps"
          FROM exercise_totals
          GROUP BY id, date, notes, "createdAt"
          ORDER BY "totalVolume" DESC NULLS LAST, date DESC
          LIMIT 5
        )
        SELECT
          st.id,
          st.date,
          st.notes,
          st."createdAt",
          st."totalVolume",
          st."totalSets",
          st."totalReps",
          json_agg(json_build_object(
            'exerciseName', et."exerciseName",
            'sets', et.sets,
            'reps', et.reps,
            'weight', et.weight,
            'volume', et.volume,
            'exerciseId', et."exerciseId"
          ) ORDER BY et.volume DESC, et."exerciseName") AS exercises
        FROM session_totals st
        JOIN exercise_totals et ON et.id = st.id
        GROUP BY st.id, st.date, st.notes, st."createdAt", st."totalVolume", st."totalSets", st."totalReps"
        ORDER BY st."totalVolume" DESC NULLS LAST, st.date DESC
      `;

      const replacements = {
        userId,
        ...(categoryFilterEnabled
          ? { category: normalizedCategory, categoryLike: `%${normalizedCategory}%` }
          : {}),
        ...(muscleGroupFilterEnabled
          ? { muscleGroup: muscleGroup.trim(), muscleGroupLike: `%${muscleGroup.trim()}%` }
          : {}),
        ...(exerciseIdFilterEnabled ? { exerciseIds } : {}),
      };

      const [results] = await db.query(query, {
        replacements,
        type: 'SELECT',
      });

      if (!results || results.length === 0) {
        return { hasGhost: false, message: 'No previous workouts found for this category' };
      }

      // Pick the best session (highest volume)
      const bestSession = Array.isArray(results) ? results[0] : results;

      // Format ghost data
      const ghost = {
        ghostId: `ghost_${userId}_${bestSession.id}`,
        sourceSessionId: bestSession.id,
        sourceDate: bestSession.date || bestSession.createdAt,
        category: normalizedCategory,
        totalVolume: toNonNegativeNumber(bestSession.totalVolume),
        totalSets: toNonNegativeInteger(bestSession.totalSets),
        totalReps: toNonNegativeInteger(bestSession.totalReps),
        exercises: (Array.isArray(bestSession.exercises)
          ? bestSession.exercises
          : JSON.parse(bestSession.exercises || '[]')
        ).filter(e => e.exerciseName).map(e => ({
          name: e.exerciseName,
          exerciseId: e.exerciseId,
          sets: toNonNegativeInteger(e.sets),
          reps: toNonNegativeInteger(e.reps),
          weight: toNonNegativeNumber(e.weight),
          volume: toNonNegativeNumber(e.volume),
        })),
        comparison: {
          metric: 'volume',
          target: toNonNegativeNumber(bestSession.totalVolume),
        },
      };

      return { hasGhost: true, ghost };
    } catch (err) {
      console.error('[GhostMode] getGhost error:', err.message);
      return { hasGhost: false, message: 'Failed to load ghost data' };
    }
  }

  /**
   * Compare a completed workout against the ghost for cosmetic feedback.
   * Point awards must be handled by server-verified workout completion.
   */
  static compareWithGhost(ghostData, currentWorkoutData) {
    if (!ghostData || !currentWorkoutData) {
      return noGhostComparison();
    }

    const ghostVolume = toFiniteNumber(ghostData.totalVolume);
    const currentVolume = toFiniteNumber(currentWorkoutData.totalVolume);

    if (ghostVolume <= 0 || currentVolume < 0) {
      return noGhostComparison();
    }

    const ratio = currentVolume / ghostVolume;
    const bonuses = [];
    let totalBonusXP = 0;

    if (ratio >= 1.25) {
      bonuses.push({ type: 'ghost_dominated', label: 'Ghost Dominated!', xp: GHOST_BONUSES.ghost_dominated });
      totalBonusXP += GHOST_BONUSES.ghost_dominated;
    } else if (ratio >= 1.10) {
      bonuses.push({ type: 'ghost_crushed', label: 'Ghost Crushed!', xp: GHOST_BONUSES.ghost_crushed });
      totalBonusXP += GHOST_BONUSES.ghost_crushed;
    } else if (ratio >= 1.0) {
      bonuses.push({ type: 'ghost_defeated', label: 'Ghost Defeated!', xp: GHOST_BONUSES.ghost_defeated });
      totalBonusXP += GHOST_BONUSES.ghost_defeated;
    } else if (ratio >= 0.95) {
      bonuses.push({ type: 'ghost_matched', label: 'Ghost Matched', xp: GHOST_BONUSES.ghost_matched });
      totalBonusXP += GHOST_BONUSES.ghost_matched;
    }

    // Per-exercise comparisons
    const currentExercises = getWorkoutExercises(currentWorkoutData);
    const exerciseComparisons = getWorkoutExercises(ghostData).map(ghostEx => {
      const matchingCurrent = currentExercises.find(
        e => e.exerciseId === ghostEx.exerciseId || e.name === ghostEx.name
      );

      if (!matchingCurrent) return { name: ghostEx.name, status: 'skipped' };

      const ghostVol = toFiniteNumber(ghostEx.volume);
      const currentVol = toFiniteNumber(matchingCurrent.volume);

      return {
        name: ghostEx.name,
        ghostVolume: ghostVol,
        currentVolume: currentVol,
        status: currentVol > ghostVol ? 'beat' : currentVol === ghostVol ? 'tied' : 'lost',
        delta: ghostVol > 0 ? ((currentVol - ghostVol) / ghostVol * 100).toFixed(1) : '0',
      };
    });

    return {
      result: ratio >= 1.0 ? 'victory' : ratio >= 0.95 ? 'close' : 'defeat',
      ghostVolume,
      currentVolume,
      ratio: Math.round(ratio * 100),
      bonusXP: totalBonusXP,
      bonuses,
      rewardMode: GHOST_REWARD_MODE,
      trustStatus: GHOST_REWARD_TRUST,
      exerciseComparisons,
    };
  }

  /**
   * Get ghost mode bonus config for frontend display.
   */
  static getConfig() {
    return {
      bonuses: GHOST_BONUSES,
      description: 'Ghost Mode lets you race against your own previous best workout. Beat the ghost for a cosmetic victory moment.',
      rewardMode: GHOST_REWARD_MODE,
      trustStatus: GHOST_REWARD_TRUST,
    };
  }
}

export { GhostModeService, GHOST_BONUSES };
export default GhostModeService;
