# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .ai-workflow/fusion/cancellation-workstream-review-and-next.md
**Tokens (Ollama):** 3992 in / 2882 out | **Wall:** 36.1s | **done_reason:** stop

---
## VERDICT
REVISE — The cancellation logic is currently a liability generator (charging clients for services they didn't buy or at wrong rates) and is sitting in a branch that does not exist in production, meaning the "fixes" are theoretical while the live product remains broken.

## BLOCKERS
1.  **P0: Production is still broken.** The document states: "All work is on a branch, not `main`. Render deploys from `main` only." and "NOT done: ... nothing deployed."
    *   *Failure Scenario:* A client cancels a session right now. The live code executes the *old* logic (hardcoded $175/$88, or the `isFallback` hole where backend trusts frontend). The "fixes" described in sections 3.1-3.9 are invisible to users. You are reviewing a patch for a bug that is actively bleeding money/reputation in production.
    *   *Evidence:* Section 4, "NOT done" bullet; Section 1, "Render deploys from `main` only."

2.  **P0: Migration Runner Ambiguity (Blocker C).** The document states: "local dev points at the PRODUCTION `DATABASE_URL`" and "Migration runner unknown... blocked by a safety gate."
    *   *Failure Scenario:* If you attempt to deploy the branch, or if a developer runs `npm run migrate` locally, you are running migrations against the **Production Database**. If the `ClientAvailability` migration (or any other pending migration) has a destructive operation or fails halfway, you have corrupted the live client data. If you *don't* run it, the new code crashes on missing tables/columns. This is a "footgun" that can take down the entire SaaS.
    *   *Evidence:* Section 5, Blocker C.

3.  **P1: Schema Gap A (Duration) causes incorrect financial charges.** The document states: "StorefrontItem has no duration field... A $110 30-min client cancelling a 60-min session derives the wrong rate either way."
    *   *Failure Scenario:* A client buys a 30-min package ($110). They book a 60-min session (perhaps a special add-on or error). They cancel. The server derives the charge based on the *package* rate ($110) or a hardcoded default. If the business rule is "charge for the session type booked," the client is undercharged. If the rule is "charge for the package rate," the client is overcharged if they booked a cheaper slot. More critically, if the system defaults to 60-min logic for a 30-min client, it charges $175 instead of $110. This is a direct financial error and a trust killer.
    *   *Evidence:* Section 5, Blocker A; Section 3, Item 5.

4.  **P1: FK Drift (Blocker E) is a latent data corruption risk.** The document states: "21 models reference `model: 'users'` (lowercase) against 144 using `'Users'`. Production carries both tables."
    *   *Failure Scenario:* Any write operation involving one of the 21 models (e.g., `TrainerAvailability`) will attempt to insert an FK into the `users` table. If the `users` table is empty or lacks the specific user ID (because the real data is in `Users`), the insert fails with an FK violation. If the `users` table *does* have a stale/duplicate ID, it creates orphaned data or links to the wrong user record. This is a ticking time bomb for data integrity.
    *   *Evidence:* Section 5, Blocker E.

## ATTACKS
-   **Correctness:**
    -   **Stale State / Race Condition:** The `isFallback` flag is a boolean state that can be stale. If the frontend fetches pricing, gets `isFallback: true`, but the backend *also* checks `isFallback` and defers to the frontend, who is the source of truth? If the frontend sends `chargeAmount: 175` (hardcoded) and the backend sees `isFallback: true` from its own check but *ignores* it because the frontend sent a value, you have a race where the "unknown" state is resolved by a hardcoded guess. The document says "Both layers handled 'unknown' by trusting the other," which is a classic distributed systems anti-pattern.
    -   **Off-by-One / Boundary:** The 24-hour boundary fix (Section 3, Item 7) is good, but is it tested against *server* time vs *client* time? If the client's clock is skewed, the "late" determination is wrong. The document doesn't mention server-side time validation for the cancellation timestamp.

-   **Security:**
    -   **IDOR / Multi-tenant Scope Leak:** The `getClientPackagePricing` function takes a client ID. Does it verify that the *current* user (trainer/admin) has permission to view *that specific* client's pricing? If a trainer can query any client's package pricing by ID, they can probe the entire client base's pricing structures. The document doesn't mention authz checks on this endpoint.
    -   **Replay/Idempotency:** The cancellation process involves a financial transaction (charge/forfeit). Is the cancellation endpoint idempotent? If a client double-clicks "Cancel," does it charge twice? The document mentions `chargeAmountSubmitted` is logged, but not if the *transaction* is idempotent.

-   **Data-truth / Schema Drift:**
    -   **Model Column vs Caller Field Drift:** The `StorefrontItem` lacks `duration`. The `Session` model likely has a `duration` or `type` field. The server derives the charge from `StorefrontItem` (package) but the session is a different entity. This is a fundamental data model mismatch. The "fix" of linking `Session` → `OrderItem` is correct, but until then, the data is lying.
    -   **Frontend Response-Shape Drift:** The frontend expects `pricingUnavailable` to be a boolean. The backend returns `isFallback`. If the mapping is done in a service layer, is that mapping consistent across all endpoints? If one endpoint returns `isFallback` and another returns `pricingUnavailable`, the frontend logic will break.

## HIGHEST RISK
**The Migration Runner pointing at Production (Blocker C).**
This is the single most dangerous item because it can cause **irreversible data loss or corruption** in the live environment. A single `npm run migrate` command in a dev environment could drop tables, alter columns, or insert bad data into the production database. This is not a "bug," it's a "nuclear button."

**Cheapest concrete way to de-risk:**
1.  **Immediately** create a separate `DATABASE_URL_DEV` that points to a local PostgreSQL instance (Docker or local install).
2.  **Update** `.env` or `config` to use `DATABASE_URL_DEV` for all local development and testing.
3.  **Add** a CI/CD check that *refuses* to run migrations if `DATABASE_URL` contains `render.com` or `prod` unless an explicit `ALLOW_PROD_MIGRATION=true` flag is set.
4.  **Verify** that the migration runner script explicitly checks the environment variable and fails fast if it detects a production URL in a non-production context.

## CONFIDENCE
-   **What I could NOT verify:**
    -   The exact implementation of the `isFallback` logic in the backend service. The document says it "defers to whatever the frontend sent," but I don't see the code. I am inferring the risk based on the description.
    -   The authz checks on the `getClientPackagePricing` endpoint. The document doesn't mention them, so I assume they are missing or weak.
    -   The idempotency of the cancellation endpoint. The document doesn't mention it.
    -   The actual state of the `users` vs `Users` tables in production. The document says "Production carries both tables," but I don't know the data distribution.

-   **Evidence that would settle it:**
    -   Code review of `services/sessions/session.service.mjs` to see the exact `isFallback` handling.
    -   Code review of the route handler for `GET /:id/cancel-warning` to see authz checks.
    -   A `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM Users;` query on the production database (with read-only access) to see the data distribution.
    -   The CI/CD pipeline configuration to see if there are any safeguards on migrations.

---

## JOB 2: DECISION

**Pick:** **Deploy what is built (with the Migration Runner fix).**

**Why:**
1.  **Acquisition Priority:** The owner's #1 gap is **CLIENT ACQUISITION**. The current product is broken in a way that *destroys* trust. A client who is charged $175 for a $110 session, or who sees a "fee" that isn't real, will not refer friends. **Retention is the foundation of acquisition.** If the core loop (book → cancel → bill) is broken, no amount of marketing will save you. You are leaking clients.
2.  **Urgency:** The branch has 13 commits of fixes for critical financial and trust issues. These are not "nice to have" features; they are "stop the bleeding" fixes. Deploying them is the highest ROI action.
3.  **Risk Mitigation:** The Migration Runner issue (Blocker C) is a blocker, but it is **solvable in hours** (create a dev DB, update env vars). The other items (Schema Gap A, FK Drift) are **structural** and take days/weeks. You cannot wait for the perfect schema to fix the broken billing.
4.  **Acquisition Link:** Once the billing is correct and trust is restored, *then* you can build the referral/milestone share features (Acquisition). But you can't refer clients to a product that charges them incorrectly.

**What I would NOT do:**
-   **SWA-214 (ClientAvailability):** This is a "nice to have" for the trainer, not a "must have" for the client. It does not touch acquisition. It is blocked on the migration runner anyway.
-   **Schema Gap A (Duration):** This is important, but it is a **data model** change. It requires migrations, testing, and potentially data backfilling. It is not a blocker for *deploying the current fixes*. The current fixes (hardcoded price removal, `isFallback` handling) are better than the status quo. You can deploy the "safe" version (fail-closed, no charge if unknown) and then fix the schema later.
-   **FK Drift (E):** This is a latent bug. It is not causing *current* failures (the system is working, just with the wrong table). It is a risk, but not a blocker for the billing fixes.

**Answer to the three open decisions:**

-   **A: Column on `StorefrontItem`, or link `Session` → `OrderItem`?**
    **Link `Session` → `OrderItem`.** This is the correct data model. A session is *funded* by an order item. The duration is an attribute of the *product* (StorefrontItem), but the *charge* is derived from the *transaction* (OrderItem). Linking them allows you to track *which* package funded the session, which is critical for accurate billing and reporting. Adding a column to `StorefrontItem` is a band-aid that doesn't solve the attribution problem.

-   **B: Should sessions expire?**
    **Yes, but with a grace period.**
    *   **Window:** 12 months from purchase.
    *   **Why:** This creates urgency (fill mechanism) and prevents clients from holding sessions indefinitely (which is a liability for the trainer). It also aligns with the "3-month/6-month/12-month" program structure.
    *   **What happens at expiry:** The session is forfeited. No refund. This is standard in the fitness industry.
    *   **Acquisition Link:** Expiry creates a "use it or lose it" urgency, which drives bookings. It also makes the "3-month program" more attractive because clients know they have to commit.

-   **D: Should a client late-cancel incur a fee?**
    **No.**
    *   **Why:** The client has already forfeited their prepaid session (real economic penalty). Charging a *fee* on top of that is punitive and will destroy trust. The "fee" is the lost session.
    *   **Acquisition Link:** A fair, transparent cancellation policy is a **marketing asset**. "No hidden fees, no late charges" is a selling point. A punitive policy is a red flag.
    *   **Exception:** If the client is a *no-show* (didn't cancel, just didn't show), *then* a fee is appropriate. But for *cancellations*, the forfeited session is the penalty.
