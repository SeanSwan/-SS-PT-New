---
decision: SwanGuard F0/F2b/N1-seed are shipped and proven; the next agent runs F3 → F4 → N-connector as a continuous loop, hostile-reviewing each slice with the four-seat panel
status: open
supersedes: SWANGUARD-MAKE-IT-USABLE-HANDOFF-2026-08-20.md
---

# SwanGuard — F3 onward, run as a loop

**Date:** 2026-08-21 · **Outgoing:** Claude Opus 5 · **Linear:** SWA-70
**Repo:** `C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom` (SEPARATE from SS-PT)

**Sean's instruction for this handoff:** work the remaining slices **back-to-back in one loop**
without stopping to check in between, then hostile-review with **GLM 5.3 + Gemini 3.1 Pro +
Grok 4.6 + you**. Do not burn tokens re-deriving what is written here.

---

## 0. FIRST ACTIONS (10 minutes, do all of them)

```bash
cd C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom
git branch --show-current      # expect merge/newsroom-mainline-v3
git log --oneline -5
git status --porcelain         # expect clean apart from two *.bak-20260802 files
npm test                       # the repo's OWN aggregate, not a curated subset
npm run type-check
```

**Baseline measured 2026-08-21 at `ff78c96`** — a different number is information, not an error:

| Workspace | Result |
|---|---|
| api | **495 passed** / 18 skipped / **1 PRE-EXISTING FAIL** (`civicOfficialSourcesRoutes.test.ts` — officialConnector lane, red since before any of this work; do not "fix" it as part of a slice) |
| web | 379 passed / 8 skipped |
| database | 90 passed |
| domain | 242 passed |
| scripts | 138 passed |
| type-check | exit 0 across 5 workspaces |

**Two known environment facts — neither is yours to fix, do not chase them:**
- `apps/api`'s **esbuild cannot run in this Windows checkout** — `node_modules/esbuild/bin/esbuild`
  is a Linux ELF (installed from WSL). It fails identically on a one-line file. `npm run build
  -w @family-first/web` DOES work; use that as the build gate.
- **`npm run retention:command-receipts` is inert** — it carries the argv[1] self-detection guard
  behind a vite-node script (see trap T1). Fixing it wakes a dormant data-purging job: **Sean's
  call, not a drive-by.**

### ⚠️ You are not alone in this tree
Another agent (Codex) is working the news lane in parallel and landed `b3779f7` during the last
session. **Read before you edit; stage explicit paths; never `git add -A`.** Recent commits are
the cheapest way to see what moved.

### Branch + push posture
`merge/newsroom-mainline-v3` has **no upstream**. Every commit below is **local only**. Sean owns
how this merge resolves — **do not push, rebase, reset or checkout another branch without asking
him.**

---

## 1. Where the product actually is

`[VERIFIED 2026-08-21 against the live dev database]`

```
creators = 51    enabled = 0    creator_item = 0
outlets  = 39    news_rss_sources = 39
official_connector_states = 0    official_connector_items = 0
```

Read that as: **the catalogs are full and every switch is off.** Nothing is broken; nothing has
been turned on.

| Slice | State |
|---|---|
| CM1–CM4, CM3 | shipped (catalog schema, Creator Manager, durable store, per-creator settings) |
| F1 | shipped (`creator_item` content table, migration 0029) |
| F2 | shipped (fetcher — real YouTube/Twitch clients, proven live) |
| **F0** | **shipped `41ed295`** — 51 creators imported, all born disabled, idempotent |
| **F2b** | **shipped `b666f69`** — owner-gated `POST /api/creators/ingest` triggers the fetcher |
| **F0/F2b hardening** | **shipped `ff78c96`** — panel-found data-loss fix + single-flight lock |
| **N1 (seed)** | **shipped `b3779f7` by the other agent** — 39 verified feeds now in `news_rss_sources` |
| **F3** | **NOT BUILT — start here.** No `/api/feed` route exists anywhere (grep confirms) |
| F4 | not built — the home surface. **LAST.** |
| N-connector | not built — sources are seeded but no connector has ever been owner-enabled |

**Dev Postgres:** `docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d`, port
5434. Credentials live in `docker-compose.dev.yml` and `.env` — **never restate them in a doc, a
commit, or chat.** Read them into env without echoing:

```bash
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2-)"
export DATABASE_MODE=postgres
```

---

## 2. The loop Sean wants

Run these **back-to-back**. Commit each slice locally with explicit paths. **Do not push.**
Do not stop between slices to ask permission — the approval is this document.

### F3 — `GET /api/feed` ← START HERE
The slice that finally makes CM3 mean something. Everything it needs is already stored and
currently **read by nothing**.

Compute: `enabled ∩ active-profile − snoozed`, then apply per-creator settings:
`daily_cap`, `min_duration_sec`, `max_duration_sec`, `muted_keywords`, `priority`
(`pin | normal | fallback`), and `include_uploads / include_shorts / include_live /
include_premieres` against `creator_item.kind`.

- Owner-gated like every other `/api/creators*` route (`requireRole(user, 'owner')`).
- Visibility derives from `creator.enabled` **at read time** — `creator_item` has no `enabled`
  column and must never get one (law 4).
- A disabled creator's cached items stay in the table and simply stop being selected (law 5).
- `min/max_duration_sec`: **`duration_sec IS NULL` means unknown, not zero.** A live stream in
  progress has no duration. A naive `duration_sec >= min` silently excludes every live stream —
  this exact bug was already fixed once in the F2 duration parser; do not reintroduce it at the
  query layer.
- **Gate:** with one creator enabled and an ingest run, `GET /api/feed` returns its videos, and
  flipping a CM3 toggle visibly changes the result.

### F2c — schedule the ingest (small, do it while F3 is fresh)
F2b is a manual trigger. Add a scheduled run. The single-flight lock in
`creatorIngestRunner.ts` already protects a scheduler from overlapping with a manual press —
**wrap the scheduled path in the same runner, do not call `runCreatorIngest` directly**, or you
lose that protection.

### N2 — enable one news connector end-to-end
39 sources are seeded and dormant. A connector stays dormant until it is configured, its
contract is signed, the **owner** enables it, and it is unsuspended. Walk one source all the way
through and prove an article lands. `httpStoryService.listSources()` already reports the
connector's ACTUAL state, so the Sources wall says "dormant" rather than lying — keep that
honest. Acceptance criteria: `docs/266-h0-5-hostile-review-corrected-acceptance-matrix.md`
**§A first** — Sean restated criterion 4; the restatement narrowed what must be proven but did
not waive the owed test. Sean's locality for local news: **Anaheim Hills / Orange County / CA**.

### F4 — the home surface (LAST)
Netflix/YouTube-style shelves + the default landing section in
`apps/web/src/newsroom/sectionRegistry.tsx`. **Build it last.** Until F3 and N2 exist it could
only be a mock, and a mocked home screen is the lying receipt at full size.

When you reach F4, revisit **Gemini's design review** from the 2026-08-21 panel
(`docs/ai-workflow/AI-HANDOFF/panel-swanguard-f0-f2b-20260821/`, and the Gemini reply in
`AI-Village-Documentation/gemini-consults/`): it specifies an async job model plus a
`SyncStatusPanel` with progress, correctly arguing that a long synchronous ingest with no
feedback is a black box. That prescription is right and was deferred *only* because the build
order puts the home surface last.

---

## 3. 🔒 The laws — do not relax without Sean

1. **Default-off is absolute.** Every creator is born disabled. `enabled` goes true through
   exactly one route: `enable_creator(id, 'owner', reason)`, which writes an owner-attributed
   `creator_event` and flips the flag in the SAME transaction. Enforced by a DB trigger.
2. **The actor comes from the session, never the request body.** The routes read no `actor`
   field at all — absent, not ignored. *Generalised: a guard at layer N protects N+1 and below,
   never N−1.*
3. **Anything that shapes the feed FILTERS the enabled set; nothing but the owner WRITES to it.**
   Snooze is a read-time `snooze_until` filter. Profiles are lenses: `feed = enabled ∩ profile`,
   so a lens can only subtract. **F3 is the direct application of this law.**
4. **One protected field, not two.** `creator_item` has no `enabled` column on purpose.
5. **Delete cascades; disable does not.** Cached items survive a disable; the feed stops
   selecting them.
6. **Never fabricate to fill a gap.** Empty lanes say they are empty. "Fetched 0 items" and "the
   fetch threw" must never look the same.
7. **Legal-only acquisition.** Official APIs, publisher RSS, owner-authenticated OAuth. No
   scraping. Headline + link-out; never a stored body, transcript, or caption.
8. **A correct block is answered by fixing the input, never by spending an approval.**

---

## 4. Traps this workstream has already paid for

**T1 — `isDirectExecution` is UNDECIDABLE under vite-node.** It consumes the script argument, so
`process.argv` is exactly `[node, vite-node/cli.mjs]` and the target path is absent entirely —
not argv[1], not argv[2]. Any path-based self-detection is always false and the runner **exits 0
having done nothing**, which at a shell is indistinguishable from success. Use a thin CLI entry
file (`creatorSeedImportCli.ts` is the pattern) and keep the logic module side-effect-free.

**T2 — exit 0 does not mean it ran.** Three tools did this in two days: the vite-node runner
above; `cmd | tail` (which reports **tail's** exit code and hid a failing suite behind a green
background run — use `PIPESTATUS`); and **`consult-gemini.mjs`, which prints "File not found"
and exits 0 when it cannot resolve `--file`, leaving the PREVIOUS run's artifact in place.** That
stale file was a month old and about a different subject. **Check the artifact's own timestamp,
not the exit code.** Pass `consult-gemini.mjs` a **repo-relative** path.

**T3 — tests do not type-check.** 19 green tests shipped two type errors. Run
`npm test && npm run type-check` as ONE command so the claim and the check are inseparable.

**T4 — green either side of an untested seam.** Recurred four sessions running. The newest shape:
every route test injected its own runner, so the factory the production runtime actually calls
was the one uncovered path. **Make "test the path production actually takes" its own review
round.**

**T5 — a curated baseline is greener than the repo's own aggregate.** Run `npm test`.

**T6 — an absent value is not an instruction to erase.** An upsert writing `col = excluded.col`
treats silence in the source as an assertion of NULL. This destroyed `discovery_reason` on 40
rows. Use `coalesce(excluded.x, target.x)` — and remember coalesce is **insufficient** when an
upstream mapper substitutes a placeholder (a missing title became the raw channel id, a non-null
value that sails through coalesce).

**T7 — you cannot observe your own effect.** You cannot establish "did I change X" by reading X
before and after, when anyone else can also change X; both snapshots contain their commits.
A global-count invariant false-positived in BOTH directions and was deleted, not repaired.
**A guard capable only of false positives is worse than no guard.**

**T8 — global assertions in shared-database tests are coin flips.** Two live suites passed
individually and failed together. Scope every assertion to what the subject controls.

**T9 — the blast-radius guard is repo-relative.** It validates against SS-PT's
`backend/schema-snapshot.json`; SwanGuard tables are not in it. Class B abstains for files
outside the snapshot's repo. If Class B fires on a SwanGuard file, suspect your harness.

**T10 — migration numbers are assigned at creation, never reserved.** `0028`/`0029` displaced
reservations; a gap is worse than a displaced note. Sean has not ruled on renumbering.

---

## 5. Working agreements Sean expects

- **Proof, not assertion.** No "done/fixed/passing" without current-session evidence in the SAME
  message, ending in a `PROOF:` line. Mutation-test any assertion guarding an invariant: break
  the rule, confirm exactly one test fails, revert.
- **Hostile review until it runs dry**, then one confirming round — **two consecutive clean
  rounds**. Each round from a NEW vantage; re-reading code is not a round. End with the round
  ledger and `DRY-LOOP: CLEAN×2 (rounds: N)`.
  **A clean dry loop bounds how long you searched; it does not certify correctness.** Mine ran
  clean over code that contained live data loss.
- **Plain-English summary FIRST, technical second.**
- **Update Linear SWA-70** unprompted at each slice close (`LINEAR: SWA-70`).
- **Hermes artifacts at close:** an inbox memo in `.ai-workflow/hermes-inbox/pending/` (with a
  literal, unnumbered `## Mistakes I made` heading — the gate matches it exactly), and, if you
  are Fable-tier and the lesson is permanent, a learning packet in
  `docs/ai-workflow/hermes-learning-packets/`.
- **Every command ships with its `cd`.**
- **Say what you did NOT do.** A named gap beats a smooth omission.
- **Never restate a credential** — presence and length only.
- **Never `git add -A`.**

---

## 6. The hostile-review panel (run after the loop)

Sean's named seats: **GLM 5.3 + Gemini 3.1 Pro + Grok 4.6 + you.** Add local Qwen — it is free
and standing policy is to fire it in every panel, never as the lead.

```bash
cd C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT        # the panel scripts live in SS-PT
# 1. write a packet with the SOURCE inline + the specific questions you want attacked
# 2. ALWAYS dry-run first and disclose worst-case spend to Sean
node scripts/consult-panel.mjs --document <repo-relative-path> \
  --seats glm,grok,qwen --out-dir docs/ai-workflow/AI-HANDOFF/panel-<slug>-<date> --dry-run
# 3. then, with Sean's go:
node scripts/consult-panel.mjs --document <same> --seats glm,grok,qwen --out-dir <same> --confirm-spend
# 4. Gemini is a separate script and needs a REPO-RELATIVE path (see T2):
node scripts/consult-gemini.mjs --review --file <repo-relative-path>
```

**Cost reality from the 2026-08-21 run: ~$0.11 total.** Only Grok bills (OpenRouter); GLM burns
Z.ai plan credit, Qwen is local, Gemini is subscription. Rule 16's spend gate still applies —
disclose, cap, never auto-retry.

**Per-seat calibration, measured:**

| Seat | Value on that run |
|---|---|
| **GLM 5.3** | Deepest. 4 of 5 blockers real, including the data-loss bug. One blocker factually wrong, underlying concern right. Best value per unit cost. |
| **Grok 4.6** | Both blockers real, and it alone caught the placeholder sub-case that defeats a plain coalesce. Earned its ~$0.11. |
| **Qwen 3.8 local** | 2 of 3 real; headline P0 overstated (conflated a factory parameter with the runtime interface) but it self-flagged low confidence. Free — always fire, never lead. |
| **Gemini 3.1 Pro** | Reviews as *design authority* — expect UX/architecture prescriptions, not data-layer defects. Right seat for F4, wrong seat for SQL correctness. |

**Routing rule learned:** specification rarely needs a panel; **review of data-MUTATING code
does.** In the F0 case the correct and incorrect behaviours produced *identical row counts*, so
no test anyone would have thought to write could see the difference.

**Treat every finding as a HYPOTHESIS.** Verify before acting — one seat's headline blocker was
wrong on the facts. The 2026-08-21 fixes were accepted only after reproducing the bug live.

---

## 7. Owner-owed (carry these forward)

| Item | Detail |
|---|---|
| **Push / merge** | `merge/newsroom-mainline-v3` has no upstream and holds 4 unpushed commits. Sean decides. |
| **Approval `be60fd2c92e5bc61`** | SS-PT blast-radius guard message fix. Agent cannot mint it — that is the design. `cd C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT` then `node scripts/blast-radius-approve.mjs be60fd2c92e5bc61 --reason "honest scope"` |
| **Migration `0029` numbering** | Displaced a reservation; reversible by rename while local-only. |
| **Twitch ingest** | Needs an app-access TOKEN (OAuth client-credentials exchange, not an env value). `SWANGUARD_TWITCH_CLIENT_ID` present, `SWANGUARD_TWITCH_APP_ACCESS_TOKEN` absent. Until then every run reports Twitch creators as `skipped` — visible, not silent. Covers 5 channels + 6 game categories of the 51. |
| **Trigger hardening (GLM)** | 0028's trigger authenticates an *event row*, not a session — anything able to INSERT `creator_event(actor='owner', action='enabled')` can enable. GLM proposes `set local app.actor` + `current_setting()`. Migration-level change to the enable law: architecture, Sean's call. |
| **`readJsonBody` non-object** | `null` / `42` parse to `{}`, so a malformed body means full-catalog ingest. Bounded by the single-flight lock. Shared by all creator routes. |
| **`decodeURIComponent` URIError** | `/api/creators/%ZZ` → 500 instead of 404. Pre-existing, shared. |
| **`retention:command-receipts` inert** | See §0. Waking it activates a data-purging job. |
| **`apps/api` esbuild** | Linux ELF in a Windows checkout. `@esbuild/win32-x64` is present, so a targeted reinstall fixes it — but it touches node_modules in a shared tree. |

---

## 8. Key commands

```bash
cd C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2-)"   # value never echoed

# seed the creator catalog (idempotent; safe to re-run)
DATABASE_MODE=postgres npm run seed:creators -w @family-first/api

# creator law on the live DB — 4 attack classes
SWANGUARD_ALLOW_POSTGRES_SMOKE=true npm run smoke:creator-law:postgres

# the live suites — RUN THEM TOGETHER (they share one database; see T8)
cd apps/api && SWANGUARD_ALLOW_POSTGRES_SMOKE=true npx vitest run \
  src/creatorSeedImportLive.test.ts src/creatorIngestRouteLive.test.ts

# F2b end-to-end (spends ~2 YouTube quota units)
cd apps/api && SWANGUARD_ALLOW_POSTGRES_SMOKE=true npx vitest run src/creatorIngestRouteLive.test.ts

# migrations (dev DB is not a fixture DB, hence the second flag)
SWANGUARD_ALLOW_POSTGRES_SMOKE=true SWANGUARD_ALLOW_NON_FIXTURE_POSTGRES_SMOKE=true \
  npm run db:migrate:postgres

# credentials — prints presence and verdict, never a key
node scripts/verify-creator-keys.mjs

# gates
npm test && npm run type-check     # ONE command (T3)
npm run build -w @family-first/web # api build cannot run here (§0)
npm run qa:secrets
```
