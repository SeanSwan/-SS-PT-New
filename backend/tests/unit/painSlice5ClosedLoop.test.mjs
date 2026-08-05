/**
 * Pain-Chart Slice 5 (C6/#7) — closed-loop check-in + trainer digest.
 * Locks the asymmetric gate direction (worse = immediate, better = trainer-
 * confirmed), the noise floor, validation, roster fail-closed scoping, and
 * the null-honest logger painLevel.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneMock, createMock, updateMock, assignmentFindAll, entryFindAll } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  assignmentFindAll: vi.fn(),
  entryFindAll: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'ClientPainEntry') return { findOne: findOneMock, create: createMock, findAll: entryFindAll };
    if (name === 'ClientTrainerAssignment') return { findAll: assignmentFindAll };
    if (name === 'User') return {};
    if (name === 'PainEntryRevision') return { findAll: vi.fn(async () => []) };
    throw new Error(`unexpected model ${name}`);
  },
}));

const { processPainCheckIn } = await import('../../services/painCheckInService.mjs');
const { getTrainerPainDigest } = await import('../../services/painDigestService.mjs');

beforeEach(() => {
  findOneMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  assignmentFindAll.mockReset();
  entryFindAll.mockReset();
});

describe('processPainCheckIn — asymmetric gate', () => {
  it('WORSE than the active entry raises severity immediately (safe direction)', async () => {
    findOneMock.mockResolvedValue({ id: 7, painLevel: 5, update: updateMock });
    const result = await processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'left_knee', painLevel: 8 });
    expect(result.outcome).toBe('raised');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ painLevel: 8, lastConfirmedAt: expect.any(Date) }),
      expect.objectContaining({ revisionActorId: 42 }),
    );
  });

  it('BETTER than the active entry never self-clears — acknowledged for trainer review', async () => {
    findOneMock.mockResolvedValue({ id: 7, painLevel: 8, update: updateMock });
    const result = await processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'left_knee', painLevel: 2 });
    expect(result.outcome).toBe('acknowledged');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('no active entry + level >= 4 creates a validated entry (episode hook links it)', async () => {
    findOneMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: 91 });
    const result = await processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'left_shoulder', painLevel: 6 });
    expect(result.outcome).toBe('created');
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      bodyRegion: 'left_shoulder',
      painLevel: 6,
      painContext: 'loaded_movement',
      isActive: true,
    }));
  });

  it('mild (1-3) with no active entry stays below the noise floor — no entry', async () => {
    findOneMock.mockResolvedValue(null);
    const result = await processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'left_calf', painLevel: 2 });
    expect(result.outcome).toBe('noted_mild');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects garbage regions and out-of-range levels (same law as every writer)', async () => {
    await expect(processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'everything', painLevel: 5 }))
      .rejects.toThrow(/Invalid bodyRegion/);
    await expect(processPainCheckIn({ userId: 42, actorId: 42, bodyRegion: 'left_knee', painLevel: 'ouch' }))
      .rejects.toThrow(/painLevel must be/);
  });
});

describe('getTrainerPainDigest — roster fail-closed', () => {
  it('empty trainer roster returns an empty digest, never platform-wide data', async () => {
    assignmentFindAll.mockResolvedValue([]);
    const digest = await getTrainerPainDigest(9, { role: 'trainer' });
    expect(digest.rosterSize).toBe(0);
    expect(digest.worsening).toEqual([]);
    expect(digest.staleSevere).toEqual([]);
    expect(entryFindAll).not.toHaveBeenCalled();
  });

  it('degrades to unavailable instead of throwing', async () => {
    assignmentFindAll.mockRejectedValue(new Error('db down'));
    const digest = await getTrainerPainDigest(9, { role: 'trainer' });
    expect(digest.status).toBe('unavailable');
  });
});

describe('C6 — AI workout logger painLevel is null-honest', () => {
  it('no hardcoded painLevel: 0 remains in aiDataWriteService', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(path.resolve(here, '../../services/aiDataWriteService.mjs'), 'utf8');
    expect(src).not.toContain('painLevel: 0,');
    expect(src).toContain("clampIfProvided(ex.painLevel, 0, 10)");
  });
});
