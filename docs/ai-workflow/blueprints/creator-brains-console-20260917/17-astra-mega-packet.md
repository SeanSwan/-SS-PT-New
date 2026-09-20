# ASTRA MEGA BLUEPRINT CONSULT — CREATOR BRAINS CONSOLE

**Mega Blueprint**

You are Astra, the architecture authority for the SS-PT / SwanStudios chain, operating under the
`fable-blueprint-forge` skill in Mega Blueprint mode. The keyword above is printed once; the full
pipeline is armed.

## What this packet is

The complete documentation packet for the **Creator Brains Console** — a zero-dependency Node.js
console that drives an existing YouTube-transcript engine from Sean's Desktop. The console is
strictly **additive** to the engine; that boundary is load-bearing.

Repo: `Desktop/@Everything/quick-pt/SS-PT`, branch `creator-brains-engine-r2-20260915`.
Slices **S0** (bridge, nine-route allowlist) and **S1** (Vite web scaffold, StatusBoard, adapters)
are **SHIPPED**. S2–S7 are planned. Concept direction **CD3 "Vault Observatory"** is locked by Sean.

## What is being asked of you

1. **Adjudicate D1–D9** — the nine seed decisions in `02-blueprint.md` §5. The brief at the head of
   this packet (`15-astra-brief.md`) states, for each: the question, the seed recommendation, the
   evidence already recorded, and the concrete consequence of overturning it. Verdicts are
   **ACCEPT / AMEND / OVERTURN**; every overturn must name the file it amends. Four of the nine are
   already realised in shipped S0/S1 code, so an overturn there is a revert, not a plan amendment.
2. **Hostile-review the existing blueprints (A1).** The packet documents are review targets, not
   background reading. Attack contradictions between documents, diagrams that disagree with the real
   contracts, slices whose acceptance criteria cannot be executed, decisions stated but never
   enforced, and bans that contradict the plan. Every finding carries `file:line` or `doc#section`
   evidence plus a concrete fix.
3. **Forge the updated package (PART B)** and then **hostile-review your own draft (A2, one pass)**.
4. **Decision-density self-test (PART C).**

## Facts you must not re-derive wrongly

- **The engine gate is RED in this working tree, and it is not the console's bug.** S1-H14:
  `scripts/creator-brains/consistency-check.mjs:46-51` walks `scripts/creator-brains/**` for `*.mjs`
  with no `node_modules` skip, so it collects 71 third-party files, the largest being
  `console/web/node_modules/decimal.js/decimal.mjs` at 4914 lines. The engine suite is 181/183.
  D7 is the decision that governs this.
- **The `server.mjs` 300-line cap question is CLOSED.** The bridge was split at the route-table seam
  into `server.mjs` 244 + `routes.mjs` 131 + `api.mjs` 77 (`16` §19). Any document still listing the
  cap call as pending is stale — and saying so is a legitimate A1 finding.
- **`POST /api/creators` blocks the bridge's only thread** for 1577 ms with zero event-loop ticks
  (S1-H12), because the engine's `ytdlp.mjs:184` is `execFileSync`. Unfixed; the honest fixes touch
  the engine.
- **Never propose reading raw transcripts.** The store has three tiers; the raw-transcript tier is
  owner-private and MUST NOT be served by any surface. Derived artifacts only.

## Boundaries

- The console may not modify engine files. Additive, or it does not ship.
- No route may be added ahead of the slice that owns it.
- 300-line hard cap per file (CLAUDE.md rule 4).
- Design tokens are the closed Crystalline Swan set (`design.md` §4).

---



=== BEGIN DOCUMENT: 15-astra-brief.md — THE ADJUDICATION BRIEF (the remit — read this first) ===

# 15 — Astra adjudication brief — Creator Brains Console (D1–D9)

- **Date:** 2026-09-19 · **Prepared by:** builder seat (Sable), from the 2026-09-19 22:30 automation
- **Status:** **PREPARATION ONLY — no call has been made, nothing has been spent.** Astra rides the
  Codex 20x subscription ($0 metered; ~20k plan tokens per pass — `10 §1`, `10 §3`). Seat is
  `gpt-6-astra` via `consult-codex.mjs`; harness repaired and pinned, 10/10 in
  `swan-council-subscription.test.mjs` (`10 §4`)
- **Gates this clears:** `08` §"Unresolved decisions" item 2 (**D-Astra**); `14 §6` (**D-ASTRA**,
  "scheduled — brief-only, no spend"). `02`'s header still reads *"pending … Astra adjudication when
  seat resets"*; the other gate named there, the ideation pick, closed 2026-09-17 (`02 §4`)

## 0. What this document is, and what it is not

The input packet for the one authorized architecture adjudication of the nine seed decisions **D1–D9**
(`02 §5`). It is **not** an adjudication, and it does not argue for the seeds beyond what `02 §5`
already recorded — a brief that pre-litigates its own review is worth less than one that states the
question and the price of each answer.

Two things changed since the seeds were written, and both matter to the verdicts:

1. **Sean locked CD3 "Vault Observatory"** (`02 §4`): the constellation is the left panel of the
   entry split view, the ops deck is the first-class working surface. D1, D9 and the D-C1 loading
   contract (`14 §3`) are downstream of that pick.
2. **S0 and S1 shipped** (`14 §4`): four of the nine decisions are no longer proposals but realised
   in tested code. Overturning one of those is a revert, not a plan amendment — §2 marks which.

**Out of scope.** The remit in `00-consult-brief.md` covered D1–D9 *and* CD1–CD3; CD1–CD3 is closed by
Sean (`02 §4`). CD2 survives only as the recorded fallback if CD3's constellation fails the S5
usability exit review. D4 and D5 are constrained by Sean and by repo law respectively.

## 1. How to return a verdict

One verdict per decision; every overturn must **name the file it amends**.

| Verdict | Meaning | Requirement |
|---|---|---|
| **ACCEPT** | the seed stands as written | one line; no defence needed |
| **AMEND** | the shape survives, a parameter does not | name the parameter and the file carrying it |
| **OVERTURN** | the seed is replaced | name every file in §4 it touches, and which shipped slice re-enters |

If an overturn needs **Sean's** authority rather than the seat's — a `CLAUDE.md` rule, the design
system, or a recorded no-go boundary — return it as a question instead. D4 and D5 are in that class;
D7 is a genuine either/or only Sean can settle.

Write the adjudication to **`17-astra-adjudication.md`**. `16` is the S1 hostile review (which took
that number to avoid colliding with this file) and `14` is the 2026-09-18 decision record — neither
may be overwritten.

## 2. Where the nine stand (read before §3)

| # | Seed in one line | Realised in shipped code? | Cost of overturn now |
|---|---|---|---|
| D1 | raw `three`, one lazy chunk | No — S5 | **High** — S5 reshape + budget + S7 externals |
| D2 | zero-dep `node:http` bridge | **Yes — S0** | **Very high** — S0 rewrite |
| D3 | poll journal/lock/budget ~2 s | Partial — S1 polling store; S4 owns cadence | **Medium** — S4 + one extra route |
| D4 | v1 = all 10 menu actions, minus 3 dangerous commands | **Yes — S0 allowlist** | **Blocked by no-go boundary** — Sean's call |
| D5 | Crystalline Swan base | **Yes — S1 `tokens.css`** | **Blocked by design authority** — Sean's call |
| D6 | `.cmd` → bridge → default browser | **Yes — S0/S1** | **High** — launcher + rollback story |
| D7 | home in `scripts/creator-brains/console/` | **Yes — S0/S1** | **High — and the one whose overturn would fix a blocker** |
| D8 | React component + adapter prop | No — S7 (gated) | **Low** — S7 only |
| D9 | sub-perceptual drift, static under reduced-motion | No — S5 | **Low** — S5 + T-E3 |

## 3. The nine decisions

### D1 — three.js implementation: raw `three` vs `@react-three/fiber`

**Question as posed** (`00` D1 list): raw `three` vs `@react-three/fiber` — bundle budget vs ergonomics.

**Seed recommendation** (`02 §5`): **raw three.js in one lazy chunk.**

**Evidence / reason already recorded:** SwanGuard has a bundle-budget gate; r3f + vendors adds ~2×
weight for ergonomics we don't need in one scene; the cleanup contract is explicit (`02 §5`).
Supporting: `02 §6` budgets the three chunk at ≤900 KB gz; `14 §3` re-scoped the load trigger from
"viewport enter" to **idle after the first successful status poll**, and requires the chunk never be
fetched under `prefers-reduced-motion` or absent WebGL, with T-E3 asserting that case.

**Consequence of overturn → r3f:** S5 is rewritten — `web/src/three/BrainConstellation.tsx` becomes a
declarative component tree, and the pure `layoutBrains(brains)` seam (`02 §2`) must survive as the
layout source or its traceability moves with it. `02 §6`'s ≤900 KB gz budget becomes unreachable, and
that budget is the *reason* for the seed — so an overturn is simultaneously a request to amend a
budget that exists to protect the S7 embed target. `14 §3`'s loading contract survives in shape but
its figures are stale, so T-E3 must be re-baselined. S7's peer-external list (`08` §Operations) grows
to add `three`, r3f and `drei` — a change to SwanGuard's build config, in their repo. **Cheapest
honest verdict: ACCEPT**, unless the 60 fps / DPR ≤ 2 budget (`02 §6`) can be shown unreachable in raw
three within the chunk cap.

### D2 — bridge shape: zero-dep `node:http` vs Vite dev middleware

**Question as posed** (`00` D2 list): standalone `node:http` server (recommended) vs Vite middleware.

**Seed recommendation** (`02 §5`): **`node:http` zero-dep server.**

**Evidence / reason already recorded:** the engine stays zero-dep; no Vite middleware to maintain in
prod; one `.cmd` starts everything (`02 §5`). Supporting: `05 §2a`'s nine-route allowlist is pinned by
a **positive** allowlist test (`bridge.hy4.structure.test.mjs`), so an unplanned route fails CI; `05
§2`'s scope note forbids adding a route ahead of its owning slice. **Realised in shipped code** — S0
shipped `server.mjs` + `api.mjs` (`14 §4`: S0 at 81/81).

**Consequence of overturn → Vite middleware:** not an amendment — `server.mjs` and `api.mjs`, shipped
and tested, are discarded, and the nine-route allowlist test goes with them. D6's standalone story
dies too: a Vite dev server is a dev-mode process, and `02 §7`'s rollback story ("delete `console/` +
the `.cmd`") no longer describes a shipped artifact. `08` §Operations' pid-file single-instance guard
(T-B11) has no home, because Vite middleware does not own the process. Incidentally, the bridge has
since been split to clear the rule-4 cap — `server.mjs` **244**, `routes.mjs` **131**, `api.mjs` 77
(`16 §19`), with the Host gate and error envelope deliberately left in `server.mjs` so no route can
bypass them — so an overturn here would discard a completed, mutation-verified refactor.

### D3 — run progress: poll journal/lock/budget ~2 s vs SSE/file-tail

**Question as posed** (`00` D3 list): polling run journal (recommended) vs SSE/file-tail.

**Seed recommendation** (`02 §5`): **poll journal/lock/budget every ~2 s while active.**

**Evidence / reason already recorded:** the engine already persists run truth; polling is crash-safe,
no SSE lifecycle to leak (`02 §5`). Supporting: `05 §3` fixes run progress to the `runs/` journal +
lock files and forbids stdout scraping of the child; `08` S4 pins "2 s polling, RUN_LOCKED, verdict
honesty". **Partially realised** — S1 shipped a polling store (`hooks/useStatus`, `14 §4`); S4 owns
the cadence.

**Consequence of overturn → SSE:** S4 is reshaped, and `05 §2b`'s row for `POST /api/run/daily`
(`202 {runId}` + "progress via `GET /api/run`") becomes wrong in the row it is written in. A stream is
a **tenth route**, so `05 §2a`'s allowlist and the structure test must be amended, and `08` S4's
"adds `POST /api/run/daily` (deferred from S0)" becomes "adds two routes". The load-bearing
counter-argument: the bridge is single-threaded and `POST /api/creators` already freezes it for
**1577 ms with zero event-loop ticks** (S1-H12, `16 §14`); a long-lived stream is a resource this
design has never held. An overturn should come with a story for that defect, not just for delivery.

### D4 — v1 command scope: which menu actions are in-console

**Question as posed** (`00` D4 list): which of the 10 menu actions are in-console vs CLI-only (seed:
all except restore/rollback/authorize).

**Seed recommendation** (`02 §5`): **all 10 menu actions except restore/rollback/authorize**
(CLI-only, tier-badged hints). Reason: T3/T4 stay human-CLI-gated per bridge doctrine.

**Evidence / reason already recorded — a precision the adjudicator needs, because the "10" and the
"3" are different sets.** The **10** is `launch.mjs:49-60`: Status, List creators, Add a creator,
Enable, Disable, Run the daily pass, Ask the brains, Canary check, Repair, Backup. The **3** come from
the wider 18-command `COMMANDS` table (`00` line 12): `restore`, `rollback`, `authorize`. **The sets
do not intersect** — the launch menu never offered the dangerous three. So D4's real content is "the
10 menu actions are all in scope"; the exclusion is about the command table, not the menu. **Realised
in shipped code** — S0's nine-route allowlist *is* D4's v1 scope as built: seven of the ten actions
are covered at S0 (status, list, add, enable/disable, query, canary), daily/repair/backup land at
S3–S4 (`05 §2b`), and the absence of the dangerous three is enforced by a **positive** test
(R9/T-B6, `05 §2a` last row).

**Consequence of overturn** (bringing any of the three into the console): **the one overturn that
cannot be made by amendment.** It is a recorded **no-go boundary** in `08` ("no slice may expose
restore/rollback/authorize") and a trust-boundary claim in `05 §4`, and both belong to Sean. If taken:
`05 §2a` gains rows, the allowlist test's *purpose* inverts (it currently makes the absence
enforceable), `05 §4`'s transcript-boundary argument must be re-run for each new write path, and
R9/T-B6 are deleted rather than amended. **Adjudicate the doctrine** (T3/T4 human-CLI-gated), not the
route list, so the verdict survives the CLI's own menu changing.

### D5 — token mode: Crystalline Swan base vs Cyberforest operator layer

**Question as posed** (`00` D5 list): Crystalline Swan base (recommended — SwanGuard embed target is
not a Hermes surface) vs Cyberforest operator layer.

**Seed recommendation** (`02 §5`): **Crystalline Swan base.**

**Evidence / reason already recorded:** Cyberforest is reserved for Hermes surfaces; the SwanGuard
embed target is not one; calm-zone rules still apply (`02 §5`). Supporting: `design.md` §4 is the
token authority that `08` S1 builds against; `CLAUDE.md` rules 3/6/7 make dark-first, the
`var(--token,#fallback)` pattern and 4.5:1 contrast repo law; banned colours are `#0a0a1a`, `#00FFFF`,
`#7851A9`. **Realised in shipped code** — S1 shipped `tokens.css` as `design.md` §4 **verbatim**,
banned colours absent (`14 §4`).

**Consequence of overturn → Cyberforest:** S1's artifact is **rewritten, not extended**, and its exit
evidence re-taken. Every component built against the tokens re-renders against new contrast pairs,
which invalidates S6's a11y pass (T-W9) and the 11-width matrix rather than merely re-running them.
Deeper point: D5 is not a free architectural choice but conformance to `design.md` §4 and `CLAUDE.md`
rules 3/6/7, so an overturn is a request to Sean to change the design system and should be returned as
that question rather than as a verdict. **Cheapest honest verdict: ACCEPT** — a review seat overruling
the design authority is outside the seat's remit.

### D6 — standalone shell: `.cmd` + browser vs Electron-class wrapper

**Question as posed** (`00` D6 list): `.cmd` → starts bridge on an OS-chosen loopback port → opens
default browser (recommended) vs Electron-class wrapper (rejected: weight).

**Seed recommendation** (`02 §5`): **`.cmd` → bridge on OS-chosen loopback port → default browser.**

**Evidence / reason already recorded:** no Electron weight; matches supervised-launcher philosophy
(`02 §5`). Supporting: `08` §Operations specifies that the bridge **binds first, then opens the
default browser itself** (no stdout-parsing race), plus a pid-file single-instance guard (T-B11);
`02 §7`'s rollback story is "delete `console/` + the Desktop `.cmd`". **Realised in shipped code** —
S0/S1 ship under this launcher; bind-then-open is an implementation fact.

**Consequence of overturn → Electron:** the launcher, the bind-then-open sequence and the pid-file
guard (`08` §Operations, T-B11) are all rewritten, and S0's exit evidence ("curl-able JSON on fixture
store") is no longer the operator's path. `02 §7`'s rollback story stops being true — an Electron
artifact is not removed by deleting `console/` and a `.cmd`. `02 §6`'s ≤1.5 s bridge cold-start budget
is replaced by an app-launch budget nobody has measured. Weight is the recorded reason for rejection,
so an overturn needs a capability the browser path demonstrably cannot provide; the only candidate is
filesystem/CLI convenience, which the existing CLI already owns.

### D7 — in-repo home: `scripts/creator-brains/console/` vs top-level `packages/`

**Question as posed** (`00` D7 list): `scripts/creator-brains/console/` (recommended — travels with
the engine) vs top-level `packages/`.

**Seed recommendation** (`02 §5`): **`scripts/creator-brains/console/`.**

**Evidence / reason already recorded:** travels with the engine it serves; one clone = whole product
(`02 §5`). Supporting: `02 §2`'s component table places every console path under `console/`; `08`
S1–S6 exit evidence is written against that root. **Realised in shipped code — and this is the one
seed whose overturn would fix a recorded blocker.**

**Consequence of overturn.** *Keeping it* is already measured, and it is a RED gate: `scripts/
creator-brains/consistency-check.mjs:46-51` walks `scripts/creator-brains/**` for `*.mjs` with **no
`node_modules` skip**, so because the console lives inside that tree the walk collects 186 files of
which **71 are third-party**, the largest being `console/web/node_modules/decimal.js/decimal.mjs` at
**4914 lines** — the engine's C1 check fails deterministically (S1-H14, `16 §14`). The engine suite in
this tree is **181/183 RED**, and the 183/183 baseline of record (`14 §2`) no longer holds. The
contradiction is structural: the packet puts npm deps inside `console/web/`, then the engine's gate
walks them; the console's *own* cap walk already skips third-party code (`NOT_OUR_SOURCE`, `14 §5`),
the engine's never did.

*Overturning it* — a top-level `packages/creator-brains-console/` — takes the console out of the
engine's walk entirely, so **C1 returns to green without touching an engine file**, exactly what the
additive-only boundary demands. Cost: every path in `02 §2`, `05 §1`, `08` S1–S6 and the console's own
walk root (`CONSOLE_ROOT`, `14 §5`) is amended; S0/S1 are **relocated, not rewritten**; the `.cmd`
target and the engine README quick-start pointer change. Keeping the seed instead forces the fix into
an **engine file** (skip `node_modules` in the walk), which the console may not do unilaterally —
`16 §14` records that refusal. So the two live options are: move the console (a packet change), or fix
the engine walk (an engine change). **Say which you recommend and why; this is the highest-value
verdict in this brief.** Second-order: the `server.mjs` cap question this seed's home created is
already closed — the bridge was split at the route-table seam into `server.mjs` 244 + `routes.mjs`
131 (`16 §19`) — so a D7 overturn is now purely a relocation cost, with no open cap call attached.

### D8 — embed contract for SwanGuard: React component + adapter prop vs Web Component

**Question as posed** (`00` D8 list): React component package with adapter prop (recommended) vs Web
Component wrapper.

**Seed recommendation** (`02 §5`): **React component package + adapter prop** (Web Component wrapper
only if SwanGuard needs framework isolation).

**Evidence / reason already recorded:** SwanGuard web is React 18 + styled-components — native fit
(`02 §5`). Supporting: `05 §1` calls `ConsoleDataAdapter` "the modularity seam — UI imports ONLY this"
and "the interface is the transfer artifact"; `02 §1` shows the S7 mount; `08` §Operations' S7 note
declares `react`/`react-dom`/`styled-components` as **peer externals** so SwanGuard never gets a second
React copy. **Planned only** — S7 is gated on Sean's explicit go (`08` S7); nothing is shipped.

**Consequence of overturn → Web Component:** S7's handoff spec changes shape — the adapter becomes a
property/attribute bridge on a custom element rather than a prop, and `05 §1` must gain a
serialization contract, because the interface is typed and returns Promises (natural as a prop, awkward
across a WC boundary). `08`'s peer-external list changes: a WC wrapper either bundles React — the exact
outcome that note exists to prevent — or needs the host to supply it anyway, weakening the isolation
argument that motivates the wrapper. Blast radius is small (**S7 only**, no shipped artifact), so this
is the cheapest of the nine to overturn. A cheap middle verdict exists: ACCEPT the React component as
the contract and record "WC wrapper only if SwanGuard needs framework isolation" — the seed's own
wording — as a deferred S7 decision.

### D9 — constellation idle motion: sub-perceptual drift vs fully static

**Question as posed** (`00` D9 list): sub-perceptual drift + full static under reduced-motion
(recommended) vs fully static always.

**Seed recommendation** (`02 §5`): **sub-perceptual drift (<5% visual energy) + fully static under
reduced-motion; pause off-viewport/hidden.** Reason: `motion.md` §6 loop integrity; calm-zone
compliance.

**Evidence / reason already recorded:** `02 §6` requires rAF to stop within one frame of
`document.hidden` / off-viewport; `12 §99` independently verified D9 as properly specified and noted it
covers the constellation's idle motion, not only the entry dolly. CD3's lock (`02 §4`) makes the entry
dolly the **only** narrative motion on the page, so the drift must stay sub-narrative. **Planned** —
binds S5; the reduced-motion half is already load-bearing in `14 §3`, where the chunk is never fetched
for those users, so they pay zero.

**Consequence of overturn → fully static always:** S5 loses its motion budget on the constellation side
and CD3's beauty argument thins toward CD2, so `02 §4`'s fallback logic should be re-read (CD2 survives
only as the fallback if CD3's constellation fails the S5 usability exit review). `14 §3` item 4 (the
dolly waits on the chunk) becomes moot, and T-E3's reduced-motion assertion simplifies from "no chunk
and no rAF" to "no chunk". An overturn the *other* way — more motion than sub-perceptual — would break
`motion.md` §6's one-signature-moment rule and CD3's lock, and needs Sean rather than this seat.
Verdict cost is low either way (S5 + T-E3 + the `motion.md` §6 reference); **ACCEPT** is the low-risk
answer.

## 4. Amendment index (what an overturn touches, by file)

**By file:** D1 — `02 §2`/§5/§6, `08` S5 + S7 peer externals, T-E3. D2 — `05 §2a` + structure test,
`08` §Operations, `02 §7`. D3 — `05 §2a`/§2b, `08` S4, S1's polling store. D4 — `08` no-go boundaries,
`05 §2a`/§4, R9/T-B6. D5 — `tokens.css` (S1 artifact), `design.md` §4. D6 — `08` §Operations, T-B11,
`02 §6`/§7. D7 — `02 §2`, `05 §1`, `08` S1–S6, `CONSOLE_ROOT`, the `.cmd` target. D8 — `05 §1`, `08`
S7 note + peer externals. D9 — `02 §4`/§5, `14 §3` item 4, T-E3, the `motion.md` §6 reference.

## 5. Standing

**Nine decisions open, zero adjudicated.** D1–D9 remain *recommendations*: `10 §5` is explicit that any
slice touching a D-decision before Astra lands does so on the builder's judgment and must say so in its
receipt. S0 and S1 were built on that basis, and their receipts say so.

No paid or metered call was made in producing this document, and none is required to act on it — Astra
rides the Codex subscription. The single authorized attempt is still unspent: the earlier failure died
at flag-parse before reaching a provider (`09 §3`, `10 §1`).

=== END DOCUMENT: 15-astra-brief.md ===


=== BEGIN DOCUMENT: 02-blueprint.md — BLUEPRINT ===

# 02 — Blueprint — Creator Brains Console

- **Date:** 2026-09-17 · **Status:** PLAN READY — pending Sean's concept-direction pick (ideation gate) + Astra adjudication when seat resets (see 09)
- **Author seat:** ZCode/GLM (Astra adjudication recorded when it lands)

## 1. System topology

```
┌────────────────────────── Sean's Desktop ──────────────────────────┐
│  Creator Brains Console.cmd                                        │
│    └─ node scripts/creator-brains/console/server.mjs               │
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

**Ownership boundaries:** the engine (`scripts/creator-brains/*` except `console/`) is untouched — the console is purely additive. The bridge composes engine lib functions; it never opens store files itself. The web app knows only the `ConsoleDataAdapter` interface.

## 2. Components & responsibilities

| Component | Path | Responsibility | Owns |
|---|---|---|---|
| Bridge server | `console/server.mjs` | loopback bind (OS-chosen port), static serving of `web/dist`, JSON routing, process spawn for daily pass, JSON error envelope | nothing — delegates |
| Bridge API | `console/api.mjs` | handlers: status/creators/query/brains/run/canary/repair/backup; input validation; damage-refusal mapping | validation rules |
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

## 5. Seed decisions D1–D9 (recommendations; Astra adjudication pending)

| # | Decision | Seed recommendation | Reason |
|---|---|---|---|
| D1 | raw `three` vs `@react-three/fiber` | **raw three.js** in one lazy chunk | SwanGuard has a bundle-budget gate; r3f+vendors adds ~2× weight for ergonomics we don't need in one scene; cleanup contract is explicit |
| D2 | bridge shape | **node:http zero-dep server** | engine stays zero-dep; no Vite middleware to maintain in prod; one `.cmd` starts everything |
| D3 | run progress | **poll journal/lock/budget every ~2 s while active** | the engine already persists run truth; polling is crash-safe, no SSE lifecycle to leak |
| D4 | v1 command scope | all 10 menu actions **except** restore/rollback/authorize (CLI-only, tier-badged hints) | T3/T4 stay human-CLI-gated per bridge doctrine |
| D5 | token mode | **Crystalline Swan base** (not Cyberforest) | Cyberforest is reserved for Hermes surfaces; SwanGuard embed target is not one; calm-zone rules still apply |
| D6 | standalone shell | **.cmd → bridge on OS-chosen loopback port → default browser** | no Electron weight; matches supervised-launcher philosophy |
| D7 | in-repo home | **scripts/creator-brains/console/** | travels with the engine it serves; one clone = whole product |
| D8 | embed contract | **React component package + adapter prop** (Web Component wrapper only if SwanGuard needs framework isolation) | SwanGuard web is React 18 + styled-components — native fit |
| D9 | constellation idle motion | sub-perceptual drift (<5% visual energy) + **fully static under reduced-motion**; pause off-viewport/hidden | motion.md §6 loop integrity; calm-zone compliance |

## 6. Performance budgets (measurable)

- Bridge cold start ≤ 1.5 s; API p95 ≤ 50 ms (file-backed reads); status payload ≤ 256 KB.
- Web initial bundle (excluding lazy three chunk) ≤ 500 KB gz; three chunk ≤ 900 KB gz; loaded only on viewport enter (or CD2: on mount of orb).
- 60 fps constellation on a mid GPU at DPR ≤ 2; particle/node count bounded by creator count (tens, not thousands).
- rAF stops within one frame of `document.hidden` / off-viewport.

## 7. Rollback story

The console is additive: deleting `scripts/creator-brains/console/` + the Desktop `.cmd` restores the prior world exactly. No engine file changes except the README quick-start pointer. The daily pass and all data remain CLI-operable at every point — the console is never load-bearing for data integrity.

=== END DOCUMENT: 02-blueprint.md ===


=== BEGIN DOCUMENT: 01-requirements.md — REQUIREMENTS ===

# 01 — Requirements — Creator Brains Console

- **Date:** 2026-09-17 · **Status:** PLAN READY (pending Sean's concept-direction pick) · **Owner:** ZCode/GLM seat
- **Governing upstream plans:** `docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md` (engine), SwanGuard `docs/SWANGUARD-CREATOR-BRAIN-BLUEPRINT-2026-09-02.md` CB0 (product), `docs/ai-workflow/design-brain/design.md` + `motion.md` + `qa-gates.md` (design law)
- **Roles:** exactly one operator — Sean — on his Windows machine. Not multi-user, not client-facing, not authenticated (loopback-only surface).

## Job / outcome

Replace the readline menu as the day-to-day way Sean drives Creator Brains with a Swan-designed, three.js console he can click from his Desktop: see the engine's truth at a glance, manage the creator catalog, run the daily pass, and read the brains with citations — then embed the same component into SwanGuard-Newsroom later from a preserved best-state snapshot.

## Scope / non-goals (v1)

**In scope:** status instruments, roster management (add/enable/disable), query-with-citations, brain detail, daily-pass run console, canary/repair/backup, three.js constellation, standalone loopback shell, adapter-based modularity.
**Out of scope (v1):** `authorize` (OAuth), `restore`, `rollback` (CLI-only; tier T3/T4), editing brain content, embeddings/semantic search, Whisper, any network-facing auth, any change to engine internals, mobile-native app.

## Requirements

| ID | Requirement | Acceptance criteria (measurable) |
|---|---|---|
| **R1** | Standalone launch from Desktop: one `.cmd` starts the bridge and opens the console in the default browser. | Cold double-click → rendered console ≤ 15 s on Sean's machine; no terminal interaction required; bridge binds `127.0.0.1` on an OS-chosen free port. |
| **R2** | Status board answers "is it working and when did it last succeed" without the CLI. | Every instrument maps 1:1 to a `status-command.mjs` data source (yt-dlp health, creators, coverage + per-state counts, budget used/perHour/byKind, backlog age+projection, throttle, census, lock, last run, last good + staleness, docs, published brains, recent runs). Staleness > 3 days renders the WARNING state. |
| **R3** | Honest damage handling. | A damaged `registry.json` / `state.json` renders a refusal banner naming the file (HR05 class) — never an empty catalog, zeros, or a spinner that resolves to nothing. |
| **R4** | Roster management: list (ON/off, videos, fetched), add by `@handle`/URL/`UC…`, enable/disable by pick. | Added creators arrive DISABLED; enable/disable persists through the engine's `setEnabled` and is reflected on next read; number-pick parity with `launch.mjs` behavior. |
| **R5** | Ask the brains: query box with optional creator filter; results are cited claims. | Hit rows show key phrase, creator, and a deep link to the video at `t_start_ms`; zero-hit copy names the searched terms (never "creator never said that"); `skipped` rows are visible, not swallowed. |
| **R6** | Brain detail: per-creator index/topics/timeline and claims list, derived files only. | Drawer renders `brains/<slug>` published generation via `current.json` pointer; no module under `web/src` can import engine transcript paths (grep-enforced). |
| **R7** | Run the daily pass from the console with `ops/hour` prompt (default 20). | Non-positive/NaN/fractional input refused client- and server-side; run starts via engine daily pipeline; progress = journal + budget + throttle polling while lock held; a second start while the lock is held is refused and the holder is shown; failures surface the run verdict, never a fake COMPLETED. |
| **R8** | Canary, repair, backup executable in-console (T2). | Canary renders yt-dlp verdict; repair reports re-queued count; backup reports destination + result. Each returns to the console on refusal (menu-continues invariant). |
| **R9** | Dangerous ops are NOT executable from the console v1. | No bridge endpoint exists for `restore`/`rollback`/`authorize` (integration test asserts 404); UI shows them as tier-badged CLI-only hints. |
| **R10** | Three.js **brain constellation** — the page's one signature moment, justified as data. | Node per creator from real registry data; size = video count, ring/arc = fetch coverage, color = enabled/state; hover = tooltip, click = opens that creator's drawer; under `prefers-reduced-motion` renders static (no drift, no autoplay); rAF stops off-viewport and on `document.hidden`; WebGL unavailable → static fallback listing (roster remains the accessible equivalent). |
| **R11** | Swan design law compliance end-to-end. | Crystalline Swan tokens via `var(--token, #fallback)`; 44px targets; 4.5:1 contrast; four states (empty/loading/error/success) on every data surface; Dual-Button Glow; tier badges per design.md §15; panels response-tier only (calm zone) except the constellation; no MUI/Tailwind. Verified against `qa-gates.md` at closeout. |
| **R12** | Modular by contract: UI never couples to engine internals. | `ConsoleDataAdapter` interface in `web/src/adapters`; `LocalEngineAdapter` (bridge HTTP) and `MockAdapter` (tests) both satisfy it (contract test); grep test proves zero `scripts/creator-brains/lib` imports under `web/src`. |
| **R13** | Zero-dependency bridge. | `server.mjs` imports Node built-ins + engine `lib/*` only (no npm deps added to the engine); integration test asserts loopback-only bind. |
| **R14** | Responsive audit matrix (rule 24) at 320/375/414/768/1024/1280/1440/1920/2560/3840/3440. | No overlap/clipped critical text/hover-only controls at any width; constellation collapses to compact orb or is hidden behind the roster equivalent on phones. |
| **R15** | Best-state snapshot before SwanGuard transfer (Sean's explicit process). | At the transfer gate: git tag + copied tree + recorded hashes; the SwanGuard copy builds in that repo; transfer happens only on Sean's explicit go (separate slice). |
| **R16** | Accessibility: full keyboard operability; constellation is enhancement, not the only path. | Every action reachable and operable by keyboard; focus-visible rings; roster + status board carry the same information as the constellation; axe smoke clean. |

## Business rules & invariants (forbidden side effects)

1. **Transcript boundary = trust boundary.** The console renders tier-C derived data only. Rendering, exporting, or transmitting raw transcript JSON (`docs/<channelId>/*.json`) through any console surface or bridge endpoint is forbidden (8+-word verbatim grep test must stay green).
2. All store mutations flow through engine functions (`COMMANDS`, `setEnabled`, lib modules). The bridge/UI never writes store files directly.
3. Damaged store files refuse their action and name the file — an empty/zero read is never rendered as truth.
4. The engine stays zero-npm-dependency; the console adds dependencies only inside `console/web/`.
5. One daily pass at a time — the engine's lock is the single source of truth and is surfaced honestly.
6. No data fabrication: every displayed number comes from the store this session (read-time truth, no cached mocks).

## Assumptions & unresolved decisions

- **A1** Sean's browser is modern (WebGL2 available); fallback still required (R10).
- **A2** Engine R2 repairs (N1–N15) may land in parallel; the console couples only to `lib/*` + `commands.mjs` seams, which the repair order preserves.
- **D1–D9** open decisions (three vs R3F, bridge shape, polling vs SSE, v1 scope, token mode, shell, in-repo home, embed contract, idle-motion level) — seed recommendations in `02-blueprint.md` §5, Astra adjudication recorded in `09-hostile-review.md`. **D-CD: concept direction pick belongs to Sean (ideation gate) — build does not start until he picks CD1/CD2/CD3.**

=== END DOCUMENT: 01-requirements.md ===


=== BEGIN DOCUMENT: 03-wireframes.md — WIREFRAMES ===

# 03 — Wireframes — Creator Brains Console (CD3 "Vault Observatory" drawn; CD1/CD2 deltas noted)

ASCII, desktop-first. Mobile (414px) below. CD1 removes the right ops deck (dock floats over the full-viewport constellation); CD2 replaces the constellation half with a header orb over a full-width board.

## Desktop 1440 (primary operator width)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◆ CREATOR BRAINS        store: healthy · yt-dlp: ok · last good: 2d ago       │
│                                   [T0] badges: status query canary            │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │  OPERATIONS DECK             │
│                                               │ ┌──────────────────────────┐ │
│           B R A I N   C O N S T E L L A T I O N               │ │ RUN THE DAILY PASS  [T2] │ │
│                                               │ │ ops/hour [20] (RUN)      │ │
│      ✦ photographer-brain ●███░░ 412/979      │ │ throttle: clear · 20/h   │ │
│         (hover: tooltip — click: drawer)      │ │ lock: free · census: 1   │ │
│   ✦ seo-brain ●█░░░ 88/979   ✦ copy-brain ON  │ └──────────────────────────┘ │
│                                               │ ┌──────────────────────────┐ │
│   (node size = videos · arc = fetched %       │ │ CREATORS  [T2]  (+ add)  │ │
│    color: ON=ice · off=lavender · throttle=   │ │ 1 ON  412(410) photographer│
│    gold · stale=danger)                       │ │ 2 off  979(88) seo        │
│                                               │ │ … numbered pick rows      │
│                                               │ └──────────────────────────┘ │
│                                               │ ┌──────────────────────────┐ │
│                                               │ │ ASK THE BRAINS [T0]      │ │
│                                               │ │ ( "shadow lift" )  (ASK) │ │
│                                               │ └──────────────────────────┘ │
│                                               │  canary [T0] repair [T2]     │
│                                               │  backup [T2] · CLI-only:     │
│                                               │  restore↩ rollback↩ auth↩    │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

## Brain drawer (opens from node click or roster row; Graphite glass, 24px radius, ESC/focus-return)

```
┌─ photographer-brain ────────────────────────────── [T0] ─┐
│ videos 979 · fetched 412 (42%) · last fetch 2d ago        │
│ [index] [topics] [timeline] [claims]                      │
│ claims:                                                   │
│  • "never blur the tear trough crease" — 14:22 ▶watch [T0]│
│  • "always shoot at f/8 for groups"   — 31:05 ▶watch      │
│  ⚠ 3 skipped rows in rules.jsonl (shown, not hidden)      │
└───────────────────────────────────────────────────────────┘
```

## Mobile 414 (constellation collapses; roster is the interface)

```
┌──────────────────────────────┐
│ ◆ CREATOR BRAINS   ☰         │
│ [mini orb 96px · static-cap] │
│ store healthy · yt-dlp ok    │
│ last good 2d ago ⚠(>3d red)  │
├──────────────────────────────┤
│ STATUS (stacked cards)       │
│ coverage 42% ▓▓▓░░ backlog…  │
├──────────────────────────────┤
│ CREATORS (stacked cards,     │
│ 44px rows, enable toggle)    │
│ [photographer-brain  ON ▢]   │
│ [seo-brain           off  ]   │
├──────────────────────────────┤
│ (ASK) (RUN) (MORE)  44px tabs│
└──────────────────────────────┘
```

## State matrix (every data-bearing panel ships all four + refusals)

| State | Status board | Roster | Query | Run console | Constellation |
|---|---|---|---|---|---|
| Loading | skeleton matching final geometry (shimmer; reduced-motion → static) | skeleton rows | inline "searching…" (≤400ms) | poll indicator | static placeholder ring |
| Empty | first-run copy: *"No brains yet — add your first creator."* + Add CTA (Cormorant italic) | "No creators yet — add one." + Add CTA | honest no-match naming searched terms | "never run — the daily job has not run yet" (real journal truth) | empty-space message + CTA to roster |
| Error | panel-level: what failed + Retry; one `--danger` accent max | row keeps data, badge on failed action | refused → engine reason string | run FAIL verdict + digest pointer | WebGL fail → static fallback list (roster remains) |
| Success | values render; delta beats are response-tier | inline "added/… is now ON" toast | hits with ▶watch deep links | verdict from journal; never fake COMPLETED | node pulse ≤1 beat |
| Damaged store | **refusal banner naming the file** (409 mapped) — never zeros/empty | same | same | same | static + banner |
| Denied (lock held) | lock row shows holder pid/host | — | — | second start refused: `RUN_LOCKED` + holder | — |
| Validation error | — | add: invalid ref → inline reason (engine's) | — | ops/hour 0/NaN/fraction refused client+server | — |

## Keyboard / focus / a11y

- Full tab order: status strip → constellation (arrow-key node walking + Enter opens drawer; roster is the always-present equal) → ops deck → drawer (focus-trapped, ESC, focus returns to trigger).
- Node focus shows the same tooltip as hover; every action also exists as a DOM control (never hover-only).
- Contrast: Frost White on Graphite/Carbon ≥ 7:1; badge text uses lightened tints per design.md §15; color never sole signal (ON/off/throttle carry text labels).

=== END DOCUMENT: 03-wireframes.md ===


=== BEGIN DOCUMENT: 04-flows.md — FLOWS ===

# 04 — Flows (Mermaid) — Creator Brains Console

Rendering note: authored as valid mermaid source; this packet was written in a terminal agent — open in any mermaid-capable viewer (GitHub renders these in-place). Diagrams cover happy, blocked, error, cancel/defer, retry and recovery paths.

## F1 — Daily pass from the console (happy + blocked + error + recovery)

```mermaid
flowchart TD
  A[Operator clicks RUN\nops/hour default 20] --> B{Client validation\npositive integer?}
  B -- no --> B1[inline refusal\nnothing sent]
  B -- yes --> C[POST /api/run/daily]
  C --> D{Bridge: lock free\nand inputs valid?}
  D -- no --> D1[409 RUN_LOCKED\nshow holder pid/host]
  D -- yes --> E[Spawn run-daily.mjs\nreturn run id]
  E --> F[Poll /api/run every ~2s\njournal + budget + throttle + lock]
  F --> G{journal.status?}
  G -- running --> F
  G -- ok --> H[verdict: COMPLETED\ncounts + digest link]
  G -- failed --> I[verdict: FAILED\nphase + reason surfaced\nexit-code contract]
  I --> J{Recovery choices}
  J -- throttle tripped --> K[show cooldown +\nthrottle --clear hint T2]
  J -- yt-dlp missing --> L[canary CTA T0]
  J -- transient --> A
  H --> M[node pulse ≤1 beat\ncoverage arcs update]
```

## F2 — Add creator → enable → daily fold-in (happy + validation + refused)

```mermaid
sequenceDiagram
  participant O as Operator
  participant UI as Console
  participant BR as Bridge
  participant EN as Engine lib
  O->>UI: paste @handle / URL / UCid
  UI->>BR: POST /api/creators {ref}
  BR->>EN: addCreator({ref})
  alt invalid ref
    EN-->>BR: refused reason
    BR-->>UI: 422 + reason (inline, nothing mutated)
  else ok
    EN-->>BR: creator (DISABLED)
    BR-->>UI: 201 row (arrives OFF — deliberate act to enable)
  end
  O->>UI: pick row → ENABLE
  UI->>BR: PATCH /api/creators/:channelId {enabled:true}
  BR->>EN: setEnabled(...)
  EN-->>BR: creator ON
  BR-->>UI: 200 (toast "ON — daily pass will build this brain")
  Note over EN: next daily pass discovers + fetches + rebuilds<br/>damaged registry ⇒ 409 STORE_DAMAGED naming file
```

## F3 — Ask the brains (happy / no-hit / damaged / skipped honesty)

```mermaid
flowchart TD
  A[Query box + optional creator filter] --> B[GET /api/query]
  B --> C{current.json pointer\nresolves?}
  C -- no --> C1[empty generation ⇒ honest zero hits\ncreator publishes empty, not stale]
  C -- yes --> D[queryBrains on published rules.jsonl]
  D --> E{hits?}
  E -- yes --> F[cited rows: key phrase, creator,\n▶watch at t_start_ms]
  E -- no --> G[zero-hit copy NAMES the searched terms\nnever "creator never said that"]
  D --> H[skipped/unparseable rows rendered\nas visible ⚠ list]
```

## F4 — Bridge failure & rollback paths

```mermaid
flowchart TD
  A[Bridge error paths] --> B[store read damaged]
  A --> C[unknown route]
  A --> D[mutation refused by engine]
  A --> E[bridge process dead]
  B --> B1[409 STORE_DAMAGED {file}\nUI refusal banner - action blocked not faked]
  C --> C1[404 envelope]
  D --> D1[422 + engine reason string verbatim]
  E --> E1[.cmd closed / bridge restart = full recovery\nstore is on disk - console holds no truth]
  F[Rollback whole console] --> F1[delete console/ dir + Desktop cmd\nengine CLI unchanged - zero data impact]
```

## F5 — Best-state transfer to SwanGuard (gated slice S7 — runs only on Sean's go)

```mermaid
flowchart TD
  A[S0-S6 exit evidence green] --> B[Design dual-pass + QA matrix pass]
  B --> C[Snapshot: git tag + copied tree + hashes recorded]
  C --> D{Sean says transfer}
  D -- no --> E[standalone remains canonical\ncopy stays in snapshot]
  D -- yes --> F[Copy package into SwanGuard-Newsroom\nSwanGuardAdapter spec handed off]
  F --> G[SwanGuard builds + its own review chain\nSS-PT console untouched]
```

=== END DOCUMENT: 04-flows.md ===


=== BEGIN DOCUMENT: 05-contracts.md — CONTRACTS ===

# 05 — Contracts — Creator Brains Console

## 1. `ConsoleDataAdapter` (the modularity seam — UI imports ONLY this)

```ts
// web/src/adapters/types.ts
export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface StatusInstrument {            // R2 — mirrors status-command sources
  ytdlp: { ok: boolean; version: string | null; reason: string };
  creators: { total: number; enabled: number; damaged: null | { file: string; detail: string } };
  state: { damaged: null | { file: string; detail: string };
           videos: { total: number; fetched: number; coverage: number;
                     counts: Record<string, number> } | null };
  budget: { used: number; perHour: number; unit: string; byKind: Record<string, number> };
  backlog: { lines: string[] };               // engine-formatted truth, not re-derived
  throttle: { active: boolean; kind?: string; until?: string; text: string };
  census: { inFlight: Array<{ channelId: string; detail: string }>;
            everSwept: number; discarded: boolean; error?: string };
  lock: { held: boolean; pid?: number; host?: string; alive?: boolean };
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number; publishedBrains: number;
  recentRuns: Array<{ runId: string; ok: boolean; fetched: number }>;
}

export interface CreatorRow {
  channelId: string; title: string; enabled: boolean;
  videos: number; fetched: number;             // from state.json, per renderCreators truth
}

export interface QueryHit {
  claimId: string; creatorId: string; creatorTitle: string;
  videoId: string; tStartMs: number; keyPhrase: string;
  watchUrl: string;                            // https://youtu.be/<id>?t=<s>
}
export interface QueryResult { hits: QueryHit[]; skipped: Array<Record<string, unknown>>; }

export interface BrainDoc { slug: string; title: string;
  index: string; topics: string; timeline: string;       // markdown from published generation
  claims: QueryHit[]; skipped: Array<Record<string, unknown>>; }

export interface RunState { journal: { status: string; runId: string | null } | null;
  lock: StatusInstrument['lock']; throttle: StatusInstrument['throttle'];
  budget: StatusInstrument['budget']; recentRuns: StatusInstrument['recentRuns']; }

export interface ConsoleDataAdapter {
  getStatus(): Promise<StatusInstrument>;
  listCreators(): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>;                    // T2
  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow>;  // T2
  query(q: string, creator?: string): Promise<QueryResult>;        // T0
  getBrain(slug: string): Promise<BrainDoc>;                       // T0
  getRunState(): Promise<RunState>;                                // T0
  startDailyRun(perHour: number): Promise<{ runId: string }>;      // T2
  canary(): Promise<{ ok: boolean; version: string | null; reason: string }>;   // T0
  repair(): Promise<{ requeued: number }>;                         // T2
  backup(dest?: string): Promise<{ dest: string; ok: boolean }>;   // T2
}
```

`LocalEngineAdapter` implements this over the bridge HTTP API. `MockAdapter` implements it over fixtures and MUST satisfy the same vitest contract test (R12). SwanGuard later supplies its own — the interface is the transfer artifact.

## 2. Bridge HTTP API (loopback only; JSON; error envelope everywhere)

**Scope of this table (read this before treating a row as buildable).** A row's tier badge is a *capability* label, not a schedule. Which rows exist today is fixed by the **S0 route allowlist** below — nine literal routes, pinned by a positive allowlist test (`bridge.hy4.structure.test.mjs`) so an unplanned route fails CI rather than appearing unnoticed. Rows marked **DEFERRED** are contract *intent* for a later slice, and a route MUST NOT be added ahead of the slice that owns it.

### 2a. S0 — realised route allowlist (implemented; this is the honest surface)

| Method+Path | Tier | Engine function (authoritative source) | Response 2xx | Errors |
|---|---|---|---|---|
| `GET /api/status` | T0 | store/summary/ledger/throttle/checkpoints/lock/ytdlp/render (same composition as status-command) | `StatusInstrument` — **200 even when damaged** | none (damage is a *field*, see note) |
| `GET /api/creators` | T0 | `listCreatorsSafe` + state counts | `CreatorRow[]` | `409 STORE_DAMAGED` |
| `POST /api/creators` | T2 | `addCreator` | `201 CreatorRow` (DISABLED) | `400 VALIDATION`, `422 REFUSED {reason}` |
| `PATCH /api/creators/:channelId` | T2 | `setEnabled` | `200 CreatorRow` | `409 STORE_DAMAGED`, `422 REFUSED` |
| `GET /api/query?q&creator` | T0 | `queryBrains` | `QueryResult` | `400 VALIDATION` |
| `GET /api/brains/:slug` | T0 | `readPointer`+published files only | `BrainDoc` | `404 NO_PUBLISHED_BRAIN` |
| `GET /api/run` | T0 | journal+lock+throttle+budget+recentRuns | `RunState` | — |
| `GET /api/backlog` | T0 | backlog lib function (engine-formatted lines) | `{ lines: string[] }` | — |
| `GET /api/canary` | T0 | `selfCheck` via the **60 s TTL cache** (see 11 §3) — carries `ok/version/reason/checkedAt/ageMs/source/stale/note` | `CanaryReading` | — |
| anything else | — | — | — | `404` (restore/rollback/authorize have **no route** — R9/T-B6 tested) |

`GET /api/status` and `GET /api/canary` MUST NOT call `selfCheck()` inline: the probe shells out to `yt-dlp --version` (~1.7–3.4 s) and would block the single-threaded bridge per request. They read through `lib/health.mjs`.

**Damage reporting differs by route — corrected 2026-09-18 (H6b).** This table previously listed `409 STORE_DAMAGED` for `GET /api/status`, which was **wrong**, and `06` T-B2 asserted the same. Measured behaviour on a corrupt `registry.json`:

- `GET /api/status` → **200**, with `creators.damaged = {file:'registry.json', detail}` (and `state.damaged` for a corrupt `state.json`). It does **not** 409.
- `GET /api/creators` → **409** `{error:{code:'STORE_DAMAGED', file:'registry.json'}}`.

The code is right and the doc was wrong, for a reason visible in §1: `StatusInstrument` types damage as a *field* (`damaged: null | {file, detail}`), so a 409 on `/api/status` would make that field unreachable — and R3/T-W3 require the board to render a refusal banner **naming the file**, which needs the 200 + field shape.

**Trap for future consumers:** when `creators.damaged` is non-null the same payload still carries `total: 0, enabled: 0`. Those zeros are *not* a measurement. Any consumer that renders `total` without checking `damaged` first will display a false zero — which is precisely what R3 forbids. `StatusBoard` withholds them and renders the refusal instead.

### 2b. DEFERRED — contract intent, no route until the owning slice lands

| Method+Path | Tier | Owner slice | Engine function | Planned response 2xx | Planned errors |
|---|---|---|---|---|---|
| `POST /api/run/daily` | T2 | **S4** (RunConsole) | spawn `run-daily.mjs --per-hour=N` | `202 {runId}` (progress via `GET /api/run`) | `400 VALIDATION` (non-positive int), `409 RUN_LOCKED {holder}` |
| `POST /api/repair` | T2 | **S3** (OpsRail) | repair path of `COMMANDS` | `200 {requeued}` | `409/422` |
| `POST /api/backup` | T2 | **S3** (OpsRail) | backup command | `200 {dest,ok}` | `422 REFUSED` |

The corresponding tests (`T-B4`, `T-B5`, `T-B10`) land **with their slice**, not at S0 — this is the plan/code discrepancy HY4 found as H6 and is corrected here and in `08`. S0's exit evidence is `T-B1/B2/B3/T-B6/T-B7/T-B8/T-B9` plus the structure suite.

**Error envelope (uniform):** `{ "error": { "code": "STORE_DAMAGED|RUN_LOCKED|VALIDATION|REFUSED|NOT_FOUND", "message": "<engine reason, verbatim>", "file?": "<damaged file name>" } }`

**Validation:** `addCreator.ref` non-empty string ≤ 200 chars; `perHour` integer ≥ 1 (both client and server); `query.q` non-empty ≤ 300 chars; channelId matched against `^UC[A-Za-z0-9_-]+$` or existing registry key.

## 3. Authoritative data sources (data-truth map)

| Screen fact | Source file/function | Never from |
|---|---|---|
| creator list/on-off | `registry.json` via `listCreatorsSafe` | UI state |
| per-creator videos/fetched | `state.json` via `readState`+filter (same as `renderCreators`) | cache older than the request |
| coverage/budget/backlog/throttle/lock/census | their lib functions (same call graph as `status-command.mjs`) | re-derived math in the client |
| claims/citations | published generation `rules.jsonl` via `current.json` (HR08) | raw transcripts (forbidden, tier B) |
| run progress | `runs/` journal + lock files | stdout scraping of the child |

## 4. Trust & privacy boundary

- The bridge binds `127.0.0.1` only (integration-tested), no auth surface exposed; it is a single-operator local tool. It MUST NOT gain any route that reads `docs/<channelId>/*.json` (tier B transcripts) — enforced by import discipline (api.mjs never imports a transcript-reading module) + the verbatim 8+-word grep test over everything the console serves (R-invariant 1).
- Store mutations remain inside the engine's tested functions; the bridge adds validation + tier labels, never new write paths.
- SwanGuard transfer (S7) re-evaluates this boundary — a networked host app changes the trust model; that review belongs to the SwanGuard-side packet, not this one.

## 5. N/A records (per protocol part 5)

- **ERD/data model:** N/A — the store schema is the engine's existing files; this console creates no tables and no migrations (see engine blueprint).
- **Permissions matrix:** N/A beyond tier badges — single-operator loopback tool; no roles.

=== END DOCUMENT: 05-contracts.md ===


=== BEGIN DOCUMENT: 06-test-plan.md — TEST PLAN ===

# 06 — Test plan — Creator Brains Console

Conventions: tests are written BEFORE implementation per slice (RED observed, then GREEN). RED suites live beside the slice's tests and are run explicitly; the normal suite stays green. Isolated resources: every bridge test runs against a temp `CREATOR_BRAINS_ROOT` (engine's own env seam) and an OS-chosen port (`server.listen(0)`). Playwright NEVER boots the real backend/production DB (standing repo lesson): the smoke stubs `/api/**` like the protected-surface smokes, or runs against the bridge pointed at a temp root.

## Bridge (node --test; `console/test/*.test.mjs`)

**S0 scope note (H6 correction).** S0 realises **nine routes** — see `05 §2a`. The tests below marked **[S3]** / **[S4]** name routes that do NOT exist at S0 (`POST /api/repair`, `/api/backup`, `/api/run/daily`); they are specified here as contract intent and **land with their owning slice**, not as S0 exit evidence. S0's exit evidence is T-B1/B2/B3/B6/B7/B8/B9 + `bridge.hy4.structure.test.mjs` (which pins the exact route allowlist, so an unplanned route fails CI).

**Round-5 pass 1 added T-B19/T-B20/T-B21 (the write path) and corrected the suite's own count (`16 §14`, S1-H13).** `withFixture` was exported from `bridge.boundary.test.mjs`, and importing a module that calls `test(...)` registers its tests in the importing file — so the boundary suite ran once per importer and the suite reported **97 tests for 85 real ones**, at 20 s instead of 4.3 s. The harness now lives in `fixtures.mjs` (a non-test module) and the suite reports **93 real tests in 3.9 s**. **Any count quoted from this plan before 2026-09-19 is inflated**; use the per-file counts, not the aggregate.

**Round-5 pass 2 added T-B22 (`16 §15`, S1-H15/H16) → 99 bridge tests; pass 3 added T-W11 (`16 §16`, S1-H17/H18) → 48 web tests; pass 4 added T-B23 (`16 §17`, S1-H19) → 105 bridge tests.** Pass 3 is the first pass to touch the UI at all: the web slice's entire defence against a wrong-shaped payload was that **no component happened to throw on the payloads anyone had tried**, so a missing top-level key unmounted the React root and left a **blank console**. T-W11 now pins both layers — the adapter-seam validator and the error boundary — with two healthy-payload controls so neither can be satisfied by refusing everything. Pass 4 found that the body ceiling, the chunked path, invalid UTF-8 and an empty POST had **no coverage whatsoever**; T-B23 pins all four, plus the boundary itself from both sides.

| ID | Req | Level | Action → expected | Forbidden side effects |
|---|---|---|---|---|
| T-B1 | R2 | integration | `GET /api/status` on fixture store → 200 with every `StatusInstrument` field present and matching lib values | no store writes |
| T-B2 | R3 | integration | corrupt `registry.json` → `GET /api/status` **200** with `creators.damaged={file:'registry.json',detail}` (status does NOT 409 — H6b, see 05 §2a note) **and** `GET /api/creators` → `409 {code:STORE_DAMAGED, file:'registry.json'}`; an empty array is NEVER returned in place of the refusal | file left as-is |
| T-B3 | R4 | integration+unit | `POST /api/creators {ref:'@x'}` → 201 DISABLED; `PATCH …{enabled:true}` → 200; re-read shows ON (via second client) | no enable without explicit call |
| T-B4 **[S4]** | R7 | unit | `startDailyRun` with perHour 0 / -1 / 2.5 / NaN / '20x' → `400 VALIDATION`, nothing spawned | no child process |
| T-B5 **[S4]** | R7 | integration | lock file present → `POST /api/run/daily` → `409 RUN_LOCKED` carrying holder; no second spawn; **rapid double-POST with no lock yet → exactly one child spawned (bridge single-flight mutex; engine lock is the backstop)** | single child max |
| T-B6 | R9 | integration | `POST /api/restore|/api/rollback|/api/authorize` → **404** (route does not exist) | — |
| T-B7 | R13 | integration | server listens on 127.0.0.1 only (assert address); imports of `server.mjs`/`api.mjs` contain no non-builtin npm requires (grep assertion) | no external bind |
| T-B8 | R-invariant 1 | integration | `GET /api/brains/:slug` payload + all bridge-served fixtures pass the shape-based leak guard (`test/leak-guard.mjs`; 8+-word verbatim grep retained as a second signal) | no transcript file ever opened by handlers (fs spy) |
| T-B9 | R5 | integration | query with hits → `QueryResult` incl. `watchUrl` built from videoId+tStartMs; skipped rows carried, not dropped | — |
| T-B10 **[S3]** | R8 | integration | backup → dated dest exists; repair → `{requeued}` matches engine return; canary reflects stubbed selfCheck | backups only under temp root |
| T-B11 | R13 | integration | second bridge instance on the same store → refuses with "already running (pid)" (pid-file single-instance guard, `O_CREAT\|O_EXCL`) — two bridges must never write the store concurrently | store untouched by the refused instance |
| T-B12 | R15 | integration (lands with S7) | after the S7 snapshot: verify the copied tree's per-file SHA-256s equal the recorded manifest (snapshot.test.mjs) and the git tag exists; mismatch = transfer blocked | no mutation of the standalone original |
| T-B13 | R13 | integration (added at S0, H4/H6) | `Host` header not loopback / wrong port → **403 FORBIDDEN_HOST** on reads AND writes (DNS-rebinding gate, driven with `rawRequest` since undici overrides `host`); the exact nine-route allowlist is pinned positively | no handler runs on a refused Host |
| T-B14 | R2 | integration (round 2, H1) | health cache: a FAILED probe must not evict the store-history fallback on later reads; the reading is stable across the whole TTL and never presents a fallback as a fresh live probe | no re-probe inside the window |
| T-B15 | R6 | unit (round 2, H2) | leak guard has **no false negatives**: transcript content under ANY key name (size gate) and renamed/ single cue objects are caught — while `throttle.text`, `backlog.lines` and LANE C claim rows still pass | no false positives |
| T-B16 | R13 | integration (round 3, H3) | a second `startBridge` in one process is REFUSED (the pid file cannot stop it — same pid may re-claim); a clean shutdown and a FAILED bind both still free the slot; two concurrent starts → exactly one wins | one bridge per store per process |
| T-B17 | R3 | integration (round 4, S1-H1) | the **two-shape damage rule** (05 §2a): corrupt `state.json` → `/api/status` stays **200** with `state.damaged` set and every other instrument still readable (a–b), while `/api/backlog` **409s** naming the file (c); corrupt `registry.json` → `/api/status` stays 200 naming the file (d) and `/api/backlog` is unaffected (e); **no damage mode leaks a stack trace or internal error name** (f) | damage is always a reportable field or a refusal, never a 500 |
| T-B18 | R13 | integration (round 4, S1-H8) | **the request handler must be TOTAL.** Every malformed request target (`//`, `///`, `//@`, `//:80`, `http://`, `https://`, …) answers **400 VALIDATION** and the bridge is still serving afterwards (a); the **Host gate still runs before the target is parsed**, so a hostile Host is 403 and never reaches the parser (b); `parseRequestUrl` is total for good targets and raises a **typed** `ApiError(VALIDATION)` — never a raw `TypeError` — for bad ones, with the echoed target clipped (c). Sent over a **raw socket**: both `fetch` and `node:http.request` normalize malformed targets away, so a test written with either would pass against the broken code | one bad line costs one connection, never the process |
| T-B19 | R4 | integration (round 5 pass 1, S1-H9) | **a non-2xx answer must mean nothing was written.** With `state.json` damaged, `PATCH /api/creators/:id` answers **200** and the registry row IS persisted, with `enabledAt` stamped (a); the row's counts are **`null`**, never `0` — a count that could not be taken is absent (b); repeated toggles each answer 200 and agree with the disk (c); a 409 that *does* happen is a **pre-write** refusal, so the registry file is byte-identical afterwards (d); with an intact store the counts are real numbers (e) | no post-commit throw: a refusal always means nothing changed |
| T-B20 | R4 | integration (round 5 pass 1, S1-H10) | the body contract is "a JSON **object**": a literal `null` body → **400 VALIDATION**, not a 500, on both write routes (a); `42`, `"str"`, `true`, `false`, `[1,2]`, `[]` → 400 the same way, while an **absent** body still yields `{}` and keeps its own specific refusal (b) | no TypeError from a dereference; no 500 for a client error |
| T-B21 | R13 | integration (round 5 pass 1, S1-H11) | **no silent fallthrough outside `/api` either**: `POST`/`PATCH`/`PUT`/`DELETE`/`OPTIONS` on `/`, `/registry.json`, `/nope` → **404 NOT_FOUND** rather than 200 + the status page, while `GET` and `HEAD` still serve it | a method-agnostic 200 must not be able to hide a mistyped write path |
| T-B22 | R6 | integration (round 5 pass 2, S1-H15/H16) | **the LANE C read path must serve a published brain.** With a real published generation seeded, `GET /api/brains/:slug` → 200 with `index`/`topics`/`timeline` **non-empty** and `skipped: []` (a); a document absent from the generation is **reported** in `skipped`, not silently empty (b); a pointer naming no generation reports all three rather than rendering three blanks (c). **Containment, both directions:** `:slug` arrives **un-decoded** and `?creator=` arrives **decoded**, so every hostile form of each (`%2e%2e%2f`, `..%2F`, `%5C`, `%00`, the LANE B channel id, a 500-char slug) must refuse and must never carry the LANE B canary or a registry byte (d, e); the query route searches LANE C only, so transcript-only words return zero hits (f). `T-B7`'s invariant sweep gained the same hostile forms and a **live** published namespace, because it previously probed only 404 branches | LANE B is never served, in any encoding |
| T-B23 | R13 | integration (round 5 pass 4, S1-H19) | **the body ceiling, and the framing paths nothing had measured.** A body **at** the ceiling (64 KB) is READ — the boundary is `>` and not `>=` (a); one byte over is refused with the documented envelope (b); a 4 MB body cannot take the bridge down — it is still serving `200` afterwards (c); a body that is **not valid UTF-8** is a 400, not a 500 (d); a **chunked** body with no `content-length` is read normally (e); a POST with **no body** is a 400, never a 500 (f). The client's outcome for a body large enough that it is still writing when the limit trips is **deliberately not pinned** — it tracks the socket buffer (clean 400 at 512 KB, `ECONNRESET` at 1 MB), so asserting either would flake across machines; what is pinned is that the bridge refuses, stays within its memory bound, and keeps serving | the ceiling is a memory bound, never a crash; no framing path reaches a 500 |

## Web (vitest + testing-library; `console/web/src/**/*.test.tsx`)

**S1 scope note.** T-W1/W2/W3 **landed with S1** and are its exit evidence (`14-decisions-20260918.md` §4). T-W1 drives *both* adapters through the shared `mapBridgeError` and exercises the live adapter against a fake `fetch` serving the bridge's own routes, so "identical error mapping" cannot drift as one adapter is edited. T-W1 deliberately does **not** assert a shared client-side guard on `query.q` — 05 §2 scopes "both client and server" to `perHour` only, so that case is split into a server-refusal parity test plus a MockAdapter-specific guard test. T-W4–T-W9 land with their own slices.

**Round-4 review tightened two of these (`16-s1-hostile-review.md` §7–8).** T-W2 now scans **every** production file — not `tokens.css` alone — for the banned palette (hex *and* `rgb()` forms), and **self-checks its own patterns** against synthetic offenders, so a regex that stops matching fails the suite instead of passing it. The rule-4 cap walk now collects `.ts`/`.tsx`/`.css` alongside `.mjs` and carries a guard asserting it reaches `web/src`; before that it measured the bridge only, so **no UI file could ever breach the cap**. T-W3 additionally pins the three refusal branches (`creators`, `census`, `documents`) and the `publishedBrains` non-refusal. `useStatus` gained its own suite (T-W10) for the S1-H4 watchdog.

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-W1 | R12 | contract | `MockAdapter` and `LocalEngineAdapter` both satisfy a shared type/behavior suite (same fixture in → same shape out; error mapping identical) |
| T-W2 | R12 | static | grep: no file under `web/src` imports `scripts/creator-brains` (adapter is the only seam) |
| T-W3 | R2/R3 | component | StatusBoard renders fixture instruments; damaged → refusal banner with file name (never zeros) |
| T-W4 | R4 | component | Roster: add form validation, enable toggle calls adapter, optimistic-free re-read renders truth |
| T-W5 | R5 | component | Query: zero-hit copy names the terms; skipped ⚠ list renders; hit row shows ▶watch link with `?t=` seconds |
| T-W6 | R7 | component | RunConsole: invalid ops/hour refused client-side; RUN_LOCKED renders holder; polling loop stops on unmount |
| T-W7 | R10/R16 | component | reduced-motion (JS gate) → constellation renders static frame + roster equivalent present; WebGL-mocked-unavailable → fallback list |
| T-W8 | R11 | component | every panel's empty/loading/error/success states snapshot-tested (no "No data" strings anywhere) |
| T-W9 | R16 | a11y | axe smoke per panel; tab order; focus returns to constellation node/roster row after drawer close |
| T-W10 | R2/R3 | unit (round 4, S1-H4) | `useStatus`: a request that never settles is abandoned by the watchdog (mapped to `TRANSPORT`, **not** a new code); the latch is released so the next poll recovers; a late answer from an already-timed-out request is **discarded** by the generation guard rather than overwriting a newer reading |
| T-W11 | R2/R3 | component + unit (round 5 pass 3, S1-H17/H18) | **a payload of the wrong shape must produce a NAMED failure, never a blank console.** Layer 1 (adapter seam): the live adapter refuses a wrong-shaped 200 with a typed `ConsoleApiError` (d); it **names the offending path** when a nested field is bent — `body.backlog.lines: expected an array` (e) — and when exactly one top-level key is missing (f). Layer 2 (boundary): a wrong-shaped payload renders `console-fault` instead of unmounting the root, and the shell header **survives** — `document.body.textContent` still matches `/Creator Brains Console/` (a); a payload missing one nested key is caught the same way (b); so is an array field that is not an array (c); the boundary contains a throw from **any** child, not only `StatusBoard` (g). **Controls:** a healthy payload still renders the board through the mock (h) and survives the live adapter's validator (i) — the guard is not a blanket refusal |

## Three scene (deterministic; `console/web/src/three/*.test.ts`)

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-T1 | R10 | unit | `layoutBrains(brains)` pure: same input → same positions/sizes/colors; size ∝ videos, arc ∝ coverage, color per state map |
| T-T2 | R10 | unit | rAF controller: `document.hidden` → loop stops ≤1 frame; off-viewport (IntersectionObserver stub) → stops; remount → clean teardown (no leaked context) |

## E2E / visual (Playwright, stubbed API)

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-E1 | R1 | e2e | bridge boots from temp root → page loads → status board rendered (real bridge, real fixtures) |
| T-E2 | R14 | visual | widths 320/375/414/768/1024/1280/1440/1920/2560/3840/3440: no horizontal overflow, no overlap, no clipped critical text, 44px targets (matrix config like coach-mobile) |
| T-E3 | R10 | perf | **C1 contract (14 §3):** three chunk is fetched on **idle after the first successful status poll**, NOT on viewport enter (under CD3 the constellation is on screen at first paint, so viewport-enter is effectively eager); first paint ships the initial bundle with a static placeholder; **reduced-motion OR WebGL-absent → the chunk is never fetched at all**; DPR clamp ≤2; `performance.now()` frame samples ≤ 16.7ms median with 40 nodes |

## Commands (slice exit evidence runs these)

```powershell
# bridge
node --test scripts/creator-brains/console/test/
# web
cd scripts/creator-brains/console/web && npx vitest run && npx tsc --noEmit && npm run build
# e2e (stubbed api; never the real backend)
npx playwright test --config playwright.console.config.ts
```

**Explicitly NOT tested in v1 (honest gaps):** real YouTube network behavior (engine's live tests own that); multi-operator/auth; SwanGuard-side embedding (S7 handoff spec only); OCR/visual regression of the three scene beyond layout determinism.

=== END DOCUMENT: 06-test-plan.md ===


=== BEGIN DOCUMENT: 07-traceability.md — TRACEABILITY ===

# 07 — Traceability — Creator Brains Console

Legend: status = PLANNED (no code exists yet — honest state of this planning packet). Every requirement lands in exactly one primary slice; tests gate slice exit.

| Req | Acceptance criterion (see 01) | Artifact / component | Tests | Slice | Status |
|---|---|---|---|---|---|
| R1 standalone launch | .cmd → bridge → browser ≤15 s | `Creator Brains Console.cmd`, `server.mjs` | T-E1 | S0 (bridge) + S1 (shell) | PLANNED |
| R2 status board | instruments 1:1 with status-command sources | StatusBoard + `GET /api/status` | T-B1, T-W3, T-W10, T-W11 | S0/S1 | PLANNED |
| R3 damage honesty | refusal banner names file; never zeros | error envelope + RefusalBanner | T-B2, T-B17, T-W3, T-W10, T-W11 | S0/S1 | PLANNED |
| R4 roster mgmt | add→DISABLED; enable/disable persists | CreatorRoster + POST/PATCH | T-B3, T-B19, T-B20, T-W4 | S2 | PLANNED |
| R5 ask the brains | cited hits; honest zero-hit + skipped | QueryConsole | T-B9, T-W5 | S3 | PLANNED |
| R6 brain detail | published-generation only | BrainDrawer + `GET /api/brains/:slug` | T-B8 (boundary), T-B22, T-W5 pattern | S2 | PLANNED |
| R7 daily pass console | validated ops/hour; lock truth; honest verdict | RunConsole + POST /api/run/daily + poll | T-B4, T-B5, T-W6 | S4 | PLANNED |
| R8 canary/repair/backup | T2 ops in-console with results | OpsRail | T-B10 | S3 | PLANNED |
| R9 dangerous ops excluded | no route exists (404) | api.mjs route table | T-B6 | S0 (by absence, re-asserted each slice) | PLANNED |
| R10 constellation | data-driven; reduced-motion static; fallback | BrainConstellation | T-T1, T-T2, T-W7, T-E3 | S5 | PLANNED |
| R11 design law | tokens/44px/contrast/states/glow/tier badges | all components | T-W8, T-W9, design dual-pass | S6 | PLANNED |
| R12 adapter modularity | interface-only coupling; Mock≈Local | adapters/ | T-W1, T-W2 | S1 (interface), asserted every slice | PLANNED |
| R13 zero-dep bridge | builtins+engine only; loopback-only | server.mjs | T-B7, T-B13, T-B18, T-B21, T-B23, T-B24 | S0 | PLANNED |
| R14 responsive matrix | 11 widths clean | CSS/layout | T-E2 | S6 | PLANNED |
| R15 best-state snapshot | tag+copy+hashes before transfer | S7 procedure | snapshot hash check | S7 | PLANNED |
| R16 keyboard/a11y | full keyboard path; roster = constellation equal | all components | T-W9, T-W7 | S5/S6 | PLANNED |

**Coverage flags (honest):**
- R10's "60 fps on mid GPU" is budget-verified only on Sean's hardware in S5 exit — CI can assert frame-time in software GL but not his GPU; marked accordingly at exit.
- The SwanGuard embed (S7) is a handoff spec, not covered by SS-PT tests — the receiving repo owns its verification.
- Mock-only boundaries: none for engine reads/writes (bridge tests run the real lib functions against a real temp store); the ONLY mock-required seam is browser WebGL in T-W7.
- **R4 has NO test that can catch S1-H12 (event-loop starvation on `POST`).** The engine resolves a creator reference through `execFileSync` (`lib/ytdlp.mjs:184`), so one add freezes the bridge's only thread — measured 1577 ms for a failing lookup, ceiling 180 s — and no assertion in this plan observes latency. It cannot be tested here without either an injectable resolver (an **engine** change: `addCreator` must `await resolve(...)`, which `deps.resolveCreator` cannot supply from the console side) or a stubbed subprocess. **S2 must resolve S1-H12 before it ships the add UI** (`16 §14`).
- **T-W11's coverage of the `main.tsx` mount point is partial, and deliberately so.** The test file renders `<App/>` directly (as every test in this slice does), so the boundary mounted in `main.tsx` around `<App/>` is not itself exercised by a render. The **mechanism** is: T-W11g mounts the boundary around a child that throws on sight and requires the fault panel and the thrown message. So the second mount is defence in depth resting on a proven mechanism, not an unverified guard — recorded so the next seat can tell the two apart.
- **Only `/api/status` is shape-validated at the adapter seam** (`adapters/validate.ts`, S1-H18). The other eight routes keep an unchecked `as T` cast, annotated in place, because no S1 component dereferences their payloads. **Each slice that adds a consumer must add its route's guard**; a route whose payload nothing reads is a contract nobody has tested yet.
- **S1-H19 is an ACCEPTED limitation, not a fixed one** (`16 §17`). An oversized body is refused and the bridge is unharmed, but for bodies larger than the socket buffer the client sees `ECONNRESET` instead of the documented envelope — the response is written and then lost to a RST while the client is still sending. T-B23 therefore pins the **safety** property (refuses, stays in its memory bound, keeps serving) and deliberately does **not** pin the client's status, which is buffer-dependent and would flake across machines. Closing it would require draining an arbitrary volume from a hostile client; that trade was measured and declined.
- **The static-file path is defended by THREE mutually redundant layers, so no single-layer mutation is observable** (`16 §18`, S1-H20). `new URL` normalisation in `parseRequestUrl`, `normalize()` in `resolveStatic`, and that function's containment check each cover for the others: removing any one leaves the suite fully green, and only removing all three makes anything fail. **This is a property of the design, not a gap** — but it means a reviewer cannot infer coverage from a single mutation. The resolver-level property is pinned by **HY4-H3** against a real document root (it *does* fail when both resolver guards go); **T-B24** pins the live-server half and is falsifiable only under the three-point mutation. Stated so the next seat does not mistake redundancy for an untested guard — or, as this pass briefly did, mistake it for a coverage hole.
- **`T-B12` was an ID collision** (`16 §18`, S1-H21): the plan and the gate reserve it for S7's snapshot verification (R15), while the code used it for the traversal test. The traversal test is now **T-B24**, traced to R13. Check for other collisions before S2 adds rows.

=== END DOCUMENT: 07-traceability.md ===


=== BEGIN DOCUMENT: 08-slices-operations.md — SLICES AND OPERATIONS ===

# 08 — Implementation slices & operations — Creator Brains Console

Each slice: independently shippable, RED→GREEN tests before merge-worthy state, entry/exit evidence recorded in the packet (09/README). Review route per slice (Mega Blueprints v3.1): glm-5.3 → glm-5.3-flash → gpt-6-astra (Astra seat currently blocked until 2026-09-19 ~22:12 — slices before S5 can proceed on GLM reviews with the gap recorded; Astra adjudication batched when the seat resets, Sean permitting).

| Slice | Deliverable | Entry criteria | Exit evidence | Depends on |
|---|---|---|---|---|
| **S0** | Bridge: `server.mjs` + `api.mjs` — **nine-route allowlist** (reads: `status`/`creators`/`run`/`canary`/`backlog`/`query`/`brains/:slug`; writes: `POST /api/creators`, `PATCH /api/creators/:id`) + loopback-only + `hostAllowed` DNS-rebinding gate + error envelope + T-B1/B2/B3/B6/B7/B8/B9 + structure suite | This packet plan-ready; engine suite green baseline recorded | `node --test` bridge suite green (RED observed first); curl-able JSON on fixture store; engine suite unchanged (additive only) | — |
| **S1** | Console web scaffold: Vite app, tokens.css (design.md §4 as `var(--token,#fallback)`), shell + StatusBoard + adapters (`ConsoleDataAdapter`, Local, Mock) | S0 exit | T-W1/W2/W3 green; `tsc --noEmit` 0; build ok; R2/R3 visible on real fixture store | S0 |
| **S2** | Roster + writes (add/enable/disable via engine functions) + BrainDrawer | S1 exit | T-B3, T-W4 green; drawer reads only published generation; damage paths banner | S1 |
| **S3** | QueryConsole + canary/repair/backup (OpsRail) — **adds `POST /api/repair` + `POST /api/backup` (deferred from S0; 05 §2b)** | S2 exit | T-B9/**B10**, T-W5 green; zero-hit + skipped honesty visible | S1 |
| **S4** | RunConsole: validated ops/hour, spawn, 2 s polling, RUN_LOCKED, verdict honesty — **adds `POST /api/run/daily` (deferred from S0; 05 §2b)** | S3 exit | T-**B4/B5**, T-W6 green; run against temp store completes with real journal verdict | S1 |
| **S5** | BrainConstellation (per picked concept direction): layout fn, interaction, reduced-motion dual gate, WebGL fallback, lazy chunk | S2+ (roster = accessible equal) | T-T1/T-T2/T-W7 green; T-E3 budget measured; Sean has seen it (ideation follow-through) | S2 |
| **S6** | Design dual-pass + responsive matrix (T-E2) + a11y (T-W9) + performance budgets + hostile review round on the whole console | S1–S5 exit | qa-gates.md receipt; 11-width matrix evidence; rule 23 critique fixes applied and listed | S1–S5 |
| **S7** | **GATED on Sean's explicit go:** best-state snapshot (git tag + copied tree + hashes) → duplicate into SwanGuard-Newsroom with SwanGuardAdapter handoff spec | S6 exit + Sean's go | snapshot hashes recorded; SwanGuard-side build receipt lives in THAT repo | S6, Sean |

**No-go boundaries:** no slice may modify engine files (README pointer edit excepted); no slice may add a transcript-reading path; no slice may expose restore/rollback/authorize; no commit without the slice's exit evidence; no push to main (Render untouched).

## Operations

- **Launcher:** `Creator Brains Console.cmd` (Desktop): runs `server.mjs`, which **binds first, then opens the default browser itself** (no stdout-parsing race), prints `http://127.0.0.1:<port>` for the record; close the console window = stop bridge; store is on disk — crash-safe by design. **Single-instance guard:** a pid file under the store root; a second bridge refuses with "already running (pid)" (T-B11) so two consoles can never write the store concurrently.
- **S7 embed note:** the web app declares `react`, `react-dom`, `styled-components` as **peer externals** in library mode so SwanGuard never gets a second React copy.
- **Logs:** bridge writes a rolling `console.log` under `.ai-workflow/creator-brains/console/` (gitignored): requests, spawn/exit of daily child, refusals with reasons. Metrics = the store's own run journal (no parallel truth).
- **Upgrade/rollback:** console is additive — `git` revert of the console slice range + delete Desktop `.cmd` = full rollback; engine CLI remains the always-working fallback at every point in time.
- **Perf budgets watched in ops:** initial bundle ≤500 KB gz, three chunk ≤900 KB gz, API p95 ≤50 ms, bridge boot ≤1.5 s (re-checked at S6 and any dependency bump).

## Unresolved decisions that gate building (not implementation details)

1. **D-CD (Sean):** pick CD1 / CD2 / CD3 (ideation gate). S5's shape depends on it; S0–S4 are direction-independent and may start after his go.
2. **D-Astra:** Astra architecture adjudication (one call, seat blocked until 2026-09-19 ~22:12). Recommended: batch it after the seat resets, before S5 (the three.js slice) — S0–S4 carry no design risk the adjudication would overturn.
3. **D-spend:** none — Astra rides the Codex subscription; no metered APIs in this plan.

=== END DOCUMENT: 08-slices-operations.md ===


=== BEGIN DOCUMENT: 09-hostile-review.md — BUILDER HOSTILE PASS H1-H10 ===

# 09 — Hostile review, decisions & Astra record — Creator Brains Console

- **Date:** 2026-09-17 · **Reviewer of record for this packet:** ZCode/GLM seat (self-hostile pass, rule 17/61) · **Astra adjudication:** BLOCKED — see §3

## 1. Self-hostile pass (findings → disposition)

| # | Attack | Verdict | Disposition |
|---|---|---|---|
| H1 | Rapid double-click on RUN spawns two daily children before the engine lock exists | REAL | Bridge single-flight mutex around spawn; engine lock stays the backstop. Test added: T-B5 extended. |
| H2 | Two bridge instances → concurrent `setEnabled` writes clobber `registry.json` | REAL | Single-instance pid guard; second instance refuses naming the live pid. Test added: T-B11. |
| H3 | `.cmd` parsing stdout for the port is a launcher race | REAL | Bridge opens the browser itself after `listen`; `.cmd` just runs node + pause. 08 patched. |
| H4 | Library-mode embed duplicates React into SwanGuard | REAL (later) | S7 note: react/react-dom/styled-components as peer externals. 08 patched. |
| H5 | Console becomes a transcript-leak surface via a "helpful" future endpoint | REAL RISK CLASS | Hard invariant: no route may read tier-B docs; import discipline + 8+-word verbatim grep over everything served (T-B8); any future endpoint re-runs that gate. |
| H6 | "Backlog: lines[]" smuggles display strings into a contract (drift risk) | ACCEPTED, deliberate | Engine-formatted truth is the point (no client-side re-derivation); if engine wording changes, T-B1 shape test catches field presence, wording is display-only. |
| H7 | Status polling every 2 s while a run is active wastes nothing today but could hammer file reads on a huge store | ACCEPTED with bound | Poll interval backs off to 5 s after 10 min of run time; all reads are small JSON files; measured p95 gate at S6. |
| H8 | The constellation becomes decoration drift (particles not tied to data) | DOCTRINE RISK | Contract: every node/arc/color maps to a store field (T-T1 pins the mapping); motion budget: one signature moment, everything else calm (motion.md §4/§5). |
| H9 | Plan silently assumes Sean's browser has WebGL2 | flagged | Fallback (static list/orb) is a tested requirement (T-W7), not a nice-to-have. |
| H10 | Bridge could drift from CLI/menu behavior over time | mitigated by construction | Bridge composes the SAME lib functions; no re-implemented logic; engine tests own semantics. |

Residual risks (honest): three-scene performance on Sean's GPU is verified only at S5 exit on his machine; SwanGuard-side embedding risks (their bundle budget, their React version) belong to the receiving repo's review; the Astra adjudication may still overturn D1–D9 — every slice before S5 is direction-independent by design so an overturn costs only S5 reshaping.

## 2. Decision log

| Decision | Ruling | Authority |
|---|---|---|
| Planning workflow | Mega Blueprints activated; this packet is the canonical plan set (new surface — no prior console plan existed; engine blueprint remains canonical for the engine) | Sean's standing instruction 2026-09-06 |
| Ideation gate | 3 directions (CD1/CD2/CD3) produced per router; **Sean picks** before S5 styling; S0–S4 may proceed on his go | swan-design-router (rule 40) |
| v1 dangerous-op exclusion | restore/rollback/authorize CLI-only, tier-badged | bridge T0–T4 doctrine (design.md §15) |
| Token mode | Crystalline Swan (Cyberforest reserved for Hermes surfaces) | design.md §3 |
| Console adds npm deps only inside `console/web/`; engine stays zero-dep | adopted | engine invariant |

## 3. Astra consult record (exactly-one, no auto-retry)

- **Authorized:** Sean, 2026-09-17 — "call astra one time for the mega blueprint skill full documentation."
- **Attempt 1 (the only attempt):** `consult-codex.mjs` packet `swan-review-20260917075008558-70de359602a0` (64,705 chars, 6 files, egress redaction ran) → **FAILED: `codex_exec_failed`** — zero model output.
- **Root cause [VERIFIED by probe]:** harness/CLI drift — `buildCodexExecArgs` passed `--ask-for-approval never`; **codex-cli 0.154.0 removed that flag** and exits non-zero at parse, before any provider call. No tokens were consumed by the failed attempt.
- **Repair (uncommitted, this session):** `scripts/mcp/swan-council-subscription.mjs` — flag removed with constraint comment; `scripts/mcp/swan-council-subscription.test.mjs` — new pinning test (`buildCodexExecArgs omits flags removed by codex-cli 0.154.0`) + flip of the old positive assertion. **RED observed** (old code fails the new pin), then **GREEN: 10/10** (`node --test scripts/mcp/swan-council-subscription.test.mjs`). Fixed vector probe reached the provider.
- **Second blocker [VERIFIED by the same probe]:** **Astra seat usage limit — "try again at Sep 19th, 2026 10:12 PM."** Matches the R2 packet note ("Astra seat blocked until 2026-09-19"). The tiny diagnostic probe returned `turn.failed` with the usage-limit error.
- **Disposition:** per the exactly-one constraint and standing no-auto-retry discipline, NOT re-fired. Per the rule-46 unavailability fallback, this packet proceeds with the GLM seat's own hostile pass (§1) and the gap recorded here. **Astra re-fire is ready-to-go** (same packet, repaired harness) the moment the seat resets — recommended before slice S5, needs only Sean's "go".

## 4. Readiness verdict

**PLAN READY** — planning package complete (01–08 + this record + readiness.json), tests specified but NOT RUN against implementation (none exists — honest state). NOT implementation-verified; nothing deployed. Next authorized slice: **S0** (bridge) on Sean's go, plus his concept-direction pick before S5.

=== END DOCUMENT: 09-hostile-review.md ===


=== BEGIN DOCUMENT: 10-astra-cost-and-value.md — ASTRA COST AND VALUE ===

# 10 — Astra consult: what it costs, and what it is worth

- **Date:** 2026-09-17 · **Question answered:** *"give me an idea how many credits an astra review would take on this"*
- **Status:** the cost model is [VERIFIED] against this repo's own routing doc and harness code; the token volumes are [ESTIMATE] with the arithmetic shown so you can check it.

---

## 1. The short answer

**Astra costs you $0 in credits.** It does not draw on a credit balance at all —
it rides the **Codex $200/month 20x subscription**, and the only thing it
consumes is **plan usage**, which is metered as a rate limit and a rolling
window, not as a dollar or credit figure.

So the honest answer to "how many credits" is: **none — but it is currently
blocked by the plan's usage limit, and the limit resets 2026-09-19 22:12.**

What you actually spend on this call is **≈ 75k tokens of plan usage** in one
shot (see §3), against a 20x seat. That is the number that matters, because it
is the number that determines whether the call succeeds or bounces.

| Fact | Value | Evidence |
|---|---|---|
| Billing model | Codex **$200/mo, 20x usage** — flat rate | `PROVIDER-SUBSCRIPTION-ROUTING.md` §"The stack", Astra row [VERIFIED, Sean-stated tier math: $100 tier = 5x] |
| Metered per-token cost | **$0** — no metered fallback in the harness | `consult-codex.mjs` header: *"Local, read-only harness around the authenticated Codex CLI. This file has no .env loader, network client, or metered fallback."* [VERIFIED] |
| Current blocker | **Seat usage-limited until 2026-09-19 22:12** | Direct provider response, recorded in 09 §3 [VERIFIED 2026-09-17] |
| Spend-guard gate | **Does not fire on Codex** — the gate intercepts only `consult-fable\|sol\|kimi\|grok\|muse\|panel` | `scripts/hooks/spend-guard-gate.mjs:73` INVOCATION regex [VERIFIED] |
| Cost of the failed attempt | **$0 and ~0 plan usage** — died at flag-parse, before any provider call | 09 §3 [VERIFIED] |

---

## 2. Why "credits" is the wrong unit here, but the concern is right

Three separate things get casually called "credits" in this repo, and conflating
them is how the ~$100 OpenAI API overrun happened (per the routing doc's
non-negotiable #1):

1. **Codex plan usage** — what Astra burns. Flat-rate; shows up as a rate limit
   ("try again Sep 19th"), never as a bill. **This is the one that applies.**
2. **GLM coding-plan credit** — Z.ai's meter (2,000/5h, 10,000/wk for scripted
   seats). Applies to the GLM review lane, not Astra.
3. **OpenRouter dollars** — per-token money. Applies to HY4, Kimi, Fable, Sol.
   **Does not apply to Astra.**

The failed attempt cost nothing because it never reached a model. The **re-fire
will** consume real plan usage, and that is the thing to size correctly.

---

## 3. The size of one Astra review on THIS packet — the arithmetic

The single authorized call sends a 6-file packet. Measured inputs:

| Component | Chars | Est. tokens (÷4) |
|---|---|---|
| `00-consult-brief.md` | 10,984 | 2,746 |
| `README.md` | 3,385 | 846 |
| `01-requirements.md` | 7,825 | 1,956 |
| `02-blueprint.md` | 9,951 | 2,488 |
| `05-contracts.md` | 6,931 | 1,733 |
| `09-hostile-review.md` | 5,686 | 1,422 |
| **Files subtotal** | **44,762** | **11,191** |
| Prompt + protocol wrapper | — | ~500 |
| **Total input** | | **≈ 11,700 tokens** |

[ESTIMATE — the packets are read from disk; the ÷4 ratio is the repo's own
working heuristic, and `consult-codex.mjs` caps a single file at 60,000 chars and
the whole diff at 200,000, so this packet is comfortably inside the harness's
own limits. VERIFIED: no file in the set is truncated.]

Output side. The v3.1 footer caps a consult at **≤8,000 output tokens** and
**≤600 s**, one in flight (`PROVIDER-SUBSCRIPTION-ROUTING.md` §Recovery rules
[VERIFIED]). A Mega-Blueprints adjudication is a long document, so assume it uses
most of that ceiling rather than a chat-length reply:

| Output assumption | Tokens |
|---|---|
| Typical adjudication | ~4,000 |
| At the v3.1 cap | 8,000 |

**One Astra review on this packet ≈ 11,700 in + ~4,000–8,000 out ≈ 16k–20k
tokens of plan usage.** Round it up and call it **~20k per pass.**

### What that means against the seat

The 20x seat's limit is a rolling window, not a per-day byte meter — which is why
the failure mode you actually hit was a *time* refusal ("try again Sep 19th"),
not a truncation. The practical read:

- **One review is cheap in plan terms.** ~20k tokens is a normal-sized Codex turn;
  this is not a heavy ask for a 20x seat.
- **The pending call is ONE call, not a panel.** The existing packet is built as a
  single adjudication pass. It cannot run away into four calls unless someone
  deliberately fires four — which is exactly the per-call-vs-cumulative lesson
  the spend guard was written for, and why the "exactly one, no auto-retry"
  discipline is recorded in 09 §3.
- **If it were metered (it is not),** the same call at Sol Pro's $2.50/M in /
  $15/M out would be ≈ $0.03 in + $0.06–0.12 out ≈ **$0.09–0.15**. That is the
  number to keep in your head as the "what it would have cost on an API" figure.
  It is not what you pay.

---

## 4. What you get for it — and whether it is worth firing

The one authorized call is an **architecture adjudication**, not a review of the
code. Its remit is to accept, reject, or rewrite the seed decisions **D1–D9** in
02 §5 — `raw three.js` vs `@react-three/fiber`, zero-dep `node:http` bridge vs
Vite middleware, polling vs SSE for run progress, the v1 command scope, token
mode, the standalone shell, the in-repo home, the embed contract, and the
constellation's idle-motion budget.

**My honest recommendation: fire it, but fire it at the right moment.**

- The three.js slice (**S5**, now CD3-shaped) is the one place where an Astra
  overturn would cost real rework — it is the only slice whose design the
  adjudication could plausibly change.
- Everything before S5 (S0–S4) is direction-independent by construction. S0 is
  already built and green. So an adjudication landing *after* S0–S4 and *before*
  S5 gets you the maximum decision value for the minimum rework risk.
- The seat resets **2026-09-19 22:12**. Firing before then is guaranteed to
  bounce and burn the one authorized attempt on a rate-limit error. **Do not
  fire early.**

### The window, stated plainly

| When | What happens |
|---|---|
| Now → 2026-09-19 22:12 | Seat refuses. Firing wastes the authorized attempt on a limit error. |
| After 2026-09-19 22:12 | Fire the single call — harness is already repaired and pinned (10/10 in `swan-council-subscription.test.mjs`). |
| Any time | S0–S4 are not blocked by this. Only S5 waits on it. |

---

## 5. The gap this leaves right now, and how it is covered

Because the Astra seat is both **flag-blocked** (now repaired) and
**usage-limited** (until Sep 19), this packet's seed decisions currently carry
**no independent adjudication**. The rule-46 unavailability fallback applies, and
the honest state is recorded rather than papered over:

- 09 §1 carries the builder's own hostile pass (H1–H10).
- The **HY4 independent review** now stands in as the external lens on S0
  (verdict recorded in `11-hy4-review.md`). HY4 is a *different* model family
  from the builder, which is the property that makes its findings worth
  something — per this repo's own recorded lesson, a builder's tests encode the
  builder's assumptions. It returned **REVISE** with 7 findings, all now closed;
  it also cost **$0.056**, which is the real price of an independent lens on this
  packet today.
- **D1–D9 remain recommendations, not adjudications.** Any slice that touches a
  D-decision before Astra lands is doing so on the builder's judgment, and should
  say so in its receipt.

---

## 6. If you ever DO want a metered second opinion on the architecture

For completeness, since the question "how many credits" usually means "what does
this cost me somewhere":

| Seat | Billing | Cost on this 6-file packet (~11.7k in, ~6k out) |
|---|---|---|
| **Astra (gpt-6-astra)** | Codex 20x subscription | **$0 metered**; ~20k plan tokens |
| HY4 (`tencent/hy4-preview`) | OpenRouter | **≈ $0.056 measured on this packet** (11 §1: one $0 transport failure + one $0.0563 billed call) |
| DeepSeek V4.1 Flash | Metred API, $5/mo cap | ≈ $0.002–0.004 |
| Kimi K3 | OpenRouter | ≈ $0.13 |
| Sol Pro | OpenRouter | ≈ $0.12 |
| Fable 5 | OpenRouter | ≈ $0.42 |

[HY4 and Fable figures grounded in this repo's `.ai-workflow/spend/ledger.jsonl`;
others are the panel registry's own `inPerM`/`outPerM` rates applied to the same
token volume.]

**The useful ordering:** Astra is free-at-the-margin and the architecture
authority, so it goes first once unblocked. HY4 is the cheap independent lens for
catching what a builder's tests structurally cannot. Nobody needs Fable on this
until there is a genuine disagreement to arbitrate — Fable's value is
*arbitration*, not one more opinion.

=== END DOCUMENT: 10-astra-cost-and-value.md ===


=== BEGIN DOCUMENT: 11-hy4-review.md — HY4 INDEPENDENT REVIEW ROUND 1 ===

# 11 — HY4 hostile review & remediation — Creator Brains Console (S0 bridge)

- **Date:** 2026-09-17 (review), 2026-09-18 (remediation verified) · **Seat:** HY4 (`tencent/hy4-preview` via the council transport) · **Scope:** S0 bridge — `scripts/creator-brains/console/**`
- **Verdict from HY4: REVISE** — 7 findings, no blocker, all shippable-with-fixes.
- **Final state: all 7 closed + 1 additional defect found during remediation. Console suite 65/65 green; engine untouched.**

## 1. Spend (provider-actual, honest)

| Call | Outcome | Cost |
|---|---|---|
| HY4 attempt 1 | transport failure, no model output | **$0.0000** (recorded `usd: 0`) |
| HY4 attempt 2 | review delivered | **$0.056305735** |
| **Total billed** | | **$0.0563** |

The earlier note of "$0.1131 total" in the working log double-counted: the first attempt produced no billable output. The ledger (`.ai-workflow/spend/ledger.jsonl`, topic `hy4-review-packet`) is the authority — one $0 row and one $0.0563 row. Recorded via `recordSpend()`.

## 2. Findings and dispositions

| # | Finding | Class | Disposition | Regression test |
|---|---|---|---|---|
| H1 | pid-file claim is a read-then-write race — two bridges can both "claim" the slot | REAL | `claimInstance` now creates the pid file with `openSync(path, 'wx')` (`O_CREAT\|O_EXCL`); the create IS the lock. A loser gets `EEXIST` and refuses naming the holder. | `bridge.hy4.process.test.mjs` (6 tests) |
| H2 | If `listen` fails after the slot is claimed, the pid file leaks and blocks every future start | REAL | `startBridge` releases the instance in the bind's `catch` before rethrowing. | `bridge.hy4.process.test.mjs` |
| H3 | The traversal test was vacuous — it asserted a 404 for a path that never reached the resolver | REAL | Replaced with a test that drives a real encoded-traversal path through `resolveStatic` and asserts containment outside `WEB_DIST`. | `bridge.hy4.test.mjs` |
| H4 | **DNS rebinding** — a remote page can make Sean's browser a client of a no-auth loopback write API | REAL | `hostAllowed(host, boundPort)` runs before ANY handler (reads included) and 403s a non-loopback or wrong-port `Host`. Port is resolved per-request from the live server so the exact bound port is enforced on the normal `port: 0` path. | `bridge.hy4.test.mjs` |
| H5 | Fixture-grep leak test was keyword-based and both over- and under-fired | REAL | Rewrote as `test/leak-guard.mjs`: shape-based detection (transcript container names + cue-shape recognition `{tStartMs,text}` + prose-length heuristics). A META test proves it catches a renamed leak (`items: [{tStartMs,text}]`) while sparing contract-pinned prose (`throttle.text`, `backlog.lines`, LANE C claim rows). | `bridge.hy4.test.mjs` + `leak-guard.mjs` META |
| H6 | Plan declared routes the code does not implement (`POST /api/run/daily`, `/api/repair`, `/api/backup`) | REAL (doc drift) | **Document half** — 05 §2 and 08 S0 amended to the implemented nine-route allowlist with the writes deferred to S3/S4 (this change). **Code half** — the positive allowlist test pins the exact route set, so an unplanned route fails CI rather than passing unnoticed. | `bridge.hy4.structure.test.mjs` |
| H7 | Line counts cited in the packet did not match the files | REAL | Adopted the repo's canonical `lineCount` from `consistency-check.mjs` (subtract the trailing newline). All 18 console `.mjs` files are under the 300-line cap. | `bridge.hy4.structure.test.mjs` |

## 3. Additional defect found during remediation (not in HY4's report)

| # | Defect | Evidence | Fix |
|---|---|---|---|
| H8 | **Per-request blocking probe.** `statusInstrument` and `canaryState` each called `selfCheck()` — which shells out to `yt-dlp --version` — on every request. Measured **3439 ms cold / 1809 ms / 1742 ms warm**. With S4's 2-second polling this would saturate the bridge's single thread and spawn roughly 900 processes per daily pass. | `probe-h2b.mjs`: `canary fetch -> 200` in `3784ms` | New `lib/health.mjs`: a 60 s TTL cache over the probe, with **provenance** (`checkedAt`/`ageMs`/`source`/`stale`/`note`) so a cached reading never masquerades as an instant one. When the live probe fails, the reading falls back to the last `canary.json` history entry and says so. Also fixed `canaryState()` being called with no store root, which made the history fallback dead code. | `health.test.mjs` (cache mechanics) + `health.history.test.mjs` (fallback + route wiring) |

## 4. Two self-inflicted test defects (the lesson: run the test)

Both of these were caught only by **executing** the tests — neither was visible by reading the diff.

| Defect | Why it happened | Fix |
|---|---|---|
| The H4 attack test failed `200 !== 403` — the bridge *looked* vulnerable | **undici silently overrides a `host` header.** `fetch(url, {headers:{host:'evil.com'}})` reached the server with `Host: 127.0.0.1:<port>`, so the test could not construct its own attack. | Added `rawRequest()` to `test/fixtures.mjs` built on `node:http.request`, which puts the hostile value on the wire. Verified: raw result `{"sawHost":"evil.com"}`. (undici treats `host` as a forbidden header name; `node:http` does not.) |
| H7 reported the test file itself at 329 lines | The test used `text.split('\n').length`, which counts the phantom trailing element after a final newline. | Copied the repo's canonical `lineCount` verbatim, with a comment recording that the first version "invented a defect that did not exist". |

Three further health-test failures were all **wrong assertions, not wrong code** — e.g. asserting a 60 000 ms boundary is "inside" a `< ttlMs` window (it is not), and expecting 5 probes over 300 s when the correct count is 6. Each was corrected against observed semantics.

## 5. Verification receipt

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 65 / pass 65 / fail 0   duration_ms 8802
```

- All 18 console `.mjs` files under the 300-line cap (largest canonical: `health.history.test.mjs` 282). **Corrected 2026-09-18:** the true canonical count is **283**, and the file count is now 21 after round 2 and round 3 added three test files. The 282 figure came from an `awk`-based count that double-subtracted the trailing record; the repo's canonical `lineCount` is authoritative and the `bridge.hy4.structure.test.mjs` cap test now measures every file.
- **Engine boundary intact:** `git status --porcelain scripts/creator-brains/` → only `?? scripts/creator-brains/console/`. Zero engine files modified; the console is purely additive.
- Engine baseline: 182/189 pass with **1 pre-existing load-sensitive flake** (`HR14f` concurrency) — verified NOT caused by this work: it passes 6/6 in isolation across 3 runs, and no engine file was touched.

## 6. Note on test-isolation artifacts

The 18-second durations seen earlier were an artifact of the `enumerate-tests.mjs` harness double-importing the test file, not real cost — plain `node --test` runs the same suite in **4.3 s**. Also recorded: in Git Bash, `node --test <dir>/` fails `MODULE_NOT_FOUND` because the trailing slash is stripped; use the glob form `"scripts/.../test/*.test.mjs"` with `MSYS_NO_PATHCONV=1`.

=== END DOCUMENT: 11-hy4-review.md ===


=== BEGIN DOCUMENT: 12-hy4-review-round2.md — HY4 INDEPENDENT REVIEW ROUND 2 ===

# 12 — Hostile review round 2 — Creator Brains Console

- **Date:** 2026-09-18 · **Scope:** the four surfaces round 1 structurally could not see — the packet's internal consistency web, the unreviewed S3–S7 plan, the locked CD3 concept, and round 1's own remediation.
- **Verdict: REVISE** — 2 code defects (both real, both in my own round-1 remediation), 3 receipt defects, 1 concept finding. All fixed and pinned.
- **Attribution (correcting an earlier error):** this pass was performed by the **builder seat**, not by HY4. Three paid HY4 attempts were made and **all three billed with zero output** — see §5. The round-1 document (`11-hy4-review.md`) is likewise misattributed: the transport it used hard-blocked everything except `tencent/hy3`, so its findings were almost certainly produced by **Hy3 under HY4's name**. The findings themselves stand; the attribution does not.

---

## 1. H1 — a failed probe evicts the history fallback (CODE, P1, REAL)

**Where:** `scripts/creator-brains/console/lib/health.mjs`

The cache wrote the raw probe result *before* consulting history:

```js
const fresh = probe();
cache = { atMs: now, value: fresh };        // <-- failure now cached for the whole TTL
if (!fresh.ok && r) { const history = lastCanary(r); ... }
```

So the history fallback fired on **exactly one read** — the one that happened to take the probe. Every later read inside the window hit the `cached` short-circuit and served the **failure**, labelled as a fresh live probe.

Observed, before the fix (`probe-failcache.mjs`):

| Read | `ok` | `source` | `stale` | `note` |
|---|---|---|---|---|
| 1 (probe taken, fails) | `true` | `history` | `true` | "showing the last recorded canary result instead" |
| 2 (+10 s, no probe) | **`false`** | **`probe`** | **`false`** | **`null`** |

Read 2 is the worst possible output: a **false alarm presented as a fresh authoritative verdict**, with no note saying the probe failed. The console's health badge would flip to red on its own, ten seconds after correctly showing green. That is precisely the "crying wolf" the fallback was written to prevent — and it fires on the *second* read, which is the one nobody tests.

**Fix:** cache the **resolved** answer, not the raw probe. `probeAtMs` (when we may probe again) is now separated from `checkedAtMs` (how old the value shown is), so history can be served for the whole window without triggering a re-probe storm. A history reading is now always `stale: true` — it is never a live verdict. Regression: `test/health.failcache.test.mjs` (5 tests, **T-B14**).

**Why the existing 12 fallback tests missed it:** all of them exercised the fallback on the *same* call that took the probe. The natural way to write the test is also the one blind spot that mattered.

---

## 2. H2 — the LANE B leak guard has 8 false negatives (CODE, P1, REAL)

**Where:** `scripts/creator-brains/console/test/leak-guard.mjs`

The detector's docstring claimed it "does not depend on the leaker choosing a predictable name." A hostile probe (`probe-leak.mjs`, 11 real leak shapes) proved that false: **8 of 11 escaped**, caught 3.

| Leak shape | Before |
|---|---|
| cue array, known container name | caught |
| cue array renamed to `items` | caught |
| cue array, timing key renamed to `begin` / `offset` | **ESCAPED** |
| single cue object (not an array), e.g. `{cue:{tStartMs,text}}` | **ESCAPED** |
| 50 KB transcript under `notes` / `detail` / `snippet` | **ESCAPED** |
| bulk text nested under benign keys | **ESCAPED** |
| multi-sentence prose under `throttle.text` | caught |

The decisive hole: the prose check only fired for four names (`text|body|content|caption`), so **any long transcript under any other key name walked straight through**. This guard is the enforcement for the repo's hardest invariant — LANE B raw transcripts must never be served — so a name-dependent guard is not a partial control, it is theatre.

**Fix:** (1) a **size gate** — any single string > 2 000 chars is a leak under *any* key name, per-string rather than aggregated so `backlog.lines` (many short lines) is unaffected; (2) cue detection broadened to renamed timing keys and to single objects. Result: **11/11 caught**.

**The false positive this almost shipped.** Broadening the timing keys alone immediately condemned `throttle`, which carries `{ ..., start, text }` — but `throttle.start` is an **ISO timestamp string**, while a caption cue's timing is a **numeric** ms offset. Requiring `typeof v === 'number'` separates them on the thing that actually differs. Found because the full suite went 70→69 the moment I ran it; pinned in `test/leak-guard.falsenegative.test.mjs` (**T-B15**), which asserts both directions.

---

## 3. F1–F3 — the readiness receipt contradicts itself (RECEIPT, REAL)

`readiness.json` had drifted from the code it describes:

| # | Defect | Evidence |
|---|---|---|
| F2 | All **26** tests `NOT RUN` with reason "plan phase — no implementation exists yet", while S0 is built and green | the receipt denied the implementation |
| F3 | `T-B13` declared in `06-test-plan.md` but **absent** from the receipt; `R13` did not list it | a test with no receipt row |

Fixed: the 9 S0-realised bridge tests set to `PASS` (B4/B5/B10 stay `NOT RUN` — they are S3/S4; B12 is S7; all W/T/E remain correctly `NOT RUN`); `T-B13` and the two round-2 regressions added with back-references. Final: **11 PASS / 18 NOT RUN**, gate `structurallyReady: true`.

**F1 — retracted, my own error.** I first reported `phase: "plan"` as contradicting `nextSlice: "S0 — bridge COMPLETE"` and changed it to `"build"`. That was wrong on two counts: (a) `nextSlice` is a statement about what is *next*, not a phase claim, so there was never a contradiction; and (b) `check-readiness.mjs:25` accepts only `plan` or `implementation`, and `implementation` requires **every** test to be `PASS` — impossible while 18 belong to later slices. The schema simply has no phase for "partially built". `phase` is back to `"plan"`.

Two further schema details I got wrong before the gate corrected me, recorded because they will bite the next person who edits this receipt:
- `PASS` tests are validated with the **section** evidence shape `{path, sha256}` — a plain string array is rejected. (`NOT RUN` tests are not evidence-checked at all, which is why the strings had passed unnoticed.)
- `T-B15` originally declared `requirements: ["R-invariant 1"]`, which is not an id in the requirements list; LANE B maps to **R6**.

---

## 4. F4 — the engine baseline number appears four times, four different values (RECEIPT, REAL)

| Doc | Value |
|---|---|
| `README.md` | 136 / 136 |
| `evidence/baseline-offline.txt` | 136 / 136 (the offline subset) |
| `00-consult-brief.md` | 191 |
| `11-hy4-review.md` | 182 / 189 |
| `08-slices-operations.md` (original) | 185 |

These are not all wrong — 136/136 is the **offline subset** and 182/189 is the **full suite** — but they are presented interchangeably as "the engine baseline," which is exactly the drift class that makes a receipt untrustworthy. **Not fixed:** reconciling them means deciding which number is the baseline of record, which is an engine-lane decision. Flagged for Sean.

---

## 5. What is genuinely fine (checked, not assumed)

I looked for these and did not find them; saying so is part of the review.

- **CD3 reduced-motion is properly specified.** D9 (02 §5) pins "sub-perceptual drift (<5% visual energy) + **fully static under reduced-motion**; pause off-viewport/hidden." The concept does not merely skip the entry dolly — the constellation's idle motion is covered too.
- **CD3 at mobile is properly specified.** `03-wireframes.md` is explicitly CD3-drawn and at 414px the constellation **collapses to a static mini orb**, roster becomes the interface. Not an unsolved split-view-at-320px problem.
- **S3/S4 ownership is coherent after the H6 fix.** `05 §2b` names the owning slice for each deferred route and `08` restates it; `06` tags T-B4/B5/B10 to their slice. The split did not move the drift elsewhere.
- **TTK, no cache stampede.** `healthReading` is synchronous and single-threaded, so concurrent readers cannot double-probe. The failure was the caching policy, not a race.

---

## 6. C1 — CD3's "lazy-loaded" three chunk is not actually lazy (CONCEPT, REAL)

02 §6 sets: *initial bundle (excluding lazy three chunk) ≤ 500 KB gz; three chunk ≤ 900 KB gz; **loaded only on viewport enter***.

Under CD3 the constellation is the **left half of the primary split view** — it is in the viewport on load, always. So "on viewport enter" fires immediately and the 900 KB chunk loads with the page. The ≤500 KB initial budget is **technically met** and **user-facingly meaningless**: perceived initial load is ~1.4 MB.

This is not a violation, it is a **budget that stops measuring what it was written to measure** the moment CD3 became the concept. Cheapest decisive test: at S5, measure bytes on the wire before first paint against a single 1.4 MB number rather than two separate ones. If ~1.4 MB is acceptable, say so explicitly; if not, the constellation must defer below the fold.

Related, smaller: `03` wireframes 414px but T-E2's matrix starts at **320px**. The mini-orb pattern presumably holds; it is unstated.

---

## 7. Highest-risk item and the cheapest decisive test

**H1 (§1)** — it is the only finding that produces a *wrong user-visible state on a working install*, and it would have shipped silently behind 65 green tests. The cheap test is the one now in `health.failcache.test.mjs`: read twice inside the TTL and assert the story does not change. **A console whose story changes without a new measurement is lying**, and that is the invariant worth pinning.

---

## 8. Verification

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 76 / pass 76 / fail 0
```

- New: `health.failcache.test.mjs` (5, T-B14), `leak-guard.falsenegative.test.mjs` (6, T-B15).
- Leak probe: 3/11 → **11/11** caught, with contract payloads still passing.
- All console `.mjs` files ≤ 300 lines (largest 283 — see 11 §5 for the corrected count).
- `check-readiness.mjs` → `structurallyReady: true`.
- Engine untouched: `git status --porcelain scripts/creator-brains/` → `?? scripts/creator-brains/console/` only.

## 9. Cost of this round

The three HY4 attempts billed **$0.116** and returned nothing. Root causes were found and fixed in `scripts/consult-hy3-design.mjs`: pricing was Hy3's rate (6× too low — real rate is **$0.834/M in, $2.501/M out**) and the request was non-streaming, so a reasoning model's paid output was lost while the request waited for headers. It now uses the shared `scripts/lib/openrouter-stream.mjs` helper. HY4 remains unusable for a full review at this balance because it spends 4 000+ tokens on hidden reasoning before emitting anything — it needs ≥64k `max_tokens`, ~$0.17 worst case.

=== END DOCUMENT: 12-hy4-review-round2.md ===


=== BEGIN DOCUMENT: 13-hostile-round3.md — HOSTILE ROUND 3 ===

# 13 — Hostile review round 3 (dry-loop) — Creator Brains Console

- **Date:** 2026-09-18 · **Seat:** builder adversarial pass (no external seat spent) · **Scope:** the surfaces rounds 1–2 never touched — the HTTP layer, the instance guard, the LANE B read path, and a full re-audit of round 2's own fixes.
- **Verdict: REVISE** — 1 new code defect (P2, real, reachable from the S7 embed), 1 measurement defect of my own, 1 doc correction. **The loop ran dry on every other surface.**

---

## 1. H3 — the single-instance guard does not hold within a process (CODE, P2, REAL)

**Where:** `server.mjs` + `lib/instance.mjs`

`lib/instance.mjs` promises that "one console at a time" is *"a property of the system rather than a convention Sean has to remember."* That promise was not true at the layer that actually matters.

`claimInstance` deliberately lets the **same pid re-claim** — it must, or a restart inside one process would be impossible, and `bridge.hy4.process.test.mjs` asserts exactly that. But the consequence was never traced to the caller. Measured:

```
bridge 1: http://127.0.0.1:50671
bridge 2: http://127.0.0.1:50672
RESULT: TWO bridges on ONE store (lost-update window open)
```

Two live bridges, one `registry.json`, two writers, no transaction — **precisely the silent lost-update the module exists to prevent.** The pid file stops a second *process*; nothing stopped a second *call*.

**Why this is not theoretical:** slice **S7** embeds the bridge in SwanGuard. An in-process host is exactly the caller that can invoke `startBridge` twice — a retry, a hot reload, a module initialised twice.

**Fix:** a process-local registry keyed by store root, complementary to the pid file:

| Guard | Stops |
|---|---|
| pid file (`O_CREAT\|O_EXCL`) | a second **process** (a second `.cmd` click) |
| in-process registry | a second **call** (retry / reload / double-init) |

The claim is made **synchronously, before the first `await`** — doing check-then-register across the async `listen` would reproduce the very check-then-act shape `openSync(…,'wx')` was introduced to kill. The handle object is mutated in place so its identity stays stable for the shutdown ownership comparison.

**The failure mode I had to design against:** turning the guard into a *lockout*. Both escapes must still work, and both are pinned:
- a restart after a clean shutdown,
- a retry after a **failed** bind.

Regression: `test/bridge.inprocess.test.mjs` (5 tests, **T-B16**), including a `Promise.allSettled` race asserting **exactly one** of two concurrent starts wins.

---

## 2. H4 — my own line-count measurement was wrong (MEASUREMENT, REAL)

While adding the guard, `server.mjs` went to 312 lines and the rule-4 test failed — correct. But when I then measured with `awk` I got **300** while the test reported **301**. My `awk` was double-subtracting: `awk END{NR}` already excludes the trailing empty record, so subtracting 1 again under-counts by one.

**Consequence beyond this file:** the "largest canonical: `health.history.test.mjs` **282**" figure I wrote into `11-hy4-review.md` was wrong; the true canonical count is **283**. Corrected in `11 §5` and `12 §8`. All later measurements use the repo's canonical `lineCount` (from `consistency-check.mjs`) rather than shell arithmetic.

Final state: **21 files, 0 over 300**, largest = `server.mjs` at exactly 300.

---

## 3. Surfaces that came back CLEAN (attacked, not assumed)

This is the substance of a dry-loop pass: what was tried and did **not** break.

### 3.1 Static-file traversal — 20 payloads, 0 escapes
`resolveStatic` containment held against every encoding I could construct: `../`, `..%2f`, `%2e%2e%2f`, `....//`, backslash and `%5c` variants, `//server/share` UNC, `C:/Windows`, `D:/`, null-byte injection (`%00`), `..;/`, and mixed separators. Containment is checked on the **resolved absolute path**, which is the only formulation that survives symlinks and Windows separators — and it does.

### 3.2 DNS-rebinding gate — 13 hostile Host values, 0 bypasses
Refused: `evil.com`, `127.0.0.1.evil.com`, `localhost.evil.com`, `127.0.0.1.attacker.net`, wrong port, missing port while the port is known, empty, absent, `0x7f.0.0.1`, and decimal `2130706433`. Fail-closed on a missing Host. `localhost` is correctly **allowed** (it is loopback by RFC 6761 and cannot be rebound) — my first probe listed it as "bad", which was a probe error, not a finding.

### 3.3 Live end-to-end — 24/24
Against a booted bridge on a temp store: oversized ref, malformed JSON, empty ref, 70 KB body (limit 64 KB), `enabled:"true"` as a string, empty/5000-char/absent `q`, and `restore`/`rollback`/`authorize`/`run/daily`/`repair` all **404**, `OPTIONS`/`DELETE` **404**. No error body leaked an absolute path. The LANE B canary never appeared.

### 3.4 LANE B read path — 15 slug payloads + 4 creator filters, 0 leaks
`brainDoc` held. Note the module's claim is narrower than it reads: the **file names** are literals (safe), but the **slug** is joined, so containment rests on `readPointer` refusing traversal — which it does. Worth stating explicitly, because the docstring implies the literal filenames alone are the guarantee.

Two 200s in my probe were artifacts of **URL normalization in the client** (`new URL('/api/brains/../../registry.json')` → `/registry.json` → falls through to the static handler's status page). Not a server behaviour.

### 3.5 The H8 class is fully closed
Grepped every console module for blocking subprocess calls: the **only** `execFileSync`/`spawnSync` in the composed graph is `ytdlp.mjs` (the health probe), and `selfCheck` is now imported by exactly one file — `health.mjs`, behind the TTL cache. `server.mjs` uses async `execFile` (browser open). `status.mjs` calls `healthReading` at both of its call sites (lines 64, 169). **No second instance of the round-1 P1.**

---

## 4. Verification

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 81 / pass 81 / fail 0   (~10 s)
```

| Check | Result |
|---|---|
| Console suite | **81/81 pass, 0 fail** |
| Rule 4 (300-line cap) | 21 files, **0 over** (max 300) |
| Readiness gate | `structurallyReady: true` |
| Engine boundary | `?? scripts/creator-brains/console/` only — zero engine files touched |
| Static traversal | 20/20 refused |
| Host gate | 13/13 hostile refused, legit allowed |
| Live HTTP surface | 24/24 correct |
| LANE B read path | 19/19 no leak |

## 5. Dry-loop statement

Three rounds, **nine code/receipt defects found and fixed** (H1–H8 across rounds 1–3 plus receipt F2–F4). Round 3's remaining surfaces — traversal, Host gate, live validation envelopes, slug handling, blocking-call audit — produced **no new findings** across 76 adversarial inputs. The one real defect found (H3) was in a class round 2 had no reason to look at: the guard's own contract, tested at the wrong layer.

**Residual risks carried forward, stated rather than hidden:**
- **Pid reuse** (`instance.mjs` header): the guard checks the pid is *alive*, not that it is the *same* process. No portable Windows fix without job objects. Unchanged.
- **F4** (open, needs Sean): the engine baseline is cited as 136/136, 191, 182/189 and 185 across four docs. Which is the baseline of record is an engine-lane decision.
- **C1** (open, needs Sean): under CD3 the "lazy" three chunk is not lazy — perceived initial load is ~1.4 MB.

=== END DOCUMENT: 13-hostile-round3.md ===


=== BEGIN DOCUMENT: 14-decisions-20260918.md — DECISIONS TAKEN 2026-09-18 (S1 SHIPPED STATE) ===

# 14 — Decisions taken 2026-09-18 (S1 authorised and shipped)

- **Date:** 2026-09-18 · **Author seat:** builder seat (Sable), acting on Sean's blanket "decide and go"
- **Status:** all six decisions closed; S1 shipped. This document is the record of *why*, not a plan.

Sean delegated the six open items with "decide the best options to take here based off what you
recommend — go". Each is recorded below with its evidence. Two were measurements rather than
preferences (D-F4, D-C1) and were settled by running things, not by choosing.

| # | Decision | Outcome | Evidence |
|---|---|---|---|
| D-SYM | 24 dangling skill symlinks | **Repaired** — restored from git, not re-pointed | 119 → 2 deletions; 0 dangling |
| D-F4 | Engine baseline of record | **183/183**, 25 non-live files | measured 2026-09-18, command below |
| D-C1 | three.js chunk "lazy" claim | **Re-scoped to a real deferral contract**, binds S5/T-E3 | §4 |
| D-S1 | S1 go | **Shipped** — 31 web tests + S0 still 81/81 | §5 |
| D-ASTRA | D1–D9 adjudication | **Scheduled** for 2026-09-19 22:30, brief-only, no spend | §6 |
| D-S5 | three.js constellation | **Stays deferred** (gated on S2+), now has a loading contract | §7 |

## 1. D-SYM — the dangling skill symlinks (and why "restore" beat "re-point")

**What was actually wrong.** The repo moved from `Desktop/quick-pt/SS-PT` to
`Desktop/@Everything/quick-pt/SS-PT`. 24 skill symlinks across `.claude/`, `.continue/` and
`.cursor/` had been written with **absolute** targets pointing at the old path, so every one
dangled. Git counts every tracked file *inside* a dangling path as deleted: **24 broken links
became 117 "deletions"** (+2 unrelated `hermes-inbox` files = the 119 originally reported).

**The decision was not obvious.** Two fixes existed:

- **(a) re-point** the symlinks at the new `.agents/skills/<name>` path, or
- **(b) restore** the tracked trees from git.

**(a) was rejected on evidence, not preference.** Three findings:

1. `git config core.symlinks` is **false**, and git tracks these paths as mode **100644 regular
   files** — so the repository's committed truth is *real directories*, not links.
2. All **34** working entries in `.claude/skills` are **real directories**; zero are symlinks.
   The 7 dangling entries were the anomaly, not the pattern.
3. Git Bash cannot create native Windows symlinks — `ln -sfn` silently produced a **0-byte
   regular file** instead. Re-pointing was not reliably achievable with the available tooling.

So (b): the symlinks were removed and the trees restored from `HEAD`, whose content is genuine
skill material (verified by reading the `agent-browser/SKILL.md` blob — real frontmatter, full
`references/` tree).

**Preserved:** `.claude/skills/prompt-watcher/SKILL.md` had a real local modification; it was
backed up before the restore and put back afterwards, and is still shown as modified.

**Verified after:** 0 dangling links; `0` deletions under all three trees; `.claude/skills` = 41
directories, `.continue/skills` = 9, `.cursor/skills` = 8.

**Capability recovered:** seven skills that had been loading for nobody, including
`verification-before-completion`, `test-driven-development`, `systematic-debugging`,
`full-output-enforcement`, `agent-browser`, `audit-website`, `webapp-testing`.

## 2. D-F4 — engine baseline of record

The packet carried four mutually inconsistent figures (136/136, 191, 182/189, 185). This was
settled by measurement:

```powershell
node --test scripts/creator-brains/test/*.test.mjs   # excluding live.test.mjs
# # tests 183 · # pass 183 · # fail 0 · 25 files · ~34 s
```

**Baseline of record: 183 tests, 183 pass, 0 fail, across 25 non-live files.**

`live.test.mjs` is **excluded** and is not part of this baseline: it exercises real YouTube
network behaviour, which 06-test-plan.md explicitly assigns to the engine's own live tests. A
network-dependent suite must not gate a console slice — the four legacy numbers are most likely
subsets that differed only in which files they counted.

## 3. D-C1 — the three.js chunk is not "lazy", it is "eager with extra steps"

**The finding.** 02-blueprint.md §6 budgets the three chunk at ≤900 KB gz "loaded only on
viewport enter". Under CD3 the constellation occupies the **left panel of the entry split view** —
so viewport-enter fires on first paint. The chunk therefore loads essentially at mount, and the
operator pays ~1.4 MB before the constellation appears. The label said lazy; the behaviour did not.

**Decision — the S5 loading contract (binds S5 and T-E3):**

1. First paint ships the **initial bundle only**; the constellation panel renders a static,
   non-WebGL placeholder immediately. The ops deck is interactive before three.js is fetched.
2. The chunk is fetched on **idle after the first successful status poll**, not on viewport enter.
3. Under `prefers-reduced-motion` **or** absent WebGL, the chunk is **never fetched** — those
   users pay zero, rather than paying 1.4 MB for a scene that will not animate.
4. The CD3 entry dolly waits on the chunk. If it arrives after the idle window, the dolly is
   **skipped** rather than janking in late.

This is a genuine deferral rather than a relabelled eager load, and item 3 is the part with a real
payoff. T-E3 must be updated to assert the reduced-motion/WebGL-absent case fetches nothing.

## 4. D-S1 — authorised and shipped

Exit criteria from 08-slices-operations.md: *T-W1/W2/W3 green; `tsc --noEmit` 0; build ok.*

| Check | Result |
|---|---|
| `npx vitest run` | **31 passed / 0 failed** (3 files) |
| `npx tsc --noEmit` | **0 errors** |
| `npx vite build` | 49 modules, 526 ms |
| Initial bundle | **180.35 kB → 60.21 kB gz** (budget 500 kB gz — 8× headroom) |
| S0 regression | **81/81** bridge suite, unchanged |

Shipped under `console/web/`: `tokens.css` (design.md §4 verbatim, banned colours absent),
`adapters/{types,errors,fixtures,MockAdapter,LocalEngineAdapter,index}`, `hooks/useStatus`,
`components/StatusBoard`, `App`, plus T-W1/W2/W3.

Two notes on how the tests were written, because both are load-bearing:

- **T-W1 parity is real, not parallel.** Both adapters are driven through `mapBridgeError`, and
  the live adapter is exercised against a fake `fetch` serving the bridge's own routes — so
  "identical error mapping" cannot drift as one adapter is edited.
- **T-W1 does not assert a client-side query guard.** 05-contracts.md §2 scopes "both client and
  server" to `perHour` only; an empty `q` is the bridge's 400. The first draft asserted a shared
  client guard, which only the mock had. That is exactly how a contract test becomes a fiction,
  so it was replaced with a server-refusal parity case plus a mock-specific guard test.

## 5. H5 — defect found and fixed during S1: the rule-4 walk was unbounded

Adding `console/web/` put a `node_modules` tree under `CONSOLE_ROOT` for the first time, and the
suite's own 300-line-cap test began measuring **~184 installed packages** instead of console
sources. It failed on a dependency's line count — not a rule 4 violation by any reading.

Fixed by giving the walk an explicit `NOT_OUR_SOURCE` skip set (`node_modules`, `dist`, `.git`) and
extracting **one shared `walkConsoleSources`** used by both the cap test and the walk-integrity
test, so the two can no longer drift apart. The cap itself was **not** relaxed.

## 6. D-ASTRA — scheduled, preparation only

The Astra seat is blocked until 2026-09-19 ~22:12. 08-slices-operations.md item 2 already
establishes that S0–S4 carry no design risk the adjudication could overturn, so it does not gate
S1. A one-time automation at **2026-09-19 22:30** will assemble `15-astra-brief.md` from
02-blueprint.md §5 — each D1–D9 with its question, seed recommendation, and the consequence of
overturning it. It fires **no paid or metered call**; Astra rides the Codex subscription.

## 7. D-S5 — unchanged, and deliberately so

S5 (BrainConstellation, CD3 layout) remains deferred: it is gated on S2+ and the roster must exist
as an accessible equal first. The only change to it is that §3's loading contract now binds it.

## 8. H6b — the plan was wrong about `/api/status` damage (found while proving S1's exit)

S1's exit criterion is *"R2/R3 visible on real fixture store"* — bridge **and** built app together, not
`StatusBoard` against fixtures in isolation. Writing that end-to-end check surfaced a second instance of
the H6 plan/code-mismatch class, and it is the more consequential one because it concerns R3 itself.

**What the plan said.** `05 §2a` listed `GET /api/status`'s errors as `409 STORE_DAMAGED`, and `06`
T-B2 asserted that corrupting `registry.json` makes **both** `/api/status` and `/api/creators` return 409.

**What the code actually does** (measured on a real bridge against a seeded store):

| Route | Corrupt `registry.json` |
|---|---|
| `GET /api/status` | **200**, with `creators.damaged = {file:'registry.json', detail}` |
| `GET /api/creators` | **409** `{error:{code:'STORE_DAMAGED', file:'registry.json'}}` |

**The code is right.** `05 §1` types damage as a *field* on `StatusInstrument`
(`damaged: null | {file, detail}`), so a 409 on `/api/status` would make that field unreachable — and
R3/T-W3 require the board to render a refusal banner **naming the file**, which needs exactly the
200-plus-field shape. `05 §2a` and `06` T-B2 were corrected to match; the code was not touched.

**A trap recorded rather than silently fixed.** On a damaged registry the 200 payload still carries
`total: 0, enabled: 0`. Those zeros are not a measurement — any consumer that renders `total` without
checking `damaged` first will show a false zero, which is what R3 exists to forbid. `StatusBoard`
withholds them, and `05 §2a` now carries an explicit warning. The field types are `number` (not
`number | null`), so leaving the shape stable is the contract-conformant choice; the guard belongs at
the consumer, and it is documented as such.

**Receipt:** `test/s1-exit-e2e.mjs` — **12/12 checks**, including R2 field coverage on a real store, the
built app served at `/`, the hashed JS chunk served, and both damage routes asserted as-built.

## 9. Boundaries held

- Engine untouched — `git status` under `scripts/creator-brains` shows the console directory as
  untracked only.
- npm dependencies were added **only** inside `console/web/` (permitted); `node_modules/` and
  `dist/` are already gitignored, and the untracked set under `console/web` is source only.
- No route was added ahead of its owning slice: `repair`/`backup`/`startDailyRun` throw a typed
  `NOT_FOUND` naming their slice rather than silently succeeding.

=== END DOCUMENT: 14-decisions-20260918.md ===


=== BEGIN DOCUMENT: 16-s1-hostile-review.md — S1 HOSTILE REVIEW (defects S1-H1..S1-H21) ===

# 16 — Hostile review round 4 (S1) — Creator Brains Console

- **Date:** 2026-09-18 · **Seat:** builder adversarial pass (no external seat spent) · **Scope:** the slice S1 shipped — the UI, the damage-reporting path, and the *tests that were supposed to be guarding it*.
- **Verdict: REVISE → GREEN.** 8 findings (S1-H1…H8), all fixed and all mutation-verified. **Two were P1-class:** one destroyed the damage-reporting path (S1-H1), the other **killed the bridge process with a single malformed request line** (S1-H8). One (S1-H7) was a hole in the guard suite itself: the rule-4 cap test could not fail on any UI file.
- **S1-H8 was added after the first version of this document.** The sweep was extended from the UI to the static/HTTP layer — a surface rounds 3–4 had not revisited *since S1 put a real web build behind it*. Recorded here rather than in a new document so the round stays coherent.

---

## 1. Why this round targeted the tests, not just the code

Rounds 1–3 audited the engine bridge. S1 added a whole new surface — `console/web/` — and the first pass at reviewing it looked at the *code*. That was the wrong first move.

The more dangerous class is a test that passes because it cannot fail. S1 shipped 31 green tests; three of the seven findings below are places where a green test was not evidence of anything. A slice whose guard suite is narrower than its own file tree has no exit criteria, only a green log.

---

## 2. S1-H1 — a corrupt `state.json` 500'd the damage-reporting route (CODE, **P1, REAL**)

**Where:** `console/lib/status.mjs:79` (and `:195` for the same call on `/api/backlog`).

`stateOrDefault()` **throws on a corrupt file by design** — `defaultValue` refuses to substitute a default for damage (`lib/store.mjs:211`). `getStatus` called it unconditionally:

```js
const videos = stateOrDefault(stateRead).videos || {};
```

Measured on a booted bridge against a store with a corrupt `state.json`:

```
GET /api/status  -> 500, stack trace in the body
GET /api/backlog -> 500
```

**Why this is P1 and not a cosmetic 500.** R3 exists so that damage is *reported*. `StatusInstrument` types damage as a **field** (`05 §1`), and `state.damaged` was already being computed one line earlier — but it was **unreachable**, because the function threw before returning. So the one condition the reporting path exists to describe was the one condition that destroyed it. Worse, the client cannot tell the difference: `StatusBoard` renders *"The bridge did not answer"*, which is indistinguishable from the bridge being down. The operator is told the wrong story.

**Fix** — guard the derivation, keep the route composite:

```js
const stateDamaged = isDamaged(stateRead);
const videos = stateDamaged ? {} : (stateOrDefault(stateRead).videos || {});
const summary = stateDamaged ? null : summarize(videos);
```

`/api/backlog` is *not* composite — its entire payload derives from `state.json`, so `lines: []` would be indistinguishable from a genuinely empty backlog. It now refuses with `409 STORE_DAMAGED` naming the file, like `/api/creators` does.

This is the **two-shape rule** the plan had not stated: a *composite* instrument route keeps 200 and reports damage as a field; a route whose whole payload comes from the damaged file refuses. Recorded in `05 §2a`.

**Regression:** `test/bridge.damage.test.mjs` — T-B17a–f, including a raw-text assertion that no stack trace reaches the body.

## 3. S1-H2 — the census rendered a fabricated measurement (CODE, P2)

**Where:** `components/StatusBoard.tsx`, census row.

`StatusInstrument.census.error` exists precisely because a failed checkpoint sweep leaves `everSwept` at **0** — the count is *absent*, not zero. `status.mjs:139` only sets `error` when `sweeps.error` is truthy. `StatusBoard` ignored the field entirely and rendered:

```
0 in flight · 0 swept
```

That is a fabricated measurement, and it is the exact failure R3 forbids: it reads as "the system checked and found nothing in flight" when the truth is "the system could not check". Fixed with a refusal branch (`data-testid="refused-census"`) that names the sweep error instead of the counts.

## 4. S1-H3 — `documents: 0` is a guard, not a count (CODE, P2)

**Where:** `console/lib/status.mjs:148` → `components/StatusBoard.tsx`.

```js
documents: stateDamaged ? 0 : listDocs(r).length,
```

That `0` is a *guard value* — the field is typed `number`, not `number | null`, so the shape stays stable and the consumer is expected to check damage first. `StatusBoard` rendered it, so a store fault announced **"you have no documents"**.

Fixed by splitting the single `Published` row into two, because they have different truth conditions:

| Row | Source | Behaviour under `stateDamaged` |
|---|---|---|
| **Documents** | `listDocs(r)` — gated on `state.json` | **withheld** (refusal) |
| **Published brains** | `listPublished(r)` — reads `brains/`, not `state.json` | **real count, still shown** |

Withholding the second would have been the same class of lie in the opposite direction. The split is the fix; the refusal alone would have been over-correction.

## 5. S1-H4 — one hung request disabled polling permanently (CODE, P2)

**Where:** `hooks/useStatus.ts`.

The `inFlight` latch — which exists so a slow response cannot stack a second request — was cleared **only in `finally`**. A request that never settles therefore held it forever: every later poll returned immediately at the guard, and the board sat on a stale reading with no recovery short of a reload. "Never overlaps itself" had been implemented as "never recovers".

**Fix:** each load races the adapter against a watchdog, so `finally` always runs, plus a generation counter so a late answer from a timed-out request cannot overwrite a newer reading.

```js
const status = await Promise.race([
  adapterRef.current.getStatus(),
  new Promise((_, reject) => { watchdog = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs); }),
]);
```

Two deliberate calls:
- A watchdog is mapped to **`TRANSPORT`**, not a new `TIMEOUT` code. No response was ever received, which is what `mapTransportError` already means; adding a code would widen the `05 §2` envelope for a purely client-side condition.
- The timeout lives in the hook, **not** in `ConsoleDataAdapter.getStatus()`. That interface is transcribed verbatim from `05 §1`; a signature change to fix a client concern would have been the tail wagging the contract.

**Regression:** `hooks/useStatus.test.ts` (3 tests) — timeout + recovery, late-answer discard, stale-but-labelled.

## 6. S1-H5 — the fixtures described responses the bridge never produces (MEASUREMENT, P2)

`fixtures.ts` is the input to T-W3, so a fixture that lies makes the component test a fiction — it asserts behaviour against a payload that cannot occur.

Measured against a live bridge and corrected:

| Fixture | Was | Bridge actually returns |
|---|---|---|
| `damagedRegistryStatus` | zeroed `documents` / `publishedBrains` / `recentRuns` | all **still real** — registry damage does not touch the docs dir or the brains dir |
| `damagedStateStatus` | left `backlog.lines` populated, `documents` real | `backlog.lines: []`, `documents: 0` |

The `creators: {total: 0, enabled: 0, damaged: {...}}` trap is *faithful* and was kept — those zeros are real output and are exactly what a naive consumer renders as a false zero.

## 7. S1-H6 — T-W2 was narrower than its own claim (TEST, P2)

**Where:** `src/test/no-engine-import.test.ts`.

The requirement is "no file under `web/src` imports the engine". Three gaps:

1. **`export … from` re-exports** were caught only incidentally (the `from` keyword happened to match), and the label claimed "static import".
2. **Concatenated and split literals** — `'../../' + 'creator-brains/x'`, or `'creator' + '-brains/x'` — matched nothing.
3. **The palette check scanned `tokens.css` alone.** A component could hard-code a banned colour and the suite stayed green.

Fixed by extracting one `scanEngineImports(text)` used by both the real scan and a new **self-check** that runs synthetic offenders through the same matcher — so a future edit cannot silently neuter a pattern. The palette rule now scans **every production file** for the banned hexes *and* their `rgb()` forms.

The self-check is the load-bearing part: it converts "the regexes look right" into "the regexes are proven to fire".

## 8. S1-H7 — the rule-4 cap test could not fail on any UI file (TEST COVERAGE, **P1-class**)

**Where:** `test/bridge.hy4.structure.test.mjs:199`.

CLAUDE.md rule 4 is a **repo-wide** 300-line hard cap. The console's cap test collected sources with:

```js
if (entry.endsWith('.mjs')) acc.push(full);
```

When S1 added `console/web/`, that meant the **entire TypeScript tree went unmeasured** — ~16 files, including `StatusBoard.tsx` at **267** lines. The test's own claim, *"every console source file honours the 300-line cap"*, was false as written: it was a cap on the engine bridge, not on the console.

This is the finding that justifies the round. H5 (recorded in `14 §5`) had already been found and fixed in this same test by adding the `node_modules` skip — and that fix, while correct, *masked this one*, because both defects lived in the same three lines and only the skip set was examined.

**Fix:** an explicit `SOURCE_EXT` list, plus a guard test asserting the walk actually reaches the UI:

```js
const web = files.filter((f) => /[\\/]web[\\/]src[\\/]/.test(f));
assert.ok(web.length >= 10, `the walk reached only ${web.length} files under web/src ...`);
```

Measured after the fix: **40 sources walked, 0 over the cap**, largest = `server.mjs` at exactly **300**.

## 9. S1-H8 — one malformed request line kills the bridge (CODE, **P1, REAL**)

**Where:** `console/server.mjs:125` — `new URL(req.url, …)` sat **outside** the handler's `try` block.

`new URL(raw, base)` is not total. Seven-plus targets are protocol-relative or scheme-only forms with no host, and each raises `TypeError ERR_INVALID_URL`:

```
GET // HTTP/1.1        GET /// HTTP/1.1      GET //// HTTP/1.1
GET //@ HTTP/1.1       GET //:80 HTTP/1.1    GET http:// HTTP/1.1
GET http:/// HTTP/1.1  GET https:// HTTP/1.1
```

Because the parse ran before the `try`, the throw escaped the request handler entirely. Node turns an uncaught throw there into an `uncaughtException`, and its default for that is **to terminate the process**. Measured against a real child process (`startBridge`, no `uncaughtException` handler):

```
GET /api/canary  -> 200   child alive: true
GET //           -> SOCKERR:ECONNRESET
child exited: YES (code=1, signal=null)     # ERR_INVALID_URL
```

**One request line. No response to the client, and the bridge is gone.** The console is loopback-only, so this is not a remote-attacker path — the DNS-rebinding gate refuses a hostile Host *before* the parse, and T-B18b now pins that ordering. But **any local process can kill the operator's bridge with one `curl`**, and the console UI is served from that same origin. The pid file does *not* turn this into a lockout (`claimInstance` clears a stale pid), so severity is crash-plus-DoS rather than a permanent wedge — which is the only reason this is P1 and not worse.

**Why the guard suite never caught it.** It is not a logic error in a handler; it is a throw escaping the *dispatch* layer, above every route and therefore above every route test. Round 3 had attacked `resolveStatic` and `hostAllowed` hard, but always *through* handlers — and it did so **before S1 existed**, when the static layer served only a placeholder page. The class is "the request handler must be total", and nothing tested that.

**Fix, in three parts:**

1. `lib/http.mjs` gains `parseRequestUrl(rawUrl, base)` — total, and maps the failure to the documented envelope (`05 §2`: `VALIDATION` → **400**) instead of letting it fall through to a generic 500. The echoed target is clipped to 120 chars: it is attacker-controlled and unbounded.
2. The parse moves **inside** the `try` (net −1 line, keeping rule 4 satisfied).
3. `sendError` is now incapable of throwing. Its whole job is to produce an error response, so if *it* raised — `writeHead` raises `ERR_HTTP_HEADERS_SENT` on a partially-written response — the process would die by the identical mechanism. A guard that can be defeated by the failure it exists to report is not a guard.

**Regression:** `test/bridge.requesttarget.test.mjs` — **T-B18a/b/c**. The tests use a new `rawRequestLine` fixture that writes to a socket directly, because **both `fetch` and `node:http.request` parse the target into a URL before writing it** and therefore normalize every malformed form away. A test written with either would have passed against the broken code — the same trap the `rawRequest` docstring already records for forbidden headers, in a different disguise.

## 10. A containment check that held, and one that is only correct by accident

Extending the sweep to the static layer produced one clean result and one latent defect worth recording.

**CLEAN — traversal containment survived S1.** 30 hostile payloads against `resolveStatic` with the real `WEB_DIST` root now in place: `../`, `..%2f`, `%2e%2e`, `....//`, `..;/`, `.%2e`, double-encoded `%252e%252e`, backslash variants, UNC `//server/share`, `C:/Windows/win.ini`, null-byte `%00`, overlong-UTF-8 `%c0%ae`, and enough `..` depth to escape the repo root. **0 escapes** — containment is checked on the resolved absolute path, which is the only formulation that survives both encodings and Windows separators. Round 3's conclusion is reconfirmed under the new root.

**LATENT — `resolveStatic`'s containment check permits the base *directory*.** The guard reads:

```js
if (target !== base && !target.startsWith(base + sep)) return null;
```

That `target !== base` exception can only ever admit `WEB_DIST` **itself**, which is a directory — so `resolveStatic('')` and `resolveStatic('.')` both return a directory, and `readFileSync(dir)` then raises EISDIR. Measured: 2 of 30 payloads resolved to a directory.

**It is not reachable through the bridge** — `url.pathname` from `new URL` always begins with `/`, so `clean` is never `''` or `'.'`. But the function is **exported** (`server.mjs` re-exports it) and its correctness depends entirely on an assumption made by its caller. That is the same shape as H5 and S1-H7: a guard that is right only because of something unstated somewhere else. Left as-is deliberately — tightening it means either a behaviour change with no test that can fail, or deleting the exception, and neither should be done quietly. Recorded so the next seat decides it on purpose.

## 11. Mutation verification — a test that cannot fail is not evidence

Each new guard was proved to bite by breaking the code it guards, observing the failure, and reverting. Six mutations, six confirmations:

| Guard | Mutation applied | Observed failure |
|---|---|---|
| S1-H4 watchdog | `reject(...)` → `() => {}` (watchdog neutered) | 2 tests fail, state stuck at `loading` **forever** — the exact wedged symptom |
| S1-H2 census refusal | branch condition → `false` | `Unable to find an element by: [data-testid="refused-census"]` |
| S1-H6 palette scan | injected `#00FFFF` into `App.tsx` | `expected [ 'App.tsx — #00ffff' ] to deeply equal []` |
| S1-H6 self-check | pattern → `creator-brains-MUTATED` | self-check names the **6 samples** that pattern was carrying |
| S1-H7 walk | `SOURCE_EXT` → `.mjs` only | `the walk reached only 0 files under web/src — the cap does not cover the UI` |
| S1-H8 request target | parse moved back **outside** the `try` (the original bug) | T-B18a fails: `failureType: 'unhandledRejection', code: 'ERR_INVALID_URL'` |

All mutations reverted; a post-revert grep for `MUTATION` across `console/` returns only `jsdom`'s internal `MUTATION_TYPE` constants in `node_modules`.

The S1-H6, S1-H7 and S1-H8 results are the ones that matter most: in all three cases the *old* suite would have stayed green under the mutation, which is the definition of the defect.

**The S1-H8 mutation is worth one note on evidence.** Under `node --test` the throw surfaces as an `unhandledRejection` attributed to the test, not as a process exit — because the runner installs its own rejection handling. The **process death** was established separately, against a real `startBridge` child with no such handler: `child exited: YES (code=1)`. Two different observations of one defect; the severity claim rests on the child-process run, not on the test-runner symptom.

## 12. Verification

| Check | Result |
|---|---|
| Console (bridge) suite | **97/97 pass, 0 fail** — ⚠️ **this number was inflated; see §14 S1-H13.** The true distinct count was 85 |
| Web suite (`vitest run`) | **39/39 pass, 0 fail** (4 files) |
| `tsc --noEmit` | **0 errors** |
| `vite build` | 49 modules, 180.94 kB → **60.39 kB gz** (budget 500 kB) |
| S1 exit e2e | **12/12 checks** |
| Rule 4 | **41 sources walked, 0 over** (max `server.mjs` = 300) |
| Static containment | 30/30 hostile payloads refused |
| Request-target robustness | 8/8 malformed targets → 400, bridge survives |
| Engine boundary | `scripts/creator-brains/console/**` untracked only — zero engine files touched |
| LANE B | still never served; the e2e canary never appeared |

Suite growth: bridge 81 → 93 (S0 close-out) → **94** (walk guard) → **97** (T-B18a/b/c); web 31 → **39**.

## 13. Dry-loop statement

Round 4 found **8 defects in a slice that had already shipped green** — 5 in code, 1 in fixtures, 2 in the tests themselves. Three were P1-class: one destroyed the damage-reporting path (S1-H1), one made the repo's own line-cap rule unenforceable on a whole new file tree (S1-H7), and one **let a single malformed request line kill the bridge process** (S1-H8).

**The pattern across all three P1s is the same and worth naming:** each was a guard or a parse that was correct *only under an assumption made somewhere else* — that `stateOrDefault` would not be called on a damaged file, that the walk reached the UI, that `req.url` always parses. None of them were logic errors in a handler, which is why handler-level tests could not see them.

**Residual risks carried forward, stated rather than hidden:**

- **`server.mjs` is at exactly 300 lines — zero headroom.** Rule 4 permits 300, so this is compliant, but **the first route S2 adds breaks the cap**, and the S1-H8 fix already consumed the last line of slack (it was re-shaped to be net-neutral rather than net-positive to avoid breaching the cap mid-fix). S2 must decide up front whether to split `server.mjs` (a router/registration split is the natural seam) or to raise the cap repo-wide — and the cap is a CLAUDE.md rule, so it is Sean's call, not the builder's.
- **The S1-H4 watchdog is time-based, not cancellation-based.** It releases the latch and discards the late answer, but the underlying `fetch` is not aborted — the socket lives until the browser or bridge closes it. Truly aborting would need `AbortSignal` threaded through `ConsoleDataAdapter.getStatus()`, i.e. a `05 §1` contract change. Deliberately not done; recorded so the next seat can make that call knowingly.
- **`resolveStatic`'s `target !== base` exception** admits the base directory (see §10). Unreachable through the bridge, but exported and only correct by accident of the caller's URL parsing. Not changed, deliberately.
- **`15-astra-brief.md` remains reserved** for the 2026-09-19 22:30 automation. This document took `16` to avoid colliding with it.

---

## 14. Round 5, pass 1 — the WRITE path (`POST`/`PATCH`), plus the suite's own arithmetic

Rounds 1–4 reviewed the read surface, the damage modes, the UI, and the static/HTTP layer.
Nobody had pointed a hostile probe at the two **write** routes. Pass 1 did, and the
worst finding of the round was waiting there.

### S1-H9 — a committed write was reported as a refusal (CODE, **P1, REAL**)

`PATCH /api/creators/:channelId` with a damaged `state.json` returned **409
STORE_DAMAGED** while the registry write it had just performed **was already on disk**.

Measured against a real bridge (`state.json` overwritten with `{ this is not json`):

```
PATCH CH_TWO {enabled:true}  -> HTTP 409 STORE_DAMAGED   (error.file = state.json)
  registry after: enabled=true, enabledAt=2026-09-19T07:42:41.386Z   <- PERSISTED
PATCH CH_TWO {enabled:false} -> HTTP 409 STORE_DAMAGED
  registry after: enabled=false                                      <- PERSISTED AGAIN
GET /api/creators            -> HTTP 409 STORE_DAMAGED   (the roster refuses too)
GET /api/status              -> HTTP 200 (composite route, damage as a field)
```

**Cause.** `lib/creators.mjs` delegated the write to the engine's `setEnabled`
(correct — that is the file's whole doctrine), then re-read the **roster** through
`creatorRows` to shape the response row. `creatorRows` is a *roster read* and
legitimately refuses 409 on a damaged `state.json` (`lib/creators.mjs:49-51`). So a
state fault turned a completed registry write into a 409 **after the fact**.

**Why this is P1 and not an error-code nit.** The single property a write client must
be able to rely on is:

> a non-2xx answer means nothing was written.

Every reading the operator has of that 409 is "the toggle did not happen" — and every
surface they could use to check is *also* refusing (`/api/creators` 409s on the same
fault). The console had **no way to tell the truth**. A UI that optimistically toggles
and rolls back on error would show the creator as disabled while the registry says
enabled, and `setEnabled` is by the engine's own description "the ONLY way a creator
starts being fetched" — so the operator's consent state silently disagrees with the
file that governs fetching.

**Fix.** The post-write path may no longer throw. Counts are now taken by
`safeCounts()` — a non-throwing lookup that returns **`null`** when `state.json` is
unreadable, never `0`. That is the same rule round 4 applied to `documents`
(§4 / `status.mjs:148`): a count that could not be taken is **absent**, not zero.
`CreatorRow.videos/fetched` widened to `number | null` in `adapters/types.ts` with the
reason at the field — done now precisely because S2 has not built the roster UI yet,
so nothing has been built on the false `number` contract.

### S1-H10 — a literal `null` body was a 500 (CODE, P2, REAL)

`readBody` returned whatever `JSON.parse` yielded, and **`null` is valid JSON**. The
write routes then dereferenced `body.ref` / `body.enabled` on it:

```
body null   POST -> 500 INTERNAL  Cannot read properties of null (reading 'ref')
            PATCH-> 500 INTERNAL  Cannot read properties of null (reading 'enabled')
body 42     POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body "str"  POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body true   POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body [1,2]  POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
```

`42`, `"str"`, `true` and `[1,2]` survived **only by luck** — reading a property off
them yields `undefined`, which the validators then refuse. `null` is the one value
that is `typeof === 'object'` and still throws. Sending the four characters `null`
returned "unexpected bridge failure".

**Fix.** The body contract ("a JSON object") is enforced in `readBody`, the one
function that owns it — not at each dereference site, because a rule spread over call
sites is a rule the next route forgets. An *absent* body still yields `{}` and keeps
its own, more specific refusal.

### S1-H11 — the static fallthrough answered every method with 200 (CODE, P3, REAL)

The route table's own comment reads *"anything else under /api is a named 404, never a
silent fallthrough"*. Outside `/api` there was exactly the silent fallthrough it
forbids:

```
GET|POST|PATCH|DELETE|PUT|OPTIONS  /registry.json  -> 200  <!doctype html>…(BRIDGE_PAGE)
```

A client PATCHing a typo'd path got a **200 with an HTML page** instead of a 404 —
and a method-agnostic 200 on a write is how a UI bug hides. Fixed **net-neutral** in
line count (one condition widened, no lines added), because `server.mjs` sits at
exactly 300 — see S1-H14.

### S1-H12 — `POST` starves the event loop, with none of `/api/status`'s mitigation (CODE, **P1 for S2, REAL, escalated**)

`POST /api/creators` resolves the reference through the engine, and the engine's
`runOperation` is **synchronous**: `lib/ytdlp.mjs:184` calls `execFileSync`, and
`addCreator` invokes the resolver without awaiting (`lib/registry.mjs:112`).

Measured with a 10 ms tick counter (idle baseline ≈ 64 ticks/s):

```
POST /api/creators {ref:"UCaaa…"} -> 422 in 1577 ms, loop ticks during it: 0
```

**Zero ticks in 1.6 s.** A failing lookup costs ~1.6 s of a completely frozen bridge;
the engine's timeout ceiling is **180 s**, and a successful or rate-limited lookup sits
somewhere between. During the freeze the bridge answers nothing — not `/api/status`,
not the static page — so a status poll queued behind an add is delayed by the whole
add, and the S1 `useStatus` watchdog (15 s, S1-H4) will report `TRANSPORT` for a poll
that was merely queued. The operator reads that as "the console is broken".

**Why this is a finding rather than a known cost.** `lib/health.mjs` documents this
exact pattern as a defect it exists to fix: *"composing a blocking engine function on
a hot path … a design defect the bridge introduced"*, and it pays the same blocking
call **once per 60 s TTL** so that `/api/status` can meet the p95 ≤ 50 ms budget in
`02 §6`. The doctrine was applied to the **read** path and never to the **write** path,
where the call is unbounded, uncached, and on a route the operator triggers by hand.

**Not fixed here, deliberately.** A cache is not available to a write, so the honest
answers are (a) make the engine's resolver async — `addCreator` would need
`await resolve(...)`, an **engine** change, and `deps.resolveCreator` cannot be fixed
from the console side because a returned Promise fails the `resolved.channelId` check —
or (b) stop serving the add synchronously (202 + a job). Both are Sean's call; (a)
touches the engine, which SOUL.md forbids doing to make the console look better. The
route is live today but the add UI is S2's, so **S2 must resolve this before shipping
it**. Recorded, measured, escalated.

### S1-H13 — the suite's own test count was inflated, and it was paying 4× for it (MEASUREMENT, P2)

`withFixture` was **exported from `bridge.boundary.test.mjs`**, and three other test
files imported it from there. Importing a module that calls `test(...)` **registers
that module's tests in the importing file's process**, so the boundary suite ran once
per importer:

```
per-file registered counts, BEFORE:  boundary 6 · damage 12 · write 14 · routes 19
per-file registered counts, AFTER :  boundary 6 · damage  6 · write  8 · routes 13
```

The suite reported **97 tests for 85 real ones** (the boundary file counted 3×), and
the boundary file's `/api/status` calls — which spawn a yt-dlp probe on a cold cache,
~3.7 s — were paid once per importer. Suite wall time **4.3 s → 20 s**.

This is the same shape as the round's other findings and is why it is recorded as a
defect rather than a tidy-up: **the number the packet quotes as evidence was not
measuring what it claimed.** A re-registered test can also pass in one file while the
file that owns it fails. `withFixture` now lives in `fixtures.mjs` (a non-test module),
with the rule stated at its definition: *a harness is not a test.*

### S1-H14 — the engine's own gate fails in this working tree, because the console installed deps (BLOCKER, escalated)

Running the engine suite as the packet's additive-only gate requires:

```
node --test scripts/creator-brains/test/*.test.mjs     # excl. live.test.mjs
# tests 183 · pass 181 · fail 2
not ok 53 - C1 every surface agrees with the artifacts of record
   DISAGREE no engine file exceeds the Rule 4 cap — largest = 4914 lines
```

**Cause.** `scripts/creator-brains/consistency-check.mjs:46-51` walks
`scripts/creator-brains/**` for `*.mjs` with **no `node_modules` skip**. The console
lives at `scripts/creator-brains/console/`, so the walk collects **186** files of which
**71 are third-party** — the largest being
`console/web/node_modules/decimal.js/decimal.mjs` at **4914 lines**.

**This is not caused by this pass.** `node_modules` is gitignored
(`.gitignore:4`) and its mtime is **2026-09-18 13:02**, ~11 h before these edits; the
whole `console/` tree is untracked. It was introduced by S1 running `npm install`
inside `console/web/` — which the packet **explicitly permits** ("npm deps only inside
`console/web/`"). The packet's rule and the engine's gate contradict each other, and
the gate is deterministic: 2/2 isolated runs fail.

**Consequence for the record:** the F4 baseline of record (**183/183**) **no longer
holds in this working tree**. It is superseded, honestly, by:

| Engine suite, this tree | Result |
|---|---|
| `C1` | **FAIL, deterministic** — the `node_modules` walk above |
| `HR14f` (two real concurrent runs) | **flaky under full-suite load** — 6/6 pass in isolation ×3, fails when the whole suite runs in parallel |
| everything else | **181 pass** |

`HR14f` is recorded because a baseline that is only reproducible when run alone is not
a baseline; it should be re-measured under load before it is quoted again.

**Not fixed here, deliberately.** The one-line fix (`skip node_modules in the walk`)
is in an **engine** file, and fixing it would be touching the engine to make the
console's side effect disappear — exactly what SOUL.md forbids. The real question is
Sean's: should the console live inside the engine tree at all, or should the walk skip
`node_modules`? Both are legitimate; they have different consequences. Escalated.

**The same defect was already found and fixed on the other side of the same boundary —
which is what makes this a contradiction rather than an oversight.** The README's H5
receipt records it: *"adding `console/web/` put a `node_modules` tree under
`CONSOLE_ROOT`, and the suite's own rule-4 cap test began measuring ~184 installed
packages. Fixed with an explicit `NOT_OUR_SOURCE` skip."* So the **console's** cap walk
learned to skip third-party code; the **engine's** consistency walk did not, and the
engine walk is the one that gates the engine suite. One boundary, two walkers, one of
them fixed. That asymmetry is the finding.

### What pass 1 checked and found CLEAN (recorded so the next seat does not re-litigate it)

- **Encoded traversal in the PATCH path segment.** `p.slice('/api/creators/'.length)`
  passes the segment through **un-decoded**, so `%2e%2e%2f%2e%2e%2fregistry.json`,
  `..%2Fregistry.json` and `%2Fetc%2Fpasswd` all reach `validateChannelId` as literal
  strings and are refused **400** by the shape check. Containment holds — but note it
  holds *because the string is undecoded*, not because anyone reasoned about decoding.
  Pass 2 must check `/api/brains/:slug`, which resolves through a different path.
- **`PATCH /api/creators/../../registry.json` → 200 is a PROBE ARTIFACT, not traversal.**
  `rawRequest` runs `new URL(base + path)` client-side, which normalises the target to
  `/registry.json` before it reaches the wire. Sent as a raw request line it *still*
  normalises (server-side, inside `parseRequestUrl`) to `/registry.json`, misses
  `/api/creators/`, and lands on the static fallthrough — which is how it became
  S1-H11. **There is no traversal here.**
- **`POST` refuses before writing.** With a damaged store, `addCreator` returns
  `{ok:false, reason}` and the registry file is byte-identical afterwards — verified,
  not assumed. (A first probe appeared to show POST *succeeding* under a damaged
  `state.json`; that was the probe's own error — `addCreator` never reads `state.json`,
  and the 422 was a network resolution failure for a fake handle. The correction is
  recorded because the wrong conclusion would have been a false finding.)
- **The health probe's blocking cost is already owned.** `/api/status` costs ~3.7 s on
  a cold cache (`execFileSync` → `yt-dlp --version`). This is *not* a new finding:
  `lib/health.mjs` exists solely to bound it, documents the measurement, and measures
  the TTL window from the last **probe** (so a 2 s poll cannot pin a value forever).
  Noted because it interacts with S1-H12: the bridge has **two** independent sources of
  multi-second loop starvation, and only one of them has a mitigation.

### Pass 1 — verification

| Check | Result |
|---|---|
| Bridge suite | **93/93 pass, 0 fail** — and now **93 real, not 111 reported for 93** |
| Suite wall time | **3.9 s** (was 20 s with the 3× re-registration) |
| New tests | **T-B19a–e, T-B20, T-B20b, T-B21** (8) |
| Mutation check | all 3 guards mutated → **T-B19a/b/c, T-B20, T-B20b, T-B21 fail; T-B19d/e stay green** (see below) |
| Rule 4 | `server.mjs` **300**, `http.mjs` 242, `creators.mjs` 146, `fixtures.mjs` 227 — 0 over |
| Engine boundary | `console/**` still untracked; **zero engine files edited** this pass |

**Mutation evidence (§11 discipline).** Reverting the S1-H9 fix to its original
`creatorRows` call, disabling the S1-H10 shape check, and removing the S1-H11 method
guard produced exactly `not ok` on T-B19a, T-B19b, T-B19c, T-B20, T-B20b, T-B21 —
while **T-B19d** (the pre-write-refusal invariant) and **T-B19e** (the happy path)
stayed green. Two controls passing under a mutation that breaks six other tests is what
makes the failures attributable rather than a shared artifact. All three mutations were
reverted; the suite is green at the reverted state.

---

## 15. Round 5, pass 2 — the READ path and the LANE B containment boundary

Pass 1 took the writes. Pass 2 took the reads that touch the filesystem — the only two
parameters in the whole bridge that reach a file path — and found that the one route
whose entire job is to show a published brain had **never once returned a brain**.

### S1-H15 — `/api/brains/:slug` answered 200 with an EMPTY document (CODE, **P1, REAL**)

Measured against a bridge with a real published generation seeded in the engine's own
layout (`brains/<ns>/gen-0001/{index,topics,timeline}.md` + `brains/<ns>/current.json`):

```
GET /api/brains/fixture-brain -> 200
  keys: slug, generation, title, index, topics, timeline, claims, skipped
  slug=fixture-brain  generation=gen-0001  title=Fixture Brain
  index    = ""
  topics   = ""
  timeline = ""
```

Correct slug, correct generation, correct title, **no content** — for every published
brain, always.

**Cause.** The engine publishes into `brains/<slug>/<generation>/` and swaps
`current.json` **last** (`lib/render.mjs` `publishBrain`: `const genDir =
ensureDir(join(dir, generation)); for (const f of files) writeTextAtomic(join(genDir,
f.name), f.text);` … then `writeJsonAtomic(pointerPath(r, ns), pointer)`).
`console/lib/brains.mjs` joined `brainsDir + slug` only and then read the three literal
names — **a directory that never contains them**. The generation segment was missing.
The engine's own `listPublished` states the correct layout one file away
(`dir: join(base, ns, ptr.generation)`), which is what makes this a plain omission
rather than a misunderstanding.

**Why this is P1.** The handler's own docstring reads *"A missing pointer is a 404,
never an empty document that looks like a brain with nothing in it."* The code produced
exactly that empty document whenever the pointer **did** exist — and an empty brain is
**indistinguishable from a brain with no claims**. R6's whole acceptance criterion is
"published-generation only"; the route was published-generation **nothing**. S2's
BrainDrawer would have rendered an empty panel and the operator would have concluded
the brain had no content.

**Fix.** Join the generation from the pointer. A missing document is now **reported**
through the payload's already-present-but-always-`[]` `skipped` array — the same rule
`loadHits` already applies to a missing `rules.jsonl` — so "absent" and "empty" are no
longer the same answer.

### S1-H16 — the route's 200 path had NO coverage, which is why H15 survived (TEST, P2)

`seedStore` creates an **empty** `brains/` directory. Every `/api/brains/:slug`
assertion in the suite — `T-B7`'s surface, `bridge.routes.test.mjs`, `bridge.hy4.test.mjs`
— therefore hit the **404 branch**. The 200 path was never executed by any test, so a
handler that returned three empty strings could not fail.

This is the same shape as S1-H13 and S1-H7 before it: **the test was measuring the
refusal path while the packet's evidence table said the route was covered.** A fixture
that cannot represent a published brain cannot test one.

**Fix.** `fixtures.mjs` gained `seedPublishedBrain()`, written to the engine's real
layout (generation directory, pointer last), and `T-B7`'s invariant sweep now includes a
**live** published namespace plus the hostile forms below — not only 404s.

### Checked CLEAN — the two parameters reach the store by opposite routes, and both hold

`:slug` arrives **un-decoded** (`p.slice('/api/brains/'.length)`); `?creator=` arrives
**decoded** by `URLSearchParams`. Opposite encodings, opposite risks, so each got its
own evidence:

- **`:slug` is contained by the POINTER GATE, not by path sanitisation.** `readPointer`
  must succeed before anything is read, and it looks up a literal directory name, so
  `%2e%2e%2f`, `..%2F`, `%5C`, `%00`, the LANE B channel id and a 500-char slug all
  404. Verified across 9 hostile forms: **no canary, no registry byte**.
- **`?creator=` is a COMPARISON, never a path.** `lib/query.mjs:55` reads
  `if (creator && pub.namespace !== creator) continue;` — an exact string match against
  the namespaces `listPublished` enumerated from the filesystem. It is never joined into
  a path, so traversal payloads match nothing and return `{"hits":[],"skipped":[]}`.
  Verified: traversal, encoded traversal, `%00`, and `/etc/passwd` all → 0 hits, while
  the real namespace still returns its claim.
- **LANE B cannot leak through `brainDoc` even if the pointer gate is removed** — this
  was *tested*, not asserted. Removing the gate makes the route answer 200 for a hostile
  slug (T-B22d's 404 assertion fails, so the test bites) and it **still serves nothing**,
  because the three filenames are literals (`index.md`/`topics.md`/`timeline.md`) while
  LANE B files are `<videoId>.json`. The design holds structurally; the pointer gate is
  the second line, not the only one.
- **The query route searches LANE C only.** Querying the canary phrase, `hydraulic` and
  `manifold` — words that exist *only* in the owner-private transcript — all return 0
  hits.

### Pass 2 — verification

| Check | Result |
|---|---|
| Bridge suite | **99/99 pass, 0 fail, 3.89 s** (93 → 99: T-B22a–f) |
| Web suite | **39/39 pass** |
| `tsc --noEmit` | **0 errors** |
| Rule 4 | 0 files over (max `server.mjs` = 300) |
| LANE B containment | **0 canary hits across 20 read probes**; 9 hostile slug forms + 5 hostile `creator=` forms all refuse |
| Mutation check | generation ignored → **T-B22a/b fail**; pointer gate removed → **T-B22d fails**, T-B22a/b/c stay green |
| Engine boundary | zero engine files edited (pass 2 either) |

**One assertion had to be strengthened during mutation testing.** T-B22c originally
asserted only `skipped.length === 3`, which passes under **both** the fixed and the
broken code — a decorative assertion. It now pins the three `reason` strings, so it
distinguishes "the pointer names no generation" from "the files are missing from a
generation that was named". Recorded because it is the §11 lesson repeating: the first
draft of a guard is often not a guard.

---

## 16. Round 5, pass 3 — the UI slice, where a wrong payload blanks the console

Passes 1 and 2 took the bridge. Pass 3 took `console/web/` (16 files, 1838 lines) and asked
the one question the bridge cannot answer for it: **what does the operator see when the
payload is not the shape this build expects?**

Before this pass, the answer was: *nothing at all.*

### S1-H17 — an uncaught render throw unmounted the console and left a blank page (CODE, **P1, REAL**)

Established RED-first, with the failing test written **before** the fix (`T-W11`). Feeding
`StatusBoard` a payload it did not expect produced:

```
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: status.backlog.lines.join is not a function
 ❯ StatusBoard src/components/StatusBoard.tsx:206:67
   204|         <Label>Backlog</Label>
   205|         <Value>
   206|           {status.backlog.lines.length > 0 ? status.backlog.lines.join…
 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

**Uncaught** — and there was **no error boundary anywhere in the tree**, verified by grep
across the whole web slice rather than by reading one file. `main.tsx` rendered `<App/>`
straight into `createRoot`, so React 18 unmounted the entire root: **no status, no message,
no clue which field was wrong.** The console simply goes white.

**Why this is P1.** `console/web/dist/` is a **build artifact**, and the bridge that serves
it is **versioned separately**. "The payload has a shape this build never saw" is therefore a
*supported* state, not a hypothetical — and its failure mode was total loss of the UI rather
than a named refusal. R2/R3 exist precisely so the operator can tell "we could not read this"
from "this is zero"; a blank page is the worst available answer to both.

**Why it survived four review rounds.** Every fixture in `adapters/fixtures.ts` is typed
`StatusInstrument`, so TypeScript made a wrong-shaped payload look *impossible* — and
`StatusBoard`'s ~13 unguarded dereferences (`status.creators.damaged`, `status.ytdlp.ok`,
`status.budget.used`, `status.census.inFlight.length`, `status.recentRuns.length`, …) were
never exercised with anything else. **The type system was the only guard, and it does not
run at runtime.** This is the round-5 pattern once more: a guard correct only under an
assumption made elsewhere — here, that the bundle and the bridge always agree.

**Fix — two layers, deliberately separate.**

1. **`adapters/validate.ts` (new) + `LocalEngineAdapter.getStatus()`** — the *primary*
   defence, at the seam. A 200 of the wrong shape becomes a typed `ConsoleApiError` naming
   the offending paths, which `useStatus` already catches into `phase: 'error'`, which
   `StatusBoard` already renders as its refusal banner. **The board stays up and the next
   poll can still recover it** — self-healing, for free, because the existing error path
   already worked. What was missing was only the *check*.
2. **`components/ErrorBoundary.tsx` (new)**, mounted twice — inside `App` around
   `StatusBoard`, and in `main.tsx` around `<App/>`. The *last resort*, for what layer 1
   cannot see: a non-validating adapter (the mock, or a future one) and any render throw
   nobody predicted.

**The boundary latches, and that is a decision, not an oversight.** A boundary that cleared
itself on the next poll would re-throw on **every** poll, forever, against a payload that is
not going to change — a render-throw loop every 5 s in place of one clean refusal. It
refuses once, names the fault, and tells the operator to reload. The self-healing belongs to
layer 1, and it is there.

**The inner boundary is mounted INSIDE the shell.** That is what keeps the header and the
page alive, and it is asserted: T-W11a requires `document.body.textContent` to still match
`/Creator Brains Console/` while the fault panel is showing.

### S1-H18 — the adapter seam cast the body instead of checking it (CODE, P2, REAL)

`LocalEngineAdapter.request` ended:

```js
if (!res.ok) throw mapBridgeError(res.status, body);
return body as T;                     // ← an unchecked cast
```

Every method inherited it, so a 200 whose body was not the contract was **indistinguishable
from a good reading** all the way down to the component. S1-H17 is what that costs when the
component dereferences deeply.

**Scope, stated rather than implied.** Only `/api/status` is validated, because
`StatusBoard` is the only component in S1 that dereferences a payload at all. The other
eight routes return values no S1 component reads; a validator for them would be
**unexercised code asserting a contract nobody depends on yet**, which is the thing this
review keeps finding. They are named as follow-ups instead of written blind. The remaining
`as T` cast is annotated in place so the next reader cannot mistake it for a reviewed line.

**The drift direction is safe, and that is why a shape declaration is acceptable here.**
This repo treats a second statement of the payload as a hazard (status.mjs header, blueprint
H10) — but this one **cannot fabricate a value**: it asserts presence and broad type only.
Adding a field to the bridge leaves the guard passing (undeclared keys are allowed, so the
console stays forward-compatible); **removing or retyping** one fails the guard loudly, which
is exactly the change that used to blank the console. Optionality was read off `status.mjs`
rather than guessed: `census.error` is the one conditional field and is `opt`; `ytdlp.version`,
`throttle.until`, `lock.pid` and `lock.alive` are left undeclared because `StatusBoard` reads
each behind a `??` or a truthiness test and none of them can throw.

### A copy inaccuracy the fix exposed (CODE, P3)

`StatusBoard`'s no-instrument banner read *"The bridge did not answer, so no instrument can be
shown."* That was true when a missing instrument could only mean a transport failure. With
layer 1 in place it is **false for the case the banner now most often reports** — the bridge
did answer, with a body the console cannot read. Corrected to name both causes. Small, but
the whole point of R3 is that the console does not tell the operator something untrue about
what it knows.

### Checked CLEAN (recorded so the next seat does not re-litigate it)

- **`pct()` / `videos.coverage` is NOT a finding.** `pct` calls `.toFixed(1)` on
  `n * 100`, which yields `"NaN"` for a non-number rather than throwing — ugly, but not a
  crash, and `summary.mjs:36` always produces a number. Deliberately **not** manufactured
  into a finding; the temptation to pad a hostile review with a plausible-looking non-issue
  is exactly how a real one gets buried.
- **No partial payload is reachable from today's bridge.** Every top-level key in
  `status.mjs`'s return (lines 92–153) is unconditional — the only conditional *field* is
  `census.error`. So the guard is not defending against a shape the current bridge emits; it
  defends against a **different build** of the bridge, which is the real risk (see S1-H17).
- **`useStatus` already handled the failure path correctly.** Its `catch` sets
  `phase: 'error'` while keeping the previous reading, and the S1-H4 watchdog guarantees the
  in-flight latch always releases. Nothing needed to change there; layer 1 simply gives it
  something to catch.

### Pass 3 — verification

| Check | Result |
|---|---|
| Web suite | **48/48 pass** (39 → 48: T-W11a–i, 9 new) |
| Bridge suite | **99/99 pass, 0 fail, 4.45 s** (unchanged — no bridge file touched this pass) |
| `tsc --noEmit` | **0 errors** |
| `npm run build` | clean — 51 modules, 184.68 kB js / 61.57 kB gzip |
| Rule 4 | 0 files over. `validate.ts` 162, `payload-shape.test.tsx` 158, `ErrorBoundary.tsx` 121, `StatusBoard.tsx` 267, `server.mjs` 300 |
| Mutation check | 3 guards mutated → **orthogonal** failures, 2 controls green under each (below) |
| Engine boundary | **zero engine files edited** (pass 3 either) |
| LANE B | no read path changed this pass; containment untouched |

**Mutation evidence (§11 discipline).** Each mutation was applied, observed, and reverted.

| Mutation | Tests that failed | Tests that stayed green |
|---|---|---|
| `backlog: obj({ lines: arr(str) })` → `obj({})` | **T-W11e only** (1) | the 8 others, incl. both healthy controls |
| `recentRuns` deleted from `STATUS_SHAPE` | **T-W11f only** (1) | the 8 others |
| `getDerivedStateFromError` returns `{ error: null }` | **T-W11a, b, c, g** (4) | **T-W11d, e, f, h, i** — every validator case and both controls |

The third row is the one that matters: disabling the boundary failed **exactly** the four
boundary-dependent tests while **every** validator test and **both** healthy-payload controls
stayed green. That orthogonality is what makes the two layers separately attributable rather
than one mechanism wearing two names.

**One coverage limit, stated plainly.** `main.tsx`'s mount point is not itself rendered by
any test — the test file renders `<App/>` directly, as every other test in this slice does.
What *is* tested is the **mechanism**: T-W11g renders the boundary around a component that
throws on sight and requires the fault panel to appear with the thrown message. So the
boundary's behaviour is proven; the second *mount* is defence in depth whose correctness
rests on the same proven mechanism. Recorded rather than left to look covered.

**A process trap worth writing down.** Two `Edit` calls issued against the **same file** in
one batch both read the original, and the second write clobbered the first — the
`ErrorBoundary` import vanished from `App.tsx` while the JSX edit landed, producing a
`ReferenceError: ErrorBoundary is not defined` that looked like a build problem and was a
lost update. Same-file edits must be issued **sequentially**. It cost one test cycle; it
would cost a lot more in a file where the lost half was the guard rather than the import.

---

## 17. Round 5, pass 4 — the request body and the instance guards

Pass 4 took the one input path every write route shares, plus both pid guards. The instance
guards came back **clean**. The body path produced a finding that is **real, measured, and
deliberately NOT fixed** — the first of those in this round, and the reasoning is recorded
in full because a declined finding is only honest if the trade is written down.

### S1-H19 — an oversized body is refused safely, but the client cannot READ the refusal (CODE, P3, REAL, **accepted not fixed**)

`readBody` has a 64 KB ceiling, and it holds: memory stays bounded (at most `limit` plus one
chunk is ever buffered) and the process survives everything thrown at it. The defect is
narrower and different: **the refusal does not always reach the client.**

Measured against a live bridge over raw sockets — because `fetch` and `node:http.request`
will not declare a `Content-Length` they do not intend to honour, so they cannot construct
this case:

| Body | Client sees |
|---|---|
| 65 537 B | `400 {"error":{"code":"VALIDATION","message":"request body too large"}}` |
| 128 KB | same 400 |
| 192 KB | same 400 |
| 256 KB | same 400 |
| 512 KB | same 400 |
| **1 MB** | **`ECONNRESET`, no response** |
| **4 MB** | **`ECONNRESET`, no response** |

`GET /api/status` answers 200 after every one of them, so the bridge is never harmed.

**Mechanism (measured, not inferred).** The threshold tracks the **socket buffer**, which is
what identifies the cause: the `throw` inside `for await` destroys the request stream, so if
the client is still *writing* when the limit trips, the kernel answers with RST and the
response — which the bridge does write — is discarded in flight. Below the buffer the whole
body has already landed, so the same code path delivers cleanly.

**Three candidate fixes, all measured against a minimal server** so the answer is about the
transport rather than about the bridge:

| Strategy | 1 MB | 4 MB |
|---|---|---|
| respond and end, no drain *(what the bridge does today)* | 400 | ECONNRESET |
| respond, then destroy after flush | ECONNRESET | ECONNRESET |
| **drain-and-discard up to a cap, then respond** | **400** | **400** |

**Why it is not fixed.** Only draining works, and draining means the bridge **reads an
arbitrary volume from a hostile client and throws it away** — trading a real hardening
property (the memory/bandwidth bound) for a better error message on a path the console
cannot reach, since the UI's largest body is a creator reference. That trade is the wrong way
round. **An up-front `content-length` check was also measured and rejected:** it only moves
the threshold to 4 MB (strategy 1 above still resets there), leaving the class intact, and it
would place a second enforcement site beside `readBody` — contradicting that function's own
stated reason for existing ("this is the one function that owns what a body may be"). A guard
that shifts a threshold without removing a failure mode is the exact shape this review keeps
finding, and adding one here to look thorough would be the wrong lesson to take from it.

Recorded in `lib/http.mjs` at `readBody`, with the numbers, so the next seat does not
re-litigate it — and so nobody mistakes it for an oversight.

### Checked CLEAN — the instance guards, and four framing paths that had no coverage

- **Both pid guards already refuse garbage correctly.** `console/lib/instance.mjs:57` and the
  engine's `lib/lock.mjs:72` each open with `if (!Number.isInteger(pid) || pid <= 0) return
  false`, so a pid file containing `abc`, `-1`, `0`, `null` or `1e999` is judged **not alive**
  and reclaimed rather than raising. A `process.kill` on a garbage pid would have thrown
  `ERR_OUT_OF_RANGE` — the S1-H1 shape — and it cannot. `readLock` additionally treats an
  unparseable lock file as `{ambiguous: true}` rather than absent, which is the correct
  direction. The only residue is cosmetic: `Number.isInteger("1234")` is false, so a pid
  stored as a *string* would be reported `(dead)` while held. The engine writes a number.
- **Four framing paths had no test at all** and now do (T-B23). Every existing body test used
  a small, well-formed, content-length-framed, valid-UTF-8 body. Unmeasured until now: a body
  **at** the ceiling (proving the boundary is `>` and not `>=`), a body over it, a **chunked**
  body with no `content-length`, a body that is **not valid UTF-8**, and a POST with **no
  body**.
- **A truncated body is handled by Node's parser, not by the envelope.** Declaring
  `Content-Length: 100` and sending 10 bytes with FIN gives `400` with an empty body — that
  is Node's own HTTP parser rejecting the incomplete message, below the application layer.
  Same for a negative `content-length`, a garbage chunk size, and a `content-length` smaller
  than the bytes actually sent. All four are correct and none of them is the bridge's to fix.
- **Invalid UTF-8 is a 400, not a 500.** `Buffer.toString('utf8')` maps the bad bytes to
  U+FFFD, `JSON.parse` then fails, and the route answers the documented envelope.

### Pass 4 — verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 5.03 s** (99 → 105: T-B23a–f) |
| Web suite | **48/48 pass** (unchanged) |
| Rule 4 | 0 files over. `http.mjs` 242 → **266**, `server.mjs` 300, `validate.ts` 162 |
| Mutation check | 2 mutations → **exactly one test each, complementary** (below) |
| Engine boundary | **zero engine files edited** (pass 4 either) |
| Oversized-body survival | bridge serving `200` after every hostile body, incl. 4 MB |

**Mutation evidence (§11 discipline).** The two mutations are *complementary*, which is what
makes them evidence rather than noise:

| Mutation | Fails | Stays green |
|---|---|---|
| the ceiling check deleted outright | **T-B23b only** | **T-B23a** (the control — a 64 KB body still reaches `validateRef`) |
| `size > limit` → `size >= limit` | **T-B23a only** | **T-B23b** |

Deleting the guard fails the over-limit case and leaves the at-limit case passing; flipping
the comparison fails the at-limit case and leaves the over-limit case passing. Neither
mutation can be satisfied by a test that is not measuring the boundary, and together they pin
it from both sides.

**One assertion recorded as mutation-equivalent rather than silently kept.** T-B23f pins that
a POST with no body is a **400, never a 500** — a real contract. But the obvious mutation
(`return {}` → `return null` for zero chunks) does **not** fail it, because `validateRef`
rejects `null` and `undefined` with the same message. The comment says so. An assertion whose
mutation is equivalent is worth knowing about rather than discovering later.

---

## 18. Round 5, pass 5 — the meta-pass: can every guard fail?

Passes 1–4 each mutation-verified **their own** new guards. That leaves the guards from
rounds 1–3, which were written before the discipline existed. Pass 5 asked the question
directly of them, in two stages: does every test assert anything at all, and does every
*load-bearing* guard have a test that fails when it is broken?

### Stage 1 — the mechanical scan: is any test assertion-free?

All 105 bridge tests and the web suite were split on their test registrations and counted for
assertions. **Seven bridge tests contain no `assert.` call** — and all seven are false
positives of the scan: they assert through throwing helpers (`assertCaught`,
`assertNoTranscriptFields`, which raise `AssertionError` internally). Notably the leak guard
already carries its own **META test** ("the detector fires on a real leak and spares real
prose"), which is precisely the discipline this pass exists to enforce.

**Result: zero decorative tests by this measure.** Recorded because a scan that finds nothing
is only reassuring if the method is stated.

### Stage 2 — a mutation sweep over the PRE-EXISTING guards

Four load-bearing guards from rounds 1–3, one mutation each, the **full** suite run for each,
the file restored from an in-memory copy and byte-verified. The sweep refuses to run at all
if the baseline is not green, and each anchor must occur exactly once.

| Mutation | Caught by |
|---|---|
| **M1** `hostAllowed` always allows (DNS-rebinding defence off) | **5 tests** — HY4-H4 ×4, T-B18b |
| **M2** `resolveStatic` containment check removed | **NOTHING** — 105/105 green |
| **M3** `parseRequestUrl` no longer catches (the `GET //` crash path) | **2 tests** — T-B18a, T-B18c |
| **M4** `/api/status` carries a 50 000-char transcript-like field | **1 test** — HY4-H5 (INVARIANT) |

M1, M3 and M4 are healthy: the guards that protect the bridge are pinned by tests that bite.
**M2 is the interesting one**, and chasing it produced this pass's finding.

### S1-H20 — T-B12 could not fail, for two independent reasons (TEST, P3, REAL)

M2 removed the containment check from `resolveStatic` and **no test noticed**. The natural
reading — "traversal is untested" — is wrong, and establishing that required three separate
measurements:

1. **The live server never receives a `..`.** `parseRequestUrl` runs `new URL(rawUrl, base)`,
   which normalises dot-segments before anything else sees the path. Measured over a raw
   socket: `GET /../package.json` reaches `resolveStatic` as `/package.json`.
2. **The two resolver guards are mutually redundant.** With the containment check removed,
   `normalize()`'s dot-segment collapse still refuses all 15 hostile forms probed. With
   `normalize()` removed, the containment check still refuses them. **Neither single mutation
   is observable**, because each covers the other.
3. **The property IS covered — by HY4-H3.** Removing *both* resolver guards does get caught:
   `104/105`, and the single failure is `HY4-H3: static containment holds against a real
   document root`, which builds a temp document root containing a real file **inside** it and
   a real file **outside** it. That test is the one that can fail, and it does.

So this was **not** a coverage hole, and recording it as one would have been a false finding.
What *is* real is that **T-B12 was vacuous**, for two reasons that each independently made it
unfailable:

- **It could not construct its own attack.** It used `getRaw`, which is `fetch` — and `fetch`
  builds a `URL`, which normalises `/../` away **client-side**. `GET /../registry.json` left
  the test process as `GET /registry.json`. This is the same trap `fixtures.mjs` already
  documents for forbidden headers: *a test that cannot construct its own attack proves
  nothing.*
- **Its assertion was satisfied by any 404.** `!text.includes(CH_ONE)` against paths that
  resolve to files which do not exist beside `web/dist`. An unresolved static path answers
  **200 + the bridge page** (`server.mjs:165`), and the bridge page contains no channel id.

**Fix.** T-B12 now sends a **raw request line** — the only way a `..` reaches the wire — and
asserts two things: that the traversal target reaches neither the store nor a file outside
`dist`, and that it is **byte-identical** to the same target as URL parsing alone would
produce. That second assertion is the invariant that actually protects the live server, and it
is the one that can fail: with all three layers broken it fails, and **it is the only test
that does** (measured: 5/6 in the boundary suite, T-B12 the sole failure).

**The comment on the test now states the limit rather than hiding it.** T-B12 is *not* claimed
as mutation-observable, because no single-line mutation can make it fail — three mutually
redundant layers defend that path, and that is a property of the design, not a defect. The
resolver-level property is HY4-H3's job, and the comment says so, so the next seat does not
re-derive this.

**A correction that belongs in the record.** My first reading of M2 was "the traversal guard
has no coverage" — a P2-class finding, and wrong. It survived only until I measured HY4-H3
against the double mutation. The sweep's value came from the *discipline of checking the
reading*, not from the reading itself; a single-guard mutation that nothing catches is
evidence about **redundancy**, and it is not evidence about coverage until you have tried
breaking the other guards too.

### S1-H21 — the traversal test was squatting on another test's ID (DOC/ID, P3, REAL)

Found while rewriting T-B12, and independent of it: **`T-B12` named two different tests.**
`06-test-plan.md:26` reserves T-B12 for the **S7 snapshot verification** (per-file SHA-256s
against the recorded manifest, mapped to R15), and `readiness.json` carries a matching T-B12
row with status `NOT RUN`. The traversal test in `bridge.boundary.test.mjs` used the same ID.

The damage is traceability, which is the one thing this packet's gate exists to provide: the
gate's row and the code's test agreed on a name and on **nothing else**, and the traversal
property was traced to **no requirement at all** — it appears in neither R13's nor any other
row. A reader following T-B12 from the plan would have landed on the wrong test, and a reader
following it from the code would have concluded S7's snapshot verification was implemented.

**Fix.** Renumbered to the next free ID, **T-B24**, and traced to **R13** alongside T-B23. The
plan's T-B12 keeps its S7 meaning; the historical note in `bridge.hy4.test.mjs` names both IDs
so the earlier review's language still resolves. Recorded because an ID collision is exactly
the kind of defect a green suite cannot see.

### Pass 5 — verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 4.39 s** |
| Web suite | **48/48 pass** (unchanged) |
| Rule 4 | 0 files over. `http.mjs` 266, `bridge.boundary.test.mjs` 208, `server.mjs` 300 |
| Assertion scan | 105 + 37 tests; **0 assertion-free** (7 candidates, all helper-based) |
| Mutation sweep | 4 mutations, baseline-gated, each restored **byte-identical**, final baseline re-checked green |
| Engine boundary | **zero engine files edited** (all five passes) |
| Sweep safety | refuses to run on a non-green baseline; aborts if any file fails to restore |

---

## 19. The `server.mjs` split — clearing S2's structural blocker

Not a hostile finding: a **remediation** of one this packet had been carrying since S1-H11,
and the last item on the round-5 work list.

### The blocker

`server.mjs` sat at **exactly 300 lines** — the repo's hard cap (CLAUDE.md rule 4) with
**zero headroom**. S1-H11's fix had to be written *net-neutral* to fit, which is the point at
which a cap stops describing the code and starts distorting it. S2 could not add a route
without either breaching the cap or making an unrelated cut, so `nextSlice` recorded a
decision for Sean: split, or raise the cap. **Raising it was never the right answer** — it is
a repo-wide governance change (`CLAUDE.md` rule 4), and the file was genuinely two things
wearing one name.

### The split

On the seam `server.mjs`'s own docstring already named — *"the ROUTE TABLE and the process
lifecycle, and nothing else"*:

| | Before | After |
|---|---|---|
| `server.mjs` | **300** | **244** — lifecycle: construction, the Host gate, the parse, the envelope, listen/shutdown, browser open, CLI entry |
| `routes.mjs` | — | **131** — the route table, the named 404, the static fallback, `BRIDGE_PAGE` |

**Two gates deliberately stayed in `server.mjs`.** The Host check runs *before* the route
table and the envelope wraps *around* it, so neither is reachable by — or visible to — any
individual route. Keeping both there makes that structural rather than conventional, and it
means the DNS-rebinding defence cannot be bypassed by adding a route. `parseRequestUrl` also
stayed, because it must run inside the `try`; that placement **is** the S1-H8 fix.

### The one real risk, and what was done about it

`HY4-H6` reads the dispatch table **as text** and compares the extracted routes against a
declared allowlist — the check that makes R9 ("no dangerous route may appear unnoticed")
reviewable rather than decorative. Moving the table would have left a hole big enough to drive
that check through: a route added back into `server.mjs` would be dispatched by the bridge and
invisible to the test.

**So the extractor now reads `routes.mjs` AND `server.mjs`, concatenated** — strictly stronger
than before, since it previously read one file and now reads the whole bridge. Verified by
mutation: adding `GET /api/danger` to `server.mjs` turns `HY4-H6` red with *"the bridge
dispatches routes that are NOT in the S0 allowlist: GET /api/danger"*.

### Verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 4.61 s** — unchanged by the move |
| Web suite | **48/48 pass** |
| `tsc --noEmit` | **0 errors** |
| `npm run build` | clean |
| Rule 4 | largest console source is now **283** (`health.history.test.mjs`); `server.mjs` **244**, `routes.mjs` **131** — the cap is no longer binding anywhere |
| Allowlist check | reads both files; **mutation-verified** to catch a route added to either |
| Engine boundary | **zero engine files edited** |

**What this unblocks.** S2 no longer needs a cap decision, and S1-H11's net-neutral constraint
is gone. **S1-H12 remains the blocker for the add UI** — `POST /api/creators` still resolves
through `execFileSync` and freezes the bridge's only thread (measured 1577 ms, ceiling 180 s).
That one needs an engine change and is Sean's call.

=== END DOCUMENT: 16-s1-hostile-review.md ===


=== BEGIN DOCUMENT: README.md — PACKET README AND STATUS ===

# Creator Brains Console — Mega Blueprints planning packet

- **Date:** 2026-09-17 · **Updated:** 2026-09-19 · **Status:** S0 + **S1 SHIPPED** (structural gate PASS; console suite **105/105 real tests**, S1 web **48/48** after the round-4 fix pass and the full round-5 five-pass sweep) · **Builder seat:** ZCode/GLM, then builder seat (Sable) · **Astra adjudication:** brief scheduled 2026-09-19 22:30
- **What this is:** the canonical plan for replacing the Creator Brains terminal menu with a Swan-designed, three.js operator console — **standalone first** (Desktop `.cmd`, loopback bridge, browser), then **duplicated at its best state and transferred** into SwanGuard-Newsroom (`@family-first/web`, React 18 + styled-components) as a modular adapter-driven component. Purely additive: the engine (`scripts/creator-brains/`) is untouched.
- ** Sean decisions pending:** (1) **"go" for S2** (roster + writes + BrainDrawer) — S1's exit criteria are met; (2) **the `server.mjs` cap call** — it sits at exactly 300, so S2's first route breaks rule 4 (16 §13); (3) the Astra D1–D9 adjudication itself (brief auto-written 2026-09-19 22:30); (4) **S1-H12 — `POST /api/creators` freezes the bridge's only thread** (measured 1577 ms, ceiling 180 s), unfixed because the honest fixes touch the engine (16 §14); (5) **S1-H14 — the engine gate is RED in this tree** because `consistency-check.mjs` walks `console/web/node_modules`, so the packet's own "npm deps live in `console/web/`" rule breaks the engine's C1 check (16 §14). **Closed 2026-09-18:** CD3 locked; C1 loading contract; S1 authorised and shipped; the 24 dangling skill symlinks repaired; the S1 hostile review round 4 (8 defects, all fixed). **Superseded 2026-09-19:** the "F4 baseline of record = 183/183" and the "console suite 97/97" figure — see (5) and **16 §14** (S1-H13: the 97 was 85 real tests counted 3×). See **14** and **16**.

## Read order

| File | Part |
|---|---|
| `00-consult-brief.md` | the brief sent to Astra (attempt recorded in 09 §3) |
| `01-requirements.md` | R1–R16, acceptance criteria, invariants, non-goals |
| `02-blueprint.md` | topology, components, integration seams, concept directions, D1–D9, budgets, rollback |
| `03-wireframes.md` | ASCII desktop + mobile + full state matrix |
| `04-flows.md` | mermaid: daily pass, add→enable→build, query, failure/rollback, S7 transfer |
| `05-contracts.md` | `ConsoleDataAdapter`, bridge HTTP API + error envelope, data-truth map, trust boundary |
| `06-test-plan.md` | T-B/T-W/T-T/T-E suites, RED-first, isolated resources |
| `07-traceability.md` | R → AC → artifact → test → slice |
| `08-slices-operations.md` | S0–S7 with entry/exit evidence, launcher ops, no-go boundaries |
| `09-hostile-review.md` | self-hostile pass (H1–H10), decision log, Astra record, readiness verdict |
| `11-hy4-review.md` | **independent HY4 hostile review** (verdict REVISE), findings + dispositions, remediation receipt, spend |
| `12-hy4-review-round2.md` | round-2 deeper pass (H1 failure-caching, H2 leak-guard false negatives, F2/F3/F4, C1); F1 retracted as the builder's own error |
| `13-hostile-round3.md` | round-3 dry loop (H3 in-process double-bridge, H4 counter bug) + the CLEAN surfaces that closed the loop |
| `14-decisions-20260918.md` | **the six decisions taken 2026-09-18** (symlink repair, F4 baseline, C1 contract, S1, Astra, S5) + H5 |
| `15-astra-brief.md` | _(reserved — written by the 2026-09-19 22:30 automation; D1–D9 adjudication brief)_ |
| `16-s1-hostile-review.md` | **round-4 hostile review of S1** (S1-H1…H8: the 500 landmine, three false-zero renders, the wedged poll loop, fixture infidelity, two guard tests that could not fail, and a **one-line request that killed the bridge process**) + mutation receipts |
| `readiness.json` | structural receipt — **gate PASS** (`check-readiness.mjs`, exit 0) |
| `evidence/` | engine offline baseline + preservation manifest |

## Receipts (honest, this session)

- **Engine baseline [VERIFIED]:** documented offline command, 15 files → **136 tests / 136 pass / 0 fail**, exit 0 (`evidence/baseline-offline.txt`, HEAD `8a9daeeba` era tree, uncommitted docs only). Observation: README cites 191 at commit time (Sep 15) — delta noted for the engine lane; not a console blocker.
- **Astra consult [VERIFIED]:** one authorized attempt → `codex_exec_failed` before any provider call (harness passed `--ask-for-approval`, **removed in codex-cli 0.154.0**). Harness repaired + pinned by tests (**10/10 green**); follow-up probe reached the provider and hit the seat's usage limit ("try again Sep 19th, 10:12 PM"). No auto-retry (exactly-one). Detail: 09 §3.
- **Readiness gate [VERIFIED]:** `node scripts/build-protocol/check-readiness.mjs <receipt> <packet>` → `structurallyReady: true`, exit 0. Reference integrity only.
- **HY4 hostile review [VERIFIED]:** independent seat (`tencent/hy4-preview`) → **verdict REVISE, 7 findings**. All 7 closed + **1 additional defect found during remediation** (per-request blocking `selfCheck()`). Console suite **65/65 pass, 0 fail** (8.8 s). Cost **$0.0563** (one $0 transport failure + one billed call). Full detail: **11**.
- **S0 bridge [VERIFIED — SHIPPED]:** `scripts/creator-brains/console/**` — nine-route allowlist, loopback-only bind, `hostAllowed` DNS-rebinding gate, `O_CREAT|O_EXCL` single-instance guard, 60 s TTL health cache. Additive only: `git status --porcelain scripts/creator-brains/` → just `?? .../console/`.
- **CD3 LOCKED (Sean, 2026-09-17):** concept direction = **CD3 "Vault Observatory"** — split view, three.js constellation left / operations deck right, one short entry dolly, skipped under `prefers-reduced-motion`. Gates S5 only; S0–S4 are direction-independent.
- **S1 web scaffold [VERIFIED — SHIPPED 2026-09-18]:** `console/web/**` — Vite + React 18 + styled-components, `tokens.css` (design.md §4 verbatim), `ConsoleDataAdapter` + `Local`/`Mock`, shell + `StatusBoard`. **31 web tests pass / 0 fail · `tsc --noEmit` 0 errors · build 49 modules in 526 ms · initial bundle 180.35 kB → 60.21 kB gz** (budget 500 kB gz). S0 unregressed: **81/81**. Detail: **14 §4**.
- **S1 hostile review round 4 [FIXED 2026-09-18]:** the slice was reviewed *after* shipping green, and found **8 defects** — 5 in code, 1 in fixtures, **2 in the tests themselves**. Three were P1-class: a corrupt `state.json` **500'd `/api/status`**, destroying the very damage-reporting path R3 exists to provide (S1-H1); the rule-4 cap test collected `.mjs` only, so **the entire `console/web/` tree was unmeasured** and the cap could not fail on any UI file (S1-H7); and **`GET // HTTP/1.1` killed the bridge process outright** — `new URL` throws on protocol-relative targets and the parse sat outside the handler's `try`, so the throw became a process exit with no response to the client (S1-H8). Also: a fabricated `0 in flight · 0 swept` census, `documents: 0` rendered as a real count, a poll loop a single hung request could wedge permanently, and fixtures describing payloads the bridge never returns. **All 8 fixed and mutation-verified** — each new guard was proved to bite by breaking the code it guards. Console **97/97** ⚠️ *(that figure was inflated — 85 real tests counted 3×, corrected by round 5; see below)*, web **39/39**, `tsc` 0, build **60.39 kB gz**, e2e **12/12**, rule 4 **41 sources walked / 0 over**, static containment **30/30 refused**. Detail: **16**.

- **Round-5 pass 1 — the WRITE path [FIXED 2026-09-19]:** Rounds 1–4 never pointed a hostile probe at `POST`/`PATCH`, and the worst finding of the round was waiting there. **S1-H9 (P1):** `PATCH /api/creators/:id` with a damaged `state.json` answered **409 STORE_DAMAGED while the write was already on disk** — the handler re-read the *roster* (which legitimately 409s on a damaged state) to shape its response row, so a committed mutation was reported as a refusal and the operator had **no surface that could tell the truth** (`/api/creators` 409s on the same fault). Since `setEnabled` is by the engine's own description the only way a creator starts being fetched, that is a consent-state divergence, not an error-code nit. **S1-H10:** a literal `null` body → **500 INTERNAL** on both write routes (`readBody` returned `null`; every other non-object survived only by luck). **S1-H11:** the static fallthrough answered **200 + an HTML page for every method** on every non-API path — the "silent fallthrough" the route table's own comment forbids. **S1-H13 (measurement):** `withFixture` was exported from a `.test.mjs` file, so three importers re-registered the boundary suite — the suite reported **97 tests for 85 real ones** and took 20 s instead of 4.3 s; the harness now lives in `fixtures.mjs` and the suite is **93 real tests in 3.9 s**. All fixed, mutation-verified (3 mutations → exactly 6 tests red, with 2 controls staying green), and **T-B19/T-B20/T-B21** registered with the gate green. **Two items escalated, not fixed** — S1-H12 and S1-H14 (see *Sean decisions pending*). Detail: **16 §14**.
- **Round-5 pass 2 — the READ path and the LANE B boundary [FIXED 2026-09-19]:** the one route whose entire job is to show a published brain had **never once returned a brain**. **S1-H15 (P1):** `GET /api/brains/:slug` answered **200 with `index`/`topics`/`timeline` all empty** — correct slug, correct generation, correct title, no content — for every published brain, because `brainDoc` joined `brains/<slug>` while the engine publishes into `brains/<slug>/<generation>/` (`render.mjs` `publishBrain` writes the documents, then swaps `current.json` last). An empty brain is indistinguishable from a brain with no claims, and R6's acceptance criterion is "published-generation only". A missing document is now **reported** through the payload's previously-always-`[]` `skipped` array, so "absent" and "empty" are different answers. **S1-H16:** the route's 200 path had **no coverage at all** — `seedStore` leaves `brains/` empty, so every `/api/brains/*` assertion in the suite hit the 404 branch; that is why H15 survived. `fixtures.mjs` gained `seedPublishedBrain()`, and `T-B7`'s invariant sweep gained a **live** published namespace plus the hostile forms it never carried. **Containment re-verified from both directions:** `:slug` arrives un-decoded (contained by the pointer gate) and `?creator=` arrives decoded (contained because `query.mjs:55` uses it as an **exact comparison**, never a path); **0 canary hits across 20 read probes**. Bridge **99/99**, mutation-verified both ways (generation ignored → T-B22a/b fail; pointer gate removed → T-B22d fails while a/b/c stay green). Detail: **16 §15**.
- **Round-5 pass 3 — the UI payload shape [FIXED 2026-09-19]:** the first pass to point a probe at `console/web/`, and it found that the slice's **entire** defence against a payload it did not expect was that no component happened to throw on the payloads anyone had tried. **S1-H17 (P1):** `StatusBoard` dereferences ~13 top-level paths on its first ready render and **there was no error boundary anywhere in the tree**, so a single missing key unmounted the React root and left a **blank console** — no reading, no message, no clue which field was wrong. Measured RED-first (`TypeError: status.backlog.lines.join is not a function`, `StatusBoard.tsx:206`, *Uncaught*). This is a *supported* state, not a hypothetical: `console/web/dist/` is a build artifact served by a **separately versioned** bridge. It survived four rounds because every fixture is typed `StatusInstrument`, so TypeScript made a wrong-shaped payload look impossible — **the type system was the only guard, and it does not run at runtime**. **S1-H18:** `LocalEngineAdapter.request` ended `return body as T` — an unchecked cast, so a 200 that was not the contract was indistinguishable from a good reading all the way down to the component. **Fixed in two deliberate layers:** a shape validator at the adapter seam (`adapters/validate.ts`) turns a wrong-shaped 200 into a typed `ConsoleApiError` **naming the offending path** — which `useStatus` already caught and `StatusBoard` already rendered, so the board stays up and the next poll can still recover it — plus `components/ErrorBoundary.tsx` as the last resort, mounted inside `App` (so the shell header survives) and in `main.tsx`. The boundary **latches** rather than self-clearing, deliberately: a self-clearing boundary would re-throw on every 5 s poll forever. Web **48/48** (39 → 48, T-W11a–i), mutation-verified in three orthogonal directions — weakening the deep `backlog.lines` check failed **only** T-W11e, dropping `recentRuns` failed **only** T-W11f, and disabling the boundary failed **exactly** the four boundary cases while **every** validator test and **both** healthy-payload controls stayed green. Also corrected eight stale `"97/97"` counts that round-5 pass 1 had falsified but left in the gate file. Detail: **16 §16**.
- **Round-5 pass 4 — the request body and the instance guards [2026-09-19]:** the instance guards came back **clean** — both pid paths (`console/lib/instance.mjs:57` and the engine's `lib/lock.mjs:72`) open with `Number.isInteger` guards, so a pid file holding `abc`, `-1` or `null` is judged dead and reclaimed instead of raising `ERR_OUT_OF_RANGE`, which is the S1-H1 shape and it cannot happen. The body path produced **S1-H19 (P3, REAL, accepted not fixed):** the 64 KB ceiling holds and the process always survives, but for a body larger than the **socket buffer** the client sees `ECONNRESET` instead of the documented envelope — measured over raw sockets, clean `400` at 65 537 B through 512 KB, reset at 1 MB and 4 MB. The threshold tracking the socket buffer is what identifies the mechanism: the `throw` inside `for await` destroys the request stream, so a client still *writing* gets RST and the response is lost in flight. Three fixes were measured against a minimal server — responding early, responding then destroying, and draining — and **only draining works**, which would mean reading an arbitrary volume from a hostile client and discarding it: a real hardening property traded for a better error message on a path the console cannot reach. **Declined, with the trade recorded**, and the up-front `content-length` check rejected too (it only moves the threshold to 4 MB and adds a second enforcement site beside `readBody`). Four framing paths that had **no coverage at all** are now pinned by T-B23 — body at the ceiling, chunked with no `content-length`, invalid UTF-8, empty POST — and the two mutations are complementary (deleting the ceiling fails only T-B23b; flipping `>` to `>=` fails only T-B23a). Bridge **105/105**. Detail: **16 §17**.
- **Round-5 pass 5 — the meta-pass: can every guard fail? [2026-09-19]:** the pass that audits the audits. **Stage 1** counted assertions in every test: **zero decorative tests** (seven bridge tests contain no `assert.` and all seven assert through throwing helpers; the leak guard even carries its own META test). **Stage 2** ran a mutation sweep over the guards from rounds 1–3, which predate the discipline — one mutation each, full suite per mutation, file restored byte-identical, baseline-gated. Three came back healthy: `hostAllowed` disabled → **5 tests** catch it; `parseRequestUrl` made non-total (the `GET //` crash) → **2 tests**; a 50 000-char transcript-like field added to `/api/status` → **HY4-H5**. **The fourth is the finding.** **S1-H20 (TEST, P3):** removing `resolveStatic`'s containment check was caught by **nothing** — and chasing that produced a genuine correction to my own reading. The property *is* covered: removing **both** resolver guards makes **HY4-H3** fail (104/105), and HY4-H3 is the test that builds a real document root with a real file outside it. What was actually wrong is that **the traversal test could not fail, for two independent reasons**: it used `fetch` (which normalises `/../` away **client-side**, so it never sent a traversal at all — the same trap `fixtures.mjs` already documents for forbidden headers), and its `!text.includes(CH_ONE)` assertion was satisfied by any 404, since an unresolved static path answers 200 + the bridge page. Rewritten to send a **raw request line** and to assert the traversal target is byte-identical to its URL-normalised form — falsifiable, and measured to fail (alone) when all three static-defence layers break. **S1-H21 (DOC/ID, P3):** found in passing — **`T-B12` named two different tests**: the plan and the gate reserve it for S7's snapshot verification (R15), while the code used it for traversal, which was traced to **no requirement at all**. Renumbered **T-B24** and traced to R13. Bridge **105/105**, rule 4 0 over. Detail: **16 §18**.
- **The `server.mjs` split — S2's structural blocker cleared [2026-09-19]:** `server.mjs` had sat at **exactly 300 lines** — the repo's hard cap with **zero headroom** — since S1-H11's fix had to be shaped *net-neutral* to fit it. That is the point at which a cap stops describing the code and starts distorting it, and it was blocking S2 from adding a route. Split on the seam the file's own docstring named (*"the ROUTE TABLE and the process lifecycle, and nothing else"*): **`server.mjs` 300 → 244** (lifecycle only) and a new **`routes.mjs` at 131** (route table, named 404, static fallback). **The cap was NOT raised** — that is a repo-wide governance change and the file was genuinely two things wearing one name. **Two gates stayed put deliberately:** the Host check runs *before* the table and the error envelope *around* it, so keeping them in `server.mjs` makes the DNS-rebinding defence structural rather than conventional, and no route can bypass it; `parseRequestUrl` stayed because it must run inside the `try` — that placement **is** the S1-H8 fix. **The one real risk was `HY4-H6`**, which reads the dispatch table as text to bind the allowlist: moving the table would have let a route added back into `server.mjs` be dispatched and stay invisible. The extractor now reads **both files concatenated** — strictly stronger — and is **mutation-verified**: adding `GET /api/danger` to `server.mjs` turns it red. Bridge **105/105**, web 48/48, `tsc` 0, build clean, rule 4 now peaks at **283** with the cap binding nowhere. Detail: **16 §19**.
- **F4 baseline of record [VERIFIED 2026-09-18 · ⚠️ SUPERSEDED 2026-09-19]:** engine suite excluding `live.test.mjs` → **183 tests / 183 pass / 0 fail, 25 files, ~34 s**. Supersedes the four legacy figures (136/136, 191, 182/189, 185); none of them matched. `live.test.mjs` is excluded — network behaviour is the engine lane's own test, per 06. **⚠️ This figure no longer reproduces in the working tree: 181 pass, with `C1` failing deterministically because `consistency-check.mjs` walks `console/web/node_modules`, and `HR14f` flaky under full-suite load (6/6 in isolation). See S1-H14 in *Sean decisions pending* and 16 §14. Do not quote 183/183 until the walk is fixed or the console moves.** Detail: **14 §2**.
- **C1 loading contract [DECIDED 2026-09-18]:** the three chunk was labelled "lazy" but under CD3 the constellation is on screen at first paint, so viewport-enter ≈ eager (~1.4 MB perceived). Re-scoped to a real deferral: idle-after-first-poll fetch, static placeholder at first paint, and **zero fetch under reduced-motion or absent WebGL**. Binds S5 + T-E3. Detail: **14 §3**.
- **Repo symlink repair [VERIFIED 2026-09-18]:** the repo move to `Desktop/@Everything/...` left **24 absolute skill symlinks dangling**; git counted every file inside them as deleted, which is where the reported "119 deletions" came from. **Nothing was deleted.** Restored from `HEAD` (git tracks those paths as regular files, and all 34 working entries are real directories — so real directories are the committed truth, not links). Result: **119 → 2 deletions, 0 dangling**; `prompt-watcher/SKILL.md`'s local edit preserved. Detail: **14 §1**.
- **H5 [FIXED 2026-09-18]:** adding `console/web/` put a `node_modules` tree under `CONSOLE_ROOT`, and the suite's own rule-4 cap test began measuring ~184 installed packages. Fixed with an explicit `NOT_OUR_SOURCE` skip + one shared `walkConsoleSources`; the cap itself was **not** relaxed. Detail: **14 §5**.

## Sean decisions pending

1. **"go" for slice S2** — roster + writes (`addCreator` / `setEnabled`) + `BrainDrawer`. S1's exit evidence is green, so S2's entry criteria are met. **Two things must be settled before S2 ships, not before it starts:** the `server.mjs` cap (below) and **S1-H12** (below).
2. **`server.mjs` is at exactly 300 lines — the rule-4 cap.** Compliant today, but **the first route S2 adds breaks it.** Either split `server.mjs` (router/registration split) or raise the repo-wide cap. Rule 4 is a CLAUDE.md rule, so this is Sean's call, not the builder's. Detail: **16 §13**. *(Round 5 sharpened this: the S1-H11 fix had to be shaped net-neutral in line count to avoid breaching the cap mid-fix — the cap is now costing real work, not just headroom.)*
3. **Astra D1–D9 adjudication** — no longer a scheduling question: an automation fires **2026-09-19 22:30** to write `15-astra-brief.md` (preparation only, no spend; Astra rides the Codex subscription). What remains for Sean is the adjudication itself, which does not gate S2–S4.
4. **NEW — S1-H12: `POST /api/creators` freezes the bridge's only thread.** The engine resolves a creator reference through `execFileSync` (`lib/ytdlp.mjs:184`), so one add blocks every other request — **measured 1577 ms for a failing lookup, ceiling 180 s**. `/api/status` pays the *same* blocking call but is TTL-cached precisely because `health.mjs` named the pattern a design defect; the write path got no such mitigation. **S2 must resolve this before shipping the add UI.** The honest fixes are (a) make the engine's resolver async — `addCreator` would need `await resolve(...)`, and `deps.resolveCreator` cannot be fixed from the console side because a returned Promise fails the `resolved.channelId` check — or (b) stop serving the add synchronously (202 + a job). **(a) touches the engine**, which SOUL.md forbids doing to make the console look better, so this is Sean's call. Detail: **16 §14**.
5. **NEW — S1-H14: the engine gate is RED in this working tree, and the packet's own rule caused it.** `consistency-check.mjs` walks `scripts/creator-brains/**` for `*.mjs` with no `node_modules` skip, so it collects **71 third-party files** from `console/web/node_modules` and fails C1 deterministically (*largest = 4914 lines*, `decimal.js`). The console is inside the engine tree **because the packet says npm deps belong in `console/web/`** — the rule and the gate contradict each other. **Consequence: the F4 baseline of record (183/183) no longer holds** (this tree: 181 pass, C1 deterministic, `HR14f` flaky under load). Not caused by round 5 — `node_modules` is gitignored and dates to 2026-09-18 13:02. The console's *own* cap walk already learned to skip third-party code (H5, `NOT_OUR_SOURCE`); the engine's walk never did. Fix is one line, but it is an **engine** file, so it is Sean's call. Detail: **16 §14**.

## Uncommitted changes owned by this slice (rule 67 explicit paths)

- `docs/ai-workflow/blueprints/creator-brains-console-20260917/**` (this packet)
- `scripts/mcp/swan-council-subscription.mjs` + `.test.mjs` (flag-drift repair, 10/10)
- `.ai-workflow/coordination/zcode-glm--creator-brains-console-20260917.lane.md`, `review-queue.md` (append)

=== END DOCUMENT: README.md ===
