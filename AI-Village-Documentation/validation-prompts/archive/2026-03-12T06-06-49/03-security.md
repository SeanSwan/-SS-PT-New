# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 36.8s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 11:06:49 PM

---

# Security Audit Report: SwanStudios Admin Gallery Routes

## Executive Summary
The admin gallery routes contain **CRITICAL** security vulnerabilities including **insecure direct object references (IDOR)**, **injection risks**, and **memory exhaustion attacks**. The code shows good authentication/authorization patterns but lacks proper input validation, parameterized queries, and secure file processing.

---

## CRITICAL Findings

### 1. SQL Injection via Raw Sequelize Literals
**Location:** `/events/:id/vote-stats` endpoint (lines 1268-1275)
**Vulnerability:** Use of `literal()` with raw SQL strings
```javascript
[fn('SUM', literal("CASE WHEN vote_type = 1 THEN 1 ELSE 0 END")), 'thumbsUp'],
```
**Risk:** Attackers could inject SQL via manipulated `vote_type` values if not properly sanitized elsewhere.
**Fix:** Use Sequelize's query builder methods instead of raw literals.

### 2. Insecure Direct Object References (IDOR)
**Location:** Multiple endpoints using `req.params.id` without ownership verification
**Vulnerability:** Admin/trainer can access/modify any event by ID without checking if they own/have access to it.
**Example:** `PATCH /events/:id`, `DELETE /events/:id`, `POST /events/:id/upload-single`
**Risk:** Privilege escalation - trainers could modify/delete other trainers' events.
**Fix:** Add resource-level authorization checks.

### 3. Memory Exhaustion via File Upload
**Location:** `uploadSingle` and `upload` configurations
**Vulnerability:** 150MB file limit with memory storage can exhaust Render's 512MB memory.
**Risk:** DoS attack by uploading multiple large files simultaneously.
**Fix:** Implement disk-based storage with streaming processing.

---

## HIGH Findings

### 4. Path Traversal in File Operations
**Location:** Multiple R2 key constructions
**Vulnerability:** User-controlled `event.slug` used in storage paths without sanitization:
```javascript
const storageKey = `gallery/${event.slug}/${photoNumber}.jpg`;
```
**Risk:** Attackers could use `../` sequences to write files outside intended directory.
**Fix:** Validate `slug` format and sanitize path components.

### 5. Command Injection in dcraw Execution
**Location:** `reprocess-photo/:photoId` endpoint (lines 857-880)
**Vulnerability:** Dynamic import and execution of `dcraw` binary with user-controlled input:
```javascript
await execFileAsync(dcrawPath, ['-T', '-w', '-o', '1', tmpRaw], { timeout: 120000 });
```
**Risk:** If `photo.originalName` contains shell metacharacters, could lead to RCE.
**Fix:** Use hardcoded arguments, validate file extensions, use child process spawn with proper escaping.

### 6. Insecure CORS Configuration
**Location:** `/setup-r2-cors` endpoint (lines 699-730)
**Vulnerability:** Overly permissive CORS rules:
```javascript
AllowedHeaders: ['*'],
AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
```
**Risk:** CSRF attacks and potential data exfiltration.
**Fix:** Restrict headers to necessary ones only, limit methods.

### 7. Sensitive Data Exposure in Logs
**Location:** Multiple logger.error() calls
**Vulnerability:** Full error stacks and user data logged:
```javascript
logger.error('[AdminGallery] Upload error:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
```
**Risk:** PII, system paths, and implementation details exposed in logs.
**Fix:** Sanitize logs, use structured logging without stack traces in production.

---

## MEDIUM Findings

### 8. Weak Input Validation
**Location:** Event creation/update endpoints
**Vulnerability:** No validation on `name`, `description`, `location` fields
**Risk:** XSS via stored malicious content that might be rendered in admin panels.
**Fix:** Implement Zod/Yup schemas with HTML escaping.

### 9. Missing Rate Limiting
**Location:** All upload endpoints
**Vulnerability:** No rate limits on `/upload-single`, `/upload`, `/presign-upload`
**Risk:** DoS via rapid upload requests exhausting resources.
**Fix:** Implement express-rate-limit with different limits for upload endpoints.

### 10. Insecure Default Watermark Behavior
**Location:** `confirm-upload` endpoint
**Vulnerability:** Watermark enabled by default (`enableWatermark = true`)
**Risk:** If watermark service fails, could cause processing errors or data loss.
**Fix:** Make watermarking opt-in with proper error handling.

### 11. Missing Content-Type Validation
**Location:** File upload endpoints
**Vulnerability:** Accepts `application/octet-stream` for any file
**Risk:** Malicious files could bypass image validation.
**Fix:** Validate magic bytes/file signatures, not just extensions/MIME types.

---

## LOW Findings

### 12. Information Disclosure via Error Messages
**Location:** Multiple try-catch blocks returning full error messages
**Vulnerability:** Detailed error messages returned to client:
```javascript
return res.status(500).json({ success: false, error: err.message || 'Upload failed' });
```
**Risk:** Leakage of system information.
**Fix:** Return generic error messages in production.

### 13. Missing Audit Logging
**Location:** Critical operations (delete, update, upload)
**Vulnerability:** No comprehensive audit trail of admin actions
**Risk:** Cannot trace malicious or accidental changes.
**Fix:** Implement structured audit logging with user ID, action, timestamp.

### 14. Inefficient Database Queries
**Location:** `stats` endpoint with multiple `count()` calls
**Vulnerability:** Potential performance impact
**Risk:** DoS via repeated stats requests.
**Fix:** Implement caching for dashboard stats.

---

## Recommendations by Priority

### Immediate (CRITICAL):
1. **Replace raw SQL literals** with Sequelize query builder
2. **Implement resource-level authorization** for all ID-based operations
3. **Switch to disk-based file processing** with streams
4. **Sanitize file paths** and implement path traversal protection

### Short-term (HIGH):
5. **Fix command injection** in dcraw execution
6. **Harden CORS configuration**
7. **Implement proper input validation** with Zod schemas
8. **Sanitize error logging** to remove PII and system details

### Medium-term (MEDIUM):
9. **Implement rate limiting** on all endpoints
10. **Add file signature validation** beyond MIME types
11. **Create comprehensive audit logging**
12. **Implement request validation middleware**

### Long-term (LOW):
13. **Add performance monitoring** and query optimization
14. **Implement comprehensive testing** for security scenarios
15. **Regular security dependency updates**

---

## Positive Security Aspects Noted:
1. **Authentication middleware** properly implemented with role checks
2. **Password hashing** using bcrypt with proper salt rounds
3. **File type filtering** with allowed extensions
4. **Memory management** attempts with buffer cleanup and GC hints
5. **Environment-based configuration** for R2 storage

## Overall Risk Assessment: **HIGH**

The routes contain critical vulnerabilities that could lead to data breach, privilege escalation, and system compromise. Immediate remediation is required before production deployment.

---
*Report generated for SwanStudios security audit. This assessment covers only the provided code file; a full security review should include all routes, middleware, and dependencies.*

---

*Part of SwanStudios 7-Brain Validation System*
