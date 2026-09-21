/**
 * Spotlight ingest — image-column ownership and best-effort attachment (R5-03, R5-04)
 * =================================================================================
 * Two MEDIUM findings from Astra's round 5. They share a file and a root cause — the image phase
 * was treated as if it were part of the revision write, when it is a separate, later, optional
 * step — so they are pinned together here.
 *
 * R5-03 — A STALE SNAPSHOT CAN OVERWRITE A NEWER IMAGE.
 * The handler read `stored.imageUrl` before the write and carried that value into the write. The
 * write predicate orders REVISIONS; it says nothing about the currency of a field riding along
 * inside the write. Interleaving: a row at rev 1 holds image A; a text-only rev 3 reads A and
 * awaits its re-host; rev 2 completes and writes image B; rev 3's UPDATE runs, `2 < 3` PASSES,
 * and A overwrites B. The newer revision's image is replaced by a snapshot taken before it
 * existed. Fixed by not writing the column at all: PostgreSQL keeps whatever it holds when the
 * row is locked.
 *
 * R5-04 — AN ATTACHMENT FAILURE 500s AN INGEST THAT ALREADY SUCCEEDED.
 * The attachment statement sat inside the handler's outer `try`, whose `catch` answers HTTP 500.
 * The text revision had already committed, so the client was told the ingest failed for work that
 * was stored — and a retry of the same revision returns no-op before the image is retried. This
 * breaks the design stated a few lines above it ("never fail the ingest over a picture"). Fixed
 * by containing the attachment in its own try, keeping the committed result.
 *
 * Both tests are behavioural: they drive the real route with the real body parser and signed
 * requests, and assert on the payload handed to the model. Nothing here reaches DNS, R2, or a
 * database, so no claim is made about what PostgreSQL does under real contention — only about
 * which statement the code issues.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
} = vi.hoisted(() => ({
  mockFindByPk: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockFindAll: vi.fn(),
  mockUploadPhoto: vi.fn(),
  mockFetchDecode: vi.fn(),
}));

vi.mock('../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate, findAll: mockFindAll },
}));
vi.mock('../services/photoStorageService.mjs', () => ({ uploadPhoto: mockUploadPhoto }));
vi.mock('../services/spotlightImageFetch.mjs', () => ({
  fetchAndDecodeSpotlightImage: mockFetchDecode,
}));

const SECRET = 'test-swan-bridge-secret-value-0123456789';
const { signPayload } = await import('../services/swanBridgeSignature.mjs');
const { default: bridgeRouter } = await import('../routes/bridge/bridgeIngestRoutes.mjs');

const app = express();
app.use('/api/bridge', bridgeRouter);

const ITEM = '11111111-2222-3333-4444-555555555555';
const A = 'https://r2.example/older-image-AAAA.jpg';
const B = 'https://r2.example/newer-image-BBBB.jpg';
const INCOMING = 'https://swanguard.example/incoming.png';

const body = (overrides = {}) => ({
  itemId: ITEM,
  revision: 2,
  retracted: false,
  headline: 'A community garden doubled its harvest',
  ...overrides,
});

const post = async (payload) => {
  const raw = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = signPayload(timestamp, Buffer.from(raw), SECRET);
  return request(app)
    .post('/api/bridge/spotlight')
    .set('Content-Type', 'application/json')
    .set('X-Swan-Signature', signature)
    .set('X-Swan-Timestamp', timestamp)
    .send(raw);
};

/** The payload of the conditional apply write — the statement R5-03 is about. */
const applyPayload = () => mockUpdate.mock.calls[0][0];

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockFindByPk.mockReset().mockResolvedValue(null);
  mockUpdate.mockReset().mockResolvedValue([0]);
  mockCreate.mockReset().mockResolvedValue({});
  mockFindAll.mockReset().mockResolvedValue([]);
  mockUploadPhoto.mockReset();
  mockFetchDecode.mockReset();
});

describe('R5-03 — the revision write does not carry a pre-write image snapshot', () => {
  it('omits the column on a text-only revision, so a newer image cannot be overwritten', async () => {
    // The row holds image A when we read it. Rev 2 (ours) carries no image, so the correct
    // outcome is that the column is never mentioned — whatever the row holds at commit time
    // survives, including an image written by a revision that lands after this read.
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: A });
    mockUpdate.mockResolvedValue([1]);

    const res = await post(body({ revision: 2, imageUrl: null }));

    expect(res.status).toBe(200);
    expect(applyPayload()).not.toHaveProperty('imageUrl');
    expect(JSON.stringify(applyPayload())).not.toContain(A);
  });

  it('omits the column on a RETRACTED revision too', async () => {
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: A });
    mockUpdate.mockResolvedValue([1]);

    await post(body({ revision: 2, retracted: true, imageUrl: INCOMING }));

    expect(applyPayload()).not.toHaveProperty('imageUrl');
  });

  it('does not let a stale read reach the write even when a newer image exists at read time', async () => {
    // The exact R5-03 interleaving, as far as it is expressible without concurrency: the read
    // observes one image and the write must not act on it. `B` stands for the image a newer
    // revision wrote; the pre-write read cannot see it, which is precisely why the write must
    // not be decided by that read.
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: A });
    mockUpdate.mockResolvedValue([1]);

    await post(body({ revision: 2, imageUrl: null }));

    const payload = applyPayload();
    expect(payload).not.toHaveProperty('imageUrl');
    expect(Object.values(payload)).not.toContain(A);
    expect(Object.values(payload)).not.toContain(B);
  });

  it('still SENDS the column when this revision carries a new image (null, then attach)', async () => {
    // The other half: a revision that is about to carry an image must clear it first, so a
    // failed re-host leaves null and the card renders text-only rather than showing a stale
    // picture from a previous revision (ban #37).
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: A });
    mockUpdate.mockResolvedValue([1]);
    mockFetchDecode.mockResolvedValue({
      ok: true, buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), ext: 'png', contentType: 'image/png',
    });
    mockUploadPhoto.mockResolvedValue({ url: 'https://r2.example/rehosted.png', storage: 'r2' });

    await post(body({ revision: 2, imageUrl: INCOMING }));

    expect(applyPayload()).toHaveProperty('imageUrl', null);
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  });

  it('inserts a NEW row with an explicit null rather than leaving the column undefined', async () => {
    // Regression on the fix itself. Omitting the key is right for an UPDATE, which has a prior
    // row to preserve — but on INSERT there is no prior row, so omitting it would silently
    // discard the column default. "Leave it alone" and "start it empty" are different statements
    // about the same column, so the two payloads differ.
    mockFindByPk.mockResolvedValue(null);
    mockUpdate.mockResolvedValue([0]);
    mockCreate.mockResolvedValue({});

    await post(body({ revision: 3, imageUrl: null }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toHaveProperty('imageUrl', null);
  });
});

describe('R5-04 — image attachment is best-effort and cannot fail a committed ingest', () => {
  const withRehostReady = () => {
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: null });
    mockUpdate.mockResolvedValue([1]);
    mockFetchDecode.mockResolvedValue({
      ok: true, buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), ext: 'png', contentType: 'image/png',
    });
  };

  it('answers 200 — not 500 — when the attachment statement throws', async () => {
    withRehostReady();
    mockUploadPhoto.mockResolvedValue({ url: 'https://r2.example/rehosted.png', storage: 'r2' });
    // The APPLY succeeds and the ATTACH throws. Before R5-04 this surfaced as a 500 for a text
    // revision that was already committed.
    mockUpdate
      .mockResolvedValueOnce([1])                        // the conditional apply
      .mockRejectedValueOnce(new Error('attach blew up')); // the image attach

    const res = await post(body({ revision: 2, imageUrl: INCOMING }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.revision).toBe(2);
  });

  it('answers 200 when the rehost itself rejects outright', async () => {
    withRehostReady();
    mockUploadPhoto.mockRejectedValue(new Error('R2 down'));

    const res = await post(body({ revision: 2, imageUrl: INCOMING }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('keeps the committed text revision, so the caller is not told to retry stored work', async () => {
    withRehostReady();
    mockUploadPhoto.mockResolvedValue({ url: 'https://r2.example/rehosted.png', storage: 'r2' });
    mockUpdate
      .mockResolvedValueOnce([1])
      .mockRejectedValueOnce(new Error('attach blew up'));

    const res = await post(body({ revision: 2, imageUrl: INCOMING }));

    // The response reports the revision as stored; it must NOT carry a failure code that would
    // invite a retry of a revision the bridge would then treat as a no-op.
    expect(res.body).toMatchObject({ success: true, itemId: ITEM, revision: 2 });
    expect(res.body.message).toBeUndefined();
  });

  it('still fails loudly when the APPLY itself throws — best-effort covers the image only', async () => {
    // The containment must not swallow real failures. If the revision write cannot be resolved,
    // the helper throws and the ingest is a genuine failure.
    mockUpdate.mockRejectedValue(new Error('database is gone'));

    const res = await post(body({ revision: 2, imageUrl: null }));

    expect(res.status).toBe(500);
  });
});
