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
 *  - Each week's intensity modifier resolves in sprintProgression.mjs: a deload is
 *    0.7, otherwise the sprint's progressionStrategy decides, with an explicit
 *    override from Sprint.metadata.progressionPolicyV1 taking precedence
 *  - BOTH generation paths — the full loop and `regenerateSlot` — resolve the same
 *    modifier through resolveSprintWeekModifier, and both hand it to
 *    `generateBootcampClass` as `workIntervalModifier`, which changes the
 *    PRESCRIBED work interval under contract §6 lines 260-266
 *
 * STILL OPEN (R-H20 is therefore not complete): contract §6 step 3 — comparing the
 * proposed timeline against the requested work-block budget with the shared ClassPlan
 * compiler (`shared/bootcamp-core/timeline.mjs`) and holding to the largest interval
 * that fits. A ceiling hold is reported instead, and no budget check is claimed.
 * The template-manifest half of line 266 is also unimplemented.
 * ============================================================================
 */

import {
  getBootcampSprint, getSprintWeek, getSprintClassSlot,
  getSprintExerciseMemory,
} from '../../models/index.mjs';
import { generateBootcampClass } from './bootcampGenerator.mjs';
import { getSprintExerciseMemoryKeys } from './sprintService.mjs';
import { requireChildOfSprint, requireOwnedSprint } from './sprintAccess.mjs';
import { persistGeneratedSlotAtomically } from './sprintSlotWrite.mjs';
import { MODIFIER_SOURCE, resolveSprintWeekPolicy } from './sprintProgression.mjs';
import logger from '../../utils/logger.mjs';

// ── INTENSITY VOCABULARY — REMOVED (hostile-review finding BE-F3c) ────
// `intensityCategoryFromModifier` returned 'low'|'moderate'|'high'|'max':
// wrong twice. It violates the persisted intensityCategory ENUM, and
// scoreExerciseForIntensity() returns 0 for it, so it never ranked anything.
// Full rationale: FINAL-HOSTILE-REVIEW-20260913.md.

// ── GENERATE ALL CLASSES FOR A SPRINT ────────────────────────────────
export async function generateSprintClasses(sprintId, actor, onProgress) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();
  const SprintExerciseMemory = getSprintExerciseMemory();

  // S08/R-H03: authorize BEFORE the optimistic claim, any memory read and any
  // catalog/provider access. Previously this read the Sprint and only checked
  // `if (!sprint)`, so a foreign trainer could trigger full generation — with
  // its cost and its memory writes — for a Sprint they do not own.
  // The Sprint's stored trainerId remains the DATA OWNER for an admin caller.
  const authorized = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id, {
      include: [{
        model: SprintWeek,
        as: 'weeks',
        include: [{ model: SprintClassSlot, as: 'classSlots' }],
      }],
      order: [
        [{ model: SprintWeek, as: 'weeks' }, 'weekNumber', 'ASC'],
        [{ model: SprintWeek, as: 'weeks' }, { model: SprintClassSlot, as: 'classSlots' }, 'scheduledDate', 'ASC'],
      ],
    }),
  });
  sprintId = authorized.sprintId;
  const sprint = authorized.sprint;

  // S08/R-H03 (hostile-review fix): the previous Sprint is authorized BEFORE the
  // generation claim below. It used to be authorized only at the memory read
  // INSIDE the try, but the claim happens BEFORE that try opens and its only
  // release is the finally — so a denial left the row stuck at
  // status='generating' FOREVER, permanently blocking slot regeneration too.
  if (sprint.previousSprintId !== undefined && sprint.previousSprintId !== null && sprint.previousSprintId !== '') {
    await requireOwnedSprint(sprint.previousSprintId, actor, {
      getSprint: (id) => BootcampSprint.findByPk(id),
    });
  }

  // ARCH-3: Optimistic lock — reject concurrent generation attempts
  const currentVersion = sprint.generationVersion;

  // Atomically claim generation: only succeeds if version hasn't changed
  const [affectedRows] = await BootcampSprint.update(
    { status: 'generating', generationVersion: currentVersion + 1 },
    { where: { id: sprintId, generationVersion: currentVersion } },
  );

  if (affectedRows === 0) {
    throw new Error('Sprint generation conflict — another generation is already in progress');
  }

  // Load previous sprint's exercise memory for cross-sprint exclusion
  const crossSprintExclusions = new Set();
  if (sprint.previousSprintId) {
    // S08/R-H03: a referenced previous Sprint is authorized under the SAME actor
    // before any of its exclusions are read.
    const prevKeys = await getSprintExerciseMemoryKeys(sprint.previousSprintId, actor);
    prevKeys.forEach(k => crossSprintExclusions.add(k));
    logger.info(`[SprintGen] Loaded ${crossSprintExclusions.size} exercise keys from previous sprint #${sprint.previousSprintId}`);
  }

  // Current sprint's cumulative memory (starts empty, grows per class)
  const sprintMemory = new Set();

  const totalSlots = sprint.weeks.reduce((sum, w) => sum + w.classSlots.length, 0);
  let completedSlots = 0;
  let failedSlots = 0;

  // ARCH-3: try/finally ensures sprint never gets stuck in 'generating'
  try {
    for (const week of sprint.weeks) {
      const weekPolicy = resolveSprintWeekPolicy({ sprint, week, sprintId });
      const weekModifier = weekPolicy.modifier;

      for (const slot of week.classSlots) {
        // Skip a slot that already HAS a class — or that a taught log has CLAIMED. The claim is
        // checked independently of the status word (hostile review, round 128) because `status` is
        // client-writable: `validateSlotUpdate` accepts `{ status: 'planned' }`
        // (`sprintUpdateContract.test.mjs:116`) while refusing `{ status: 'taught' }` (:111). Under a
        // status-only rule, a taught slot whose status had been set back to 'planned' was regenerated
        // by the next full run: the snapshot its written log describes was replaced while `wasUsed`
        // and `classLogId` survived, so the class could never be confirmed again (the confirm path
        // compares the stored payload hash against a body built from the NEW exercises). That is the
        // same outcome `sprintRegenerateSlot.mjs` now refuses on the single-slot path, so both paths
        // key on the claim. The status word is deliberately NOT rewritten here: this loop declines to
        // regenerate a claimed slot, it does not repair one.
        if (slot.status === 'generated' || slot.status === 'taught'
            || slot.wasUsed === true || slot.classLogId) {
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
            spaceProfileId: sprint.spaceProfileId,
            trainerId: sprint.trainerId,
            exclusionKeys: exclusionSet,
            includeStretch: true,
            stretchDurationMin: 5,
            // R-H20: the resolved modifier now changes the PRESCRIBED work interval,
            // and its provenance comes back on the class for persistence.
            workIntervalModifier: weekModifier,
            workIntervalSource: 'sprint_week_progression',
          });

          // BE-F3c: recorded HONESTLY here instead of smuggled into the persisted
          // intensityCategory enum, where it violated the column and ranked nothing.
          // R-H20: also reports what happened to the prescribed work interval — and, since
          // §6 line 258 requires the compatibility inference to be DISPLAYABLE, WHERE the
          // modifier came from: the strategy, an explicit override, a retained legacy value,
          // or the deload toggle. `requiresCorrection` travels with it rather than being a
          // silent substitution of the strategy's number for a trainer's out-of-range one.
          if (Array.isArray(classData?.explanations)) {
            const workInterval = classData.progression?.applied
              ? `work interval ${classData.progression.baseWorkSec}s -> ${classData.progression.appliedWorkSec}s`
              : `work interval unchanged (${classData.progression?.reason ?? 'not evaluated'})`;
            const provenance = weekPolicy.source === MODIFIER_SOURCE.STRATEGY
              ? `from the ${sprint.progressionStrategy} strategy`
              : weekPolicy.source.replace(/_/g, ' ');
            const correction = weekPolicy.requiresCorrection
              ? ' NEEDS CORRECTION: the stored modifier is outside the retained 0.7-1.5 band and was NOT clamped.'
              : '';
            classData.explanations.push({
              type: 'intensity',
              message: `Week ${week.weekNumber} intensity modifier ${weekModifier} (${provenance})`
                + `${week.isDeloadWeek ? ' (deload)' : ''} — no intensity category applied; ${workInterval}.${correction}`,
            });
          }

          // Extract exercise keys from generated class
          const exerciseKeys = [];
          if (classData?.exercises) {
            for (const ex of classData.exercises) {
              if (ex.key) exerciseKeys.push(ex.key);
            }
          }

          // R-H04 (slice B): the slot and its memory rows are ONE unit now. The
          // slot used to be marked `generated` before the memory loop, so a
          // failure part-way left it claiming success with partial memory —
          // which the next generation reads as "these exercises are free".
          await persistGeneratedSlotAtomically({
            SprintClassSlot,
            SprintExerciseMemory,
            sprintId,
            weekNumber: week.weekNumber,
            slotId: slot.id,
            classData,
            exerciseKeys,
          });

          // Only after BOTH writes committed: a rolled-back slot must not
          // suppress this run's own exclusion set.
          for (const key of exerciseKeys) sprintMemory.add(key);

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
  } finally {
    // Always release the 'generating' lock, even on unexpected errors
    const finalStatus = failedSlots === 0 && completedSlots > 0 ? 'active' : 'draft';
    await BootcampSprint.update(
      { status: finalStatus },
      { where: { id: sprintId } },
    ).catch(err => logger.error(`[SprintGen] Failed to reset sprint status:`, err.message));
  }

  const result = {
    type: 'complete',
    sprintId,
    totalSlots,
    completedSlots: completedSlots - failedSlots,
    failedSlots,
    status: failedSlots === 0 ? 'active' : 'draft',
    exerciseMemorySize: sprintMemory.size,
  };

  if (onProgress) onProgress(result);
  return result;
}

// R-H20 / rule 4: the single-slot path lives in its own module; re-exported so
// every caller (`sprintRoutes.mjs`) and test keeps importing it from here.
export { regenerateSlot } from './sprintRegenerateSlot.mjs';
