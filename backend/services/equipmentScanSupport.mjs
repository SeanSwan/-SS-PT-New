/**
 * Equipment Scan Support
 * ======================
 * Shared prompt, parser, and normalization helpers for Gemini-powered
 * equipment photo recognition.
 *
 * Runtime flow:
 *   equipmentScanService -> buildEquipmentScanPrompt -> Gemini vision request
 *   -> parseEquipmentScanResponse -> normalizeRawScanResult -> EquipmentItem
 *
 * Safety notes:
 *   - No user PII is embedded in prompts.
 *   - Images are passed directly to Gemini by the calling service.
 *   - Unknown is reserved for images with no visible fitness equipment.
 */

export const EQUIPMENT_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  // 4B.1 completion (P0.3e): lacrosse_ball is in the MODEL validate list but
  // was missing here — AI-scanned lacrosse balls coerced to 'other'.
  'lacrosse_ball',
  'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
];

export const RESISTANCE_TYPES = [
  'bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine', 'kettlebell', 'other'
];

export const DEFAULT_EQUIPMENT_SCAN_MODEL = 'gemini-2.5-flash';

export const RETIRED_EQUIPMENT_SCAN_MODELS = new Set([
  'gemini-2.0-flash',
  'models/gemini-2.0-flash',
]);

const CATEGORY_ALIASES = {
  dumbbells: 'dumbbell',
  dumbbell_rack: 'dumbbell',
  hex_dumbbells: 'dumbbell',
  free_weight: 'dumbbell',
  free_weights: 'dumbbell',
  weights: 'dumbbell',
  cable: 'cable_machine',
  cables: 'cable_machine',
  cable_machine: 'cable_machine',
  resistance_bands: 'resistance_band',
  band: 'resistance_band',
  bands: 'resistance_band',
  pullup_bar: 'pull_up_bar',
  pull_up: 'pull_up_bar',
  medicine_balls: 'medicine_ball',
  stability_balls: 'stability_ball',
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

function getFirstObject(value) {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
  }
  if (!value || typeof value !== 'object') return {};
  if (value.equipment && typeof value.equipment === 'object' && !Array.isArray(value.equipment)) {
    return value.equipment;
  }
  if (value.item && typeof value.item === 'object' && !Array.isArray(value.item)) {
    return value.item;
  }
  if (Array.isArray(value.items)) {
    return getFirstObject(value.items);
  }
  return value;
}

function tryParseScanJson(candidate) {
  try {
    return getFirstObject(JSON.parse(candidate));
  } catch {
    return null;
  }
}

function extractBalancedJsonObject(rawText) {
  for (let start = rawText.indexOf('{'); start !== -1; start = rawText.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < rawText.length; i++) {
      const ch = rawText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const parsed = tryParseScanJson(rawText.slice(start, i + 1));
          if (parsed) return parsed;
          break;
        }
      }
    }
  }
  return null;
}

export function parseEquipmentScanResponse(rawText) {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('AI returned empty response');
  }

  const trimmed = rawText.trim();
  const direct = tryParseScanJson(trimmed);
  if (direct) return direct;

  const fenceMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of fenceMatches) {
    const parsed = tryParseScanJson(match[1].trim());
    if (parsed) return parsed;
  }

  const balanced = extractBalancedJsonObject(trimmed);
  if (balanced) return balanced;

  throw new Error('AI returned invalid JSON response');
}

export function normalizeRawScanResult(raw) {
  const source = getFirstObject(raw);
  const exercises = source.suggestedExercises
    || source.exercises
    || source.supportedExercises
    || source.commonExercises
    || [];

  return {
    name: source.name || source.equipmentName || source.equipment_name || source.label || source.object,
    category: normalizeCategory(source.category || source.equipmentCategory || source.equipment_type || source.type),
    resistanceType: normalizeResistanceType(source.resistanceType || source.resistance_type || source.resistance || source.type),
    description: source.description || source.summary || source.use || '',
    confidence: parseConfidence(source.confidence ?? source.confidenceScore ?? source.confidence_score),
    boundingBox: source.boundingBox || source.bounding_box || source.box || null,
    suggestedExercises: Array.isArray(exercises) ? exercises : [],
  };
}

export function isUnknownEquipmentResult(result) {
  const name = String(result?.suggestedName || result?.name || '').trim().toLowerCase();
  return !name
    || name === 'unknown'
    || name === 'unknown equipment'
    || name.includes('unidentified')
    || name.includes('not visible')
    || name.includes('no fitness equipment');
}

export function buildEquipmentScanPrompt({ retry = false } = {}) {
  const retryLine = retry
    ? 'This is a second-pass review. The first pass returned Unknown; inspect the visible equipment again before using Unknown.'
    : 'Answer the direct question: what workout equipment is this?';

  return `You are Swan Coach Vision, an expert fitness equipment identifier for a personal training platform.

${retryLine}

Return a JSON object with these exact fields:
{
  "name": "Equipment name",
  "category": "One of: ${EQUIPMENT_CATEGORIES.join(', ')}",
  "resistanceType": "One of: ${RESISTANCE_TYPES.join(', ')}",
  "description": "Brief description of what this equipment is used for",
  "confidence": 0.0 to 1.0,
  "boundingBox": { "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0 },
  "suggestedExercises": ["exercise1", "exercise2", "exercise3"]
}

Recognition rules:
- If the image shows multiple dumbbells or hex dumbbells on a storage rack, identify it as "Dumbbell Rack" or "Hex Dumbbells on Rack"; category "dumbbell"; resistanceType "dumbbell".
- If dumbbells are visible but the rack is dominant, still classify by the usable training equipment: category "dumbbell".
- If multiple pieces are visible, identify the primary/largest usable workout equipment.
- If the exact model is uncertain, give the best general gym-equipment name with moderate confidence instead of Unknown.
- Use "Unknown" only when no fitness or gym equipment is visible.
- Return ONLY valid JSON, no markdown or explanation.`;
}
