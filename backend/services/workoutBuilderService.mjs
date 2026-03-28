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
import { getExerciseRegistry, getExerciseRegistryFromDB, generateSwapSuggestions } from './variationEngine.mjs';
import { getRecommendedWeight } from './oneRepMaxService.mjs';
import logger from '../utils/logger.mjs';

// Pain severity threshold: auto-exclude muscles at or above this level
const PAIN_AUTO_EXCLUDE_SEVERITY = 7;

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
    { name: 'Child\'s Pose', duration: '60s' },
    { name: 'Cat-Cow', sets: 1, reps: 10 },
    { name: 'Diaphragmatic Breathing', duration: '60s' },
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

function selectExercises(registry, category, count, constraints, equipmentItems, nasmPhase) {
  // H1 FIX: registry is an array of {key, name, muscles, category, equipment, nasmLevel}
  // Filter exercises for this category (movement type match)
  const categoryExercises = registry
    .filter(ex => ex.category === category || category === 'full_body');

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

  // Sort by NASM level match, then by not-recently-used
  const recentSet = new Set(constraints.recentlyUsedExercises);
  const targetLevel = nasmPhase || 2;

  available.sort((a, b) => {
    const aRecent = recentSet.has(a.key) ? 1 : 0;
    const bRecent = recentSet.has(b.key) ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;

    const aLevelDiff = Math.abs((a.nasmLevel || 2) - targetLevel);
    const bLevelDiff = Math.abs((b.nasmLevel || 2) - targetLevel);
    return aLevelDiff - bLevelDiff;
  });

  return available.slice(0, count);
}

// ── Helper: Apply OPT parameters to exercise ─────────────────────────

function applyOPTParams(exercise, phase) {
  const params = OPT_PHASE_PARAMS[phase] || OPT_PHASE_PARAMS[2];
  return {
    exerciseKey: exercise.key,
    exerciseName: formatExerciseName(exercise.key),
    muscles: exercise.muscles || [],
    category: exercise.category,
    equipment: exercise.equipment || [],
    nasmLevel: exercise.nasmLevel,
    movementPattern: exercise.movementPattern || null,
    sets: params.sets[0],
    reps: `${params.reps[0]}-${params.reps[1]}`,
    tempo: params.tempo,
    rest: `${params.rest[0]}-${params.rest[1]}s`,
    intensity: params.intensity,
  };
}

function formatExerciseName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
  } = options;

  if (!clientId) throw new Error('clientId is required');
  if (!trainerId) throw new Error('trainerId is required');

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
  const sessionType = context.variation.lastSessionType
    ? (context.variation.lastSessionType === 'build' ? 'switch' : 'build')
    : 'build';

  // Step 3: Get exercise registry from DB (840+) with hardcoded fallback (81)
  const registry = await getExerciseRegistryFromDB();
  const nasmPhase = context.constraints.nasmPhase || 2;

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
      context.constraints, equipmentItems, nasmPhase
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
    applyOPTParams(ex, nasmPhase)
  );

  // Step 7: Build warmup and cooldown
  const warmupType = CATEGORY_TO_WARMUP[category] || 'general';
  const warmup = [...WARMUP_TEMPLATES[warmupType]];

  // Add compensation-specific warmup exercises
  for (const comp of context.movement.compensations.slice(0, 3)) {
    if (comp.cesStrategy) {
      const inhibit = comp.cesStrategy.inhibit?.[0];
      const activate = comp.cesStrategy.activate?.[0];
      if (inhibit) {
        warmup.push({
          name: `Foam Roll ${formatExerciseName(inhibit)}`,
          duration: '30s',
          type: 'inhibit',
          reason: `Addressing ${comp.type} compensation`,
        });
      }
      if (activate) {
        warmup.push({
          name: `Activate ${formatExerciseName(activate)}`,
          sets: 1,
          reps: 12,
          type: 'activate',
          reason: `Addressing ${comp.type} compensation`,
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

  // Goal-aware explanations
  if (context.goals?.primaryGoal) {
    explanations.push({
      type: 'client_goal',
      message: `Primary goal: ${context.goals.primaryGoal}. Exercise selection prioritized for this objective.`,
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

  const phaseParams = OPT_PHASE_PARAMS[nasmPhase] || OPT_PHASE_PARAMS[2];

  return {
    clientId,
    trainerId,
    clientName: context.clientName,
    generatedAt: new Date().toISOString(),

    sessionType,
    category,
    nasmPhase,
    phaseParams: {
      name: phaseParams.name,
      focus: phaseParams.focus,
      intensity: phaseParams.intensity,
      tempo: phaseParams.tempo,
    },

    warmup,
    exercises: workoutExercises,
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
    primaryGoal = 'general_fitness',
    equipmentProfileId = null,
  } = options;

  // L6 FIX: Validate inputs
  if (!clientId) throw new Error('clientId is required');
  if (!trainerId) throw new Error('trainerId is required');

  const context = await getClientContext(clientId, trainerId);
  const startingPhase = context.constraints.nasmPhase || 1;

  // Build mesocycles (4-week blocks)
  const mesocycleCount = Math.ceil(durationWeeks / 4);
  const mesocycles = [];

  for (let i = 0; i < mesocycleCount; i++) {
    const phase = Math.min(5, startingPhase + Math.floor(i / 2));
    const phaseParams = OPT_PHASE_PARAMS[phase] || OPT_PHASE_PARAMS[2];

    const weekStart = i * 4 + 1;
    const weekEnd = Math.min((i + 1) * 4, durationWeeks);

    mesocycles.push({
      mesocycle: i + 1,
      weeks: `${weekStart}-${weekEnd}`,
      nasmPhase: phase,
      phaseName: phaseParams.name,
      focus: phaseParams.focus,
      params: {
        sets: `${phaseParams.sets[0]}-${phaseParams.sets[1]}`,
        reps: `${phaseParams.reps[0]}-${phaseParams.reps[1]}`,
        intensity: phaseParams.intensity,
        tempo: phaseParams.tempo,
        rest: `${phaseParams.rest[0]}-${phaseParams.rest[1]}s`,
      },
      overloadStrategy: phase <= 2
        ? 'Add 1-2 reps per week, increase weight when hitting top of rep range'
        : phase <= 4
          ? 'Add 2.5-5% weight per week, maintain rep targets'
          : 'Increase movement velocity, alternate heavy/speed days',
      deloadWeek: weekEnd === (i + 1) * 4 ? weekEnd : null,
    });
  }

  // Category rotation across the week
  const weeklySchedule = [];
  const rotationPool = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];

  for (let day = 0; day < sessionsPerWeek; day++) {
    const cat = sessionsPerWeek >= 4
      ? rotationPool[day % rotationPool.length]
      : ['full_body', 'upper', 'lower'][day % 3];

    weeklySchedule.push({
      dayNumber: day + 1,
      focus: cat === 'push' ? 'chest + shoulders + triceps'
        : cat === 'pull' ? 'back + biceps'
        : cat === 'legs' ? 'quads + hamstrings + glutes'
        : cat === 'upper' ? 'chest + back + shoulders + arms'
        : cat === 'lower' ? 'quads + hamstrings + glutes + core'
        : 'full body',
      category: cat,
    });
  }

  return {
    clientId,
    trainerId,
    clientName: context.clientName,
    generatedAt: new Date().toISOString(),

    planSummary: {
      durationWeeks,
      sessionsPerWeek,
      totalSessions: durationWeeks * sessionsPerWeek,
      primaryGoal,
      startingPhase,
      equipmentProfileId,
    },

    mesocycles,
    weeklySchedule,

    constraints: context.constraints,
    compensations: context.movement.compensations.map(c => ({
      type: c.type,
      trend: c.trend,
    })),

    recommendations: [
      context.pain.exclusions.length > 0
        ? `Avoid exercises targeting: ${context.pain.exclusions.map(e => e.bodyRegion).join(', ')}`
        : null,
      context.movement.compensations.length > 0
        ? `Include CES corrective warmup for: ${context.movement.compensations.map(c => c.type).join(', ')}`
        : null,
      `Start at NASM OPT Phase ${startingPhase} and progress based on assessment scores`,
      `Use ${context.variation.currentPattern} rotation pattern for exercise variation`,
      context.goals?.primaryGoal
        ? `Plan aligned with primary goal: ${context.goals.primaryGoal}`
        : null,
      context.baseline?.nasmAssessmentScore
        ? `NASM assessment: ${context.baseline.nasmAssessmentScore}/100 — ${context.baseline.nasmAssessmentScore < 60 ? 'prioritize corrective phases' : 'ready for progressive loading'}`
        : null,
      context.nutrition?.dailyCalories
        ? `Nutrition plan: ${context.nutrition.dailyCalories} kcal/day (${context.nutrition.proteinGrams}g protein) — adjust volume for recovery capacity`
        : null,
    ].filter(Boolean),

    // Deep client intelligence for plan review
    clientIntelligence: {
      goals: context.goals || null,
      body: context.body || null,
      baseline: context.baseline || null,
      nutrition: context.nutrition || null,
      progressLevels: context.progressLevels || null,
      streak: context.streak || null,
    },
  };
}
