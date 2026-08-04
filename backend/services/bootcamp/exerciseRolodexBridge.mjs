/**
 * ============================================================================
 * FILE: exerciseRolodexBridge.mjs
 * PURPOSE: Bridge between Exercise Rolodex (840+ exercises) and Bootcamp Builder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Queries the Exercise model (exercise_library table)
 * with bootcamp-specific filters: muscle group, equipment availability,
 * difficulty range, OPT phase, and setup time estimation.
 * HOW IT FITS: bootcampGenerator → exerciseRolodexBridge → Exercise model
 */

import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { getVideoCatalog } from '../../models/index.mjs';
import { getCatalogVideoSamplesByExercise } from '../exerciseCatalogVideoSamples.mjs';
import {
  decodeRolodexList, muscleSearchTerms, normalizeMovementCategory, normalizeMuscleList,
} from './bootcampTaxonomy.mjs';

// ── Setup Time Estimates by Equipment ─────────────────────────────────
// How long (seconds) it takes a participant to set up each equipment type

const EQUIPMENT_SETUP_TIMES = {
  bodyweight: 0,
  none: 0,
  mat: 2,
  foam_roller: 3,
  medicine_ball: 3,
  dumbbell: 5,
  kettlebell: 5,
  bosu: 8,
  stability_ball: 8,
  trx: 10,
  bench: 10,
  resistance_band: 15,
  mini_band: 12,
  slider: 5,
  cable: 15,
  barbell: 20,
  machine: 25,
  landmine: 20,
  other: 10,
};

/**
 * Query the Exercise Rolodex for bootcamp-compatible exercises.
 * @param {Object} filters
 * @param {string[]} [filters.muscleGroups] - Target muscle groups (e.g., ['quads', 'glutes'])
 * @param {string[]} [filters.availableEquipment] - Equipment available at location
 * @param {number} [filters.minDifficulty] - Min difficulty (0-1000)
 * @param {number} [filters.maxDifficulty] - Max difficulty (0-1000)
 * @param {number} [filters.optPhase] - NASM OPT phase (1-5)
 * @param {string} [filters.bodyPartCategory] - legs, chest, back, etc.
 * @param {string[]} [filters.excludeNames] - Exercise names to exclude (freshness)
 * @param {number} [filters.limit] - Max results
 * @returns {Promise<Array>} Exercises formatted for bootcamp use
 */
export async function queryExercisesForBootcamp(filters = {}) {
  const {
    muscleGroups = [],
    availableEquipment = [],
    minDifficulty = 0,
    maxDifficulty = 1000,
    optPhase,
    bodyPartCategory,
    excludeNames = [],
    limit = 100,
  } = filters;

  try {
    // Use "Exercises" table (883+ exercises). exercise_library exists but is empty.
    // Check which table has actual data.
    let tableName = 'Exercises';
    try {
      const [countCheck] = await sequelize.query(`SELECT COUNT(*) as c FROM "Exercises"`);
      if (parseInt(countCheck[0]?.c || 0) === 0) {
        const [altCheck] = await sequelize.query(`SELECT COUNT(*) as c FROM exercise_library`);
        if (parseInt(altCheck[0]?.c || 0) > 0) tableName = 'exercise_library';
      }
    } catch { /* use default */ }

    // Build WHERE conditions
    const conditions = [`("isActive" = true OR "isActive" IS NULL)`];
    const replacements = {};

    // Muscle group filter (JSON array contains)
    if (muscleGroups.length > 0) {
      const searchTerms = [...new Set(muscleGroups.flatMap(muscleSearchTerms))];
      const muscleConditions = searchTerms.map((term, i) => {
        replacements[`muscle_${i}`] = `%${term}%`;
        return `("primaryMuscles"::text ILIKE :muscle_${i} OR "secondaryMuscles"::text ILIKE :muscle_${i})`;
      });
      conditions.push(`(${muscleConditions.join(' OR ')})`);
    }

    // Equipment filter — only exercises using available equipment
    if (availableEquipment.length > 0) {
      const eqNames = [...availableEquipment, 'bodyweight', 'none'];
      const eqConditions = eqNames.map((e, i) => {
        replacements[`equip_${i}`] = `%${e}%`;
        return `COALESCE("equipmentNeeded"::text, "equipment"::text, '["bodyweight"]') ILIKE :equip_${i}`;
      });
      conditions.push(`(${eqConditions.join(' OR ')})`);
    }

    // Difficulty range
    if (minDifficulty > 0 || maxDifficulty < 1000) {
      replacements.minDiff = minDifficulty;
      replacements.maxDiff = maxDifficulty;
      conditions.push(`COALESCE(difficulty, 500) BETWEEN :minDiff AND :maxDiff`);
    }

    // OPT phase filter
    if (optPhase) {
      replacements.optPhase = `%${optPhase}%`;
      conditions.push(`COALESCE("optPhases"::text, '[1,2,3,4,5]') ILIKE :optPhase`);
    }

    // Body part category
    if (bodyPartCategory) {
      replacements.bodyPart = bodyPartCategory;
      conditions.push(`"bodyPartCategory" = :bodyPart`);
    }

    // Exclude recently used exercises
    if (excludeNames.length > 0) {
      replacements.excludeNames = excludeNames;
      conditions.push(`name NOT IN (:excludeNames)`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT
        id, name, description, instructions,
        "primaryMuscles", "secondaryMuscles",
        "equipmentNeeded", equipment,
        difficulty, "exerciseType",
        "bodyPartCategory", "nasmMovementPattern",
        "optPhases", source,
        "videoUrl", "previewVideoUrl", "imageUrl", "thumbnailUrl",
        "exercise_key",
        "easyVariation", "mediumVariation", "hardVariation",
        "kneeMod", "shoulderMod", "ankleMod", "wristMod", "backMod"
      FROM "${tableName}"
      ${whereClause}
      ORDER BY
        CASE
          WHEN "exerciseType" = 'compound' THEN 0
          WHEN "exerciseType" IN ('stability', 'calisthenics', 'core') THEN 1
          WHEN "exerciseType" = 'flexibility' OR "bodyPartCategory" = 'recovery' THEN 3
          ELSE 2
        END ASC,
        COALESCE(difficulty, 500) DESC, name ASC
      LIMIT :limit
    `;

    replacements.limit = limit;

    const queryResult = await sequelize.query(query, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    }).catch(() => []);

    const exerciseRows = normalizeExerciseRows(queryResult);
    const catalogVideoSamples = await loadCatalogVideoSamples(exerciseRows);

    // Transform to bootcamp format
    return exerciseRows.map((ex) => {
      const sample = catalogVideoSamples[ex.id];
      return formatForBootcamp(ex, sample);
    });
  } catch (err) {
    logger.warn('Exercise Rolodex query failed, falling back to variation engine:', err.message);
    return [];
  }
}

/**
 * Estimate setup time for an exercise based on its equipment.
 */
export function estimateSetupTime(exercise) {
  const equipment = exercise.equipmentNeeded ?? exercise.equipment ?? ['bodyweight'];
  const eqList = Array.isArray(equipment) ? equipment : [equipment];

  let maxSetup = 0;
  for (const eq of eqList) {
    const normalized = String(eq).toLowerCase().replace(/\s+/g, '_');
    const setupTime = EQUIPMENT_SETUP_TIMES[normalized] ?? 10;
    if (setupTime > maxSetup) maxSetup = setupTime;
  }
  return maxSetup;
}

function normalizeExerciseRows(queryResult) {
  if (!Array.isArray(queryResult)) return [];
  if (Array.isArray(queryResult[0])) return queryResult[0];
  return queryResult;
}

/**
 * Format a raw exercise record for bootcamp use.
 */
async function loadCatalogVideoSamples(exercises) {
  try {
    const exerciseIds = exercises.map(ex => ex.id).filter(Boolean);
    return await getCatalogVideoSamplesByExercise(getVideoCatalog(), { exerciseIds });
  } catch {
    return {};
  }
}

function formatForBootcamp(ex, sample = null) {
  const primaryMuscles = normalizeMuscleList(ex.primaryMuscles);
  const secondaryMuscles = normalizeMuscleList(ex.secondaryMuscles);
  const equipment = decodeRolodexList(ex.equipmentNeeded ?? ex.equipment);
  const movementPattern = normalizeMovementCategory(ex.nasmMovementPattern)
    ?? normalizeMovementCategory(ex.name);

  return {
    exerciseLibraryId: ex.id,
    key: ex.exercise_key ?? ex.name?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
    name: ex.name,
    muscles: [...primaryMuscles, ...secondaryMuscles],
    primaryMuscle: primaryMuscles[0] ?? null,
    equipment: equipment.length > 0 ? equipment : ['bodyweight'],
    category: movementPattern,
    movementPattern,
    difficulty: ex.difficulty ?? 500,
    exerciseType: ex.exerciseType ?? 'compound',
    bodyPartCategory: ex.bodyPartCategory ?? 'full_body',
    optPhases: decodeRolodexList(ex.optPhases).length > 0 ? decodeRolodexList(ex.optPhases) : [1, 2, 3, 4, 5],
    source: ex.source ?? 'unknown',
    description: ex.description ?? null,
    instructions: ex.instructions ?? null,
    videoUrl: ex.videoUrl ?? sample?.videoUrl ?? null,
    previewVideoUrl: ex.previewVideoUrl ?? null,
    imageUrl: ex.imageUrl ?? null,
    thumbnailUrl: ex.thumbnailUrl ?? sample?.thumbnailUrl ?? null,
    catalogVideoSample: sample,
    setupTimeSec: estimateSetupTime(ex),
    // Difficulty tiers
    easy: ex.easyVariation ?? null,
    medium: ex.mediumVariation ?? null,
    hard: ex.hardVariation ?? null,
    // Pain modifications
    kneeMod: ex.kneeMod ?? null,
    shoulderMod: ex.shoulderMod ?? null,
    ankleMod: ex.ankleMod ?? null,
    wristMod: ex.wristMod ?? null,
    backMod: ex.backMod ?? null,
  };
}

export const __testing__ = { formatForBootcamp };
