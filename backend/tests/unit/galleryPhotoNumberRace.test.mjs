import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Photo-number race regression — E-09 completion (G9 hostile review, major 7).
 * ============================================================================
 *
 * THE DEFECT. `allocatePhotoNumbers` took a row lock and committed WITHOUT
 * inserting anything, so the "reservation" evaporated before the photo row was
 * created — minutes later, after watermarking and the R2 upload. Two concurrent
 * uploads to one event were handed the same number, and the unique index on
 * (event_id, photo_number) converted the loser into a raw 500 AFTER its bytes
 * were already in storage.
 *
 * THE FIX. `createPhotoWithRacingNumber` keeps the unique index as the authority:
 * on a unique-constraint conflict it re-numbers the ROW against a fresh max and
 * retries (bounded), keeping the storage keys that were actually uploaded — a
 * cosmetic key/number divergence in the loser case, instead of a lost upload.
 *
 * WHY MOCKED. The property under test is the retry loop's interaction with the
 * model's conflict signal, not the upload pipeline; mocking GalleryPhoto and the
 * sequelize transaction lets each interleaving be CONSTRUCTED (conflict twice
 * then success, conflict forever, non-conflict errors) rather than raced for.
 */

const state = vi.hoisted(() => ({ maxQueue: [], createImpl: null, createCalls: [] }));

vi.mock('../../models/GalleryPhoto.mjs', () => ({
  default: {
    create: vi.fn(async (payload) => {
      state.createCalls.push(payload.photoNumber);
      if (state.createImpl) return state.createImpl(payload);
      return { id: state.createCalls.length, ...payload };
    }),
    max: vi.fn(async () => state.maxQueue.length ? state.maxQueue.shift() : 40),
  },
}));

vi.mock('../../models/GalleryEvent.mjs', () => ({
  default: { findByPk: vi.fn(async () => ({ id: 7, slug: 'race-fixture' })) },
}));

vi.mock('../../database.mjs', async () => {
  // A REAL (unconnected) Sequelize instance: the other gallery models .init
  // against it at import time, which must not throw. Only `transaction` is
  // stubbed, because allocatePhotoNumbers' retry path is what the tests drive.
  const { Sequelize } = await import('sequelize');
  const sequelize = new Sequelize({ dialect: 'postgres', host: 'mock', username: 'mock', password: 'mock', database: 'mock', logging: false });
  sequelize.transaction = async () => ({
    LOCK: { UPDATE: 'UPDATE' },
    commit: async () => {},
    rollback: async () => {},
  });
  return { default: sequelize };
});

const routes = await import('../../routes/adminGalleryRoutes.mjs');
const { createPhotoWithRacingNumber } = routes;

const uniqueConflict = () => {
  const err = new Error('duplicate key value violates unique constraint "gallery_photos_event_photo_uq"');
  err.name = 'SequelizeUniqueConstraintError';
  err.original = { code: '23505' };
  return err;
};

describe('createPhotoWithRacingNumber (G9 major 7)', () => {
  beforeEach(() => {
    state.maxQueue = [];
    state.createCalls = [];
    state.createImpl = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates with the initial number when there is no conflict', async () => {
    const photo = await createPhotoWithRacingNumber(7, 41, (n) => ({ photoNumber: n, storageKey: `k${n}` }));
    expect(photo.photoNumber).toBe(41);
    expect(state.createCalls).toEqual([41]);
  });

  it('re-numbers against a FRESH max on a unique conflict and keeps the uploaded keys', async () => {
    state.maxQueue = [50]; // the winner committed; a fresh max read sees 50
    state.createImpl = async (payload) => {
      if (payload.photoNumber === 41) throw uniqueConflict();
      return { id: 1, ...payload };
    };
    const photo = await createPhotoWithRacingNumber(7, 41, (n) => ({ photoNumber: n, storageKey: 'uploaded-key.jpg' }));
    expect(state.createCalls).toEqual([41, 51]);
    expect(photo.photoNumber).toBe(51);
    // the storage key is untouched — it addresses bytes that already exist in R2
    expect(photo.storageKey).toBe('uploaded-key.jpg');
  });

  it('propagates NON-conflict errors immediately instead of retrying them', async () => {
    state.createImpl = async () => { throw new Error('R2 is down'); };
    await expect(createPhotoWithRacingNumber(7, 41, (n) => ({ photoNumber: n })))
      .rejects.toThrow('R2 is down');
    expect(state.createCalls).toEqual([41]);
  });

  it('gives up after three attempts when every allocation loses, and throws the conflict', async () => {
    state.createImpl = async () => { throw uniqueConflict(); };
    await expect(createPhotoWithRacingNumber(7, 41, (n) => ({ photoNumber: n })))
      .rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
    expect(state.createCalls.length).toBe(3);
  });
});
