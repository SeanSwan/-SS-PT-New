/**
 * ============================================================================
 * FILE: sprintService.mjs
 * PURPOSE: CRUD operations for bootcamp sprint planning
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates, reads, updates, and deletes sprint plans
 * with their weeks and class slots. Handles sprint scaffolding (creating
 * the week/slot structure based on frequency pattern and duration).
 *
 * HOW IT FITS: Called by sprintRoutes → frontend SprintPlannerPage
 * KEY DECISIONS: Sprint scaffolding separated from class generation —
 * create the schedule first, then generate classes asynchronously.
 * ============================================================================
 */

import {
  getBootcampSprint, getSprintWeek, getSprintClassSlot,
  getSprintExerciseMemory, getBootcampSpaceProfile, getBootcampClassLog,
} from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { withLockedSprint, assertSprintIdle, sprintActor, sprintError } from './sprintGenerationClaim.mjs';
import { FORMAT_CONFIG, DAY_TYPE_MUSCLES } from './bootcampConstants.mjs';

// ── Day name → JS dayOfWeek mapping ─────────────────────────────────
const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function normalizePositiveId(value, label) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Valid ${label} ID required`);
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) throw new Error(`Valid ${label} ID required`);
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Valid ${label} ID required`);
  }
  return parsed;
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) throw new Error('Valid start date required');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() !== Number(match[2]) - 1
    || date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error('Valid start date required');
  }
  return date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

// ── Helper: compute dates for a sprint ──────────────────────────────
function buildSprintSchedule(startDate, durationWeeks, frequencyPattern, focusRotation) {
  const weeks = [];
  const start = parseDateOnly(startDate);

  for (let w = 0; w < durationWeeks; w++) {
    const weekStart = new Date(start);
    weekStart.setUTCDate(start.getUTCDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const isDeload = (w + 1) % 4 === 0;
    const slots = [];

    for (let d = 0; d < frequencyPattern.length; d++) {
      const dayName = frequencyPattern[d].toLowerCase();
      const targetDow = DAY_MAP[dayName];
      if (targetDow === undefined) continue;

      const currentDow = weekStart.getUTCDay();
      let offset = targetDow - currentDow;
      if (offset < 0) offset += 7;

      const slotDate = new Date(weekStart);
      slotDate.setUTCDate(weekStart.getUTCDate() + offset);

      const focusIndex = (w * frequencyPattern.length + d) % focusRotation.length;

      slots.push({
        dayOfWeek: targetDow,
        scheduledDate: formatDateOnly(slotDate),
        dayType: focusRotation[focusIndex],
      });
    }

    weeks.push({
      weekNumber: w + 1,
      startDate: formatDateOnly(weekStart),
      endDate: formatDateOnly(weekEnd),
      isDeloadWeek: isDeload,
      intensityModifier: isDeload ? 0.7 : 1.0,
      theme: isDeload ? 'Deload & Recovery' : null,
      slots,
    });
  }

  return weeks;
}

// ── CREATE SPRINT ────────────────────────────────────────────────────
export async function createSprint(trainerId, params) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();

  const {
    name, startDate, durationWeeks = 12, classesPerWeek,
    frequencyPattern = ['monday', 'wednesday', 'friday'],
    focusRotation = ['lower_body', 'upper_body', 'full_body'],
    defaultFormat = 'stations_4x', defaultStyle = 'standard',
    spaceProfileId, progressionStrategy = 'linear',
    previousSprintId, notes,
  } = params;

  if (!Number.isSafeInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 52
    || !Array.isArray(frequencyPattern) || !frequencyPattern.length || frequencyPattern.length > 7
    || frequencyPattern.some(day => typeof day !== 'string' || DAY_MAP[day.toLowerCase()] === undefined)
    || new Set(frequencyPattern.map(day => day.toLowerCase())).size !== frequencyPattern.length
    || !Array.isArray(focusRotation) || !focusRotation.length || focusRotation.some(day => !DAY_TYPE_MUSCLES[day])
    || !FORMAT_CONFIG[defaultFormat] || !['linear', 'undulating', 'block', 'random'].includes(progressionStrategy)
    || typeof name !== 'string' || !name.trim()
    || (classesPerWeek != null && classesPerWeek !== frequencyPattern.length)) {
    throw sprintError('Invalid Sprint schedule', 400);
  }
  if (previousSprintId && !await getSprintById(previousSprintId, { userId: trainerId, role: 'trainer' })) {
    throw sprintError('Previous Sprint not found', 404);
  }
  if (spaceProfileId && !await getBootcampSpaceProfile().findOne({ where: { id: normalizePositiveId(spaceProfileId, 'space profile'), trainerId } })) {
    throw sprintError('Space profile not found', 404);
  }

  const endDate = parseDateOnly(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + durationWeeks * 7 - 1);

  const schedule = buildSprintSchedule(startDate, durationWeeks, frequencyPattern, focusRotation);
  const totalClasses = schedule.reduce((sum, w) => sum + w.slots.length, 0);

  const t = await sequelize.transaction();
  try {
    const sprint = await BootcampSprint.create({
      trainerId,
      name,
      startDate,
      endDate: formatDateOnly(endDate),
      durationWeeks,
      classesPerWeek: classesPerWeek || frequencyPattern.length,
      frequencyPattern,
      focusRotation,
      defaultFormat,
      defaultStyle,
      spaceProfileId: spaceProfileId || null,
      progressionStrategy,
      previousSprintId: previousSprintId || null,
      totalClassesPlanned: totalClasses,
      notes: notes || null,
      status: 'draft',
    }, { transaction: t });

    for (const weekData of schedule) {
      const week = await SprintWeek.create({
        sprintId: sprint.id,
        weekNumber: weekData.weekNumber,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
        theme: weekData.theme,
        isDeloadWeek: weekData.isDeloadWeek,
        intensityModifier: weekData.intensityModifier,
      }, { transaction: t });

      for (const slotData of weekData.slots) {
        await SprintClassSlot.create({
          weekId: week.id,
          sprintId: sprint.id,
          dayOfWeek: slotData.dayOfWeek,
          scheduledDate: slotData.scheduledDate,
          dayType: slotData.dayType,
          classFormat: defaultFormat,
          classStyle: defaultStyle,
          status: 'planned',
        }, { transaction: t });
      }
    }

    await t.commit();

    return getSprintById(sprint.id, { userId: trainerId, role: 'trainer' });
  } catch (err) {
    await t.rollback();
    logger.error('[SprintService] createSprint failed:', err);
    throw err;
  }
}

// ── GET SPRINT BY ID (with weeks + slots) ────────────────────────────
export async function getSprintById(sprintId, actor = null) {
  actor = sprintActor(actor);
  const normalizedSprintId = normalizePositiveId(sprintId, 'sprint');
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();

  const query = {
    include: [
      {
        model: SprintWeek,
        as: 'weeks',
        include: [{ model: SprintClassSlot, as: 'classSlots' }],
        order: [['weekNumber', 'ASC']],
      },
    ],
    order: [
      [{ model: SprintWeek, as: 'weeks' }, 'weekNumber', 'ASC'],
      [{ model: SprintWeek, as: 'weeks' }, { model: SprintClassSlot, as: 'classSlots' }, 'scheduledDate', 'ASC'],
    ],
  };
  if (actor.role !== 'admin') {
    return BootcampSprint.findOne({
      ...query,
      where: { id: normalizedSprintId, trainerId: actor.userId },
    });
  }
  return BootcampSprint.findByPk(normalizedSprintId, query);
}

// ── LIST SPRINTS FOR TRAINER ─────────────────────────────────────────
export async function listSprints(trainerId) {
  const BootcampSprint = getBootcampSprint();
  return BootcampSprint.findAll({
    where: { trainerId },
    order: [['createdAt', 'DESC']],
    attributes: [
      'id', 'name', 'startDate', 'endDate', 'durationWeeks',
      'classesPerWeek', 'status', 'progressionStrategy',
      'totalClassesPlanned', 'totalClassesCompleted', 'createdAt',
    ],
  });
}

// All mutable Sprint paths lock the parent first; generation and settings cannot race.
const trainerActor = userId => ({ userId, role: 'trainer' });
function pick(updates, allowed) {
  return Object.fromEntries(allowed.filter(key => updates[key] !== undefined).map(key => [key, updates[key]]));
}
async function bumpVersion(sprint, transaction) {
  await sprint.update({ generationVersion: Number(sprint.generationVersion) + 1 }, { transaction });
}
export async function updateSprint(sprintId, trainerId, updates) {
  return withLockedSprint(normalizePositiveId(sprintId, 'sprint'), trainerActor(trainerId), async (sprint, transaction, now) => {
    assertSprintIdle(sprint, now);
    if (updates.status !== undefined) throw sprintError('Use the explicit Sprint transition');
    if (updates.defaultFormat !== undefined && !FORMAT_CONFIG[updates.defaultFormat]) throw sprintError('Invalid format', 400);
    if (updates.spaceProfileId && !await getBootcampSpaceProfile().findOne({ where: { id: updates.spaceProfileId, trainerId }, transaction })) {
      throw sprintError('Space profile not found', 404);
    }
    const settings = pick(updates, ['name', 'defaultFormat', 'defaultStyle', 'progressionStrategy', 'spaceProfileId', 'notes']);
    await sprint.update(settings, { transaction });
    if (Object.keys(settings).some(key => !['name', 'notes'].includes(key))) await bumpVersion(sprint, transaction);
    return sprint;
  });
}
export async function archiveSprint(sprintId, trainerId) {
  return withLockedSprint(normalizePositiveId(sprintId, 'sprint'), trainerActor(trainerId), async (sprint, transaction, now) => {
    assertSprintIdle(sprint, now);
    await sprint.update({ status: 'archived', generationVersion: Number(sprint.generationVersion) + 1 }, { transaction });
    return { success: true };
  });
}
export async function updateWeek(sprintId, weekId, trainerId, updates) {
  sprintId = normalizePositiveId(sprintId, 'sprint'); weekId = normalizePositiveId(weekId, 'week');
  return withLockedSprint(sprintId, trainerActor(trainerId), async (sprint, transaction, now) => {
    assertSprintIdle(sprint, now);
    const week = await getSprintWeek().findOne({ where: { id: weekId, sprintId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!week) throw sprintError('Week not found', 404);
    const changesPrescription = updates.intensityModifier !== undefined || updates.isDeloadWeek !== undefined;
    if (changesPrescription) {
      const existing = await getSprintClassSlot().count({ where: { sprintId, weekId, status: ['generated', 'taught'] }, transaction });
      if (existing) throw sprintError('Regenerate saved classes explicitly before changing their week prescription');
      if (updates.intensityModifier !== undefined && (!Number.isFinite(updates.intensityModifier) || updates.intensityModifier < 0.7 || updates.intensityModifier > 1.5)) {
        throw sprintError('Invalid work-duration modifier', 400);
      }
      if (updates.isDeloadWeek !== undefined && typeof updates.isDeloadWeek !== 'boolean') throw sprintError('Invalid deload setting', 400);
      await bumpVersion(sprint, transaction);
    }
    await week.update(pick(updates, ['theme', 'isDeloadWeek', 'intensityModifier', 'notes']), { transaction });
    return week;
  });
}
export async function updateSlot(sprintId, slotId, trainerId, updates) {
  sprintId = normalizePositiveId(sprintId, 'sprint'); slotId = normalizePositiveId(slotId, 'slot');
  return withLockedSprint(sprintId, trainerActor(trainerId), async (sprint, transaction, now) => {
    assertSprintIdle(sprint, now);
    const slot = await getSprintClassSlot().findOne({ where: { id: slotId, sprintId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!slot) throw sprintError('Slot not found', 404);
    if (slot.status === 'taught') throw sprintError('Taught slot is immutable');
    if (updates.status !== undefined && (!['planned', 'skipped'].includes(updates.status) || !['planned', 'skipped'].includes(slot.status))) {
      throw sprintError('Use the explicit slot transition');
    }
    const structural = ['dayType', 'classFormat', 'classStyle'].some(key => updates[key] !== undefined);
    if (structural && slot.status !== 'planned') throw sprintError('Regenerate saved class settings explicitly');
    if (updates.dayType !== undefined && !DAY_TYPE_MUSCLES[updates.dayType]) throw sprintError('Invalid day type', 400);
    if (updates.classFormat !== undefined && !FORMAT_CONFIG[updates.classFormat]) throw sprintError('Invalid format', 400);
    await slot.update(pick(updates, ['dayType', 'classFormat', 'classStyle', 'status', 'notes']), { transaction });
    if (structural || updates.status !== undefined) await bumpVersion(sprint, transaction);
    return slot;
  });
}
export async function confirmSlotUsed(sprintId, slotId, trainerId, body = {}) {
  sprintId = normalizePositiveId(sprintId, 'sprint'); slotId = normalizePositiveId(slotId, 'slot');
  return withLockedSprint(sprintId, trainerActor(trainerId), async (sprint, transaction, now) => {
    assertSprintIdle(sprint, now);
    const slot = await getSprintClassSlot().findOne({ where: { id: slotId, sprintId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!slot) throw sprintError('Slot not found', 404);
    const usedDate = formatDateOnly(parseDateOnly(body.usedDate || slot.scheduledDate));
    if (slot.status === 'taught' && slot.classLogId) {
      if (slot.usedDate !== usedDate) throw sprintError('Taught confirmation differs from the saved receipt');
      return slot;
    }
    if (!['generated', 'taught'].includes(slot.status) || !slot.generatedClassData) throw sprintError('Generate a class before confirming it');
    const data = slot.generatedClassData;
    const rows = [...(data.exercises ?? []), ...(data.stations ?? []).flatMap(station => station.exercises ?? [])];
    const exercisesUsed = rows.filter(ex => !ex.board || ex.board === 'main');
    if (!exercisesUsed.length) throw sprintError('Cannot teach an empty class', 422);
    const log = await getBootcampClassLog().create({
      trainerId: sprint.trainerId, templateId: slot.templateId ?? null, classDate: usedDate,
      dayType: slot.dayType, exercisesUsed, trainerNotes: 'Trainer-attested prescription; elapsed time and attendance not measured.',
    }, { transaction });
    await slot.update({ wasUsed: true, usedDate, trainerConfirmedAt: new Date(), status: 'taught', classLogId: log.id }, { transaction });
    const count = await getSprintClassSlot().count({ where: { sprintId, status: 'taught' }, transaction });
    await sprint.update({ totalClassesCompleted: count }, { transaction });
    return slot;
  });
}
export async function getSprintExerciseMemoryKeys(sprintId, actor) {
  const normalizedSprintId = normalizePositiveId(sprintId, 'sprint');
  if (!await getSprintById(normalizedSprintId, actor)) throw sprintError('Sprint not found', 404);
  const rows = await getSprintExerciseMemory().findAll({ where: { sprintId: normalizedSprintId }, attributes: ['exerciseKey'] });
  return new Set(rows.map(row => row.exerciseKey));
}
