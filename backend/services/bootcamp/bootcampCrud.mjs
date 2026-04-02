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
} from '../../models/index.mjs';

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
    metadata: { explanations: generatedClass.explanations },
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
    backMod: ex.backMod,
    equipmentRequired: ex.equipmentRequired,
    board: ex.board ?? 'main',
    setupTimeSec: ex.setupTimeSec ?? 0,
    pyramidStartWeight: ex.pyramidStartWeight ?? null,
    pyramidDrops: ex.pyramidDrops ?? null,
    supersetOrder: ex.supersetOrder ?? null,
    supersetGroupId: ex.supersetGroupId ?? null,
    exerciseLibraryId: ex.exerciseLibraryId ?? null,
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

  return Template.findAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    include: [
      { model: getBootcampStation(), as: 'stations', include: [{ model: getBootcampExercise(), as: 'exercises' }] },
      { model: getBootcampOverflowPlan(), as: 'overflowPlans' },
      { model: getBootcampStretch(), as: 'stretches' },
    ],
  });
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
