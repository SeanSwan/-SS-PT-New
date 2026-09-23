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
| **`Desktop/@Everything/SwanGuard-Newsroom`** | **`merge/newsroom-mainline-v3` @ `1bd08d4`** | exists (`FeedLanes.tsx` 76, `StorySheet.tsx` 517) |

> **Pin re-set 2026-09-20.** This row previously read `@ d830bed`. The branch has advanced 12 commits
> and the remote `refs/heads/merge/newsroom-mainline-v3` is at `1bd08d4`, matching the worktree HEAD —
> the push is confirmed complete. `d830bed` is retained here only as the superseded value.

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
- **No redirect is followed** ✅ — `redirect: 'error'`. This is the decisive control for the
  **redirect** re-entry problem: "validate every redirect" is strictly weaker than following none.
  **Corrected 2026-09-20 (hostile review D4 / F08):** this bullet previously continued *"…because the
  validated URL is then always the connected URL, and the rebinding TOCTOU closes with it."* That
  inference was **wrong** and is removed. `spotlightImageFetch.mjs` resolves DNS to validate
  (`:91`), then calls `fetch` (`:127`), which **re-resolves independently** — so the validated
  address is not necessarily the connected one. The module's own comment says so
  (*"a check-time validation only, NOT a complete DNS-rebinding defence"*). A valid publisher HMAC
  authenticates the **sender**, not the remote image server it names. **DNS rebinding remained an
  open, accepted residual risk, not a closed one.**

  **Corrected again 2026-09-21 — now CLOSED at the connect boundary.** The residual above was
  documented but not fixed. It is now fixed: `resolveAndValidate` in
  `backend/services/spotlightImageUrlPolicy.mjs` **returns the addresses it approved** instead of
  discarding them (discarding them was the defect — the fetch had no choice but to resolve again),
  and `createPinnedDispatcher` builds an `undici.Agent` whose `connect.lookup` answers from that
  fixed set. `spotlightImageFetch.mjs` passes that dispatcher to its `fetch` call, so the socket can
  only go where the check looked. **The re-resolution path no longer exists.**
  - **Honest caveats, stated rather than glossed.** (1) A pinned `connect.lookup` is consulted only
    when the transport must resolve a NAME. An **IP-literal** host (`https://10.0.0.1/`) short-circuits
    the resolver and never reaches the pin — the literal case is closed by **admission** instead
    (`resolveAndValidate` validates a literal directly against the same private-range table, before a
    dispatcher is built), and a test asserts both halves of that asymmetry. (2) The pin makes the
    *first* hop honest; not following redirects at all (`redirect: 'error'` above) is what keeps the
    connected host the validated host, so the two controls are complementary and neither is a defence
    on its own. (3) The 3 s `DNS_LOOKUP_TIMEOUT_MS` pre-flight bound applies to the pinned setup too.
  - Evidence: `backend/tests/unit/spotlightImageDnsPin.test.mjs` (18 tests). Four mutations were run
    against it; the first — removing the `dispatcher` from the fetch call — **passed all 15 tests
    that existed at the time**, proving that constructing a pin is not the same as wiring one. The
    suite now asserts the call itself, and that mutation turns 2 tests RED.
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
| `backend/routes/bridge/bridgeIngestRoutes.mjs` | Extract shared application service without changing shipped HTTP contract. **The `rehostImage()` SSRF controls above are DONE** — the function now delegates to `spotlightImageFetch.mjs`. See `CORRECTIONS-APPLIED.md` §4. **Scoped 2026-09-20 (hostile review D4 / F08): "DONE" covers redirect rejection, the HTTPS-only rule, the streamed byte cap and SVG rejection. It does NOT cover DNS rebinding, which remains an open accepted residual risk.** **Updated 2026-09-21: DNS rebinding is now closed at the connect boundary too** (pinned `connect.lookup` over the validated addresses) — so "DONE" now covers it, subject to the IP-literal and redirect caveats recorded above. |
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
