/**
 * Slice 0 (C3) — track_my_pain must enforce the same validation as every
 * other pain writer. The old inline create accepted ANY string as bodyRegion
 * and clamped non-numeric painLevel to 1/10 instead of erroring.
 * Regression source: PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04 §3 P0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('../../models/index.mjs', () => ({
  getClientPainEntry: () => ({ create: createMock }),
  getAllModels: () => ({ ClientPainEntry: { create: createMock, findAll: vi.fn(async () => []) } }),
}));

const { dispatchTrackMyPain } = await import('../../services/ai/dispatchers/clientSelfServicePainDispatchers.mjs');

const ctx = { user: { id: 42 } };

describe('dispatchTrackMyPain (client self-service lane)', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockImplementation(async (row) => ({ id: 901, ...row }));
  });

  it('REJECTS a garbage bodyRegion instead of writing a junk row', async () => {
    await expect(
      dispatchTrackMyPain({ bodyRegion: 'my left everything', painLevel: 5 }, ctx)
    ).rejects.toThrow(/Invalid bodyRegion/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('REJECTS an empty bodyRegion', async () => {
    await expect(dispatchTrackMyPain({ painLevel: 5 }, ctx)).rejects.toThrow(/Invalid bodyRegion/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('REJECTS non-numeric painLevel instead of clamping it to 1/10', async () => {
    await expect(
      dispatchTrackMyPain({ bodyRegion: 'left_knee', painLevel: 'pretty bad' }, ctx)
    ).rejects.toThrow(/painLevel must be an integer between 1 and 10/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('REJECTS out-of-range painLevel', async () => {
    await expect(
      dispatchTrackMyPain({ bodyRegion: 'left_knee', painLevel: 14 }, ctx)
    ).rejects.toThrow(/painLevel must be an integer between 1 and 10/);
  });

  it('creates a valid entry with createdById = self and accepts the bodyPart alias', async () => {
    const result = await dispatchTrackMyPain(
      { bodyPart: 'left_knee', painLevel: 6, notes: 'hurts on stairs' },
      ctx
    );
    expect(createMock).toHaveBeenCalledTimes(1);
    const row = createMock.mock.calls[0][0];
    expect(row).toMatchObject({
      userId: 42,
      createdById: 42,
      bodyRegion: 'left_knee',
      painLevel: 6,
      description: 'hurts on stairs',
      isActive: true,
    });
    expect(result).toMatchObject({ entryId: 901, userId: 42, bodyRegion: 'left_knee', painLevel: 6, isActive: true });
  });
});
