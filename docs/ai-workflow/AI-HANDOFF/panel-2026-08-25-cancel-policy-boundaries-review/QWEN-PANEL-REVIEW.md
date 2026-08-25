# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .ai-workflow/fusion/cancel-policy-boundaries-review.md
**Tokens (Ollama):** 1637 in / 1599 out | **Wall:** 25.2s | **done_reason:** stop

---
## VERDICT
REVISE — The core security and concurrency blockers are resolved, but the API contract remains semantically dishonest (returning a fee amount for a scenario where no fee is charged), and the "fourth placeholder" pattern indicates a systemic lack of schema-level enforcement for financial truth.

## BLOCKERS
1.  **P1 | Semantic Contract Violation (Misleading API Response)**
    *   **Scenario:** Client cancels a session. `GET /api/sessions/:id/cancel-warning` returns `{ lateFeeAmount: 55, message: "A fee of $55 may apply" }`. However, the backend logic explicitly skips billing for clients (`normalizeCancellationBillingOptions` discards client billing input). The client sees a warning for a charge that will never occur. This creates legal/UX liability and erodes trust.
    *   **Evidence:** The prompt states: *"the warning describes what cancelling actually does... instead of promising a fee the code never charges"* BUT also says *"lateFeeAmount now derives from getSessionPackagePricing... and is null when that helper reports isFallback"*. It does **not** state that `lateFeeAmount` is set to `null` or `0` for *clients* specifically, only for *fallback pricing*. If `isFallback` is false (standard pricing), `lateFeeAmount` will be non-null (e.g., 55 or 88) even though the code path for clients *never charges*. The prompt says the *message* was fixed, but if the JSON field `lateFeeAmount` still contains a number, any frontend consuming that field (or future integrations) will display a fee. **The field must be `null` or `0` for clients, not just the message text.**
2.  **P2 | Missing Audit Trail for Policy Exceptions**
    *   **Scenario:** A trainer cancels a session late. `cancellationChargeType` is set. A *client* cancels late. `cancellationChargeType` remains `null`. An admin runs a report: "Show all late cancellations with fees." The client cancellations are invisible. The business cannot distinguish between "client cancelled early (no fee)" and "client cancelled late (policy exception, no fee recorded)." This is a data-truth gap.
    *   **Evidence:** Prompt states: *"cancellationChargeType stays null, so late client cancellations are invisible to any admin report."*

## ATTACKS
-   **Correctness:**
    -   **Race Condition on Credit Restoration:** The prompt claims `lock: transaction.LOCK.UPDATE` prevents double-submit. However, if `sessionCreditRestored` is a boolean flag on the session row, and the transaction commits *after* the lock is released, a second request that acquires the lock *after* the first commit will see `sessionCreditRestored = true` and correctly throw. **BUT** what if the first transaction *fails* after acquiring the lock but before committing? The lock is released, the flag is unchanged. A second request proceeds. This is correct. **However**, if the credit restoration is an *external* call (e.g., Stripe refund) that happens *outside* the DB transaction, and the DB commit succeeds but the Stripe call fails, you have a state where `sessionCreditRestored = true` but no credit was actually restored. The prompt says "Credit restoration is separately guarded by `sessionCreditRestored`," implying it's in the DB. If it's an external call, this is a P0. **Assumption:** It's DB-only. If so, OK.
    -   **`isFallback` Gate:** If `getSessionPackagePricing` returns `isFallback: true`, `lateFeeAmount` is `null`. Good. But what if `isFallback` is `false` but the pricing is stale? The prompt says it's "duration-aware." OK.
-   **Security:**
    -   **IDOR:** Closed per prompt. `Number(session.trainerId) === Number(user.id)` is safe against type coercion attacks if `user.id` is always a number.
    -   **Injection:** No SQL injection risk evident from the description.
    -   **Multi-tenant:** `session.trainerId` is scoped to the user. OK.
-   **Data-truth / schema drift:**
    -   **`lateFeeAmount` vs `cancellationChargeType`:** The API returns `lateFeeAmount` (a number) but the DB stores `cancellationChargeType` (an enum/null). These are two different concepts. The API should reflect the *actual* charge, not a *potential* charge. If the policy is "clients never pay," the API should return `lateFeeAmount: 0` or `null` for clients, regardless of the session's base price. The current fix only nulls it for *fallback* pricing, not for *client role*. This is a schema drift between the API contract and the business logic.

## HIGHEST RISK
**The API contract is lying.** It returns a non-null `lateFeeAmount` for client cancellations (unless `isFallback` is true), implying a fee that will never be charged. This is a P1 because it misleads users and potentially violates consumer protection laws (false advertising of fees).

**Cheapest de-risk:**
1.  In `routes/sessions.mjs` (or the service), explicitly set `lateFeeAmount = null` (or `0`) if `user.role === 'client'`.
2.  Add a test: "Client cancels a standard-priced session. `lateFeeAmount` is `null`."
3.  Update the API documentation to state: "`lateFeeAmount` is `null` for client cancellations."

## CONFIDENCE
**What I could NOT verify:**
1.  **Exact implementation of `getSessionPackagePricing`:** Does it return `isFallback: true` for *all* client sessions, or only for sessions with missing/invalid pricing? If it returns `isFallback: false` for standard client sessions, then `lateFeeAmount` will be non-null. I assume it returns `isFallback: false` for standard pricing.
2.  **Whether `lateFeeAmount` is set to `null` for clients:** The prompt says the *message* was fixed, but not the *field*. I assume the field is still non-null for clients.
3.  **The exact value of `LATE_FEE_RATE`:** The prompt says it replaces `0.5`, but doesn't state the new value. I assume it's still `0.5`.
4.  **The exact copy of the warning message:** The prompt says it now says "your session credit will not be returned," but doesn't provide the exact string. I assume it's clear.

**Evidence that would settle it:**
1.  The actual code of `routes/sessions.mjs` or `services/sessions/session.service.mjs` where `lateFeeAmount` is set.
2.  The actual test cases for client cancellation.
3.  The API documentation for `GET /api/sessions/:id/cancel-warning`.

**My uncertainty:** I am 80% confident that `lateFeeAmount` is still non-null for clients, because the prompt only mentions fixing the *message* and the *fallback* case. If the field is still non-null, it's a P1. If it's null, it's a P2 (missing audit trail).
