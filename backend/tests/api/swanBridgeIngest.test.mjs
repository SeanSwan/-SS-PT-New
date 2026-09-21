/**
 * SwanGuard -> SwanStudios Spotlight bridge — integration contract (S3)
 * ===========================================================================
 * These are REAL signed requests against the real router, not source greps: the HMAC,
 * the skew window, the banned-terms second gate, and the (itemId, revision) idempotency
 * rule are all exercised end to end.
 *
 * The DB model and R2 are mocked — no network, no database.
 *
 * ── TWO CHANGES 2026-09-20, both required by R1's D1 remediation ─────────────────────
 *
 * 1. MOCK SHAPE. The route no longer reads the row and calls an INSTANCE `update()`. It calls
 *    the static `SwanSpotlight.update(values, { where: { revision: { [Op.lt]: revision } } })`,
 *    so `mockUpdate` replaces the per-test instance spy and resolves to Sequelize's
 *    `[affectedCount]`.
 *
 * 2. MOCK SPECIFIER — this file was hostile review F10. It stubbed `r2StorageService.mjs` for
 *    `uploadPhoto`, but the route imports that from `photoStorageService.mjs`; the old
 *    `r2StorageService.mjs` does not export it. So `mockUploadPhoto` NEVER FIRED and the two
 *    image assertions below passed only because the real upload failed on missing credentials.
 *    They were passing for a reason unrelated to what they claimed to test. The specifier is
 *    corrected here, which is what F10 asked for, so those two cases now exercise the mock.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindByPk, mockUpdate, mockCreate, mockUploadPhoto, mockFetchDecode } = vi.hoisted(() => ({
  mockFindByPk: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockUploadPhoto: vi.fn(),
  mockFetchDecode: vi.fn(),
}));

vi.mock('../../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate },
}));

vi.mock('../../services/photoStorageService.mjs', () => ({
  uploadPhoto: mockUploadPhoto,
}));

// The fetch layer is mocked ONLY so one test can force a SUCCESSFUL decode — without that the
// real fetch fails on DNS and `uploadPhoto` is never reached, which is how F10's assertions
// managed to pass without exercising anything. The default implementation is the REAL one, so
// every other case (notably the non-http protocol refusal) still exercises the shipped
// validator rather than a stub that agrees with itself.
vi.mock('../../services/spotlightImageFetch.mjs', () => ({
  fetchAndDecodeSpotlightImage: mockFetchDecode,
}));
const actualFetch = await vi.importActual('../../services/spotlightImageFetch.mjs');

const SECRET = 'test-swan-bridge-secret-value-0123456789';
const { signPayload, buildCanonicalPayload } = await import('../../services/swanBridgeSignature.mjs');
const { default: bridgeRouter } = await import('../../routes/bridge/bridgeIngestRoutes.mjs');

const app = express();
app.use('/api/bridge', bridgeRouter);

const body = (overrides = {}) => ({
  itemId: '11111111-2222-3333-4444-555555555555',
  revision: 1,
  retracted: false,
  headline: 'A community garden doubled its harvest',
  dek: 'Neighbours pooled a season of work and shared the yield.',
  curatorNote: 'Worth a smile.',
  imageUrl: null,
  sourceAttribution: { name: 'Local Greens', url: 'https://example.org/story' },
  gate: { checklistHash: 'a'.repeat(64), curatorId: 'op-1', reviewedAt: '2026-09-18T00:00:00.000Z' },
  ...overrides,
});

/** POST with a valid signature unless overridden. */
const post = async (payload, opts = {}) => {
  const raw = JSON.stringify(payload);
  const timestamp = opts.timestamp ?? new Date().toISOString();
  const signature = opts.signature ?? signPayload(timestamp, Buffer.from(raw), opts.secret ?? SECRET);
  return request(app)
    .post('/api/bridge/spotlight')
    .set('Content-Type', 'application/json')
    .set('X-Swan-Signature', signature)
    .set('X-Swan-Timestamp', timestamp)
    .send(raw);
};

/** The predicate the database is asked to evaluate — the D1 fix, seen from here. */
const predicateOf = (call) => call[1]?.where?.revision?.[Op.lt];

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockFindByPk.mockReset().mockResolvedValue(null);
  // Default: the conditional UPDATE matches nothing, so the create path runs.
  mockUpdate.mockReset().mockResolvedValue([0]);
  mockCreate.mockReset().mockResolvedValue({});
  mockUploadPhoto.mockReset();
  // Default to the REAL decoder; only the upload-failure test below overrides it.
  mockFetchDecode.mockReset().mockImplementation(actualFetch.fetchAndDecodeSpotlightImage);
});

afterEach(() => {
  delete process.env.SPOTLIGHT_ENABLED;
  delete process.env.SWAN_BRIDGE_SECRET_V1;
});

describe('bridge ingest — kill switch', () => {
  it('returns 503 and stores nothing when SPOTLIGHT_ENABLED is not true', async () => {
    process.env.SPOTLIGHT_ENABLED = 'false';
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('bridge ingest — authentication', () => {
  it('accepts a correctly signed payload', async () => {
    const res = await post(body());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a tampered body with 401 (signature no longer matches the bytes)', async () => {
    const raw = JSON.stringify(body());
    const timestamp = new Date().toISOString();
    const signature = signPayload(timestamp, Buffer.from(raw), SECRET);
    const res = await request(app)
      .post('/api/bridge/spotlight')
      .set('Content-Type', 'application/json')
      .set('X-Swan-Signature', signature)
      .set('X-Swan-Timestamp', timestamp)
      .send(JSON.stringify({ ...body(), headline: 'Tampered headline' }));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret with 401', async () => {
    const res = await post(body(), { secret: 'a-completely-different-secret-value-000000' });
    expect(res.status).toBe(401);
  });

  it('rejects a signature outside the +/-300s skew window', async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const res = await post(body(), { timestamp: stale });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGNATURE_EXPIRED');
  });

  it('rejects a malformed signature without throwing a 500', async () => {
    const res = await post(body(), { signature: 'sha256=not-hex' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGNATURE_MALFORMED');
  });

  it('never discloses the secret name or value in a failure body', async () => {
    delete process.env.SWAN_BRIDGE_SECRET_V1;
    const res = await post(body());
    expect(res.status).toBe(401);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('SWAN_BRIDGE_SECRET');
    expect(serialized).not.toContain(SECRET);
  });

  it('accepts a signature built from the documented canonical string', async () => {
    // Guards the wire contract itself: timestamp + '.' + rawBody.
    const raw = JSON.stringify(body());
    const timestamp = new Date().toISOString();
    const crypto = await import('node:crypto');
    const signature = `sha256=${crypto
      .createHmac('sha256', SECRET)
      .update(buildCanonicalPayload(timestamp, Buffer.from(raw)))
      .digest('hex')}`;
    const res = await request(app)
      .post('/api/bridge/spotlight')
      .set('Content-Type', 'application/json')
      .set('X-Swan-Signature', signature)
      .set('X-Swan-Timestamp', timestamp)
      .send(raw);
    expect(res.status).toBe(200);
  });
});

describe('bridge ingest — validation and the positivity gate', () => {
  it('rejects a payload missing a headline with 422', async () => {
    const res = await post(body({ headline: '' }));
    expect(res.status).toBe(422);
  });

  it('rejects a non-integer revision with 422', async () => {
    const res = await post(body({ revision: 'one' }));
    expect(res.status).toBe(422);
  });

  it('rejects a banned term in the headline with 422 (second gate)', async () => {
    const res = await post(body({ headline: 'Election night drama downtown' }));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BANNED_TERM');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a banned term hiding in the curator note', async () => {
    const res = await post(body({ curatorNote: 'Ignore the partisan noise, this is lovely.' }));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BANNED_TERM');
  });

  it('accepts positive copy that contains no banned term', async () => {
    const res = await post(body({ headline: 'Runners raised funds for the shelter' }));
    expect(res.status).toBe(200);
  });
});

describe('bridge ingest — idempotency', () => {
  it('treats a re-delivered revision as a no-op', async () => {
    mockFindByPk.mockResolvedValue({ revision: 3, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);
    const res = await post(body({ revision: 3 }));
    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
    // The predicate was `revision < 3` — an equal revision is rejected by the database.
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(3);
  });

  it('treats an older revision as a no-op (out-of-order delivery)', async () => {
    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);
    const res = await post(body({ revision: 2 }));
    expect(res.body.noop).toBe(true);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
  });

  it('upserts when the revision is higher', async () => {
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: null });
    mockUpdate.mockResolvedValue([1]);
    const res = await post(body({ revision: 4 }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('marks a retraction instead of deleting the row', async () => {
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: 'https://r2/x.png' });
    mockUpdate.mockResolvedValue([1]);
    const res = await post(body({ revision: 2, retracted: true }));
    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].retracted).toBe(true);
  });
});

describe('bridge ingest — image re-host is never fatal', () => {
  it('stores the item with a null image when the re-host fails', async () => {
    // F10: this now actually exercises the upload mock. It used to pass because the real upload
    // failed on missing credentials against a module the route never imported.
    // The DECODE is forced to succeed so the failure under test is the UPLOAD's, not the
    // fetch's — otherwise DNS fails first and `uploadPhoto` is never reached at all.
    mockFetchDecode.mockResolvedValue({
      ok: true,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ext: 'png',
      contentType: 'image/png',
    });
    mockUploadPhoto.mockRejectedValue(new Error('R2 down'));

    const res = await post(body({ imageUrl: 'https://swanguard.example/pic.png' }));

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  });

  it('refuses to hot-link a non-http image URL', async () => {
    const res = await post(body({ imageUrl: 'javascript:alert(1)' }));
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
    // Rejected before the uploader is ever reached — the fetch layer owns that check.
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });
});
