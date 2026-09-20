# CONSULT PACKET — Astra Pro (`openai/gpt-6-astra-pro`)

**Date:** 2026-09-19
**Seat:** Mega Blueprints v3.1 architecture authority
**Requested by:** Sean
**Deliverable:** ONE reply containing (A) a hostile review of the current state with fixes, then
(B) the complete forged build package for the remaining work.

---

## 0. WHY YOU ARE HERE

You are the **architecture authority** for the SS-PT Mega Blueprints v3.1 chain. This packet asks you
to do two jobs in one reply, in this order:

1. **HOSTILE REVIEW FIRST.** Attack the current state. Find what is actually broken, what was
   claimed but not true, and what will break at scale. Every finding needs `file:line` evidence and a
   specific fix. Do not be polite. A finding without a fix is not a finding.
2. **THEN FORGE THE PACKAGE.** Produce the full build documentation for the remaining work, per the
   `fable-blueprint-forge` doctrine reproduced in §6, so that a context-free builder AI with ZERO
   repo access can execute it slice by slice without making a single architectural decision.

If the hostile review changes the plan, the plan must reflect that. Do not review and then ignore
your own findings.

---

## 1. THE PRODUCT VISION (Sean's words, load-bearing)

SwanStudios and SwanGuard are **"brother and sister applications"** that share information.

- **SwanStudios** is the member-facing fitness app. It stays **news-free and positive-only**. It
  never shows politics, outrage, or negativity.
- **SwanGuard** is Sean's own curation dashboard. He reads sources there, and **he** decides what is
  worth surfacing. It feeds *curated positive news* into SwanStudios.
- The bridge is one-way for content (SwanGuard → SwanStudios) and one-way for telemetry in the other
  direction (SwanStudios aggregates → SwanGuard pulse). **SwanStudios never learns SwanGuard's
  internals.**

**Aesthetic requirement, not garnish:** the original brief included three.js spectacle. Beauty is a
requirement. Motion is expected where it is safe.

---

## 2. CURRENT STATE — WHAT EXISTS (verified 2026-09-19)

### 2.1 Repos

| Repo | Path | Branch | Remote |
|---|---|---|---|
| SwanStudios (SS-PT) | `Desktop/@Everything/quick-pt/SS-PT` | `creator-brains-engine-r2-20260915` | no upstream configured |
| SwanGuard | `Desktop/@Everything/family-first-intelligence-command-center` | `main` | `github.com/SeanSwan/SwanGuard.git` |
| SwanGuard **Newsroom worktree** | `Desktop/@Everything/SwanGuard-Newsroom` | `merge/newsroom-mainline-v3` | same repo, worktree |

> **[Correction 2 — which tree?]** These are **two different trees**, and only the worktree has the
> newsroom. `family-first-intelligence-command-center` on `main` @ `2666b49` has **no**
> `apps/web/src/newsroom/` directory. `SwanGuard-Newsroom` on `merge/newsroom-mainline-v3` @ `d830bed`
> does (`FeedLanes.tsx` 76, `StorySheet.tsx` 517). **S5 is built in the worktree.** All pattern line
> counts cited in this package are the worktree's.

**Worktree note (fixed today):** the Newsroom worktree's `.git` gitfile pointed at a pre-move path and
was broken; `git worktree repair` fixed it. There are also **232 uncommitted files** in that
worktree.

**Push state — corrected 2026-09-19.** The line here previously read *"The branch is 12 commits ahead
of origin, unpushed."* **That is no longer true: the 12 commits are on the remote.** Verified three
ways: `git ls-remote origin refs/heads/merge/newsroom-mainline-v3` → `d830bed`; the worktree's
`FETCH_HEAD` reads `d830bed… branch 'merge/newsroom-mainline-v3' of github.com:SeanSwan/SwanGuard`;
and `git rev-list --count origin/merge/newsroom-mainline-v3..HEAD` → `0`. Local `HEAD` is `d830bed`.
Nothing remains to push.

Note also that `SwanGuard-Newsroom` is a **linked git worktree** — its `.git` is a file pointing at
`…/family-first-intelligence-command-center/.git/worktrees/SwanGuard-Newsroom`, and its common dir is
`…/family-first-intelligence-command-center/.git`.

**WHICH ROOT S5 IS BUILT IN — read this, the table above is not enough (corrected 2026-09-19):**

| Root | Branch / HEAD | `apps/web/src/newsroom/` | `apps/api/src/operatorGrantRoutes.ts` |
|---|---|---|---|
| `Desktop/@Everything/family-first-intelligence-command-center` | `main` @ `2666b49` | **does not exist** | 236 lines |
| `Desktop/@Everything/SwanGuard-Newsroom` (worktree) | `merge/newsroom-mainline-v3` @ `d830bed` | exists (`FeedLanes.tsx` 76, `StorySheet.tsx` 517) | 251 lines |

**S5 goes in `SwanGuard-Newsroom` on `merge/newsroom-mainline-v3`.** The main repo has no newsroom
directory at all, so a builder pointed at `main` would find no `FeedLanes.tsx` and no `StorySheet.tsx`.
Every line count quoted in §4.1 below is the **worktree's**, not `main`'s:
`featureDispatchOwnerOperator.ts` 96, `operatorGrantRoutes.ts` 251, `OwnerKillSwitchPanel.tsx` 193,
`OperatorGrantConsole.tsx` 281, `ownerKillSwitches.ts` 293.

### 2.2 SwanStudios — S1–S4 BUILT AND COMMITTED

Commit `25c0083bc` (68 files, 54 added / 14 modified). Package:
`docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/`.

| Slice | State | Backend tests | Frontend tests |
|---|---|---|---|
| S1 Coach Signal (+S1.5 dock wiring) | COMPLETE | `coachSignalRoutes.contract` 12 | `CoachSignalBanner` 8, `InlineSignalPicker` 9, `SocialDockWiring.contract` 5 |
| S2 Proof Card (+S2.5 live entry) | COMPLETE | `proofCardRoutes.contract` 17 | `ProofCard` 9, `LatestProofCard` 5 |
| S3 Spotlight receive side | COMPLETE (admin view of live items still open) | `swanBridgeIngest` 19 | `SpotlightRail` 12 |
| S4 Prompt chips + Comeback Moment | COMPLETE | `socialMomentum.s4` 21 | `PromptChips` 5, `ComebackMoment` 11 |

Verification: backend **72/72** (5 files) · frontend **551/551** (108 files) · `tsc --noEmit` exit 0
(8 GB heap required) · secret scan clean.

**Key files that now exist (do not re-invent):**

```
backend/models/social/CoachSignal.mjs
backend/models/social/SwanSpotlight.mjs
backend/models/social/SocialPromptOfTheDay.mjs
backend/migrations/20260916-create-coach-signals.cjs
backend/migrations/20260916-create-swan-spotlights.cjs
backend/migrations/20260918-create-social-prompts-of-the-day.cjs
backend/routes/social/coachSignalRoutes.mjs      (POST /api/social/coach-signals, GET /received)
backend/routes/social/proofCardRoutes.mjs        (GET /:sessionId, GET /latest)
backend/routes/social/spotlightReadRoutes.mjs    (GET /api/social/spotlights)
backend/routes/social/promptOfTheDayRoutes.mjs   (GET + admin POST)
backend/routes/social/comebackRoutes.mjs
backend/routes/bridge/bridgeIngestRoutes.mjs     (POST /api/bridge/spotlight)
backend/services/swanBridgeSignature.mjs         (HMAC-SHA256, ±300s skew)
frontend/src/components/Social/Feed/components/ProofCard.tsx
frontend/src/components/Social/Feed/components/LatestProofCard.tsx
frontend/src/components/Social/Feed/components/CoachSignalBanner.tsx
frontend/src/components/Social/Spotlight/SpotlightRail.tsx
frontend/src/components/Social/Prompts/{PromptChips,ComebackMoment}.tsx
frontend/src/components/Social/CoachDock/InlineSignalPicker.tsx
```

### 2.3 Locked contracts you must NOT break

- Wire contract `spotlight.v1`, endpoint `POST /api/bridge/spotlight`, header
  `X-Swan-Signature: sha256=<hex>` = HMAC over `timestamp + '.' + rawBody`,
  `X-Swan-Timestamp` (±300s), `X-Swan-Idempotency-Key: <itemId>@<revision>`.
- Env `SWAN_BRIDGE_SECRET_V1` on both sides; `SPOTLIGHT_ENABLED` **defaults OFF** (hides the rail AND
  makes ingest return 503).
- Idempotency is `(itemId, revision)`: same revision = 200 no-op; higher = upsert;
  `retracted: true` = remove.
- Images are **re-hosted to SwanStudios R2 at ingest**; never hot-link SwanGuard. An R2 failure must
  store `imageUrl=null` and **never fail the ingest**.
- Positivity: `bannedTerms` is **exported** from `backend/routes/social/feedEnrichment.mjs` and reused
  as the bridge's second gate. Do not duplicate that list — drift between two copies is the failure mode.
- `/api/bridge` is in the global JSON-parser skip-list in `backend/core/middleware/index.mjs`; the
  bridge router owns its own raw-aware parser, or `req.rawBody` is empty and HMAC can never pass.

---

## 3. HOSTILE REVIEW TARGETS — attack these

These are the known-weak points. Confirm or refute each with evidence, and find what is NOT on this
list — that is where the value is.

1. **S3 has no admin view of live Spotlight items.** The rail read path exists; the operator side
   does not. What is the smallest correct shape, and where does it live?
2. **`UNIQUE (coachId, postId)` on `CoachSignals` stops protecting once `postId` is NULL** — Postgres
   treats NULLs as distinct, so a session-targeted signal can be duplicated. Partial index needed?
   Exact DDL.
3. **`SPOTLIGHT_ENABLED` defaults OFF** — so as shipped, nothing renders. Is flag-off the right
   default for a feature Sean actively wants, and what is the safe enable sequence?
4. **The bridge is one-way for content but the reverse pulse does not exist.** `GET
   /api/operator/pulse` is unbuilt. Aggregates only, no PII — define the exact response shape and
   prove it cannot leak a name or email.
5. **The 5/day/coach signal cap is enforced per UTC day.** Is UTC the right boundary for a US-Pacific
   operator, and what does the failure look like at the boundary?
6. **Spotlight impressions/dismissals are not instrumented.** The blueprint's own future-review hook
   says "if dismissals > 40%, revisit placement" — but there is no counter to read. Design it.
7. **The Newsroom worktree has 232 uncommitted files and 12 unpushed commits.** What is the correct
   recovery/commit sequence, and what is the risk if this is done wrong?

---

## 4. SCOPE OF THE WORK TO FORGE

### 4.1 SwanGuard publisher side (S5) — the missing half of the bridge

Deliverables: Spotlight Queue lane, ceremony checklist modal (4 boxes: no politics / no
negativity-ragebait / image rights cleared / headline in Sean's voice), `spotlight_publications`
outbox, HMAC dispatcher with retry ×6 + backoff, owner kill switch, `bridge-policy.json` carve-out,
per-publish receipt row.

**SEAN'S LOCKED DECISIONS (2026-09-19) — these override the older blueprint:**

- **Do NOT put the queue in `FeedLanes.tsx`.** That file documents itself as a *reading lens*
  ("a lane is selected by canonical item kind/source class") and a curation queue does not fit it.
  Build a **separate operator surface** instead. `FeedLanes.tsx` and `StorySheet.tsx` must remain
  **unmodified**.
- **Namespace all new identifiers `StudioSpotlight*` / `BridgeSpotlight*`.** The word "spotlight"
  already means a *view filter* in SwanGuard's Intelligence Wiki (`SpotlightFilter`,
  `WikiSpotlightBar`, action id `wiki.spotlight-graph-source` in
  `apps/web/src/components/IntelligenceWikiMap.tsx`). The wire contract keeps the name
  `spotlight.v1` because it is already locked and shipped.
- `StorySheet.tsx` documents "navigation + save only; **no destructive mutation**". Do not add a
  publish action to it.

**Existing SwanGuard patterns to copy (verified — follow these, do not invent new shapes):**

- API route module: `apps/api/src/operatorGrantRoutes.ts` exports `handleOperatorGrantRoute({...})`.
- Dispatch wiring: `apps/api/src/featureDispatchOwnerOperator.ts` — path-prefix `if` blocks calling
  `requireUserOnce(auth, request, resolvedUser)` then the handler. Sub-dispatchers are ordered;
  `featureDispatch.ts` is the parent (recently split, Phase 126.1).
- Web operator surface: `apps/web/src/components/OperatorGrantConsole.tsx` (+ `.styles.ts`,
  `.test.tsx`), `OwnerKillSwitchPanel.tsx`, `OperatorObservabilityPanel.tsx`.
- Owner kill switch API already exists: `apps/api/src/ownerKillSwitches.ts`
  (`/api/owner/kill-switches`, `/api/owner/emergency-lockdown`).

### 4.2 Remaining SwanStudios slices

- **S6 Faction War ceremony card** — Monday 09:00 reveal in the right rail (winner, MVP, next-week
  modifier), cron + one component. Renders only inside the window; no duplicate after refresh;
  `prefers-reduced-motion` static fallback.
- **S7 Operator pulse + manifest poll** — SS `GET /api/operator/pulse` (secret `SWAN_PULSE_SECRET_V1`,
  aggregates only) + SwanGuard Studio Pulse tile + hourly signed manifest reconciliation that heals a
  dropped webhook.
- **S8 Weekly digest** — template-only, **NO LLM**. Sunday: own XP/streak, one friend highlight
  (name resolved client-side from an ID — zero PII to any LLM), faction rank, spotlight link.
  Opt-out honored; a grep must prove no LLM call exists.
- **S3 gap** — admin view of live Spotlight items.

### 4.3 The enhancement Sean actually asked for

Beyond closing gaps: **upgrade and enhance**. The three.js spectacle from the original brief is still
owed. Propose where it belongs, what it costs in bundle size, and how it degrades on a 375px mobile
device and under `prefers-reduced-motion`. Bound it — do not hand back an open-ended "add 3D".

---

## 5. HOUSE RULES (a context-free builder must not violate these)

- Styled-components only (no MUI). Victory for charts. `css` helper for shared style fragments.
- Dark-first. **Tokens, never hardcoded colors:** `var(--token, #fallback)`.
- **Crystalline Swan palette:** midnight-sapphire `#002060`, ice-wing `#60C0F0`, gilded-fern/gold
  `#C6A84B`, frost-white `#E0ECF4`, wing-purple `#8B5CF6`, obsidian-black `#0A0A0F`.
  **Banned outright:** `#0a0a1a`, `#00FFFF`, `#7851A9`.
- **Color semantics are reserved:** gold `#C6A84B` = earned recognition ONLY. Purple `#8B5CF6` = AI
  coach ONLY. Ice-cyan `#60C0F0` = system/editorial chrome. Spotlight is ice-cyan, never gold.
- 44px minimum touch targets. `prefers-reduced-motion` static fallbacks.
- Files stay **<300 lines**. Extract rather than exceed.
- FKs reference PascalCase canonical tables (`"Users"`, `"SocialPosts"`).
- **Zero PII to any LLM or bridge payload** — aggregates and IDs only.
- Migrations go in the **top-level** `backend/migrations/` ONLY.
  **[Corrected 2026-09-19 — see `VERIFICATION-NOTES.md` §1.1.]** The reason given here was wrong on
  both line and mechanism. The accurate mechanism: `isExecutableByCli()`
  (`backend/scripts/safe-migrate.mjs:214`) returns `false` for any path containing `/` or `\`, with
  the comment *"non-recursive glob"* (`:215`), modelling **sequelize-cli's own non-recursive glob**.
  `discoverMigrationFiles()` (`:222`) **is** recursive — it does return subdirectory files, but they
  are classified `inert`: discovered, reported, and never executed by the delegated CLI run. The
  placement rule is unchanged; only the reason is. Do not "fix" a recursion that was never broken.
- No `git add -A`. No push to main without Sean.
- Never extend an ENUM for a new concept — a dedicated model beats ENUM drift.
- No global leaderboards, follower counts, live audio, or Reels remixes this phase.
- **Never reward raw posting with XP.** Rewards bind to logging, streaks, challenge completion, and
  coach interaction only.

---

## 6. THE DOCTRINE YOU MUST FOLLOW (`fable-blueprint-forge`)

> **Role.** Fable (or the strongest available Claude, per the Final Decider fallback chain) is the
> **architect**. A cheaper/high-token AI is the **builder**. The builder will fill every gap in the
> plan with its own judgment — and a weaker model fills gaps worse. So the Forge's job is to leave
> **no gaps that matter**: every place a builder *could* choose, the plan chooses for it. The output
> is a self-contained build package a builder with ZERO repo access or context can execute faithfully.
>
> Three laws:
> 1. **Decision-dense, not just long.** Exact file paths, exact function signatures, exact API
>    request/response shapes, exact copy strings, exact palette tokens, explicit "do NOT" bans.
> 2. **Executable acceptance criteria per slice.** Not "auth works" — "these N named tests pass; this
>    exact curl returns this exact JSON; this viewport renders this wireframe."
> 3. **Architect checkpoints, not architect absence.** Builder types; architect reviews every slice
>    boundary.
>
> **Phase 1 — Repo Truth Harvest.** The #1 way handoff plans fail: they cite files/routes/models that
> don't exist or have drifted. Gather with file:line evidence: canonical surfaces the feature touches;
> real model columns + drift check for every table touched; one working in-repo example per pattern
> the builder will need; the exact mount points. **Paste the relevant excerpts INTO the package — the
> builder can't grep the repo.**
>
> **Phase 2 — Forge the Build Package.** Write to
> `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<feature-slug>-<YYYY-MM-DD>/` as a small doc set (one dir,
> numbered files, each ≤~300 lines so any builder can load them piecemeal):
>
> 1. `00-README.md` — what this is, build order, how to use the package, the Builder Contract.
> 2. `01-architecture.md` — system overview, component tree, data flow, **Mermaid**: `flowchart` for
>    user/data flows, `sequenceDiagram` for every API interaction, `erDiagram` for schema (new +
>    touched tables, exact column names/types), state diagrams where state machines exist.
> 3. `02-wireframes.md` — ASCII wireframes for every screen/state (desktop + 375px mobile), or an
>    HTML mockup per screen for visual surfaces. Every button, label, empty/loading/error state
>    drawn. Exact copy strings. Exact palette tokens (`var(--token, #fallback)`).
> 4. `03-contracts.md` — every API endpoint: method, exact path, auth requirement, request JSON,
>    response JSON (success + each error), status codes. Every exported function: exact signature
>    with types. Every model: full Sequelize definition text.
> 5. `04-build-order.md` — **file-by-file**: path, purpose, ≤300-line budget, imports, exports, which
>    in-repo example to mimic (excerpt included), and the slice it belongs to. Ordered so every slice
>    leaves the app bootable.
> 6. `05-slices.md` — the slice plan. Each slice: scope (files), decisions already made, executable
>    acceptance criteria (named test files + counts, exact curl + expected JSON, exact viewport
>    checks), and a STOP line: "do not proceed to slice N+1 until checkpoint passes."
> 7. `06-bans.md` — the "do NOT" list: house rules restated for a context-free builder PLUS
>    feature-specific bans.
> 8. `07-checkpoints.md` — the checkpoint protocol and the review remit text to reuse.
>
> **Decision-density self-test before calling the package done:** read each slice as a hostile builder
> and list every choice you'd still have to make. Each one is either (a) decided in the package now,
> or (b) explicitly delegated with bounds ("builder's choice, must satisfy X"). **Zero silent gaps.**
>
> **Builder Contract (paste into 00-README.md):**
> > You are the builder, not the architect. Follow the package to the letter. Where the package
> > decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> > something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> > time; after each slice, output the diff + the acceptance-criteria evidence and WAIT for the
> > checkpoint verdict before continuing. Never claim a criterion passed without pasting its output.
>
> **Hard rules:** a plan citing unverified repo state is vibe-planning; the package must work for a
> builder with ZERO repo access — no "see CLAUDE.md", no "grep for X"; builder deviations are never
> merged silently.

---

## 7. WHAT TO RETURN

Return ONE reply, structured EXACTLY as below, using these literal headings so it can be split into
files mechanically. Do not wrap the whole reply in a code fence.

```
## PART A — HOSTILE REVIEW
### A.1 Findings
(A numbered list. Each: SEVERITY (CRITICAL/HIGH/MED/LOW) · what is wrong · file:line evidence ·
why it matters · the specific fix. Include findings NOT on my §3 list.)
### A.2 Refuted
(Claims in §2/§3 you checked and found to be fine. Say so plainly — a short list is a good sign.)
### A.3 Verdict on the current state
(One paragraph: is S1–S4 actually sound? What would you refuse to ship?)

## PART B — FORGED PACKAGE
### 00-README.md
### 01-architecture.md
### 02-wireframes.md
### 03-contracts.md
### 04-build-order.md
### 05-slices.md
### 06-bans.md
### 07-checkpoints.md

## PART C — DECISION-DENSITY SELF-TEST
(Every remaining builder choice: decided-in-package, or delegated-with-bounds. Zero silent gaps.)
```

**Constraints on your answer:**
- Mermaid blocks must be real, syntactically valid Mermaid. Use `flowchart`, `sequenceDiagram`,
  `erDiagram`, and `stateDiagram-v2`.
- Wireframes must be ASCII and must show desktop AND 375px mobile, including empty / loading / error
  states. Every label is an exact copy string.
- Every slice's acceptance criteria must be executable: named test file + count, exact curl, exact
  expected JSON, exact viewport.
- If you need a decision only Sean can make, put it in a clearly-marked
  `SEAN MUST DECIDE:` block rather than guessing. Bounded guesses are acceptable; unbounded ones are not.
- Do not restate this packet back to me. Spend the tokens on decisions.
