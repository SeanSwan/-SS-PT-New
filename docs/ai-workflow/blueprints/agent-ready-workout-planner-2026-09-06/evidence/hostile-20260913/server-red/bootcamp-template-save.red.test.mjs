import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const models = vi.hoisted(() => {
  const template = { create: vi.fn(), findAll: vi.fn() };
  const station = { bulkCreate: vi.fn() };
  const exercise = { bulkCreate: vi.fn() };
  const overflow = { create: vi.fn() };
  const stretch = { bulkCreate: vi.fn() };
  const libraryExercise = { findAll: vi.fn() };
  return { template, station, exercise, overflow, stretch, libraryExercise };
});

const database = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock('../../../backend/database.mjs', () => ({ default: database }));

vi.mock('../../../backend/models/index.mjs', () => ({
  getBootcampTemplate: () => models.template,
  getBootcampStation: () => models.station,
  getBootcampExercise: () => models.exercise,
  getBootcampOverflowPlan: () => models.overflow,
  getBootcampStretch: () => models.stretch,
  getExercise: () => models.libraryExercise,
  getBootcampClassLog: () => ({}),
  getBootcampSpaceProfile: () => ({}),
  getExerciseTrend: () => ({}),
}));

const TX = { id: 'synthetic-save-tx', LOCK: { UPDATE: 'UPDATE' }, rollback: vi.fn(), commit: vi.fn() };
const LIBRARY_ID = '11111111-1111-4111-8111-111111111111';

function installManagedTransaction() {
  database.transaction.mockImplementation(async (callback) => {
    try {
      const result = await callback(TX);
      TX.commit();
      return result;
    } catch (error) {
      TX.rollback();
      throw error;
    }
  });
}

function generatedClass(overrides = {}) {
  return {
    name: 'Atomic RED Class',
    classFormat: 'full_group',
    dayType: 'full_body',
    targetDuration: 45,
    expectedParticipants: 12,
    aiGenerated: false,
    equipmentProfileId: 17,
    spaceProfileId: 27,
    explanations: { source: 'synthetic' },
    relaxationSummary: 'synthetic summary',
    stations: [{
      id: 801,
      templateId: 9001,
      trainerId: 901,
      stationIndex: 0,
      name: 'Injected station',
      sortOrder: 4,
    }],
    exercises: [{
      id: 802,
      templateId: 9001,
      trainerId: 901,
      stationIndex: null,
      exerciseName: 'Full Group Movement',
      sourceExerciseName: 'Original Movement',
      exerciseLibraryId: LIBRARY_ID,
      durationSec: 0,
      restSec: 0,
      sortOrder: 7,
      board: 'alternative',
      selectionReason: 'requested_region_mod',
      selectionChips: ['knee'],
      selectionRung: 'same_region',
      painCaution: 'review form',
      painSwap: 'Wall Sit',
      canonicalExerciseKey: 'full-group-movement',
      detailsVerified: true,
    }],
    stretches: [{
      id: 803,
      templateId: 9001,
      trainerId: 901,
      stretchName: 'Injected stretch',
      durationSec: 0,
      sortOrder: 0,
    }],
    overflowPlan: {
      id: 804,
      templateId: 9001,
      trainerId: 901,
      exerciseName: 'Injected overflow',
      durationSec: 0,
      board: 'lowImpact',
    },
    ...overrides,
  };
}

let saveBootcampTemplate;

beforeEach(async () => {
  vi.clearAllMocks();
  models.template.create.mockResolvedValue({ id: 501, metadata: {} });
  models.station.bulkCreate.mockResolvedValue([{ id: 601 }]);
  models.exercise.bulkCreate.mockResolvedValue([{ id: 701 }]);
  models.stretch.bulkCreate.mockResolvedValue([{ id: 801 }]);
  models.overflow.create.mockResolvedValue({ id: 901 });
  models.libraryExercise.findAll.mockResolvedValue([]);
  TX.rollback.mockReset();
  TX.commit.mockReset();
  installManagedTransaction();
  ({ saveBootcampTemplate } = await import('../../../backend/services/bootcamp/bootcampCrud.mjs'));
});

describe('server RED: bootcamp template save contract', () => {
  it('owns one managed transaction and passes it to the parent and every child write', async () => {
    await saveBootcampTemplate(generatedClass(), 41);

    // RED contract: service ownership must be visible at every production write.
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect.soft(models.template.create.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.station.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.exercise.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.stretch.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.overflow.create.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect(TX.commit).toHaveBeenCalledTimes(1);
    expect(TX.rollback).not.toHaveBeenCalled();
  });

  it('rolls back the synthetic transaction after a late child failure', async () => {
    models.exercise.bulkCreate.mockRejectedValueOnce(new Error('synthetic exercise write failure'));

    await expect(
      saveBootcampTemplate(generatedClass(), 41),
    ).rejects.toThrow('synthetic exercise write failure');

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(TX.rollback).toHaveBeenCalledTimes(1);
    expect(TX.commit).not.toHaveBeenCalled();
  });

  it('passes a caller-owned transaction without committing or rolling it back', async () => {
    database.transaction.mockImplementation(() => {
      throw new Error('caller-owned transaction must not be nested');
    });

    await saveBootcampTemplate(generatedClass(), 41, { transaction: TX });

    expect(database.transaction).not.toHaveBeenCalled();
    expect.soft(models.template.create.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.station.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.exercise.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.stretch.bulkCreate.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect.soft(models.overflow.create.mock.calls[0]?.[1]).toMatchObject({ transaction: TX });
    expect(TX.rollback).not.toHaveBeenCalled();
    expect(TX.commit).not.toHaveBeenCalled();
  });

  it('ignores caller child IDs and foreign keys while preserving trusted ownership', async () => {
    await saveBootcampTemplate(generatedClass(), 41);

    const station = models.station.bulkCreate.mock.calls[0][0][0];
    const stretch = models.stretch.bulkCreate.mock.calls[0][0][0];
    const overflow = models.overflow.create.mock.calls[0][0];

    expect.soft(station.templateId).toBe(501);
    expect.soft(station).not.toHaveProperty('id');
    expect.soft(station).not.toHaveProperty('trainerId');
    expect.soft(stretch.templateId).toBe(501);
    expect.soft(stretch).not.toHaveProperty('id');
    expect.soft(stretch).not.toHaveProperty('trainerId');
    expect.soft(overflow.templateId).toBe(501);
    expect.soft(overflow).not.toHaveProperty('id');
    expect.soft(overflow).not.toHaveProperty('trainerId');
  });

  it('persists profile IDs and a server-built provenance manifest for full-group rows', async () => {
    await saveBootcampTemplate(generatedClass(), 41);

    const parent = models.template.create.mock.calls[0][0];
    const exercise = models.exercise.bulkCreate.mock.calls[0][0][0];

    expect.soft(parent.equipmentProfileId).toBe(17);
    expect.soft(parent.spaceProfileId).toBe(27);
    expect.soft(parent.metadata?.selectionManifestV1).toEqual(expect.objectContaining({
      version: 1,
    }));
    expect.soft(parent.metadata?.selectionManifestV1).toEqual(expect.objectContaining({
      entries: expect.anything(),
    }));
    expect.soft(exercise.sortOrder).toBe(7);
    expect.soft(exercise.board).toBe('alternative');
    expect.soft(exercise.restSec).toBe(0);
  });
});
