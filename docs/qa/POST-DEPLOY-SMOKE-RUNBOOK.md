# Post-Deploy Smoke Runbook: P0 Fixes

**Commit:** `ab86ccfd` (P0 fixes) + `b28d54ff` (smoke tests)
**Deploy target:** Render auto-deploy from `main`
**Automated coverage:** 155 tests (9 files), all green

---

## Pre-Flight

```bash
# Verify deploy is live (check Render dashboard or)
curl -s https://sswanstudios.com/api/health | jq .status
# Expected: "ok"

# Verify backend version matches commit
curl -s https://sswanstudios.com/api/health | jq .version
```

---

## Check 1: verify-session Idempotency

**What it proves:** Calling verify-session twice for the same cart does not double-grant sessions.

### Automated (already passing)
- `postDeploySmoke.test.mjs` > "full double-call sequence"
- `sessionGrantService.test.mjs` > "concurrent calls grant sessions exactly once"

### Manual (Stripe CLI)

```bash
# 1. Create a test checkout session via the app (use test card 4242424242424242)
#    Note the checkout session ID from the Stripe dashboard (cs_test_...)

# 2. Call verify-session twice rapidly
SESSION_ID="cs_test_YOUR_SESSION_ID"
TOKEN="Bearer YOUR_JWT_TOKEN"

# First call — should grant sessions
curl -s -X POST https://sswanstudios.com/api/v2/payments/verify-session \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}" | jq .

# Expected:
# {
#   "success": true,
#   "message": "Order verified and completed successfully",
#   "data": { "sessionsAdded": 10, ... }
# }

# Second call — should be idempotent
curl -s -X POST https://sswanstudios.com/api/v2/payments/verify-session \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}" | jq .

# Expected:
# {
#   "success": true,
#   "message": "Order already verified (idempotent response)",
#   "data": { "sessionsAdded": 0, "alreadyProcessed": true }
# }
```

### DB Verification

```sql
-- Cart should have sessionsGranted = true
SELECT id, status, "sessionsGranted", "completedAt"
FROM shopping_carts WHERE id = <CART_ID>;
-- Expected: status='completed', sessionsGranted=true

-- User sessions should be incremented exactly once
SELECT id, email, "availableSessions"
FROM users WHERE id = <USER_ID>;
-- Expected: availableSessions = (previous value + package sessions)
```

**Pass criteria:** Second call returns `alreadyProcessed: true`, `sessionsAdded: 0`. User `availableSessions` incremented exactly once.

---

## Check 2: Webhook Retry on Failure

**What it proves:** If `grantSessionsForCart` fails during webhook processing, the endpoint returns 5xx so Stripe retries.

### Automated (already passing)
- `postDeploySmoke.test.mjs` > "returns 500 when grantSessionsForCart throws"
- `postDeploySmoke.test.mjs` > "Stripe retries are safe: repeated webhook after failure still grants"

### Manual (Stripe CLI)

```bash
# Install Stripe CLI if not already
# https://stripe.com/docs/stripe-cli

# Listen for webhook events locally (for dev testing)
stripe listen --forward-to localhost:5000/api/cart/webhook

# Trigger a checkout.session.completed event
stripe trigger checkout.session.completed

# Check Stripe dashboard > Developers > Webhooks > Recent events
# Look for:
#   - 200 response = success (sessions granted or idempotent)
#   - 500 response = failure (Stripe will auto-retry)
```

### Verify Stripe Retry Behavior

```bash
# In Stripe dashboard: Developers > Webhooks > select endpoint
# Check "Attempts" column for any failed deliveries
# Stripe retries: immediately, 5min, 30min, 2hr, 5hr, 10hr, 10hr (up to 3 days)
```

**Pass criteria:** Webhook returns 200 on success, 500 on service failure. Stripe shows retry attempts for any 5xx responses.

---

## Check 3: Admin-Created User Login Flow

**What it proves:** The password double-hash bug is fixed. Admin-created users can log in, and profile updates without password changes don't break login.

### Automated (already passing)
- `passwordHashing.test.mjs` > "admin-created user can login after beforeCreate hook"
- `passwordHashing.test.mjs` > "profile update without password change preserves login"
- `postDeploySmoke.test.mjs` > "full lifecycle: create -> login -> update profile -> login -> reset password -> login"

### Manual

```bash
ADMIN_TOKEN="Bearer YOUR_ADMIN_JWT"
BASE="https://sswanstudios.com/api"

# 1. Admin creates a new user
curl -s -X POST "$BASE/user-management/user" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Smoke",
    "lastName": "Test",
    "email": "smoketest@example.com",
    "username": "smoketest",
    "password": "SmokeTest123!",
    "role": "client"
  }' | jq .

# Expected: { "success": true, "user": { ... } }

# 2. New user logs in
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest@example.com",
    "password": "SmokeTest123!"
  }' | jq .

# Expected: { "success": true, "token": "eyJ..." }
# FAIL if: { "error": "Invalid credentials" } (double-hash bug)

# 3. Update profile WITHOUT changing password
USER_TOKEN="Bearer <token from step 2>"
curl -s -X PUT "$BASE/user-management/user/<USER_ID>" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "SmokeUpdated" }' | jq .

# 4. Login again with same password
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest@example.com",
    "password": "SmokeTest123!"
  }' | jq .

# Expected: { "success": true, "token": "eyJ..." }
# FAIL if: login broken after profile update

# 5. Cleanup: delete test user (optional)
curl -s -X DELETE "$BASE/user-management/user/<USER_ID>" \
  -H "Authorization: $ADMIN_TOKEN" | jq .
```

**Pass criteria:** Login succeeds at steps 2 and 4. Profile update does not break existing password.

---

## Rollback Plan

If any check fails:

```bash
# 1. Revert to previous commit
git revert ab86ccfd b28d54ff --no-commit
git commit -m "revert: P0 fixes causing regression"
git push origin main

# 2. Render auto-deploys the revert

# 3. Investigate locally
cd backend && npm test  # Run full suite
```

---

## Go-Live Gate Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| All 155 tests green | ___ | `npm test` output |
| verify-session idempotency (manual) | ___ | Second call returns `alreadyProcessed: true` |
| webhook 5xx on failure (manual or Stripe dashboard) | ___ | 500 response visible in webhook logs |
| admin-created user can login | ___ | Step 2 returns JWT |
| profile update preserves login | ___ | Step 4 returns JWT |
| No ungranted carts in production | ___ | `SELECT count(*) FROM shopping_carts WHERE status='completed' AND "sessionsGranted"=false` returns 0 |
| Render deploy healthy | ___ | `/api/health` returns `ok` |

**Sign-off:** _________________ Date: _________
