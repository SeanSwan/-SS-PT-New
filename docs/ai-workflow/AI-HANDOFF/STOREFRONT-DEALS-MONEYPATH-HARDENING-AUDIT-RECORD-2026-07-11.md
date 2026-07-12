# Storefront Custom-Deals — Money-Path Hardening — Audit Record (2026-07-11)

> Rule-48 phase-completion audit record. Self-contained: a future reviewer (Sean /
> Codex / Gemini / Fable / any AI) can read THIS FILE ALONE and produce useful
> security / performance / UX feedback without re-reading other docs.

## 1. Phase header
- **Phase:** Storefront custom-deals *money-path hardening* pass (the safety-review layer on top of the already-shipped deal feature).
- **Scope:** Codex hostile money-path review + Fable (Claude Opus 4.8) final-decider gate, then production ship. NOT the feature build itself (that shipped 2026-07-10).
- **Dates:** review + gate + ship all on 2026-07-11.
- **Reviewed by:** Codex (hostile reviewer, rule 46) → APPROVE/APPROVE; Fable/Claude (final-decider gate, rule 46 amendment) → verified & shipped; Sean (human owner) authorized the prod probe + the single push.
- **Final verdict:** SHIPPED. Deploy verified live.
- **Ship SHAs on `main`:** `3586da3ac` (reopen carts after checkout expiry) + `f065db8f2` (money-path hardening) landed via merge `f2ad6f261` (fast-forward `claude/storefront-custom-deals-20260708` → `main`).

## 2. Files involved (the 2 hardening commits — 33 files)
Feature spine (`specialOfferService`, `CustomPackage`/`StorefrontItem` model fields, `AdminCreateSpecialManager`, `YourSpecialCard`, the HR-007 public-read filters) shipped 2026-07-10 and is NOT re-listed here — see the prior storefront custom-deals trail. This phase adds:

**New production migrations (run at Render build):**
- `backend/migrations/20260711000000-enforce-one-open-shopping-cart.cjs` (69 lines) — fail-closed partial unique index, one open cart per user.
- `backend/migrations/20260711000001-make-order-item-catalog-reference-tombstone-safe.cjs` (72 lines) — audit-preserving FK relax so a deleted catalog item can't block paid-order fulfillment.

**New service / util:**
- `backend/services/cartCheckoutSnapshotService.mjs` (107) — immutable paid-cart snapshot (price/session terms frozen at purchase).
- `backend/utils/cartSchemaRecovery.mjs` (+46) — cart schema-drift recovery.

**Modified runtime (money path):**
- `backend/webhooks/stripeWebhook.mjs` (±46) — passes `{ checkoutSessionId }` to the grant.
- `backend/services/SessionGrantService.mjs` (±22) — **session-ownership guard**: a grant refuses a cart whose `checkoutSessionId` ≠ the paid Stripe session id.
- `backend/routes/v2PaymentRoutes.mjs` (±193) — checkout / verify hardening, invited-checkout bypass, redeemable-special defense-in-depth.
- `backend/routes/cartRoutes.mjs` (±120 across both commits) — reopen-after-expiry, owned-special bypass of the price gate, snapshot before gate.
- `backend/routes/customPackageRoutes.mjs` (±21), `backend/routes/sessionPackageRoutes.mjs` (±34), `backend/services/specialOfferRedemptionService.mjs` (±28), `backend/services/cartCheckoutFulfillmentService.mjs` (±10), `backend/services/sessionPackageCheckoutFulfillmentService.mjs` (±6), `backend/models/OrderItem.mjs` (±2).
- `frontend/src/pages/checkout/CheckoutCancel.tsx` (±37) — cancel reopens the cart.

**Tests (new + modified, 16 files):** `specialOfferPaidBoundary` (new, 65), `cartCheckoutCancellation` (new, 134), `cartCheckoutSnapshotService` (new, 85), `orderItemCatalogTombstoneMigration` (new, 21), `shoppingCartActiveUniquenessMigration` (new, 23), `cartSchemaRecovery` (new, 53), `sessionGrantProductFulfillment` (+25), `storefrontSpecialMoneyPath` (+73/+12), `storefrontPublicSpecialHiddenContract` (±18), `stripeWebhookSessionGrant` (±8 — the 4 stale-assertion fixes), + 6 smaller locks.

## 3. Architecture & runtime flow (money path, end-to-end)
1. **Admin creates a deal** → `POST /api/custom-packages` with `targetEffectiveRate` (server computes bonus sessions; client never sends a price). A hidden client-scoped `StorefrontItem` (`isSpecialOffer=true`, `sessions = paid + bonus`) is created atomically in a txn and linked.
2. **Client sees only their own deal.** Public reads (`GET /api/storefront`, `/storefront/:id`, `/session-packages`, `/health/store`, recommendations) all filter `isSpecialOffer:false` → a hidden special never appears in any unauthenticated response (HR-007). The owner reads theirs via the authenticated `GET /api/custom-packages/my`.
3. **Client buys** → their own active special IS their invitation (bypasses the global `store-prices` gate via `clientHasActiveSpecial`, fail-closed). Cart snapshot (price/session terms) is frozen at add-time.
4. **Stripe checkout → webhook** → `grantSessionsForCart(cartId, userId, 'webhook', { checkoutSessionId })`. The grant is **idempotent** (`sessionsGranted` flag), row-locked, and now **session-bound**: it refuses to credit a cart whose `checkoutSessionId` ≠ the paid session.
5. **Grant credits paid+bonus in one increment** (zero new crediting logic — reuses the existing idempotent grant), burns down the special (`recordCartSpecialRedemptions`, in the same txn — a one-time deal can't be re-purchased), and writes the order.

## 4. Security logic & posture
- **HR-007 hidden-special leak prevention** — every public read filters `isSpecialOffer:false`. *Blocks:* an unauthenticated caller enumerating a sequential id to read another client's private deal terms. *Breaks if:* a new public read of `StorefrontItem` omits the filter — locked by `storefrontPublicSpecialHiddenContract.test.mjs` (source-lock over storeFront/sessionPackage/health routes + recommendation service).
- **Session-ownership grant guard** (`SessionGrantService:190`) — `checkoutSessionId` must match `cart.checkoutSessionId`. *Blocks:* a webhook for session A crediting a different/reopened cart B (cross-cart fake credit). *Breaks if:* a caller passes no `checkoutSessionId` (defaults to unguarded — acceptable for the reconciliation caller, but the webhook always passes it).
- **One-open-cart uniqueness (fail-closed migration)** — partial unique index on `(userId) WHERE status IN ('active','pending_payment')`. *Blocks:* a double-checkout race granting twice. *Fails closed:* migration THROWS `MULTIPLE_PENDING_CARTS_REQUIRE_RECONCILIATION` if any user has 2+ `pending_payment` carts (halts deploy, no data corruption, re-runnable) — chosen over silently cancelling a payable Stripe session. Multiple `active` drafts are auto-cancelled (pending wins, else newest). *Prod probe before ship: 0 fail-closed users, 0 multi-open users → clean run.*
- **Tombstone-safe order items** — preserves `originalStorefrontItemId`/`originalProductVariantId` into `metadata` BEFORE relaxing the FK to `ON DELETE SET NULL`. *Blocks:* a deleted catalog item orphaning/deleting a paid order row (audit loss). Idempotent (`AND NOT (metadata ? 'originalStorefrontItemId')`); `down()` restores `RESTRICT`.
- **Immutable paid snapshot** (`cartCheckoutSnapshotService`) — freezes price/session terms at purchase so a later admin edit to the deal can't retro-change what a client already paid for.
- **Invitation bypass fail-closed** — `clientHasActiveSpecial` is wrapped in try/catch → returns `false` on any error (a DB hiccup denies access rather than opening the store).
- **Server-authoritative pricing** — the client never sends a price; the server computes bonus sessions from `targetEffectiveRate`. *Blocks:* a client forging a cheaper effective rate.
- **No-floor policy (Sean's mandate):** the $100 floor / $120 gate / override checkbox were removed — Sean is the final decider on every deal. `evaluateRateGate` now returns informational tiers only (`standard`/`discounted`/`deep_deal`/`custom_deal`), never `hardBlocked` except for a non-positive rate.

## 5. Best practices applied
- Rule 8 zero-PII (IDs only; deal docs carry no client names). Rule 20 sibling sweep (all public `StorefrontItem` reads filtered). Rule 26 canonical surface + Rule 29 schema cross-check (migrations verified against real prod schema via read-only probe). Rule 45 (no amend — the test-contract fix is a normal commit, not an amend). Rule 46 (Codex hostile input → Fable gate). Rule 56 baseline disclosure (the 1 pre-existing PII test fail is main's, not this slice's). Rule 59 (read-only prod probes load creds inside the process, never echo). OWASP A01 (fail-closed access gates) + A04 (fail-closed migration over silent data mutation).

## 6. Known limitations / non-goals
- The pre-existing PII stale test (`aiChatFreeTextPiiStrip.test.mjs`) is **not** fixed here — it's Codex's nutrition lane and not a leak (see §10). Deliberately out of this money-path slice's surgical scope.
- No new admin UI in this phase (the deal-creator shipped 2026-07-10). This phase is backend safety only.
- The fail-closed migration's reconciliation path (if a future prod state has 2+ pending carts) is manual — no auto-reconcile tool was built (deferred; the probe showed it's currently unnecessary).

## 7. Performance & UX considerations
- No user-facing latency change — hardening is transaction-internal. The special burn-down is gated on a cheap in-memory `cartHasSpecial` check, so **ordinary carts do zero extra work** and carry no dependency on the special feature.
- Anonymous store shows `price: null` (price-gating live) — matches Sean's "don't show pricing broadly" intent; packages still listed so the catalog reads as full.

## 8. Test coverage summary
- **Full money-path sweep after merging current main:** 832/833 files, 6100/6101 tests pass. The single fail is the pre-existing PII stale test (§10) — main's, byte-identical, not caused by this slice.
- Migration behavior locked by `shoppingCartActiveUniquenessMigration.test.mjs` + `orderItemCatalogTombstoneMigration.test.mjs`. Session-ownership + idempotency locked by `stripeWebhookSessionGrant.test.mjs` (4 assertions updated to the safer signature). HR-007 locked by `storefrontPublicSpecialHiddenContract.test.mjs`. Paid-boundary by `specialOfferPaidBoundary.test.mjs`. Cancellation/reopen by `cartCheckoutCancellation.test.mjs`.
- Frontend `tsc --noEmit` 0 errors (8GB heap).

## 9. Rollback plan
- **Code:** `git revert 3586da3ac f065db8f2` (or revert merge `f2ad6f261 -m 1`) → push. No feature flag (feature was already live; this is hardening).
- **Migration 20260711000000:** `down()` drops `shopping_carts_one_open_per_user`. Safe — the index only constrains new inserts; dropping it re-permits multiple open carts.
- **Migration 20260711000001:** `down()` restores the `RESTRICT` FK. ⚠ `down()` can fail if catalog items were deleted while the FK was relaxed (rows would then reference missing items) — reconcile `order_items.storefrontItemId` nulls before rolling back.
- Backend boot is unaffected by rollback (no new required env var).

## 10. Future review hooks (the most important section)
- **Re-run the prod cart-dup probe periodically** (`SELECT userId … HAVING COUNT(*)>1` on `pending_payment`). If it ever returns >0, the one-open-cart migration would have halted — investigate how a user acquired 2+ pending carts (Stripe session leak? cart-reopen race?).
- **Audit the session-ownership guard against the reconciliation caller** — it passes no `checkoutSessionId` (unguarded by design). Confirm `scripts/reconcile-ungrant-carts.mjs` can't be tricked into crediting a wrong cart.
- **Re-examine the HR-007 filter after any NEW public `StorefrontItem` read is added** — the source-lock test covers today's 5 read sites; a 6th added later needs the filter + a new lock line.
- **Verify the immutable paid snapshot actually blocks a retro price change** — write a live test: admin edits a deal AFTER a client paid; confirm the client's granted sessions/price are unchanged.
- **Confirm the tombstone FK relax didn't weaken any reporting** that assumed `storefrontItemId` is always non-null — grep consumers of `OrderItem.storefrontItemId` for null-safety.
- **Fix the pre-existing PII stale test** (`aiChatFreeTextPiiStrip.test.mjs`, Codex's lane) — one-line: assert the macro description is ABSENT, not name-substituted (impl now never fetches `daily_macro_logs.description`).

## 11. Codex / AI review log
- **Codex** ran a recursive builder + hostile-review loop over the whole money path; verdict **APPROVE/APPROVE** (payment/auth/privacy audit APPROVE; lifecycle/concurrency/paid-fulfillment APPROVE). Repaired: private-deal enumeration, direct/cart rail split, paid-status enforcement, checkout cancellation/expiry recovery, promotion stacking, idempotency rotation, duplicate/open-cart races, exact Stripe-session binding, immutable paid snapshots, deleted-catalog paid fulfillment, tombstone-safe order FKs. Left changes uncommitted for the Fable gate.
- **Fable/Claude gate:** did NOT trust the APPROVE — ran an independent full money-path sweep, found 4 webhook-test failures, diagnosed them as *stale test contracts* (Codex's session-ownership 4th arg is a real safety improvement, not a regression), updated the assertions to lock the safer signature, committed the 33-file hardening set, merged current `origin/main` (0 conflicts), re-verified 6100/6101 green.
- **Sean (owner):** authorized the read-only prod probe ("probe first, then push"); probe returned SAFE (0 fail-closed users); authorized the single fast-forward push.

## 12. Sign-off
- **Shipped:** 2026-07-11. `main` FF `547a96c6b..f2ad6f261` (hardening) — the deal feature itself was already live from 2026-07-10.
- **Deploy verified live:** `/api/health` 200 healthy/store-ready; both migrations landed in prod (`shopping_carts_one_open_per_user` present, `order_items.storefrontItemId` nullable); `/api/session-packages` 200 with the real lineup, `price:null` for anon, no specials leaked; `/api/storefront` 200.
- **Next-action pointer:** the pre-existing PII stale test (Codex's nutrition lane) is the recommended next cleanup; otherwise this workstream is complete.
