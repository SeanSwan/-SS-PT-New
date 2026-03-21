/**
 * Backfill V2 Fields on Existing Exercises
 * ─────────────────────────────────────────────────────────────
 * Updates ~200 existing NASM exercises with V2 metadata:
 *   - exercise_key (already backfilled by migration via SQL)
 *   - bodyPartCategory (mobile filter chip)
 *   - optPhases (which NASM OPT phases each exercise fits)
 *   - force / mechanic / nasmMovementPattern
 *   - defaultTempo / defaultRestSeconds
 *   - source = 'nasm'
 *
 * Safe to re-run (updates only, no inserts).
 *
 * CEO Ruling V2.0: exercise_key must be VARCHAR(255) UNIQUE NOT NULL.
 * This seeder enriches existing records; the migration handles the column.
 */

import Exercise from '../models/Exercise.mjs';
import { categorizeMuscles, generateExerciseKey } from './helpers/exerciseSeederUtils.mjs';

// ─── OPT Phase mapping by exercise type ─────────────────────
// Compound strength exercises fit all phases; isolation is phases 2-3;
// stability/balance are phase 1; flexibility/recovery span all phases.
const OPT_PHASE_MAP = {
  compound: [1, 2, 3, 4, 5],
  isolation: [2, 3],
  core: [1, 2, 3, 4, 5],
  balance: [1],
  stability: [1],
  flexibility: [1, 2, 3, 4, 5],
  calisthenics: [1, 2, 3],
  stabilizers: [1, 2],
  injury_prevention: [1, 2],
  injury_recovery: [1],
};

// ─── Movement Pattern Heuristics ────────────────────────────
// Map exercise names to NASM movement patterns
const MOVEMENT_PATTERNS = [
  { pattern: /squat|lunge|split squat|step.?up|leg press|goblet/i, movement: 'squat' },
  { pattern: /deadlift|hip thrust|good morning|rdl|romanian|glute bridge|hinge/i, movement: 'hinge' },
  { pattern: /bench press|push.?up|dip|chest fly|press.*chest|incline.*press/i, movement: 'push' },
  { pattern: /row|pull.?up|chin.?up|pulldown|lat pull|face pull/i, movement: 'pull' },
  { pattern: /overhead press|shoulder press|military press|landmine press|arnold/i, movement: 'press' },
  { pattern: /woodchop|rotation|russian twist|pallof|anti.?rotation/i, movement: 'rotation' },
  { pattern: /walk|carry|farmer|suitcase|march|gait/i, movement: 'gait' },
];

function detectMovementPattern(name) {
  for (const { pattern, movement } of MOVEMENT_PATTERNS) {
    if (pattern.test(name)) return movement;
  }
  return null;
}

// ─── Force Detection Heuristics ─────────────────────────────
const FORCE_PATTERNS = [
  { pattern: /press|push|dip|extension|raise|fly|squat|lunge|leg press|thrust/i, force: 'push' },
  { pattern: /row|pull|curl|deadlift|face pull|shrug|pulldown/i, force: 'pull' },
  { pattern: /plank|hold|static|isometric|wall sit/i, force: 'static' },
];

function detectForce(name) {
  for (const { pattern, force } of FORCE_PATTERNS) {
    if (pattern.test(name)) return force;
  }
  return null;
}

// ─── Default Tempo by Exercise Type ─────────────────────────
const DEFAULT_TEMPOS = {
  compound: '2/0/2',
  isolation: '2/1/2',
  core: '3/1/2',
  balance: '4/2/1',
  stability: '4/2/1',
  flexibility: '2/2/2',
  calisthenics: '2/0/1',
  stabilizers: '4/2/1',
  injury_prevention: '3/1/2',
  injury_recovery: '3/2/2',
};

// ─── Default Rest by Exercise Type ──────────────────────────
const DEFAULT_REST = {
  compound: 90,
  isolation: 60,
  core: 45,
  balance: 30,
  stability: 30,
  flexibility: 30,
  calisthenics: 60,
  stabilizers: 30,
  injury_prevention: 45,
  injury_recovery: 60,
};

/**
 * Run the backfill: find all exercises missing V2 fields and update them.
 */
export async function backfillExerciseV2Fields() {
  const exercises = await Exercise.findAll();
  let updated = 0;

  for (const ex of exercises) {
    const updates = {};

    // exercise_key — should already be set by migration, but verify
    if (!ex.exercise_key) {
      updates.exercise_key = generateExerciseKey(ex.name, 'nasm');
    }

    // source
    if (!ex.source) {
      updates.source = 'nasm';
    }

    // bodyPartCategory
    if (!ex.bodyPartCategory) {
      const primaryMuscles = typeof ex.getDataValue('primaryMuscles') === 'string'
        ? JSON.parse(ex.getDataValue('primaryMuscles'))
        : ex.primaryMuscles;
      updates.bodyPartCategory = categorizeMuscles(primaryMuscles, ex.exerciseType);
    }

    // optPhases
    const currentPhases = ex.optPhases;
    if (!currentPhases || currentPhases.length === 0) {
      updates.optPhases = JSON.stringify(OPT_PHASE_MAP[ex.exerciseType] || [1, 2, 3, 4, 5]);
    }

    // nasmMovementPattern
    if (!ex.nasmMovementPattern) {
      const pattern = detectMovementPattern(ex.name);
      if (pattern) updates.nasmMovementPattern = pattern;
    }

    // force
    if (!ex.force) {
      const force = detectForce(ex.name);
      if (force) updates.force = force;
    }

    // mechanic (compound exercises in 'compound' or 'isolation' type)
    if (!ex.mechanic) {
      updates.mechanic = ex.exerciseType === 'isolation' ? 'isolation' : 'compound';
    }

    // defaultTempo
    if (!ex.defaultTempo) {
      updates.defaultTempo = DEFAULT_TEMPOS[ex.exerciseType] || '2/0/2';
    }

    // defaultRestSeconds
    if (!ex.defaultRestSeconds) {
      updates.defaultRestSeconds = DEFAULT_REST[ex.exerciseType] || 60;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await ex.update(updates);
      updated++;
    }
  }

  console.log(`Backfilled V2 fields on ${updated}/${exercises.length} exercises`);
  return { total: exercises.length, updated };
}

// Allow direct execution: node backend/seeders/20260321-backfill-exercise-v2-fields.mjs
const isDirectRun = process.argv[1]?.includes('backfill-exercise-v2');
if (isDirectRun) {
  backfillExerciseV2Fields()
    .then((r) => { console.log('Done:', r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
