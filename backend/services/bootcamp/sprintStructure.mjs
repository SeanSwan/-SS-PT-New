/**
 * ============================================================================
 * FILE: sprintStructure.mjs — S07 / S08.
 *
 * PURPOSE: the two structural pieces of a Sprint that are pure shape rather
 *          than logic — how its week/slot scaffolding is written, and how it is
 *          read back. Extracted from sprintService.mjs, which had grown past the
 *          300-line cap.
 *
 * Both take their models by injection, so this module imports no ORM and stays
 * trivially testable.
 * ============================================================================
 */

import {
  PROGRESSION_POLICY_KEY,
  buildInitialProgressionPolicy,
} from './sprintProgressionPolicy.mjs';

/**
 * Create the week and class-slot rows for a Sprint's schedule.
 *
 * `defaultFormat` / `defaultStyle` MUST be the VALIDATED values: they are copied
 * onto every slot, and from there into every class generated from those slots.
 * Passing a raw request value here would poison the whole Sprint.
 */
export async function createSprintScaffold({
  SprintWeek,
  SprintClassSlot,
  sprintId,
  schedule,
  defaultFormat,
  defaultStyle,
  transaction,
}) {
  for (const weekData of schedule) {
    const week = await SprintWeek.create({
      sprintId,
      weekNumber: weekData.weekNumber,
      startDate: weekData.startDate,
      endDate: weekData.endDate,
      theme: weekData.theme,
      isDeloadWeek: weekData.isDeloadWeek,
      intensityModifier: weekData.intensityModifier,
    }, { transaction });

    for (const slotData of weekData.slots) {
      await SprintClassSlot.create({
        weekId: week.id,
        sprintId,
        dayOfWeek: slotData.dayOfWeek,
        scheduledDate: slotData.scheduledDate,
        dayType: slotData.dayType,
        classFormat: defaultFormat,
        classStyle: defaultStyle,
        status: 'planned',
      }, { transaction });
    }
  }
}

/** The canonical week/slot read shape, ordered deterministically. */
export function buildSprintReadOptions({ SprintWeek, SprintClassSlot }) {
  return {
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
}

/**
 * Write a new Sprint's initial `progressionPolicyV1` (§6 line 258, "New create resolves
 * strategy defaults"). Lives here with the other structural write because it takes its model
 * by injection and belongs in the create transaction — `sprintService.mjs` is at the rule-4
 * line cap, and this keeps the ORM out of this module.
 */
export async function persistProgressionPolicy({
  Sprint, sprintId, strategy, schedule, transaction,
}) {
  const policy = buildInitialProgressionPolicy({ sprintId, strategy, schedule });
  await Sprint.update(
    { metadata: { [PROGRESSION_POLICY_KEY]: policy } },
    { where: { id: sprintId }, transaction },
  );
  return policy;
}
