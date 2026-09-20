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
