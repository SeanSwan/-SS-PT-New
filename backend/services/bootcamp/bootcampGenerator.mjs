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
import { applyPainAwareGating, severePainReviewRequired, collectPainSwaps } from './painAwareGating.mjs';
import { applyDayTypeContract, budgetGate } from './dayTypeContract.mjs';
import { pickFinishers } from './bootcampFinishers.mjs';
import { orderPoolWithBrain } from './bootcampBrain.mjs';
import { canonicalizeMuscle, normalizeMuscleList } from './bootcampTaxonomy.mjs';
import {
  estimateClassWorkoutSeconds,
  poolSlotsForClass,
  prescribedWorkSec,
  rankExercisesForBootcamp,
  resolveBootcampStructure,
  scoreExerciseForIntensity,
} from './bootcampGenerator.pure.mjs';
// Back-compat re-export: existing importers keep working (Fable D-10 lineage).
export { estimateClassWorkoutSeconds, poolSlotsForClass, prescribedWorkSec, rankExercisesForBootcamp, resolveBootcampStructure };
import {
  buildAvailableEquipmentList, buildEquipmentCountMap,
  collapseStationCountForParticipants, assessEquipmentFeasibility,
} from './bootcampCapacity.mjs';
import { chipsForExercise } from './bootcampChips.mjs';
import { summarizeRelaxations } from '../../../shared/bootcamp-core/relaxation.mjs';
import { matchesEquipmentRequirements } from '../exerciseConstraintContract.mjs';

// Preserved named-export surface after the move to bootcampCapacity.mjs.
export { buildAvailableEquipmentList };

const PROFILE_ACCESS_DENIED_CODE = 'BOOTCAMP_PROFILE_ACCESS_DENIED';
const PROFILE_UNAVAILABLE_CODE = 'BOOTCAMP_PROFILE_UNAVAILABLE';

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

function isUsedExercise(exercise, usedNames) {
  return usedNames.has(exercise.key) || usedNames.has(exercise.name);
}

const STATION_PATTERN_PREFERENCES = Object.freeze({
  quadriceps: ['squat', 'lunge'],
  hamstrings: ['hinge', 'lunge'],
  glutes: ['hinge', 'squat', 'lunge'],
  pectorals: ['push'],
  latissimus_dorsi: ['pull'],
  anterior_deltoid: ['push'],
  biceps: ['pull'],
  triceps: ['push'],
  core: ['core'],
});

function stationProgrammingQuality(exercise, targetMuscle) {
  let score = 0;
  const preferredPatterns = STATION_PATTERN_PREFERENCES[targetMuscle];
  if (exercise.exerciseType === 'compound') score += 40;
  if (['squat', 'hinge', 'lunge', 'push', 'pull'].includes(exercise.category)) score += 25;
  if (preferredPatterns?.includes(exercise.category)) score += 45;
  else if (preferredPatterns && exercise.category) score -= 20;
  if (Array.isArray(exercise.equipment) && exercise.equipment.some((item) => !['bodyweight', 'none'].includes(String(item).toLowerCase()))) score += 15;
  if (exercise.exerciseType === 'stability' || exercise.exerciseType === 'core') score += 8;
  if (exercise.exerciseType === 'flexibility' || exercise.bodyPartCategory === 'recovery') score -= 80;
  if (exercise.bodyPartCategory === 'cardio' && exercise.exerciseType !== 'compound') score -= 25;
  return score;
}

function rankStationTier(exercises, targetMuscle) {
  return [...exercises].sort((a, b) => stationProgrammingQuality(b, targetMuscle) - stationProgrammingQuality(a, targetMuscle));
}

function selectStationExercises(available, stationMuscles, count, usedNames, rng = Math.random, fallbackGate = null) {
  const targets = normalizeMuscleList(stationMuscles);
  const primaryMuscle = targets[0];
  if (!primaryMuscle || count <= 0) return [];

  const eligible = available.filter((exercise) => !isUsedExercise(exercise, usedNames));
  const primaryMatches = rankStationTier(eligible.filter((exercise) => {
    const muscles = normalizeMuscleList(exercise.muscles);
    const primary = canonicalizeMuscle(exercise.primaryMuscle) || muscles[0];
    return primary === primaryMuscle;
  }), primaryMuscle);
  const secondaryMatches = rankStationTier(eligible.filter((exercise) => {
    const muscles = normalizeMuscleList(exercise.muscles);
    const primary = canonicalizeMuscle(exercise.primaryMuscle) || muscles[0];
    return primary !== primaryMuscle && muscles.includes(primaryMuscle);
  }), primaryMuscle);

  const selected = [];
  const tiers = [
    ['primary', primaryMatches, count],
    ['secondary', secondaryMatches, 1],
  ];
  for (const [tierName, tier, tierLimit] of tiers) {
    if (selected.length >= count || (tierName === 'secondary' && selected.length === 0)) break;
    let candidates = tier.filter((exercise) => !selected.some((pick) => pick.key === exercise.key));
    if (fallbackGate) {
      const budgeted = candidates.filter(fallbackGate);
      if (budgeted.length > 0) candidates = budgeted;
    }
    const take = Math.min(tierLimit, count - selected.length);
    const picks = sampleFromWindow(candidates, take, rng);
    selected.push(...picks.map((exercise) => ({
      ...exercise,
      selectionReason: tierName === 'primary'
        ? `Primary ${primaryMuscle.replace(/_/g, ' ')} match; quality-ranked for this station.`
        : `One strong secondary ${primaryMuscle.replace(/_/g, ' ')} match; station remains primary-target dominant.`,
      selectionTier: tierName,
      programmingQuality: stationProgrammingQuality(exercise, primaryMuscle),
    })));
  }

  return selected;
}
function selectFullGroupExercises(available, rng = Math.random, usedNames = new Set(), contractCtx = null) {
  const eligible = available.filter((exercise) => !isUsedExercise(exercise, usedNames));

  // RECONCILED (merge of 0f447562b + slice 3): main's shape — taxonomy-
  // normalized cardio, usedNames exclusions, sampled tiers — carrying my D3
  // layers: ONE budget ledger spanning compound AND accessory (a per-tier
  // ledger lets a capped region re-enter in tier two), and a day-aware cardio
  // five instead of the array head.
  const ledger = [];
  const budgeted = (pool) => {
    if (!contractCtx) return pool;
    const kept = [];
    const provisional = [...ledger];
    const liveGate = budgetGate(contractCtx.dayTypeId, provisional, 15);
    for (const ex of pool) {
      if (liveGate(ex)) {
        kept.push(ex);
        if (ex.coreMovement) provisional.push(ex.coreMovement);
      }
    }
    return kept.length > 0 ? kept : pool; // budget prefers, never starves
  };
  const commitPicks = (picks) => {
    for (const ex of picks) if (ex.coreMovement) ledger.push(ex.coreMovement);
  };

  const compound = sampleFromWindow(
    budgeted(eligible.filter(ex => (ex.muscles ?? []).length >= 2)),
    6,
    rng,
  );
  commitPicks(compound);

  const cardioSource = contractCtx
    ? pickFinishers({
        dayTypeId: contractCtx.dayTypeId,
        count: 3,
        highImpactAllowed: contractCtx.highImpactAllowed ?? false,
        rng,
      }).finishers
    : CARDIO_FINISHERS;
  const cardioPool = cardioSource.map(cf => ({
    ...cf,
    key: cf.name.toLowerCase().replace(/\s+/g, '_'),
    muscles: normalizeMuscleList(cf.muscles),
    isCardio: true,
  })).filter((exercise) => !isUsedExercise(exercise, usedNames));
  const cardio = contractCtx ? cardioPool.slice(0, 3) : sampleFromWindow(cardioPool, 3, rng);

  const usedKeys = new Set([...compound.map(e => e.key), ...cardio.map(e => e.key)]);
  const accessory = sampleFromWindow(
    budgeted(eligible.filter(ex => !usedKeys.has(ex.key) && (ex.muscles ?? []).length <= 2)),
    6,
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

  // SWA-105 Slice 2: the selection explains itself in structured facts, never
  // prose. `selectionRung` is stamped by the day-type ladder; anything the
  // ladder did not touch is R0 and simply carries no relaxation chip.
  const selectionRung = ex.selectionRung ?? 'R0';
  const selectionChips = chipsForExercise(ex, { setupTimeSec: setupTime });

  return {
    exerciseKey: ex.key ?? null,
    selectionRung,
    selectionChips,
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
    selectionReason: ex.selectionReason ?? null,
    programmingQuality: ex.programmingQuality ?? null,
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
      const error = new Error('Equipment profile inventory is unavailable');
      error.statusCode = 503;
      error.code = PROFILE_UNAVAILABLE_CODE;
      throw error;
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
    if (isProfileAccessDenied(eqErr) || eqErr?.code === PROFILE_UNAVAILABLE_CODE) throw eqErr;
    const { default: logger } = await import('../../utils/logger.mjs');
    logger.error('[BootcampGen] Equipment profile query failed; generation is blocked closed:', eqErr.message);
    const error = new Error('Equipment profile could not be loaded');
    error.statusCode = 503;
    error.code = PROFILE_UNAVAILABLE_CODE;
    throw error;
  }
}





// ── Main Generation Function ──────────────────────────────────────────



// F04: the sprint week prescription (deload 0.7 … validated overload 1.5)
// scales per-exercise WORK seconds. Rest, stations and structure are untouched:
// a deload week is less work per interval, not fewer stations or longer rests.
// UNIT CONTRACT: `durationSec`/return are SECONDS (validated ≥10; clamped 10–120).
// Normalized to [0.5, 2] and the scaled interval clamped to [10, 120] so a bad
// row can neither erase nor explode the class.
/**
 * D1: how many pool picks the class will ACTUALLY make. Mirrors
 * buildStationWorkout: finishers (and their -1 reserve) exist only on
 * explicit cardio/high-impact classes; full-group draws 10 from the pool.
 */

/**
 * D2 (hive arithmetic probe): the built exercise list holds each movement
 * ONCE, but a `rounds`-round class performs every movement `rounds` times —
 * and resolveBootcampStructure already divided per-slot durationSec by the
 * rounds-inclusive totalSlots. Timing must multiply the list back.
 */


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
    prescriptionIntensity,
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

  // Step 1.5 (F04): apply the sprint week prescription to per-exercise work.
  // One seam — every downstream durationSec read (full group, stations,
  // finishers, the persisted exerciseDurationSec echo) inherits the scaled value.
  const baseWorkSec = format.durationSec;
  const prescribedSec = prescribedWorkSec(baseWorkSec, prescriptionIntensity);
  if (Number.isFinite(prescribedSec) && prescribedSec !== baseWorkSec) {
    format = { ...format, durationSec: prescribedSec };
    explanations.push({
      type: 'prescription',
      message: `Week prescription applied: work intervals scaled to `
        + `${Math.round((prescribedSec / baseWorkSec) * 100)}% (${prescribedSec}s per exercise).`,
    });
  }

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
  let availableEquipment = ['bodyweight', 'none'];

  // Try Rolodex bridge first. Equipment profile narrows it; missing profile does not bypass it.
  try {
    const inventory = await getEquipmentInventoryForBootcamp(equipmentProfileId, {
      trainerId,
      requesterRole,
    });
    equipmentCounts = inventory.equipmentCounts;
    availableEquipment = inventory.availableEquipment;

    const { queryExercisesForBootcamp } = await import('./exerciseRolodexBridge.mjs');
    const rolodexResults = await queryExercisesForBootcamp({
      muscleGroups: targetMuscles,
      availableEquipment,
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
    if (isProfileAccessDenied(eqErr) || eqErr?.code === PROFILE_UNAVAILABLE_CODE) throw eqErr;
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

  // The SQL bridge uses an intentionally broad text prefilter. Re-apply the
  // shared source-aware contract after both SQL and registry fallback so a
  // selected profile cannot admit a bench-only or barbell-only movement by
  // matching just one item from a multi-implement requirement.
  if (equipmentProfileId) {
    availableExercises = availableExercises.filter((exercise) => (
      matchesEquipmentRequirements(exercise, availableEquipment)
    ));
  }

  // Step 4a (SWA-105 Slice 1): the DAY-TYPE CONTRACT is the authoritative
  // legality gate — primary-region inclusion + explicit pattern exclusions
  // (shared/bootcamp-core). Replaces the `.some()` muscle filter that could not
  // fail. Slice 2 replaced slice 1's fail-open tail with the named relaxation
  // ladder: R0 -> R3 (pattern fidelity) -> R5 (bodyweight top-up) -> R6. The
  // class still always generates, but it can no longer generate a WRONG one —
  // the old tail returned the unfiltered pool and put squats back on upper day.
  // SWA-105 Slice 2: this must match what selection ACTUALLY consumes from the
  // pool, or the ladder relaxes against a phantom need. D1 (hive probe): the
  // -1 finisher reserve applies ONLY on explicit cardio/high-impact classes
  // (buildStationWorkout gates finishers on allowHighImpactFinishers); a
  // normal class consumes the FULL exercisesPerStation from the pool.
  const plannedPoolSlots = poolSlotsForClass(
    classFormat, stationCount, format.exercisesPerStation ?? 4, explicitHighImpactClass,
  );
  const contract = applyDayTypeContract(availableExercises, dayType, plannedPoolSlots);
  availableExercises = contract.pool;
  explanations.push({ type: 'day_type_contract', message: contract.explanation });

  // Step 4a-ii (SWA-105 Slice 2): pool exhaustion is a fact about the POOL, so
  // it is reported here, at the pool. Whether the shipped class actually used a
  // relaxed exercise is a different question, answered after selection (Step 9c)
  // — a widened pool whose widening went unused must not raise an alarm.
  if (contract.exhausted) {
    explanations.push({
      type: 'relaxation',
      message: `Exercise pool exhausted at ${contract.rung}: only ${contract.pool.length} of the `
        + `${requiredSlots} slots this class needs could be sourced. `
        + `${contract.structuralOuts.map((out) => out.label).join(' or ')}.`,
    });
  }

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

  // Step 4c (SWA-105 Slice 4): Layer 2 — JUDGMENT over the legal pool. The
  // brain orders and subsets; it can never introduce (its output is validated
  // as a subset of pool keys and discarded wholesale otherwise). LLM only when
  // SWAN_BOOTCAMP_BRAIN=llm with a provider module; every failure falls back
  // to the deterministic heuristic WITH a recorded reason — an uninstrumented
  // fallback is how a brain stays down for three weeks unnoticed.
  const brainResult = await orderPoolWithBrain({
    pool: availableExercises,
    dayTypeId: dayType,
    recentKeys: new Set(recentExerciseNames),
    headcount: expectedParticipants,
    mode: equipmentProfileId ? 'strict' : 'open_gym',
    completionFn: await resolveBrainProvider(),
  });
  availableExercises = brainResult.pool;
  if (brainResult.brainUsed === 'llm') {
    explanations.push({
      type: 'brain',
      message: 'Swan Coach ordered this class (fatigue sequencing, freshness, setup flow).'
        + (brainResult.declaredAssumptions.length > 0
          ? ` Assumptions: ${brainResult.declaredAssumptions.join(' | ')}`
          : ''),
    });
  } else if (brainResult.fallbackReason) {
    explanations.push({
      type: 'brain_fallback',
      message: `Generated with the deterministic engine (coach brain unavailable: ${brainResult.fallbackReason.replace(/_/g, ' ')}).`,
    });
  }

  // Step 5: Build stations or full-group workout
  const contractCtx = {
    dayTypeId: dayType,
    totalSlots: plannedPoolSlots,
    highImpactAllowed: explicitHighImpactClass,
  };
  if (classFormat === 'full_group') {
    buildFullGroupWorkout(availableExercises, format, allExercises, explanations, combinedExclusions, undefined, contractCtx);
  } else {
    buildStationWorkout(
      availableExercises, targetMuscles, stationCount, format, combinedExclusions,
      stations, allExercises, explanations,
      undefined, // rng default
      { dayTypeId: dayType, totalSlots: plannedPoolSlots, allowHighImpactFinishers: explicitHighImpactClass },
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
  // D2: multiply by rounds — the built list holds each movement once, but a
  // rounds-round class performs every movement rounds times, and the
  // per-slot durationSec was already divided by the rounds-inclusive count.
  const totalWorkoutSec = estimateClassWorkoutSeconds(
    allExercises, format.rounds ?? 1, stationCount, STATION_TRANSITION_SEC,
  );
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
  // U5: gating is pure — the caller applies the gated clones + explanations.
  const gate = await applyPainAwareGating({ trainerId, allExercises, explanations });
  gate.explanations.forEach(e => explanations.push(e));
  allExercises.length = 0;
  allExercises.push(...gate.exercises);
  const painAlerts = gate.painAlerts;
  if (severePainReviewRequired(painAlerts)) {
    throw Object.assign(new Error('Severe pain constraints require verified alternatives and trainer review'), {
      code: 'BOOTCAMP_PAIN_REVIEW_REQUIRED', statusCode: 422,
    });
  }

  // Step 10: Apply class style modifications
  applyClassStyle(classStyle, allExercises, explanations);

  // Step 11: Generate warm-up stretches
  const stretches = includeStretch ? generateStretches(dayType, stretchDurationMin) : [];

  const templateName = name ?? `${dayType.replace(/_/g, ' ')} ${classFormat.replace(/_/g, ' ')} — ${new Date().toLocaleDateString()}`;
  const stretchTime = includeStretch ? stretchDurationMin : 0;

  // Step 9c (SWA-105 Slice 2): derived from the FINAL Board-1 selections, never
  // stored alongside them. A stored summary can disagree with the slots it
  // summarizes, and "nothing was relaxed" printed over three relaxed rows is
  // precisely the fabricated justification the structured-chip rule prevents.
  //
  // This — not the pool rung — is what the trainer is warned about. A pool that
  // widened to R5 and then never used a substitute produced no relaxed rows, so
  // it raises nothing. The alarm fires on what shipped, not on what was
  // considered.
  const relaxationSummary = summarizeRelaxations(
    allExercises.map((ex) => ({ rung: ex.selectionRung })),
  );
  if (relaxationSummary.relaxedSlots > 0) {
    explanations.push({
      type: 'relaxation',
      message: `${relaxationSummary.relaxedSlots} exercise(s) in this class needed a relaxed rule `
        + `(${relaxationSummary.constraints.join(', ')}; deepest ${relaxationSummary.deepest}). `
        + 'Those rows are marked individually — review them before class.',
    });
  }

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
    // H02: echo the profiles this class was actually generated against. Without
    // them the saved template stored NULL for both columns and reload lost the
    // equipment/space provenance entirely; bootcampCrud's profile-authority
    // check also short-circuits on a null id, so it could never run on the
    // real generate -> save path.
    equipmentProfileId: equipmentProfileId ?? null,
    spaceProfileId: spaceProfileId ?? null,
    // U1: the coach-facing swap ledger — which movements replaced which, and
    // why, so a live class can be narrated without reading explanations JSON.
    painSwaps: collectPainSwaps(allExercises),
    stations,
    exercises: allWithBoard2,
    stretches,
    overflowPlan,
    flowData,
    painAlerts,
    explanations,
    relaxationSummary,
    // Provenance truth (Rule 75): aiGenerated was hardcoded `true` while
    // nothing AI ran. It now reports what actually happened, with the
    // fallback reason preserved for instrumentation.
    aiGenerated: brainResult.brainUsed === 'llm',
    brainUsed: brainResult.brainUsed,
    brainFallbackReason: brainResult.fallbackReason,
    declaredAssumptions: brainResult.declaredAssumptions,
  };
}

/**
 * Resolve the LLM completion function. Deliberately decoupled from any chat
 * service: SWAN_BOOTCAMP_BRAIN_PROVIDER_MODULE names an ES module whose
 * default export is `async (prompt) => string`. Absent/broken -> null, and
 * the brain records fallbackReason 'no_provider'. This is the ONE integration
 * point a future provider wires into.
 */
async function resolveBrainProvider() {
  if (process.env.SWAN_BOOTCAMP_BRAIN !== 'llm') return null;
  const moduleId = process.env.SWAN_BOOTCAMP_BRAIN_PROVIDER_MODULE;
  if (!moduleId) return null;
  try {
    const mod = await import(moduleId);
    return typeof mod.default === 'function' ? mod.default : null;
  } catch {
    return null;
  }
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

function buildFullGroupWorkout(available, format, allExercises, explanations, usedNames, rng = Math.random, contractCtx = null) {
  const selected = selectFullGroupExercises(available, rng, usedNames, contractCtx);
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

function chooseStationFinisher(stationMuscles, usedNames, rng) {
  const target = canonicalizeMuscle(stationMuscles[0]);
  if (!target) return null;
  const candidates = CARDIO_FINISHERS.map((finisher) => {
    const muscles = normalizeMuscleList(finisher.muscles);
    return {
      ...finisher,
      key: finisher.name.toLowerCase().replace(/\s+/g, '_'),
      muscles,
      primaryMuscle: muscles[0] ?? null,
      selectionReason: `Station-aligned conditioning finisher for ${target.replace(/_/g, ' ')}.`,
    };
  }).filter((finisher) => finisher.primaryMuscle === target && !isUsedExercise(finisher, usedNames));
  return sampleFromWindow(candidates, 1, rng)[0] ?? null;
}

function buildStationWorkout(available, targetMuscles, stationCount, format, usedNames, stations, allExercises, explanations, rng = Math.random, contractCtx = null) {
  const muscleGroups = distributeMuscleGroups(targetMuscles, stationCount);
  const selectedMovements = [];

  for (let s = 0; s < stationCount; s++) {
    const stationMuscles = muscleGroups[s];
    const finisher = contractCtx?.allowHighImpactFinishers
      ? chooseStationFinisher(stationMuscles, usedNames, rng)
      : null;
    const mainSlots = Math.max(1, format.exercisesPerStation - (finisher ? 1 : 0));
    const stationExclusions = new Set(usedNames);
    if (finisher) {
      stationExclusions.add(finisher.key);
      stationExclusions.add(finisher.name);
    }
    const fallbackGate = contractCtx
      ? budgetGate(contractCtx.dayTypeId, selectedMovements, contractCtx.totalSlots)
      : null;
    const stationExes = selectStationExercises(available, stationMuscles, mainSlots, stationExclusions, rng, fallbackGate);
    for (const ex of stationExes) {
      if (ex.coreMovement) selectedMovements.push(ex.coreMovement);
    }

    const rawEquipment = stationExes
      .flatMap(e => Array.isArray(e.equipment) ? e.equipment : (e.equipment ? [e.equipment] : []))
      .map(t => String(t).trim().toLowerCase())
      .filter((v, i, a) => v && a.indexOf(v) === i);
    const coverageStatus = stationExes.length < mainSlots ? 'weak' : 'strong';
    const coverageMessage = coverageStatus === 'weak'
      ? `Only ${stationExes.length} of ${mainSlots} qualified ${stationMuscles[0]} movements were available; unrelated exercises were not inserted.`
      : `${stationExes.length} qualified ${stationMuscles[0]} movements selected without unrelated fallback.`;

    stations.push({
      stationNumber: s + 1,
      stationName: `Station ${s + 1}: ${formatExerciseName(stationMuscles[0] ?? 'mixed')}`,
      equipmentNeeded: rawEquipment.map(eq => formatExerciseName(eq)).join(', ') || 'Bodyweight',
      equipmentTokens: rawEquipment,
      setupTimeSec: 0,
      sortOrder: s + 1,
      coverageStatus,
      coverageMessage,
    });

    for (let e = 0; e < stationExes.length; e++) {
      allExercises.push(buildExerciseRecord(stationExes[e], {
        stationIndex: s,
        durationSec: format.durationSec,
        sortOrder: e + 1,
      }));
      usedNames.add(stationExes[e].key);
      usedNames.add(stationExes[e].name);
    }

    if (finisher) {
      allExercises.push(buildExerciseRecord(finisher, {
        stationIndex: s,
        durationSec: format.durationSec,
        restSec: 0,
        sortOrder: stationExes.length + 1,
        isCardioFinisher: true,
      }));
      usedNames.add(finisher.key);
      usedNames.add(finisher.name);
    }
  }

  explanations.push({
    type: 'format',
    message: `${stationCount} stations, up to ${format.exercisesPerStation} qualified exercises each, ${format.durationSec}s per exercise. Station finishers are target-aligned and only used for explicit high-impact/cardio classes.`,
  });
}
// Style modifiers imported from ./classStyleModifiers.mjs
// Flow optimization imported from ./flowOptimizer.mjs

export const __testing__ = {
  buildAvailableEquipmentList,
  buildExerciseRecord,
  buildStationWorkout,
  normalizeExerciseLibraryId,
  estimateClassWorkoutSeconds,
  poolSlotsForClass,
  prescribedWorkSec,
  rankExercisesForBootcamp,
  resolveBootcampStructure,
  sampleFromWindow,
  selectFullGroupExercises,
  selectStationExercises,
};
