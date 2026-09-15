/**
 * Equipment filtering helpers for Swan Coach guided workout candidates.
 */
import logger from '../utils/logger.mjs';
import {
  matchesEquipmentRequirements,
  normalizeEquipmentToken,
} from './exerciseConstraintContract.mjs';

export function equipmentCategoriesFromItems(items = []) {
  const categories = new Set();
  for (const item of items) {
    const category = normalizeEquipmentToken(item?.category);
    if (category) categories.add(category);
  }
  if (categories.size > 0) categories.add('bodyweight');
  return categories;
}

export function equipmentItemsForProfile(context, equipmentProfileId, clientId) {
  const parsedProfileId = Number(equipmentProfileId);
  if (!Number.isInteger(parsedProfileId) || parsedProfileId < 1) return [];
  const profile = Array.isArray(context.equipment)
    ? context.equipment.find(item => Number(item?.id) === parsedProfileId)
    : null;
  if (!profile) {
    logger.warn('[WorkoutBuilder] Equipment profile not found for guided candidates', {
      clientId,
      equipmentProfileId: parsedProfileId,
    });
    return [];
  }
  return Array.isArray(profile.items) ? profile.items : [];
}

export function matchesEquipmentProfile(exercise, availableCategories) {
  // null means no profile constraint. An empty Set is a verified-empty
  // profile and therefore admits only bodyweight/no-equipment movements.
  if (availableCategories === null || availableCategories === undefined) return true;
  return matchesEquipmentRequirements(exercise, [...availableCategories]);
}
