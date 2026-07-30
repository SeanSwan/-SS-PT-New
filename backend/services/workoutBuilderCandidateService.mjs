/**
 * Swan Coach guided workout candidate service.
 * Produces selectable exercise options before committing a generated workout.
 */
import { getClientContext } from './clientIntelligenceService.mjs';
import { getExerciseRegistryFromDB } from './variationEngine.mjs';
import { painVerdictForExercise, resolveClientPainExclusions } from './ai/coachDispatchEligibilityService.mjs';
import { buildSwanCoachPlanningSafetyGateFromContext } from './swanCoachPlanningFingerprintService.mjs';
import { getGoalOptBias, normalizeGoal } from './workoutBuilderGoalConfig.mjs';
import { phaseCandidateDefaults } from './training-cortex/policy/nasmOptPolicy.mjs';
import {
  applySwanCoachReadinessToExercises,
  buildSwanCoachReadinessContext,
  scoreExerciseForSwanCoachReadiness,
} from './swanCoachCortexService.mjs';
import {
  buildExerciseFamiliarity,
  scoreExerciseFamiliarity,
} from './exerciseFamiliarityService.mjs';
import {
  equipmentCategoriesFromItems,
  equipmentItemsForProfile,
  matchesEquipmentProfile,
} from './workoutBuilderCandidateEquipment.mjs';

const GENERATION_MODES = new Set(['auto', 'guide_me', 'deep_grill']);

const CATEGORY_MATCHERS = {
  full_body: ['push', 'pull', 'squat', 'lunge', 'hinge', 'core', 'compound', 'corrective'],
  chest: ['push', 'chest', 'pec'],
  back: ['pull', 'back', 'lat', 'rhomboid', 'rear_deltoid'],
  shoulders: ['push', 'pull', 'shoulder', 'deltoid', 'rotator_cuff'],
  arms: ['push', 'pull', 'biceps', 'triceps', 'forearm', 'brachioradialis'],
  legs: ['squat', 'lunge', 'hinge', 'quad', 'glute', 'hamstring', 'calf', 'hip'],
  core: ['core', 'oblique', 'tva', 'trunk'],
};

const CATEGORY_LABELS = {
  full_body: 'Full Body',
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
};

const GOAL_LABELS = {
  general_fitness: 'general fitness',
  hypertrophy: 'muscle growth',
  strength: 'strength',
  fat_loss: 'fat loss',
  athletic_performance: 'athletic performance',
  golf_performance: 'golf performance',
};

export function normalizeGenerationMode(mode) {
  return GENERATION_MODES.has(mode) ? mode : 'guide_me';
}

export function candidateCountForMode(mode, requestedCount) {
  const parsed = Number.parseInt(requestedCount, 10);
  if (Number.isInteger(parsed)) return Math.min(Math.max(parsed, 4), 6);
  return normalizeGenerationMode(mode) === 'deep_grill' ? 6 : 4;
}

function displayCategory(category) {
  return CATEGORY_LABELS[category] || 'Full Body';
}

function labelsForExercise(exercise = {}) {
  return [
    exercise.key,
    exercise.name,
    exercise.category,
    exercise.exerciseType,
    exercise.bodyPartCategory,
    exercise.movementPattern,
    exercise.nasmMovementPattern,
    ...(Array.isArray(exercise.muscles) ? exercise.muscles : []),
    ...(Array.isArray(exercise.equipment) ? exercise.equipment : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesCategory(exercise, category) {
  if (category === 'full_body') return true;
  const allowed = CATEGORY_MATCHERS[category] || CATEGORY_MATCHERS.full_body;
  const labels = labelsForExercise(exercise);
  return allowed.some(token => labels.includes(token));
}

function mediaFromExercise(exercise = {}) {
  return {
    videoUrl: exercise.videoUrl || null,
    previewVideoUrl: exercise.previewVideoUrl || null,
    imageUrl: exercise.imageUrl || null,
    thumbnailUrl: exercise.thumbnailUrl || null,
  };
}

function exerciseDifficulty(exercise = {}) {
  if (Number.isFinite(Number(exercise.difficulty))) return Number(exercise.difficulty);
  return Math.max(100, Math.min(1000, Number(exercise.nasmLevel || 2) * 200));
}

// Cortex Phase 2A: candidate-card defaults now live beside the canonical
// acute-variable table (training-cortex/policy/nasmOptPolicy.mjs) — same
// values, single home, containment test-locked.
const phaseDefaults = phaseCandidateDefaults;

function exerciseSlimFromCandidate(exercise) {
  const media = mediaFromExercise(exercise);
  return {
    id: String(exercise.id || exercise.key),
    name: exercise.name,
    exerciseKey: exercise.key,
    exerciseType: exercise.exerciseType || exercise.category || 'compound',
    bodyPartCategory: exercise.bodyPartCategory || exercise.category || 'Full Body',
    primaryMuscles: Array.isArray(exercise.muscles) ? exercise.muscles : [],
    secondaryMuscles: Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [],
    difficulty: exerciseDifficulty(exercise),
    equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
    equipmentNeeded: Array.isArray(exercise.equipment) ? exercise.equipment : [],
    source: exercise.source || 'unknown',
    defaultTempo: exercise.defaultTempo || null,
    defaultRestSeconds: Number.isFinite(Number(exercise.defaultRestSeconds)) ? Number(exercise.defaultRestSeconds) : null,
    recommendedSets: Number.isFinite(Number(exercise.recommendedSets)) ? Number(exercise.recommendedSets) : null,
    recommendedReps: Number.isFinite(Number(exercise.recommendedReps)) ? Number(exercise.recommendedReps) : null,
    recommendedDuration: Number.isFinite(Number(exercise.recommendedDuration)) ? Number(exercise.recommendedDuration) : null,
    nasmMovementPattern: exercise.nasmMovementPattern || exercise.movementPattern || null,
    ...media,
  };
}

function goalBiasScore(exercise, primaryGoal, phase) {
  const bias = getGoalOptBias({ primaryGoal, phase });
  const labels = labelsForExercise(exercise);
  let score = 0;
  for (const token of bias.exerciseBias || []) {
    if (labels.includes(token)) score += 2;
  }
  if (primaryGoal === 'strength' && /row|press|squat|deadlift|pull|push|hinge/.test(labels)) score += 2;
  if (primaryGoal === 'fat_loss' && /compound|core|stability|circuit/.test(labels)) score += 2;
  if (primaryGoal === 'hypertrophy' && /dumbbell|cable|machine|isolation/.test(labels)) score += 1;
  return score;
}

function mediaScore(exercise) {
  const media = mediaFromExercise(exercise);
  if (media.previewVideoUrl || media.videoUrl) return 2;
  if (media.thumbnailUrl || media.imageUrl) return 1;
  return 0;
}

function scoreCandidate(exercise, { category, primaryGoal, nasmPhase, readiness, familiarity = null }) {
  const phase = Number.isInteger(nasmPhase) ? nasmPhase : 2;
  const phaseFit = Math.max(0, 5 - Math.abs(Number(exercise.nasmLevel || 2) - phase));
  return phaseFit
    + goalBiasScore(exercise, primaryGoal, phase)
    + scoreExerciseForSwanCoachReadiness(exercise, readiness)
    // Familiarity-aware ranking (2026-07-14): logged-history exercises rank
    // first; novel barbell/high-difficulty picks are penalized. 0 when the
    // client has no history or the history lookup failed (fail-open).
    + scoreExerciseFamiliarity(exercise, familiarity)
    + mediaScore(exercise)
    + (matchesCategory(exercise, category) ? 3 : 0);
}

function selectionReason({ category, primaryGoal, readiness, equipmentFilterActive }) {
  const goalLabel = GOAL_LABELS[primaryGoal] || 'training';
  const readinessText = readiness?.label ? `${readiness.label} readiness` : 'readiness';
  const equipmentText = equipmentFilterActive ? ' and the selected equipment profile' : '';
  return `${displayCategory(category)} option matched the ${goalLabel} goal with ${readinessText} context${equipmentText}.`;
}

function formatCandidate(exercise, index, context) {
  const defaults = phaseDefaults(context.nasmPhase || 2);
  const readinessExercise = applySwanCoachReadinessToExercises([exercise], context.readiness)[0];
  return {
    candidateId: `${context.category}-${index + 1}-${exercise.key}`,
    exerciseKey: exercise.key,
    exerciseName: exercise.name,
    muscles: Array.isArray(exercise.muscles) ? exercise.muscles : [],
    category: exercise.category || 'compound',
    equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
    nasmLevel: exercise.nasmLevel || 2,
    movementPattern: exercise.movementPattern || exercise.nasmMovementPattern || null,
    source: exercise.source || 'unknown',
    sets: Number(exercise.recommendedSets || defaults.sets),
    reps: Number(exercise.recommendedReps || defaults.reps),
    tempo: exercise.defaultTempo || defaults.tempo,
    restSeconds: Number(exercise.defaultRestSeconds || defaults.restSeconds),
    intensityPercent: defaults.intensityPercent,
    readinessNote: readinessExercise.readinessNote || null,
    readinessIntensityGuardrail: readinessExercise.readinessIntensityGuardrail || null,
    selectionReason: selectionReason(context),
    score: scoreCandidate(exercise, context),
    media: mediaFromExercise(exercise),
    exerciseSlim: exerciseSlimFromCandidate(exercise),
  };
}

function slotInstruction({ hasCandidates, equipmentFilterActive, painFilterActive }) {
  if (!hasCandidates && painFilterActive) {
    return 'Every option in this category targets muscles excluded by this client’s active pain report. Pick another category, or review the pain report in the workout builder.';
  }
  if (!hasCandidates && equipmentFilterActive) {
    return 'No options matched this category with the selected equipment profile. Adjust the equipment profile or category, then try again.';
  }
  return 'Pick one option for this workout slot, or switch back to Auto to generate the whole session.';
}

const SAFETY_HOLD_INSTRUCTION = 'This client’s pain/safety data could not be loaded, so exercise recommendations are held. Retry, or review the client’s intake before assigning work.';

// Pain-exclusion resolution moved to the shared fail-closed resolver in
// coachDispatchEligibilityService (Workout-OS C6) — one source of truth for
// chat gate + candidates + suggested-workouts.
const resolveCandidatePainExclusions = resolveClientPainExclusions;

export async function generateWorkoutCandidates({
  clientId,
  trainerId,
  category = 'full_body',
  primaryGoal = 'general_fitness',
  nasmPhase = 2,
  generationMode = 'guide_me',
  candidateCount,
  equipmentProfileId = null,
  readinessCheck = {},
} = {}) {
  if (!clientId) throw new Error('clientId is required');
  if (!trainerId) throw new Error('trainerId is required');

  const mode = normalizeGenerationMode(generationMode);
  const safeGoal = normalizeGoal(primaryGoal);
  const safeCategory = CATEGORY_MATCHERS[category] ? category : 'full_body';
  const safePhase = Number.isInteger(Number(nasmPhase)) ? Math.min(Math.max(Number(nasmPhase), 1), 5) : 2;
  const count = candidateCountForMode(mode, candidateCount);
  const safeEquipmentProfileId = Number.isInteger(Number(equipmentProfileId)) && Number(equipmentProfileId) > 0
    ? Number(equipmentProfileId)
    : null;

  const clientContext = await getClientContext(clientId, trainerId);
  const readiness = await buildSwanCoachReadinessContext({
    clientContext,
    readinessCheck,
    category: safeCategory,
    primaryGoal: safeGoal,
  });
  const equipmentItems = equipmentItemsForProfile(clientContext, safeEquipmentProfileId, clientId);
  const availableEquipmentCategories = equipmentCategoriesFromItems(equipmentItems);
  const equipmentFilterActive = availableEquipmentCategories.size > 0;

  // Pain safety (Cortex fast-follow, 2026-07-12): candidates recommend work
  // for a SPECIFIC client, so they inherit the client's pain exclusions and
  // the untagged-muscle fail-safe — the same verdict the chat gate uses. An
  // UNKNOWN pain state holds every recommendation fail-visibly.
  const heldResponse = (safetyHold, instruction, extra = {}) => ({
    planningSystem: 'swan_coach_planning',
    swanCoachPlanning: { createdBy: 'swan_coach_planning', identityMode: 'client_id_only' },
    candidateSystem: 'swan_coach_guided_candidates',
    clientId,
    trainerId,
    generatedAt: new Date().toISOString(),
    generationMode: mode,
    category: safeCategory,
    primaryGoal: safeGoal,
    nasmPhase: safePhase,
    equipmentProfileId: safeEquipmentProfileId,
    availableEquipmentCategories: Array.from(availableEquipmentCategories).sort(),
    swanCoachReadiness: readiness,
    safetyHold,
    painExclusionsApplied: [],
    ...extra,
    slots: [{
      slotId: `${safeCategory}-primary`,
      focus: displayCategory(safeCategory),
      instruction,
      candidates: [],
    }],
  });

  const painExclusions = resolveCandidatePainExclusions(clientContext);
  if (painExclusions === null) {
    return heldResponse('pain_data_unavailable', SAFETY_HOLD_INSTRUCTION);
  }

  // Blocking-tier parity (hostile-review HIGH-1, 2026-07-13): a client whose
  // deterministic gate is review_required 409s in the builder and is refused
  // in chat — "Guide Me" must not be the remaining side door around that
  // review, even when no muscles are excluded yet. Same gate the builder uses.
  const safetyGate = buildSwanCoachPlanningSafetyGateFromContext(clientContext ?? {});
  if (safetyGate?.status === 'review_required') {
    return heldResponse(
      'safety_review_required',
      'This client’s safety review is pending — complete the review in the workout builder before browsing candidate exercises.',
      {
        reviewRequiredSignals: Array.isArray(safetyGate.reviewRequiredSignals)
          ? safetyGate.reviewRequiredSignals
          : [],
      },
    );
  }
  const painFilterActive = painExclusions.length > 0;

  const registry = await getExerciseRegistryFromDB();
  // Familiarity signal from real logged history (fail-open: null on error).
  const familiarity = await buildExerciseFamiliarity(clientId, registry);
  const pool = registry.filter(exercise => (
    matchesCategory(exercise, safeCategory)
    && matchesEquipmentProfile(exercise, availableEquipmentCategories)
    && painVerdictForExercise(exercise, painExclusions).eligible
  ));
  const ranked = pool
    .map(exercise => ({ exercise, score: scoreCandidate(exercise, {
      category: safeCategory,
      primaryGoal: safeGoal,
      nasmPhase: safePhase,
      readiness,
      familiarity,
    }) }))
    .sort((a, b) => b.score - a.score || String(a.exercise.name).localeCompare(String(b.exercise.name)))
    .slice(0, count)
    .map(({ exercise }, index) => formatCandidate(exercise, index, {
      category: safeCategory,
      primaryGoal: safeGoal,
      nasmPhase: safePhase,
      readiness,
      familiarity,
      equipmentFilterActive,
    }));

  return {
    planningSystem: 'swan_coach_planning',
    swanCoachPlanning: { createdBy: 'swan_coach_planning', identityMode: 'client_id_only' },
    candidateSystem: 'swan_coach_guided_candidates',
    clientId,
    trainerId,
    generatedAt: new Date().toISOString(),
    generationMode: mode,
    category: safeCategory,
    primaryGoal: safeGoal,
    nasmPhase: safePhase,
    equipmentProfileId: safeEquipmentProfileId,
    availableEquipmentCategories: Array.from(availableEquipmentCategories).sort(),
    swanCoachReadiness: readiness,
    painExclusionsApplied: painExclusions,
    slots: [{
      slotId: `${safeCategory}-primary`,
      focus: displayCategory(safeCategory),
      instruction: slotInstruction({ hasCandidates: ranked.length > 0, equipmentFilterActive, painFilterActive }),
      candidates: ranked,
    }],
  };
}