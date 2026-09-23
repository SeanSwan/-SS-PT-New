# R1 REVIEW — ROUND 5 PACKET — the remediation revision, AS COMMITTED

## §0. Read this first

**Mandate:** Mega Blueprint. PART A is the deliverable. This is an adversarial review of
SHIPPED code, not a design consultation.

**This is round 5 of a linked chain, not a fresh review.**

| Round | Reviewer | Reviewed | Verdict | Filed at |
|---|---|---|---|---|
| 1 | astra | R1 as a *proposed* change set (dirty tree) | FAIL 0/6/9/0 | `2026-09-20-025023-social-bridge-completion-r1-correctness.md` |
| 2 | astra | R1 **as committed** (`4977987a7`) | FAIL 0/6/15/0 | `2026-09-20-171502-social-bridge-completion-r1-correctness.md` |
| 3 | workbuddy / deepseek-v4.1-flash | the **uncommitted** SSRF / href delta | DEFECTS-FOUND 0/2/1/2 | `2026-09-20-171602-social-bridge-image-rehost-ssrf-hardening-and.md` |
| 4 | workbuddy / deepseek-v4.1-flash | the round-2 HIGH remediation, **uncommitted worktree** | DEFECTS-FOUND 0/2/2/3 | `2026-09-20-172308-social-bridge-round-2-high-remediation-verified.md` |
| **5 (this)** | **astra** | **the remediation commit `b4ea7968f86df614a6eda5ec5de48f4f39722c51`** | **yours to decide** | — |

**Why this round exists at all.** Rounds 3 and 4 reviewed the remediation in the **working tree**,
which is not a revision — the tree carries over 1,200 dirty paths belonging to several workstreams.
Round 4 concluded that all four round-2 HIGH code findings are genuinely fixed, verified by
execution (72/72 tests). That conclusion has never been tested **against a commit**, and no Astra
review has looked at the remediation at all.

**Your job, per Rule 86:** do not re-derive rounds 1–4. **Test round 4's verification.** Round 4 is
reproduced verbatim in §2. Its central claim — "the four round-2 HIGH code findings are genuinely
fixed" — is the thing to falsify. A finding that round 4 called fixed but which only *looks* fixed
is the highest-value thing you can produce this round; a finding you can confirm closed should be
marked closed with the code that closes it.

**Environment limits reported in round 2 — read them, then retry anyway.** In round 2 Node and Bash
returned *"Access is denied"*, so tests and mutations were BLOCKED rather than passed. Rounds 3 and 4
had execution. If execution is available to you, **running the suites is worth more than any amount
of reading** — the remediation is a concurrency claim, and concurrency claims are what reading cannot
settle. If it is still denied, say so plainly and mark those items BLOCKED. Do not report a read-only
session as a clean pass.

**Do not trust the commit message.** It was written before this round. Its author corrected two
claims that round 2 refuted; §5 claim 7 tells you which, and asks you to test the correction rather
than accept it. Treat the message as a claim to test, not as context.

---

## §1. The change under review

- **Revision:** `b4ea7968f86df614a6eda5ec5de48f4f39722c51`  (parent `93733ed52a2dd386d787180a675df607daba72bd`)
- **HEAD at packet build:** `b4ea7968f86df614a6eda5ec5de48f4f39722c51`
- **Round-2 target:** `4977987a7` — ancestor of this revision: `NO`
- **Commit subject:** fix(bridge): close R1's D1/D2/D3 — atomic revision apply, transactional quota, validated persistence
- **Author / date:** SeanSwan <25750267+SeanSwan@users.noreply.github.com>  Sun Sep 20 18:06:05 2026 -0700

### §1.1 Commit stat

```
b4ea7968f86df614a6eda5ec5de48f4f39722c51
SeanSwan
Sun Sep 20 18:06:05 2026 -0700

fix(bridge): close R1's D1/D2/D3 — atomic revision apply, transactional quota, validated persistence

Astra's Mega Blueprint review of the R1 packet returned FAIL 0/6/9/0. Three of its six HIGH
findings were adjudicated CONFIRMED against the shipped code and left unfixed, because each
sat outside R1's four permitted paths. 05-slices.md:116 gates R2 on checkpoint R1, so closing
these IS the R1 work.

D1 (F06) — a delayed older revision could regress a newer one.
  bridgeIngestRoutes.mjs read the row, compared `existing.revision >= revision`, awaited the
  image re-host, then called `existing.update(values)`. The guard ran BEFORE the await and the
  write was unconditional, so the comparison was already stale when it mattered. The predicate
  now lives in the write — `UPDATE ... WHERE itemId = ? AND revision < ?` — evaluated by the
  database, so a concurrent newer revision cannot be regressed. A concurrent INSERT collides on
  the primary key and RETRIES the conditional apply rather than assuming it lost; assuming that
  would silently drop a legitimately newer revision.
  Ban #19: "do not remove tombstones or apply stale revisions over newer state."

D2 (F05) — the daily cap could be exceeded.
  coachSignalRoutes.mjs did `count` then `create` with no transaction, so two concurrent
  requests for distinct posts could both observe 4 and both insert — six signals against a cap
  of five. Count and insert now share one transaction, preceded by a per-coach PostgreSQL
  advisory lock taken inside it. Ban #42 forbids an in-memory-only quota, which is why this is a
  database lock rather than a local mutex.

D3 (F07) — validation and persistence disagreed. OPERATOR-GATED, ban #10.
  validateSpotlightPayload bounded `itemId` and then returned only `{ ok: true }`, so the
  handler stored the RAW `req.body.itemId`. `revision` had no upper bound against an INTEGER
  column, so an out-of-range value passed validation and 500'd on insert. `retracted` was
  truthiness-tested in the image branch but strict-compared for storage, so "false" stored false
  while skipping the image. The validator now returns the normalized values and the handler
  persists those.

Also closed: F10, in the suite it named. tests/api/swanBridgeIngest.test.mjs stubbed
r2StorageService.mjs for `uploadPhoto`, but the route imports that from photoStorageService.mjs
and the older module does not export it — so `mockUploadPhoto` NEVER FIRED. The suite's image
assertion only required `imageUrl` to be null, which the real path also produced: the request
used `swanguard.example`, a reserved TLD that cannot resolve, so the fetch died at DNS
resolution in validateSpotlightImageUrl and never reached an upload. The assertion passed
without exercising the branch it named. The specifier is corrected, the decode is now stubbed
to succeed so the failure under test is the upload's rather than DNS's, and the case asserts
`mockUploadPhoto` was called once.

Evidence
  14 suites / 181 tests green, including tests/unit/esmNodeLoadable.test.mjs, which imports the
  route under plain node rather than through Vite's transform.
  New cases that fail against the old code: a revision that loses the race AFTER the read (the
  interleaving F02 said the old suite never injected); a lost primary-key race that must retry
  rather than no-op; the advisory lock taken before the count; and the three D3 disagreements.
  Full-suite context, so the 181 is not read as a clean bill for the repo: 6331 passed / 26
  failed of 6357 across 849 files. The dominant signature is the sandbox's fail-closed
  safe-delete wrapper (`[safe-delete] ... genie-trash ... ETIMEDOUT`, x9), which is
  environment, not product code. Four dispatcher-contract AssertionErrors in unrelated suites
  are NOT attributed and are NOT claimed as pre-existing.

Two extractions, both forced by ban #50 (no source file reaches 300 lines)
  bridgeIngestRoutes.mjs was 281 lines and D1/D3 pushed it to 306. The atomic apply moved to
  services/bridgeSpotlightRevisionApply.mjs and the image re-host to
  services/bridgeSpotlightImageRehost.mjs, both unchanged in behaviour; the route is now 261.
  Named per the StudioSpotlight*/BridgeSpotlight* rule.

What this does NOT establish
  That PostgreSQL honours the predicate under real concurrency, or that the advisory lock
  serializes two live sessions. Both need a live database; the suites mock the model, so they
  prove the predicate is constructed and the branch is taken. Recorded as [UNKNOWN], not
  asserted.

Review state
  Round 2 completed at 2026-09-20T17:15:02-07:00 against 4977987a7 and is filed under Rule 86
  as Z:\HostileReviews\2026-09-20-171502-social-bridge-completion-r1-correctness.md —
  DEFECTS-FOUND, 0 critical / 6 high / 15 medium / 0 low, 8 unproven. It supersedes round 1
  (2026-09-20-025023-social-bridge-completion-r1-correctness), and the supersede link is
  reciprocal in both files. This commit is the remediation; round 3 tests whether it actually
  closes F05/F06/F07/F10 rather than appearing to.

Message provenance
  This message corrects the draft held at .git/R1B-COMMIT-MSG.txt. That draft stated the real
  upload "failed on missing credentials" (it failed earlier, at DNS) and that round 2 was
  "IN FLIGHT, dispatched 16:55:05 PT" (round 2 had completed and been filed by 17:15:02). The
  draft's commit never landed, so the two claims are corrected here rather than as an erratum
  against a landed commit.


 backend/routes/bridge/bridgeIngestRoutes.mjs       | 120 +++++++---------
 backend/routes/social/coachSignalRoutes.mjs        |  38 +++--
 backend/services/bridgeSpotlightImageRehost.mjs    |  81 +++++++++++
 backend/services/bridgeSpotlightRevisionApply.mjs  |  74 ++++++++++
 backend/tests/api/swanBridgeIngest.test.mjs        |  76 ++++++++--
 .../bridgeSpotlightOrdering.contract.test.mjs      | 158 ++++++++++++++++-----
 .../tests/coachSignalIntegrity.contract.test.mjs   |  82 ++++++++++-
 7 files changed, 504 insertions(+), 125 deletions(-)
```

### §1.2 The commit message verbatim (a claim to test — see §5 claim 7)

```
fix(bridge): close R1's D1/D2/D3 — atomic revision apply, transactional quota, validated persistence

Astra's Mega Blueprint review of the R1 packet returned FAIL 0/6/9/0. Three of its six HIGH
findings were adjudicated CONFIRMED against the shipped code and left unfixed, because each
sat outside R1's four permitted paths. 05-slices.md:116 gates R2 on checkpoint R1, so closing
these IS the R1 work.

D1 (F06) — a delayed older revision could regress a newer one.
  bridgeIngestRoutes.mjs read the row, compared `existing.revision >= revision`, awaited the
  image re-host, then called `existing.update(values)`. The guard ran BEFORE the await and the
  write was unconditional, so the comparison was already stale when it mattered. The predicate
  now lives in the write — `UPDATE ... WHERE itemId = ? AND revision < ?` — evaluated by the
  database, so a concurrent newer revision cannot be regressed. A concurrent INSERT collides on
  the primary key and RETRIES the conditional apply rather than assuming it lost; assuming that
  would silently drop a legitimately newer revision.
  Ban #19: "do not remove tombstones or apply stale revisions over newer state."

D2 (F05) — the daily cap could be exceeded.
  coachSignalRoutes.mjs did `count` then `create` with no transaction, so two concurrent
  requests for distinct posts could both observe 4 and both insert — six signals against a cap
  of five. Count and insert now share one transaction, preceded by a per-coach PostgreSQL
  advisory lock taken inside it. Ban #42 forbids an in-memory-only quota, which is why this is a
  database lock rather than a local mutex.

D3 (F07) — validation and persistence disagreed. OPERATOR-GATED, ban #10.
  validateSpotlightPayload bounded `itemId` and then returned only `{ ok: true }`, so the
  handler stored the RAW `req.body.itemId`. `revision` had no upper bound against an INTEGER
  column, so an out-of-range value passed validation and 500'd on insert. `retracted` was
  truthiness-tested in the image branch but strict-compared for storage, so "false" stored false
  while skipping the image. The validator now returns the normalized values and the handler
  persists those.

Also closed: F10, in the suite it named. tests/api/swanBridgeIngest.test.mjs stubbed
r2StorageService.mjs for `uploadPhoto`, but the route imports that from photoStorageService.mjs
and the older module does not export it — so `mockUploadPhoto` NEVER FIRED. The suite's image
assertion only required `imageUrl` to be null, which the real path also produced: the request
used `swanguard.example`, a reserved TLD that cannot resolve, so the fetch died at DNS
resolution in validateSpotlightImageUrl and never reached an upload. The assertion passed
without exercising the branch it named. The specifier is corrected, the decode is now stubbed
to succeed so the failure under test is the upload's rather than DNS's, and the case asserts
`mockUploadPhoto` was called once.

Evidence
  14 suites / 181 tests green, including tests/unit/esmNodeLoadable.test.mjs, which imports the
  route under plain node rather than through Vite's transform.
  New cases that fail against the old code: a revision that loses the race AFTER the read (the
  interleaving F02 said the old suite never injected); a lost primary-key race that must retry
  rather than no-op; the advisory lock taken before the count; and the three D3 disagreements.
  Full-suite context, so the 181 is not read as a clean bill for the repo: 6331 passed / 26
  failed of 6357 across 849 files. The dominant signature is the sandbox's fail-closed
  safe-delete wrapper (`[safe-delete] ... genie-trash ... ETIMEDOUT`, x9), which is
  environment, not product code. Four dispatcher-contract AssertionErrors in unrelated suites
  are NOT attributed and are NOT claimed as pre-existing.

Two extractions, both forced by ban #50 (no source file reaches 300 lines)
  bridgeIngestRoutes.mjs was 281 lines and D1/D3 pushed it to 306. The atomic apply moved to
  services/bridgeSpotlightRevisionApply.mjs and the image re-host to
  services/bridgeSpotlightImageRehost.mjs, both unchanged in behaviour; the route is now 261.
  Named per the StudioSpotlight*/BridgeSpotlight* rule.

What this does NOT establish
  That PostgreSQL honours the predicate under real concurrency, or that the advisory lock
  serializes two live sessions. Both need a live database; the suites mock the model, so they
  prove the predicate is constructed and the branch is taken. Recorded as [UNKNOWN], not
  asserted.

Review state
  Round 2 completed at 2026-09-20T17:15:02-07:00 against 4977987a7 and is filed under Rule 86
  as Z:\HostileReviews\2026-09-20-171502-social-bridge-completion-r1-correctness.md —
  DEFECTS-FOUND, 0 critical / 6 high / 15 medium / 0 low, 8 unproven. It supersedes round 1
  (2026-09-20-025023-social-bridge-completion-r1-correctness), and the supersede link is
  reciprocal in both files. This commit is the remediation; round 3 tests whether it actually
  closes F05/F06/F07/F10 rather than appearing to.

Message provenance
  This message corrects the draft held at .git/R1B-COMMIT-MSG.txt. That draft stated the real
  upload "failed on missing credentials" (it failed earlier, at DNS) and that round 2 was
  "IN FLIGHT, dispatched 16:55:05 PT" (round 2 had completed and been filed by 17:15:02). The
  draft's commit never landed, so the two claims are corrected here rather than as an erratum
  against a landed commit.
```

### §1.3 Full diff of the remediation paths, parent → this commit

```diff
diff --git a/backend/routes/bridge/bridgeIngestRoutes.mjs b/backend/routes/bridge/bridgeIngestRoutes.mjs
index fb22a31f5..b720198d0 100644
--- a/backend/routes/bridge/bridgeIngestRoutes.mjs
+++ b/backend/routes/bridge/bridgeIngestRoutes.mjs
@@ -3,7 +3,8 @@ import { Op } from 'sequelize';
 import logger from '../../utils/logger.mjs';
 import { bannedTerms } from '../social/feedEnrichment.mjs';
 import { verifyBridgeRequest } from '../../services/swanBridgeSignature.mjs';
-import { fetchAndDecodeSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { applyBridgeSpotlightRevision } from '../../services/bridgeSpotlightRevisionApply.mjs';
+import { rehostBridgeSpotlightImage } from '../../services/bridgeSpotlightImageRehost.mjs';
 
 /**
  * SwanGuard → SwanStudios Spotlight ingest.
@@ -56,6 +57,19 @@ export const findBannedTerm = (fields) => {
   return bannedTerms.find((term) => haystack.includes(term)) ?? null;
 };
 
+// `revision` is stored in an INTEGER column (SwanSpotlight.mjs:23). An out-of-range value
+// passed validation and then failed at the column, so the bound is part of the contract.
+export const SPOTLIGHT_MAX_REVISION = 2147483647;
+
+/**
+ * Validate AND normalize. It returns the exact values the handler must persist, so validation
+ * and persistence cannot disagree (hostile review D3 / F07).
+ *
+ * It used to return only `{ ok: true }`. Three consequences: `itemId` was bounded here but the
+ * handler stored the RAW `req.body.itemId`; `revision` had no upper bound; and `retracted` was
+ * truthiness-tested in the image branch but strict-compared for storage, so `retracted:"false"`
+ * stored `false` while skipping the image. Coercing once, here, removes all three.
+ */
 export const validateSpotlightPayload = (body) => {
   if (!body || typeof body !== 'object' || Array.isArray(body)) {
     return { ok: false, reason: 'Body must be a JSON object.' };
@@ -65,9 +79,12 @@ export const validateSpotlightPayload = (body) => {
   if (!Number.isInteger(body.revision) || body.revision < 1) {
     return { ok: false, reason: 'revision must be a positive integer.' };
   }
+  if (body.revision > SPOTLIGHT_MAX_REVISION) {
+    return { ok: false, reason: `revision must be at most ${SPOTLIGHT_MAX_REVISION}.` };
+  }
   const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
   if (!headline) return { ok: false, reason: 'headline is required.' };
-  return { ok: true };
+  return { ok: true, value: { itemId, revision: body.revision, headline, retracted: body.retracted === true } };
 };
 
 const toDate = (value) => {
@@ -96,8 +113,8 @@ router.post('/spotlight', spotlightJsonParser, async (req, res) => {
     return res.status(422).json({ success: false, message: validation.reason });
   }
 
-  const { itemId, revision, retracted = false } = req.body;
-  const headline = str(req.body.headline, SPOTLIGHT_MAX_HEADLINE);
+  // The VALIDATED, normalized values — never the raw body (D3).
+  const { itemId, revision, headline, retracted } = validation.value;
   const dek = str(req.body.dek, SPOTLIGHT_MAX_DEK);
   const curatorNote = str(req.body.curatorNote, SPOTLIGHT_MAX_CURATOR_NOTE);
 
@@ -110,32 +127,30 @@ router.post('/spotlight', spotlightJsonParser, async (req, res) => {
 
   try {
     const SwanSpotlight = (await import('../../models/social/SwanSpotlight.mjs')).default;
-    const existing = await SwanSpotlight.findByPk(itemId);
-
-    // Idempotency is (itemId, revision): same revision = no-op, higher revision = upsert.
-    if (existing && existing.revision >= revision) {
-      return res.status(200).json({ success: true, noop: true, itemId, revision: existing.revision });
-    }
 
-    // Image re-host is best-effort by design — never fail the ingest over a picture.
-    let imageUrl = existing?.imageUrl ?? null;
-    const incomingImage = str(req.body.imageUrl, 2048);
-    if (incomingImage && !retracted) {
-      imageUrl = await rehostImage(incomingImage, itemId) ?? null;
-    }
+    // Read ONLY to preserve the stored image across a text-only or retracted revision. This is
+    // NOT the ordering guard — applyBridgeSpotlightRevision makes the database evaluate
+    // `revision < incoming` inside the write itself (D1 / ban #19).
+    const stored = await SwanSpotlight.findByPk(itemId, { attributes: ['imageUrl'] });
 
     const source = req.body.sourceAttribution && typeof req.body.sourceAttribution === 'object'
       ? req.body.sourceAttribution
       : {};
     const gate = req.body.gate && typeof req.body.gate === 'object' ? req.body.gate : {};
 
+    // Image re-host is best-effort by design — never fail the ingest over a picture. A revision
+    // that is about to carry an image starts at null, so a re-host failure leaves null and the
+    // card renders text-only (ban #37); a retraction or text-only revision keeps what is there.
+    const incomingImage = str(req.body.imageUrl, 2048);
+    const willRehost = Boolean(incomingImage) && !retracted;
+
     const values = {
       itemId,
       revision,
-      retracted: retracted === true,
+      retracted,
       headline,
       dek,
-      imageUrl,
+      imageUrl: willRehost ? null : (stored?.imageUrl ?? null),
       sourceName: str(source.name, 80),
       sourceUrl: str(source.url, 2048),
       curatorNote,
@@ -145,67 +160,32 @@ router.post('/spotlight', spotlightJsonParser, async (req, res) => {
       gateHash: str(gate.checklistHash, 64)
     };
 
-    if (existing) {
-      await existing.update(values);
-    } else {
-      await SwanSpotlight.create(values);
+    const outcome = await applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision, values });
+    if (!outcome.applied) {
+      // A same-or-older revision: nothing was written, and no image was fetched for it.
+      return res.status(200).json({ success: true, noop: true, itemId, revision: outcome.storedRevision });
+    }
+
+    // Attach the image ONLY now that this revision is the accepted, current one. The WHERE
+    // clause re-checks the revision and the tombstone at attach time, so a newer revision or a
+    // concurrent retraction cannot be handed a stale picture.
+    if (willRehost) {
+      const rehosted = await rehostBridgeSpotlightImage(incomingImage, itemId);
+      if (rehosted) {
+        await SwanSpotlight.update({ imageUrl: rehosted }, { where: { itemId, revision, retracted: false } });
+      }
     }
 
     logger.info(`Spotlight ${retracted ? 'retracted' : 'stored'}: ${itemId}@${revision}`);
-    return res.status(200).json({ success: true, itemId, revision, retracted: values.retracted });
+    return res.status(200).json({ success: true, itemId, revision, retracted });
   } catch (error) {
     logger.error('Spotlight ingest failed:', error?.message);
     return res.status(500).json({ success: false, message: 'Server error during ingest.' });
   }
 });
 
-/**
- * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
- * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
- * never hot-link SwanGuard's URL in a production render path).
- *
- * HARDENED 2026-09-19, and two real defects were fixed here rather than one.
- *
- * (a) SSRF. The old version checked the protocol of the URL it was HANDED and then
- *     called fetch with defaults — which follows redirects. A host returning
- *     `302 → http://169.254.169.254/...` therefore defeated the check completely,
- *     because the protocol was only ever inspected on the first hop. It also applied
- *     its size cap AFTER `arrayBuffer()` had buffered the entire body, so the cap
- *     bounded what was stored, not what was consumed. `fetchAndDecodeSpotlightImage`
- *     now owns validation, the no-redirect fetch, the streamed cap, and the decode.
- *
- * (b) A wrong import. `uploadPhoto` was destructured from `r2StorageService.mjs`,
- *     which does not export it — it lives in `photoStorageService.mjs`. Every call
- *     threw `TypeError: uploadPhoto is not a function`, and this function's own
- *     catch reported it as a non-fatal degradation and returned null. So image
- *     re-hosting has never once succeeded, and the design ("a broken image degrades
- *     to a text-only card") is precisely what made that invisible. Verified by
- *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
- */
-async function rehostImage(url, itemId) {
-  try {
-    const decoded = await fetchAndDecodeSpotlightImage(url);
-    if (!decoded.ok) {
-      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
-      return null;
-    }
-
-    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
-    // bytes itself, deriving the stored extension and Content-Type from them rather than
-    // from anything this call declares.
-    const { uploadPhoto } = await import('../../services/photoStorageService.mjs');
-    const result = await uploadPhoto(decoded.buffer, {
-      userId: 0,
-      category: 'swan-spotlight',
-      originalFilename: `${itemId}.${decoded.ext}`,
-      contentType: decoded.contentType
-    });
-    return result?.url ?? null;
-  } catch (error) {
-    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
-    return null;
-  }
-}
+// Image re-host — its SSRF hardening, the wrong-import defect, and why it moved out of this
+// file — lives in services/bridgeSpotlightImageRehost.mjs. Read that header before changing it.
 
 /**
  * Raw-body capture for the bodyless reconciliation GET.
diff --git a/backend/routes/social/coachSignalRoutes.mjs b/backend/routes/social/coachSignalRoutes.mjs
index e70c73bc6..4f909c501 100644
--- a/backend/routes/social/coachSignalRoutes.mjs
+++ b/backend/routes/social/coachSignalRoutes.mjs
@@ -122,22 +122,42 @@ router.post('/', protect, async (req, res) => {
       return res.status(409).json({ success: false, message: 'You already signaled this post.' });
     }
 
-    const sentToday = await CoachSignal.count({
-      where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
+    // Quota admission is serialized PER COACH, with the count and the insert in ONE
+    // transaction (hostile review D2 / F05). Counting and then inserting as two statements let
+    // two concurrent requests for distinct posts both observe 4 and both insert — six signals
+    // against a cap of five. The lock is a PostgreSQL advisory lock taken INSIDE the
+    // transaction, so it is released on commit or rollback and holds across processes:
+    // `06-bans.md` #42 forbids an in-memory-only quota, which is why this is not a local mutex.
+    const sequelize = CoachSignal.sequelize;
+    const admission = await sequelize.transaction(async (transaction) => {
+      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
+        replacements: { key: `coach-signal-quota:${req.user.id}` },
+        transaction,
+      });
+
+      const sentToday = await CoachSignal.count({
+        where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
+        transaction,
+      });
+      if (sentToday >= DAILY_SIGNAL_CAP) return { capped: true };
+
+      const created = await CoachSignal.create({
+        coachId: req.user.id,
+        memberId: post.userId,
+        postId: parsedPostId,
+        note: trimmedNote || null,
+      }, { transaction });
+      return { capped: false, signal: created };
     });
-    if (sentToday >= DAILY_SIGNAL_CAP) {
+
+    if (admission.capped) {
       return res.status(429).json({
         success: false,
         message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.`,
       });
     }
 
-    const signal = await CoachSignal.create({
-      coachId: req.user.id,
-      memberId: post.userId,
-      postId: parsedPostId,
-      note: trimmedNote || null,
-    });
+    const signal = admission.signal;
 
     try {
       const coach = await User.findByPk(req.user.id, {
diff --git a/backend/services/bridgeSpotlightImageRehost.mjs b/backend/services/bridgeSpotlightImageRehost.mjs
new file mode 100644
index 000000000..75f04c642
--- /dev/null
+++ b/backend/services/bridgeSpotlightImageRehost.mjs
@@ -0,0 +1,81 @@
+import logger from '../utils/logger.mjs';
+import { fetchAndDecodeSpotlightImage } from './spotlightImageFetch.mjs';
+
+/**
+ * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
+ * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
+ * never hot-link SwanGuard's URL in a production render path).
+ *
+ * MOVED HERE 2026-09-20 from `routes/bridge/bridgeIngestRoutes.mjs`, unchanged. The move was
+ * forced, not opportunistic: R1's D1/D3 remediation pushed that route to 306 lines against
+ * `06-bans.md` #50 ("no source file reaches 300 lines"), and this is the only self-contained
+ * block in it that is I/O rather than routing. No behaviour changed in the move.
+ *
+ * HARDENED 2026-09-19, and two real defects were fixed here rather than one.
+ *
+ * (a) SSRF. The old version checked the protocol of the URL it was HANDED and then
+ *     called fetch with defaults — which follows redirects. A host returning
+ *     `302 → http://169.254.169.254/...` therefore defeated the check completely,
+ *     because the protocol was only ever inspected on the first hop. It also applied
+ *     its size cap AFTER `arrayBuffer()` had buffered the entire body, so the cap
+ *     bounded what was stored, not what was consumed. `fetchAndDecodeSpotlightImage`
+ *     now owns validation, the no-redirect fetch, the streamed cap, and the decode.
+ *
+ * (b) A wrong import. `uploadPhoto` was destructured from `r2StorageService.mjs`,
+ *     which does not export it — it lives in `photoStorageService.mjs`. Every call
+ *     threw `TypeError: uploadPhoto is not a function`, and this function's own
+ *     catch reported it as a non-fatal degradation and returned null. So image
+ *     re-hosting has never once succeeded, and the design ("a broken image degrades
+ *     to a text-only card") is precisely what made that invisible. Verified by
+ *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
+ *
+ * (c) The storage discriminator was discarded. Fixed 2026-09-20 (hostile review D7 / R2-02).
+ *     `uploadPhoto` catches an R2 failure and falls through to local disk, returning
+ *     `storage: 'local'` — and this function returned `result.url` regardless, so a disk path was
+ *     stored as a completed R2 re-host. Only `storage === 'r2'` is accepted now. Note that (b) and
+ *     (c) hid behind the SAME mechanism: a total failure and a partial one were both just "no
+ *     image", which is why the failure contract kept them invisible.
+ */
+export async function rehostBridgeSpotlightImage(url, itemId) {
+  try {
+    const decoded = await fetchAndDecodeSpotlightImage(url);
+    if (!decoded.ok) {
+      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
+      return null;
+    }
+
+    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
+    // bytes itself, deriving the stored extension and Content-Type from them rather than
+    // from anything this call declares.
+    const { uploadPhoto } = await import('./photoStorageService.mjs');
+    const result = await uploadPhoto(decoded.buffer, {
+      userId: 0,
+      category: 'swan-spotlight',
+      originalFilename: `${itemId}.${decoded.ext}`,
+      contentType: decoded.contentType
+    });
+
+    // R2 ONLY — the storage discriminator is the answer, not the presence of a URL.
+    //
+    // `uploadPhoto` catches an R2 failure and SILENTLY falls through to local disk
+    // (`photoStorageService.mjs:180-184`), returning `{ url, storage: 'local' }` at `:197`.
+    // The old `return result?.url ?? null` therefore stored a disk path as a COMPLETED re-host,
+    // which is the exact claim ban #4 exists to prevent — and the path it stored would be served
+    // from a filesystem that does not survive a redeploy, so the card would render a broken image
+    // on the next deploy while the row still asserted a successful re-host.
+    //
+    // The discriminator already existed and was being thrown away (hostile review D7 / R2-02).
+    // Degrading to `null` is the correct outcome: ban #37 says a broken image becomes a text-only
+    // card, and this is a broken image in the only sense that matters — we do not have it.
+    if (result?.storage !== 'r2') {
+      logger.warn(
+        `Spotlight image for ${itemId} not re-hosted: storage='${result?.storage ?? 'none'}' (R2 required)`
+      );
+      return null;
+    }
+    return result.url;
+  } catch (error) {
+    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
+    return null;
+  }
+}
diff --git a/backend/services/bridgeSpotlightRevisionApply.mjs b/backend/services/bridgeSpotlightRevisionApply.mjs
new file mode 100644
index 000000000..ad9559c87
--- /dev/null
+++ b/backend/services/bridgeSpotlightRevisionApply.mjs
@@ -0,0 +1,74 @@
+import { Op } from 'sequelize';
+
+/**
+ * Atomic highest-revision apply for the SwanGuard -> SwanStudios Spotlight bridge.
+ *
+ * WHY THIS MODULE EXISTS (hostile review R1, finding D1 / F06, 2026-09-20).
+ * The route used to read the row, compare `existing.revision >= revision`, `await` an image
+ * re-host, and then call `existing.update(values)`. Two defects lived in that gap:
+ *
+ *   1. The guard was evaluated BEFORE the await, so `existing` was a stale in-memory
+ *      instance by the time it was written. A delayed older revision could therefore
+ *      overwrite a newer one.
+ *   2. `update()` was unconditional. Nothing re-checked the revision at write time, so a
+ *      late retraction could be overwritten by an older non-retracted delivery.
+ *
+ * `06-bans.md` #19 states the invariant this module enforces: *do not remove tombstones or
+ * apply stale revisions over newer state.*
+ *
+ * The fix is to make the DATABASE evaluate the predicate, inside the write statement:
+ *
+ *   UPDATE "SwanSpotlights" SET ... WHERE "itemId" = ? AND "revision" < ?
+ *
+ * A concurrent newer revision that lands between the caller's read and this write cannot be
+ * regressed, because the comparison happens atomically with the write. `itemId` is the
+ * primary key, so a concurrent INSERT collides there and is handled explicitly below rather
+ * than surfacing as a 500.
+ *
+ * SCOPE OF THE CLAIM — what this does and does not establish.
+ * `SwanSpotlight.update()` compiles to a single SQL statement, so the conditional apply is
+ * atomic per row. This module does NOT claim isolation across statements: the caller still
+ * reads the row first, to PRESERVE the stored `imageUrl` across a text-only revision. That
+ * read is not the guard — the guard is the WHERE clause — so a stale read can only produce a
+ * stale `imageUrl` on a write the database then rejects anyway.
+ *
+ * NOT established here, and not claimed: that two concurrent applies on a live PostgreSQL
+ * serialize correctly. That needs a real database; the contract suite mocks the model, so it
+ * proves the predicate is constructed and the branch is taken, never that Postgres honours
+ * it. Recorded as `[UNKNOWN]` in the round-3 packet rather than asserted.
+ */
+
+/**
+ * Apply `values` only if `revision` is strictly newer than the stored revision.
+ *
+ * @returns {Promise<{applied: boolean, created?: boolean, storedRevision?: number}>}
+ *   `applied: false` means a newer-or-equal revision is already stored and NOTHING was
+ *   written. `storedRevision` is the revision that won, so the caller can echo it.
+ */
+export const applyBridgeSpotlightRevision = async ({ SwanSpotlight, itemId, revision, values }) => {
+  const conditionalUpdate = () => SwanSpotlight.update(values, {
+    where: { itemId, revision: { [Op.lt]: revision } }
+  });
+
+  const [applied] = await conditionalUpdate();
+  if (applied > 0) return { applied: true, created: false };
+
+  // Nothing matched. Either no row exists yet, or the stored revision is already >= ours —
+  // and those two cases need opposite answers, so distinguish them with a read.
+  const current = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
+  if (current) return { applied: false, storedRevision: current.revision };
+
+  try {
+    await SwanSpotlight.create({ ...values, itemId, revision });
+    return { applied: true, created: true };
+  } catch (error) {
+    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
+    // A concurrent INSERT won the primary-key race. Our revision may still be the newer of
+    // the two, so re-run the conditional apply rather than treating the loss as a no-op —
+    // assuming the loss means "superseded" would silently drop a legitimately newer revision.
+    const [retried] = await conditionalUpdate();
+    if (retried > 0) return { applied: true, created: false };
+    const landed = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
+    return { applied: false, storedRevision: landed?.revision ?? revision };
+  }
+};
diff --git a/backend/tests/api/swanBridgeIngest.test.mjs b/backend/tests/api/swanBridgeIngest.test.mjs
index 37913779a..12fd1b83a 100644
--- a/backend/tests/api/swanBridgeIngest.test.mjs
+++ b/backend/tests/api/swanBridgeIngest.test.mjs
@@ -6,25 +6,52 @@
  * rule are all exercised end to end.
  *
  * The DB model and R2 are mocked — no network, no database.
+ *
+ * ── TWO CHANGES 2026-09-20, both required by R1's D1 remediation ─────────────────────
+ *
+ * 1. MOCK SHAPE. The route no longer reads the row and calls an INSTANCE `update()`. It calls
+ *    the static `SwanSpotlight.update(values, { where: { revision: { [Op.lt]: revision } } })`,
+ *    so `mockUpdate` replaces the per-test instance spy and resolves to Sequelize's
+ *    `[affectedCount]`.
+ *
+ * 2. MOCK SPECIFIER — this file was hostile review F10. It stubbed `r2StorageService.mjs` for
+ *    `uploadPhoto`, but the route imports that from `photoStorageService.mjs`; the old
+ *    `r2StorageService.mjs` does not export it. So `mockUploadPhoto` NEVER FIRED and the two
+ *    image assertions below passed only because the real upload failed on missing credentials.
+ *    They were passing for a reason unrelated to what they claimed to test. The specifier is
+ *    corrected here, which is what F10 asked for, so those two cases now exercise the mock.
  */
 import express from 'express';
 import request from 'supertest';
+import { Op } from 'sequelize';
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
 
-const { mockFindByPk, mockCreate, mockUploadPhoto } = vi.hoisted(() => ({
+const { mockFindByPk, mockUpdate, mockCreate, mockUploadPhoto, mockFetchDecode } = vi.hoisted(() => ({
   mockFindByPk: vi.fn(),
+  mockUpdate: vi.fn(),
   mockCreate: vi.fn(),
   mockUploadPhoto: vi.fn(),
+  mockFetchDecode: vi.fn(),
 }));
 
 vi.mock('../../models/social/SwanSpotlight.mjs', () => ({
-  default: { findByPk: mockFindByPk, create: mockCreate },
+  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate },
 }));
 
-vi.mock('../../services/r2StorageService.mjs', () => ({
+vi.mock('../../services/photoStorageService.mjs', () => ({
   uploadPhoto: mockUploadPhoto,
 }));
 
+// The fetch layer is mocked ONLY so one test can force a SUCCESSFUL decode — without that the
+// real fetch fails on DNS and `uploadPhoto` is never reached, which is how F10's assertions
+// managed to pass without exercising anything. The default implementation is the REAL one, so
+// every other case (notably the non-http protocol refusal) still exercises the shipped
+// validator rather than a stub that agrees with itself.
+vi.mock('../../services/spotlightImageFetch.mjs', () => ({
+  fetchAndDecodeSpotlightImage: mockFetchDecode,
+}));
+const actualFetch = await vi.importActual('../../services/spotlightImageFetch.mjs');
+
 const SECRET = 'test-swan-bridge-secret-value-0123456789';
 const { signPayload, buildCanonicalPayload } = await import('../../services/swanBridgeSignature.mjs');
 const { default: bridgeRouter } = await import('../../routes/bridge/bridgeIngestRoutes.mjs');
@@ -58,12 +85,19 @@ const post = async (payload, opts = {}) => {
     .send(raw);
 };
 
+/** The predicate the database is asked to evaluate — the D1 fix, seen from here. */
+const predicateOf = (call) => call[1]?.where?.revision?.[Op.lt];
+
 beforeEach(() => {
   process.env.SPOTLIGHT_ENABLED = 'true';
   process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
   mockFindByPk.mockReset().mockResolvedValue(null);
+  // Default: the conditional UPDATE matches nothing, so the create path runs.
+  mockUpdate.mockReset().mockResolvedValue([0]);
   mockCreate.mockReset().mockResolvedValue({});
   mockUploadPhoto.mockReset();
+  // Default to the REAL decoder; only the upload-failure test below overrides it.
+  mockFetchDecode.mockReset().mockImplementation(actualFetch.fetchAndDecodeSpotlightImage);
 });
 
 afterEach(() => {
@@ -180,49 +214,69 @@ describe('bridge ingest — validation and the positivity gate', () => {
 
 describe('bridge ingest — idempotency', () => {
   it('treats a re-delivered revision as a no-op', async () => {
-    mockFindByPk.mockResolvedValue({ revision: 3, imageUrl: null, update: vi.fn() });
+    mockFindByPk.mockResolvedValue({ revision: 3, imageUrl: null });
+    mockUpdate.mockResolvedValue([0]);
     const res = await post(body({ revision: 3 }));
     expect(res.status).toBe(200);
     expect(res.body.noop).toBe(true);
     expect(mockCreate).not.toHaveBeenCalled();
+    // The predicate was `revision < 3` — an equal revision is rejected by the database.
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(3);
   });
 
   it('treats an older revision as a no-op (out-of-order delivery)', async () => {
-    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null, update: vi.fn() });
+    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null });
+    mockUpdate.mockResolvedValue([0]);
     const res = await post(body({ revision: 2 }));
     expect(res.body.noop).toBe(true);
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
   });
 
   it('upserts when the revision is higher', async () => {
-    const update = vi.fn().mockResolvedValue(undefined);
-    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: null, update });
+    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: null });
+    mockUpdate.mockResolvedValue([1]);
     const res = await post(body({ revision: 4 }));
     expect(res.status).toBe(200);
-    expect(update).toHaveBeenCalledTimes(1);
+    expect(mockUpdate).toHaveBeenCalledTimes(1);
     expect(mockCreate).not.toHaveBeenCalled();
   });
 
   it('marks a retraction instead of deleting the row', async () => {
-    const update = vi.fn().mockResolvedValue(undefined);
-    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: 'https://r2/x.png', update });
+    mockFindByPk.mockResolvedValue({ revision: 1, imageUrl: 'https://r2/x.png' });
+    mockUpdate.mockResolvedValue([1]);
     const res = await post(body({ revision: 2, retracted: true }));
     expect(res.status).toBe(200);
-    expect(update.mock.calls[0][0].retracted).toBe(true);
+    expect(mockUpdate.mock.calls[0][0].retracted).toBe(true);
   });
 });
 
 describe('bridge ingest — image re-host is never fatal', () => {
   it('stores the item with a null image when the re-host fails', async () => {
+    // F10: this now actually exercises the upload mock. It used to pass because the real upload
+    // failed on missing credentials against a module the route never imported.
+    // The DECODE is forced to succeed so the failure under test is the UPLOAD's, not the
+    // fetch's — otherwise DNS fails first and `uploadPhoto` is never reached at all.
+    mockFetchDecode.mockResolvedValue({
+      ok: true,
+      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
+      ext: 'png',
+      contentType: 'image/png',
+    });
     mockUploadPhoto.mockRejectedValue(new Error('R2 down'));
+
     const res = await post(body({ imageUrl: 'https://swanguard.example/pic.png' }));
+
     expect(res.status).toBe(200);
     expect(mockCreate).toHaveBeenCalledTimes(1);
     expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
+    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
   });
 
   it('refuses to hot-link a non-http image URL', async () => {
     const res = await post(body({ imageUrl: 'javascript:alert(1)' }));
     expect(res.status).toBe(200);
     expect(mockCreate.mock.calls[0][0].imageUrl).toBeNull();
+    // Rejected before the uploader is ever reached — the fetch layer owns that check.
+    expect(mockUploadPhoto).not.toHaveBeenCalled();
   });
 });
diff --git a/backend/tests/bridgeSpotlightOrdering.contract.test.mjs b/backend/tests/bridgeSpotlightOrdering.contract.test.mjs
index 2d62aa100..a17591c02 100644
--- a/backend/tests/bridgeSpotlightOrdering.contract.test.mjs
+++ b/backend/tests/bridgeSpotlightOrdering.contract.test.mjs
@@ -11,16 +11,34 @@
  * ORDER, how a tombstone resists a late replay, and what breaks if the bridge loses its
  * private body parser.
  *
+ * ── CHANGED 2026-09-20 for R1's D1 remediation (hostile review F06) ──────────────────
+ * The route used to read the row, compare `existing.revision >= revision`, await an image
+ * re-host, and then call an INSTANCE `existing.update(values)`. The guard ran before the
+ * await and the write was unconditional, so a delayed older revision could regress a newer
+ * one. It now calls the static
+ * `SwanSpotlight.update(values, { where: { itemId, revision: { [Op.lt]: revision } } })`,
+ * so the DATABASE evaluates the ordering predicate inside the write.
+ *
+ * Consequence for this file: `mockUpdate` replaces the per-test instance `update` spy and
+ * resolves to Sequelize's `[affectedCount]` — `[0]` means the predicate rejected the write.
+ * The assertions therefore check the WHERE clause, which is the mechanism, rather than
+ * checking that a spy was not called.
+ *
  * The model and both network-touching services are mocked. Nothing here reaches DNS, R2,
- * or a database.
+ * or a database — so this file can prove the predicate is CONSTRUCTED and the branch is
+ * TAKEN. It cannot prove PostgreSQL honours it under real concurrency; that needs a live
+ * database and is recorded as `[UNKNOWN]`, not asserted.
  */
 import express from 'express';
 import request from 'supertest';
 import { Op } from 'sequelize';
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
 
-const { mockFindByPk, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode } = vi.hoisted(() => ({
+const {
+  mockFindByPk, mockUpdate, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode,
+} = vi.hoisted(() => ({
   mockFindByPk: vi.fn(),
+  mockUpdate: vi.fn(),
   mockCreate: vi.fn(),
   mockFindAll: vi.fn(),
   mockUploadPhoto: vi.fn(),
@@ -28,13 +46,14 @@ const { mockFindByPk, mockCreate, mockFindAll, mockUploadPhoto, mockFetchDecode
 }));
 
 vi.mock('../models/social/SwanSpotlight.mjs', () => ({
-  default: { findByPk: mockFindByPk, create: mockCreate, findAll: mockFindAll },
+  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate, findAll: mockFindAll },
 }));
 
 // NOTE: the route imports `uploadPhoto` from photoStorageService.mjs. S3 mocks
 // r2StorageService.mjs, which does not export it — so its image assertions currently pass
 // because the REAL upload fails on missing credentials, not because the mock fired. These
-// are the specifiers the route actually resolves.
+// are the specifiers the route actually resolves. (Since 2026-09-20 the call lives in
+// services/bridgeSpotlightImageRehost.mjs, which resolves the same two specifiers.)
 vi.mock('../services/photoStorageService.mjs', () => ({ uploadPhoto: mockUploadPhoto }));
 vi.mock('../services/spotlightImageFetch.mjs', () => ({
   fetchAndDecodeSpotlightImage: mockFetchDecode,
@@ -84,10 +103,15 @@ const getManifest = (opts = {}) => {
     .set('X-Swan-Timestamp', timestamp);
 };
 
+/** The predicate the database is asked to evaluate — the whole point of the D1 fix. */
+const predicateOf = (call) => call[1]?.where?.revision?.[Op.lt];
+
 beforeEach(() => {
   process.env.SPOTLIGHT_ENABLED = 'true';
   process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
   mockFindByPk.mockReset().mockResolvedValue(null);
+  // Default: the conditional UPDATE matches nothing, so the create path runs.
+  mockUpdate.mockReset().mockResolvedValue([0]);
   mockCreate.mockReset().mockResolvedValue({});
   mockFindAll.mockReset().mockResolvedValue([]);
   mockUploadPhoto.mockReset();
@@ -101,86 +125,151 @@ afterEach(() => {
 
 describe('spotlight ordering — a superseded revision changes nothing', () => {
   it('does not re-host an image that arrives on a superseded revision', async () => {
-    const update = vi.fn();
-    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null, update });
+    // A row already at revision 5: the conditional UPDATE matches nothing and the re-read
+    // reports the revision that actually won.
+    mockFindByPk.mockResolvedValue({ revision: 5, imageUrl: null });
+    mockUpdate.mockResolvedValue([0]);
 
     const res = await send(app, body({ revision: 4, imageUrl: 'https://swanguard.example/late.png' }));
 
     expect(res.status).toBe(200);
     expect(res.body.noop).toBe(true);
-    // The decisive assertion: the early return happens BEFORE rehostImage(), so the
-    // network is never touched for an item that is already behind.
+    expect(res.body.revision).toBe(5);
+    // The decisive assertion, same intent and now stronger than the old instance-spy version:
+    // the write was CONDITIONED on `revision < 4`, and because it lost, no network work
+    // happened for an item that is already behind.
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
     expect(mockFetchDecode).not.toHaveBeenCalled();
     expect(mockUploadPhoto).not.toHaveBeenCalled();
-    expect(update).not.toHaveBeenCalled();
+    expect(mockCreate).not.toHaveBeenCalled();
   });
 
   it('leaves the stored image untouched when a superseded revision carries a different one', async () => {
-    const update = vi.fn();
-    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg', update });
+    mockFindByPk.mockResolvedValue({ revision: 9, imageUrl: 'https://r2.example/original.jpg' });
+    mockUpdate.mockResolvedValue([0]);
 
     await send(app, body({ revision: 8, imageUrl: 'https://swanguard.example/replacement.png' }));
 
-    expect(update).not.toHaveBeenCalled();
+    // Exactly one write was ISSUED, and it was the conditional one — never an unconditional
+    // overwrite of a newer row.
+    expect(mockUpdate).toHaveBeenCalledTimes(1);
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(8);
     expect(mockCreate).not.toHaveBeenCalled();
+    expect(mockFetchDecode).not.toHaveBeenCalled();
   });
 
-  it('treats a stale lower revision as a no-op once the higher one has landed', async () => {
-    // SCOPE NARROWED after hostile review F02 (2026-09-20): this was named "...two racing
-    // revisions...", but it sends ONE request against a store that already holds the winner.
-    // That is sequential stale delivery, not a concurrent interleaving — the read-then-write
-    // window in the route is not exercised, and closing it needs a transaction or an atomic
-    // conditional apply. Reported as an open finding, not claimed here.
-    const update = vi.fn();
-    mockFindByPk.mockResolvedValue({ revision: 7, imageUrl: null, update });
+  it('does not apply — or re-host for — a revision that loses the race AFTER the read', async () => {
+    // THIS is the interleaving round 1's F02 said the old suite never injected. The read says
+    // revision 1 is stored, so revision 2 looks perfectly acceptable and the OLD code would
+    // have written it. Between that read and the write a concurrent revision 5 lands. Because
+    // the predicate is evaluated inside the UPDATE, the stale write matches nothing.
+    mockFindByPk
+      .mockResolvedValueOnce({ revision: 1, imageUrl: null })  // the route's preserve-read
+      .mockResolvedValueOnce({ revision: 5 });                 // the re-read, after losing
+    mockUpdate.mockResolvedValue([0]);
 
-    const res = await send(app, body({ revision: 6 }));
+    const res = await send(app, body({ revision: 2, imageUrl: 'https://swanguard.example/race.png' }));
 
+    expect(res.status).toBe(200);
     expect(res.body.noop).toBe(true);
-    expect(res.body.revision).toBe(7);
-    expect(update).not.toHaveBeenCalled();
+    expect(res.body.revision).toBe(5);
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
+    expect(mockFetchDecode).not.toHaveBeenCalled();
+    expect(mockUploadPhoto).not.toHaveBeenCalled();
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+
+  it('re-reads the revision after a lost primary-key race instead of assuming it lost', async () => {
+    // Two first-time deliveries of the same itemId: our INSERT hits the PK, so the helper
+    // retries the conditional UPDATE. Assuming "insert failed ⇒ superseded" would silently
+    // drop a legitimately newer revision, so the retry has to happen.
+    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
+    mockFindByPk.mockResolvedValue(null);
+    mockUpdate.mockResolvedValueOnce([0]).mockResolvedValueOnce([1]);
+    mockCreate.mockRejectedValue(race);
+
+    const res = await send(app, body({ revision: 2 }));
+
+    expect(res.status).toBe(200);
+    expect(res.body.noop).toBeUndefined();
+    expect(mockUpdate).toHaveBeenCalledTimes(2);
   });
 });
 
 describe('spotlight ordering — tombstone semantics', () => {
   it('a late replay of an older, non-retracted revision cannot resurrect a retracted item', async () => {
-    const update = vi.fn();
     // Item is retracted at revision 3; an old revision-2 delivery (retracted:false) is replayed.
-    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null, update });
+    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: null });
+    mockUpdate.mockResolvedValue([0]);
 
     const res = await send(app, body({ revision: 2, retracted: false }));
 
     expect(res.status).toBe(200);
     expect(res.body.noop).toBe(true);
-    expect(update).not.toHaveBeenCalled();
+    expect(res.body.revision).toBe(3);
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(2);
+    expect(mockCreate).not.toHaveBeenCalled();
   });
 
   it('a higher revision after retraction is applied and clears the tombstone', async () => {
-    const update = vi.fn().mockResolvedValue(undefined);
-    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg', update });
+    mockFindByPk.mockResolvedValue({ revision: 3, retracted: true, imageUrl: 'https://r2.example/a.jpg' });
+    mockUpdate.mockResolvedValue([1]);
 
     const res = await send(app, body({ revision: 4, retracted: false }));
 
     expect(res.status).toBe(200);
     expect(res.body.retracted).toBe(false);
-    expect(update).toHaveBeenCalledTimes(1);
-    expect(update.mock.calls[0][0].retracted).toBe(false);
+    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
+    expect(predicateOf(mockUpdate.mock.calls[0])).toBe(4);
   });
 
   it('retraction preserves the existing image rather than clearing it', async () => {
     // Documents real behaviour: a retracted row is excluded from the manifest and the rail,
     // so the retained URL is inert. Asserted so a future change to it is a deliberate one.
-    const update = vi.fn().mockResolvedValue(undefined);
-    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg', update });
+    mockFindByPk.mockResolvedValue({ revision: 1, retracted: false, imageUrl: 'https://r2.example/keep.jpg' });
+    mockUpdate.mockResolvedValue([1]);
 
     await send(app, body({ revision: 2, retracted: true, imageUrl: 'https://swanguard.example/new.png' }));
 
-    expect(update.mock.calls[0][0].retracted).toBe(true);
-    expect(update.mock.calls[0][0].imageUrl).toBe('https://r2.example/keep.jpg');
+    expect(mockUpdate.mock.calls[0][0].retracted).toBe(true);
+    expect(mockUpdate.mock.calls[0][0].imageUrl).toBe('https://r2.example/keep.jpg');
     expect(mockFetchDecode).not.toHaveBeenCalled();
   });
 });
 
+describe('spotlight ordering — validation and persistence agree (D3)', () => {
+  it('persists the NORMALIZED itemId, not the raw body value', async () => {
+    // The old handler destructured the RAW `req.body.itemId` and stored that, so a padded or
+    // over-long value was persisted unnormalized even though validation had bounded it.
+    mockUpdate.mockResolvedValue([1]);
+    await send(app, body({ itemId: `  ${ITEM}  ` }));
+
+    expect(mockUpdate.mock.calls[0][0].itemId).toBe(ITEM);
+  });
+
+  it('rejects a revision beyond the INTEGER column range with 422, not 500', async () => {
+    // The column is DataTypes.INTEGER (SwanSpotlight.mjs:23). An unbounded revision used to
+    // pass validation and then fail at the column as a 500.
+    const res = await send(app, body({ revision: 4294967296 }));
+
+    expect(res.status).toBe(422);
+    expect(mockUpdate).not.toHaveBeenCalled();
+    expect(mockCreate).not.toHaveBeenCalled();
+  });
+
+  it('coerces `retracted` ONCE, so the image branch and the stored column agree', async () => {
+    // `retracted: "false"` is not a boolean. The old code truthiness-tested it in the image
+    // branch (so "false" skipped the image) but strict-compared it for storage (so it stored
+    // false) — two different answers for the same input.
+    mockUpdate.mockResolvedValue([1]);
+    await send(app, body({ retracted: 'false', imageUrl: 'https://swanguard.example/pic.png' }));
+
+    expect(mockUpdate.mock.calls[0][0].retracted).toBe(false);
+    // And because the single coercion says "not retracted", the image IS attempted.
+    expect(mockFetchDecode).toHaveBeenCalledTimes(1);
+  });
+});
+
 describe('spotlight ordering — manifest', () => {
   it('queries only live rows: not retracted, and not expired', async () => {
     await getManifest();
@@ -243,6 +332,7 @@ describe('disabled-ingest smoke — the exact verified error body (R1)', () => {
     expect(res.status).toBe(503);
     expect(res.body).toEqual(VERIFIED_DISABLED_BODY);
     expect(mockCreate).not.toHaveBeenCalled();
+    expect(mockUpdate).not.toHaveBeenCalled();
     expect(mockFindByPk).not.toHaveBeenCalled();
     // The flag is checked BEFORE any network work — a disabled receiver must not fetch.
     expect(mockFetchDecode).not.toHaveBeenCalled();
diff --git a/backend/tests/coachSignalIntegrity.contract.test.mjs b/backend/tests/coachSignalIntegrity.contract.test.mjs
index 86759c382..763a4552f 100644
--- a/backend/tests/coachSignalIntegrity.contract.test.mjs
+++ b/backend/tests/coachSignalIntegrity.contract.test.mjs
@@ -31,6 +31,7 @@ import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
 const {
   mockSignalFindOne, mockSignalCount, mockSignalCreate,
   mockPostFindOne, mockAssignmentFindOne, mockUserFindByPk, mockCreateNotification,
+  mockTransaction, mockQuery,
   session,
 } = vi.hoisted(() => ({
   mockSignalFindOne: vi.fn(),
@@ -40,6 +41,11 @@ const {
   mockAssignmentFindOne: vi.fn(),
   mockUserFindByPk: vi.fn(),
   mockCreateNotification: vi.fn(),
+  // D2: quota admission now runs inside `CoachSignal.sequelize.transaction(...)` and takes a
+  // PostgreSQL advisory lock before counting. These two are the seam that lets a mocked model
+  // exercise that path at all — without them the route throws before reaching the count.
+  mockTransaction: vi.fn(),
+  mockQuery: vi.fn(),
   // `id` is a STRING here on purpose: authMiddleware attaches `req.user.id` via toStringId
   // while Sequelize INTEGER columns surface as numbers. The route must normalise both.
   session: { user: { id: '7', role: 'trainer' } },
@@ -49,7 +55,12 @@ vi.mock('../middleware/authMiddleware.mjs', () => ({
   protect: (req, _res, next) => { req.user = session.user; next(); },
 }));
 vi.mock('../models/social/CoachSignal.mjs', () => ({
-  default: { findOne: mockSignalFindOne, count: mockSignalCount, create: mockSignalCreate },
+  default: {
+    findOne: mockSignalFindOne,
+    count: mockSignalCount,
+    create: mockSignalCreate,
+    sequelize: { transaction: mockTransaction, query: mockQuery },
+  },
 }));
 vi.mock('../models/social/SocialPost.mjs', () => ({ default: { findOne: mockPostFindOne } }));
 vi.mock('../models/ClientTrainerAssignment.mjs', () => ({ default: { findOne: mockAssignmentFindOne } }));
@@ -77,6 +88,9 @@ beforeEach(() => {
   mockSignalCreate.mockReset().mockResolvedValue({
     id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date(),
   });
+  // Run the transaction body against a stub handle so the admission path actually executes.
+  mockTransaction.mockReset().mockImplementation(async (work) => work({ id: 'test-transaction' }));
+  mockQuery.mockReset().mockResolvedValue([[], 0]);
   mockUserFindByPk.mockReset().mockResolvedValue({ id: 7, firstName: 'Ada', lastName: 'Coach', username: 'ada' });
   mockCreateNotification.mockReset().mockResolvedValue(undefined);
 });
@@ -188,6 +202,72 @@ describe('coach signal — quota', () => {
   });
 });
 
+describe('coach signal — quota admission is serialized and transactional (D2)', () => {
+  // WHAT THESE CAN AND CANNOT PROVE. Hostile review F05 found that `count` then `create`, as
+  // two unserialized statements, let two concurrent requests for DISTINCT posts both observe 4
+  // and both insert — six signals against a cap of five. The fix is a per-coach PostgreSQL
+  // advisory lock taken inside ONE transaction.
+  //
+  // These tests drive the real router and assert that the lock is TAKEN with the right key and
+  // that the count and the insert share ONE transaction. They CANNOT prove that PostgreSQL
+  // serializes two real sessions — that needs a live database and is recorded as `[UNKNOWN]`
+  // in the round-3 packet rather than asserted here. Naming the limit is the point: round 1's
+  // F02 caught a case whose name advertised a race it never injected.
+  const CAP = 5; // mirrors DAILY_SIGNAL_CAP in the route
+
+  it('takes a per-coach advisory lock before counting', async () => {
+    await post();
+
+    expect(mockQuery).toHaveBeenCalledTimes(1);
+    const [sql, options] = mockQuery.mock.calls[0];
+    expect(sql).toContain('pg_advisory_xact_lock');
+    // Scoped to the coach, so two different coaches never block each other.
+    expect(options.replacements.key).toBe('coach-signal-quota:7');
+  });
+
+  it('counts and inserts inside the SAME transaction, and hands it to both', async () => {
+    await post();
+
+    expect(mockTransaction).toHaveBeenCalledTimes(1);
+    const handle = { id: 'test-transaction' };
+    expect(mockSignalCount.mock.calls[0][0].transaction).toEqual(handle);
+    expect(mockSignalCreate.mock.calls[0][1].transaction).toEqual(handle);
+  });
+
+  it('takes the lock BEFORE the count, so the read cannot be stale', async () => {
+    const order = [];
+    mockQuery.mockImplementation(async () => { order.push('lock'); return [[], 0]; });
+    mockSignalCount.mockImplementation(async () => { order.push('count'); return 0; });
+    mockSignalCreate.mockImplementation(async () => {
+      order.push('insert');
+      return { id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date() };
+    });
+
+    await post();
+
+    expect(order).toEqual(['lock', 'count', 'insert']);
+  });
+
+  it('does not insert when the lock-protected count is already at the cap', async () => {
+    mockSignalCount.mockResolvedValue(CAP);
+
+    const res = await post();
+
+    expect(res.status).toBe(429);
+    expect(mockSignalCreate).not.toHaveBeenCalled();
+  });
+
+  it('leaves no half-counted admission behind when the insert fails', async () => {
+    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
+    mockSignalCreate.mockRejectedValue(race);
+
+    const res = await post();
+
+    expect(res.status).toBe(409);
+    expect(mockTransaction).toHaveBeenCalledTimes(1);
+  });
+});
+
 describe('coach signal — note handling', () => {
   it('rejects an over-length note with 422 rather than truncating it', async () => {
     const res = await post({ note: 'x'.repeat(121) });
```

### §1.4 Does the commit hold the code that was reviewed? — the identity table

This is the claim only a commit can settle. The right-hand column is the blob hash that rounds 3
and 4 actually read in the worktree, measured at `2026-09-20T17:56:45-07:00`. The left column is
what this commit contains.

| Path | In commit `b4ea7968f` | Blob rounds 3/4 read | Identical? |
|---|---|---|---|
| `backend/routes/bridge/bridgeIngestRoutes.mjs` | `b720198d0e73` | `b720198d0e73` | **yes** |
| `backend/routes/social/coachSignalRoutes.mjs` | `4f909c501dc1` | `4f909c501dc1` | **yes** |
| `backend/services/bridgeSpotlightRevisionApply.mjs` | `ad9559c875d0` | `ad9559c875d0` | **yes** |
| `backend/services/bridgeSpotlightImageRehost.mjs` | `75f04c64259c` | `d88a0bbaa57c` | **NO — read this carefully** |
| `backend/tests/bridgeSpotlightOrdering.contract.test.mjs` | `a17591c022cc` | `a17591c022cc` | **yes** |
| `backend/tests/api/swanBridgeIngest.test.mjs` | `12fd1b83a321` | `12fd1b83a321` | **yes** |
| `backend/tests/coachSignalIntegrity.contract.test.mjs` | `763a4552f945` | `763a4552f945` | **yes** |

**At least one blob differs.** §1.5 prints the exact diff between what the reviewers read and what this commit contains, for every path that differs. **Decide for yourself whether the reviews transfer**, and say which way — a differing blob can mean the reviews describe a different revision (their verdicts do not transfer) or that extra work was added on top of the reviewed content (the reviewed content is intact and the addition is new, unreviewed material). The diff distinguishes those two cases; the hash alone cannot. Either way the addition is fair game for this round.

### §1.5 Diff between the reviewed blobs and the committed blobs, for every mismatch

Read-only evidence for the judgement §1.4 asks you to make. A diff that only **adds** means the
reviewed content survives and the change is new material; a diff that removes or rewrites reviewed
lines means the reviews above describe a revision that is not this one.

#### §1.5 — `backend/services/bridgeSpotlightImageRehost.mjs`

Reviewed blob `d88a0bbaa57c8975e3f3aaee9e2a5de2bcf7c64a` → committed blob `75f04c64259c6827e19b56ae2cf37b2b7e81b115`

```diff
diff --git a/d88a0bbaa57c8975e3f3aaee9e2a5de2bcf7c64a b/75f04c64259c6827e19b56ae2cf37b2b7e81b115
index d88a0bbaa..75f04c642 100644
--- a/d88a0bbaa57c8975e3f3aaee9e2a5de2bcf7c64a
+++ b/75f04c64259c6827e19b56ae2cf37b2b7e81b115
@@ -28,6 +28,13 @@ import { fetchAndDecodeSpotlightImage } from './spotlightImageFetch.mjs';
  *     re-hosting has never once succeeded, and the design ("a broken image degrades
  *     to a text-only card") is precisely what made that invisible. Verified by
  *     runtime introspection: `r2StorageService.uploadPhoto === undefined`.
+ *
+ * (c) The storage discriminator was discarded. Fixed 2026-09-20 (hostile review D7 / R2-02).
+ *     `uploadPhoto` catches an R2 failure and falls through to local disk, returning
+ *     `storage: 'local'` — and this function returned `result.url` regardless, so a disk path was
+ *     stored as a completed R2 re-host. Only `storage === 'r2'` is accepted now. Note that (b) and
+ *     (c) hid behind the SAME mechanism: a total failure and a partial one were both just "no
+ *     image", which is why the failure contract kept them invisible.
  */
 export async function rehostBridgeSpotlightImage(url, itemId) {
   try {
@@ -47,7 +54,26 @@ export async function rehostBridgeSpotlightImage(url, itemId) {
       originalFilename: `${itemId}.${decoded.ext}`,
       contentType: decoded.contentType
     });
-    return result?.url ?? null;
+
+    // R2 ONLY — the storage discriminator is the answer, not the presence of a URL.
+    //
+    // `uploadPhoto` catches an R2 failure and SILENTLY falls through to local disk
+    // (`photoStorageService.mjs:180-184`), returning `{ url, storage: 'local' }` at `:197`.
+    // The old `return result?.url ?? null` therefore stored a disk path as a COMPLETED re-host,
+    // which is the exact claim ban #4 exists to prevent — and the path it stored would be served
+    // from a filesystem that does not survive a redeploy, so the card would render a broken image
+    // on the next deploy while the row still asserted a successful re-host.
+    //
+    // The discriminator already existed and was being thrown away (hostile review D7 / R2-02).
+    // Degrading to `null` is the correct outcome: ban #37 says a broken image becomes a text-only
+    // card, and this is a broken image in the only sense that matters — we do not have it.
+    if (result?.storage !== 'r2') {
+      logger.warn(
+        `Spotlight image for ${itemId} not re-hosted: storage='${result?.storage ?? 'none'}' (R2 required)`
+      );
+      return null;
+    }
+    return result.url;
   } catch (error) {
     logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
     return null;
```

---

## §2. Round 4 verbatim — the verification under test

This is the archived round-4 review exactly as filed. Its §1 table is the set of claims to falsify;
its §2 is seven documentation-truth defects it says it fixed in the same pass; its §3 lists what it
could not prove. Note its own §5: it argues that a further **read-only** round has "nothing new to
attack". Your round is not that round — you are attacking *its verification*, against a commit.

```markdown
---
review_id: 2026-09-20-172308-social-bridge-round-2-high-remediation-verified
status: published
date_local: 2026-09-20T17:23:08-07:00
date_utc: 2026-09-21T00:23:08Z
subject: "Social Bridge — round-2 HIGH remediation verified against the worktree, and four blueprint truth defects corrected"
reviewer_agent: workbuddy
reviewer_seat: "workbuddy / deepseek-v4.1-flash"
round: 4
repo: SS-PT
repo_path: "C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT"
branch: creator-brains-engine-r2-20260915
commit: dirty
scope: "In: the round-2 (2026-09-20-171502) HIGH findings D1/D2/D3/D6 as remediated in the uncommitted worktree, and the blueprint package docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/ (00-README.md, MANIFEST.md, 04-build-order.md, CORRECTIONS-APPLIED.md, 05-slices.md) for the doc-truth findings D4/D5/F01/F03. Out: the committed R1 change set; migrations executed against a live database; deployment; the SwanGuard-Newsroom repo beyond a ref read; rounds 1-3's own subjects."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 2, medium: 2, low: 3 }
unproven: 6
supersedes: null
superseded_by: null
tags: [social-bridge, spotlight, round-4, remediation-verification, blueprint-truth, g0, rebinding]
---

# HOSTILE REVIEW — Social Bridge — round-2 HIGH remediation verified against the worktree, and four blueprint truth defects corrected

**Reviewer:** workbuddy (workbuddy / deepseek-v4.1-flash), 2026-09-20T17:23:08-07:00
**Method:** read the committed blobs and the uncommitted worktree files at `file:line`; executed
four real test suites (`swanBridgeIngest`, `coachSignalRoutes.contract`, `coachSignalIntegrity.contract`,
`bridgeSpotlightOrdering.contract` — 72 tests); read the migration that carries the uniqueness
constraint rather than assuming it; `git ls-remote` against the newsroom remote to settle the pin;
grepped the package for the four overclaims. **No mutation run this round** — round 3's mutation
harness already proved the href guard, and the findings here are either verified-by-execution
(suites) or verified-by-read (docs), so a mutation would have added nothing.
**Evidence:** `backend/services/bridgeSpotlightRevisionApply.mjs` · `backend/routes/bridge/bridgeIngestRoutes.mjs` ·
`backend/routes/social/coachSignalRoutes.mjs` · `backend/migrations/20260916-create-coach-signals.cjs` ·
`backend/tests/api/swanBridgeIngest.test.mjs` · `git ls-remote --heads origin` in `SwanGuard-Newsroom`.
**Verdict:** DEFECTS-FOUND — 0/2/2/3

---

## 0. Verdict in one paragraph

**The four round-2 HIGH code findings are genuinely fixed, and I verified them by execution rather
than by accepting the claim — but the *documentation* defects that round 2 also graded HIGH were
still live, and they were the ones a builder would actually act on.** D1/F06 (revision race),
D2/F05 (quota race), D3/F07 (validation/persistence divergence) and D6/F10 (misleading suite) all
survive inspection: the predicates moved into the database, the count and the insert share one
transaction behind a per-coach advisory lock, the validator now returns the normalized values it
validates, and the mock specifier points at the module the route actually imports. 72 tests pass.
What did **not** hold was the package's own status text: `00-README.md` and `MANIFEST.md` both
asserted *"G0 CLOSED"* while the same files admitted surviving `BLOCKED-G0` markers, and
`04-build-order.md` plus `CORRECTIONS-APPLIED.md` both claimed that rejecting redirects makes the
validated URL the connected URL. **A reader must not assume** that "round 2's remediation landed"
implies "the package now tells the truth" — the code and the prose were remediated by different
hands at different times, and the prose lagged. All seven doc defects are **fixed in this pass**;
none required a code change, and no shipped route behaviour was altered.

---

## 1. Confirmed — what I re-measured and could not break

| Claim under review | My measurement | Result |
|---|---|---|
| D1/F06 — revision application is atomic | `bridgeSpotlightRevisionApply.mjs:49-51` builds `update(values, { where: { itemId, revision: { [Op.lt]: revision } } })`; the `:175` image attach re-checks `{ itemId, revision, retracted: false }` | **Confirmed fixed.** The ordering predicate is evaluated by the database inside the write, not by a stale in-memory instance. |
| D1/F06 — first-insert race is handled | `:61-73` catches `SequelizeUniqueConstraintError` and **re-runs** the conditional apply rather than treating the loss as superseded | **Confirmed fixed**, and the subtlety is right: assuming the PK loss means "superseded" would silently drop a legitimately newer revision. |
| D2/F05 — quota admission is atomic | `coachSignalRoutes.mjs:132-151` — `count` and `create` share one `sequelize.transaction`, serialized by `SELECT pg_advisory_xact_lock(hashtext(:key))` on a per-coach key | **Confirmed fixed.** `06-bans.md` #42 forbids an in-memory-only quota, and this is not one. |
| D2/F05 — the duplicate read-then-insert is also closed | migration `20260916-create-coach-signals.cjs:59-63` adds `UNIQUE("coachId","postId")`; route `:187-191` maps `SequelizeUniqueConstraintError` → **409** | **Confirmed closed.** The pre-check handles the common case; the constraint plus the catch handle the race. **This refutes a hypothesis I formed earlier in this pass and had to withdraw — see §4.** |
| D3/F07 — validated payload is the persisted payload | `validateSpotlightPayload:87` returns `{ ok, value: { itemId, revision, headline, retracted: body.retracted === true } }`; handler `:117` consumes `validation.value`; `revision` bounded by `SPOTLIGHT_MAX_REVISION` at `:82` | **Confirmed fixed.** The `retracted:"false"` divergence is gone: coercion happens once, so the image branch and the column cannot disagree. |
| D6/F10 — the suite exercises the boundary it claims | `swanBridgeIngest.test.mjs:41-42` mocks `photoStorageService.mjs`; `:272` asserts `mockUploadPhoto` **was reached**; `:265` injects an R2 failure | **Confirmed fixed.** The specifier matches the route's real import, so the assertions are no longer vacuous. |
| The remediated suites are green | `vitest run` on the four suites | **72 passed (72)**: swanBridgeIngest 19 · coachSignalRoutes.contract 12 · coachSignalIntegrity.contract 21 · bridgeSpotlightOrdering.contract 20 |
| The newsroom push is complete | `git ls-remote --heads origin \| grep newsroom-mainline` → `1bd08d4…`, equal to worktree HEAD | **Confirmed.** The branch is on the remote at the pushed SHA. |

---

## 2. Defects

All seven are **documentation-truth defects in the blueprint package**, all fixed in this pass. None
is a runtime vulnerability; the highest two are graded HIGH because a builder reading them would
either believe a defence exists that does not, or believe a gate is open that is not — which is
precisely the class round 2 already graded HIGH once.

### D1 — G0 was still claimed CLOSED in the live docs [HIGH] (round-2 D5 / F09, still open)

- **Claim under review:** the package's own status line, `00-README.md:5` — *"G0 CLOSED"* — and
  `MANIFEST.md:15,39` — *"Gate G0, closed"* / *"Gate G0 is **closed**"*.
- **Evidence:** `00-README.md:5` and `:22`; `MANIFEST.md:15,39`; **against** `MANIFEST.md:46`
  (*"`BLOCKED-G0` markers that survive"*), `00-README.md:71` (*"replaces every `BLOCKED-G0` entry"*),
  and `08-decision-density-self-test.md` lines 63-69 (**seven** rows marked *"Blocked G0"*). Six
  supplied excerpts are not the nine truth artifacts and not a zero-blocker criterion.
- **Exploitability / reach:** not a vulnerability — a **readiness** defect. G0 is the gate that
  licenses implementation; a builder who reads "G0 CLOSED" proceeds without the three unread
  artifacts.
- **Why it matters:** the contradiction was *internal to the same two files*, which is the shape
  that survives review: each line looks fine alone.
- **Fix:** **applied.** `00-README.md:5,20-38` and `MANIFEST.md:15,39` now read *"G0 EVIDENCE
  SUPPLIED, NOT CLOSED"* and split **G0-evidence** (partial — 6 of 9) from **G0-release** (not
  closed — 7 `BLOCKED-G0` decisions) so the two cannot be conflated again. The historical packets
  (`R1-ASTRA-PACKET.md`, `R1-REVIEW-ROUND-2-PACKET.md`) **retain** the old wording deliberately: they
  are frozen records of what was sent to a reviewer, and rewriting them would falsify that record.

### D2 — The DNS-rebinding completion claim survived in the live docs [HIGH] (round-2 D4 / F08, still open)

- **Claim under review:** rejecting redirects makes the validated URL the connected URL.
- **Evidence:** `04-build-order.md:100-102` — *"…the validated URL is then always the connected URL,
  and the rebinding TOCTOU closes with it."* — and `CORRECTIONS-APPLIED.md` §4b —
  *"`redirect: 'error'` — the fix. No redirect is ever followed, so the validated URL is the connected
  URL."* **Against** `spotlightImageFetch.mjs:91` (`await dns.lookup(...)`), `:98-102` (validate) and
  `:127` (`fetchImpl(...)`, which **re-resolves independently**), and the module's own comment at
  `:85-88`: *"a check-time validation only, NOT a complete DNS-rebinding defence."*
- **Exploitability / reach:** a hostname that flips to a private address between lookup and fetch is
  still reached. The stated mitigation does not hold — **a valid publisher HMAC authenticates the
  sender, not the remote image server it names.** `redirect: 'error'` correctly closes the *redirect*
  re-entry, which is a different problem and genuinely fixed.
- **Why it matters:** the code was honest and the *documentation* was not. A builder reading
  `04-build-order.md#rehostImage` would believe a defence exists that does not, and would not budget
  for binding the connection lookup.
- **Fix:** **applied.** `04-build-order.md:100-111` now withdraws the inference explicitly and names
  the residual as open-and-accepted; `CORRECTIONS-APPLIED.md` §4b does the same; the
  `rehostImage()` row in the integration-edit table (`04-build-order.md:143`) now scopes its "DONE"
  to redirect rejection / HTTPS-only / streamed cap / SVG rejection and states plainly that it does
  **not** cover rebinding.

### D3 — `CORRECTIONS-APPLIED.md` §10 carried the F01 overclaim *and* described superseded logic [MEDIUM]

- **Claim under review:** the manifest endpoint *"returned 500 for **every** request, with a valid
  signature or without one."*
- **Evidence:** `CORRECTIONS-APPLIED.md` §10, against `bridgeIngestRoutes.mjs:200-217`, whose own
  comment already carries the narrowed wording: `parseSignatureHeader` and `isTimestampInWindow` run
  **before** the raw-body guard, so a malformed or expired request already returned 401. Separately,
  §10's stated fix (`req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)`) **no
  longer matches the shipped code** — `:220-229` is now fail-closed:
  `req.rawBody = declaredBody ? undefined : Buffer.alloc(0)`.
- **Exploitability / reach:** documentation only. The route itself is correct.
- **Why it matters:** round 2 listed this exact sentence under F01 as open; §10 also under-described
  the shipped fix, so a builder would have re-implemented the *unconditional* normalisation and
  silently re-opened the ambiguous-emptiness hole.
- **Fix:** **applied.** §10 now states the narrowed blast radius, explains why the overclaim was
  wrong, and quotes the fail-closed code with the reason a bodyless GET is distinguishable from a
  consumed-body request.

### D4 — The corrections status table asserted correction 3 was applied [MEDIUM]

- **Claim under review:** status-table row 3 — *"`postId` NOT NULL; drop `sessionId` DDL"* — listed
  as applied.
- **Evidence:** `CORRECTIONS-APPLIED.md` row 3, against `05-slices.md:88-111` (which marks the same
  correction **SUPERSEDED**, operator ruling 2026-09-19) and the shipped migration
  `20260916-create-coach-signals.cjs:30-32` (`postId: { allowNull: true }`). The row's cited line
  references (`05-slices.md:35,55-57`) no longer resolve to that content at all.
- **Exploitability / reach:** documentation only, but the table is the file the README tells builders
  to read **first**.
- **Why it matters:** a builder following the status table would attempt `SET NOT NULL` on a column
  that the migration, the model, a passing test and an operator ruling all say must stay nullable.
- **Fix:** **applied.** Row 3 now reads as superseded, cites `05-slices.md` §3, and records the
  migration line that settles it.

### D5 — "Known remaining deviations" #5 described a state that had been fixed [LOW]

- **Claim under review:** `tests/api/swanBridgeIngest.test.mjs` mocks a module the route no longer
  imports — *"**Reported, not fixed**."*
- **Evidence:** `CORRECTIONS-APPLIED.md` deviations #5, against `swanBridgeIngest.test.mjs:41-42`,
  which now mocks `photoStorageService.mjs`, and `:272`, which asserts the mock fired. The entry also
  repeated the **mechanism round 2 declared false** — that the old assertions passed because the real
  upload failed on missing credentials. They passed because the real decode fails on **DNS first**, so
  `uploadPhoto` was never reached.
- **Exploitability / reach:** documentation only, and it understated the state rather than
  overstating it — the safer direction, but still wrong.
- **Why it matters:** a stale "not fixed" hides a completed remediation, and the repeated false
  mechanism is the sentence round 2 asked to be corrected.
- **Fix:** **applied.** Entry #5 is struck through as FIXED, with the corrected DNS-first mechanism
  and a note that the superseded sentence still lives in the **R1 commit message**, where it still
  owes a correction (commit messages are not editable here without rewriting history, so it is
  recorded rather than fixed).

### D6 — The S5 working-root pin was 12 commits stale [LOW]

- **Claim under review:** `merge/newsroom-mainline-v3 @ d830bed`.
- **Evidence:** `git ls-remote --heads origin` in `SwanGuard-Newsroom` →
  `1bd08d44434822c8639e2a02c494d56039bb6d58`, equal to the worktree HEAD. The pin appeared in four
  live documents (`00-README.md`, `04-build-order.md`, `CORRECTIONS-APPLIED.md`, and
  `CONSULT-PACKET.md`).
- **Exploitability / reach:** documentation only; the risk is a builder diffing against the wrong base.
- **Why it matters:** the pin is the thing that makes "every pattern line count in this package" true.
- **Fix:** **applied to the three live documents**, each annotated with the superseded value. The four
  **historical packets retain `d830bed` by design**, and `CORRECTIONS-APPLIED.md` §2 now says so
  explicitly, with a pointer to `04-build-order.md` for the current pin.

### D7 — `MANIFEST.md` said "three deviations" while listing four [LOW]

- **Claim under review:** the heading *"Status: buildable; three deviations remain, all recorded"*.
- **Evidence:** `MANIFEST.md:37` heading, against the four numbered items beneath it.
- **Why it matters:** minor, but the count is the claim; an off-by-one in a status line is how a
  fifth deviation gets to hide.
- **Fix:** **applied** — heading corrected to *"four deviations remain"*.

---

## 3. Not proven / unopened

- **That two concurrent applies serialize correctly on a live PostgreSQL.** The contract suites
  **mock the model**, so they prove the predicate is *constructed* and the branch is *taken* — never
  that Postgres honours `UPDATE … WHERE revision < ?` under real contention. `bridgeSpotlightRevisionApply.mjs`'s
  own header says this and records it `[UNKNOWN]`; I did not upgrade it. *(D1/F06, D2/F05)*
- **The actual deployed constraints, drift and historical NULL rows.** The migration *text* was read;
  nothing was executed against a database. *(D4, and round-2 F03)*
- **Whether `pg_advisory_xact_lock` is available and correctly scoped in the production Postgres
  version.** Not exercised.
- **A live DNS-rebinding demonstration.** I proved the *claim* is unsupported by reading the two
  resolution sites; I did not build a rebinding attacker. The finding is "the documentation overclaims",
  not "rebinding was exploited". *(D2)*
- **Archive completeness and reciprocal supersession.** `reindex.mjs` reports the one-way link;
  the backward half is written by `relink.mjs` only once this review is published.
- **The SwanGuard-Newsroom repo beyond a ref read.** No source, no build, no test run there.

---

## 4. What I deliberately did NOT do, and why

- **Did not alter any shipped route behaviour.** Every defect in §2 is a documentation-truth defect;
  the correct fix was prose, and the temptation to "tidy" the code while editing the docs was
  resisted. `06-bans.md` #1 (report rather than change unilaterally) governs.
- **Did not rewrite the four historical packets' pins.** They record what was sent to a reviewer;
  editing them would make the archive lie. Recorded and explained instead. *(D6)*
- **Did not amend the R1 commit message** that carries the superseded "missing credentials"
  sentence. Amending published history is not a documentation fix. Recorded as an outstanding item. *(D5)*
- **Did not re-run a mutation harness.** Round 3 already mutation-proved the href guard with a
  byte-identical restore; this round's findings are execution-verified (suites) or read-verified
  (docs), so a mutation would have been ceremony.
- **Did not stage or commit.** The tree has 1,264 dirty paths across many workstreams; `git add -A`
  is banned and a partial commit here would have swept in other lanes' work.

### A retraction, recorded rather than dropped

Earlier in this same pass I claimed the duplicate `findOne` at `coachSignalRoutes.mjs:117` was a
**residual race the D2 fix had not closed**, on the hypothesis that the advisory lock serialized only
the quota half. **That was wrong, and I checked it before writing it down as a finding.** Two
independent mechanisms already close it: the migration carries
`UNIQUE("coachId","postId")` (`20260916-create-coach-signals.cjs:59-63`), and the route maps
`SequelizeUniqueConstraintError` → **409** at `:187-191`. The race degrades to a deterministic 409,
not a duplicate row and not a 500. I had also asserted in the same breath that the index was
"non-unique" before reading the migration — the file had the constraint eleven lines below the index
I had grepped for. **The lesson is the one this archive keeps re-learning: grepping for the thing you
expect to find is not reading the file.**

---

## 5. Round log

| Round | Looked at | Found | Fixed | Re-verified |
|---|---|---|---|---|
| 1 | the R1 delta, uncommitted | 15 findings | partial | round 2 |
| 2 | the R1 delta **as committed** (`3688294988b9`) | 0/6/15/0; refuted none of round 1 | D1/D2/D3/D6 in the worktree | **round 4 (this pass)** |
| 3 | the uncommitted SSRF / href delta | 0/2/1/2 — stored XSS via `sourceUrl`→`href`, bundled-git ref-write defect | both, mutation-proved | this pass (suites green) |
| 4 | round-2 HIGH remediation + the package's own status text | 0/2/2/3 — all documentation-truth | all seven | greps clean; 72/72 suites green |

**Dry:** **not reached, and the reason has changed.** Rounds 1-3 were still surfacing code defects;
round 4 surfaced **only** documentation-truth defects, and all seven are now fixed. The remaining
open work is not "find more defects" — it is the three genuinely unread G0 artifacts, the
`BLOCKED-G0` decisions that depend on them, and a live-database run of the two concurrency fixes.
Until those are done, a further read-only round has nothing new to attack, and a round that cannot
fail is not a dry round — it is an unrun one. **D1/F06 and D2/F05 remain `[UNKNOWN]` at the
database level**, and that is the next real evidence to collect.
```

---

## §3. Round 2 verbatim — the findings round 4 claims to have disposed of

Round 4 asserts that the four round-2 HIGH code findings are genuinely fixed and that the two
round-2 HIGH documentation findings are fixed in the package. Round 2 also filed **fifteen MEDIUM**
findings, of which round 4 addressed none by name — a later seat is working them (R2-storage
discriminator, unbounded DNS, rail projection). Use this to check that "the HIGH findings are
closed" has not quietly become "the round is closed".

```markdown
---
review_id: 2026-09-20-171502-social-bridge-completion-r1-correctness
status: published
date_local: 2026-09-20T17:15:02-07:00
date_utc: 2026-09-21T00:15:02Z
subject: "Social Bridge completion — R1 correctness foundations, as committed (round 2): round-1 retest, manifest completeness, and the forged repair package"
reviewer_agent: astra
reviewer_seat: "openai-codex / gpt-6-astra (requested; served model unverifiable by construction)"
round: 2
repo: SS-PT
repo_path: "C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT"
branch: creator-brains-engine-r2-20260915
commit: 4977987a7
scope: "In: the R1 change set AS COMMITTED (3688294988b9), the round-1 filed review, the R1 checkpoint submission, the thirteen existing blueprints (A1 targets), the two contract suites, and the six open-defect sites. Out: executing the suites; mutation reproduction; migrations; a live database; deployment; archive completeness."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 6, medium: 15, low: 0 }
unproven: 8
supersedes: 2026-09-20-025023-social-bridge-completion-r1-correctness
superseded_by: null
tags: [social-bridge, r1, round-2, astra, mega-blueprint, spotlight, manifest, concurrency, supersede]
---

# HOSTILE REVIEW — Social Bridge completion — R1 correctness foundations, as committed (round 2)

**Reviewer:** astra (openai-codex / gpt-6-astra (requested; served model unverifiable by construction)), 2026-09-20T17:15:02-07:00
**Filed by:** workbuddy / Sable — the **dispatching** agent. Astra's session was `--sandbox read-only`
and it reported filing as blocked, so per the `hostile-review-archive` skill the dispatcher files the
artifact. **Sections 0–2's findings are Astra's. Section 2's adjudication lines and sections 3–5's
dispositions are the dispatcher's, and are marked as such.**
**Method (Astra's own account):** compared the two pinned revisions; read the committed source with
`git show <sha>:<path>`; retested every round-1 finding; ran **no** product tests, mutations,
migrations or browser checks. It reported Node and Bash returning *"Access is denied"*, so tests,
mutations, archive query and lane digest were **BLOCKED, not passed**, and it correctly declined to
treat a read-only filename scan as proof of archive completeness.
**Evidence:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-2-REPLY.md`
(raw reply, 76,503 bytes, 1,288 lines, PART A/B/C) · `R1-REVIEW-ROUND-2-REPLY.meta.json` (receipt: in
1,026,096 / out 21,050 / reasoning 2,174 tokens, wall 689.0 s, Mega Blueprint **ARMED — remit, document**)
· `R1-REVIEW-ROUND-2-PACKET.md` (the 320,804-byte packet it reviewed)
**Verdict:** FAIL — 0/6/15/0

**⚠️ Supersession — declared deliberately, and it reverses a pre-round-2 decision.** This round
**supersedes** `2026-09-20-025023-social-bridge-completion-r1-correctness`. Round 1 reviewed the
*uncommitted* delta (`commit: dirty`, base `d05038a91`); round 2 reviews that work **as committed**
(`3688294988b9`). They are not the same object, so the dispatcher had initially recorded a
no-supersede intent. That was reversed on three pieces of evidence, none of which was available when
the intent was set: (a) **the reviewer instructed it** — *"The dispatcher must file this response,
link it with `supersedes: …`, and reindex before treating it as an archived checkpoint"*; (b) round 2
assigns a **disposition to every one of round 1's fifteen findings**, which is the retest pattern the
archive links; (c) round 1's own §5 already framed round 2 as its successor — *"Rounds 2+ are required
after the D1–D3 fixes land."* Leaving round 1 reading as current would strand its uncorrected F10
mechanism and its "byte for byte" claim in the archive, which is the failure this folder exists to
prevent. Round 1's file is **superseded, not corrected**; its content is unedited.

**⚠️ Two of round 2's findings are corrections to claims the dispatcher authored, and both are
accepted.** They are recorded here rather than quietly rewritten:
1. *"The code round 1 reviewed is the code that shipped, byte for byte"* is **FALSE**, and the
   dispatcher's own round-2 packet was the place it appeared. Round 1's ordering note says the
   F01/F02/F04 corrections followed its reviewed dirty tree. Astra's replacement wording is narrower
   and correct: *"the corrected R1 commit is unchanged at the round-2 target."*
2. *"The legacy image tests passed because the real upload failed on missing credentials"* is **not
   established** (F10). The real decode fails on DNS **first**, so `uploadPhoto` is never reached, and
   `photoStorageService.mjs:180–184` would fall back to disk rather than fail. This sentence is in the
   R1 commit message and needs a follow-up correction.

**⚠️ Remediation state at filing — this review is bound to a revision that is no longer the worktree.**
The findings below are open **at the reviewed revision**. By filing time the WorkBuddy seat had
implemented D1/D2/D3 and F10 in the worktree and staged a 7-path commit (in flight, uncommitted):
new `backend/services/bridgeSpotlightRevisionApply.mjs` (predicate moved into the write),
new `backend/services/bridgeSpotlightImageRehost.mjs`, `coachSignalRoutes.mjs` (count+insert in one
transaction behind `pg_advisory_xact_lock`), and the corrected test mock specifier. **Nothing in §2
should be read as still-open without re-checking `git merge-base --is-ancestor 4977987a7 HEAD` and
diffing the paths.** The dispatcher verified all eight adjudicated paths are byte-identical between
`3688294988b9`, `4977987a7`, and current HEAD `b23155b99` — so §2 *is* the shipped code as reviewed.

---

## 0. Verdict in one paragraph

**R1 remains an incomplete correctness foundation, and the manifest repair does not change that.**
The repair is real and correct — the bodyless reconciliation GET previously returned `500
RAW_BODY_UNAVAILABLE` to every request that passed signature-shape and timestamp validation, and is
now reachable — but R1 is *titled* correctness foundations and the two load-bearing correctness
properties of this subsystem are still **not atomic**: quota admission is `count` then `create` with
no transaction (D2), and revision application is `read → await image work → unconditional write`, so a
delayed older request overwrites a newer revision or tombstone (D1). A green mocked suite does not
make them so. **A reader must not assume** that round 2's `FAIL` means the R1 delta is wrong — it does
not — nor that round 1's fifteen findings were re-derived from scratch: round 2 **tested** them, and
**refuted none**. Six HIGH stand; the fifteen Mediums are largely blueprint-consistency debt that
still instructs builders to do the wrong thing.

---

## 1. Confirmed — what was re-measured and could not be broken

| Claim under review | Measurement | Result |
|---|---|---|
| The reviewed code equals the committed code | `git diff --quiet 3688294988b9 4977987a7 -- <paths>` → 0 | **Confirmed** for R1-commit → target. The dispatcher independently re-verified all eight adjudicated paths are byte-identical at current HEAD `b23155b99` too. |
| The manifest fix is correct for the intended bodyless GET | `swanBridgeSignature.mjs:41–44` → `` `${timestamp}.${rawBody.toString('utf8')}` `` | **Confirmed.** A bodyless GET signs the **nonempty** canonical string `"<timestamp>."` — not an empty HMAC input. `:42` fails closed on a non-Buffer. |
| The manifest fix fails closed on a declared body consumed upstream | `bridgeIngestRoutes.mjs:239–253` | **Confirmed** for the supplied upstream-JSON-parser case, assuming headers are not rewritten. |
| F09's G0 contradiction | `00-README.md:5,22` · `MANIFEST.md:15,39` vs `MANIFEST.md:46` · `08` lines 63–69 | **Confirmed, and stronger than round 1 had it.** `00-README.md:5` reads *"G0 CLOSED"*; `MANIFEST.md:46` admits *"`BLOCKED-G0` markers that survive"*; `08-decision-density-self-test.md` lists **seven** rows marked *"Blocked G0"*. |
| R2-06's line-cap arithmetic | `04-build-order.md:3,11` (**≤299**, tests included) vs `git show HEAD:…/bridgeSpotlightOrdering.contract.test.mjs \| wc -l` | **Confirmed to the line: 318.** Astra's number is exact. |
| F10's mock specifier | test `:24` mocks `r2StorageService.mjs`; route `:196` imports `uploadPhoto` from `photoStorageService.mjs` | **Confirmed.** `mockUploadPhoto` never fires. |

---

## 2. Defects

Severity per `severity-policy-1`. All six HIGH below are **round-1 findings retested and still open
at the reviewed revision** — round 2 refuted none of them. The dispatcher reproduced each against the
committed blobs; `file:line` citations are the dispatcher's, and were independently re-checked.

### D1 — Revision and tombstone races remain [HIGH] (F06)

- **Claim under review:** revision application is atomic.
- **Evidence:** `bridgeIngestRoutes.mjs:113` reads the row; `:116–118` compares and returns a no-op;
  `:124` **awaits** `rehostImage()` (network I/O) between the read and the write; `:148–152` then
  writes **unconditionally** (`existing.update(values)` / `SwanSpotlight.create(values)`).
- **Exploitability / reach:** two concurrent signed publishers. An older revision that loses the
  network race to a newer one overwrites it; a tombstone can be un-retracted by a late older write.
  `create` at `:151` has no conflict handling, so simultaneous first-inserts are unresolved.
- **Why it matters:** this is the property the slice is named for. The route **was** one of R1's four
  attributable paths, so round 1's "outside the four paths" deferral was incorrect on its own terms.
- **Fix:** atomic highest-revision application — a revision-conditional write so the **database**
  evaluates ordering, plus insert-on-conflict for the first-insert case. *(Implemented in the worktree
  at filing; uncommitted.)*

### D2 — Quota admission is not atomic [HIGH] (F05)

- **Claim under review:** the daily signal cap is enforced.
- **Evidence:** `coachSignalRoutes.mjs:125` `count(...)`, `:128` compare, `:135` `create(...)` — three
  separate awaits, no transaction, no lock. The duplicate check at `:117`→`:135` is itself a racy
  read-then-insert.
- **Exploitability / reach:** two concurrent requests from the same coach both observe four signals
  and both insert. The cap is advisory under concurrency.
- **Why it matters:** a quota that can be exceeded by racing is not a quota. Correct that this route
  is outside R1's four attributable paths; **incorrect** that it is outside the blueprint's R1 scope —
  `04-build-order.md#Integration edits` expressly includes it.
- **Fix:** count and insert in one transaction behind a per-coach lock. *(Implemented in the worktree
  at filing; uncommitted.)*

### D3 — Validation and persistence disagree [HIGH] (F07)

- **Claim under review:** the validated payload is the persisted payload.
- **Evidence:** `validateSpotlightPayload` returns **only** `{ ok: true }` (`:70`), discarding the
  normalized values; `:99` re-destructures the **raw** `req.body`; `str()` trims **and truncates**
  (`:50`, `slice(0, max)`), so a >36-char `itemId` validates as its first 36 characters but persists
  in full. Sharpest instance: `:123` gates image work on the **truthiness** of `retracted` while
  `:135` persists `retracted === true`.
- **Exploitability / reach:** a payload with the **string** `"false"` skips image re-hosting (truthy →
  treated as retracted) yet stores `retracted: false`. That is a live divergence between what the
  handler believes and what the row says.
- **Why it matters:** one DTO must be validated once and consumed everywhere.
- **Fix:** return the normalized values from the validator and consume them; bound `revision` to the
  stored INTEGER range; coerce `retracted` once so the image branch and the column agree. Ban #10
  requires an explicit compatibility decision for newly-rejected inputs — it does **not** require
  preserving accidental coercion. *(Implemented in the worktree at filing; uncommitted.)*

### D4 — The DNS-rebinding completion claim is unsupported [HIGH] (F08)

- **Claim under review:** redirect rejection closes rebinding.
- **Evidence:** `spotlightImageFetch.mjs:91` `await dns.lookup(...)`, validates at `:98–102`, then
  `:127` `fetchImpl(...)` **re-resolves independently**. The source **says so itself** at `:85–88`:
  *"this is a check-time validation only, NOT a complete DNS-rebinding defence … That residual gap is
  accepted because every caller of this path is gated behind a valid HMAC signature."*
- **Exploitability / reach:** a hostname that flips to a private address between lookup and fetch is
  still reached. The stated mitigation does not hold: **a valid publisher HMAC authenticates the
  sender, not the remote image server it names.** `redirect: 'error'` (`:131`) correctly closes the
  *redirect* re-entry, which is a different problem.
- **Why it matters:** the code is honest and the *documentation* is not —
  `04-build-order.md#rehostImage` claims rebinding is closed. A builder reading the blueprint would
  believe a defence exists that does not.
- **Fix:** bind the connection lookup to the validated public addresses, or require verified
  equivalent egress enforcement. Correct the blueprint claim either way.

### D5 — G0 is falsely closed [HIGH] (F09)

- **Claim under review:** readiness gate G0 is closed.
- **Evidence:** `00-README.md:5` *"G0 CLOSED"* and `:22` *"Gate G0 is closed"*; `MANIFEST.md:15,39`
  agree — while `MANIFEST.md:46` admits surviving `BLOCKED-G0` markers, `00-README.md:71` still
  demands *"replaces every `BLOCKED-G0` entry"*, and `08` lines 63–69 list **seven** G0-blocked
  decisions. Six excerpts are not the nine truth artifacts, and not a zero-blocker criterion.
- **Why it matters:** G0 is the gate that licenses implementation. Round 1 graded this *plausible*;
  round 2 raised it to **confirmed**, and the dispatcher reproduced the contradiction in the files.
- **Fix:** reopen G0 and separate evidence-only from implementation-release gates.

### D6 — A known-misleading suite remains in acceptance evidence [HIGH] (F10)

- **Claim under review:** the R1 evidence set is sound.
- **Evidence:** `swanBridgeIngest.test.mjs:24` mocks `r2StorageService.mjs` for `uploadPhoto`; the
  route imports it from `photoStorageService.mjs` (`bridgeIngestRoutes.mjs:196`). `mockUploadPhoto`
  never fires. The suite's two image assertions therefore exercised nothing they claimed to test.
- **Exploitability / reach:** not a runtime vulnerability — an **acceptance-evidence** defect. It
  inflates the apparent coverage of the image path.
- **Why it matters:** cases that pass for an unrelated reason should not count toward acceptance.
  **Corrected mechanism:** the assertions passed because the real decode fails on **DNS first**, so
  `uploadPhoto` is never reached — *not* because the real upload failed on missing credentials.
  Storage would fall back to disk rather than fail (`photoStorageService.mjs:180–184`).
- **Fix:** mock both real boundaries; force a successful decode in the upload-failure case; assert
  `mockUploadPhoto` was reached. *(Implemented in the worktree at filing; uncommitted.)*

### D7 — `rehostImage()` cannot distinguish R2 from local disk [MEDIUM] (R2-02)

- **Claim under review:** a non-null `imageUrl` means the image was re-hosted to R2.
- **Evidence:** `photoStorageService.mjs:179` returns `{ url, storage: 'r2' }`, `:197` returns
  `{ url, storage: 'local' }`, and `:180–184` **catches an R2 failure and falls through to disk**.
  `bridgeIngestRoutes.mjs:203` then does `return result?.url ?? null;` — **discarding `result.storage`**.
- **Why it matters:** the discriminator already exists and is thrown away, so a disk-fallback URL is
  stored as a successful re-host. Ban #4 exists precisely to stop non-R2 hosting being claimed.
- **Fix:** consult the existing signal — return null unless `result?.storage === 'r2'` — or route this
  caller through an R2-only boundary with no local fallback. Leave other upload callers unchanged.

### D8 — The fetch timeout does not bound DNS, and early rejection does not cancel the body [MEDIUM] (R2-03)

- **Claim under review:** image fetching is bounded.
- **Evidence:** `spotlightImageFetch.mjs:120` `await validateSpotlightImageUrl(...)` (which performs
  the DNS lookup) runs **before** `:132` `signal: AbortSignal.timeout(timeoutMs)` is created — so DNS
  time is outside the timeout. The early returns at `:146–148` (non-OK status) and `:153–154`
  (declared length over cap) return **without cancelling the response body**.
- **Why it matters:** a slow or lying upstream holds a connection open beyond the intended budget.
- **Fix:** describe the current timeout narrowly; add bounded DNS/connection/body handling and
  cleanup tests; budget decode/upload separately.

### D9 — The rail projection cannot supply `revision` [MEDIUM] (R2-04)

- **Claim under review:** the read path can support R2's measurement request.
- **Evidence:** `spotlightReadRoutes.mjs:36–44` projects `itemId, headline, dek, imageUrl, sourceName,
  sourceUrl, curatorNote, publishedAt` — **no `revision`**.
- **Fix:** add `revision` to the authenticated projection and the client DTO inside R2's explicit
  scope, then test a revision-changing refresh. A hook cannot supply an authoritative revision.

### D10 — The decision record contradicts the committed code [MEDIUM] (R2-01)

- **Claim under review:** the package's current decisions match the implementation.
- **Evidence:** `08-decision-density-self-test.md:47` — *"Signal day | **Decided:** Pacific calendar
  day"* — while `coachSignalRoutes.mjs:126` uses `startOfUtcDay()`. The committed code is UTC.
- **Fix:** make UTC (and nullable `postId`) the sole current decisions; label the contrary sections
  historical. *(The dispatcher reproduced the Pacific/UTC half directly; the
  `CORRECTIONS-APPLIED.md#3` half was not independently re-read.)*

### D11 — The submission's own status text is stale [MEDIUM] (F13)

- **Claim under review:** the submission's active instructions are current.
- **Evidence:** `R1-CHECKPOINT-SUBMISSION.md` §13 closes with *"**Unresolved question for the
  reviewer:** is the uncommitted-worktree submission (§1) acceptable, or do you want a scoped partial
  commit of the six files?"* — the change is now committed, so the question is obsolete. §12 still
  asserts the manifest route *"previously returned 500 to every caller"*, the overclaim F01 narrowed.
- **Fix:** supersede the submission's active status with an exact commit inventory and delete the
  obsolete question. Preserve the historical text.
- **Note:** this finding is **materially improved** from round 1 — commit identity and the FAIL verdict
  now exist. It is not fully resolved.

### D12 — Overstated slice claims, and a 318-line suite against a 299-line cap [MEDIUM] (R2-06)

- **Evidence:** `04-build-order.md:3,11` set a **≤299** line budget including tests;
  `git show HEAD:backend/tests/bridgeSpotlightOrdering.contract.test.mjs | wc -l` → **318**.
  `05-slices.md#R1` and the suite names still advertise rollback/restart/concurrency behaviour that
  is not exercised.
- **Fix:** split the suite by boundary; rename assertions that overstate what they check; add
  process-restart, rollback, and before/after-transition fixtures.

**MEDIUM findings carried from round 1, retested — all still open:** F01 (the universal-500 claim
survives in `CORRECTIONS-APPLIED.md#10` and submission §12; the route itself is corrected) · F02
(`05-slices.md#R1` still advertises a "concurrent-revision loser" and "duplicate rollback" that are
not exercised) · F03 (nullable `postId` is the right decision, but deployed constraints and historical
NULL rows remain unobserved) · F04 (both parsers still precede the handler feature gate; the
`bridgeSpotlightOrdering.contract.test.mjs:251` case still says "byte-identical" while comparing
parsed objects) · F11 (receiver live-inventory manifest vs publisher retained-event stream are still
conflated) · F12 (**`SwanSpotlight.mjs` has no degradation state and no receipt storage** — its 13
fields include nullable `imageUrl` only, so null cannot distinguish absent / failed / pending; return
truthful `unknown`, do not fabricate `degraded` or receipt IDs) · F14 (integer schema examples
conflict with UUID examples; `NOT VALID`/`VALIDATE` is wrongly grouped with `CREATE INDEX
CONCURRENTLY`) · F15 (later slices leave correctness choices implicit).

**Not independently re-derived by the dispatcher, and accepted on Astra's reading:** F11, F14, F15
and R2-05 are blueprint-consistency claims the dispatcher did not open. They are recorded as
**unrefuted, not reproduced.**

---

## 3. Not proven / unopened

- **Actual PostgreSQL constraints, drift, historical NULL rows, and two-connection races** — never
  observed. The migration *text* was read; nothing was executed. (D2, D3, F03)
- **Historical mutation executions and restore hashes** — round 2 reproduced none; the round-1
  dispatcher re-derived one. No immutable command logs exist.
- **Mounted application parser/error behaviour** — absent content type, compression, oversized
  requests, already-consumed bodies. (D3, F04)
- **Real publisher signature interoperability** — needs controlled staging requests.
- **Successful durable R2 hosting** — no controlled upload and read-back. (D7)
- **Production deployment of the reviewed SHA** — no deployment receipt; "shipped" here means
  committed, and production is **[UNKNOWN]**.
- **SwanGuard mounts, the approved integration commit, scheduler and domain adapters** — no pinned
  source receipts. (F15)
- **Archive completeness and reciprocal supersession** — Astra's session could not query the archive;
  its filename-scan fallback is not proof. *(The dispatcher ran `query.mjs` before and after filing.)*

---

## 4. What I deliberately did NOT do, and why

- **Did not commit anything.** At filing the repo held **1,242 dirty paths**, an 87-entry shared index,
  and a **1.8 MB `.git/index.lock` from an in-flight peer commit**. Filing is outside the repo and
  touches none of it. No `git add -A`, no blanket staging (06-bans #52/#53).
- **Did not clear the peer's `index.lock`.** A full-size lock with a live commit behind it is
  contention, not debris. Verified the seat's own lane records the commit as in flight before leaving
  it alone.
- **Did not edit the round-2 reply or the round-1 review.** Rule 86: superseded, never corrected. The
  reply is filed verbatim; the two corrections to the dispatcher's own claims live in this header and
  in the lane, not in Astra's text.
- **Did not fix D1–D3 or F10 as part of filing** — that work is the seat's own remediation and is
  uncommitted at filing; recording it here is not the same as landing it.
- **Did not treat Astra's `FAIL` as a reason to withhold the R1 commit** — it had already landed
  before this round; the verdict travels in the commit message and the submission instead.

---

## 5. Round log

| Round | Looked at | Found | Fixed | Re-verified |
|---|---|---|---|---|
| 1 (Astra, 2026-09-20) | The 202 KB R1 packet: 4-path delta, 2 suites, blueprint 00–08 + 03b + MANIFEST + CORRECTIONS + VERIFICATION + G0 excerpts | FAIL; 0/6/9/0; 7 unproven | — | not re-run (read-only session) |
| 1a (dispatcher adjudication) | Each finding reproduced against the shipped code | 0 refuted; F01/F02/F04 partly fixable in scope | F01 blast radius + fail-closed branch; F02 counts + test names; F04 wording; F13 verdict + file count | 10 files / 108 tests green; manifest mutation → exactly 2 red, restored SHA-256 verified |
| 2 (Astra, 2026-09-20, **this review**) | R1 **as committed**: the round-1 filed review, the submission, the 13 blueprints, the 2 suites, the 6 defect sites | **FAIL; 0/6/15/0; 8 unproven. All 15 round-1 findings retested, 0 refuted; 6 new Medium (R2-01…R2-06).** Two claims of the dispatcher's corrected | — | not re-run (Node/Bash denied) |
| 2a (dispatcher adjudication, this filing) | D1–D3, D5, D6, D7–D10, D12 reproduced at `file:line` against committed blobs; all 8 paths confirmed byte-identical `3688294988b9` → `4977987a7` → `b23155b99` | **0 refuted.** F11/F14/F15/R2-05 recorded as unrefuted-not-reproduced | — | revision identity re-measured, not asserted |

**Dry:** **not reached.** Two rounds have each found new material — round 1 found the six HIGH, round 2
confirmed them and added six Mediums. The loop closes when a full hostile pass finds nothing new, and
that cannot happen while D1–D3 are open at a revision and their fixes are uncommitted. **R2 and later
slices are NOT RELEASED; G0 implementation release is BLOCKED** until atomic quota admission, atomic
conditional revision application, and the receiver validation repair land and are re-reviewed.
```

---

## §4. Full source of every changed path, AT THIS COMMIT

### §4 — `backend/routes/bridge/bridgeIngestRoutes.mjs`

_(262 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
import express from 'express';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';
import { bannedTerms } from '../social/feedEnrichment.mjs';
import { verifyBridgeRequest } from '../../services/swanBridgeSignature.mjs';
import { applyBridgeSpotlightRevision } from '../../services/bridgeSpotlightRevisionApply.mjs';
import { rehostBridgeSpotlightImage } from '../../services/bridgeSpotlightImageRehost.mjs';

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

// `revision` is stored in an INTEGER column (SwanSpotlight.mjs:23). An out-of-range value
// passed validation and then failed at the column, so the bound is part of the contract.
export const SPOTLIGHT_MAX_REVISION = 2147483647;

/**
 * Validate AND normalize. It returns the exact values the handler must persist, so validation
 * and persistence cannot disagree (hostile review D3 / F07).
 *
 * It used to return only `{ ok: true }`. Three consequences: `itemId` was bounded here but the
 * handler stored the RAW `req.body.itemId`; `revision` had no upper bound; and `retracted` was
 * truthiness-tested in the image branch but strict-compared for storage, so `retracted:"false"`
 * stored `false` while skipping the image. Coercing once, here, removes all three.
 */
export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  const itemId = str(body.itemId, 36);
  if (!itemId) return { ok: false, reason: 'itemId is required.' };
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  if (body.revision > SPOTLIGHT_MAX_REVISION) {
    return { ok: false, reason: `revision must be at most ${SPOTLIGHT_MAX_REVISION}.` };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true, value: { itemId, revision: body.revision, headline, retracted: body.retracted === true } };
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

  // The VALIDATED, normalized values — never the raw body (D3).
  const { itemId, revision, headline, retracted } = validation.value;
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

    // Read ONLY to preserve the stored image across a text-only or retracted revision. This is
    // NOT the ordering guard — applyBridgeSpotlightRevision makes the database evaluate
    // `revision < incoming` inside the write itself (D1 / ban #19).
    const stored = await SwanSpotlight.findByPk(itemId, { attributes: ['imageUrl'] });

    const source = req.body.sourceAttribution && typeof req.body.sourceAttribution === 'object'
      ? req.body.sourceAttribution
      : {};
    const gate = req.body.gate && typeof req.body.gate === 'object' ? req.body.gate : {};

    // Image re-host is best-effort by design — never fail the ingest over a picture. A revision
    // that is about to carry an image starts at null, so a re-host failure leaves null and the
    // card renders text-only (ban #37); a retraction or text-only revision keeps what is there.
    const incomingImage = str(req.body.imageUrl, 2048);
    const willRehost = Boolean(incomingImage) && !retracted;

    const values = {
      itemId,
      revision,
      retracted,
      headline,
      dek,
      imageUrl: willRehost ? null : (stored?.imageUrl ?? null),
      sourceName: str(source.name, 80),
      sourceUrl: str(source.url, 2048),
      curatorNote,
      sortWeight: Number.isInteger(req.body.sortWeight) ? req.body.sortWeight : 1,
      publishedAt: toDate(req.body.publishedAt),
      expiresAt: toDate(req.body.expiresAt),
      gateHash: str(gate.checklistHash, 64)
    };

    const outcome = await applyBridgeSpotlightRevision({ SwanSpotlight, itemId, revision, values });
    if (!outcome.applied) {
      // A same-or-older revision: nothing was written, and no image was fetched for it.
      return res.status(200).json({ success: true, noop: true, itemId, revision: outcome.storedRevision });
    }

    // Attach the image ONLY now that this revision is the accepted, current one. The WHERE
    // clause re-checks the revision and the tombstone at attach time, so a newer revision or a
    // concurrent retraction cannot be handed a stale picture.
    if (willRehost) {
      const rehosted = await rehostBridgeSpotlightImage(incomingImage, itemId);
      if (rehosted) {
        await SwanSpotlight.update({ imageUrl: rehosted }, { where: { itemId, revision, retracted: false } });
      }
    }

    logger.info(`Spotlight ${retracted ? 'retracted' : 'stored'}: ${itemId}@${revision}`);
    return res.status(200).json({ success: true, itemId, revision, retracted });
  } catch (error) {
    logger.error('Spotlight ingest failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error during ingest.' });
  }
});

// Image re-host — its SSRF hardening, the wrong-import defect, and why it moved out of this
// file — lives in services/bridgeSpotlightImageRehost.mjs. Read that header before changing it.

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
```

### §4 — `backend/routes/social/coachSignalRoutes.mjs`

_(234 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
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

    // Quota admission is serialized PER COACH, with the count and the insert in ONE
    // transaction (hostile review D2 / F05). Counting and then inserting as two statements let
    // two concurrent requests for distinct posts both observe 4 and both insert — six signals
    // against a cap of five. The lock is a PostgreSQL advisory lock taken INSIDE the
    // transaction, so it is released on commit or rollback and holds across processes:
    // `06-bans.md` #42 forbids an in-memory-only quota, which is why this is not a local mutex.
    const sequelize = CoachSignal.sequelize;
    const admission = await sequelize.transaction(async (transaction) => {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
        replacements: { key: `coach-signal-quota:${req.user.id}` },
        transaction,
      });

      const sentToday = await CoachSignal.count({
        where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
        transaction,
      });
      if (sentToday >= DAILY_SIGNAL_CAP) return { capped: true };

      const created = await CoachSignal.create({
        coachId: req.user.id,
        memberId: post.userId,
        postId: parsedPostId,
        note: trimmedNote || null,
      }, { transaction });
      return { capped: false, signal: created };
    });

    if (admission.capped) {
      return res.status(429).json({
        success: false,
        message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.`,
      });
    }

    const signal = admission.signal;

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
```

### §4 — `backend/services/bridgeSpotlightRevisionApply.mjs`

_(75 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
import { Op } from 'sequelize';

/**
 * Atomic highest-revision apply for the SwanGuard -> SwanStudios Spotlight bridge.
 *
 * WHY THIS MODULE EXISTS (hostile review R1, finding D1 / F06, 2026-09-20).
 * The route used to read the row, compare `existing.revision >= revision`, `await` an image
 * re-host, and then call `existing.update(values)`. Two defects lived in that gap:
 *
 *   1. The guard was evaluated BEFORE the await, so `existing` was a stale in-memory
 *      instance by the time it was written. A delayed older revision could therefore
 *      overwrite a newer one.
 *   2. `update()` was unconditional. Nothing re-checked the revision at write time, so a
 *      late retraction could be overwritten by an older non-retracted delivery.
 *
 * `06-bans.md` #19 states the invariant this module enforces: *do not remove tombstones or
 * apply stale revisions over newer state.*
 *
 * The fix is to make the DATABASE evaluate the predicate, inside the write statement:
 *
 *   UPDATE "SwanSpotlights" SET ... WHERE "itemId" = ? AND "revision" < ?
 *
 * A concurrent newer revision that lands between the caller's read and this write cannot be
 * regressed, because the comparison happens atomically with the write. `itemId` is the
 * primary key, so a concurrent INSERT collides there and is handled explicitly below rather
 * than surfacing as a 500.
 *
 * SCOPE OF THE CLAIM — what this does and does not establish.
 * `SwanSpotlight.update()` compiles to a single SQL statement, so the conditional apply is
 * atomic per row. This module does NOT claim isolation across statements: the caller still
 * reads the row first, to PRESERVE the stored `imageUrl` across a text-only revision. That
 * read is not the guard — the guard is the WHERE clause — so a stale read can only produce a
 * stale `imageUrl` on a write the database then rejects anyway.
 *
 * NOT established here, and not claimed: that two concurrent applies on a live PostgreSQL
 * serialize correctly. That needs a real database; the contract suite mocks the model, so it
 * proves the predicate is constructed and the branch is taken, never that Postgres honours
 * it. Recorded as `[UNKNOWN]` in the round-3 packet rather than asserted.
 */

/**
 * Apply `values` only if `revision` is strictly newer than the stored revision.
 *
 * @returns {Promise<{applied: boolean, created?: boolean, storedRevision?: number}>}
 *   `applied: false` means a newer-or-equal revision is already stored and NOTHING was
 *   written. `storedRevision` is the revision that won, so the caller can echo it.
 */
export const applyBridgeSpotlightRevision = async ({ SwanSpotlight, itemId, revision, values }) => {
  const conditionalUpdate = () => SwanSpotlight.update(values, {
    where: { itemId, revision: { [Op.lt]: revision } }
  });

  const [applied] = await conditionalUpdate();
  if (applied > 0) return { applied: true, created: false };

  // Nothing matched. Either no row exists yet, or the stored revision is already >= ours —
  // and those two cases need opposite answers, so distinguish them with a read.
  const current = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
  if (current) return { applied: false, storedRevision: current.revision };

  try {
    await SwanSpotlight.create({ ...values, itemId, revision });
    return { applied: true, created: true };
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    // A concurrent INSERT won the primary-key race. Our revision may still be the newer of
    // the two, so re-run the conditional apply rather than treating the loss as a no-op —
    // assuming the loss means "superseded" would silently drop a legitimately newer revision.
    const [retried] = await conditionalUpdate();
    if (retried > 0) return { applied: true, created: false };
    const landed = await SwanSpotlight.findByPk(itemId, { attributes: ['revision'] });
    return { applied: false, storedRevision: landed?.revision ?? revision };
  }
};
```

### §4 — `backend/services/bridgeSpotlightImageRehost.mjs`

_(82 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
import logger from '../utils/logger.mjs';
import { fetchAndDecodeSpotlightImage } from './spotlightImageFetch.mjs';

/**
 * Re-host a SwanGuard image into SwanStudios' own R2 bucket.
 * Returns null on any failure — the caller renders a text-only card (blueprint ban #4:
 * never hot-link SwanGuard's URL in a production render path).
 *
 * MOVED HERE 2026-09-20 from `routes/bridge/bridgeIngestRoutes.mjs`, unchanged. The move was
 * forced, not opportunistic: R1's D1/D3 remediation pushed that route to 306 lines against
 * `06-bans.md` #50 ("no source file reaches 300 lines"), and this is the only self-contained
 * block in it that is I/O rather than routing. No behaviour changed in the move.
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
 *
 * (c) The storage discriminator was discarded. Fixed 2026-09-20 (hostile review D7 / R2-02).
 *     `uploadPhoto` catches an R2 failure and falls through to local disk, returning
 *     `storage: 'local'` — and this function returned `result.url` regardless, so a disk path was
 *     stored as a completed R2 re-host. Only `storage === 'r2'` is accepted now. Note that (b) and
 *     (c) hid behind the SAME mechanism: a total failure and a partial one were both just "no
 *     image", which is why the failure contract kept them invisible.
 */
export async function rehostBridgeSpotlightImage(url, itemId) {
  try {
    const decoded = await fetchAndDecodeSpotlightImage(url);
    if (!decoded.ok) {
      logger.warn(`Spotlight image for ${itemId} not re-hosted (${decoded.code}): ${decoded.message}`);
      return null;
    }

    // `uploadPhoto` is the single choke point for every upload caller and re-sniffs the
    // bytes itself, deriving the stored extension and Content-Type from them rather than
    // from anything this call declares.
    const { uploadPhoto } = await import('./photoStorageService.mjs');
    const result = await uploadPhoto(decoded.buffer, {
      userId: 0,
      category: 'swan-spotlight',
      originalFilename: `${itemId}.${decoded.ext}`,
      contentType: decoded.contentType
    });

    // R2 ONLY — the storage discriminator is the answer, not the presence of a URL.
    //
    // `uploadPhoto` catches an R2 failure and SILENTLY falls through to local disk
    // (`photoStorageService.mjs:180-184`), returning `{ url, storage: 'local' }` at `:197`.
    // The old `return result?.url ?? null` therefore stored a disk path as a COMPLETED re-host,
    // which is the exact claim ban #4 exists to prevent — and the path it stored would be served
    // from a filesystem that does not survive a redeploy, so the card would render a broken image
    // on the next deploy while the row still asserted a successful re-host.
    //
    // The discriminator already existed and was being thrown away (hostile review D7 / R2-02).
    // Degrading to `null` is the correct outcome: ban #37 says a broken image becomes a text-only
    // card, and this is a broken image in the only sense that matters — we do not have it.
    if (result?.storage !== 'r2') {
      logger.warn(
        `Spotlight image for ${itemId} not re-hosted: storage='${result?.storage ?? 'none'}' (R2 required)`
      );
      return null;
    }
    return result.url;
  } catch (error) {
    logger.warn(`Spotlight image re-host failed for ${itemId} (non-fatal): ${error?.message}`);
    return null;
  }
}
```

### §4 — `backend/tests/bridgeSpotlightOrdering.contract.test.mjs`

_(409 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
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
```

### §4 — `backend/tests/api/swanBridgeIngest.test.mjs`

_(283 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
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
```

### §4 — `backend/tests/coachSignalIntegrity.contract.test.mjs`

_(313 lines at `b4ea7968f86df614a6eda5ec5de48f4f39722c51`)_

```js
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
  mockTransaction, mockQuery,
  session,
} = vi.hoisted(() => ({
  mockSignalFindOne: vi.fn(),
  mockSignalCount: vi.fn(),
  mockSignalCreate: vi.fn(),
  mockPostFindOne: vi.fn(),
  mockAssignmentFindOne: vi.fn(),
  mockUserFindByPk: vi.fn(),
  mockCreateNotification: vi.fn(),
  // D2: quota admission now runs inside `CoachSignal.sequelize.transaction(...)` and takes a
  // PostgreSQL advisory lock before counting. These two are the seam that lets a mocked model
  // exercise that path at all — without them the route throws before reaching the count.
  mockTransaction: vi.fn(),
  mockQuery: vi.fn(),
  // `id` is a STRING here on purpose: authMiddleware attaches `req.user.id` via toStringId
  // while Sequelize INTEGER columns surface as numbers. The route must normalise both.
  session: { user: { id: '7', role: 'trainer' } },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => { req.user = session.user; next(); },
}));
vi.mock('../models/social/CoachSignal.mjs', () => ({
  default: {
    findOne: mockSignalFindOne,
    count: mockSignalCount,
    create: mockSignalCreate,
    sequelize: { transaction: mockTransaction, query: mockQuery },
  },
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
  // Run the transaction body against a stub handle so the admission path actually executes.
  mockTransaction.mockReset().mockImplementation(async (work) => work({ id: 'test-transaction' }));
  mockQuery.mockReset().mockResolvedValue([[], 0]);
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

describe('coach signal — quota admission is serialized and transactional (D2)', () => {
  // WHAT THESE CAN AND CANNOT PROVE. Hostile review F05 found that `count` then `create`, as
  // two unserialized statements, let two concurrent requests for DISTINCT posts both observe 4
  // and both insert — six signals against a cap of five. The fix is a per-coach PostgreSQL
  // advisory lock taken inside ONE transaction.
  //
  // These tests drive the real router and assert that the lock is TAKEN with the right key and
  // that the count and the insert share ONE transaction. They CANNOT prove that PostgreSQL
  // serializes two real sessions — that needs a live database and is recorded as `[UNKNOWN]`
  // in the round-3 packet rather than asserted here. Naming the limit is the point: round 1's
  // F02 caught a case whose name advertised a race it never injected.
  const CAP = 5; // mirrors DAILY_SIGNAL_CAP in the route

  it('takes a per-coach advisory lock before counting', async () => {
    await post();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, options] = mockQuery.mock.calls[0];
    expect(sql).toContain('pg_advisory_xact_lock');
    // Scoped to the coach, so two different coaches never block each other.
    expect(options.replacements.key).toBe('coach-signal-quota:7');
  });

  it('counts and inserts inside the SAME transaction, and hands it to both', async () => {
    await post();

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    const handle = { id: 'test-transaction' };
    expect(mockSignalCount.mock.calls[0][0].transaction).toEqual(handle);
    expect(mockSignalCreate.mock.calls[0][1].transaction).toEqual(handle);
  });

  it('takes the lock BEFORE the count, so the read cannot be stale', async () => {
    const order = [];
    mockQuery.mockImplementation(async () => { order.push('lock'); return [[], 0]; });
    mockSignalCount.mockImplementation(async () => { order.push('count'); return 0; });
    mockSignalCreate.mockImplementation(async () => {
      order.push('insert');
      return { id: 99, postId: 3, memberId: MEMBER_AUTHOR, note: null, createdAt: new Date() };
    });

    await post();

    expect(order).toEqual(['lock', 'count', 'insert']);
  });

  it('does not insert when the lock-protected count is already at the cap', async () => {
    mockSignalCount.mockResolvedValue(CAP);

    const res = await post();

    expect(res.status).toBe(429);
    expect(mockSignalCreate).not.toHaveBeenCalled();
  });

  it('leaves no half-counted admission behind when the insert fails', async () => {
    const race = Object.assign(new Error('duplicate key value'), { name: 'SequelizeUniqueConstraintError' });
    mockSignalCreate.mockRejectedValue(race);

    const res = await post();

    expect(res.status).toBe(409);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
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
```

---

## §5. The claims I most want falsified

Ordered by how much a wrong answer would cost. Each is stated so evidence can settle it.

1. **The commit holds the code that was reviewed** (§1.4, §1.5). Six of the seven blobs are
   identical to what rounds 3 and 4 read. `bridgeSpotlightImageRehost.mjs` **differs**, and §1.5
   prints the diff: it is an **additive** D7/R2-02 change — a `storage !== 'r2'` guard replacing an
   unconditional `return result?.url ?? null` — on top of the reviewed content. So the reviewed
   remediation survives intact and the addition is **new material that no round has reviewed**.
   Two things to settle: whether §1.5 confirms the addition is purely additive (if it removes or
   rewrites a reviewed line, rounds 3/4's verdicts do not transfer), and whether the D7 guard itself
   is correct — see claim 10.
2. **Round 4's central claim survives: the four round-2 HIGH code findings are genuinely fixed.**
   Re-test each against §4. In particular: is the ordering predicate *in the write*
   (`UPDATE … WHERE itemId = ? AND revision < ?`), or merely *also* in a read guard that still runs
   before an await and is therefore still stale? Does a lost primary-key race **retry** the
   conditional apply, and is the retry bounded?
3. **The quota fix is atomic against two live sessions, and its lock key is per-coach.** Read
   `coachSignalRoutes.mjs`: the advisory lock must be taken **before** the count (taken after, it is
   decorative) and keyed on the coach id (a global key would serialize every coach and still pass
   the tests). Verify the uniqueness constraint is real by reading the migration, not the model.
4. **No database lock or transaction spans network I/O.** Round 2's A2 required committing text
   first and doing image work outside the transaction. A transaction that spans DNS/fetch/decode/
   upload serializes retractions behind image work.
5. **Validation and persistence agree.** The handler must consume the validator's returned DTO, not
   re-destructure `req.body`; `itemId` must not be truncated into a different stored value;
   `revision` must be bounded to the INTEGER range; `retracted` must be coerced **once** so the image
   branch and the stored column cannot disagree (round 2 found `"false"` skipped the image while
   storing false).
6. **The corrected suite now reaches the uploader.** A corrected mock specifier that still never
   fires fixes nothing. Round 4 says `swanBridgeIngest.test.mjs:272` asserts `mockUploadPhoto` was
   reached; verify that assertion exists and that it fails if the mock does not fire. A test that
   cannot fail is not evidence.
7. **The commit message's two stale claims are corrected in THIS message — and one of them is
   unfixable elsewhere.** Round 2 refuted the draft's mechanism ("the REAL upload failed on missing
   credentials" — the real decode fails on **DNS first**, so the upload is never reached), and the
   draft described round 2 as "IN FLIGHT" when it had been filed. Test whether this message states
   both correctly. Then check the *earlier landed* commit `3688294988b9`, which still carries the
   refuted sentence and cannot be amended without rewriting published history — round 4 recorded that
   as an outstanding item. Say whether that is an acceptable erratum or an open defect.
8. **Two extractions did not change behaviour.** `bridgeSpotlightRevisionApply.mjs` and
   `bridgeSpotlightImageRehost.mjs` were carved out of the route under a 300-line budget. Extractions
   are where behaviour silently changes. Diff the semantics, not the formatting.
9. **The route is still fail-closed where it was.** A bodyless GET must remain reachable; a
   declared-but-consumed body must still fail closed; `buildCanonicalPayload` must still sign
   `"<timestamp>."` for an empty Buffer. Round 2 found the "exact bytes" framing too strong — check
   whether the current code or comments repeat it.
10. **The additive D7/R2-02 guard in `bridgeSpotlightImageRehost.mjs` is correct, and its failure
    mode is the right one.** It now returns `null` unless `result?.storage === 'r2'`, on the
    reasoning that `uploadPhoto` catches an R2 failure and silently falls through to local disk
    (`photoStorageService.mjs:180-184`, returning `storage: 'local'` at `:197`), so the old
    unconditional return stored a **disk path as a completed R2 re-host**. Test it: read
    `photoStorageService.mjs` and confirm the discriminator and the fall-through are as described;
    confirm that `null` is the right degradation rather than, say, propagating a distinct
    partial-failure signal that a caller could record; and check the new `logger.warn` cannot itself
    throw on a missing `result`. Note also that this hunk was **not** reviewed by rounds 3 or 4 —
    it entered the commit after they read the file — so it carries no prior verdict at all.

11. **The one claim neither you nor round 4 can settle by reading.** `D1/F06` and `D2/F05` remain
    `[UNKNOWN]` at the database level: the suites **mock the model**, so they prove the predicate is
    constructed and the branch taken, never that PostgreSQL honours `UPDATE … WHERE revision < ?`
    under real contention. If you can execute, say exactly what you ran. If not, mark it BLOCKED —
    do not let a read-only pass read as a clean one.

---

## §6. What I am not asking you to do

- **Do not re-run the master reconciliation review.** It already ran at `17:32:41` and is filed as
  `Z:/HostileReviews/2026-09-20-173241-master-reconciliation-astra-hostile-review-of.md` (DEFECTS-FOUND 1/8/1/0). It reviewed the **cross-lane planning and admission
  packet**, not this repo, and issued **no implementation verdict**. Re-commissioning it is redundant.
- Do not re-derive rounds 1–4 from scratch. Read them in §2/§3 and adjudicate.
- Do not review the console workstream (`packages/creator-brains-console/**`) — separate seat,
  separate rounds.
- Do not review the deployed runtime; production remains [UNKNOWN] and no deployment receipt exists.
- Do not treat this packet as complete evidence. It contains **no test output**: the suites were run
  by other seats and their results are **claimed, not attached**. That gap is itself fair game.

---

## §7. Filing

This session is read-only; the dispatcher files the reply under Rule 86, **superseding
`2026-09-20-171502-social-bridge-completion-r1-correctness`** (round 2).

Two notes on the chain, so the archive is not left lying:

- Rounds **3 and 4 left `supersedes: null`**, so round 2's FAIL still reads as the current verdict
  for the R1 subject even though the remediation landed and round 4 verified it. This round closes
  that gap. Rounds 3 and 4 reviewed different subjects/states and are **cited, not superseded**.
- Emit the usual contract: PART A hostile review, PART B forged package, PART C decision-density
  self-test, and the nine `NN-*.md` documents.
