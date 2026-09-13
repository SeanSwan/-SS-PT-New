/**
 * ============================================================================
 * FILE: bootcampTemplateFields.mjs — S06 / R-H01.
 *
 * PURPOSE: the explicit per-row write allowlists for `/api/bootcamp/save`.
 *          Kept in its own module so both the admission contract and the row
 *          builders can read them without importing each other.
 *
 * WHY STATION_FIELDS CHANGED (hostile-review finding BE-F3b): the previous list
 * named eight columns that do not exist on `bootcamp_stations`
 * (`stationIndex`, `stationType`, `format`, `durationMin`, `rounds`,
 * `equipmentRequired`, `spaceProfileId`, `board`) and MISSED the one real column
 * that carries station equipment, `equipmentNeeded`. Sequelize silently drops
 * unknown keys, so the invented names were inert — but the miss was not: every
 * station's equipment list was being thrown away on save. The list below is
 * every writable column of models/BootcampStation.mjs, and nothing else.
 *
 * `stationIndex` is deliberately absent: it is the generator's ordinal, not a
 * column, and buildStationRow reads it directly to fill the NOT NULL
 * stationNumber/sortOrder pair.
 * ============================================================================
 */

export const TEMPLATE_FIELDS = Object.freeze([
  'trainerId', 'name', 'classFormat', 'dayType', 'targetDurationMin',
  'maxParticipants', 'optimalParticipants', 'aiGenerated', 'classStyle',
  'intensityCategory', 'rounds', 'exerciseDurationSec', 'includeStretch',
  'stretchDurationMin', 'metadata',
]);

/** Every writable column of models/BootcampStation.mjs. */
export const STATION_FIELDS = Object.freeze([
  'templateId', 'stationNumber', 'stationName', 'equipmentNeeded',
  'setupTimeSec', 'notes', 'sortOrder',
]);

export const EXERCISE_FIELDS = Object.freeze([
  // `occurrenceId` is DELIBERATELY ABSENT. It is not a column: `occurrenceId`
  // appears in no Sequelize model and in no migration, so Sequelize silently
  // dropped it from every INSERT. Listing it here let a CLIENT-supplied
  // occurrenceId into the row object for no benefit. The save service still
  // generates one per exercise, but as a MANIFEST-ONLY key — see
  // bootcampTemplateSave.mjs. Making it durable needs a migration and is
  // recorded as an open finding, not silently assumed.
  'templateId', 'stationId', 'exerciseName', 'sourceExerciseName',
  'durationSec', 'restSec', 'sortOrder', 'isCardioFinisher', 'muscleTargets',
  'easyVariation', 'mediumVariation', 'hardVariation', 'kneeMod', 'shoulderMod',
  'ankleMod', 'wristMod', 'elbowMod', 'footMod', 'hipMod', 'backMod',
  'equipmentRequired', 'description', 'instructions', 'videoUrl',
  'previewVideoUrl', 'imageUrl', 'thumbnailUrl', 'board', 'setupTimeSec',
  'pyramidStartWeight', 'pyramidDrops', 'supersetOrder', 'supersetGroupId',
  'exerciseLibraryId',
]);

export const STRETCH_FIELDS = Object.freeze([
  // These are the REAL bootcamp_stretches columns. The earlier
  // stretchName/bodyPart/instructions/board guesses did not exist; the
  // real-PostgreSQL run rejected every insert until they were corrected.
  // `exerciseLibraryId` is deliberately ABSENT: bootcamp_stretches declares it
  // as INTEGER (model AND migration), while the bootcamp_exercises UUID
  // conversion migration covers only that table — writing a UUID here fails
  // AFTER the parent/station/exercise inserts (hostile-review finding F1).
  'templateId', 'exerciseName', 'targetMuscles', 'durationSec', 'sortOrder',
  'description',
]);

/** Real bootcamp_overflow_plans columns. The earlier bracket/capacity/
 * alternatives guesses did not exist; triggerCount and strategy are NOT NULL
 * and the real-PostgreSQL run rejected the insert until they were mapped. */
export const OVERFLOW_PLAN_FIELDS = Object.freeze([
  'templateId', 'triggerCount', 'strategy', 'lapExercises', 'lapDurationMin', 'notes',
]);
