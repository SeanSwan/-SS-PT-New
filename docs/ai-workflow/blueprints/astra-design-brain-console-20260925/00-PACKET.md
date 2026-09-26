# Astra — Design Brain Console · Build Packet

- **Date:** 2026-09-25 · **Author:** sable (WorkBuddy AI, deepseek-v4.1-flash) · **Requested by:** Sean
- **Status:** PROPOSED — ready to code. Nothing here is implemented except where §2 says VERIFIED.
- **Mega Blueprints:** this is the packet. Read `00` → `05` in order before writing code.
- **Repo/worktree:** `SS-PT` @ `tmp/worktrees/brain-console-salvage-20260918`
- **Branch:** `swan-brain-console-v3-salvage-20260918` · **Commit:** `e29508664`
- **Product name (Sean, 2026-09-25):** **Astra**

---

## 1. What Astra is, in one paragraph

The Design Brain today is **one brain with three named consumers** — the backend service, the CLI
(`scripts/forge.mjs`), and (the contract says) "later, an MCP server". Astra is **the fourth consumer,
and the first one Sean can look at.** It is a local console that answers two questions the brain can
currently only answer if you already know which shell command to type:

1. **"Why did it decide that?"** — every resolved slot, every applied facet, every LAW check pass *or
   fail*, the pinned `brainVersion`, the seed, the provider, and each capability marked
   `verified` / `claimed` / `false`.
2. **"What if I change my mind?"** — the free Gate-0 directions, a slot editor that never mutates
   Sean's own words, the real tuning knobs, and one keystroke to record the highest-value signal the
   system produces (`rejected_all`).

**The honest constraint that shapes everything below:** Astra is not a way to reach into the brain and
rewrite it. The corpus is explicit that taste has exactly one writer, canon has a proposal channel,
the LAW filter is never skippable, and spec mode is `enabled:false`. Astra therefore splits "change
how it thinks" into **three legal dials (instant, reversible, logged)** and **one proposal channel
(slow, routed to Sean)**. That split is the central design decision — see `02-BLUEPRINT.md` §4.

---

## 2. Verified baseline — what actually exists (A0 partially done)

Measured on this worktree at `e29508664`, not quoted from the contract.

| Thing | Status | Evidence |
|---|---|---|
| Prompt compiler | **EXISTS** — 274 lines | `shared/swanPromptCompiler.mjs` |
| `BRAIN_VERSION` | **`'0.2.0'`** | `shared/swanPromptCompiler.mjs:39` |
| `personify()` — slot 4's only legal form | **EXISTS** | `shared/swanPromptCompiler.mjs:53` |
| `resolveSlots(brief)` — the SlotMap | **EXISTS** | `shared/swanPromptCompiler.mjs:97` |
| `compileImage(brief, caps)` | **EXISTS**, carries `lawChecks` | `:136`, `:267` |
| Per-provider serializers | **EXISTS** | `strategyFor, serializeFor, fitToBudget, SERIALIZERS` (`:30`) |
| `FACETS` | **EXISTS** | `:46` |
| LAW filter, fail-closed | **EXISTS** — throws `E_LAW_VIOLATION`, `E_CAPABILITY_UNVERIFIED` | `:134` |
| Forge CLI | **EXISTS** — 289 lines | `scripts/forge.mjs` |
| CLI `bracket` (n variants) / `pick --winner` / `refine` / `list` / `prune` / `review-answer` | **EXIST** | `scripts/forge.mjs:58-71` |
| Spend gate | **EXISTS** — `--confirm-spend` required for any generation | `scripts/forge.mjs:32,93` |
| Variant store with lineage, retention, winners-never-pruned | **EXISTS** | `scripts/forge.mjs:229-242` |
| `directions()` — Gate 0, zero cost | **MISSING** | specified `forge-compiler-contract.md:128`; absent from the compiler |
| `explain()` / `ExplainView` — the "Why this?" view | **MISSING** | specified `:129`; absent |
| MCP server for the design brain | **MISSING** | no `mcp/` under `scripts/design-brain/` |
| Console surface of any kind | **MISSING** | — |
| Doctrine corpus | **EXISTS** — ~25 files, ~400 KB | `docs/ai-workflow/design-brain/` |
| Style taxonomy ("MidJourney Brain") | **EXISTS** | `design-brain/style-taxonomy.md` |
| World Engine (18 DNA recipes) | **EXISTS** (doctrine) | `design-brain/worlds.md` |
| Tuning knobs | **EXIST** | `scripts/design-brain/config/tuning.json` |
| Taste Brain (separate private repo) | **EXISTS, external** | `swan-taste-brain`, probe `127.0.0.1:7331/probe` |

### 2.1 Four gaps Astra exists to close

- **G1 — `directions()` is missing.** The contract's Gate 0 returns 3 text directions at **zero cost**.
  Today the only way to see options is `forge bracket … --confirm-spend`, which *generates and bills*.
  The cheapest, highest-value step in the whole contract does not exist yet.
- **G2 — `explain()` is missing.** `lawChecks` are computed and attached to the result, but nothing
  renders them. "Why this?" has no implementation.
- **G3 — no MCP server**, so no agent can ask the design brain anything without shelling out.
- **G4 — no surface**, so the loop (bracket → pick → refine → review-answer → prune) is a sequence of
  commands only its author remembers.

### 2.2 Two drift findings, recorded here rather than fixed

- **D-A — version drift.** `forge-compiler-contract.md` is headed **v0.1.0**; the implementation reports
  **`BRAIN_VERSION = '0.2.0'`**. The contract's own §0.5 says *"`brainVersion` pinned by every consumer
  — CLI on v1 + backend on v2 = the drift this whole design exists to kill."* The doc has drifted from
  the code. **Astra must display `BRAIN_VERSION` read from the code, never a literal.**
- **D-B — the contract's `SlotMap` field names are unverified against the implementation.**
  `resolveSlots()` exists but its accepted key set has not been read in this pass. **Slice A0 must
  read it** and the interface in `03-INTERFACE.md` must be corrected to match before A1 is coded.
  This packet deliberately does not guess.

---

## 3. Applicability matrix (Mega Blueprints §1–10)

Every required part is accounted for. "N/A" entries carry a reason.

| # | Required part | Where | Status |
|---|---|---|---|
| 1 | Requirements | `01-REQUIREMENTS.md` | Complete |
| 2 | Blueprint | `02-BLUEPRINT.md` | Complete |
| 3 | Wireframes | `03-INTERFACE.md` §2 | Complete — ASCII, desktop-first + narrow, all states |
| 4 | Flowchart + Mermaid | `03-INTERFACE.md` §3 | Complete — valid Mermaid source |
| 5 | Contracts + conditional diagrams | `03-INTERFACE.md` §4–§6 | Complete — types, API, state, sequence, ERD, permissions matrix |
| 6 | Test plan + executable tests | `04-TESTS-TRACEABILITY.md` §1–§2 | Complete — req-linked test IDs |
| 7 | Traceability | `04-TESTS-TRACEABILITY.md` §3 | Complete |
| 8 | Implementation + operations | `05-SLICES-AND-REVIEW.md` §1–§3 | Complete — 9 ordered slices |
| 9 | Hostile review + decisions | `05-SLICES-AND-REVIEW.md` §4–§5 | Complete — 8 findings, 5 resolved in-plan |
| 10 | Readiness receipt | `00-PACKET.md` §5 | Complete — **honest: not ready to claim readiness** |

**Rendered Mermaid preview:** not available in this environment — the Mermaid in `03` is **source only,
unrendered**. Disclosed per Mega Blueprints §4 rather than silently skipped.

---

## 4. How to use this packet while coding

1. Read `01` (what and why), then `02` (how), then `03` (exact shapes).
2. Pick the lowest-numbered slice in `05` §1 that is not yet done. Each slice names its **entry
   evidence** and **exit evidence** — do not start a slice whose entry evidence is unmet.
3. **Before writing A1 code, do slice A0.** It is a reading task with a written output, and it exists
   because §2.2 D-B is an unverified interface. Coding against a guessed interface is the failure this
   packet is meant to prevent.
4. `04` §3 is the traceability matrix. If you add a requirement, add its row, its AC, its test ID and
   its slice in the same pass — that is the rule that stops a packet rotting.
5. Anything marked **PROPOSAL-ONLY** in `02` §4 is not a build target. Do not implement it as a dial.

---

## 5. Readiness receipt

**Verdict: NOT READY — and saying so is the point.** This packet is complete as a *plan* and
incomplete as a *readiness claim*, because two of its own inputs are unverified.

| Item | State |
|---|---|
| Canonical artifact | this directory, `docs/ai-workflow/blueprints/astra-design-brain-console-20260925/` |
| Preservation proof | new directory; nothing overwritten. Verified: `mkdir -p` on a path that did not exist |
| Baseline verified | §2 — every row is a file that was read or grepped in this pass |
| **Blocking gap 1** | **D-B** — `resolveSlots()`'s accepted key set is unread. Slice **A0** closes it |
| **Blocking gap 2** | **D-A** — contract v0.1.0 vs code `0.2.0`. Astra reads the code, so it is not blocked *by* this, but the contract should be corrected |
| Test commands run | **none** — no code written yet. This packet makes no claim that any test passes |
| Unresolved decisions | 4 — `05` §5. All four are Sean's or the design-brain owner's, none block A0 |
| Coverage gaps | the taste loop (`swan-taste-brain`) is an external private repo and is **out of scope**; Astra reads its `/api/profile` at most |
| Next authorized slice | **A0 — Seam audit.** Read-only. No code, no spend, no writes outside the packet directory |

**A passing structural check is not a certification.** This packet has no `check-readiness.mjs` run
against it, and even a green one would only mean the *document* is well-formed — it would say nothing
about whether Astra works, because Astra does not exist yet.
