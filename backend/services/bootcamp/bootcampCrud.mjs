/**
 * ============================================================================
 * FILE: bootcampCrud.mjs
 * PURPOSE: CRUD operations for bootcamp templates, class logs, space profiles, trends
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import {
  getBootcampTemplate,
  getBootcampStation,
  getBootcampExercise,
  getBootcampOverflowPlan,
  getBootcampClassLog,
  getBootcampSpaceProfile,
  getBootcampStretch,
  getExerciseTrend,
  getExercise,
  getEquipmentProfile,
} from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import { REPLACEMENT_DETAIL_FIELDS, unverifiedReplacement } from './bootcampSubstitutionContract.mjs';
import {
  appendSelectionManifestEntries,
  emptySelectionManifest,
  exerciseRecord,
  normalizeNonNegativeInteger,
  normalizeExerciseLibraryId,
  normalizePositiveInteger,
  overflowRecord,
  stationRecord,
  stretchRecord,
} from './bootcampTemplateContract.mjs';

const LIVE_EXERCISE_FIELDS = ['videoUrl', 'previewVideoUrl', 'thumbnailUrl', 'imageUrl', 'description', 'instructions'];

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getRecordValue(record, key) {
  if (!record) return undefined;
  if (typeof record.get === 'function') return record.get(key);
  return record[key];
}

function setRecordValue(record, key, value) {
  if (typeof record?.setDataValue === 'function') {
    record.setDataValue(key, value);
    return;
  }
  if (record) record[key] = value;
}

function arrayValue(record, key) {
  const value = getRecordValue(record, key);
  return Array.isArray(value) ? value : [];
}

function persistedId(record) {
  return getRecordValue(record, 'id') ?? record?.id;
}

function stationInputIndex(station, index) {
  if (station?.stationIndex != null) return Number(station.stationIndex);
  if (station?.stationNumber != null) return Number(station.stationNumber) - 1;
  return index;
}

function assertValidExerciseReferences(stations, exercises) {
  const stationIndexes = new Set(stations.map((station, index) => stationInputIndex(station, index)));
  for (const exercise of exercises) {
    if (exercise?.stationIndex == null) continue;
    const stationIndex = Number(exercise.stationIndex);
    if (!Number.isInteger(stationIndex) || !stationIndexes.has(stationIndex)) {
      throw new Error('Invalid bootcamp exercise station reference');
    }
  }
}

function dedupeTemplateExerciseCollections(templates) {
  for (const template of templates ?? []) {
    const stationExerciseIds = new Set(
      arrayValue(template, 'stations')
        .flatMap(station => arrayValue(station, 'exercises'))
        .map(persistedId)
        .filter(id => id != null)
        .map(String)
    );
    const rootExercises = arrayValue(template, 'exercises');
    if (stationExerciseIds.size > 0 && rootExercises.length > 0) {
      setRecordValue(
        template,
        'exercises',
        rootExercises.filter(exercise => !stationExerciseIds.has(String(persistedId(exercise))))
      );
    }
  }
  return templates;
}

function collectTemplateExerciseRows(templates) {
  const rows = [];
  for (const template of templates ?? []) {
    rows.push(...arrayValue(template, 'exercises'));
    for (const station of arrayValue(template, 'stations')) {
      rows.push(...arrayValue(station, 'exercises'));
    }
  }
  return rows;
}

async function loadLiveExercises(exerciseIds) {
  const Exercise = getExercise();
  if (!Exercise || exerciseIds.length === 0) return [];
  return Exercise.findAll({
    where: { id: exerciseIds },
    attributes: ['id', ...LIVE_EXERCISE_FIELDS],
    raw: true,
  });
}

export async function hydrateTemplateExerciseMedia(templates, exerciseLoader = loadLiveExercises) {
  for (const template of templates ?? []) {
    const entries = getRecordValue(template, 'metadata')?.selectionManifestV1?.entries ?? {};
    for (const row of collectTemplateExerciseRows([template])) {
      const entry = entries[String(persistedId(row))];
      if (entry) {
        setRecordValue(row, 'selectionProvenance', entry);
        setRecordValue(row, 'exerciseKey', entry.canonicalExerciseKey ?? entry.source?.exerciseKey ?? null);
        for (const [target, source] of [['selectionChips', 'chips'], ['selectionRung', 'selectionRung'], ['painSwap', 'painSwap'], ['painCaution', 'painCaution']]) {
          if (entry[source] !== undefined) setRecordValue(row, target, entry[source]);
        }
      }
      const sourceName = getRecordValue(row, 'sourceExerciseName');
      if (entry?.resolution === 'unverified_replacement'
        || (sourceName && sourceName !== getRecordValue(row, 'exerciseName') && entry?.resolution !== 'verified_replacement')) {
        for (const field of REPLACEMENT_DETAIL_FIELDS) setRecordValue(row, field, null);
        setRecordValue(row, 'detailsVerified', false);
        setRecordValue(row, 'resolution', 'unverified_replacement');
      }
    }
  }
  const exerciseRows = collectTemplateExerciseRows(templates);
  const exerciseIds = [...new Set(
    exerciseRows
      .map(row => normalizeExerciseLibraryId(getRecordValue(row, 'exerciseLibraryId')))
      .filter(Boolean)
  )];

  if (exerciseIds.length === 0) return templates;

  const liveRows = await exerciseLoader(exerciseIds);
  const liveById = new Map(
    (liveRows ?? [])
      .map(row => [normalizeExerciseLibraryId(row.id), row])
      .filter(([id]) => Boolean(id))
  );

  for (const exercise of exerciseRows) {
    const exerciseLibraryId = normalizeExerciseLibraryId(getRecordValue(exercise, 'exerciseLibraryId'));
    const liveExercise = liveById.get(exerciseLibraryId);
    if (!liveExercise) continue;

    for (const field of LIVE_EXERCISE_FIELDS) {
      const liveValue = nullableText(liveExercise[field]);
      if (liveValue) setRecordValue(exercise, field, liveValue);
    }
  }

  return templates;
}

// ── Save Generated Class to Database ──────────────────────────────────

export async function saveBootcampTemplate(generatedClass, trainerId, { transaction: callerTransaction, requesterRole } = {}) {
  const Template = getBootcampTemplate();
  const Station = getBootcampStation();
  const Exercise = getBootcampExercise();
  const Overflow = getBootcampOverflowPlan();
  const Stretch = getBootcampStretch();

  const save = async (transaction) => {
    const stations = Array.isArray(generatedClass?.stations) ? generatedClass.stations : [];
    const exercises = Array.isArray(generatedClass?.exercises) ? generatedClass.exercises : [];
    const stretches = Array.isArray(generatedClass?.stretches) ? generatedClass.stretches : [];
    assertValidExerciseReferences(stations, exercises);
    for (const [key, Model] of [['equipmentProfileId', getEquipmentProfile], ['spaceProfileId', getBootcampSpaceProfile]]) {
      if (generatedClass[key] == null) continue;
      const id = normalizePositiveInteger(generatedClass[key]);
      const profile = id && await Model().findOne({ where: { id }, transaction, lock: transaction.LOCK.UPDATE });
      // Mirrors assertProfileAccess() in bootcampGenerator: ownership is
      // required unless the requester is an admin, who retains the intentional
      // cross-owner bypass the generate route already grants. Scoping the
      // lookup to `trainerId` unconditionally made an admin's generate -> save
      // round trip fail even though generate had accepted the same profile.
      const authorized = !!profile
        && (requesterRole === 'admin' || Number(profile.trainerId) === Number(trainerId))
        && (key !== 'equipmentProfileId' || profile.isActive === true);
      if (!authorized) {
        throw Object.assign(new Error('Profile not found or not authorized'), { statusCode: 403 });
      }
    }
    const normalizedExercises = exercises.map((input) => {
      const ex = input.sourceExerciseName && input.sourceExerciseName !== input.exerciseName
        ? unverifiedReplacement(input, input.exerciseName) : input;
      return ({
      ...ex,
      sourceExerciseName: ex.sourceExerciseName ?? null,
      elbowMod: ex.elbowMod,
      footMod: ex.footMod,
      hipMod: ex.hipMod,
      description: ex.description ?? null,
      instructions: ex.instructions ?? null,
      videoUrl: ex.videoUrl ?? null,
      previewVideoUrl: ex.previewVideoUrl ?? null,
      imageUrl: ex.imageUrl ?? null,
      thumbnailUrl: ex.thumbnailUrl ?? null,
      exerciseLibraryId: normalizeExerciseLibraryId(ex.exerciseLibraryId),
    }); });

    const expectedParticipants = normalizePositiveInteger(generatedClass.expectedParticipants, 1);
    const metadata = {
      explanations: generatedClass.explanations,
      relaxationSummary: generatedClass.relaxationSummary ?? null,
      selectionManifestV1: emptySelectionManifest(),
    };
    const template = await Template.create({
      trainerId,
      name: generatedClass.name,
      classFormat: generatedClass.classFormat,
      dayType: generatedClass.dayType,
      targetDurationMin: normalizeNonNegativeInteger(generatedClass.targetDuration),
      maxParticipants: expectedParticipants + 8,
      optimalParticipants: expectedParticipants,
      aiGenerated: generatedClass.aiGenerated === true,
      classStyle: generatedClass.classStyle ?? 'standard',
      intensityCategory: generatedClass.intensityCategory ?? null,
      rounds: normalizePositiveInteger(generatedClass.rounds),
      exerciseDurationSec: normalizeNonNegativeInteger(generatedClass.exerciseDurationSec),
      includeStretch: generatedClass.includeStretch !== false,
      stretchDurationMin: normalizePositiveInteger(generatedClass.stretchDurationMin, 3),
      equipmentProfileId: normalizePositiveInteger(generatedClass.equipmentProfileId),
      spaceProfileId: normalizePositiveInteger(generatedClass.spaceProfileId),
      metadata,
    }, { transaction });
    const templateId = persistedId(template);

    const stationRecords = stations.map((station, index) => stationRecord(station, index, templateId));
    const createdStations = stationRecords.length > 0
      ? await Station.bulkCreate(stationRecords, { returning: true, transaction })
      : [];
    const stationMap = new Map();
    createdStations.forEach((station, index) => {
      stationMap.set(stationInputIndex(stations[index], index), persistedId(station));
    });

    const exerciseRecords = normalizedExercises.map(exercise => exerciseRecord(
      exercise,
      templateId,
      exercise.stationIndex == null ? null : stationMap.get(Number(exercise.stationIndex)) ?? null
    ));
    const persistedExercises = exerciseRecords.length > 0
      ? await Exercise.bulkCreate(exerciseRecords, { returning: true, transaction })
      : [];
    appendSelectionManifestEntries(metadata.selectionManifestV1, normalizedExercises, persistedExercises);

    if (typeof template.update === 'function') {
      await template.update({ metadata }, { transaction });
    } else {
      setRecordValue(template, 'metadata', metadata);
    }

    if (stretches.length > 0) {
      await Stretch.bulkCreate(
        stretches.map(stretch => stretchRecord(stretch, templateId)),
        { returning: true, transaction }
      );
    }

    if (generatedClass.overflowPlan) {
      await Overflow.create(overflowRecord(generatedClass.overflowPlan, templateId), { transaction });
    }

    return template;
  };

  return callerTransaction ? save(callerTransaction) : sequelize.transaction(save);
}

// ── Log a Class ───────────────────────────────────────────────────────

export async function logBootcampClass(data) {
  const ClassLog = getBootcampClassLog();
  return ClassLog.create(data);
}

// ── Get Class History ─────────────────────────────────────────────────

export async function getClassHistory(trainerId, { dayType, limit = 20, offset = 0 } = {}) {
  const ClassLog = getBootcampClassLog();
  const where = { trainerId };
  if (dayType) where.dayType = dayType;

  return ClassLog.findAndCountAll({
    where,
    order: [['classDate', 'DESC']],
    limit,
    offset,
  });
}

// ── Get Templates ─────────────────────────────────────────────────────

export async function getTemplates(trainerId, { classFormat, dayType, limit = 20 } = {}) {
  const Template = getBootcampTemplate();
  const where = { trainerId, isActive: true };
  if (classFormat) where.classFormat = classFormat;
  if (dayType) where.dayType = dayType;

  const templates = await Template.findAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    include: [
      { model: getBootcampExercise(), as: 'exercises' },
      { model: getBootcampStation(), as: 'stations', include: [{ model: getBootcampExercise(), as: 'exercises' }] },
      { model: getBootcampOverflowPlan(), as: 'overflowPlans' },
      { model: getBootcampStretch(), as: 'stretches' },
    ],
  });

  return hydrateTemplateExerciseMedia(dedupeTemplateExerciseCollections(templates));
}

// ── Space Profile CRUD ────────────────────────────────────────────────

export async function createSpaceProfile(data) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.create(data);
}

export async function getSpaceProfiles(trainerId) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.findAll({ where: { trainerId }, order: [['name', 'ASC']] });
}

export async function updateSpaceProfile(id, trainerId, updates) {
  const SpaceProfile = getBootcampSpaceProfile();
  const profile = await SpaceProfile.findOne({ where: { id, trainerId } });
  if (!profile) throw new Error('Space profile not found');
  return profile.update(updates);
}

// ── Exercise Trend CRUD ───────────────────────────────────────────────

export async function getExerciseTrends({ source, isApproved, limit = 50 } = {}) {
  const Trend = getExerciseTrend();
  const where = {};
  if (source) where.source = source;
  if (isApproved != null) where.isApproved = isApproved;

  return Trend.findAll({
    where,
    order: [['trendScore', 'DESC']],
    limit,
  });
}

export async function approveExerciseTrend(trendId, userId) {
  const Trend = getExerciseTrend();
  const trend = await Trend.findByPk(trendId);
  if (!trend) throw new Error('Trend not found');
  return trend.update({ isApproved: true, approvedBy: userId });
}

export const __testing__ = {
  hydrateTemplateExerciseMedia,
  normalizeExerciseLibraryId,
};
