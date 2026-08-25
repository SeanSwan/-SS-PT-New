# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .ai-workflow/fusion/pricing-hardening-review-2.md
**Tokens (Ollama):** 2681 in / 1401 out | **Wall:** 20.0s | **done_reason:** stop

---
## VERDICT
REJECT — The "server-derived charge" logic in `session.service.mjs` creates a critical financial integrity hole where `isFallback` is treated as a boolean truth signal rather than a data-quality flag, allowing silent over/under-billing or deadlock-prone transaction states that break the "production SaaS" promise.

## BLOCKERS
1. **P0: Financial Integrity / Logic Flaw in `applyServerDerivedChargeAmount`**
   - **Scenario:** A client has a valid package priced at exactly $175 (the hardcoded fallback). The pricing helper returns `{ price: 175, isFallback: true }` because it failed to find the specific package ID but matched the default rate. The code ignores `isFallback` results *only if* it treats them as "invented." However, the prompt states: "isFallback results IGNORED (the pricing helper returns its own hardcoded 175 when it cannot find a package — substituting that would swap one invented number for another)." 
   - **Failure:** If the logic *ignores* the result when `isFallback` is true, it leaves the validated amount alone. But if the validated amount was `0` (from a client who couldn't set billing) or a stale value, the cancellation proceeds with an incorrect charge. Conversely, if the logic *does* use the fallback when `isFallback` is false, but the package *actually* costs $110, and the helper fails to find the $110 package (returning $175 fallback), the client is charged $175 for a $110 session. The code does not distinguish between "Package not found, use default" and "Package found, price is $175." This is a direct revenue leak or overcharge.
   - **Evidence:** `backend/services/sessions/session.service.mjs` (implied logic in `applyServerDerivedChargeAmount`). The prompt admits: "isFallback is trusted as the honesty signal. What if a real package legitimately prices at exactly the fallback rate — does anything break?" Yes, it breaks trust and accuracy.

2. **P0: Transaction Deadlock / Lock Duration**
   - **Scenario:** `applyServerDerivedChargeAmount` runs `getClientPackagePricing` (a DB read) *inside* an open transaction that holds `LOCK.UPDATE` on the session row. Under high concurrency (e.g., 50 trainers cancelling sessions simultaneously), the read lock on the package table may wait for other transactions to complete, while the session row lock is held. If another transaction tries to update the package or read the session, it blocks. This creates a classic deadlock or severe latency spike.
   - **Failure:** `PATCH /api/sessions/:id/cancel` hangs or times out for all users during peak hours.
   - **Evidence:** `backend/services/sessions/session.service.mjs` (implied transaction scope). The prompt explicitly asks: "Is that a deadlock or lock-duration problem under concurrency?" Yes.

3. **P1: Silent Clamping of Legitimate Charges**
   - **Scenario:** A trainer sets a "late_fee" charge of $250 (e.g., a no-show penalty policy). The server clamps this to `sessionRate` ($175). The trainer sees the cancellation succeed, but the client is undercharged by $75. There is no operator feedback or audit log entry indicating the clamp occurred.
   - **Failure:** Revenue loss due to silent policy enforcement that contradicts business rules.
   - **Evidence:** `backend/services/sessions/session.service.mjs` (clamping logic). The prompt asks: "Clamping non-full types to sessionRate means a legitimate charge above one session... is silently reduced with no operator feedback. Right call or wrong?" Wrong.

## ATTACKS
- **Correctness:** 
  - **Stale State in Re-arm Effect:** The re-arm effect keys on `chargeTouched`. If a user selects "Full Charge," then switches to "None," then switches back to "Full Charge" *before* the pricing fetch resolves, the `chargeTouched` flag may prevent the re-arm from updating the amount to the newly fetched price. The panel shows the old placeholder or zero.
  - **Null/Undefined Mismatch:** `mapLateCancelWarning` now returns `number | null`. If the frontend component does not handle `null` explicitly (e.g., `if (fee) ...`), it may render `0` or `undefined` instead of "See cancellation policy."
- **Security:** 
  - **IDOR via Package Lookup:** `getClientPackagePricing` must ensure it only fetches the package for the *current* client. If it accepts a `packageId` from the request body without verifying ownership, a client could probe other clients' package prices.
  - **Replay/Idempotency:** The cancellation endpoint does not mention an idempotency key. A double-click on "Cancel" could trigger two charges if the first request is slow.
- **Data-truth / schema drift:** 
  - **Pricing Drift:** `config/pricing.ts` is corrected, but if the backend `session.service.mjs` still uses a hardcoded `175` fallback, there is a drift between the "corrected" frontend config and the backend logic. The backend should fetch the *actual* package price from the DB, not rely on a fallback that matches the old hardcoded value.

## HIGHEST RISK
The **P0 Financial Integrity** issue: `isFallback` is not a reliable signal for "use this price." A package priced at $175 is indistinguishable from a fallback of $175. The cheapest de-risk: **Remove the fallback logic entirely.** If `getClientPackagePricing` fails, throw a 500 error and *do not cancel* the session. Force the trainer to manually enter the charge or fix the package data. Never guess the price.

## CONFIDENCE
I cannot verify the exact implementation of `getClientPackagePricing` or the transaction scope in `session.service.mjs` because the file content is not provided, only described. I assume the deadlock risk is real based on standard Sequelize/Postgres behavior. I am confident that the `isFallback` logic is flawed because the prompt itself questions it. I am less confident about the `chargeTouched` race condition; it depends on the exact React effect dependencies, which are not shown. To settle this, I would need the full `session.service.mjs` code and the `useSessionPackagePricing` hook implementation.
