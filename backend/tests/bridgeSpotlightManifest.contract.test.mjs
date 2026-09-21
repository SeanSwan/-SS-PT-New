/**
 * SwanGuard -> SwanStudios Spotlight bridge — MANIFEST and MOUNT SURFACE contract
 * ==============================================================================
 * Split out of `bridgeSpotlightOrdering.contract.test.mjs` for hostile review R5-08: that file
 * was 417 lines against `06-bans.md` #50's 300-line budget. The revision-ordering concern (a
 * superseded revision, tombstone semantics, and D3 validation/persistence agreement) stayed in
 * the parent; the three surfaces below moved here.
 *
 * ── WHAT MOVED, AND WHY THIS AND NOT SOMETHING ELSE ─────────────────────────────
 *   · `spotlight ordering — manifest` — the GET surface, not the POST path.
 *   · `disabled-ingest smoke` (R1) — the kill switch's exact error body, a smoke contract.
 *   · `the router owns its body parser` — a MOUNTING property, not an ordering one.
 * These three share a subject: what the router exposes and what it does when switched off.
 * The ordering tests are about what happens to a revision once accepted. Different questions,
 * different failure modes, so they are different files.
 *
 * ── NO TEST WAS DROPPED ─────────────────────────────────────────────────────────
 * 10 tests here + 10 in the parent = the 20 the unsplit `bridgeSpotlightOrdering` file carried.
 * Every `it()` body moved verbatim — verified by diffing the full blocks against the pre-split
 * blob at HEAD after line-ending normalisation, not merely the titles. The rig is shared via
 * `helpers/bridgeSpotlightHarness.mjs`.
 *
 * The model and both network-touching services are mocked. Nothing here reaches DNS, R2, or a
 * database — so this file can prove a route is MOUNTED and a branch is TAKEN. It cannot prove
 * PostgreSQL behaviour under real concurrency; that is `[UNKNOWN]`, not asserted.
 */
import request from 'supertest';
import { Op } from 'sequelize';
import { describe, expect, it } from 'vitest';
import {
  body, installBridgeSpotlightHarness, mocks, SECRET,
} from './helpers/bridgeSpotlightHarness.mjs';

// The rig — hoisted mock declarations, `vi.mock` factories, the signed-request helpers and the
// per-test env/reset — lives in `helpers/bridgeSpotlightHarness.mjs`, shared with the ordering
// suite. A suite cannot declare the mocks itself: a `vi.mock` factory is hoisted above this
// module's imports and would fail with `ReferenceError` on a suite-local binding.
const {
  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
} = mocks;

void mockUploadPhoto; void mockFetchDecode;

const { app, preParsedApp, getManifest, send, signPayload } = await installBridgeSpotlightHarness();

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
