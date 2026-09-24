import { Op } from 'sequelize';
import { getModel } from '../../models/index.mjs';
import {
  getLibraryAttributes,
  getLibraryWhere,
  formatLibraryExercise,
} from '../exerciseLibraryContract.mjs';

export const COACH_EXERCISE_READER_REASONS = Object.freeze({
  INVALID_QUERY: 'invalid_exercise_query',
  INVALID_LIMIT: 'invalid_exercise_limit',
  MODEL_UNAVAILABLE: 'exercise_model_unavailable',
  SCHEMA_UNAVAILABLE: 'exercise_schema_unavailable',
  ROWS_INVALID: 'exercise_rows_invalid',
  READER_UNAVAILABLE: 'exercise_reader_unavailable',
  PAYLOAD_LIMIT: 'exercise_payload_limit',
  REQUEST_CANCELLED: 'request_cancelled',
});

const MAX_QUERY_CODE_POINTS = 120;
const MAX_QUERY_BYTES = 480;
const MAX_LIMIT = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;

export class CoachExerciseLibraryReaderError extends Error {
  constructor(reasonCode, message = reasonCode) {
    super(message);
    this.name = 'CoachExerciseLibraryReaderError';
    this.reasonCode = reasonCode;
  }
}

function fail(reasonCode, message) {
  throw new CoachExerciseLibraryReaderError(reasonCode, message);
}

function isWellFormedUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function validateExerciseQuery(value) {
  if (typeof value !== 'string' || !isWellFormedUnicode(value) || CONTROL_PATTERN.test(value)) {
    return { ok: false, reasonCode: COACH_EXERCISE_READER_REASONS.INVALID_QUERY };
  }
  const query = value.trim();
  if (Array.from(query).length > MAX_QUERY_CODE_POINTS || Buffer.byteLength(query, 'utf8') > MAX_QUERY_BYTES) {
    return { ok: false, reasonCode: COACH_EXERCISE_READER_REASONS.INVALID_QUERY };
  }
  return { ok: true, query };
}

export function validateExerciseLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_LIMIT) {
    return { ok: false, reasonCode: COACH_EXERCISE_READER_REASONS.INVALID_LIMIT };
  }
  return { ok: true, limit: value };
}

function assertNotAborted(signal) {
  try {
    signal?.throwIfAborted();
  } catch (error) {
    fail(COACH_EXERCISE_READER_REASONS.REQUEST_CANCELLED, 'request_cancelled');
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonSafe(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(item => isJsonSafe(item, seen))
    : isPlainObject(value) && Object.values(value).every(item => isJsonSafe(item, seen));
  seen.delete(value);
  return valid;
}

// Validate the published library contract without changing its shared formatter.
// Legacy encoded lists and nullable optional values remain supported; arbitrary
// objects must not become metadata, "[object Object]", or a truthy boolean.
const TEXT_FIELDS = [
  'exerciseType', 'bodyPartCategory', 'source', 'description', 'instructions',
  'videoUrl', 'previewVideoUrl', 'imageUrl', 'thumbnailUrl', 'defaultTempo',
  'nasmMovementPattern', 'easyVariation', 'hardVariation', 'kneeMod', 'shoulderMod',
  'ankleMod', 'wristMod', 'backMod', 'elbowMod', 'footMod', 'hipMod',
];
const NUMBER_FIELDS = ['defaultRestSeconds', 'recommendedSets', 'recommendedReps', 'recommendedDuration', 'restInterval'];
const LIST_FIELDS = ['primaryMuscles', 'secondaryMuscles', 'equipmentNeeded', 'optPhases'];
function validListInput(value) {
  if (value == null || Array.isArray(value)) return true;
  if (typeof value !== 'string') return false;
  let decoded = value;
  for (let depth = 0; depth < 2 && typeof decoded === 'string'; depth++) {
    try { decoded = JSON.parse(decoded); } catch { break; }
  }
  return decoded === null || typeof decoded !== 'object' || Array.isArray(decoded);
}
function validRawPublishedFields(row) {
  if (!TEXT_FIELDS.every(key => row[key] == null || typeof row[key] === 'string')) return false;
  if (row.difficulty != null && (typeof row.difficulty !== 'number' || !Number.isFinite(row.difficulty))) return false;
  if (!NUMBER_FIELDS.every(key => row[key] == null || typeof row[key] === 'string' || (typeof row[key] === 'number' && Number.isFinite(row[key])))) return false;
  if (row.canBePerformedAtHome != null && typeof row.canBePerformedAtHome !== 'boolean') return false;
  return LIST_FIELDS.every(key => validListInput(row[key]));
}
function validPublishedFields(exercise) {
  if (!TEXT_FIELDS.every(key => exercise[key] === null || typeof exercise[key] === 'string')) return false;
  if (typeof exercise.difficulty !== 'number' || !Number.isFinite(exercise.difficulty)) return false;
  if (!NUMBER_FIELDS.every(key => exercise[key] === null || (typeof exercise[key] === 'number' && Number.isFinite(exercise[key])))) return false;
  if (typeof exercise.canBePerformedAtHome !== 'boolean') return false;
  if (!['primaryMuscles', 'secondaryMuscles', 'equipment', 'equipmentNeeded'].every(key =>
    Array.isArray(exercise[key]) && exercise[key].every(item => typeof item === 'string'))) return false;
  return Array.isArray(exercise.optPhases) && exercise.optPhases.every(item =>
    typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item)));
}

function validateRawExerciseRow(row) {
  if (!isPlainObject(row) || !isJsonSafe(row)) return false;
  if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)) return false;
  if (typeof row.name !== 'string' || !row.name.trim() || Array.from(row.name).length > 255) return false;
  if (typeof row.exercise_key !== 'string' || !row.exercise_key.trim() || Array.from(row.exercise_key).length > 255) return false;
  if (row.isActive !== true || !validRawPublishedFields(row)) return false;
  return true;
}

export function validateAndFormatExerciseRows(rows) {
  if (!Array.isArray(rows)) fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
  const formatted = [];
  for (const row of rows) {
    if (!validateRawExerciseRow(row)) fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
    let exercise;
    try {
      exercise = formatLibraryExercise(row);
      JSON.stringify(exercise);
    } catch {
      fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
    }
    if (!isPlainObject(exercise)
      || exercise.id !== row.id
      || exercise.name !== row.name
      || exercise.exerciseKey !== row.exercise_key
      || !isJsonSafe(exercise)
      || !validPublishedFields(exercise)) {
      fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
    }
    formatted.push(exercise);
  }
  return formatted;
}

function escapeLikeLiteral(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function validateModel(Exercise, sequelize) {
  if (!Exercise || typeof Exercise.findAll !== 'function' || Exercise.sequelize !== sequelize) {
    fail(COACH_EXERCISE_READER_REASONS.MODEL_UNAVAILABLE, 'exercise_model_unavailable');
  }
  if (!isPlainObject(Exercise.rawAttributes)) {
    fail(COACH_EXERCISE_READER_REASONS.SCHEMA_UNAVAILABLE, 'exercise_schema_unavailable');
  }
  for (const attribute of ['id', 'name', 'exercise_key', 'isActive']) {
    if (!Object.prototype.hasOwnProperty.call(Exercise.rawAttributes, attribute)) {
      fail(COACH_EXERCISE_READER_REASONS.SCHEMA_UNAVAILABLE, 'exercise_schema_unavailable');
    }
  }
}

export async function readCoachExerciseLibrary(
  sequelize,
  query,
  limit = MAX_LIMIT,
  { signal } = {},
) {
  const queryResult = validateExerciseQuery(query);
  if (!queryResult.ok) fail(queryResult.reasonCode, queryResult.reasonCode);
  const limitResult = validateExerciseLimit(limit);
  if (!limitResult.ok) fail(limitResult.reasonCode, limitResult.reasonCode);
  if (!queryResult.query) return [];

  assertNotAborted(signal);
  let Exercise;
  try {
    Exercise = getModel('Exercise');
  } catch {
    fail(COACH_EXERCISE_READER_REASONS.MODEL_UNAVAILABLE, 'exercise_model_unavailable');
  }
  validateModel(Exercise, sequelize);
  const attributes = [...new Set([...getLibraryAttributes(Exercise), 'isActive'])];
  const where = {
    ...getLibraryWhere(Exercise),
    name: { [Op.iLike]: `%${escapeLikeLiteral(queryResult.query)}%` },
  };
  assertNotAborted(signal);
  let rows;
  try {
    rows = await Exercise.findAll({
      attributes,
      where,
      order: [['name', 'ASC'], ['id', 'ASC']],
      limit: limitResult.limit,
      raw: true,
    });
  } catch {
    assertNotAborted(signal);
    fail(COACH_EXERCISE_READER_REASONS.READER_UNAVAILABLE, 'exercise_reader_unavailable');
  }
  assertNotAborted(signal);
  if (!Array.isArray(rows)) fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
  for (const row of rows) {
    if (!validateRawExerciseRow(row)) fail(COACH_EXERCISE_READER_REASONS.ROWS_INVALID, 'exercise_rows_invalid');
  }
  return rows;
}

export default readCoachExerciseLibrary;
