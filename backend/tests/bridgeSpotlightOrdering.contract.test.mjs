/**
 * SwanGuard -> SwanStudios Spotlight bridge — ORDERING contract (R1)
 * ==================================================================
 * Scope: revision ordering, tombstone semantics, and the raw-body mount. This file
 * deliberately does NOT re-assert what `tests/api/swanBridgeIngest.test.mjs` (S3) already
 * covers — kill switch on POST, HMAC/skew/malformed signature, no-secret-disclosure, schema
 * validation, the banned-terms second gate, the four basic idempotency outcomes, and image
 * re-host non-fatality. Duplicating a green suite adds maintenance cost and no evidence.
 *
 * What is left is the part S3 does not touch: what happens when revisions arrive OUT OF
 * ORDER, how a tombstone resists a late replay, and what breaks if the bridge loses its
 * private body parser.
 *
 * The model and both network-touching services are mocked. Nothing here reaches DNS, R2,
 * or a database.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindByPk, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode } = vi.hoisted(() => ({
  mockFindByPk: vi.fn(),
  mockCreate: vi.fn(),
  mockFindAll: vi.fn(),
  mockUploadPhoto: vi.fn(),
  mockFetchDecode: vi.fn(),
}));

vi.mock('../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, create: mockCreate, findAll: mockFindAll },
}));

// NOTE: the route imports `uploadPhoto` from photoStorageService.mjs. S3 mocks
// r2StorageService.mjs, which does not export it — so its image assertions currently pass
// because the REAL upload fails on missing credentials, not because the mock fired. These
// are the specifiers the route actually resolves.
vi.mock('../services/photoStorageService.mjs', () => ({ uploadPhoto: mockUploadPhoto }));
vi.mock('../services/spotlightImageFetch.mjs', () => ({
  fetchAndDecodeSpotlightImage: mockFetchDecode,
}));

const SECRET = 'test-swan-bridge-secret-value-0123456789';
const { signPayload } = await import('../services/swanBridgeSignature.mjs');
const { default: bridgeRouter } = await import('../routes/bridge/bridgeIngestRoutes.mjs');

const app = express();
app.use('/api/bridge', bridgeRouter);

/** The regression rig: a global JSON parser mounted BEFORE the bridge router. */
const preParsedApp = express();
preParsedApp.use(express.json());
preParsedApp.use('/api/bridge', bridgeRouter);

const ITEM = '11111111-2222-3333-4444-555555555555';

const body = (overrides = {}) => ({
  itemId: ITEM,
  revision: 1,
  retracted: false,
  headline: 'A community garden doubled its harvest',
  imageUrl: null,
  ...overrides,
});

const send = (target, payload, opts = {}) => {
  const raw = JSON.stringify(payload);
  const timestamp = opts.timestamp ?? new Date().toISOString();
  const signature = opts.signature ?? signPayload(timestamp, Buffer.from(raw), SECRET);
  return request(target)
    .post('/api/bridge/spotlight')
    .set('Content-Type', 'application/json')
    .set('X-Swan-Signature', signature)
    .set('X-Swan-Timestamp', timestamp)
    .send(raw);
};

const getManifest = (opts = {}) => {
  const timestamp = new Date().toISOString();
  const signature = signPayload(timestamp, Buffer.alloc(0), SECRET);
  return request(app)
    .get('/api/bridge/spotlight/manifest')
    .set('X-Swan-Signature', signature)
    .set('X-Swan-Timestamp', timestamp);
};

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockFindByPk.mockReset().mockResolvedValue(null);
  mockCreate.mockReset().mockResolvedValue({});
  mockFindAll.mockReset().mockResolvedValue([]);
  mockUploadPhoto.mockReset();
  mockFetchDecode.mockReset();
});

afterEach(() => {
  delete process.env.SPOTLIGHT_ENABLED;
  delete process.env.SWAN_BRIDGE_SECRET_V1;
});

describe('spotlight ordering — a superseded revision changes nothing', () => {
  it('does not re-host an image that arrives on a superseded revision', async () => {
    const update = vi.fn();
    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null, update });

    const res = await send(app, body({ revision: 4, imageUrl: 'https://swanguard.example/late.png' }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    // The decisive assertion: the early return happens BEFORE rehostImage(), so the
    // network is never touched for an item that is already behind.
    expect(mockFetchDecode).not.toHaveBeenCalled();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('leaves the stored image untouched when a superseded revision carries a different one', async () => {
    const update = vi.fn();
    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg', update });

    await send(app, body({ revision: 8, imageUrl: 'https://swanguard.example/replacement.png' }));

    expect(update).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('treats a stale lower revision as a no-op once the higher one has landed', async () => {
    // SCOPE NARROWED after hostile review F02 (2026-09-20): this was named "...two racing
    // revisions...", but it sends ONE request against a store that already holds the winner.
    // That is sequential stale delivery, not a concurrent interleaving — the read-then-write
    // window in the route is not exercised, and closing it needs a transaction or an atomic
    // conditional apply. Reported as an open finding, not claimed here.
    const update = vi.fn();
    mockFindByPk.mockResolvedValue({ revision: 7, imageUrl: null, update });

    const res = await send(app, body({ revision: 6 }));

    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(7);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('spotlight ordering — tombstone semantics', () => {
  it('a late replay of an older, non-retracted revision cannot resurrect a retracted item', async () => {
    const update = vi.fn();
    // Item is retracted at revision 3; an old revision-2 delivery (retracted:false) is replayed.
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null, update });

    const res = await send(app, body({ revision: 2, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('a higher revision after retraction is applied and clears the tombstone', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg', update });

    const res = await send(app, body({ revision: 4, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.retracted).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].retracted).toBe(false);
  });

  it('retraction preserves the existing image rather than clearing it', async () => {
    // Documents real behaviour: a retracted row is excluded from the manifest and the rail,
    // so the retained URL is inert. Asserted so a future change to it is a deliberate one.
    const update = vi.fn().mockResolvedValue(undefined);
    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg', update });

    await send(app, body({ revision: 2, retracted: true, imageUrl: 'https://swanguard.example/new.png' }));

    expect(update.mock.calls[0][0].retracted).toBe(true);
    expect(update.mock.calls[0][0].imageUrl).toBe('https://r2.example/keep.jpg');
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });
});

describe('spotlight ordering — manifest', () => {
  it('queries only live rows: not retracted, and not expired', async () => {
    await getManifest();

    const where = mockFindAll.mock.calls[0][0].where;
    expect(where.retracted).toBe(false);
    // The expiry clause is an Op.or, whose key is a Symbol — it vanishes under
    // JSON.stringify, so assert the structure rather than a serialized form.
    expect(Array.isArray(where[Op.or])).toBe(true);
    expect(where[Op.or][0]).toEqual({ expiresAt: null });
    expect(where[Op.or][1].expiresAt[Op.gt]).toBeInstanceOf(Date);
  });

  it('projects exactly itemId/revision/updatedAt — live-only filtering is the query, not a post-filter', async () => {
    mockFindAll.mockResolvedValue([
      { itemId: 'live-1', revision: 2, updatedAt: '2026-09-19T00:00:00.000Z' },
    ]);

    const res = await getManifest();

    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.itemId)).toEqual(['live-1']);
    // SCOPE NARROWED after hostile review F02 (2026-09-20). This case was named "never emits
    // a retracted itemId even if the store returns one", but the fixture only ever supplied a
    // LIVE row, so it never injected the counterexample its name advertised. What it actually
    // proves is the line below: the projection is explicit, so a widened SELECT cannot leak a
    // tombstone's copy. The live-only guarantee lives in the `where` clause asserted above —
    // there is no route-side post-filter, so the query is the single point of enforcement.
    expect(mockFindAll.mock.calls[0][0].attributes).toEqual(['itemId', 'revision', 'updatedAt']);
  });

  it('requires a valid signature on the read path too', async () => {
    const res = await request(app)
      .get('/api/bridge/spotlight/manifest')
      .set('X-Swan-Signature', 'sha256=deadbeef')
      .set('X-Swan-Timestamp', new Date().toISOString());

    expect(res.status).toBe(401);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it('returns 503 when the kill switch is off', async () => {
    process.env.SPOTLIGHT_ENABLED = 'false';
    const res = await getManifest();
    expect(res.status).toBe(503);
    expect(mockFindAll).not.toHaveBeenCalled();
  });
});

describe('disabled-ingest smoke — the exact verified error body (R1)', () => {
  // R1 requires the disabled path to return the EXISTING verified body, not a newly invented
  // one. Asserted as a whole object rather than a substring, and on BOTH routes, so the two
  // cannot drift apart while each still "looks right" in isolation.
  const VERIFIED_DISABLED_BODY = { success: false, message: 'Spotlight ingest is disabled.' };

  it('POST /spotlight returns the verified 503 body and touches nothing', async () => {
    process.env.SPOTLIGHT_ENABLED = 'false';
    const res = await send(app, body({ imageUrl: 'https://swanguard.example/pic.png' }));

    expect(res.status).toBe(503);
    expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockFindByPk).not.toHaveBeenCalled();
    // The flag is checked BEFORE any network work — a disabled receiver must not fetch.
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });

  it('GET /spotlight/manifest returns the byte-identical 503 body', async () => {
    process.env.SPOTLIGHT_ENABLED = 'false';
    const res = await getManifest();

    expect(res.status).toBe(503);
    expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it('treats any value other than the exact string "true" as disabled', async () => {
    // isSpotlightEnabled() is an exact comparison, so "1"/"TRUE"/"yes" must all be OFF.
    // A truthy coercion here would silently enable a feature the operator did not enable.
    for (const value of ['1', 'TRUE', 'yes', 'on']) {
      process.env.SPOTLIGHT_ENABLED = value;
      const res = await send(app, body());
      expect(res.status).toBe(503);
      expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('spotlight ordering — the router owns its body parser', () => {
  it('fails closed with RAW_BODY_UNAVAILABLE when a global JSON parser runs first', async () => {
    // The mount-order regression this route's header comment warns about: /api/bridge must
    // stay excluded from the global parser, or req.rawBody is empty and HMAC cannot be
    // verified. It must fail CLOSED (500 + a code), never silently accept the request.
    const res = await send(preParsedApp, body());

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('RAW_BODY_UNAVAILABLE');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fails closed on the GET when a declared body was consumed upstream', async () => {
    // Hostile review F01: the rig above covered POST only. If an upstream parser consumes a
    // DECLARED body, synthesizing an empty Buffer would authenticate a payload the guard never
    // saw, so rawBody is left unset and the route refuses instead of accepting emptiness.
    const timestamp = new Date().toISOString();
    const res = await request(preParsedApp)
      .get('/api/bridge/spotlight/manifest')
      .set('Content-Type', 'application/json')
      .set('X-Swan-Signature', signPayload(timestamp, Buffer.alloc(0), SECRET))
      .set('X-Swan-Timestamp', timestamp)
      .send('{"probe":true}');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('RAW_BODY_UNAVAILABLE');
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it('captures the exact request bytes, so a whitespace-only change breaks the signature', async () => {
    const raw = JSON.stringify(body());
    const timestamp = new Date().toISOString();
    const signature = signPayload(timestamp, Buffer.from(raw), SECRET);

    // Same JSON value, different bytes. A parser that re-serializes would still pass.
    const res = await request(app)
      .post('/api/bridge/spotlight')
      .set('Content-Type', 'application/json')
      .set('X-Swan-Signature', signature)
      .set('X-Swan-Timestamp', timestamp)
      .send(`  ${raw}  `);

    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
