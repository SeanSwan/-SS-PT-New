---
decision: "Handoff for the Atelier video-poster slice (nine hostile rounds) and the eight backlog slices worked on 2026-09-01. The defect backlog is done; what remains is trigger-gated, feature work, or Sean's decisions, each named with why. Review packet: ATELIER-CODEX-REVIEW-PACKET-2026-09-01.md."
status: open
supersedes: none
---

# Atelier video-poster slice — handoff · 2026-08-28

**Read this file, then `git log --oneline main..HEAD | head -12`. Nothing else is required.**

This continues `ATELIER-SESSION-HANDOFF-2026-08-27.md`, which remains correct for everything
before this slice. Read that one for the studio as a whole; read this one for what changed
and what is owed.

---

## 0. Where the work is

| | |
|---|---|
| **Worktree** | `c:/tmp/ss-atelier-v2` — a git worktree, **not** the main checkout |
| **Branch** | `feat/atelier-v2-compose` · **HEAD `3a73d55ef`** · **99 ahead of `main`** (local `main` was fast-forwarded to `origin/main` on 2026-09-01, which is why earlier counts here read ~190) |
| **Pushed** | **YES**, all of it |
| **Deployed** | **NO.** Nothing from this branch is in production |
| **PR** | **#73**, open, unmerged |
| **Review record** | `ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md` + `panel-2026-08-27-atelier-video-poster/` (GLM + Qwen, rounds 1–8) |

Working tree is clean apart from pre-existing untracked `hermes-inbox/pending/` memos that
were there before this session.

---

## 1. STEP 1 — DONE 2026-09-01. Kept for the procedure.

The two fixes this section flagged as unfalsified were neutered on 2026-09-01 and each
reddened only its own test: the attribution sanitiser reddens both attribution assertions and
leaves the legitimate-credit one green; the partial-failure warn reddens the SOME-fail case
alone. **The disclosure in `356fef248` is discharged.**

The procedure below is left in place because it is the one that has ever found this defect
class, and because a later reader will need it. Two fixes had **passing tests that had never
been seen to fail**:

```bash
cd c:/tmp/ss-atelier-v2/backend
cp services/atelier/publishAsset.mjs   /c/tmp/pub.GOOD.mjs
cp services/atelier/assetPreviews.mjs  /c/tmp/prev.GOOD.mjs

# A — attribution sanitiser: replace the .replace() chain with String(base.attribution || '')
#     EXPECT: "an attribution cannot close the HTML comment it sits in" reddens, alone.
npx vitest run tests/unit/atelierPublish.test.mjs

# B — partial-failure warn: change `} else if (failed >= 2) {` to `} else if (false) {`
#     EXPECT: "warns when SOME previews fail while others succeed" reddens, alone.
npx vitest run tests/unit/assetLibrarySignerSignals.test.mjs

cp /c/tmp/pub.GOOD.mjs  services/atelier/publishAsset.mjs
cp /c/tmp/prev.GOOD.mjs services/atelier/assetPreviews.mjs
```

**Back up to the scratchpad, never to git** — `git checkout --` discarded uncommitted work
during falsification earlier in this workstream.

If either does **not** redden, the test is passing for the wrong reason. That is the defect
class this slice found **four times in its own suite**, and neutering is the only thing that
has ever caught it.

---

## 2. What this slice did

Every clip in the Assets library rendered as a grey box while its poster sat in storage.
`assetLibrary.mjs` skipped any row that was not an image, and `videoRenderJobService.mjs:279`
writes `posterR2Key` onto the `MediaAsset` row it creates for a finished clip.

The Assets tab **already lists video** — the frontend sends only `brandKit`/`status`/`cursor`,
so `buildAssetQuery` adds no kind clause, and `reusable()` has a purpose-written video
message. This was a bug on a live surface, not a missing feature. The "should the Assets tab
list video at all?" question the previous handoff flagged as blocking was already answered by
shipped code.

Nine commits, `9ffc6de65..356fef248`:

| Commit | What |
|---|---|
| `9ffc6de65` | `previewKeyFor` — poster preferred, fallback conditional on the original being a picture; `assetPreviews.mjs` extracted at the line cap; card marks non-image kinds |
| `19588d5bf` | pins the `assetView → kind` seam the marker depends on |
| `1648bf3f1` | gates the misconfiguration *claim*, not the flag; an absent signer stops being silent |
| `445165148` | the banner was the same claim as the log and I had gated only one |
| `417ecbce2` | records the `r2Key`-never-mutated invariant the poster preference leans on |
| `9ec44c7a8` | a signer that resolves nothing counts as failed |
| `4d7093fe6` | **security** — key check anchored on the row's own ids; publish signer guarded |
| `46c39710e` | one `finiteOrNull` for `seed` and `sizeBytes`; retracted rationale removed |
| `356fef248` | **security** — attribution sanitised; partial failure logged |

---

## 3. Design decisions that will look arbitrary. Do not undo them.

Each cost a defect. The code says so at every site.

1. **`previewKeyFor` is ONE function, not an image branch beside a video branch.** The image
   fallback to `r2Key` is correct; copying it to video signs an MP4 into an `<img>`. Sixteen
   of the previous loop's thirty-one defects were a rule applied to one half of a pair, and
   this slice produced **five more** — twice inside the fix for it.
2. **`keyOwnedByRow` anchors on ids ON THE ROW, at a POSITION, in a known namespace** —
   `atelier/stills/<ownerUserId>/…` and `jobs/<jobId>/…`. My first version asked only
   "does the owner's id appear as some segment", which was **too strict** (a real video
   poster carries no user id, so every clip would have failed closed into the grey box this
   slice removes) and **too loose** (`jobs/7/…` passed for owner 7 where 7 is a job id).
   `jobId` is a UUID, so the collision is structurally dead rather than filtered.
3. **The predicate lives in its own module** because it has two consumers. Copying it into
   `publishAsset.mjs` would be the duplication the whole slice is about.
4. **`previewsUnavailable` requires `attempted >= 2`.** Its only consumer is a page-wide
   banner asserting *"this is a preview-signing problem, not a problem with your assets."*
   At a sample of one that is a claim nobody can make. Nothing goes silent — the log speaks
   at every branch.
5. **The reason is the CONTRACT, not today's signer.** Presigning is a local HMAC, so a
   purged object signs fine and 404s in the browser; under today's implementation a lone
   failure really is signer-side. But `readUrl` is injected and the contract does not promise
   a signer never touches the object. An earlier comment argued from a purged object and was
   withdrawn.
6. **The marker is absent for `kind === 'image'`.** Printing it on every card is noise; it
   earns its place by being rare.
7. **Comment delimiters are stripped, not escaped.** There is no escaping inside an HTML
   comment — `-->` is the terminator. Angle brackets go too. The word "onerror" surviving as
   inert text is fine and deliberately unasserted: stripping vocabulary rather than syntax is
   how sanitisers rot.
8. **A partial failure is logged, never bannered.** It genuinely is not "previews are
   unavailable", and saying so is the false page-wide claim rounds 3 and 8 were about.

---

## 4. How to verify

```bash
# BACKEND — the handoff's original glob CANNOT SEE assetPreviewKey.test.mjs. Use this one.
cd c:/tmp/ss-atelier-v2/backend && npx vitest run $(ls tests/unit/*.mjs | grep -iE \
  "atelier|compose|brandKit|laneLedger|spendGates|assetLibrary|assetPreview|assetKey|video|render|initImage|persist|thumbnail|motion|publish" | tr '\n' ' ')
# → 704/704 across 53 suites at 356fef248

cd c:/tmp/ss-atelier-v2/frontend && npx vitest run src/components/DashBoard/Pages/content-studio
# → 142/142 across 15 suites

cd c:/tmp/ss-atelier-v2/backend && npx vitest run      # full: 6 failed / ~9879 passed
```

### 4a. Three separate ways the test counts lie, all found this session

- **The previous handoff's glob is keyword-based and cannot see new files.**
  `assetPreviewKey.test.mjs` matches none of its keywords, so **20 tests — every
  ownership-guard assertion, the security-critical ones — are invisible** to the command it
  tells you to trust. Use the glob above.
- **18 backend test files use `node:test`, not vitest.** Vitest reports them as
  `No test suite found` (counted as *failed files*) and **counts zero of their tests**. They
  include `swanLawFilter`, `swanLawFilter.corpus` and `swanPromptCompiler` — core Atelier —
  plus `forgeEndToEnd`, `forgeAspectContract`, `variantRun`, `winnerAndCapability`,
  `contactSheet`, `capabilityHonesty`. They are green:
  `node --test $(grep -l "node:test" tests/unit/*.mjs)` → **188/188, exit 0**. The risk is not
  that they fail; it is that when one does, every command above still reports clean.
- **The previous handoff's §5a baseline list is wrong.** The six failures are in
  `equipmentScanService.multi` (1), `equipmentScanService.retry` (3),
  `associationsModelRegistryParity` (1), `phase1bControllers` (1). The five suites it names
  — `adminRoleEscalationMatrix`, `adminWaiverController`, `adminWriteRoleEscalationMatrix`,
  `destructiveOwnershipMatrix`, `federatedAuthFoundation` — do not **fail**, they do not
  **load**: `jose` and `sanitize-html` are declared in `backend/package.json` and absent from
  the shared `node_modules`. Vitest reports 35 failed *files* and 6 failed *tests*; reading
  the file count as the test count is how that list was built. **Do not reinstall** while
  other agents hold locks on that tree.

---

## 5. Blocked on Sean

1. **Push.** Nine commits, local only, Rule 70 batch cadence. One push → one Render deploy →
   one verification.
2. **Merge PR #73** — now 192 commits, nothing deployed.
3. **Run the SWA-207 probe** — still the one action that makes any of this real.
4. **The signer prefix allowlist** (§6.4). Architectural, touches a service shared with
   `videoCatalog*` and `bodyMapEvidenceStorage`, whose key conventions this slice has not
   audited. His call, not a backlog line.
5. Unchanged from the previous handoff: name the brand kits, identify the globe button
   (SWA-205).

---

## 6. Backlog — WORKED 2026-09-01, see `ATELIER-CODEX-REVIEW-PACKET-2026-09-01.md`

**The defect backlog below is done.** Eight further slices ran (`3a38a3031..3a73d55ef`).
What remains is not defects — it is trigger-gated hardening, work needing infrastructure
that does not exist, and Sean's decisions. Each is named with why, because "remaining
backlog" that is really "deliberately not built" is how a list becomes noise.

### Done

| Item | Outcome |
|---|---|
| `videoRenderJobService` — three defects in one `findOrCreate` | **Done.** Dependency injection made them provable first. Collision now `409 KEY_COLLISION`, not an unhandled 500 |
| `motionBind` unguarded | **Done** — and it was never reachable; GATE 1's kind check already excluded every caller-supplied key. Guarded anyway so the rule covers three signers, not two |
| `resolvePublic` rate limit | **Done**, 600/15min. Also: 404 stopped meaning both "not found" and "we broke" |
| `E_REPLAY_CONTENTION` mapping | **Done**, 429 + Retry-After. It was answering **400** — "your request is malformed, do not retry" — beside a message saying retry |
| `chargedUsd` parity | **Done, but not as a test.** A parity test is impossible (local `unitUsd` is 0, both sides return 0). The rule was two copies that had already drifted — one produced NaN, the other 0. Now one function |

### Not done, and why — read the reason before picking one up

- **The `MediaAsset` date index cannot be created as this document previously described.**
  `date_trunc(text, timestamptz)` is STABLE; Postgres refuses it in an index. Casting only
  the index creates a clean index the planner never uses. The real change touches the
  cursor-comparison path on both sides at once and wants a real EXPLAIN. **The other two
  indexes are ordinary and carry no trap:** `(owner_user_id, kind, approval_status)` and GIN
  on `tags`.
- **Signer-level prefix allowlist** inside `generateThumbnailUrl`/`generatePlaybackUrl`.
  Would make per-consumer guards unnecessary — but that service is shared with
  `videoCatalog*` and `bodyMapEvidenceStorage`, whose key conventions were not audited.
  **Sean's call, not a backlog line.**
- **Per-user cap in the client-keyed eviction class.** Trigger: a second tenant. There is
  one operator.
- **Owner-side watchdog on a never-settling claim.** Needs the microtask harness below to be
  provable, and an unfalsifiable concurrency fix is worse than none.
- **Deterministic microtask harness.** Real value, and genuinely speculative to build with no
  defect in hand — it is the instrument, and instruments get designed wrong when nothing is
  pressing on them.
- **Replay-guard observability counters.** There is no metrics sink. Counters would be
  console lines that either flood or go unread; better designed when there is somewhere to
  send them.
- **Everything after that** — prompt search, Motion brand kits, authz on kit selection,
  sequence + mediaSync, taste feedback, Doctor surface, batch/matrix, ComfyUI GC, FLUX
  fallback — is **feature work**, not backlog.

### Still the single highest risk

Every concurrency invariant in this subsystem is true in ONE process against ONE synchronous
Map. The hosted lane re-runs for money. Behind a second replica or an async store they become
probabilistic, and the failure is a silent double charge.

### And the thing Sean has to do

`npm install` for `jose` and `sanitize-html` — declared, absent from the shared
`node_modules`. Twelve suites cannot LOAD, including four security probes
(`adminRoleEscalationMatrix`, `destructiveOwnershipMatrix`, `memberDirectoryLateralProbe`,
`myTrainerScope.probe`). **They have not run.**

## 7. What the nine rounds actually taught

### 7a. The pair defect is not a bug type, it is this codebase's grammar

Five instances in nine rounds, in a slice whose entire premise was avoiding it:
the log gated but not the banner · a poster preference guarded but not the fallback · one
signer consumer hardened while its sibling was blessed by a sweep that asked the wrong
question · `seed` given a finite check while `sizeBytes` six lines away kept a bare `Number()`
· an ownership rule derived from one writer's convention and applied to two.

**In every case the comment above the code was accurate about the branch its author was
looking at.** That is why review does not catch it. What caught it: deleting the second copy,
and reviewers who asked the *other* half of the question.

### 7b. Sweeps fail by asking the wrong question, not by missing a file

The sibling sweep enumerated every signing site and got every answer right — because it asked
*which object* each one reads. It never asked ***whose***. Two of three read a caller-supplied
key. The grep was complete; the question was half.

### 7c. A packet section is stale the moment the code under it changes

Three separate stale-paste incidents, one of them a P0 a reviewer proved **from the document
alone** by tracing pasted fixtures through a pasted guard and showing they could not both be
true. Round 3's lesson was "re-splice, never append". The lesson it should have been:
**re-splice every section the change touched, not the one being discussed.**

### 7d. Six of the seats' findings across nine rounds were artifacts of what I did not paste

Tenant scoping, the `broken` map, the route's `readUrl` injection, 44px, contrast,
`persistStills` ordering — all disproven by opening the file. **When a seat is wrong, check
the packet before you check the code.** Still true after nine rounds.

### 7e. Falsification is the only thing that has ever found a bad test here

Four in the previous loop, four more in this one — including the publish-side ownership guard,
which had 15 green tests and **none** that exercised it, because the fixture used a legitimate
key. Reading the tests would never have found that. Neutering found it in one command.

### 7f. Qwen's verdicts carry no information in either direction

Round 5: **REJECT** on a P0 that `hasMore` is always false — the code returns
`limit: limit + 1, _pageSize: limit`, the fetch-one-extra pattern, both fields visible in the
paste it was given. Round 9: **REJECT** on a P0 that an attacker sets `row.jobId` — it is
`job.id` from the leased job, and `meta` is cherry-picked field by field. In between it
returned APPROVE on code GLM was still finding P1s in. It has now produced APPROVE, REVISE and
REJECT on this same code with no correlation to its state. **GLM found something real in nine
rounds out of nine.** The previous handoff said never run Qwen as a lone seat; the sharper
rule is that a Qwen verdict is not evidence — only its reasoning is, and it must be traced.

---

## 8. Mistakes I made

- **Called a security issue "data integrity, not disclosure" after analysing one of two
  paths.** I traced the found path of `findOrCreate`, concluded no leak, and stated it flatly.
  The *created* path takes a caller-supplied `posterR2Key`, and my own change — signing video
  posters — is what would have armed it. Withdrawn one round later.
- **Wrote an ownership guard against one writer's key convention and shipped it.** It would
  have failed every legitimate video poster closed into the exact grey box the slice exists to
  remove, while admitting `jobs/7/…` for owner 7. Both seats caught it; I had spent six rounds
  attacking that shape.
- **Blessed a hole in my own sibling sweep for six rounds** by asking which object each signer
  reads instead of whose.
- **Left `§7` stale through two re-splices**, so the document asserted a fix and its absence at
  once — after making exactly that a finding in round 3.
- **Argued a retracted rationale in shipped comments.** Round 7 established presigning is
  local; the comment kept citing a purged object for two rounds.
- **Fixed `seed` and left `sizeBytes` bare six lines away, in the same object literal.**
- **Wrote an over-specified test** asserting `onerror` must not appear, when the property that
  matters is that no angle bracket or comment terminator survives. The code was right; the
  assertion was wrong, and a wrong assertion that passes is worse than none.
- **Reported `$?` after a pipe** and had the exit-status gate stop me — the exact trap the
  previous handoff documented in §11.
- **Hit the Git Bash `/tmp` vs Python `C:/tmp` path split**, also documented in that §11, also
  after reading it.

---

## 9. What to do first

1. **Falsify the two fixes in §1.** Nothing else until that is done.
2. Reproduce §4's numbers: **704/704**, **142/142**, and the six baseline failures.
3. Run the panel once more as the dry confirm —
   `node scripts/consult-panel.mjs --document <abs path to the review packet> --seats glm,qwen`
   from the **main checkout**, with the packet re-spliced from current source first. Round 9's
   findings are recorded in `C:/tmp/` panel output but **not yet written into the packet** —
   that is the one piece of bookkeeping this session left undone.
4. Then backlog #1, if you have a database. If you do not, say so and take #5 or #6 instead
   rather than shipping an unfalsifiable fix.
