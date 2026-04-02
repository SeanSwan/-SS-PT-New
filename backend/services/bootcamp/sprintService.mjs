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
  getSprintExerciseMemory, getBootcampSpaceProfile,
} from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';

// ── Day name → JS dayOfWeek mapping ─────────────────────────────────
const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

// ── Helper: compute dates for a sprint ──────────────────────────────
function buildSprintSchedule(startDate, durationWeeks, frequencyPattern, focusRotation) {
  const weeks = [];
  const start = new Date(startDate);

  for (let w = 0; w < durationWeeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const isDeload = (w + 1) % 4 === 0;
    const slots = [];

    for (let d = 0; d < frequencyPattern.length; d++) {
      const dayName = frequencyPattern[d].toLowerCase();
      const targetDow = DAY_MAP[dayName];
      if (targetDow === undefined) continue;

      const currentDow = weekStart.getDay();
      let offset = targetDow - currentDow;
      if (offset < 0) offset += 7;

      const slotDate = new Date(weekStart);
      slotDate.setDate(weekStart.getDate() + offset);

      const focusIndex = (w * frequencyPattern.length + d) % focusRotation.length;

      slots.push({
        dayOfWeek: targetDow,
        scheduledDate: slotDate.toISOString().split('T')[0],
        dayType: focusRotation[focusIndex],
      });
    }

    weeks.push({
      weekNumber: w + 1,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
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

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationWeeks * 7 - 1);

  const schedule = buildSprintSchedule(startDate, durationWeeks, frequencyPattern, focusRotation);
  const totalClasses = schedule.reduce((sum, w) => sum + w.slots.length, 0);

  const t = await sequelize.transaction();
  try {
    const sprint = await BootcampSprint.create({
      trainerId,
      name,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
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

    return getSprintById(sprint.id);
  } catch (err) {
    await t.rollback();
    logger.error('[SprintService] createSprint failed:', err);
    throw err;
  }
}

// ── GET SPRINT BY ID (with weeks + slots) ────────────────────────────
export async function getSprintById(sprintId) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();

  return BootcampSprint.findByPk(sprintId, {
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
  });
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

// ── UPDATE SPRINT ────────────────────────────────────────────────────
export async function updateSprint(sprintId, trainerId, updates) {
  const BootcampSprint = getBootcampSprint();
  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');

  const allowed = [
    'name', 'defaultFormat', 'defaultStyle', 'progressionStrategy',
    'spaceProfileId', 'notes', 'status',
  ];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  await sprint.update(filtered);
  return sprint;
}

// ── DELETE (ARCHIVE) SPRINT ──────────────────────────────────────────
export async function archiveSprint(sprintId, trainerId) {
  const BootcampSprint = getBootcampSprint();
  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');
  await sprint.update({ status: 'archived' });
  return { success: true };
}

// ── UPDATE WEEK ──────────────────────────────────────────────────────
export async function updateWeek(sprintId, weekId, trainerId, updates) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();

  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');

  const week = await SprintWeek.findOne({ where: { id: weekId, sprintId } });
  if (!week) throw new Error('Week not found');

  const allowed = ['theme', 'isDeloadWeek', 'intensityModifier', 'notes'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }
  if (updates.isDeloadWeek !== undefined) {
    filtered.intensityModifier = updates.isDeloadWeek ? 0.7 : 1.0;
  }

  await week.update(filtered);
  return week;
}

// ── UPDATE SLOT ──────────────────────────────────────────────────────
export async function updateSlot(sprintId, slotId, trainerId, updates) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();

  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');

  const slot = await SprintClassSlot.findOne({ where: { id: slotId, sprintId } });
  if (!slot) throw new Error('Slot not found');

  const allowed = [
    'dayType', 'classFormat', 'classStyle', 'status', 'notes',
  ];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  await slot.update(filtered);
  return slot;
}

// ── CONFIRM CLASS WAS TAUGHT ─────────────────────────────────────────
export async function confirmSlotUsed(sprintId, slotId, trainerId, body) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();

  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');

  const slot = await SprintClassSlot.findOne({ where: { id: slotId, sprintId } });
  if (!slot) throw new Error('Slot not found');

  await slot.update({
    wasUsed: true,
    usedDate: body.usedDate || slot.scheduledDate,
    trainerConfirmedAt: new Date(),
    status: 'taught',
  });

  await sprint.increment('totalClassesCompleted');

  return slot;
}

// ── GET EXERCISE MEMORY FOR A SPRINT ─────────────────────────────────
export async function getSprintExerciseMemoryKeys(sprintId) {
  const SprintExerciseMemory = getSprintExerciseMemory();
  const rows = await SprintExerciseMemory.findAll({
    where: { sprintId },
    attributes: ['exerciseKey'],
  });
  return new Set(rows.map(r => r.exerciseKey));
}
