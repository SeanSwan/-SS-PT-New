/**
 * ============================================================================
 * FILE: sprintSlotWrite.mjs — R-H04 (slice B: atomic memory union).
 *
 * THE DEFECT THIS CLOSES
 *   `sprintGenerator` marked a slot `generated` with its full `exerciseKeys` and
 *   THEN wrote `SprintExerciseMemory` one `findOrCreate` at a time, with no
 *   transaction. A failure part-way left the slot claiming `generated` while
 *   memory held only some of its keys.
 *
 *   Memory is the cross-sprint exclusion source, so partial memory lets the next
 *   generation re-pick exercises this class already used — the exact
 *   repeat-avoidance memory exists to provide.
 *
 *   Worse, the caller's `catch` swallows the error and counts a failed slot, but
 *   the slot UPDATE had already COMMITTED — so a partial write was
 *   indistinguishable from a complete one to any later reader.
 *
 * THE RULE HERE: the slot row and its memory rows are ONE unit. Either both
 * commit or neither does. Extracting it also keeps sprintGenerator.mjs inside
 * the 300-line cap.
 * ============================================================================
 */

import sequelize from '../../database.mjs';

/**
 * Persist one generated slot and its exercise memory as a single unit.
 *
 * @returns {Promise<void>} resolves only when BOTH writes committed; rejects
 *   having rolled back both, leaving the slot un-generated rather than
 *   half-written.
 */
export async function persistGeneratedSlotAtomically({
  SprintClassSlot,
  SprintExerciseMemory,
  sprintId,
  weekNumber,
  slotId,
  classData,
  exerciseKeys,
}) {
  const keys = Array.isArray(exerciseKeys) ? exerciseKeys : [];

  return sequelize.transaction(async (transaction) => {
    await SprintClassSlot.update({
      generatedClassData: classData,
      exerciseKeys: keys,
      status: 'generated',
    }, { where: { id: slotId }, transaction });

    for (const key of keys) {
      await SprintExerciseMemory.findOrCreate({
        where: { sprintId, exerciseKey: key },
        defaults: { slotId, weekNumber },
        transaction,
      });
    }
  });
}
