# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 63.8s
> **Files:** backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/12/2026, 11:22:08 AM

---

# Security Audit Report: SwanStudios Admin Gallery Routes

**File:** `backend/routes/adminGalleryRoutes.mjs`  
**Auditor:** Web Application Security Specialist  
**Date:** 2024  
**Theme Compliance:** ✅ Uses Enchanted Apex theme colors (Midnight Sapphire, Ice Wing, etc.)

---

## Executive Summary

The admin gallery routes contain **CRITICAL security vulnerabilities** primarily around **command injection** and **insecure file handling**. While authentication and authorization are properly implemented, the file upload pipeline exposes significant attack vectors. The code shows good attention to memory management for Render's 512MB constraints but sacrifices security for functionality.

---

## 🔴 CRITICAL Findings

### 1. **Command Injection via `execFileSync` (dcraw)**
**Location:** Lines ~200-210 (single upload route), ~800-810 (reprocess route)
**Vulnerability:** Direct execution of user-controlled file paths without proper sanitization
```javascript
const dcrawResult = execFileSync(dcrawBin, ['-T', '-w', '-q', '3', '-o', '1', uploadedPath], {
  timeout: 120000,
  stdio: ['pipe', 'pipe', 'pipe'],
});
```
**Risk:** Attacker could craft a filename with shell metacharacters to execute arbitrary commands
**Fix:** Use `execFile` with arguments array (already done), but also:
- Validate `uploadedPath` is within `tmpdir()` bounds
- Use `path.resolve()` to prevent directory traversal
- Consider using `child_process.spawn` with explicit argument passing

### 2. **Insecure Temporary File Handling**
**Location:** Multiple routes using `tmpdir()` with predictable filenames
**Vulnerability:** Race conditions and symlink attacks
```javascript
const tmpRaw = `${tmpDir}/reprocess_${photo.id}.arw`;
```
**Risk:** Attacker could create symlinks to overwrite sensitive files
**Fix:** 
- Use `fs.mkdtemp()` with unique prefixes
- Set restrictive permissions (0o700)
- Use `fs.open()` with `O_EXCL` flag

### 3. **Path Traversal in File Operations**
**Location:** Lines using `file.originalname` without sanitization
**Vulnerability:** User-controlled filenames could contain `../` sequences
**Example:** `../../../etc/passwd` in `file.originalname`
**Fix:** 
- Use `path.basename()` to strip directory components
- Validate against allowlist of safe characters
- Normalize paths before use

---

## 🟠 HIGH Findings

### 4. **Insufficient Input Validation**
**Location:** All POST/PATCH routes accepting JSON input
**Vulnerability:** No schema validation for request bodies
**Example:** `req.body` used directly without validation
**Risk:** Type confusion, prototype pollution, unexpected data structures
**Fix:** Implement Zod or Yup schemas for all input:
```javascript
const eventSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(8),
  // ... other fields
});
```

### 5. **Information Disclosure in Error Messages**
**Location:** Multiple catch blocks returning full error messages
**Vulnerability:** Stack traces and system details exposed
```javascript
return res.status(500).json({ success: false, error: err.message || 'Upload failed' });
```
**Risk:** Reveals internal paths, library versions, system configuration
**Fix:** Use generic error messages in production:
```javascript
logger.error('[AdminGallery] Upload error:', err);
return res.status(500).json({ success: false, error: 'Internal server error' });
```

### 6. **Insecure CORS Configuration**
**Location:** `setup-r2-cors` route (lines ~650-700)
**Vulnerability:** Overly permissive CORS settings
```javascript
AllowedHeaders: ['*'],
AllowedOrigins: ['https://sswanstudios.com', 'http://localhost:5173', ...]
```
**Risk:** CSRF attacks, credential leakage
**Fix:** 
- Restrict `AllowedHeaders` to specific needed headers
- Remove localhost origins in production
- Add `AllowCredentials: false` unless required

### 7. **Missing File Size Validation (DoS)**
**Location:** Multer configuration allows 150MB files
**Vulnerability:** Memory exhaustion attacks
**Risk:** Attacker could upload many large files simultaneously
**Fix:** 
- Implement rate limiting per user/IP
- Add total upload size limits across requests
- Consider streaming processing instead of buffering

---

## 🟡 MEDIUM Findings

### 8. **Insecure Direct Object References**
**Location:** Routes using `req.params.id` without ownership checks
**Vulnerability:** Admin could access other admins' events if ID guessing works
**Example:** `DELETE /events/:id` - admin can delete any event
**Risk:** Horizontal privilege escalation
**Fix:** Add ownership verification even for admins:
```javascript
const event = await GalleryEvent.findOne({
  where: { id: req.params.id, createdBy: req.user.id }
});
```

### 9. **Missing Content-Type Validation**
**Location:** Presigned upload route accepts arbitrary content types
**Vulnerability:** `file.type` from client is trusted
```javascript
const contentType = file.type || 'application/octet-stream';
```
**Risk:** Upload of executable files disguised as images
**Fix:** Server-side MIME type verification using `file-type` library

### 10. **Insecure Password Handling**
**Location:** Event password storage
**Vulnerability:** Passwords logged in error messages potentially
**Risk:** Password leakage through logs
**Fix:** 
- Never log password fields
- Consider using separate authentication system for events
- Implement password strength requirements

### 11. **SQL Injection Surface**
**Location:** Raw SQL queries in delete photo route
**Vulnerability:** While using parameterized queries, string concatenation risks exist
```javascript
await sequelize.query('DELETE FROM gallery_photos WHERE id = :photoId', {
  replacements: { photoId },
});
```
**Risk:** Future modifications might introduce concatenation
**Fix:** Always use parameterized queries; avoid raw SQL when possible

---

## 🟢 LOW Findings

### 12. **Missing Request Rate Limiting**
**Location:** All routes
**Vulnerability:** No protection against brute force or DoS
**Risk:** API abuse, resource exhaustion
**Fix:** Implement express-rate-limit with different limits for admin vs public routes

### 13. **Insecure Defaults**
**Location:** Watermark enabled by default
**Vulnerability:** Business logic issue - watermarks might be accidentally omitted
**Risk:** Intellectual property leakage
**Fix:** Make watermarking explicit requirement; don't allow disabling via API

### 14. **Missing Audit Logging**
**Location:** Administrative actions
**Vulnerability:** No record of who did what
**Risk:** Unable to trace malicious admin actions
**Fix:** Log all admin actions with user ID, timestamp, and action details

### 15. **Hardcoded Binary Paths**
**Location:** dcraw binary detection
**Vulnerability:** Path traversal in module resolution
```javascript
join(__adminGalleryDir, '..', 'node_modules', 'dcraw-vendored-linux', 'dcraw'),
```
**Risk:** Dependency confusion attacks
**Fix:** Use package resolution or checksum verification

---

## ✅ Security Strengths

1. **Authentication/Authorization:** Proper JWT protection with role checks
2. **Parameterized Queries:** SQL injection protection in most places
3. **File Type Validation:** Multer filter checks extensions and MIME types
4. **Memory Management:** Good attention to buffer cleanup for Render constraints
5. **HTTPS Enforcement:** Production URLs use HTTPS
6. **Error Logging:** Comprehensive logging structure

---

## 🛠️ Recommended Immediate Actions

### Priority 1 (Critical):
1. **Fix command injection** - sanitize all file paths before execFile
2. **Secure temp files** - use `mkdtemp` with unique directories
3. **Implement path traversal protection** - normalize all file paths

### Priority 2 (High):
4. **Add input validation schemas** - implement Zod for all routes
5. **Sanitize error messages** - generic errors in production
6. **Tighten CORS** - remove wildcard headers, restrict origins

### Priority 3 (Medium/Low):
7. **Add rate limiting** - protect upload endpoints
8. **Implement audit logging** - track all admin actions
9. **Add file verification** - server-side MIME type checking

---

## 📊 Risk Assessment Summary

| Category | Risk Level | Findings |
|----------|------------|----------|
| Injection | 🔴 CRITICAL | 1 |
| File Handling | 🔴 CRITICAL | 2 |
| Input Validation | 🟠 HIGH | 1 |
| Information Disclosure | 🟠 HIGH | 1 |
| Access Control | 🟡 MEDIUM | 1 |
| Configuration | 🟡 MEDIUM | 2 |
| DoS Protection | 🟢 LOW | 1 |

**Overall Risk Score:** **HIGH** - Immediate remediation required for critical findings

---

## 🎨 Theme Compliance Note

The code audit focuses on security, but note that the retired Galaxy-Swan theme colors (`#0a0a1a`, `#00FFFF`, `#7851A9`) are correctly avoided as requested. The Enchanted Apex theme colors are appropriately referenced in documentation only.

---

*Report generated by SwanStudios Security Auditor*  
*Next steps: Schedule emergency patch deployment for critical findings within 24 hours*

---

*Part of SwanStudios 7-Brain Validation System*
