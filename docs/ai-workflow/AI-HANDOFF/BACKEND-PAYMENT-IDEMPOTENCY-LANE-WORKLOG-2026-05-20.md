# Backend Payment Idempotency Lane Worklog - 2026-05-20

## Status

Prepared as a backend-only local commit slice. Not pushed.

This lane is backend-only. A separate terminal owns frontend release hardening.

## Goal

Reduce realistic duplicate-charge and duplicate-session-credit risks across the SwanStudios acquisition and admin payment funnel.

Primary focus:
- Canonical Genesis checkout
- Admin card-on-file charging
- Session credit grants
- Mounted alternate backend checkout creators
- Admin session allocation compatibility endpoints

## Files Owned By This Lane

- `backend/utils/stripeIdempotency.mjs`
- `backend/utils/paymentIdempotency.mjs`
- `backend/utils/paymentRecovery.constants.mjs`
- `backend/models/PrintOrder.mjs`
- `backend/migrations/20260520000001-add-payment-idempotency-unique-indexes.mjs`
- `backend/services/SessionGrantService.mjs`
- `backend/routes/v2PaymentRoutes.mjs`
- `backend/routes/cartRoutes.mjs`
- `backend/routes/achPaymentRoutes.mjs`
- `backend/routes/offlinePaymentRoutes.mjs`
- `backend/routes/sessionPackageRoutes.mjs`
- `backend/routes/subscriptionRoutes.mjs`
- `backend/routes/galleryRoutes.mjs`
- `backend/routes/adminChargeCardRoutes.mjs`
- `backend/webhooks/stripeWebhook.mjs`
- `backend/routes/sessions.mjs`
- `backend/tests/api/adminChargeCard.test.mjs`
- `backend/tests/api/payments.test.mjs`
- `backend/__tests__/SessionGrantService.monthlyPackage.test.mjs`
- `backend/__tests__/sessionsAllocationCompatibilityRoutes.test.mjs`
- `backend/__tests__/stripeIdempotencyUtil.test.mjs`
- `backend/__tests__/paymentIdempotencyRaceGuards.test.mjs`

## What Changed

1. Added a shared Stripe idempotency helper.
   - Stable keys use deterministic serialization and SHA-256.
   - Windowed keys use a short retry window for stateless browser payment actions.

2. Hardened canonical Genesis checkout.
   - `/api/v2/payments/create-checkout-session` now creates Stripe Checkout Sessions with a deterministic cart/user/content key.
   - Session credits use shared `sessions` then `totalSessions` fallback logic.

3. Hardened legacy mounted cart checkout.
   - `/api/cart/checkout` no longer uses `Date.now()` as the idempotency key.
   - Its dynamic `createdAt` and `expires_at` values are pinned to the same retry window so Stripe receives identical params for duplicate submits.
   - A hostile-review patch keeps `expires_at` safely above Stripe's 30-minute minimum throughout the one-minute retry window.

4. Hardened stateless alternate checkout creators.
   - `/api/payments/ach/create-intent`
   - `/api/payments/offline`
   - `/api/session-packages/purchase`
   - `/api/subscriptions/checkout`
   - `/api/gallery/purchase-credits`
   - `/api/gallery/donation`
   - `/api/gallery/vip-checkout`
   - `/api/gallery/print-order`

5. Hardened admin card-on-file charge.
   - `/api/admin/charge-card/charge` now passes `admin-charge:${idempotencyToken}` to Stripe PaymentIntents instead of generating a random UUID.
   - Its compensating refund call now uses `admin-charge-refund:${idempotencyToken}` so retrying a failed grant does not create duplicate refund side effects.

6. Hardened session credit fulfillment.
   - Monthly packages with `totalSessions` now grant the correct credits.
   - Stripe webhook credit math uses the same helper and fails closed if a completed cart has items but zero grantable credits.
   - Legacy `/api/session-packages/webhook` now writes a durable `Order` fulfillment marker inside the same transaction as the session-credit increment, so duplicate `checkout.session.completed` events do not add credits twice.

7. Restored mounted admin allocation compatibility endpoints.
   - `/api/sessions/allocate-from-order`
   - `/api/sessions/add-to-user`
   - `/api/sessions/user-summary/:userId`
   - `/api/sessions/allocation-health`

8. Added DB-backed idempotency race guards.
   - Re-asserted the existing unique partial index contract for `orders.idempotencyKey` without taking ownership of that older index on rollback.
   - Added `print_orders.idempotency_key` plus a unique partial index.
   - Added a shared claim helper that delegates to Sequelize `findOrCreate`, which keeps unique-index races inside Sequelize's transaction/savepoint path.
   - Gallery print checkout now uses a pre-order payment attempt key instead of deriving the Stripe idempotency key from `PrintOrder.id`.
   - Gallery print checkout now returns the already-created checkout URL for duplicate attempts, or a 409 `PAYMENT_ATTEMPT_INCOMPLETE` while a matching checkout is still being prepared.

## Verification Run

- `node --check` passed for all dirty tracked backend `.mjs`/`.js` files.
- Focused Vitest command passed after red/green verification: `__tests__/paymentIdempotencyRaceGuards.test.mjs` and `tests/api/payments.test.mjs`: 2 files, 26 tests.
- Focused payment/session bundle passed: 6 files, 71 tests.
- Full backend `npm test` passed: 198 files, 2,989 tests.
- `bash scripts/scan-secrets.sh --all` passed: 6,899 files scanned, 0 hits.
- Explicit scan of the 8 new untracked lane/worklog files passed: 8 files scanned, 0 hits.
- `git diff --cached --name-only` returned no staged files.
- `git diff --check` exited 0 and returned only LF/CRLF normalization warnings.

## Hostile Review Findings

P0 mitigated:
- Canonical Genesis checkout no longer creates a new Stripe Checkout Session for every duplicate identical click.
- Admin card-on-file charges now use the frontend/admin idempotency token all the way into Stripe.
- Admin card-on-file compensating refunds now use the same payment attempt token namespace for Stripe refund idempotency.
- ACH retries now reuse the existing local `Order` and Stripe PaymentIntent instead of creating a second pending SwanStudios order around the same Stripe attempt.
- Offline payment order creation now scopes idempotency lookup to the authenticated user and derives a short-window server key when an older caller omits the frontend UUID.
- Legacy session-package webhooks now have a backend fulfillment marker before `availableSessions` changes, instead of trusting Stripe to send the event once.
- Monthly package credits are no longer silently lost when `sessions` is null and `totalSessions` is the real source.
- Idempotency helper test clocks now preserve explicit zero values instead of silently falling back to `Date.now()`.
- Legacy cart checkout expiry is no longer at risk of being under Stripe's minimum lifetime because the timestamp is pinned to retry-window-start plus 31 minutes.
- Gallery print checkout no longer creates a new `PrintOrder` attempt key from `PrintOrder.id`; duplicate submits share a stable attempt key before order creation.
- The shared DB claim path now uses Sequelize `findOrCreate`, avoiding a direct catch-and-reread pattern that could poison a surrounding Postgres transaction after a unique violation.
- Order and print-order idempotency keys now have migration-backed unique-index coverage, with fail-closed duplicate preflight checks before the print-order index is created.
- The new migration rollback removes only the new print-order index/column; it does not remove the older order idempotency index that was introduced by `20260221200000-add-idempotency-key-to-orders.cjs`.

Residual risks:
- The new migration intentionally fails closed if production already contains duplicate order or print-order idempotency keys. If Render migration fails, inspect the duplicate keys before redeploying; do not bypass the check.
- `backend/services/payment/PaymentService.mjs` and its strategy classes appear dormant from current grep; they were not polished in this lane.
- Live Stripe replay testing was not run. Current verification is static, unit, route syntax, source-regression, and full backend test suite.

## Next AI Instructions

- Do not stage or commit this lane without Sean approval.
- Do not mix this backend lane with frontend release-hardening files.
- Do not archive, move, or delete current runtime backend files from this lane.
- Before commit planning, re-run:
  - `git status --short --untracked-files=all`
  - `git diff --cached --name-only`
  - `cd backend; npm test`
  - `bash scripts/scan-secrets.sh --all`
- If continuing payment hardening, consider replacing the print-order short-window reuse with a DB-backed payment attempt key.
