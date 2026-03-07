/**
 * Boot Camp Class Builder Service -- Phase 10c
 * ==============================================
 * AI-powered group fitness class generation with:
 *   - 4 class formats (stations_4x, stations_3x5, stations_2x7, full_group)
 *   - Station ordering rules (heavy first, cardio last)
 *   - Difficulty tiers (easy/medium/hard) + pain modifications
 *   - Overflow planning for variable class sizes
 *   - Exercise freshness tracking (no repeats within 2 weeks)
 *   - Time calculation and validation
 *
 * Integrates with Phase 7 (Equipment) and Phase 8 (Variation Engine).
 */

import {
  getBootcampTemplate,
  getBootcampStation,
  getBootcampExercise,
  getBootcampOverflowPlan,
  getBootcampClassLog,
  getBootcampSpaceProfile,
  getExerciseTrend,
} from '../models/index.mjs';
import { getExerciseRegistry } from './variationEngine.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

// ── Class Format Configs ──────────────────────────────────────────────

const FORMAT_CONFIG = {
  stations_4x: { exercisesPerStation: 4, durationSec: 35, fixedStations: null },
  stations_3x5: { exercisesPerStation: 3, durationSec: 40, fixedStations: 5 },
  stations_2x7: { exercisesPerStation: 2, durationSec: 30, fixedStations: 7 },
  full_group: { exercisesPerStation: null, durationSec: 40, fixedStations: null },
};

const TRANSITION_TIME_SEC = 15;
const STATION_TRANSITION_SEC = 30;

// ── Muscle Group Distributions by Day Type ────────────────────────────

const DAY_TYPE_MUSCLES = {
  lower_body: ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'core'],
  upper_body: ['chest', 'lats', 'anterior_deltoid', 'biceps', 'triceps', 'core'],
  cardio: ['core', 'quads', 'glutes', 'chest', 'anterior_deltoid', 'hamstrings'],
  full_body: ['quads', 'chest', 'lats', 'anterior_deltoid', 'glutes', 'core'],
};

// ── Cardio Finishers (bodyweight, no equipment) ───────────────────────

const CARDIO_FINISHERS = [
  { name: 'Mountain Climbers', muscles: 'core,hip_flexors,shoulders', easy: 'Slow Mountain Climbers', hard: 'Cross-Body Mountain Climbers', kneeMod: 'Standing High Knees', backMod: 'Standing March' },
  { name: 'Jumping Jacks', muscles: 'full_body', easy: 'Step-Out Jacks', hard: 'Star Jumps', kneeMod: 'Seal Jacks (arms only)', ankleMod: 'Seal Jacks (arms only)' },
  { name: 'High Knees', muscles: 'core,hip_flexors,quadriceps', easy: 'Marching in Place', hard: 'High Knees Sprint', kneeMod: 'Standing March', ankleMod: 'Seated High Knees' },
  { name: 'Burpees', muscles: 'full_body', easy: 'Step-Back Burpees', hard: 'Burpee Tuck Jumps', kneeMod: 'Squat Thrusts (no jump)', wristMod: 'Squat Jumps', backMod: 'Squat Thrusts' },
  { name: 'Squat Jumps', muscles: 'quadriceps,gluteus_maximus', easy: 'Bodyweight Squats', hard: 'Tuck Jumps', kneeMod: 'Wall Sit Hold', ankleMod: 'Seated Leg Extensions' },
  { name: 'Lateral Shuffles', muscles: 'quadriceps,gluteus_medius', easy: 'Side Steps', hard: 'Lateral Bound Jumps', kneeMod: 'Side Steps', ankleMod: 'Side Steps' },
  { name: 'Skaters', muscles: 'gluteus_medius,quadriceps', easy: 'Step-Behind Lunges', hard: 'Power Skaters', kneeMod: 'Standing Hip Abduction', ankleMod: 'Seated Band Abduction' },
  { name: 'Bear Crawls', muscles: 'core,shoulders,quadriceps', easy: 'Bear Crawl Hold', hard: 'Bear Crawl Sprints', wristMod: 'Inchworms', kneeMod: 'Plank Hold' },
];

// ── Lap Rotation Exercises (outdoor, bodyweight only) ─────────────────

const LAP_EXERCISES = [
  { name: 'Jogging', durationMin: 1 },
  { name: 'Walking Lunges', durationMin: 1 },
  { name: 'Bear Crawls', durationMin: 0.5 },
  { name: 'High Knees', durationMin: 0.5 },
  { name: 'Carioca', durationMin: 0.5 },
  { name: 'Butt Kicks', durationMin: 0.5 },
  { name: 'Backpedal', durationMin: 0.5 },
];

// ── Generate Station-Based Class ──────────────────────────────────────

/**
 * Generate a boot camp class template.
 * @param {Object} options
 * @param {number} options.trainerId
 * @param {string} options.classFormat - stations_4x, stations_3x5, stations_2x7, full_group
 * @param {string} options.dayType - lower_body, upper_body, cardio, full_body
 * @param {number} [options.targetDuration=45] - workout minutes
 * @param {number} [options.expectedParticipants=12]
 * @param {number} [options.spaceProfileId]
 * @param {number} [options.equipmentProfileId]
 * @param {string} [options.name]
 */
export async function generateBootcampClass(options) {
  const {
    trainerId,
    classFormat = 'stations_4x',
    dayType = 'full_body',
    targetDuration = 45,
    expectedParticipants = 12,
    spaceProfileId,
    equipmentProfileId,
    name,
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
    // Calculate based on target duration
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
  const ClassLog = getBootcampClassLog();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentLogs = await ClassLog.findAll({
    where: {
      trainerId,
      classDate: { [Op.gte]: twoWeeksAgo },
    },
    order: [['classDate', 'DESC']],
    limit: 10,
  }).catch(() => []);

  const recentExerciseNames = new Set();
  for (const log of recentLogs) {
    if (log.exercisesUsed && Array.isArray(log.exercisesUsed)) {
      for (const ex of log.exercisesUsed) {
        recentExerciseNames.add(ex.exerciseName ?? ex.name ?? ex);
      }
    }
  }

  // Step 4: Get exercise registry and filter by day type muscles
  const registry = getExerciseRegistry();
  const targetMuscles = DAY_TYPE_MUSCLES[dayType] ?? DAY_TYPE_MUSCLES.full_body;

  const availableExercises = Object.entries(registry)
    .filter(([, ex]) => {
      const exMuscles = ex.muscles ?? [];
      return exMuscles.some(m => targetMuscles.includes(m));
    })
    .filter(([key]) => !recentExerciseNames.has(key))
    .map(([key, ex]) => ({ key, ...ex }));

  // Step 5: Build stations or full-group workout
  const stations = [];
  const allExercises = [];
  const explanations = [];

  if (classFormat === 'full_group') {
    // Full group: 15 exercises, alternating strength/cardio
    const selected = selectFullGroupExercises(availableExercises, targetMuscles);
    for (let i = 0; i < selected.length; i++) {
      allExercises.push({
        exerciseName: selected[i].name ?? formatExerciseName(selected[i].key),
        durationSec: format.durationSec,
        restSec: TRANSITION_TIME_SEC,
        sortOrder: i + 1,
        isCardioFinisher: selected[i].isCardio ?? false,
        muscleTargets: (selected[i].muscles ?? []).join(','),
        easyVariation: selected[i].easy ?? null,
        mediumVariation: selected[i].name ?? formatExerciseName(selected[i].key),
        hardVariation: selected[i].hard ?? null,
        kneeMod: selected[i].kneeMod ?? null,
        shoulderMod: selected[i].shoulderMod ?? null,
        ankleMod: selected[i].ankleMod ?? null,
        wristMod: selected[i].wristMod ?? null,
        backMod: selected[i].backMod ?? null,
        equipmentRequired: selected[i].equipment ?? null,
      });
    }
    explanations.push({
      type: 'format',
      message: `Full group workout: ${selected.length} exercises x 2 rounds, ${format.durationSec}s each`,
    });
  } else {
    // Station-based
    const muscleGroups = distributeMuscleGroups(targetMuscles, stationCount);

    for (let s = 0; s < stationCount; s++) {
      const stationMuscles = muscleGroups[s];
      const stationExercises = selectStationExercises(
        availableExercises,
        stationMuscles,
        format.exercisesPerStation,
        recentExerciseNames,
      );

      stations.push({
        stationNumber: s + 1,
        stationName: `Station ${s + 1}: ${formatExerciseName(stationMuscles[0] ?? 'mixed')}`,
        equipmentNeeded: stationExercises
          .flatMap(e => Array.isArray(e.equipment) ? e.equipment : (e.equipment ? [e.equipment] : []))
          .filter((v, i, a) => v && a.indexOf(v) === i)
          .map(eq => formatExerciseName(eq))
          .join(', ') || 'Bodyweight',
        setupTimeSec: 0,
        sortOrder: s + 1,
      });

      // Add all selected exercises for this station
      for (let e = 0; e < stationExercises.length; e++) {
        const ex = stationExercises[e];
        allExercises.push({
          stationIndex: s,
          exerciseName: ex.name ?? formatExerciseName(ex.key),
          durationSec: format.durationSec,
          restSec: TRANSITION_TIME_SEC,
          sortOrder: e + 1,
          isCardioFinisher: false,
          muscleTargets: (ex.muscles ?? []).join(','),
          easyVariation: ex.easy ?? null,
          mediumVariation: ex.name ?? formatExerciseName(ex.key),
          hardVariation: ex.hard ?? null,
          kneeMod: ex.kneeMod ?? null,
          shoulderMod: ex.shoulderMod ?? null,
          ankleMod: ex.ankleMod ?? null,
          wristMod: ex.wristMod ?? null,
          backMod: ex.backMod ?? null,
          equipmentRequired: Array.isArray(ex.equipment) ? ex.equipment.join(', ') : (ex.equipment ?? null),
        });
        recentExerciseNames.add(ex.key);
      }

      // Append cardio finisher as the last exercise in the station
      const finisher = CARDIO_FINISHERS[s % CARDIO_FINISHERS.length];
      allExercises.push({
        stationIndex: s,
        exerciseName: finisher.name,
        durationSec: format.durationSec,
        restSec: 0,
        sortOrder: stationExercises.length + 1,
        isCardioFinisher: true,
        muscleTargets: finisher.muscles,
        easyVariation: finisher.easy ?? null,
        mediumVariation: finisher.name,
        hardVariation: finisher.hard ?? null,
        kneeMod: finisher.kneeMod ?? null,
        shoulderMod: finisher.shoulderMod ?? null,
        ankleMod: finisher.ankleMod ?? null,
        wristMod: finisher.wristMod ?? null,
        backMod: finisher.backMod ?? null,
      });
    }

    explanations.push({
      type: 'format',
      message: `${stationCount} stations, ${format.exercisesPerStation} exercises each, ${format.durationSec}s per exercise`,
    });
  }

  // Step 6: Calculate timing
  const totalExerciseTime = allExercises.reduce((sum, ex) => sum + ex.durationSec + ex.restSec, 0);
  const totalStationTransitions = Math.max(0, stationCount - 1) * STATION_TRANSITION_SEC;
  const totalWorkoutSec = totalExerciseTime + totalStationTransitions;
  const totalWorkoutMin = Math.round(totalWorkoutSec / 60);

  // Step 7: Generate overflow plan
  let overflowPlan = null;
  const maxPerStation = spaceProfile?.maxPerStation ?? 4;
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

  // Build result
  const templateName = name ?? `${dayType.replace(/_/g, ' ')} ${classFormat.replace(/_/g, ' ')} — ${new Date().toLocaleDateString()}`;

  return {
    name: templateName,
    classFormat,
    dayType,
    stationCount,
    targetDuration,
    totalWorkoutMin,
    demoDuration: 5,
    clearDuration: 5,
    totalClassMin: totalWorkoutMin + 10,
    expectedParticipants,
    stations,
    exercises: allExercises,
    overflowPlan,
    explanations,
    aiGenerated: true,
  };
}

// ── Save Generated Class to Database ──────────────────────────────────

export async function saveBootcampTemplate(generatedClass, trainerId) {
  const Template = getBootcampTemplate();
  const Station = getBootcampStation();
  const Exercise = getBootcampExercise();
  const Overflow = getBootcampOverflowPlan();

  const template = await Template.create({
    trainerId,
    name: generatedClass.name,
    classFormat: generatedClass.classFormat,
    dayType: generatedClass.dayType,
    targetDurationMin: generatedClass.targetDuration,
    maxParticipants: generatedClass.expectedParticipants + 8,
    optimalParticipants: generatedClass.expectedParticipants,
    aiGenerated: generatedClass.aiGenerated,
    metadata: { explanations: generatedClass.explanations },
  });

  // Create stations in bulk
  const stationRecords = generatedClass.stations.map(s => ({
    templateId: template.id,
    ...s,
  }));
  const createdStations = stationRecords.length > 0
    ? await Station.bulkCreate(stationRecords, { returning: true })
    : [];

  // Map stationIndex to created station IDs
  const stationMap = {};
  createdStations.forEach((station, idx) => {
    stationMap[idx] = station.id;
  });

  // Create exercises in bulk
  const exerciseRecords = generatedClass.exercises.map(ex => ({
    templateId: template.id,
    stationId: ex.stationIndex != null ? stationMap[ex.stationIndex] : null,
    exerciseName: ex.exerciseName,
    durationSec: ex.durationSec,
    restSec: ex.restSec,
    sortOrder: ex.sortOrder,
    isCardioFinisher: ex.isCardioFinisher,
    muscleTargets: ex.muscleTargets,
    easyVariation: ex.easyVariation,
    mediumVariation: ex.mediumVariation,
    hardVariation: ex.hardVariation,
    kneeMod: ex.kneeMod,
    shoulderMod: ex.shoulderMod,
    ankleMod: ex.ankleMod,
    wristMod: ex.wristMod,
    backMod: ex.backMod,
    equipmentRequired: ex.equipmentRequired,
  }));
  if (exerciseRecords.length > 0) {
    await Exercise.bulkCreate(exerciseRecords);
  }

  // Create overflow plan
  if (generatedClass.overflowPlan) {
    await Overflow.create({
      templateId: template.id,
      ...generatedClass.overflowPlan,
    });
  }

  return template;
}

// ── Log a Class ───────────────────────────────────────────────────────

export async function logBootcampClass(data) {
  const ClassLog = getBootcampClassLog();
  return ClassLog.create(data);
}

// ── Get Class History ─────────────────────────────────────────────────

export async function getClassHistory(trainerId, { dayType, limit = 20, offset = 0 } = {}) {
  const ClassLog = getBootcampClassLog();
  const where = { trainerId };
  if (dayType) where.dayType = dayType;

  return ClassLog.findAndCountAll({
    where,
    order: [['classDate', 'DESC']],
    limit,
    offset,
  });
}

// ── Get Templates ─────────────────────────────────────────────────────

export async function getTemplates(trainerId, { classFormat, dayType, limit = 20 } = {}) {
  const Template = getBootcampTemplate();
  const where = { trainerId, isActive: true };
  if (classFormat) where.classFormat = classFormat;
  if (dayType) where.dayType = dayType;

  return Template.findAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    include: [
      { model: getBootcampStation(), as: 'stations', include: [{ model: getBootcampExercise(), as: 'exercises' }] },
      { model: getBootcampOverflowPlan(), as: 'overflowPlans' },
    ],
  });
}

// ── Space Profile CRUD ────────────────────────────────────────────────

export async function createSpaceProfile(data) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.create(data);
}

export async function getSpaceProfiles(trainerId) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.findAll({ where: { trainerId }, order: [['name', 'ASC']] });
}

export async function updateSpaceProfile(id, trainerId, updates) {
  const SpaceProfile = getBootcampSpaceProfile();
  const profile = await SpaceProfile.findOne({ where: { id, trainerId } });
  if (!profile) throw new Error('Space profile not found');
  return profile.update(updates);
}

// ── Exercise Trend CRUD ───────────────────────────────────────────────

export async function getExerciseTrends({ source, isApproved, limit = 50 } = {}) {
  const Trend = getExerciseTrend();
  const where = {};
  if (source) where.source = source;
  if (isApproved != null) where.isApproved = isApproved;

  return Trend.findAll({
    where,
    order: [['trendScore', 'DESC']],
    limit,
  });
}

export async function approveExerciseTrend(trendId, userId) {
  const Trend = getExerciseTrend();
  const trend = await Trend.findByPk(trendId);
  if (!trend) throw new Error('Trend not found');
  return trend.update({ isApproved: true, approvedBy: userId });
}

// ── Helper Functions ──────────────────────────────────────────────────

function formatExerciseName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function distributeMuscleGroups(muscles, stationCount) {
  const result = [];
  for (let i = 0; i < stationCount; i++) {
    // Round-robin distribute muscles, ensuring no two adjacent stations share primary muscle
    const primary = muscles[i % muscles.length];
    const secondary = muscles[(i + 1) % muscles.length];
    result.push([primary, secondary]);
  }
  return result;
}

function selectStationExercises(available, stationMuscles, count, usedNames) {
  // Find exercises matching this station's muscle groups that haven't been used
  const matching = available
    .filter(ex => {
      const exMuscles = ex.muscles ?? [];
      return stationMuscles.some(m => exMuscles.includes(m));
    })
    .filter(ex => !usedNames.has(ex.key));

  // Sort by muscle overlap (more overlap = better fit for the primary muscle)
  matching.sort((a, b) => {
    const aMatch = (a.muscles ?? []).filter(m => stationMuscles.includes(m)).length;
    const bMatch = (b.muscles ?? []).filter(m => stationMuscles.includes(m)).length;
    return bMatch - aMatch;
  });

  const needed = Math.max(1, count - 1); // Leave 1 slot for cardio finisher

  if (matching.length >= needed) {
    return matching.slice(0, needed);
  }

  // Fallback: if not enough muscle-matched exercises, pull from the full pool
  const selected = [...matching];
  const remainingPool = available
    .filter(ex => !usedNames.has(ex.key) && !selected.some(s => s.key === ex.key));

  for (const ex of remainingPool) {
    if (selected.length >= needed) break;
    selected.push(ex);
  }

  return selected;
}

function selectFullGroupExercises(available, targetMuscles) {
  // Select ~15 exercises: 5 compound, 5 cardio, 5 accessory
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

  // Interleave: strength, cardio, strength, cardio...
  const result = [];
  const maxLen = Math.max(compound.length, cardio.length, accessory.length);
  for (let i = 0; i < maxLen; i++) {
    if (compound[i]) result.push(compound[i]);
    if (cardio[i]) result.push(cardio[i]);
    if (accessory[i]) result.push(accessory[i]);
  }

  return result.slice(0, 15);
}
