# Security Regression Tracker — Launch Week

**Baseline established:** 2026-02-12
**Retest cadence:** After every Critical deploy + daily sweep

---

## Security Test Matrix

Each test has a baseline result and gets retested. If a regression appears, it becomes a P0/P1 finding.

### Auth & Access Control

| ID | Test | Baseline (2026-02-12) | Latest | Status |
|----|------|----------------------|--------|--------|
| SEC-01 | Inactive user login blocked before token issuance | PASS (401, no token) | PASS | Stable |
| SEC-02 | Active user login succeeds with valid token | PASS (200, token issued) | PASS | Stable |
| SEC-03 | Invalid credentials rejected | PASS (401) | PASS | Stable |
| SEC-04 | JWT access token expires at 3h | PASS (verified in token) | PASS | Stable |
| SEC-05 | Refresh token type cannot be used as access token | PASS (token type check) | PASS | Stable |
| SEC-06 | Locked account login blocked | PASS (login handler check) | PASS | Stable |

### RBAC Boundaries

| ID | Test | Baseline | Latest | Status |
|----|------|----------|--------|--------|
| RBAC-01 | Client cannot access admin user list | PASS (403) | PASS | Stable |
| RBAC-02 | Client cannot access admin dashboard stats | PASS (403) | PASS | Stable |
| RBAC-03 | Client cannot create sessions | PASS (403) | PASS | Stable |
| RBAC-04 | Client cannot modify other users | PASS (403) | PASS | Stable |
| RBAC-05 | Trainer cannot access admin routes | PASS (403) | PASS | Stable |
| RBAC-06 | Trainer sees only assigned sessions | PASS (15 vs admin 47) | PASS | Stable |
| RBAC-07 | Client sees only own sessions | PASS (0 for test client) | PASS | Stable |
| RBAC-08 | Unauthenticated request to protected route | PASS (401) | PASS | Stable |

### IDOR / Data Isolation

| ID | Test | Baseline | Latest | Status |
|----|------|----------|--------|--------|
| IDOR-01 | Client cannot fetch other user's profile | PASS (403) | PASS | Stable |
| IDOR-02 | Client cannot modify other user's data | PASS (403) | PASS | Stable |
| IDOR-03 | Session data does not leak cross-user PII | PASS (sanitized) | PASS | Stable |

### Input Validation

| ID | Test | Baseline | Latest | Status |
|----|------|----------|--------|--------|
| INP-01 | SQL injection in login field | PASS (rejected 401) | PASS | Stable |
| INP-02 | XSS in registration fields | PASS (rejected 400) | PASS | Stable |
| INP-03 | Oversized payload handling | PASS (express limit) | PASS | Stable |

### Payment / Webhook Integrity

| ID | Test | Baseline | Latest | Status |
|----|------|----------|--------|--------|
| PAY-01 | Checkout requires authentication | PASS (401) | PASS | Stable |
| PAY-02 | Store packages load correctly | PASS (5 active) | PASS | Stable |
| PAY-03 | Stripe configured and ready | PASS | PASS | Stable |
| PAY-04 | sessionsGranted idempotency flag exists | PASS (design verified) | PASS | Stable |

### Infrastructure / Headers

| ID | Test | Baseline | Latest | Status |
|----|------|----------|--------|--------|
| INF-01 | Helmet.js security headers active | PASS (11 headers) | PASS | Stable |
| INF-02 | Debug endpoints return 404 in production | PASS (10/10) | PASS | Stable |
| INF-03 | API responses exclude sensitive fields | PASS (no password/Stripe IDs) | PASS | Stable |
| INF-04 | Rate limiting active on login | PASS (10/15min window) | PASS | Stable |

---

## Regression Findings

### Template
| Field | Value |
|-------|-------|
| **ID** | REG-NNN |
| **Date found** | YYYY-MM-DD |
| **Triggered by** | Deploy commit or external event |
| **Severity** | P0 / P1 / P2 |
| **Description** | What regressed |
| **Impact** | Who/what is affected |
| **Fix commit** | `<hash>` |
| **Verified** | YYYY-MM-DD — retest result |

### Active Regressions
*None at baseline.*

### Resolved Regressions

#### REG-001 — Inactive users could obtain JWT tokens
| Field | Value |
|-------|-------|
| **Date found** | 2026-02-12 |
| **Triggered by** | Discovered during account cleanup verification |
| **Severity** | P1 (functionally mitigated by protect() middleware) |
| **Description** | Login endpoint issued JWT tokens to users with isActive=false. Tokens were useless (protect() blocked all API access) but should never be issued. |
| **Impact** | Deactivated accounts received tokens they couldn't use |
| **Fix commit** | `714cfa03` security(auth): block inactive users at login before token issuance |
| **Verified** | 2026-02-12 — production returns 401 "Account is inactive" with hasToken=false |

---

## Retest Protocol

### After Critical Deploys
Run the full matrix above. Update the "Latest" column and "Status" for each test.

### After Non-Critical Deploys
Run SEC-01, SEC-02, RBAC-01, RBAC-08, PAY-01, INF-01 (6-test quick sweep).

### Quick Retest Commands (API)

```bash
# SEC-01: Inactive login blocked
curl -s -X POST https://sswanstudios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"client@swanstudios.com","password":"test123"}' | jq .

# SEC-02: Active login works
curl -s -X POST https://sswanstudios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq '.token | length > 0'

# RBAC-01: Client cannot list users
TOKEN=$(curl -s -X POST https://sswanstudios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"client","password":"client123"}' | jq -r .token)
curl -s https://sswanstudios.com/api/auth/users -H "Authorization: Bearer $TOKEN" | jq .

# RBAC-08: No auth rejected
curl -s https://sswanstudios.com/api/sessions | jq .

# PAY-01: Checkout requires auth
curl -s -X POST https://sswanstudios.com/api/checkout/create-checkout-session | jq .

# INF-01: Security headers
curl -sI https://sswanstudios.com/api/health | grep -iE "strict|content-security|x-frame|x-content-type"
```

---

*Update after every deploy. If any test flips from PASS to FAIL, create a regression entry immediately.*
