/**
 * ============================================================================
 * FILE: bootcampGenerator.mjs
 * PURPOSE: AI-powered bootcamp class generation orchestration
 * ============================================================================
 *
 * This module coordinates the bootcamp generation workflow. Selection,
 * equipment, scoring, structure, and pain-alert helpers live in focused modules.
 */

import {
  getBootcampClassLog,
  getBootcampSpaceProfile,
} from '../../models/index.mjs';
import { getExerciseRegistry } from '../variationEngine.mjs';
import { Op } from 'sequelize';
import {
  CUSTOM_STRUCTURE_LIMITS,
  DAY_TYPE_MUSCLES,
  LAP_EXERCISES,
  STATION_TRANSITION_SEC,
} from './bootcampConstants.mjs';
import { optimizeStationFlow } from './flowOptimizer.mjs';
import {
  generateBoard2,
  applyClassStyle,
  generateStretches,
} from './classStyleModifiers.mjs';
import {
  filterExercisesForStrictEquipment,
  summarizeBootcampSelectionEvidence,
} from './bootcampIntelligenceEngine.mjs';
import {
  buildAvailableEquipmentList,
  getBootcampEquipmentContext,
} from './bootcampEquipmentContext.mjs';
import {
  buildExerciseRecord,
  buildFullGroupWorkout,
  buildStationWorkout,
  normalizeExerciseLibraryId,
} from './bootcampExerciseSelection.mjs';
import { rankExercisesForBootcamp } from './bootcampIntensityScoring.mjs';
import {
  getRequiredEquipmentExerciseSlots,
  resolveBootcampStructure,
} from './bootcampStructure.mjs';
import { collectBootcampPainAlerts } from './bootcampPainAlerts.mjs';

export async function generateBootcampClass(options) {
  const {
    trainerId,
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
    optPhase,
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

  let spaceProfile = null;
  if (spaceProfileId) {
    const SpaceProfile = getBootcampSpaceProfile();
    spaceProfile = await SpaceProfile.findByPk(spaceProfileId);
    if (spaceProfile?.maxStations && stationCount > spaceProfile.maxStations) {
      stationCount = Math.max(CUSTOM_STRUCTURE_LIMITS.minStations, spaceProfile.maxStations);
      if (classFormat === 'custom') {
        format = { ...format, fixedStations: stationCount };
      }
    }
  }

  const recentExerciseNames = await getRecentExerciseNames(trainerId);
  const targetMuscles = DAY_TYPE_MUSCLES[dayType] ?? DAY_TYPE_MUSCLES.full_body;
  const combinedExclusions = new Set(recentExerciseNames);
  if (exclusionKeys instanceof Set) {
    exclusionKeys.forEach(k => combinedExclusions.add(k));
  }

  let availableExercises = [];
  const explanations = [];
  const equipmentContext = await getBootcampEquipmentContext(equipmentProfileId);
  let equipmentFilterResult = null;

  try {
    const availableEquipment = equipmentContext.availableEquipment;
    const { queryExercisesForBootcamp } = await import('./exerciseRolodexBridge.mjs');
    const rolodexResults = await queryExercisesForBootcamp({
      muscleGroups: targetMuscles,
      availableEquipment,
      optPhase,
      excludeNames: [...combinedExclusions],
      limit: 240,
    });

    if (rolodexResults.length > 0) {
      availableExercises = rolodexResults.map(ex => ({
        key: ex.key || ex.name?.toLowerCase().replace(/\s+/g, '_'),
        ...ex,
      }));
    }

    if (equipmentContext.strictEquipment && availableExercises.length > 0) {
      equipmentFilterResult = filterExercisesForStrictEquipment(availableExercises, equipmentContext);
      availableExercises = equipmentFilterResult.allowed;
    }
  } catch (eqErr) {
    const { default: logger } = await import('../../utils/logger.mjs');
    logger.warn('[BootcampGen] Rolodex query failed, using full registry:', eqErr.message);
  }

  if (availableExercises.length === 0) {
    const registry = getExerciseRegistry();
    const registryExercises = Object.entries(registry)
      .filter(([, ex]) => (ex.muscles ?? []).some(m => targetMuscles.includes(m)))
      .filter(([key]) => !combinedExclusions.has(key))
      .map(([key, ex]) => ({ key, ...ex }));

    if (equipmentContext.strictEquipment) {
      equipmentFilterResult = filterExercisesForStrictEquipment(registryExercises, equipmentContext);
      availableExercises = equipmentFilterResult.allowed;
    } else {
      availableExercises = registryExercises;
    }
  }

  const requiredEquipmentSlots = getRequiredEquipmentExerciseSlots({ classFormat, stationCount, format });
  const equipmentSummary = summarizeBootcampSelectionEvidence(equipmentFilterResult, { requiredSlots: requiredEquipmentSlots });
  if (equipmentSummary) explanations.push(equipmentSummary);

  const stations = [];
  const allExercises = [];

  if (intensityCategory) {
    availableExercises = rankExercisesForBootcamp(availableExercises, { intensityCategory });
    explanations.push({
      type: 'intensity',
      message: `Intensity category applied: ${intensityCategory.replace(/_/g, ' ')} prioritized the exercise pool before station assignment.`,
    });
  }

  if (classFormat === 'full_group') {
    buildFullGroupWorkout(availableExercises, format, allExercises, explanations);
  } else {
    buildStationWorkout(availableExercises, targetMuscles, stationCount, format, recentExerciseNames, stations, allExercises, explanations);
  }

  const totalExerciseTime = allExercises.reduce((sum, ex) => sum + ex.durationSec + ex.restSec, 0);
  const totalStationTransitions = Math.max(0, stationCount - 1) * STATION_TRANSITION_SEC;
  const totalWorkoutSec = totalExerciseTime + totalStationTransitions;
  const totalWorkoutMin = Math.round(totalWorkoutSec / 60);

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

  const flowData = optimizeStationFlow(stations, allExercises, explanations);
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

  const painAlerts = await collectBootcampPainAlerts({ trainerId, allExercises, explanations });

  applyClassStyle(classStyle, allExercises, explanations);

  const stretches = includeStretch ? generateStretches(dayType, stretchDurationMin) : [];
  const templateName = name ?? `${dayType.replace(/_/g, ' ')} ${classFormat.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`;
  const stretchTime = includeStretch ? stretchDurationMin : 0;

  return {
    name: templateName,
    classFormat,
    classStyle,
    dayType,
    intensityCategory,
    stationCount,
    targetDuration,
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
    equipmentReadiness: equipmentSummary ?? null,
    explanations,
    aiGenerated: true,
  };
}

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

export const __testing__ = {
  buildAvailableEquipmentList,
  getBootcampEquipmentContext,
  buildExerciseRecord,
  normalizeExerciseLibraryId,
  rankExercisesForBootcamp,
  resolveBootcampStructure,
  getRequiredEquipmentExerciseSlots,
};
