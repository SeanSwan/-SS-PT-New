/**
 * Equipment Scan V2 Result Builder
 * ================================
 * Sanitizes Gemini multi-item scan candidates into the review-gated response
 * consumed by equipment routes and the legacy single-item wrapper.
 */
import {
  EQUIPMENT_CATEGORIES,
  RESISTANCE_TYPES,
  isUnknownEquipmentResult,
  normalizeRawScanResult,
} from './equipmentScanSupport.mjs';
import {
  EQUIPMENT_SCAN_V2_PROMPT_VERSION,
  EQUIPMENT_SCAN_V2_SCHEMA_VERSION,
  buildEquipmentDedupeKey,
  normalizeRawScanItems,
} from './equipmentScanV2Support.mjs';

const REVIEWABLE_CONFIDENCE = 0.55;

function validateBoundingBox(box) {
  if (!box || typeof box !== 'object') return null;
  const { x, y, w, h } = box;
  if ([x, y, w, h].some(v => typeof v !== 'number' || v < 0 || v > 1)) return null;
  return { x, y, w, h };
}

function clampConfidence(value, hasKnownName) {
  const fallbackConfidence = hasKnownName ? 0.65 : 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallbackConfidence;
  const normalized = Math.max(0, Math.min(1, value));
  return normalized > 0 || !hasKnownName ? normalized : fallbackConfidence;
}

function sanitizeStringArray(value, maxItems = 10, maxLength = 100) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength));
}

function toCandidateShape(raw) {
  if (raw?.suggestedName || raw?.suggestedCategory || raw?.equipmentKind || raw?.visibility) {
    return raw;
  }
  const normalized = normalizeRawScanResult(raw);
  return {
    suggestedName: normalized.name,
    suggestedCategory: normalized.category,
    category: normalized.category,
    resistanceType: normalized.resistanceType,
    description: normalized.description,
    confidence: normalized.confidence,
    boundingBox: normalized.boundingBox,
    suggestedExercises: normalized.suggestedExercises,
    quantity: 1,
    visibility: 'clear',
  };
}

export function sanitizeScanCandidate(raw) {
  const source = toCandidateShape(raw);
  const suggestedName = typeof source.suggestedName === 'string'
    ? source.suggestedName.slice(0, 150)
    : 'Unknown Equipment';
  const hasKnownName = suggestedName && !/^unknown/i.test(suggestedName);
  const suggestedCategory = EQUIPMENT_CATEGORIES.includes(source.suggestedCategory)
    ? source.suggestedCategory
    : EQUIPMENT_CATEGORIES.includes(source.category) ? source.category : 'other';
  const resistanceType = RESISTANCE_TYPES.includes(source.resistanceType)
    ? source.resistanceType
    : 'other';
  const quantity = Math.max(1, Math.min(99, Math.trunc(Number(source.quantity) || 1)));
  const visibility = ['clear', 'partial', 'inferred'].includes(source.visibility)
    ? source.visibility
    : 'clear';
  const result = {
    suggestedName,
    suggestedCategory,
    category: suggestedCategory,
    equipmentKind: typeof source.equipmentKind === 'string' ? source.equipmentKind.slice(0, 80) : '',
    resistanceType,
    description: typeof source.description === 'string' ? source.description.slice(0, 500) : '',
    quantity,
    confidence: clampConfidence(source.confidence, hasKnownName),
    visibility,
    boundingBox: validateBoundingBox(source.boundingBox),
    alternateNames: sanitizeStringArray(source.alternateNames, 6, 100),
    suggestedExercises: sanitizeStringArray(source.suggestedExercises, 10, 100),
    movementPatterns: sanitizeStringArray(source.movementPatterns, 8, 60),
    targetMuscles: sanitizeStringArray(source.targetMuscles, 10, 60),
    safetyNotes: typeof source.safetyNotes === 'string' ? source.safetyNotes.slice(0, 240) : '',
    needsHumanReview: source.needsHumanReview !== false,
    reasoning: typeof source.reasoning === 'string' ? source.reasoning.slice(0, 240) : '',
  };
  result.dedupeKey = buildEquipmentDedupeKey(source.dedupeKey ? source : result);
  return result;
}

export function sanitizeScanResult(raw) {
  return sanitizeScanCandidate(normalizeRawScanResult(raw));
}

function splitReviewableCandidates(normalized) {
  const items = [];
  const possibleItems = [];
  const seenKeys = new Set();

  normalized.items.map(sanitizeScanCandidate).forEach((candidate) => {
    if (isUnknownEquipmentResult(candidate)) return;
    const reviewable = candidate.confidence >= REVIEWABLE_CONFIDENCE && candidate.visibility !== 'inferred';
    const duplicateWithinScan = seenKeys.has(candidate.dedupeKey);
    if (reviewable && !duplicateWithinScan) {
      seenKeys.add(candidate.dedupeKey);
      items.push(candidate);
    } else {
      possibleItems.push({ ...candidate, duplicateWithinScan });
    }
  });

  normalized.possibleItems.map(sanitizeScanCandidate).forEach((candidate) => {
    if (!isUnknownEquipmentResult(candidate)) possibleItems.push(candidate);
  });

  return { items, possibleItems };
}

function highestConfidence(candidates) {
  return candidates.reduce((best, item) => (
    !best || item.confidence > best.confidence ? item : best
  ), null);
}

export function buildMultiScanResult(parsed, latencyMs, modelName) {
  const normalized = normalizeRawScanItems(parsed);
  const { items, possibleItems } = splitReviewableCandidates(normalized);
  return {
    schemaVersion: normalized.schemaVersion || EQUIPMENT_SCAN_V2_SCHEMA_VERSION,
    promptVersion: normalized.promptVersion || EQUIPMENT_SCAN_V2_PROMPT_VERSION,
    imageQuality: normalized.imageQuality,
    sceneSummary: normalized.sceneSummary,
    items,
    possibleItems,
    candidates: [...items, ...possibleItems],
    outOfScopeObjects: normalized.outOfScopeObjects,
    scanResult: highestConfidence(items),
    rawResponse: parsed,
    latencyMs,
    model: modelName,
  };
}

export function isReviewableMultiScan(scan) {
  return Boolean(scan?.scanResult) && Array.isArray(scan.items) && scan.items.length > 0;
}