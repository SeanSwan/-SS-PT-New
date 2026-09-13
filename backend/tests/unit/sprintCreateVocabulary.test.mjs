/**
 * ============================================================================
 * FILE: sprintCreateVocabulary.test.mjs — S06/S07 hostile-review fixes.
 *
 * PURPOSE: lock three defects on the Sprint create surface.
 *
 *   1. `defaultFormat` / `defaultStyle` / `progressionStrategy` were written to
 *      STRING(30)/STRING(20) columns straight from the request body. Only the
 *      last two are `isIn`-validated by Sequelize; a bad FORMAT was accepted
 *      silently and then copied into every generated class of that Sprint,
 *      making each one unsavable later.
 *   2. `spaceProfileId` was written raw into an INTEGER column with NO
 *      authorization — `'abc'` reached PostgreSQL (a 500) and a trainer could
 *      reference ANOTHER trainer's space profile.
 *   3. While fixing (1) the validated values were applied to the SPRINT row
 *      while the SLOT rows still read the raw params. For a valid value the two
 *      are identical, so the exposure was blank/absent values being written
 *      through as ''/null; the discriminating assertion is the blank case.
 *
 * Service-level tests against mocked ORM models: they prove the invariants and
 * the exact rows handed to the ORM, not real PostgreSQL behaviour.
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
  default: {
    transaction: async () => ({ commit: async () => {}, rollback: async () => {} }),
  },
}));

const { createSprint } = await import('../../services/bootcamp/sprintService.mjs');
const { validateSprintCreateInput, SprintCalendarValidationError } =
  await import('../../services/bootcamp/sprintCalendarContract.mjs');
const { SprintObjectNotFoundError } = await import('../../services/bootcamp/sprintAccess.mjs');

const TRAINER = { userId: 7, role: 'trainer' };
const ADMIN = { userId: 99, role: 'admin' };

const baseParams = {
  name: 'Synthetic Sprint',
  startDate: '2026-03-02',
  durationWeeks: 1,
  frequencyPattern: ['monday'],
};

beforeEach(() => {
  models.Sprint = { updated: [],
    created: [],
    create: async (row) => { models.Sprint.created.push(row); return { id: 77, ...row }; },
    update: async (values) => { models.Sprint.updated.push(values); return [1]; },
    findByPk: async () => ({ id: 77, trainerId: 7 }),
  };
  models.Slot = { created: [], create: async (row) => { models.Slot.created.push(row); return row; } };
  let weekSeq = 0;
  models.Week = { create: async (row) => ({ id: (weekSeq += 1), ...row }) };
  models.Memory = {};
  // Profile 5 belongs to trainer 7; profile 6 belongs to trainer 8.
  models.SpaceProfile = {
    findOne: async ({ where }) => {
      if (where.id === 5) return { id: 5, trainerId: 7 };
      if (where.id === 6) return { id: 6, trainerId: 8 };
      return null;
    },
  };
});

describe('validateSprintCreateInput — real vocabularies', () => {
  it('rejects a format outside the real class-format enum', () => {
    expect(() => validateSprintCreateInput({ ...baseParams, defaultFormat: 'garbage' }))
      .toThrow(SprintCalendarValidationError);
    expect(() => validateSprintCreateInput({ ...baseParams, defaultFormat: 'standard' }))
      .toThrow(SprintCalendarValidationError); // a STYLE, not a format
  });

  it('rejects a style outside the real class-style enum', () => {
    expect(() => validateSprintCreateInput({ ...baseParams, defaultStyle: 'nope' }))
      .toThrow(SprintCalendarValidationError);
  });

  it('rejects a progression strategy outside the model isIn list', () => {
    expect(() => validateSprintCreateInput({ ...baseParams, progressionStrategy: 'exponential' }))
      .toThrow(SprintCalendarValidationError);
  });

  it('supplies the documented defaults when omitted', () => {
    const validated = validateSprintCreateInput(baseParams);
    expect(validated.defaultFormat).toBe('stations_4x');
    expect(validated.defaultStyle).toBe('standard');
    expect(validated.progressionStrategy).toBe('linear');
  });
});

describe('createSprint — space profile authorization', () => {
  it('rejects a FOREIGN space profile non-disclosingly and writes nothing', async () => {
    await expect(createSprint(TRAINER, { ...baseParams, spaceProfileId: 6 }))
      .rejects.toBeInstanceOf(SprintObjectNotFoundError);
    expect(models.Sprint.created).toHaveLength(0);
    expect(models.Slot.created).toHaveLength(0);
  });

  it('rejects a malformed space profile id before any write', async () => {
    for (const bad of ['abc', '12abc', 0, -1, 1.5]) {
      await expect(createSprint(TRAINER, { ...baseParams, spaceProfileId: bad })).rejects.toThrow();
    }
    expect(models.Sprint.created).toHaveLength(0);
  });

  it('accepts the caller OWN space profile and persists the normalized integer', async () => {
    await createSprint(TRAINER, { ...baseParams, spaceProfileId: '5' });
    expect(models.Sprint.created[0].spaceProfileId).toBe(5);
  });

  it('lets an admin use a foreign profile without adopting its ownership', async () => {
    await createSprint(ADMIN, { ...baseParams, spaceProfileId: 6 });
    expect(models.Sprint.created[0].spaceProfileId).toBe(6);
    // The acting admin is NEVER written as the owner.
    expect(models.Sprint.created[0].trainerId).toBe(99);
  });
});

describe('createSprint — vocabulary reaches BOTH the sprint and its slots', () => {
  it('stores the validated format/style on the sprint row', async () => {
    await createSprint(TRAINER, { ...baseParams, defaultFormat: 'circuit', defaultStyle: 'pyramid' });
    expect(models.Sprint.created[0]).toMatchObject({
      defaultFormat: 'circuit',
      defaultStyle: 'pyramid',
      progressionStrategy: 'linear',
    });
  });

  it('stores the validated format/style on EVERY generated slot', async () => {
    await createSprint(TRAINER, { ...baseParams, defaultFormat: 'circuit', defaultStyle: 'pyramid' });
    expect(models.Slot.created.length).toBeGreaterThan(0);
    for (const slot of models.Slot.created) {
      expect(slot.classFormat).toBe('circuit');
      expect(slot.classStyle).toBe('pyramid');
    }
  });

  it('resolves a blank or absent vocabulary to the DEFAULTS on sprint and slots', async () => {
    // The discriminating case. For any value that passes validation, raw and
    // validated are identical, so a "valid value" test cannot tell the two code
    // paths apart. Only a blank/absent value differs: the raw param would be
    // written through as '' / null / undefined, while the validated one resolves
    // to the documented default. This is the assertion that actually fails if
    // the slot rows read the raw params again.
    for (const blank of [undefined, null, '']) {
      models.Sprint.created.length = 0;
      models.Slot.created.length = 0;

      await createSprint(TRAINER, { ...baseParams, defaultFormat: blank, defaultStyle: blank });

      expect(models.Sprint.created[0].defaultFormat).toBe('stations_4x');
      expect(models.Sprint.created[0].defaultStyle).toBe('standard');
      expect(models.Slot.created.length).toBeGreaterThan(0);
      for (const slot of models.Slot.created) {
        expect(slot.classFormat).toBe('stations_4x');
        expect(slot.classStyle).toBe('standard');
      }
    }
  });

  it('refuses an unsupported format before creating any row', async () => {
    await expect(createSprint(TRAINER, { ...baseParams, defaultFormat: 'garbage' }))
      .rejects.toBeInstanceOf(SprintCalendarValidationError);
    expect(models.Sprint.created).toHaveLength(0);
    expect(models.Slot.created).toHaveLength(0);
  });
});
