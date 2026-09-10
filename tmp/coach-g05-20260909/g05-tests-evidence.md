# G05 test evidence (hash-bound)

Scope digest: `292ca454f965799595e7fae3556cb75ded4cb27355f62247991d6096cf31ac3f`
(contract `69ed890dffa19e55…`, schema-4 override, slice G05, index 4, calls 9/24)

## Baseline (pre-edit, this slice)

- Coach/AI chat unit baseline: **67/67 PASS, exit 0** (6 files) — `/tmp/g05-baseline.log`
- Disposable PG `swan-g01-disposable-pg-20260906` (port 15433) alive at baseline.

## Post-implementation results (this freeze)

| Gate | Command (WSL Node 22.23.2, worktree backend/) | Result | Log |
|---|---|---|---|
| G05 scoped suite (4 files) | `node node_modules/vitest/vitest.mjs run --reporter=verbose tests/unit/coachInferenceBoundary.test.mjs tests/unit/coachEvidenceTools.test.mjs tests/unit/coachContextCache.test.mjs tests/unit/coachCallerInventory.test.mjs` | **32/32 PASS, exit 0** | `/tmp/g05-suite2.log` |
| Baseline + runner-lock re-run (7 files) | same 6 baseline files + `tests/unit/nodeTestRunnerSeparation.test.mjs` (three-way lock: new test files must not import node:test) | **71/71 PASS, exit 0** (67 baseline + 4 lock) | `/tmp/g05-baseline-post.log` |
| S5c/S5b contract trio (node:test) | `node --test tests/unit/coachModelResponseContract.test.mjs tests/unit/coachProviderBoundary.test.mjs tests/unit/coachContextEvidence.test.mjs` (required: G05 extended `coachModelResponseContract.mjs`) | **11 pass / 0 fail, exit 0** | `/tmp/g05-nodecontract.log` |
| ESM import smoke (build gate) | `node /tmp/g05-smoke.mjs` from backend/ — imports all 6 changed modules on Node 22 (route graph boots; dev-DB connect defers, ECONNREFUSED expected outside an API test) | **SMOKE_PASS, exit 0** | `/tmp/g05-smoke.log` |

## Exit coverage (T22–T25 + inventory + forbidden egress)

| Exit | Where proven |
|---|---|
| T22 (throw ≠ zero rows) | `coachEvidenceTools.test.mjs` — reader throw → `unavailable` (reason preserved); zero rows → `empty`; progress builder status mirrored (verified→ok, unverified-records→unavailable) |
| T23 (prompt injection) | `coachInferenceBoundary.test.mjs` — hostile workout title fenced under `[recent_workout: ok]` in the system turn with "QUOTED DATA" header; user turn untouched |
| T24 (forbidden egress) | `coachInferenceBoundary.test.mjs` — provider timeout → exactly 1 provider round, no second vendor, safe `unavailable`; policy gate blocks `rogue-llm` before any call. Adapter level: `coachCallerInventory.test.mjs` — only keyed provider egresses (fetch spy), zero-config → zero egress, trace sanitized (no raw error body) |
| T25 (cache after role/target change) | `coachContextCache.test.mjs` — target/role/capability/private-mode each produce distinct keys (old scope not reused); forget = actor-scoped invalidation; logout = full clear; LRU cap 256 |
| caller inventory | `coachCallerInventory.test.mjs` (static) — route wires `runCoachInference` + `coachProviderCompatAdapter`; non-Coach callers (debate, intent classifier) keep the legacy shape |
| budget | 6 tool calls / 2 model rounds / 20s (faked Date clock) — exhaustion → `BUDGET_EXHAUSTED` partial findings, provider never started |

## Convergence history (RED → GREEN, honest)

- Suite round 1: 26/32. Six failures, all diagnosed:
  1. `coachProgressEvidence.mjs` import path was `../` instead of `./` (sibling in `services/ai/`) — fixed in `coachEvidenceTools.mjs`.
  2. `recent_workout` trusted the reader's LIMIT; a non-compliant reader returned 10 rows — now re-capped client-side with `truncated` flag.
  3. `context_summary` over-mangled its payload through the row-array truncator — now returns the context object verbatim with byte cap reporting.
  4. Policy builder trusted the body `privacyClass` (hostile `public` survived) — now the server always sets `deidentified` (staff) / `public` (client); body policy dimensions are shape-checked only.
  5. Wall-budget exhaustion after the tool loop was not flagged — now `remainingBudgetMs <= 0` after the round sets `budget.exhausted`; reasonCode `BUDGET_EXHAUSTED`.
- Suite round 2: **32/32 PASS, exit 0**.

## Environment notes

- All provider calls mocked (injected `providerGenerate`); no paid inference, no outbound calls in the scoped suites. The egress spy test stubs `fetch` globally and restores it.
- Backend is plain ESM + vitest (no tsc step in the repo's backend gates); the import smoke is the build gate. Frontend is untouched by this slice.
- `deps.budgetMs` is documented as a server-side test/ops seam (caller cannot set it) so the 20s property is testable with a faked clock.
