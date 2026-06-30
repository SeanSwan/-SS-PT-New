/**
 * Equipment Scan V2 Support
 * =========================
 * Multi-item prompt, parser, normalization, and duplicate matching for the
 * equipment scanner. Kept separate from the legacy V1 support file so the
 * existing single-item contract remains small and stable.
 */
import {
  EQUIPMENT_CATEGORIES,
  RESISTANCE_TYPES,
} from './equipmentScanSupport.mjs';

export const EQUIPMENT_SCAN_V2_SCHEMA_VERSION = 'equipment_scan_v2';
export const EQUIPMENT_SCAN_V2_PROMPT_VERSION = 'equipment-multi-inventory-v1';

const VISIBILITY_LEVELS = ['clear', 'partial', 'inferred'];
const IMAGE_QUALITY_LEVELS = ['good', 'acceptable', 'poor'];

const CATEGORY_ALIASES = {
  dumbbells: 'dumbbell',
  dumbbell_rack: 'dumbbell',
  hex_dumbbells: 'dumbbell',
  free_weight: 'dumbbell',
  free_weights: 'dumbbell',
  weights: 'dumbbell',
  cable: 'cable_machine',
  cables: 'cable_machine',
  resistance_bands: 'resistance_band',
  band: 'resistance_band',
  bands: 'resistance_band',
  pullup_bar: 'pull_up_bar',
};

const RESISTANCE_ALIASES = {
  dumbbells: 'dumbbell',
  dumbbell_rack: 'dumbbell',
  free_weight: 'dumbbell',
  free_weights: 'dumbbell',
  weights: 'dumbbell',
  cables: 'cable',
  cable_machine: 'cable',
  bands: 'band',
  resistance_band: 'band',
  resistance_bands: 'band',
  selectorized: 'machine',
  plate_loaded: 'machine',
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCategory(value) {
  const token = normalizeToken(value);
  const aliased = CATEGORY_ALIASES[token] || token;
  return EQUIPMENT_CATEGORIES.includes(aliased) ? aliased : 'other';
}

function normalizeResistanceType(value) {
  const token = normalizeToken(value);
  const aliased = RESISTANCE_ALIASES[token] || token;
  return RESISTANCE_TYPES.includes(aliased) ? aliased : 'other';
}

function parseConfidence(value) {
  if (typeof value === 'number') return value > 1 ? value / 100 : value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    if (Number.isFinite(parsed)) return parsed > 1 ? parsed / 100 : parsed;
  }
  return undefined;
}

function normalizeStringArray(value, maxItems = 10, maxLength = 100) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength));
}

function tryParseAnyJson(candidate) {
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function extractBalancedJson(rawText) {
  for (let start = rawText.indexOf('{'); start !== -1; start = rawText.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < rawText.length; i++) {
      const ch = rawText[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const parsed = tryParseAnyJson(rawText.slice(start, i + 1));
          if (parsed) return parsed;
          break;
        }
      }
    }
  }
  return null;
}

function getFirstObject(value) {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
  }
  if (!value || typeof value !== 'object') return {};
  if (value.equipment && typeof value.equipment === 'object' && !Array.isArray(value.equipment)) return value.equipment;
  if (value.item && typeof value.item === 'object' && !Array.isArray(value.item)) return value.item;
  if (Array.isArray(value.items)) return getFirstObject(value.items);
  return value;
}

function findCandidateArray(source, keys) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  if (source?.equipment && typeof source.equipment === 'object') {
    for (const key of keys) {
      if (Array.isArray(source.equipment[key])) return source.equipment[key];
    }
  }
  return null;
}

function normalizeVisibility(value) {
  const token = normalizeToken(value);
  return VISIBILITY_LEVELS.includes(token) ? token : 'clear';
}

export function parseEquipmentScanResponseV2(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('AI returned empty response');
  }
  const trimmed = rawText.trim();
  const direct = tryParseAnyJson(trimmed);
  if (direct) return direct;
  const fenceMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of fenceMatches) {
    const parsed = tryParseAnyJson(match[1].trim());
    if (parsed) return parsed;
  }
  const balanced = extractBalancedJson(trimmed);
  if (balanced) return balanced;
  throw new Error('AI returned invalid JSON response');
}

export function buildEquipmentDedupeKey(candidate) {
  const explicit = normalizeToken(candidate?.dedupeKey);
  if (explicit) return explicit;
  const category = normalizeToken(candidate?.suggestedCategory || candidate?.category);
  const name = normalizeToken(candidate?.suggestedName || candidate?.name || candidate?.equipmentName);
  return [category, name].filter(Boolean).join('_') || 'unknown_equipment';
}

function normalizeRawScanCandidate(raw, index = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const name = source.suggestedName || source.name || source.equipmentName || source.equipment_name || source.label || source.object;
  const exercises = source.suggestedExercises || source.exercises || source.supportedExercises || source.commonExercises || [];
  const alternateNames = source.alternateNames || source.aliases || source.alternates || [];
  const quantity = Math.max(1, Math.min(99, Math.trunc(Number(source.quantity) || 1)));
  const normalized = {
    clientTempId: typeof source.clientTempId === 'string' ? source.clientTempId.slice(0, 60) : `item_${index + 1}`,
    suggestedName: typeof name === 'string' && name.trim() ? name.trim().slice(0, 150) : 'Unknown Equipment',
    suggestedCategory: normalizeCategory(source.category || source.suggestedCategory || source.equipmentCategory || source.type),
    category: normalizeCategory(source.category || source.suggestedCategory || source.equipmentCategory || source.type),
    equipmentKind: normalizeToken(source.equipmentKind || source.kind || source.subtype).slice(0, 80),
    resistanceType: normalizeResistanceType(source.resistanceType || source.resistance_type || source.resistance || source.type),
    quantity,
    confidence: parseConfidence(source.confidence ?? source.confidenceScore ?? source.confidence_score),
    visibility: normalizeVisibility(source.visibility),
    boundingBox: source.boundingBox || source.bounding_box || source.box || null,
    alternateNames: normalizeStringArray(alternateNames, 6, 100),
    suggestedExercises: normalizeStringArray(exercises, 10, 100),
    movementPatterns: normalizeStringArray(source.movementPatterns || source.patterns, 8, 60),
    targetMuscles: normalizeStringArray(source.targetMuscles || source.muscles, 10, 60),
    safetyNotes: typeof source.safetyNotes === 'string' ? source.safetyNotes.slice(0, 240) : '',
    needsHumanReview: source.needsHumanReview !== false,
    reasoning: typeof source.reasoning === 'string' ? source.reasoning.slice(0, 240) : '',
  };
  normalized.dedupeKey = buildEquipmentDedupeKey(source.dedupeKey ? source : normalized);
  return normalized;
}

export function normalizeRawScanItems(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const itemArray = Array.isArray(raw)
    ? raw
    : findCandidateArray(source, ['items', 'equipmentItems', 'detectedItems', 'candidates']);
  const possibleArray = findCandidateArray(source, ['possibleItems', 'uncertainItems', 'lowConfidenceItems']) || [];
  const fallbackItems = itemArray || (source && Object.keys(source).length > 0 ? [getFirstObject(source)] : []);
  return {
    schemaVersion: typeof source.schemaVersion === 'string' ? source.schemaVersion : EQUIPMENT_SCAN_V2_SCHEMA_VERSION,
    promptVersion: typeof source.promptVersion === 'string' ? source.promptVersion : EQUIPMENT_SCAN_V2_PROMPT_VERSION,
    imageQuality: IMAGE_QUALITY_LEVELS.includes(source.imageQuality) ? source.imageQuality : 'acceptable',
    sceneSummary: typeof source.sceneSummary === 'string' ? source.sceneSummary.slice(0, 300) : '',
    items: fallbackItems.slice(0, 12).map((item, index) => normalizeRawScanCandidate(item, index)),
    possibleItems: possibleArray.slice(0, 12).map((item, index) => normalizeRawScanCandidate(item, index)),
    outOfScopeObjects: normalizeStringArray(source.outOfScopeObjects, 20, 80),
    rawResponse: raw,
  };
}

export function matchExistingEquipment(candidate, existingItems = []) {
  const candidateKey = buildEquipmentDedupeKey(candidate);
  const candidateName = normalizeToken(candidate?.suggestedName || candidate?.name);
  const candidateCategory = normalizeCategory(candidate?.suggestedCategory || candidate?.category);
  for (const item of existingItems) {
    const itemName = normalizeToken(item?.trainerLabel || item?.name);
    const itemKey = buildEquipmentDedupeKey({ suggestedName: item?.trainerLabel || item?.name, category: item?.category });
    const categoryMatches = normalizeCategory(item?.category) === candidateCategory;
    if (itemKey === candidateKey || itemName === candidateKey || (categoryMatches && itemName && itemName === candidateName)) {
      const matchType = itemKey === candidateKey || itemName === candidateKey ? 'dedupe_key' : 'name_category';
      return { duplicateOfItemId: item.id, matchType };
    }
  }
  return null;
}

export function buildEquipmentScanPromptV2({ retry = false } = {}) {
  const retryLine = retry
    ? 'This is a second-pass review. The first pass found no reviewable items; inspect the full scene again before returning an empty list.'
    : 'Answer the direct question: what workout equipment is this photo showing across the whole scene?';
  return `You are Swan Coach Vision, an expert fitness-equipment inventory assistant for a premium personal training platform.

${retryLine}

Goal: identify EVERY clearly visible piece of workout or gym equipment in the image, not just the dominant object.

Return ONLY valid JSON with schemaVersion "${EQUIPMENT_SCAN_V2_SCHEMA_VERSION}", promptVersion "${EQUIPMENT_SCAN_V2_PROMPT_VERSION}", imageQuality, sceneSummary, items[], possibleItems[], and outOfScopeObjects[]. Each item needs suggestedName, category, equipmentKind, resistanceType, quantity, confidence, visibility, boundingBox, alternateNames, suggestedExercises, movementPatterns, targetMuscles, safetyNotes, dedupeKey, needsHumanReview, and reasoning.

Rules:
- Detect up to 12 visible equipment items.
- Include dumbbells, racks, benches, barbells, plates, kettlebells, cable machines, cardio machines, bands, mats, boxes, medicine balls, stability balls, TRX/suspension trainers, pull-up bars, sleds, battle ropes, and common selectorized machines.
- Do not identify people, logos, brands, clothing, mirrors, walls, lights, or non-training furniture as equipment.
- If multiple dumbbells are on one rack, return one item named "Dumbbell Rack" and set quantity to 1 unless individual dumbbell pairs are clearly countable and useful to inventory.
- If a bench is visible in front of a rack, return both "Weight Bench" and the rack/cage if each is clearly visible.
- If uncertain between two equipment types, choose the best generic label and include alternatives.
- Use "possibleItems" for uncertain or partially obscured objects below 0.55 confidence.
- Use "items": [] only when no workout equipment is visible.`;
}