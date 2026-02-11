# Launch Readiness Audit

**Date:** 2026-02-11
**Auditor:** Claude Opus 4.6 (Senior Full-Stack Launch Stabilization Engineer)
**Target:** sswanstudios.com (production)
**Backend:** ss-pt-new.onrender.com
**Bundle:** index.D4cRiymM.js + UniversalSchedule.CgZfU1tV.js
**Commit:** 381a89ca (latest deployed)

---

## Phase 1: Security Audit

### 1.1 Password Hashing (Auth Model)

**File:** `backend/models/User.mjs`

| Check | Status | Evidence |
|-------|--------|----------|
| `beforeCreate` has `$2` guard | PASS | Line 314: `if (user.password.startsWith('$2')) { return; }` |
| `beforeCreate` skips null/empty | PASS | Line 310: `if (!user.password \|\| user.password.length === 0) { return; }` |
| `beforeUpdate` checks `user.changed('password')` | PASS | Line 329: `if (user.changed('password') && user.password && user.password.length > 0)` |
| `beforeUpdate` has `$2` guard | PASS | Line 330: `if (!user.password.startsWith('$2'))` |
| No pre-hashing in routes | PASS | `userManagementRoutes.mjs:500` comment: "Password hashed by User.beforeCreate hook" |
| No bcrypt.hash calls in route files | PASS | `grep bcrypt.hash` returns zero matches in `backend/routes/` |

**Verdict:** Password hashing is correctly implemented. The double-hash bug documented in CRITICAL-COMPONENTS-REPORT.md has been **already fixed** in the current codebase.

---

### 1.2 JWT / Token Security

**File:** `backend/middleware/authMiddleware.mjs`

| Check | Status | Evidence |
|-------|--------|----------|
| JWT_SECRET validated (not placeholder) | PASS | Line 292: checks for existence and placeholder value |
| Token type enforcement (access only) | PASS | Line 316: `if (decoded.tokenType !== 'access')` |
| User DB lookup on every request | PASS | Line 331: `User.findByPk(decoded.id)` |
| isActive check (disabled accounts blocked) | PASS | Line 349: `if (!user.isActive)` returns 403 |
| Password not exposed in req.user | PASS | Line 358-363: only id, role, username, email attached |
| Token error differentiation (expired vs invalid) | PASS | Lines 383-396: TokenExpiredError, JsonWebTokenError, NotBeforeError mapped |
| Token expiry: 15min access, 7d refresh | PASS | Documented in comments, lines 76-77 |

**Verdict:** JWT implementation is solid. Known trade-off: stateless JWT means tokens cannot be revoked on password change (mitigated by 15min expiry).

---

### 1.3 RBAC Enforcement

**File:** `backend/middleware/authMiddleware.mjs`

| Middleware | Status | Evidence |
|-----------|--------|----------|
| `protect` (JWT auth required) | PASS | Line 272: validates Bearer token |
| `adminOnly` | PASS | Line 417: checks `req.user.role === 'admin'` |
| `trainerOnly` | PASS | Line 474: checks `req.user.role === 'trainer'` |
| `clientOnly` | PASS | Line 495: checks `req.user.role === 'client'` |
| `authorize(roles[])` | PASS | Line 440: checks `roles.includes(req.user.role)` |
| `ownerOrAdminOnly(getOwnerId)` | PASS | Line 543: admin bypass + owner check |
| `trainerOrAdminOnly` | PASS | Line 516: trainer or admin |
| `checkTrainerClientRelationship` | PASS | Line 599: checks ClientTrainerAssignment table |

**Stale comment at line 157:** States "Trainers can access all clients (permissive)" but actual code at line 626 correctly checks `ClientTrainerAssignment.findOne()`. Comment is outdated; code is correct.

---

### 1.4 Production Route Exposure

**Method:** Playwright fetch probe against `https://ss-pt-new.onrender.com`

| Endpoint | Expected | Actual | Status |
|----------|----------|--------|--------|
| `/api/debug/auth-check` | 404 (prod-gated) | 404 | PASS |
| `/api/debug/verify-password` | 404 (prod-gated) | 404 | PASS |
| `/health` | 200 (public) | 200 | PASS |
| `/api/admin/clients` (no auth) | 401 | 401 | PASS |
| `/api/sessions` (no auth) | 401 | 401 | PASS |
| `/api/storefront` (public) | 200 | 200 | PASS |

**Evidence:** Debug routes gated by `!isProduction` at `backend/core/routes.mjs:330`.

---

### 1.5 Webhook Security

**File:** `backend/routes/cartRoutes.mjs`

| Check | Status | Evidence |
|-------|--------|----------|
| Stripe signature verification | PASS | Line 760: `stripeClient.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET)` |
| Missing signature rejected | PASS | Line 752: checks `!signature \|\| !process.env.STRIPE_WEBHOOK_SECRET` |
| Invalid signature returns 400 | PASS | Line 767: `res.status(400)` |
| Always returns 200 after processing | PASS | Line 812+ (Stripe retries on non-2xx) |

---

### 1.6 Session Grant Service (Race Condition Protection)

**File:** `backend/services/SessionGrantService.mjs`

| Check | Status | Evidence |
|-------|--------|----------|
| DB transaction wraps entire operation | PASS | Line 38: `sequelize.transaction()` |
| Row-level lock on cart | PASS | Line 60: `lock: transaction.LOCK.UPDATE` |
| Row-level lock on user | PASS | Line 84: `lock: transaction.LOCK.UPDATE` |
| Idempotency via `sessionsGranted` flag only | PASS | Line 71: `if (cart.sessionsGranted === true)` |
| Does NOT check `status === 'completed'` for idempotency | PASS | Line 70 comment explicitly addresses this |
| Atomic increment (not read-then-write) | PASS | Line 95: `user.increment('availableSessions', { by })` |
| Both verify-session and webhook use this service | PASS | `v2PaymentRoutes.mjs:439`, `cartRoutes.mjs:782` |
| Rollback on error | PASS | Line 128: `transaction.rollback()` |

**Verdict:** The purchase attribution race condition documented in the existing plan has been **already fixed** with the SessionGrantService implementation.

---

## Phase 1 Findings (Severity-Ordered)

### P1 - MEDIUM: Rate Limiter Disabled in Production

**File:** `backend/middleware/authMiddleware.mjs:692`
**Impact:** Brute force login attacks are possible. No request throttling on any endpoint.
**Evidence:**
```javascript
// Line 692-693
next();
return;  // ← Bypasses all rate limiting logic below
```
**Remediation:** APPLIED - Removed early `next(); return;` bypass and reset default max from 1000 to 100.
- Login: 10 attempts per 15min per IP (configured in `authRoutes.mjs:354`)
- Register: 10 per hour per IP (configured in `authRoutes.mjs:341`)
- Refresh: 20 per 15min per IP (configured in `authRoutes.mjs:367`)
- Profile photo upload: 10 per 15min (configured in `profileRoutes.mjs:40`)
- **Tests:** 155/155 backend + 25/25 frontend PASS after fix

### P1 - MEDIUM: Missing Trust Proxy for Render

**File:** `backend/core/app.mjs:24`
**Impact:** `req.ip` returns Render proxy IP instead of real client IP. Multiple users behind the same proxy could trigger false rate-limit lockouts.
**Evidence:** Express behind Render reverse proxy without `trust proxy` setting — `req.ip` resolves to load balancer IP.
**Remediation:** APPLIED - Added `app.set('trust proxy', 1)` in production mode after `express()` initialization.
- Only enabled in production (`if (isProduction)`) to avoid dev environment side effects
- **Tests:** 155/155 backend + 25/25 frontend PASS after fix

### P2 - LOW: Stale RBAC Comment (FIXED)

**File:** `backend/middleware/authMiddleware.mjs:157`
**Impact:** Misleading documentation only. Code is correct.
**Evidence:** Comment said "Current: Trainers can access all clients (permissive, needs refinement)" but line 626 correctly checks `ClientTrainerAssignment`.
**Remediation:** APPLIED - Updated comment to: "Implemented: ClientTrainerAssignment junction table enforces trainer-client scope"

### P3 - LOW: No Token Revocation on Password Change

**File:** `backend/middleware/authMiddleware.mjs`
**Impact:** After password change, old tokens remain valid for up to 15 minutes.
**Evidence:** Stateless JWT architecture, documented trade-off at lines 87-94.
**Remediation:** Acceptable risk for launch. Future enhancement: add `passwordChangedAt` field and check in `protect()`.

---

## Phase 1 Summary

| Category | Status | Details |
|----------|--------|---------|
| Password Hashing | PASS | Double-hash bug already fixed |
| JWT/Token Security | PASS | Proper validation, type checking, DB lookup |
| RBAC Enforcement | PASS | All 8 middleware variants working correctly |
| Route Exposure | PASS | Debug routes 404 in production |
| Webhook Security | PASS | Stripe signature verification active |
| Session Grant Service | PASS | Transaction + row lock + atomic increment |
| Rate Limiting | FIXED | Was disabled; re-enabled with proper limits |
| Trust Proxy | FIXED | `app.set('trust proxy', 1)` added for Render |
| RBAC Comment | FIXED | Stale comment updated to reflect actual implementation |

**Phase 1 Verdict:** Security posture is strong. Two P1 issues (rate limiter disabled, missing trust proxy) were found and **fixed**. One P2 (stale comment) also **fixed**. All previously-documented P0 security bugs (double-hash, race condition) are already resolved in the current codebase.

---

## Pause Gate A Checkpoint

- [x] Security audit complete
- [x] Findings documented with severity, file:line, and evidence
- [x] No P0 security issues found
- [x] P1 rate limiter: re-enabled with proper limits (155 backend + 25 frontend tests pass)
- [x] P1 trust proxy: `app.set('trust proxy', 1)` added for Render (155 backend + 25 frontend tests pass)
- [x] P2 stale RBAC comment: updated to reflect actual implementation
- [ ] Pause Gate A approved by human

**Next highest-impact task:** Commit and deploy Pause Gate A fixes, then proceed to Phase 2: Auth + Session Integrity (login/signup/reset/profile lifecycle testing on production).
