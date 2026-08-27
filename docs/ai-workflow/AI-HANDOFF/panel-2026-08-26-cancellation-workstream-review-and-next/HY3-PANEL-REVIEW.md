# Hostile review + "what should we build next" — cancellation & pricing workstream — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** .ai-workflow/fusion/cancellation-workstream-review-and-next.md
**Seed:** .ai-workflow/fusion/_full-diff.txt
**Tokens:** 9222 in / 11011 out | **Cost:** ~$0.0071 | **Wall:** 186.9s | **finish_reason:** stop

---

## VERDICT
REVISE — the client forfeit fix is dead code (`!billingOptions` is always false, so late-cancel economic events stay invisible) and the next build should be acquisition-focused rather than waitlist auto-backfill.

## BLOCKERS
1. P0 — Silent failure of forfeit recording. Inputs: `user.role === 'client'`, late cancel (`hoursUntilSession < 24`), `session.sessionDeducted === true`. Expected: `session.cancellationDecision = 'forfeited'` stamped. Actual: condition `if (!billingOptions && !creditRestored && session.sessionDeducted && session.userId)` never executes because `billingOptions` is always a truthy object from `normalizeCancellationBillingOptions` (assigned at `backend/services/sessions/session.service.mjs` diff line ~1752), and the right-hand `creditRestored` is undefined (should be `shouldRestoreCredit`), so the intended stamp is skipped entirely. File:line: `backend/services/sessions/session.service.mjs` added block (diff hunk `@@ -1734,6 +1817,21@@`), lines `if (!billingOptions && !creditRestored ...` and preceding `const billingOptions = normalizeCancellationBillingOptions(...)`.

2. P1 — Money audit fields not persisted. Inputs: any admin/trainer cancellation with charge adjusted (e.g., submitted 150, clamped to 110). Expected: dispute can query applied vs submitted from DB. Actual: `chargeAmountSubmitted` and `chargeAmountSource` are set on the JS object and only `logger.info`'d; no column write in `session.save`. File:line: `backend/services/sessions/session.service.mjs` `applyServerDerivedChargeAmount` (diff lines adding `billingOptions.chargeAmountSubmitted = submitted;` etc.) — no corresponding schema/migration supplied.

3. P1 — Missing object-level authorization on cancel-warning / cancellation. Inputs: authenticated client A passes `:id` of client B's session. Expected: 403. Actual: route uses only `protect` (no ownership/role check in diff). File:line: `backend/routes/sessions.mjs:2868` (`router.get("/:id/cancel-warning", protect, ...)`); similar pattern likely in cancel POST.

4. P2 — FK target drift (pre-existing). Inputs: any query via the 21 models referencing `model: 'users'` (lowercase). Expected: FK to `Users` table. Actual: production carries both `users` and `Users` tables; latent FK violation / cross-table leak. File:line: documented §5E (no file:line supplied in document).

## ATTACKS

- Correctness:
  - `!billingOptions` always false (see Blocker 1); if corrected without fixing the `creditRestored` typo, the branch throws ReferenceError and aborts the cancellation save.
  - `applyServerDerivedChargeAmount` silently returns when `sessionRate` not finite (no log), leaving charge unverified with no trace.
  - Clamp `Math.min(submitted, sessionRate)` assumes no legitimate charge > one session; a future no-show fee collides immediately (documented §7.2).
  - `useSessionPackagePricing` still falls back to `DEFAULT_FULL_CHARGE` (175) if `pricePerSession`/`defaultChargeAmount` missing even when `isFallback !== true` — possible wrong default for $110 clients if data shape drifts.
  - Positive-controlled tests claimed, but dead forfeit code implies the control for fix #9 does not exist or does not exercise client role.

- Security:
  - Authz: only `protect` shown; no evidence of `req.user.id === session.userId` or role gate on `/:id/cancel-warning` (IDOR).
  - Secret/Env: local dev points at PRODUCTION `DATABASE_URL` (§5C) — a migration runner bug could mutate prod.
  - DoS: pool-exhaustion livelock risk if any future caller omits `{ transaction }` to `getClientPackagePricing` (Sequelize v6 no CLS).
  - Multi-tenant: lowercase `users` FK drift (§5E) can route writes/reads to wrong table.

- Data-truth / schema drift:
  - `StorefrontItem` has no duration column (§5A) → server cannot distinguish $175/60 vs $110/30, deriving wrong cancellation rate either way.
  - `chargeAmountSubmitted` / `chargeAmountSource` are caller-object fields with no DB column → frontend/admin report shape drift from persisted shape.
  - `cancellationDecision: 'forfeited'` added as JS-level value; all existing consumers live in unmounted legacy file, so live admin reports may ignore it (silent enum drift).
  - Frontend `LateCancelWarningModel.creditRestored: boolean | null` but server always sends boolean (minor response-shape drift).
  - PascalCase-vs-snake: model name `'users'` vs `'Users'` (§5E).

## HIGHEST RISK
The dead forfeit-stamp condition in `session.service.mjs` (Blocker 1) is the most dangerous: it silently leaves client late-cancellations uncounted despite an explicit claim of fix, directly hiding real revenue/forfeit events from every admin report. Cheapest de-risk: replace `if (!billingOptions && !creditRestored && ...)` with `if (user.role === 'client' && !shouldRestoreCredit && session.sessionDeducted && session.userId)` (using the already-declared `shouldRestoreCredit`), delete the `!billingOptions` guard, and add a positive-controlled backend test that cancels a deducted session as a client inside the 24h window and asserts `cancellationDecision === 'forfeited'`; revert should make it red.

## CONFIDENCE
I could NOT verify from the document alone: (1) that `normalizeCancellationBillingOptions` indeed always returns a non-null object (assumed from name and diff); (2) whether `creditRestored` is declared elsewhere in the service file outside the diff; (3) whether `protect` or upstream middleware enforces session ownership/role (IDOR unconfirmed); (4) whether any live admin report consumes `cancellationDecision` so the new `'forfeited'` value is visible; (5) full house-rule compliance (styled-components only, Victory charts, Crystalline palette via var, Dual-Button Glow, 44px touch, dark-first, WCAG 4.5:1, ≤300 lines/file, zero PII to LLMs, no "yoga/meditation" copy) — the supplied diff shows no violation but covers only a sliver of the repo; (6) that the positive-controlled tests actually cover the client late-cancel path. Evidence to settle: grep the service file for `creditRestored` and `normalizeCancellationBillingOptions` return, run backend test suite with `--coverage` on `UnifiedSessionService.cancel` for client role, inspect `protect` implementation and route mounts, and query the DB schema for `chargeAmountSubmitted` columns and `StorefrontItem.duration`.
