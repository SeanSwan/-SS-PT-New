/**
 * Equipment Scan V3 Support — census→detail split
 * ===============================================
 * Pure prompt builders, response schemas, and merge logic for the V3 scanner.
 * V2 failed on busy scenes because ONE generation carried detection AND full
 * enrichment under a small output cap; truncation collapsed multi-item scans
 * to the single-item caption fallback. V3 separates a compact CENSUS pass
 * (what is in the photo) from a text-only DETAIL pass (what each item is for),
 * so detection can never be starved by enrichment bloat.
 */
import { EQUIPMENT_CATEGORIES, RESISTANCE_TYPES } from './equipmentScanSupport.mjs';

export const EQUIPMENT_SCAN_V3_SCHEMA_VERSION = 'equipment_scan_v3';
export const EQUIPMENT_SCAN_V3_PROMPT_VERSION = 'equipment-census-detail-v1';
export const CENSUS_MAX_OUTPUT_TOKENS = 4096;
export const DETAIL_MAX_OUTPUT_TOKENS = 8192;
export const MAX_CENSUS_ITEMS = 12;

const MOVEMENT_PATTERN_VOCAB = ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core', 'rotation'];

export function buildEquipmentCensusPrompt({ retry = false } = {}) {
  const retryLine = retry
    ? 'This is a second-pass review. The first pass returned nothing usable; inspect the ENTIRE scene again, corner to corner, before returning an empty list.'
    : 'Answer the direct question: what workout equipment does this photo show across the WHOLE scene?';
  return `You are Swan Coach Vision, an expert fitness-equipment inventory assistant for a premium personal training platform.

${retryLine}

Goal: a fast, complete CENSUS of every clearly visible piece of workout or gym equipment — not just the dominant object. Completeness beats detail: shorter answers about MORE items are better than long answers about few.

Return ONLY valid JSON: { "imageQuality": "good"|"acceptable"|"poor", "sceneSummary": string (<=200 chars), "items": [...], "possibleItems": [...], "outOfScopeObjects": [string] }.
Each item: { "suggestedName": string, "category": one of ${JSON.stringify(EQUIPMENT_CATEGORIES)}, "equipmentKind": short token, "resistanceType": one of ${JSON.stringify(RESISTANCE_TYPES)}, "quantity": integer, "confidence": 0-1, "visibility": "clear"|"partial"|"inferred", "boundingBox": {"x":0-1,"y":0-1,"w":0-1,"h":0-1}, "alternateNames": [<=3 strings] }.

Rules:
- Detect up to ${MAX_CENSUS_ITEMS} visible equipment items. Sweep the full frame including edges and background.
- Do NOT include exercises, muscles, safety notes, or reasoning — a separate pass handles those. Census fields only.
- Do not identify people, logos, brands, clothing, mirrors, walls, lights, or non-training furniture as equipment.
- If multiple dumbbells sit on one rack, return one "Dumbbell Rack" item unless individual pairs are clearly countable and useful to inventory.
- A bench in front of a rack is TWO items when both are clearly visible.
- Use "possibleItems" for uncertain or partially obscured objects below 0.55 confidence.
- Use "items": [] only when no workout equipment is visible.`;
}

export function buildEquipmentDetailPrompt(censusItems) {
  const compact = censusItems.map((item) => ({
    id: item.clientTempId,
    name: item.suggestedName,
    category: item.category,
    kind: item.equipmentKind || undefined,
    resistanceType: item.resistanceType,
    quantity: item.quantity,
  }));
  return `You are Swan Coach, a NASM-protocol personal training expert. For each piece of equipment below, provide coaching enrichment.

Equipment inventory (JSON): ${JSON.stringify(compact)}

Return ONLY valid JSON: { "enrichments": [ { "id": string (echo the input id exactly), "suggestedExercises": [<=10 common exercise names], "movementPatterns": [subset of ${JSON.stringify(MOVEMENT_PATTERN_VOCAB)}], "targetMuscles": [<=10 muscle names], "safetyNotes": one practical sentence, "reasoning": one short sentence } ] }.

Rules:
- One enrichment object per input id. Never invent ids.
- Exercises must actually be performable with that equipment.
- Keep every string concise; no markdown.`;
}

function schemaUnsupported(SchemaType) {
  return !SchemaType || typeof SchemaType !== 'object' || !SchemaType.OBJECT;
}

export function buildCensusResponseSchema(SchemaType) {
  if (schemaUnsupported(SchemaType)) return undefined;
  const str = { type: SchemaType.STRING };
  const num = { type: SchemaType.NUMBER };
  const item = {
    type: SchemaType.OBJECT,
    properties: {
      suggestedName: str,
      category: str,
      equipmentKind: str,
      resistanceType: str,
      quantity: { type: SchemaType.INTEGER },
      confidence: num,
      visibility: str,
      boundingBox: { type: SchemaType.OBJECT, properties: { x: num, y: num, w: num, h: num } },
      alternateNames: { type: SchemaType.ARRAY, items: str },
    },
    required: ['suggestedName', 'category', 'confidence'],
  };
  return {
    type: SchemaType.OBJECT,
    properties: {
      imageQuality: str,
      sceneSummary: str,
      items: { type: SchemaType.ARRAY, items: item },
      possibleItems: { type: SchemaType.ARRAY, items: item },
      outOfScopeObjects: { type: SchemaType.ARRAY, items: str },
    },
    required: ['items'],
  };
}

export function buildDetailResponseSchema(SchemaType) {
  if (schemaUnsupported(SchemaType)) return undefined;
  const str = { type: SchemaType.STRING };
  const strArray = { type: SchemaType.ARRAY, items: str };
  return {
    type: SchemaType.OBJECT,
    properties: {
      enrichments: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: str,
            suggestedExercises: strArray,
            movementPatterns: strArray,
            targetMuscles: strArray,
            safetyNotes: str,
            reasoning: str,
          },
          required: ['id'],
        },
      },
    },
    required: ['enrichments'],
  };
}

function pickItemArray(source, keys) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

/** Tolerant extraction of the census shape from parsed model JSON. */
export function extractCensus(parsed) {
  const source = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    imageQuality: typeof source.imageQuality === 'string' ? source.imageQuality : 'acceptable',
    sceneSummary: typeof source.sceneSummary === 'string' ? source.sceneSummary : '',
    items: pickItemArray(source, ['items', 'equipmentItems', 'detectedItems', 'candidates']).slice(0, MAX_CENSUS_ITEMS),
    possibleItems: pickItemArray(source, ['possibleItems', 'uncertainItems', 'lowConfidenceItems']).slice(0, MAX_CENSUS_ITEMS),
    outOfScopeObjects: Array.isArray(source.outOfScopeObjects) ? source.outOfScopeObjects : [],
  };
}

/** Assign stable clientTempIds so detail enrichment can join back by id. */
export function assignCensusIds(census) {
  const withIds = (list, prefix) => list.map((item, index) => ({
    ...(item && typeof item === 'object' ? item : {}),
    clientTempId: typeof item?.clientTempId === 'string' && item.clientTempId
      ? item.clientTempId
      : `${prefix}${index + 1}`,
  }));
  return {
    ...census,
    items: withIds(census.items, 'item_'),
    possibleItems: withIds(census.possibleItems, 'possible_'),
  };
}

/** Index parsed detail enrichments by id. Unknown ids are dropped. */
export function indexDetailEnrichments(parsed, knownIds) {
  const list = Array.isArray(parsed?.enrichments) ? parsed.enrichments : [];
  const map = new Map();
  for (const entry of list) {
    if (entry && typeof entry === 'object' && typeof entry.id === 'string' && knownIds.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }
  return map;
}

const EMPTY_ENRICHMENT = Object.freeze({
  suggestedExercises: [], movementPatterns: [], targetMuscles: [], safetyNotes: '', reasoning: '',
});

/**
 * Merge census items with detail enrichments into the raw multi-item shape
 * consumed by normalizeRawScanItems/buildMultiScanResult. possibleItems stay
 * census-only by design (no detail tokens spent on sub-threshold objects).
 */
export function mergeCensusAndDetail(censusWithIds, enrichmentsById) {
  const enrich = (item) => {
    const found = enrichmentsById.get(item.clientTempId) || EMPTY_ENRICHMENT;
    return {
      ...item,
      suggestedExercises: Array.isArray(found.suggestedExercises) ? found.suggestedExercises : [],
      movementPatterns: Array.isArray(found.movementPatterns) ? found.movementPatterns : [],
      targetMuscles: Array.isArray(found.targetMuscles) ? found.targetMuscles : [],
      safetyNotes: typeof found.safetyNotes === 'string' ? found.safetyNotes : '',
      reasoning: typeof found.reasoning === 'string' ? found.reasoning : '',
      needsHumanReview: true,
    };
  };
  return {
    schemaVersion: EQUIPMENT_SCAN_V3_SCHEMA_VERSION,
    promptVersion: EQUIPMENT_SCAN_V3_PROMPT_VERSION,
    imageQuality: censusWithIds.imageQuality,
    sceneSummary: censusWithIds.sceneSummary,
    items: censusWithIds.items.map(enrich),
    possibleItems: censusWithIds.possibleItems.map((item) => ({ ...item, ...EMPTY_ENRICHMENT, needsHumanReview: true })),
    outOfScopeObjects: censusWithIds.outOfScopeObjects,
  };
}
