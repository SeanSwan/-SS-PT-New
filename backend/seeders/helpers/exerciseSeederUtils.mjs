/**
 * exerciseSeederUtils.mjs
 * ─────────────────────────────────────────────────────────────
 * Shared utilities for exercise seeding — maps body parts to
 * mobile-friendly filter categories, generates exercise_keys,
 * and provides the V2 exercise builder function.
 *
 * Used by: 20260321-seed-exercise-v2-fields.mjs
 *          20260321-seed-expanded-exercises.mjs
 */

import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

// ─── Body Part → Mobile Filter Chip Category Mapping ────────
// Maps 31+ body parts to 10 mobile-friendly filter chips
// per CLAUDE.md: All, Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Recovery, Cardio
const BODY_PART_TO_CATEGORY = {
  // Chest
  pectorals: 'chest', 'upper pectorals': 'chest', 'lower pectorals': 'chest',
  chest: 'chest',

  // Back
  'latissimus dorsi': 'back', lats: 'back', rhomboids: 'back',
  trapezius: 'back', traps: 'back', 'erector spinae': 'back',
  'upper back': 'back', 'lower back': 'back', back: 'back',

  // Shoulders
  deltoids: 'shoulders', 'anterior deltoids': 'shoulders',
  'medial deltoids': 'shoulders', 'rear deltoids': 'shoulders',
  'posterior deltoids': 'shoulders', 'rotator cuff': 'shoulders',
  shoulders: 'shoulders', delts: 'shoulders',

  // Arms
  biceps: 'arms', triceps: 'arms', forearms: 'arms',
  brachialis: 'arms', 'wrist flexors': 'arms', 'wrist extensors': 'arms',

  // Legs
  quadriceps: 'legs', quads: 'legs', hamstrings: 'legs',
  glutes: 'legs', calves: 'legs', 'hip flexors': 'legs',
  adductors: 'legs', abductors: 'legs', 'tibialis anterior': 'legs',
  'hip rotators': 'legs',

  // Core
  core: 'core', abdominals: 'core', abs: 'core',
  obliques: 'core', 'transverse abdominis': 'core',
  'rectus abdominis': 'core', 'pelvic floor': 'core',

  // Full Body (set manually for compound multi-region exercises)

  // Recovery
  'it band': 'recovery', 'thoracic spine': 'recovery',
};

/**
 * Determine the mobile filter category from an exercise's primary muscles.
 *
 * @param {string[]} primaryMuscles - Array of primary muscle names
 * @param {string}   exerciseType   - The exercise type (flexibility → recovery)
 * @returns {string} One of: chest, back, shoulders, arms, legs, core, full_body, recovery, cardio
 */
export function categorizeMuscles(primaryMuscles, exerciseType) {
  if (!primaryMuscles || primaryMuscles.length === 0) return 'full_body';

  // Flexibility and injury recovery → recovery category
  if (['flexibility', 'injury_recovery'].includes(exerciseType)) {
    return 'recovery';
  }

  // Look up the first primary muscle
  const first = primaryMuscles[0].toLowerCase();
  const category = BODY_PART_TO_CATEGORY[first];
  if (category) return category;

  // If multiple major muscle groups, it's full_body
  const categories = new Set(
    primaryMuscles
      .map((m) => BODY_PART_TO_CATEGORY[m.toLowerCase()])
      .filter(Boolean)
  );
  if (categories.size >= 3) return 'full_body';

  return categories.values().next().value || 'full_body';
}

/**
 * Generate a stable exercise_key slug.
 * Format: "source-slugified-name"
 *
 * @param {string} name   - Exercise name
 * @param {string} source - Source identifier (nasm, freedb, wrkout, custom, etc.)
 * @param {string} [id]   - Optional upstream stable ID (used if available)
 * @returns {string} Unique slug like "nasm-barbell-bench-press"
 */
export function generateExerciseKey(name, source = 'nasm', id = null) {
  if (id) {
    // Use upstream ID directly (free-exercise-db has stable IDs like "3_4_sit-up")
    return `${source}-${id}`;
  }
  const slug = slugify(name, { lower: true, strict: true, remove: /[*+~.()'\"!:@]/g });
  return `${source}-${slug}`;
}

/**
 * Build a V2 exercise object with all required fields.
 * Extends the original ex() pattern with V2 columns.
 *
 * @param {object} overrides - Exercise field overrides
 * @returns {object} Complete exercise record ready for DB insert
 */
export function exV2(overrides) {
  const primaryMuscles = overrides.primaryMuscles || [];
  const exerciseType = overrides.exerciseType || 'compound';
  const source = overrides.source || 'nasm';

  return {
    id: uuidv4(),
    canBePerformedAtHome: false,
    unlockLevel: 0,
    isActive: true,
    isPopular: false,
    experiencePointsEarned: 10,
    contraindicationNotes: null,
    safetyTips: null,
    scientificReferences: null,
    targetProgressionRate: null,
    videoUrl: null,
    imageUrl: null,
    recommendedSets: null,
    recommendedReps: null,
    recommendedDuration: null,
    restInterval: null,
    ...overrides,

    // JSON-in-TEXT fields
    primaryMuscles: JSON.stringify(primaryMuscles),
    secondaryMuscles: JSON.stringify(overrides.secondaryMuscles || []),
    equipmentNeeded: JSON.stringify(overrides.equipmentNeeded || []),
    progressionPath: JSON.stringify(overrides.progressionPath || []),
    prerequisites: JSON.stringify(overrides.prerequisites || []),
    coachingCues: overrides.coachingCues || null,

    // V2 fields
    exercise_key: overrides.exercise_key || generateExerciseKey(overrides.name, source),
    source,
    force: overrides.force || null,
    mechanic: overrides.mechanic || null,
    aliases: JSON.stringify(overrides.aliases || []),
    optPhases: JSON.stringify(overrides.optPhases || [1, 2, 3, 4, 5]),
    nasmMovementPattern: overrides.nasmMovementPattern || null,
    thumbnailUrl: overrides.thumbnailUrl || null,
    defaultTempo: overrides.defaultTempo || '2/0/2',
    defaultRestSeconds: overrides.defaultRestSeconds || 60,
    bodyPartCategory: overrides.bodyPartCategory || categorizeMuscles(primaryMuscles, exerciseType),
  };
}

/**
 * Map a free-exercise-db entry to our Exercise schema.
 * free-exercise-db format: { id, name, force, level, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions, category, images }
 *
 * @param {object} entry - Raw entry from free-exercise-db JSON
 * @returns {object} Exercise record ready for DB insert
 */
export function mapFreeExerciseDb(entry) {
  // Map difficulty level string to numeric
  const levelMap = { beginner: 200, intermediate: 450, expert: 700 };
  const difficulty = levelMap[entry.level] || 300;

  // Map category to exerciseType
  const categoryMap = {
    strength: 'compound',
    stretching: 'flexibility',
    plyometrics: 'compound',
    powerlifting: 'compound',
    'olympic weightlifting': 'compound',
    strongman: 'compound',
    cardio: 'calisthenics',
  };
  const exerciseType = categoryMap[entry.category?.toLowerCase()] || 'compound';

  // Determine mechanic type
  const mechanic = entry.mechanic === 'isolation' ? 'isolation' : 'compound';
  if (mechanic === 'isolation' && exerciseType === 'compound') {
    // Override exerciseType for actual isolation exercises
  }

  return exV2({
    name: entry.name,
    description: `${entry.name} — ${entry.category || 'strength'} exercise targeting ${(entry.primaryMuscles || []).join(', ') || 'multiple muscle groups'}.`,
    instructions: Array.isArray(entry.instructions)
      ? entry.instructions.map((s, i) => `${i + 1}. ${s}`).join(' ')
      : (entry.instructions || 'Perform with proper form.'),
    exerciseType: mechanic === 'isolation' ? 'isolation' : exerciseType,
    primaryMuscles: entry.primaryMuscles || [],
    secondaryMuscles: entry.secondaryMuscles || [],
    equipmentNeeded: entry.equipment ? [entry.equipment] : [],
    difficulty,
    force: entry.force || null,
    mechanic,
    source: 'free-exercise-db',
    exercise_key: generateExerciseKey(entry.name, 'freedb', entry.id),
    thumbnailUrl: entry.images?.[0] || null,
    canBePerformedAtHome: ['body only', 'other'].includes(entry.equipment?.toLowerCase()),
  });
}
