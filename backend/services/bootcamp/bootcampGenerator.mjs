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
  getClientPainEntry,
} from '../../models/index.mjs';
import { getExerciseRegistry } from '../variationEngine.mjs';
import { Op } from 'sequelize';
import {
  FORMAT_CONFIG, TRANSITION_TIME_SEC, STATION_TRANSITION_SEC,
  DAY_TYPE_MUSCLES, CARDIO_FINISHERS, LAP_EXERCISES,
  formatExerciseName, distributeMuscleGroups,
} from './bootcampConstants.mjs';
import { estimateSetupTime } from './exerciseRolodexBridge.mjs';
import { optimizeStationFlow } from './flowOptimizer.mjs';
import {
  generateBoard2, applyPyramidStyle, applySupersetStyle, generateStretches,
} from './classStyleModifiers.mjs';

// ── Exercise Selection Algorithms ─────────────────────────────────────

function selectStationExercises(available, stationMuscles, count, usedNames) {
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

  const matching = [...primaryMatches, ...secondaryMatches, ...tertiaryMatches];
  const needed = Math.max(1, count - 1);

  if (matching.length >= needed) return matching.slice(0, needed);

  const selected = [...matching];
  const remainingPool = available
    .filter(ex => !usedNames.has(ex.key) && !selected.some(s => s.key === ex.key));

  for (const ex of remainingPool) {
    if (selected.length >= needed) break;
    selected.push(ex);
  }

  return selected;
}

function selectFullGroupExercises(available) {
  const compound = available
    .filter(ex => (ex.muscles ?? []).length >= 2)
    .slice(0, 5);

  const cardio = CARDIO_FINISHERS.slice(0, 5).map(cf => ({
    ...cf,
    key: cf.name.toLowerCase().replace(/\s+/g, '_'),
    muscles: cf.muscles.split(','),
    isCardio: true,
  }));

  const usedKeys = new Set([...compound.map(e => e.key), ...cardio.map(e => e.key)]);
  const accessory = available
    .filter(ex => !usedKeys.has(ex.key) && (ex.muscles ?? []).length <= 2)
    .slice(0, 5);

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

  return {
    stationIndex: opts.stationIndex ?? undefined,
    exerciseName: ex.name ?? formatExerciseName(ex.key),
    durationSec: opts.durationSec,
    restSec: opts.restSec ?? TRANSITION_TIME_SEC,
    sortOrder: opts.sortOrder,
    isCardioFinisher: opts.isCardioFinisher ?? false,
    muscleTargets: Array.isArray(ex.muscles) ? ex.muscles.join(',') : (ex.muscles ?? ''),
    easyVariation: ex.easy ?? null,
    mediumVariation: ex.name ?? formatExerciseName(ex.key),
    hardVariation: ex.hard ?? null,
    kneeMod: ex.kneeMod ?? null,
    shoulderMod: ex.shoulderMod ?? null,
    ankleMod: ex.ankleMod ?? null,
    wristMod: ex.wristMod ?? null,
    backMod: ex.backMod ?? null,
    equipmentRequired: Array.isArray(ex.equipment) ? ex.equipment.join(', ') : (ex.equipment ?? null),
    board: 'main',
    setupTimeSec: setupTime,
  };
}

// ── Main Generation Function ──────────────────────────────────────────

export async function generateBootcampClass(options) {
  const {
    trainerId,
    classFormat = 'stations_4x',
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

  const format = FORMAT_CONFIG[classFormat];
  if (!format) throw new Error(`Unknown class format: ${classFormat}`);

  // Step 1: Determine station count
  let stationCount;
  if (classFormat === 'full_group') {
    stationCount = 0;
  } else if (format.fixedStations) {
    stationCount = format.fixedStations;
  } else {
    const exerciseTimeSec = format.exercisesPerStation * format.durationSec;
    const stationTimeSec = exerciseTimeSec + (format.exercisesPerStation - 1) * TRANSITION_TIME_SEC + STATION_TRANSITION_SEC;
    const totalWorkoutSec = targetDuration * 60;
    stationCount = Math.max(4, Math.min(10, Math.floor(totalWorkoutSec / stationTimeSec)));
  }

  // Step 2: Load space profile constraints
  let spaceProfile = null;
  if (spaceProfileId) {
    const SpaceProfile = getBootcampSpaceProfile();
    spaceProfile = await SpaceProfile.findByPk(spaceProfileId);
    if (spaceProfile?.maxStations && stationCount > spaceProfile.maxStations) {
      stationCount = spaceProfile.maxStations;
    }
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

  // Try Rolodex bridge first (equipment-aware, uses exercise_library table)
  if (equipmentProfileId) {
    try {
      const { getAllModels } = await import('../../models/index.mjs');
      const models = getAllModels();
      const profile = models.EquipmentProfile
        ? await models.EquipmentProfile.findByPk(equipmentProfileId)
        : null;

      if (profile) {
        // Get equipment items for this profile
        const equipmentItems = models.EquipmentItem
          ? await models.EquipmentItem.findAll({ where: { profileId: equipmentProfileId }, raw: true })
          : [];
        const availableEquipment = equipmentItems.map(e => e.equipmentType || e.name).filter(Boolean);
        if (availableEquipment.length === 0) availableEquipment.push('bodyweight');

        const { queryExercisesForBootcamp } = await import('./exerciseRolodexBridge.mjs');
        const rolodexResults = await queryExercisesForBootcamp({
          muscleGroups: targetMuscles,
          availableEquipment,
          excludeNames: [...combinedExclusions],
          limit: 200,
        });

        if (rolodexResults.length > 0) {
          availableExercises = rolodexResults.map(ex => ({
            key: ex.key || ex.name?.toLowerCase().replace(/\s+/g, '_'),
            ...ex,
          }));
        }
      }
    } catch (eqErr) {
      // Non-fatal — fall through to registry fallback
      const { default: logger } = await import('../../utils/logger.mjs');
      logger.warn('[BootcampGen] Equipment profile query failed, using full registry:', eqErr.message);
    }
  }

  // Fallback: use full exercise registry if Rolodex didn't produce results
  if (availableExercises.length === 0) {
    const registry = getExerciseRegistry();
    availableExercises = Object.entries(registry)
      .filter(([, ex]) => (ex.muscles ?? []).some(m => targetMuscles.includes(m)))
      .filter(([key]) => !combinedExclusions.has(key))
      .map(([key, ex]) => ({ key, ...ex }));
  }

  // Step 5: Build stations or full-group workout
  const stations = [];
  const allExercises = [];
  const explanations = [];

  if (classFormat === 'full_group') {
    buildFullGroupWorkout(availableExercises, format, allExercises, explanations);
  } else {
    buildStationWorkout(availableExercises, targetMuscles, stationCount, format, recentExerciseNames, stations, allExercises, explanations);
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

  // Step 9: Generate Board 2 (alternative/modified exercises)
  const board2Exercises = generateBoard2(allExercises);
  const allWithBoard2 = [...allExercises, ...board2Exercises];

  if (board2Exercises.length > 0) {
    explanations.push({
      type: 'board',
      message: `Board 2 generated: ${board2Exercises.length} alternative exercises for participants who need modifications (knee/shoulder/back issues, lower intensity).`,
    });
  }

  // Step 9b: Pain-aware annotations — flag exercises that may aggravate active injuries
  const painAlerts = [];
  if (trainerId) {
    try {
      const PainEntry = getClientPainEntry();
      const activeEntries = await PainEntry.findAll({
        where: { createdById: trainerId, status: 'active', painLevel: { [Op.gte]: 5 } },
        attributes: ['bodyRegion', 'side', 'painLevel', 'painType', 'userId'],
      });
      if (activeEntries.length > 0) {
        const painRegions = [...new Set(activeEntries.map(e => e.bodyRegion))];
        const REGION_MUSCLE_MAP = {
          left_knee: ['quadriceps', 'hamstrings'], right_knee: ['quadriceps', 'hamstrings'],
          lower_back: ['erector_spinae', 'core', 'glutes'], upper_back: ['trapezius', 'rhomboids', 'lats'],
          left_shoulder: ['shoulders', 'chest'], right_shoulder: ['shoulders', 'chest'],
          left_hip: ['glutes', 'hip_flexors', 'adductors'], right_hip: ['glutes', 'hip_flexors', 'adductors'],
          left_ankle: ['calves', 'tibialis'], right_ankle: ['calves', 'tibialis'],
        };

        for (const region of painRegions) {
          const relatedMuscles = REGION_MUSCLE_MAP[region] || [];
          const flaggedExercises = allExercises.filter(ex => {
            const exMuscles = ex.muscleTargets?.toLowerCase() || '';
            return relatedMuscles.some(m => exMuscles.includes(m));
          });
          if (flaggedExercises.length > 0) {
            painAlerts.push({
              region,
              severity: Math.max(...activeEntries.filter(e => e.bodyRegion === region).map(e => e.painLevel)),
              flaggedExercises: flaggedExercises.map(e => e.exerciseName),
              recommendation: `Participants with ${region.replace(/_/g, ' ')} issues should use Board 2 alternatives for these exercises.`,
            });
          }
        }
        if (painAlerts.length > 0) {
          explanations.push({
            type: 'pain_alert',
            message: `Pain-aware: ${painAlerts.length} exercise group(s) flagged based on active client injuries. Board 2 modifications recommended.`,
          });
        }
      }
    } catch { /* pain check is non-fatal */ }
  }

  // Step 10: Apply class style modifications
  if (classStyle === 'pyramid') {
    applyPyramidStyle(allExercises, explanations);
  } else if (classStyle === 'superset') {
    applySupersetStyle(allExercises, explanations);
  }

  // Step 11: Generate warm-up stretches
  const stretches = includeStretch ? generateStretches(dayType, stretchDurationMin) : [];

  const templateName = name ?? `${dayType.replace(/_/g, ' ')} ${classFormat.replace(/_/g, ' ')} — ${new Date().toLocaleDateString()}`;
  const stretchTime = includeStretch ? stretchDurationMin : 0;

  return {
    name: templateName,
    classFormat, classStyle, dayType, intensityCategory,
    stationCount, targetDuration,
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

function buildFullGroupWorkout(available, format, allExercises, explanations) {
  const selected = selectFullGroupExercises(available);
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

function buildStationWorkout(available, targetMuscles, stationCount, format, usedNames, stations, allExercises, explanations) {
  const muscleGroups = distributeMuscleGroups(targetMuscles, stationCount);

  for (let s = 0; s < stationCount; s++) {
    const stationMuscles = muscleGroups[s];
    const stationExes = selectStationExercises(available, stationMuscles, format.exercisesPerStation, usedNames);

    stations.push({
      stationNumber: s + 1,
      stationName: `Station ${s + 1}: ${formatExerciseName(stationMuscles[0] ?? 'mixed')}`,
      equipmentNeeded: stationExes
        .flatMap(e => Array.isArray(e.equipment) ? e.equipment : (e.equipment ? [e.equipment] : []))
        .filter((v, i, a) => v && a.indexOf(v) === i)
        .map(eq => formatExerciseName(eq))
        .join(', ') || 'Bodyweight',
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

    const finisher = CARDIO_FINISHERS[s % CARDIO_FINISHERS.length];
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
