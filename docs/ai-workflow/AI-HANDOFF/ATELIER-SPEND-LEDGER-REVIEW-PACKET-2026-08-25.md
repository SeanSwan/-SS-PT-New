---
decision: "Wire the day-scoped spend ledger that already existed but nothing instantiated — both lanes' 'daily' caps were per-request caps"
status: open
supersedes: none
---

# Review packet — the spend ledger · 2026-08-25 (loop iteration 3)

**Branch** `feat/atelier-v2-compose` · **worktree** `c:/tmp/ss-atelier-v2` · not deployed, not merged.

> **Every restated-code claim in this packet was GENERATED at write time, not recalled.**
> The previous two packets each shipped a stale fact (a line count, then a gate row) and
> burned reviewer P0s on non-defects. The line counts, gate order, and call sites below are
> command output. If you find one wrong, that is a real finding — say so.

---

## 1. What was actually broken

`composeStills` has always had a correct spend gate. What it never had was a *today*.

- `atelierComposeRoutes.mjs` returned a literal `{ runs: 0, spendUsd: 0, ledger: 'absent-this-slice' }` on every request, and said so in its own docblock: *"that stops one runaway request and does not stop fifty separate ones."*
- The **video** lane had the same hole, less honestly. `shared/providers/video/spendGuard.mjs` ships `makeFileLedger` — corrupt-vs-missing handled, writes monotonic, 30-day retention, 64 passing tests. **Nothing instantiated it.** `runGenerate` takes `ledger = null` and `render-agent.mjs` passed `{ api }`. Verified with a positive control: `checkRunAllowed` (the per-request half) appears in production files; `makeFileLedger` appeared only in `spendGuard.mjs` and its test.

So `SWAN_VIDEO_MAX_SPEND_USD_DAILY` bounded **one run**, while the guard's refusal text told operators to *"wait for the UTC day to roll over"* for a total recomputed as zero on every job.

**A ceiling only ever compared against zero is a per-request ceiling wearing a day's name.**

## 2. What landed

| File | Lines | What it is |
|---|---|---|
| `shared/providers/spendLedger.mjs` | 100 | `makeFileLedger` + `dayKey`, moved out of the video module so the image lane needs no video import. Still pure — fs injected. |
| `shared/providers/video/spendGuard.mjs` | 137 (was 202) | Re-exports both. Every existing video import unchanged; its 64 tests pass untouched. |
| `backend/services/laneLedger.mjs` | 120 | The part that needs a real disk: path resolution, lane allowlist, and the **write-failure asymmetry**. One implementation for both lanes. |
| `backend/routes/atelierStatusMap.mjs` | 71 | The 51-code status table, split out when the route hit the cap. Pure frozen data. |
| `backend/routes/atelierComposeRoutes.mjs` | 247 (was 289) | Stub replaced with `makeLaneLedger({ lane: 'atelier' })`. |
| `backend/services/atelier/composeStills.mjs` | 286 | One new `record()` dep and **one** call site. |
| `backend/scripts/render-agent.mjs` | 344 | Passes `{ api, ledger: videoLedger }`. **Pre-existing cap violation: 338 at HEAD.** My delta is +6. |
| `backend/tests/unit/laneLedger.test.mjs` | 212 | 18 tests. |

### The commit-before-spend decision — attack this

`composeStills.mjs:225`, the single record site, sits **after** the `estimateOnly` return (line 206) and **before** the local-async branch (line 231):

```js
record({ runs: count, spendUsd: cost.totalUsd });
```

Recording *actual* spend after a batch returns leaves a window where two concurrent hosted batches both read the same stale total and both pass a ceiling neither would pass alone. So the **estimate is committed before the first provider call**. The ledger is monotonic by design (a negative delta would let anyone who can reach it mint headroom), so this never reconciles downward: **the ceiling counts what was committed, not what was collected.** A batch that fails still consumes budget.

**Is that the right trade?** It is conservative on money and it bounds a retry storm. It also means a provider outage burns a day's budget. I think that is correct for a *cap*; argue the other side if you disagree.

### The two failure modes

| | Behaviour | Why |
|---|---|---|
| **Corrupt read** | `degraded: true` → billed lane refused, **free local lane runs** | A bookkeeping problem must not become an outage on a lane that spends nothing |
| **Failed write** | Never throws. Remembered in-process; every later read reports `degraded` | Money was spent and the record lost. Throwing would fail a request that already succeeded and would not un-spend the dollar. Silence would turn an unwritable ledger into an **unlimited budget** |

The unwritable flag is **sticky** — a later successful write does not clear it. Only a restart does, which is the explicit human act that says the disk was looked at.

## 3. Known asymmetry between the lanes — please attack

The two lanes now record at **different times**:

- **Image** (`composeStills.mjs:225`): commits the estimate **before** generating.
- **Video** (`generateVideo.mjs:216`): `if (ledger) ledger.record(day, {runs: 1, spendUsd: allowance.runCost})` **after** `adapter.generate` returns.

So the video lane still (a) has the read-then-write window, and (b) records nothing for a failed render. It is mitigated by the render agent leasing one job at a time, so true concurrency is unlikely — but "unlikely" is not "impossible", and I did not change `generateVideo` beyond passing the ledger in, because widening the blast radius of a wiring slice into the video handler's control flow felt wrong. **Is that restraint, or is it a half-fix I should finish?**

## 4. Verification — what was run, and what was NOT

- **Backend 343/343 across 17 suites** (atelier + video + render-agent + ledger), enumerated by glob. *I first named 15 files by hand and vitest silently ran 12 — three names were wrong. The number above comes from a glob, not a list I typed.*
- **Falsification check:** commenting out the single `record()` call turns the "two sequential batches" test red and nothing else. The regression test genuinely exercises the new wire.
- **Frontend 107/107 across 13 suites**; `tsc -p tsconfig.atelier.json` exit 0, 0 errors; `vite build` exit 0, `AtelierCompose.BJ44-CSK.js` emitted beside the `CreatorRenderQueue` control chunk (hash changed from the previous build, so the edit is in the bundle).
- **Import-execution smoke:** all four new/changed modules load; status map exports 51 codes.
- Secret scan CLEAN. `.ai-workflow/spend/` already gitignored at `.gitignore:515`; no filename collision with the agent-side `ledger.jsonl`.
- **Baseline disclosure (Rule 56):** the full backend run shows **2 pre-existing test failures** (`associationsModelRegistryParity`, `phase1bControllers`) which read `models/associations.mjs` and onboarding sources — **files absent from my diff** — and **31 files vitest cannot collect because they are written for `node:test`**, a pre-existing runner mismatch. The repo baseline is **not** clean; this slice introduces no new failures.
- **NOT proven:** a real render, a real R2 write, a real disk-full condition. Every branch here is exercised through an injected filesystem.

## 5. What I want from you

Attack the design, not just the diff. Specifically:

1. **The commit-before-spend trade.** Is committing the estimate up front right, or should it reconcile — and if it should, how, given a deliberately monotonic ledger?
2. **The lane asymmetry in §3.** Finish it or leave it?
3. **The write-failure asymmetry.** Is "sticky until restart" too blunt? Too soft? Is there a state where this refuses a lane it should not?
4. **Ephemeral filesystems.** On a host where a redeploy resets the file, the day's budget comes back. I named this as a limit with a trigger (durable storage lands when hosted generation serves more than one operator). Is that trigger in the right place, or is a money counter different in kind from a batch record?
5. **What is missing entirely?** Per-workspace budgets, alerting as the cap approaches, a spend view in the UI, month-to-date, refunds, reconciliation against the provider's real invoice. Rank what actually matters and say what you would cut.
6. **Gaps and context I may be missing.** Anything about this plan that looks wrong from outside it.
