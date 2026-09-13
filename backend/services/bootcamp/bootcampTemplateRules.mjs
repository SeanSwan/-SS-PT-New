/**
 * ============================================================================
 * FILE: bootcampTemplateRules.mjs — S06 / R-H01 / hostile-review finding BE-F3.
 *
 * PURPOSE: the shared validation vocabulary for `/api/bootcamp/save` — the two
 *          error types, the primitive guards, the allowlist picker, the id
 *          normalizers, and the REAL value domains of every column a save
 *          writes.
 *
 * WHY IT EXISTS: `bootcampTemplateContract.mjs` reached the 300-line cap, and
 * BE-F3 found that admission checked only SHAPE ("classFormat is a non-empty
 * string") and never VALUE. An unknown enum member or an over-length string
 * therefore passed admission and was rejected by PostgreSQL *mid-write*,
 * surfacing as a 500 carrying a driver message instead of a 400 with zero
 * rows written.
 *
 * Every domain table below is copied from the Sequelize model named beside it
 * and is locked against that model by bootcampTemplateDomainDrift.test.mjs, so
 * a model edit that is not mirrored here fails a test instead of leaking a 500.
 *
 * Errors never echo the submitted value back to the caller.
 * Pure: no I/O, no clock, no provider.
 * ============================================================================
 */

/** 400 — malformed structure, reference or value. Route maps this to 400. */
export class BootcampTemplateValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BootcampTemplateValidationError';
    this.status = 400;
    this.code = 'BOOTCAMP_TEMPLATE_INVALID';
  }
}

/** 403 — the caller may not use a profile they asked for. Non-disclosing text. */
export class BootcampTemplateAuthorityError extends Error {
  constructor(message = 'Requested profile is not available') {
    super(message);
    this.name = 'BootcampTemplateAuthorityError';
    this.status = 403;
    this.code = 'BOOTCAMP_PROFILE_DENIED';
  }
}

/** 500 — an internal persistence fault, reported non-disclosingly. */
export class BootcampTemplatePersistenceError extends Error {
  constructor(message = 'Failed to save the class') {
    super(message);
    this.name = 'BootcampTemplatePersistenceError';
    this.status = 500;
    this.code = 'BOOTCAMP_TEMPLATE_PERSIST_FAILED';
  }
}

/** PostgreSQL INTEGER bounds. A value outside these is a mid-write error. */
export const INT4_MIN = -2147483648;
export const INT4_MAX = 2147483647;

export const fail = (message) => { throw new BootcampTemplateValidationError(message); };

// ── Real value domains (rule 29 schema cross-check) ─────────────────────────

/** models/BootcampTemplate.mjs:8-16 — `classFormat` is ENUM(...these). */
export const CLASS_FORMATS = Object.freeze([
  '2x5_r4', '2x5_r3', '2x6_r3', '2x6_r2', '2x7_r3', '2x7_r2',
  '2x8_r3', '2x8_r2', '2x10_r2', '3x4_r3', '3x4_r2', '3x5_r2',
  '3x5_r3', '3x6_r2', '3x6_r1', '3x8_r1', '4x4_r2', '4x4_r1',
  '4x5_r2', '4x5_r1', '4x6_r1', '5x3_r2', '5x3_r1', '5x4_r1',
  'stations_4x', 'stations_3x5', 'stations_2x7', 'stations_3x4',
  'stations_5x3', 'full_group', 'circuit', 'emom', 'tabata', 'amrap',
  'partner', 'hybrid', 'custom',
]);

/** models/BootcampTemplate.mjs:18-21 — `classStyle` is ENUM(...these). */
export const CLASS_STYLES = Object.freeze([
  'standard', 'pyramid', 'superset', 'mixed', 'ladder', 'descending',
  'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density',
]);

/** models/BootcampTemplate.mjs:61 — `dayType` enum members. */
export const DAY_TYPES = Object.freeze([
  'lower_body', 'upper_body', 'cardio', 'full_body', 'custom',
]);

/** models/BootcampTemplate.mjs:112 — `intensityCategory` enum members. */
export const INTENSITY_CATEGORIES = Object.freeze([
  'high_impact', 'medium_impact', 'calisthenics', 'stability', 'flexibility', 'cardio',
]);

/** models/BootcampExercise.mjs:111 — `board` enum members. */
export const BOARDS = Object.freeze(['main', 'alternative', 'lowImpact']);

/** models/BootcampOverflowPlan.mjs:24 — `strategy` enum members. */
export const OVERFLOW_STRATEGIES = Object.freeze([
  'lap_rotation', 'split_groups', 'add_stations', 'condense',
]);

/** Real STRING(n) widths, so an over-long value is a 400 and never a 500. */
export const MAX_LENGTHS = Object.freeze({
  templateName: 200,      // bootcamp_templates.name STRING(200) NOT NULL
  stationName: 100,       // bootcamp_stations.stationName STRING(100)
  exerciseName: 100,      // bootcamp_exercises.exerciseName STRING(100) NOT NULL
  variation: 100,         // easy/medium/hardVariation + the *Mod columns
  muscleTargets: 200,     // bootcamp_exercises.muscleTargets is TEXT; capped so a
                          // client cannot post an unbounded blob through a JSON body
  stretchName: 100,       // bootcamp_stretches.exerciseName STRING(100) NOT NULL
  targetMuscles: 200,     // bootcamp_stretches.targetMuscles STRING(200)
  url: 500,               // video/previewVideo/image/thumbnailUrl STRING(500)
  pyramidStartWeight: 50, // bootcamp_exercises.pyramidStartWeight STRING(50)
});

/** Keys a caller may never supply, on any child row. */
export const FORBIDDEN_CHILD_KEYS = Object.freeze([
  'id', 'templateId', 'trainerId', 'stationId', 'manifest',
]);

// ── Primitive guards ────────────────────────────────────────────────────────

export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function requireFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be a finite number`);
  return value;
}

export function optionalFinite(value, label, fallback = null) {
  if (value === undefined || value === null) return fallback;
  return requireFinite(value, label);
}

export function optionalNonNegative(value, label, fallback = null) {
  const resolved = optionalFinite(value, label, fallback);
  if (resolved === null) return null;
  if (resolved < 0) fail(`${label} must not be negative`);
  return resolved;
}

export function optionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * A positive safe integer that also fits PostgreSQL INTEGER.
 * Number.isSafeInteger alone is NOT enough: 3e9 is a safe integer and an int4
 * overflow, so it would pass admission and fail mid-write (hostile review #3).
 */
export function requirePositiveInt(value, label) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive whole number`);
  }
  if (value > INT4_MAX) fail(`${label} must not exceed ${INT4_MAX}`);
  return value;
}

/** An INTEGER column: fractional, out-of-range and non-numeric all rejected. */
export function optionalInt(value, label, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    fail(`${label} must be a whole number`);
  }
  if (value < INT4_MIN || value > INT4_MAX) {
    fail(`${label} must be between ${INT4_MIN} and ${INT4_MAX}`);
  }
  return value;
}

export function optionalNonNegativeInt(value, label, fallback = null) {
  const resolved = optionalInt(value, label, fallback);
  if (resolved === null) return null;
  if (resolved < 0) fail(`${label} must not be negative`);
  return resolved;
}

// ── Domain guards ───────────────────────────────────────────────────────────

export function requireEnumMember(value, allowed, label) {
  if (typeof value === 'string' && allowed.includes(value)) return value;
  fail(`${label} must be one of: ${allowed.join(', ')}`);
  return null;
}

/**
 * A real enum member, or absent.
 *
 * `''` is NOT treated as absent (hostile review #2). It is a value the client
 * actually sent, it is not a member, and the row builders use `??` — which does
 * not catch an empty string — so admitting it wrote `''` into a real enum column
 * and failed MID-WRITE with a 500. Sequelize does not save you here either:
 * `Model.build({classStyle: ''}).validate()` passes.
 */
export function optionalEnumMember(value, allowed, label, fallback = null) {
  if (value === undefined || value === null) return fallback;
  return requireEnumMember(value, allowed, label);
}

/** A BOOLEAN column. `'maybe'` is truthy nonsense that PostgreSQL will reject. */
export function optionalBoolean(value, label, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') fail(`${label} must be true or false`);
  return value;
}

export function requireBoundedText(value, max, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length > max) fail(`${label} must be at most ${max} characters`);
  return trimmed;
}

export function optionalBoundedText(value, max, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') fail(`${label} must be text`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) fail(`${label} must be at most ${max} characters`);
  return trimmed;
}

// ── Id normalizers ──────────────────────────────────────────────────────────

export function requireTrainerId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^[1-9][0-9]*$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  fail('A valid trainer id is required');
  return null;
}

export function normalizeOptionalProfileId(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) fail('Profile id must be a positive integer');
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9][0-9]*$/.test(trimmed)) fail('Profile id must be a positive integer');
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) fail('Profile id must be a positive integer');
    return parsed;
  }
  fail('Profile id must be a positive integer');
  return null;
}

const EXERCISE_LIBRARY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A library id is persisted only when it is a well-formed UUID. */
export function normalizeExerciseLibraryId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return EXERCISE_LIBRARY_ID_PATTERN.test(trimmed) ? trimmed : null;
}

// ── Allowlist picker ────────────────────────────────────────────────────────

export function pickAllowlisted(source, fields, forbidden = FORBIDDEN_CHILD_KEYS) {
  const target = {};
  for (const key of fields) {
    if (forbidden.includes(key)) continue;
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * The generator spells a stretch's name three ways. Admission and row building
 * both resolve it through here so the two can never disagree about which name a
 * stretch actually has.
 */
export function resolveStretchName(stretch) {
  return optionalText(stretch.exerciseName)
    ?? optionalText(stretch.stretchName)
    ?? optionalText(stretch.name);
}
