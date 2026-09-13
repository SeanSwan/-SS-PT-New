const EQUIPMENT_ALIASES = Object.freeze({
  body_weight: 'bodyweight', none: 'bodyweight', no_equipment: 'bodyweight',
  band: 'resistance_band', resistanceband: 'resistance_band', resistance_bands: 'resistance_band',
  dumbbells: 'dumbbell', barbells: 'barbell', kettlebells: 'kettlebell',
  cable: 'cable_machine', cables: 'cable_machine', flat_bench: 'bench',
});
const LEGACY_OR_KEYS = new Set([
  'face_pulls', 'upright_row', 'shrugs', 'overhead_tricep_extension', 'goblet_squat',
  'walking_lunges', 'reverse_lunges', 'romanian_deadlift', 'single_leg_deadlift',
  'russian_twist', 'pallof_press', 'external_rotation', 'calf_raises',
]);

export function normalizeEquipmentToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return token ? EQUIPMENT_ALIASES[token] ?? token : null;
}

// Only declared arrays (including legacy JSON-encoded arrays) are authoritative.
// Malformed objects and absent fields cannot mean equipment-free.
function decodeList(value) {
  for (let depth = 0; depth < 2 && typeof value === 'string'; depth++) {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!Array.isArray(value) || value.some(item => !normalizeEquipmentToken(item))) return null;
  return [...new Set(value.map(normalizeEquipmentToken))];
}

/** Compatibility view: AND across groups, OR within each group. null = unresolved. */
export function equipmentRequirementGroups(exercise = {}) {
  if ('equipmentRequirementGroups' in exercise) {
    const value = exercise.equipmentRequirementGroups;
    if (!Array.isArray(value) || !value.length) return null;
    const groups = value.map(decodeList);
    return groups.every(group => group?.length) ? groups : null;
  }
  const equipment = decodeList(exercise.equipmentNeeded ?? exercise.equipment ?? exercise.equipmentRequired);
  if (!equipment) return null;
  // Registry overrides use stable registry identity, never display name.
  const key = exercise.key ?? exercise.exerciseKey;
  const legacy = exercise.sourceKind === 'legacy_registry'
    || (typeof key === 'string' && !('equipmentNeeded' in exercise) && !exercise.exerciseLibraryId);
  return legacy && LEGACY_OR_KEYS.has(key) && equipment.length
    ? [equipment] : equipment.map(token => [token]);
}

export function matchesEquipmentRequirements(exercise, availableTokens = []) {
  if (exercise?.equipmentRequirementsKnown === false) return false;
  const available = new Set((Array.isArray(availableTokens) ? availableTokens : [])
    .map(normalizeEquipmentToken).filter(Boolean));
  const availableToken = token => token === 'bodyweight' || available.has(token);
  if (exercise?.equipmentRequirementV1 !== undefined) {
    const requirement = exercise.equipmentRequirementV1;
    if (requirement?.version !== 1 || requirement.status !== 'known'
      || !Array.isArray(requirement.anyOf) || !requirement.anyOf.length) return false;
    const options = requirement.anyOf.map(option => decodeList(option?.allOf));
    if (options.some(option => option === null)) return false;
    return options.some(option => option.every(availableToken));
  }
  const groups = equipmentRequirementGroups(exercise);
  return groups !== null && groups.every(group => group.some(availableToken));
}

export const __testing__ = { EQUIPMENT_ALIASES, LEGACY_OR_KEYS };
