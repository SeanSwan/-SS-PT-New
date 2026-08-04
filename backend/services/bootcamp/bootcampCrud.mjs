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
} from '../../models/index.mjs';

const LIVE_EXERCISE_FIELDS = ['videoUrl', 'previewVideoUrl', 'thumbnailUrl', 'imageUrl', 'description', 'instructions'];

function normalizeExerciseLibraryId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

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

export async function saveBootcampTemplate(generatedClass, trainerId) {
  const Template = getBootcampTemplate();
  const Station = getBootcampStation();
  const Exercise = getBootcampExercise();
  const Overflow = getBootcampOverflowPlan();
  const Stretch = getBootcampStretch();

  const template = await Template.create({
    trainerId,
    name: generatedClass.name,
    classFormat: generatedClass.classFormat,
    dayType: generatedClass.dayType,
    targetDurationMin: generatedClass.targetDuration,
    maxParticipants: generatedClass.expectedParticipants + 8,
    optimalParticipants: generatedClass.expectedParticipants,
    aiGenerated: generatedClass.aiGenerated,
    classStyle: generatedClass.classStyle ?? 'standard',
    intensityCategory: generatedClass.intensityCategory ?? null,
    rounds: generatedClass.rounds ?? null,
    exerciseDurationSec: generatedClass.exerciseDurationSec ?? null,
    includeStretch: generatedClass.includeStretch ?? true,
    stretchDurationMin: generatedClass.stretchDurationMin ?? 3,
    // SWA-105 Slice 2: the relaxation summary rides in metadata alongside the
    // explanations. Per-exercise chips are NOT persisted — the exercise columns
    // are an explicit whitelist and adding two more is a migration, deferred to
    // the slice that needs them at rest. Losing the class-level record too
    // would mean a template saved from a thin room reloads looking clean, so
    // the summary is kept here where a JSON column already exists.
    metadata: {
      explanations: generatedClass.explanations,
      relaxationSummary: generatedClass.relaxationSummary ?? null,
    },
  });

  // Create stations
  const stationRecords = generatedClass.stations.map(s => ({
    templateId: template.id,
    ...s,
  }));
  const createdStations = stationRecords.length > 0
    ? await Station.bulkCreate(stationRecords, { returning: true })
    : [];

  const stationMap = {};
  createdStations.forEach((station, idx) => {
    stationMap[idx] = station.id;
  });

  // Create exercises
  const exerciseRecords = generatedClass.exercises.map(ex => ({
    templateId: template.id,
    stationId: ex.stationIndex != null ? stationMap[ex.stationIndex] : null,
    exerciseName: ex.exerciseName,
    sourceExerciseName: ex.sourceExerciseName ?? null,
    durationSec: ex.durationSec,
    restSec: ex.restSec,
    sortOrder: ex.sortOrder,
    isCardioFinisher: ex.isCardioFinisher,
    muscleTargets: ex.muscleTargets,
    easyVariation: ex.easyVariation,
    mediumVariation: ex.mediumVariation,
    hardVariation: ex.hardVariation,
    kneeMod: ex.kneeMod,
    shoulderMod: ex.shoulderMod,
    ankleMod: ex.ankleMod,
    wristMod: ex.wristMod,
    elbowMod: ex.elbowMod,
    footMod: ex.footMod,
    hipMod: ex.hipMod,
    backMod: ex.backMod,
    equipmentRequired: ex.equipmentRequired,
    description: ex.description ?? null,
    instructions: ex.instructions ?? null,
    videoUrl: ex.videoUrl ?? null,
    previewVideoUrl: ex.previewVideoUrl ?? null,
    imageUrl: ex.imageUrl ?? null,
    thumbnailUrl: ex.thumbnailUrl ?? null,
    board: ex.board ?? 'main',
    setupTimeSec: ex.setupTimeSec ?? 0,
    pyramidStartWeight: ex.pyramidStartWeight ?? null,
    pyramidDrops: ex.pyramidDrops ?? null,
    supersetOrder: ex.supersetOrder ?? null,
    supersetGroupId: ex.supersetGroupId ?? null,
    exerciseLibraryId: normalizeExerciseLibraryId(ex.exerciseLibraryId),
  }));
  if (exerciseRecords.length > 0) {
    await Exercise.bulkCreate(exerciseRecords);
  }

  // Create stretches
  if (generatedClass.stretches?.length > 0) {
    await Stretch.bulkCreate(generatedClass.stretches.map(s => ({
      templateId: template.id,
      ...s,
    })));
  }

  // Create overflow plan
  if (generatedClass.overflowPlan) {
    await Overflow.create({
      templateId: template.id,
      ...generatedClass.overflowPlan,
    });
  }

  return template;
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
      { model: getBootcampStation(), as: 'stations', include: [{ model: getBootcampExercise(), as: 'exercises' }] },
      { model: getBootcampOverflowPlan(), as: 'overflowPlans' },
      { model: getBootcampStretch(), as: 'stretches' },
    ],
  });

  return hydrateTemplateExerciseMedia(templates);
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
