# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**Verdict: DEFECTS-FOUND. Do not release these five commits as a completed security/money-integrity repair.** Several improvements are valid, but the campaign missed the mounted workout handler, inconsistent allocation effects, and recovery across transaction boundaries.

This is an advisory review with local reproductions. **Archive filing is BLOCKED by the explicit read-only mandate.** No files, production data, provider state, or Git refs were changed.

**Evidence boundary**

- Reviewed campaign tip: `ad268c2d42a5782db8b1303f508bfefd1ffc845d`.
- Observed HEAD: `74170358b85284ba9c249ad5d80be63c0b02570b`; the additional commit changes protocol documentation.
- Cached feature-branch remote ref: `ad268c2d4`. Remote and deployment state were not queried.
- `git diff ad268c2d4 -- backend` was empty. The reviewed backend matches the campaign.
- The working tree has unrelated changes, including a deleted frontend component. It is not a clean release candidate.
- Five isolated Node harness runs executed actual source with in-memory dependencies. All exited `0`, confirming the defective behaviors described below. They did **not** verify PostgreSQL locking, Stripe signatures, production routing, or browser behavior.
- The claimed `6764 pass / 14 fail` and frontend typecheck were not rerun. The default test setup imports a logger that creates file transports; that conflicts with this pass’s no-write rule.
- Archive lookup reported index exclusions/link problems. A negative query is therefore not proof that no earlier review exists.

**A1 — Existing campaign and blueprint review**

The supplied directory contains `astra-packet.md`, not an existing fifteen-document blueprint. Its architecture claims, repair descriptions, test claims, and proposed backfill are the review targets. Missing wireframes or executable deployment criteria cannot be treated as reviewed artifacts.

| ID | Priority | Finding, evidence, and concrete repair |
|---|---|---|
| **F01** | **P0** | **The headline workout authorization repair targets a shadowed CRUD router.** `backend/core/routes.mjs:356` mounts `/api/workout` before `/api/workout/sessions` at `:357`. The earlier router owns session CRUD at `backend/routes/workoutRoutes.mjs:201–236`. Its controller still allows any trainer at `backend/controllers/workoutController.mjs:280`, `:310`, `:340`, and `:380`. Isolated calls by trainer `101` against client `202` returned **200/201 for read/create/update/delete**. Repair the first-mounted controller; test both routers mounted in production order. Do not merely reorder them—their response and validation contracts differ. |
| **F02** | **P1** | **The ACH/admin allocator claims success without updating the balance used by the product.** `backend/services/SessionAllocationService.mjs:107–127` creates session rows, calls `updateUserSessionBalance`, and claims `paymentAppliedAt`; that helper only logs at `:297–306`. The unified allocator actually increments the balance at `backend/services/sessions/session.service.mjs:2750`. Probe: **2 sessions created, balance 0, marker set, retry no-op**. Use one allocation implementation with one atomic balance/claim/ledger transaction. |
| **F03** | **P1** | **The freeze and expiry fixes remain racy.** Checkout reads at `backend/routes/v2PaymentRoutes.mjs:325`, creates the provider session at `:492`, then stamps the cart at `:523`. Mutation checks precede unlocked writes, e.g. `backend/routes/cartRoutes.mjs:620–634`. Main-webhook expiry reads, compares, then saves at `backend/webhooks/stripeWebhook.mjs:205–211`. Probe: an old expiry read followed by a new checkout left **`checkoutSessionId=cs_new`, `checkoutSessionExpired=true`, `paymentStatus=expired`**. Use transactional preparation and a conditional expiry update; remove age-based authorization to mutate purchased terms. |
| **F04** | **P1** | **The charged amount does not identify what was purchased.** Credits come from live catalog fields at `backend/services/SessionGrantService.mjs:31–57`; reconciliation checks row prices at `:77–108`. Probe: changing catalog credits **1→20** while retaining a $100 row still passes a $100 charge. Missing charge data and partially unpriced rows also passed. `backend/services/orderSessionExtraction.mjs:79–108` repeats live-catalog extraction. Freeze item identity, quantity, unit price, and credits before creating checkout; fulfill that snapshot. Unknown terms go to review. |
| **F05** | **P1** | **Post-commit “best effort” permanently loses financial records.** Allocation commits at `backend/services/SessionAllocationService.mjs:123`, then writes the financial row at `:127`; failure is swallowed, and retries exit on the claim at `:72`. Probe: financial insertion failed once; retry made **no second attempt**. Both allocators have this pattern. Make the required accounting row atomic with allocation, or persist a transactional outbox obligation. This package chooses the atomic row. |
| **F06** | **P1** | **Cart and order claims do not share one purchase identity.** Cart fulfillment grants the user and sets `sessionsGranted`, while `backend/services/cartCheckoutFulfillmentService.mjs:224–251` creates a completed order without setting the allocation claim. The order allocator can subsequently treat that order as unallocated. Repair with a unique purchase-level grant record shared by cart, order, ACH, manual, and package callers. This is source-confirmed; a real cross-caller race remains untested. |
| **F07** | **P2** | **The onboarding column repair still writes an invalid enum value.** `backend/routes/clientOnboardRoutes.mjs:281–282` inserts `noteType='onboarding'`; the model allows only `observation`, `red_flag`, `achievement`, `concern`, `general` at `backend/models/ClientNote.mjs:43–46`. The creating migration agrees. The error is caught inside the transaction. Use `general` with an onboarding tag, and make requested assignment/note creation atomic with account creation. Live schema state is unverified. |
| **F08** | **P0** | **Private-media exposure has a third entry point.** In addition to `/api/serve-photo/...` and `/uploads`, `backend/core/middleware/index.mjs:117–150` exposes `/photos/*`, including `measurements`, and issues one-hour signed redirects. Repair all aliases and direct-storage publication together. A fix to `photoServeCategories.mjs` alone is insufficient. |
| **F09** | **P0** | **The privacy claim needs an end-of-pipeline test.** AI chat does have `strictPiiMiddleware` at `backend/routes/aiChatRoutes.mjs:466`, contradicting an entirely unfiltered characterization. However, target-specific stripping is skipped without a selected client at `:600–640`, and the result reaches `sendChatMessage` at `:728–731`. A synthetic onboarding name, birth date, and medication all survived the actual sanitizer with `hasCriticalPII=false`. Keep new-client identity capture local; require a validated outbound data contract before any provider call. No external request was made. |
| **F10** | **P1** | **Mismatch ACKs do not establish a durable recovery obligation.** `backend/webhooks/stripeWebhook.mjs:149–160` logs and acknowledges; the grant service rolled back without recording a review case. Meanwhile `SuccessPage.tsx:132–135` tells the buyer the team is reviewing the order. Persist a review record before acknowledging a permanent failure, and derive the UI from that record. |
| **F11** | **P1** | **Refund linkage and debit attribution are incomplete.** Main webhook has no refund case; cart completion does not persist the final payment-intent ID. More seriously, `backend/services/refundReconciliationService.mjs:182–185` revokes `min(originalGrant, currentAccountBalance)`. If purchase A was consumed and purchase B remains, refunding A can revoke B’s credits. Link refunds to their purchase and track consumption per grant. Partial and historical ambiguous refunds require review, not guessed debits. |
| **F12** | **P0/P3** | **URL logging remains incomplete.** The repaired incoming-request log uses redaction, but `backend/core/app.mjs:100`, `:188`, `:212`, and `:381` still log raw request URLs; the global error logger does so at `backend/core/middleware/errorHandler.mjs:59`. Route every URL-bearing logger through the same redactor, including OPTIONS, errors, and SPA fallback. Test emitted logs with synthetic canaries. |

**Additional verified limits and corrections**

- **Webhook validation differs by entry point.** The legacy cart webhook checks `payment_status === 'paid'`; the main cart branch at `backend/webhooks/stripeWebhook.mjs:107–138` does not check paid status, session identity, or metadata owner before calling the grant service. An isolated unpaid/stale-session fixture reached that call. This is a verified missing guard, **not proof that an unauthenticated attacker can forge Stripe events**; signatures remain required.
- **Dormant ownership reassignment exists.** The shadowed workout PUT accepts `userId` through its Zod schema at `backend/routes/workoutSessionRoutes.mjs:261–271`, authorizes the old owner, then applies the body at `:346`. The probe reassigned `101→202`. This must be removed before that handler is exposed; it is not the mounted CRUD exploit.
- **Do not run the packet’s backfill.** The model table is `orders`, not `"Orders"` (`backend/models/Order.mjs:89`). More importantly, `status='completed'` proves neither correct allocation nor a correct balance. Blanket stamping would conceal F02 and historical failed allocations.
- **Rate limiting is incomplete, not nonexistent.** `apiLimiter` is imported by badge and exercise routes. No global mount was found in the inspected core/server files. Public provider-backed routes remain at `backend/routes/freeApiRoutes.mjs:43–68`.
- **Boot-time schema mutation is real but configurable.** Production repair defaults on at `backend/core/startup.mjs:45–51`; `backend/utils/productionDatabaseSync.mjs:270–281` calls `sync({alter:{drop:false}})`. It can be explicitly disabled. Migration failures remain nonfatal in `backend/scripts/render-start.mjs:95–100`; startup checks only specific schema conditions at `backend/core/startup.mjs:521–544`.
- **The notification repair is an application allowlist repair**, not proof of a database enum or foreign-key repair: `backend/models/Notification.mjs:37–45`.
- **The FK migration allegedly “missing” notifications discovers constraints dynamically** through `pg_constraint`; absence from a hardcoded list proves nothing. Its deployment and resulting constraints require isolated-schema and separately authorized production evidence.
- **The error handler preserves `err.status`** at `backend/core/middleware/errorHandler.mjs:71`; the narrower remaining concern is other error shapes, including `statusCode`.
- **Historical trainer access is inconsistent.** Variation history filters by author at `backend/routes/variationRoutes.mjs:197–200`, while timeline uses active assignment. The package explicitly chooses active-assignment access for cross-client records.
- Waiver candidate matching is confirmed at `backend/controllers/publicWaiverController.mjs:344–379`. **Candidate creation alone does not prove automatic legal attribution.** Review every consumer before making that stronger claim.

**What wave 3 must do differently**

Test **composed workflows**, not isolated helper shapes:

1. Mount the actual routers in actual order.
2. Exercise every caller against the same purchase and user.
3. Interleave checkout creation, mutation, expiry, payment, refund, and retry.
4. Inject failure after every database write and immediately after commit.
5. Assert the user balance, grant provenance, financial record, order state, and response together.
6. Capture outbound provider payloads and every logging path using synthetic data.
7. Run real PostgreSQL constraints and concurrency tests in a disposable environment.
8. Bind results to source hashes and deployed schema versions.

The existing source-text suites can remain architectural tripwires. They cannot certify authorization, PostgreSQL serialization, accounting completeness, or recovery.

**A2 — One hostile pass over the drafted package**

| Draft defect | Correction incorporated below |
|---|---|
| A unique webhook event ID would still allow two different events to grant one payment twice. | D-005 requires both event uniqueness and purchase-level grant uniqueness. |
| A blanket historical marker migration would bury missing balances. | D-008 requires evidence-based classification and quarantines ambiguous history. |
| Refund reversal could consume another purchase’s balance. | D-009 introduces grant consumption provenance; ambiguous legacy refunds never auto-debit. |
| A signed private-media redirect would outlive authorization revocation. | D-002 uses authenticated streaming with private, noncacheable responses. |
| Rolling back code could restore exposed endpoints or ignore new grant claims. | D-014 keeps containment and durable claims forward-compatible; unsafe rollback is prohibited. |
| A broad file-size exemption would contradict the supplied limit. | D-016 requires a bounded extraction manifest; no new blanket exemption is granted. |
| “Package ready” would overstate unrun database, UI, and archive gates. | `14-verification.md` explicitly marks implementation readiness BLOCKED. |
