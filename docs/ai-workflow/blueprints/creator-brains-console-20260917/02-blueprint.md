# 02 — Blueprint — Creator Brains Console

- **Date:** 2026-09-17 · **Status:** PLAN READY — pending Sean's concept-direction pick (ideation gate) + Astra adjudication when seat resets (see 09)
- **Author seat:** ZCode/GLM (Astra adjudication recorded when it lands)

## 1. System topology

```
┌────────────────────────── Sean's Desktop ──────────────────────────┐
│  Creator Brains Console.cmd                                        │
│    └─ node packages/creator-brains-console/server.mjs              │
│         ├─ JSON API (loopback only)  ←→  engine lib/* (COMMANDS)   │
│         │                                   └→ .ai-workflow/       │
│         │                                       creator-brains/    │
│         │                                         store (B/C tiers)│
│         └─ static files  ←→  browser: console (Vite build)         │
│             React 18 + styled-components + three.js (lazy chunk)   │
│                                                                    │
│  LATER (gated slice S7): SwanGuard-Newsroom @family-first/web      │
│    mounts <CreatorBrainsConsole adapter={swanGuardAdapter}/>       │
└────────────────────────────────────────────────────────────────────┘
```

**Ownership boundaries:** the engine (`scripts/creator-brains/*`) is untouched — the console is purely additive. **The console lives OUTSIDE the engine tree**, at `packages/creator-brains-console/` (D7 OVERTURNED 2026-09-20 — see `18`): it composes engine lib functions through relative imports, so it is a *consumer* of the engine, not a part of it. The bridge never opens store files itself. The web app knows only the `ConsoleDataAdapter` interface.

## 2. Components & responsibilities

Paths below are relative to the console root, **`packages/creator-brains-console/`** (D7, 2026-09-20).

| Component | Path | Responsibility | Owns |
|---|---|---|---|
| Bridge server | `server.mjs` | loopback bind (OS-chosen port), static serving of `web/dist`, JSON routing, process spawn for daily pass, JSON error envelope | nothing — delegates |
| Bridge API | `api.mjs` | handlers: status/creators/query/brains/run/canary/repair/backup; input validation; damage-refusal mapping | validation rules |
| Console shell | `web/src/App.tsx` | layout (per picked concept direction), data polling store, route-less panels | polling cadence |
| Adapters | `web/src/adapters/` | `ConsoleDataAdapter` interface; `LocalEngineAdapter` (fetch); `MockAdapter` (tests) | transport contract |
| Panels | `web/src/components/` | StatusBoard, CreatorRoster, BrainDrawer, QueryConsole, RunConsole, OpsRail (canary/repair/backup) | presentation only |
| Constellation | `web/src/three/BrainConstellation.tsx` | three.js scene; layout from pure function `layoutBrains(brains)`; interaction; static fallback | its rAF loop |
| Desktop launcher | `Creator Brains Console.cmd` (outside repo, beside the existing one) | start bridge → open browser | — |

**State ownership:** server components = the store (single truth, read per request); client = ephemeral poll cache only (no global state library). The daily pass runs as a detached child of the bridge; its truth is the engine's lock/journal files — the UI never invents progress.

## 3. Integration points (exact)

- Reads: `registry.mjs listCreatorsSafe`, `store.mjs readState/readRunJournal/readLastSuccess/listRuns/listDocs`, `summary.mjs summarize`, `ledger.mjs budgetState(openBudget)`, `backlog.mjs backlogReport`, `throttle.mjs throttleState/formatThrottle`, `checkpoints.mjs sweepState`, `lock.mjs lockStatus`, `ytdlp.mjs selfCheck`, `render.mjs listPublished/readPointer`, `query.mjs queryBrains/formatResults` (JSON variant), `registry.mjs setEnabled/addCreator`, `backup.mjs` via `backup-command.mjs`.
- Writes: `addCreator`, `setEnabled`, repair (`COMMANDS.repair` path), backup command, daily pass spawn (`run-daily.mjs --per-hour=N`).
- Refusals map to HTTP: damaged store → `409 {error:{code:'STORE_DAMAGED', file}}`; validation → `400`; lock held → `409 {error:{code:'RUN_LOCKED', holder}}`; refused command → `422` with the engine's reason string.
- The brain drawer reads ONLY the published generation named by `current.json` (HR08 invariant inherited).

## 4. Concept directions (ideation gate — Sean picks one)

=== CONCEPT DIRECTION 1 ===
NAME: Neural Conservatory
PAGE STORY ARC (dashboard 4-phase): Act 1 orientation = the constellation itself, every brain visible as a lit node in sapphire space; Act 2 current state = hover/click reveals per-brain truth (coverage ring, throttle, staleness); Act 3 insight = claims drawer with citations; Act 4 next action = Run pass / Enable / Repair floating dock.
SECTION PATTERN STACK: C8 clustered/orbiting nodes (constellation) + C12 glass panels (operator dock) + C11-style readouts inside drawer.
EMOTIONAL JOBS: awe → trust → curiosity → momentum.
SIGNATURE MOMENT: the constellation IS the navigation — rotating slowly (sub-perceptual drift), brains pulse once when their daily pass folds in new videos.
MOTION TIER: tier-2 lean (constellation interaction; panels response-only).
WHY IT FITS: Sean asked for three.js beauty; this makes the data the spectacle — 40 brains visible as one living system.
WHY IT COULD BE WRONG: 3D-as-nav is the riskiest usability shape; click targets in 3D are slower than a table; static/reduced-motion users need the roster as a true equal.

=== CONCEPT DIRECTION 2 ===
NAME: Cockpit Ledger (restrained)
PAGE STORY ARC: orientation = left rail + status strip; current state = instrument board (status cards, roster table); insight = query console + brain drawers; next action = run dock with throttle/budget visible.
SECTION PATTERN STACK: C12 panels + C11 readouts; three.js appears only as a compact header "brain orb" (data-driven miniature, non-interactive beyond hover).
EMOTIONAL JOBS: calm → trust → curiosity → momentum.
SIGNATURE MOMENT: none — calm surface; the orb is a live gauge, not a showpiece.
MOTION TIER: tier-3 lean/reduced default.
WHY IT FITS: fastest to ship, most operator-legible, matches "cockpit not brand page" doctrine; every launch.mjs action has an obvious home.
WHY IT COULD BE WRONG: least spectacular; Sean explicitly asked for three.js beauty — a header orb may underdeliver the brief.

=== CONCEPT DIRECTION 3 ===
NAME: Vault Observatory (hybrid)
PAGE STORY ARC: orientation = ≤2.5s entry beat (camera dolly into the constellation, reduced-motion → static) settling into a split view; current state = left constellation + right operations deck; insight = drawer slides from constellation node to deck; next action = deck's run dock.
SECTION PATTERN STACK: C8 + C12 split; C1-style entry beat (the only narrative motion on the page).
EMOTIONAL JOBS: awe → orientation clarity → trust → momentum.
SIGNATURE MOMENT: the entry dolly — one, budgeted, skipped under reduced-motion.
MOTION TIER: tier-2.
WHY IT FITS: keeps the wow while making the ops deck (tables/docks) the real working surface — beauty and operator-legibility both real.
WHY IT COULD BE WRONG: heaviest build; two-panel density needs the wide-monitor discipline (no tiny islands at 4K); the entry beat is the first thing to cut if it taxes.

**Recommendation:** CD3 (or CD1 if Sean wants maximum spectacle). CD2 remains the fallback if the constellation underperforms on usability in S5 exit review.

> ### ✅ DECIDED — 2026-09-17, Sean
> **CD3 "Vault Observatory" is the direction.** Split view: three.js constellation left, operations deck right, one budgeted entry dolly (skipped under reduced-motion).
> **Consequences now locked:** S5 builds CD3's layout, not a generic one; the entry dolly is the ONLY narrative motion on the page (`motion.md` one-signature-moment rule); the ops deck is a first-class working surface, not a sidecar — which means the roster table and run dock must be fully keyboard-operable, because CD3 keeps the constellation as *beauty* while the deck carries the *work*. CD1 and CD2 are closed; CD2 survives only as the recorded fallback if CD3's constellation fails the S5 usability exit review.
> **Unchanged by this pick:** S0–S4 are direction-independent and were already built/planned against the adapter contract — see 08 §"Unresolved decisions", item 1, now resolved.

## 5. Seed decisions D1–D9 — **ADJUDICATED 2026-09-20** (verdicts in `17-astra-adjudication.md`)

| # | Decision | Seed recommendation | Reason |
|---|---|---|---|
| D1 | raw `three` vs `@react-three/fiber` | **raw three.js** in one lazy chunk | SwanGuard has a bundle-budget gate; r3f+vendors adds ~2× weight for ergonomics we don't need in one scene; cleanup contract is explicit |
| D2 | bridge shape | **node:http zero-dep server** | engine stays zero-dep; no Vite middleware to maintain in prod; one `.cmd` starts everything |
| D3 | run progress | **AMENDED 2026-09-20** — one polling coordinator: active 2 s; active beyond 10 min 5 s; idle 5 s; hidden 15 s; immediate refresh on visibility return | the engine already persists run truth; polling is crash-safe, no SSE lifecycle to leak. Cadence amended by the Astra adjudication — see `17` §1 |
| D4 | v1 command scope | all 10 menu actions **except** restore/rollback/authorize (CLI-only, tier-badged hints) | T3/T4 stay human-CLI-gated per bridge doctrine |
| D5 | token mode | **Crystalline Swan base** (not Cyberforest) | Cyberforest is reserved for Hermes surfaces; SwanGuard embed target is not one; calm-zone rules still apply |
| D6 | standalone shell | **.cmd → bridge on OS-chosen loopback port → default browser** | no Electron weight; matches supervised-launcher philosophy |
| D7 | in-repo home | **OVERTURNED 2026-09-20 → `packages/creator-brains-console/`** (seed was `scripts/creator-brains/console/`) | the seed's "travels with the engine" argument lost to the engine's own `C1` gate: living inside the walk made the engine measure `console/web/node_modules` and fail deterministically on `decimal.js` (A1-01 / S1-H14). Relocation returns C1 to **15/15 green without touching an engine file** — the only remedy that does. Executed on Sean's decision; receipt + per-file manifest in `18` |
| D8 | embed contract | **React component package + adapter prop** (Web Component wrapper only if SwanGuard needs framework isolation) | SwanGuard web is React 18 + styled-components — native fit |
| D9 | constellation idle motion | **AMENDED 2026-09-20** — numeric motion limits replace the unmeasurable "&lt;5% visual energy"; fully static under reduced-motion; pause off-viewport/hidden | motion.md §6 loop integrity; calm-zone compliance. "<5% visual energy" was not a measurable limit — see `17` §1 |

## 6. Performance budgets (measurable)

- Bridge cold start ≤ 1.5 s; API p95 ≤ 50 ms (file-backed reads); status payload ≤ 256 KB.
- Web initial bundle (excluding lazy three chunk) ≤ 500 KB gz; three chunk ≤ 900 KB gz. **The load trigger below was superseded 2026-09-18 by `14 §3`: idle after the first successful status poll — NOT viewport enter.** Under CD3 the constellation occupies the left panel of the entry split view, so viewport-enter fired at first paint and the "lazy" label described an eager load (`14 §3`, A1-02). The chunk is **never fetched** under `prefers-reduced-motion` or absent WebGL.
- 60 fps constellation on a mid GPU at DPR ≤ 2; particle/node count bounded by creator count (tens, not thousands).
- rAF stops within one frame of `document.hidden` / off-viewport.

## 7. Rollback story

The console is additive: deleting `packages/creator-brains-console/` + the Desktop `.cmd` restores the prior world exactly. No engine file changes except the README quick-start pointer. The daily pass and all data remain CLI-operable at every point — the console is never load-bearing for data integrity.
