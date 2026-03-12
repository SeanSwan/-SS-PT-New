# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 86.6s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:33:10 PM

---

# Security Audit Report: SwanStudios Admin Gallery Routes

**File:** `backend/routes/adminGalleryRoutes.mjs`  
**Auditor:** Web Application Security Specialist  
**Date:** Current Review  
**Scope:** OWASP Top 10, Client-side Security, Input Validation, CORS & CSP, Authentication, Authorization, Data Exposure  

---

## Executive Summary

The code implements admin gallery functionality with several security concerns. While basic authentication/authorization is present, there are **CRITICAL** vulnerabilities in file upload handling, command injection risks, and insufficient input validation. The code shows awareness of memory constraints but lacks proper security controls for production.

---

## Detailed Findings

### 1. **CRITICAL - Command Injection via `execFileSync`**
**Location:** `router.post('/events/:id/upload-single', ...)` → `execFileSync(dcrawBin, ['-T', '-w', '-q', '3', '-o', '1', uploadedPath], ...)`

**Issue:** The `uploadedPath` variable comes from user-controlled file uploads (`file.originalname`). An attacker could upload a file with a malicious filename containing command injection payloads (e.g., `; rm -rf /; .jpg`). While `execFileSync` uses an array format, the path is not sanitized.

**Impact:** Remote Code Execution (RCE) as the Node.js process user.

**Fix:**
```javascript
// Validate filename contains only safe characters
const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
// Or use a UUID for the temp file instead
```

**Risk:** CRITICAL

---

### 2. **CRITICAL - Insecure File Operations with User-Controlled Paths**
**Location:** Multiple routes using `existsSync`, `unlinkSync`, `statSync` with `uploadedPath`

**Issue:** User-controlled filenames are used in filesystem operations without path traversal protection. An attacker could use `../../../etc/passwd` as filename.

**Example:** `uploadedPath.replace(/\.[^.]+$/, '.tiff')` assumes safe extension replacement.

**Impact:** Path traversal leading to arbitrary file read/write/delete.

**Fix:**
```javascript
const path = require('path');
const safePath = path.resolve(tmpdir(), path.basename(file.originalname));
// Or better: generate random filename
const safeFilename = `upload-${Date.now()}-${crypto.randomBytes(16).toString('hex')}${extname(file.originalname)}`;
```

**Risk:** CRITICAL

---

### 3. **HIGH - Insufficient Input Validation**
**Location:** Throughout codebase (event creation, updates, query parameters)

**Issues:**
- No validation/sanitization for `req.body` fields (name, sport, location, description)
- SQL injection potential via raw Sequelize queries with `literal()` in vote stats
- No schema validation (Zod/Yup) for any endpoints
- Query parameters (`status`, `eventId`) used directly without validation

**Example:** `const { status = 'requested' } = req.query;` → No validation of allowed status values.

**Impact:** SQL injection, NoSQL injection (if using JSON fields), stored XSS via event descriptions.

**Fix:** Implement Zod schemas for all endpoints:
```javascript
import { z } from 'zod';
const eventSchema = z.object({
  name: z.string().min(1).max(100),
  sport: z.string().max(50).optional(),
  // ...
});
```

**Risk:** HIGH

---

### 4. **HIGH - Insecure Direct Object References (IDOR)**
**Location:** All routes with `:id` parameters

**Issue:** While admin authorization is checked, there's no verification that the resource belongs to the admin's scope. An admin could modify/delete any event/photo by guessing IDs.

**Example:** `router.delete('/photos/:photoId', ...)` doesn't verify the photo belongs to an event the admin manages.

**Impact:** Privilege escalation within admin role, data corruption.

**Fix:** Add resource ownership checks:
```javascript
const photo = await GalleryPhoto.findByPk(req.params.photoId, {
  include: [{ model: GalleryEvent }]
});
if (!photo || photo.event.userId !== req.user.id) {
  return res.status(403).json(...);
}
```

**Risk:** HIGH

---

### 5. **HIGH - Memory Exhaustion & DoS via File Upload**
**Location:** Multiple upload endpoints

**Issues:**
1. `limits: { fileSize: 150 * 1024 * 1024, files: 2 }` but 150MB × 2 = 300MB → exceeds 512MB Render limit
2. Concurrent uploads could exhaust memory
3. No rate limiting on upload endpoints
4. `sharp()` with `limitInputPixels: false` enables pixel bomb attacks

**Impact:** Denial of Service via memory exhaustion, server crash.

**Fix:**
- Implement rate limiting (express-rate-limit)
- Reduce max file size to 50MB
- Enable `limitInputPixels: true` with reasonable limit
- Implement queue system for background processing

**Risk:** HIGH

---

### 6. **MEDIUM - Information Disclosure in Error Messages**
**Location:** Multiple `catch` blocks returning full error messages

**Issue:** `return res.status(500).json({ success: false, error: err.message || 'Upload failed' });` exposes internal details (paths, system errors).

**Example:** RAW conversion errors reveal filesystem paths and dcraw binary location.

**Impact:** Information disclosure aiding attackers.

**Fix:** Use generic error messages in production:
```javascript
const isProduction = process.env.NODE_ENV === 'production';
return res.status(500).json({ 
  success: false, 
  error: isProduction ? 'Internal server error' : err.message 
});
```

**Risk:** MEDIUM

---

### 7. **MEDIUM - Weak CORS Configuration**
**Location:** `router.post('/setup-r2-cors', ...)` → `AllowedHeaders: ['*']`

**Issue:** Overly permissive CORS headers (`AllowedHeaders: ['*']`) for R2 bucket. While presigned URLs need flexibility, `*` is too broad.

**Impact:** Potential for cross-origin attacks if R2 bucket misconfigured.

**Fix:** Restrict allowed headers:
```javascript
AllowedHeaders: [
  'Content-Type',
  'Content-MD5',
  'Authorization',
  'x-amz-date',
  'x-amz-content-sha256'
]
```

**Risk:** MEDIUM

---

### 8. **MEDIUM - Missing Anti-CSRF Protection**
**Location:** All state-changing endpoints (POST, PATCH, DELETE)

**Issue:** No CSRF tokens for authenticated endpoints. Since the frontend uses React with likely same-origin requests, risk is reduced but still present if other subdomains are compromised.

**Impact:** Cross-Site Request Forgery for admin actions.

**Fix:** Implement CSRF tokens or use SameSite=Strict cookies.

**Risk:** MEDIUM

---

### 9. **LOW - Insecure Password Hashing Configuration**
**Location:** `const passwordHash = await bcrypt.hash(password, 10);`

**Issue:** Hardcoded salt rounds (10). While acceptable, should be configurable based on server capabilities.

**Impact:** Slower hashing on low-resource servers, faster brute-force on high-resource.

**Fix:** Make rounds configurable:
```javascript
const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const passwordHash = await bcrypt.hash(password, saltRounds);
```

**Risk:** LOW

---

### 10. **LOW - Missing Content Security Headers**
**Issue:** No CSP headers implemented in these routes. While typically set at app level, gallery routes serve images and could benefit from specific directives.

**Impact:** Reduced protection against XSS and other injection attacks.

**Fix:** Implement CSP headers:
```javascript
res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https://*.r2.cloudflarestorage.com;");
```

**Risk:** LOW

---

### 11. **LOW - PII Exposure in Logs**
**Location:** `logger.info(`[AdminGallery] ...`)` with user data

**Issue:** Logs may contain PII (email, names) from visitor data. No redaction visible.

**Impact:** GDPR/CCPA compliance issues, PII leakage in logs.

**Fix:** Implement PII redaction in logger utility:
```javascript
const redactPII = (str) => str.replace(/\b[\w.]+@[\w.]+\.[a-z]{2,}\b/g, '[REDACTED]');
logger.info(redactPII(`Uploaded for user ${email}`));
```

**Risk:** LOW

---

## Recommendations Priority

### Immediate (CRITICAL/HIGH):
1. **Fix command injection** - Sanitize all file paths before `execFileSync`
2. **Prevent path traversal** - Use `path.basename()` or UUID filenames
3. **Implement input validation** - Add Zod schemas for all endpoints
4. **Add resource ownership checks** - Prevent IDOR within admin role

### Short-term (MEDIUM):
5. **Implement rate limiting** - Prevent upload DoS
6. **Secure error messages** - Hide internal details in production
7. **Tighten CORS headers** - Restrict to necessary headers only
8. **Add CSRF protection** - For state-changing endpoints

### Long-term (LOW):
9. **Review password hashing** - Make rounds configurable
10. **Implement CSP headers** - For gallery-specific routes
11. **Add PII redaction** - For compliance and security

---

## Overall Security Rating: **POOR**

The code has fundamental security flaws that could lead to remote code execution and data breaches. While authentication is present, the lack of input validation, insecure file operations, and command injection vulnerabilities pose significant risks. Immediate remediation of CRITICAL issues is required before production deployment.

**Key Strengths:**
- Basic authentication/authorization middleware
- Memory-conscious design for large files
- Attempt at secure file type validation

**Key Weaknesses:**
- Command injection vulnerabilities
- Path traversal risks
- No input validation schemas
- Information disclosure in errors
- Missing anti-DoS controls

---

*Part of SwanStudios 7-Brain Validation System*
