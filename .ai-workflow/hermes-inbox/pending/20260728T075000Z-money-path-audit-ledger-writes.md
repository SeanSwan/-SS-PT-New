# Money-path audit — the ledger WRITE endpoints were the hole, everything else held

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `f08a05056` on `origin/main`

## What is already strong — do NOT re-audit these

Recorded so the next money-path review starts where this one ended:

- **Price integrity.** Checkout prices are server-derived from DB rows (`variant.price` → `totalCost` → `price`). The client supplies only IDs and quantity. Deactivated items 409, mismatched variants 400, over-stock 409.
- **Offline/manual payments** validate totals server-side with Decimal EXACT equality (no tolerance) and create a `status:'pending'` order for admin confirmation. They grant nothing on their own. Confirmation is `protect + requireAdmin` on `adminOrdersRoutes`.
- **Stripe webhooks** — main, cart, and subscription — all verify signatures over a raw body and fail CLOSED when the secret is missing. Fulfilment additionally requires `payment_status === 'paid'`.
- **Session-credit grants** are idempotency-keyed with atomic increments (a prior incident hardened this).
- **Cart mutation** is scoped through the ShoppingCart join on `req.authUserId`, so cross-user cart edits 404.
- **`GET /financial/transactions`** forces `whereClause.userId` for non-admins, and `adminView` string-coercion is already handled.

## The one real hole

`POST /api/financial/log-transaction` was mounted live and `protect`-only, so ANY authenticated user could:
1. **Overwrite another user's transaction** — the update branch matched only on `stripePaymentIntentId` with no ownership check, letting a caller restate `status`, `refundAmount`, `feeAmount`, `netAmount`, `metadata` on someone else's payment.
2. **Fabricate ledger rows** from a client-supplied `amount`.
3. **Forge its own audit trail** — `ipAddress`/`userAgent` were accepted from the body.

`POST /api/financial/update-metrics` had the same gap and writes the rows admin revenue dashboards read. Its sibling `/calculate-metrics` already enforced admin inline; this one was missed.

Fixed by requiring `adminOnly` on both and observing the audit fields from the request. Gated rather than deleted — nothing in the frontend calls them (the only `/api/financial/*` call in the app is `/track-checkout-start`), but an operator keeps a manual reconciliation path.

## The transferable lesson

**A hardening pass can leave a hole immediately adjacent to itself.** `financialRoutesSecurity.test.mjs` uses the literal string `"router.post('/log-transaction'"` as a SLICE BOUNDARY to carve out the `/track-checkout-start` handler it audits. The vulnerable endpoint was the marker that *terminated* the audited region — hardened right up to its doorstep and never entered.

When reading a security test that slices source by route markers, the routes used as boundaries are exactly the ones nobody checked.

## Method note

Enumerating value-moving routes (anything writing `availableSessions`, `FinancialTransaction`, `Order` status/total, `.increment(`, refund/commission) and reporting their guards found this in one pass, after several spot-checks had all come back clean. But enumeration produces candidates, not conclusions: 4 of the flagged routes were false positives — gallery `/purchase-credits` is gated by `requireGalleryAccess` (passcode model, not user auth), `social/groupMembership` inherits `protect` from `groups.mjs`, and both flagged webhooks are signature-verified. A line-offset drift in the sweep also sliced neighbouring handlers. Verify every candidate against the real file before touching it.

*IDs and roles only. No PII, credentials, or customer data.*
