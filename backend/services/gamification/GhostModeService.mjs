/**
 * ============================================================================
 * FILE: GhostModeService.mjs
 * PURPOSE: Ghost Mode — compete against your own previous workout performance
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Retrieves a user's best previous workout matching the
 * current category/muscle group and creates a "ghost" comparison. During the
 * workout, the user sees their previous reps/weight/volume as a target to beat.
 * Beating the ghost awards bonus XP and triggers a "Ghost Defeated" celebration.
 *
 * HOW IT FITS IN THE APP: Called from workout logger when Ghost Mode is toggled on.
 * The service queries WorkoutSessions for matching previous workouts and formats
 * the ghost data for real-time comparison.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Ghost Data Structure
// PURPOSE: Defines what ghost data looks like for comparison
// ─────────────────────────────────────────────────────────────

/**
 * Ghost data shape returned to frontend:
 * {
 *   ghostId: string,
 *   sourceSessionId: number,
 *   sourceDate: ISO string,
 *   category: string,
 *   totalVolume: number,
 *   totalSets: number,
 *   exercises: [
 *     { name, sets: [{ reps, weight, volume }], totalVolume }
 *   ],
 *   comparison: { metric: 'volume' | 'reps' | 'weight', target: number }
 * }
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Bonus XP Awards
// ─────────────────────────────────────────────────────────────

const GHOST_BONUSES = {
  ghost_defeated: 50,        // Beat ghost's total volume
  ghost_crushed: 100,        // Beat ghost by 10%+
  ghost_dominated: 200,      // Beat ghost by 25%+
  ghost_matched: 25,         // Matched ghost within 5%
  personal_record_ghost: 150, // Set a PR while in ghost mode
};

// ─────────────────────────────────────────────────────────────
// SECTION: Core Service
// ─────────────────────────────────────────────────────────────

class GhostModeService {
  /**
   * Get the best matching previous workout to serve as the ghost.
   * Prioritizes: same category → same day-of-week → highest volume.
   */
  static async getGhost(userId, options = {}) {
    const { category = 'full_body', muscleGroup = null, exerciseIds = [] } = options;

    // Dynamic import to avoid circular dependencies
    const db = (await import('../../database.mjs')).default;

    try {
      // Query for matching previous workout sessions
      const query = `
        SELECT ws.id, ws."sessionDate", ws.category, ws.notes,
               ws."totalVolume", ws."totalSets", ws."totalReps",
               ws."createdAt",
               json_agg(json_build_object(
                 'exerciseName', we."exerciseName",
                 'sets', we.sets,
                 'reps', we.reps,
                 'weight', we.weight,
                 'volume', (COALESCE(we.sets, 0) * COALESCE(we.reps, 0) * COALESCE(we.weight, 0)),
                 'exerciseId', we."exerciseId"
               ) ORDER BY we."orderIndex") as exercises
        FROM "WorkoutSessions" ws
        LEFT JOIN "WorkoutExercises" we ON we."sessionId" = ws.id
        WHERE ws."userId" = :userId
          AND ws.status = 'completed'
          ${category ? 'AND ws.category = :category' : ''}
        GROUP BY ws.id
        ORDER BY ws."totalVolume" DESC NULLS LAST, ws."sessionDate" DESC
        LIMIT 5
      `;

      const [results] = await db.query(query, {
        replacements: { userId, ...(category ? { category } : {}) },
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
        sourceDate: bestSession.sessionDate || bestSession.createdAt,
        category: bestSession.category || category,
        totalVolume: parseFloat(bestSession.totalVolume) || 0,
        totalSets: parseInt(bestSession.totalSets) || 0,
        totalReps: parseInt(bestSession.totalReps) || 0,
        exercises: (bestSession.exercises || []).filter(e => e.exerciseName).map(e => ({
          name: e.exerciseName,
          exerciseId: e.exerciseId,
          sets: e.sets || 0,
          reps: e.reps || 0,
          weight: e.weight || 0,
          volume: e.volume || 0,
        })),
        comparison: {
          metric: 'volume',
          target: parseFloat(bestSession.totalVolume) || 0,
        },
      };

      return { hasGhost: true, ghost };
    } catch (err) {
      console.error('[GhostMode] getGhost error:', err.message);
      return { hasGhost: false, message: 'Failed to load ghost data' };
    }
  }

  /**
   * Compare a completed workout against the ghost and award bonuses.
   * Returns the comparison result and any bonus XP earned.
   */
  static compareWithGhost(ghostData, currentWorkoutData) {
    if (!ghostData || !currentWorkoutData) {
      return { result: 'no_comparison', bonusXP: 0, bonuses: [] };
    }

    const ghostVolume = ghostData.totalVolume || 0;
    const currentVolume = currentWorkoutData.totalVolume || 0;

    if (ghostVolume === 0) {
      return { result: 'no_comparison', bonusXP: 0, bonuses: [] };
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
    const exerciseComparisons = (ghostData.exercises || []).map(ghostEx => {
      const matchingCurrent = (currentWorkoutData.exercises || []).find(
        e => e.exerciseId === ghostEx.exerciseId || e.name === ghostEx.name
      );

      if (!matchingCurrent) return { name: ghostEx.name, status: 'skipped' };

      const ghostVol = ghostEx.volume || 0;
      const currentVol = matchingCurrent.volume || 0;

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
      exerciseComparisons,
    };
  }

  /**
   * Get ghost mode bonus config for frontend display.
   */
  static getConfig() {
    return {
      bonuses: GHOST_BONUSES,
      description: 'Ghost Mode lets you race against your own previous best workout. Beat the ghost to earn bonus XP!',
    };
  }
}

export { GhostModeService, GHOST_BONUSES };
export default GhostModeService;
