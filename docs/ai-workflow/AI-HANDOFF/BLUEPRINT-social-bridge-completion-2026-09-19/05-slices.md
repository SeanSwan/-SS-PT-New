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
