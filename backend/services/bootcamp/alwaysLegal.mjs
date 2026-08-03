/**
 * ============================================================================
 * FILE: backend/services/bootcamp/alwaysLegal.mjs
 * PURPOSE: The pinned bodyweight set that makes rung R5 a mathematical
 *          guarantee instead of a search that can come back empty.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-02 | SLICE: SWA-105 Slice 2
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (Opus 5 §A3): "R5 is a mathematical guarantee, not a
 * search." The relaxation ladder promises it never dead-ends. A promise backed
 * by "we'll look harder" is not a guarantee — under a narrow equipment profile
 * the search space is exactly what ran out. So the guarantee is a PIN: a fixed
 * set that requires zero equipment, carries low impact, and therefore survives
 * every room profile the gym can present.
 *
 * WHAT THIS REPLACED, AND WHY IT MATTERED. Slice 1's fail-open ladder ended in
 * `unfiltered` — when even the relaxed pool starved, it returned the RAW pool.
 * That step re-opened D1 on exactly the classes least able to absorb it: a
 * narrow equipment profile produced a thin pool, the thin pool tripped the
 * fallback, and the fallback put squats back on upper day. The bug slice 1
 * closed came back through the door slice 1 built. R5 closes it: when the pool
 * starves, the class tops up with movements that are STILL DAY-LEGAL, because
 * every entry here runs through the same day-type contract as everything else.
 *
 * COVERAGE MATH (verified by test, not by assertion):
 *   lower_body — squat, lunge, hinge x2, isometric ...... 5
 *   upper_body — push x3, pull x3 ....................... 6
 *   cardio     — everything except `carry` .............. 14
 *   full_body  — everything ............................ 14
 * Every rotation clears the 3-4 exercises a collapsed small class needs, so R6
 * (no exercise exists) is unreachable through pool construction. R6 remains
 * reachable only in the SwapDeck, where the trainer can reject bodyweight.
 *
 * ZERO-EQUIPMENT UPPER-BODY PULL IS THE HARD CASE and it is why prone Y-T-W,
 * the towel/isometric row and the wall slide are here: a set that quietly
 * dropped `pull` would hand upper day a push-only R5, which is a shoulder-injury
 * pattern, not a fallback.
 *
 * SHAPE: registry-shaped (`key`, `name`, `muscles[]`, `category`, `equipment[]`)
 * so `toCoreMovement` classifies these the same way it classifies everything
 * else. Nothing here gets a special path through the contract — a special path
 * is how an exception becomes a leak.
 */

/** Marker on every entry, so downstream code can tell a pin from a real pick. */
export const ALWAYS_LEGAL_SOURCE = 'always_legal';

/**
 * MODS ARE NOT OPTIONAL HERE. Board 2 (joint-friendly) and Board 3 (low-impact)
 * are generated from `easy` / `*Mod` fields; an entry without them produces no
 * alternative rows at all. A pinned set with no mods would therefore strip the
 * joint-friendly path off the board at precisely the moment it is needed most —
 * the thin, equipment-poor room where R5 fired. Every entry carries at least an
 * easier regression and the mod for the joint its pattern loads.
 */
const bw = (key, name, muscles, category, mods = {}) => Object.freeze({
  key,
  name,
  muscles: Object.freeze(muscles),
  category,
  equipment: Object.freeze([]),
  // Instant setup by definition — nothing to carry, nothing to load.
  setupTimeSec: 0,
  isAlwaysLegal: true,
  source: ALWAYS_LEGAL_SOURCE,
  ...mods,
});

/**
 * The pinned set. Ordered lower -> upper -> core so that, at equal rung, a
 * day's own region surfaces before the incidental ones.
 */
export const ALWAYS_LEGAL_EXERCISES = Object.freeze([
  // ── lower (5) ──────────────────────────────────────────────────────
  bw('bodyweight_squat', 'Bodyweight Squat', ['quads', 'glutes'], 'squat', {
    easy: 'Box Squat to Bench', hard: 'Tempo Squat 3-1-3',
    kneeMod: 'Sit-to-Stand from Chair', ankleMod: 'Heel-Elevated Squat', backMod: 'Wall Squat Hold',
  }),
  bw('reverse_lunge', 'Reverse Lunge', ['quads', 'glutes'], 'lunge', {
    easy: 'Split Stance Hold', hard: 'Deficit Reverse Lunge',
    kneeMod: 'Step-Back to Chair Touch', ankleMod: 'Static Split Squat', hipMod: 'Shortened Step Length',
  }),
  bw('glute_bridge', 'Glute Bridge', ['glutes', 'hamstrings'], 'hinge', {
    easy: 'Two-Second Bridge Hold', hard: 'Single-Leg Glute Bridge',
    backMod: 'Posterior Pelvic Tilt Only', kneeMod: 'Feet Further From Hips',
  }),
  bw('bodyweight_good_morning', 'Bodyweight Good Morning', ['hamstrings', 'glutes'], 'hinge', {
    easy: 'Hip Hinge to Wall', hard: 'Single-Leg Good Morning',
    backMod: 'Hip Hinge to Wall', hipMod: 'Reduced Range Hinge',
  }),
  bw('wall_sit', 'Wall Sit', ['quads'], 'corrective', {
    easy: 'Quarter-Depth Wall Sit', hard: 'Single-Leg Wall Sit',
    kneeMod: 'Quarter-Depth Wall Sit', ankleMod: 'Wall Sit, Feet Flat and Wide',
  }),

  // ── upper (6) — push x3, pull x3; see the note above on why pull is here ──
  bw('push_up', 'Push-Up', ['chest', 'triceps'], 'push', {
    easy: 'Incline Push-Up', hard: 'Tempo Push-Up 3-1-3',
    wristMod: 'Push-Up on Fists', shoulderMod: 'Incline Push-Up', elbowMod: 'Narrow-Range Push-Up',
  }),
  bw('incline_push_up', 'Incline Push-Up', ['chest', 'triceps'], 'push', {
    easy: 'Wall Push-Up', hard: 'Push-Up',
    wristMod: 'Wall Push-Up on Fists', shoulderMod: 'Wall Push-Up',
  }),
  bw('pike_push_up', 'Pike Push-Up', ['anterior_deltoid', 'triceps'], 'push', {
    easy: 'Wall-Supported Pike Hold', hard: 'Elevated Pike Push-Up',
    shoulderMod: 'Seated Overhead Reach', wristMod: 'Pike Hold on Forearms',
  }),
  bw('prone_ytw', 'Prone Y-T-W Raise', ['rhomboids', 'rear_deltoid'], 'pull', {
    easy: 'Prone T Raise Only', hard: 'Prone Y-T-W with Pause',
    backMod: 'Standing Wall Y-T-W', shoulderMod: 'Reduced Range Y-T-W',
  }),
  bw('isometric_towel_row', 'Isometric Towel Row', ['lats', 'biceps'], 'pull', {
    easy: 'Seated Scapular Retraction', hard: 'Single-Arm Towel Row Hold',
    elbowMod: 'Scapular Retraction Only', backMod: 'Seated Towel Row',
  }),
  bw('wall_slide', 'Wall Slide', ['traps', 'rotator_cuff'], 'pull', {
    easy: 'Wall Slide, Hands Only', hard: 'Wall Slide with Lift-Off',
    shoulderMod: 'Wall Slide, Hands Only', backMod: 'Seated Wall Slide',
  }),

  // ── core (3) ───────────────────────────────────────────────────────
  bw('front_plank', 'Front Plank', ['core', 'tva'], 'core', {
    easy: 'Incline Plank on Bench', hard: 'Long-Lever Plank',
    wristMod: 'Forearm Plank', backMod: 'Incline Plank on Bench', shoulderMod: 'Knee Plank',
  }),
  bw('dead_bug', 'Dead Bug', ['core', 'tva'], 'core', {
    easy: 'Dead Bug, Arms Only', hard: 'Dead Bug with Pause',
    backMod: 'Dead Bug, Heels Down', hipMod: 'Dead Bug, Arms Only',
  }),
  bw('side_plank', 'Side Plank', ['obliques', 'core'], 'core', {
    easy: 'Knee Side Plank', hard: 'Side Plank with Hip Dip',
    shoulderMod: 'Side-Lying Hip Raise', wristMod: 'Forearm Side Plank', backMod: 'Knee Side Plank',
  }),
]);

/**
 * The pinned set, minus anything already present in the live pool.
 *
 * De-duped on `key` so a gym whose Rolodex already carries "Push-Up" does not
 * see it twice — once as a real pick and once as a bodyweight substitute, which
 * would put the same movement at two stations wearing two different chips.
 *
 * @param {Array} pool  exercises already available to the class
 * @returns {Array} pinned entries not represented in `pool`
 */
export function alwaysLegalTopUp(pool = []) {
  const present = new Set();
  for (const exercise of pool) {
    if (exercise?.key) present.add(String(exercise.key).toLowerCase());
    if (exercise?.name) present.add(String(exercise.name).toLowerCase().replace(/\s+/g, '_'));
  }
  return ALWAYS_LEGAL_EXERCISES.filter((exercise) => !present.has(exercise.key));
}
