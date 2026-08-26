# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-SPEND-LEDGER-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 2607 in / 4525 out · **Cost:** ~$0.0000 · **Wall:** 141.8s · **finish:** stop

---

## VERDICT
REVISE — the wiring is real and unusually well-documented, but the headline "commit-before-spend" fix does not close the race it names, the video lane keeps the *larger* window unfixed, and the cap is fail-open by default and per-process in scope.

## BLOCKERS

1. **P1 — Fail-open default on the video lane.** `runGenerate` takes `ledger = null` (§1). Any current or future caller that omits the parameter — a new script, a refactored handler, a second agent — silently gets an *uncapped* video lane with no error, no log, nothing. Safety controls must fail closed: throw at construction if no ledger is supplied. Evidence: §1, "`runGenerate` takes `ledger = null`"; §2 table, `render-agent.mjs` "Passes `{ api, ledger: videoLedger }`" as the sole wired caller.

2. **P1 — Commit-before-spend does not eliminate the race it claims to; it shrinks it.** The stated failure is "two concurrent hosted batches both read the same stale total and both pass a ceiling." Moving `record()` earlier only helps if *check-and-record is one atomic operation*. Nothing in the packet says it is — `record()` is described as a separate call (`composeStills.mjs:225`) and the ledger is a file with injected fs. If the gate is still `read total → compare → later write delta`, two concurrent requests interleave identically regardless of where `record()` sits. Either the packet is wrong that the window is closed, or the atomicity lives in code we cannot see — say which, explicitly.

3. **P1 — The cap is per-process, not per-day.** The ledger is a file resolved by `laneLedger.mjs` and the degraded flag is explicitly "remembered in-process" (§2). Under any multi-worker deployment (PM2 cluster, k8s replicas, even two dev terminals), each process holds its own view: the effective daily ceiling is `cap × worker_count`, and one worker's failed write degrades nobody else. This also breaks the "restart is the explicit human act" rationale — in containerized hosting, restarts are automated and frequent, so "sticky until restart" is really "sticky until the next deploy," which is minutes, not a human decision.

4. **P2 — House-rule violation: `render-agent.mjs` is 344 lines against a hard ≤300 cap.** Disclosed as pre-existing (338 at HEAD), but this slice adds +6 to an over-cap file it is already touching. Binding rule says flag violations; the correct move is to split the file in this same slice, not grow it.

## ATTACKS

**Correctness**
- **The video TOCTOU window is the worst one, and it was left open.** Video records *after* `adapter.generate` returns (`generateVideo.mjs:216`). Video generation takes minutes; the read-then-write window therefore spans the entire render. The image lane got the fix; the lane where the window is largest did not. "Render agent leases one job at a time" is a scheduling assumption, not a guarantee — a crashed lease, a manual rerun, or a second agent instance voids it. This is a half-fix; finish it.
- **Video records `allowance.runCost`, not actual cost.** If the adapter overruns its allowance (retries, longer renders), the ledger undercounts and the cap is soft in a third way (timing, estimate-vs-actual, and now allowance-vs-actual).
- **No idempotency on the commit.** A client-side timeout/retry after the server committed the estimate double-charges the ledger for one generation. With monotonic-no-reconcile, retries permanently burn budget.
- **Concurrent append vs. corrupt detection.** If two processes append to the same JSONL/file while another reads, a partially-written tail can parse as corruption → spurious `degraded: true` → billed lane refused. Whether this can happen depends entirely on `laneLedger.mjs` internals not shown.
- **Falsification check is weaker than claimed.** Commenting out `record()` turning a *"two sequential batches"* test red proves wiring, not ordering — sequential batches pass under record-after-generate too. The concurrency property the design decision exists for is untested.
- **Unclear: does the free local branch record?** Corrupt-read policy says the free lane "runs" — but if it then calls `record()` against a corrupt/unwritable ledger, it trips the sticky write-failure path as collateral. Specify.

**Security**
- **Global pool = cross-tenant DoS.** There is one ledger per lane per day, no per-workspace scoping. Any single authenticated workspace can burn the entire daily cap and starve every other tenant until UTC midnight. For a multi-tenant SaaS this is a denial-of-service primitive built out of a cost control. Per-workspace sub-caps aren't a nice-to-have (§5 Q5); they're the authorization boundary for this feature.
- **Clock regression resets the day.** `dayKey` on UTC means an NTP step backwards mints a fresh budget. Low likelihood, but a money control shouldn't trust the wall clock alone.
- **Path resolution unverified.** `laneLedger.mjs` "does path resolution" — lane names come from an allowlist (good), but the base path, symlink behavior, and whether `.ai-workflow/spend/` exists and is writable in the production image are all asserted, not shown.

**Data-truth / schema drift**
- The status endpoint's response shape (51 codes via `atelierStatusMap.mjs`) is backend-only here; no consumer contract is stated. When the UI spend view lands (§5), that's where drift will bite.
- Bundle-hash-change as evidence the edit shipped is weak — a hash changes for any rebuild. The import-execution smoke is the stronger claim; lean on it.

## HIGHEST RISK
The combination of Blockers 1–3: **a money cap that is fail-open by default, per-process in scope, and racy under exactly the concurrency it was built for.** Each is survivable alone; together they mean the cap holds only in the single happy configuration the author tested.

Cheapest de-risk before ship: (a) make `ledger` a required constructor arg — throw at boot if absent; (b) collapse check-and-record into one serialized operation (a single-writer process, or one DB row updated with `UPDATE … SET total = total + x WHERE total + x <= cap`); (c) point the ledger at a mounted volume or the existing DB *now* — it is one small table, and it retires the ephemeral-filesystem caveat (§5 Q4) instead of triaging it. To answer Q4 directly: yes, a money counter is different in kind from a batch record — a reset batch record loses history, a reset budget mints money.

## CONFIDENCE
- **I have not seen `laneLedger.mjs`, `spendGuard.mjs`, or `composeStills.mjs` bodies** — only the packet's restatement. Whether check-and-record shares a lock, whether appends are O_APPEND-safe, and how paths resolve are all load-bearing and unverifiable from this document. Paste those three functions or their signatures plus the gate sequence, and Blockers 2–3 become confirm-or-refute in minutes.
- **I cannot verify the test claims** (343/343, the 18 new tests, the falsification check) — especially given the honest disclosure that 31 files are invisible to vitest. If any spend-guard tests live in the `node:test` population, my picture of coverage is wrong.
- **I cannot assess frontend house-rule compliance** (styled-components, Victory, palette tokens, 44px targets, contrast) — the packet shows no meaningful frontend surface. No violations found is not the same as none present.
- **I am genuinely uncertain whether the free local lane records**, and whether that's intended; the packet's own §5 Q3 invites this question without answering it.
- On the §5 questions where you asked for judgment: finish the video fix (Q2 — restraint here was the wrong call, the blast radius is one function you're already importing into); keep sticky-until-*verified*-repair but drop "restart counts as repair" (Q3); rank per-workspace caps ≫ alerting ≫ reconciliation ≫ UI view ≫ refunds/month-to-date (Q5 — cut everything below alerting for this slice).
