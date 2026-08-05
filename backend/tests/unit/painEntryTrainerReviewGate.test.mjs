/**
 * Slice 0 (F2) — clients cannot self-resolve or self-downgrade a >=7 pain
 * entry. Before this gate, a client could resolve their own 8/10 via
 * PUT /api/pain-entries/:userId/:entryId/resolve and silently flip the
 * fail-closed planning safety gate back open.
 * Regression source: PAIN-CHART-KIMI-K3-REVIEW-2026-08-04 F2 (verified).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneMock, updateMock } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    ClientPainEntry: { findOne: findOneMock },
  }),
}));

const { resolvePainEntry, updatePainEntry } = await import('../../controllers/painEntryController.mjs');

const makeRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const makeEntry = (painLevel) => ({
  id: 7,
  userId: 42,
  painLevel,
  update: updateMock,
});

const clientReq = (body = {}) => ({
  params: { userId: '42', entryId: '7' },
  user: { id: 42, role: 'client' },
  body,
});

const trainerReq = (body = {}) => ({
  params: { userId: '42', entryId: '7' },
  user: { id: 9, role: 'trainer' },
  body,
});

beforeEach(() => {
  findOneMock.mockReset();
  updateMock.mockReset();
  updateMock.mockResolvedValue(undefined);
});

describe('resolvePainEntry — trainer-review gate', () => {
  it('BLOCKS a client resolving their own >=7 entry (403 TRAINER_REVIEW_REQUIRED)', async () => {
    findOneMock.mockResolvedValue(makeEntry(8));
    const res = makeRes();
    await resolvePainEntry(clientReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'TRAINER_REVIEW_REQUIRED' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('allows a client to resolve their own sub-7 entry', async () => {
    findOneMock.mockResolvedValue(makeEntry(5));
    const res = makeRes();
    await resolvePainEntry(clientReq(), res);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }), expect.objectContaining({ revisionActorId: expect.any(Number) }));
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('allows a trainer to resolve a >=7 entry', async () => {
    findOneMock.mockResolvedValue(makeEntry(9));
    const res = makeRes();
    await resolvePainEntry(trainerReq(), res);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }), expect.objectContaining({ revisionActorId: expect.any(Number) }));
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});

describe('updatePainEntry — severity-downgrade gate', () => {
  it('BLOCKS a client lowering a >=7 entry (403, no write)', async () => {
    findOneMock.mockResolvedValue(makeEntry(8));
    const res = makeRes();
    await updatePainEntry(clientReq({ painLevel: 3 }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'TRAINER_REVIEW_REQUIRED' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('allows a client to RAISE severity on a >=7 entry', async () => {
    findOneMock.mockResolvedValue(makeEntry(7));
    const res = makeRes();
    await updatePainEntry(clientReq({ painLevel: 9 }), res);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ painLevel: 9 }), expect.objectContaining({ revisionActorId: expect.any(Number) }));
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('allows a client to lower a sub-7 entry', async () => {
    findOneMock.mockResolvedValue(makeEntry(6));
    const res = makeRes();
    await updatePainEntry(clientReq({ painLevel: 2 }), res);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ painLevel: 2 }), expect.objectContaining({ revisionActorId: expect.any(Number) }));
  });

  it('allows a trainer to lower a >=7 entry', async () => {
    findOneMock.mockResolvedValue(makeEntry(9));
    const res = makeRes();
    await updatePainEntry(trainerReq({ painLevel: 4 }), res);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ painLevel: 4 }), expect.objectContaining({ revisionActorId: expect.any(Number) }));
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('still blocks clients from touching trainer-only fields', async () => {
    findOneMock.mockResolvedValue(makeEntry(5));
    const res = makeRes();
    await updatePainEntry(clientReq({ aiNotes: 'client-injected guidance', painLevel: 4 }), res);
    const written = updateMock.mock.calls[0][0];
    expect(written).not.toHaveProperty('aiNotes');
  });
});
