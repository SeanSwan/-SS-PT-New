/**
 * ============================================================================
 * FILE: bootcampTemplateRows.mjs — S06 / R-H01 / R-H02.
 *
 * PURPOSE: turn an admitted generated class into the exact database rows that
 *          `/api/bootcamp/save` writes. Extracted from the admission contract
 *          when that file reached the 300-line cap.
 *
 * INVARIANT: every builder starts from an explicit allowlist and then sets the
 * NOT NULL / enum columns explicitly. A caller-supplied `id`, `templateId`,
 * `trainerId`, `stationId` or `manifest` can therefore never survive into a
 * row, and can never redirect a write at a row the caller does not own.
 *
 * These builders assume admission already ran: value domains (enum members,
 * string widths, integer-ness) are enforced by validateGeneratedClass BEFORE
 * the first write, so a rejection here would mean the contract has a hole.
 * ============================================================================
 */

import { randomUUID } from 'node:crypto';
import {
  BootcampTemplatePersistenceError,
  OVERFLOW_STRATEGIES,
  normalizeExerciseLibraryId,
  optionalFinite,
  optionalNonNegative,
  optionalText,
  pickAllowlisted,
  resolveStretchName,
} from './bootcampTemplateRules.mjs';
import {
  EXERCISE_FIELDS,
  OVERFLOW_PLAN_FIELDS,
  STATION_FIELDS,
  STRETCH_FIELDS,
  TEMPLATE_FIELDS,
} from './bootcampTemplateFields.mjs';

/**
 * Resolve a referenced station's persisted id. Admission already proved the
 * index exists, so a miss means the created-station set came back short — an
 * internal persistence fault, not a bad request, so it is a 500-class error
 * with non-disclosing text (hostile review #8).
 */
function resolveStationId(stationIdByIndex, stationIndex) {
  const id = stationIdByIndex.get(stationIndex);
  if (id === undefined) throw new BootcampTemplatePersistenceError();
  return id;
}

export function buildTemplateRow(generatedClass, trainerId) {
  const picked = pickAllowlisted(generatedClass, TEMPLATE_FIELDS, ['trainerId', 'metadata']);
  return {
    ...picked,
    trainerId, // server-derived; a submitted trainerId is never trusted
    name: String(generatedClass.name).trim(),
    classFormat: String(generatedClass.classFormat).trim(),
    targetDurationMin: generatedClass.targetDuration,
    maxParticipants: generatedClass.expectedParticipants + 8,
    optimalParticipants: generatedClass.expectedParticipants,
    aiGenerated: generatedClass.aiGenerated === true,
    classStyle: generatedClass.classStyle ?? 'standard',
    intensityCategory: generatedClass.intensityCategory ?? null,
    rounds: generatedClass.rounds ?? null,
    exerciseDurationSec: generatedClass.exerciseDurationSec ?? null,
    includeStretch: generatedClass.includeStretch ?? true,
    stretchDurationMin: generatedClass.stretchDurationMin ?? 3,
    metadata: {
      explanations: generatedClass.explanations ?? null,
      relaxationSummary: generatedClass.relaxationSummary ?? null,
      // R-H20 (contract §6 line 266): the work-interval provenance must reach the
      // saved TEMPLATE, not only the Sprint slot. It was dropped here, because this
      // object is rebuilt from a literal and `metadata` is deliberately excluded
      // from the allowlist pick above — so a saved template carried no record of
      // what progression did to its prescribed intervals.
      //
      // Added CONDITIONALLY so the stored shape is unchanged for every class
      // generated without a modifier (which is all of them outside the Sprint path).
      ...(generatedClass.progression ? { progression: generatedClass.progression } : {}),
    },
  };
}

/**
 * @param ordinal The station's ORDINAL as admission computed it — its explicit
 *   stationIndex when declared, otherwise its array position. Required for the
 *   NOT NULL stationNumber/sortOrder pair, because the real generator emits
 *   stations with NEITHER an index nor those two columns.
 */
export function buildStationRow(station, templateId, ordinal) {
  const picked = pickAllowlisted(station, STATION_FIELDS);
  const resolvedOrdinal = Number.isSafeInteger(ordinal)
    ? ordinal
    : (Number.isSafeInteger(station.stationIndex) ? station.stationIndex : 0);
  return {
    ...picked,
    templateId,
    // bootcamp_stations.stationNumber and .sortOrder are NOT NULL with no
    // default. The station's ordinal IS the correct source for both. Found by
    // the real-PostgreSQL run: the allowlist alone dropped them and every
    // INSERT was rejected.
    stationNumber: Number.isSafeInteger(station.stationNumber)
      ? station.stationNumber
      : resolvedOrdinal,
    sortOrder: Number.isSafeInteger(station.sortOrder)
      ? station.sortOrder
      : resolvedOrdinal,
    stationName: optionalText(station.stationName),
    // The real equipment column. It was missing from the allowlist entirely, so
    // every station's equipment list was silently discarded on save.
    equipmentNeeded: optionalText(station.equipmentNeeded),
  };
}

export function buildExerciseRow(exercise, templateId, stationIdByIndex) {
  const picked = pickAllowlisted(exercise, EXERCISE_FIELDS);
  const stationIndex = exercise.stationIndex;
  return {
    ...picked,
    templateId,
    // Resolved from the NEW station records. Admission proved every referenced
    // index exists, so a MISS here means the created-station set came back short
    // — fail loudly. The previous `?? null` fallback silently demoted a station
    // exercise to a full-group row, which is defect (2) reopening through the
    // very code path that was supposed to close it (hostile-review BE-F7).
    stationId: stationIndex === undefined || stationIndex === null
      ? null
      : resolveStationId(stationIdByIndex, stationIndex),
    exerciseName: String(exercise.exerciseName).trim(),
    sourceExerciseName: optionalText(exercise.sourceExerciseName),
    durationSec: optionalNonNegative(exercise.durationSec, 'durationSec', null),
    restSec: optionalNonNegative(exercise.restSec, 'restSec', null),
    setupTimeSec: optionalNonNegative(exercise.setupTimeSec, 'setupTimeSec', 0),
    sortOrder: optionalFinite(exercise.sortOrder, 'sortOrder', 0),
    isCardioFinisher: exercise.isCardioFinisher === true,
    board: exercise.board ?? 'main',
    // Normalized, not merely allowlisted: a malformed library id is dropped
    // rather than persisted.
    exerciseLibraryId: normalizeExerciseLibraryId(exercise.exerciseLibraryId),
  };
}

export function buildStretchRow(stretch, templateId, index = 0) {
  const picked = pickAllowlisted(stretch, STRETCH_FIELDS);
  return {
    ...picked,
    templateId,
    // exerciseName is NOT NULL with no default; the generator spells it three
    // ways and both admission and this builder resolve it through the same
    // helper so they can never disagree.
    exerciseName: resolveStretchName(stretch),
    durationSec: optionalNonNegative(stretch.durationSec, 'stretch durationSec', 30),
    // sortOrder is NOT NULL with no default either.
    sortOrder: Number.isSafeInteger(stretch.sortOrder) ? stretch.sortOrder : index,
  };
}

export function buildOverflowRow(overflowPlan, templateId) {
  const picked = pickAllowlisted(overflowPlan, OVERFLOW_PLAN_FIELDS);
  return {
    ...picked,
    templateId,
    // Both are NOT NULL with no default; the previous allowlisted names did not
    // match real columns, so map the model's own fields with safe fallbacks.
    triggerCount: Number.isSafeInteger(overflowPlan.triggerCount)
      ? overflowPlan.triggerCount
      : Number.isSafeInteger(overflowPlan.bracket) ? overflowPlan.bracket : 0,
    // The column is a Postgres ENUM; falling back to an arbitrary submitted
    // string is rejected. Only a real enum member is accepted.
    strategy: OVERFLOW_STRATEGIES.includes(overflowPlan.strategy)
      ? overflowPlan.strategy
      : 'lap_rotation',
    notes: optionalText(overflowPlan.notes),
  };
}

/** Server-generated occurrence identity. A submitted one is never reused. */
export function createOccurrenceId() {
  return randomUUID();
}
export function buildSelectionManifestV1(persistedExerciseRows) {
  const rows = Array.isArray(persistedExerciseRows) ? persistedExerciseRows : [];
  return {
    version: 1,
    entries: rows.map((row) => ({
      exerciseRowId: row.id,
      occurrenceId: row.occurrenceId,
      exerciseName: row.exerciseName,
      stationId: row.stationId ?? null,
      verified: false,
    })),
  };
}
