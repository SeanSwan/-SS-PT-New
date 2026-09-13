/**
 * ============================================================================
 * FILE: bootcampLogAndSpaceSafety.test.mjs — hostile-review findings BE-F8a/B.
 *
 * PURPOSE: lock two cross-tenant write defects in bootcampCrud.mjs.
 *
 *   BE-F8a — POST /api/bootcamp/log wrote a CLIENT-SUPPLIED `templateId`
 *            straight through with no ownership check, so a trainer could
 *            attribute their class log to another trainer's template. The
 *            route's `parseInt` also read '12abc' as 12 and turned 'abc' into
 *            NaN, which surfaced as a 500.
 *   BE-F8b — PUT /api/bootcamp/spaces/:id passed `req.body` into
 *            `profile.update()`, which mass-assigns every matching attribute,
 *            so a trainer could set `trainerId` and hand their own space
 *            profile to someone else — past an ownership check that had
 *            already passed.
 *
 * These are service-level tests against mocked ORM models: they prove the
 * INVARIANTS and the exact queries issued, not real PostgreSQL behaviour.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const models = {};

vi.mock('../../models/index.mjs', () => ({
  getBootcampTemplate: () => models.Template,
  getBootcampStation: () => models.Station,
  getBootcampExercise: () => models.Exercise,
  getBootcampOverflowPlan: () => models.Overflow,
  getBootcampClassLog: () => models.ClassLog,
  getBootcampSpaceProfile: () => models.SpaceProfile,
  getBootcampStretch: () => models.Stretch,
  getExerciseTrend: () => models.Trend,
  getExercise: () => models.ExerciseLibrary,
}));

const { logBootcampClass, updateSpaceProfile } = await import('../../services/bootcamp/bootcampCrud.mjs');

const created = [];
const templateQueries = [];
const spaceUpdates = [];

beforeEach(() => {
  created.length = 0;
  templateQueries.length = 0;
  spaceUpdates.length = 0;

  models.ClassLog = {
    create: async (row) => { created.push(row); return { id: 501, ...row }; },
  };
  models.Template = {
    findOne: async (options) => {
      templateQueries.push(options);
      // Only trainer 7's template 42 exists.
      const { id, trainerId } = options.where;
      return id === 42 && trainerId === 7 ? { id: 42, trainerId: 7 } : null;
    },
  };
  models.SpaceProfile = {
    findOne: async () => ({
      id: 9,
      trainerId: 7,
      update: async (values) => { spaceUpdates.push(values); return { id: 9, ...values }; },
    }),
  };
});

describe('logBootcampClass — template attribution (BE-F8a)', () => {
  it('accepts the caller OWN template and stores it as an integer', async () => {
    await logBootcampClass({ trainerId: 7, templateId: '42', classDate: '2026-09-13' });
    expect(created[0].templateId).toBe(42);
    expect(templateQueries[0].where).toEqual({ id: 42, trainerId: 7 });
  });

  it('refuses a FOREIGN template and writes nothing', async () => {
    await expect(logBootcampClass({ trainerId: 7, templateId: 43, classDate: '2026-09-13' }))
      .rejects.toMatchObject({ status: 404, exposeToClient: true });
    expect(created).toHaveLength(0);
  });

  it('scopes the ownership query by the SERVER trainerId, not a client one', async () => {
    // Even a body that claims another trainer cannot widen the lookup: the
    // service uses the trainerId it was handed, which the route sets from
    // req.user.id.
    // The taught date is REQUIRED by the write (the DATEONLY column is NOT NULL, and validating
    // it here is what turns an unparseable value into a 400 instead of a 500): the fixture
    // supplies one.
    await logBootcampClass({ trainerId: 7, templateId: 42, classDate: '2026-09-13' });
    expect(templateQueries).toHaveLength(1);
    expect(templateQueries[0].where.trainerId).toBe(7);
  });

  it('rejects malformed template ids instead of coercing or writing NaN', async () => {
    for (const bad of ['abc', '12abc', '0', '-1', '1.5', 1.5, 0, -3]) {
      await expect(logBootcampClass({ trainerId: 7, templateId: bad, classDate: '2026-09-13' }))
        .rejects.toMatchObject({ status: 400, exposeToClient: true });
    }
    expect(created).toHaveLength(0);
    // A malformed id must not even reach the ownership query.
    expect(templateQueries).toHaveLength(0);
  });

  it('treats an absent template id as a genuine null rather than a lookup', async () => {
    for (const absent of [undefined, null, '']) {
      await logBootcampClass({ trainerId: 7, templateId: absent, classDate: '2026-09-13' });
    }
    expect(created.map((row) => row.templateId)).toEqual([null, null, null]);
    expect(templateQueries).toHaveLength(0);
  });
});

describe('updateSpaceProfile — mass assignment (BE-F8b)', () => {
  it('applies only allowlisted columns', async () => {
    await updateSpaceProfile(9, 7, { name: 'Studio B', maxStations: 6 });
    expect(spaceUpdates[0]).toEqual({ name: 'Studio B', maxStations: 6 });
  });

  it('CANNOT reassign trainerId, id or any other non-writable column', async () => {
    await updateSpaceProfile(9, 7, {
      name: 'Studio B',
      trainerId: 999,
      id: 1234,
      isActive: false,
      createdAt: '1970-01-01',
    });
    expect(spaceUpdates[0]).toEqual({ name: 'Studio B' });
    expect(spaceUpdates[0]).not.toHaveProperty('trainerId');
    expect(spaceUpdates[0]).not.toHaveProperty('id');
  });

  it('ignores a body that tries to change nothing writable', async () => {
    await updateSpaceProfile(9, 7, { trainerId: 999, id: 1234 });
    expect(spaceUpdates[0]).toEqual({});
  });
});
