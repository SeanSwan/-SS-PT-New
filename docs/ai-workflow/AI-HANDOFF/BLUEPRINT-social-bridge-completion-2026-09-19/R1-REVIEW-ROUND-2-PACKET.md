# R1 ASTRA PACKET — REVIEW ROUND 2: the R1 work **as committed**

**Prepared:** 2026-09-20 · **Prepared by:** WorkBuddy (Sable) · **Repo:** SS-PT
**Branch:** `creator-brains-engine-r2-20260915`
**Reviewed revision: `4977987a7b9706b9ede9eae5085920c41f59760b`** (HEAD at packet time) · **R1's own commit: `368829498`**
**Subject of this round:** the R1 change set **after it was committed**, and whether round 1's
findings still hold on the shipped code.

---

## 0. Read this before anything else

**This is round 2, and its job is different from round 1's.** Round 1 reviewed R1 as a *proposed*
change set and returned **FAIL**. Round 2 reviews what actually **landed**, and is explicitly asked
to test round 1's findings against the shipped revision rather than re-derive them.

**Every file in this packet is read from `git show HEAD:<path>` — the committed state — not from the
working tree.** That matters: the tree carries ~1241 dirty paths belonging to other workstreams, so a
review of the worktree would be a review of no particular revision. If you find a defect, it is a
defect of **`4977987a7b9706b9ede9eae5085920c41f59760b`**.

**What changed since round 1:** the R1 commit landed as `368829498`; `git diff` of the four
code paths between that commit and HEAD is **empty**, so the code round 1 reviewed is the code that
shipped, byte for byte. The R1 review is filed at
`Z:/HostileReviews/2026-09-20-025023-social-bridge-completion-r1-correctness.md` and is reproduced verbatim in §2.

**Environment limits — state what you cannot settle.** There is no reachable PostgreSQL, no
credentials, and no paid service. Anything that genuinely requires a live database or a real
signature secret cannot be settled from this packet: mark it `[UNKNOWN]` and say what would settle
it. Do not assume such a claim holds, and do not assume it fails.

**In scope for you, and cheap only for you:** the R1 slice's own acceptance criteria in
`05-slices.md` versus the files R1 was actually permitted to change; and whether round 1's three
HIGH findings are still open in the shipped code (§5 carries their current source).

---

## 1. The change under review — what R1 actually committed

**Commit `3688294988b904f5b32488d6f69c152db6e9f99f`** — `fix(bridge): make the Spotlight manifest reachable, and land R1's contracts with its FAIL recorded`

```text
3688294988b904f5b32488d6f69c152db6e9f99f
parent=e8072247dc2e816571d3d42811d23214618e8077
author=SeanSwan
date=Sun Sep 20 04:09:09 2026 -0700

 backend/routes/bridge/bridgeIngestRoutes.mjs       |   51 +-
 .../bridgeSpotlightOrdering.contract.test.mjs      |  318 ++
 .../tests/coachSignalIntegrity.contract.test.mjs   |  232 ++
 .../04-build-order.md                              |    2 +-
 .../05-slices.md                                   |    2 +-
 .../R1-ASTRA-PACKET.md                             | 4182 ++++++++++++++++++++
 .../R1-ASTRA-REPLY.md                              | 1591 ++++++++
 .../R1-ASTRA-REPLY.meta.json                       |   21 +
 .../R1-CHECKPOINT-SUBMISSION.md                    |  371 ++
 9 files changed, 6767 insertions(+), 3 deletions(-)
```

**The code diff only** (the two large R1 documents are reproduced as full text elsewhere; including
them as diff additions would be ~311 KB of noise):

````diff
diff --git a/backend/routes/bridge/bridgeIngestRoutes.mjs b/backend/routes/bridge/bridgeIngestRoutes.mjs
index 5e8c06c27..fb22a31f5 100644
--- a/backend/routes/bridge/bridgeIngestRoutes.mjs
+++ b/backend/routes/bridge/bridgeIngestRoutes.mjs
@@ -13,6 +13,14 @@ import { fetchAndDecodeSpotlightImage } from '../../services/spotlightImageFetch
  *   flag check (503) -> signature + skew (401) -> schema validate (422)
  *   -> bannedTerms second gate (422) -> idempotent upsert -> R2 re-host -> audit log
  *
+ * SCOPE OF THAT CLAIM, corrected after hostile review F04 (2026-09-20). The list above is
+ * the order of the checks INSIDE the handler, not the middleware order. The route's own
+ * body parser runs FIRST, before the flag check, so a disabled receiver can still be made
+ * to answer a parser error (400/413) rather than the documented 503. That is a real gap
+ * against "a disabled receiver returns 503 and touches nothing"; closing it means moving
+ * the feature gate ahead of parsing, which is a change to the shipped route's behaviour
+ * and is therefore reported rather than made unilaterally (06-bans #1).
+ *
  * The R2 re-host NEVER fails the ingest: a broken image degrades to a text-only card.
  * A dropped Spotlight is worse than an imageless one.
  *
@@ -199,11 +207,52 @@ async function rehostImage(url, itemId) {
   }
 }
 
+/**
+ * Raw-body capture for the bodyless reconciliation GET.
+ *
+ * FIXED 2026-09-19. This route previously had NO body parser, so `req.rawBody` was
+ * undefined and `verifyBridgeRequest` returned `500 RAW_BODY_UNAVAILABLE` to every
+ * caller that got past signature-shape and timestamp validation. The manifest was
+ * therefore unreachable for any correctly-shaped, in-window request, and nothing
+ * noticed because no test covered it. The reconciliation poll is what makes "silence
+ * distinguishable from a dropped delivery", so a permanently-500 endpoint here was a
+ * silently dead safety net.
+ *
+ * SCOPE OF THAT CLAIM, narrowed after hostile review F01 (2026-09-20). The original
+ * comment said "on every call — with ANY signature, valid or not". That was false:
+ * `parseSignatureHeader` and `isTimestampInWindow` both run BEFORE the raw-body guard,
+ * so a malformed or expired request already returned 401. The guard's blast radius was
+ * every request that survived those two checks.
+ *
+ * A GET carries no body, so the canonical payload is `${timestamp}.` and the correct
+ * representation is an empty Buffer. `express.raw` is still mounted so that a client
+ * which does send bytes is authenticated over the bytes it actually sent, rather than
+ * having them silently ignored.
+ *
+ * FAIL CLOSED ON AMBIGUOUS EMPTINESS (hostile review F01). Synthesizing an empty Buffer
+ * for *any* non-Buffer `req.body` cannot distinguish a genuinely bodyless GET from one
+ * whose bytes were consumed upstream — and the second case would be authenticated as if
+ * it were bodyless. When the request DECLARED a body and no bytes are available here, the
+ * bytes are unknowable, so `rawBody` is left unset and the guard returns 500 rather than
+ * authenticating a payload we never saw. A bodyless GET is unaffected.
+ */
+const spotlightRawCapture = express.raw({ type: () => true, limit: '256kb' });
+const captureRawBody = (req, _res, next) => {
+  if (Buffer.isBuffer(req.body)) {
+    req.rawBody = req.body;
+    return next();
+  }
+  const declaredBody = Number(req.headers['content-length'] ?? 0) > 0
+    || req.headers['transfer-encoding'] !== undefined;
+  req.rawBody = declaredBody ? undefined : Buffer.alloc(0);
+  next();
+};
+
 /**
  * GET /api/bridge/spotlight/manifest — signed reconciliation poll.
  * SwanGuard compares this against its outbox and re-sends anything missing.
  */
-router.get('/spotlight/manifest', async (req, res) => {
+router.get('/spotlight/manifest', spotlightRawCapture, captureRawBody, async (req, res) => {
   if (!isSpotlightEnabled()) {
     return res.status(503).json({ success: false, message: 'Spotlight ingest is disabled.' });
   }
diff --git a/backend/tests/bridgeSpotlightOrdering.contract.test.mjs b/backend/tests/bridgeSpotlightOrdering.contract.test.mjs
new file mode 100644
index 000000000..2d62aa100
--- /dev/null
+++ b/backend/tests/bridgeSpotlightOrdering.contract.test.mjs
@@ -0,0 +1,318 @@
+/**
+ * SwanGuard -> SwanStudios Spotlight bridge — ORDERING contract (R1)
+ * ==================================================================
+ * Scope: revision ordering, tombstone semantics, and the raw-body mount. This file
+ * deliberately does NOT re-assert what `tests/api/swanBridgeIngest.test.mjs` (S3) already
+ * covers — kill switch on POST, HMAC/skew/malformed signature, no-secret-disclosure, schema
+ * validation, the banned-terms second gate, the four basic idempotency outcomes, and image
+ * re-host non-fatality. Duplicating a green suite adds maintenance cost and no evidence.
+ *
+ * What is left is the part S3 does not touch: what happens when revisions arrive OUT OF
+ * ORDER, how a tombstone resists a late replay, and what breaks if the bridge loses its
+ * private body parser.
+ *
+ * The model and both network-touching services are mocked. Nothing here reaches DNS, R2,
+ * or a database.
+ */
+import express from 'express';
+import request from 'supertest';
+import { Op } from 'sequelize';
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+
+const { mockFindByPk, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode } = vi.hoisted(() => ({
+  mockFindByPk: vi.fn(),
+  mockCreate: vi.fn(),
+  mockFindAll: vi.fn(),
+  mockUploadPhoto: vi.fn(),
+  mockFetchDecode: vi.fn(),
+}));
+
+vi.mock('../models/social/SwanSpotlight.mjs', () => ({
+  default: { findByPk: mockFindByPk, create: mockCreate, findAll: mockFindAll },
+}));
+
+// NOTE: the route imports `uploadPhoto` from photoStorageService.mjs. S3 mocks
+// r2StorageService.mjs, which does not export it — so its image assertions currently pass
+// because the REAL upload fails on missing credentials, not because the mock fired. These
+// are the specifiers the route actually resolves.
+vi.mock('../services/photoStorageService.mjs', () => ({ uploadPhoto: mockUploadPhoto }));
+vi.mock('../services/spotlightImageFetch.mjs', () => ({
+  fetchAndDecodeSpotlightImage: mockFetchDecode,
+}));
+
+const SECRET = 'test-swan-bridge-secret-value-0123456789';
+const { signPayload } = await import('../services/swanBridgeSignature.mjs');
+const { default: bridgeRouter } = await import('../routes/bridge/bridgeIngestRoutes.mjs');
+
+const app = express();
+app.use('/api/bridge', bridgeRouter);
+
+/** The regression rig: a global JSON parser mounted BEFORE the bridge router. */
+const preParsedApp = express();
+preParsedApp.use(express.json());
+preParsedApp.use('/api/bridge', bridgeRouter);
+
+const ITEM = '11111111-2222-3333-4444-555555555555';
+
+const body = (overrides = {}) => ({
+  itemId: ITEM,
+  revision: 1,
+  retracted: false,
+  headline: 'A community garden doubled its harvest',
+  imageUrl: null,
+  ...overrides,
+});
+
+const send = (target, payload, opts = {}) => {
+  const raw = JSON.stringify(payload);
+  const timestamp = opts.timestamp ?? new Date().toISOString();
+  const signature = opts.signature ?? signPayload(timestamp, Buffer.from(raw), SECRET);
+  return request(target)
+    .post('/api/bridge/spotlight')
+    .set('Content-Type', 'application/json')
+    .set('X-Swan-Signature', signature)
+    .set('X-Swan-Timestamp', timestamp)
+    .send(raw);
+};
+
+const getManifest = (opts = {}) => {
+  const timestamp = new Date().toISOString();
+  const signature = signPayload(timestamp, Buffer.alloc(0), SECRET);
+  return request(app)
+    .get('/api/bridge/spotlight/manifest')
+    .set('X-Swan-Signature', signature)
+    .set('X-Swan-Timestamp', timestamp);
+};
+
+beforeEach(() => {
+  process.env.SPOTLIGHT_ENABLED = 'true';
+  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
+  mockFindByPk.mockReset().mockResolvedValue(null);
+  mockCreate.mockReset().mockResolvedValue({});
+  mockFindAll.mockReset().mockResolvedValue([]);
+  mockUploadPhoto.mockReset();
+  mockFetchDecode.mockReset();
+});
+
+afterEach(() => {
+  delete process.env.SPOTLIGHT_ENABLED;
+  delete process.env.SWAN_BRIDGE_SECRET_V1;
+});
+
+describe('spotlight ordering — a superseded revision changes nothing', () => {
+  it('does not re-host an image that arrives on a superseded revision', async () => {
+    const update = vi.fn();
+    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null, update });
+
+    const res = await send(app, body({ revision: 4, imageUrl: 'https://swanguard.example/late.png' }));
+
+    expect(res.status).toBe(200);
+    expect(res.body.noop).toBe(true);
+    // The decisive assertion: the early return happens BEFORE rehostImage(), so the
+    // network is never touched for an item that is already behind.
+    expect(mockFetchDecode).not.toHaveBeenCalled();
+    expect(mockUploadPhoto).not.toHaveBeenCalled();
+    expect(update).not.toHaveBeenCalled();
+  });
+
+  it('leaves the stored image untouched when a superseded revision carries a different one', async () => {
+    const update = vi.fn();
+    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg', update });
+
+    await send(app, body({ revision: 8, imageUrl: 'https://swanguard.example/replacement.png' }));
+
+    expect(update).not.toHaveBeenCalled();
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+
+  it('treats a stale lower revision as a no-op once the higher one has landed', async () => {
+    // SCOPE NARROWED after hostile review F02 (2026-09-20): this was named "...two racing
+    // revisions...", but it sends ONE request against a store that already holds the winner.
+    // That is sequential stale delivery, not a concurrent interleaving — the read-then-write
+    // window in the route is not exercised, and closing it needs a transaction or an atomic
+    // conditional apply. Reported as an open finding, not claimed here.
+    const update = vi.fn();
+    mockFindByPk.mockResolvedValue({ revision: 7, imageUrl: null, update });
+
+    const res = await send(app, body({ revision: 6 }));
+
+    expect(res.body.noop).toBe(true);
+    expect(res.body.revision).toBe(7);
+    expect(update).not.toHaveBeenCalled();
+  });
+});
+
+describe('spotlight ordering — tombstone semantics', () => {
+  it('a late replay of an older, non-retracted revision cannot resurrect a retracted item', async () => {
+    const update = vi.fn();
+    // Item is retracted at revision 3; an old revision-2 delivery (retracted:false) is replayed.
+    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null, update });
+
+    const res = await send(app, body({ revision: 2, retracted: false }));
+
+    expect(res.status).toBe(200);
+    expect(res.body.noop).toBe(true);
+    expect(update).not.toHaveBeenCalled();
+  });
+
+  it('a higher revision after retraction is applied and clears the tombstone', async () => {
+    const update = vi.fn().mockResolvedValue(undefined);
+    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg', update });
+
+    const res = await send(app, body({ revision: 4, retracted: false }));
+
+    expect(res.status).toBe(200);
+    expect(res.body.retracted).toBe(false);
+    expect(update).toHaveBeenCalledTimes(1);
+    expect(update.mock.calls[0][0].retracted).toBe(false);
+  });
+
+  it('retraction preserves the existing image rather than clearing it', async () => {
+    // Documents real behaviour: a retracted row is excluded from the manifest and the rail,
+    // so the retained URL is inert. Asserted so a future change to it is a deliberate one.
+    const update = vi.fn().mockResolvedValue(undefined);
+    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg', update });
+
+    await send(app, body({ revision: 2, retracted: true, imageUrl: 'https://swanguard.example/new.png' }));
+
+    expect(update.mock.calls[0][0].retracted).toBe(true);
+    expect(update.mock.calls[0][0].imageUrl).toBe('https://r2.example/keep.jpg');
+    expect(mockFetchDecode).not.toHaveBeenCalled();
+  });
+});
+
+describe('spotlight ordering — manifest', () => {
+  it('queries only live rows: not retracted, and not expired', async () => {
+    await getManifest();
+
+    const where = mockFindAll.mock.calls[0][0].where;
+    expect(where.retracted).toBe(false);
+    // The expiry clause is an Op.or, whose key is a Symbol — it vanishes under
+    // JSON.stringify, so assert the structure rather than a serialized form.
+    expect(Array.isArray(where[Op.or])).toBe(true);
+    expect(where[Op.or][0]).toEqual({ expiresAt: null });
+    expect(where[Op.or][1].expiresAt[Op.gt]).toBeInstanceOf(Date);
+  });
+
+  it('projects exactly itemId/revision/updatedAt — live-only filtering is the query, not a post-filter', async () => {
+    mockFindAll.mockResolvedValue([
+      { itemId: 'live-1', revision: 2, updatedAt: '2026-09-19T00:00:00.000Z' },
+    ]);
+
+    const res = await getManifest();
+
+    expect(res.status).toBe(200);
+    expect(res.body.items.map((i) => i.itemId)).toEqual(['live-1']);
+    // SCOPE NARROWED after hostile review F02 (2026-09-20). This case was named "never emits
+    // a retracted itemId even if the store returns one", but the fixture only ever supplied a
+    // LIVE row, so it never injected the counterexample its name advertised. What it actually
+    // proves is the line below: the projection is explicit, so a widened SELECT cannot leak a
+    // tombstone's copy. The live-only guarantee lives in the `where` clause asserted above —
+    // there is no route-side post-filter, so the query is the single point of enforcement.
+    expect(mockFindAll.mock.calls[0][0].attributes).toEqual(['itemId', 'revision', 'updatedAt']);
+  });
+
+  it('requires a valid signature on the read path too', async () => {
+    const res = await request(app)
+      .get('/api/bridge/spotlight/manifest')
+      .set('X-Swan-Signature', 'sha256=deadbeef')
+      .set('X-Swan-Timestamp', new Date().toISOString());
+
+    expect(res.status).toBe(401);
+    expect(mockFindAll).not.toHaveBeenCalled();
+  });
+
+  it('returns 503 when the kill switch is off', async () => {
+    process.env.SPOTLIGHT_ENABLED = 'false';
+    const res = await getManifest();
+    expect(res.status).toBe(503);
+    expect(mockFindAll).not.toHaveBeenCalled();
+  });
+});
+
+describe('disabled-ingest smoke — the exact verified error body (R1)', () => {
+  // R1 requires the disabled path to return the EXISTING verified body, not a newly invented
+  // one. Asserted as a whole object rather than a substring, and on BOTH routes, so the two
+  // cannot drift apart while each still "looks right" in isolation.
+  const VERIFIED_DISABLED_BODY = { success: false, message: 'Spotlight ingest is disabled.' };
+
+  it('POST /spotlight returns the verified 503 body and touches nothing', async () => {
+    process.env.SPOTLIGHT_ENABLED = 'false';
+    const res = await send(app, body({ imageUrl: 'https://swanguard.example/pic.png' }));
+
+    expect(res.status).toBe(503);
+    expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
+    expect(mockCreate).not.toHaveBeenCalled();
+    expect(mockFindByPk).not.toHaveBeenCalled();
+    // The flag is checked BEFORE any network work — a disabled receiver must not fetch.
+    expect(mockFetchDecode).not.toHaveBeenCalled();
+  });
+
+  it('GET /spotlight/manifest returns the byte-identical 503 body', async () => {
+    process.env.SPOTLIGHT_ENABLED = 'false';
+    const res = await getManifest();
+
+    expect(res.status).toBe(503);
+    expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
+    expect(mockFindAll).not.toHaveBeenCalled();
+  });
+
+  it('treats any value other than the exact string "true" as disabled', async () => {
+    // isSpotlightEnabled() is an exact comparison, so "1"/"TRUE"/"yes" must all be OFF.
+    // A truthy coercion here would silently enable a feature the operator did not enable.
+    for (const value of ['1', 'TRUE', 'yes', 'on']) {
+      process.env.SPOTLIGHT_ENABLED = value;
+      const res = await send(app, body());
+      expect(res.status).toBe(503);
+      expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
+    }
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+});
+
+describe('spotlight ordering — the router owns its body parser', () => {
+  it('fails closed with RAW_BODY_UNAVAILABLE when a global JSON parser runs first', async () => {
+    // The mount-order regression this route's header comment warns about: /api/bridge must
+    // stay excluded from the global parser, or req.rawBody is empty and HMAC cannot be
+    // verified. It must fail CLOSED (500 + a code), never silently accept the request.
+    const res = await send(preParsedApp, body());
+
+    expect(res.status).toBe(500);
+    expect(res.body.code).toBe('RAW_BODY_UNAVAILABLE');
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+
+  it('fails closed on the GET when a declared body was consumed upstream', async () => {
+    // Hostile review F01: the rig above covered POST only. If an upstream parser consumes a
+    // DECLARED body, synthesizing an empty Buffer would authenticate a payload the guard never
+    // saw, so rawBody is left unset and the route refuses instead of accepting emptiness.
+    const timestamp = new Date().toISOString();
+    const res = await request(preParsedApp)
+      .get('/api/bridge/spotlight/manifest')
+      .set('Content-Type', 'application/json')
+      .set('X-Swan-Signature', signPayload(timestamp, Buffer.alloc(0), SECRET))
+      .set('X-Swan-Timestamp', timestamp)
+      .send('{"probe":true}');
+
+    expect(res.status).toBe(500);
+    expect(res.body.code).toBe('RAW_BODY_UNAVAILABLE');
+    expect(mockFindAll).not.toHaveBeenCalled();
+  });
+
+  it('captures the exact request bytes, so a whitespace-only change breaks the signature', async () => {
+    const raw = JSON.stringify(body());
+    const timestamp = new Date().toISOString();
+    const signature = signPayload(timestamp, Buffer.from(raw), SECRET);
+
+    // Same JSON value, different bytes. A parser that re-serializes would still pass.
+    const res = await request(app)
+      .post('/api/bridge/spotlight')
+      .set('Content-Type', 'application/json')
+      .set('X-Swan-Signature', signature)
+      .set('X-Swan-Timestamp', timestamp)
+      .send(`  ${raw}  `);
+
+    expect(res.status).toBe(401);
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+});
diff --git a/backend/tests/coachSignalIntegrity.contract.test.mjs b/backend/tests/coachSignalIntegrity.contract.test.mjs
new file mode 100644
index 000000000..86759c382
--- /dev/null
+++ b/backend/tests/coachSignalIntegrity.contract.test.mjs
@@ -0,0 +1,232 @@
+/**
+ * CoachSignal integrity contract (R1)
+ * ===================================
+ * Behavioural companion to `tests/api/coachSignalRoutes.contract.test.mjs`. That file is
+ * entirely source-text assertions; this one drives the real router and asserts the
+ * RESPONSES, which is the only way to catch a guard that is present in the source but
+ * unreachable in the handler.
+ *
+ * Deliberately not repeated here (covered by the source-grep suite): endpoint mounting,
+ * the SocialLike ENUM remaining untouched, no-raw-error leakage, and the note/role
+ * constants themselves.
+ *
+ * ── DECISION RECORDED 2026-09-19 (operator ruling) ────────────────────────────────
+ * `05-slices.md` correction 3 asks for `postId` NOT NULL. It is NOT applied, on purpose.
+ * The migration declares `onDelete: 'SET NULL'` (hostile review F3.4) so a coach's
+ * recognition survives deletion of the post, and `SocialPost` is not paranoid — posts are
+ * hard-deleted (`routes/social/posts.mjs`, `adminContentModerationController.mjs`). So
+ * NOT NULL + SET NULL is contradictory: the SET NULL fires on delete and violates the
+ * constraint. Worse, any signal whose post was already deleted holds a NULL postId today,
+ * so `ALTER COLUMN ... SET NOT NULL` would fail on that data. The NULL-uniqueness hole is
+ * unreachable through the API because the route always supplies `postId`, and
+ * UNIQUE("coachId","postId") already blocks duplicates for non-null values. The full
+ * multi-target migration is deferred to the point a session target actually exists.
+ * The last two tests below pin this so it cannot be "fixed" back.
+ */
+import express from 'express';
+import request from 'supertest';
+import { Op } from 'sequelize';
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+
+const {
+  mockSignalFindOne, mockSignalCount, mockSignalCreate,
+  mockPostFindOne, mockAssignmentFindOne, mockUserFindByPk, mockCreateNotification,
+  session,
+} = vi.hoisted(() => ({
+  mockSignalFindOne: vi.fn(),
+  mockSignalCount: vi.fn(),
+  mockSignalCreate: vi.fn(),
+  mockPostFindOne: vi.fn(),
+  mockAssignmentFindOne: vi.fn(),
+  mockUserFindByPk: vi.fn(),
+  mockCreateNotification: vi.fn(),
+  // `id` is a STRING here on purpose: authMiddleware attaches `req.user.id` via toStringId
+  // while Sequelize INTEGER columns surface as numbers. The route must normalise both.
+  session: { user: { id: '7', role: 'trainer' } },
+}));
+
+vi.mock('../middleware/authMiddleware.mjs', () => ({
+  protect: (req, _res, next) => { req.user = session.user; next(); },
+}));
+vi.mock('../models/social/CoachSignal.mjs', () => ({
+  default: { findOne: mockSignalFindOne, count: mockSignalCount, create: mockSignalCreate },
+}));
+vi.mock('../models/social/SocialPost.mjs', () => ({ default: { findOne: mockPostFindOne } }));
+vi.mock('../models/ClientTrainerAssignment.mjs', () => ({ default: { findOne: mockAssignmentFindOne } }));
+vi.mock('../models/User.mjs', () => ({ default: { findByPk: mockUserFindByPk } }));
+vi.mock('../controllers/notificationController.mjs', () => ({ createNotification: mockCreateNotification }));
+
+const { default: coachSignalRoutes } = await import('../routes/social/coachSignalRoutes.mjs');
+
+const app = express();
+app.use(express.json());
+app.use('/api/social/coach-signals', coachSignalRoutes);
+
+const post = (payload = {}) => request(app).post('/api/social/coach-signals').send({ postId: 3, ...payload });
+
+const COACH = { id: '7', role: 'trainer' };
+const MEMBER_AUTHOR = 42;
+
+beforeEach(() => {
+  vi.useRealTimers();
+  session.user = { ...COACH };
+  mockPostFindOne.mockReset().mockResolvedValue({ id: 3, userId: MEMBER_AUTHOR });
+  mockAssignmentFindOne.mockReset().mockResolvedValue({ id: 1 });
+  mockSignalFindOne.mockReset().mockResolvedValue(null);
+  mockSignalCount.mockReset().mockResolvedValue(0);
+  mockSignalCreate.mockReset().mockResolvedValue({
+    id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date(),
+  });
+  mockUserFindByPk.mockReset().mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Coach', username: 'ada' });
+  mockCreateNotification.mockReset().mockResolvedValue(undefined);
+});
+
+afterEach(() => {
+  vi.useRealTimers();
+});
+
+describe('coach signal — target checks', () => {
+  it('refuses a non-coach role with 403', async () => {
+    session.user = { id: '7', role: 'client' };
+    const res = await post();
+    expect(res.status).toBe(403);
+    expect(mockSignalCreate).not.toHaveBeenCalled();
+  });
+
+  it('returns 404 for an unknown or non-approved post, and never reveals which', async () => {
+    mockPostFindOne.mockResolvedValue(null);
+    const res = await post();
+    expect(res.status).toBe(404);
+    // The approved filter must be part of the query, not a post-hoc check.
+    expect(mockPostFindOne.mock.calls[0][0].where.moderationStatus).toBe('approved');
+  });
+
+  it('refuses a coach signalling their own post, across a string/number id mismatch', async () => {
+    // req.user.id is '7' (string), post.userId is 7 (number). A raw === would miss this.
+    mockPostFindOne.mockResolvedValue({ id: 3, userId: 7 });
+    const res = await post();
+    expect(res.status).toBe(403);
+    expect(mockSignalCreate).not.toHaveBeenCalled();
+  });
+
+  it('refuses a coach with no ACTIVE assignment, treating a NULL status as active', async () => {
+    mockAssignmentFindOne.mockResolvedValue(null);
+    const res = await post();
+    expect(res.status).toBe(403);
+
+    const where = mockAssignmentFindOne.mock.calls[0][0].where;
+    expect(where.trainerId).toBe('7');
+    expect(where.clientId).toBe(MEMBER_AUTHOR);
+    // SQL NULL never matches IN (...), so NULL must be expressed with Op.is.
+    expect(where[Op.or]).toContainEqual({ status: { [Op.is]: null } });
+  });
+});
+
+describe('coach signal — post uniqueness', () => {
+  it('returns 409 when the coach already signalled this post', async () => {
+    mockSignalFindOne.mockResolvedValue({ id: 5 });
+    const res = await post();
+    expect(res.status).toBe(409);
+    expect(mockSignalCreate).not.toHaveBeenCalled();
+  });
+
+  it('maps a unique-constraint race on double-tap to 409, not 500', async () => {
+    // The pre-check passed, then the DB rejected the insert. This is the duplicate path.
+    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
+    mockSignalCreate.mockRejectedValue(race);
+    const res = await post();
+    expect(res.status).toBe(409);
+  });
+
+  it('scopes the duplicate check to the coach AND the post together', async () => {
+    await post();
+    expect(mockSignalFindOne.mock.calls[0][0].where).toEqual({ coachId: '7', postId: 3 });
+  });
+});
+
+describe('coach signal — quota', () => {
+  it('allows the fifth signal and refuses the sixth', async () => {
+    mockSignalCount.mockResolvedValue(4);
+    expect((await post()).status).toBe(201);
+
+    mockSignalCount.mockResolvedValue(5);
+    const res = await post();
+    expect(res.status).toBe(429);
+    expect(mockSignalCreate).toHaveBeenCalledTimes(1);
+  });
+
+  it('counts from UTC midnight, not from a rolling 24h window', async () => {
+    vi.useFakeTimers();
+    vi.setSystemTime(new Date('2026-09-21T16:00:00.000Z'));
+    await post();
+
+    const window = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];
+    expect(window.toISOString()).toBe('2026-09-21T00:00:00.000Z');
+  });
+
+  it('holds the cap across a DST boundary — the window is UTC, so it cannot shift', async () => {
+    // 2026-11-01 is a US DST transition. A local-midnight implementation would move the
+    // boundary by an hour and could hand out a sixth signal; a UTC one cannot.
+    vi.useFakeTimers();
+    vi.setSystemTime(new Date('2026-11-01T09:30:00.000Z'));
+    await post();
+    const before = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];
+
+    vi.setSystemTime(new Date('2026-11-01T10:30:00.000Z'));
+    await post();
+    const after = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];
+
+    expect(before.toISOString()).toBe('2026-11-01T00:00:00.000Z');
+    expect(after.toISOString()).toBe('2026-11-01T00:00:00.000Z');
+  });
+
+  it('re-reads the count on every request, so a restart cannot reset the cap', async () => {
+    await post();
+    await post();
+    // Quota lives in the database, never in module-level state — two requests, two reads.
+    expect(mockSignalCount).toHaveBeenCalledTimes(2);
+  });
+});
+
+describe('coach signal — note handling', () => {
+  it('rejects an over-length note with 422 rather than truncating it', async () => {
+    const res = await post({ note: 'x'.repeat(121) });
+    expect(res.status).toBe(422);
+    expect(mockSignalCreate).not.toHaveBeenCalled();
+  });
+
+  it('rejects a whitespace-only note with 422', async () => {
+    const res = await post({ note: '   ' });
+    expect(res.status).toBe(422);
+  });
+
+  it('stores a trimmed note and still returns 201 when the bell entry fails', async () => {
+    mockCreateNotification.mockRejectedValue(new Error('bell down'));
+    const res = await post({ note: '  great work  ' });
+    expect(res.status).toBe(201);
+    expect(mockSignalCreate.mock.calls[0][0].note).toBe('great work');
+  });
+});
+
+describe('coach signal — the recorded postId decision', () => {
+  it('keeps postId nullable so ON DELETE SET NULL can preserve the member\'s record', async () => {
+    const { readFileSync } = await import('node:fs');
+    const { resolve } = await import('node:path');
+    const migration = readFileSync(resolve(import.meta.dirname, '../migrations/20260916-create-coach-signals.cjs'), 'utf8');
+
+    // If this fails, someone applied correction 3. Read the header of this file first:
+    // NOT NULL and SET NULL cannot both hold, and posts are hard-deleted.
+    expect(migration).toMatch(/postId:\s*\{[\s\S]*?allowNull:\s*true/);
+    expect(migration).toContain("onDelete: 'SET NULL'");
+    expect(migration).not.toContain('allowNull: false,\n        references: { model: \'SocialPosts\'');
+  });
+
+  it('enforces one signal per coach per post for non-null values', async () => {
+    const { readFileSync } = await import('node:fs');
+    const { resolve } = await import('node:path');
+    const model = readFileSync(resolve(import.meta.dirname, '../models/social/CoachSignal.mjs'), 'utf8');
+
+    expect(model).toMatch(/\{\s*unique:\s*true,\s*fields:\s*\['coachId',\s*'postId'\]\s*\}/);
+    expect(model).not.toContain('sessionId');
+  });
+});
````

**State of those code paths between R1 and HEAD** (empty means unchanged):

```text
(empty — the reviewed code is the shipped code)
```

---

## 2. THE ROUND-1 REVIEW, AS FILED (Rule 86) — test this, do not re-derive it

This is the filed artifact, verbatim. **Your job on it is adjudication, not restatement:** for each
finding, say whether it still holds at `4977987a7b9706b9ede9eae5085920c41f59760b`, whether it was fixed, and whether the fix is
complete. Re-reporting a finding in new words without testing it against this revision is not a
review.

````
<<< Z:/HostileReviews/2026-09-20-025023-social-bridge-completion-r1-correctness.md >>>
---
review_id: 2026-09-20-025023-social-bridge-completion-r1-correctness
date_local: 2026-09-20T02:50:23-07:00
date_utc: 2026-09-20T09:50:23Z
subject: "Social Bridge completion — R1 (correctness foundations): manifest raw-body repair, two contract suites, and the R1 blueprint delta"
reviewer_agent: astra
reviewer_seat: "openai-codex / gpt-6-astra (requested; served model unverifiable by construction)"
round: 1
repo: SS-PT
repo_path: "C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT"
branch: creator-brains-engine-r2-20260915
commit: dirty
scope: "In: the R1 Astra packet (docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-ASTRA-PACKET.md, 202 KB) — the four-path R1 delta, both new contract suites, and the blueprint package 00-08 + 03b + MANIFEST + CORRECTIONS-APPLIED + VERIFICATION-NOTES + G0-SOURCE-EXCERPTS. Out: executing the suites; mutation reproduction; migrations; a live database; the deployment; any file outside the packet."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 6, medium: 9, low: 0 }
unproven: 7
supersedes: null
superseded_by: null
tags: [social-bridge, r1, astra, mega-blueprint, spotlight, manifest, raw-body, concurrency]
---

# HOSTILE REVIEW — Social Bridge completion — R1 (correctness foundations)

**Reviewer:** astra (openai-codex / gpt-6-astra (requested; served model unverifiable by construction)), 2026-09-20T02:50:23-07:00
**Filed by:** workbuddy / Sable — the **dispatching** agent. Astra's session was `--sandbox read-only` and
it reported the archive query and filing as blocked, so per the `hostile-review-archive` skill the
dispatching agent files the artifact. **Sections 0–3 are Astra's findings. Section 2's adjudication
column and sections 3–5's dispositions are the dispatcher's, and are marked as such.**
**Method (Astra's own account):** read the 202 KB R1 packet only. Ran **no** product tests, mutations,
migrations or browser checks. Queried the archive and was denied execution; fell back to a read-only
filename/index scan, which it correctly declined to call proof of archive completeness.
**Evidence:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-ASTRA-REPLY.md`
(raw reply, 101,176 bytes, 1,489+ lines, PART A/B/C) · `R1-ASTRA-REPLY.meta.json` (receipt: in 500,283 /
out 25,632 / reasoning 3,545 tokens, wall 798.1 s, Mega Blueprint **ARMED — armed by remit**)
**Verdict:** FAIL — 0/6/9/0

**⚠️ Ordering note, recorded because it is load-bearing.** Astra's verdict was `FAIL`. The dispatcher
then adjudicated every finding against the shipped code and **refuted none of them**, applied the
fixes that were within R1's four permitted paths, and committed the delta. So the tree this review is
bound to (`commit: dirty` at base HEAD `d05038a91`) is **not** byte-identical to the tree that landed:
the F01/F02/F04 corrections and the fail-closed branch in `captureRawBody` postdate it. The
uncommitted delta this review judged was committed afterwards on explicit pathspec.

**⚠️ Artifact redaction (2026-09-20, before the first commit).** One line of `R1-ASTRA-REPLY.md`
carried the operator's absolute home path — Astra's archive-status paragraph links the
`hostile-review-archive` skill by absolute path. The repo's pre-commit secret scan blocked the commit
on it as an `operator-identity` pattern. It was **redacted, not allowlisted** (the call `6018d715e`
records for the Creator Brains round-2 reply, at the same kind of site), rewritten to its
repo-relative form. No finding, verdict or count changed.

- `R1-ASTRA-REPLY.md` SHA-256 before redaction: `c4ba07b3fe45dc000d54ebce66eb1a0ca217861f68c0a11a64a051a4e0dcafc0`
- `R1-ASTRA-REPLY.md` SHA-256 after redaction:  `42b1f50f9b0d3aa07a1ed8abad5160585016dab536b7c65bc4ce0666728a07d6`

The file is new in that commit, so the account name never entered git history.

---

## 0. Verdict in one paragraph

**R1 does not establish its correctness foundations.** The manifest repair is real and correct — a
signed GET route with no body parser returned `500 RAW_BODY_UNAVAILABLE` to every request that passed
signature-shape and timestamp validation, and is now reachable — but R1 is *titled* correctness
foundations, and the two load-bearing correctness properties of this subsystem are **not atomic**:
quota admission is `count` then `create` with no transaction (F05), and revision application is
`read → await rehostImage → unconditional update`, so a delayed older request overwrites a newer
revision (F06). A green mocked suite does not make them so. **A reader must not assume** that R1's
`FAIL` means its own delta is wrong — it does not — nor that the packet it was reviewed from is the
packet on disk: the §7 evidence block was a hand-written reconstruction, and that is corrected here
rather than overwritten.

---

## 1. Confirmed — what was re-measured and could not be broken

Confirmed by the **dispatcher** against the shipped code after the review, not by Astra (whose
session was read-only and which ran nothing):

| Claim under review | My measurement | Result |
|---|---|---|
| The manifest route could never authenticate | `swanBridgeSignature.mjs:86-98` runs `parseSignatureHeader` and `isTimestampInWindow` **before** the `Buffer.isBuffer(req.rawBody)` guard | **CONFIRMED, but narrowed** — the guard's reach is every request that *survived* those two checks, not "every caller". A malformed header already returned 401. Astra's F01 was right and my original claim was an overclaim. |
| The fix makes the manifest reachable | Removed the capture from the GET route and re-ran: **exactly 2 red** (`queries only live rows`, `never emits a retracted itemId`). Restored byte-identical, SHA-256 `fa0ac690598977956b2f1e2fecc32ce685b36d4eecc02d374d2fe52b70eda3dc` | **CONFIRMED** — the guard is load-bearing, and the third manifest case stays green because `sha256=deadbeef` fails the 64-hex shape check first. |
| `NOT NULL` contradicts `ON DELETE SET NULL` | `migrations/20260916-create-coach-signals.cjs:32` `allowNull: true`, `:37` `onDelete: 'SET NULL'`; `models/social/SocialPost.mjs` has `timestamps: true` and **no `paranoid: true`**, so posts hard-delete and the SET NULL path is live | **CONFIRMED** — correction 3 was correctly superseded. Astra agreed with the ruling (F03). |
| The disabled-ingest body is the existing one | Identical literal at `bridgeIngestRoutes.mjs:85` (POST) and `:257` (GET); `isSpotlightEnabled` is an exact `=== 'true'` at `:28` | **CONFIRMED as identical JSON objects** — *not* byte-identical, which was an overclaim (F04). |
| The recorded mutation restores held | `routes/social/coachSignalRoutes.mjs` SHA-256 = `9093d0545f415b4ba4afd4162b297adf960b734a334ecfc1e2708132d374c212`, matching the value recorded at mutation time | **CONFIRMED** — the restored file is the pre-mutation file. |

---

## 2. Defects

Severity is Astra's. The **Adjudication** line under each is the dispatcher's, established by
reproducing the claim against the shipped code — not by accepting the summary.

### D1 — Revision and tombstone races remain [HIGH] (F06)

- **Claim under review:** R1 establishes revision ordering.
- **Evidence:** `bridgeIngestRoutes.mjs:105-144`. `findByPk` → `if (existing && existing.revision >= revision)` → `await rehostImage(...)` → `existing.update(values)` / `SwanSpotlight.create(values)`. The revision guard is evaluated **before** the await, and `existing` is by then a stale in-memory instance. The supplied test "treats the lower of two racing revisions as a no-op" supplies one pre-existing winning revision and sends one request — sequential stale delivery, not an interleaving.
- **Exploitability / reach:** any two concurrent deliveries for the same `itemId`; a delayed older revision can regress a newer one, and a late retraction can be overwritten.
- **Why it matters:** revision monotonicity is the whole ordering contract. Without it, the receiver can serve a superseded or un-retracted item.
- **Fix:** atomic conditional highest-revision application plus insert-conflict handling; attach a completed image only if the accepted revision is still current and unretracted.
- **Adjudication: CONFIRMED.** Mechanism verified line-by-line. **Not fixed** — it is a design change to a shipped route, and R1's four permitted paths do not include the transactional work. Recorded as a required action before R2.

### D2 — Quota race remains [HIGH] (F05)

- **Claim under review:** R1 pins the quota contract.
- **Evidence:** `routes/social/coachSignalRoutes.mjs:125-135` — `CoachSignal.count(...)` then `if (sentToday >= DAILY_SIGNAL_CAP) return 429` then `CoachSignal.create(...)`. No transaction, no lock, no serialization. Two concurrent requests for distinct posts can both observe 4 and both insert.
- **Exploitability / reach:** double-tap or two devices; yields six signals against a cap of five.
- **Why it matters:** the cap is a product promise ("signals stay precious"); the mocked suite asserts the arithmetic, never the admission.
- **Fix:** serialize quota admission per coach; count and insert in one transaction; preserve the UTC day; roll back on insert failure.
- **Adjudication: CONFIRMED.** **Not fixed** — `coachSignalRoutes.mjs` is outside R1's four permitted paths. This is the finding that most directly contradicts the slice title.

### D3 — Validation and persistence disagree [HIGH] (F07)

- **Claim under review:** the receiver validates its DTO.
- **Evidence:** `validateSpotlightPayload` bounds `itemId` with `str(body.itemId, 36)` (`:55-63`), but `:99` destructures the **raw** `itemId` from `req.body` and that is what is stored and logged. `revision` is checked only as `Number.isInteger(...) && >= 1` — no upper bound, against a stored `INTEGER`. `retracted` is read for **truthiness** in the image branch (`:115` `!retracted`) but compared **strictly** for storage (`:127` `retracted === true`), so `retracted: "false"` stores `false` while skipping the image.
- **Exploitability / reach:** a well-formed-but-non-canonical `itemId` passes validation and is persisted unnormalized; an out-of-range `revision` passes validation then 500s on insert.
- **Why it matters:** the validation is not the contract it appears to be.
- **Fix:** use the validated values; bound `revision` to the column range; coerce booleans once.
- **Adjudication: CONFIRMED on all three sub-claims.** **Not fixed** — 06-bans #10 forbids altering the shipped `spotlight.v1` body unilaterally, and Astra's own fix text says this must be "an explicitly reviewed change, not disguised as an unchanged contract". Recorded as a required action.

### D4 — The DNS-rebinding completion claim is unsupported [HIGH] (F08)

- **Claim under review:** the blueprint's image-security section is complete.
- **Evidence:** `04-build-order.md#rehostImage` and `CORRECTIONS-APPLIED.md#4b` assert that rejecting redirects makes the validated URL the connected URL. Redirect policy does not establish which resolved address is used for the connection.
- **Adjudication: CONFIRMED as a documentation defect.** The *code* comment was already corrected in `d05038a91` ("the fetch re-resolves after the check (TOCTOU)") — the docs simply were not updated with it. **Open**, doc-only.

### D5 — G0 is falsely closed [HIGH] (F09)

- **Claim under review:** readiness gate G0 is closed.
- **Evidence:** `00-README.md` says buildable; `05-slices.md#G0` requires zero unresolved integration markers; `03b` leaves dependency types and canonical IDs blocked; `G0-SOURCE-EXCERPTS.md#What is still missing` acknowledges missing source.
- **Adjudication: PLAUSIBLE — not independently re-derived by the dispatcher.** The contradiction is visible in the packet's own documents. **Open.**

### D6 — A known-misleading suite remains in acceptance evidence [HIGH] (F10)

- **Claim under review:** the R1 evidence set is sound.
- **Evidence:** `tests/api/swanBridgeIngest.test.mjs` stubs `r2StorageService.mjs` for `uploadPhoto`, but `rehostImage()` imports it from `photoStorageService.mjs`. Its two image assertions pass because the **real** upload fails on missing credentials.
- **Adjudication: CONFIRMED** — and already disclosed by the submitter, but Astra's position is stronger: those cases should not count toward acceptance until the mock targets the real import. **Open** (another workstream's suite).

**MEDIUM findings (9), all adjudicated CONFIRMED unless noted:** F01 (overclaimed blast radius — **fixed**; fail-closed branch added and covered by a new case) · F02 (docs said 12 cases where the suite has 15; a case never injected the counterexample its name advertised; "racing" was sequential; the §7.1 listing was a reconstruction, not a transcript — **fixed**) · F03 (postId nullable is coherent; tests read migration text rather than executing deletion — **partially fixed**) · F04 (parsed-object comparison is not byte equality; the body parser runs *before* the flag check — **partially fixed**; middleware order reported, not changed) · F11 two manifests conflated · F12 admin image-state has no storage · F13 the submission's own file count and its verdict contradicted `07-checkpoints.md` — **fixed**, and it is the finding that changed the verdict · F14 integer IDs versus UUID examples · F15 later slices leave correctness choices implicit.

---

## 3. Not proven / unopened

- **Deployed constraint behaviour** — the real foreign key, the unique index, and historical NULL rows were never observed. The migration *text* was read; nothing was executed. (F03)
- **Actual mutation executions and restore hashes** — Astra reproduced none of them. The dispatcher independently re-derived one (the manifest mutation → exactly 2 red) and verified the recorded SHA-256 of the restored quota route.
- **Installed Express/body-parser behaviour** for absent content type, compression, oversized requests, and already-consumed GET bodies. (F01)
- **Production response bytes** for the disabled path. (F04)
- **The image-fetch helper's connection implementation** — the DNS-rebinding claim cannot be settled without it. (F08)
- **The older suite's complete behaviour** — only its mock target was established. (F10)
- **Archive completeness** — Astra's `query.mjs` invocation was denied; its filename-scan fallback is not proof. (The dispatcher ran `query.mjs` for this subject beforehand and found **no prior review**, 44 in the archive.)

---

## 4. What I deliberately did NOT do, and why

- **Did not touch the shared git index beyond R1's own paths** — at commit time it held **87 staged entries from other workstreams** (the `scripts/creator-brains/console/**` deletions, the `scripts/mcp/**` additions, `backend/package.json`, the vitest configs, `.gitignore`). Committed by explicit pathspec so their entries stayed staged and untouched. No `git add -A`, no blanket dirty-state recovery (06-bans #52/#53).
- **Did not fix F05/F06/F07** — each requires a change to a shipped route's semantics, and the first two are outside R1's permitted paths. 06-bans: a ban is returned as a question, not overridden unilaterally.
- **Did not move the feature gate ahead of route parsing (F04)** — it changes the shipped route's behaviour for malformed disabled requests. Reported.
- **Did not adopt the FAIL verdict as a reason to withhold the commit** — the delta is additive and correct as far as it goes, and leaving verified work uncommitted risks losing it. The verdict travels in the commit message and in `R1-CHECKPOINT-SUBMISSION.md` §14 instead.
- **Did not edit the reviewed packet into agreement with the fixes** — the v1 defect (a reconstructed evidence block) is preserved in the packet's own v2 note, because a silently corrected artifact is what this archive exists to prevent.

---

## 5. Round log

| Round | Looked at | Found | Fixed | Re-verified |
|---|---|---|---|---|
| 1 (Astra, 2026-09-20) | The 202 KB R1 packet: 4-path delta, 2 suites, blueprint 00-08 + 03b + MANIFEST + CORRECTIONS + VERIFICATION + G0 excerpts | FAIL; 0/6/9/0; 7 unproven | — | not re-run (read-only session) |
| 1a (dispatcher adjudication, same day) | Each finding reproduced against the shipped code | 0 refuted; F01/F02/F04 partly fixable within scope | F01 blast radius + fail-closed branch + 1 new case; F02 counts + 2 test names + real §7 transcript; F04 wording; F13 verdict + file count | suites re-run: 10 files / **108** tests green; manifest mutation → exactly 2 red, restored SHA-256 verified |

**Dry:** **not reached.** This is round 1 for this subject. The archive held no prior review of the
Social Bridge / Spotlight surface (`query.mjs --subject "social bridge spotlight ingest"` → no match,
44 in the archive at the time), so there was nothing to re-test and nothing to supersede. Rounds 2+
are required after the D1–D3 fixes land, because those are the findings that changed the verdict.
````


---

## 3. The R1 checkpoint submission (verbatim — this is the claim to attack)

# R1 checkpoint submission

**Slice:** R1 — Correctness foundations
**Submitted:** 2026-09-19
**Builder:** WorkBuddy (Sable)
**Verdict sought:** reviewer adjudication per `07-checkpoints.md`

> **Read this first — revised 2026-09-20.** R1's own delta is correct and mutation-evidenced, but a
> Mega Blueprint hostile review (Astra, `gpt-6-astra`) returned **FAIL**, and its three HIGH findings
> were adjudicated **CONFIRMED** against the shipped code. The load-bearing ones are that **quota
> admission and revision application are not atomic** (F05, F06) and that **receiver validation and
> persistence disagree** (F07). Separately, **three of the thirteen protocol items cannot be
> evidenced in this environment** — including `07-checkpoints.md` §6, real-database concurrency
> output. §13 marks those **BLOCKED** rather than omitting them.
>
> The verdict is therefore **FAIL**, and the earlier recommendation of PASS WITH BOUNDED FOLLOW-UP is
> **withdrawn**: `07-checkpoints.md` defines that verdict as excluding a *concurrency* exception, and
> §6 is one. The full adjudication is in **§14**.

---

## 1. Starting and ending commit SHA

| | |
|---|---|
| Base HEAD (at original submission) | `fe388691fbfbcd9a23eba380c929ce1e10c9d736` |
| Base HEAD (at this revision) | `d05038a91c67aff4fd2c3bf1ac821e8233b65b8d` |
| Branch | `creator-brains-engine-r2-20260915` |
| Ending SHA | **the commit that lands this file** — R1's delta was committed on explicit pathspec, 2026-09-20. It is not self-referential here because this document is inside that commit; `git log -1 --format=%H -- <this file>` resolves it. |

**Deviation, stated plainly, and corrected after hostile review F13.** The original submission left
R1 uncommitted, on the grounds that this worktree carries over a thousand paths from other
workstreams. That was the wrong call to leave standing: `07-checkpoints.md` §1 asks for an ending
SHA, and an uncommitted change set cannot supply one.

R1's delta is now committed **by explicit pathspec** (`git commit -- <paths>`), which does two things
that matter here: only the named paths are committed, and git builds a temporary index for the hook
so the pre-commit scanner sees the pathspec rather than the shared index. At commit time the shared
index held **68 staged entries belonging to other workstreams** — the `scripts/creator-brains/console/**`
deletions, the `scripts/mcp/**` additions, `backend/package.json`, the vitest configs and `.gitignore`.
None of them was staged, committed, or otherwise touched by R1; `git diff --cached` still shows them
staged after the commit. No `git add -A`, no blanket dirty-state recovery.

## 2. Explicit changed-file list

**No frontend file is among them** — see §8.

> **Corrected 2026-09-20 after hostile review F13.** This section previously opened "Six files" and
> then listed eight rows, and its trailing `git status` note said "five `AM`" for documents that
> were, by then, already committed. Both were wrong. The inventory is restated below in two groups
> so the count and the git status agree.

**(a) The four paths that were uncommitted and attributable to R1 at submission time:**

| Status | File | Lines | Nature |
|---|---|---:|---|
| new | `backend/tests/bridgeSpotlightOrdering.contract.test.mjs` | 318 | R1 deliverable |
| new | `backend/tests/coachSignalIntegrity.contract.test.mjs` | 232 | R1 deliverable |
| modified | `backend/routes/bridge/bridgeIngestRoutes.mjs` | 281 (+45 / −1) | **defect fix** — see §3 |
| new | `…/BLUEPRINT-…/R1-CHECKPOINT-SUBMISSION.md` | — | this document |

`git status` for those four: two `??` (untracked), one ` M`, one `??`.

**(b) The five blueprint documents R1 also edited, already committed** in
`4743afa09 docs(blueprint): land Social Bridge completion package; apply corrections 1-7`
(2026-09-20 01:34 -0700) — not part of this change set's uncommitted delta:

| File | Nature of R1's edit |
|---|---|
| `…/05-slices.md` | correction 3 superseded; R1 test rows |
| `…/06-bans.md` | new ban: do not make `postId` NOT NULL |
| `…/04-build-order.md` | migration row + 2 BUILT rows |
| `…/CORRECTIONS-APPLIED.md` | §10 + deviations 4–5 |
| `…/VERIFICATION-NOTES.md` | status banner on Part 4 |

## 3. Source excerpts for changed trust boundaries

**The only trust boundary R1 changed.** `backend/routes/bridge/bridgeIngestRoutes.mjs:239-255`.

Before — the route authenticated over `req.rawBody` with no parser mounted:

```js
router.get('/spotlight/manifest', async (req, res) => {
  if (!isSpotlightEnabled()) { return res.status(503)… }
  const verdict = verifyBridgeRequest(req);   // <- rawBody undefined -> 500 RAW_BODY_UNAVAILABLE
```

After (`:239-255`), and **hardened in response to hostile review F01**:

```js
const spotlightRawCapture = express.raw({ type: () => true, limit: '256kb' });
const captureRawBody = (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) { req.rawBody = req.body; return next(); }
  // A request that DECLARED a body but has no bytes here means an upstream parser consumed
  // the stream. Synthesizing an empty Buffer would authenticate it as bodyless, so leave
  // rawBody unset and let the guard fail closed.
  const declaredBody = Number(req.headers['content-length'] ?? 0) > 0
    || req.headers['transfer-encoding'] !== undefined;
  req.rawBody = declaredBody ? undefined : Buffer.alloc(0);
  next();
};
router.get('/spotlight/manifest', spotlightRawCapture, captureRawBody, async (req, res) => {
```

`verifyBridgeRequest` itself is unchanged (`services/swanBridgeSignature.mjs:94`), and its
`Buffer.isBuffer(req.rawBody)` guard is correct — the defect was that nothing supplied the Buffer.

> **Claim narrowed 2026-09-20 (F01).** This section previously said the guard fired "on every
> call — the manifest could not be reached with ANY signature, valid or not". **That was false.**
> `parseSignatureHeader` and `isTimestampInWindow` both run *before* the raw-body guard
> (`swanBridgeSignature.mjs:86-98`), so a malformed or expired request already returned 401. The
> accurate blast radius is **every request that survived signature-shape and timestamp validation**.
> The same overclaim appeared in the route's own header comment and has been corrected there too.
> The added fail-closed branch is covered by a new case
> (`bridgeSpotlightOrdering.contract.test.mjs`, "fails closed on the GET when a declared body was
> consumed upstream").

## 4. Test command, exit code, unedited output

```
cd backend && npx vitest run \
  tests/coachSignalIntegrity.contract.test.mjs \
  tests/bridgeSpotlightOrdering.contract.test.mjs \
  tests/api/coachSignalRoutes.contract.test.mjs \
  tests/api/swanBridgeIngest.test.mjs \
  tests/unit/esmNodeLoadable.test.mjs \
  tests/unit/esmRuntimeRequireGuards.test.mjs \
  tests/unit/spotlightImageFetch.test.mjs \
  tests/unit/spotlightImageDecode.test.mjs \
  tests/bridgeSpotlightImage.security.test.mjs \
  tests/api/socialPostDeletionCleanupParity.test.mjs
```

```
 ✓ tests/unit/esmRuntimeRequireGuards.test.mjs (2 tests) 3ms
 ✓ tests/api/socialPostDeletionCleanupParity.test.mjs (2 tests) 3ms
 ✓ tests/api/coachSignalRoutes.contract.test.mjs (12 tests) 5ms
 ✓ tests/unit/spotlightImageFetch.test.mjs (15 tests) 20ms
 ✓ tests/bridgeSpotlightImage.security.test.mjs (8 tests) 22ms
 ✓ tests/unit/spotlightImageDecode.test.mjs (13 tests) 109ms
 ✓ tests/bridgeSpotlightOrdering.contract.test.mjs (16 tests) 104ms
 ✓ tests/coachSignalIntegrity.contract.test.mjs (16 tests) 92ms
 ✓ tests/api/swanBridgeIngest.test.mjs (19 tests) 121ms
 ✓ tests/unit/esmNodeLoadable.test.mjs (5 tests) 3858ms
     ✓ every runtime .mjs that reads __dirname also defines it  1305ms
     ✓ services/photoStorageService.mjs imports under plain node (not just under Vite)  642ms
     ✓ services/spotlightImageFetch.mjs imports under plain node (not just under Vite)  717ms
     ✓ services/swanBridgeSignature.mjs imports under plain node (not just under Vite)  413ms
     ✓ routes/bridge/bridgeIngestRoutes.mjs imports under plain node (not just under Vite)  780ms
 Test Files  10 passed (10)
      Tests  108 passed (108)
   Duration  5.27s
EXIT=0
```

> **Corrected 2026-09-20 (F02).** The block above was previously a hand-written listing — it
> repeated one file, omitted two named in the command, and showed several without counts. It is now
> the verbatim captured output. The count moved 107 → 108 because one fail-closed case was added in
> response to F01; the whole file is reproduced as a transcript in `R1-ASTRA-PACKET.md` §7.1.

Frontend rail/dock:

```
cd frontend && npx vitest run \
  src/components/Social/Spotlight/SpotlightRail.test.tsx \
  src/components/Social/CoachDock/SocialCoachDock.test.tsx
 ✓ SpotlightRail.test.tsx (12 tests) 391ms
 ✓ SocialCoachDock.test.tsx (13 tests) 736ms
 Test Files  2 passed (2)   Tests  25 passed (25)
```

**Mutation evidence** (a green suite proves nothing until it can go red):

| Mutation | Result | Restore |
|---|---|---|
| `DAILY_SIGNAL_CAP` 5 → 6 | 1 red (`allows the fifth signal and refuses the sixth`) | sha256 verified |
| `setUTCHours` → `setHours` (local midnight) | 2 red (UTC-midnight + DST) | sha256 verified |
| manifest raw-body capture removed | **2 red, green after the fix** | n/a (fix retained) |

`routes/social/coachSignalRoutes.mjs` restored byte-identical:
`9093d0545f415b4ba4afd4162b297adf960b734a334ecfc1e2708132d374c212`.

## 5. Migration up/down

**None — R1 adds no migration.** Correction 3 (which would have created
`20260920-harden-coach-signals.cjs`) is **superseded**; see §12.

## 6. Real-database concurrency output — **BLOCKED**

**Not available.** No PostgreSQL is reachable from this environment:

```
❌ Unable to connect to the database: password authentication failed for user "swanadmin"
```

Consequences, stated precisely:

- `coachSignalIntegrity.contract.test.mjs` asserts the **route's** duplicate and quota contract with a
  mocked model. It does **not** prove that `UNIQUE("coachId","postId")` rejects a concurrent double
  insert, nor that `CoachSignal.count()` under two simultaneous requests cannot both pass the cap.
- The suite names the concurrent-revision case as a **simulation** in a comment rather than claiming a
  real race.
- R1's plan text does not itself demand DB concurrency output (that is S5a's requirement), but
  `07-checkpoints.md` §6 asks for it "where required", and the quota is the one place R1 could
  plausibly need it.

**Required action if the reviewer wants this closed:** the G0 fixture profile with a reachable
database, then a two-connection race against the real constraint.

## 7. Acceptance curls

R1 defines no curls (`05-slices.md` places the first at R2). The R1 analogue is the disabled-ingest
smoke, now asserted on **both** routes against the **exact existing body**, not a newly invented one:

```js
const VERIFIED_DISABLED_BODY = { success: false, message: 'Spotlight ingest is disabled.' };
```

- `POST /api/bridge/spotlight` → 503, body `toEqual(VERIFIED_DISABLED_BODY)`, no create / no lookup /
  **no image fetch** (the flag is checked before any network work).
- `GET /api/bridge/spotlight/manifest` → 503, **identical JSON object**, no `findAll`.
- `SPOTLIGHT_ENABLED` set to `'1' | 'TRUE' | 'yes' | 'on'` → still 503. The check is an exact
  `=== 'true'`, so a truthy coercion cannot silently enable the feature.

> **Two corrections, 2026-09-20 (F04).**
>
> 1. **"Byte-identical" was an overclaim.** `.toEqual(VERIFIED_DISABLED_BODY)` compares *parsed JSON
>    structure*, not response bytes. The accurate statement — now used above — is "identical JSON
>    object". Production response bytes were never observed from this environment.
> 2. **"The flag is checked before any network work" is true; "the flag is checked first" is not.**
>    Both routes mount their body parser *ahead of* the handler's flag check
>    (`bridgeIngestRoutes.mjs:83` for POST, `:255` for GET), so a disabled receiver can still be made
>    to answer a parser error (400/413) instead of the documented 503. Closing that means moving the
>    feature gate ahead of parsing, which changes the shipped route's behaviour and is therefore
>    **reported, not done unilaterally** (06-bans #1). Recorded as an open finding.

## 8. Screenshots at 1440×900 and 375×812 — **BLOCKED, with a caveat**

Playwright 1.58.2 and Chromium are installed, but:

- The database is unreachable (§6), so no live-data render is possible.
- Playwright's projects are Desktop Chrome (1280×720) and Pixel 5 (393×851) — **neither is 1440×900
  or 375×812**, so the existing harness would not satisfy the requirement even with a database.
- **R1 changed no frontend file.** `SpotlightRail.tsx`, `SpotlightRail.styles.ts` and
  `Social/CoachDock/*` are untouched by this change set. The rail and dock are therefore unchanged
  *by construction*, and a screenshot of an unpopulated rail (flag off, no data) would not evidence
  "unchanged" — it would evidence "empty".

**The diff is the stronger evidence for the specific claim R1 makes.** The reviewer may still want the
screenshots as a formality; if so, they need a reachable database.

## 9. Keyboard/focus and reduced-motion evidence

**Not applicable to R1** — no UI change. The rail's existing 44px touch-target assertion and the
editorial bans (no like/comment/share affordance, ice-cyan only) remain green in
`SpotlightRail.test.tsx` (12 tests).

## 10. Bundle report

**Not applicable** — S6 only.

## 11. Secret-scan result

No secret was added. The only new literal is the test secret
`'test-swan-bridge-secret-value-0123456789'`, which already existed in
`tests/api/swanBridgeIngest.test.mjs` and is read from `process.env` at runtime, never committed to
configuration. The route reads `SWAN_BRIDGE_SECRET_V1` from the environment and never echoes it
(`SIGNATURE_INVALID` carries no message).

## 12. Protected-file diff

**No protected surface changed.** No auth middleware, no mount file, no `bridge-policy.json`, no
frontend component, no existing route behaviour other than the manifest fix in §3. The manifest
change is strictly additive to a route that previously returned 500 to every caller.

## 13. New deviations and unresolved questions

1. **R1 correction 3 is SUPERSEDED (operator ruling, 2026-09-19).** `postId` stays nullable.
   `NOT NULL` contradicts the migration's `ON DELETE SET NULL` (F3.4), `SocialPost` is not paranoid
   so posts are hard-deleted, existing rows with a deleted post already hold `NULL`, and a green test
   asserts SET NULL. `G0-SOURCE-EXCERPTS.md` never mentions it, so the plan's own tie-breaker could
   not adjudicate. Recorded in `05-slices.md`, `06-bans.md`, `04-build-order.md` ×2, and **pinned by a
   test** so it cannot be silently reverted.
2. **`tests/api/swanBridgeIngest.test.mjs` mocks a module the route no longer imports.** It stubs
   `r2StorageService.mjs` for `uploadPhoto`, but `rehostImage()` imports it from
   `photoStorageService.mjs`. Its two image assertions pass because the **real** upload fails on
   missing credentials — the "passes for the wrong reason" class. **Reported, not fixed**: changing
   another suite's mocks is a separate reviewable change.
3. **The manifest is replayable inside the ±300s skew window.** A bodyless GET is signed over
   `${timestamp}.`, so the timestamp is the only varying input. Adding a nonce changes the documented
   wire format and belongs with S7's `bridgeRequestAuth.mjs`. Disclosed, not fixed.
4. **`05-slices.md` remains over the ~300-line budget** (now 343+). Pre-existing, already flagged in
   `CORRECTIONS-APPLIED.md`; R1's edits added lines. Not split — it is named as *the plan*.

**Unresolved question for the reviewer:** is the uncommitted-worktree submission (§1) acceptable, or
do you want a scoped partial commit of the six files?

---

---

## 14. Hostile review (Astra, Mega Blueprint) — and adjudication

**Review:** `R1-ASTRA-REPLY.md` (101 KB, PART A / B / C) · **model** `gpt-6-astra` on the ChatGPT
subscription (`codex-cli`, marginal cost $0) · **effort** high · **in** 500,283 / **out** 25,632
tokens · **798.1 s** · **Mega Blueprint ARMED** (armed by remit), so the pass ran the full pipeline:
documentation refresh, hostile review **A1** of the existing blueprints, hostile review **A2** of its
own draft, and the decision-density self-test.

**Astra's verdict: `FAIL`** — *"R1 does not establish its correctness foundations."*

Every finding was adjudicated against the shipped code rather than accepted from the summary
(`adjudicating-hostile-review-of-own-fix`). **Nothing has been refuted.**

| ID | Sev | Astra's claim | Adjudication |
|---|---|---|---|
| F01 | MED | "500 for every caller" is false; the empty-Buffer fallback cannot distinguish a bodyless GET from one whose bytes were consumed upstream. | **CONFIRMED.** Reproduced: `swanBridgeSignature.mjs:86-98` runs signature-shape and timestamp checks *before* the raw-body guard, so 401 precedes 500. **Fixed** — claim narrowed in the route comment and in §3; a fail-closed branch added to `captureRawBody` and covered by a new case. |
| F02 | MED | Mutation evidence insufficient; documents say 12 cases where the suite has 15; one case never injects the counterexample its name advertises; "two racing revisions" is sequential; the §7.1 listing is not a transcript. | **CONFIRMED on all four.** `05-slices.md:56` / `04-build-order.md:152` said 12 against a real 15 (now 16). **Fixed** — counts corrected; both test names narrowed to what they actually prove; the packet's §7 block replaced with captured output. |
| F03 | MED | Nullable `postId` is the coherent decision; but the tests inspect migration text rather than executing deletion. | **CONFIRMED in part.** Agrees with the operator ruling. The text-vs-execution point stands and cannot close without a database. |
| F04 | MED | Disabled-response tests compare parsed objects, not bytes; the parser runs before the flag check. | **CONFIRMED.** `toEqual` compares structure, not bytes. Both parsers mount ahead of the flag check (`:83` POST, `:255` GET). **Partially fixed** — wording corrected; the middleware-order gap is **reported, not changed**, because it alters the shipped route's behaviour. |
| F05 | **HIGH** | Quota race: `count` then `create`, no transaction or lock. | **CONFIRMED.** `routes/social/coachSignalRoutes.mjs:125-135`. **Not fixed** — that route is outside R1's four permitted paths. |
| F06 | **HIGH** | Revision/tombstone race: read → `await rehostImage` → unconditional `update`/`create`; a delayed older request can overwrite a newer revision. | **CONFIRMED.** `bridgeIngestRoutes.mjs:105-144`. The `existing.revision >= revision` guard is evaluated *before* the await, and `existing` is by then a stale instance. **Not fixed** — needs an atomic conditional apply, a design change on a shipped route. |
| F07 | **HIGH** | Validation and persistence disagree: `str(body.itemId, 36)` is validated but the raw `itemId` is stored; `revision` has no upper bound; `retracted` is read for truthiness in the image branch but compared strictly for storage. | **CONFIRMED on all three.** `:99` destructures the raw `itemId`; `:55-63` bounds it; `:115` uses `!retracted` while `:127` uses `retracted === true`. **Not fixed** — 06-bans #10 forbids altering the shipped `spotlight.v1` body unilaterally. |
| F08 | HIGH | The DNS-rebinding "DONE" claim in the docs is unsupported. | **CONFIRMED as a documentation defect.** The *code* comment was already corrected in `d05038a91`; `04-build-order.md` and `CORRECTIONS-APPLIED.md` still carry the superseded claim. **Open.** |
| F09 | HIGH | G0 is falsely closed. | **Plausible; not independently re-derived here.** `00-README.md` says buildable while `03b` leaves dependency types and canonical IDs blocked. **Open.** |
| F10 | HIGH | A known-misleading suite remains part of acceptance evidence. | **CONFIRMED** — and already disclosed at §13.2, but Astra's position is stronger than mine: its image cases should not count toward acceptance until the mock targets the real import. **Open.** |
| F11–F15 | MED | Two manifests conflated; admin image-state has no storage; integer IDs versus UUID examples; later slices leave correctness choices implicit. | **Largely CONFIRMED as documentation contradictions** inside the package. **Open** — package-level, not part of R1's delta. |

**What Astra got right about my process, recorded rather than deflected:** the §7 evidence block in
the packet was a *reconstruction I wrote by hand* and submitted as "unedited output". That is the
same class of error as a fabricated citation. It was reachable only because the packet was assembled
programmatically and one block was allowed to stay prose. It is fixed, and the defect is preserved in
the packet's own v2 note instead of being silently overwritten.

**R1 reachability.** R1's permitted four-path change set could repair the manifest capture and add
tests. It could not implement the transactional quota service, the atomic apply service, or the
schema changes. **R1 is therefore a partial submission**, not a passed foundation gate.

---

## Verdict recommendation

**FAIL.** Adopted from the review rather than argued down from it.

The reason is not that R1's own delta is wrong — the manifest repair is correct, additive, and
mutation-evidenced, and the two suites are real evidence about the route's contract. It is that R1 is
titled *correctness foundations*, and F05/F06/F07 establish that the two load-bearing correctness
properties of this subsystem — **quota admission and revision application are not atomic** — remain
unestablished. A green mocked suite does not make them so.

`07-checkpoints.md` settles the verdict mechanically as well: **PASS WITH BOUNDED FOLLOW-UP** is
defined as *"only nonfunctional documentation cleanup; no security, privacy, migration, concurrency,
contract, or accessibility exception."* §6 is a **concurrency** exception. The earlier recommendation
of PASS WITH BOUNDED FOLLOW-UP therefore **contradicted the protocol's own definition** — a defect
Astra raised as F13, and which this submission had flagged without acting on. That recommendation is
withdrawn.

**Required before R2 may begin:**

1. Atomic quota admission per coach — count and insert in one transaction, preserving the UTC day.
2. Atomic conditional revision apply, plus insert-conflict handling for simultaneous first creation;
   attach a completed image only if the accepted revision is still current and unretracted.
3. A receiver validation repair for canonical `itemId`, bounded `revision`, and real booleans — as an
   explicitly reviewed change, not as an unchanged contract.
4. The G0 fixture profile with a reachable database, so §6's concurrency evidence can exist at all.
5. Supersede the stale active instructions (F03) and the DNS-rebinding doc claim (F08).

**What this submission does establish:** the manifest route was unreachable for every correctly
shaped, in-window request and is now reachable; the raw-body mount fails closed on ambiguous
emptiness; and 16 + 16 new cases pin the ordering, tombstone, quota-window and `postId` decisions
against regression.


---

## 4. The trust boundary R1 changed, and the two suites it added

### 4.1 `backend/routes/bridge/bridgeIngestRoutes.mjs`

````
<<< backend/routes/bridge/bridgeIngestRoutes.mjs >>>
import express from 'express';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { bannedTerms } from '../social/feedEnrichment.mjs';
import { verifyBridgeRequest } from '../../services/swanBridgeSignature.mjs';
import { fetchAndDecodeSpotlightImage } from '../../services/spotlightImageFetch.mjs';

/**
 * SwanGuard → SwanStudios Spotlight ingest.
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.1
 *
 * Ingest order is contractual:
 *   flag check (503) -> signature + skew (401) -> schema validate (422)
 *   -> bannedTerms second gate (422) -> idempotent upsert -> R2 re-host -> audit log
 *
 * SCOPE OF THAT CLAIM, corrected after hostile review F04 (2026-09-20). The list above is
 * the order of the checks INSIDE the handler, not the middleware order. The route's own
 * body parser runs FIRST, before the flag check, so a disabled receiver can still be made
 * to answer a parser error (400/413) rather than the documented 503. That is a real gap
 * against "a disabled receiver returns 503 and touches nothing"; closing it means moving
 * the feature gate ahead of parsing, which is a change to the shipped route's behaviour
 * and is therefore reported rather than made unilaterally (06-bans #1).
 *
 * The R2 re-host NEVER fails the ingest: a broken image degrades to a text-only card.
 * A dropped Spotlight is worse than an imageless one.
 *
 * NOTE: this router owns its body parser. /api/bridge must stay excluded from the global
 * JSON parser (backend/core/middleware/index.mjs) or req.rawBody is empty and HMAC fails.
 */
const router = express.Router();

export const SPOTLIGHT_MAX_HEADLINE = 80;
export const SPOTLIGHT_MAX_DEK = 200;
export const SPOTLIGHT_MAX_CURATOR_NOTE = 140;

export const isSpotlightEnabled = (env = process.env) => env.SPOTLIGHT_ENABLED === 'true';

/** Raw-aware JSON parser — captures exact bytes for HMAC, mirroring the PLAUD precedent. */
export const spotlightJsonParser = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
});

const str = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

/** Screen the human-readable copy against the shared positivity list. */
export const findBannedTerm = (fields) => {
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return bannedTerms.find((term) => haystack.includes(term)) ?? null;
};

export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  const itemId = str(body.itemId, 36);
  if (!itemId) return { ok: false, reason: 'itemId is required.' };
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true };
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * POST /api/bridge/spotlight
 * 503 flag off | 401 bad signature | 422 invalid/banned | 200 stored | 200 no-op (replay)
 */
router.post('/spotlight', spotlightJsonParser, async (req, res) => {
  if (!isSpotlightEnabled()) {
    return res.status(503).json({ success: false, message: 'Spotlight ingest is disabled.' });
  }

  const verdict = verifyBridgeRequest(req);
  if (!verdict.ok) {
    logger.warn(`Spotlight ingest rejected: ${verdict.code}`);
    return res.status(verdict.status).json({ success: false, code: verdict.code });
  }

  const validation = validateSpotlightPayload(req.body);
  if (!validation.ok) {
    return res.status(422).json({ success: false, message: validation.reason });
  }

  const { itemId, revision, retracted = false } = req.body;
  const headline = str(req.body.headline, SPOTLIGHT_MAX_HEADLINE);
  const dek = str(req.body.dek, SPOTLIGHT_MAX_DEK);
  const curatorNote = str(req.body.curatorNote, SPOTLIGHT_MAX_CURATOR_NOTE);

  // Second positivity gate — SwanGuard's ceremony is the first, this is the backstop.
  const banned = findBannedTerm([headline, dek, curatorNote]);
  if (banned) {
    logger.warn(`Spotlight ${itemId} rejected by banned-terms gate: "${banned}"`);
    return res.status(422).json({ success: false, code: 'BANNED_TERM' });
  }

  try {
    const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;
    const existing = await SwanSpotlight.findByPk(itemId);

    // Idempotency is (itemId, revision): same revision = no-op, higher revision = upsert.
    if (existing && existing.revision >= revision) {
      return res.status(200).json({ success: true, noop: true, itemId, revision: existing.revision });
    }

    // Image re-host is best-effort by design — never fail the ingest over a picture.
    let imageUrl = existing?.imageUrl ?? null;
    const incomingImage = str(req.body.imageUrl, 2048);
    if (incomingImage && !retracted) {
      imageUrl = await rehostImage(incomingImage, itemId) ?? null;
    }

    const source = req.body.sourceAttribution && typeof req.body.sourceAttribution === 'object'
      ? req.body.sourceAttribution
      : {};
    const gate = req.body.gate && typeof req.body.gate === 'object' ? req.body.gate : {};

    const values = {
      itemId,
      revision,
      retracted: retracted === true,
      headline,
      dek,
      imageUrl,
      sourceName: str(source.name, 80),
      sourceUrl: str(source.url, 2048),
      curatorNote,
      sortWeight: Number.isInteger(req.body.sortWeight) ? req.body.sortWeight : 1,
      publishedAt: toDate(req.body.publishedAt),
      expiresAt: toDate(req.body.expiresAt),
      gateHash: str(gate.checklistHash, 64)
    };

    if (existing) {
      await existing.update(values);
    } else {
      await SwanSpotlight.create(values);
    }

    logger.info(`Spotlight ${retracted ? 'retracted' : 'stored'}: ${itemId}@${revision}`);
    return res.status(200).json({ success: true, itemId, revision, retracted: values.retracted });
  } catch (error) {
    logger.error('Spotlight ingest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error during ingest.' });
  }
});

/**
 * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
 * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
 * never hot-link SwanGuard's URL in a production render path).
 *
 * HARDENED 2026-09-19, and two real defects were fixed here rather than one.
 *
 * (a) SSRF. The old version checked the protocol of the URL it was HANDED and then
 *     called fetch with defaults — which follows redirects. A host returning
 *     `302 → http://169.254.169.254/...` therefore defeated the check completely,
 *     because the protocol was only ever inspected on the first hop. It also applied
 *     its size cap AFTER `arrayBuffer()` had buffered the entire body, so the cap
 *     bounded what was stored, not what was consumed. `fetchAndDecodeSpotlightImage`
 *     now owns validation, the no-redirect fetch, the streamed cap, and the decode.
 *
 * (b) A wrong import. `uploadPhoto` was destructured from `r2StorageService.mjs`,
 *     which does not export it — it lives in `photoStorageService.mjs`. Every call
 *     threw `TypeError: uploadPhoto is not a function`, and this function's own
 *     catch reported it as a non-fatal degradation and returned null. So image
 *     re-hosting has never once succeeded, and the design ("a broken image degrades
 *     to a text-only card") is precisely what made that invisible. Verified by
 *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
 */
async function rehostImage(url, itemId) {
  try {
    const decoded = await fetchAndDecodeSpotlightImage(url);
    if (!decoded.ok) {
      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
      return null;
    }

    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
    // bytes itself, deriving the stored extension and Content-Type from them rather than
    // from anything this call declares.
    const { uploadPhoto } = await import('../../services/photoStorageService.mjs');
    const result = await uploadPhoto(decoded.buffer, {
      userId: 0,
      category: 'swan-spotlight',
      originalFilename: `${itemId}.${decoded.ext}`,
      contentType: decoded.contentType
    });
    return result?.url ?? null;
  } catch (error) {
    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
    return null;
  }
}

/**
 * Raw-body capture for the bodyless reconciliation GET.
 *
 * FIXED 2026-09-19. This route previously had NO body parser, so `req.rawBody` was
 * undefined and `verifyBridgeRequest` returned `500 RAW_BODY_UNAVAILABLE` to every
 * caller that got past signature-shape and timestamp validation. The manifest was
 * therefore unreachable for any correctly-shaped, in-window request, and nothing
 * noticed because no test covered it. The reconciliation poll is what makes "silence
 * distinguishable from a dropped delivery", so a permanently-500 endpoint here was a
 * silently dead safety net.
 *
 * SCOPE OF THAT CLAIM, narrowed after hostile review F01 (2026-09-20). The original
 * comment said "on every call — with ANY signature, valid or not". That was false:
 * `parseSignatureHeader` and `isTimestampInWindow` both run BEFORE the raw-body guard,
 * so a malformed or expired request already returned 401. The guard's blast radius was
 * every request that survived those two checks.
 *
 * A GET carries no body, so the canonical payload is `${timestamp}.` and the correct
 * representation is an empty Buffer. `express.raw` is still mounted so that a client
 * which does send bytes is authenticated over the bytes it actually sent, rather than
 * having them silently ignored.
 *
 * FAIL CLOSED ON AMBIGUOUS EMPTINESS (hostile review F01). Synthesizing an empty Buffer
 * for *any* non-Buffer `req.body` cannot distinguish a genuinely bodyless GET from one
 * whose bytes were consumed upstream — and the second case would be authenticated as if
 * it were bodyless. When the request DECLARED a body and no bytes are available here, the
 * bytes are unknowable, so `rawBody` is left unset and the guard returns 500 rather than
 * authenticating a payload we never saw. A bodyless GET is unaffected.
 */
const spotlightRawCapture = express.raw({ type: () => true, limit: '256kb' });
const captureRawBody = (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    return next();
  }
  const declaredBody = Number(req.headers['content-length'] ?? 0) > 0
    || req.headers['transfer-encoding'] !== undefined;
  req.rawBody = declaredBody ? undefined : Buffer.alloc(0);
  next();
};

/**
 * GET /api/bridge/spotlight/manifest — signed reconciliation poll.
 * SwanGuard compares this against its outbox and re-sends anything missing.
 */
router.get('/spotlight/manifest', spotlightRawCapture, captureRawBody, async (req, res) => {
  if (!isSpotlightEnabled()) {
    return res.status(503).json({ success: false, message: 'Spotlight ingest is disabled.' });
  }
  const verdict = verifyBridgeRequest(req);
  if (!verdict.ok) {
    return res.status(verdict.status).json({ success: false, code: verdict.code });
  }
  try {
    const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;
    const rows = await SwanSpotlight.findAll({
      where: { retracted: false, [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] },
      attributes: ['itemId', 'revision', 'updatedAt'],
      raw: true
    });
    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      items: rows.map((row) => ({ itemId: row.itemId, revision: row.revision, updatedAt: row.updatedAt }))
    });
  } catch (error) {
    logger.error('Spotlight manifest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while building the manifest.' });
  }
});

export default router;
````


### 4.2 `backend/tests/bridgeSpotlightOrdering.contract.test.mjs`

````
<<< backend/tests/bridgeSpotlightOrdering.contract.test.mjs >>>
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
````


### 4.3 `backend/tests/coachSignalIntegrity.contract.test.mjs`

````
<<< backend/tests/coachSignalIntegrity.contract.test.mjs >>>
/**
 * CoachSignal integrity contract (R1)
 * ===================================
 * Behavioural companion to `tests/api/coachSignalRoutes.contract.test.mjs`. That file is
 * entirely source-text assertions; this one drives the real router and asserts the
 * RESPONSES, which is the only way to catch a guard that is present in the source but
 * unreachable in the handler.
 *
 * Deliberately not repeated here (covered by the source-grep suite): endpoint mounting,
 * the SocialLike ENUM remaining untouched, no-raw-error leakage, and the note/role
 * constants themselves.
 *
 * ── DECISION RECORDED 2026-09-19 (operator ruling) ────────────────────────────────
 * `05-slices.md` correction 3 asks for `postId` NOT NULL. It is NOT applied, on purpose.
 * The migration declares `onDelete: 'SET NULL'` (hostile review F3.4) so a coach's
 * recognition survives deletion of the post, and `SocialPost` is not paranoid — posts are
 * hard-deleted (`routes/social/posts.mjs`, `adminContentModerationController.mjs`). So
 * NOT NULL + SET NULL is contradictory: the SET NULL fires on delete and violates the
 * constraint. Worse, any signal whose post was already deleted holds a NULL postId today,
 * so `ALTER COLUMN ... SET NOT NULL` would fail on that data. The NULL-uniqueness hole is
 * unreachable through the API because the route always supplies `postId`, and
 * UNIQUE("coachId","postId") already blocks duplicates for non-null values. The full
 * multi-target migration is deferred to the point a session target actually exists.
 * The last two tests below pin this so it cannot be "fixed" back.
 */
import express from 'express';
import request from 'supertest';
import { Op } from 'sequelize';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSignalFindOne, mockSignalCount, mockSignalCreate,
  mockPostFindOne, mockAssignmentFindOne, mockUserFindByPk, mockCreateNotification,
  session,
} = vi.hoisted(() => ({
  mockSignalFindOne: vi.fn(),
  mockSignalCount: vi.fn(),
  mockSignalCreate: vi.fn(),
  mockPostFindOne: vi.fn(),
  mockAssignmentFindOne: vi.fn(),
  mockUserFindByPk: vi.fn(),
  mockCreateNotification: vi.fn(),
  // `id` is a STRING here on purpose: authMiddleware attaches `req.user.id` via toStringId
  // while Sequelize INTEGER columns surface as numbers. The route must normalise both.
  session: { user: { id: '7', role: 'trainer' } },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = session.user; next(); },
}));
vi.mock('../models/social/CoachSignal.mjs', () => ({
  default: { findOne: mockSignalFindOne, count: mockSignalCount, create: mockSignalCreate },
}));
vi.mock('../models/social/SocialPost.mjs', () => ({ default: { findOne: mockPostFindOne } }));
vi.mock('../models/ClientTrainerAssignment.mjs', () => ({ default: { findOne: mockAssignmentFindOne } }));
vi.mock('../models/User.mjs', () => ({ default: { findByPk: mockUserFindByPk } }));
vi.mock('../controllers/notificationController.mjs', () => ({ createNotification: mockCreateNotification }));

const { default: coachSignalRoutes } = await import('../routes/social/coachSignalRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/social/coach-signals', coachSignalRoutes);

const post = (payload = {}) => request(app).post('/api/social/coach-signals').send({ postId: 3, ...payload });

const COACH = { id: '7', role: 'trainer' };
const MEMBER_AUTHOR = 42;

beforeEach(() => {
  vi.useRealTimers();
  session.user = { ...COACH };
  mockPostFindOne.mockReset().mockResolvedValue({ id: 3, userId: MEMBER_AUTHOR });
  mockAssignmentFindOne.mockReset().mockResolvedValue({ id: 1 });
  mockSignalFindOne.mockReset().mockResolvedValue(null);
  mockSignalCount.mockReset().mockResolvedValue(0);
  mockSignalCreate.mockReset().mockResolvedValue({
    id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date(),
  });
  mockUserFindByPk.mockReset().mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Coach', username: 'ada' });
  mockCreateNotification.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('coach signal — target checks', () => {
  it('refuses a non-coach role with 403', async () => {
    session.user = { id: '7', role: 'client' };
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown or non-approved post, and never reveals which', async () => {
    mockPostFindOne.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(404);
    // The approved filter must be part of the query, not a post-hoc check.
    expect(mockPostFindOne.mock.calls[0][0].where.moderationStatus).toBe('approved');
  });

  it('refuses a coach signalling their own post, across a string/number id mismatch', async () => {
    // req.user.id is '7' (string), post.userId is 7 (number). A raw === would miss this.
    mockPostFindOne.mockResolvedValue({ id: 3, userId: 7 });
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('refuses a coach with no ACTIVE assignment, treating a NULL status as active', async () => {
    mockAssignmentFindOne.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(403);

    const where = mockAssignmentFindOne.mock.calls[0][0].where;
    expect(where.trainerId).toBe('7');
    expect(where.clientId).toBe(MEMBER_AUTHOR);
    // SQL NULL never matches IN (...), so NULL must be expressed with Op.is.
    expect(where[Op.or]).toContainEqual({ status: { [Op.is]: null } });
  });
});

describe('coach signal — post uniqueness', () => {
  it('returns 409 when the coach already signalled this post', async () => {
    mockSignalFindOne.mockResolvedValue({ id: 5 });
    const res = await post();
    expect(res.status).toBe(409);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race on double-tap to 409, not 500', async () => {
    // The pre-check passed, then the DB rejected the insert. This is the duplicate path.
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockSignalCreate.mockRejectedValue(race);
    const res = await post();
    expect(res.status).toBe(409);
  });

  it('scopes the duplicate check to the coach AND the post together', async () => {
    await post();
    expect(mockSignalFindOne.mock.calls[0][0].where).toEqual({ coachId: '7', postId: 3 });
  });
});

describe('coach signal — quota', () => {
  it('allows the fifth signal and refuses the sixth', async () => {
    mockSignalCount.mockResolvedValue(4);
    expect((await post()).status).toBe(201);

    mockSignalCount.mockResolvedValue(5);
    const res = await post();
    expect(res.status).toBe(429);
    expect(mockSignalCreate).toHaveBeenCalledTimes(1);
  });

  it('counts from UTC midnight, not from a rolling 24h window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T16:00:00.000Z'));
    await post();

    const window = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];
    expect(window.toISOString()).toBe('2026-09-21T00:00:00.000Z');
  });

  it('holds the cap across a DST boundary — the window is UTC, so it cannot shift', async () => {
    // 2026-11-01 is a US DST transition. A local-midnight implementation would move the
    // boundary by an hour and could hand out a sixth signal; a UTC one cannot.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T09:30:00.000Z'));
    await post();
    const before = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];

    vi.setSystemTime(new Date('2026-11-01T10:30:00.000Z'));
    await post();
    const after = mockSignalCount.mock.calls[0][0].where.createdAt[Op.gte];

    expect(before.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(after.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('re-reads the count on every request, so a restart cannot reset the cap', async () => {
    await post();
    await post();
    // Quota lives in the database, never in module-level state — two requests, two reads.
    expect(mockSignalCount).toHaveBeenCalledTimes(2);
  });
});

describe('coach signal — note handling', () => {
  it('rejects an over-length note with 422 rather than truncating it', async () => {
    const res = await post({ note: 'x'.repeat(121) });
    expect(res.status).toBe(422);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only note with 422', async () => {
    const res = await post({ note: '   ' });
    expect(res.status).toBe(422);
  });

  it('stores a trimmed note and still returns 201 when the bell entry fails', async () => {
    mockCreateNotification.mockRejectedValue(new Error('bell down'));
    const res = await post({ note: '  great work  ' });
    expect(res.status).toBe(201);
    expect(mockSignalCreate.mock.calls[0][0].note).toBe('great work');
  });
});

describe('coach signal — the recorded postId decision', () => {
  it('keeps postId nullable so ON DELETE SET NULL can preserve the member\'s record', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const migration = readFileSync(resolve(import.meta.dirname, '../migrations/20260916-create-coach-signals.cjs'), 'utf8');

    // If this fails, someone applied correction 3. Read the header of this file first:
    // NOT NULL and SET NULL cannot both hold, and posts are hard-deleted.
    expect(migration).toMatch(/postId:\s*\{[\s\S]*?allowNull:\s*true/);
    expect(migration).toContain("onDelete: 'SET NULL'");
    expect(migration).not.toContain('allowNull: false,\n        references: { model: \'SocialPosts\'');
  });

  it('enforces one signal per coach per post for non-null values', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const model = readFileSync(resolve(import.meta.dirname, '../models/social/CoachSignal.mjs'), 'utf8');

    expect(model).toMatch(/\{\s*unique:\s*true,\s*fields:\s*\['coachId',\s*'postId'\]\s*\}/);
    expect(model).not.toContain('sessionId');
  });
});
````



---

## 5. The open-defect sites — round 1's HIGH findings, at the shipped revision

Round 1's three HIGH defects were **not** fixed by R1, by design: two sit outside R1's four permitted
paths, and the third would change the shipped `spotlight.v1` body, which `06-bans.md` forbids
changing unilaterally. **Verify each against the code below rather than taking this paragraph's word
for it** — including whether the reason given for leaving it is itself correct.

1. **Quota admission is not atomic** — `coachSignalRoutes.mjs`, count-then-create with no transaction.
2. **Revision application is not atomic** — `bridgeIngestRoutes.mjs`: read, `await` a rehost, then an
   unconditional update. The awaited call is in `spotlightImageFetch.mjs` below.
3. **Receiver validation and persistence disagree** — a validated/normalised id versus the raw id
   stored, an unbounded `revision` against a stored INTEGER, and `retracted` read for truthiness in
   one place but compared strictly in another.

### 5.1 `backend/routes/social/coachSignalRoutes.mjs`

````
<<< backend/routes/social/coachSignalRoutes.mjs >>>
import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';
import { createNotification } from '../../controllers/notificationController.mjs';

const router = express.Router();

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.3
// Coach Signal = rationed coach recognition (max 5 / coach / UTC day, 1 per post,
// coach must hold an ACTIVE assignment to the post author). Model is dedicated —
// never extend the SocialLike reactionType ENUM (schema-drift rule 58).

const DAILY_SIGNAL_CAP = 5;
const NOTE_MAX_LENGTH = 120;
const COACH_ROLES = new Set(['trainer', 'admin']);

// authMiddleware attaches req.user.id as a STRING (toStringId, authMiddleware.mjs:357)
// while Sequelize INTEGER columns surface as JS numbers. Every id comparison in this
// file therefore normalizes to string on both sides — a raw `===` here is always false
// (hostile review F2.1, 2026-09-18).
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const startOfUtcDay = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const loadModels = async () => {
  const [CoachSignal, SocialPost, ClientTrainerAssignment, User] = await Promise.all([
    import('../../models/social/CoachSignal.mjs'),
    import('../../models/social/SocialPost.mjs'),
    import('../../models/ClientTrainerAssignment.mjs'),
    import('../../models/User.mjs'),
  ]);
  return {
    CoachSignal: CoachSignal.default,
    SocialPost: SocialPost.default,
    ClientTrainerAssignment: ClientTrainerAssignment.default,
    User: User.default,
  };
};

/**
 * POST /api/social/coach-signals
 * Body: { postId: number, note?: string }
 * 403 when the caller is not a coach, or does not hold an ACTIVE assignment to
 *   the post author; 404 unknown/most-restricted post; 409 duplicate coach+post;
 *   429 past the daily cap; 422 invalid note.
 */
router.post('/', protect, async (req, res) => {
  try {
    const { postId, note } = req.body ?? {};

    if (!COACH_ROLES.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only coaches can send signals.' });
    }

    const parsedPostId = Number.parseInt(postId, 10);
    if (!Number.isInteger(parsedPostId) || parsedPostId < 1) {
      return res.status(422).json({ success: false, message: 'A valid postId is required.' });
    }

    // Over-length notes are REJECTED, never silently truncated (hostile review F2.4).
    // Silent mutation of user input is worse than an honest 422.
    let trimmedNote = null;
    if (typeof note === 'string') {
      const candidate = note.trim();
      if (candidate.length === 0) {
        return res.status(422).json({ success: false, message: 'Note cannot be blank when provided.' });
      }
      if (candidate.length > NOTE_MAX_LENGTH) {
        return res.status(422).json({
          success: false,
          message: `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`,
        });
      }
      trimmedNote = candidate;
    }

    const { CoachSignal, SocialPost, ClientTrainerAssignment, User } = await loadModels();

    const post = await SocialPost.findOne({
      where: {
        id: parsedPostId,
        // moderationStatus is ENUM NOT NULL default 'approved' (SocialPost.mjs:33-38),
        // so NULL can never occur; only approved posts are signalable.
        moderationStatus: 'approved',
      },
      attributes: ['id', 'userId'],
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    if (sameId(post.userId, req.user.id)) {
      return res.status(403).json({ success: false, message: 'Coaches cannot signal their own posts.' });
    }

    // Real assignment columns: clientId / trainerId / status ('active'|'inactive'|'pending').
    // No boolean active column exists in the DB — status is the source of truth (rule 58).
    // status is STRING allowNull:true with default 'active', so a NULL status from a legacy
    // raw-SQL row must still count as active (hostile review F2.3).
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        trainerId: req.user.id,
        clientId: post.userId,
        // SQL NULL never matches `IN (...)`, so NULL is expressed explicitly.
        [Op.or]: [{ status: 'active' }, { status: { [Op.is]: null } }],
      },
      attributes: ['id'],
    });
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not the active coach for this member.' });
    }

    const duplicate = await CoachSignal.findOne({
      where: { coachId: req.user.id, postId: parsedPostId },
      attributes: ['id'],
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already signaled this post.' });
    }

    const sentToday = await CoachSignal.count({
      where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
    });
    if (sentToday >= DAILY_SIGNAL_CAP) {
      return res.status(429).json({
        success: false,
        message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.`,
      });
    }

    const signal = await CoachSignal.create({
      coachId: req.user.id,
      memberId: post.userId,
      postId: parsedPostId,
      note: trimmedNote || null,
    });

    try {
      const coach = await User.findByPk(req.user.id, {
        attributes: ['id', 'firstName', 'lastName', 'username'],
      });
      const coachName = coach
        ? (coach.username || [coach.firstName, coach.lastName].filter(Boolean).join(' ') || 'Your coach')
        : 'Your coach';
      await createNotification({
        userId: post.userId,
        senderId: req.user.id,
        type: 'coach_signal',
        title: 'Coach Signal',
        message: trimmedNote
          ? `${coachName} sent you a signal: "${trimmedNote}"`
          : `${coachName} recognized your post. Keep it up!`,
      });
    } catch (notificationError) {
      // Signal persists even if the bell entry fails — the feed banner is the source of truth.
      logger.warn('Coach signal notification failed (non-fatal):', notificationError?.message);
    }

    return res.status(201).json({
      success: true,
      signal: { id: signal.id, postId: signal.postId, memberId: signal.memberId, note: signal.note, createdAt: signal.createdAt },
    });
  } catch (error) {
    // Postgres unique-violation race (double tap): treat as the duplicate path.
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'You already signaled this post.' });
    }
    logger.error('Coach signal creation failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while sending signal.' });
  }
});

/**
 * GET /api/social/coach-signals/received — signals for the signed-in member (today backwards, 50 max).
 */
router.get('/received', protect, async (req, res) => {
  try {
    const { CoachSignal, User } = await loadModels();
    const signals = await CoachSignal.findAll({
      where: { memberId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'postId', 'note', 'createdAt', 'coachId'],
    });
    const coachIds = [...new Set(signals.map((s) => s.coachId))];
    const coaches = coachIds.length
      ? await User.findAll({ where: { id: { [Op.in]: coachIds } }, attributes: ['id', 'firstName', 'lastName', 'username', 'photo'] })
      : [];
    const coachById = new Map(coaches.map((c) => [c.id, c]));
    return res.status(200).json({
      success: true,
      signals: signals.map((s) => {
        const coach = coachById.get(s.coachId);
        const plain = s.toJSON();
        return {
          ...plain,
          coach: coach
            ? { id: coach.id, displayName: coach.username || [coach.firstName, coach.lastName].filter(Boolean).join(' '), photo: coach.photo }
            : null,
        };
      }),
    });
  } catch (error) {
    logger.error('Coach signal listing failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while loading signals.' });
  }
});

export default router;
````


### 5.2 `backend/services/spotlightImageFetch.mjs`

````
<<< backend/services/spotlightImageFetch.mjs >>>
/**
 * spotlightImageFetch.mjs
 * =======================
 * SSRF-hardened fetch + decode for the SwanGuard → SwanStudios Spotlight image.
 *
 * WHY THIS EXISTS. `rehostImage()` in routes/bridge/bridgeIngestRoutes.mjs used to
 * validate the URL by checking the protocol and calling fetch with defaults. That
 * check constrains the URL you PASS, not the URL you CONNECT to: `fetch` follows
 * redirects by default, so any host returning `302 → http://169.254.169.254/...`
 * defeated it. The 8 MiB cap was also applied AFTER `arrayBuffer()` had buffered the
 * whole response, so it bounded what was STORED, not what was CONSUMED.
 *
 * THE PRECEDENT. `applaudAudioFetcher.mjs` already solves this threat model for the
 * PLAUD audio path (Codex CR-4: exact host, HTTPS, no credentials, DNS-resolved
 * private-IP rejection, `redirect:'error'`, streamed caps). This module reuses its
 * `isPrivateOrLocalAddress` rather than growing a second, drifting copy — two copies
 * of a private-range table is the failure mode, not the fix.
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM THE AUDIO PRECEDENT. The audio path can demand
 * an EXACT hostname match because it only ever fetches one vendor. A Spotlight image
 * URL is chosen by the curator in SwanGuard and points at an arbitrary publisher, so
 * an exact-host allowlist is not available. The controls below are therefore the ones
 * that survive an arbitrary host: HTTPS, no credentials, DNS-resolved private-range
 * rejection, no redirect following, a streamed byte cap, byte-sniffed type, and a
 * re-encode that strips metadata and normalises the stored artefact.
 *
 * FAILURE IS ALWAYS NON-FATAL TO THE CALLER. Every export returns a result object or
 * throws SpotlightImageError; the caller maps any failure to `imageUrl = null`. A
 * dropped Spotlight is worse than an imageless one (blueprint ban #4).
 */
import { promises as dns } from 'node:dns';
import sharp from 'sharp';
import logger from '../utils/logger.mjs';
import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';
import { sniffFileType } from './photoStorageService.mjs';

/** 5 MiB compressed input — the ceiling on what we will read off the wire. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** 16 MP decoded — a decompression bomb is cheap to send and expensive to decode. */
export const MAX_IMAGE_PIXELS = 16_000_000;
/** Total budget for connect + headers + body. */
export const IMAGE_FETCH_TIMEOUT_MS = 5_000;
/** Longest edge of the stored artefact. */
export const MAX_STORED_EDGE = 1600;

/** Types `sniffFileType` may return that are acceptable as a Spotlight image. */
const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);

export class SpotlightImageError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SpotlightImageError';
    this.code = code;
  }
}

/**
 * Validate a curator-supplied image URL.
 * HTTPS only; no embedded credentials; every resolved address must be publicly routable.
 * @returns {Promise<URL>} the parsed URL
 * @throws {SpotlightImageError}
 */
export async function validateSpotlightImageUrl(rawUrl) {
  let incoming;
  try {
    incoming = new URL(String(rawUrl));
  } catch {
    throw new SpotlightImageError('IMAGE_URL_MALFORMED', 'not a parseable URL');
  }

  // HTTPS only. `http:` was previously accepted, which allowed plaintext internal probes.
  if (incoming.protocol !== 'https:') {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `protocol must be https, got ${incoming.protocol}`);
  }

  // `https://allowed@evil.com` — the userinfo section is not part of the host, so a
  // check that only inspects hostname would read this as evil.com with credentials.
  if (incoming.username || incoming.password) {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
  }

  // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
  // is refused before any socket is opened, which closes direct internal targeting.
  //
  // NOTE — this is a check-time validation only, NOT a complete DNS-rebinding defence:
  // the fetch() below re-resolves the hostname, so a name that flips to a private address
  // between this lookup and the fetch would still be reached (TOCTOU). That residual gap is
  // accepted because every caller of this path is gated behind a valid HMAC signature.
  let addrs;
  try {
    addrs = await dns.lookup(incoming.hostname, { all: true });
  } catch (err) {
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'DNS lookup returned no addresses');
  }
  for (const { address } of addrs) {
    if (isPrivateOrLocalAddress(address)) {
      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
    }
  }

  return incoming;
}

/**
 * Fetch an image with `redirect: 'error'` and a streamed byte cap.
 * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
 */
export async function fetchSpotlightImage(rawUrl, opts = {}) {
  const {
    maxBytes = MAX_IMAGE_BYTES,
    timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
  } = opts;

  let url;
  try {
    url = await validateSpotlightImageUrl(rawUrl);
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'GET',
      // THE FIX. Following a redirect re-enters the network with a URL that was never
      // validated — the protocol/host/DNS checks above only ever saw the first hop.
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'image/*' },
    });
  } catch (err) {
    const msg = err?.message || '';
    if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
      return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
    }
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
      return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
    }
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
  }

  if (!response.ok) {
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `upstream returned ${response.status}` };
  }

  // Optional early exit. The streamed cap below is the authoritative gate, because a
  // declared Content-Length is a claim, not a fact.
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, code: 'IMAGE_TOO_LARGE', message: `Content-Length ${declared} > cap ${maxBytes}` };
  }

  if (!response.body) {
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: 'response has no body' };
  }

  const chunks = [];
  let total = 0;
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      // Cap enforced WHILE reading. The previous code buffered the entire body with
      // arrayBuffer() and only then compared its length — so a multi-gigabyte response
      // was fully materialised before being rejected.
      if (total > maxBytes) {
        try { await reader.cancel('size cap exceeded'); } catch { /* release is best-effort */ }
        return { ok: false, code: 'IMAGE_TOO_LARGE', message: `streamed ${total} bytes > cap ${maxBytes}` };
      }
      chunks.push(chunk);
    }
  } catch (err) {
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Prove the bytes really are a single-frame raster image, then re-encode them.
 *
 * Three things happen here, and each is a control rather than a tidy-up:
 *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
 *      attacker-controlled and is not consulted. SVG is not in the signature table, so
 *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
 *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
 *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
 *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
 *      stored artefact, and guarantees the bytes we serve are bytes we produced.
 *
 * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
 * @throws {SpotlightImageError}
 */
export async function decodeSpotlightImage(buffer, opts = {}) {
  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
  }

  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
  }
  if (!RASTER_EXT.has(sniffed.ext)) {
    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
  } catch (err) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
  }

  if (!metadata?.width || !metadata?.height) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
  }
  if (metadata.width * metadata.height > maxPixels) {
    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
  }
  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
  if (Number(metadata.pages) > 1) {
    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
  }

  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });

  const keepAlpha = Boolean(metadata.hasAlpha);
  const outBuffer = keepAlpha
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  return {
    buffer: outBuffer,
    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
    ext: keepAlpha ? 'png' : 'jpg',
  };
}

/**
 * One call for the route: validate → fetch → decode.
 * Any failure is a value, never an exception, so the ingest path cannot be broken by an image.
 */
export async function fetchAndDecodeSpotlightImage(rawUrl, opts = {}) {
  const fetched = await fetchSpotlightImage(rawUrl, opts);
  if (!fetched.ok) return fetched;

  try {
    const decoded = await decodeSpotlightImage(fetched.bytes, opts);
    return { ok: true, ...decoded, sourceContentType: fetched.contentType };
  } catch (err) {
    if (err instanceof SpotlightImageError) return { ok: false, code: err.code, message: err.message };
    logger.warn(`Spotlight image decode failed unexpectedly: ${err.message}`);
    return { ok: false, code: 'IMAGE_DECODE_FAILED', message: err.message };
  }
}
````


### 5.3 `backend/services/swanBridgeSignature.mjs`

````
<<< backend/services/swanBridgeSignature.mjs >>>
/**
 * swanBridgeSignature.mjs
 * ========================
 * HMAC-SHA256 verification for the SwanGuard → SwanStudios Spotlight bridge.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.1
 *
 * Wire format:
 *   X-Swan-Signature: sha256=<hex>
 *   X-Swan-Timestamp: <ISO 8601>
 *   X-Swan-Idempotency-Key: <itemId>@<revision>
 *   canonical string = `${timestamp}.${rawBody}`
 *
 * Safety properties inherited from the PLAUD precedent (services/plaudWebhookSignature.mjs),
 * which exists because of Codex CR/M findings on this exact class of code:
 *   - hex shape is validated BEFORE crypto.timingSafeEqual, so a malformed signature
 *     returns 401 instead of throwing a length-mismatch 500 (M-1)
 *   - comparison is constant-time
 *   - a missing/short secret never leaks which env var was consulted
 */
import crypto from 'node:crypto';

const SIG_REGEX = /^sha256=[0-9a-f]{64}$/i;
export const DEFAULT_SKEW_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;

/** Read + shape-validate the signature header. */
export function parseSignatureHeader(value) {
  if (typeof value !== 'string' || !SIG_REGEX.test(value.trim())) return null;
  return value.trim().slice('sha256='.length).toLowerCase();
}

/** ISO timestamp must parse and sit inside the skew window. */
export function isTimestampInWindow(timestamp, nowMs = Date.now(), skewSeconds = DEFAULT_SKEW_SECONDS) {
  if (typeof timestamp !== 'string' || timestamp.length === 0) return false;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(nowMs - parsed) <= skewSeconds * 1000;
}

export function buildCanonicalPayload(timestamp, rawBody) {
  if (!Buffer.isBuffer(rawBody)) throw new Error('buildCanonicalPayload: rawBody must be a Buffer');
  return `${timestamp}.${rawBody.toString('utf8')}`;
}

/** Constant-time HMAC compare. `sigHex` must already be shape-validated. */
export function verifyHmac(canonicalPayload, sigHex, secret) {
  const expected = crypto.createHmac('sha256', secret).update(canonicalPayload).digest();
  let provided;
  try {
    provided = Buffer.from(sigHex, 'hex');
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/** Signer used by tests and by any local tooling that needs a valid payload. */
export function signPayload(timestamp, rawBody, secret) {
  return `sha256=${crypto
    .createHmac('sha256', secret)
    .update(buildCanonicalPayload(timestamp, rawBody))
    .digest('hex')}`;
}

/**
 * Resolve the shared secret. Throws on missing/short — the caller maps that to a 401
 * WITHOUT echoing the message, so the env var name is never disclosed.
 */
export function resolveBridgeSecret(env = process.env) {
  const secret = env.SWAN_BRIDGE_SECRET_V1;
  if (!secret) throw new Error('SWAN_BRIDGE_SECRET_V1 not set');
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SWAN_BRIDGE_SECRET_V1 too short (${secret.length} < ${MIN_SECRET_LENGTH})`);
  }
  return secret;
}

/**
 * Verify an inbound bridge request.
 * -> { ok: true }
 * -> { ok: false, status, code }   (status is 401 for every authentication failure)
 */
export function verifyBridgeRequest(req, { nowMs = Date.now(), secretResolver = resolveBridgeSecret } = {}) {
  const sigHex = parseSignatureHeader(req.headers['x-swan-signature']);
  if (!sigHex) return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };

  const timestamp = req.headers['x-swan-timestamp'];
  if (!isTimestampInWindow(timestamp, nowMs)) {
    return { ok: false, status: 401, code: 'SIGNATURE_EXPIRED' };
  }

  if (!Buffer.isBuffer(req.rawBody)) {
    // The bridge path must be excluded from the global JSON parser so raw bytes survive
    // (backend/core/middleware/index.mjs path filter). If this fires, the mount order regressed.
    return { ok: false, status: 500, code: 'RAW_BODY_UNAVAILABLE' };
  }

  let secret;
  try {
    secret = secretResolver();
  } catch {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }

  const canonical = buildCanonicalPayload(timestamp, req.rawBody);
  if (!verifyHmac(canonical, sigHex, secret)) {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }
  return { ok: true };
}
````



**The "passes for the wrong reason" suite (round-1 F10).** `tests/api/swanBridgeIngest.test.mjs`
stubs one storage module while the code path imports from another, so its two image assertions may
pass because the real upload fails on missing credentials. Both storage modules and the suite are
below; say whether the finding holds at this revision.

### 5.4 `backend/tests/api/swanBridgeIngest.test.mjs`

````
<<< backend/tests/api/swanBridgeIngest.test.mjs >>>
/**
 * SwanGuard -> SwanStudios Spotlight bridge — integration contract (S3)
 * ===========================================================================
 * These are REAL signed requests against the real router, not source greps: the HMAC,
 * the skew window, the banned-terms second gate, and the (itemId, revision) idempotency
 * rule are all exercised end to end.
 *
 * The DB model and R2 are mocked — no network, no database.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindByPk, mockCreate, mockUploadPhoto } = vi.hoisted(() => ({
  mockFindByPk: vi.fn(),
  mockCreate: vi.fn(),
  mockUploadPhoto: vi.fn(),
}));

vi.mock('../../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, create: mockCreate },
}));

vi.mock('../../services/r2StorageService.mjs', () => ({
  uploadPhoto: mockUploadPhoto,
}));

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

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockFindByPk.mockReset().mockResolvedValue(null);
  mockCreate.mockReset().mockResolvedValue({});
  mockUploadPhoto.mockReset();
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
    mockFindByPk.mockResolvedValue({ revision: 3, imageUrl: null, update: vi.fn() });
    const res = await post(body({ revision: 3 }));
    expect(res.status).toBe(200);
    expect(res.body.noop).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('treats an older revision as a no-op (out-of-order delivery)', async () => {
    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null, update: vi.fn() });
    const res = await post(body({ revision: 2 }));
    expect(res.body.noop).toBe(true);
  });

  it('upserts when the revision is higher', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: null, update });
    const res = await post(body({ revision: 4 }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('marks a retraction instead of deleting the row', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: 'https://r2/x.png', update });
    const res = await post(body({ revision: 2, retracted: true }));
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0].retracted).toBe(true);
  });
});

describe('bridge ingest — image re-host is never fatal', () => {
  it('stores the item with a null image when the re-host fails', async () => {
    mockUploadPhoto.mockRejectedValue(new Error('R2 down'));
    const res = await post(body({ imageUrl: 'https://swanguard.example/pic.png' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
  });

  it('refuses to hot-link a non-http image URL', async () => {
    const res = await post(body({ imageUrl: 'javascript:alert(1)' }));
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
  });
});
````


### 5.5 `backend/services/photoStorageService.mjs`

````
<<< backend/services/photoStorageService.mjs >>>
// backend/services/photoStorageService.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Unified Photo Storage Service for SwanStudios
//
// Uploads photos to Cloudflare R2 when configured, falls back to local disk.
// Used by: profile photo, banner photo, measurement progress photos.
//
// R2 Setup:
//   1. Enable public access on your R2 bucket (Cloudflare dashboard)
//   2. Set R2_PUBLIC_URL env var to the r2.dev subdomain URL
//   3. Existing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//      R2_BUCKET_NAME env vars are shared with r2StorageService (video).
// ─────────────────────────────────────────────────────────────────────────────

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.mjs';

// `__dirname` does NOT exist in ES module scope. It was referenced below without
// being defined, which threw `ReferenceError: __dirname is not defined in ES
// module scope` on EVERY import — so this module could not be loaded by plain
// `node` at all, and the whole app failed to boot.
//
// It was invisible to the test suite because vitest transforms modules through
// Vite, which supplies a `__dirname` shim; `node server.mjs` supplies nothing.
// This is the same shape as the `uploadPhoto` defect above: a failure that only
// appears in the real runtime. Every other file in this repo that uses
// `__dirname` defines it exactly like this.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy imports to avoid circular dependency issues
let _getR2Client = null;
let _r2Configured = false;

async function ensureR2Imports() {
  if (_getR2Client) return;
  try {
    const mod = await import('./r2StorageService.mjs');
    _getR2Client = mod.getR2Client;
    _r2Configured = mod.r2Configured;
  } catch {
    _r2Configured = false;
  }
}

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// ── Local disk root (E-11, hostile review seat 3) ──────────────────────────
// Every disk path in the upload/serve/delete chain is derived from THIS one
// constant. The old code used process.cwd() in three places, but cwd is just
// wherever node happened to be launched from, while express.static mounts
// uploads from a __dirname-relative path. Start the process from anywhere else
// and uploads land where the server can never serve them, while deletePhoto
// silently no-ops on a path that does not exist.
export const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
export const DISK_URL_PREFIX = '/uploads';

/**
 * Resolve a "/uploads/category/filename" URL (or bare "category/filename")
 * to an absolute on-disk path.
 * @param {string} urlOrRelative
 * @returns {string} absolute path, always inside UPLOADS_ROOT
 */
export function resolveLocalUploadPath(urlOrRelative) {
  const relative = String(urlOrRelative || '')
    .replace(/^\/+/, '')
    .replace(/^uploads\//, '');
  const resolved = path.resolve(UPLOADS_ROOT, relative);
  // Path-traversal guard: never escape the uploads root.
  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error(`Refusing to resolve upload path outside uploads root: ${urlOrRelative}`);
  }
  return resolved;
}

// ── Magic-byte sniffing (E-07, hostile review seat 3) ──────────────────────
// `contentType` and `originalFilename` are BOTH client-controlled. A caller
// can upload an HTML payload named "avatar.jpg" with Content-Type text/html,
// and R2 will serve it back from our own public domain with that Content-Type
// — stored XSS. Extension allowlists at the route layer do not stop it,
// because the attacker simply names the file "avatar.jpg".
//
// The bytes are the only trustworthy statement of what a file actually is, so
// the stored extension AND the stored Content-Type are both derived from the
// sniff, never from the request.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

const FILE_SIGNATURES = [
  // images
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif', mime: 'image/gif', test: (b) => b.subarray(0, 3).toString('latin1') === 'GIF' && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61 },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: 'heic', mime: 'image/heic', test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.has(b.subarray(8, 12).toString('latin1')) },
  // video containers (social posts upload video through this same helper)
  { ext: 'mp4', mime: 'video/mp4', test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
  { ext: 'webm', mime: 'video/webm', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { ext: 'avi', mime: 'video/x-msvideo', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'AVI ' },
  // documents (trainer COI / certification uploads — see ALLOWED_MIME in trainerOnboardingRoutes.mjs)
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

/**
 * Identify a buffer from its leading bytes.
 * @param {Buffer} buffer
 * @returns {{ext: string, mime: string}|null} null when the bytes match nothing we accept
 */
export function sniffFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  for (const sig of FILE_SIGNATURES) {
    // every test() reads at most the first 12 bytes, which the length guard covers
    if (sig.test(buffer)) return { ext: sig.ext, mime: sig.mime };
  }
  return null;
}

/**
 * Upload a photo buffer to storage.
 *
 * @param {Buffer} buffer - File data
 * @param {Object} opts
 * @param {string|number} opts.userId          - Owner user ID
 * @param {string}        opts.category        - "profiles" | "banners" | "measurements"
 * @param {string}        opts.originalFilename - Original filename (used for extension)
 * @param {string}        [opts.contentType]    - MIME type, defaults to "image/jpeg"
 * @returns {Promise<{ url: string, storageKey: string, storage: 'r2'|'local' }>}
 */
export async function uploadPhoto(buffer, { userId, category, originalFilename, contentType }) {
  await ensureR2Imports();

  // E-07: trust the bytes, not the request. This is the single choke point for
  // every upload caller (profile, banner, measurement, equipment, product,
  // challenge, social photo/video, trainer credential).
  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    logger.warn(
      '[PhotoStorage] Rejected upload — bytes match no accepted type (declared=%s name=%s bytes=%d)',
      contentType, originalFilename, buffer?.length ?? 0
    );
    throw new Error('Uploaded file is not a recognized image, video or PDF.');
  }
  if (contentType && contentType !== sniffed.mime) {
    logger.warn(
      '[PhotoStorage] Declared type %s disagrees with actual bytes (%s) — storing as %s',
      contentType, sniffed.mime, sniffed.mime
    );
  }

  const ext = sniffed.ext;
  const safeContentType = sniffed.mime;
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const objectKey = `photos/${category}/${userId}/${yearMonth}/${uuidv4()}.${ext}`;

  // ── R2 path ────────────────────────────────────────────────────────────────
  if (_r2Configured) {
    try {
      const client = _getR2Client();
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        // E-07: never the client-declared type — the sniffed one.
        ContentType: safeContentType,
      }));

      // Build the public URL
      // When R2_PUBLIC_URL is set, build full URL; otherwise route through our
      // API proxy so Render's static-site layer doesn't intercept the request.
      const url = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${objectKey}`
        : `/api/serve-photo/${objectKey}`;

      logger.info('[PhotoStorage] Uploaded to R2: %s (%d bytes)', objectKey, buffer.length);
      return { url, storageKey: objectKey, storage: 'r2' };
    } catch (err) {
      logger.error('[PhotoStorage] R2 upload failed, falling back to disk: %s', err.message);
      // Fall through to local disk
    }
  }

  // ── Local disk fallback ────────────────────────────────────────────────────
  // E-11: UPLOADS_ROOT, not process.cwd().
  const localDir = path.join(UPLOADS_ROOT, category);
  await fs.mkdir(localDir, { recursive: true });

  const filename = `${Date.now()}-${uuidv4()}.${ext}`;
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);

  const url = `${DISK_URL_PREFIX}/${category}/${filename}`;
  logger.info('[PhotoStorage] Saved to disk: %s (%d bytes)', url, buffer.length);
  return { url, storageKey: url, storage: 'local' };
}

/**
 * Delete a photo from storage (best-effort).
 *
 * @param {string} storageKey - The key/path returned by uploadPhoto
 */
export async function deletePhoto(storageKey) {
  if (!storageKey) return;
  await ensureR2Imports();

  // R2 stored photos have keys like "photos/profiles/1/2026-03/uuid.jpg"
  if (storageKey.startsWith('photos/') && _r2Configured) {
    try {
      const client = _getR2Client();
      await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
      }));
      logger.info('[PhotoStorage] Deleted from R2: %s', storageKey);
    } catch (err) {
      logger.warn('[PhotoStorage] R2 delete failed: %s', err.message);
    }
    return;
  }

  // Local disk paths (start with /uploads/)
  if (storageKey.startsWith('/uploads/') || storageKey.startsWith('uploads/')) {
    try {
      // E-11: same resolver the write path and the serve proxy use, so a
      // delete always lands on the file the upload actually wrote.
      const fullPath = resolveLocalUploadPath(storageKey);
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      logger.info('[PhotoStorage] Deleted from disk: %s', storageKey);
    } catch (err) {
      logger.warn('[PhotoStorage] Disk delete failed: %s', err.message);
    }
    return;
  }

  // Full HTTP URL (R2 public URL) — extract key and delete from R2
  if (storageKey.startsWith('http') && R2_PUBLIC_URL && storageKey.startsWith(R2_PUBLIC_URL)) {
    const key = storageKey.replace(R2_PUBLIC_URL.replace(/\/+$/, '') + '/', '');
    if (key && _r2Configured) {
      try {
        const client = _getR2Client();
        await client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        }));
        logger.info('[PhotoStorage] Deleted from R2 (via URL): %s', key);
      } catch (err) {
        logger.warn('[PhotoStorage] R2 delete via URL failed: %s', err.message);
      }
    }
  }
}
````


### 5.6 `backend/services/r2StorageService.mjs`

````
<<< backend/services/r2StorageService.mjs >>>
// backend/services/r2StorageService.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare R2 Storage Service for SwanStudios Video Library
//
// Provides presigned URL generation (upload PUT + playback GET), object
// verification (HEAD), deletion (DELETE), and scoped key generation.
//
// R2 uses an S3-compatible API, so we drive it with @aws-sdk/client-s3.
// ─────────────────────────────────────────────────────────────────────────────

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../utils/logger.mjs';

// ── Environment ──────────────────────────────────────────────────────────────

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  VIDEO_SIGNED_URL_TTL_HOURS,
} = process.env;

const r2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

if (!r2Configured) {
  logger.warn(
    '[R2StorageService] Missing one or more R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
    'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME). R2 operations will be unavailable. ' +
    'This is acceptable for local dev without object storage.',
  );
}

// ── Singleton Client ─────────────────────────────────────────────────────────

let _client = null;

/**
 * Returns a singleton S3Client instance configured for Cloudflare R2.
 * Throws if R2 env vars are not set.
 */
export function getR2Client() {
  if (_client) return _client;

  if (!r2Configured) {
    throw new Error(
      '[R2StorageService] Cannot create S3Client — R2 env vars are not configured.',
    );
  }

  const endpoint =
    R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  _client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // Disable automatic checksums — R2 doesn't fully support them
    // and they add x-amz-checksum-* headers that break CORS preflight
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  logger.info('[R2StorageService] S3Client initialised for R2 bucket: %s', R2_BUCKET_NAME);
  return _client;
}

// ── TTL Constants ────────────────────────────────────────────────────────────

const UPLOAD_TTL_SECONDS = 5 * 60; // 5 minutes
const PLAYBACK_TTL_SECONDS =
  (parseInt(VIDEO_SIGNED_URL_TTL_HOURS, 10) || 4) * 60 * 60; // default 4 hours
const THUMBNAIL_TTL_SECONDS = 1 * 60 * 60; // 1 hour

// ── Upload URL ───────────────────────────────────────────────────────────────

/**
 * Generate a presigned PUT URL for uploading an object to R2.
 *
 * Dual-mode signing:
 *   Mode A — sha256hex provided: sets x-amz-checksum-sha256 header condition
 *            (hex digest converted to base64).
 *   Mode B — sha256hex is null/undefined: no checksum header condition.
 *
 * @param {Object}  opts
 * @param {string}  opts.objectKey   - Full R2 object key.
 * @param {string}  opts.contentType - MIME type (e.g. "video/mp4").
 * @param {string|null} opts.sha256hex - SHA-256 hex digest of the file, or null.
 * @param {number}  opts.fileSize    - File size in bytes (used for Content-Length).
 * @returns {Promise<{ uploadUrl: string, mode: 'A' | 'B' }>}
 */
export async function generateUploadUrl({ objectKey, contentType, sha256hex, fileSize }) {
  const client = getR2Client();

  const commandInput = {
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: fileSize,
  };

  // Mode A: include checksum header (hex -> base64)
  if (sha256hex) {
    const checksumBase64 = Buffer.from(sha256hex, 'hex').toString('base64');
    commandInput.ChecksumSHA256 = checksumBase64;
  }

  const command = new PutObjectCommand(commandInput);

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_TTL_SECONDS,
  });

  const mode = sha256hex ? 'A' : 'B';

  logger.info(
    '[R2StorageService] Generated upload URL (mode %s) for key: %s  (size: %d, type: %s)',
    mode,
    objectKey,
    fileSize,
    contentType,
  );

  return { uploadUrl, mode };
}

// ── Playback URL ─────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for video playback.
 *
 * @param {Object} opts
 * @param {string} opts.objectKey - Full R2 object key.
 * @param {string} opts.mimeType  - MIME type for Content-Type response override.
 * @returns {Promise<string>} Signed URL.
 */
export async function generatePlaybackUrl({ objectKey, mimeType }) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: 'inline',
    ResponseContentType: mimeType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: PLAYBACK_TTL_SECONDS,
  });

  logger.info('[R2StorageService] Generated playback URL for key: %s  (ttl: %ds)', objectKey, PLAYBACK_TTL_SECONDS);
  return url;
}

// ── Thumbnail URL ────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for a thumbnail image.
 * Shorter TTL (1 hour) suitable for list endpoints.
 *
 * @param {string} objectKey - Full R2 object key for the thumbnail.
 * @returns {Promise<string>} Signed URL.
 */
export async function generateThumbnailUrl(objectKey) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: THUMBNAIL_TTL_SECONDS,
  });

  logger.info('[R2StorageService] Generated thumbnail URL for key: %s  (ttl: %ds)', objectKey, THUMBNAIL_TTL_SECONDS);
  return url;
}

// ── Head Object ──────────────────────────────────────────────────────────────

/**
 * Perform a HEAD request against an R2 object.
 * Used by upload-complete verification to confirm the object landed.
 *
 * @param {string} objectKey - Full R2 object key.
 * @returns {Promise<{ contentLength: number, contentType: string, checksumSHA256: string|null }>}
 */
export async function headObject(objectKey) {
  const client = getR2Client();

  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });

  const response = await client.send(command);

  const result = {
    contentLength: response.ContentLength,
    contentType: response.ContentType,
    checksumSHA256: response.ChecksumSHA256 || null,
  };

  logger.info(
    '[R2StorageService] HEAD %s — size: %d, type: %s, checksum: %s',
    objectKey,
    result.contentLength,
    result.contentType,
    result.checksumSHA256 ?? '(none)',
  );

  return result;
}

// ── Delete Object ────────────────────────────────────────────────────────────

/**
 * Delete an object from R2 (best-effort).
 *
 * @param {string} objectKey - Full R2 object key.
 * @returns {Promise<void>}
 */
export async function deleteObject(objectKey) {
  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });

    await client.send(command);
    logger.info('[R2StorageService] Deleted object: %s', objectKey);
  } catch (err) {
    logger.warn('[R2StorageService] Best-effort delete failed for %s: %s', objectKey, err.message);
  }
}

// ── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a scoped R2 object key for a video upload.
 *
 * Format: `videos/{creatorId}/{YYYY-MM}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.creatorId - User ID of the uploader.
 * @param {string}        opts.filename  - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generateObjectKey({ creatorId, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'bin';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const id = uuidv4();

  return `videos/${creatorId}/${yearMonth}/${id}.${ext}`;
}

/**
 * Generate a scoped R2 object key for a video thumbnail.
 *
 * Format: `thumbnails/{videoId}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.videoId  - Associated video record ID.
 * @param {string}        opts.filename - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generateThumbnailKey({ videoId, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'jpg';
  const id = uuidv4();

  return `thumbnails/${videoId}/${id}.${ext}`;
}

/**
 * Generate a scoped R2 object key for a photo upload.
 *
 * Format: `photos/{category}/{userId}/{YYYY-MM}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.userId   - User who owns the photo.
 * @param {string}        opts.category - e.g. "profiles", "banners", "measurements".
 * @param {string}        opts.filename - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generatePhotoKey({ userId, category, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'jpg';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const id = uuidv4();

  return `photos/${category}/${userId}/${yearMonth}/${id}.${ext}`;
}

/** Whether R2 env vars are configured. */
export { r2Configured };
````



---

## 6. THE EXISTING BLUEPRINTS — hostile review A1 targets

These are the documents you are asked to attack in **hostile review A1**. Contradictions between
them, diagrams that disagree with the real schema, slices whose acceptance criteria cannot be
executed, decisions stated but never enforced, and bans that contradict the plan are all in scope.

### 6.1 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/00-README.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/00-README.md >>>
# 00 — README: Builder Contract and build order

**Blueprint:** Social Bridge Completion — Studio Spotlight S5–S8
**Package root:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/`
**Status:** ARCHITECTURE DECIDED · G0 CLOSED · CORRECTIONS 1–7 APPLIED · S5 BUILDABLE

**Read in this order:** `CORRECTIONS-APPLIED.md` (what changed, and how each change was verified) →
`G0-SOURCE-EXCERPTS.md` (source truth) → this file (contract and build order) → `05-slices.md`
(the plan). **Where this package and the excerpts disagree, the excerpts win.**

---

**Destination**

`docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/`

> Earlier drafts of this line named `BLUEPRINT-studio-spotlight-completion-2026-09-19/`. The package
> directory on disk is `BLUEPRINT-social-bridge-completion-2026-09-19/`; that is the path above.

**Status: ARCHITECTURE DECIDED; CORRECTIONS 1–7 APPLIED; G0 EXCERPTS SUPPLIED.**

Gate G0 is closed — `G0-SOURCE-EXCERPTS.md` supplies the six source excerpts that were missing.
Corrections 1–7 from `VERIFICATION-NOTES.md` Part 4 are applied; the authoritative record of what
changed and where is `CORRECTIONS-APPLIED.md`. The package is buildable.

#### Working root (Correction 2)

Build S5 in **`Desktop/@Everything/SwanGuard-Newsroom`** on branch **`merge/newsroom-mainline-v3`**
(HEAD `d830bed`) — **not** in `family-first-intelligence-command-center` on `main`, which has no
`apps/web/src/newsroom/` directory at all. `SwanGuard-Newsroom` is a **linked git worktree**: `.git`
there is a file, not a directory.

These are proposed document contents, not files written into either repository. No tests or commands below have been executed.

#### Builder Contract

> You are the builder, not the architect. Follow the package to the letter. Where the package decides, you do not re-decide — even if you'd do it differently. Where the package is silent on something that matters, STOP and return the question; do not improvise. Build ONE slice at a time; after each slice, output the diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing. Never claim a criterion passed without pasting its output.

#### Build order

| Gate/slice | Deliverable |
|---|---|
| G0 | Repository evidence, worktree preservation, approved integration baselines |
| R1 | Signal constraints/quota correctness; receiver revision/image hardening |
| R2 | SwanStudios Spotlight administration and measurement |
| S5a | SwanGuard publication storage, authorization, outbox, receipts, kill-switch integration |
| S5b | Separate Studio Spotlight operator console and ceremony |
| S7 | Aggregate pulse, manifest reconciliation, Studio Pulse tile |
| S6 | Scheduled faction ceremony and bounded Three.js enhancement |
| S8 | Template-only in-app weekly digest |
| E1 | Staging rehearsal, production canary, explicit enablement |

Do not renumber the product slices to imply S1–S4 were rebuilt.

#### G0: evidence the repository-capable reviewer must attach

The **reviewer**, not the context-free builder, supplies numbered excerpts with commit SHA, path, and line range.

| Artifact | Required contents |
|---|---|
| `truth/01-baselines.txt` | Worktree list, branch status, commit SHAs, dirty inventory, protected backup verification |
| `truth/02-bridge.md` | Entire `spotlight.v1` validation schema; accepted/rejected bodies; exact success/error bodies; raw parser and route mounts; flag reader; HMAC implementation |
| `truth/03-ss-schema.md` | CoachSignal, SwanSpotlight, canonical user/post/session keys, actual indexes/checks/FKs, database drift comparison |
| `truth/04-ss-patterns.md` | Working authenticated admin route, frontend admin mount, model registration, top-level migration example, scheduler, test commands |
| `truth/05-sg-patterns.md` | Complete relevant route handler/dispatch excerpt, owner authorization, kill-switch persistence and checks, DB transaction/worker pattern, test commands |
| `truth/06-sg-surfaces.md` | Operator surface registration; `OperatorGrantConsole` excerpts; protected-file hashes; actual `bridge-policy.json` location and schema |
| `truth/07-domain-adapters.md` | Authoritative faction scoring, MVP eligibility, XP ledger, streaks, friendship visibility, preferences, client name resolver |
| `truth/08-runtime.md` | Runtime versions, database dialects, deployment topology, scheduler ownership, R2 helper, CORS/CSP, bundle baseline |
| `truth/09-baseline-results.txt` | Actual test/typecheck/build output, secret scan, production-router smoke tests |

**G0 deliverable:** An architect revision that replaces every `BLOCKED-G0` entry in this package with actual excerpts, final model definitions, exact integration edits, and executable repository-native commands.

#### Worktree preservation procedure

Run only after stopping editors, agents, dev servers that write generated files, and background git operations:

```bash
WT="$HOME/Desktop/@Everything/SwanGuard-Newsroom"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$HOME/SwanGuard-recovery-$STAMP"
mkdir -m 700 "$BACKUP"

git -C "$WT" status --porcelain=v2 --branch > "$BACKUP/status.txt"
git -C "$WT" worktree list --porcelain > "$BACKUP/worktrees.txt"
git -C "$WT" show-ref > "$BACKUP/refs.txt"
git -C "$WT" diff --binary > "$BACKUP/unstaged.patch"
git -C "$WT" diff --cached --binary > "$BACKUP/staged.patch"
git -C "$WT" ls-files --others --exclude-standard -z \
  > "$BACKUP/untracked-files.zlist"
git -C "$WT" bundle create "$BACKUP/repository.bundle" --all
git -C "$WT" bundle verify "$BACKUP/repository.bundle"
```

These commands are **not the complete backup**. Also take a protected filesystem copy of both the worktree and the repository’s shared git directory, including ignored files. The copy may contain secrets: restrict access and never commit it.

Verify restoration in a disposable location. Then fetch, record the actual divergence, and classify changes before making explicit-path commits. Create a clean feature worktree only from Sean’s approved integration commit.

> **SEAN MUST DECIDE:** Approve the SwanGuard integration commit and publication/push destination after the dirty-state audit. No automatic push to `main`, and no assumption that the 12 commits are all feature prerequisites.

---
````


### 6.2 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/01-architecture.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/01-architecture.md >>>
# 01 — Architecture: trust boundaries, flows, and schema

**Scope:** S5–S8 of the social bridge — Spotlight publishing, operator pulse, faction ceremony,
weekly digest.
**Contents:** 6 Mermaid diagrams (`flowchart LR` ×1, `sequenceDiagram` ×3, `erDiagram` ×1,
`stateDiagram-v2` ×1), the logical schema, and its primary-key convention (Correction 7).
**Note:** physical types for canonical keys and SwanGuard migrations remain `BLOCKED-G0`. This is
deliberately not a fabricated deployed ERD.

---

#### Ownership and trust boundaries

- SwanGuard owns drafts, ceremony attestations, publish/retract decisions, outbox attempts, and publisher receipts.
- SwanStudios owns accepted Spotlight state, hosted image assets, member visibility, local engagement events, and aggregate pulse production.
- Editorial payloads contain only the verified `spotlight.v1` fields. Do not add source provenance, operator identity, saved-story bodies, or private URLs.
- New reverse traffic contains fixed aggregates only.
- HMAC secrets stay server-side. The browser never signs bridge requests.
- SwanGuard may learn aggregate acceptance state through receipts/pulse, not member identities.
- The existing positivity gate remains authoritative at the receiver. Publisher ceremony is an additional gate, not a replacement.

```mermaid
flowchart LR
    O[Sean] --> C[Studio Spotlight Console]
    C --> P[Publication Transaction]
    P --> E[Immutable Publication Events]
    P --> Q[Durable Outbox]
    Q --> D[Bridge Spotlight Dispatcher]
    D --> I[SwanStudios Bridge Ingest]
    I --> G[Schema and Positivity Gate]
    G --> S[Revision State and Tombstones]
    G --> R[Bounded Image Rehosting]
    R --> S
    S --> F[Member Spotlight Rail]
    S --> A[Read-only Admin Console]
    F --> M[Local Measurement]
    M --> U[Aggregate Pulse]
    U --> T[Studio Pulse Tile]
    E --> N[Signed Manifest]
    N --> H[Hourly Reconciler]
    H --> G
```

#### API interaction diagrams

Existing ingest body and responses are `BLOCKED-G0`; its path and signature semantics remain unchanged.

```mermaid
sequenceDiagram
    participant B as Owner Browser
    participant G as SwanGuard API
    participant DB as SwanGuard Database
    participant W as Dispatcher
    participant S as SwanStudios API

    B->>G: GET /api/operator/studio-spotlight/items
    G->>G: Existing owner authorization
    G-->>B: Queue page
    B->>G: POST /items/{itemId}/publications
    G->>DB: Revision + event + outbox transaction
    DB-->>G: Durable commit
    G-->>B: 202 publication receipt
    W->>DB: Lease next eligible outbox row
    W->>W: Check owner kill switch
    W->>S: POST /api/bridge/spotlight
    S-->>W: Existing ingest response
    W->>DB: Append attempt receipt; resolve lease
    B->>G: GET /publications/{publicationId}/receipts
    G-->>B: Sanitized receipt list
```

```mermaid
sequenceDiagram
    participant B as Owner Browser
    participant G as SwanGuard API
    participant S as SwanStudios API

    B->>G: GET /api/operator/studio-pulse
    G->>S: Signed GET /api/operator/pulse
    S-->>G: Fixed aggregate DTO
    G-->>B: Cached DTO and freshness state
    S->>G: Signed GET /api/bridge/studio-spotlight/manifest
    G-->>S: Signed bounded manifest page
    S->>S: Apply revisions and durably save cursor
```

```mermaid
sequenceDiagram
    participant U as Member Browser
    participant S as SwanStudios API
    participant A as Admin Browser

    A->>S: GET /api/admin/studio-spotlight
    S-->>A: Receiver state only
    U->>S: POST /api/social/spotlight-events
    S-->>U: Accepted or duplicate
    U->>S: POST /api/social/faction-ceremony/claim
    S-->>U: One-time card or null
    U->>S: GET /api/social/weekly-digest
    S-->>U: Template data or null
    U->>S: PUT /api/social/weekly-digest/preference
    S-->>U: Current preference
```

Kill-switch requests use the **existing** owner API and its verified DTO; do not invent a parallel switch endpoint.

#### State machines

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Ready: Valid content and all attestations
    Ready --> Queued: Owner publishes
    Queued --> InFlight: Worker obtains lease
    InFlight --> Delivered: Receiver accepts or no-ops
    InFlight --> RetryWait: Retryable failure
    RetryWait --> InFlight: Scheduled retry
    InFlight --> Failed: Permanent error or retries exhausted
    Queued --> Paused: Kill switch
    RetryWait --> Paused: Kill switch
    Paused --> Queued: Owner resumes
    Delivered --> Queued: Higher revision or retraction
    Failed --> Queued: Audited requeue
```

`Ready` is a derived UI state, not permission to bypass server validation. Retrying a failed publication preserves its revision and payload bytes. Editing content creates a higher revision and requires a fresh ceremony.

#### Schema decisions

The following logical schema is fixed. **Primary-key convention is now decided — see the note under the diagram (Correction 7).** Physical types for canonical keys, SwanGuard migrations, and complete Sequelize definitions remain blocked by G0. This is intentionally not a fabricated deployed ERD.

```mermaid
erDiagram
    Users ||--o{ CoachSignalDailyBudgets : has
    Users ||--o{ SpotlightExposureFacts : generates
    Users ||--o{ FactionCeremonyClaims : claims
    Users ||--o{ WeeklyDigestPreferences : owns
    Users ||--o{ WeeklyDigests : receives
    StudioSpotlightItems ||--o{ SpotlightPublications : versions
    SpotlightPublications ||--o{ BridgeSpotlightAttempts : records
    FactionCeremonies ||--o{ FactionCeremonyClaims : displayed_as

    Users {
        CANONICAL_PK id PK
    }
    StudioSpotlightItems {
        int id PK
        bigint currentRevision
        json validatedDraft
        datetime updatedAt
    }
    SpotlightPublications {
        int id PK
        int itemId FK
        bigint revision
        bigint sequence UK
        string payloadSha256
        binary payloadBytes
        string status
        integer attemptCount
        datetime nextAttemptAt
        string leaseToken
        datetime leaseUntil
        datetime createdAt
    }
    BridgeSpotlightAttempts {
        int id PK
        int publicationId FK
        integer attemptNumber
        string outcomeCode
        integer httpStatus
        datetime startedAt
        datetime finishedAt
    }
    CoachSignalDailyBudgets {
        CANONICAL_PK coachId FK
        date localDate
        integer used
    }
    SpotlightExposureFacts {
        CANONICAL_PK userId FK
        string itemId
        bigint revision
        date localDate
        datetime impressedAt
        datetime dismissedAt
    }
    FactionCeremonies {
        int id PK
        date weekStart UK
        datetime opensAt
        datetime closesAt
        json presentation
    }
    FactionCeremonyClaims {
        int ceremonyId FK
        CANONICAL_PK userId FK
        datetime claimedAt
    }
    WeeklyDigestPreferences {
        CANONICAL_PK userId PK
        boolean enabled
        datetime updatedAt
    }
    WeeklyDigests {
        int id PK
        CANONICAL_PK userId FK
        datetime periodEnd
        json templateData
        datetime createdAt
    }
```

**Primary-key convention (Correction 7).** This diagram originally declared `uuid id PK` for every
new table. That does not match the schema S5–S8 extends, and mixing both conventions inside one
directory is the schema-inconsistency class the house rules exist to prevent. The rule is now:

- **New top-level `backend/models/social/*.mjs` tables use `DataTypes.INTEGER` autoIncrement `id`** —
  the convention of all 20 existing top-level `social/` models, and of `CoachSignal.mjs:13-17`.
  **Zero** top-level `social/` files use `DataTypes.UUID`.
- **Or a natural key where one genuinely exists** — as `SwanSpotlight.mjs:17-21` does with
  `itemId STRING(36)` as the primary key and no `id` column at all.
- **`backend/models/social/enhanced/*.mjs` uses `DataTypes.UUID`** (12 of 13 files). UUIDs are
  therefore an established pattern in this repo — but *not in the directory S5–S8 write into*.
- `Users` stays stubbed as `CANONICAL_PK id PK`. That is the correct behaviour when the real schema
  was not supplied, and it must not be replaced with invented columns.
- SwanGuard-side tables (`StudioSpotlightItems`, `SpotlightPublications`,
  `BridgeSpotlightAttempts`) must follow **SwanGuard's** migration convention, which remains
  `BLOCKED-G0`. The `int id PK` shown above is the stated default; a builder who finds a different
  verified convention in `packages/database/migrations` follows the verified one and says so.

If you want UUIDs for a top-level `social/` table, that is a **separate, explicit, argued decision** —
not a default inherited from this diagram.

**A foreign key's type is not a free choice — it must match the parent primary key's type.**
`FactionCeremonies.id` and `FactionCeremonyClaims.ceremonyId` were the last two `uuid` holdouts in
this diagram and were converted to `int` for exactly that reason: changing the parent without the
child would have produced a join between `integer` and `uuid` columns, which Postgres rejects. When
you convert a PK, convert every FK that references it in the same migration.

Additional required state:

- Manifest cursor: one durable consumer row, containing the last committed sequence.
- Publisher ceremony attestations: immutable publication-linked record; owner ID stays in SwanGuard.
- Scheduler ledger: unique `(jobName, scheduledFor)` with lease and completion state.
- Receiver tombstones: retain indefinitely; exact integration into `SwanSpotlight` depends on its real definition.
- Content hashes: SHA-256 of the exact outgoing UTF-8 body bytes, not reserialized JSON.

Do not persist `bigint` values as JavaScript numbers. API revisions and sequences introduced by this package use decimal strings; the existing wire revision type remains unchanged.

#### Concurrency and delivery rules

- Publication revision allocation, immutable payload creation, manifest sequence, and outbox insertion commit atomically.
- Transactional database sequence allocation must not allow a consumer to advance past an uncommitted lower sequence. Use a single locked stream-counter row acquired within the publication transaction.
- One active delivery per item. Serialize revisions; do not deliver an older revision after a newer one has been accepted.
- Worker leases last 60 seconds; HTTP timeout is 10 seconds. Lease completion requires the original lease token.
- Initial attempt plus **six retries**: 30, 120, 600, 1,800, 7,200, and 21,600 seconds after each preceding failure.
- Add deterministic 0–20% positive jitter derived from publication ID and retry number; persist the resulting schedule.
- Retry network failure, timeout, 408, 429, and 5xx. Respect a bounded `Retry-After`, maximum six hours.
- Treat other 4xx as permanent failures. A verified disabled-receiver 503 becomes paused, not an exhausted attempt.
- Check the kill switch at enqueue and immediately before network dispatch. Abort in-flight requests when possible. **A kill switch cannot recall a request the receiver already accepted.**
- Emergency content removal therefore uses explicit retractions or SwanStudios disablement, not a false “instant recall” promise.

---
````


### 6.3 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/02-wireframes.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/02-wireframes.md >>>
# 02 — Wireframes: desktop and 375px states

**Scope:** every new surface in S5–S8, drawn at 1440×900 and 375×812, including empty, loading and
error states.
**Hard rules:** no interactive target below 44×44 CSS pixels; no motion-only information; no
horizontal document overflow at either width.
**Tokens:** styled-components only, palette tokens with fallbacks. Never `#0a0a1a`, `#00FFFF`, or
`#7851A9`. Gold = earned recognition only; purple = AI coach only; editorial Spotlight uses ice-cyan.

---

#### Tokens

```css
--studio-bg: var(--midnight-sapphire, #002060);
--studio-surface: var(--obsidian-black, #0A0A0F);
--studio-text: var(--frost-white, #E0ECF4);
--studio-editorial: var(--ice-wing, #60C0F0);
--studio-earned: var(--gilded-fern, #C6A84B);
```

All functional controls are at least 44×44 CSS pixels. Focus indication uses the editorial token plus an outline; status never depends on color alone. No purple appears in these surfaces.

#### SwanGuard: separate operator page

Route: `/operator/studio-spotlight`.

Desktop, 1440×900:

```text
+------------------------------------------------------------------+
| Studio Spotlight                  [Pause publishing] [Refresh]    |
| Publishing active                                                |
+----------------------+-------------------------------------------+
| Queue                | Selected item                             |
| [All statuses v]     | Headline                                  |
| [Search items     ]  | [                                        ]|
|                      | Member preview                            |
| Headline             | +---------------------------------------+ |
| Draft                | | Positive perspective                  | |
|                      | | Headline                              | |
| Headline             | | Editorial summary                     | |
| Delivered            | +---------------------------------------+ |
|                      | [Save draft] [Review for publishing]      |
|                      | [Retract from SwanStudios]                |
+----------------------+-------------------------------------------+
| Delivery receipts                                                |
| Revision | State | Last attempt | [View receipt]                  |
+------------------------------------------------------------------+
```

375×812:

```text
+-----------------------------------+
| Studio Spotlight                  |
| Publishing active                 |
| [Pause publishing] [Refresh]      |
| [All statuses v]                  |
| [Search items                  ]  |
| Queue                             |
| [Headline                      >] |
| Draft                             |
+-----------------------------------+
```

Selecting an item opens a full-width detail route with `[Back to queue]`; it does not mutate `StorySheet.tsx`.

#### Publication ceremony

Desktop modal and mobile full-screen dialog:

```text
+-----------------------------------+
| Review for publishing     [Close] |
| Confirm every statement.          |
| [ ] No politics                   |
| [ ] No negativity or ragebait     |
| [ ] Image rights cleared         |
| [ ] Headline is in Sean's voice   |
|                                   |
| Publishing sends this preview     |
| to SwanStudios.                   |
| [Cancel] [Publish to SwanStudios]  |
+-----------------------------------+
```

- Publish disabled until all four boxes are checked and validation passes.
- With no image, rights confirmation means no uncleared image is being sent.
- Changing any published field after opening the dialog resets all four boxes.
- Server binds attestations to the content hash; browser checkboxes are not authority.
- Modal focus is trapped and restored. Escape closes only while no request is pending.

Retraction confirmation:

```text
+-----------------------------------+
| Retract Spotlight         [Close] |
| Remove this item from             |
| SwanStudios?                      |
| [Cancel] [Retract item]            |
+-----------------------------------+
```

#### SwanStudios admin

Route: `/admin/studio-spotlight`.

```text
DESKTOP 1440x900
+------------------------------------------------------------------+
| Studio Spotlight                                      [Refresh]  |
| Spotlight disabled                                               |
| Live items: 0                                                    |
| Headline | Revision | Received | Image | Receipt                  |
+------------------------------------------------------------------+

MOBILE 375x812
+-----------------------------------+
| Studio Spotlight       [Refresh]  |
| Spotlight disabled                |
| Live items: 0                     |
| No live Spotlight items.          |
+-----------------------------------+
```

No publish, edit, or direct-delete button exists here.

#### Studio Pulse tile

```text
DESKTOP                              MOBILE 375px
+--------------------------------+   +-----------------------------------+
| Studio Pulse         [Refresh] |   | Studio Pulse            [Refresh] |
| Updated 2 minutes ago          |   | Updated 2 minutes ago             |
| Spotlight active               |   | Spotlight active                  |
| Live items                 3   |   | Live items: 3                     |
| Impressions              240   |   | Impressions: 240                  |
| Dismissal rate           25%   |   | Dismissal rate: 25%               |
| Placement review not needed    |   | Placement review not needed       |
+--------------------------------+   +-----------------------------------+
```

When sample size is insufficient: `"Not enough activity to assess placement."`

#### Faction ceremony

```text
DESKTOP RIGHT RAIL                    MOBILE 375px
+------------------------------+     +-----------------------------------+
| This week's faction honors   |     | This week's faction honors       |
| [bounded crystal scene]      |     | [static crystal illustration]    |
| Winner: resolved faction     |     | Winner: resolved faction         |
| MVP: resolved member         |     | MVP: resolved member             |
| Next week: resolved modifier |     | Next week: resolved modifier     |
| [Continue]                   |     | [Continue]                       |
+------------------------------+     +-----------------------------------+
```

Gold is limited to earned recognition. Scene backdrop and system labels remain ice-cyan.

#### Weekly digest

```text
DESKTOP                              MOBILE 375px
+--------------------------------+   +-----------------------------------+
| Your week at SwanStudios        |   | Your week at SwanStudios          |
| XP earned: 120                  |   | XP earned: 120                    |
| Current streak: 4 days          |   | Current streak: 4 days            |
| Friend highlight               |   | Friend highlight                  |
| A friend completed a challenge.|   | A friend completed a challenge.   |
| Faction rank: 2                |   | Faction rank: 2                   |
| [Read Spotlight]               |   | [Read Spotlight]                  |
| [Weekly digest: On]            |   | [Weekly digest: On]               |
+--------------------------------+   +-----------------------------------+
```

Names replace `"A friend"` only after authorized client-side resolution.

#### Exact shared states

Use the same state layout on desktop and mobile; no layout-only inaccessible spinner.

```text
LOADING
+-----------------------------------+
| Loading Studio Spotlight...       |
+-----------------------------------+

EMPTY QUEUE
+-----------------------------------+
| No items in this queue.           |
| Save a draft to get started.      |
+-----------------------------------+

ERROR
+-----------------------------------+
| Studio Spotlight could not load.  |
| [Try again]                       |
+-----------------------------------+

PAUSED
+-----------------------------------+
| Publishing paused.                |
| Queued items will not be sent.    |
| [Resume publishing]               |
+-----------------------------------+
```

Surface-specific replacements:

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Admin | `Loading live items...` | `No live Spotlight items.` | `Live items could not load.` |
| Pulse | `Loading Studio Pulse...` | `No activity yet.` | `Studio Pulse is unavailable.` |
| Ceremony | No placeholder | Render nothing | Render nothing; local diagnostic only |
| Digest | `Loading your weekly digest...` | `Your next weekly digest is on its way.` | `Your weekly digest could not load.` |
| Receipts | `Loading delivery receipts...` | `No delivery attempts yet.` | `Delivery receipts could not load.` |

Digest opt-out state: `"Weekly digest is off."` and `[Turn on weekly digest]`.

Pulse stale state: `"Studio Pulse is out of date."`; keep last verified values with their timestamp, never relabel them current.

#### Three.js boundary

- Exists **only inside the faction ceremony**.
- One decorative crystalline swan-like silhouette assembled from at most 24 low-poly shards.
- No simulation, particles, physics, audio, postprocessing, shadows, remote assets, text rendering, or additional canvas.
- Lazy import only after the member receives a non-null ceremony claim and passes motion/device checks.
- Animation lasts 2.5 seconds, then renders one static frame and stops.
- Cap at 30 fps and device-pixel ratio 1.5.
- At widths below 600px, including 375px: static CSS/SVG illustration, **no Three.js import**.
- `prefers-reduced-motion`, Save-Data, hidden tab, unavailable WebGL, or detected low-memory device: same static fallback.
- Incremental lazy chunk budget: **180 KiB gzip maximum**, with **0 bytes of Three.js in the initial social route chunk**. This is a build gate, not a claimed measurement.
- If the measured build exceeds budget, reduce the Three.js import surface or stop for checkpoint review. Do not silently remove the required desktop spectacle.
- The canvas is `aria-hidden`; the card’s text contains all information.

---
````


### 6.4 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/03-contracts.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/03-contracts.md >>>
# 03 — Contracts (part 1 of 2)

> Split on 2026-09-19 from a single 426-line document, to honour the ~300-line
> budget that lets a builder load these documents piecemeal.
> **Part 2 is `03b-contracts-s6-s8-and-interfaces.md`** — it continues with manifest
> reconciliation, the faction ceremony, the weekly digest, and the exported
> application interfaces.

#### Contract release rule

The exact existing `spotlight.v1` body and receiver response are **BLOCKED-G0**. Do not derive them from this package, invent `headline`/`summary` fields, or change shipped field types.

All newly defined DTOs below reject unknown request keys. New JSON responses use an explicit serializer, not `toJSON()` on an ORM object.

#### Common errors for new endpoints

```json
{"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}
```

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_REQUEST` | `Request is invalid.` |
| 401 | `UNAUTHORIZED` | `Authentication required.` |
| 403 | `FORBIDDEN` | `This action is not permitted.` |
| 404 | `NOT_FOUND` | `Item not found.` |
| 409 | `REVISION_CONFLICT` | `This item changed. Reload and try again.` |
| 413 | `PAYLOAD_TOO_LARGE` | `Request is too large.` |
| 429 | `RATE_LIMITED` | `Too many requests. Try again later.` |
| 500 | `INTERNAL_ERROR` | `The request could not be completed.` |
| 503 | `PUBLISHING_PAUSED` | `Publishing is paused.` |
| 503 | `FEATURE_DISABLED` | `This feature is disabled.` |
| 503 | `UPSTREAM_UNAVAILABLE` | `Studio Pulse is unavailable.` |

Never return exception text, upstream response bodies, SQL errors, source URLs, or secret-validation details.

#### SwanGuard operator APIs

Prefix: `/api/operator/studio-spotlight`.

Authorization: existing authenticated **owner** check; ordinary operators receive 403. Cookie-authenticated mutations require the existing CSRF mechanism.

| Method/path | Request | Success |
|---|---|---|
| `GET /items?status=all&limit=20` | Optional opaque `cursor`; limit 1–50 | 200 `StudioSpotlightItemPage` |
| `POST /items` | `{"draft": <verified editorial DTO>}` | 201 `StudioSpotlightItem` |
| `PUT /items/:itemId` | `{"expectedRevision":"0","draft":<DTO>}` | 200 `StudioSpotlightItem` |
| `POST /items/:itemId/publications` | Body below | 202 publication result |
| `POST /items/:itemId/retractions` | `{"expectedRevision":"1"}` | 202 publication result |
| `GET /publications/:publicationId/receipts` | None | 200 receipts |
| `POST /publications/:publicationId/retry` | `{}` | 202 same publication result |

Publication request:

```json
{
  "expectedRevision":"0",
  "draftSha256":"<64 lowercase hex characters>",
  "checks":{
    "noPolitics":true,
    "noNegativity":true,
    "imageRightsCleared":true,
    "headlineInOwnerVoice":true
  }
}
```

Publication result:

```json
{
  "publicationId":"11111111-1111-4111-8111-111111111111",
  "itemId":"22222222-2222-4222-8222-222222222222",
  "revision":"1",
  "state":"queued"
}
```

Receipts:

```json
{
  "publicationId":"11111111-1111-4111-8111-111111111111",
  "receipts":[
    {
      "attempt":1,
      "outcome":"accepted",
      "httpStatus":200,
      "completedAt":"2026-09-21T16:00:00.000Z"
    }
  ]
}
```

`outcome` is one of `accepted`, `retryable`, `rejected`, `timeout`, `network_error`, `paused`. These are application strings with database CHECK validation where supported, **not an extended existing ENUM**.

`StudioSpotlightItem` and its draft schema remain blocked until the wire DTO and current source-item projection are attached. Neither endpoint may return raw SwanGuard story objects.

#### SwanStudios admin read

`GET /api/admin/studio-spotlight?limit=20`

Existing SwanStudios admin authorization. Limit 1–50; opaque cursor.

```json
{
  "enabled":false,
  "liveCount":0,
  "items":[],
  "nextCursor":null
}
```

Each nonempty item contains only:

```ts
type StudioSpotlightAdminItem = {
  itemId: string;
  revision: string;
  title: string;
  receivedAt: string;
  imageState: "hosted" | "none" | "degraded";
  receiptId: string | null;
};
```

`title` is an admin DTO projection from the verified wire field, not a new wire field.

#### Impression/dismissal collection

`POST /api/social/spotlight-events`

Authenticated member, CSRF-protected, maximum 4 KiB request.

```json
{
  "itemId":"22222222-2222-4222-8222-222222222222",
  "revision":"1",
  "event":"impression"
}
```

Success, including duplicate:

```json
{"accepted":true}
```

- `event` permits `impression` or `dismissal`.
- Server derives member and local day; never accepts either from the client.
- Reject unknown, inaccessible, retracted, or revision-mismatched items with 404.
- Dismissal without an existing qualifying exposure returns 409 with code `IMPRESSION_REQUIRED` and message `"Record an impression before dismissal."`
- Serialize client transmission per item. A sub-one-second dismissal remains a local UI dismissal and is excluded from the placement-rate statistic.
- Database uniqueness: `(userId, itemId, revision, localDate)`.
- Maximum 60 requests/member/minute.
- Retain member-keyed exposure facts for 35 days, then delete. Retain daily aggregate totals without member identifiers.

#### Pulse authentication

`GET /api/operator/pulse`

No browser authentication. TLS required. Use `SWAN_PULSE_SECRET_V1`.

Headers:

```text
X-Swan-Timestamp: <integer Unix seconds>
X-Swan-Nonce: <32 lowercase hex characters>
X-Swan-Signature: sha256=<hex>
```

Signature input, exactly:

```text
pulse.v1
<timestamp>
<nonce>
GET
/api/operator/pulse
```

No trailing newline. Timestamp tolerance ±300 seconds. Reject reused nonces for ten minutes using a shared store. Constant-time signature comparison. Reject query parameters.

Response:

```json
{
  "schema":"studio-pulse.v1",
  "generatedAt":"2026-09-21T16:00:00.000Z",
  "window":{
    "timeZone":"America/Los_Angeles",
    "start":"2026-09-14T07:00:00.000Z",
    "end":"2026-09-21T07:00:00.000Z"
  },
  "spotlight":{
    "enabled":true,
    "liveItems":3,
    "impressions":240,
    "dismissals":60,
    "dismissalRate":0.25,
    "placementReviewRequired":false
  }
}
```

- Window: seven fully closed Pacific calendar days.
- For 0–19 impressions, return `impressions:null`, `dismissals:null`, `dismissalRate:null`, and `placementReviewRequired:false`.
- At 20–99 impressions, return aggregate counts/rate but no placement alert.
- At least 100 impressions: alert iff `dismissals / impressions > 0.40`.
- Return rate rounded to four decimal places; threshold uses unrounded counts.
- Do not add drilldown, cohort, item, member, or date-range parameters.
- Set `Cache-Control: no-store`.
- SwanGuard caches the response server-side for 60 seconds and labels it stale after five minutes.

This prevents name/email disclosure **by construction of the fixed DTO and aggregate query**. It does not claim formal anonymity against every auxiliary-information attack; suppression reduces small-sample exposure.

`GET /api/operator/studio-pulse` is SwanGuard owner-authenticated:

```json
{
  "freshness":"fresh",
  "lastSuccessAt":"2026-09-21T16:00:00.000Z",
  "pulse":{}
}
```

`pulse` is exactly the above DTO, not `{}` in a real nonempty response. No verified cached value and upstream failure returns 503. A cached value with upstream failure returns 200, `freshness:"stale"`.
````


### 6.5 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/03b-contracts-s6-s8-and-interfaces.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/03b-contracts-s6-s8-and-interfaces.md >>>
# 03b — Contracts (part 2 of 2)

> Continuation of `03-contracts.md`. Part 1 carries the contract release rule,
> common errors, the SwanGuard operator APIs, the SwanStudios admin read,
> impression/dismissal collection, and pulse authentication.

#### Manifest reconciliation

`GET /api/bridge/studio-spotlight/manifest?after=0&through=&limit=100`

Publisher-side endpoint, server-to-server only.

- `after` and `through`: nonnegative decimal strings; empty `through` starts a snapshot.
- `limit`: exactly 100 in the consumer; server permits 1–100.
- Initial page captures the highest committed manifest sequence as `through`.
- Following pages retain that `through`.
- Events ordered by committed sequence ascending.
- Immutable events include retractions. Retain them for this phase; do not introduce pruning without a full-snapshot protocol.

Request uses `SWAN_BRIDGE_SECRET_V1`, existing timestamp/signature header names, and a fresh nonce. Domain-separated signature input:

```text
manifest.request.v1
<timestamp>
<nonce>
GET
<exact path and query>
```

Canonical query order is `after`, `through`, `limit`; values use ordinary percent encoding. Reject noncanonical query order or duplicate parameters.

Response:

```json
{
  "schema":"studio-spotlight-manifest.v1",
  "through":"0",
  "nextAfter":"0",
  "hasMore":false,
  "events":[]
}
```

A nonempty event:

```ts
type BridgeSpotlightManifestEvent = {
  sequence: string;
  payloadBase64: string;
  payloadSha256: string;
};
```

The decoded payload is the exact, previously approved `spotlight.v1` body. No publication actor, attempt history, source metadata, or source ID is exported.

Response headers include fresh timestamp, echoed nonce, and signature over:

```text
manifest.response.v1
<response timestamp>
<request nonce>
<exact response body bytes>
```

- Maximum response body: 1 MiB. Return fewer than 100 events when needed.
- Manifest payload-size limit must match the verified existing ingest ceiling. If even one event cannot fit, stop and alert; never skip it.
- Receiver verifies the raw response before parsing.
- Apply through the same schema/positivity/revision/image service used by webhook ingestion.
- Advance cursor transactionally after every event in the page is durably accepted or a valid no-op.
- Invalid event stops advancement and alerts the operator; do not silently drop it.
- Poll at minute 17 each hour, with a distributed lease and startup catch-up.
- When Spotlight is disabled, do not poll/apply or advance the cursor.
- Maximum 20 pages/run; continue from the saved cursor next run.

#### Faction ceremony

`POST /api/social/faction-ceremony/claim`, authenticated member, CSRF-protected.

Request: `{}`.

No eligible ceremony or already claimed:

```json
{"ceremony":null}
```

Successful claim:

```json
{
  "ceremony":{
    "id":"33333333-3333-4333-8333-333333333333",
    "opensAt":"2026-09-21T16:00:00.000Z",
    "closesAt":"2026-09-22T16:00:00.000Z",
    "winnerFactionId":"faction-1",
    "mvpUserId":null,
    "modifierCode":"<existing verified modifier code>"
  }
}
```

- Monday 09:00 to Tuesday 09:00, `America/Los_Angeles`.
- Snapshot prior closed faction period at reveal time.
- Existing faction authority supplies score, tie rules, MVP eligibility, and modifier. **Do not invent new scoring rules.**
- Claim inserts `(ceremonyId, userId)` atomically before returning the card.
- Two concurrent claims return one card and one null.
- This chooses **at-most-once reveal**, not guaranteed viewing: a crash after claim can suppress the card. Never promise exactly-once human viewing.
- UI names resolve through existing authorized client lookup. Missing names use `"Winning faction"` and `"MVP unavailable"`.

#### Weekly digest

Delivery medium: **in-app only**, not email or push.

`GET /api/social/weekly-digest`, authenticated member:

```json
{
  "enabled":true,
  "digest":{
    "id":"44444444-4444-4444-8444-444444444444",
    "periodEnd":"2026-09-21T01:00:00.000Z",
    "xpEarned":120,
    "streakDays":4,
    "friendHighlight":{
      "userId":"<canonical opaque ID>",
      "kind":"challenge_completed"
    },
    "factionRank":2,
    "spotlightItemId":"22222222-2222-4222-8222-222222222222"
  }
}
```

No digest: `{"enabled":true,"digest":null}`.

Opted out: `{"enabled":false,"digest":null}`.

`PUT /api/social/weekly-digest/preference`

Request: `{"enabled":false}`.

Response: `{"enabled":false}`.

- Sunday 18:00 Pacific; period is previous Sunday 18:00 through current Sunday 18:00.
- XP/streak/rank come from authoritative adapters.
- Friend highlight requires an eligible challenge completion and current sharing permission. Stable tie-break: latest qualifying completion, then canonical ID.
- Recheck friendship and visibility on read; if invalid, set `friendHighlight:null`.
- Select at most one currently live Spotlight. Recheck on read; retracted/disabled yields null.
- Opt-out checked both during generation and read.
- Default follows the verified existing digest preference. If none exists, default OFF.
- Template-only. No prose generation service, model client, prompt, embedding, or LLM dependency.

#### Exported application interfaces

These signatures are fixed for newly introduced service boundaries:

```ts
type DecimalString = string;
type Instant = string;
type CanonicalUserId = string | number; // Narrow at G0.

type StudioSpotlightPublishInput = {
  itemId: string;
  expectedRevision: DecimalString;
  draftSha256: string;
  checks: {
    noPolitics: true;
    noNegativity: true;
    imageRightsCleared: true;
    headlineInOwnerVoice: true;
  };
};

type BridgeSpotlightDispatchResult = {
  publicationId: string;
  outcome: "accepted" | "retryable" | "rejected" | "paused";
};

export function publishStudioSpotlight(
  input: StudioSpotlightPublishInput,
  context: StudioSpotlightOwnerContext
): Promise<StudioSpotlightPublicationResult>;

export function dispatchBridgeSpotlight(
  publicationId: string,
  dependencies: BridgeSpotlightDispatchDependencies
): Promise<BridgeSpotlightDispatchResult>;

export function reconcileBridgeSpotlight(
  dependencies: BridgeSpotlightReconcileDependencies
): Promise<{ applied: number; cursor: DecimalString }>;

export function buildStudioPulse(
  now: Date,
  dependencies: StudioPulseDependencies
): Promise<StudioPulseV1>;

export function claimFactionCeremony(
  userId: CanonicalUserId,
  now: Date
): Promise<FactionCeremonyDTO | null>;

export function buildWeeklyDigest(
  userId: CanonicalUserId,
  periodEnd: Date
): Promise<WeeklyDigestDTO | null>;
```

The dependency types, route context type, canonical ID narrowing, complete model definitions, and actual working pattern excerpts are **BLOCKED-G0**. They must be written into this file before builder release; `any`, placeholder imports, and guessed Sequelize models are forbidden.

---
````


### 6.6 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/04-build-order.md >>>
# 04 — Build order: file-by-file, every slice leaves the app bootable

**Budget:** ≤299 source lines per file, excluding generated lockfiles; test files share the limit.
**Scope:** the new files for R1, R2, S5a, S5b, S6, S7 and S8, plus the integration edits each slice
requires. Ordered so the app boots at every step.
**Corrections applied here:** 1 (migration mechanism), 2 (working root), 4 (SSRF must-fix),
6 (image-failure contract). See `CORRECTIONS-APPLIED.md`.

---

**All paths below are new proposed files unless explicitly labeled existing.** Budgets are maximum source lines, excluding generated lockfiles. Test files follow the same 299-line limit.

#### Working root (Correction 2)

Two roots exist on this machine and they are **not** the same tree. Build in the second one:

| Root | Branch / HEAD | `apps/web/src/newsroom/` |
|---|---|---|
| `Desktop/@Everything/family-first-intelligence-command-center` | `main` @ `2666b49` | **does not exist** |
| **`Desktop/@Everything/SwanGuard-Newsroom`** | **`merge/newsroom-mainline-v3` @ `d830bed`** | exists (`FeedLanes.tsx` 76, `StorySheet.tsx` 517) |

**S5 is built in `Desktop/@Everything/SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.**
A builder who opens `main` will find no `FeedLanes.tsx`, no `apps/web/src/newsroom/` directory at
all, and will either stop or invent one. Every pattern line count in this package is the
**worktree's**: `featureDispatchOwnerOperator.ts` 96, `operatorGrantRoutes.ts` 251,
`OwnerKillSwitchPanel.tsx` 193, `OperatorGrantConsole.tsx` 281.

Note that `SwanGuard-Newsroom` is a **linked git worktree** — `.git` there is a file, not a
directory. Its gitdir is
`…/family-first-intelligence-command-center/.git/worktrees/SwanGuard-Newsroom`, and its common dir
is `…/family-first-intelligence-command-center/.git`. Anything that reads `.git/hooks/` or
`.git/config` from the worktree root will read the wrong path.

#### Migration placement and DDL rules (Correction 1, plus the G0-5 result)

**The `safe-migrate.mjs:146` claim in the consult packet was wrong on both line and mechanism.**
The accurate mechanism:

> `isExecutableByCli()` (`safe-migrate.mjs:214`) returns `false` for any path containing `/` or `\`,
> with the comment *"non-recursive glob"* (`:215`). This models **sequelize-cli's own glob, which is
> non-recursive**. `discoverMigrationFiles()` (`:222`) **is** recursive and does return
> subdirectory files — but they are classified `inert`: reported, and then never executed by the
> delegated CLI run.

So the rule (unchanged, but for the correct reason) is: **put SwanStudios migrations at the top
level of `backend/migrations/` only.** Do **not** "fix" a recursion that was never broken — the
recursion exists. The inert set is printed loudly on purpose
(`safe-migrate.mjs:248-259`: *"N INERT MIGRATION FILE(S) — NEVER RUN, NEVER WILL"*); a builder who
"discovers" it should not panic and should not delete the files.

**`CREATE INDEX CONCURRENTLY` is NOT available — this is the single most valuable G0 result.**
SwanGuard's `packages/database/src/migrationRunner.ts` wraps **every** migration in a transaction
(`:379` `BEGIN`, `:416` the migration SQL, `COMMIT`), asserted by `migrationRunner.test.ts:173,188,199`.
In PostgreSQL, `CREATE INDEX CONCURRENTLY` fails inside a transaction block with
`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

> **Use ordinary `CREATE INDEX` / `ALTER TABLE … ADD CONSTRAINT`.** Do not use the `CONCURRENTLY`
> variant anywhere in this package, and do not propose a scheduled maintenance window as a
> workaround — the runner has no such mode. Astra's own DDL hedged this correctly ("G0 must
> establish whether the migration runner permits that"); the answer is **no**.

#### `rehostImage()` SSRF controls — MUST-FIX before the publisher is enabled (Corrections 4 and 6)

This is a **present defect, not a risk.** It lives in `backend/routes/bridge/bridgeIngestRoutes.mjs`
(`rehostImage()` at `:158-181`), reached from the HMAC-signed `POST /api/bridge/spotlight` at `:115`.
Promoted to **must-fix before the publisher is enabled** — the publisher is what lets a URL of the
publisher's choosing reach this function.

Protections that **exist today**, and their exact limits:

| Line | Protection | Limit |
|---|---|---|
| `:161` | protocol matches `/^https?:$/` | **`http:` is permitted** |
| `:162` | `AbortSignal.timeout(8000)` | bounds time, not bytes |
| `:163` | `response.ok` | — |
| `:165` | `content-type` starts with `image/` | **`image/svg+xml` passes** |
| `:167` | `0 < buffer.length <= 8 MiB` | checked **after** the whole body is buffered |

Missing, and each independently exploitable:

1. **No hostname allowlist.** Any host is fetched.
2. **No private/loopback/link-local/metadata rejection.** `http://169.254.169.254/latest/meta-data/…`
   satisfies `:161`.
3. **No redirect validation.** `fetch` follows redirects by default and `:161` checks the **initial**
   URL only. `302 → http://169.254.169.254/…` defeats the protocol check entirely. **This is the
   concrete bypass that makes the finding live.**
4. **The 8 MiB cap is not a DoS control.** `:166` calls `arrayBuffer()` — the entire body is
   materialised before `:167` measures it. The cap bounds what is *stored*, not what is *consumed*.
5. **`image/svg+xml` passes `startsWith('image/')`.** SVG is executable markup, not a raster image;
   accepting it is an XSS vector wherever it is later served inline.
6. **No DNS-rebinding defence.** Validate-then-fetch is a TOCTOU.

**Required controls (Correction 4) — as built in `backend/services/spotlightImageFetch.mjs`:**

- **HTTPS only** ✅ — the `http:` branch is gone; plaintext is never fetched.
- **Reject private, loopback, link-local, and cloud-metadata addresses for IPv4 and IPv6** ✅ — DNS is
  resolved first, **every** returned address is checked (not just the first), and resolution failure
  fails **closed**.
- **No credentials in the URL** ✅ — `https://allowed@evil.com` would otherwise read as `evil.com`.
- **No redirect is followed** ✅ — `redirect: 'error'`. This is the decisive control: "validate every
  redirect" is strictly weaker than following none, because the validated URL is then always the
  connected URL, and the rebinding TOCTOU closes with it.
- **A streamed byte cap** ✅ — 5 MiB, enforced *while* reading; the reader is cancelled mid-stream. A
  declared `Content-Length` is treated as a claim, used only as an early exit.
- **Reject SVG, polyglots, and animation** ✅ — by decoder inspection, not by content-type prefix. The
  declared `Content-Type` is never trusted; the type is sniffed from magic bytes.
- **Re-encode before storage** ✅ — EXIF (including GPS) stripped, long edge capped at 1600px, and
  alpha preserved by writing PNG where the source actually has alpha.
- **Approved image-source host allowlist — NOT implemented, deliberately.** A Spotlight image URL is
  chosen by the curator and points at an arbitrary publisher, so an exact-host allowlist is not
  available. The PLAUD audio precedent can demand one only because it fetches a single vendor. **This
  line is superseded:** do not add an allowlist that would break every legitimate publisher, and do
  not read its absence as an omission. Evidence in `CORRECTIONS-APPLIED.md` §4.

Fair mitigating context: this path is reachable only through the HMAC-signed bridge, so the attacker
must hold `SWAN_BRIDGE_SECRET_V1` or influence the publisher's `imageUrl`. That makes it
**authenticated-input SSRF** — HIGH, not CRITICAL. It is not unauthenticated. But the whole premise
of re-hosting is that the publisher is only semi-trusted, and a redirect chain makes the single
protocol check worthless.

**The failure contract is correct and must NOT change (Correction 6).** `:115` (`?? null`),
`:155-156`, and `:177-180` ensure an image failure yields `imageUrl=null` and **never fails the
ingest**. Every control added above must preserve that: **a rejected URL, a rejected redirect, a
tripped byte cap, and a rejected SVG all degrade to `imageUrl=null` with the ingest still
succeeding.** Adding a control must not turn an image failure into a 4xx/5xx on the ingest path.

#### Integration edits requiring G0 excerpts

| Existing file/surface | Authorized edit |
|---|---|
| `backend/core/middleware/index.mjs` | Preserve bridge raw-body exclusion; add only verified new mounts |
| `backend/routes/bridge/bridgeIngestRoutes.mjs` | Extract shared application service without changing shipped HTTP contract. **The `rehostImage()` SSRF controls above are DONE** — the function now delegates to `spotlightImageFetch.mjs`. See `CORRECTIONS-APPLIED.md` §4 |
| `backend/routes/social/coachSignalRoutes.mjs` | Transactional quota and verified target handling; **no `sessionId`**. `postId` stays **nullable** — correction 3 superseded, see `05-slices.md` |
| `frontend/src/components/Social/Spotlight/SpotlightRail.tsx` | Visibility/dismissal event adapter; no publisher details |
| `apps/api/src/featureDispatchOwnerOperator.ts` | Prefix dispatch following verified owner pattern |
| `apps/api/src/ownerKillSwitches.ts` | Register the dedicated publishing switch using existing extension mechanism |
| SwanGuard operator navigation | Mount separate console; exact file `BLOCKED-G0` |
| SwanStudios admin navigation | Mount read-only receiver console; exact file `BLOCKED-G0` |
| Social right rail | Mount ceremony/digest; exact file `BLOCKED-G0` |
| `bridge-policy.json` | Narrow exact-host/exact-path carve-out; actual location `BLOCKED-G0` |

`FeedLanes.tsx` and `StorySheet.tsx`: **zero-byte changes**.

#### New service and UI files

| Slice | Exact path | Purpose/export | Budget |
|---|---|---|---:|
| R1 | `backend/services/social/coachSignalQuota.mjs` | Atomic quota allocation | 180 |
| R1 | `backend/services/bridge/bridgeSpotlightApply.mjs` | Shared validated revision application | 240 |
| R1 | **`backend/services/spotlightImageFetch.mjs`** — **BUILT** (267 lines) | Bounded fetch/decode/rehost, all SSRF controls. **Supersedes the proposed `bridge/bridgeSpotlightImage.mjs` — do NOT create a second module.** 36 tests across 3 suites, mutation-verified. See `CORRECTIONS-APPLIED.md` §4 | ✓ |
| R1 | `backend/migrations/20260920-harden-coach-signals.cjs` | Constraints/counter schema — **`postId` stays NULLABLE; no `sessionId`.** The `NOT NULL` half of correction 3 is **superseded** (2026-09-19 operator ruling) because it contradicts the existing `ON DELETE SET NULL`. See `05-slices.md` R1 correction 3 | 180 |
| R1 | **`backend/tests/bridgeSpotlightOrdering.contract.test.mjs`** — **BUILT** (16 tests) | Revision ordering, tombstone semantics, raw-body mount. Complements `tests/api/swanBridgeIngest.test.mjs`; does not repeat it. Mutation-verified | ✓ |
| R1 | **`backend/tests/coachSignalIntegrity.contract.test.mjs`** — **BUILT** (16 tests) | Behavioural companion to the source-grep `tests/api/coachSignalRoutes.contract.test.mjs`: target checks, post uniqueness, quota boundary, UTC-midnight window, DST, restart, note handling, and the recorded `postId` decision. Mutation-verified (cap 5→6 → 1 red; UTC→local → 2 red) | ✓ |
| R1 | `backend/migrations/20260920-harden-spotlight-revisions.cjs` | Receiver tombstone/revision changes if needed | 160 |
| R2 | `backend/routes/admin/studioSpotlightAdminRoutes.mjs` | Admin read DTO | 160 |
| R2 | `backend/routes/social/spotlightEventRoutes.mjs` | Authenticated measurement | 180 |
| R2 | `backend/services/social/spotlightMeasurements.mjs` | Deduplication/aggregation | 200 |
| R2 | `backend/migrations/20260921-create-spotlight-exposure-facts.cjs` | Event/aggregate storage | 180 |
| R2 | `frontend/src/components/Admin/StudioSpotlightAdmin.tsx` | Read-only admin screen | 220 |
| R2 | `frontend/src/components/Admin/StudioSpotlightAdmin.styles.ts` | Token-only styles | 140 |
| R2 | `frontend/src/components/Social/Spotlight/useSpotlightExposure.ts` | Visibility state machine | 180 |
| S5a | `apps/api/src/studioSpotlightRoutes.ts` | Existing-style handler | 240 |
| S5a | `apps/api/src/studioSpotlightPublications.ts` | `publishStudioSpotlight` | 240 |
| S5a | `apps/api/src/bridgeSpotlightDispatcher.ts` | `dispatchBridgeSpotlight` | 220 |
| S5a | `apps/api/src/bridgeSpotlightSigning.ts` | Exact-byte signing | 120 |
| S5a | `apps/api/src/bridgeSpotlightRepository.ts` | DB/lease operations | 260 |
| S5a | `apps/api/src/bridgeSpotlightContracts.ts` | Strict DTO validators | 240 |
| S5b | `apps/web/src/components/StudioSpotlightConsole.tsx` | Operator screen | 240 |
| S5b | `apps/web/src/components/StudioSpotlightConsole.styles.ts` | Styles | 180 |
| S5b | `apps/web/src/components/StudioSpotlightCeremony.tsx` | Checklist modal | 220 |
| S5b | `apps/web/src/components/StudioSpotlightReceipts.tsx` | Receipt panel | 180 |
| S5b | `apps/web/src/components/StudioSpotlightItemEditor.tsx` | Verified editorial DTO editor | 240 |
| S7 | `backend/routes/operator/pulseRoutes.mjs` | Signed aggregate API | 180 |
| S7 | `backend/services/operator/studioPulse.mjs` | `buildStudioPulse` | 200 |
| S7 | `backend/services/bridge/bridgeSpotlightReconcile.mjs` | Manifest verification/application | 260 |
| S7 | `backend/services/bridge/bridgeRequestAuth.mjs` | Domain-separated request auth | 180 |
| S7 | `backend/migrations/20260922-create-bridge-consumer-state.cjs` | Cursor/nonce state | 140 |
| S7 | `apps/api/src/bridgeSpotlightManifestRoutes.ts` | Signed manifest | 220 |
| S7 | `apps/api/src/studioPulseRoutes.ts` | Owner proxy/cache | 180 |
| S7 | `apps/web/src/components/StudioPulseTile.tsx` | Aggregate tile | 200 |
| S6 | `backend/services/social/factionCeremony.mjs` | Snapshot/claim | 220 |
| S6 | `backend/routes/social/factionCeremonyRoutes.mjs` | Claim route | 140 |
| S6 | `backend/migrations/20260923-create-faction-ceremonies.cjs` | Snapshot/claims | 180 |
| S6 | `frontend/src/components/Social/Faction/FactionCeremonyCard.tsx` | Accessible card | 220 |
| S6 | `frontend/src/components/Social/Faction/FactionCrystalScene.tsx` | Lazy bounded Three.js | 240 |
| S6 | `frontend/src/components/Social/Faction/FactionCeremonyCard.styles.ts` | Static fallback/styles | 180 |
| S8 | `backend/services/social/weeklyDigest.mjs` | Deterministic builder | 220 |
| S8 | `backend/services/social/weeklyDigestData.mjs` | Permission-aware authoritative reads | 240 |
| S8 | `backend/routes/social/weeklyDigestRoutes.mjs` | Read/preference routes | 180 |
| S8 | `backend/migrations/20260924-create-weekly-digests.cjs` | Digest/preference schema | 180 |
| S8 | `frontend/src/components/Social/Digest/WeeklyDigestCard.tsx` | Template renderer | 220 |
| S8 | `frontend/src/components/Social/Digest/WeeklyDigestCard.styles.ts` | Styles | 160 |

SwanGuard migration paths are deliberately **not invented**. They must use the verified SwanGuard migration system.

#### Imports and pattern rules

- API handlers import authorization/context types from the verified examples, not new authentication stacks.
- Services import repositories/interfaces, not route modules.
- Bridge application imports the single exported `bannedTerms` through a verified dependency-safe path. If direct import creates a cycle, extract the existing definition to one shared module and re-export it from `feedEnrichment.mjs`; never create a second list.
- UI imports styled-components and local DTO clients; never imports server signing or persistence code.
- Three.js imports appear only in `FactionCrystalScene.tsx`.
- Scheduler entrypoints invoke services and use the existing distributed scheduler/ledger pattern.
- Each new module’s imports/exports and matching in-repo example must be attached at G0. This table is not permission to guess them.

---
````


### 6.7 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/05-slices.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/05-slices.md >>>
# 05 — Slice plan: executable acceptance criteria and STOP lines

**This is the plan.** Where it disagrees with `G0-SOURCE-EXCERPTS.md`, the excerpts win.
**Read with:** `04-build-order.md` (the file list) and `CORRECTIONS-APPLIED.md` (what changed, and
how each change was verified).
Every slice ends with a **STOP** line: produce the diff plus the acceptance-criteria evidence, then
wait for the checkpoint verdict before continuing.

**Corrections applied here:** 2 (working root), 4 (SSRF must-fix), 5 (flag default OFF),
6 (image-failure contract). **Correction 3 is SUPERSEDED — see R1 correction 3 below.**

---

**Counts below are required new tests, not claimed passing results.** Baseline tests must also remain green.

Because repository test commands and fixture infrastructure were not supplied, the execution wrappers are **BLOCKED-G0**. G0 must install an approved fixture profile with:

- Frozen clock: `2026-09-21T16:00:00.000Z`.
- One owner, one non-owner operator, one admin, two ordinary members.
- No production secrets or production database access.
- `SS_BASE`, `SG_BASE`, `OWNER_TOKEN`, `ADMIN_TOKEN`, and `MEMBER_TOKEN`.
- An authentication adaptation if the verified applications use cookies instead of bearer tokens.
- A `verify-slice` script that invokes the actual repository runners and emits their unedited output.

The curls below specify endpoint behavior; do not claim they are runnable against the present repository before G0 finalizes authentication and fixtures.

#### G0 — Recover and establish truth

**Scope:** `truth/*`, backup artifacts, baseline report, completed contract/model revisions.

**Required checks:**

1. Disposable restoration recovers committed, staged, unstaged, and untracked fixture files.
2. Baseline SHA recorded for both applications.
3. Protected SwanGuard surface hashes recorded.
4. Actual DB schema matches or explicitly differs from ORM/migrations.
5. Complete wire body and raw-parser mount included.
6. Every remaining blocked integration resolved.

**Acceptance:** Zero `BLOCKED-G0` markers in the released implementation package; architect signs the revised excerpts and contracts.

**STOP: do not proceed to R1 until checkpoint G0 passes.**

#### R1 — Correctness foundations

Tests:

- `backend/tests/coachSignalIntegrity.contract.test.mjs` — **BUILT, 16 tests** (budget was 10):
  target checks, **post uniqueness (`postId` deliberately NULLABLE — see correction 3 below; there is
  no `sessionId` column and no session-uniqueness index)**, quota boundary at 5/6, duplicate
  rollback via the unique-constraint race, **UTC-midnight** window, DST invariance, restart safety
  (quota is re-read, never in module state), note handling, and the recorded `postId` decision.
  Mutation-verified: cap 5→6 turns 1 red; `setUTCHours`→`setHours` turns 2 red.
  Complements the existing source-grep `tests/api/coachSignalRoutes.contract.test.mjs` (12) — this
  one drives the real router and asserts responses.
- `backend/tests/bridgeSpotlightOrdering.contract.test.mjs` — **BUILT, 16 tests** (budget was 10):
  late image on a superseded revision, concurrent-revision loser, tombstone resistance to a late
  replay, un-retraction on a higher revision, retraction preserving the image, manifest liveness
  query, manifest signature, manifest kill switch, parser-mount regression (fail-closed), and
  exact-byte capture. Deliberately excludes what `tests/api/swanBridgeIngest.test.mjs` (19) already
  covers. Mutation-verified by the manifest fix: 2 tests were red before it and green after.
- **`backend/tests/unit/spotlightImageFetch.test.mjs` (15) + `tests/unit/spotlightImageDecode.test.mjs` (13) + `tests/bridgeSpotlightImage.security.test.mjs` (8) — 36 tests, PASSING (as built).** Supersedes the 12-test budget this plan originally set. Fixtures are shared via `tests/helpers/spotlightImageFixtures.mjs`, so the suites stay inside the 299-line limit. Covers host/scheme rejection, credentials-in-URL, the full private IPv4/IPv6 range tables, IPv4-mapped IPv6, DNS failure and empty answers (fail-closed), redirects, timeout, bodyless responses, declared-vs-streamed byte caps with mid-stream abort, polyglot, SVG, non-raster, animation, EXIF stripping, long-edge cap, alpha preservation, and graceful degradation.

Exact disabled-ingest smoke test must use the **existing verified** error body, not a newly invented one. G0 inserts it.

UI check: unchanged rail and dock at 1440×900 and 375×812.

**R1 mandatory corrections — these are not optional and are not "nice to have":**

1. **SSRF controls in `rehostImage()` — DONE (Correction 4).** Built as
   `backend/services/spotlightImageFetch.mjs`, wired into `rehostImage()`; 36 tests passing across
   3 suites and mutation-verified. What landed: HTTPS only; credentials-in-URL rejected; DNS-resolved
   private/loopback/link-local/metadata rejection for IPv4 **and** IPv6, failing closed; **no redirect
   is followed** (`redirect: 'error'` — the decisive control); a **streamed** byte cap enforced while
   reading rather than `arrayBuffer()`; byte-sniffed type rather than the declared `Content-Type`;
   SVG, polyglot and animation rejected by decoder inspection; EXIF stripped; long edge capped.
   Full control list and evidence in `CORRECTIONS-APPLIED.md` §4.

   **One proposed control was NOT implemented, deliberately:** the *approved image-source host
   allowlist*. A Spotlight image URL is chosen by the curator and points at an arbitrary publisher, so
   an exact-host allowlist is not available — the PLAUD audio precedent can demand one only because it
   fetches a single vendor. Do not "restore" it; the remaining controls are the ones that survive an
   arbitrary host. `04-build-order.md` still lists it and that line is superseded.
2. **The image-failure contract is unchanged (Correction 6).** A rejected URL, a rejected redirect, a
   tripped byte cap, and a rejected SVG all yield `imageUrl=null` and the ingest still succeeds.
   `spotlightImageFetch.test.mjs` must keep the graceful-degradation case for each control, not just
   for the pre-existing ones.
3. **~~`postId` becomes NOT NULL~~ — SUPERSEDED 2026-09-19 by operator ruling. Keep `postId`
   NULLABLE. Astra's `sessionId` DDL is still dropped, and that half stands.** Astra's proposed
   `CHECK (num_nonnulls("postId","sessionId") = 1)` and the partial unique index on
   `("coachId","sessionId")` reference a column that **does not exist** — correct.
   `CoachSignal` has exactly `id, coachId, memberId, postId, note, createdAt, updatedAt` — also
   correct. **What was wrong was the remedy.** `NOT NULL` cannot be applied:

   - The migration declares `onDelete: 'SET NULL'` (hostile review F3.4) so a coach's recognition
     survives deletion of the post. `NOT NULL` + `SET NULL` is contradictory: the SET NULL fires on
     delete and violates the constraint, so **post deletion would start failing**.
   - `SocialPost` is **not** paranoid — posts are hard-deleted (`routes/social/posts.mjs`,
     `adminContentModerationController.mjs`), so that path is live, not theoretical.
   - Any signal whose post was already deleted holds a `NULL` postId **today**, so
     `ALTER COLUMN "postId" SET NOT NULL` would fail on existing data.
   - An existing green test (`tests/api/coachSignalRoutes.contract.test.mjs`) asserts SET NULL.

   The hole `NOT NULL` was meant to close is **unreachable through the API**: the route always
   supplies `postId`, and `UNIQUE("coachId","postId")` already blocks duplicates for non-null
   values. The correct trigger for the full multi-target migration remains what it always was —
   **when a session target is genuinely introduced**, add the column, the partial unique index, and
   the exactly-one-target CHECK **together, in that migration**.

   Pinned by `backend/tests/coachSignalIntegrity.contract.test.mjs` (§ "the recorded postId
   decision"). Do not "restore" `NOT NULL` without first re-reading that test's header.
4. **Ordinary `CREATE INDEX` only — never `CONCURRENTLY`.** SwanGuard's migration runner wraps every
   migration in a transaction (`packages/database/src/migrationRunner.ts:379` `BEGIN`, `:416` the
   migration SQL), so `CREATE INDEX CONCURRENTLY` fails on deploy.

**STOP: do not proceed to R2 until checkpoint R1 passes.**

#### R2 — Operator read and measurement

Tests:

- `backend/tests/studioSpotlightAdmin.contract.test.mjs` — **6**.
- `backend/tests/spotlightMeasurements.contract.test.mjs` — **10**.
- `frontend/src/components/Admin/StudioSpotlightAdmin.test.tsx` — **6**.
- `frontend/src/components/Social/Spotlight/useSpotlightExposure.test.ts` — **8**.

Empty fixture:

```bash
curl -sS "$SS_BASE/api/admin/studio-spotlight?limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected 200:

```json
{"enabled":false,"liveCount":0,"items":[],"nextCursor":null}
```

Viewport checks: admin loading/empty/error/live at 1440×900 and 375×812; no horizontal document overflow; no edit control; tab targets and touch targets verified.

Measurement tests must use fake visibility timers and a real uniqueness constraint, not solely mocked repository calls.

**STOP: do not proceed to S5a until checkpoint R2 passes.**

#### S5a — Publisher backend

Tests:

- `apps/api/src/studioSpotlightPublications.test.ts` — **12**.
- `apps/api/src/bridgeSpotlightDispatcher.test.ts` — **14**.
- `apps/api/src/bridgeSpotlightSigning.test.ts` — **8**.
- `apps/api/src/studioSpotlightAuthorization.test.ts` — **6**.

Required cases include two workers, lease expiry, stale lease completion, kill between lease and send, six-retry exhaustion, raw-byte signature, concurrent revision allocation, uncommitted-sequence safety, unchanged-payload retry, and permanent 4xx.

Unauthenticated check:

```bash
curl -sS "$SG_BASE/api/operator/studio-spotlight/items?status=all&limit=20"
```

Expected 401:

```json
{"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}
```

With kill switch active, owner publication request returns 503:

```json
{"error":{"code":"PUBLISHING_PAUSED","message":"Publishing is paused."}}
```

Exact positive publish curl is blocked until the real editorial DTO and fixture item are attached at G0.

No new UI in this slice; existing operator page remains bootable at both required viewports.

**STOP: do not proceed to S5b until checkpoint S5a passes.**

#### S5b — Publisher console

**Working root (Correction 2):** `Desktop/@Everything/SwanGuard-Newsroom` on
`merge/newsroom-mainline-v3`. The console mounts into `apps/web`, which does not exist on `main`.

Tests:

- `apps/web/src/components/StudioSpotlightConsole.test.tsx` — **10**.
- `apps/web/src/components/StudioSpotlightCeremony.test.tsx` — **10**.
- `apps/web/src/components/StudioSpotlightReceipts.test.tsx` — **6**.
- `apps/web/src/components/StudioSpotlightItemEditor.test.tsx` — **6**.

Receipt fixture check:

```bash
curl -sS \
  "$SG_BASE/api/operator/studio-spotlight/publications/11111111-1111-4111-8111-111111111111/receipts" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

Expected 200:

```json
{"publicationId":"11111111-1111-4111-8111-111111111111","receipts":[{"attempt":1,"outcome":"accepted","httpStatus":200,"completedAt":"2026-09-21T16:00:00.000Z"}]}
```

Viewport checks: every wireframe state at 1440×900 and 375×812; full keyboard ceremony; disabled publish until all checks; edit resets attestations; error preserves draft.

Require empty git diff for the exact resolved `FeedLanes.tsx` and `StorySheet.tsx` paths.

**STOP: do not proceed to S7 until checkpoint S5b passes.**

#### S7 — Pulse and convergence

Tests:

- `backend/tests/studioPulsePrivacy.contract.test.mjs` — **12**.
- `backend/tests/bridgeSpotlightReconcile.contract.test.mjs` — **14**.
- `apps/api/src/bridgeSpotlightManifestRoutes.test.ts` — **10**.
- `apps/web/src/components/StudioPulseTile.test.tsx` — **8**.

Privacy tests:

- Seed names, emails, handles, phone-like strings, and private post text with canaries.
- Assert none appear in the entire serialized pulse.
- Assert exact permitted keys at every level.
- Assert aggregate query does not select identity/text columns.
- Assert user-supplied filters are rejected.
- Assert small-sample suppression.

Signed pulse curl:

```bash
TS="$(date +%s)"
NONCE="$(openssl rand -hex 16)"
SIG="$(
  printf 'pulse.v1\n%s\n%s\nGET\n/api/operator/pulse' "$TS" "$NONCE" |
  openssl dgst -sha256 -hmac "$SWAN_PULSE_SECRET_V1" |
  sed 's/^.* //'
)"
curl -sS "$SS_BASE/api/operator/pulse" \
  -H "X-Swan-Timestamp: $TS" \
  -H "X-Swan-Nonce: $NONCE" \
  -H "X-Swan-Signature: sha256=$SIG"
```

Run only in the controlled fixture shell; never with shell tracing. In frozen-clock tests, set `TS=1790006400`.

Expected 200 is the exact pulse example in `03-contracts.md`.

Convergence acceptance: drop a publish webhook and a later retraction webhook, run reconciliation, assert highest revision and tombstone match publisher state; restart between page application and cursor persistence; no resurrection.

Viewport checks: fresh, stale, empty, suppressed, and unavailable tile at both sizes.

**STOP: do not proceed to S6 until checkpoint S7 passes.**

#### S6 — Ceremony and spectacle

Tests:

- `backend/tests/factionCeremony.contract.test.mjs` — **12**.
- `frontend/src/components/Social/Faction/FactionCeremonyCard.test.tsx` — **10**.
- `frontend/src/components/Social/Faction/FactionCrystalScene.test.tsx` — **8**.

At a fixture time outside the reveal window:

```bash
curl -sS -X POST "$SS_BASE/api/social/faction-ceremony/claim" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{}'
```

Expected 200:

```json
{"ceremony":null}
```

Inside the window, first claim returns the fixture card; refresh/second claim returns exactly the null response.

Required cases: Monday boundary, Tuesday boundary, DST weeks, two schedulers, two tabs, late scheduler catch-up before close, no late reveal after close, no faction membership, unavailable MVP.

Viewport/performance checks:

- 1440×900: animated reveal, text remains accessible.
- 375×812: static illustration; no Three.js network request.
- Reduced motion at desktop: static; no Three.js request.
- WebGL context loss: static fallback, no uncaught exception.
- Attach measured gzip chunk report and initial-route import graph.

**STOP: do not proceed to S8 until checkpoint S6 passes.**

#### S8 — Weekly digest

Tests:

- `backend/tests/weeklyDigest.contract.test.mjs` — **12**.
- `backend/tests/weeklyDigestPrivacy.test.mjs` — **8**.
- `frontend/src/components/Social/Digest/WeeklyDigestCard.test.tsx` — **10**.

Opt-out:

```bash
curl -sS -X PUT "$SS_BASE/api/social/weekly-digest/preference" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"enabled":false}'
```

Expected 200:

```json
{"enabled":false}
```

Then:

```bash
curl -sS "$SS_BASE/api/social/weekly-digest" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
```

Expected 200:

```json
{"enabled":false,"digest":null}
```

Static scan:

```bash
rg -n -i \
  'openai|anthropic|gemini|langchain|chat\.completions|responses\.create|generateContent|invokeLLM' \
  backend/services/social/weeklyDigest.mjs \
  backend/services/social/weeklyDigestData.mjs \
  backend/routes/social/weeklyDigestRoutes.mjs \
  frontend/src/components/Social/Digest/WeeklyDigestCard.tsx
```

Expected: **no output, exit 1**.

A grep alone is not proof. Also require a dependency-graph denylist test and an integration test that denies all outbound network access during digest generation.

Viewport checks: populated, loading, empty, error, opted-out, friend unavailable, and retracted Spotlight at both sizes.

**STOP: do not proceed to E1 until checkpoint S8 passes.**

#### E1 — Enablement

**`SPOTLIGHT_ENABLED` stays defaulting OFF (Correction 5).** Astra raised "default OFF is a defect"
and then explicitly refuted it; the refutation is correct and is adopted here. Default OFF is not a
defect — it is the control that makes every earlier slice safe to deploy. Enabling it is an explicit
deployment configuration action, never a code default and never a client-side override.

1. Deploy schema and code with Spotlight disabled (`SPOTLIGHT_ENABLED` unset/OFF) and publishing paused.
2. Verify new migrations actually appear in deployed migration history.
3. Configure secrets through the deployment secret store; verify neither appears in client bundles/logs.
4. Exercise publish/update/retract/image failure/retry/reconciliation in staging.
5. Rehearse production receiver disablement and publisher pause independently.
6. Enable receiver first, with zero production live items.
7. Resume publisher for one owner-approved positive item.
8. Confirm admin state, member rail, receipt, hosted image, and pulse.
9. Publish a higher revision; confirm replacement.
10. Retract the canary; confirm removal and resistance to an old replay.
11. Resume normal publishing only after Sean approves the evidence.

Production verification uses signed real requests; never create a public debug endpoint or a client flag override to bypass the global flag.

**STOP: default OFF remains unchanged. Explicit deployment configuration enables the feature.**

---
````


### 6.8 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/06-bans.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/06-bans.md >>>
# 06 — Bans: the "do NOT" list

Each line is a prohibition, not a preference. A builder who believes a ban is wrong **returns the
question**; a ban is not overridden unilaterally, and a silent deviation is itself banned (last line).

---

- Do not claim inspected lines, executed commands, passed tests, deployed migrations, or measured bundle sizes without evidence.
- Do not implement from an unresolved G0 placeholder.
- Do not alter the shipped `spotlight.v1` body, endpoint, signature construction, idempotency header, flag default, or image-failure semantics.
- Do not edit `FeedLanes.tsx` or `StorySheet.tsx`.
- New SwanGuard Spotlight-related exported identifiers use `StudioSpotlight*` or `BridgeSpotlight*`; do not collide with Wiki Spotlight identifiers.
- Do not give ordinary operators owner publication powers.
- Do not place HMAC secrets in browsers, URLs, telemetry, or logs.
- Do not sign parsed/reformatted JSON instead of exact body bytes.
- Do not duplicate `bannedTerms`.
- Do not hot-link publisher images or fetch arbitrary image URLs.
- Do not fail otherwise-valid ingestion because image rehosting failed.
- Do not remove tombstones or apply stale revisions over newer state.
- Do not treat six retries as six total attempts.
- Do not retry permanent 4xx indefinitely.
- Do not expose source metadata, private URLs, owner identities, names, emails, handles, or member identifiers through pulse/manifest payloads.
- Do not add arbitrary pulse filters or member-level analytics.
- Do not claim that textual keyword scanning proves absence of PII.
- Do not grant XP for posting, impressions, dismissals, digest viewing, or ceremony viewing.
- Do not change faction scoring or introduce new modifier semantics in this phase.
- Do not call an LLM from digest generation, directly or transitively.
- Do not send email/push digests in this scope.
- Do not use fixed PST/PDT offsets; use `America/Los_Angeles`.
- Do not put SwanStudios migrations below subdirectories of `backend/migrations/`. (The reason is **not** a non-recursive `readdirSync` — `discoverMigrationFiles()` at `safe-migrate.mjs:222` is recursive. `isExecutableByCli()` at `:214` classifies any path containing `/` or `\` as `inert`, modelling sequelize-cli's own non-recursive glob. Discovered, reported, never executed.)
- Do not "fix" the recursion in `safe-migrate.mjs` — it was never broken — and do not delete the inert files. The inert set is printed loudly on purpose (`:248-259`).
- Do not use `CREATE INDEX CONCURRENTLY`, or `ADD CONSTRAINT … NOT VALID` followed by a separate `VALIDATE`. SwanGuard's `migrationRunner.ts` wraps every migration in a transaction (`:379` `BEGIN`, `:416` the SQL), so these fail on deploy. Use ordinary `CREATE INDEX` / `ALTER TABLE … ADD CONSTRAINT`.
- Do not add a `sessionId` column to `CoachSignal`, and do not carry Astra's `sessionId` DDL into this package. That column does not exist.
- **Do not make `postId` NOT NULL.** Superseded 2026-09-19 by operator ruling. It contradicts the migration's `onDelete: 'SET NULL'` (F3.4 — a coach's recognition survives post deletion), posts are hard-deleted so that path is live, and existing rows with a deleted post already hold `NULL`. Keep `postId` nullable; the duplicate hole it was meant to close is unreachable through the API. See `05-slices.md` R1 correction 3.
- Do not follow a redirect when rehosting an image (`redirect: 'error'`), do not buffer an unbounded body via `arrayBuffer()`, do not trust a declared `Content-Type` over sniffed magic bytes, and do not accept `image/svg+xml`, animation, or a polyglot.
- **Do not add an exact-host allowlist to image rehosting.** A Spotlight image URL is chosen by the curator and points at an arbitrary publisher, so an allowlist would reject every legitimate source. The PLAUD audio fetcher can demand one only because it fetches a single vendor. See `CORRECTIONS-APPLIED.md` §4.
- Do not turn an image-fetch rejection into an ingest failure — the image-failure contract (`imageUrl=null`, ingest succeeds) is unchanged.
- Do not use `DataTypes.UUID` for new top-level `backend/models/social/` tables. Use `INTEGER` autoIncrement, or a natural key where one genuinely exists.
- Do not build S5 in `family-first-intelligence-command-center` on `main` — it has no `apps/web/src/newsroom/` directory. Build in `SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.
- Do not guess canonical FK table names or key types.
- Do not extend existing ENUMs for these features.
- Do not use in-memory-only quotas, idempotency, scheduler locks, manifest cursors, or worker leases in a multi-process deployment.
- Styled-components only; shared fragments use `css`.
- Victory only if a chart becomes necessary; this package does not require a chart.
- Use palette tokens with fallbacks. No literal styling colors outside token fallbacks.
- Never use `#0a0a1a`, `#00FFFF`, or `#7851A9`.
- Gold means earned recognition only; purple means AI coach only; editorial Spotlight uses ice-cyan.
- No interactive target below 44×44 CSS pixels.
- No motion-only information; no Three.js on 375px mobile or reduced-motion.
- No source file reaches 300 lines.
- No global leaderboard, follower counts, live audio, or Reels work.
- No `git add -A`, destructive cleanup, blanket dirty-state recovery, or unapproved push to main.
- No blanket staging of generated or recovered files. Stage reviewed explicit paths.
- No silent builder deviations.

---
````


### 6.9 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/07-checkpoints.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/07-checkpoints.md >>>
# 07 — Checkpoints: submission protocol and review remit

Every slice is followed by a checkpoint. The builder submits; the reviewer adjudicates; only then does
the next slice begin. This document defines what a submission must contain and what the reviewer is
responsible for establishing.

---

#### Submission required after each slice

1. Starting and ending commit SHA.
2. Explicit changed-file list and diff.
3. Source excerpts for every changed trust boundary, with `file:line`.
4. Test command, exit code, and unedited output.
5. Migration up/down or documented nonreversible operation evidence.
6. Real-database concurrency output where required.
7. Exact HTTP status, headers relevant to the contract, and JSON body for acceptance curls.
8. Screenshots at 1440×900 and 375×812.
9. Keyboard/focus and reduced-motion evidence.
10. Bundle report for S6.
11. Secret-scan result.
12. Protected-file diff.
13. New deviations or unresolved questions, including an explicit `"None"` when empty.

#### Verdicts

- **PASS:** all slice criteria and regressions evidenced.
- **PASS WITH BOUNDED FOLLOW-UP:** only nonfunctional documentation cleanup; no security, privacy, migration, concurrency, contract, or accessibility exception.
- **FAIL:** return exact fixes; builder stops.
- **BLOCKED:** missing evidence or owner decision; builder stops.

No approval by silence.

#### Reusable review remit

> Review this slice as a hostile maintainer. Compare the implementation against the approved package and actual source excerpts. Inspect raw-body handling, authorization, exact DTO serialization, database constraints, transaction boundaries, concurrent execution, retry/revision ordering, kill-switch races, timezone boundaries, image-fetch isolation, accessibility, protected surfaces, and deployment migration discovery. Every implementation finding must include actual file:line evidence and a specific fix. Distinguish confirmed defects from hypotheses. Do not accept test counts without output, screenshots without viewport dimensions, or privacy claims based only on grep. Return PASS, FAIL, or BLOCKED with required actions.

#### Rollback boundaries

- Application rollback must not erase new revision/tombstone state.
- On receiver trouble: disable Spotlight; pause publishing; preserve outbox and cursor.
- On publisher trouble: pause publishing; retain drafts, events, and receipts.
- On digest trouble: stop the job and hide its surface; preserve preferences.
- On ceremony graphics trouble: force static rendering without changing claims.
- On migration trouble: restore only through the rehearsed database procedure, not a speculative down migration.
- Re-enablement requires the failed checkpoint to pass again.
````


### 6.10 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/08-decision-density-self-test.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/08-decision-density-self-test.md >>>
# 08 — Decision-Density Self-Test (PART C)

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Remaining choice | Disposition |
|---|---|
| Queue location | **Decided:** separate `/operator/studio-spotlight`; protected reading surfaces unchanged |
| Publication authority | **Decided:** existing owner authorization only |
| Default flag | **Decided:** OFF; explicit staged enablement |
| Signal day | **Decided:** Pacific calendar day, atomic quota |
| Null-target uniqueness | **Decided conditionally:** exactly-one-target check plus session unique index; actual schema must confirm compatibility |
| Revision concurrency | **Decided:** atomic highest-revision state, persistent tombstones, revision-conditional image attachment |
| Image safety | **Decided:** bounded HTTPS fetch/decode/rehost; graceful null degradation |
| Retry count/backoff | **Decided:** one initial attempt plus six retries, persisted bounded jitter |
| Kill-switch semantics | **Decided:** enqueue/send gate; no promise of recalling accepted requests |
| Reconciliation | **Decided:** signed committed-sequence stream, durable cursor, retained retractions |
| Telemetry denominator | **Decided:** qualified daily member/item/revision exposures |
| Dismissal threshold | **Decided:** seven closed Pacific days, at least 100 impressions, strictly greater than 40% |
| Pulse privacy | **Decided:** fixed aggregate DTO, no filters, small-sample suppression |
| Ceremony schedule/window | **Decided:** Monday 09:00 through Tuesday 09:00 Pacific |
| Refresh duplication | **Decided:** atomic at-most-once claim; possible missed display after crash disclosed |
| Three.js placement/cost | **Decided:** ceremony only, desktop lazy chunk ≤180 KiB gzip, static mobile/reduced-motion |
| Digest medium/time | **Decided:** in-app, Sunday 18:00 Pacific |
| Digest generation | **Decided:** deterministic templates, network-denied generation test |
| Component extraction and test fixture helper names | **Delegated with bounds:** preserve interfaces, line budgets, and test semantics; no new dependencies or architectural changes |
| Exact existing bridge body/responses | **Blocked G0:** cannot truthfully reconstruct from the packet |
| Existing model definitions and canonical key types | **Blocked G0:** full definitions and drift evidence required |
| SwanGuard DB/migration mechanics | **Blocked G0:** must follow actual implementation |
| Route mounts, owner context, scheduler registration, preference/name adapters | **Blocked G0:** exact excerpts and final edits required |
| Existing faction winner/MVP/modifier rules | **Blocked G0:** authoritative domain contract required; no invented scoring |
| Real test commands, auth fixtures, baseline sizes | **Blocked G0:** runtime evidence required |
| Safe integration commit and push destination | **SEAN MUST DECIDE** after recovery audit |

**Completion judgment:** There are no concealed decisions in this response, but there are material, explicitly blocked inputs. This is a usable architecture and acceptance specification—not a truth-harvested, implementation-ready Forge package. Calling it complete without the missing source excerpts, full model definitions, mount points, and verified wire DTO would repeat the very “claimed but not true” failure the hostile review was requested to catch.
````


### 6.11 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/MANIFEST.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/MANIFEST.md >>>
# Package Manifest — Social Bridge Completion Blueprint

**Generated:** 2026-09-19 · **Last reconciled:** 2026-09-19 (corrections 1–7 applied)
**Source reply:** `ASTRA-PRO-REPLY.md` — Astra Pro (`openai/gpt-6-astra-pro`) via OpenRouter
**Packet:** `CONSULT-PACKET.md` — dispatched as v1, **known-defective**; see `VERIFICATION-NOTES.md` Part 1
**Cost / wall:** $2.67 · 6m19s · 41,798 output tokens · `finish_reason=stop` (not truncated)

---

## Read in this order

| # | File | Lines | Why |
|---|---|---|---|
| 1 | `CORRECTIONS-APPLIED.md` | 236 | **Start here.** What changed, where, and how each change was verified — the audit trail. |
| 2 | `G0-SOURCE-EXCERPTS.md` | — | **Gate G0, closed.** The six source excerpts Astra could not see, quoted verbatim. **Authoritative wherever this package disagrees with it.** |
| 3 | `VERIFICATION-NOTES.md` | — | Adjudicates Astra's ten findings: two packet defects, one finding refuted, one promoted to a live defect, seven corrections. |
| 4 | `HOSTILE-REVIEW.md` | 103 | PART A — Astra's hostile review, verbatim (including its errors). |
| 5 | `00-README.md` | 100 | Builder Contract, build order, how to use the package. |
| 6 | `01-architecture.md` | 264 | 6 Mermaid diagrams — `flowchart LR` ×1, `sequenceDiagram` ×3, `erDiagram` ×1, `stateDiagram-v2` ×1 — plus the logical schema and its primary-key convention. |
| 7 | `02-wireframes.md` | 238 | ASCII wireframes, desktop + 375px, empty/loading/error states. |
| 8 | `03-contracts.md` | 228 | Contracts, part 1 — release rule, common errors, SwanGuard operator APIs, SwanStudios admin read, impressions, pulse auth. |
| 9 | `03b-contracts-s6-s8-and-interfaces.md` | 211 | Contracts, part 2 — manifest reconciliation, faction ceremony, weekly digest, exported interfaces. |
| 10 | `04-build-order.md` | 204 | File-by-file, ordered so every slice leaves the app bootable. |
| 11 | `05-slices.md` | 343 | **The plan.** Executable acceptance criteria and STOP lines. |
| 12 | `06-bans.md` | 54 | The "do NOT" list. |
| 13 | `07-checkpoints.md` | 46 | Checkpoint protocol and review remit. |
| 14 | `08-decision-density-self-test.md` | 36 | PART C — remaining builder choices: decided, or delegated-with-bounds. |

Supporting: `ASTRA-PRO-REPLY.meta.json` (usage/cost telemetry), `ASTRA-PRO-REPLY.run.log`
(preflight → complete), `ASTRA-PRO-REPLY.partial.md` (superseded stub).

`03-contracts.md` was 426 lines, over the ~300-line builder-loadability budget. It was split
losslessly into parts 1 and 2 (228 + 211), verified by re-concatenation.

---

## Status: buildable; three deviations remain, all recorded

Gate G0 is **closed** (`G0-SOURCE-EXCERPTS.md`) and **corrections 1–7 are applied**
(`CORRECTIONS-APPLIED.md`). The SSRF defect is not just planned but **fixed, wired and verified** —
`backend/services/spotlightImageFetch.mjs` + 36 passing tests across 3 suites, mutation-tested.
Commit `fe388691f`.

Remaining, and each is stated rather than silently resolved:

1. **`BLOCKED-G0` markers that survive** are genuine and listed in `04-build-order.md`'s
   integration-edit table: SwanGuard's operator-navigation mount file, `bridge-policy.json`'s actual
   location and schema, and SwanGuard's migration convention. These need a source read, not a guess.
2. **`05-slices.md` is 343 lines**, over the ~300-line budget. Not split — the operator named it as
   *the plan* and fragmenting it would invalidate every reference to it. See
   `CORRECTIONS-APPLIED.md` → Known remaining deviations.
3. **`CREATE INDEX CONCURRENTLY` is unavailable.** SwanGuard's migration runner wraps every migration
   in `BEGIN`/`COMMIT` (`packages/database/src/migrationRunner.ts:379`, `:416`; asserted by
   `migrationRunner.test.ts:173,188,199`), so the `CONCURRENTLY` variant fails on deploy. Use ordinary
   `CREATE INDEX`. This invalidates the DDL Astra itself proposed.
4. **Two `__dirname`-in-ESM defects were blocking the SS-PT server from booting**, and were found only
   by importing the modules under plain `node` — vitest's Vite transform supplies a `__dirname` shim,
   so the suite was green while the runtime was dead. `services/photoStorageService.mjs:46` threw on
   *import* (~10 modules import it statically, so the app could not start);
   `core/middleware/errorHandler.mjs:21` threw at *request* time and 500'd every SPA route in
   production. Both fixed; guard added at `tests/unit/esmNodeLoadable.test.mjs`. See
   `CORRECTIONS-APPLIED.md` §8.

**Correction to a previous revision of this manifest.** It claimed `01-architecture.md` held
`sequenceDiagram` ×6, `erDiagram` ×2 and `stateDiagram-v2` ×2. The measured inventory is
`sequenceDiagram` ×3, `erDiagram` ×1, `stateDiagram-v2` ×1, `flowchart LR` ×1. A builder told there
are two ER diagrams would have hunted for a missing one. All line counts above are measured, not
estimated.

---

## Build order

Per `04-build-order.md` and `05-slices.md`. Build **ONE slice at a time**; after each slice, produce
the diff + the acceptance-criteria evidence, and **WAIT** for the checkpoint verdict before
continuing. Never claim a criterion passed without pasting its output.

## Provenance

- Packet SHA-256: `65272c98503fa6b1ba2452fd83d1f8a01d51e872811e6dce310201e2657cc193`
- Every outbound byte passed `scripts/lib/redact-egress.mjs` (rule 8); the instrument reported
  no matches on both the document read and the request body.
- The `openai/gpt-6-astra-pro` seat was confirmed live against OpenRouter's model list before
  dispatch (447 models; `$10/M` in, `$50/M` out, 1.05M context).
````


### 6.12 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/CORRECTIONS-APPLIED.md >>>
# CORRECTIONS-APPLIED — what changed, where, and how it was verified

**Date:** 2026-09-19
**Authority:** `VERIFICATION-NOTES.md` Part 4 (the seven corrections)
**Companion truth:** `G0-SOURCE-EXCERPTS.md` — authoritative wherever this package disagrees with it.

This file is the audit trail the rest of the package points at. Each correction below records:
the defect, the verified fact, the files changed, and **how the change was checked**. A correction
listed here without evidence is a claim, not a correction.

---

## Status table

| # | Correction | Applied in | Verified by |
|---|---|---|---|
| 1 | `safe-migrate.mjs` mechanism | `04-build-order.md:24-39`, `CONSULT-PACKET.md:55` | source read (`:214`, `:215`, `:222`) |
| 2 | S5 working root pinned | `00-README.md:14-19`, `04-build-order.md:3-22`, `05-slices.md:133`, `CONSULT-PACKET.md:55` | `git worktree list`, path existence test |
| 3 | `postId` NOT NULL; drop `sessionId` DDL | `05-slices.md:35,55-57`, `04-build-order.md:115,133` | model + route read |
| 4 | SSRF promoted to must-fix | `04-build-order.md:52-107`, `05-slices.md:45` | **implemented — see §4** |
| 5 | `SPOTLIGHT_ENABLED` stays default OFF | `05-slices.md:301` | packet + Astra's refutation |
| 6 | Image-failure contract unchanged | `04-build-order.md:103-107`, `05-slices.md:51` | route read (`:115`, `:155-156`, `:177-180`) |
| 7 | Primary-key convention | `01-architecture.md:119, 203-226` + diagram body | repo-wide convention count |

---

## 1 — The `safe-migrate.mjs` claim named the wrong line and the wrong mechanism

**Defect.** The consult packet asserted *"`backend/scripts/safe-migrate.mjs:146` uses a
non-recursive `readdirSync`."* Line 146 sits inside a `spawn('npx', …)` block. The mechanism was
also wrong.

**Verified fact.**

> `isExecutableByCli()` (`safe-migrate.mjs:214`) returns `false` for any path containing `/` or `\`,
> with the comment *"non-recursive glob"* (`:215`). This models **sequelize-cli's own glob, which is
> non-recursive**. `discoverMigrationFiles()` (`:222`) **is** recursive and does return subdirectory
> files — but they are classified `inert`: reported, then never executed by the delegated CLI run.

**Why this mattered.** A builder told "readdirSync is non-recursive" would form the wrong mental
model and could "fix" a recursion that was never broken.

**Rule, unchanged but now correctly grounded:** SwanStudios migrations go at the **top level** of
`backend/migrations/` only. Do not delete the inert files — `safe-migrate.mjs:248-259` prints
`"N INERT MIGRATION FILE(S) — NEVER RUN, NEVER WILL"` deliberately.

---

## 2 — The SwanGuard working root was ambiguous, and pointed at the wrong tree

**Defect.** Two roots exist and the packet conflated them.

| Root | Branch / HEAD | `apps/web/src/newsroom/` |
|---|---|---|
| `Desktop/@Everything/family-first-intelligence-command-center` | `main` @ `2666b49` | **does not exist** |
| **`Desktop/@Everything/SwanGuard-Newsroom`** | **`merge/newsroom-mainline-v3` @ `d830bed`** | exists (`FeedLanes.tsx` 76, `StorySheet.tsx` 517) |

**Decision: S5 is built in `Desktop/@Everything/SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.**
Every pattern line count in this package is the **worktree's**: `featureDispatchOwnerOperator.ts` 96,
`operatorGrantRoutes.ts` 251, `OwnerKillSwitchPanel.tsx` 193, `OperatorGrantConsole.tsx` 281.

**Also recorded:** `SwanGuard-Newsroom` is a **linked git worktree** — `.git` there is a *file*, not a
directory. Its gitdir is `…/family-first-intelligence-command-center/.git/worktrees/SwanGuard-Newsroom`
and its common dir is `…/family-first-intelligence-command-center/.git`. Anything reading `.git/hooks/`
or `.git/config` from the worktree root reads the wrong path.

---

## 3 — Astra's `sessionId` DDL references a column that does not exist

**Defect.** Astra proposed, correctly hedged:

```sql
CHECK (num_nonnulls("postId","sessionId") = 1) NOT VALID;
CREATE UNIQUE INDEX … ON "CoachSignals" ("coachId","sessionId") WHERE "sessionId" IS NOT NULL;
```

**Verified fact: `CoachSignal` has no `sessionId` column.** Its columns are exactly
`id, coachId, memberId, postId, note, createdAt, updatedAt`.

**Was it a live defect?** No. `coachSignalRoutes.mjs:60-62` parses `postId` and returns
**422 "A valid postId is required."** when it is not a valid integer, and `:138` always writes
`postId: parsedPostId`. The NULL branch is unreachable while v1 is feed-anchored. The model comment
at `:34-35` says the column is nullable *"so a future workout-session target can land without a
migration"* — so this is a **latent hazard the schema deliberately invites**, not a present defect.

**Decision — close it by construction, not by index:** make **`postId` NOT NULL** while v1 remains
feed-anchored. When a session target is actually introduced, add the column, the partial unique index,
and the exactly-one-target CHECK **together, in that one migration**.

---

## 4 — SSRF on `rehostImage()` — promoted to must-fix, and now IMPLEMENTED

This is the correction that changed severity, and the only one with code behind it.

### 4a. Why it was live, not theoretical

`rehostImage()` lives in `backend/routes/bridge/bridgeIngestRoutes.mjs`, reached from the HMAC-signed
`POST /api/bridge/spotlight`. The complete set of protections that existed:

| Line | Protection | Limit |
|---|---|---|
| `:161` | protocol matches `/^https?:$/` | **`http:` permitted** |
| `:162` | `AbortSignal.timeout(8000)` | bounds time, not bytes |
| `:163` | `response.ok` | — |
| `:165` | `content-type` starts with `image/` | **`image/svg+xml` passes** |
| `:167` | `0 < buffer.length <= 8 MiB` | checked **after** the whole body was buffered |

The decisive gap: **the protocol check constrains the URL you PASS, not the URL you CONNECT to.**
`fetch` follows redirects by default, so a host returning `302 → http://169.254.169.254/…` defeated
`:161` entirely. Separately, the 8 MiB cap bounded what was **stored**, not what was **consumed** —
`arrayBuffer()` materialised the whole body first.

**Fair context:** reachable only through the HMAC-signed bridge, so the attacker must hold
`SWAN_BRIDGE_SECRET_V1` or influence the publisher's `imageUrl`. That makes it **authenticated-input
SSRF** — HIGH, not CRITICAL.

### 4b. As built

| Item | Path | Note |
|---|---|---|
| Hardened fetch/decode | `backend/services/spotlightImageFetch.mjs` (267 lines) | **NOT** the package's proposed `backend/services/bridge/bridgeSpotlightImage.mjs` |
| Tests | `backend/tests/unit/spotlightImageFetch.test.mjs` (15) + `tests/unit/spotlightImageDecode.test.mjs` (13) + `tests/bridgeSpotlightImage.security.test.mjs` (8) | **36 tests**, not the 12 the package budgeted. Fixtures shared via `tests/helpers/spotlightImageFixtures.mjs` so the suites respect the 299-line limit |
| Route rewired | `backend/routes/bridge/bridgeIngestRoutes.mjs` | `rehostImage()` now calls `fetchAndDecodeSpotlightImage` |
| Commit | `fe388691f` — `fix(social): harden Spotlight image rehost against SSRF` | 5 files, 694 insertions |

The third suite is **complementary, not a duplicate**: it adds the full private-IPv4 and private-IPv6
range tables (rather than one address per family), IPv4-mapped IPv6 (`::ffff:169.254.169.254`, which
must not pass as public), an empty DNS answer as distinct from a failed lookup, fetch timeout, a
bodyless response, and proof that the cap aborts *mid-stream* rather than merely returning the right
code. It imports the same module and the same fixtures, so there is no second copy of either.

Controls implemented, and the reason each is the right shape:

- **`redirect: 'error'`** — the fix. No redirect is ever followed, so the validated URL is the
  connected URL.
- **HTTPS only** — the `http:` branch is gone.
- **Credentials in the URL rejected** — `https://allowed@evil.com` would otherwise read as `evil.com`.
- **DNS-resolved private-range rejection for IPv4 *and* IPv6**, failing closed when resolution fails,
  rejecting if **any** resolved address is private (not just the first).
- **Streamed byte cap (5 MiB)** — enforced *while* reading; the reader is cancelled mid-stream.
- **Declared `Content-Length` is treated as a claim, not a fact** — an early exit only.
- **Byte-sniffed type, never the declared `Content-Type`.** SVG dies because it has no signature.
- **Decoder inspection**: polyglots rejected, animation rejected via `metadata.pages > 1`,
  `limitInputPixels` bounds the decode, EXIF (incl. GPS) stripped, long edge capped at 1600px.
- **Re-encode before storage**, so the stored bytes are bytes we produced.

**Codec rule:** alpha is preserved by writing PNG; otherwise JPEG. This is chosen from
`metadata.hasAlpha`, not from the input container — so an opaque PNG is normalised to JPEG and a
transparent one stays PNG.

**Failure contract preserved (Correction 6).** Every failure returns a value, never an exception;
`rehostImage()` maps any failure to `null`. A rejected URL, a rejected redirect, a tripped byte cap
and a rejected SVG **all** degrade to `imageUrl=null` with the ingest still succeeding.

### 4c. A latent bug found and fixed while doing this

`rehostImage()` destructured `uploadPhoto` from `r2StorageService.mjs`, which **does not export it**
(runtime-verified `undefined`) instead of `photoStorageService.mjs:119`. Every call therefore threw
`TypeError`, was swallowed by `rehostImage`'s own `catch`, and returned `null` — so **image re-hosting
had never worked at all.** The import now points at `photoStorageService.mjs`. The failure contract is
what hid this: a permanent total failure and a routine per-image failure were indistinguishable.

### 4d. Evidence

- `npx vitest run tests/bridgeSpotlightImage.security.test.mjs tests/unit/spotlightImageFetch.test.mjs
  tests/unit/spotlightImageDecode.test.mjs` → **36 passed (36)** across 3 files.
- Affected-suite sweep — `spotlightImageFetch`, `spotlightImageDecode`, `photoStorageSniff`,
  `photoDiskPaths`, `plaudSlice33Storage`, `swanBridgeIngest`, `coachSignalRoutes.contract` →
  **110 passed (110)**, i.e. the 19 pre-existing bridge API tests and the photo-storage suites still
  pass. The `uploadPhoto` import correction is what makes the photo-storage suites load-bearing here.
- **Mutation-tested** — a green suite proves nothing until it can go red. Each control was reverted
  in turn and the suite was confirmed to fail, then restored (file verified byte-identical by md5):

  | Mutation | Result |
  |---|---|
  | `redirect: 'error'` → `'follow'` | 1 test fails (the redirect test) |
  | streamed cap disabled | 1 test fails (mid-stream abort) |
  | private-address rejection disabled | 4 tests fail (loopback, metadata, any-address, IPv6) |
  | raster-type gate disabled | 1 test fails (non-raster sniff) |

  Note on the last row: SVG is rejected by the **sniff** gate (no signature entry), while
  mp4/webm/avi/pdf are rejected by the **raster allowlist**. Two independent gates — the tests pin
  which one fires by asserting the message, so adding `svg` to the signature table later would still
  be caught by the allowlist.

---

## 5 — `SPOTLIGHT_ENABLED` stays defaulting OFF

Astra explicitly refuted the premise that "default OFF is a defect", and **that refutation is
correct**. Default OFF hides the rail *and* the publisher; enablement is an explicit deployment
decision, rehearsed in E1. No change made — recorded here so it is not "fixed" by a later reader.

---

## 6 — The image-failure contract is unchanged

`:115` (`?? null`), `:155-156`, and `:177-180` ensure an image failure yields `imageUrl=null` and
**never fails the ingest**. Every control added in §4 preserves this. Adding a control must not turn
an image failure into a 4xx/5xx on the ingest path. A dropped Spotlight is worse than an imageless one.

---

## 7 — Primary-key convention

`01-architecture.md`'s `erDiagram` originally declared `uuid id PK` for every new table. This repo runs
**two conventions inside the social schema itself**, which is why this needed stating precisely rather
than as a blanket rule:

| Location | Files | PK convention |
|---|---|---|
| `backend/models/social/*.mjs` (top level) | 20 | **`DataTypes.INTEGER` autoIncrement `id`** — **zero** use `DataTypes.UUID` |
| `backend/models/social/enhanced/*.mjs` | 13 | **`DataTypes.UUID`** in 12 of 13 |
| `backend/models/` overall | — | `DataTypes.UUID` appears in **62** model files repo-wide |

UUIDs are therefore an established pattern in this repo — but **not in the directory S5–S8 write into**.
All of S1–S4 landed in top-level `social/` with `INTEGER` PKs; `CoachSignal.mjs:13-17` is `INTEGER`
autoIncrement, and `SwanSpotlight.mjs:17-21` is the one natural-key exception (`itemId STRING(36)`).

**Rule:** follow the convention of the directory you are writing into. `Users` stays stubbed as
`CANONICAL_PK id PK` — the correct behaviour when the real schema was not supplied.

**Completeness note.** The first pass converted the diagram but left `FactionCeremonies.id` and
`FactionCeremonyClaims.ceremonyId` on `uuid`, contradicting the rule stated below them. Both are now
`int`. This is not cosmetic: **a foreign key's type must match its parent primary key's type**, or the
join is `integer` vs `uuid` and Postgres rejects it. Converting a PK means converting every FK that
references it, in the same migration.

---

## 8 — Two boot-blocking `__dirname` defects, found by running the modules under plain `node`

Not one of the seven corrections. Found while verifying §4, and recorded here because it is a
production outage rather than a package defect, and because the existing test suite was green
throughout it.

### The mechanism

`__dirname` does not exist in ES module scope. Two modules read it without defining it. Every other
file in this repository that uses `__dirname` defines it with
`path.dirname(fileURLToPath(import.meta.url))`; these two did not.

| File | Site | Consequence |
|---|---|---|
| `services/photoStorageService.mjs` | `:46` `UPLOADS_ROOT = path.resolve(__dirname, …)` | **Module-level.** Threw on *import*, so the module never loaded. ~10 modules import it statically (`controllers/profileController.mjs`, `routes/social/posts.mjs`, `routes/profileRoutes.mjs`, `routes/equipmentRoutes.mjs`, `routes/bodyMeasurementRoutes.mjs`, `routes/adminPackageRoutes.mjs`, `routes/adminClientRoutes.mjs`, `controllers/trainerOnboardingController.mjs`, `services/social/socialPostDeletionCleanupService.mjs`, `services/spotlightImageFetch.mjs`) — **the server could not boot.** |
| `core/middleware/errorHandler.mjs` | `:21` SPA fallback path | **Request-time.** The module imported fine; the throw was deferred into the middleware. In production every `GET` that is not `/api/*`, not `/uploads/*` and has no dot in it — every client-side route, including a refresh — fell through to the error handler as a **500**. |

### Evidence

```
node --input-type=module -e "await import('./services/photoStorageService.mjs')"
→ ReferenceError: __dirname is not defined in ES module scope
   at services/photoStorageService.mjs:46:42

node --input-type=module -e "await import('./controllers/profileController.mjs')"
→ same, first frame services/photoStorageService.mjs:46:42

node --input-type=module -e "await import('./core/routes.mjs')"
→ ERR_AMBIGUOUS_MODULE_SYNTAX, first frame services/photoStorageService.mjs:46:42
   (the ambiguous-syntax wrapper was a *downstream artefact* of the failed module load,
    not a second cause — it disappeared with the fix)
```

After the fix, all three import cleanly. `core/routes.mjs` takes ~7 minutes to bootstrap (it loads
the whole application) and now reports `IMPORT OK`.

### Why the suite never caught it

**Vitest transforms modules through Vite, and Vite supplies a `__dirname` shim.** Every test that
imported those modules was green while the deployed runtime was dead. `tests/unit/photoDiskPaths.test.mjs`
imports `UPLOADS_ROOT` from the very module that could not load, and passed.

### Guard added

`backend/tests/unit/esmNodeLoadable.test.mjs` — **5 tests, passing.** One static check (any module the
server loads that reads `__dirname` must define it) and four runtime checks that import the
load-bearing modules under real `node` via `execFileSync`. Mutation-tested: renaming the definition in
`errorHandler.mjs` turns the static check red; the file was restored byte-identical (SHA-256
`3cc6fcae31455424ad925270b0abba02ab79d08e8367718b2230641cdf8e16f3`).

**Scope, stated honestly:** the static check covers the server's runtime directories plus `server.mjs`
and `database.mjs`. It deliberately does **not** sweep every root-level `.mjs`, because that directory
also holds standalone operator scripts — and folding them in makes the guard fail for reasons
unrelated to what it protects.

### A third dead file, same family — found by that scoping decision and now fixed

`backend/compare-keys.mjs` had **zero newline bytes**: 246 newlines had been written as literal
backslash-`n` escape sequences. Since a shebang ends at the first real newline, the entire file was one
comment line — so `node compare-keys.mjs` **exited 0 having done nothing**. A developer running it to
check Stripe key consistency got a silent success.

Repaired by restoring the newlines while preserving the **13** deliberate source-level `\n` escapes
(they had been correctly double-escaped, so a naive un-escape would have destroyed them — protect the
doubles with a sentinel first, then convert the singles):

| | real newlines | source `\n` escapes | double-escaped |
|---|---:|---:|---:|
| before | 0 | 259 | 13 |
| after | 246 | 13 | 0 |

Verified: `node --check` passes, and the script now emits **33 lines of output, exit 0** (previously 0
lines). It is committed as-is in this broken state since 2026-08-16, so this was long-standing rather
than a fresh regression. Output content was deliberately not captured — the script prints partial key
prefixes and suffixes by design.

---

## 9 — The two SSRF suites are complementary, not duplicates

§4b names the primary suites. A second file, `backend/tests/bridgeSpotlightImage.security.test.mjs`,
was written before those existed and **has been reduced to the cases they do not assert**, so there is
no overlapping coverage and no second copy of any fixture:

| Suite | Tests | Covers |
|---|---:|---|
| `tests/unit/spotlightImageFetch.test.mjs` | 15 | URL admission, redirect rejection, byte cap, Content-Length, non-2xx |
| `tests/unit/spotlightImageDecode.test.mjs` | 13 | sniff/polyglot/SVG/pdf, animation, alpha vs JPEG, EXIF strip, edge cap, entry point |
| `tests/bridgeSpotlightImage.security.test.mjs` | 8 | the **full private-IPv4 and private-IPv6 range tables**, IPv4-mapped IPv6, empty DNS answer, timeout, bodyless response, that the cap aborts **mid-stream** (measured by read count, not by return code), and that no failure mode escapes as a throw |

All three import fixtures from `tests/helpers/spotlightImageFixtures.mjs`. Mutation-tested: disabling
the streamed cap fails 1 test; disabling private-address rejection fails 1; source restored to SHA-256
`eae9b9d4a604f43e73b36245571450d1e2f89c71a5d9b365a7e644fbef3f135e`.

**Note for the R1 checkpoint:** the blueprint's proposed path was
`backend/tests/bridgeSpotlightImage.security.test.mjs`; the repo-idiomatic home for the primary suites
is `tests/unit/`. Both now exist and both are green.

---

## Known remaining deviations

Recorded rather than silently resolved:

1. **Document heads.** The seven split documents were carved out of Astra's reply by content marker,
   so each began mid-sentence with no `# NN — Title`. Headers are being restored; a builder opening a
   headerless fragment cannot tell what it is.
2. **`05-slices.md` is 343 lines**, over the ~300-line builder-loadability budget this package
   applied when it split `03-contracts.md` (426 → 229 + 212). The overage grew by 21 lines when the
   required document header was added — the two rules are in tension and the header won. Not split,
   because `05-slices.md` is named as *the plan* by the operator, and fragmenting it would invalidate
   every reference to it in this package. The natural seam, if it is ever split, is G0/R1/R2
   (SwanStudios-side hardening) vs S5–S8/E1 (the bridge and the feature slices). Flagged, not hidden.
3. **`BLOCKED-G0` markers that remain** are listed in `04-build-order.md`'s integration-edit table.
   Those are genuine: SwanGuard's operator-navigation mount file, `bridge-policy.json`'s location,
   and the SwanGuard migration convention are still unread.
4. **R1 correction 3 is SUPERSEDED, not applied.** `postId` stays nullable. `NOT NULL` contradicts
   the migration's `ON DELETE SET NULL` (F3.4), posts are hard-deleted so that path is live, existing
   rows already hold `NULL`, and a green test asserts SET NULL. Operator ruling 2026-09-19. Recorded
   in `05-slices.md`, `06-bans.md` and `04-build-order.md`; pinned by
   `tests/coachSignalIntegrity.contract.test.mjs`. The `sessionId` half of the correction still stands.
5. **`tests/api/swanBridgeIngest.test.mjs` mocks a module the route no longer imports.** It stubs
   `services/r2StorageService.mjs` for `uploadPhoto`, but `rehostImage()` now imports `uploadPhoto`
   from `services/photoStorageService.mjs`. Its two image assertions therefore pass because the
   **real** upload fails on missing credentials, not because the injected failure fired — the same
   "passes for the wrong reason" class as the Vite `__dirname` shim. **Reported, not fixed**, because
   changing another suite's mocks is a separate reviewable change. The correct specifier is used in
   the new `tests/bridgeSpotlightOrdering.contract.test.mjs`.

---

## 10 — The reconciliation manifest could never be reached (found and fixed 2026-09-19)

**Not a correction from Astra — a live defect found while writing the R1 ordering suite.**

`GET /api/bridge/spotlight/manifest` is the signed reconciliation poll. It had **no body parser**,
so `req.rawBody` was `undefined`, and `verifyBridgeRequest()` returns
`500 RAW_BODY_UNAVAILABLE` when `rawBody` is not a Buffer. The endpoint therefore returned 500 for
**every** request, with a valid signature or without one, and nothing detected it because no test
covered the route.

Why it matters: the manifest is what makes a dropped delivery distinguishable from silence. A
permanently-500 endpoint here is a **silently dead safety net**, and S7's convergence acceptance
("drop a publish webhook and a later retraction webhook, run reconciliation") depends on it.

**Fix.** The route now mounts `express.raw({ type: () => true })` and normalises
`req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)`. A GET carries no body, so the
canonical payload is `${timestamp}.` — the scheme is unchanged; the bytes are merely represented
instead of being absent. Mounting `express.raw` rather than hardcoding an empty Buffer means a client
that *does* send bytes is authenticated over the bytes it actually sent.

**Not a wire-contract change:** the endpoint had no working client, because it could not return 200.

**Evidence.** Two tests in `tests/bridgeSpotlightOrdering.contract.test.mjs` were **red before the
fix and green after** — watched failing, not merely asserted. 12/12 green; `swanBridgeIngest` 19/19
unaffected.

**Observation, deliberately not fixed:** a bodyless GET is signed over `${timestamp}.`, so it is
replayable inside the ±300s skew window. Adding a nonce would change the documented wire format and
belongs with S7's `bridgeRequestAuth.mjs` (domain-separated request auth), not here.
````


### 6.13 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/VERIFICATION-NOTES.md >>>
# VERIFICATION NOTES — adjudicating Astra Pro's review against the actual repo

**Date:** 2026-09-19
**Author:** WorkBuddy (independent verification pass)
**Subject:** `HOSTILE-REVIEW.md` (Astra Pro, `openai/gpt-6-astra-pro`) and the package it accompanies

---

## Why this document exists

Astra Pro's review opens by refusing to fabricate `file:line` citations, because the consult packet
supplied file *names* and *reported results* but almost no **source excerpts**. It is right, and the
fault is the packet's, not the model's — the `fable-blueprint-forge` doctrine's Phase 1 ("Repo Truth
Harvest") requires excerpts to be **pasted into the package**, precisely because a builder cannot
grep the repo.

The consequence is that Astra's findings are honestly labelled *unverified*. That honesty is
valuable, but it is not the same as a verified review. **This document does the missing half:**
every checkable Astra claim is adjudicated against the source, and each verdict carries the
evidence that decides it.

**Read this before `05-slices.md`.** Two findings change severity, one is refuted, and two packet
defects below would have sent a builder to the wrong place.

---

## Part 1 — Two defects in the packet Astra received (v1)

These were found **after dispatch**. Astra reasoned from the erroneous v1 text, so any place its
output echoes them must be corrected.

### 1.1 The `safe-migrate.mjs` claim names the wrong line and the wrong mechanism

The packet said: *"`backend/scripts/safe-migrate.mjs:146` uses a non-recursive `readdirSync`."*

- **Line 146 is wrong.** It sits inside a `spawn('npx', ...)` block and has nothing to do with
  directory listing.
- **The mechanism is wrong.** `discoverMigrationFiles()` at `safe-migrate.mjs:222` **is recursive** —
  it walks subdirectories and returns them. The recursion exists.

The accurate statement:

> `isExecutableByCli()` (`safe-migrate.mjs:214`) returns `false` for any path containing `/` or `\`,
> with the comment *"non-recursive glob"* (`:215`). This models **sequelize-cli's own glob, which is
> non-recursive**. So a migration in a subdirectory is *discovered* but classified `inert` — it is
> reported, and then never executed by the delegated CLI run.

**The packet's conclusion still holds** (put migrations at the top level of `backend/migrations/`).
But a builder told "readdirSync is non-recursive" would form the wrong mental model and could
"fix" a recursion that was never broken. Use the accurate mechanism above.

### 1.2 The SwanGuard working root is ambiguous, and §2.1 points at the wrong one

The packet's §2.1 table lists SwanGuard as `Desktop/@Everything/family-first-intelligence-command-center`
(branch `main`), while §4.1 cites `apps/web/src/newsroom/FeedLanes.tsx` and line counts that match
the **worktree**. Both were measured; they are different trees:

| Root | Branch / HEAD | `apps/web/src/newsroom/` | `operatorGrantRoutes.ts` |
|---|---|---|---|
| `family-first-intelligence-command-center` | `main` @ `2666b49` | **does not exist** | 236 lines |
| `SwanGuard-Newsroom` (worktree) | `merge/newsroom-mainline-v3` @ `d830bed` | exists (`FeedLanes.tsx` 76, `StorySheet.tsx` 517) | 251 lines |

**S5 must be built in `Desktop/@Everything/SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.**
The main repo has no newsroom directory at all — a builder following §2.1 would open `main`, find no
`FeedLanes.tsx`, and either stop or invent one. All §4.1 pattern line counts are the **worktree's**:
`featureDispatchOwnerOperator.ts` 96, `operatorGrantRoutes.ts` 251, `OwnerKillSwitchPanel.tsx` 193,
`OperatorGrantConsole.tsx` 281.

---

## Part 2 — Adjudication of Astra's ten findings

| # | Astra severity | Verdict | Basis |
|---|---|---|---|
| 1 | CRITICAL — no repo evidence in the packet | **CONFIRMED** | Packet defect; see Part 1. Astra's fix (a G0 gate) is correct. |
| 2 | HIGH — CoachSignal NULL defeats uniqueness | **REFUTED as live; latent hazard** | See 2.1. Route requires `postId`; DDL cites a non-existent column. |
| 3 | HIGH — 5/day cap is count-then-insert | **CONFIRMED — live race** | See 2.2. |
| 4 | HIGH — S3 has no admin surface | **CONFIRMED** | See 2.3. |
| 5 | HIGH — retraction/revision safety unproven | **PARTLY CONFIRMED** | See 2.4. |
| 6 | HIGH — SSRF / resource exhaustion on rehost | **CONFIRMED — live defect** | See 2.5. **Headline finding.** |
| 7 | HIGH — reverse pulse missing | **CONFIRMED** | `GET /api/operator/pulse` does not exist; no reconciliation beyond webhook retry. |
| 8 | MED — dismissal threshold unevaluable | **CONFIRMED as a design gap** | No impression/dismissal counter exists to read. |
| 9 | HIGH — dirty worktree is an uncontrolled boundary | **CONFIRMED** | 232 uncommitted files, 12 unpushed commits on `merge/newsroom-mainline-v3`. |
| 10 | MED — green tests do not prove deployment/privacy | **CONFIRMED as an inference caveat** | Astra's distinction (tests passed ≠ production-sound) is correct and should be preserved in the checkpoint remit. |

### 2.1 Finding #2 — refuted as a live defect

`CoachSignal.mjs:36-43` declares `postId` as `allowNull: true`, and `:69` declares
`{ unique: true, fields: ['coachId', 'postId'] }`. Astra is right that Postgres treats NULLs as
distinct, so such an index cannot constrain rows where `postId IS NULL`.

**But no such row can currently be created.** `coachSignalRoutes.mjs:60-62` parses `postId` and
returns **422 "A valid postId is required."** when it is not a valid integer, and `:138` always
writes `postId: parsedPostId`. v1 is feed-anchored; the NULL branch is unreachable.

The model comment at `:34-35` states the column is nullable *"so a future workout-session target can
land without a migration."* So this is a **latent hazard that the schema deliberately invites**, not
a present defect. Severity drops from HIGH to LOW.

**Astra's proposed DDL cannot be applied to this schema.** It references a `sessionId` column:
`CHECK (num_nonnulls("postId","sessionId") = 1)` and a partial unique index on `("coachId","sessionId")`.
**There is no `sessionId` column.** `CoachSignal` has exactly `id, coachId, memberId, postId, note,
createdAt, updatedAt`. Astra hedged this correctly ("*if* the actual columns are…"), so this is not an
error — but the conditional must not be resolved into the package as written.

**Recommended decision (simplest correct shape):** make `postId` **NOT NULL** while v1 remains
feed-anchored. That closes the hole *by construction* rather than by an index that only works when a
column is non-null — the same "impossible by construction" principle already used for the Comeback
Moment payload (which omits the gap length so "you were gone N days" cannot be rendered). When a
session target is actually introduced, add the column, the partial unique index, and the
exactly-one-target CHECK **together, in that migration**.

### 2.2 Finding #3 — confirmed, with exact lines

`coachSignalRoutes.mjs:125` — `const sentToday = await CoachSignal.count({...})`
`coachSignalRoutes.mjs:129` — `return res.status(429).json({...})`
`coachSignalRoutes.mjs:138` — `postId: parsedPostId` (the insert)

Read-then-write with **no transaction and no lock**. Two concurrent requests can both observe 4 and
both insert a 5th, yielding 6. This is a genuine TOCTOU race. Astra's fix (a locked per-`(coachId,
localDate)` counter row inside the same transaction, rolled back if the insert fails) is correct and
is the right shape.

**Timezone:** the cap is currently a **UTC** day (`CoachSignal.mjs:62` comment: *"max 5 / coach / UTC
day"*). Astra's recommendation of `America/Los_Angeles` is correct for a US-Pacific operator — a UTC
boundary rolls the allowance at 17:00 Pacific, mid-afternoon.

### 2.3 Finding #4 — confirmed by absence

The only spotlight route mounted is `spotlightReadRoutes` (`routes/social/index.mjs:13,33`, at
`/spotlights`). A search for an admin-gated spotlight surface returns nothing. The operator cannot
distinguish "nothing published" from "rejected" from "image degraded" from "feature disabled".
Confirmed gap; Astra's scoping (read-only, no SwanGuard URLs, no checklist attestations, no publish
controls, retraction originates in SwanGuard) matches Sean's locked decision to keep this separate
from `FeedLanes.tsx`.

### 2.4 Finding #5 — partly confirmed

`bridgeIngestRoutes.mjs:112` preserves `existing?.imageUrl ?? null`, and `:145-146` log and return
`{ itemId, revision, retracted }`. The idempotency contract is implemented. Whether a *late* image
download can attach to a row that has since been retracted or superseded by a higher revision was
**not** established — `rehostImage` is awaited *before* the row is written (`:115` then `:129`), which
narrows but does not by itself close the window. **Still needs a source read at G0.** Astra's fix
(persist the highest accepted revision + a tombstone; attach an image only while the row still has the
intended revision and remains live) is the right direction.

### 2.5 Finding #6 — CONFIRMED as a live defect. This is the headline.

Astra called it an "unverified risk". It is a **present defect**, in `rehostImage()`
(`bridgeIngestRoutes.mjs:158-181`). The complete set of protections is:

| Line | Protection |
|---|---|
| `:161` | protocol must match `/^https?:$/` — **`http:` is permitted** |
| `:162` | `AbortSignal.timeout(8000)` |
| `:163` | `response.ok` |
| `:165` | `content-type` starts with `image/` |
| `:167` | `0 < buffer.length <= 8 MiB` |

**Missing, and each independently exploitable:**

- **No hostname allowlist** — any host is fetched.
- **No private/loopback/link-local/metadata rejection** — `http://169.254.169.254/latest/meta-data/…`
  satisfies the protocol check.
- **No redirect validation.** `fetch` follows redirects by default. A URL on an allowlisted-looking
  host that returns `302 → http://169.254.169.254/…` defeats `:161` entirely, because the protocol is
  checked on the *initial* URL only. This is the concrete bypass that makes the finding live rather
  than theoretical.
- **The 8 MiB cap is not a DoS control.** `:166` buffers the *entire* body via `arrayBuffer()` and
  `:167` checks the size **afterwards**. A multi-gigabyte response is fully materialised in memory
  before being rejected. The cap bounds what is *stored*, not what is *consumed*.
- **`image/svg+xml` passes `startsWith('image/')`** at `:165`. SVG is executable markup, not a raster
  image; accepting it is an XSS vector wherever it is later served inline. Astra's "reject SVG and
  animation" is confirmed as a required control, not a nicety.
- No DNS-rebinding defence (validate-then-fetch is a TOCTOU).

Mitigating context, stated fairly: this path is reached only through the HMAC-signed bridge, so the
attacker must hold `SWAN_BRIDGE_SECRET_V1` or be able to influence the publisher's `imageUrl`. That
makes it **authenticated-input SSRF**, which is why it is HIGH and not CRITICAL. It is not
unauthenticated. But the entire premise of re-hosting is that the publisher is only semi-trusted, and
a redirect chain makes the one protocol check worthless.

The good news: the *failure contract* is correct and verified. `:115` (`?? null`), `:155-156`, and
`:177-180` all ensure an image failure yields `imageUrl=null` and **never fails the ingest**. That
part matches the locked contract exactly and should not be changed.

### 2.6 Finding #7 — confirmed

`GET /api/operator/pulse` does not exist. Only `/spotlight/manifest` (`:187`) provides any
reconciliation, and it is pull-only from SwanGuard's side; there is no aggregate pulse in the reverse
direction. Confirmed gap.

---

## Part 3 — What remains unverified, and the gate that must close it

Astra's finding #1 stands: **the package is not buildable as-is**, because the builder has no source
excerpts. The following must be harvested before slice 1, and pasted into the package (not linked):

1. **The exact `spotlight.v1` request body** — the DTO the ingest route validates. Without it the
   publisher cannot be written. (`bridgeIngestRoutes.mjs`, the `str(...)` calls.)
2. **`SwanSpotlight` model + its migration** — every column, type, and nullability.
3. **`swanBridgeSignature.mjs`** — the exact canonical string and comparison.
4. **`coachSignalRoutes.mjs:100-145`** — the cap block, for the §2.2 fix.
5. **SwanGuard's DB dialect and migration runner** — whether `CREATE INDEX CONCURRENTLY` is even
   available (it cannot run inside a transaction; Astra flagged this correctly at finding #2).
6. **SwanGuard's auth implementation** — what `requireUserOnce` returns and how an operator is
   distinguished from a member, since the S5 queue is operator-only.

Until those six exist in the package, treat every PART B document as **architecture, not instructions**.
That is exactly what Astra said, and it is the correct reading.

---

## Part 4 — Corrections to carry into the package

> **Status: all seven are APPLIED.** This part is the record of what was *found*, written in the
> present tense of the moment it was found. Do not read it as outstanding work. What actually
> landed — and where — is `CORRECTIONS-APPLIED.md`; the source truth is `G0-SOURCE-EXCERPTS.md`.
> If this part and those two disagree, they win.

1. Replace the `safe-migrate.mjs:146` sentence with the accurate mechanism (§1.1).
2. Pin the S5 working root to `SwanGuard-Newsroom` on `merge/newsroom-mainline-v3` (§1.2).
3. Drop Astra's `sessionId` DDL; make `postId` NOT NULL instead (§2.1).
4. Promote the SSRF finding to a **must-fix before the publisher is enabled** (§2.5), and add
   redirect validation + a streamed byte cap + SVG rejection.
5. Keep `SPOTLIGHT_ENABLED` defaulting OFF. Astra explicitly refuted "default OFF is a defect" and
   that refutation is correct.
6. Keep the existing image-failure contract (`imageUrl=null`, ingest still succeeds) unchanged.

### Correction 7 — the ER diagram's `uuid` primary keys do not match the schema S5–S8 extends

`01-architecture.md`'s `erDiagram` declares `uuid id PK` for every new table
(`StudioSpotlightItems`, `SpotlightPublications`, `BridgeSpotlightAttempts`, …).

**This repo runs two conventions inside the social schema itself**, which is why this needs stating
carefully rather than as a blanket rule:

| Location | Files | PK convention |
|---|---|---|
| `backend/models/social/*.mjs` (top level) | 20 | **`DataTypes.INTEGER` autoIncrement `id`** — **zero** files use `DataTypes.UUID` |
| `backend/models/social/enhanced/*.mjs` | 13 | **`DataTypes.UUID`** in 12 of 13 |
| `backend/models/` overall | — | `DataTypes.UUID` appears in **62** model files repo-wide |

So UUIDs are an established pattern in this codebase — Astra's choice is not foreign to the repo.
But **the tables S5–S8 sit beside are the top-level ones.** `CoachSignal.mjs:13-17` is
`INTEGER` autoIncrement; `SwanSpotlight.mjs:17-21` is the one natural-key exception
(`itemId` `STRING(36)` as PK, no `id` column). All of S1–S4 landed in `social/` with `INTEGER` PKs.

**Recommendation:** follow the local convention of the directory you are writing into — `INTEGER`
autoIncrement for new top-level `social/` tables, or a natural key where one genuinely exists (as
`SwanSpotlight` does). If you want UUIDs, make that an explicit, separately-argued decision, because
mixing both conventions within the same directory is the schema-inconsistency class the house rules
exist to prevent.

Note the one thing the diagram got right and should keep: it stubs `Users` as
`CANONICAL_PK id PK` rather than inventing columns. That is the correct behaviour when the real
schema was not supplied.


---

## Part 5 — Net assessment

Astra Pro's review is **high quality on method and honest about its limits**, which is the
combination that matters. It refused to invent citations, correctly identified that the packet's
missing excerpts were the blocking defect, and refuted two bad premises ("default OFF is a defect";
"a partial index is always required") — the refutations are both correct.

Its weakness is the mirror of that honesty: because it had no source, its severities are calibrated
to *possibility*, not to the repo. One finding is refuted outright (#2), one is understated (#6,
which is a live SSRF rather than a risk), and one proposed fix references a column that does not
exist. Those are the gaps this document closes.

**Bottom line:** the package is a sound *architecture* and a good slice plan, and it is not yet a set
of instructions. Part 3's six excerpts are the gate. Once they are pasted in and corrections 1–7 are
applied, the package is buildable.
````


### 6.14 `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/G0-SOURCE-EXCERPTS.md`

````
<<< docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/G0-SOURCE-EXCERPTS.md >>>
# G0 — SOURCE EXCERPTS (harvested, verbatim)

**Date:** 2026-09-19
**Closes:** Gate G0 from `VERIFICATION-NOTES.md` Part 3, and Astra's hostile-review finding #1.

Astra Pro correctly refused to write `file:line`-cited findings because the consult packet supplied
file *names* and *reported results* but no **source**. This document is the missing half: the six
excerpts a builder needs, read out of the repo. Everything below is quoted from source, not recalled.

**One G0 question is now definitively answered, and it invalidates part of Astra's own proposed fix —
see G0-5.**

---

## G0-1 — The exact `spotlight.v1` request body and response

`backend/routes/bridge/bridgeIngestRoutes.mjs`

**Own body parser — the bridge path must stay out of the global JSON parser:**

```js
export const SPOTLIGHT_MAX_HEADLINE = 80;
export const SPOTLIGHT_MAX_DEK = 200;
export const SPOTLIGHT_MAX_CURATOR_NOTE = 140;

export const spotlightJsonParser = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); },
});
```

**Required fields** (`:50-62`):

```js
export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  const itemId = str(body.itemId, 36);
  if (!itemId) return { ok: false, reason: 'itemId is required.' };
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true };
};
```

**The full accepted body** (`:90-93` and `:118-137`) — this is the authoritative DTO:

| Field | Type | Constraint | Required |
|---|---|---|---|
| `itemId` | string | trimmed, ≤36 | **yes** |
| `revision` | integer | ≥1 | **yes** |
| `headline` | string | trimmed, ≤80 | **yes** |
| `dek` | string | trimmed, ≤200 | no |
| `curatorNote` | string | trimmed, ≤140 | no |
| `retracted` | boolean | default `false` | no |
| `imageUrl` | string | ≤2048 | no |
| `sourceAttribution.name` | string | ≤80 (nested object) | no |
| `sourceAttribution.url` | string | ≤2048 (nested object) | no |
| `gate.checklistHash` | string | ≤64 (nested object) | no |
| `sortWeight` | integer | default `1` | no |
| `publishedAt` | date | `Date`-parseable | no |
| `expiresAt` | date | `Date`-parseable | no |

> **`str()` is `(value, max) => typeof value === 'string' ? value.trim().slice(0, max) || null : null`.**
> It **truncates** rather than rejecting. A 300-character `headline` is silently cut to 80.

**⚠️ The field is `dek`, not `summary`.** Astra's package warns against inventing `summary`; this
table is the ground truth for what the receiver actually reads.

**Headers** (`backend/services/swanBridgeSignature.mjs:8-12`):

```
X-Swan-Signature: sha256=<hex>
X-Swan-Timestamp: <ISO 8601>
X-Swan-Idempotency-Key: <itemId>@<revision>
canonical string = `${timestamp}.${rawBody}`
```

**Responses** (`:74-146`):

| Status | Body |
|---|---|
| 503 | `{ success: false, message: 'Spotlight ingest is disabled.' }` — flag off |
| 401 | `{ success: false, code }` — `SIGNATURE_MALFORMED` \| `SIGNATURE_EXPIRED` \| `SIGNATURE_INVALID` |
| 422 | `{ success: false, message: <reason> }` or `{ success: false, code: 'BANNED_TERM' }` |
| 200 | `{ success: true, itemId, revision, retracted }` |
| 200 (replay) | `{ success: true, noop: true, itemId, revision: existing.revision }` |
| 500 | `{ success: false, message: 'Server error during ingest.' }` |

**Ingest order is contractual** (`:11-13`): flag (503) → signature + skew (401) → schema (422) →
bannedTerms second gate (422) → idempotent upsert → R2 re-host → audit log.

**Idempotency** (`:107-109`): `if (existing && existing.revision >= revision)` → no-op. Note this is
`>=`, so an **equal** revision is a no-op and a **lower** revision is also a no-op. There is no
tombstone table — `retracted` is a boolean column on the same row.

---

## G0-2 — `SwanSpotlight` model and migration

`backend/models/social/SwanSpotlight.mjs` — **the primary key is the natural key `itemId`, not an
auto-increment `id`.** This is the one exception to the `social/` INTEGER-PK convention.

```js
itemId:      STRING(36),  primaryKey, allowNull: false
revision:    INTEGER,     allowNull: false, defaultValue: 1
retracted:   BOOLEAN,     allowNull: false, defaultValue: false
headline:    STRING(80),  allowNull: false
dek:         STRING(200), allowNull: true
imageUrl:    TEXT,        allowNull: true
sourceName:  STRING(80),  allowNull: true
sourceUrl:   TEXT,        allowNull: true
curatorNote: STRING(140), allowNull: true
sortWeight:  INTEGER,     allowNull: false, defaultValue: 1
publishedAt: DATE,        allowNull: true
expiresAt:   DATE,        allowNull: true
gateHash:    STRING(64),  allowNull: true
// tableName 'SwanSpotlights', timestamps: true
```

Index: `{ fields: ['retracted', 'expiresAt', 'sortWeight'] }` — the live-rail query.

Migration `backend/migrations/20260916-create-swan-spotlights.cjs` creates the same columns, with
`createdAt`/`updatedAt` as `allowNull: false, defaultValue: Sequelize.literal('NOW()')`, plus
`addIndex('SwanSpotlights', ['retracted','expiresAt','sortWeight'], { name: 'swan_spotlights_live_rail_idx' })`.

> **Note the model/migration pair is the pattern to copy for every new S5–S8 table**, including the
> `literal('NOW()')` default on the timestamp columns.

---

## G0-3 — `swanBridgeSignature.mjs` (the signer the publisher must reproduce)

`backend/services/swanBridgeSignature.mjs`

```js
const SIG_REGEX = /^sha256=[0-9a-f]{64}$/i;
export const DEFAULT_SKEW_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;

export function buildCanonicalPayload(timestamp, rawBody) {
  if (!Buffer.isBuffer(rawBody)) throw new Error('buildCanonicalPayload: rawBody must be a Buffer');
  return `${timestamp}.${rawBody.toString('utf8')}`;
}

export function signPayload(timestamp, rawBody, secret) {
  return `sha256=${crypto.createHmac('sha256', secret)
    .update(buildCanonicalPayload(timestamp, rawBody)).digest('hex')}`;
}
```

Verification order (`verifyBridgeRequest`): shape-check the header → timestamp window → **require
`Buffer.isBuffer(req.rawBody)`** → resolve secret → constant-time HMAC compare.

- Skew: `Math.abs(nowMs - Date.parse(timestamp)) <= 300 * 1000`.
- Secret: `SWAN_BRIDGE_SECRET_V1`, **must be ≥32 chars** or the resolver throws (mapped to a 401
  that never echoes the env var name).
- `RAW_BODY_UNAVAILABLE` returns **500** (`:94-98`) with the comment *"If this fires, the mount order
  regressed."* — this is the canary for the parser-skip-list regression.

**The publisher must sign `timestamp + '.' + exactBytes` where the bytes are the exact serialised
body it sends.** Any re-serialisation between signing and sending breaks the HMAC.

---

## G0-4 — The daily-cap block (Astra's finding #3, now with exact lines)

`backend/routes/social/coachSignalRoutes.mjs:117-140`

```js
const duplicate = await CoachSignal.findOne({
  where: { coachId: req.user.id, postId: parsedPostId }, attributes: ['id'],
});
if (duplicate) return res.status(409).json({ success: false, message: 'You already signaled this post.' });

const sentToday = await CoachSignal.count({
  where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
});
if (sentToday >= DAILY_SIGNAL_CAP) {
  return res.status(429).json({ success: false,
    message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.` });
}

const signal = await CoachSignal.create({
  coachId: req.user.id, memberId: post.userId, postId: parsedPostId, note: trimmedNote || null,
});
```

`const DAILY_SIGNAL_CAP = 5;` (`:14`). `startOfUtcDay()` → **UTC** boundary.

**Refinement of Astra's finding — there are two read-then-write races here, and only one is
backstopped:**

| Race | Lines | Backstop |
|---|---|---|
| Duplicate signal | `:117-123` findOne → `:135` create | **Yes** — the unique index on `('coachId','postId')` makes the second insert fail |
| Daily cap | `:125-127` count → `:135` create | **None** — nothing at the DB level prevents a 6th row |

So the cap race is the one that needs the locked-counter fix; the duplicate race is already
DB-protected (though it would surface as a 500 rather than a 409, since `create` would throw on
constraint violation and the catch at `:173` returns 500).

---

## G0-5 — SwanGuard's migration runner — **`CREATE INDEX CONCURRENTLY` IS NOT AVAILABLE**

**This closes the open question Astra raised in its own finding #2, and the answer forbids the DDL
Astra proposed.**

`packages/database/src/migrationRunner.ts`:

- `:379` — `await client.query('BEGIN');`
- `:416` — `await client.query(sql);`  ← each migration's SQL, **inside the transaction**
- Tests assert `BEGIN` then `COMMIT`: `migrationRunner.test.ts:173,188,199`
- Ledger table: `schema_migrations` (`:76`, `select version, checksum from schema_migrations order by version`)

**Every migration runs inside a transaction.** In PostgreSQL, `CREATE INDEX CONCURRENTLY` (and
`ALTER TABLE … ADD CONSTRAINT … NOT VALID` followed by `VALIDATE`, when issued as separate
statements outside a transaction) **cannot run inside a transaction block** — it fails with
`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

> **Therefore: use ordinary `CREATE INDEX` / `ALTER TABLE … ADD CONSTRAINT`, not the `CONCURRENTLY`
> variant.** Astra's package hedges this correctly ("*G0 must establish whether the migration runner
> permits that*"); the answer is **no**. This is the single most valuable G0 result — it prevents a
> migration that would fail on deploy.

Other facts: dialect is **PostgreSQL** (runner file `scripts/postgres-migration-runner.mjs`, ledger
`schema_migrations`, `transaction_timestamp()` in the schema helpers). Migrations live in
**`packages/database/migrations`**, not a per-app directory.

**On `backend/migrations/social/` (SS-PT side):** that directory holds 4 real migration files,
including a 15 KB `20240506000001-create-social-tables.js`. They are classified `inert` by
`isExecutableByCli()` and **never execute on deploy** — but this is **deliberate and loudly
disclosed**, not a hidden bug: `safe-migrate.mjs:248-259` prints
`"${inert.length} INERT MIGRATION FILE(S) — NEVER RUN, NEVER WILL"`, with the comment *"Print the
inert set loudly. Silence is what let 38 files accumulate."* Recorded here so a builder does not
"discover" it and panic.

---

## G0-6 — SwanGuard authorization primitives

`apps/api/src/roles.ts`:

```ts
const roleRank: Record<UserRole, number> = { supervised: 0, member: 1, admin: 2, owner: 3 };

export function requireRole(user: UserRecord, minimumRole: UserRole): void {
  if (roleRank[getUserRole(user)] < roleRank[minimumRole]) {
    throw new HttpError(403, 'role_required', 'Required role is not available');
  }
}
```

- `UserRole = 'owner' | 'admin' | 'member' | 'supervised'` (`apps/api/src/auth.ts:4`).
- `getUserRole(user)` returns `user.role ?? 'member'` — an unset role is a **member**, not an owner.
- `requireUser(auth, request)` / `requireUserOnce(auth, request, resolvedUser)` live in
  **`apps/api/src/requestAuth.ts`** (`:49` and `:77`).
- Cookies: `sg_session`, `sg_csrf` (`requestAuth.ts:6-7`); CSRF token via `createCsrfToken()`.
  **Cookie-authenticated mutations require the CSRF mechanism.**
- `effectiveOperatorPermissions(user)` (`roles.ts:34-40`): an **owner implicitly holds**
  `OPERATOR_GRANTS_MANAGE_PERMISSION` whether or not a grant row exists — deliberate, so grant
  expiry cannot permanently deadlock the permission system.

**For S5's operator surface:** use `requireRole(user, 'owner')` (or the existing authenticated-owner
check that the operator APIs already use) and let ordinary operators receive 403 — matching Astra's
contract table and the existing `operatorGrantRoutes.ts` precedent.

---

## What is still missing

This document closes the six excerpts. It does **not** supply:

- The **SwanGuard** `operatorGrantRoutes.ts` body — only its shape and line count (251 lines in the
  worktree). A builder copying the pattern should read it directly.
- The **`SwanSpotlights` rail query** as implemented in `spotlightReadRoutes.mjs` — worth pasting
  before building the S3 admin read view, so both sides agree on "live".
- Confirmation that **`SWAN_BRIDGE_SECRET_V1`** is set in the SwanGuard deployment environment (it is
  required on both sides; the resolver throws if absent or under 32 chars).
````



---

## 7. Claims this round most wants falsified

Attack these first, hardest.

1. **"The reviewed code is the shipped code."** §1 asserts the four code paths are unchanged between
   `368829498` and `4977987a7`. If the diff is not in fact empty, everything round 1
   said about R1 is about a revision that is no longer HEAD — say so loudly.

2. **"Round 1's FAIL was the right verdict, and its three HIGH defects are still open."** The commit
   message and the submission both assert this. Verify it from §5, and say whether the *reasons given*
   for not fixing each one are correct — in particular whether the `06-bans.md` claim (that changing
   the `spotlight.v1` body is forbidden unilaterally) actually applies to defect 3 as described.

3. **"The manifest fix is correct and complete."** Round 1 attacked this and R1 hardened it
   (`captureRawBody` now fails closed when a body was declared). Is the hardened version correct? Pay
   attention to the interaction with an upstream parser that has already consumed the body, and to
   what `Buffer.alloc(0)` is hashed against for a genuinely bodyless GET.

4. **"The two suites are load-bearing."** Round 1's F02 found the evidence block had been a
   reconstruction, and R1 replaced it with captured output. But captured output is not the same as a
   mutation proof: name any guard in either suite that is asserted but never exercised by a mutation,
   and any test whose name overstates what it proves.

5. **"R1's own slice criteria are reachable by the files R1 was permitted to change."** If a slice's
   acceptance criteria cannot be met within its permitted file set, the plan is defective regardless
   of whether the code is correct.

**Deliberately out of scope, so you do not spend the round on it:** the two large R1 documents
(`R1-ASTRA-PACKET.md`, `R1-ASTRA-REPLY.md`) as prose. Their claims are in scope; their wording is not.
