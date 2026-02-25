# Purchase Session Attribution QA Report

**Date:** 2026-02-10
**Author:** Claude Opus 4.6 (QA + Full-Stack Engineer)
**Scope:** End-to-end validation of session package purchase flow and credit attribution
**Verdict:** CONDITIONAL PASS — core attribution works, one HIGH-severity race condition documented

---

## 1. Executive Summary

The SwanStudios purchase flow correctly attributes session credits to the purchasing user's account through the `verify-session` endpoint. Idempotency is enforced via the `sessionsGranted` boolean flag. Cross-user isolation is maintained by scoping cart lookups to `{ checkoutSessionId, userId }`. However, a HIGH-severity race condition exists when the Stripe webhook fires before `verify-session`, potentially preventing session grants entirely.

---

## 2. Architecture Map

### Purchase Flow (Happy Path)

```
Frontend                          Backend                         Stripe
--------                          -------                         ------
/store page
  |
  v
[Add to Cart] ──POST──> /api/cart/add
  |                       Creates/finds ShoppingCart + CartItem
  v
[Checkout] ────POST──> /api/v2/payments/create-checkout-session
  |                       Validates cart, creates Stripe session
  |                       Returns checkout URL
  v
Redirect to ────────────────────────────────────────────────────> Stripe hosted checkout
  |                                                                Payment processed
  v
/checkout/success <──────────────── redirect (success_url) ─────< Stripe callback
  |
  v
[Verify] ──────POST──> /api/v2/payments/verify-session
                         1. Retrieves Stripe session (payment_status=paid)
                         2. Finds cart by { checkoutSessionId, userId }
                         3. Checks idempotency (sessionsGranted flag)
                         4. Calculates sessions from cart items
                         5. Updates cart: status=completed, sessionsGranted=true
                         6. Updates user: availableSessions += N
                         Returns { sessionsAdded: N }

                        /api/cart/webhook (async)
                         Only updates cart status to 'completed'
                         Does NOT grant sessions
```

### Key Files

| File | Role |
|------|------|
| `backend/routes/v2PaymentRoutes.mjs` | Primary payment endpoints (create-checkout-session, verify-session) |
| `backend/routes/cartRoutes.mjs` | Cart CRUD + Stripe webhook handler |
| `backend/models/ShoppingCart.mjs` | Cart model with `sessionsGranted` idempotency flag |
| `backend/models/User.mjs` | User model with `availableSessions` field |
| `backend/middleware/authMiddleware.mjs` | JWT `protect` middleware, role validators |
| `backend/utils/sessionRbacHelper.mjs` | Session visibility RBAC filters |

### Endpoints Tested

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/cart/add` | protect + validatePurchaseRole | Add package to cart |
| POST | `/api/v2/payments/create-checkout-session` | protect + checkStripeAvailability | Create Stripe checkout |
| POST | `/api/v2/payments/verify-session` | protect + checkStripeAvailability | Verify payment + grant sessions |
| POST | `/api/cart/webhook` | Stripe signature | Async payment notification |
| GET | `/api/v2/payments/health` | None | Payment system health check |

---

## 3. Test Results

### Backend Unit Tests: `purchaseAttribution.test.mjs`

**26 tests, 26 passed, 0 failed** (193ms total)

| Suite | Tests | Status |
|-------|-------|--------|
| P0: Session Attribution Correctness | 6 | PASS |
| P0: Two-Client Isolation (Buyer vs Control) | 3 | PASS |
| P0: Idempotency (No Double Grants) | 4 | PASS |
| P0: Cross-User Cart Access Blocked | 2 | PASS |
| P1: Negative Checks | 4 | PASS |
| P1: Webhook vs Verify-Session Gap | 4 | PASS |
| P2: Pricing Integrity | 2 | PASS |
| P2: Race Condition — Read-Then-Write | 1 | PASS (documented) |

### Existing Payment Tests: `payments.test.mjs`

**17 tests, 17 passed, 0 failed** (167ms total) — No regressions.

### Test Persona Before/After Values

| User | Role | Baseline Sessions | Post-Purchase Sessions | Delta |
|------|------|-------------------|----------------------|-------|
| QA-Client-A (buyer) | client | 0 | 10 | +10 (10-Pack) |
| QA-Client-B (control) | client | 5 | 5 | 0 (unchanged) |

---

## 4. Visual QA — Playwright Screenshots

All screenshots captured with Playwright MCP. Store page renders with EW design tokens, fallback packages loaded (backend not running locally).

| Viewport | File | Cards Visible | Touch Targets |
|----------|------|---------------|---------------|
| 1280x720 | `store-purchase-qa-1280x720-packages.png` | 3-col grid, 8 packages | All >= 44px PASS |
| 768x1024 | `store-purchase-qa-768x1024-packages.png` | 1-col, cards stack | All >= 44px PASS |
| 375x812 | `store-purchase-qa-375x812-packages.png` | 1-col mobile | All >= 44px PASS |

### Touch Target Audit (375w)

| Element | Width | Height | Passes 44px |
|---------|-------|--------|-------------|
| Book Consultation | 160px | 52px | PASS |
| View Packages | 160px | 52px | PASS |
| Add to Cart (x8) | 140px | 44px | PASS |

---

## 5. Pass/Fail Matrix

| Test Case | Priority | Result | Notes |
|-----------|----------|--------|-------|
| Session attribution correctness (0 -> 10) | P0 | PASS | Exact session count from package |
| Session attribution with existing balance (5 -> 15) | P0 | PASS | Additive, not replacement |
| Multi-item cart calculation | P0 | PASS | 10 + (27*2) = 64 |
| Two-client isolation (buyer vs control) | P0 | PASS | Control user.update never called |
| Cart scoped by userId | P0 | PASS | WHERE { checkoutSessionId, userId } |
| Cross-user cart access blocked | P0 | PASS | Returns null for wrong userId |
| Idempotency — sessionsGranted=true skips | P0 | PASS | Returns sessionsAdded=0 |
| Idempotency — rapid double-call | P0 | PASS | Only 1 grant in 2 calls |
| Unpaid Stripe session rejected | P1 | PASS | payment_status !== 'paid' check |
| Missing cart returns null | P1 | PASS | 404 response path tested |
| Empty cart = 0 sessions | P1 | PASS | Reduce returns 0 |
| Null storefrontItem handled | P1 | PASS | Optional chaining works |
| Quantity=0 = 0 sessions | P1 | PASS | Math is correct |
| Webhook does NOT grant sessions | P1 | PASS | By design — documented |
| Webhook-then-verify race | P1 | **FAIL** | See Bug #1 below |
| Verify-then-webhook race | P1 | PASS | Safe path |
| Pricing integrity | P2 | PASS | Matches seeder values |
| No unlimited packages | P2 | PASS | All finite, < 1000 |
| Non-atomic read-then-write | P2 | DOCUMENTED | See Bug #2 below |

---

## 6. Bugs Found

### Bug #1: Webhook-Before-Verify Race Condition (HIGH)

**Severity:** HIGH
**Location:** `v2PaymentRoutes.mjs:466`
**Endpoint:** `POST /api/v2/payments/verify-session`

**Description:**
The idempotency check at line 466 uses an OR condition:
```javascript
const alreadyProcessed = cart.sessionsGranted === true || cart.status === 'completed';
```

The webhook handler (`cartRoutes.mjs:775-797`) sets `cart.status = 'completed'` but does NOT set `sessionsGranted = true`. If the webhook fires before the user's browser calls `verify-session`:

1. Webhook sets `status = 'completed'`
2. `verify-session` reads `status === 'completed'` -> `alreadyProcessed = true`
3. Returns `{ sessionsAdded: 0, alreadyProcessed: true }`
4. **User's sessions are NEVER granted**

**Impact:** Paying customer receives no sessions if Stripe webhook is faster than browser redirect. This is timing-dependent but realistic under slow network conditions.

**Fix Recommendation:**
Change the idempotency check to ONLY use the `sessionsGranted` flag:
```javascript
const alreadyProcessed = cart.sessionsGranted === true;
```
Or: Have the webhook also grant sessions (with the same idempotency guard).

---

### Bug #2: Non-Atomic Session Increment (MEDIUM)

**Severity:** MEDIUM
**Location:** `v2PaymentRoutes.mjs:507-512`

**Description:**
The session increment uses a read-then-write pattern:
```javascript
const currentSessions = user.availableSessions || 0;   // READ
await user.update({
  availableSessions: currentSessions + sessionsToAdd,   // WRITE
});
```

Two concurrent purchases for the same user (different carts) could both read the same baseline value. The last write wins, losing one purchase's sessions.

**Impact:** LOW probability (requires two concurrent purchases by the same user completing at the exact same moment), but data loss if it occurs.

**Fix Recommendation:**
Use Sequelize.literal for atomic increment:
```javascript
const { Sequelize } = await import('sequelize');
await user.update({
  availableSessions: Sequelize.literal(`"availableSessions" + ${sessionsToAdd}`),
});
```

---

### Bug #3: No Session Grant Recovery Path (MEDIUM)

**Severity:** MEDIUM
**Location:** Architecture gap

**Description:**
If `verify-session` is never called (user closes browser, network failure after Stripe payment), there is no background job, cron, or admin tool to reconcile paid-but-ungranted sessions. The webhook handler does NOT grant sessions.

**Impact:** Edge case — requires manual database intervention by admin to grant sessions for paid orders.

**Fix Recommendation:**
Either:
- Add session granting to the webhook handler (with idempotency)
- Create an admin endpoint to manually reconcile outstanding orders
- Add a scheduled job to find carts with `status='completed', sessionsGranted=false, paymentStatus='paid'` and grant sessions

---

## 7. Missing Guards Checklist

| Guard | Present | Notes |
|-------|---------|-------|
| JWT authentication on payment endpoints | YES | `protect` middleware |
| Cart scoped to authenticated user | YES | WHERE { userId } |
| Stripe payment verification | YES | `sessions.retrieve` + `payment_status === 'paid'` |
| Idempotency flag | YES | `sessionsGranted` boolean |
| Role validation | YES | `validatePurchaseRole` (any authenticated user) |
| Input validation (sessionId) | PARTIAL | No format validation on sessionId string |
| Rate limiting on verify-session | NO | Could be called repeatedly |
| Atomic session increment | NO | Read-then-write pattern (Bug #2) |
| Webhook session granting | NO | Only updates cart status (Bug #3) |
| Admin reconciliation tool | NO | No recovery path for edge cases |
| Audit trail | YES | `stripeSessionData` JSON field, `grantedBy: 'verify-session'` |

---

## 8. Simulation Disclosure

**What was tested live:**
- Store page rendering at 1280x720, 768x1024, 375x812 (Playwright MCP)
- Package card display, touch targets, responsive layout
- Backend unit tests with mocked Stripe and mocked models (Vitest)

**What was simulated:**
- Stripe payment processing (mocked in `tests/setup.mjs`)
- Database operations (mocked model methods)
- User authentication (mocked `req.user` objects)

**Why:** Stripe is an external payment provider. Full E2E with real payments requires test-mode Stripe keys, a running backend with PostgreSQL, and test card numbers. The existing test infrastructure correctly mocks these boundaries. The business logic under test (session calculation, idempotency, user isolation, cart scoping) is exercised with realistic data fixtures.

---

## 9. Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `backend/tests/api/purchaseAttribution.test.mjs` | 26 | NEW — Attribution, isolation, idempotency, negative cases |
| `backend/tests/api/payments.test.mjs` | 17 | EXISTING — Cart management, checkout, race conditions |

---

## 10. Final Verdict

### CONDITIONAL PASS

**Core attribution logic is correct.** Sessions are calculated accurately, granted to the correct user, protected by idempotency, and isolated between users.

**Condition for full PASS:** Fix Bug #1 (webhook-before-verify race condition). This is the only scenario where a paying customer could receive zero sessions.

| Category | Status |
|----------|--------|
| Purchase flow UI | PASS |
| Session attribution correctness | PASS |
| Idempotency (same cart) | PASS |
| Cross-user isolation | PASS |
| Webhook-verify race condition | **FAIL** (Bug #1) |
| Non-atomic increment | DOCUMENTED (Bug #2, MEDIUM) |
| Recovery path | MISSING (Bug #3, MEDIUM) |

**Recommended priority:**
1. **P0 (immediate):** Fix Bug #1 — change idempotency check to `sessionsGranted === true` only
2. **P1 (next sprint):** Bug #3 — add session granting to webhook OR admin reconciliation tool
3. **P2 (backlog):** Bug #2 — atomic increment via `Sequelize.literal`
