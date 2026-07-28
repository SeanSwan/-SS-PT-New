/**
 * bootcampIntelligenceEngine
 * --------------------------
 * Pure selection helpers for Bootcamp Builder equipment truth and coach-facing
 * evidence. Database lookups stay in the generator; this module receives the
 * resolved equipment profile tokens and confirmed mapping rows.
 */

const BODYWEIGHT_TOKENS = new Set([
  'bodyweight',
  'body weight',
  'none',
  'no equipment',
  'no-equipment',
]);

function normalizeToken(value) {
  if (value == null) return null;
  const token = String(value).trim().toLowerCase();
  return token.length > 0 ? token : null;
}

function singularizeToken(token) {
  if (!token || token.length < 4 || !token.endsWith('s')) return token;
  return token.slice(0, -1);
}

function expandToken(value) {
  const token = normalizeToken(value);
  if (!token) return [];
  const spaced = token.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const underscored = spaced.replace(/\s+/g, '_');
  return Array.from(new Set([
    token,
    spaced,
    underscored,
    singularizeToken(token),
    singularizeToken(spaced),
    singularizeToken(underscored),
  ].filter(Boolean)));
}

function canonicalToken(value) {
  const token = normalizeToken(value);
  if (!token) return null;
  return token.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseEquipmentList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(canonicalToken).filter(Boolean);
  if (typeof value !== 'string') return [];
  if (!value.trim() || value.trim() === '[]') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(canonicalToken).filter(Boolean);
  } catch {
    // Fall through to comma/string parsing.
  }

  return value.split(',').map(canonicalToken).filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function countMissingEquipment(rejected = []) {
  const counts = {};
  for (const exercise of rejected) {
    for (const token of exercise.missingEquipment ?? []) {
      counts[token] = (counts[token] ?? 0) + 1;
    }
  }
  return counts;
}

function formatMissingEquipmentCounts(counts = {}) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([token, count]) => `${token} (${count})`)
    .join(', ');
}

function isBodyweightToken(token) {
  return expandToken(token).some((candidate) => BODYWEIGHT_TOKENS.has(candidate));
}

function getRequiredEquipment(exercise) {
  const equipment = unique([
    ...parseEquipmentList(exercise?.equipment),
    ...parseEquipmentList(exercise?.equipmentNeeded),
    ...parseEquipmentList(exercise?.equipmentRequired),
  ]);

  if (equipment.length === 0 || equipment.every(isBodyweightToken)) return [];
  return equipment.filter((token) => !isBodyweightToken(token));
}

function getExerciseKeys(exercise) {
  const rawKeys = [
    exercise?.key,
    exercise?.exerciseKey,
    exercise?.exercise_key,
    exercise?.name,
    exercise?.exerciseName,
  ];
  return new Set(rawKeys.flatMap(expandToken));
}

function tokenMatches(required, available) {
  if (!required || !available) return false;
  if (required === available) return true;
  if (required.length > 3 && available.includes(required)) return true;
  return available.length > 3 && required.includes(available);
}

function findMatchingAvailableEquipment(required, availableTokens) {
  const requiredVariants = expandToken(required);
  return availableTokens.find((available) => (
    requiredVariants.some((candidate) => tokenMatches(candidate, available))
  )) ?? null;
}

function findConfirmedMappings(exercise, equipmentMappings = []) {
  const exerciseKeys = getExerciseKeys(exercise);
  return equipmentMappings.filter((mapping) => {
    if (!mapping || mapping.confirmed === false) return false;
    return expandToken(mapping.exerciseKey).some((key) => exerciseKeys.has(key));
  });
}

function getMediaStatus(exercise) {
  if (exercise?.previewVideoUrl) return 'preview_video';
  if (exercise?.videoUrl || exercise?.catalogVideoSample?.videoUrl) return 'video';
  if (exercise?.thumbnailUrl || exercise?.imageUrl || exercise?.catalogVideoSample?.thumbnailUrl) return 'poster';
  return 'none';
}

function buildReason({ strictEquipment, requiredEquipment, matchedEquipment, confirmedMappings }) {
  if (!strictEquipment) return 'No equipment profile selected; exercise remains available.';
  if (requiredEquipment.length === 0) return 'Bodyweight exercise fits every equipment profile.';
  if (confirmedMappings.length > 0) return 'Allowed by a confirmed equipment mapping for this location profile.';
  return `Allowed by available equipment: ${matchedEquipment.join(', ')}.`;
}

export function buildStrictEquipmentEvidence(exercise, {
  availableEquipment = [],
  equipmentMappings = [],
  strictEquipment = false,
} = {}) {
  const availableTokens = unique(availableEquipment.flatMap(expandToken));
  const requiredEquipment = getRequiredEquipment(exercise);
  const confirmedMappings = findConfirmedMappings(exercise, equipmentMappings);
  const matchedEquipment = [];
  const missingEquipment = [];

  for (const required of requiredEquipment) {
    const match = findMatchingAvailableEquipment(required, availableTokens);
    if (match) matchedEquipment.push(match);
    else missingEquipment.push(required);
  }

  const mappingEvidence = confirmedMappings.map((mapping) => (
    `equipment-map:${mapping.equipmentItemId ?? mapping.id ?? mapping.exerciseKey}`
  ));
  const allowed = !strictEquipment
    || requiredEquipment.length === 0
    || confirmedMappings.length > 0
    || missingEquipment.length === 0;
  const mediaStatus = getMediaStatus(exercise);
  const equipmentScore = allowed
    ? (confirmedMappings.length > 0 ? 100 : Math.max(20, matchedEquipment.length * 25))
    : 0;
  const mediaScore = mediaStatus === 'preview_video' ? 20 : mediaStatus === 'video' ? 12 : mediaStatus === 'poster' ? 6 : 0;

  return {
    allowed,
    requiredEquipment,
    matchedEquipment: unique([...matchedEquipment, ...mappingEvidence]),
    missingEquipment: allowed && confirmedMappings.length > 0 ? [] : unique(missingEquipment),
    mediaStatus,
    selectionReason: buildReason({
      strictEquipment,
      requiredEquipment,
      matchedEquipment: unique([...matchedEquipment, ...mappingEvidence]),
      confirmedMappings,
    }),
    scoreBreakdown: {
      equipment: equipmentScore,
      media: mediaScore,
      total: equipmentScore + mediaScore,
    },
  };
}

export function filterExercisesForStrictEquipment(exercises = [], context = {}) {
  const allowed = [];
  const rejected = [];
  const pool = Array.isArray(exercises) ? exercises : [];

  for (const exercise of pool) {
    const evidence = buildStrictEquipmentEvidence(exercise, context);
    const annotated = {
      ...exercise,
      equipmentEvidence: evidence.matchedEquipment,
      missingEquipment: evidence.missingEquipment,
      mediaStatus: evidence.mediaStatus,
      selectionReason: evidence.selectionReason,
      scoreBreakdown: evidence.scoreBreakdown,
    };

    if (evidence.allowed) allowed.push(annotated);
    else rejected.push(annotated);
  }

  return {
    allowed,
    rejected,
    strictEquipment: Boolean(context.strictEquipment),
    allowedCount: allowed.length,
    rejectedCount: rejected.length,
    missingEquipmentCounts: countMissingEquipment(rejected),
  };
}

export function summarizeBootcampSelectionEvidence(result, { requiredSlots = 0 } = {}) {
  if (!result?.strictEquipment) return null;
  const plannedSlots = Number.isFinite(Number(requiredSlots)) ? Number(requiredSlots) : 0;
  const hasShortage = plannedSlots > 0 && result.allowedCount < plannedSlots;
  const missingSummary = formatMissingEquipmentCounts(result.missingEquipmentCounts);
  const shortageMessage = hasShortage
    ? ` Only ${result.allowedCount} location-compatible exercises for ${plannedSlots} planned non-cardio slots.`
    : '';
  const missingMessage = missingSummary ? ` Missing most often: ${missingSummary}.` : '';

  return {
    type: hasShortage ? 'insufficient_equipment' : 'equipment',
    code: hasShortage ? 'insufficient_equipment' : 'equipment_profile_applied',
    severity: hasShortage ? 'warning' : 'info',
    allowedCount: result.allowedCount,
    rejectedCount: result.rejectedCount,
    requiredSlots: plannedSlots,
    missingEquipmentCounts: result.missingEquipmentCounts ?? {},
    message: `Strict equipment profile applied: ${result.allowedCount} location-compatible exercises kept; ${result.rejectedCount} unavailable-equipment candidates removed.${shortageMessage}${missingMessage}`,
  };
}
