/**
 * Exercise Lookup Utility
 * =======================
 * Shared exercise name resolution for workout plan persistence.
 * Used by both generateWorkoutPlan and approveDraftPlan flows.
 *
 * Strategy:
 *   1. Bulk exact-match via Op.iLike + Op.any (single query)
 *   2. Fuzzy fallback for unmatched names (individual queries)
 *   3. Returns Map<lowercaseName, ExerciseRecord> for O(1) lookups
 */
import { Op } from 'sequelize';
import logger from './logger.mjs';

/**
 * Find a single exercise by name (exact then fuzzy).
 *
 * @param {Model} Exercise - Sequelize Exercise model
 * @param {string} name - Exercise name to look up
 * @param {Transaction} [transaction] - Optional Sequelize transaction
 * @returns {Promise<Model|null>}
 */
export async function findExerciseByName(Exercise, name, transaction) {
  if (!name) return null;

  const trimmed = String(name).trim();
  if (!trimmed) return null;

  try {
    // Exact match (case-insensitive)
    const exactMatch = await Exercise.findOne({
      where: { name: { [Op.iLike]: trimmed } },
      transaction,
    });
    if (exactMatch) return exactMatch;

    // Fuzzy fallback (substring match)
    return await Exercise.findOne({
      where: { name: { [Op.iLike]: `%${trimmed}%` } },
      transaction,
    });
  } catch (err) {
    logger.warn('Exercise lookup failed', { name: trimmed, error: err.message });
    return null;
  }
}

/**
 * Build a bulk exercise lookup map from an array of exercise names.
 * Single query for exact matches, then individual fuzzy lookups for misses.
 *
 * @param {Model} Exercise - Sequelize Exercise model
 * @param {string[]} exerciseNames - All exercise names to resolve
 * @param {Transaction} [transaction] - Optional Sequelize transaction
 * @returns {Promise<Map<string, Model>>} Map keyed by lowercase name
 */
export async function buildExerciseLookupMap(Exercise, exerciseNames, transaction) {
  const lookupMap = new Map();
  if (!Exercise || !exerciseNames?.length) return lookupMap;

  const uniqueNames = [...new Set(
    exerciseNames
      .map(n => (n ? String(n).trim() : ''))
      .filter(Boolean)
  )];

  if (uniqueNames.length === 0) return lookupMap;

  try {
    // Bulk exact matches (single query)
    const exactMatches = await Exercise.findAll({
      where: { name: { [Op.iLike]: { [Op.any]: uniqueNames } } },
      transaction,
    });
    for (const em of exactMatches) {
      lookupMap.set(em.name.toLowerCase(), em);
    }

    // Fuzzy match remaining unmatched names
    const unmatchedNames = uniqueNames.filter(n => !lookupMap.has(n.toLowerCase()));
    for (const name of unmatchedNames) {
      const fuzzy = await Exercise.findOne({
        where: { name: { [Op.iLike]: `%${name}%` } },
        transaction,
      });
      if (fuzzy) lookupMap.set(name.toLowerCase(), fuzzy);
    }
  } catch (lookupErr) {
    logger.warn('Bulk exercise lookup failed, map may be incomplete', {
      error: lookupErr.message,
      attemptedCount: uniqueNames.length,
    });
  }

  return lookupMap;
}
