/**
 * ============================================================================
 * FILE: bootcampTemplateContract.mjs — S06 / R-H01 / R-H02.
 * The admission contract for `/api/bootcamp/save`: the ONLY place that decides
 * what may enter the database.
 *
 * DEFECTS CLOSED: (1) `{ templateId, ...s }` spread the CLIENT-SUPPLIED station
 * object, so a submitted id/trainerId survived into the INSERT and could
 * redirect a write at a row the caller does not own — stretches and overflow
 * too. (2) `stationMap[ex.stationIndex]` was indexed with an unvalidated client
 * value, so an out-of-range index silently produced NULL, turning a station
 * exercise into a full-group exercise with no error. (3) No transaction.
 * (4) BE-F3: admission checked only SHAPE and never VALUE, so an unknown enum
 * member or an over-length string passed admission and was rejected by
 * PostgreSQL mid-write — a 500 carrying a driver message instead of a 400 with
 * zero rows written.
 *
 * The value domains live in bootcampTemplateRules.mjs and are locked against
 * the real Sequelize models by bootcampTemplateDomainDrift.test.mjs. The row
 * builders live in bootcampTemplateRows.mjs; both are re-exported below so every
 * existing import path still resolves from this file.
 * ============================================================================
 */

import {
  BOARDS,
  CLASS_FORMATS,
  CLASS_STYLES,
  DAY_TYPES,
  INT4_MAX,
  INTENSITY_CATEGORIES,
  MAX_LENGTHS,
  OVERFLOW_STRATEGIES,
  fail,
  isPlainObject,
  optionalBoolean,
  optionalBoundedText,
  optionalEnumMember,
  optionalInt,
  optionalNonNegativeInt,
  requireEnumMember,
  requireFinite,
  requirePositiveInt,
  resolveStretchName,
} from './bootcampTemplateRules.mjs';

export * from './bootcampTemplateRules.mjs';
export * from './bootcampTemplateFields.mjs';
export * from './bootcampTemplateRows.mjs';

/** Columns the exercise table declares as STRING(100). */
const VARIATION_FIELDS = Object.freeze([
  'easyVariation', 'mediumVariation', 'hardVariation', 'kneeMod', 'shoulderMod',
  'ankleMod', 'wristMod', 'elbowMod', 'footMod', 'hipMod', 'backMod',
  'equipmentRequired',
]);

/** Columns the exercise table declares as STRING(500). */
const URL_FIELDS = Object.freeze([
  'videoUrl', 'previewVideoUrl', 'imageUrl', 'thumbnailUrl',
]);

/** Template-column value domains. Shape errors keep their original wording. */
function validateTemplateDomains(generatedClass) {
  if (generatedClass.name.trim().length > MAX_LENGTHS.templateName) {
    fail(`name must be at most ${MAX_LENGTHS.templateName} characters`);
  }
  requireEnumMember(generatedClass.classFormat.trim(), CLASS_FORMATS, 'classFormat');
  optionalEnumMember(generatedClass.dayType, DAY_TYPES, 'dayType');
  optionalEnumMember(generatedClass.classStyle, CLASS_STYLES, 'classStyle');
  optionalEnumMember(generatedClass.intensityCategory, INTENSITY_CATEGORIES, 'intensityCategory');
  requirePositiveInt(generatedClass.targetDuration, 'targetDuration');
  // expectedParticipants is not written directly: buildTemplateRow derives
  // maxParticipants = expectedParticipants + 8, so the cap must leave room for
  // that addition or the DERIVED value is the one that overflows (review #3c).
  requirePositiveInt(generatedClass.expectedParticipants, 'expectedParticipants');
  if (generatedClass.expectedParticipants > INT4_MAX - 8) {
    fail(`expectedParticipants must not exceed ${INT4_MAX - 8}`);
  }
  optionalBoolean(generatedClass.aiGenerated, 'aiGenerated');
  optionalBoolean(generatedClass.includeStretch, 'includeStretch');
  optionalNonNegativeInt(generatedClass.stretchDurationMin, 'stretchDurationMin');
  optionalNonNegativeInt(generatedClass.rounds, 'rounds');
  optionalNonNegativeInt(generatedClass.exerciseDurationSec, 'exerciseDurationSec');
}

function validateExerciseDomains(exercise, position) {
  const at = `exercise at position ${position}`;
  if (exercise.exerciseName.trim().length > MAX_LENGTHS.exerciseName) {
    fail(`${at} exerciseName must be at most ${MAX_LENGTHS.exerciseName} characters`);
  }
  optionalBoundedText(exercise.sourceExerciseName, MAX_LENGTHS.exerciseName, `${at} sourceExerciseName`);
  for (const field of VARIATION_FIELDS) {
    optionalBoundedText(exercise[field], MAX_LENGTHS.variation, `${at} ${field}`);
  }
  for (const field of URL_FIELDS) {
    optionalBoundedText(exercise[field], MAX_LENGTHS.url, `${at} ${field}`);
  }
  optionalBoundedText(exercise.pyramidStartWeight, MAX_LENGTHS.pyramidStartWeight, `${at} pyramidStartWeight`);
  optionalEnumMember(exercise.board, BOARDS, `${at} board`);
  optionalBoolean(exercise.isCardioFinisher, `${at} isCardioFinisher`);
  optionalBoundedText(exercise.muscleTargets, MAX_LENGTHS.muscleTargets, `${at} muscleTargets`);
  optionalNonNegativeInt(exercise.durationSec, `${at} durationSec`);
  optionalNonNegativeInt(exercise.restSec, `${at} restSec`);
  optionalNonNegativeInt(exercise.setupTimeSec, `${at} setupTimeSec`);
  optionalInt(exercise.sortOrder, `${at} sortOrder`);
  optionalInt(exercise.pyramidDrops, `${at} pyramidDrops`);
  optionalInt(exercise.supersetOrder, `${at} supersetOrder`);
  optionalInt(exercise.supersetGroupId, `${at} supersetGroupId`);
}

function validateStretchDomains(stretch, position) {
  const at = `stretch at position ${position}`;
  const resolved = resolveStretchName(stretch);
  if (!resolved) fail(`${at} needs an exerciseName`);
  if (resolved.length > MAX_LENGTHS.stretchName) {
    fail(`${at} exerciseName must be at most ${MAX_LENGTHS.stretchName} characters`);
  }
  optionalBoundedText(stretch.targetMuscles, MAX_LENGTHS.targetMuscles, `${at} targetMuscles`);
  optionalNonNegativeInt(stretch.durationSec, `${at} durationSec`);
  optionalInt(stretch.sortOrder, `${at} sortOrder`);
}

function validateOverflowDomains(overflowPlan) {
  optionalNonNegativeInt(overflowPlan.triggerCount, 'overflowPlan triggerCount');
  optionalNonNegativeInt(overflowPlan.lapDurationMin, 'overflowPlan lapDurationMin');
  optionalEnumMember(overflowPlan.strategy, OVERFLOW_STRATEGIES, 'overflowPlan strategy');
}

export function validateGeneratedClass(generatedClass) {
  if (!isPlainObject(generatedClass)) fail('generatedClass must be an object');

  const stations = generatedClass.stations;
  const exercises = generatedClass.exercises;
  if (!Array.isArray(stations)) fail('stations must be an array');
  if (!Array.isArray(exercises)) fail('exercises must be an array');

  const stretches = generatedClass.stretches === undefined || generatedClass.stretches === null
    ? []
    : generatedClass.stretches;
  if (!Array.isArray(stretches)) fail('stretches must be an array');

  const overflowPlan = generatedClass.overflowPlan === undefined || generatedClass.overflowPlan === null
    ? null
    : generatedClass.overflowPlan;
  if (overflowPlan !== null && !isPlainObject(overflowPlan)) fail('overflowPlan must be an object');

  // Required bounded template fields.
  if (typeof generatedClass.name !== 'string' || !generatedClass.name.trim()) fail('name is required');
  if (typeof generatedClass.classFormat !== 'string' || !generatedClass.classFormat.trim()) fail('classFormat is required');
  requireFinite(generatedClass.targetDuration, 'targetDuration');
  requireFinite(generatedClass.expectedParticipants, 'expectedParticipants');
  validateTemplateDomains(generatedClass);

  // A station's ORDINAL is its explicit stationIndex when it declares one, and
  // its ARRAY POSITION otherwise.
  //
  // This distinction is load-bearing. The real generator
  // (bootcampGenerator.mjs → buildStationWorkout) emits stations carrying
  // stationNumber/stationName/equipmentNeeded/setupTimeSec/sortOrder but NO
  // stationIndex, while its exercises DO reference a station by ordinal. An
  // earlier revision REQUIRED an explicit stationIndex here, which rejected
  // every station-based class with a 400 — only `full_group` could be saved.
  // The ordinal is what exercises are validated against and what the
  // stationId map is keyed by.
  const stationOrdinals = [];
  const claimedIndexes = new Set();
  stations.forEach((station, position) => {
    if (!isPlainObject(station)) fail(`station at position ${position} must be an object`);
    const declared = station.stationIndex;
    if (declared !== undefined && declared !== null
      && (!Number.isSafeInteger(declared) || declared < 0)) {
      fail(`station at position ${position} has an invalid stationIndex`);
    }
    const ordinal = declared === undefined || declared === null ? position : declared;
    if (claimedIndexes.has(ordinal)) fail(`duplicate stationIndex ${ordinal}`);
    claimedIndexes.add(ordinal);
    stationOrdinals.push(ordinal);
    optionalBoundedText(station.stationName, MAX_LENGTHS.stationName, `station at position ${position} stationName`);
    optionalNonNegativeInt(station.setupTimeSec, `station at position ${position} setupTimeSec`);
    optionalInt(station.stationNumber, `station at position ${position} stationNumber`);
    optionalInt(station.sortOrder, `station at position ${position} sortOrder`);
  });

  // Every exercise must reference a station that will actually exist, or be an
  // explicit full-group row (null/undefined stationIndex).
  const occurrenceIds = new Set();
  exercises.forEach((exercise, position) => {
    if (!isPlainObject(exercise)) fail(`exercise at position ${position} must be an object`);
    if (typeof exercise.exerciseName !== 'string' || !exercise.exerciseName.trim()) {
      fail(`exercise at position ${position} needs an exerciseName`);
    }
    if (exercise.stationIndex !== undefined && exercise.stationIndex !== null) {
      if (!Number.isSafeInteger(exercise.stationIndex) || !claimedIndexes.has(exercise.stationIndex)) {
        fail(`exercise at position ${position} references an unknown stationIndex`);
      }
    }
    if (exercise.occurrenceId !== undefined && exercise.occurrenceId !== null) {
      // Hostile review #7: the value is deliberately NOT echoed. It is
      // client-controlled and uncapped, and the route returns this message
      // verbatim, so interpolating it reflected attacker input back out.
      const key = String(exercise.occurrenceId);
      if (occurrenceIds.has(key)) fail('duplicate occurrence reference');
      occurrenceIds.add(key);
    }
    validateExerciseDomains(exercise, position);
  });

  // HOSTILE-REVIEW FIX (F2): members were never validated, so `stretches:[null]`
  // passed admission and then threw a bare TypeError INSIDE the write path,
  // surfacing as a 500 instead of a 400 with zero writes.
  stretches.forEach((stretch, position) => {
    if (!isPlainObject(stretch)) fail(`stretch at position ${position} must be an object`);
    validateStretchDomains(stretch, position);
  });

  if (overflowPlan !== null) validateOverflowDomains(overflowPlan);

  return { stations, exercises, stretches, overflowPlan, stationOrdinals };
}
