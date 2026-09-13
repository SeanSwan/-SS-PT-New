/**
 * ============================================================================
 * FILE: sprintUpdateContract.test.mjs — S08 / hostile-review S06-F-sprint.
 *
 * PURPOSE: lock the UPDATE-path poison chain and child-id normalization.
 *
 *   `SprintClassSlot.dayType` / `.classFormat` / `.classStyle` are STRING(30),
 *   NOT enums (models/SprintClassSlot.mjs:40-51). An invalid value therefore
 *   does not fail at insert — it is copied into every class generated from that
 *   slot and from there into a saved template's real enum columns, making those
 *   classes unsavable. The create path closed this; the update path did not, so
 *   `PUT .../slots/:id { classFormat: 'garbage' }` reopened it.
 *
 *   Separately, `weekId` / `slotId` went into `findOne({ where: { id } })`
 *   unnormalized, so a junk id became a PostgreSQL type error → 500.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const models = {};

vi.mock('../../models/index.mjs', () => ({
  getBootcampSprint: () => models.Sprint,
  getSprintWeek: () => models.Week,
  getSprintClassSlot: () => models.Slot,
  getSprintExerciseMemory: () => models.Memory,
  getBootcampSpaceProfile: () => models.SpaceProfile,
}));

vi.mock('../../database.mjs', () => ({
  // One transaction for the claim + counter. Executed inline so the caller's
  // commit boundary is observable; the REAL atomicity of the conditional update
  // is proven separately against PostgreSQL by scripts/s06-slice-c-probe.mjs.
  //
  // DO NOT add a second `vi.mock` for this path. An earlier revision declared two
  // factories with DIFFERENT semantics (one returned a transaction-like object
  // WITHOUT running the callback). Whichever factory wins decides whether the
  // callback — and therefore the claim and the increment — executes at all, and
  // the intermittent `confirmSlotUsed` failures (`increments` empty) match the
  // shape of the non-executing factory exactly. One path, one factory.
  default: { transaction: async (fn) => fn('TX') },
}));

const { validateSlotUpdate, validateSprintUpdate, validateWeekUpdate } =
  await import('../../services/bootcamp/sprintUpdateContract.mjs');
const { SprintCalendarValidationError } =
  await import('../../services/bootcamp/sprintCalendarContract.mjs');
const { updateSlot, updateWeek, confirmSlotUsed } = await import('../../services/bootcamp/sprintService.mjs');
const { SprintIdInvalidError } = await import('../../services/bootcamp/sprintAccess.mjs');

const TRAINER = { userId: 7, role: 'trainer' };
const sprintRow = { id: 77, trainerId: 7 };
const child = (over) => ({ sprintId: 77, update: async (v) => v, ...over });

beforeEach(() => {
  models.Sprint = { findByPk: async () => sprintRow };
  models.Week = { findOne: async () => child(), queries: [] };
  models.Slot = { findOne: async () => child(), queries: [] };
  models.Memory = {};
  models.SpaceProfile = { findOne: async () => null };
});

describe('validateSlotUpdate — the poison chain stays closed', () => {
  it('rejects a format/style/dayType outside the real vocabularies', () => {
    for (const bad of [
      { classFormat: 'garbage' },
      { classFormat: 'standard' },        // a STYLE, not a format
      { classStyle: 'nope' },
      { dayType: 'leg_day' },
    ]) {
      expect(() => validateSlotUpdate(bad)).toThrow(SprintCalendarValidationError);
    }
  });

  it('REFUSES an out-of-enum progressionStrategy (round 103, F10)', () => {
    // The update path filtered this field by NAME only, so an out-of-enum value persisted and
    // `resolveWeekPolicy` then silently fell back to `linear` while still recording
    // `source: 'strategy'` — making the generator print "from the nonsense strategy".
    expect(() => validateSprintUpdate({ progressionStrategy: 'nonsense' }))
      .toThrow(SprintCalendarValidationError);
    // A real member passes, and the keys supplied are the ONLY keys returned.
    expect(validateSprintUpdate({ progressionStrategy: 'undulating', name: 'Sprint' }))
      .toEqual({ progressionStrategy: 'undulating', name: 'Sprint' });
    expect(validateSprintUpdate({})).toEqual({});
    // An undeclared field is still dropped rather than passed to the model.
    expect(validateSprintUpdate({ trainerId: 99, name: 'x' })).toEqual({ name: 'x' });
  });

  it('rejects a status outside the model isIn list', () => {
    // Previously this reached Sequelize's isIn validator, which throws a
    // ValidationError the route reports as a 500.
    expect(() => validateSlotUpdate({ status: 'cancelled' }))
      .toThrow(SprintCalendarValidationError);
  });

  it('rejects an empty string rather than treating it as absence', () => {
    expect(() => validateSlotUpdate({ classStyle: '' })).toThrow(SprintCalendarValidationError);
  });

  it('accepts real members and returns ONLY the keys supplied', () => {
    expect(validateSlotUpdate({ classFormat: 'circuit' })).toEqual({ classFormat: 'circuit' });
    expect(validateSlotUpdate({})).toEqual({});
    expect(validateSlotUpdate({ status: 'skipped' })).toEqual({ status: 'skipped' });
  });

  it('REFUSES `taught` — it is a confirmation, not a status edit (round 99, MED-3)', () => {
    // §5 line 216 makes `taught` mean "transitioned, logged, linked and counted in one
    // transaction". This path did none of that, so it parked a slot in `taught` with no log,
    // no link, no used date and no count — reachable without ever confirming.
    expect(() => validateSlotUpdate({ status: 'taught' }))
      .toThrow(SprintCalendarValidationError);
    expect(() => validateSlotUpdate({ status: 'taught' }))
      .toThrow(/confirmation endpoint/i);
    // A legitimate partial edit still passes alongside the refusal.
    expect(validateSlotUpdate({ status: 'planned', notes: 'moved' }))
      .toEqual({ status: 'planned', notes: 'moved' });
  });
});

describe('validateWeekUpdate', () => {
  it('rejects a non-boolean isDeloadWeek', () => {
    expect(() => validateWeekUpdate({ isDeloadWeek: 'yes' }))
      .toThrow(SprintCalendarValidationError);
  });

  it('derives intensityModifier from isDeloadWeek and lets it win', () => {
    expect(validateWeekUpdate({ isDeloadWeek: true, intensityModifier: 9 }))
      .toMatchObject({ isDeloadWeek: true, intensityModifier: 0.7 });
    expect(validateWeekUpdate({ isDeloadWeek: false }))
      .toMatchObject({ isDeloadWeek: false, intensityModifier: 1.0 });
  });

  it('accepts a finite modifier when isDeloadWeek is absent', () => {
    expect(validateWeekUpdate({ intensityModifier: 1.1 })).toEqual({ intensityModifier: 1.1 });
    expect(() => validateWeekUpdate({ intensityModifier: Number.NaN }))
      .toThrow(SprintCalendarValidationError);
  });

  it('rejects non-text theme/notes', () => {
    expect(() => validateWeekUpdate({ theme: 7 })).toThrow(SprintCalendarValidationError);
  });
});

describe('absent keys stay absent — for EVERY field, not just one', () => {
  // The contract's core promise is that a PARTIAL update stays partial. If a
  // validator returned every allowed key with a default, a PATCH-style call
  // would silently RESET the fields the caller never mentioned. That claim was
  // previously asserted for a single field, which does not establish it for the
  // validator as a whole.
  const SLOT_FIELDS = ['dayType', 'classFormat', 'classStyle', 'status', 'notes'];
  const WEEK_FIELDS = ['theme', 'notes', 'isDeloadWeek', 'intensityModifier'];

  it('slot: supplying one field never emits any other', () => {
    const supplied = {
      dayType: 'cardio', classFormat: 'circuit', classStyle: 'pyramid',
      status: 'skipped', notes: 'note',
    };
    for (const field of SLOT_FIELDS) {
      const result = validateSlotUpdate({ [field]: supplied[field] });
      expect(Object.keys(result)).toEqual([field]);
    }
  });

  it('week: supplying one field never emits any other', () => {
    const supplied = {
      theme: 'Block 1', notes: 'note', isDeloadWeek: true, intensityModifier: 1.2,
    };
    for (const field of WEEK_FIELDS) {
      const result = validateWeekUpdate({ [field]: supplied[field] });
      // `isDeloadWeek` deliberately also emits the modifier it derives.
      const expected = field === 'isDeloadWeek'
        ? ['isDeloadWeek', 'intensityModifier']
        : [field];
      expect(Object.keys(result)).toEqual(expected);
    }
  });

  it('slot: an empty object yields an empty object', () => {
    expect(validateSlotUpdate()).toEqual({});
    expect(validateSlotUpdate({})).toEqual({});
    expect(validateWeekUpdate()).toEqual({});
    expect(validateWeekUpdate({})).toEqual({});
  });

  it('slot: an unknown key is dropped rather than passed through', () => {
    // A caller cannot smuggle a column in by naming it.
    expect(validateSlotUpdate({ trainerId: 9, id: 1, sprintId: 2, weekId: 3 })).toEqual({});
  });

  it('week: an unknown key is dropped too', () => {
    expect(validateWeekUpdate({ weekNumber: 99, sprintId: 2, id: 1 })).toEqual({});
  });
});

describe('blank is rejected for enums, but allowed for free text', () => {
  it('every enum field rejects an empty string', () => {
    for (const field of ['dayType', 'classFormat', 'classStyle', 'status']) {
      expect(() => validateSlotUpdate({ [field]: '' })).toThrow(SprintCalendarValidationError);
      expect(() => validateSlotUpdate({ [field]: '   ' })).toThrow(SprintCalendarValidationError);
    }
  });

  it('notes and theme accept an empty string as an explicit CLEAR', () => {
    expect(validateSlotUpdate({ notes: '' })).toEqual({ notes: '' });
    expect(validateWeekUpdate({ theme: '' })).toEqual({ theme: '' });
    expect(validateSlotUpdate({ notes: null })).toEqual({ notes: null });
  });

  it('notes rejects a non-text value', () => {
    expect(() => validateSlotUpdate({ notes: 7 })).toThrow(SprintCalendarValidationError);
    expect(() => validateWeekUpdate({ notes: {} })).toThrow(SprintCalendarValidationError);
  });
});

describe('child ids are normalized before they reach a query', () => {
  it('rejects a malformed slotId as a client error, not a 500', async () => {
    for (const bad of ['abc', '12abc', 0, -1, 1.5]) {
      await expect(updateSlot(77, bad, TRAINER, {})).rejects.toBeInstanceOf(SprintIdInvalidError);
    }
  });

  it('rejects a malformed weekId as a client error', async () => {
    for (const bad of ['abc', 0, -3]) {
      await expect(updateWeek(77, bad, TRAINER, {})).rejects.toBeInstanceOf(SprintIdInvalidError);
    }
  });

  it('passes the NORMALIZED integer to the child query', async () => {
    const seen = [];
    models.Slot.findOne = async (options) => { seen.push(options.where); return child(); };
    await updateSlot(77, '5', TRAINER, {});
    expect(seen[0]).toEqual({ id: 5, sprintId: 77 });
  });

  it('still scopes the child query to the authorized Sprint', async () => {
    const seen = [];
    models.Week.findOne = async (options) => { seen.push(options.where); return child(); };
    await updateWeek(77, 3, TRAINER, {});
    expect(seen[0].sprintId).toBe(77);
  });

});

describe('progressionPolicyV1 write side (H20 §6 line 258)', () => {
  const policyOf = (sprint) => sprint.metadata?.progressionPolicyV1;

  function harness({ weekNumber = 3, metadata = {} } = {}) {
    const sprint = {
      id: 77,
      trainerId: 7,
      metadata,
      update: async (patch) => { Object.assign(sprint, patch); },
    };
    const week = { sprintId: 77, weekNumber, update: async (v) => Object.assign(week, v) };
    models.Sprint = { findByPk: async () => sprint };
    models.Week = { findOne: async () => week };
    return { sprint, week };
  }

  it('marks the week explicit when intensityModifier is supplied, EVEN at 1.0', async () => {
    // The whole reason the metadata exists: `1.0` is also the scaffold default, so the
    // column alone cannot record a deliberate "no progression" choice.
    const h = harness();
    await updateWeek(77, 9, TRAINER, { intensityModifier: 1.0 });
    expect(policyOf(h.sprint).overrideByWeek).toEqual({ 3: 1.0 });
    expect(policyOf(h.sprint).version).toBe(1);
  });

  it('PRESERVES an existing override when deload is toggled instead', async () => {
    // "Toggling deload preserves the underlying override for later reuse; it does not
    // overwrite it with 1.0."
    const h = harness({ metadata: { progressionPolicyV1: { version: 1, overrideByWeek: { 3: 1.2 } } } });
    await updateWeek(77, 9, TRAINER, { isDeloadWeek: true });
    expect(policyOf(h.sprint).overrideByWeek).toEqual({ 3: 1.2 });
  });

  it('does not let a DERIVED deload value masquerade as an explicit override', async () => {
    // With both supplied, the contract derives the column from the boolean
    // (sprintUpdateContract.mjs:80), so that 1.0 is not the trainer's choice.
    const h = harness();
    await updateWeek(77, 9, TRAINER, { isDeloadWeek: false, intensityModifier: 1.0 });
    expect(policyOf(h.sprint)).toBeUndefined();
  });

  it('records nothing when the update carries no modifier at all', async () => {
    const h = harness({ metadata: { progressionPolicyV1: { version: 1, overrideByWeek: { 2: 1.1 } } } });
    await updateWeek(77, 9, TRAINER, { theme: 'Heavy' });
    expect(policyOf(h.sprint).overrideByWeek).toEqual({ 2: 1.1 });
  });

  it('keeps unrelated metadata keys intact', async () => {
    const h = harness({ metadata: { somethingElse: { keep: true } } });
    await updateWeek(77, 9, TRAINER, { intensityModifier: 0.8 });
    expect(h.sprint.metadata.somethingElse).toEqual({ keep: true });
    expect(policyOf(h.sprint).overrideByWeek).toEqual({ 3: 0.8 });
  });
});
