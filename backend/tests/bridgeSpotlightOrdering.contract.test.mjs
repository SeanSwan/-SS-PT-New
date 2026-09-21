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
 * ── CHANGED 2026-09-20 for R1's D1 remediation (hostile review F06) ──────────────────
 * The route used to read the row, compare `existing.revision >= revision`, await an image
 * re-host, and then call an INSTANCE `existing.update(values)`. The guard ran before the
 * await and the write was unconditional, so a delayed older revision could regress a newer
 * one. It now calls the static
 * `SwanSpotlight.update(values, { where: { itemId, revision: { [Op.lt]: revision } } })`,
 * so the DATABASE evaluates the ordering predicate inside the write.
 *
 * Consequence for this file: `mockUpdate` replaces the per-test instance `update` spy and
 * resolves to Sequelize's `[affectedCount]` — `[0]` means the predicate rejected the write.
 * The assertions therefore check the WHERE clause, which is the mechanism, rather than
 * checking that a spy was not called.
 *
 * The model and both network-touching services are mocked. Nothing here reaches DNS, R2,
 * or a database — so this file can prove the predicate is CONSTRUCTED and the branch is
 * TAKEN. It cannot prove PostgreSQL honours it under real concurrency; that needs a live
 * database and is recorded as `[UNKNOWN]`, not asserted.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// NOTE: the route imports `uploadPhoto` from photoStorageService.mjs. S3 mocks
// r2StorageService.mjs, which does not export it — so its image assertions currently pass
// because the REAL upload fails on missing credentials, not because the mock fired. These
// are the specifiers the route actually resolves. (Since 2026-09-20 the call lives in
// services/bridgeSpotlightImageRehost.mjs, which resolves the same two specifiers.)
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

/** The predicate the database is asked to evaluate — the whole point of the D1 fix. */
const predicateOf = (call) => call[1]?.where?.revision?.[Op.lt];

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockFindByPk.mockReset().mockResolvedValue(null);
  // Default: the conditional UPDATE matches nothing, so the create path runs.
  mockUpdate.mockReset().mockResolvedValue([0]);
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
    // A row already at revision 5: the conditional UPDATE matches nothing and the re-read
    // reports the revision that actually won.
    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 4, imageUrl: 'https://swanguard.example/late.png' }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(5);
    // The decisive assertion, same intent and now stronger than the old instance-spy version:
    // the write was CONDITIONED on `revision < 4`, and because it lost, no network work
    // happened for an item that is already behind.
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
    expect(mockFetchDecode).not.toHaveBeenCalled();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('leaves the stored image untouched when a superseded revision carries a different one', async () => {
    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg' });
    mockUpdate.mockResolvedValue([0]);

    await send(app, body({ revision: 8, imageUrl: 'https://swanguard.example/replacement.png' }));

    // Exactly one write was ISSUED, and it was the conditional one — never an unconditional
    // overwrite of a newer row.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(8);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });

  it('does not apply — or re-host for — a revision that loses the race AFTER the read', async () => {
    // THIS is the interleaving round 1's F02 said the old suite never injected. The read says
    // revision 1 is stored, so revision 2 looks perfectly acceptable and the OLD code would
    // have written it. Between that read and the write a concurrent revision 5 lands. Because
    // the predicate is evaluated inside the UPDATE, the stale write matches nothing.
    mockFindByPk
      .mockResolvedValueOnce({ revision: 1, imageUrl: null })  // the route's preserve-read
      .mockResolvedValueOnce({ revision: 5 });                 // the re-read, after losing
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 2, imageUrl: 'https://swanguard.example/race.png' }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(5);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
    expect(mockFetchDecode).not.toHaveBeenCalled();
    expect(mockUploadPhoto).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('re-reads the revision after a lost primary-key race instead of assuming it lost', async () => {
    // Two first-time deliveries of the same itemId: our INSERT hits the PK, so the helper
    // retries the conditional UPDATE. Assuming "insert failed ⇒ superseded" would silently
    // drop a legitimately newer revision, so the retry has to happen.
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockFindByPk.mockResolvedValue(null);
    mockUpdate.mockResolvedValueOnce([0]).mockResolvedValueOnce([1]);
    mockCreate.mockRejectedValue(race);

    const res = await send(app, body({ revision: 2 }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});

describe('spotlight ordering — tombstone semantics', () => {
  it('a late replay of an older, non-retracted revision cannot resurrect a retracted item', async () => {
    // Item is retracted at revision 3; an old revision-2 delivery (retracted:false) is replayed.
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null });
    mockUpdate.mockResolvedValue([0]);

    const res = await send(app, body({ revision: 2, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(res.body.revision).toBe(3);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('a higher revision after retraction is applied and clears the tombstone', async () => {
    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg' });
    mockUpdate.mockResolvedValue([1]);

    const res = await send(app, body({ revision: 4, retracted: false }));

    expect(res.status).toBe(200);
    expect(res.body.retracted).toBe(false);
    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
  });

  it('retraction preserves the existing image rather than clearing it', async () => {
    // Documents real behaviour: a retracted row is excluded from the manifest and the rail,
    // so the retained URL is inert. Asserted so a future change to it is a deliberate one.
    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg' });
    mockUpdate.mockResolvedValue([1]);

    await send(app, body({ revision: 2, retracted: true, imageUrl: 'https://swanguard.example/new.png' }));

    expect(mockUpdate.mock.calls[0][0].retracted).toBe(true);
    expect(mockUpdate.mock.calls[0][0].imageUrl).toBe('https://r2.example/keep.jpg');
    expect(mockFetchDecode).not.toHaveBeenCalled();
  });
});

describe('spotlight ordering — validation and persistence agree (D3)', () => {
  it('persists the NORMALIZED itemId, not the raw body value', async () => {
    // The old handler destructured the RAW `req.body.itemId` and stored that, so a padded or
    // over-long value was persisted unnormalized even though validation had bounded it.
    mockUpdate.mockResolvedValue([1]);
    await send(app, body({ itemId: `  ${ITEM}  ` }));

    expect(mockUpdate.mock.calls[0][0].itemId).toBe(ITEM);
  });

  it('rejects a revision beyond the INTEGER column range with 422, not 500', async () => {
    // The column is DataTypes.INTEGER (SwanSpotlight.mjs:23). An unbounded revision used to
    // pass validation and then fail at the column as a 500.
    const res = await send(app, body({ revision: 4294967296 }));

    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('coerces `retracted` ONCE, so the image branch and the stored column agree', async () => {
    // `retracted: "false"` is not a boolean. The old code truthiness-tested it in the image
    // branch (so "false" skipped the image) but strict-compared it for storage (so it stored
    // false) — two different answers for the same input.
    mockUpdate.mockResolvedValue([1]);
    await send(app, body({ retracted: 'false', imageUrl: 'https://swanguard.example/pic.png' }));

    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
    // And because the single coercion says "not retracted", the image IS attempted.
    expect(mockFetchDecode).toHaveBeenCalledTimes(1);
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
    expect(mockUpdate).not.toHaveBeenCalled();
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
