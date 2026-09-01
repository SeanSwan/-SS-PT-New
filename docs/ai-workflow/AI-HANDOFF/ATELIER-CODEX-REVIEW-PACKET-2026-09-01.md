---
decision: "Consolidated Codex review packet for the Atelier video-poster slice and the six backlog slices that followed. 18 commits, 67 files. Written to be attacked, not admired."
status: open
supersedes: none
---

# Codex review packet — Atelier, `14b04c407..2958ae3fb`

**Branch** `feat/atelier-v2-compose` · worktree `c:/tmp/ss-atelier-v2` · pushed · not deployed
· **18 commits, 67 files, +5073/−144** · Linear **SWA-165**

Nine hostile rounds ran against the first slice with GLM 5.3 + Qwen 3.8 (records in
`panel-2026-08-27-atelier-video-poster/`). The six slices after it were reviewed **solo** —
the seats were out of tokens — which is exactly why this packet exists. **Treat the solo
slices as the least-reviewed code here.**

Everything below was falsified: each fix was neutered, its own test confirmed red, and the
file restored. Where that process itself went wrong, it says so.

---

## 0. If you only attack four things

1. **`keyOwnedByRow`** (§2) — a security predicate I got wrong **twice** before this version.
   It is the sole guard on four signing sites.
2. **`completeJob`** (§3) — a money/lease path, newly given dependency injection, with three
   behaviour changes. Its tests use fakes; **no Postgres has ever run them.**
3. **The 400 → 502 change** on an unauthenticated public endpoint (§5).
4. **The claim in §7 that `date_trunc` cannot be indexed** — I acted on it by deleting a
   migration. If I am wrong, a real performance fix was thrown away.

---

## 1. What the work was

The Assets library rendered every video as a grey box while its poster sat in storage.
`assetLibrary.mjs` skipped any row that was not an image; `videoRenderJobService.mjs:279`
writes `posterR2Key` onto the `MediaAsset` row for a finished clip.

Fixing that turned out to arm an existing hole, and the rest of the session followed from it.

---

## 2. The security core — `assetKeyOwnership.mjs`

**The exposure.** `POST /api/render-agents/jobs/:jobId/complete` (`renderAgentRoutes.mjs:176`)
does `const { r2Key, mime, ...meta } = req.body` and spreads `...meta` into `completeJob`,
which writes `posterR2Key` and `provenance` into `MediaAsset` defaults. **Nothing validated
them** — `verifyObject` checks that an object EXISTS at `r2Key`, never that a key is ours —
and `generateThumbnailUrl` presigns whatever key it is handed with no prefix restriction.

Inert before this slice, because non-image rows were never signed. **Signing video posters is
what would have armed it.**

```js
export function keyOwnedByRow(key, row) {
  if (typeof key !== 'string' || !key || !row) return false;
  const seg = key.split('/');
  if (seg.some((x) => !x || x === '.' || x === '..')) return false;

  if (seg.length >= 4 && seg[0] === 'atelier' && seg[1] === 'stills') {
    return row.ownerUserId !== null && row.ownerUserId !== undefined
      && seg[2] === String(row.ownerUserId);
  }
  if (seg.length >= 3 && seg[0] === 'jobs') {
    return row.jobId !== null && row.jobId !== undefined && seg[1] === String(row.jobId);
  }
  return false;
}
```

**I got this wrong twice.** v1 asked only "does the owner's id appear as SOME segment" — too
strict (a real video poster is `jobs/<jobId>/…` and carries no user id, so every legitimate
clip would have failed closed into the grey box the slice removes) **and** too loose
(`jobs/7/…` passed for owner 7 where that 7 is a *job* id). Both seats caught it
independently.

**Applied at four sites:** `assetPreviews.previewKeyFor`, `publishAsset.publishedReference`,
`publishAsset.resolvePublic` (**unauthenticated**), `motionBind.initImageReadTicket`.

### Attack these

- The two namespaces are the only ones this system writes — `persistStills.mjs:52`,
  `stillThumbnail.mjs:35`, `r2KeyForJob` (`videoRenderJobService.mjs:55`). **Is there a third
  I missed?** A writer using a different shape has its assets silently refused.
- `jobId` is a UUID and `ownerUserId` an integer, so they cannot collide. **Verify that
  holds** — if any deployment has integer job ids, `jobs/7/…` becomes reachable for owner 7.
- Segment equality is `String(row.x)`. Any coercion surprise?
- I refuse `.`/`..` segments. S3 keys are opaque and do not resolve them, so this is not
  traversal defence — is it therefore excluding a legitimate key shape for nothing?

---

## 3. `completeJob` — a money path with fakes for tests

Three defects in one `findOrCreate`, unfixable for two sessions because nothing there was
testable. `completeJob` now takes `jobModel` / `assetModel` / `db` through `options`.

- **(a)** `where: { r2Key }` → `where: { r2Key, ownerUserId: job.userId }`. It was finding
  and silently adopting other tenants' rows.
- **(b)** `defaults` are ignored on the found path, and the poster written twelve lines later
  belongs to `job.update` — the **job**, not the asset. Now backfilled, never overwritten.
- **(c)** the caller-supplied poster is validated with `keyOwnedByRow` and **dropped, not
  rejected** — a poster is an optimisation, and refusing the completion would trade a missing
  thumbnail for a lost render.
- **and** owner-scoping turns a collision into a UNIQUE-index throw
  (`ma_r2_key_live_uniq`), so that is named `409 KEY_COLLISION` rather than an unhandled 500.

### Attack these

- **The tests are fakes end to end.** They prove the logic this function applies; they do not
  prove Sequelize does what the fakes pretend. `findOrCreate` semantics under a partial unique
  index, inside a transaction, are exactly where a fake and reality diverge.
- Does adding `ownerUserId` to the lookup break the **idempotent replay** path? I reasoned it
  cannot — `job.userId` is stable across replays of the same job — but that is reasoning, not
  a test against a database.
- **(c) drops silently with a `logger.warn`.** Is silent-drop right, or should a caller
  declaring a foreign key be refused outright? I chose availability. Argue the other side.
- The collision catch keys on `err.name === 'SequelizeUniqueConstraintError'`. Fragile across
  Sequelize versions?

---

## 4. Signals — what the library is allowed to CLAIM

`previewsUnavailable` drives a page-wide banner: *"this is a preview-signing problem, not a
problem with your assets."* It now requires `attempted >= 2`.

- A sample of one cannot distinguish a purged object from a broken signer, so it asserts no
  cause; the log still speaks at every branch.
- **Round 3 reversed round 2 here**, and round 7 corrected the *reasoning*: presigning is a
  local HMAC (`@aws-sdk/s3-request-presigner`), so a purged object signs fine and 404s in the
  browser. Under today's signer a lone failure really is signer-side. The gate survives on the
  weaker ground that `readUrl` is an **injected seam** and the contract does not promise a
  signer never touches the object.
- A **partial** failure (some sign, some do not — e.g. a credential scoped to `atelier/*`
  passing stills and refusing clips) is logged but deliberately **not** bannered.

### Attack this

**Is the `attempted >= 2` gate justified at all?** If no conforming signer can fail
per-object, it costs a true signal in a rare shape and buys nothing. I kept it on a
contract argument. That is the weakest reasoning in this packet.

---

## 5. The unauthenticated endpoint

`GET /api/atelier/public/:id` — no auth by design. Two changes:

- **A ceiling**, 600/15min per IP. My first number was 120, reasoned from what *one reader*
  costs; fifty people behind one office NAT loading a six-image page is 300 legitimate
  requests on one `req.ip`. The test asserts the burst gets through, not just that the
  ceiling exists.
- **404 stopped meaning two things.** Every exception returned 404, so a rotated credential
  told the internet a published asset was GONE. Now 404 is the not-found predicate only;
  a downstream failure is 502 with a generic body.

### Attack these

- **Is 502-vs-404 an existence oracle?** I argue not: an unpublished asset still 404s through
  `resolvePublic` returning null, and only a caller already holding a valid UUIDv4 reaches
  the catch. Check that reasoning.
- 600/15min per IP is no defence against a distributed flood — stated in the code. Is a
  per-IP limiter on a public embed endpoint worth its availability cost at all?

---

## 6. Tooling — two things that had never worked

**`test-baseline-gate.mjs` had never given a correct answer.** Its parsers anchored on
literal text; vitest writes colour. Measured: raw → 0 files, null totals; stripped → 35
files, `{failed: 6, passed: 9904}`. It failed CLOSED, so nothing shipped — and that is why
nobody noticed. A gate stuck on FAIL is indistinguishable from a red suite.

**16 `node:test` suites were recorded as known-failures while passing 178/178**, run by no
automated path. They could never have left the baseline: the rot detector prunes entries that
start passing, and a file vitest cannot collect never starts passing.

Result: failing files **35 → 19**, baseline **23 → 7**, zero regressions, and the remainder
correctly classified as an install problem (`jose`, `sanitize-html` declared and absent).

### Attack these

- `parseMissingPackages` attributes a package to **every FAIL since the last error block**,
  because vitest groups suites. Does that over-claim on any reporter shape I have not seen?
  Over-claiming here **hides a real regression as "environment"** — the worst failure this
  code can have.
- Exit code 3 is new. Anything consuming this gate's exit status?
- The `.nodetest.mjs` convention rests on `*.test.mjs` not matching it. Subtle. The explicit
  vitest `exclude` is belt-and-braces — is it enough?

---

## 7. The claim I acted on by deleting code

I wrote a migration for the `MediaAsset` indexes, then deleted it.

`date_trunc(text, timestamptz)` is **STABLE** (TimeZone-dependent), so Postgres refuses it in
an index expression. Casting only the index (`created_at::timestamp`) creates cleanly and is
then **never used**, because `buildAssetQuery` emits bare `created_at`
(`assetLibrary.mjs:140`) and an expression index only serves a query written the same way.
An unused index costs writes and buys nothing.

**If this reasoning is wrong, I destroyed a real fix.** The module header and the handoff both
prescribed that index; I corrected both to say it cannot be created as written and that the
real change touches the cursor-comparison path on both sides at once — where a mismatch
silently drops the rows of a four-up Compose batch rather than erroring.

---

## 8. Verification

| | |
|---|---|
| Backend, atelier + touched suites | **626/626 across 45** |
| Frontend studio | **142/142 across 15** |
| `node --test` (previously invisible) | **178/178, exit 0** |
| Full backend | **9923 passed / 6 failed** — the same six |
| Baseline gate | exit 3, **zero regressions**, 12 files named as install |
| Guards | line cap, frontend guards, token registry, secret scan — clean |

**Every fix falsified.** Two files remain over the 300-line cap and are named as deferrals
with reasons (`videoRenderJobService` 466, `rateLimiter` 357) — both were over before this
work.

---

## 9. Where I know I am weak

- **§3's tests never touch a database.** That is the largest gap in the packet.
- **§4's gate** rests on a contract argument, not an observed failure mode.
- **Six slices had no second reader.** The nine-round record shows what a second reader found
  on the one slice that had one: two security misclassifications and a guard wrong in both
  directions. Assume the solo slices contain the same density and have not been found.
- **Qwen produced two fabricated P0s** in nine rounds (a pagination claim contradicted by the
  paste it was given; an "attacker sets `row.jobId`" claim contradicted by `jobId: job.id`).
  Its verdicts carry no information in either direction — **only its reasoning is worth
  tracing**, and the same caution applies to mine.
- **Six of the seats' findings across nine rounds were artifacts of what I failed to paste**,
  not defects. If something here looks missing, check whether this document simply omitted it
  before concluding the code is wrong.

## 10. My own mistakes this session, as a prior on where to look

A neuter that silently no-opped and I read it as proof (no assert on the match count; two
`SequelizeUniqueConstraintError` handlers in one file, I hit the wrong one) · sanitising one
half of a pair inside the fix for a pair defect · an exemption list I built that rotted within
the hour, first bad entry mine, because a *reason* makes an exemption reviewable but not true
· a detection heuristic that would have deleted two working suites · `node --check` passing a
file where `logger` was undefined · nearly importing two scripts that spawn test runs at
top level.

**The pattern: I am reliably wrong in the direction of trusting a proxy for the thing itself**
— a name, an import, a count, a comment. Attack the places where this code believes a label.
