/**
 * ============================================================================
 * FILE: sprintRegenerateSlot.mjs — R-H20 / R-H04 (slice B) / S08-R-H03.
 *
 * Extracted from sprintGenerator.mjs (rule 4): that file had been oscillating at
 * the 300-line cap for several slices, and the single-slot regeneration path is a
 * self-contained unit with its own authorization, conflict guard and persistence.
 * `sprintGenerator.mjs` re-exports it, so every caller and test is unchanged.
 *
 * R-H20 — WHY THIS PATH MATTERS
 *   This is the SECOND generation path for the same slot, and it originally resolved
 *   no progression modifier at all. Once the modifier started driving the prescribed
 *   work interval, that omission became a real divergence: regenerating a progressed
 *   week silently reverted it to the baseline interval AND persisted no `progression`
 *   record, so a slot's prescribed seconds depended on which path touched it last. It
 *   now resolves through the same `resolveSprintWeekModifier` the full loop uses.
 *
 * R-H04 (slice B) — WHY THE PERSIST IS SHARED
 *   The slot used to be marked `generated` before its memory rows were written, so a
 *   failure part-way left it claiming success with partial memory — which the next
 *   generation reads as "these exercises are free". `persistGeneratedSlotAtomically`
 *   makes the slot and its memory rows one unit.
 * ============================================================================
 */

import {
  getBootcampSprint, getSprintClassSlot, getSprintExerciseMemory, getSprintWeek,
} from '../../models/index.mjs';
import { generateBootcampClass } from './bootcampGenerator.mjs';
import { getSprintExerciseMemoryKeys } from './sprintService.mjs';
import { requireChildOfSprint, requireOwnedSprint } from './sprintAccess.mjs';
import { persistGeneratedSlotAtomically } from './sprintSlotWrite.mjs';
import { resolveSprintWeekModifier } from './sprintProgression.mjs';
import { SprintTaughtConflictError } from './sprintCalendarContract.mjs';

export async function regenerateSlot(sprintId, slotId, actor) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();
  const SprintExerciseMemory = getSprintExerciseMemory();

  // S08/R-H03: authorize the Sprint BEFORE the status guard, the slot read, the
  // memory delete or the catalog access. An explicit admin may operate another
  // trainer's Sprint; the stored trainerId remains the data owner.
  const authorized = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });
  sprintId = authorized.sprintId;
  const { sprint } = authorized;

  // ARCH-3: Conflict guard — block slot regen while full generation is active
  if (sprint.status === 'generating') {
    throw new Error('Cannot regenerate slot while sprint generation is in progress');
  }

  // The child query is scoped to the authorized Sprint, and the string-vs-number
  // comparison goes through the common normalizer.
  const slot = requireChildOfSprint(await SprintClassSlot.findByPk(slotId), sprintId);

  // A TAUGHT slot is CLAIMED, and regeneration silently broke the claim (hostile review, round 128
  // HIGH). `persistGeneratedSlotAtomically` writes `status: 'generated'` and the new snapshot, while
  // `wasUsed`, `classLogId` and `usedDate` survive — so the slot came back looking untaught and
  // confirmable while a class log for the OLD class still existed and the Sprint stayed counted.
  // Re-confirming it then answered 409 forever: `sprintConfirmSlot.mjs:136` compares the stored
  // payload hash against a body the client rebuilds from the NEW exercises, which can never
  // reproduce it, and no unlink/reset endpoint exists. The trainer was left with a class that could
  // never be confirmed or logged.
  //
  // Guarded on the CLAIM, not on the word `taught`: `status` is exactly the field a regeneration
  // overwrites, so a slot already damaged that way carries `wasUsed`/`classLogId` with a status that
  // no longer says `taught`. The full-generation loop already skips taught and generated slots
  // (`sprintGenerator.mjs:125`), so this is the single path that needed it.
  //
  // Placed BEFORE the memory destroy and the generator call: a refusal must not consume the slot's
  // exercise memory or spend a generation on a class it will not keep.
  if (slot.wasUsed === true || slot.classLogId) {
    throw new SprintTaughtConflictError('A confirmed class cannot be regenerated; its taught log is already written.');
  }

  // Remove old memory entries for this slot
  await SprintExerciseMemory.destroy({ where: { sprintId, slotId } });

  // Build full sprint exclusion (minus this slot's old keys)
  const allMemory = await getSprintExerciseMemoryKeys(sprintId, actor);

  // R-H20: the single-slot path resolves the SAME modifier as full generation.
  // Without this, regenerating a progressed week silently reverted it to the
  // baseline interval with no `progression` record at all — so the slot's
  // prescribed seconds depended on which path touched it last.
  const week = await getSprintWeek().findByPk(slot.weekId, {
    attributes: ['id', 'weekNumber', 'isDeloadWeek', 'intensityModifier'],
  });
  const weekModifier = resolveSprintWeekModifier({ sprint, week, sprintId });

  const classData = await generateBootcampClass({
    classFormat: slot.classFormat || sprint.defaultFormat,
    classStyle: slot.classStyle || sprint.defaultStyle,
    dayType: slot.dayType,
    spaceProfileId: sprint.spaceProfileId,
    trainerId: sprint.trainerId,
    exclusionKeys: allMemory,
    includeStretch: true,
    stretchDurationMin: 5,
    workIntervalModifier: weekModifier,
    workIntervalSource: 'sprint_week_progression',
  });

  const exerciseKeys = [];
  if (classData?.exercises) {
    for (const ex of classData.exercises) {
      if (ex.key) exerciseKeys.push(ex.key);
    }
  }

  // R-H04 (slice B), second call site: identical defect to the generation loop
  // above — the slot was marked `generated` before the memory loop, so a failure
  // part-way left it claiming success with partial memory. Same unit now.
  await persistGeneratedSlotAtomically({
    SprintClassSlot,
    SprintExerciseMemory,
    sprintId,
    weekNumber: slot.weekId,
    slotId,
    classData,
    exerciseKeys,
  });

  return { slot: await SprintClassSlot.findByPk(slotId), classData };
}
