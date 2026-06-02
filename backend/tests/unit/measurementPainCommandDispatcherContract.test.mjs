import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({ measurementRow = null, painRows = [] } = {}) {
  vi.resetModules();

  const BodyMeasurement = {
    findOne: vi.fn(async () => measurementRow),
    count: vi.fn(async () => (measurementRow ? 1 : 0)),
  };
  const ClientPainEntry = {
    findAll: vi.fn(async () => painRows),
  };
  const logWeighIn = vi.fn(async (data, opts) => ({
    measurementId: 'measure-1',
    userId: opts.clientId,
    weight: data.weight,
    weightUnit: data.weightUnit,
    measurementDate: '2026-05-31',
  }));
  const logMeasurements = vi.fn(async (_data, opts) => ({
    measurementId: 'measure-2',
    userId: opts.clientId,
    measurementDate: '2026-05-31',
    weight: 181,
    weightUnit: 'lbs',
    bodyFatPercentage: null,
    fieldsLogged: 1,
  }));
  const createPainEntry = vi.fn(async (data, opts) => ({
    entryId: 'pain-1',
    userId: opts.clientId,
    bodyRegion: data.bodyRegion,
    painLevel: data.painLevel,
    isActive: true,
  }));
  const resolvePainEntry = vi.fn(async (data, opts) => ({
    entryId: 'pain-1',
    userId: opts.clientId,
    bodyRegion: data.bodyRegion,
    isActive: false,
    resolvedAt: '2026-05-31',
  }));
  const updatePainEntryByRegion = vi.fn(async (data, opts) => ({
    entryId: 'pain-1',
    userId: opts.clientId,
    bodyRegion: data.bodyRegion,
    painLevel: data.painLevel,
    isActive: true,
  }));

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({}),
    getBodyMeasurement: () => BodyMeasurement,
    getClientPainEntry: () => ClientPainEntry,
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));
  vi.doMock('../../services/measurementWriteService.mjs', () => ({
    logWeighIn,
    logMeasurements,
  }));
  vi.doMock('../../services/ai/painWriteService.mjs', () => ({
    createPainEntry,
    ALLOWED_BODY_REGIONS: new Set(['left_knee', 'lower_back']),
  }));
  vi.doMock('../../services/ai/painFollowUpService.mjs', () => ({
    resolvePainEntry,
    updatePainEntryByRegion,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    BodyMeasurement,
    ClientPainEntry,
    logWeighIn,
    logMeasurements,
    createPainEntry,
    resolvePainEntry,
    updatePainEntryByRegion,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('measurement and pain command dispatchers', () => {
  it('reads selected-client measurements when params contain stale client identity', async () => {
    const { dispatch, hasDispatcher, BodyMeasurement } = await loadDispatcher({
      measurementRow: {
        measurementDate: new Date('2026-05-31T12:00:00.000Z'),
        weight: '181.5',
        weightUnit: 'lbs',
        bodyFatPercentage: '15.2',
      },
    });

    expect(hasDispatcher('view_latest_measurements')).toBe(true);

    const result = await dispatch('view_latest_measurements', { clientId: 999 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(BodyMeasurement.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
    }));
    expect(result).toMatchObject({ userId: 42, weight: 181.5, bodyFatPercentage: 15.2 });
  });

  it('writes selected-client measurements when params contain stale client identity', async () => {
    const { dispatch, hasDispatcher, logMeasurements } = await loadDispatcher();

    expect(hasDispatcher('log_measurements')).toBe(true);

    const result = await dispatch('log_measurements', {
      clientId: 999,
      weight: 181,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(logMeasurements).toHaveBeenCalledWith(expect.any(Object), {
      clientId: 42,
      trainerId: 7,
    });
    expect(result).toMatchObject({ userId: 42, measurementId: 'measure-2' });
  });

  it('reads selected-client active pain when params contain stale client identity', async () => {
    const { dispatch, hasDispatcher, ClientPainEntry } = await loadDispatcher({
      painRows: [
        { bodyRegion: 'left_knee', painLevel: 8 },
        { bodyRegion: 'lower_back', painLevel: 5 },
      ],
    });

    expect(hasDispatcher('view_active_pain')).toBe(true);

    const result = await dispatch('view_active_pain', { clientId: 999 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(ClientPainEntry.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 42 }),
    }));
    expect(result).toMatchObject({
      count: 2,
      highestPainLevel: 8,
      mostRecentRegion: 'left_knee',
    });
  });

  it('writes selected-client pain entries when params contain stale client identity', async () => {
    const { dispatch, hasDispatcher, createPainEntry } = await loadDispatcher();

    expect(hasDispatcher('add_pain_entry')).toBe(true);

    const result = await dispatch('add_pain_entry', {
      clientId: 999,
      bodyRegion: 'left_knee',
      painLevel: 7,
      notes: 'Private pain note',
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(createPainEntry).toHaveBeenCalledWith(expect.objectContaining({
      bodyRegion: 'left_knee',
      painLevel: 7,
    }), {
      clientId: 42,
      trainerId: 7,
    });
    expect(result).toMatchObject({ userId: 42, entryId: 'pain-1' });
    expect(JSON.stringify(result)).not.toContain('Private pain note');
  });
});
