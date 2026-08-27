# Hostile review round 2: cancellation pricing hardening — and what to build next — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** .ai-workflow/fusion/pricing-hardening-review-2.md
**Seed:** .ai-workflow/fusion/_live-diff.txt
**Tokens:** 5407 in / 9094 out | **Cost:** ~$0.0055 | **Wall:** 162.2s | **finish_reason:** stop

---

## VERDICT
REVISE — the fallback-price path can still record a placeholder charge and non-full fees are silently clamped, either of which bills the wrong amount.

## BLOCKERS
1. P0 — Placeholder price recorded when pricing lookup returns fallback-with-data. Inputs: `getClientPackagePricing` miss returns `{pricePerSession:175, isFallback:true}`; frontend `useSessionPackagePricing` (document text: "cleared only on a successful fetch with data") clears `pricingUnavailable` and pre-arms `chargeType:'full', chargeAmount:175`; `applyServerDerivedChargeAmount` (backend/services/sessions/session.service.mjs:133-190, early-return on `pricing.isFallback`) does NOT overwrite the caller-supplied amount, so the 175 placeholder persists through `normalizeCancellationBillingOptions` and is saved. Wrong output: client billed invented number — the original defect reborn.

2. P1 — Silent undercharge for fees > session rate. Inputs: admin/trainer submits `chargeType:'partial'` or `'late_fee'` with `chargeAmount:250` (no-show/multi-hour); `applyServerDerivedChargeAmount` executes `billingOptions.chargeAmount = Math.min(billingOptions.chargeAmount, sessionRate)` (session.service.mjs:~188), clamping to 175 with no warning. Wrong output: $75 underbill, no operator feedback.

3. P1 — Re-arm gate defeated by incidental touch. Sequence: modal opens with `pricingUnavailable=true` → snapshot `chargeType:'none'`; user edits reason or other non-charge field that flips `chargeTouched=true`; pricing resolves later; the re-arm effect (described in doc, gated on `chargeTouched`) skips, leaving submitted state `'none'` while UI may appear armed. Wrong output: cancellation with no charge intended by policy.

## ATTACKS
- Correctness:
  - Happy-path-only: `applyServerDerivedChargeAmount` only fixes `full` and clamps others; assumes operator amount sane.
  - Null/undefined/type: `lateFeeAmount: number | null` with `?? null` (SessionDetailModal.actions.ts:76-84) is correct, but server contract not verified; a string would crash render.
  - Stale state: re-arm `chargeTouched` gate (attack #5) can leave stale `'none'` (Blocker 3).
  - Race conditions: DB read `getClientPackagePricing` inside open transaction holding `LOCK.UPDATE` on session row (attack #1, session.service.mjs:1728 context) extends lock duration; concurrent cancels serialize, risk deadlock if pricing query touches same locked scope.
  - Off-by-one: none found.
  - Unhandled error paths: pricing lookup failure only `logger.warn` and returns; cancellation proceeds with caller amount — acceptable but invisible to ops.
  - Mutation trap (attack #2): in-place mutation of `billingOptions` is safe per-request but fragile if object reused on retry.
  - isFallback coincidence (attack #4): real package at 175 with `isFallback:false` works; `isFallback:true` ignored safely — no break.
  - Clamping (attack #3): see Blocker 2.

- Security:
  - Authn/authz: `normalizeCancellationBillingOptions` restricts `canSetBilling` to admin/trainer (good); client billing nulled. IDOR on `session.userId` cancel not shown — unverified requester ownership.
  - Injection / SSRF / secrets: none in diff.
  - Replay/idempotency: no evidence `PATCH /api/sessions/:id/cancel` is idempotent; double-submit under weak isolation could double-charge.
  - Multi-tenant scope: pricing keyed by `session.userId` correct if FK accurate; drift unverified.
  - Rate-limit/DoS: lock-held DB read amplifies contention.

- Data-truth / schema drift:
  - Model column vs caller field: `lateFeeAmount` frontend type changed to `number|null` (SessionDetailModal.actions.ts:76) but server `cancellationPolicy.lateFeeAmount` shape not in diff.
  - PascalCase/snake_case: none.
  - FK target drift: `getClientPackagePricing(session.userId,…)` assumes session has `userId`; if column is `clientId`, silent wrong pricing.
  - Frontend response-shape drift: `pricing.ts` dropped `savings` and `$200` tier; TypeScript type updated, so compile catches consumers — good.

## HIGHEST RISK
Blocker #1 (fallback-price leak). Cheapest de-risk before ship: in `useSessionPackagePricing`, treat `isFallback` as "unavailable" (keep `pricingUnavailable=true`); and in `applyServerDerivedChargeAmount`, when `pricing.isFallback` is true, explicitly set `billingOptions.chargeAmount = 0` and force `chargeType:'none'` (or throw) instead of early-returning, so a placeholder can never be persisted. Both are <10-line changes.

## CONFIDENCE
Unverified from document alone:
- Actual `useSessionPackagePricing` implementation (not in seed diff) — does it already check `isFallback`? If yes, Blocker #1 downgrades.
- Transaction wrapper around `cancelSession` (session.service.mjs:1728) — confirm `applyServerDerivedChargeAmount` runs inside `LOCK.UPDATE` transaction.
- Return shape of `getClientPackagePricing` and server `cancellationPolicy` response.
- Full frontend files for house-rule compliance (styled-components only, Crystalline Swan palette `var(--token,#fallback)`, 44px targets, dark-first, WCAG 4.5:1, <=300 lines, no NASM-certified). Supplied diffs show no MUI/Recharts and no "NASM-certified" language, but I cannot certify the whole repo.
Evidence to settle: full `_live-diff.txt`, a contract test asserting `isFallback` propagation, and a manual cancel with simulated pricing miss.
