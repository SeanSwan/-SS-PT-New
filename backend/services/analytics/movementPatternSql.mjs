/**
 * ============================================================================
 * FILE: movementPatternSql.mjs
 * PURPOSE: Single source of truth for the NASM movement-pattern SQL CASE
 *          mapping used by every analytics consumer (chart + progress pulse).
 * CREATED: 2026-07-02 (Slice 8.1 — Progress Intelligence)
 * ============================================================================
 *
 * WHY THIS EXISTS:
 * `chart-movement-pattern-balance` (chartDataController.mjs) and the
 * progress-pulse push/pull metric (progressPulseService.mjs) must classify
 * exercises identically — if the mappings drift, the balance chart and the
 * push/pull ratio disagree about the same workout history. Extracting the
 * CASE fragment here makes drift structurally impossible (Rule 58).
 *
 * CONTRACT:
 * - The fragment classifies `wl."exerciseName"` (alias `wl` on workout_logs)
 *   into: squat | hinge | push | pull | carry | core | other.
 * - Mapping is conservative — common exercise-name substrings only.
 *   Unmapped exercises fall into 'other' rather than being dropped, so
 *   consumers always report real total volume.
 * - Any keyword change here updates BOTH the chart and the pulse metric.
 */

export const MOVEMENT_PATTERN_CASE_SQL = `CASE
           WHEN wl."exerciseName" ILIKE '%squat%'
             OR wl."exerciseName" ILIKE '%lunge%'
             OR wl."exerciseName" ILIKE '%step-up%'
             OR wl."exerciseName" ILIKE '%leg press%'
             THEN 'squat'
           WHEN wl."exerciseName" ILIKE '%deadlift%'
             OR wl."exerciseName" ILIKE '%rdl%'
             OR wl."exerciseName" ILIKE '%hip hinge%'
             OR wl."exerciseName" ILIKE '%good morning%'
             OR wl."exerciseName" ILIKE '%hip thrust%'
             OR wl."exerciseName" ILIKE '%glute bridge%'
             THEN 'hinge'
           WHEN wl."exerciseName" ILIKE '%bench%'
             OR wl."exerciseName" ILIKE '%push-up%'
             OR wl."exerciseName" ILIKE '%pushup%'
             OR wl."exerciseName" ILIKE '%overhead press%'
             OR wl."exerciseName" ILIKE '%shoulder press%'
             OR wl."exerciseName" ILIKE '%ohp%'
             OR wl."exerciseName" ILIKE '%dip%'
             OR wl."exerciseName" ILIKE '%chest fly%'
             THEN 'push'
           WHEN wl."exerciseName" ILIKE '%row%'
             OR wl."exerciseName" ILIKE '%pull-up%'
             OR wl."exerciseName" ILIKE '%pullup%'
             OR wl."exerciseName" ILIKE '%chin-up%'
             OR wl."exerciseName" ILIKE '%chinup%'
             OR wl."exerciseName" ILIKE '%pulldown%'
             OR wl."exerciseName" ILIKE '%face pull%'
             OR wl."exerciseName" ILIKE '%curl%'
             THEN 'pull'
           WHEN wl."exerciseName" ILIKE '%carry%'
             OR wl."exerciseName" ILIKE '%farmer%'
             OR wl."exerciseName" ILIKE '%sled%'
             OR wl."exerciseName" ILIKE '%suitcase%'
             THEN 'carry'
           WHEN wl."exerciseName" ILIKE '%plank%'
             OR wl."exerciseName" ILIKE '%crunch%'
             OR wl."exerciseName" ILIKE '%core%'
             OR wl."exerciseName" ILIKE '%oblique%'
             OR wl."exerciseName" ILIKE '%dead bug%'
             OR wl."exerciseName" ILIKE '%bird dog%'
             OR wl."exerciseName" ILIKE '%hollow%'
             OR wl."exerciseName" ILIKE '%russian twist%'
             OR wl."exerciseName" ILIKE '%sit-up%'
             OR wl."exerciseName" ILIKE '%situp%'
             THEN 'core'
           ELSE 'other'
         END`;

/** Named movement patterns (excludes the 'other' catch-all bucket). */
export const NAMED_MOVEMENT_PATTERNS = ['squat', 'hinge', 'push', 'pull', 'carry', 'core'];

export default MOVEMENT_PATTERN_CASE_SQL;
