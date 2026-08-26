# Hostile review: two new fixes, and how to get 2 months of divergent work into production — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** .ai-workflow/fusion/panel5-extraction-decision.md
**Seed:** .ai-workflow/fusion/_src5.txt
**Tokens:** 4593 in / 9462 out | **Cost:** ~$0.0056 | **Wall:** 173.5s | **finish_reason:** stop

---

## VERDICT
REVISE — the P0 fix still emits `isFallback:false` for special/promotional packages while the downstream consumer ignores `requiresAdminReview`, and the proposed 11-commit cherry-pick should be replaced with a single squashed extraction to avoid repeated conflict resolution on a money path.

## BLOCKERS
1. **P0** — `getClientPackagePricing` returns `isFallback:false` with `requiresAdminReview:true` for promotional packages, but `applyServerDerivedChargeAmount` only bails on `isFallback`, so a special-package rate overrides the operator’s charge. Failure: client holds a special package (`isSpecialPackage:true`) → pricing payload has `isFallback:false` → `applied = sessionRate` and `chargeAmountSource:'server-derived'` even though human review was flagged. Evidence: seed `getClientPackagePricing` return block (`isFallback: false, isSpecialPackage, requiresAdminReview: isSpecialPackage`); seed `applyServerDerivedChargeAmount` (`if (!pricing || pricing.isFallback) { return; }` — no check of `requiresAdminReview`).
2. **P1** — Bounded order scan (`limit: 12`) can hide a rate split beyond 12 orders, causing `distinctRates.length === 1` and a non-fallback derivation from the newest order that mismatches an older rate not scanned. Failure: client with >12 completed orders, differing per-session rates at order 13+ → newest order rate used, stamped verified, wrong charge possible. Evidence: seed `getClientPackagePricing` `limit: 12` and `ambiguityPopulation` built from the same bounded `recentOrders`.
3. **P1** — No staging environment and local dev resolves `DATABASE_URL` to production (§5), so any “transactional prod smoke” (GLM G3) or accidental script run against the extracted tree risks mutating live data. Failure: developer runs G3 locally → writes/reads prod DB with undeployed code. Evidence: §5 “Local dev resolves DATABASE_URL to production”, “No staging environment”.

## ATTACKS
- Correctness: happy-path-only logic, null/undefined/type mismatch, stale state, race conditions, off-by-one, unhandled error paths.
  * Special-package trust path (Blocker 1) is happy-path-only: assumes `isSpecialPackage` is safe to auto-apply.
  * `storefrontItems` derived from `recentOrder` only; if newest order has no items but older orders do, first fallback returns `requiresAdminReview:false` (silent skip, safe but loses derivable intent).
  * Off-by-one / truncation: `limit: 12` (Blocker 2) hides older rate splits.
  * Stale state: all green tests ran against the OLD base; a green suite on the new base proves tests pass, not that merge preserved money-path intent (§4.3).
  * Race: `hoursUntilSession` computed from `sessionDate`; warning endpoint uses `NaN < 24` while cancel uses `!== null` — divergent guards could still disagree under concurrent reschedule.
  * Unhandled error path: catch block returns `isFallback:true, requiresAdminReview:false` on DB failure — safe for override, but masks need for review after infra hiccup.

- Security: authn/authz and IDOR, injection, SSRF, secret handling, replay/idempotency, multi-tenant scope leaks, rate-limit/DoS.
  * `cancel-warning` authz exists (§2), but `sessions.mjs` has 12 commits on `main` since split; divergence may have altered enforcement around the same endpoints — unverified.
  * Secret handling: local-dev `DATABASE_URL` points at prod (Blocker 3) — a real exposure for a single-trainer owner with no staging.
  * No evidence of injection/SSRF/IDOR in provided seeds; multi-tenant scope relies on `session.userId` passed through, not re-checked in `getClientPackagePricing`.

- Data-truth / schema drift: model column vs caller field drift, PascalCase-vs-snake_case table drift, FK target drift, frontend response-shape drift.
  * `session.service.mjs` has 9 commits on `main`; both sides touched cancellation logic — cherry-picking the branch version risks silent drift of `billingOptions` shape or `hoursUntilSession` calculation.
  * Association alias `storefrontItem` (seed) must still match `main`’s Sequelize model; FK target drift would break `include` silently.
  * Frontend files (`pricing.ts`, `useSessionPackagePricing.ts`, `SessionDetailModal.actions.ts`) are untouched on `main` (0 commits) but not provided; new response fields (`packageId`, `totalSessions`, `packagePrice`) may not be consumed, causing frontend shape drift if types changed.

## HIGHEST RISK
The single most dangerous item is **Blocker 1: `requiresAdminReview` being ignored for special packages**, because it directly re-opens the wrong-money charge class the P0 fix claimed to close. Cheapest concrete de-risk before ship: in `applyServerDerivedChargeAmount`, change the guard to `if (!pricing || pricing.isFallback || pricing.requiresAdminReview) { return; }` (or alternatively set `isFallback:true` for special packages in `getClientPackagePricing`). Separately, for the deploy plan, replace the 11-commit cherry-pick with **one squashed commit** of the final fixed functions onto current `main` to avoid resolving the same two files 11 times and silently dropping the special-package fix.

## CONFIDENCE
I could NOT verify from the document alone: (a) exact line numbers (seed source has none), (b) the actual diff of `sessions.mjs` / `session.service.mjs` between branch and `main` (only commit counts given), (c) the implementation of `detectSpecialPackage` and whether any production data would trigger `isSpecialPackage:true`, (d) whether existing tests cover the special-package or >12-order paths, (e) the three frontend files’ compliance with house rules (styled-components only, Victory charts, Crystalline Swan palette `var(--token,#fallback)`, Dual-Button Glow, 44px targets, dark-first, WCAG 4.5:1, ≤300 lines/file, zero PII to LLMs, no “yoga/meditation” language, “26+ years / NASM-protocol” not “NASM-certified”) — no frontend code was supplied, so I flag potential violation risk but see no explicit breach in the text. Evidence that would settle it: full unified diff of the two divergent backend files, `detectSpecialPackage` source, the three frontend files, and a run of the backend suite against a squashed extraction using production-anonymized (ID-only) fixtures with assertions on special-package and multi-order scenarios.
