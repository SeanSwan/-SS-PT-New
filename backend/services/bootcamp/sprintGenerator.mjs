/**
 * ============================================================================
 * FILE: sprintGenerator.mjs
 * PURPOSE: Generates all bootcamp classes for a sprint with exercise memory
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Iterates through every slot in a sprint, generating
 * a unique class for each. Accumulates exercise memory so later weeks never
 * repeat exercises from earlier weeks. Supports cross-sprint exclusion.
 *
 * HOW IT FITS: Called by sprintRoutes SSE endpoint → sends progress events
 * KEY DECISIONS:
 *  - LLM calls NEVER inside DB transactions (AI Village P0)
 *  - Exercise memory accumulates AFTER each class generation
 *  - Deload weeks get reduced exercise counts
 *  - Progression strategies modify intensity per week
 * ============================================================================
 */

import {
  getBootcampSprint, getSprintWeek, getSprintClassSlot,
  getSprintExerciseMemory,
} from '../../models/index.mjs';
import { generateBootcampClass } from './bootcampGenerator.mjs';
import { getSprintExerciseMemoryKeys } from './sprintService.mjs';
import logger from '../../utils/logger.mjs';

// ── Progression Strategy Modifiers ───────────────────────────────────
const PROGRESSION = {
  linear: (weekNum, totalWeeks) => {
    const base = 1.0;
    const increment = 0.05 * (weekNum - 1);
    return Math.min(base + increment, 1.5);
  },
  undulating: (weekNum) => {
    const pattern = [1.0, 0.85, 1.1];
    return pattern[(weekNum - 1) % pattern.length];
  },
  block: (weekNum) => {
    if (weekNum <= 3) return 0.9;
    if (weekNum <= 6) return 1.0;
    if (weekNum <= 9) return 1.1;
    return 1.05;
  },
  random: () => 0.85 + Math.random() * 0.3,
};

// ── INTENSITY CATEGORIES BY MODIFIER ─────────────────────────────────
function intensityCategoryFromModifier(modifier) {
  if (modifier <= 0.75) return 'low';
  if (modifier <= 0.95) return 'moderate';
  if (modifier <= 1.1) return 'high';
  return 'max';
}

// ── GENERATE ALL CLASSES FOR A SPRINT ────────────────────────────────
export async function generateSprintClasses(sprintId, onProgress) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();
  const SprintExerciseMemory = getSprintExerciseMemory();

  const sprint = await BootcampSprint.findByPk(sprintId, {
    include: [{
      model: SprintWeek,
      as: 'weeks',
      include: [{ model: SprintClassSlot, as: 'classSlots' }],
    }],
    order: [
      [{ model: SprintWeek, as: 'weeks' }, 'weekNumber', 'ASC'],
      [{ model: SprintWeek, as: 'weeks' }, { model: SprintClassSlot, as: 'classSlots' }, 'scheduledDate', 'ASC'],
    ],
  });

  if (!sprint) throw new Error('Sprint not found');

  // Optimistic lock check
  const currentVersion = sprint.generationVersion;

  // Load previous sprint's exercise memory for cross-sprint exclusion
  const crossSprintExclusions = new Set();
  if (sprint.previousSprintId) {
    const prevKeys = await getSprintExerciseMemoryKeys(sprint.previousSprintId);
    prevKeys.forEach(k => crossSprintExclusions.add(k));
    logger.info(`[SprintGen] Loaded ${crossSprintExclusions.size} exercise keys from previous sprint #${sprint.previousSprintId}`);
  }

  // Current sprint's cumulative memory (starts empty, grows per class)
  const sprintMemory = new Set();

  // Mark sprint as generating
  await BootcampSprint.update(
    { status: 'generating', generationVersion: currentVersion + 1 },
    { where: { id: sprintId, generationVersion: currentVersion } },
  );

  const progressionFn = PROGRESSION[sprint.progressionStrategy] || PROGRESSION.linear;
  const totalSlots = sprint.weeks.reduce((sum, w) => sum + w.classSlots.length, 0);
  let completedSlots = 0;
  let failedSlots = 0;

  for (const week of sprint.weeks) {
    const weekModifier = week.isDeloadWeek
      ? 0.7
      : (week.intensityModifier || progressionFn(week.weekNumber, sprint.durationWeeks));

    for (const slot of week.classSlots) {
      if (slot.status === 'generated' || slot.status === 'taught') {
        completedSlots++;
        continue;
      }

      try {
        // Build exclusion set: cross-sprint + current sprint memory
        const exclusionSet = new Set([...crossSprintExclusions, ...sprintMemory]);

        // Generate class OUTSIDE of any transaction (AI Village P0)
        const classData = await generateBootcampClass({
          classFormat: slot.classFormat || sprint.defaultFormat,
          classStyle: slot.classStyle || sprint.defaultStyle,
          dayType: slot.dayType,
          intensityCategory: intensityCategoryFromModifier(weekModifier),
          spaceProfileId: sprint.spaceProfileId,
          trainerId: sprint.trainerId,
          exclusionKeys: exclusionSet,
          includeStretch: true,
          stretchDurationMin: 5,
        });

        // Extract exercise keys from generated class
        const exerciseKeys = [];
        if (classData?.exercises) {
          for (const ex of classData.exercises) {
            if (ex.key) exerciseKeys.push(ex.key);
          }
        }

        // Save to slot (single write, no transaction needed)
        await SprintClassSlot.update({
          generatedClassData: classData,
          exerciseKeys,
          status: 'generated',
        }, { where: { id: slot.id } });

        // Accumulate exercise memory
        for (const key of exerciseKeys) {
          sprintMemory.add(key);
          await SprintExerciseMemory.findOrCreate({
            where: { sprintId, exerciseKey: key },
            defaults: {
              slotId: slot.id,
              weekNumber: week.weekNumber,
            },
          });
        }

        completedSlots++;
      } catch (err) {
        logger.error(`[SprintGen] Failed slot #${slot.id} (week ${week.weekNumber}):`, err.message);
        failedSlots++;
        completedSlots++;
      }

      // Send progress event
      if (onProgress) {
        onProgress({
          type: 'progress',
          completedSlots,
          totalSlots,
          failedSlots,
          currentWeek: week.weekNumber,
          percent: Math.round((completedSlots / totalSlots) * 100),
        });
      }
    }
  }

  // Mark sprint complete
  const finalStatus = failedSlots === 0 ? 'active' : 'draft';
  await BootcampSprint.update(
    { status: finalStatus },
    { where: { id: sprintId } },
  );

  const result = {
    type: 'complete',
    sprintId,
    totalSlots,
    completedSlots: completedSlots - failedSlots,
    failedSlots,
    status: finalStatus,
    exerciseMemorySize: sprintMemory.size,
  };

  if (onProgress) onProgress(result);
  return result;
}

// ── REGENERATE A SINGLE SLOT ─────────────────────────────────────────
export async function regenerateSlot(sprintId, slotId, trainerId) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();
  const SprintExerciseMemory = getSprintExerciseMemory();

  const sprint = await BootcampSprint.findOne({ where: { id: sprintId, trainerId } });
  if (!sprint) throw new Error('Sprint not found');

  const slot = await SprintClassSlot.findByPk(slotId);
  if (!slot || slot.sprintId !== sprintId) throw new Error('Slot not found');

  // Remove old memory entries for this slot
  await SprintExerciseMemory.destroy({ where: { sprintId, slotId } });

  // Build full sprint exclusion (minus this slot's old keys)
  const allMemory = await getSprintExerciseMemoryKeys(sprintId);

  const classData = await generateBootcampClass({
    classFormat: slot.classFormat || sprint.defaultFormat,
    classStyle: slot.classStyle || sprint.defaultStyle,
    dayType: slot.dayType,
    intensityCategory: 'moderate',
    spaceProfileId: sprint.spaceProfileId,
    trainerId: sprint.trainerId,
    exclusionKeys: allMemory,
    includeStretch: true,
    stretchDurationMin: 5,
  });

  const exerciseKeys = [];
  if (classData?.exercises) {
    for (const ex of classData.exercises) {
      if (ex.key) exerciseKeys.push(ex.key);
    }
  }

  await SprintClassSlot.update({
    generatedClassData: classData,
    exerciseKeys,
    status: 'generated',
  }, { where: { id: slotId } });

  // Add new memory entries
  for (const key of exerciseKeys) {
    await SprintExerciseMemory.findOrCreate({
      where: { sprintId, exerciseKey: key },
      defaults: { slotId, weekNumber: slot.weekId },
    });
  }

  return { slot: await SprintClassSlot.findByPk(slotId), classData };
}
