/**
 * Intelligent Workout Builder Service -- Phase 9b
 * =================================================
 * 7-step workout generation algorithm using ClientContext:
 *
 *   1. Constraints    -- Pain exclusions, compensation awareness
 *   2. Rotation       -- BUILD/SWITCH from variation engine
 *   3. Warmup         -- NASM CES-aligned warmup (Inhibit/Lengthen/Activate)
 *   4. Exercises      -- Equipment-filtered, NASM-phase-appropriate
 *   5. Parameters     -- Sets/reps/rest/tempo per OPT phase
 *   6. Cooldown       -- Flexibility + recovery
 *   7. Explanations   -- Why each exercise was selected or excluded
 *
 * Also supports long-term plan generation:
 *   1. Periodization  -- Linear vs undulating based on client goals
 *   2. Phases         -- Map to NASM OPT phases
 *   3. Mesocycles     -- 4-week blocks with progressive overload
 *   4. Overload       -- Auto-calculate weight/rep progression
 *   5. Document       -- Generate plan summary
 */

import { getClientContext } from './clientIntelligenceService.mjs';
import {
  getExerciseRegistry,
  getExerciseRegistryFromDB,
  generateSwapSuggestions,
  getNextSessionType,
} from './variationEngine.mjs';
import { getRecommendedWeight } from './oneRepMaxService.mjs';
import {
  buildWeeklyDayTypes,
  expandV3aDayTypeToMovementCategories,
  focusForDayType,
  recoveryDayPrescriptionOverride,
  DAY_TYPE,
} from './planDayTypeService.mjs';
import {
  getCorrectiveExercisesForCompensations,
  mapCompensationToCesTags,
} from './ai/correctiveExerciseService.mjs';
import { getExercise } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import {
  GOAL_CONFIG,
  normalizeGoal,
  resolveStartingPhase,
  buildGoalPhaseSequence,
  getGoalOptBias,
} from './workoutBuilderGoalConfig.mjs';
import {
  applyTrainingStyleToExercises,
  normalizeTrainingStyle,
  trainingStyleExplanation,
  trainingStyleRecommendationDetail,
} from './workoutBuilderTrainingStyle.mjs';
import { buildSwanCoachPlanningFingerprint } from './swanCoachPlanningContextService.mjs';
import {
  applySwanCoachReadinessToExercises,
  buildSwanCoachReadinessContext,
  buildSwanCoachReadinessExplanation,
  buildSwanCoachReadinessRationaleLine,
  buildSwanCoachReadinessRecommendationDetail,
  scoreExerciseForSwanCoachReadiness,
} from './swanCoachCortexService.mjs';

// Pain severity threshold: auto-exclude muscles at or above this level
const PAIN_AUTO_EXCLUDE_SEVERITY = 7;

function buildPlanningCoverageContext(context = {}) {
  return {
    workouts: context.workouts,
    constraints: context.constraints,
    pain: context.pain,
    movement: context.movement,
    goals: context.goals,
    body: context.body,
    baseline: context.baseline,
    nutrition: context.nutrition,
    progressLevels: context.progressLevels,
    activeProgram: context.activeProgram,
    trainingVault: context.trainingVault,
    equipment: context.equipment,
    clientSource: context.clientSource,
    sourcePolicy: context.sourcePolicy,
    safety: context.safety,
    health: context.health,
    specialPopulation: context.specialPopulation,
    criticalDataUnavailable: context.criticalDataUnavailable,
    criticalFailures: context.criticalFailures,
  };
}

// Category → movement type mapping
const CATEGORY_MOVEMENT_MAP = {
  chest: 'push',
  shoulders: 'push',
  arms: 'push',
  back: 'pull',
  legs: 'squat',
  core: 'core',
};

// ── NASM OPT Phase Parameter Tables ──────────────────────────────────

const OPT_PHASE_PARAMS = {
  1: {
    name: 'Stabilization Endurance',
    sets: [1, 3],
    reps: [12, 20],
    intensity: '50-70%',
    tempo: '4-2-1',
    rest: [0, 90],
    exerciseTypes: ['stability', 'core', 'balance', 'corrective'],
    focus: 'Muscular endurance, proprioception, core stability',
  },
  2: {
    name: 'Strength Endurance',
    sets: [2, 4],
    reps: [8, 12],
    intensity: '70-80%',
    tempo: '2-0-2',
    rest: [0, 60],
    exerciseTypes: ['compound', 'isolation', 'stability'],
    focus: 'Superset stabilization + strength exercises',
  },
  3: {
    name: 'Muscular Development (Hypertrophy)',
    sets: [3, 5],
    reps: [6, 12],
    intensity: '75-85%',
    tempo: '2-0-2',
    rest: [0, 60],
    exerciseTypes: ['compound', 'isolation'],
    focus: 'Maximal muscle growth, progressive overload',
  },
  4: {
    name: 'Maximal Strength',
    sets: [4, 6],
    reps: [1, 5],
    intensity: '85-100%',
    tempo: 'Explosive/controlled',
    rest: [120, 300],
    exerciseTypes: ['compound'],
    focus: 'Maximal force production, neural adaptations',
  },
  5: {
    name: 'Power',
    sets: [3, 5],
    reps: [1, 5],
    intensity: '30-45% (speed) / 85-100% (strength)',
    tempo: 'Explosive',
    rest: [120, 300],
    exerciseTypes: ['compound', 'plyometric'],
    focus: 'Rate of force development, superset strength + power',
  },
};

// ── Default Warmup Templates ─────────────────────────────────────────

const WARMUP_TEMPLATES = {
  general: [
    { name: 'Foam Roll IT Band', duration: '30s each side', type: 'inhibit' },
    { name: 'Foam Roll Calves', duration: '30s each side', type: 'inhibit' },
    { name: 'Standing Hip Flexor Stretch', duration: '30s each side', type: 'lengthen' },
    { name: 'Standing Calf Stretch', duration: '30s each side', type: 'lengthen' },
    { name: 'Glute Bridge', sets: 1, reps: 15, type: 'activate' },
    { name: 'Bird Dog', sets: 1, reps: 10, type: 'activate' },
  ],
  upper: [
    { name: 'Foam Roll Lats', duration: '30s each side', type: 'inhibit' },
    { name: 'Foam Roll Pecs (ball)', duration: '30s each side', type: 'inhibit' },
    { name: 'Doorway Pec Stretch', duration: '30s each side', type: 'lengthen' },
    { name: 'Band Pull Apart', sets: 1, reps: 15, type: 'activate' },
    { name: 'Wall Slide', sets: 1, reps: 10, type: 'activate' },
  ],
  lower: [
    { name: 'Foam Roll Quads', duration: '30s each side', type: 'inhibit' },
    { name: 'Foam Roll Adductors', duration: '30s each side', type: 'inhibit' },
    { name: 'Half Kneeling Hip Flexor Stretch', duration: '30s each side', type: 'lengthen' },
    { name: 'Glute Bridge', sets: 1, reps: 15, type: 'activate' },
    { name: 'Lateral Band Walk', sets: 1, reps: 12, type: 'activate' },
  ],
};

// ── Cooldown Templates ───────────────────────────────────────────────

const COOLDOWN_TEMPLATES = {
  general: [
    { name: 'Standing Hamstring Stretch', duration: '30s each side' },
    { name: 'Figure 4 Stretch', duration: '30s each side' },
    { name: 'Kneeling Lat Stretch', duration: '60s' },
    { name: 'Cat-Cow', sets: 1, reps: 10 },
    { name: 'Recovery Breathing Drill', duration: '60s' },
  ],
};

// ── Category → Warmup Type Mapping ───────────────────────────────────

const CATEGORY_TO_WARMUP = {
  chest: 'upper',
  back: 'upper',
  shoulders: 'upper',
  arms: 'upper',
  legs: 'lower',
  core: 'general',
  full_body: 'general',
};

// ── Helper: Filter exercises by constraints ──────────────────────────

function filterExercises(exercises, constraints, equipmentItems) {
  const { excludedMuscles, compensationTypes, recentlyUsedExercises } = constraints;
  const excludedSet = new Set(excludedMuscles);
  const recentSet = new Set(recentlyUsedExercises);

  // Build available equipment set from items
  const availableCategories = new Set();
  if (equipmentItems && equipmentItems.length > 0) {
    for (const item of equipmentItems) {
      availableCategories.add(item.category);
    }
    availableCategories.add('bodyweight'); // Always available
  }

  return exercises.filter(ex => {
    // Exclude if targets pain-affected muscles
    // Issue #4 FIX: null-safe muscles array (custom exercises may have undefined)
    const hasPainConflict = ex.muscles?.some(m => excludedSet.has(m)) ?? false;
    if (hasPainConflict) return false;

    // Check equipment availability (if equipment list provided)
    if (availableCategories.size > 0 && ex.equipment && ex.equipment.length > 0) {
      const hasEquipment = ex.equipment.some(eq => availableCategories.has(eq));
      if (!hasEquipment) return false;
    }

    return true;
  });
}

// ── Helper: Select exercises for category ────────────────────────────

function exerciseMatchesBias(exercise, bias) {
  const muscles = Array.isArray(exercise.muscles) ? exercise.muscles : [];
  const key = String(exercise.key || exercise.name || '').toLowerCase();
  const text = [
    exercise.exerciseType,
    exercise.category,
    exercise.movementPattern,
    key,
  ].filter(Boolean).join(' ').toLowerCase();

  switch (bias) {
    case 'compound':
      return muscles.length >= 3
        || ['push', 'pull', 'squat', 'hinge', 'lunge', 'compound'].includes(exercise.category);
    case 'isolation':
      return muscles.length > 0 && muscles.length <= 2 && !['core', 'corrective'].includes(exercise.category);
    case 'stability':
      return (exercise.nasmLevel || 2) <= 2
        || ['core', 'corrective'].includes(exercise.category)
        || /plank|bird_dog|pallof|band|bridge|single_leg|side_plank/.test(key);
    case 'core':
      return exercise.category === 'core'
        || muscles.some((m) => ['core', 'obliques', 'tva'].includes(m));
    case 'plyometric':
      return (exercise.nasmLevel || 0) >= 5
        || /jump|plyo|power|medicine_ball|throw|slam|bound/.test(key);
    case 'balance':
      return /single_leg|balance|lunge|split|step_up|bird_dog|side_plank/.test(key);
    default:
      return text.includes(String(bias).toLowerCase());
  }
}

function scoreExerciseForGoalBias(exercise, goalBias) {
  if (!goalBias || !Array.isArray(goalBias.exerciseBias)) return 0;

  return goalBias.exerciseBias.reduce((score, bias, index) => {
    if (!exerciseMatchesBias(exercise, bias)) return score;
    return score + (goalBias.exerciseBias.length - index);
  }, 0);
}

/**
 * L1 REV 2 round-4 (Codex 2026-05-02 final review HIGH):
 * Expand schedule-level day labels (`upper` / `lower` / `legs`) to the
 * movement-category names the production registry actually uses
 * (`push`, `pull`, `squat`, `hinge`, `lunge`, `compound`, `core`,
 * `cardio`, `corrective`). The single-workout path already maps
 * client-facing labels via `categoryMap` in `variationEngine.mjs`
 * (`legs → squat`); the long-horizon plan populator was passing the
 * raw schedule labels straight into `selectExercises`, which exact-
 * matched `ex.category` and produced empty days for `sessionsPerWeek=3`
 * (`upper`/`lower` rotation) and 25% of `sessionsPerWeek=4` days
 * (`legs` slots in the rotation pool).
 *
 * The fix accepts either a string (existing callers — single-workout
 * path) or array of strings (movement category list). Both are handled
 * by the same filter rule.
 */
function expandScheduleCategoryToMovementCategories(category) {
  // V3a (2026-05-03): consult planDayTypeService FIRST for the new day
  // types (full_body_stabilization / core_stability_balance / active_recovery
  // / full_core). If it returns a non-null list, use that. Otherwise fall
  // through to the legacy schedule labels below.
  const v3aMatch = expandV3aDayTypeToMovementCategories(category);
  if (v3aMatch !== null) return v3aMatch;

  // Each schedule label expands to a list that includes both:
  //   1. The label itself (so test fixtures or any future registry that
  //      tags exercises with the schedule label like `category: 'legs'`
  //      keep matching — backwards compat).
  //   2. The production movement-category names (`squat`, `hinge`,
  //      `lunge`, `push`, `pull`) that variationEngine.mjs's
  //      `categoryMap` actually emits when transforming
  //      `bodyPartCategory` from the Exercise model.
  switch (category) {
    case 'upper':     return ['upper', 'push', 'pull'];
    case 'lower':     return ['lower', 'legs', 'squat', 'hinge', 'lunge'];
    case 'legs':      return ['legs', 'squat', 'hinge', 'lunge'];
    case 'full_body': return null;  // wildcard sentinel — preserve existing semantics
    default:          return [category];  // push, pull, core, etc. — direct match
  }
}

function selectExercises(registry, category, count, constraints, equipmentItems, nasmPhase, goalBias = null, swanCoachReadiness = null) {
  // H1 FIX: registry is an array of {key, name, muscles, category, equipment, nasmLevel}
  // Filter exercises for this category (movement type match)
  const movementCats = expandScheduleCategoryToMovementCategories(category);
  const categoryExercises = registry
    .filter(ex => movementCats === null || movementCats.includes(ex.category));

  // Apply constraints
  const available = filterExercises(categoryExercises, constraints, equipmentItems);

  // CEO Directive: Monitor Phase 2 stabilization pairing availability
  // Tracks exercises missing nasmLevel for ops monitoring (structured logging)
  if (nasmPhase === 2 && available.length > 0) {
    const missingTier = available.filter(ex => !ex.nasmLevel);
    if (missingTier.length > 0) {
      logger.warn('[Workout] Phase 2 stabilization data gap', {
        category,
        totalAvailable: available.length,
        missingNasmLevel: missingTier.length,
        fallbackRate: `${((missingTier.length / available.length) * 100).toFixed(1)}%`,
        sampleKeys: missingTier.slice(0, 3).map(ex => ex.key),
      });
    }
  }

  // Sort by recency, then goal fit, then NASM level match.
  const recentSet = new Set(constraints.recentlyUsedExercises);
  const targetLevel = nasmPhase || 2;

  available.sort((a, b) => {
    const aRecent = recentSet.has(a.key) ? 1 : 0;
    const bRecent = recentSet.has(b.key) ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;

    const aBiasScore = scoreExerciseForGoalBias(a, goalBias);
    const bBiasScore = scoreExerciseForGoalBias(b, goalBias);
    if (aBiasScore !== bBiasScore) return bBiasScore - aBiasScore;

    const aReadinessScore = scoreExerciseForSwanCoachReadiness(a, swanCoachReadiness);
    const bReadinessScore = scoreExerciseForSwanCoachReadiness(b, swanCoachReadiness);
    if (aReadinessScore !== bReadinessScore) return bReadinessScore - aReadinessScore;

    const aLevelDiff = Math.abs((a.nasmLevel || 2) - targetLevel);
    const bLevelDiff = Math.abs((b.nasmLevel || 2) - targetLevel);
    return aLevelDiff - bLevelDiff;
  });

  return available.slice(0, count);
}

// ── Helper: Apply OPT parameters to exercise ─────────────────────────

function midpoint([min, max]) {
  return Math.ceil((min + max) / 2);
}

function formatBiasedRange([min, max], bias, suffix = '') {
  if (bias === 'low') return `${min}-${midpoint([min, max])}${suffix}`;
  if (bias === 'high') return `${midpoint([min, max])}-${max}${suffix}`;
  return `${min}-${max}${suffix}`;
}

function chooseBiasedSet([min, max], bias) {
  if (bias === 'high') return max;
  return min;
}

function applyOPTParams(exercise, phase, goalBias = null) {
  const params = OPT_PHASE_PARAMS[phase] || OPT_PHASE_PARAMS[2];
  const setBias = goalBias?.setBias || 'mid';
  const repBias = goalBias?.repBias || 'mid';
  const restBias = goalBias?.restBias || 'mid';

  return {
    exerciseKey: exercise.key,
    exerciseName: formatExerciseName(exercise.key),
    muscles: exercise.muscles || [],
    category: exercise.category,
    equipment: exercise.equipment || [],
    nasmLevel: exercise.nasmLevel,
    movementPattern: exercise.movementPattern || null,
    sets: chooseBiasedSet(params.sets, setBias),
    reps: formatBiasedRange(params.reps, repBias),
    tempo: params.tempo,
    rest: formatBiasedRange(params.rest, restBias, 's'),
    intensity: params.intensity,
    intensityBias: goalBias?.intensityBias || 'mid',
  };
}

function formatExerciseName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildVariationSessionHistory(variation = {}) {
  if (Array.isArray(variation.sessionHistory)) {
    return variation.sessionHistory.filter((entry) => (
      entry?.sessionType === 'build' || entry?.sessionType === 'switch'
    ));
  }

  return variation.lastSessionType === 'build' || variation.lastSessionType === 'switch'
    ? [{ sessionType: variation.lastSessionType }]
    : [];
}

function resolveSingleWorkoutSessionType(context, rotationPattern) {
  const history = buildVariationSessionHistory(context.variation);
  const pattern = rotationPattern || context.variation?.currentPattern || 'standard';
  return getNextSessionType(history, pattern);
}

// ── Main: Generate Single Workout ────────────────────────────────────

/**
 * Generate a single workout for a client.
 *
 * @param {Object} options
 * @param {number} options.clientId
 * @param {number} options.trainerId
 * @param {string} options.category - chest|back|shoulders|arms|legs|core|full_body
 * @param {number} [options.equipmentProfileId] - Filter by location
 * @param {number} [options.exerciseCount=6] - Number of main exercises
 * @param {string} [options.rotationPattern='standard'] - standard|aggressive|conservative
 * @returns {Promise<Object>} Generated workout
 */
export async function generateWorkout(options) {
  const {
    clientId,
    trainerId,
    category = 'full_body',
    equipmentProfileId = null,
    exerciseCount = 6,
    rotationPattern = 'standard',
    primaryGoal: rawPrimaryGoal,
    nasmPhase: phaseOverride,
    trainingIntensityMode,
    hardcoreMethod,
    readinessCheck = null,
  } = options;

  if (!clientId) throw new Error('clientId is required');
  if (!trainerId) throw new Error('trainerId is required');

  // Goal+phase plumbing (Phase A - rule-46-approved goal-aware generation).
  // Goal is normalized via the helper allowlist; unknown -> general_fitness.
  // Phase override (1-5) takes precedence over the client baseline; otherwise
  // we fall back to whatever phase the context indicates.
  const primaryGoal = normalizeGoal(rawPrimaryGoal);
  const trainingStyle = normalizeTrainingStyle({ trainingIntensityMode, hardcoreMethod });

  // Step 1: Get client context (parallel subsystem queries)
  let context;
  try {
    context = await getClientContext(clientId, trainerId);
  } catch (err) {
    logger.error('Failed to get client context', { clientId, trainerId, error: err.message });
    throw new Error('Unable to generate workout: client context unavailable');
  }

  // Step 1b: Surface critical data failure warnings
  if (context.criticalDataUnavailable) {
    logger.warn('[WorkoutBuilder] Critical data unavailable for client', {
      clientId, failures: context.criticalFailures,
    });
  }

  // Step 2: Determine rotation (BUILD or SWITCH)
  const sessionType = resolveSingleWorkoutSessionType(context, rotationPattern);

  // Step 3: Get exercise registry from DB (840+) with hardcoded fallback (81)
  const registry = await getExerciseRegistryFromDB();
  const nasmPhase = resolveStartingPhase({
    startingPhaseOverride: phaseOverride,
    contextPhase: context.constraints.nasmPhase || 2,
  });
  const goalBias = getGoalOptBias({ primaryGoal, phase: nasmPhase });
  const swanCoachReadiness = await buildSwanCoachReadinessContext({
    clientContext: context,
    readinessCheck,
    category,
    primaryGoal,
  });

  // Get equipment for selected location
  let equipmentItems = [];
  if (equipmentProfileId) {
    const profile = context.equipment?.find(p => p.id === equipmentProfileId);
    if (!profile) {
      logger.warn(`Equipment profile ${equipmentProfileId} not found for client ${clientId}, proceeding without equipment filter`);
    } else {
      equipmentItems = profile.items;
    }
  }

  // Step 4: Select exercises
  const movementCategories = category === 'full_body'
    ? ['push', 'pull', 'squat', 'hinge', 'lunge', 'core']
    : [CATEGORY_MOVEMENT_MAP[category] || 'core'];

  const exercisesPerCategory = Math.ceil(exerciseCount / movementCategories.length);
  let selectedExercises = [];

  for (const moveCat of movementCategories) {
    const catExercises = selectExercises(
      registry, moveCat, exercisesPerCategory,
      context.constraints, equipmentItems, nasmPhase, goalBias, swanCoachReadiness
    );
    selectedExercises.push(...catExercises);
  }

  // Trim to requested count
  selectedExercises = selectedExercises.slice(0, exerciseCount);

  // Step 5: If SWITCH session, generate swap suggestions
  let swapSuggestions = null;
  if (sessionType === 'switch' && selectedExercises.length > 0) {
    swapSuggestions = generateSwapSuggestions(
      selectedExercises.map(e => e.key),
      {
        recentlyUsed: context.constraints.recentlyUsedExercises,
        compensations: context.constraints.compensationTypes,
        availableEquipment: equipmentItems,
        nasmLevel: nasmPhase,
      }
    );
  }

  // Step 6: Apply OPT parameters
  const workoutExercises = selectedExercises.map(ex =>
    applyOPTParams(ex, nasmPhase, goalBias)
  );

  // Step 7: Build warmup and cooldown
  const warmupType = CATEGORY_TO_WARMUP[category] || 'general';
  const warmup = [...WARMUP_TEMPLATES[warmupType]];

  // V3c.3 (2026-05-03): replace synthetic CES_MAP warmup names with real
  // V3b.3 registry exercises. Each compensation gets ≤1 inhibit + ≤1
  // activate row pulled from the 32-row ces-* registry, matched by the
  // compensation's V3b.3 tag set. Falls back to the legacy synthetic
  // entry only when the registry has no match (covers edge cases like a
  // future compensation type that's not yet in the V3b.3 mapping).
  if (context.movement.compensations.length > 0) {
    let registryCorrectives = null;
    try {
      const Exercise = getExercise();
      if (Exercise) {
        registryCorrectives = await getCorrectiveExercisesForCompensations({
          compensations: context.movement.compensations,
          Exercise,
          includeSteps: ['inhibit', 'activate'],
        });
      }
    } catch (err) {
      // Don't fail workout generation if the corrective lookup misfires —
      // log it and fall through to the legacy CES_MAP path below.
      logger.warn('[WorkoutBuilder] V3c.3 corrective registry lookup failed; falling back to CES_MAP', err.message);
    }

    const findRegistryRowForComp = (comp, step) => {
      if (!registryCorrectives) return null;
      const compTags = mapCompensationToCesTags(comp.type);
      if (compTags.length === 0) return null;
      const stepRows = registryCorrectives[step] || [];
      return stepRows.find((row) => {
        let rowTags = row.nasmCorrectiveCategory;
        if (typeof rowTags === 'string') {
          try { rowTags = JSON.parse(rowTags); } catch { return false; }
        }
        return Array.isArray(rowTags) && rowTags.some((t) => compTags.includes(t));
      }) || null;
    };

    for (const comp of context.movement.compensations.slice(0, 3)) {
      const reason = `Addressing ${comp.type} compensation`;

      // INHIBIT: prefer V3b.3 row, fall back to CES_MAP synthetic.
      const inhibitRow = findRegistryRowForComp(comp, 'inhibit');
      if (inhibitRow) {
        warmup.push({
          name: inhibitRow.name,
          exerciseKey: inhibitRow.exercise_key,
          duration: '30s',
          type: 'inhibit',
          reason,
          source: 'v3b3-corrective-registry',
        });
      } else if (comp.cesStrategy?.inhibit?.[0]) {
        warmup.push({
          name: `Foam Roll ${formatExerciseName(comp.cesStrategy.inhibit[0])}`,
          duration: '30s',
          type: 'inhibit',
          reason,
          source: 'ces-map-fallback',
        });
      }

      // ACTIVATE: prefer V3b.3 row, fall back to CES_MAP synthetic.
      const activateRow = findRegistryRowForComp(comp, 'activate');
      if (activateRow) {
        warmup.push({
          name: activateRow.name,
          exerciseKey: activateRow.exercise_key,
          sets: 1,
          reps: 12,
          type: 'activate',
          reason,
          source: 'v3b3-corrective-registry',
        });
      } else if (comp.cesStrategy?.activate?.[0]) {
        warmup.push({
          name: `Activate ${formatExerciseName(comp.cesStrategy.activate[0])}`,
          sets: 1,
          reps: 12,
          type: 'activate',
          reason,
          source: 'ces-map-fallback',
        });
      }
    }
  }

  const cooldown = [...COOLDOWN_TEMPLATES.general];

  // Step 7b: Calculate recommended weights from 1RM data via OneRepMaxService
  if (context.constraints.estimated1RMs) {
    const phaseIntensityMap = { 1: [0.50, 0.70], 2: [0.70, 0.80], 3: [0.75, 0.85], 4: [0.85, 1.00], 5: [0.30, 0.45] };
    const [minPct, maxPct] = phaseIntensityMap[nasmPhase] || [0.70, 0.80];

    for (const ex of workoutExercises) {
      const rec = getRecommendedWeight({
        movementPattern: ex.movementPattern || null,
        exerciseKey: ex.exerciseKey,
        estimated1RMs: context.constraints.estimated1RMs,
        intensityMin: minPct,
        intensityMax: maxPct,
      });
      if (rec) {
        ex.recommendedWeightMin = rec.min;
        ex.recommendedWeightMax = rec.max;
        ex.basedOn1RM = rec.basedOn;
      }
    }
  }
  const styledWorkoutExercises = applySwanCoachReadinessToExercises(
    applyTrainingStyleToExercises(
      workoutExercises,
      trainingStyle,
      context.pain?.warnings,
    ),
    swanCoachReadiness,
  );

  const phaseParams = OPT_PHASE_PARAMS[nasmPhase] || OPT_PHASE_PARAMS[2];
  const goalLabel = GOAL_CONFIG[primaryGoal]?.label || 'General Fitness';
  const swanCoachPlanning = buildSwanCoachPlanningFingerprint({
    context: buildPlanningCoverageContext(context),
    horizonWeeks: 1,
    sessionsPerWeek: 1,
    nasmPhase,
    primaryGoal,
  });

  // Step 8: Build explanations
  const explanations = [];

  // Safety warning if critical data (pain entries) failed to load
  if (context.criticalDataUnavailable) {
    explanations.push({
      type: 'safety_warning',
      message: 'Pain/injury data could not be loaded. Review this workout carefully before assigning — exercises may target areas with active pain entries.',
      details: `Failed subsystems: ${context.criticalFailures.join(', ')}`,
    });
  }

  if (context.pain.exclusions.length > 0) {
    explanations.push({
      type: 'pain_exclusion',
      message: `${context.pain.exclusions.length} muscle group(s) auto-excluded due to pain severity >= ${PAIN_AUTO_EXCLUDE_SEVERITY}/10 within 72h`,
      details: context.pain.exclusions.map(e => `${e.bodyRegion} (${e.painLevel}/10)`),
    });
  }

  if (context.pain.warnings.length > 0) {
    explanations.push({
      type: 'pain_warning',
      message: `${context.pain.warnings.length} area(s) with moderate pain -- load/ROM modifications recommended`,
      details: context.pain.warnings.map(e => `${e.bodyRegion} (${e.painLevel}/10)`),
    });
  }

  if (context.movement.compensations.length > 0) {
    explanations.push({
      type: 'compensation_awareness',
      message: `${context.movement.compensations.length} active compensation pattern(s) detected -- CES warmup added`,
      details: context.movement.compensations.map(c =>
        `${c.type} (trend: ${c.trend}, freq: ${c.frequency})`
      ),
    });
  }

  explanations.push({
    type: 'session_type',
    message: `${sessionType.toUpperCase()} session -- ${
      sessionType === 'build'
        ? 'same exercises with progressive overload'
        : 'swapped exercises targeting same muscle groups'
    }`,
  });

  explanations.push({
    type: 'nasm_phase',
    message: `NASM OPT Phase ${nasmPhase}: ${OPT_PHASE_PARAMS[nasmPhase]?.name || 'Strength Endurance'}`,
  });

  explanations.push({
    type: 'selected_goal',
    message: `Trainer-selected goal: ${goalLabel}. Exercise selection and OPT targets biased toward ${goalBias.exerciseBias.join(' > ')}.`,
  });
  if (trainingStyle.mode === 'hardcore') {
    explanations.push(trainingStyleExplanation(trainingStyle));
  }
  explanations.push(buildSwanCoachReadinessExplanation(swanCoachReadiness));

  if (context.goals?.primaryGoal && context.goals.primaryGoal !== primaryGoal) {
    explanations.push({
      type: 'client_goal',
      message: `Client stored goal: ${context.goals.primaryGoal}. Trainer selection overrides it for this generated workout.`,
    });
  }

  if (context.baseline?.nasmAssessmentScore) {
    explanations.push({
      type: 'assessment_score',
      message: `NASM assessment score: ${context.baseline.nasmAssessmentScore}/100. ${
        context.baseline.nasmAssessmentScore < 60
          ? 'Emphasis on corrective exercises and stability work.'
          : 'Client cleared for progressive loading.'
      }`,
    });
  }

  if (context.body?.weight) {
    explanations.push({
      type: 'body_composition',
      message: `Current weight: ${context.body.weight} ${context.body.weightUnit || 'lbs'}${
        context.body.bodyFatPercentage ? ` | Body fat: ${context.body.bodyFatPercentage}%` : ''
      }${context.body.recentTrend !== null ? ` | Recent trend: ${context.body.recentTrend > 0 ? '+' : ''}${context.body.recentTrend} ${context.body.weightUnit || 'lbs'}` : ''}`,
    });
  }

  if (context.streak?.currentCount > 0) {
    explanations.push({
      type: 'streak_motivation',
      message: `🔥 ${context.streak.currentCount}-day workout streak! ${
        context.streak.currentCount >= 7 ? 'Excellent consistency — pushing progressive overload.' : 'Building momentum.'
      }`,
    });
  }

  // Phase A: structured rationale array describing how goal+phase shaped THIS workout.
  // Frontend may render or ignore; emitted unconditionally so trainers can audit logic.
  const rationale = [
    `Goal: ${goalLabel}. ${GOAL_CONFIG[primaryGoal]?.description || ''}`.trim(),
    `NASM OPT Phase ${nasmPhase}: ${phaseParams.name}. Focus: ${phaseParams.focus}.`,
    `Set bias: ${goalBias.setBias}, rep bias: ${goalBias.repBias}, rest bias: ${goalBias.restBias}, intensity bias: ${goalBias.intensityBias}.`,
    `Exercise selection priority: ${goalBias.exerciseBias.join(' > ')}.`,
    `Training style: ${trainingStyle.label}. ${trainingStyle.cue}`,
    buildSwanCoachReadinessRationaleLine(swanCoachReadiness),
  ];

  return {
    clientId,
    trainerId,
    clientName: context.clientName,
    generatedAt: new Date().toISOString(),

    sessionType,
    category,
    planningSystem: 'swan_coach_planning',
    swanCoachPlanning,
    nasmPhase,
    primaryGoal,
    trainingStyle,
    swanCoachReadiness,
    goalBias,
    rationale,
    phaseParams: {
      name: phaseParams.name,
      focus: phaseParams.focus,
      sets: `${phaseParams.sets[0]}-${phaseParams.sets[1]}`,
      reps: `${phaseParams.reps[0]}-${phaseParams.reps[1]}`,
      rest: `${phaseParams.rest[0]}-${phaseParams.rest[1]}s`,
      intensity: phaseParams.intensity,
      tempo: phaseParams.tempo,
    },

    warmup,
    exercises: styledWorkoutExercises,
    swapSuggestions,
    cooldown,

    constraints: context.constraints,
    explanations,

    context: {
      criticalDataUnavailable: context.criticalDataUnavailable || false,
      criticalFailures: context.criticalFailures || [],
      painExclusions: context.pain.exclusions.length,
      painWarnings: context.pain.warnings.length,
      compensations: context.movement.compensations.length,
      recentWorkouts: context.workouts.sessionsLast2Weeks,
      avgFormRating: context.workouts.avgFormRating,
      equipmentProfileId,
      readinessLevel: swanCoachReadiness.level,
    },

    // Deep client intelligence (for Coach AI display)
    clientIntelligence: {
      goals: context.goals || null,
      body: context.body || null,
      baseline: context.baseline || null,
      nutrition: context.nutrition || null,
      progressLevels: context.progressLevels || null,
      streak: context.streak || null,
      activeProgram: context.activeProgram || null,
      trainingVault: context.trainingVault || null,
      sourcePolicy: context.sourcePolicy || null,
      safety: context.safety || null,
      health: context.health || null,
    },
  };
}

// ── Generate Long-Term Plan ──────────────────────────────────────────

/**
 * Generate a multi-week training plan.
 *
 * @param {Object} options
 * @param {number} options.clientId
 * @param {number} options.trainerId
 * @param {number} [options.durationWeeks=12]
 * @param {number} [options.sessionsPerWeek=3]
 * @param {string} [options.primaryGoal='general_fitness']
 * @param {number} [options.equipmentProfileId]
 * @returns {Promise<Object>} Long-term plan
 */
export async function generatePlan(options) {
  const {
    clientId,
    trainerId,
    durationWeeks = 12,
    sessionsPerWeek = 3,
    primaryGoal: rawPrimaryGoal = 'general_fitness',
    startingPhaseOverride,
    equipmentProfileId = null,
    // L1 (2026-05-01) — for tests: inject a controlled exercise registry to
    // make rotation + filtering assertions deterministic. Production callers
    // omit this; getExerciseRegistryFromDB() is used.
    trainingIntensityMode,
    hardcoreMethod,
    readinessCheck = null,
    registryOverride = null,
  } = options;

  // L6 FIX: Validate inputs
  if (!clientId) throw new Error('clientId is required');
  if (!trainerId) throw new Error('trainerId is required');

  const context = await getClientContext(clientId, trainerId);

  // Phase A: goal+phase plumbing.
  // - Goal normalized via the helper allowlist; unknown -> general_fitness.
  // - Trainer phase override beats client baseline; absent override falls
  //   back to context phase.
  const primaryGoal = normalizeGoal(rawPrimaryGoal);
  const trainingStyle = normalizeTrainingStyle({ trainingIntensityMode, hardcoreMethod });
  const startingPhase = resolveStartingPhase({
    startingPhaseOverride,
    contextPhase: context.constraints.nasmPhase || 1,
  });
  const swanCoachReadiness = await buildSwanCoachReadinessContext({
    clientContext: context,
    readinessCheck,
    category: 'long_horizon_plan',
    primaryGoal,
  });

  // Extract equipment items for plan context
  let equipmentItems = [];
  if (equipmentProfileId && context.equipment) {
    const profile = context.equipment.find(p => p.id === equipmentProfileId);
    if (profile) {
      equipmentItems = profile.items || [];
    }
  }

  // Phase A: goal-aware mesocycle phase sequence (replaces legacy Math.floor(i/2) ramp).
  // Sequence length = ceil(durationWeeks / 4). Each phase clamped to [startingPhase, 5].
  const phaseSequence = buildGoalPhaseSequence({
    primaryGoal,
    startingPhase,
    durationWeeks,
  });
  const mesocycleCount = phaseSequence.length;
  const mesocycles = [];

  for (let i = 0; i < mesocycleCount; i++) {
    const phase = phaseSequence[i];
    const phaseParams = OPT_PHASE_PARAMS[phase] || OPT_PHASE_PARAMS[2];
    const bias = getGoalOptBias({ primaryGoal, phase });

    const weekStart = i * 4 + 1;
    const weekEnd = Math.min((i + 1) * 4, durationWeeks);

    mesocycles.push({
      mesocycle: i + 1,
      weeks: `${weekStart}-${weekEnd}`,
      nasmPhase: phase,
      phaseName: phaseParams.name,
      focus: phaseParams.focus,
      params: {
        sets: formatBiasedRange(phaseParams.sets, bias.setBias),
        reps: formatBiasedRange(phaseParams.reps, bias.repBias),
        intensity: phaseParams.intensity,
        intensityBias: bias.intensityBias,
        tempo: phaseParams.tempo,
        rest: formatBiasedRange(phaseParams.rest, bias.restBias, 's'),
      },
      goalBias: bias,
      overloadStrategy: phase <= 2
        ? 'Add 1-2 reps per week, increase weight when hitting top of rep range'
        : phase <= 4
          ? 'Add 2.5-5% weight per week, maintain rep targets'
          : 'Increase movement velocity, alternate heavy/speed days',
      deloadWeek: weekEnd === (i + 1) * 4 ? weekEnd : null,
    });
  }

  // V3a (2026-05-03): NASM-correct weekly day-type schedule.
  // Replaces the prior fixed `rotationPool` literal that produced
  // push/pull/legs/push/pull/legs/full_body regardless of phase or
  // session count. Now computed via planDayTypeService:
  //   - Phase 1 (Stabilization): every day = full_body_stabilization
  //   - Phase 2-5: hybrid with frequency-aware rules including
  //     core_stability_balance / active_recovery / full_core slots
  //     (Sean L1-L3, AI Village 2026-05-03 NASM track CRITICAL).
  // The summary uses the STARTING phase for the recurring template;
  // per-mesocycle phase variation is handled in the populator below.
  const weeklySchedule = buildWeeklyDayTypes({
    sessionsPerWeek,
    phase: startingPhase,
    goal: primaryGoal,
  }).map((dayType, idx) => ({
    dayNumber: idx + 1,
    focus: focusForDayType(dayType),
    category: dayType,
  }));

  // Phase A: structured rationale array describing how goal+phase shaped THIS plan.
  const goalLabel = GOAL_CONFIG[primaryGoal]?.label || 'General Fitness';
  const phaseSequenceSummary = phaseSequence.join(' -> ');
  const rationale = [
    `Goal: ${goalLabel}. ${GOAL_CONFIG[primaryGoal]?.description || ''}`.trim(),
    `Starting NASM OPT phase: ${startingPhase}${
      Number.isInteger(startingPhaseOverride) && startingPhaseOverride >= 1 && startingPhaseOverride <= 5
        ? ' (trainer override)'
        : ' (from client baseline assessment)'
    }.`,
    `Mesocycle phase sequence (${mesocycleCount} blocks of 4 weeks): ${phaseSequenceSummary}.`,
    `Plan length: ${durationWeeks} weeks at ${sessionsPerWeek} sessions/week.`,
    `Training style: ${trainingStyle.label}. ${trainingStyle.cue}`,
    buildSwanCoachReadinessRationaleLine(swanCoachReadiness),
  ];

  // ── L1 (2026-05-01): per-day populator ───────────────────────────────
  // Produces weeks[].days[].exercises[] for the entire horizon. Reuses
  // selectExercises + applyOPTParams. Maintains a sliding window of the
  // last 7 sessions' exercise keys for "no recent repeat" rotation.
  // When eligible pool < 7 distinct, uses least-recent fallback and tags
  // each exercise with rotationFallback: true (R7 metadata).
  // ─────────────────────────────────────────────────────────────────────
  const registry = registryOverride || (await getExerciseRegistryFromDB());
  const recentExerciseKeys = [];               // sliding window of last 7 sessions' exercises (flattened)

  // V3a (2026-05-03): per-day category now phase-aware. Each week's
  // mesocycle phase determines the day-type layout — Phase 1 forces
  // full-body stabilization; Phase 2-5 use the hybrid frequency rules
  // (4-day adds core_stability_balance, 5-day adds full_core, 6-day
  // adds active_recovery, etc.). See planDayTypeService for the full
  // rule table.
  // The schedule is computed PER WEEK because the mesocycle phase
  // changes across the horizon.
  const dayTypeForWeek = (weekPhase) => buildWeeklyDayTypes({
    sessionsPerWeek,
    phase: weekPhase,
    goal: primaryGoal,
  });
  const dayFocusFor = (dayType) => focusForDayType(dayType);

  const weeks = [];
  let dayInPlan = 0;
  for (let w = 0; w < durationWeeks; w++) {
    const weekNumber = w + 1;
    const monthNumber = Math.floor(w / 4) + 1;        // 4-week mesocycle months
    const weekInMonth = (w % 4) + 1;
    const mesocycleIndex = Math.floor(w / 4);
    const meso = mesocycles[Math.min(mesocycleIndex, mesocycles.length - 1)];
    const phase = meso.nasmPhase;
    const isDeloadWeek = !!meso.deloadWeek && (w + 1 === meso.deloadWeek);
    const goalBias = meso.goalBias || null;

    // V3a (2026-05-03): the day-type schedule is now phase-aware AND
    // computed per-week so a Phase 1 mesocycle uses full_body_stabilization
    // every day while a Phase 3 mesocycle uses Push/Pull/Legs splits.
    const weekDayTypes = dayTypeForWeek(phase);

    const days = [];
    for (let d = 0; d < sessionsPerWeek; d++) {
      const dayNumber = d + 1;
      dayInPlan += 1;
      const cat = weekDayTypes[d];
      const focus = dayFocusFor(cat);

      // Eligible pool size for THIS category × constraints × equipment.
      // L1 REV 2 round-4 (Codex 2026-05-02): use the same schedule→movement
      // category expansion as selectExercises so the eligible-pool count
      // reflects the actual exercises available for the rotation window.
      // Without this, `cat='legs'` would compute pool=0 here while
      // selectExercises (post-fix) returns 6 — driving spurious
      // rotationFallback metadata.
      const movementCatsForCount = expandScheduleCategoryToMovementCategories(cat);
      const categoryRegistry = registry.filter(
        (ex) => movementCatsForCount === null || movementCatsForCount.includes(ex.category)
      );
      const eligibleAfterFilter = filterExercises(
        categoryRegistry, context.constraints, equipmentItems
      );
      const eligiblePoolSize = new Set(eligibleAfterFilter.map((ex) => ex.key)).size;

      // Use last 7 sessions of recent keys for "no recent repeat" — this
      // OVERRIDES context.constraints.recentlyUsedExercises so the
      // rotation operates ACROSS the generated horizon, not just the
      // immediate prior session.
      const constraintsForDay = {
        ...context.constraints,
        recentlyUsedExercises: recentExerciseKeys.slice(-7),
      };

      // V3a round-2 (Codex 2026-05-03 MEDIUM-2): active-recovery days
      // get a recovery-specific prescription instead of strength OPT
      // params. Without this override the populator emitted 70-80%
      // intensity / 8-12 reps / 2-0-2 tempo on a recovery day, which
      // contradicts the day-type's stated mobility/SMR/flexibility intent.
      const recoveryOverride = recoveryDayPrescriptionOverride(cat);
      const exerciseCount = recoveryOverride?.exerciseCount ?? 6;
      const selected = selectExercises(
        registry, cat, exerciseCount,
        constraintsForDay, equipmentItems, phase, goalBias, swanCoachReadiness
      );

      // Detect rotation fallback: if pool size < 7 distinct AND any selected
      // exercise was in the recent-7 window, the rotation could not honor
      // strict no-repeat. Mark fallback with metadata.
      const recentSet = new Set(recentExerciseKeys.slice(-7));
      const rotationFallbackForThisDay = (eligiblePoolSize < 7) && selected.some((ex) => recentSet.has(ex.key));

      const baseExercises = selected.map((ex, i) => {
        const opt = applyOPTParams(ex, phase, goalBias);
        // Recovery override skips chooseBiasedSet/formatBiasedRange — it
        // prescribes duration-based mobility/SMR holds, not load-based sets.
        const setNum = recoveryOverride?.sets
          ?? chooseBiasedSet(OPT_PHASE_PARAMS[phase].sets, goalBias?.setBias);
        const repString = recoveryOverride?.reps
          ?? formatBiasedRange(OPT_PHASE_PARAMS[phase].reps, goalBias?.repBias);
        const restNum = recoveryOverride?.restPeriod
          ?? midpoint(OPT_PHASE_PARAMS[phase].rest);
        return {
          exerciseId: ex.key,
          exerciseName: opt.exerciseName,
          orderInWorkout: i + 1,
          sets: setNum,
          reps: repString,
          setScheme: recoveryOverride?.setScheme ?? `${setNum}x${repString}`,
          repGoal: recoveryOverride?.repGoal ?? repString,
          restPeriod: restNum,
          tempo: recoveryOverride?.tempo ?? OPT_PHASE_PARAMS[phase].tempo,
          intensityGuideline: recoveryOverride?.intensityGuideline
            ?? OPT_PHASE_PARAMS[phase].intensity,
          notes: '',
          source: 'auto-populated',
          ...(rotationFallbackForThisDay ? { rotationFallback: true } : {}),
        };
      });
      const exercises = applySwanCoachReadinessToExercises(
        applyTrainingStyleToExercises(
          baseExercises,
          trainingStyle,
          context.pain?.warnings,
        ),
        swanCoachReadiness,
      );

      // Update sliding window with this day's exercises.
      for (const ex of selected) {
        recentExerciseKeys.push(ex.key);
      }

      // Assignment metadata feeds the client dashboard, logger, PDFs, and
      // Swan Coach read context without touching paid-session billing.
      const isRecoveryDay = cat === DAY_TYPE.active_recovery;
      const isRecoveryAssignment = isDeloadWeek || isRecoveryDay;
      const assignmentType = isRecoveryAssignment ? 'active_recovery' : 'homework';
      days.push({
        dayNumber,
        dayInPlan,
        name: `Day ${dayNumber}: ${focus}`,
        focus,
        dayType: isRecoveryAssignment ? 'active_recovery' : 'training',
        assignmentType,
        sessionType: 'solo',
        isBillable: false,
        shouldDeductSession: false,
        optPhase: OPT_PHASE_PARAMS[phase].name.toLowerCase().replace(/\s+/g, '_'),
        exercises,
      });
    }

    weeks.push({
      weekNumber,
      monthNumber,
      weekInMonth,
      mesocycleNumber: meso.mesocycle,
      isDeloadWeek,
      days,
    });
  }
  // ───────────────────────────────────────────────────────────────────

  // L1 (2026-05-01): recommendationDetails[] mirrors recommendations[]
  // with structured type + sourceCitation (SCHEMA-PATH only — rule 8).
  const readinessRecommendationDetail = buildSwanCoachReadinessRecommendationDetail(swanCoachReadiness);
  const buildRecommendationDetails = () => {
    const details = [];
    if (context.criticalDataUnavailable) {
      details.push({
        type: 'safety_warning',
        text: 'Pain/injury data could not be loaded. Review this plan carefully before assigning.',
        sourceCitation: 'context.criticalFailures',
      });
    }
    if (equipmentItems.length > 0) {
      details.push({
        type: 'equipment',
        text: `Available equipment: ${equipmentItems.map(i => i.name).join(', ')} — constrain exercises to this equipment`,
        sourceCitation: 'context.equipment[].items',
      });
    }
    if (context.pain.exclusions.length > 0) {
      details.push({
        type: 'pain',
        text: `Avoid exercises targeting: ${context.pain.exclusions.map(e => e.bodyRegion).join(', ')}`,
        sourceCitation: 'context.pain.exclusions[].bodyRegion',
      });
    }
    if (context.movement.compensations.length > 0) {
      details.push({
        type: 'baseline',
        text: `Include CES corrective warmup for: ${context.movement.compensations.map(c => c.type).join(', ')}`,
        sourceCitation: 'context.movement.compensations[].type',
      });
    }
    details.push({
      type: 'progression',
      text: `Start at NASM OPT Phase ${startingPhase} and progress based on assessment scores`,
      sourceCitation: 'context.constraints.nasmPhase',
    });
    details.push({
      type: 'progression',
      text: `Use ${context.variation.currentPattern} rotation pattern for exercise variation`,
      sourceCitation: 'context.variation.currentPattern',
    });
    details.push({
      type: 'goal',
      text: `Plan aligned with trainer-selected goal: ${goalLabel}`,
      sourceCitation: 'options.primaryGoal',
    });
    if (context.baseline?.nasmAssessmentScore) {
      details.push({
        type: 'baseline',
        text: `NASM assessment: ${context.baseline.nasmAssessmentScore}/100 — ${context.baseline.nasmAssessmentScore < 60 ? 'prioritize corrective phases' : 'ready for progressive loading'}`,
        sourceCitation: 'context.baseline.nasmAssessmentScore',
      });
    }
    if (context.nutrition?.dailyCalories) {
      details.push({
        type: 'baseline',
        text: `Nutrition plan: ${context.nutrition.dailyCalories} kcal/day (${context.nutrition.proteinGrams}g protein) — adjust volume for recovery capacity`,
        sourceCitation: 'context.nutrition.dailyCalories',
      });
    }
    if (trainingStyle.mode === 'hardcore') {
      details.push(trainingStyleRecommendationDetail(trainingStyle));
    }
    details.push(readinessRecommendationDetail);
    return details;
  };
  const swanCoachPlanning = buildSwanCoachPlanningFingerprint({
    context: buildPlanningCoverageContext(context),
    horizonWeeks: durationWeeks,
    sessionsPerWeek,
    nasmPhase: startingPhase,
    primaryGoal,
  });

  return {
    clientId,
    trainerId,
    clientName: context.clientName,
    generatedAt: new Date().toISOString(),
    planningSystem: 'swan_coach_planning',
    swanCoachPlanning,
    trainingStyle,
    swanCoachReadiness,

    planSummary: {
      durationWeeks,
      sessionsPerWeek,
      totalSessions: durationWeeks * sessionsPerWeek,
      primaryGoal,
      startingPhase,
      equipmentProfileId,
      trainingStyle,
      readinessLevel: swanCoachReadiness.level,
    },

    rationale,
    mesocycles,
    weeklySchedule,

    constraints: context.constraints,
    compensations: context.movement.compensations.map(c => ({
      type: c.type,
      trend: c.trend,
    })),

    equipmentContext: equipmentItems.length > 0
      ? {
          profileId: equipmentProfileId,
          availableEquipment: equipmentItems.map(i => `${i.name} (${i.category})`),
          resistanceTypes: [...new Set(equipmentItems.map(i => i.resistanceType).filter(Boolean))],
        }
      : null,

    recommendations: [
      context.criticalDataUnavailable
        ? 'Pain/injury data could not be loaded. Review this plan carefully before assigning.'
        : null,
      equipmentItems.length > 0
        ? `Available equipment: ${equipmentItems.map(i => i.name).join(', ')} — constrain exercises to this equipment`
        : null,
      context.pain.exclusions.length > 0
        ? `Avoid exercises targeting: ${context.pain.exclusions.map(e => e.bodyRegion).join(', ')}`
        : null,
      context.movement.compensations.length > 0
        ? `Include CES corrective warmup for: ${context.movement.compensations.map(c => c.type).join(', ')}`
        : null,
      `Start at NASM OPT Phase ${startingPhase} and progress based on assessment scores`,
      `Use ${context.variation.currentPattern} rotation pattern for exercise variation`,
      `Plan aligned with trainer-selected goal: ${goalLabel}`,
      context.baseline?.nasmAssessmentScore
        ? `NASM assessment: ${context.baseline.nasmAssessmentScore}/100 — ${context.baseline.nasmAssessmentScore < 60 ? 'prioritize corrective phases' : 'ready for progressive loading'}`
        : null,
      context.nutrition?.dailyCalories
        ? `Nutrition plan: ${context.nutrition.dailyCalories} kcal/day (${context.nutrition.proteinGrams}g protein) — adjust volume for recovery capacity`
        : null,
      trainingStyle.mode === 'hardcore'
        ? `${trainingStyle.label}: ${trainingStyle.cue}`
        : null,
      readinessRecommendationDetail.text,
    ].filter(Boolean),

    // Deep client intelligence for plan review
    clientIntelligence: {
      goals: context.goals || null,
      body: context.body || null,
      baseline: context.baseline || null,
      nutrition: context.nutrition || null,
      progressLevels: context.progressLevels || null,
      streak: context.streak || null,
      trainingVault: context.trainingVault || null,
      sourcePolicy: context.sourcePolicy || null,
      safety: context.safety || null,
      health: context.health || null,
    },

    // L1 (2026-05-01) — NEW additive fields per receipt §4.A.
    // weeks[]: full long-horizon populated structure. Each day has an
    //   exercises[] array selected per NASM rules with rotation across
    //   the horizon. Frontend (L2) will navigate Month → Week → Day
    //   from here. Existing fields above (planSummary, mesocycles[],
    //   weeklySchedule[], rationale, recommendations) are PRESERVED for
    //   backward compatibility with the current frontend type.
    // recommendationDetails[]: source-cited mirror of recommendations[].
    weeks,
    recommendationDetails: buildRecommendationDetails(),
  };
}
