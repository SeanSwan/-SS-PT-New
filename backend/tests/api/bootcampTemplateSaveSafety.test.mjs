/**
 * ============================================================================
 * FILE: bootcampTemplateSaveSafety.test.mjs
 * PURPOSE: H01 route/service save safety — the behavioral proof that a
 *          `/api/bootcamp/save` payload cannot redirect, forge or partially
 *          apply a write.
 *
 * Stronger than the source-string convention used by the neighbouring route
 * tests: these call the REAL saveBootcampTemplate with mocked ORM models and
 * assert what actually reaches the database layer.
 *
 * Authority: s06-architecture.md §"Service / route contract".
 * NOT covered here: real PostgreSQL constraints and rollback (H02) — see
 * tests/integration/bootcampTemplatePersistence.integration.test.mjs.
 * ============================================================================
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TX = { id: 'caller-owned-transaction' };

const { sequelizeMock, models, calls } = vi.hoisted(() => {
  const calls = {
    transaction: 0,
    templateCreate: [],
    stationBulkCreate: [],
    exerciseBulkCreate: [],
    stretchBulkCreate: [],
    overflowCreate: [],
    templateUpdate: [],
  };

  const makeCreateResult = (id, values) => ({
    id,
    ...values,
    update: async (patch, options) => { calls.templateUpdate.push({ patch, options }); return { id, ...values, ...patch }; },
  });

  const models = {
    Template: {
      create: async (values, options) => {
        calls.templateCreate.push({ values, options });
        return makeCreateResult(101, values);
      },
    },
    Station: {
      bulkCreate: async (rows, options) => {
        calls.stationBulkCreate.push({ rows, options });
        return rows.map((row, index) => ({ id: 201 + index, ...row }));
      },
    },
    Exercise: {
      bulkCreate: async (rows, options) => {
        calls.exerciseBulkCreate.push({ rows, options });
        return rows.map((row, index) => ({ id: 501 + index, ...row }));
      },
    },
    Stretch: {
      bulkCreate: async (rows, options) => {
        calls.stretchBulkCreate.push({ rows, options });
        return rows.map((row, index) => ({ id: 801 + index, ...row }));
      },
    },
    Overflow: {
      create: async (values, options) => {
        calls.overflowCreate.push({ values, options });
        return { id: 901, ...values };
      },
    },
    SpaceProfile: { findOne: async () => null },
    EquipmentProfile: { findOne: async () => null },
  };

  const sequelizeMock = {
    transaction: async (callback) => { calls.transaction += 1; return callback(TX); },
  };

  return { sequelizeMock, models, calls };
});

vi.mock('../../database.mjs', () => ({ default: sequelizeMock }));
vi.mock('../../models/index.mjs', () => ({
  getBootcampTemplate: () => models.Template,
  getBootcampStation: () => models.Station,
  getBootcampExercise: () => models.Exercise,
  getBootcampOverflowPlan: () => models.Overflow,
  getBootcampStretch: () => models.Stretch,
  getBootcampSpaceProfile: () => models.SpaceProfile,
  getEquipmentProfile: () => models.EquipmentProfile,
}));

const { saveBootcampTemplate } = await import('../../services/bootcamp/bootcampTemplateSave.mjs');
const { BootcampTemplateAuthorityError, BootcampTemplateValidationError } =
  await import('../../services/bootcamp/bootcampTemplateContract.mjs');

const validClass = (over = {}) => ({
  name: 'Synthetic Lower Body',
  classFormat: 'stations_4x',
  dayType: 'lower_body',
  targetDuration: 45,
  expectedParticipants: 12,
  stations: [{ stationIndex: 0, stationName: 'Rack' }, { stationIndex: 1, stationName: 'Floor' }],
  exercises: [
    { exerciseName: 'Back Squat', stationIndex: 0, sortOrder: 0, durationSec: 45, restSec: 0, setupTimeSec: 0 },
    { exerciseName: 'Plank', stationIndex: null, sortOrder: 1, durationSec: 30 },
  ],
  ...over,
});

const totalWrites = () =>
  calls.templateCreate.length + calls.stationBulkCreate.length + calls.exerciseBulkCreate.length
  + calls.stretchBulkCreate.length + calls.overflowCreate.length;

beforeEach(() => {
  calls.transaction = 0;
  calls.templateCreate = [];
  calls.stationBulkCreate = [];
  calls.exerciseBulkCreate = [];
  calls.stretchBulkCreate = [];
  calls.overflowCreate = [];
  calls.templateUpdate = [];
  models.SpaceProfile.findOne = async () => null;
  models.EquipmentProfile.findOne = async () => null;
});

describe('admission — invalid input produces ZERO writes', () => {
  it.each([
    ['non-object', null],
    ['bad stations shape', validClass({ stations: 'nope' })],
    ['bad exercises shape', validClass({ exercises: {} })],
    ['missing name', validClass({ name: '  ' })],
  ])('rejects %s before touching the database', async (_label, payload) => {
    await expect(saveBootcampTemplate(payload, 7)).rejects.toBeInstanceOf(BootcampTemplateValidationError);
    expect(totalWrites()).toBe(0);
    expect(calls.transaction).toBe(0);
  });

  it('rejects an out-of-range station reference instead of writing a full-group row', async () => {
    await expect(saveBootcampTemplate(validClass({
      exercises: [{ exerciseName: 'Ghost', stationIndex: 5, sortOrder: 0 }],
    }), 7)).rejects.toThrow(/unknown stationIndex/);
    expect(totalWrites()).toBe(0);
  });

  it('rejects duplicate station indexes and duplicate occurrence references', async () => {
    await expect(saveBootcampTemplate(validClass({
      stations: [{ stationIndex: 0 }, { stationIndex: 0 }],
    }), 7)).rejects.toThrow(/duplicate stationIndex/);
    expect(totalWrites()).toBe(0);

    await expect(saveBootcampTemplate(validClass({
      exercises: [{ exerciseName: 'A', occurrenceId: 'x' }, { exerciseName: 'B', occurrenceId: 'x' }],
    }), 7)).rejects.toThrow(/duplicate occurrence reference/);
    expect(totalWrites()).toBe(0);
  });

  it('rejects an invalid trainer id before any transaction opens', async () => {
    await expect(saveBootcampTemplate(validClass(), 0)).rejects.toBeInstanceOf(BootcampTemplateValidationError);
    expect(calls.transaction).toBe(0);
    expect(totalWrites()).toBe(0);
  });
});

describe('identity — submitted child keys can never redirect a write', () => {
  it('drops injected id/trainerId/templateId from station, stretch and overflow rows', async () => {
    await saveBootcampTemplate(validClass({
      stations: [{ stationIndex: 0, stationName: 'Rack', id: 999, trainerId: 999, templateId: 999 }],
      exercises: [],
      stretches: [{ stretchName: 'Calf', id: 999, trainerId: 999, templateId: 999 }],
      overflowPlan: { bracket: 'A', id: 999, templateId: 999 },
    }), 7);

    const [stationWrite] = calls.stationBulkCreate;
    expect(stationWrite.rows[0]).toMatchObject({ templateId: 101, stationName: 'Rack' });
    expect(stationWrite.rows[0].id).toBeUndefined();
    expect(stationWrite.rows[0].trainerId).toBeUndefined();

    expect(calls.stretchBulkCreate[0].rows[0].id).toBeUndefined();
    expect(calls.stretchBulkCreate[0].rows[0].trainerId).toBeUndefined();
    expect(calls.overflowCreate[0].values.id).toBeUndefined();

    // The parent's trainerId is the server value, never the payload's.
    expect(calls.templateCreate[0].values.trainerId).toBe(7);
  });

  it('resolves every exercise stationId from the NEW station rows', async () => {
    await saveBootcampTemplate(validClass({
      exercises: [
        { exerciseName: 'Rack Row', stationIndex: 0, stationId: 999 },
        { exerciseName: 'Floor Row', stationIndex: 1, stationId: 999 },
        { exerciseName: 'Plank', stationIndex: null, stationId: 999 },
      ],
    }), 7);

    const rows = calls.exerciseBulkCreate[0].rows;
    expect(rows.map(row => row.stationId)).toEqual([201, 202, null]);
  });

  it('never persists a malformed exercise library id', async () => {
    await saveBootcampTemplate(validClass({
      exercises: [
        { exerciseName: 'A', stationIndex: null, exerciseLibraryId: 'not-a-uuid' },
        { exerciseName: 'B', stationIndex: null, exerciseLibraryId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' },
      ],
    }), 7);

    const rows = calls.exerciseBulkCreate[0].rows;
    expect(rows[0].exerciseLibraryId).toBeNull();
    expect(rows[1].exerciseLibraryId).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  });
});

describe('profile authority fails closed', () => {
  it('denies a missing space profile with zero parent writes', async () => {
    await expect(saveBootcampTemplate(validClass({ spaceProfileId: 5 }), 7))
      .rejects.toBeInstanceOf(BootcampTemplateAuthorityError);
    expect(calls.templateCreate).toHaveLength(0);
  });

  it('denies a foreign profile for a non-admin', async () => {
    models.SpaceProfile.findOne = async () => ({ id: 5, trainerId: 999 });
    await expect(saveBootcampTemplate(validClass({ spaceProfileId: 5 }), 7, { requesterRole: 'trainer' }))
      .rejects.toBeInstanceOf(BootcampTemplateAuthorityError);
    expect(calls.templateCreate).toHaveLength(0);
  });

  it('denies an inactive equipment profile', async () => {
    models.EquipmentProfile.findOne = async () => ({ id: 5, trainerId: 7, isActive: false });
    await expect(saveBootcampTemplate(validClass({ equipmentProfileId: 5 }), 7, { requesterRole: 'trainer' }))
      .rejects.toBeInstanceOf(BootcampTemplateAuthorityError);
    expect(calls.templateCreate).toHaveLength(0);
  });

  it('lets an explicit admin use a profile they do not own', async () => {
    models.SpaceProfile.findOne = async () => ({ id: 5, trainerId: 999 });
    await expect(saveBootcampTemplate(validClass({ spaceProfileId: 5 }), 7, { requesterRole: 'admin' }))
      .resolves.toMatchObject({ id: 101 });
    expect(calls.templateCreate).toHaveLength(1);
  });

  it('rejects a malformed profile id instead of silently ignoring it', async () => {
    await expect(saveBootcampTemplate(validClass({ spaceProfileId: '5abc' }), 7))
      .rejects.toBeInstanceOf(BootcampTemplateValidationError);
    expect(calls.templateCreate).toHaveLength(0);
  });
});

describe('transaction ownership', () => {
  it('opens exactly one managed transaction when the caller supplies none', async () => {
    await saveBootcampTemplate(validClass(), 7);
    expect(calls.transaction).toBe(1);
    for (const write of [
      calls.templateCreate[0], calls.stationBulkCreate[0],
      calls.exerciseBulkCreate[0], calls.templateUpdate[0],
    ]) {
      expect(write.options.transaction).toBe(TX);
    }
  });

  it('uses a caller-owned transaction AS-IS and never opens its own', async () => {
    const callerTx = { id: 'caller-owned' };
    await saveBootcampTemplate(validClass(), 7, { transaction: callerTx });

    expect(calls.transaction).toBe(0);
    expect(calls.templateCreate[0].options.transaction).toBe(callerTx);
    expect(calls.stationBulkCreate[0].options.transaction).toBe(callerTx);
    expect(calls.exerciseBulkCreate[0].options.transaction).toBe(callerTx);
    expect(calls.templateUpdate[0].options.transaction).toBe(callerTx);
  });

  it('propagates a late child failure to the transaction owner instead of swallowing it', async () => {
    const boom = new Error('stretch insert failed');
    models.Stretch.bulkCreate = async () => { throw boom; };

    await expect(saveBootcampTemplate(validClass({ stretches: [{ stretchName: 'Calf' }] }), 7))
      .rejects.toThrow('stretch insert failed');
    // The parent was attempted inside the same transaction; rollback is the
    // owner's job, which is exactly why this must reject rather than return.
    expect(calls.templateCreate).toHaveLength(1);
    expect(calls.templateUpdate).toHaveLength(0);
    models.Stretch.bulkCreate = async (rows, options) => {
      calls.stretchBulkCreate.push({ rows, options });
      return rows.map((row, index) => ({ id: 801 + index, ...row }));
    };
  });
});

describe('selection manifest', () => {
  it('is keyed by persisted row ids, is never verified, and ignores a spoofed payload', async () => {
    const spoofed = { version: 1, entries: [{ exerciseRowId: 999999, verified: true }] };
    await saveBootcampTemplate(validClass({
      metadata: { selectionManifestV1: spoofed },
      explanations: { why: 'because' },
    }), 7);

    const { patch } = calls.templateUpdate[0];
    expect(patch.metadata.explanations).toEqual({ why: 'because' });
    const manifest = patch.metadata.selectionManifestV1;
    expect(manifest.entries.map(entry => entry.exerciseRowId)).toEqual([501, 502]);
    expect(manifest.entries.every(entry => entry.verified === false)).toBe(true);
    expect(JSON.stringify(manifest)).not.toContain('999999');
  });

  it('assigns a server occurrence id to every persisted exercise', async () => {
    await saveBootcampTemplate(validClass(), 7);
    const rows = calls.exerciseBulkCreate[0].rows;
    expect(new Set(rows.map(row => row.occurrenceId)).size).toBe(rows.length);
    for (const row of rows) expect(row.occurrenceId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe('shape coverage', () => {
  it('handles an empty class with only the parent row', async () => {
    await saveBootcampTemplate(validClass({ stations: [], exercises: [] }), 7);
    expect(calls.templateCreate).toHaveLength(1);
    expect(calls.stationBulkCreate).toHaveLength(0);
    expect(calls.exerciseBulkCreate).toHaveLength(0);
    expect(calls.templateUpdate[0].patch.metadata.selectionManifestV1.entries).toEqual([]);
  });

  it('preserves legitimate zero timing values', async () => {
    await saveBootcampTemplate(validClass({
      exercises: [{ exerciseName: 'Hold', stationIndex: null, durationSec: 0, restSec: 0, setupTimeSec: 0, sortOrder: 0 }],
    }), 7);

    const row = calls.exerciseBulkCreate[0].rows[0];
    expect(row.durationSec).toBe(0);
    expect(row.restSec).toBe(0);
    expect(row.setupTimeSec).toBe(0);
    expect(row.sortOrder).toBe(0);
  });
});

describe('route wiring contract', () => {
  const routeSource = readFileSync(resolve(process.cwd(), 'routes/bootcampRoutes.mjs'), 'utf8');
  const saveStart = routeSource.indexOf("router.post('/save'");
  const saveEnd = routeSource.indexOf("router.get('/templates'", saveStart);
  const saveRoute = routeSource.slice(saveStart, saveEnd);

  it('takes the role from the authenticated request, never from the body', () => {
    expect(saveRoute).toContain('requesterRole: req.user.role');
    expect(saveRoute).not.toMatch(/requesterRole:\s*req\.body/);
  });

  it('maps malformed to 400, denied to 403 with non-disclosing text, and everything else to 500', () => {
    expect(saveRoute).toContain('err?.status === 400 || err?.status === 403');
    expect(saveRoute).toContain("err.status === 403 ? 'Access denied' : err.message");
    expect(saveRoute).toContain("res.status(500).json({ success: false, error: 'Failed to save template' })");
    expect(saveRoute).toContain('templateId: template.id');
  });
});
