/**
 * Equipment filtering helpers for Swan Coach guided workout candidates.
 */
import logger from '../utils/logger.mjs';

function normalizeEquipmentToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

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
  if (!availableCategories || availableCategories.size === 0) return true;
  const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
  if (equipment.length === 0) return true;
  return equipment.some(item => availableCategories.has(normalizeEquipmentToken(item)));
}