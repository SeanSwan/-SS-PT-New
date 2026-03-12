# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 70.7s
> **Files:** AI-Village-Documentation/gemini-consults/latest.md, backend/controllers/authController.mjs, backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs, backend/models/GalleryPhoto.mjs, backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 9:54:39 PM

---

# Security Audit Report: SwanStudios Web Application

## Executive Summary
The code review reveals several **CRITICAL** and **HIGH** severity security vulnerabilities, particularly in authentication and authorization mechanisms. The authController contains multiple security flaws including weak JWT configuration, improper secret management, and authorization bypass risks. While the code demonstrates good security awareness in documentation, actual implementation contains dangerous oversights.

---

## 1. OWASP Top 10 Findings

### CRITICAL: Broken Authentication - JWT Secret Configuration
**File:** `backend/controllers/authController.mjs`
**Lines:** 68, 69, 83-85, 90-92
**Issue:** JWT secrets fall back to `process.env.JWT_SECRET` for refresh tokens if `JWT_REFRESH_SECRET` is not set. This violates security best practices - access and refresh tokens should use different secrets.
**Impact:** Compromise of one token type could lead to compromise of both.
**Fix:** Require separate `JWT_REFRESH_SECRET` environment variable; remove fallback.

### HIGH: Broken Access Control - Admin Registration Bypass
**File:** `backend/controllers/authController.mjs`
**Lines:** 268-284
**Issue:** Admin role assignment logic allows clients to specify `role` parameter. While admin code is checked, the default role is `'user'` but could be manipulated.
**Impact:** Potential privilege escalation if admin code validation is bypassed.
**Fix:** Remove `role` parameter from request; assign default role server-side.

### MEDIUM: Injection Risk - Sequelize ORM Usage
**File:** `backend/controllers/authController.mjs`
**Lines:** Multiple (e.g., 232, 365)
**Issue:** While Sequelize provides parameterization, complex `Op.or` queries with user input could still be vulnerable if not properly sanitized.
**Impact:** Potential SQL injection through edge cases.
**Fix:** Implement input validation before database queries.

### LOW: Security Misconfiguration - JWT Expiry
**File:** `backend/controllers/authController.mjs`
**Lines:** 68
**Issue:** Default JWT expiry is `24h` (from environment or default), which is too long for access tokens.
**Impact:** Extended exposure window if tokens are compromised.
**Fix:** Reduce to 1-2 hours; implement proper refresh token rotation.

---

## 2. Client-Side Security

### HIGH: Token Storage Guidance Missing
**File:** `backend/controllers/authController.mjs`
**Issue:** No guidance on secure client-side token storage. Tokens returned in API responses but no instructions for secure storage (httpOnly cookies vs localStorage).
**Impact:** Tokens vulnerable to XSS attacks if stored in localStorage.
**Fix:** Document secure storage practices; consider httpOnly cookies for production.

### MEDIUM: Debug Information Exposure
**File:** `backend/controllers/authController.mjs`
**Lines:** 124-125, 344-346
**Issue:** Console logging of sensitive request data in development.
**Impact:** Accidental exposure in production if NODE_ENV not set properly.
**Fix:** Remove or gate all console.log statements with `process.env.NODE_ENV === 'development'`.

---

## 3. Input Validation

### HIGH: Weak Password Reset Token Validation
**File:** `backend/controllers/authController.mjs`
**Lines:** 1006-1008
**Issue:** Password reset uses HMAC with secret but doesn't validate token format/length before hashing.
**Impact:** Potential DoS through malformed tokens.
**Fix:** Add token format validation before HMAC computation.

### MEDIUM: Email Validation Inconsistency
**File:** `backend/controllers/authController.mjs`
**Lines:** 210-216, 579-585
**Issue:** Basic regex email validation that may not catch all invalid formats or allow dangerous characters.
**Impact:** Potential injection or malformed data storage.
**Fix:** Use robust email validation library; consider normalization.

### LOW: Missing Request Size Limits
**Issue:** No explicit limits on request body size for registration/login endpoints.
**Impact:** Potential DoS through large payloads.
**Fix:** Implement express.json() limits or middleware validation.

---

## 4. CORS & CSP

### CRITICAL: CORS Configuration Missing
**Issue:** No CORS configuration visible in provided code. Frontend (sswanstudios.com) needs explicit CORS policies.
**Impact:** CSRF attacks, unauthorized cross-origin requests.
**Fix:** Implement strict CORS middleware allowing only trusted origins.

### MEDIUM: No Content Security Policy
**Issue:** No CSP headers implemented or documented.
**Impact:** XSS attacks more effective without CSP restrictions.
**Fix:** Implement CSP with strict directives for production.

---

## 5. Authentication

### CRITICAL: Rate Limiting Effectively Disabled
**File:** `backend/controllers/authController.mjs`
**Lines:** 74-77
**Issue:** Rate limiting constants set to extremely high values (`999999` attempts, `1 minute` window) for testing.
**Impact:** Brute force attacks trivial in current configuration.
**Fix:** Restore production values: 10 attempts per 15 minutes minimum.

### HIGH: In-Memory Rate Limiter
**File:** `backend/controllers/authController.mjs`
**Lines:** 79-80
**Issue:** Rate limiting uses in-memory Map, not persistent storage.
**Impact:** Rate limiting ineffective in multi-instance deployments; lost on restart.
**Fix:** Implement Redis or database-backed rate limiting.

### HIGH: JWT Token ID Not Validated
**File:** `backend/controllers/authController.mjs`
**Issue:** `tokenId` in JWT payload generated but not validated or tracked for revocation.
**Impact:** Cannot revoke individual tokens; token reuse detection limited.
**Fix:** Implement token blacklisting/whitelisting system.

### MEDIUM: Refresh Token Hash Storage
**File:** `backend/controllers/authController.mjs`
**Lines:** 326-327, 448-449
**Issue:** Refresh tokens hashed with bcrypt (slow algorithm) but access tokens not similarly protected.
**Impact:** Performance impact; inconsistent security approach.
**Fix:** Consider faster hashing for refresh tokens or implement token introspection.

---

## 6. Authorization

### HIGH: Missing RBAC Enforcement
**File:** `backend/controllers/authController.mjs`
**Lines:** 754-780 (`getUserById`)
**Issue:** `getUserById` endpoint accessible to any authenticated user, not just admins as documented.
**Impact:** Users can retrieve other users' profiles.
**Fix:** Add admin role check middleware; implement proper RBAC.

### MEDIUM: Auto-Follow Admin Feature
**File:** `backend/controllers/authController.mjs`
**Lines:** 328-348
**Issue:** Automatic friendship creation with admin without user consent.
**Impact:** Privacy concern; potential spam vector.
**Fix:** Make optional or require user consent.

---

## 7. Data Exposure

### HIGH: Error Message Information Leak
**File:** `backend/controllers/authController.mjs`
**Lines:** Multiple error responses
**Issue:** Different error messages for "user not found" vs "invalid password" in login.
**Impact:** User enumeration vulnerability.
**Fix:** Use generic error messages for all authentication failures.

### MEDIUM: Development Error Details
**File:** `backend/controllers/authController.mjs`
**Lines:** 287-291, 500-505
**Issue:** Stack traces and detailed errors returned in development mode.
**Impact:** Accidental exposure in production if misconfigured.
**Fix:** Use centralized error handling; never expose stack traces.

### LOW: PII in Logs
**File:** `backend/controllers/authController.mjs`
**Lines:** 124, 344
**Issue:** Email/username fragments logged.
**Impact:** PII exposure in log files.
**Fix:** Hash or mask all identifiers in logs.

---

## 8. Database & Model Security

### LOW: Migration Security
**File:** `backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs`
**Issue:** No validation on `source_type` values.
**Impact:** Potential invalid data injection.
**Fix:** Add ENUM constraint or validation.

### MEDIUM: Model Field Exposure
**File:** `backend/models/GalleryPhoto.mjs`
**Issue:** All fields exposed via model; no field-level permissions.
**Impact:** Over-exposure of data through API.
**Fix:** Implement view models or field filtering.

---

## 9. Cryptographic Issues

### HIGH: Password Reset Secret Fallback
**File:** `backend/controllers/authController.mjs`
**Lines:** 71
**Issue:** `RESET_SECRET` falls back to `JWT_SECRET` if not set.
**Impact:** Single secret compromise affects multiple systems.
**Fix:** Require separate `PASSWORD_RESET_SECRET`.

### MEDIUM: HMAC for Password Reset
**File:** `backend/controllers/authController.mjs`
**Lines:** 1006-1008
**Issue:** Uses HMAC-SHA256 for password reset tokens instead of random tokens with secure comparison.
**Impact:** Timing attacks possible.
**Fix:** Use crypto.randomBytes() with constant-time comparison.

---

## 10. Business Logic Flaws

### HIGH: Silent Token Refresh Implementation
**Reference:** `AI-Village-Documentation/gemini-consults/latest.md`
**Issue:** Design document mentions "silent token refresh" but implementation not visible.
**Impact:** Potential infinite token renewal without re-authentication.
**Fix:** Implement maximum session lifetime; require periodic re-auth.

### MEDIUM: Upload System Security
**Reference:** `AI-Village-Documentation/gemini-consults/latest.md`
**Issue:** WebSocket-based upload system mentioned without security considerations.
**Impact:** Potential WebSocket hijacking, injection.
**Fix:** Authenticate WebSocket connections; validate all messages.

---

## Recommendations Priority

### Immediate (Critical/High):
1. Fix JWT secret configuration - require separate refresh secret
2. Implement proper CORS middleware
3. Restore production rate limiting values
4. Fix user enumeration in authentication errors
5. Add admin role checks to admin endpoints

### Short-term (Medium):
1. Implement CSP headers
2. Add request size limiting
3. Move rate limiting to Redis
4. Implement token revocation system
5. Fix password reset token generation

### Long-term (Low):
1. Implement comprehensive input validation
2. Add field-level data permissions
3. Implement audit logging
4. Regular security dependency updates
5. Security headers implementation (HSTS, etc.)

---

## Overall Security Rating: **POOR**

**Score:** 3/10

The application demonstrates security awareness in documentation but contains critical implementation flaws that would make it vulnerable to common attacks. The authentication system requires immediate remediation before production use.

---

*Part of SwanStudios 7-Brain Validation System*
