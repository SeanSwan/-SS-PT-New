/**
 * Long-Horizon Registry Fixture
 * =============================
 *
 * Controlled exercise registry for L1 long-horizon plan tests. Designed
 * per receipt §R9 (D4) so pain/equipment filtering can be asserted via
 * EXPLICIT TAGS rather than fuzzy registry name matching.
 *
 * Each exercise has:
 *   key             — canonical identifier
 *   name            — display name (used by formatExerciseName upstream)
 *   muscles[]       — body parts targeted
 *   category        — movement category for selectExercises filter
 *   equipment[]     — required equipment items (matches client equipmentItems)
 *   nasmLevel       — recommended OPT phase (1-5)
 *
 * The fixture intentionally varies eligible-pool size per category so
 * tests can:
 *   R6 — strict no-repeat works when category × equipment yields ≥ 7
 *   R7 — fallback metadata fires when category × equipment yields < 7
 *   R9 — pain exclusion filtering (via filterExercises constraint logic)
 *
 * Usage:
 *   import { fixtureRegistry } from '../fixtures/longHorizonRegistryFixture.mjs';
 *   const plan = await generatePlan({ ..., registryOverride: fixtureRegistry });
 */

export const fixtureRegistry = [
  // ── PUSH (full equipment available — pool size 8 → strict rotation works) ──
  { key: 'fx-bb-bench', name: 'Barbell Bench Press', muscles: ['Chest','Triceps'], category: 'push', equipment: ['barbell','bench'], nasmLevel: 3 },
  { key: 'fx-db-bench', name: 'Dumbbell Bench Press', muscles: ['Chest','Triceps'], category: 'push', equipment: ['dumbbell','bench'], nasmLevel: 3 },
  { key: 'fx-pushup',   name: 'Push-Up',              muscles: ['Chest','Triceps'], category: 'push', equipment: ['bodyweight'],     nasmLevel: 1 },
  { key: 'fx-incline',  name: 'Incline Bench Press',  muscles: ['Chest','Shoulders'], category: 'push', equipment: ['barbell','bench'], nasmLevel: 3 },
  { key: 'fx-ohp',      name: 'Overhead Press',       muscles: ['Shoulders','Triceps'], category: 'push', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'fx-db-ohp',   name: 'Dumbbell Overhead Press', muscles: ['Shoulders'], category: 'push', equipment: ['dumbbell'], nasmLevel: 2 },
  { key: 'fx-dip',      name: 'Dip',                  muscles: ['Chest','Triceps'], category: 'push', equipment: ['dip_bar'], nasmLevel: 3 },
  { key: 'fx-pike',     name: 'Pike Push-Up',         muscles: ['Shoulders'], category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },

  // ── PULL (full equipment — pool size 8 → strict rotation works) ──
  { key: 'fx-pullup',   name: 'Pull-Up',              muscles: ['Back','Biceps'], category: 'pull', equipment: ['pull_up_bar'], nasmLevel: 3 },
  { key: 'fx-bb-row',   name: 'Barbell Row',          muscles: ['Back','Biceps'], category: 'pull', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'fx-db-row',   name: 'Dumbbell Row',         muscles: ['Back','Biceps'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 2 },
  { key: 'fx-band-row', name: 'Resistance Band Row',  muscles: ['Back','Biceps'], category: 'pull', equipment: ['resistance_band'], nasmLevel: 1 },
  { key: 'fx-lat-pull', name: 'Lat Pulldown',         muscles: ['Back','Biceps'], category: 'pull', equipment: ['cable'], nasmLevel: 2 },
  { key: 'fx-face-pull',name: 'Face Pull',            muscles: ['Back','RearDelts'], category: 'pull', equipment: ['cable'], nasmLevel: 1 },
  { key: 'fx-inv-row',  name: 'Inverted Row',         muscles: ['Back','Biceps'], category: 'pull', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'fx-curl',     name: 'Bicep Curl',           muscles: ['Biceps'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 2 },

  // ── LEGS (squat/hinge/lunge mapped to "legs" category to align with the
  //         production rotation pool which uses push/pull/legs/full_body) ──
  { key: 'fx-bb-squat', name: 'Barbell Back Squat',   muscles: ['Quads','Glutes'], category: 'legs', equipment: ['barbell','rack'], nasmLevel: 3 },
  { key: 'fx-bb-fsquat',name: 'Barbell Front Squat',  muscles: ['Quads','Core'],   category: 'legs', equipment: ['barbell','rack'], nasmLevel: 4 },
  { key: 'fx-bw-squat', name: 'Bodyweight Squat',     muscles: ['Quads','Glutes'], category: 'legs', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'fx-goblet',   name: 'Goblet Squat',         muscles: ['Quads','Glutes'], category: 'legs', equipment: ['dumbbell'], nasmLevel: 2 },
  { key: 'fx-bb-dl',    name: 'Barbell Deadlift',     muscles: ['Back','Hamstrings','Glutes'], category: 'legs', equipment: ['barbell'], nasmLevel: 4 },
  { key: 'fx-rdl',      name: 'Romanian Deadlift',    muscles: ['Hamstrings','Glutes'], category: 'legs', equipment: ['barbell','dumbbell'], nasmLevel: 3 },
  { key: 'fx-glute-bridge', name: 'Glute Bridge',     muscles: ['Glutes'], category: 'legs', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'fx-hip-thrust',name: 'Hip Thrust',          muscles: ['Glutes'], category: 'legs', equipment: ['barbell','bench'], nasmLevel: 3 },
  { key: 'fx-walking-lunge',name: 'Walking Lunge',    muscles: ['Quads','Glutes'], category: 'legs', equipment: ['bodyweight','dumbbell'], nasmLevel: 2 },
  { key: 'fx-rev-lunge', name: 'Reverse Lunge',       muscles: ['Quads','Glutes'], category: 'legs', equipment: ['dumbbell'], nasmLevel: 2 },
  { key: 'fx-bulg-split',name: 'Bulgarian Split Squat',muscles: ['Quads','Glutes'], category: 'legs', equipment: ['dumbbell','bench'], nasmLevel: 3 },

  // ── CORE ──
  { key: 'fx-plank',    name: 'Plank',                muscles: ['Core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'fx-deadbug',  name: 'Dead Bug',             muscles: ['Core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'fx-rus-twist',name: 'Russian Twist',        muscles: ['Core','Obliques'], category: 'core', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'fx-hang-knee',name: 'Hanging Knee Raise',   muscles: ['Core'], category: 'core', equipment: ['pull_up_bar'], nasmLevel: 2 },
];

/**
 * Bodyweight-only subset — for tests that need a deliberately small pool
 * to trigger R7 rotation fallback metadata.
 */
export const fixtureRegistryBodyweightOnly = fixtureRegistry.filter(
  (ex) => Array.isArray(ex.equipment) && ex.equipment.includes('bodyweight') && ex.equipment.length === 1
);

/**
 * Helpful per-category counts for assertions.
 */
export const fixturePoolSizes = {
  push: fixtureRegistry.filter((ex) => ex.category === 'push').length,
  pull: fixtureRegistry.filter((ex) => ex.category === 'pull').length,
  legs: fixtureRegistry.filter((ex) => ex.category === 'legs').length,
  core: fixtureRegistry.filter((ex) => ex.category === 'core').length,
};
