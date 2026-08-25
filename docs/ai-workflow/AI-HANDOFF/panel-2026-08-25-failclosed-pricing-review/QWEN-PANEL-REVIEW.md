# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .ai-workflow/fusion/failclosed-pricing-review.md
**Tokens (Ollama):** 2473 in / 1357 out | **Wall:** 17.2s | **done_reason:** stop

---
## VERDICT
REJECT — The fix creates a silent under-charge vector (P0) by defaulting to `chargeType: 'none'` during the fetch window, and the decision to keep hardcoded magic numbers violates the core architectural principle of the audit.

## BLOCKERS
1. **P0: Silent Under-Charge on Race Condition.**
   - **Scenario:** Admin opens cancel panel for a client with a valid package. Network latency is >200ms. Admin clicks "Confirm Cancel" before `useSessionPackagePricing` resolves.
   - **Failure:** `pricingUnavailable` is `true` (initial state). `buildCancelPanelDefaults` returns `chargeType: 'none'`. Server receives `chargeType: 'none'`. `sessionRoutes.mjs:2235` sets `actualChargeAmount = 0`. Client is charged $0 instead of the full rate.
   - **Evidence:** `createDefaultPricingState()` initializes `pricingUnavailable: true`. The fix does not block the submit button or disable the action until pricing is resolved. It only disables the *radio buttons* for full/late fee, leaving 'none' selectable (or defaulting to it). If the UI defaults to 'none' when unavailable, the admin can confirm a $0 charge.

2. **P1: Hardcoded Fallbacks Remain as Time Bombs.**
   - **Scenario:** A future developer refactors `buildCancelPanelDefaults` or adds a new feature that reads `defaultFullCharge` without checking `pricingUnavailable`.
   - **Failure:** The hardcoded `175`/`88` are still in the codebase. If `pricingUnavailable` logic is bypassed or removed, the original bug (displaying/using fake prices) returns. The author explicitly stated the goal was to remove "hardcoded placeholders," yet they remain.
   - **Evidence:** The diff keeps `175` and `88` in `useSessionPackagePricing` and `buildCancelPanelDefaults`. The type `defaultFullCharge: number` remains, allowing invalid values to flow through if the gate is missed.

3. **P1: `late_fee` Server-Side Trust Vulnerability Unaddressed.**
   - **Scenario:** An attacker or buggy client sends `chargeType: 'late_fee'` with `chargeAmount: '999999'`.
   - **Failure:** `sessionRoutes.mjs:2247` executes `actualChargeAmount = parseFloat(chargeAmount)`. The server honors the client-supplied number for late fees. The frontend fix does not prevent this; it only prevents the *default* seed from being the placeholder. A malicious client can still overcharge themselves (or undercharge if they send `0`) or manipulate the ledger.
   - **Evidence:** `backend/routes/sessionRoutes.mjs:2247` shows `parseFloat(chargeAmount)` is used directly for `late_fee`. The audit noted this is a "real overcharge vector," but the fix is frontend-only.

## ATTACKS
- **Correctness:**
  - **Race Condition:** As noted in Blocker 1, the initial state `pricingUnavailable: true` combined with a default `chargeType: 'none'` creates a window where the user can confirm a $0 charge. The UI should either disable the entire submit button until pricing is resolved or force a re-fetch/re-validation on submit.
  - **Stale State:** If the fetch fails *after* the panel is opened, `pricingUnavailable` remains `true`. If the user then manually selects a different charge type (if possible) or if the UI allows editing the amount, the hardcoded `88` might still be used if the code path isn't fully gated. The audit claims the panel "stops seeding the custom amount," but does it prevent *manual* entry of the placeholder value?

- **Security:**
  - **IDOR/Authorization:** The `late_fee` handler trusts the client. This is a classic client-side trust violation. The server should calculate the late fee based on the session's timestamp and policy, not accept a client-supplied amount.
  - **Injection:** `parseFloat(chargeAmount)` is safe from SQL injection, but it allows arbitrary numeric input. This is a business logic vulnerability, not a security injection per se, but it breaks the integrity of the billing system.

- **Data-truth / Schema Drift:**
  - **Type Mismatch:** `defaultFullCharge: number` allows `0` or `NaN` if the fetch returns malformed data. The type should be `number | null` to enforce explicit handling of unknown states. The author rejected this due to "cascade" concerns, but this is a poor trade-off for correctness.
  - **Frontend/Backend Drift:** The frontend assumes `late_fee` can be client-defined, but the backend should be the source of truth. This drift leads to inconsistent billing behavior depending on which client sends the request.

## HIGHEST RISK
**The silent under-charge race condition (Blocker 1).**
**Cheapest De-risk:** Add a `disabled` prop to the "Confirm Cancel" button in the cancel panel that is `true` while `pricingUnavailable` is `true`. This prevents the user from submitting a $0 charge during the fetch window. Additionally, change the default `chargeType` to `'full'` when `pricingUnavailable` is `true` (fail-closed to overcharge rather than undercharge, as the original bug was an overcharge risk, but undercharging is a revenue loss). Actually, the best fail-closed is to **disable the entire panel** until pricing is known.

## CONFIDENCE
I am confident in the race condition and the server-side trust issue because they are directly visible in the code snippets and logic flow. I am less confident about the "cascade" cost of changing the type to `number | null`, as I cannot see the full codebase. However, the cost of a silent under-charge is far higher than the cost of refactoring 6 files. I did not verify the `PricingSheetPDF` dormant chain, but it is a lower priority than the active billing bug. I also did not verify if the `late_fee` server-side logic is actually exploitable in production (e.g., if there are rate limits or other checks), but the code snippet clearly shows the vulnerability.
