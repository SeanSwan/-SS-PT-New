/**
 * ============================================================================
 * FILE: bootcampGenerator.mjs
 * PURPOSE: AI-powered bootcamp class generation algorithm
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Generates bootcamp class plans using exercise registry,
 * freshness tracking, station layout, and overflow management.
 * HOW IT FITS: Called by bootcampService → routes → frontend ConfigPanel
 */

import {
  getBootcampClassLog,
  getBootcampSpaceProfile,
} from '../../models/index.mjs';
import { getExerciseRegistry } from '../variationEngine.mjs';
import { applyExerciseQualityGate } from '../exerciseQualityGate.mjs';
import { Op } from 'sequelize';
import {
  FORMAT_CONFIG, TRANSITION_TIME_SEC, STATION_TRANSITION_SEC,
  DAY_TYPE_MUSCLES, CARDIO_FINISHERS, LAP_EXERCISES,
  CUSTOM_STRUCTURE_LIMITS, formatExerciseName, distributeMuscleGroups,
} from './bootcampConstants.mjs';
import { estimateSetupTime } from './exerciseRolodexBridge.mjs';
import { optimizeStationFlow } from './flowOptimizer.mjs';
import {
  generateBoard2, applyClassStyle, generateStretches,
} from './classStyleModifiers.mjs';
import { applyPainAwareGating } from './painAwareGating.mjs';
import { applyDayTypeContract, budgetGate } from './dayTypeContract.mjs';
import {
  buildAvailableEquipmentList, buildEquipmentCountMap,
  collapseStationCountForParticipants, assessEquipmentFeasibility,
} from './bootcampCapacity.mjs';

// Preserved named-export surface after the move to bootcampCapacity.mjs.
export { buildAvailableEquipmentList };

const PROFILE_ACCESS_DENIED_CODE = 'BOOTCAMP_PROFILE_ACCESS_DENIED';

function assertProfileAccess(profile, { trainerId, requesterRole, requireActive = false }) {
  const ownsProfile = !!profile
    && (!requireActive || profile.isActive === true)
    && (requesterRole === 'admin' || Number(profile.trainerId) === Number(trainerId));
  if (ownsProfile) return;

  const error = new Error('Access denied');
  error.statusCode = 403;
  error.code = PROFILE_ACCESS_DENIED_CODE;
  throw error;
}

function isProfileAccessDenied(error) {
  return error?.statusCode === 403 && error?.code === PROFILE_ACCESS_DENIED_CODE;
}

// ── Exercise Selection Algorithms ─────────────────────────────────────

/**
 * Sample `take` items from the TOP of `pool` without replacement.
 * The window (3× the ask, floor 9) keeps picks inside the best-ranked
 * candidates — protocol ordering (intensity rank / difficulty) still gates
 * quality; the RNG only varies WHICH qualified pick lands, so repeated
 * Generate presses produce fresh-but-sound classes instead of one frozen
 * answer. rng is injectable for deterministic tests.
 */
function sampleFromWindow(pool, take, rng = Math.random) {
  if (take <= 0 || pool.length === 0) return [];
  const windowSize = Math.min(pool.length, Math.max(take * 3, 9));
  const window = pool.slice(0, windowSize);
  // Partial Fisher-Yates: shuffle only the first `take` slots.
  for (let i = 0; i < Math.min(take, window.length - 1); i++) {
    const j = i + Math.floor(rng() * (window.length - i));
    [window[i], window[j]] = [window[j], window[i]];
  }
  return window.slice(0, take);
}

function selectStationExercises(available, stationMuscles, count, usedNames, rng = Math.random, fallbackGate = null) {
  const primaryMuscle = stationMuscles[0];

  const primaryMatches = available
    .filter(ex => {
      const exPrimary = ex.primaryMuscle || (ex.muscles ?? [])[0];
      return exPrimary && exPrimary === primaryMuscle;
    })
    .filter(ex => !usedNames.has(ex.key));

  const secondaryMatches = available
    .filter(ex => {
      const exMuscles = ex.muscles ?? [];
      const exPrimary = ex.primaryMuscle || exMuscles[0];
      if (exPrimary === primaryMuscle) return false;
      return exMuscles.includes(primaryMuscle);
    })
    .filter(ex => !usedNames.has(ex.key));

  const tertiaryMatches = stationMuscles.length > 1
    ? available
        .filter(ex => {
          const exPrimary = ex.primaryMuscle || (ex.muscles ?? [])[0];
          return stationMuscles.slice(1).includes(exPrimary);
        })
        .filter(ex => !usedNames.has(ex.key))
        .filter(ex => !primaryMatches.some(p => p.key === ex.key) && !secondaryMatches.some(s => s.key === ex.key))
    : [];

  const needed = Math.max(1, count - 1);

  // Tier precedence is protocol (primary muscle first, then assisting,
  // then station-secondary muscles); the sample varies picks WITHIN a tier.
  const selected = [];
  for (const tier of [primaryMatches, secondaryMatches, tertiaryMatches]) {
    if (selected.length >= needed) break;
    selected.push(...sampleFromWindow(tier, needed - selected.length, rng));
  }
  if (selected.length >= needed) return selected;

  let remainingPool = available
    .filter(ex => !usedNames.has(ex.key) && !selected.some(s => s.key === ex.key));
  // SWA-105 Slice 1: this fallback was D1's leak point — it filled leftover
  // slots with ANYTHING. The pool is now day-legal upstream, and the budget
  // gate keeps one region from eating the class. Budget prefers, never
  // starves: an over-budget pick beats an empty slot on a live floor.
  if (fallbackGate) {
    const budgeted = remainingPool.filter(fallbackGate);
    if (budgeted.length > 0) remainingPool = budgeted;
  }
  selected.push(...sampleFromWindow(remainingPool, needed - selected.length, rng));

  return selected;
}

function selectFullGroupExercises(available, rng = Math.random) {
  const compound = sampleFromWindow(
    available.filter(ex => (ex.muscles ?? []).length >= 2),
    5,
    rng,
  );

  const cardio = CARDIO_FINISHERS.slice(0, 5).map(cf => ({
    ...cf,
    key: cf.name.toLowerCase().replace(/\s+/g, '_'),
    muscles: cf.muscles.split(','),
    isCardio: true,
  }));

  const usedKeys = new Set([...compound.map(e => e.key), ...cardio.map(e => e.key)]);
  const accessory = sampleFromWindow(
    available.filter(ex => !usedKeys.has(ex.key) && (ex.muscles ?? []).length <= 2),
    5,
    rng,
  );

  const result = [];
  const maxLen = Math.max(compound.length, cardio.length, accessory.length);
  for (let i = 0; i < maxLen; i++) {
    if (compound[i]) result.push(compound[i]);
    if (cardio[i]) result.push(cardio[i]);
    if (accessory[i]) result.push(accessory[i]);
  }

  return result.slice(0, 15);
}

// ── Build Exercise Record ─────────────────────────────────────────────

function buildExerciseRecord(ex, opts) {
  // Use bridge estimator if exercise has equipment data, else fall back to stored value
  const setupTime = ex.setupTimeSec ?? estimateSetupTime(ex);
  const exerciseLibraryId = normalizeExerciseLibraryId(ex.exerciseLibraryId);

  return {
    stationIndex: opts.stationIndex ?? undefined,
    exerciseName: ex.name ?? formatExerciseName(ex.key),
    durationSec: opts.durationSec,
    restSec: opts.restSec ?? TRANSITION_TIME_SEC,
    sortOrder: opts.sortOrder,
    isCardioFinisher: opts.isCardioFinisher ?? false,
    muscleTargets: Array.isArray(ex.muscles) ? ex.muscles.join(',') : (ex.muscles ?? ''),
    easyVariation: ex.easy ?? null,
    mediumVariation: ex.medium ?? null,
    hardVariation: ex.hard ?? null,
    kneeMod: ex.kneeMod ?? null,
    shoulderMod: ex.shoulderMod ?? null,
    ankleMod: ex.ankleMod ?? null,
    wristMod: ex.wristMod ?? null,
    backMod: ex.backMod ?? null,
    description: ex.description ?? null,
    instructions: ex.instructions ?? null,
    equipmentRequired: Array.isArray(ex.equipment) ? ex.equipment.join(', ') : (ex.equipment ?? null),
    videoUrl: ex.videoUrl ?? null,
    previewVideoUrl: ex.previewVideoUrl ?? null,
    imageUrl: ex.imageUrl ?? null,
    thumbnailUrl: ex.thumbnailUrl ?? null,
    board: 'main',
    setupTimeSec: setupTime,
    exerciseLibraryId,
  };
}

function normalizeExerciseLibraryId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// buildAvailableEquipmentList moved to bootcampCapacity.mjs (imported above)
// alongside its new quantity-aware sibling buildEquipmentCountMap.

async function getEquipmentInventoryForBootcamp(equipmentProfileId, requester) {
  // equipmentCounts stays null whenever quantities are unknowable (no profile,
  // query failure) — the feasibility check treats null as "cannot judge",
  // never as "everything is fine".
  if (!equipmentProfileId) {
    return { availableEquipment: buildAvailableEquipmentList([]), equipmentCounts: null };
  }

  try {
    const { getAllModels } = await import('../../models/index.mjs');
    const models = getAllModels();
    const profile = models.EquipmentProfile
      ? await models.EquipmentProfile.findByPk(equipmentProfileId, {
          attributes: ['id', 'trainerId', 'isActive'],
        })
      : null;

    assertProfileAccess(profile, { ...requester, requireActive: true });
    if (!models.EquipmentItem) {
      return { availableEquipment: buildAvailableEquipmentList([]), equipmentCounts: null };
    }

    const equipmentItems = await models.EquipmentItem.findAll({
      where: {
        profileId: equipmentProfileId,
        isActive: true,
        approvalStatus: { [Op.in]: ['approved', 'manual'] },
      },
      raw: true,
    });

    return {
      availableEquipment: buildAvailableEquipmentList(equipmentItems),
      equipmentCounts: buildEquipmentCountMap(equipmentItems),
    };
  } catch (eqErr) {
    if (isProfileAccessDenied(eqErr)) throw eqErr;
    const { default: logger } = await import('../../utils/logger.mjs');
    logger.warn('[BootcampGen] Equipment profile query failed, using Rolodex without equipment filter:', eqErr.message);
    return { availableEquipment: buildAvailableEquipmentList([]), equipmentCounts: null };
  }
}

function exerciseSearchText(exercise) {
  return [
    exercise.name,
    exercise.key,
    exercise.exerciseType,
    exercise.bodyPartCategory,
    ...(Array.isArray(exercise.muscles) ? exercise.muscles : [exercise.muscles]),
    ...(Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function scoreExerciseForIntensity(exercise, intensityCategory) {
  if (!intensityCategory) return 0;

  const text = exerciseSearchText(exercise);
  const difficulty = Number(exercise.difficulty ?? 500);
  const hasEquipment = !hasAny(text, ['bodyweight', 'none']) && hasAny(text, [
    'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bench',
  ]);

  switch (intensityCategory) {
    case 'high_impact':
      return (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo', 'hop', 'bound']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch', 'recovery']) ? -35 : 0)
        + Math.min(20, difficulty / 50);
    case 'medium_impact':
      return (hasAny(text, ['compound', 'squat', 'row', 'press', 'lunge', 'hinge']) ? 45 : 0)
        + (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo']) ? -40 : 0)
        + (difficulty >= 250 && difficulty <= 700 ? 15 : 0);
    case 'calisthenics':
      return (hasAny(text, ['bodyweight', 'push up', 'pull up', 'plank', 'squat', 'lunge']) ? 70 : 0)
        + (hasEquipment ? -35 : 0);
    case 'stability':
      return (hasAny(text, ['core', 'balance', 'stability', 'bosu', 'single', 'unilateral', 'plank']) ? 70 : 0)
        + (hasAny(text, ['jump', 'sprint']) ? -30 : 0);
    case 'flexibility':
      return (hasAny(text, ['stretch', 'mobility', 'flexibility', 'recovery', 'flow']) ? 80 : 0)
        + Math.max(0, 500 - difficulty) / 20;
    case 'cardio':
      return (hasAny(text, ['cardio', 'conditioning', 'jump', 'jack', 'sprint', 'burpee', 'climber']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch']) ? -35 : 0);
    default:
      return 0;
  }
}

export function rankExercisesForBootcamp(exercises, { intensityCategory } = {}) {
  if (!intensityCategory || !Array.isArray(exercises)) return exercises;

  return [...exercises]
    .map((exercise, index) => ({
      exercise,
      index,
      score: scoreExerciseForIntensity(exercise, intensityCategory),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.exercise);
}

// ── Main Generation Function ──────────────────────────────────────────

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(safe, min), max);
}

export function resolveBootcampStructure({
  classFormat = '4x4_r2',
  stationCount,
  exercisesPerStation,
  targetDuration = 50,
} = {}) {
  const baseFormat = FORMAT_CONFIG[classFormat] ?? FORMAT_CONFIG['4x4_r2'];
  const hasCustomStructure = classFormat === 'custom' || stationCount != null || exercisesPerStation != null;

  if (!hasCustomStructure) {
    let resolvedStationCount;
    if (classFormat === 'full_group') {
      resolvedStationCount = 0;
    } else if (baseFormat.fixedStations) {
      resolvedStationCount = baseFormat.fixedStations;
    } else {
      const exerciseTimeSec = baseFormat.exercisesPerStation * baseFormat.durationSec;
      const stationTimeSec = exerciseTimeSec + (baseFormat.exercisesPerStation - 1) * TRANSITION_TIME_SEC + STATION_TRANSITION_SEC;
      resolvedStationCount = Math.max(4, Math.min(10, Math.floor((targetDuration * 60) / stationTimeSec)));
    }
    return { classFormat, format: baseFormat, stationCount: resolvedStationCount };
  }

  const resolvedStationCount = clampInt(
    stationCount,
    baseFormat.fixedStations || 4,
    CUSTOM_STRUCTURE_LIMITS.minStations,
    CUSTOM_STRUCTURE_LIMITS.maxStations,
  );
  const resolvedExercisesPerStation = clampInt(
    exercisesPerStation,
    baseFormat.exercisesPerStation || 4,
    CUSTOM_STRUCTURE_LIMITS.minExercisesPerStation,
    CUSTOM_STRUCTURE_LIMITS.maxExercisesPerStation,
  );
  const rounds = baseFormat.rounds || 2;
  const totalSlots = resolvedStationCount * resolvedExercisesPerStation * rounds;
  const transitionSec = resolvedStationCount * Math.max(0, resolvedExercisesPerStation - 1) * rounds * TRANSITION_TIME_SEC;
  const stationTransitionSec = Math.max(0, resolvedStationCount - 1) * STATION_TRANSITION_SEC;
  const availableWorkSec = (targetDuration * 60) - transitionSec - stationTransitionSec;
  const durationSec = Math.max(20, Math.min(60, Math.round(availableWorkSec / Math.max(1, totalSlots))));

  return {
    classFormat: 'custom',
    stationCount: resolvedStationCount,
    format: {
      ...baseFormat,
      exercisesPerStation: resolvedExercisesPerStation,
      durationSec,
      fixedStations: resolvedStationCount,
      rounds,
    },
  };
}

export async function generateBootcampClass(options) {
  const {
    trainerId,
    requesterRole,
    classFormat: requestedClassFormat = '4x4_r2',
    stationCount: requestedStationCount,
    exercisesPerStation: requestedExercisesPerStation,
    classStyle = 'standard',
    dayType = 'full_body',
    intensityCategory,
    targetDuration = 50,
    expectedParticipants = 12,
    spaceProfileId,
    equipmentProfileId,
    name,
    includeStretch = true,
    stretchDurationMin = 3,
    exclusionKeys,
  } = options;

  const structure = resolveBootcampStructure({
    classFormat: requestedClassFormat,
    stationCount: requestedStationCount,
    exercisesPerStation: requestedExercisesPerStation,
    targetDuration,
  });
  let { classFormat, format, stationCount } = structure;

  // Declared early: the small-class collapse (Step 2b) already explains itself.
  const stations = [];
  const allExercises = [];
  const explanations = [];

  // Step 2: Load space profile constraints
  let spaceProfile = null;
  if (spaceProfileId) {
    const SpaceProfile = getBootcampSpaceProfile();
    spaceProfile = await SpaceProfile.findByPk(spaceProfileId, {
      attributes: ['id', 'trainerId', 'maxStations', 'maxPerStation'],
    });
    assertProfileAccess(spaceProfile, { trainerId, requesterRole });
    if (spaceProfile?.maxStations && stationCount > spaceProfile.maxStations) {
      stationCount = Math.max(CUSTOM_STRUCTURE_LIMITS.minStations, spaceProfile.maxStations);
      if (classFormat === 'custom') {
        format = { ...format, fixedStations: stationCount };
      }
    }
  }

  // Step 2b (SWA-105 Slice 1): small-class collapse. The real 6am class can be
  // 4 people; station math built for 12 yields empty stations and dead
  // transitions at 4. Applies AFTER the space-profile cap so the tighter of
  // the two wins, and is loud — silent overrides of a trainer's request are
  // how trust dies.
  const collapse = collapseStationCountForParticipants(stationCount, expectedParticipants);
  if (collapse.collapsed) {
    stationCount = collapse.stationCount;
    if (classFormat === 'custom') format = { ...format, fixedStations: stationCount };
    explanations.push({
      type: 'small_class',
      message: `Small class: ${expectedParticipants} participant(s) — collapsed to ${stationCount} `
        + 'station(s) so every station keeps at least a pair. Empty stations kill class energy.',
    });
  }

  // Step 3: Get recent class logs for freshness
  const recentExerciseNames = await getRecentExerciseNames(trainerId);

  // Step 4: Get exercises — use Rolodex bridge with equipment filtering if profile set
  const targetMuscles = DAY_TYPE_MUSCLES[dayType] ?? DAY_TYPE_MUSCLES.full_body;
  const combinedExclusions = new Set(recentExerciseNames);
  if (exclusionKeys instanceof Set) {
    exclusionKeys.forEach(k => combinedExclusions.add(k));
  }

  let availableExercises = [];
  let equipmentCounts = null;

  // Try Rolodex bridge first. Equipment profile narrows it; missing profile does not bypass it.
  try {
    const inventory = await getEquipmentInventoryForBootcamp(equipmentProfileId, {
      trainerId,
      requesterRole,
    });
    equipmentCounts = inventory.equipmentCounts;

    const { queryExercisesForBootcamp } = await import('./exerciseRolodexBridge.mjs');
    const rolodexResults = await queryExercisesForBootcamp({
      muscleGroups: targetMuscles,
      availableEquipment: inventory.availableEquipment,
      excludeNames: [...combinedExclusions],
      limit: 240,
    });

    if (rolodexResults.length > 0) {
      availableExercises = rolodexResults.map(ex => ({
        key: ex.key || ex.name?.toLowerCase().replace(/\s+/g, '_'),
        ...ex,
      }));
    }
  } catch (eqErr) {
    if (isProfileAccessDenied(eqErr)) throw eqErr;
    // Non-fatal - fall through to registry fallback
    const { default: logger } = await import('../../utils/logger.mjs');
    logger.warn('[BootcampGen] Rolodex query failed, using full registry:', eqErr.message);
  }

  // Fallback: use full exercise registry if Rolodex didn't produce results.
  // The old `.some(targetMuscles)` pre-filter is GONE on purpose: it was both
  // too loose (`core` is in every DAY_TYPE_MUSCLES list, so any core-tagged
  // exercise passed every day — SWA-105 D1) and too tight (a traps-primary row
  // isn't in the upper list at all). The day-type CONTRACT below is the gate.
  if (availableExercises.length === 0) {
    const registry = getExerciseRegistry();
    availableExercises = Object.entries(registry)
      .filter(([key]) => !combinedExclusions.has(key))
      .map(([key, ex]) => ({ key, ...ex }));
  }

  // Step 4a (SWA-105 Slice 1): the DAY-TYPE CONTRACT is the authoritative
  // legality gate — primary-region inclusion + explicit pattern exclusions
  // (shared/bootcamp-core), with a fail-open ladder so the class always
  // generates. Replaces the `.some()` muscle filter that could not fail.
  const requiredSlots = classFormat === 'full_group'
    ? 15
    : Math.max(1, stationCount * Math.max(1, format.exercisesPerStation ?? 3));
  const contract = applyDayTypeContract(availableExercises, dayType, requiredSlots);
  availableExercises = contract.pool;
  explanations.push({ type: 'day_type_contract', message: contract.explanation });

  if (intensityCategory) {
    availableExercises = rankExercisesForBootcamp(availableExercises, { intensityCategory });
    explanations.push({
      type: 'intensity',
      message: `Intensity category applied: ${intensityCategory.replace(/_/g, ' ')} prioritized the exercise pool before station assignment.`,
    });
  }

  // Step 4b: Quality gate — general classes stay low-impact by default.
  // High-impact plyo (jumps/hops/burpee-class moves) only enters stations
  // when the trainer explicitly asks for cardio or high-impact intensity.
  // Fail-open: the gate never empties the pool.
  const explicitHighImpactClass = intensityCategory === 'high_impact'
    || intensityCategory === 'cardio'
    || dayType === 'cardio';
  if (!explicitHighImpactClass) {
    const gateResult = applyExerciseQualityGate(availableExercises, { nasmPhase: 2 });
    if (gateResult.rejected.length > 0) {
      availableExercises = gateResult.allowed;
      explanations.push({
        type: 'quality_gate',
        message: `${gateResult.rejected.length} high-impact exercise(s) excluded from this low-impact class. Choose the cardio day type or high-impact intensity to include them.`,
      });
    }
  }

  // Step 5: Build stations or full-group workout
  if (classFormat === 'full_group') {
    buildFullGroupWorkout(availableExercises, format, allExercises, explanations);
  } else {
    buildStationWorkout(
      availableExercises, targetMuscles, stationCount, format, recentExerciseNames,
      stations, allExercises, explanations,
      undefined, // rng default
      { dayTypeId: dayType, totalSlots: requiredSlots },
    );
  }

  // Step 5b (SWA-105 Slice 1): equipment feasibility on REAL quantities.
  // A station is only viable if the room has enough implements for the people
  // standing at it — presence was never enough (§5.8). Warning, not a block.
  const feasibilityFindings = assessEquipmentFeasibility({
    stations, equipmentCounts, expectedParticipants, stationCount,
  });
  if (feasibilityFindings.length > 0) {
    explanations.push({
      type: 'equipment_feasibility',
      message: `Equipment may bottleneck: ${feasibilityFindings.join('; ')}. `
        + 'Stagger starts at those stations or swap to a higher-count implement.',
    });
  }

  // Step 6: Calculate timing
  const totalExerciseTime = allExercises.reduce((sum, ex) => sum + ex.durationSec + ex.restSec, 0);
  const totalStationTransitions = Math.max(0, stationCount - 1) * STATION_TRANSITION_SEC;
  const totalWorkoutSec = totalExerciseTime + totalStationTransitions;
  const totalWorkoutMin = Math.round(totalWorkoutSec / 60);

  // Step 7: Generate overflow plan
  const maxPerStation = spaceProfile?.maxPerStation ?? 4;
  let overflowPlan = null;
  if (stationCount > 0 && expectedParticipants > maxPerStation * stationCount) {
    const lapDuration = Math.ceil(totalWorkoutSec / stationCount / 60);
    overflowPlan = {
      triggerCount: maxPerStation * stationCount,
      strategy: 'lap_rotation',
      lapExercises: LAP_EXERCISES.slice(0, Math.ceil(lapDuration)),
      lapDurationMin: Math.max(3, Math.min(5, lapDuration)),
    };
    explanations.push({
      type: 'overflow',
      message: `Overflow plan activated: ${expectedParticipants} participants exceeds ${maxPerStation * stationCount} capacity. Lap rotation with Group A/B split.`,
    });
  }

  // Step 8: Flow optimization — interleave fast/slow setup exercises
  const flowData = optimizeStationFlow(stations, allExercises, explanations);

  // Step 9: Generate alternative boards for joint-friendly and low-impact paths.
  const board2Exercises = generateBoard2(allExercises);
  const allWithBoard2 = [...allExercises, ...board2Exercises];

  if (board2Exercises.length > 0) {
    const jointFriendlyCount = board2Exercises.filter(ex => ex.board === 'alternative').length;
    const lowImpactCount = board2Exercises.filter(ex => ex.board === 'lowImpact').length;
    explanations.push({
      type: 'board',
      message: `Alternative boards generated: Board 2 has ${jointFriendlyCount} joint-friendly modifications and Board 3 has ${lowImpactCount} low-impact swaps.`,
    });
  }

  // Step 9b (Cortex P0 §5.5): pain-aware GATING across the trainer's
  // active-client roster — repairs the dead `status: 'active'` query (Rule 58
  // drift: ClientPainEntry has `isActive`) and the wrong createdById roster
  // semantics, and swaps severe-pain Board-1 exercises to joint-friendly
  // alternatives instead of only decorating. See painAwareGating.mjs.
  const painAlerts = await applyPainAwareGating({ trainerId, allExercises, explanations });

  // Step 10: Apply class style modifications
  applyClassStyle(classStyle, allExercises, explanations);

  // Step 11: Generate warm-up stretches
  const stretches = includeStretch ? generateStretches(dayType, stretchDurationMin) : [];

  const templateName = name ?? `${dayType.replace(/_/g, ' ')} ${classFormat.replace(/_/g, ' ')} — ${new Date().toLocaleDateString()}`;
  const stretchTime = includeStretch ? stretchDurationMin : 0;

  return {
    name: templateName,
    classFormat, classStyle, dayType, intensityCategory,
    stationCount, targetDuration,
    exercisesPerStation: format.exercisesPerStation ?? undefined,
    rounds: format.rounds ?? undefined,
    exerciseDurationSec: format.durationSec ?? undefined,
    totalWorkoutMin,
    demoDuration: 5,
    clearDuration: 5,
    stretchDurationMin: stretchTime,
    totalClassMin: totalWorkoutMin + 10 + stretchTime,
    expectedParticipants,
    includeStretch,
    stations,
    exercises: allWithBoard2,
    stretches,
    overflowPlan,
    flowData,
    painAlerts,
    explanations,
    aiGenerated: true,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

async function getRecentExerciseNames(trainerId) {
  const ClassLog = getBootcampClassLog();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentLogs = await ClassLog.findAll({
    where: { trainerId, classDate: { [Op.gte]: twoWeeksAgo } },
    order: [['classDate', 'DESC']],
    limit: 10,
  }).catch(() => []);

  const names = new Set();
  for (const log of recentLogs) {
    if (log.exercisesUsed && Array.isArray(log.exercisesUsed)) {
      for (const ex of log.exercisesUsed) {
        names.add(ex.exerciseName ?? ex.name ?? ex);
      }
    }
  }
  return names;
}

function buildFullGroupWorkout(available, format, allExercises, explanations, rng = Math.random) {
  const selected = selectFullGroupExercises(available, rng);
  for (let i = 0; i < selected.length; i++) {
    allExercises.push(buildExerciseRecord(selected[i], {
      durationSec: format.durationSec,
      sortOrder: i + 1,
      isCardioFinisher: selected[i].isCardio ?? false,
    }));
  }
  explanations.push({
    type: 'format',
    message: `Full group workout: ${selected.length} exercises x 2 rounds, ${format.durationSec}s each`,
  });
}

function buildStationWorkout(available, targetMuscles, stationCount, format, usedNames, stations, allExercises, explanations, rng = Math.random, contractCtx = null) {
  const muscleGroups = distributeMuscleGroups(targetMuscles, stationCount);
  // Random offset so the finisher rotation also varies press-to-press.
  const finisherOffset = Math.floor(rng() * CARDIO_FINISHERS.length);
  // Class-level region tracking for the volume budget (SWA-105 Slice 1).
  const selectedMovements = [];

  for (let s = 0; s < stationCount; s++) {
    const stationMuscles = muscleGroups[s];
    const fallbackGate = contractCtx
      ? budgetGate(contractCtx.dayTypeId, selectedMovements, contractCtx.totalSlots)
      : null;
    const stationExes = selectStationExercises(available, stationMuscles, format.exercisesPerStation, usedNames, rng, fallbackGate);
    for (const ex of stationExes) {
      if (ex.coreMovement) selectedMovements.push(ex.coreMovement);
    }

    // Raw lowercase tokens power the quantity feasibility check; the display
    // string stays formatted exactly as before.
    const rawEquipment = stationExes
      .flatMap(e => Array.isArray(e.equipment) ? e.equipment : (e.equipment ? [e.equipment] : []))
      .map(t => String(t).trim().toLowerCase())
      .filter((v, i, a) => v && a.indexOf(v) === i);

    stations.push({
      stationNumber: s + 1,
      stationName: `Station ${s + 1}: ${formatExerciseName(stationMuscles[0] ?? 'mixed')}`,
      equipmentNeeded: rawEquipment.map(eq => formatExerciseName(eq)).join(', ') || 'Bodyweight',
      equipmentTokens: rawEquipment,
      setupTimeSec: 0,
      sortOrder: s + 1,
    });

    for (let e = 0; e < stationExes.length; e++) {
      allExercises.push(buildExerciseRecord(stationExes[e], {
        stationIndex: s,
        durationSec: format.durationSec,
        sortOrder: e + 1,
      }));
      usedNames.add(stationExes[e].key);
    }

    const finisher = CARDIO_FINISHERS[(s + finisherOffset) % CARDIO_FINISHERS.length];
    allExercises.push(buildExerciseRecord(finisher, {
      stationIndex: s,
      durationSec: format.durationSec,
      restSec: 0,
      sortOrder: stationExes.length + 1,
      isCardioFinisher: true,
    }));
  }

  explanations.push({
    type: 'format',
    message: `${stationCount} stations, ${format.exercisesPerStation} exercises each, ${format.durationSec}s per exercise`,
  });
}

// Style modifiers imported from ./classStyleModifiers.mjs
// Flow optimization imported from ./flowOptimizer.mjs

export const __testing__ = {
  buildAvailableEquipmentList,
  buildExerciseRecord,
  normalizeExerciseLibraryId,
  rankExercisesForBootcamp,
  resolveBootcampStructure,
  sampleFromWindow,
  selectFullGroupExercises,
  selectStationExercises,
};
