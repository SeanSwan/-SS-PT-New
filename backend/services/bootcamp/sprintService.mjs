/**
 * ============================================================================
 * FILE: sprintService.mjs
 * PURPOSE: CRUD operations for bootcamp sprint planning
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates, reads, updates and archives sprint plans with their weeks and
 * class slots. Called by sprintRoutes → frontend SprintPlannerPage. KEY DECISION: the schedule
 * is scaffolded first and classes are generated asynchronously afterwards.
 * ============================================================================
 */

import {
  getBootcampSprint, getSprintWeek, getSprintClassSlot,
  getSprintExerciseMemory, getBootcampSpaceProfile,
} from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import {
  buildSprintSchedule,
  computeEndDate,
  validateSprintCreateInput,
} from './sprintCalendarContract.mjs';
import { validateSlotUpdate, validateSprintUpdate, validateWeekUpdate } from './sprintUpdateContract.mjs';
import { buildSprintReadOptions, createSprintScaffold, persistProgressionPolicy } from './sprintStructure.mjs';
import {
  isAdminActor,
  normalizeActor,
  normalizePositiveSafeInteger,
  requireChildOfSprint,
  requireOptionalOwnedSprint,
  requireOwnedSpaceProfile,
  requireOwnedSprint,
  SprintObjectNotFoundError,
} from './sprintAccess.mjs';

// Schedule and date arithmetic live in sprintCalendarContract.mjs (S07/R-H06).
// The previous local getDay/setDate + toISOString version scaffolded different
// dates on different hosts.

// ── CREATE SPRINT ────────────────────────────────────────────────────
export async function createSprint(actor, params) {
  // S08/R-H03: the actor is validated before anything else and the Sprint is
  // owned by the authenticated user — never by a caller-supplied trainerId.
  const normalizedActor = normalizeActor(actor);
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();

  const {
    name, startDate, durationWeeks = 12, classesPerWeek,
    frequencyPattern = ['monday', 'wednesday', 'friday'],
    focusRotation = ['lower_body', 'upper_body', 'full_body'],
    spaceProfileId,
    previousSprintId, notes,
  } = params;

  // S07/R-H06: validate EVERYTHING before the first transaction is opened, and
  // derive the schedule and end date from the pure calendar contract. The old
  // local-time arithmetic below produced different dates per host timezone.
  // `params` is read directly for the vocabulary fields so no unvalidated copy
  // of them exists to be used by accident — one source of truth, not two.
  const validated = validateSprintCreateInput({
    startDate, durationWeeks, frequencyPattern, focusRotation, classesPerWeek,
    defaultFormat: params.defaultFormat,
    defaultStyle: params.defaultStyle,
    progressionStrategy: params.progressionStrategy,
  });

  const endDate = computeEndDate(validated.startDate, validated.durationWeeks);
  const schedule = buildSprintSchedule(validated);
  const totalClasses = schedule.reduce((sum, w) => sum + w.slots.length, 0);

  // S08/R-H03 (hostile-review fix): a referenced previous Sprint is authorized
  // under the same actor BEFORE it is stored, and the NORMALIZED id is what gets
  // persisted. Previously this raw req.body value was written unchecked, which
  // let a trainer point a new Sprint at someone else's — and that row later
  // authorized against them during generation.
  const previous = await requireOptionalOwnedSprint(previousSprintId, normalizedActor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });

  // S06/S07 fix: normalized and AUTHORIZED before it is stored, exactly like
  // previousSprintId above. The raw value previously went into an INTEGER
  // column (`'abc'` -> 500) and could reference ANOTHER trainer's profile.
  const SpaceProfile = getBootcampSpaceProfile();
  const resolvedSpaceProfileId = await requireOwnedSpaceProfile(spaceProfileId, normalizedActor, {
    getSpaceProfile: (id) => SpaceProfile.findOne({ where: { id } }),
  });

  const t = await sequelize.transaction();
  try {
    const sprint = await BootcampSprint.create({
      trainerId: normalizedActor.userId,
      name,
      startDate: validated.startDate,
      endDate,
      durationWeeks: validated.durationWeeks,
      classesPerWeek: validated.classesPerWeek,
      frequencyPattern: validated.frequencyPattern,
      focusRotation: validated.focusRotation,
      defaultFormat: validated.defaultFormat,
      defaultStyle: validated.defaultStyle,
      spaceProfileId: resolvedSpaceProfileId,
      progressionStrategy: validated.progressionStrategy,
      previousSprintId: previous?.sprintId ?? null,
      totalClassesPlanned: totalClasses,
      notes: notes || null,
      status: 'draft',
    }, { transaction: t });

    await createSprintScaffold({
      SprintWeek,
      SprintClassSlot,
      sprintId: sprint.id,
      schedule,
      // The VALIDATED vocabulary: these are copied onto every slot, and from
      // there into every class generated from those slots.
      defaultFormat: validated.defaultFormat,
      defaultStyle: validated.defaultStyle,
      transaction: t,
    });

    // §6 line 258 — "New create resolves strategy defaults", in the SAME transaction as the
    // scaffold it describes and resolved through the same `resolveWeekPolicy` the generators
    // use. Until this, the policy existed only after a trainer touched a week.
    await persistProgressionPolicy({
      Sprint: BootcampSprint, sprintId: sprint.id, strategy: validated.progressionStrategy, schedule, transaction: t,
    });

    await t.commit();

    return getSprintById(sprint.id, normalizedActor);
  } catch (err) {
    await t.rollback();
    logger.error('[SprintService] createSprint failed:', err);
    throw err;
  }
}

// ── GET SPRINT BY ID (with weeks + slots) ────────────────────────────
export async function getSprintById(sprintId, actor) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();
  const SprintClassSlot = getSprintClassSlot();

  // S08/R-H03: the object is authorized BEFORE its weeks and slots are read.
  const { sprintId: authorizedId } = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });

  return BootcampSprint.findByPk(
    authorizedId,
    buildSprintReadOptions({ SprintWeek, SprintClassSlot }),
  );
}

// ── LIST SPRINTS FOR THE ACTOR ───────────────────────────────────────
export async function listSprints(actor) {
  // S08/R-H03: still scoped to the actor's OWN identity. An unsolicited
  // all-trainers admin listing is deliberately NOT added.
  const normalizedActor = normalizeActor(actor);
  const BootcampSprint = getBootcampSprint();
  return BootcampSprint.findAll({
    where: { trainerId: normalizedActor.userId },
    order: [['createdAt', 'DESC']],
    attributes: [
      'id', 'name', 'startDate', 'endDate', 'durationWeeks',
      'classesPerWeek', 'status', 'progressionStrategy',
      'totalClassesPlanned', 'totalClassesCompleted', 'createdAt',
    ],
  });
}

// ── UPDATE SPRINT ────────────────────────────────────────────────────
export async function updateSprint(sprintId, actor, updates) {
  const BootcampSprint = getBootcampSprint();
  const { sprint } = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });

  // The vocabulary guard lives in the update contract (round 103, F10): the name-only filter
  // here used to persist an out-of-enum `progressionStrategy`, which `resolveWeekPolicy` then
  // silently resolved as `linear` while still reporting the bogus name as the source.
  await sprint.update(validateSprintUpdate(updates));
  return sprint;
}

// ── DELETE (ARCHIVE) SPRINT ──────────────────────────────────────────
export async function archiveSprint(sprintId, actor) {
  const BootcampSprint = getBootcampSprint();
  const { sprint } = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });
  await sprint.update({ status: 'archived' });
  return { success: true };
}

// ── UPDATE WEEK ──────────────────────────────────────────────────────
export async function updateWeek(sprintId, weekId, actor, updates) {
  const BootcampSprint = getBootcampSprint();
  const SprintWeek = getSprintWeek();

  const authorized = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });
  const authorizedId = authorized.sprintId;
  const { sprint } = authorized;

  // S08: the child identifier is NORMALIZED before it reaches a query, so a
  // malformed id is a 400 instead of a PostgreSQL type error surfacing as a 500.
  const normalizedWeekId = normalizePositiveSafeInteger(weekId, 'week identifier');

  // The child query is ALSO constrained to the authorized Sprint id, so a
  // foreign week can never be reached by id alone.
  const week = requireChildOfSprint(
    await SprintWeek.findOne({ where: { id: normalizedWeekId, sprintId: authorizedId } }),
    authorizedId,
  );

  await week.update(validateWeekUpdate(updates));

  // Contract §6 line 258: "a PUT containing intensityModifier marks that week explicit
  // even when it equals 1.0". The persisted column cannot express that — 1.0 is also the
  // scaffold default — which is exactly why `metadata.progressionPolicyV1.overrideByWeek`
  // exists. Without this write, a trainer who deliberately chose "no progression" was
  // silently given the strategy's value on the next generation.
  //
  // A DELOAD TOGGLE is deliberately excluded: line 258 also requires that toggling deload
  // "preserves the underlying override for later reuse; it does not overwrite it with
  // 1.0". When `isDeloadWeek` is supplied the contract derives the column value itself
  // (sprintUpdateContract.mjs:80), so recording THAT as an explicit override would
  // destroy the trainer's real choice.
  if (updates?.intensityModifier !== undefined && updates?.isDeloadWeek === undefined) {
    const policy = sprint?.metadata?.['progressionPolicyV1'] ?? {};
    const overrideByWeek = {
      ...(policy.overrideByWeek ?? {}),
      [week.weekNumber]: updates.intensityModifier,
    };
    await sprint.update({
      metadata: {
        ...(sprint.metadata ?? {}),
        progressionPolicyV1: { ...policy, version: 1, overrideByWeek },
      },
    });
  }

  return week;
}

// ── UPDATE SLOT ──────────────────────────────────────────────────────
export async function updateSlot(sprintId, slotId, actor, updates) {
  const BootcampSprint = getBootcampSprint();
  const SprintClassSlot = getSprintClassSlot();

  const { sprintId: authorizedId } = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });

  // S08: normalized before the query, for the same reason as updateWeek.
  const normalizedSlotId = normalizePositiveSafeInteger(slotId, 'slot identifier');

  const slot = requireChildOfSprint(
    await SprintClassSlot.findOne({ where: { id: normalizedSlotId, sprintId: authorizedId } }),
    authorizedId,
  );

  await slot.update(validateSlotUpdate(updates));
  return slot;
}

// ── CONFIRM CLASS WAS TAUGHT ─────────────────────────────────────────
// R-H29/R-H04 (slice C): exactly-once taught confirmation; implementation and
// the full defect write-up live in sprintConfirmSlot.mjs.
export { confirmSlotUsed } from './sprintConfirmSlot.mjs';

// ── GET EXERCISE MEMORY FOR A SPRINT ─────────────────────────────────
export async function getSprintExerciseMemoryKeys(sprintId, actor) {
  const BootcampSprint = getBootcampSprint();
  // Authorized BEFORE any memory row is read.
  const { sprintId: authorizedId } = await requireOwnedSprint(sprintId, actor, {
    getSprint: (id) => BootcampSprint.findByPk(id),
  });

  const SprintExerciseMemory = getSprintExerciseMemory();
  const rows = await SprintExerciseMemory.findAll({
    where: { sprintId: authorizedId },
    attributes: ['exerciseKey'],
  });
  return new Set(rows.map(r => r.exerciseKey));
}
