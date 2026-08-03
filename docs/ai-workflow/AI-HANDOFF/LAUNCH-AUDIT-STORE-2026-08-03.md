---
decision: Store/checkout revenue path is launch-ready EXCEPT two Sean-owned confirmations (Stripe webhook URL, catalog price truth)
status: open
supersedes: none
---

# Launch-Readiness Deep Audit — STORE / CHECKOUT (Lane 4 of 5)

**Auditor:** VS-Claude (Fable 5), Lane 4 · **Date:** 2026-08-03
**Base:** `origin/main` @ `0949eaf6b` in isolated worktree `c:/tmp/ss-launch-audit-lane4-20260803`,
branch `claude/launch-audit-lane4-20260803`. The shared tree
(`wip/comms-notifications-2026-07-05`) is 684 commits behind main and was **not edited**
by this lane except its own coordination file.
**Commits (local, NOT pushed — integrator reconciles):** `8266626ec`, `eb5366b15`,
`ba94154e5`, `166983237`, `3f473dc74`, `42c84a077`, `79c5f7b23`, `92b8b863a`.

> **Header notice (C4):** no shared-infrastructure file was edited. One P0-adjacent
> hazard lives in `render.yaml` and one in `CLAUDE.md`; both are written up as
> **SHARED-INFRA PROPOSALS** (§6) for the integrator, not applied here.

---

## 0. LAUNCH-READY VERDICT

**LAUNCH-READY: NO — 2 named blockers, both Sean-owned confirmations, neither a code defect.**

| # | Blocker | Why it blocks | Owner | Effort |
|---|---|---|---|---|
| **B1** | **Confirm the Stripe webhook endpoint URL in the Stripe dashboard.** `https://sswanstudios.com/webhooks/stripe` returns **HTTP 200 with an empty body** to any POST (§2 F-1). Stripe reads 2xx as delivered. If the dashboard points there, every payment is marked delivered while **no sessions are credited** — silently, with no 4xx in Stripe, no backend log, and no retry. | A buyer pays $8,400 and receives nothing; nothing alerts anyone | Sean (dashboard access) | ~2 min to check |
| **B2** | **Confirm live catalog price truth.** Live prod serves **7 packages**, the canonical seeder defines **5** (§3). Prices are invisible to me because the invitation gate strips them from every public response, so I could not verify "$175/session flat" against the live DB. | A wrong price on the money path at the moment YouTube traffic arrives | Sean or an authenticated admin read | ~5 min |

Everything else on the revenue path that I could verify is sound, and **11 real defects
found during this audit are fixed with proof** (§1) — including three that would have hit
buyers directly: a charged customer stranded with a raw axios error and no retry, a
one-second window that could mint a second Stripe session for the same cart, and a
`/checkout` screen with no route back to the store.

**Not a blocker, but the single biggest launch-conversion decision:** a YouTube stranger
who lands on `/store` sees **no prices at all** — by design (§4). That is Sean's explicit,
server-enforced policy, correctly implemented and fail-closed. It is called out in §4
because it changes what "launch-ready" means for cold traffic.

---

## 1. FIXES SHIPPED THIS LANE (with proof)

All five commits are local to the audit branch. Every claim below was verified in-session.

### F-A · P0 — Catalog reseed would have erased paid order history
`8266626ec` · `backend/seeders/20260407-seed-storefront-packages.mjs`

**Finding.** `FORCE_RESEED=true` clears the catalog with
`TRUNCATE TABLE storefront_items RESTART IDENTITY CASCADE`
(`backend/seeders/20260407-seed-storefront-packages.mjs:76` pre-fix). `cart_items` and
`order_items` both carry FKs to `storefront_items`. **`TRUNCATE … CASCADE` truncates the
dependent tables outright — it does not honour the `ON DELETE SET NULL` tombstone relax**
added by `migrations/20260711000001-make-order-item-catalog-reference-tombstone-safe.cjs`.
The model-destroy fallback deletes `CartItem` and `OrderItem` rows explicitly for the same
reason (pre-fix `:80-85`).

**Why it mattered now.** `CLAUDE.md` → *Open Items → Storefront Packages* still lists this
exact command as a pending production action ("**NEEDS:** Run `FORCE_RESEED=true …` in
Render shell to wipe bad data") from the era when the catalog was disposable. Live prod now
carries real orders. The instruction had silently become destructive — a Rule-75
trailhead-truth failure in the most dangerous possible place.

**Fix.** Fail-closed guard: refuse when any `order_items` row exists; name the row count and
the safe alternative (admin storefront UI); require an explicit
`I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY=true` for genuinely disposable databases.

**Proof.** `backend/tests/api/storefrontSeederPaidHistoryGuard.test.mjs` — **7/7 pass**.
Failing→passing verified: with the guard stashed, 2 of 5 tests fail.

### F-B · P1 — The entire revenue path had zero rate limiting
`eb5366b15` · new `backend/middleware/moneyPathRateLimits.mjs`; wired into
`backend/routes/cartRoutes.mjs`, `backend/routes/v2PaymentRoutes.mjs`

**Finding.** `[VERIFIED]` by grep: **no limiter of any kind** on `cartRoutes.mjs`,
`v2PaymentRoutes.mjs`, `orderRoutes.mjs`, `storeFrontRoutes.mjs`, `achPaymentRoutes.mjs`,
`offlinePaymentRoutes.mjs`, `sessionPackageRoutes.mjs`. Meanwhile the *public contact form*
was already capped at 5/15min (`middleware/rateLimiter.mjs:111`, confirmed live:
`ratelimit-policy: 5;w=900`). The endpoints that actually cost money were the unprotected
ones. `POST /api/v2/payments/create-checkout-session` mints a real Stripe object per call
(`v2PaymentRoutes.mjs:563`), so an authenticated account could loop it to burn Stripe API
quota, flood the dashboard with abandoned sessions, and churn cart rows.

**Fix.** Cart mutations 120/15min; checkout-session creation 20/15min; verify/activation
60/15min. **Keyed per authenticated user id, falling back to IP** — IP alone would bucket
every client training at the same gym (shared NAT) into one quota. `trust proxy = 1` is
already set (`core/app.mjs:44`), so the IP fallback resolves the real client.

Deliberate non-targets, each verified:
- `GET /api/cart` stays **unlimited** — throttling a read would show a logged-in buyer an empty cart.
- **Stripe webhooks stay unlimited** — Stripe retries and bursts by design; a throttled webhook is a lost session credit. Signature verification is the correct control and is in place.
- Post-payment polling: `SuccessPage` calls activation-status **at most twice per visit** (`SuccessPage.tsx:83`, `:126`) — no polling loop, so the 60-call ceiling cannot throttle a buyer who has already paid.

**Proof.** `backend/tests/api/moneyPathRateLimits.test.mjs` — **13/13 pass**: throttle fires
at the ceiling through a live express app, per-user keying verified (a throttled buyer does
not block a neighbour on the same IP), both `message` and `error` keys populated so a
throttled buyer sees a recoverable message, and the wiring is pinned. Existing money-path
suites **24/24**. `node --check` + import-execution clean.

### F-C · P1 — The webhook logged the unverified request body
`ba94154e5` · `backend/webhooks/stripeWebhook.mjs:58-61`

**Finding.** The missing-secret branch fires **before** signature verification on a publicly
reachable route, and logged up to 200 characters of the raw body. Anyone could write
arbitrary attacker-controlled content — including forged payment-shaped data — into the
operator log store by POSTing while the secret was misconfigured.

**Fix.** Log byte length only; that is sufficient to diagnose the misconfiguration.

**Proof.** `node --check` clean; the 6 money-path suites **24/24** after the change.

### F-D · P1 — Both checkout-cancel recovery CTAs went nowhere
`166983237` · `frontend/src/pages/shop/StoreV3.tsx` (+ new test)

**Finding.** `/checkout/cancel` sends a buyer who backed out of Stripe to
`/store?openCart=true` ("Return to cart", `CheckoutCancel.tsx:116`) or
`?openCart=true&retryCheckout=true` ("Try again", `:125`). **Nothing anywhere read either
param** — verified by repo-wide grep, whose only other hits were an unrelated local callback
named `openCart` in `Header/useHeaderState.ts:192`. Both recovery CTAs dropped the buyer on
a plain `/store` with the cart closed. Right after an abandoned payment, on mobile, that
means hunting for the cart dock to resume a purchase they had already decided to make.

**Fix.** `StoreV3` consumes the deep link, opens the cart panel, and strips the recovery
params so a refresh does not re-open it. Unrelated params (`utm_source`, etc.) are preserved
— **YouTube attribution must survive the round trip**.

Implementation note: reads `window.location` rather than `useSearchParams` **on purpose**.
`StoreV3` is rendered bare (no Router) by its own suite and via the StoreV2 lazy-fallback
path, and a router hook throws outside a Router. My first attempt used `useSearchParams` and
broke 2 existing tests in `StoreV3.fallbackTruth.test.tsx` — caught before commit.

**Proof.** `frontend/src/pages/shop/StoreV3.cancelRecovery.test.tsx` — **7/7 pass**.
Store/checkout frontend suite **21 files / 65 tests pass**. `tsc --noEmit`: **0 errors
repo-wide** (baseline is genuinely clean — see §7).

### F-E · Hostile round 1 — 2 defects in my own fixes
`3f473dc74`

1. **The cancel-recovery deep link consumed itself before auth resolved.** `AuthContext`
   starts `loading=true` / `isAuthenticated=false` (`AuthContextProvider.tsx:259`), so a
   buyer returning from a cancelled checkout **looks like a guest on the first render**. The
   effect stripped the params on that render and never re-opened the cart once auth settled
   — the fix silently did nothing for the exact user it was written for. Now it waits for
   auth; params linger harmlessly for a true guest (the cart dock is hidden for them anyway).
2. **The seeder guard fell through when its own safety count threw.** If `OrderItem.count()`
   failed (missing table, model-init order, connection blip) the guard would surface a raw
   error at best, and any future refactor that caught it would fall straight through to the
   truncate. Unverifiable ≠ safe: it now refuses explicitly, and the override still wins.

**Proof.** Seeder guard 7/7 (was 5); rate limits 13/13; cancelRecovery 7/7 (was 6). The new
timing test **fails against the pre-fix behaviour** — verified by reverting the auth-wait
line and re-running (1 failed), then restoring and re-confirming 7/7.

### F-F · P0 (buyer-facing) — A charged buyer could hit a dead end holding a raw axios error
`42c84a077` · `SuccessPage.tsx`, `SuccessPage.stateViews.tsx`, `CheckoutView.tsx`

Three defects, each verified in source before fixing.

1. **Post-charge dead end.** `/checkout/success` is reached *only* by someone who has
   already been through Stripe. On a verification failure it rendered `error.message`
   verbatim (`SuccessPage.tsx:144` pre-fix) — so a buyer whose card may have just been
   charged could read **"Request failed with status code 500"**, **"Network Error"**, or
   **"timeout of 30000ms exceeded"** — and the card offered exactly one button: *Return
   Home* (`SuccessPage.stateViews.tsx:59-62` pre-fix). No retry, no route to a human, no
   reference to quote. Now: server-authored copy when present, otherwise reassurance that
   does **not** over-claim (we do not know the charge settled) but does stop a double
   payment; plus **Try again**, **Contact support**, the order reference, and `role="alert"`.
2. **Double-submit window.** The success path cleared `isProcessing` *before* the 1000 ms
   deferred redirect (`CheckoutView.tsx:207-217` pre-fix), re-enabling the pay button for a
   full second. A second click in that window mints a **second Stripe Checkout Session for
   the same cart**. `isProcessing` now holds through the redirect; the failure path still
   clears it so a buyer can retry.
3. **Developer strings shown to buyers.** A throw interpolated two boolean flags into its
   message and rendered verbatim on the payment screen (`:186` pre-fix); the generic branch
   rendered a bare HTTP status, e.g. "Server error (502)" (`:248` pre-fix). Both replaced
   with recoverable copy; diagnostics go to the log.

*Integration check:* the 429 from this lane's new checkout limiter lands in that generic
branch and surfaces the limiter's own human-readable message — verified by reading the
branch, not assumed.

**Proof.** `SuccessPage.verificationFailure.test.tsx` **6/6**;
`CheckoutView.moneyPathSafety.test.ts` **7/7**; NewCheckout + pages/checkout + pages/shop
**22 files / 78 tests**; `tsc --noEmit` **0 errors**. The safety test initially **failed
against my own comment** quoting the banned diagnostic string — a comment-trap this repo has
been bitten by before (`e5b6286e8`); the comment was reworded rather than the assertion weakened.

### F-G · P1 — `/checkout` could strand a buyer with no way out
`79c5f7b23` · `CheckoutView.sections.tsx`

`main-routes.tsx:706-715` mounts `<CheckoutView />` with **no props**, so `onCancel` is
undefined on that route — and both escape hatches were gated on it: the Back control
rendered nothing (`sections.tsx:53` pre-fix) and `ReturnToCartAction` returned `null`
outright (`:156` pre-fix). A buyer arriving at `/checkout` with an empty cart saw *"Your
cart is empty"*, a disabled **$0.00** pay button, and **no link back to the store**. The
auth-required panel had the same shape — it named the requirement and offered no way to
satisfy it.

Fixed **inside the component**, for two reasons: the route tree is shared infrastructure
this lane must not edit (C4), and a checkout screen should not depend on its caller for a
way out. Falls back to `/store`, relabelled "Back to Store" so it does not promise a cart
that is not there; the auth panel gets a login control carrying `returnUrl=/checkout`.

**Proof.** `CheckoutView.moneyPathSafety.test.ts` **10/10** (3 new); NewCheckout **11 files
/ 35 tests**; `tsc` 0 errors.

### F-H · P1 (a11y) — The cart dialog promised `aria-modal` and let Tab walk out
`92b8b863a` · `ShoppingCart.tsx`

`CartModalContent` declares `role="dialog" aria-modal="true"` (`:220-222`), telling assistive
tech the rest of the page is inert. Only Escape and initial focus were implemented — **Tab
walked straight out into the page behind the overlay**, so a keyboard or screen-reader buyer
could end up operating the store underneath a cart they could not see. Mirrors the working
trap already in `PricingInquiryModal.tsx:105-118` rather than inventing a second pattern.

**Proof.** ShoppingCart + NewCheckout + pages/shop + pages/checkout **23 files / 90 tests**;
`tsc` 0 errors.

---

## 2. FINDINGS NOT FIXED IN-LANE (ranked)

| # | Sev | Finding | Evidence | Why not fixed here |
|---|---|---|---|---|
| **F-1** | **P0-risk / config** | `https://sswanstudios.com/webhooks/stripe` returns **empty HTTP 200** to any POST. So does `/webhooks/anything-else` — the static site's SPA rewrite `/*  → /index.html` (`render.yaml:198-200`) swallows the whole prefix; only `/api` is proxied to the backend. Stripe treats 2xx as delivered, so a dashboard pointed here would mark every payment delivered while crediting nothing — no 4xx, no log, no retry. | Live probes: `/webhooks/stripe` → `200`, `Content-Length: 0`; `/webhooks/nonexistent-xyz` → identical `200`/0; `/api/webhook/stripe` → `400 "No stripe-signature header value was provided"`; backend origin `ss-pt-new.onrender.com/webhooks/stripe` → `400` (handler is healthy where reachable) | Requires Stripe dashboard access (Sean) + a `render.yaml` change (shared infra → §6 proposal). **Signature verification itself is intact everywhere it is reachable.** The code comment at `webhooks/stripeWebhook.mjs:47-49` says the dashboard uses `/api/webhook/stripe`, which works — so this is most likely already fine, but it is unverified and the failure mode is silent and total. |
| **F-2** | P1 | **No `event.id` replay guard on the training-package webhook path.** Replay safety is *state-based* (`cart.sessionsGranted` under `FOR UPDATE`, `SessionGrantService.mjs:196-200`; `Order.paymentAppliedAt` claim, `stripeWebhook.mjs:526-539`), not *event-based*. Gallery credits/donations/prints DO dedupe on session id via `processed_stripe_sessions` (`:606`, `:683`, `:775`); the training path does not. | grep: zero `event.id` references in `backend/webhooks/` | **Tier-3 trigger.** Structural Stripe/idempotency change on the money path — Rule 16 says propose a paid Village pass and ask Sean; do not self-approve. Today's state-based guards do hold, so this is hardening, not an open hole. |
| **F-3** | P1 | **Two revenue routers are registered twice.** `v2PaymentRoutes` at `core/routes.mjs:371` *and* `routes/api.mjs:39`; `sessionPackageRoutes` at `core/routes.mjs:331` *and* `routes/api.mjs:27`. First mount wins; the second is inert. A future "fix" applied to the shadowed registration would silently do nothing. Existing mount-uniqueness guards exist for `/api/cart` and `/api/storefront` (`cartRoutesSecurity.test.mjs:24`, `storefrontRoutesSecurity.test.mjs:21`) but **not** for these two — which is exactly how the duplicates slipped in. | `core/routes.mjs:331,371`; `routes/api.mjs:27,39` | `routes/api.mjs` and `core/routes.mjs` are shared route-tree infrastructure (C4). → §6 proposal. |
| **F-4** | P2 | **Three overlapping money columns** on `StorefrontItem`: `price`, `totalCost`, `pricePerSession` (`models/StorefrontItem.mjs:51,67,103`). The Stripe cart rail reads `totalCost` first then `price` (`cartRoutes.mjs:179`); the ACH/offline rails read **`price` only** (`achPaymentRoutes.mjs:121`). If the two ever diverge, the same item charges different amounts on different rails. A `beforeValidate` hook keeps them in sync today (`:216-246`). | as cited | Model change = C4 propose-only (admin + client surfaces consume it). |
| **F-5** | P2 | **`Order.sessionsGranted` (INTEGER count, `Order.mjs:147`) and `ShoppingCart.sessionsGranted` (BOOLEAN flag, `ShoppingCart.mjs:69`)** are the same property name with different types and meanings on two models joined by `cartId`. Also `Order` is a mixed-convention model: implicit camelCase columns above line 84, explicit `field:` snake_case below (`trainer_id`, `tax_amount`, `sessions_granted`, …). Any raw SQL against `orders` must know which half of the table it is touching. | `models/Order.mjs:94-157` | Rule-58 drift report only; no live break observed. Model = C4. |
| **F-6** | P2 | **~1,700 lines of orphaned Stripe code**: `services/payment/PaymentService.mjs` + `StripeCheckoutStrategy` (`:225` `checkout.sessions.create`) + `StripeElementsStrategy` (`:173` `paymentIntents.create`) + `ManualPaymentStrategy` have **zero importers** outside their own directory. Dead money code a future refactor could re-wire without review. | grep | Rule 34: no blind cleanup. Deletion candidate pending approval, not actioned. |
| **F-7** | P3 | **Five live Stripe webhook surfaces share one secret** (`webhooks/stripeWebhook.mjs:307,309`; `cartRoutes.mjs:937`; `sessionPackageRoutes.mjs:212`; `subscriptionRoutes.mjs:546`). All verify signatures, so none is exploitable alone — but the `express.json` bypass list (`core/middleware/index.mjs:38-48`) must stay in exact sync. Adding a sixth webhook without updating that list produces silent 100% signature-verification failure. | as cited | Documentation/awareness item. |
| **F-8** | — | **CORRECTED — not a finding.** An automated pass flagged `utils/stripeConfig.mjs:54` as logging "the first 8 chars of the live secret key". `'sk_live_'.length === 8`, so `secretKey.substring(0, 8)` is **exactly the environment prefix and zero secret bytes**. Verified by execution. It discloses live-vs-test and key length only. No fix made; recording the correction so it is not re-raised. | `node -e` check | Rule 30 — subagent output is a hypothesis. |

---

## 3. PACKAGE TRUTH (the prompt's explicit question)

**Seeder on main — `[VERIFIED]` exactly as CLAUDE.md describes:** 5 packages, $175/session
flat with no volume discounts, 30-minute 10-pack at $1,100
(`backend/seeders/20260407-seed-storefront-packages.mjs:13-62`).

| # | Name | sessions | $/session | total |
|---|---|---|---|---|
| 1 | Single Session | 1 | $175.00 | $175.00 |
| 2 | 3-Month Program | 48 | $175.00 | $8,400.00 |
| 3 | 6-Month Program | 96 | $175.00 | $16,800.00 |
| 4 | 12-Month Program | 192 | $175.00 | $33,600.00 |
| 5 | 30-Minute Assessment Pack | 10 | $110.00 | $1,100.00 |

**Live production — 7 packages, and the names do not match the seeder** (`GET /api/storefront`
and `GET /api/health/store`, both `200`):

| displayOrder | Live name | sessions | In seeder? |
|---|---|---|---|
| 1 | Single Session | 1 | yes |
| 2 | **10-Session Pack** | 10 | **NO** |
| 3 | **24-Session Pack** | 24 | **NO** |
| 4 | 3-Month Program | 48 (totalSessions) | yes |
| 5 | 6-Month Program | 96 | yes |
| 6 | 12-Month Program | 192 | yes |
| 7 | **30-Minute Sessions (10-Pack)** | 10 | renamed (seeder: "30-Minute Assessment Pack") |

**`[UNKNOWN]` — live prices.** Every price field comes back `null` because the invitation
gate strips them for non-granted callers (`services/store/priceVisibilityService.mjs:60-70`);
`pricesVisible: false`. I therefore **cannot confirm $175 flat on the live DB** without an
authenticated admin read. → **Blocker B2.**

**The FORCE_RESEED question is now resolved, and the answer is DO NOT RUN IT.** Two
independent reasons: (a) it would destroy paid order history (§1 F-A — now guarded, and the
guard will refuse); (b) live carries 2 packages the seeder does not define plus a renamed
one, so a reseed would **delete catalog items that are live today**. Catalog corrections
belong in the admin storefront UI. `CLAUDE.md`'s pending-action line must be retracted (§6).

**Historical `/api/cart/add` 404 — `[VERIFIED] DEAD on main.** The route exists and is
mounted exactly once (`cartRoutes.mjs:350`, mounted `core/routes.mjs:352`). Live probe:
`POST /api/cart/add` unauthenticated → **401**, not 404. The most likely modern rejection is
`403 PRICE_ACCESS_REQUIRED` from the invitation gate (`cartRoutes.mjs:429`), which is
correct behaviour, not a bug.

---

## 4. THE COLD-TRAFFIC CONVERSION QUESTION (read this before the YouTube push)

`[VERIFIED]` A logged-out visitor — i.e. every YouTube viewer — sees the store with **no
prices on any training package**, and each price-hidden card shows *"Pricing is by invitation
— ask about this package below"* (`PackageCard.tsx:659`) plus an **"Ask About Pricing"**
button (`:688-696`).

This is **intentional and correctly built**, not a defect. `priceVisibilityService.mjs:6-10`
records Sean's rule verbatim: prices hidden from everyone — guests, users, clients, trainers
— until an admin grants that specific user the `store-prices` feature flag. Enforcement is
server-side and **fail-closed** on every error path (`:105-108`, `:123-126`); the frontend
merely reflects server truth (`StoreV3.tsx:644`, comment at `:642-643`: "being logged in no
longer reveals prices"). Purchase is independently gated: `canPurchase` requires
`pricesVisible && isAuthenticated` (`StoreV3.tsx:648`), and the cart API refuses at
`cartRoutes.mjs:429`.

**What this means operationally at launch.** The *only* path from a cold YouTube viewer to a
price is: inquiry button → `POST /api/contact` → Sean reads it → Sean manually grants the
`store-prices` flag → the visitor returns and can finally see prices and buy. That is a
human-in-the-loop funnel with Sean as the rate limiter, at exactly the moment traffic spikes.

**The funnel itself is healthy — I verified its failure modes:**
- `POST /api/contact` is **DB-first**: the `Contact` row is created *before* any external
  service is attempted (`contactRoutes.mjs:~115`), then an admin notification, then CRM lead
  capture, then a fire-and-forget speed-to-lead reply — each wrapped so a failure "never
  breaks submission". **So a SendGrid/DMARC problem does not lose the lead.** (Relevant
  because DMARC/SWA-13 is still outstanding and is Lane 2's remit — the coupling is worth
  naming: email deliverability degrades *notification*, not *capture*.)
- It is rate-limited at 5/15min (`contactLimiter`), confirmed live via `ratelimit-policy: 5;w=900`.
- It validates and returns a clean `400` on empty/malformed input (live probe → `400`), and
  the modal reads both `data.message` and `data.error` so a throttled prospect sees a
  recoverable message (`PricingInquiryModal.tsx:160-167`).

**My recommendation is a question for Sean, not a change:** is invitation-only pricing the
intended posture *for cold YouTube traffic*, or was it designed for a warmer referral
audience? Options if the answer is "cold traffic should see something": show the entry price
only (Single Session $175) while keeping programs invitation-gated; or make the inquiry
flow's promise explicit ("Sean replies within X hours"). **I have not touched the gate** —
it is Sean's stated policy and a business decision, and the flag system is admin-driven
rather than code-driven, so no code change is needed to soften it.

---

## 5. WHAT I VERIFIED AS SOUND (no action needed)

Prior gates raised the burden of proof here (Rule 52): the 2026-07-11 Rule-48 audit record
`STOREFRONT-DEALS-MONEYPATH-HARDENING-AUDIT-RECORD-2026-07-11.md` shows this money path
already survived a Codex hostile pass plus a Fable final-decider gate. I re-verified the
load-bearing invariants rather than re-litigating them.

| Control | Status | Evidence |
|---|---|---|
| Webhook signature verification | **intact** | `constructEvent` at `stripeWebhook.mjs:71-75`; fail-closed 500 on missing secret; live probes return `400 "No stripe-signature header value was provided"` on both reachable paths |
| `express.raw` before `express.json` for webhooks | **correct** | `core/middleware/index.mjs:38-48` path-exclusion list covers all five webhook routes |
| Server-authoritative pricing | **clean on all 3 rails** | cart snapshots DB price (`cartRoutes.mjs:179,485`); v2 builds Stripe line items from persisted `CartItem.price` (`:162-187`); ACH recomputes with `Decimal` and 409s on mismatch (`achPaymentRoutes.mjs:119-163`) |
| IDOR on money endpoints | **clean** | identity always from `req.user` (`v2PaymentRoutes.mjs:276,738`; `cartRoutes.mjs:184`; `orderRoutes.mjs:29,62`). `cartId` is accepted from the body but scoped `where {id, userId, status:'active'}` (`v2PaymentRoutes.mjs:332-337`) — cross-user checkout not possible |
| Session-crediting idempotency | **holds** | `sessionsGranted` flag under `SELECT … FOR UPDATE` (`SessionGrantService.mjs:196-200`); session-ownership guard rejects a cart whose `checkoutSessionId` ≠ the paid session (`:190-192`); credit written atomically via `user.increment` (`:213-218`) |
| Deactivated / retired items unpurchasable | **enforced** | `resolveCartItemSnapshot` returns 409 on `isActive === false` (`cartRoutes.mjs:147-149`) — this is also what makes special-cancel real |
| Live/test Stripe key safety | **guarded** | `stripeEnvironmentSafety` + `v2PaymentLocalLiveStripeGuard` + `stripeCheckoutSessionErrors` — **9/9 pass**; live key blocked in local dev |
| Legacy cart checkout | **intentionally dead** | `POST /api/cart/checkout` returns 410 `LEGACY_CART_CHECKOUT_DISABLED` (`cartRoutes.mjs:840-853`) |
| Retired Galaxy-Swan palette on the store surface | **absent** | grep for `#0a0a1a` / `#00FFFF` / `#7851A9` across `pages/shop`, `NewCheckout`, `ShoppingCart`, `pages/checkout` → only hit is the *contract test that forbids them* (`ShoppingCart.themeContract.test.ts:46`) |
| Custom deals + inquiry button (shipped 2026-07) | **healthy** | `/api/custom-packages/my` → 401 unauth (correct); `YourSpecialCard` self-gates to `role === 'client'` and fails closed (`:38,41,50-52`); inquiry modal wired to `/api/contact` (`PricingInquiryModal.tsx:150-156`) |
| Live service health | **green** | `/api/health` 200; `/api/storefront` 200; `/api/health/store` 200 `ready:true`; `/api/session-packages` 200 |

**Surface classification (Rule 27).** Canonical: `StoreV3` (`/store`, `/swanstudios-store`,
`/shop` — `main-routes.tsx:531-554`), with `StoreV2` reachable as a genuine lazy-import
fallback (`lazyLoadWithErrorHandling.tsx:93-101`); `CheckoutView` (route `/checkout` +
in-store modal `StoreV3.tsx:1002`); `SuccessPage`; `CheckoutCancel`.
Dormant/non-public: `store-v4/` (admin Design Studio only, `status: 'parked'`).
Orphaned: `components/Checkout/OrderSummaryComponent.tsx` (827 lines, zero importers).
**Note for Lanes 1/2/3/5:** `StoreV2` lacks both `YourSpecialCard` and the inquiry button —
if the primary chunk ever fails to load, the fallback store silently loses custom deals and
the only cold-traffic conversion path.

---

## 6. SHARED-INFRA PROPOSALS (C4 — integrator applies, I did not)

**P-1 — `CLAUDE.md` → Open Items → "Storefront Packages (PENDING CONFIRMATION)".**
Retract the FORCE_RESEED instruction; it is now destructive and the seeder will refuse it.

```diff
-- **NEEDS:** Run `FORCE_RESEED=true node seeders/20260407-seed-storefront-packages.mjs` in Render shell to wipe bad data
+- **DO NOT RESEED (2026-08-03, Lane 4).** `FORCE_RESEED` truncates `storefront_items`
+  CASCADE, which deletes paid `order_items`; the seeder now refuses when paid history
+  exists. Live prod also carries 2 packages the seeder does not define (10-Session,
+  24-Session) plus a renamed 30-min pack, so a reseed would delete live catalog items.
+  Correct the catalog from the admin storefront UI instead.
-- **Unresolved:** `/api/cart/add` returning 404 in production — not yet root-caused
+- **RESOLVED (2026-08-03):** `/api/cart/add` is mounted once (`cartRoutes.mjs:350`) and
+  returns 401 unauthenticated in production, not 404. The modern rejection to expect is
+  403 `PRICE_ACCESS_REQUIRED` from the invitation gate.
```

**P-2 — `render.yaml`: stop the apex from swallowing `/webhooks/*`.** Blocker B1's silent
failure mode exists because the SPA rewrite answers empty 200 for that prefix. Either proxy
it to the backend or make it fail loudly. Minimal, lowest-risk version:

```diff
     routes:
+      # /webhooks/* must never be answered by the SPA. Stripe reads any 2xx as
+      # "delivered", so an empty 200 here would silently swallow payment events.
+      - type: redirect
+        source: /webhooks/*
+        destination: https://ss-pt-new.onrender.com/webhooks/*
       # SPA routing - serve index.html for all non-file routes
       - type: rewrite
         source: /*
         destination: /index.html
```
*Caveat:* Stripe does not follow redirects for webhook delivery, so this converts a silent
success into a visible failure (the safe direction) — it does **not** make the apex path a
working endpoint. **Confirming the dashboard URL (B1) is the actual fix.** A rewrite/proxy
would be better than a redirect if Render supports proxying to another service here; that
needs verification I could not do without dashboard access.

**P-3 — `routes/api.mjs`: remove the two shadowed registrations** (`:27` sessionPackageRoutes,
`:39` v2PaymentRoutes) and extend the existing mount-uniqueness guard pattern
(`cartRoutesSecurity.test.mjs:24`) to cover `/api/v2/payments` and `/api/session-packages`.

---

## 7. VERIFICATION SUMMARY (Rule 56 baseline disclosure)

| Gate | Result | Scope |
|---|---|---|
| New backend tests | 20/20 pass | seeder guard 7, money-path limits 13 |
| New frontend tests | 23/23 pass | cancel-recovery 7, post-charge failure 6, money-path safety 10 |
| Final combined backend money-path run | **8 files / 47 tests pass** | seeder guard, limits, cart security, checkout gate, price gating, v2 identity, webhook paid-status, Stripe env safety |
| Final combined frontend run | **23 files / 90 tests pass** | `ShoppingCart`, `NewCheckout`, `pages/shop`, `pages/checkout` |
| Stripe environment suites | 9/9 pass | env safety, local-live guard, checkout errors |
| Rule 42 pre-push audit | clean | 0 untracked, 0 modified-uncommitted under `backend/` |
| `tsc --noEmit` | **0 errors — baseline genuinely clean repo-wide**, not merely slice-clean | full frontend |
| `node --check` + import-execution | clean | all 5 edited/created backend files |
| Pre-commit secret scan | CLEAN on all 5 commits | staged blobs |
| Live production probes | 11 endpoints, read-only, unauthenticated | see §2/§3/§5 |

**Not verified — disclosed gaps.** (a) Live catalog *prices* — invisible behind the
invitation gate without an admin credential (B2). (b) The Stripe dashboard's configured
webhook URL — no dashboard access; the Stripe MCP connector is unauthenticated in this
session (B1). (c) No authenticated end-to-end purchase was driven: that requires real
credentials and would create a real Stripe object against production. **I did not walk
browse→cart→Stripe→confirmation→credit as a logged-in buyer**; the journey is verified by
code path, contract tests, and unauthenticated probes only. That is the single largest
residual risk in this audit and the right next slice (§9).

---

## 7b. PRESENTATION & MOBILE (audited, not fixed — ranked)

Hostile question from the brief: *"would a YouTube stranger trust this with $8,400?"*
The trust scaffolding is real — Stripe Secure / SSL / PCI / Money-Back badges
(`CheckoutView.sections.tsx:64-83`), "Powered by Stripe with SSL encryption and PCI
compliance" (`CheckoutButton.tsx:76-79`), a 30-day guarantee line
(`OrderReviewStep.tsx:189-194`), an all-inclusive-pricing promise (`StoreV3.tsx:393-394`),
and an explicit "no charges were made" reassurance on cancel (`CheckoutCancel.tsx:204-207`).
Touch targets are genuinely strong: **every** interactive control on the money path is ≥44px
(cart close, quantity steppers, remove, dock FAB, fulfillment buttons, GlowButton 44/48/56).
`prefers-reduced-motion` is honoured in 10+ files. The retired Galaxy-Swan palette is absent.

Ranked gaps, none fixed (all P2 — presentation, not correctness):

1. **No breakpoint below 480px anywhere on the money path.** Smallest is `max-width: 480px`;
   the responsive matrix requires 320px. Concrete consequences: the cart modal keeps
   **2rem (64px) horizontal padding at every width** (`ShoppingCart.styles.ts:87,158,177`),
   and `CartTitle` at 1.6rem sits under an absolutely-positioned 44px close button
   (`:95-96` vs `:121-129`) — roughly 192px of usable title width at 320px.
2. **`CartBody { max-height: calc(85vh - 150px) }`** (`ShoppingCart.styles.ts:156`) hardcodes
   a 150px header+footer assumption that breaks when the header wraps or the footer stacks
   at ≤480px (`ShoppingCart.summaryStyles.ts:74-77`).
3. **`PackageCard.tsx` bypasses the token system**: a private `const T = {…}` object holds 6
   raw hex values (`:33-39`, incl. `#00D4AA`, `#8B5CF6`) interpolated ~20×, plus ~30 raw
   `rgba()` literals. It is the single worst Rule-6 offender on the store→checkout path, and
   unlike `ShoppingCart` it has **no theme-contract test** guarding it.
   (`PricingInquiryModal.styles.ts` adds 4 more raw hex: `:161,182,183`.)
4. **Trust gaps for cold traffic:** no testimonials or social proof anywhere on
   `/store`/cart/`/checkout`; no FAQ except an *external* link reachable only *after*
   abandoning (`CheckoutCancel.tsx:147`); no "what happens next" **before** paying (it exists
   only post-purchase); the "Money Back Guarantee" badge and the "30-day" claim are unlinked
   and inconsistent with each other; no terms/privacy link at the point of purchase.
5. **Hover-only tooltips** (`AdvancedCartInteractions.tsx:293-318`, used at
   `ShoppingCartFooter.tsx:59,67`) bind only mouse events — no focus, no touch — so the
   per-session price explanation is invisible to touch and keyboard users.

## 8. ENHANCEMENT BACKLOG (ranked by launch impact, none applied)

1. **Authenticated end-to-end purchase rehearsal in Stripe TEST mode** — the one thing that
   would convert §7's disclosed gap into proof. Highest value before the YouTube push.
2. **Trust elements on the price-hidden card** — a stranger is asked to inquire with zero
   risk-reversal nearby. Candidates: response-time promise on the inquiry modal, refund/
   guarantee copy, "what happens after you inquire" in 3 steps.
3. **Sync `StoreV2` fallback with `StoreV3`** — the fallback store loses custom deals *and*
   the inquiry button, i.e. cold traffic hitting the fallback has no conversion path at all.
4. **`event.id` webhook dedupe** (F-2) — Tier-3, ask Sean.
5. **Delete the ~1,700 lines of orphaned Stripe strategy code** (F-6) — Rule 34 approval.
6. **Collapse the three overlapping money columns** (F-4) to one source of truth.
7. **Add `YourSpecialCard` test coverage** — the client-facing custom-deals card has none.

---

## 9. NEXT SLICE

**Next slice: authenticated end-to-end purchase rehearsal in Stripe TEST mode** — walk
browse → cart → checkout → Stripe → confirmation → sessions credited as a real logged-in
buyer, then assert the credit landed on the user row. It is the highest-value remaining
verification because it is the only claim in this audit resting on code-path reasoning
rather than executed proof, and it exercises exactly what a YouTube buyer will do.

Blockers B1 (Stripe webhook URL) and B2 (live price truth) are Sean-owned and should be
cleared first — B1 in particular, because the rehearsal would not detect a
misconfigured dashboard URL if the rehearsal itself is driven through the working path.

## 10. POST-TASK HYGIENE (Rule 38)

Created: 2 backend test files, 1 frontend test file, 1 new backend middleware module, this
artifact, and the lane coordination file. **No temp artifacts, screenshots, or debug output
were left in the repo.** `node_modules` was installed inside the throwaway worktree only
(gitignored). The audit worktree `c:/tmp/ss-launch-audit-lane4-20260803` and branch
`claude/launch-audit-lane4-20260803` should be removed by the integrator after reconciliation.
