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

