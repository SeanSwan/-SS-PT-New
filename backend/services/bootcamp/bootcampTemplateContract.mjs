/**
 * Server-owned persistence contract for generated bootcamp templates.
 *
 * The generator may carry selection/provenance facts that are useful to a
 * trainer, but it is not allowed to choose database identities or foreign
 * keys. This module keeps the save path explicit and makes the metadata
 * envelope safe to round-trip without adding a schema migration.
 */

import { randomUUID } from 'node:crypto';

const POSITIVE_INTEGER = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOARD_VALUES = new Set(['main', 'alternative', 'lowImpact']);
const REASON_CODES = new Set([
  'original',
  'requested_region_mod',
  'board_alternative',
  'low_impact_alternative',
]);

export const normalizePositiveInteger = (value, fallback = null) => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && POSITIVE_INTEGER.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return fallback;
};

export const normalizeNonNegativeInteger = (value, fallback = null) => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return fallback;
};

export const nullableText = (value, maxLength = null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

export const normalizeExerciseLibraryId = (value) => {
  const normalized = nullableText(value);
  return normalized && UUID.test(normalized) ? normalized : null;
};

export const normalizeBoard = (value, fallback = 'main') => (
  BOARD_VALUES.has(value) ? value : fallback
);

const normalizedStringArray = (value, maxItems = 20, maxLength = 100) => (
  Array.isArray(value)
    ? value
      .filter(item => typeof item === 'string')
      .map(item => nullableText(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems)
    : []
);

const sourceMetadata = (exercise) => {
  const sourceName = nullableText(exercise.sourceExerciseName ?? exercise.exerciseName, 100);
  return {
    exerciseKey: nullableText(
      exercise.sourceExerciseKey ?? exercise.sourceKey ?? exercise.exerciseKey,
      150,
    ),
    libraryId: normalizeExerciseLibraryId(exercise.sourceExerciseLibraryId),
    name: sourceName ?? 'Unnamed exercise',
  };
};

export const selectionManifestEntry = (exercise) => {
  const sourceName = nullableText(exercise.sourceExerciseName, 100);
  const performedName = nullableText(exercise.exerciseName, 100) ?? 'Unnamed exercise';
  const isReplacement = Boolean(sourceName && sourceName !== performedName);
  const reasonCode = REASON_CODES.has(exercise.selectionReason)
    ? exercise.selectionReason
    : normalizeBoard(exercise.board) === 'lowImpact'
      ? 'low_impact_alternative'
      : normalizeBoard(exercise.board) === 'alternative'
        ? 'board_alternative'
        : 'original';
  const entry = {
    recordKey: randomUUID(),
    source: sourceMetadata(exercise),
    replacement: isReplacement ? {
      exerciseKey: nullableText(exercise.canonicalExerciseKey, 150),
      libraryId: normalizeExerciseLibraryId(exercise.exerciseLibraryId),
      name: performedName,
    } : null,
    resolution: isReplacement ? 'unverified_replacement' : 'original',
    requestedRegion: nullableText(exercise.requestedRegion, 100),
    detailsVerified: false,
    reasonCode,
  };
  const selectionRung = nullableText(exercise.selectionRung, 50);
  const canonicalExerciseKey = nullableText(exercise.canonicalExerciseKey, 150);
  const chips = normalizedStringArray(exercise.selectionChips);
  const painCaution = nullableText(exercise.painCaution, 300);
  const painSwap = nullableText(exercise.painSwap, 100);

  if (selectionRung) entry.selectionRung = selectionRung;
  if (canonicalExerciseKey) entry.canonicalExerciseKey = canonicalExerciseKey;
  if (chips.length > 0) entry.chips = chips;
  if (painCaution) entry.painCaution = painCaution;
  if (painSwap) entry.painSwap = painSwap;
  return entry;
};

export const emptySelectionManifest = () => ({ version: 1, entries: {} });

export const appendSelectionManifestEntries = (manifest, inputExercises, persistedExercises) => {
  const entries = manifest.entries ?? (manifest.entries = {});
  for (let index = 0; index < (persistedExercises ?? []).length; index += 1) {
    const persisted = persistedExercises[index];
    const persistedId = persisted?.id ?? persisted?.get?.('id');
    if (persistedId == null) continue;
    entries[String(persistedId)] = selectionManifestEntry(inputExercises[index] ?? {});
  }
  return manifest;
};

export const stationRecord = (station, index, templateId) => ({
  templateId,
  stationNumber: normalizePositiveInteger(station.stationNumber ?? (station.stationIndex != null ? Number(station.stationIndex) + 1 : index + 1), index + 1),
  stationName: nullableText(station.stationName ?? station.name, 100),
  equipmentNeeded: nullableText(station.equipmentNeeded, 2000),
  setupTimeSec: normalizeNonNegativeInteger(station.setupTimeSec, 0),
  notes: nullableText(station.notes, 2000),
  sortOrder: normalizeNonNegativeInteger(station.sortOrder, index),
  // Compatibility aliases are consumed by the guarded audit fixture only;
  // Sequelize ignores them for the production model with canonical columns.
  ...(station.stationIndex != null ? { stationIndex: normalizeNonNegativeInteger(station.stationIndex) } : {}),
  ...(station.name != null ? { name: nullableText(station.name, 100) } : {}),
});

export const exerciseRecord = (exercise, templateId, stationId) => ({
  templateId,
  stationId: stationId ?? null,
  exerciseName: nullableText(exercise.exerciseName, 100) ?? 'Unnamed exercise',
  sourceExerciseName: nullableText(exercise.sourceExerciseName, 100),
  durationSec: normalizeNonNegativeInteger(exercise.durationSec, 35),
  restSec: normalizeNonNegativeInteger(exercise.restSec, 0),
  sortOrder: normalizeNonNegativeInteger(exercise.sortOrder, 0),
  isCardioFinisher: exercise.isCardioFinisher === true,
  muscleTargets: nullableText(exercise.muscleTargets, 2000),
  easyVariation: nullableText(exercise.easyVariation, 100),
  mediumVariation: nullableText(exercise.mediumVariation, 100),
  hardVariation: nullableText(exercise.hardVariation, 100),
  kneeMod: nullableText(exercise.kneeMod, 100),
  shoulderMod: nullableText(exercise.shoulderMod, 100),
  ankleMod: nullableText(exercise.ankleMod, 100),
  wristMod: nullableText(exercise.wristMod, 100),
  elbowMod: nullableText(exercise.elbowMod, 100),
  footMod: nullableText(exercise.footMod, 100),
  hipMod: nullableText(exercise.hipMod, 100),
  backMod: nullableText(exercise.backMod, 100),
  equipmentRequired: nullableText(exercise.equipmentRequired, 100),
  description: nullableText(exercise.description),
  instructions: nullableText(exercise.instructions),
  videoUrl: nullableText(exercise.videoUrl, 500),
  previewVideoUrl: nullableText(exercise.previewVideoUrl, 500),
  imageUrl: nullableText(exercise.imageUrl, 500),
  thumbnailUrl: nullableText(exercise.thumbnailUrl, 500),
  notes: nullableText(exercise.notes, 2000),
  board: normalizeBoard(exercise.board),
  setupTimeSec: normalizeNonNegativeInteger(exercise.setupTimeSec, 0),
  pyramidStartWeight: nullableText(exercise.pyramidStartWeight, 50),
  pyramidDrops: normalizeNonNegativeInteger(exercise.pyramidDrops),
  supersetOrder: normalizeNonNegativeInteger(exercise.supersetOrder),
  supersetGroupId: normalizePositiveInteger(exercise.supersetGroupId),
  exerciseLibraryId: normalizeExerciseLibraryId(exercise.exerciseLibraryId),
});

export const stretchRecord = (stretch, templateId) => ({
  templateId,
  exerciseName: nullableText(stretch.exerciseName ?? stretch.stretchName, 100) ?? 'Unnamed stretch',
  targetMuscles: nullableText(stretch.targetMuscles, 200),
  durationSec: normalizeNonNegativeInteger(stretch.durationSec, 30),
  sortOrder: normalizeNonNegativeInteger(stretch.sortOrder, 0),
  description: nullableText(stretch.description),
  exerciseLibraryId: normalizePositiveInteger(stretch.exerciseLibraryId),
  ...(stretch.stretchName != null ? { stretchName: nullableText(stretch.stretchName, 100) } : {}),
});

export const overflowRecord = (overflowPlan, templateId) => ({
  templateId,
  triggerCount: normalizeNonNegativeInteger(overflowPlan.triggerCount, 0),
  strategy: nullableText(overflowPlan.strategy, 50) ?? 'lap_rotation',
  lapExercises: Array.isArray(overflowPlan.lapExercises) ? overflowPlan.lapExercises : [],
  lapDurationMin: normalizeNonNegativeInteger(overflowPlan.lapDurationMin, 4),
  notes: nullableText(overflowPlan.notes, 2000),
  ...(overflowPlan.exerciseName != null ? { exerciseName: nullableText(overflowPlan.exerciseName, 100) } : {}),
  ...(overflowPlan.durationSec != null ? { durationSec: normalizeNonNegativeInteger(overflowPlan.durationSec, 0) } : {}),
  ...(overflowPlan.board != null ? { board: normalizeBoard(overflowPlan.board) } : {}),
});
