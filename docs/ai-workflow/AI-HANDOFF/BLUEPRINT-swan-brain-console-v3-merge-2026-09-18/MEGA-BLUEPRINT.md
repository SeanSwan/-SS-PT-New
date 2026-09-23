# MEGA-BLUEPRINT — Swan Brain Console V3: merge, surface, and repair

**Status:** EXECUTION-READY (v1.0, 2026-09-18) · **Decision authority for this packet**
**Inputs:** the four V3 review rounds on disk (`SWAN-BRAIN-CONSOLE-V3-READINESS-RECEIPT-2026-09-13.md`
§10–§16, `ZCODE-HOSTILE-ROUND4-SWAN-BRAIN-CONSOLE-V3-2026-09-15.md`), the rejected Aug-26 blueprint
(patterns only), and a fresh independent re-verification run this session.
**Builder:** any competent seat. **Doctrine:** `fable-blueprint-forge` — every builder decision is
pre-made here.

---

## 0. The question Sean asked, restated exactly

> *"these are supposed to be merged. the swan brain can be what you suggest is better — a MCP
> server / dashboard / a CLI or what. here is the context of this so you can see how mergable it is
> to make this all one app and if it is a good idea."*

Two questions hide inside that one sentence, and they have **opposite** answers:

- **"Should these be one app?"** → **No.** There are two load-bearing reasons the separation exists.
- **"Should the Swan Brain have one front door?"** → **Yes**, and it does not have one today.

---

## 1. THE RULING

### 1.1 It is not MCP *or* dashboard *or* CLI. It is all three, in three layers.

These are not competing product shapes. They are three tiers of one system, and the current code
already contains the seam that proves it:

> `SWAN-BRAIN-CONSOLE-V3-READINESS-RECEIPT-2026-09-13.md` §16.1 —
> *"Machine surface for agents: `GET /api/state` returns the full structured snapshot (fleet,
> doctrine, engine state) — agents integrate through that, humans through the UI."*

That sentence **is** the MCP design. The console already serves a machine-readable snapshot; it
simply is not exposed over a protocol an agent can discover. MCP is therefore an *adapter over an
interface that already exists* — days of work, not a rewrite.

| Layer | Role | Owns | Why it must stay this layer |
|---|---|---|---|
| **CLI / engine** | substrate | `scripts/design-brain/*`, `consult-*.mjs`, verifiers | Deterministic, scriptable, CI-runnable, no UI. **This is the only layer allowed to write.** |
| **MCP server** | agent interface | a thin read-only adapter over `GET /api/state` + design-brain read CLIs | Discovery. An agent should not have to *know* the console exists. |
| **Dashboard** | human surface | one shell, registry-driven tabs | Judgement. Sean needs to see 20 variants and pick. |
| **CLI again** | the human path when a browser is wrong | same engine, unchanged | Never remove it. A dashboard that becomes the only way in is a dashboard that can lie without appeal. |

### 1.2 Do NOT merge into one app. Merge into one **door**.

Three concrete reasons the merge Sean proposed is a bad idea as stated — each is a *property of the
existing code*, not a preference:

1. **The console is deliberately outside the SaaS design system.** The Aug-26 blueprint (rejected as
   architecture, correct on this point) states it: *"It is not a React app inside SwanStudios. It is
   an operator tool, and per the taste-brain ruling, operator tools sit outside the SaaS
   styled-components/Victory rules — judging design well requires a neutral surface that does not
   itself argue for a palette."* Merging the console into the app makes the surface that *judges*
   the design system *part of* the design system. That is a category error with a real cost.
2. **The taste-brain indexes a third-party copyrighted corpus.** `swan-taste-brain/sources/midlibrary/`
   is third-party material and lives **outside** SS-PT by design; the console "cites and links, it
   never copies material in." Merging it into the repo puts licensed corpus material next to repo
   doctrine.
3. **The learning engine is fail-closed, and the console is GET-only, on purpose.** Merging them
   into one app creates pressure for one shared write path. The single most important invariant in
   this workstream is that **no surface may write to the engine or promote a claim.** A monolith
   erodes that; a federation with a read-only door cannot.

**What "one door" means in practice** (the cheap, correct version of Sean's instinct): one shell, one
URL, N panels — where a new panel is **one registry row plus one module**, and the shell is never
edited. That is the Aug-26 pattern, kept:

```
console/tabs.json    {id, label, module, api}    — a new panel = one row + one app-<id>.js
console/sources.json {id, kind, path, note}      — a new corpus = one row, not new code
console/seats.json   {seat, script, billing, gate} — a new model = one row; gate:"relay" renders a stop-card
```

Registries are read at request time, so adding a panel needs no restart and no shell change.

### 1.3 The one thing that must NOT be merged, ever

**No write path may be added to any agent-facing surface.** The engine is fail-closed until a signed
source-classification authority adapter exists. `writeControls: []` is asserted by a test. The
console's refusal to offer a seat picker is not an oversight — the recorded Ox-as-Grok misfires
(`2026-08-24`, `2026-08-25`) are what happens when a seat is selected by an environment variable
that nothing verifies. **The MCP server inherits this: read and propose only. Never write.**

---

## 2. Locked decisions

| # | Decision | Choice | Source |
|---|---|---|---|
| D1 | Merge into one app? | **NO.** One shell + registries; separate processes, separate data roots | §1.2 |
| D2 | MCP server? | **YES, but read-only.** Adapter over `GET /api/state`; never a write tool | §1.1, §1.3 |
| D3 | Keep the CLI? | **YES.** It is the substrate and the only CI-runnable surface | §1.1 |
| D4 | Keep the dashboard? | **YES.** But stop building *new shells* — converge on one | §1.2 |
| D5 | Rebuild the console from scratch? | **NO.** Salvage, then extend. 66/66 tests pass today | §3 |
| D6 | Merge taste-brain into SS-PT? | **NO.** Copyright corpus boundary | §1.2(2) |
| D7 | Console gains a promote button? | **NO, ever.** Promotion is a reviewed commit | `06-bans.md` |
| D8 | Console gains a seat picker? | **NO** until a verified identity check exists | §1.3 |
| D9 | Engine writes from any surface? | **NO.** Fail-closed until the signed adapter lands | §1.3 |
| D10 | Slice order | **S0 salvage first**, then S1 MCP, then S2 judge mode | `05-slices.md` |
| D11 | Where does the work live? | A **live branch**, not `tmp/` (gitignored) | `01-architecture.md` §5 |

---

## 3. The finding that reorders everything: the work is unbacked

Established this session, by execution, not inference:

| Check | Command | Result |
|---|---|---|
| Is the work tracked? | `git log --all --oneline -- 'scripts/swan-brain-console/server.mjs'` | **empty — no commit in any ref contains it** |
| Is the fleet tracked? | `git log --all --diff-filter=A -- '*three-worlds*'` | **empty** |
| Is the directory even a git worktree? | `cat tmp/worktrees/brain-console-20260913/.git` | points to `SS-PT/.git/worktrees/brain-console-20260913` |
| Does that admin dir exist? | `ls SS-PT/.git/worktrees/` | **only `ss-media-api` — it is gone** |
| Can git read it? | `git status` in that directory | **`fatal: not a git repository`** |
| Is the claimed branch real? | `git branch -a \| grep swan-brain` | only `feat/swan-brain-v2-atelier`; **`feat/swan-brain-console-20260913` does not exist** |
| Is the directory protected by VCS? | `git check-ignore -v …` | `.gitignore:146:tmp/` — **ignored** |
| What would be lost? | `find … -type f` in the two scopes | **77 files** (~5,284 lines per the receipt) |

`aafe387a9` resolves as a commit — but `git log -1 aafe387a9` shows
`test(store): align marketing stats contract with StoreV3`, i.e. it is the **base**, and
`git ls-tree` against it returns **nothing** for either scope. The work is uncommitted changes on
top of that base, inside a directory that git has been told to ignore and can no longer resolve.

**Conclusion:** the console and the fleet exist in exactly one place. If `tmp/` is cleaned, they are
gone. This is not a hypothetical — it is the current state. **S0 is the salvage slice, and it is
first.**

---

## 4. Independent re-verification (this session, on the tree as it sits)

Sean's own context said *"other reported test results still require independent verification."*
Done, on the current tree:

| Gate | Documented | Round 1 | Round 2 (current) | Agreement |
|---|---|---|---|---|
| Engine contract (`node --test engine-contract.test.mjs`) | 12 | **12 pass / 0 fail** | **12 pass / 0 fail** | ✅ agrees |
| Server boundary (`server-contract.test.mjs`) | — | *did not exist* | **6 pass / 0 fail** | NEW |
| Fleet contract (`fleet.contract.test.ts`) | 17 | **17 pass** | **17 pass** | ✅ agrees |
| Runtime contract (`runtime.contract.test.ts`) | 47 | **49 pass** | **57 pass** | ⚠️ **docs stale by +2**, then +8 added |
| Combined vitest | 64 | **66 pass / 0 fail** | **74 pass / 0 fail** | ⚠️ same drift |
| `gallery-verify.mjs` | 109 | NOT RUN | **110/110 pass** | ✅ agrees (109 + 1 added) |
| `console-verify.mjs` | 17 | NOT RUN | **17/17 pass** | ✅ agrees |
| Scoped `tsc -p tsconfig.three-worlds.json` | 0 errors | NOT RUN | **exit 0, no output** | ✅ agrees |
| Project-wide `tsc --noEmit` | 0 errors | NOT RUN | **NOT RUN** | UNVERIFIED |
| `npm run verify` end to end | — | NOT RUN | **NOT RUN** | UNVERIFIED (ports 5199/4599 hardcoded; 5199 held by another workstream) |

**The three round-1 UNVERIFIED gates are now closed** — gallery, console and the scoped typecheck
were all run in round 2 and all agree with their documented values. The two that remain UNVERIFIED
are genuinely unrun, and neither is claimed as green anywhere.

**A note on this table's own history (round 2, Astra F12).** Round 1 recorded three gates as
UNVERIFIED while `09-tests.md` §8 reported them executed — because §8 was written *after* this
table. That is precisely the *"numbers a human maintains by hand go stale invisibly"* failure this
workstream exists to prevent, reproduced inside its own packet. One ledger now, updated in place.

**The +2 drift is itself a finding, and an ironic one.** The whole justification for the console is
that *"numbers a human maintains by hand go stale invisibly"* (blueprint §0). The receipt's own
test count went stale the same way. Two tests were added to `runtime.contract.test.ts` after the
count was written down. Severity: LOW. Lesson: **generate the count, never transcribe it** — and
that rule applies to the review documents too, not just the UI.

**Round 1 falsified nothing. Round 2 falsified eight claims** — see the review filed at
`Z:\HostileReviews` (round 2). Four of them were in this packet's own documents, and one of them
falsified a *correction* this packet had already made.

**The fourth round of the Astra review chain ran no suites, so this ledger is unchanged —
deliberately, and stated rather than implied.** It was a *plan* pass, not a measurement pass: the S4
and S5 slices were traced deliverable-by-deliverable against the files that would have to change for
each deliverable to exist. It found **four more defects of the same class (D18–D21)** and falsified
one of my own draft hypotheses — `liquid-surface` is real, a hero-mechanics value at
`threeWorldEntries.ts:123`, not a fabricated identifier as I had first concluded. **No number in the
table above moved, and none is claimed to.** Review filed as
`Z:\HostileReviews\2026-09-19-162737-swan-brain-console-v3-round-4-s4-s5-slice.md`.

> **On round numbers.** The "round 4" in §5 item 2 below and "round 4" in the review archive are
> different rounds of different chains — the first is the fleet workstream's fourth hostile pass, the
> second is the fourth round of the Astra review chain. Where it matters, cite the review by filename
> rather than by ordinal. This is the same rule as *"generate the count, never transcribe it"*: an
> ordinal is a hand-maintained number, and hand-maintained numbers go stale or collide.

---

## 5. What is genuinely good here (do not regress)

The hostile review's job is to find what is wrong; a dishonest one omits what is right. These are
load-bearing and must survive every subsequent slice:

1. **`engineState.mjs` is the best file in the workstream.** It refuses to emit a bare `BLOCKED`,
   distinguishes `DECLARED_BLOCKED` / `VERIFIED_BLOCKED` / `UNKNOWN`, **quotes the matched clause as
   evidence**, and guards against negation — so a README saying *"must no longer remain fail-closed"*
   yields `UNKNOWN`, not a confident block. That is a rare piece of honest instrumentation.
2. **`renderSlots.ts` — the 4-live-world pool** with off-screen hand-off is the correct answer to
   WebGL's ~8–16 context cap. Round 3 named it *"arithmetic, not a renderer mystery"*; round 4 found
   the hand-off had been **claimed but never implemented**, and fixed it with a test that can
   actually fail (`live set must CHANGE when the viewport moves`).
3. **Read-time counts everywhere.** `fleetData.mjs` imports the canonical `skeletons.ts` via Node's
   TS type-stripping so there is no second copy to drift. `registry.ts` is read as text only for
   prose fields.
4. **The console's honesty about what is not built.** Seats / Memory / Ship are placeholders that
   state *why*, with a "Do today instead" line. Most products fake these.
5. **The CI workflow's header** records its own reason for existing: *"a guard nobody runs is not a
   guard"* — and it names the three rounds where that mistake was repeated.

---

## 6. Slice order (detail in `05-slices.md`)

| # | Slice | Why here |
|---|---|---|
| **S0** | **Salvage to a live branch** | 77 files currently unbacked. Nothing else matters until this passes. |
| **S1** | **MCP server (read-only)** | The highest-leverage *new* surface: it makes the whole system discoverable to every agent Sean runs. |
| **S2** | **Judge Mode** | Sean's actual job is *picking winners*; today he has no instrument for it. |
| **S3** | **Registries + tab convergence** | Turns "one app?" into "one door" cheaply. |
| **S4** | Upgrade backlog | Adaptive context cap · screenshot-diff CI · copy gate surfaced · canvas-pixel contrast · promotion receipt. **⚠ D18/D20 — not executable as written: the cap probe is in the wrong runtime, and the screenshot diff has no baseline or comparator. See `04-build-order.md`.** |
| **S5** | Fidelity backlog | Lit families — closes the honest 8-families gap. **⚠ D19 — needs a real file table; `scenes/paramsCore.ts` and `scenes/looks.ts` are unlisted, and the type system makes the `paramsCore.ts` edit compile-mandatory.** |

**Deliberately NOT proposed:** model-seat picker (blocked on verified identity), one-click promote
(bypasses review gates), engine writes (blocked on the signed adapter), merging taste-brain into the
repo (copyright boundary).

---

## 7. Rule 46 chain position

This packet is **advisory input**, not a gate. Per Rule 46 as amended: whoever builds → Gemini
reviews → **Codex runs the hostile review as mandatory input** → **Fable is the Final Decider and
commit gate**. Codex's verdict is advisory to Fable, never the gate itself.

**Nothing in this packet authorises a commit.** S0 produces a branch and a proof of byte-identity;
landing it still requires Sean's explicit approval.
