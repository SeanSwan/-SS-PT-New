# Review packet — the spend ledger · 2026-08-25 (loop iteration 3) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-SPEND-LEDGER-REVIEW-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 2542 in / 6199 out | **Cost:** ~$0.0036 | **Wall:** 110.4s | **finish_reason:** stop

---

## VERDICT
REVISE — the spend-cap wiring is conceptually sound but ships a known concurrency overspend window and a non-negotiable >300-line file violation that must be fixed before merge.

## BLOCKERS
1. P0 — House rule violation: file exceeds 300 lines. `backend/scripts/render-agent.mjs` is 344 lines (document §2: "Pre-existing cap violation: 338 at HEAD. My delta is +6."). This breaches the binding "≤300 lines per file" rule and must be split before ship.
2. P0 — Spend-cap race condition / overspend. Inputs: two concurrent hosted batches (or separate worker processes) hitting `composeStills.mjs:225` (or video `generateVideo.mjs:216`) read the same stale day total from the file ledger, both commit their estimate, both individually pass the ceiling, but their summed spend exceeds `SWAN_VIDEO_MAX_SPEND_USD_DAILY` (or image equivalent). Document admits this in §2 ("two concurrent hosted batches both read the same stale total and both pass a ceiling neither would pass alone") and provides no evidence of inter-process locking or atomic compare-and-swap. Wrong output: daily cap effectively unlimited under concurrency.
3. P1 — Sticky degraded state after transient write failure causes permanent refusal of billed lane. Inputs: any non-corrupt write failure (disk quota, EIO) → `laneLedger.mjs` sets an in-process `degraded` flag that is sticky (§2 table: "Failed write … Never throws. Remembered in-process; every later read reports degraded"). Because corrupt-read degraded mode refuses the billed lane (§2), every subsequent paid generation is refused until a manual restart, even if the disk later recovers. This is a self-inflicted DoS on the revenue path.

## ATTACKS
- Correctness:
  - Happy-path-only: all ledger branches are exercised through an injected filesystem (§4 "NOT proven: a real disk-full condition"); no real concurrent multi-process or disk-error integration test.
  - Race conditions: read-modify-write window in commit-before-spend (§2, §3) is not closed by a mutex/lock; video lane records after `adapter.generate` (§3) leaving the same window.
  - Stale state: sticky `degraded` flag never clears on a later successful write (§2) — a recovered disk stays "failed" forever.
  - Unhandled error paths: failed write "Never throws" silently swallows errors; corrupt read silently flips to free-lane-only mode without alerting.
  - Off-by-one / day boundary: `dayKey` UTC vs local not specified; doc says operators should "wait for the UTC day to roll over" but code is unseen.
- Security:
  - Multi-tenant scope leak / DoS: ledger is lane-global, not per-workspace (§5 explicitly lists per-workspace budgets as missing). A hostile operator can exhaust the shared daily cap to deny paid generation to others; no per-tenant isolation.
  - Authz/IDOR: negative-delta guard mentioned ("anyone who can reach it mint headroom") implies the ledger write surface could be reachable by untrusted callers; need proof only internal code can `record`.
  - Rate-limit/abuse: when `degraded` (corrupt read), free local lane runs are allowed (§2) — if an attacker can induce a corrupt read, they get unlimited free local jobs while paid lane is blocked.
  - Replay/idempotency: `record()` has no idempotency key; a retried request could double-count because the ledger is deliberately monotonic and never reconciles downward.
- Data-truth / schema drift:
  - Frontend response-shape drift: `atelierStatusMap.mjs` split out 51 codes and the build emitted `AtelierCompose.BJ44-CSK.js` (§4), but no evidence the UI consumes the new status shape correctly.
  - Field drift between lanes: image records `cost.totalUsd` (`composeStills.mjs:225`) while video records `allowance.runCost` (`generateVideo.mjs:216`); if these fields differ in shape/precision, any aggregator may mis-sum.
  - PascalCase-vs-snake_case: not evidenced, but `spendUsd` vs `spend_usd` consistency across modules and any SQL/JSON store is unverified.

## HIGHEST RISK
The concurrency overspend window (Blocker #2) is the single most dangerous item: it directly defeats the daily cap and can blow real money on the first day of multi-process or multi-operator hosting. Cheapest concrete de-risk before ship: wrap the read‑sum‑record sequence in `laneLedger.mjs` with an inter‑process lock (e.g., `proper-lockfile` on the ledger file) and, after acquiring the lock, re-read, compute the new total, and refuse if over cap before writing; if no external lock lib is permitted, serialize all ledger mutations behind a single Node worker/queue and forbid horizontal scaling until a shared store exists. This is <50 lines and removes the race without changing the monotonic design.

## CONFIDENCE
I could NOT verify from the document alone: (1) the actual source of `laneLedger.mjs` / `spendLedger.mjs` to confirm absence of locking or atomic rename; (2) whether `render-agent.mjs` truly is 344 lines or if the document's self-reported count is itself stale (the author admits two prior packets shipped stale facts); (3) the frontend components' compliance with styled-components / Victory / 44px / Crystalline Swan tokens, since no frontend code was shown; (4) whether the deployment model is single-process or multi-tenant, which determines if the race and global cap are exploitable. Evidence to settle: pull the actual git diff on `feat/atelier-v2-compose`, run `wc -l` on each file, grep for `fs.writeFile`/`appendFile` and any lock usage, and run a two-process concurrent load test against a temp ledger. Until that exists, my P0 on the line-count is confident only if the doc's count is accurate; my P0 on the race is confident because the doc explicitly acknowledges the window yet shows no mitigation.
