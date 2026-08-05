# Kimi K3 hostile-review packet — SwanStudios STORE / CHECKOUT (revenue path)

You are the external hostile reviewer for the **money path** of a production personal-training
SaaS about to be promoted on YouTube. Cold traffic will land on `/store` and pay real money.
Your job is to find what 31 rounds of internal hostile review did **not**.

**Bias hard toward: security holes, hidden schema/DB drift bugs, and tests that create false
confidence.** Assume the internal reviewer (me) is over-confident and has blind spots — several
of my own findings this audit turned out to be things I had over-claimed, so treat my
conclusions as claims to attack, not as ground truth.

---

## 1. Stack + hard constraints

- Backend: Node 22, Express, **Sequelize on PostgreSQL**, ESM (`.mjs`).
- Frontend: React 18 + TypeScript + styled-components. No MUI.
- Payments: **Stripe Checkout Session (redirect model)**, not Elements. Webhooks signed.
- Hosting: Render. Frontend is a **static site** at the apex `sswanstudios.com`; only `/api` is
  proxied to the backend origin. Backend also reachable directly at `ss-pt-new.onrender.com`.
- Rule: **zero PII to LLMs** — this packet contains IDs, code shapes and route names only.

## 2. Known live-production facts (verified by probe, not assumed)

- `GET /api/storefront` → 200, `pricesVisible: false`, **7 packages**; the canonical seeder
  defines **5**. All price fields come back `null` for unauthenticated callers.
- Prices are hidden from EVERYONE — guests, users, clients, trainers — until an admin grants
  that specific user a `store-prices` feature flag. Enforced server-side, fail-closed.
- `POST /api/cart/add` unauthenticated → **401**. `POST /api/v2/payments/create-checkout-session`
  unauthenticated → **401**.
- `POST https://sswanstudios.com/webhooks/stripe` (apex) → **200, empty body** — because the
  static site's SPA rewrite `/*  → /index.html` swallowed the whole prefix. `/api/webhook/stripe`
  → **400 "No stripe-signature header value was provided"** (correct). Backend origin →
  400 (correct). *A redirect guard for `/webhooks/*` was added this session.*

## 3. Money-path architecture (trace these)

**Cart:** `backend/routes/cartRoutes.mjs` — `POST /add`, `PUT /update/:itemId`,
`DELETE /remove/:itemId`, `DELETE /clear`, plus a legacy `POST /checkout` that returns 410, and a
second Stripe webhook at `POST /webhook`.
Auth chain: `protect` → `ensureNumericCartUser` → `validatePurchaseRole`.
Price is snapshotted from the DB at add-time (`firstMoney(variant?.price, item.totalCost, item.price)`),
never taken from the request.

**Checkout:** `backend/routes/v2PaymentRoutes.mjs` — `POST /create-checkout-session`,
`POST /verify-session`, `GET /activation-status`, `GET /health`.
Claims the cart with a compare-and-swap (`UPDATE ... WHERE id=? AND userId=? AND status='active'`)
→ 409 `CART_CHECKOUT_IN_PROGRESS` if already claimed. Uses a Stripe `idempotencyKey` derived from
`userId + cart.id + item fingerprint + the cart's PRIOR lastCheckoutAttempt`.

**Webhook:** `backend/webhooks/stripeWebhook.mjs` — `constructEvent` signature verification;
`express.raw` applied and `express.json` bypassed for webhook paths via a path-exclusion list in
`backend/core/middleware/index.mjs`. Handles `checkout.session.completed`, `expired`,
`payment_intent.processing|succeeded|payment_failed`.

**Crediting:** `backend/services/SessionGrantService.mjs` → `grantSessionsForCart()`.
Row-locks the cart (`FOR UPDATE`), early-returns if `cart.sessionsGranted === true`, refuses if the
webhook's `checkoutSessionId` ≠ the cart's, then `user.increment('availableSessions', ...)` inside
the transaction, burns down special offers, writes the Order, marks the cart completed.

**There are FIVE live Stripe webhook surfaces sharing one signing secret:** the canonical one
(mounted twice as `/webhooks/stripe` and `/api/webhook/stripe`), plus `cartRoutes` `/webhook`,
`sessionPackageRoutes` `/webhook`, `subscriptionRoutes` `/webhook`.

## 4. What I already found and fixed (attack these fixes — they are the newest code)

1. Seeder `FORCE_RESEED` ran `TRUNCATE storefront_items RESTART IDENTITY CASCADE` — would erase
   paid `order_items`. Now refuses when any `order_items` row exists.
2. **No rate limiting existed on ANY money endpoint.** Added per-user-then-IP limiters
   (cart mutations 120/15min, checkout 20/15min, verify 60/15min). In-process MemoryStore, so
   per-process and reset on deploy.
3. Webhook logged the **unverified** request body on the missing-secret branch.
4. Checkout-cancel recovery deep link (`?openCart=true`) had no consumer on either store surface.
5. Post-payment failure screen rendered raw `error.message` ("Request failed with status code 500")
   to a buyer who may have been charged, with only a "Return Home" button.
6. Double-submit window: `isProcessing` cleared BEFORE a 1s deferred redirect.
7. `/checkout` had no route back to the store when the cart was empty.
8. Cart dialog declared `aria-modal` without a focus trap.
9. **Cart quantity had no upper bound.** Training packages carry `stockQuantity: null`, so the
   stock check is skipped for exactly the items sold; `ShoppingCart.total` is `DECIMAL(10,2)`.
   Capped at 99/line on all three entry points including the add-again merge path.
10. **Displayed total vs charged total are computed by two independent implementations**
    (`cartHelpers.calculateCartTotals` vs `v2PaymentRoutes.resolveCheckoutLineItem`) and they
    disagree on malformed quantity — `quantity: 0` showed $0.00 and charged $175.00, because the
    resolver does `Number(qty) > 0 ? qty : 1`. Now fails closed with a 409 before Stripe lines are
    built.
11. Cart session count vs granted session count also diverged (`sessions: 0, totalSessions: 48`
    displayed 0 but credited 48). De-duplicated onto the grant's canonical helper.
12. Removed six tests whose names claimed to cover the double-credit invariant but which asserted
    literals against themselves and never called production code.

## 5. Known-open items (do NOT just re-report these — go past them)

- **No `event.id` replay dedupe** on the training-package webhook path. Replay safety is
  state-based only: `cart.sessionsGranted` under a row lock + an `Order.paymentAppliedAt` claim.
  Gallery credits/donations/prints DO dedupe on session id via a `processed_stripe_sessions` table;
  the training path does not.
- A **second session-crediting rail** exists: `SessionAllocationService.allocateSessionsFromOrder`
  has **no idempotency guard**, while `unifiedSessionService.allocateSessionsFromOrder` does. The
  admin route `POST /api/sessions/allocate-from-order` (`protect + adminOnly`) calls the unguarded
  one. Filed separately.
- `StorefrontItem` has **three overlapping money columns**: `price`, `totalCost`, `pricePerSession`.
  A `beforeValidate` hook derives `totalCost` then copies it to `price` only when `price` is null.
  The Stripe cart rail reads `totalCost` first; the ACH/offline rails read `price` **only**.
- `Order` is a **mixed-convention model**: implicit camelCase columns for the first ~80 lines, then
  explicit `field:` snake_case mappings (`trainer_id`, `tax_amount`, `sessions_granted`, …).
  `Order.sessionsGranted` is an INTEGER count while `ShoppingCart.sessionsGranted` is a BOOLEAN
  flag — same property name, different types, on two models joined by `cartId`.
- Upstream just renamed `users` → `_dead_users` and repointed canonical FKs. Historically this repo
  had a dual `users` / `"Users"` table and FKs had to reference `"Users"`.

## 6. What I want from you — ranked

1. **Security holes on the money path** I have not named. Especially: authz gaps between the five
   webhook surfaces; anything where a *client-supplied* value reaches a money decision; the
   invitation/price-gate bypass surface; the special-offer redemption path; whether the
   compare-and-swap cart claim can be defeated by cancel→reopen cycling.
2. **Hidden schema/DB drift bugs.** Given the three money columns, the mixed camel/snake `Order`
   model, the same-name-different-type `sessionsGranted`, and the `users` → `_dead_users` rename:
   what breaks, and where would a raw SQL query silently read the wrong column?
3. **Tests that create false confidence** — the class in §4 item 12. Where else would you expect
   this codebase to have them, and what would you grep for?
4. **What a determined attacker does first** against this specific revenue path, ranked by
   cheapness of execution.
5. **Anything in §4 where my fix is wrong, incomplete, or introduces a new hole.** Be specific and
   adversarial — that list is the newest, least-reviewed code in the system.

Give concrete file/function-level reasoning and a severity for each finding. If you think a
finding of mine is overstated, say so — I have already had to correct three of my own claims this
audit and would rather find a fourth than ship it.
