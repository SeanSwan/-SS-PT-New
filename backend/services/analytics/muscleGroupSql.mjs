/**
 * ============================================================================
 * FILE: muscleGroupSql.mjs
 * PURPOSE: Single source of truth for the muscle-group SQL CASE mapping used
 *          by every analytics consumer (the muscle-group balance chart AND the
 *          strength-profile radar).
 * CREATED: 2026-07-16 (data-truth sweep — classifier unification)
 * ============================================================================
 *
 * WHY THIS EXISTS:
 * `getMuscleGroupBalanceChart` (chartDataController.mjs) and
 * `calculateExerciseTotalsFromLogs` (analyticsExerciseTotalsService.mjs, the
 * radar) each had their OWN muscle-group CASE, and they DISAGREED on identical
 * logs — e.g. "Back Squat" was Legs on the chart but Back on the radar, and
 * "Leg Curl"/"Leg Extension" were mislabeled Arms on both (Arms was evaluated
 * before Legs). Extracting the CASE here makes drift structurally impossible
 * (Rule 58) and fixes the ordering bugs in one place.
 *
 * CONTRACT:
 * - Classifies `wl."exerciseName"` (alias `wl` on workout_logs) into a
 *   canonical LOWERCASE key: chest | back | shoulders | arms | legs | core |
 *   full_body | cardio | other.
 * - **Ordering matters** — Legs is evaluated BEFORE Arms and Back so
 *   "Leg Curl"/"Leg Extension" → legs (not arms) and "Back Squat" → legs
 *   (not back). Cardio is first so treadmill/bike don't get caught elsewhere.
 * - Unmapped exercises fall into 'other' (never dropped) so consumers report
 *   real total volume.
 * - Consumers map the canonical key to their own display label via
 *   MUSCLE_GROUP_DISPLAY (the chart) or their category set (the radar).
 */

export const MUSCLE_GROUP_CASE_SQL = `CASE
           WHEN wl."exerciseName" ILIKE '%treadmill%'
             OR wl."exerciseName" ILIKE '%elliptical%'
             OR wl."exerciseName" ILIKE '%stationary bike%'
             OR wl."exerciseName" ILIKE '%assault bike%'
             OR wl."exerciseName" ILIKE '%rowing machine%'
             OR wl."exerciseName" ILIKE '%cardio%'
             OR wl."exerciseName" ILIKE '%jog%'
             OR wl."exerciseName" ILIKE '%sprint%'
             OR wl."exerciseName" ILIKE '%running%'
             THEN 'cardio'
           WHEN wl."exerciseName" ILIKE '%squat%'
             OR wl."exerciseName" ILIKE '%leg%'
             OR wl."exerciseName" ILIKE '%lunge%'
             OR wl."exerciseName" ILIKE '%calf%'
             OR wl."exerciseName" ILIKE '%hamstring%'
             OR wl."exerciseName" ILIKE '%quad%'
             OR wl."exerciseName" ILIKE '%hip thrust%'
             OR wl."exerciseName" ILIKE '%glute%'
             OR wl."exerciseName" ILIKE '%step-up%'
             THEN 'legs'
           WHEN wl."exerciseName" ILIKE '%chest%'
             OR wl."exerciseName" ILIKE '%bench%'
             OR wl."exerciseName" ILIKE '%push-up%'
             OR wl."exerciseName" ILIKE '%pushup%'
             OR wl."exerciseName" ILIKE '%pec%'
             OR wl."exerciseName" ILIKE '%dip%'
             THEN 'chest'
           WHEN wl."exerciseName" ILIKE '%row%'
             OR wl."exerciseName" ILIKE '%pull-up%'
             OR wl."exerciseName" ILIKE '%pullup%'
             OR wl."exerciseName" ILIKE '%chin-up%'
             OR wl."exerciseName" ILIKE '%chinup%'
             OR wl."exerciseName" ILIKE '%lat pull%'
             OR wl."exerciseName" ILIKE '%pulldown%'
             OR wl."exerciseName" ILIKE '%deadlift%'
             OR wl."exerciseName" ILIKE '%rdl%'
             OR wl."exerciseName" ILIKE '%back extension%'
             THEN 'back'
           WHEN wl."exerciseName" ILIKE '%shoulder%'
             OR wl."exerciseName" ILIKE '%delt%'
             OR wl."exerciseName" ILIKE '%overhead%'
             OR wl."exerciseName" ILIKE '%ohp%'
             OR wl."exerciseName" ILIKE '%lateral raise%'
             OR wl."exerciseName" ILIKE '%front raise%'
             OR wl."exerciseName" ILIKE '%military%'
             OR wl."exerciseName" ILIKE '%arnold%'
             OR wl."exerciseName" ILIKE '%face pull%'
             THEN 'shoulders'
           WHEN wl."exerciseName" ILIKE '%bicep%'
             OR wl."exerciseName" ILIKE '%tricep%'
             OR wl."exerciseName" ILIKE '%curl%'
             OR wl."exerciseName" ILIKE '%extension%'
             OR wl."exerciseName" ILIKE '%hammer%'
             OR wl."exerciseName" ILIKE '%preacher%'
             OR wl."exerciseName" ILIKE '%skull%'
             THEN 'arms'
           WHEN wl."exerciseName" ILIKE '%plank%'
             OR wl."exerciseName" ILIKE '%crunch%'
             OR wl."exerciseName" ILIKE '%core%'
             OR wl."exerciseName" ILIKE '%oblique%'
             OR wl."exerciseName" ILIKE '%russian twist%'
             OR wl."exerciseName" ILIKE '%sit-up%'
             OR wl."exerciseName" ILIKE '%situp%'
             OR wl."exerciseName" ILIKE '%dead bug%'
             OR wl."exerciseName" ILIKE '%bird dog%'
             OR wl."exerciseName" ILIKE '%hollow%'
             THEN 'core'
           WHEN wl."exerciseName" ILIKE '%clean%'
             OR wl."exerciseName" ILIKE '%snatch%'
             OR wl."exerciseName" ILIKE '%thruster%'
             OR wl."exerciseName" ILIKE '%turkish get-up%'
             OR wl."exerciseName" ILIKE '%farmer%'
             OR wl."exerciseName" ILIKE '%kettlebell swing%'
             OR wl."exerciseName" ILIKE '%battle rope%'
             OR wl."exerciseName" ILIKE '%carry%'
             THEN 'full_body'
           ELSE 'other'
         END`;

/** Canonical key → display label (Title Case) for the balance chart x-axis. */
export const MUSCLE_GROUP_DISPLAY = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  full_body: 'Full Body',
  cardio: 'Cardio',
  other: 'Other',
};

/** Radar category keys (the strength-profile radar has no full_body bucket). */
export const RADAR_MUSCLE_GROUP_KEYS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];

export default MUSCLE_GROUP_CASE_SQL;
