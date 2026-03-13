# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 55.8s
> **Files:** backend/routes/galleryRoutes.mjs, backend/services/formAnalysisService.mjs
> **Generated:** 3/12/2026, 12:00:35 PM

---

# Security Audit Report: SwanStudios Gallery Routes & Form Analysis Service

## Executive Summary
This audit identifies **CRITICAL** security vulnerabilities in the gallery system, primarily around **insecure JWT handling, missing input validation, and potential PII exposure**. The code demonstrates good architectural patterns (rate limiting, structured logging) but contains dangerous oversights that could lead to account takeover, privilege escalation, and data breaches.

---

## Critical Findings (CRITICAL)

### 1. **Hardcoded JWT Fallback Secret**
**Location:** `backend/routes/galleryRoutes.mjs:38`
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET || 'gallery-fallback-secret';
```
**Risk:** If `JWT_SECRET` environment variable is missing, the system uses a predictable fallback secret. Attackers could forge gallery tokens, access private photos, and potentially escalate to VIP/admin privileges.
**Impact:** Complete system compromise via token forgery.
**Fix:** Remove fallback, require environment variable:
```javascript
const GALLERY_JWT_SECRET = process.env.JWT_SECRET;
if (!GALLERY_JWT_SECRET) throw new Error('JWT_SECRET required');
```

### 2. **Missing Stripe Webhook Verification**
**Location:** Multiple payment endpoints (`/purchase-credits`, `/donation`, `/vip-checkout`)
**Risk:** Credits/VIP status applied immediately before payment confirmation. If Stripe webhook fails or is bypassed, users get free services.
**Impact:** Revenue loss, unauthorized VIP access.
**Fix:** Move credit application to `checkout.session.completed` webhook handler with signature verification.

### 3. **Insecure VIP Activation Endpoint**
**Location:** `/api/gallery/vip-activate` (line ~1100)
**Risk:** No verification that payment was successful. Any authenticated visitor can POST to activate VIP status.
**Impact:** Privilege escalation to unlimited enhancements.
**Fix:** Remove this endpoint; VIP activation should only happen via verified Stripe webhook.

---

## High Severity Findings

### 4. **Missing Input Validation & Sanitization**
**Location:** Multiple endpoints accepting user input without validation:
- `/enhancement-request`: `photoIds` array not validated for type/numeric range
- `/referral`: Phone/email not validated
- `/message`: No HTML/script sanitization
- `/vip-signup`: Password strength validation insufficient

**Risk:** SQL injection (via Sequelize raw queries), XSS in stored messages, data corruption.
**Fix:** Implement Zod schemas for all endpoints:
```javascript
import { z } from 'zod';
const enhancementSchema = z.object({
  photoIds: z.array(z.number().int().positive()).min(1).max(50)
});
```

### 5. **PII Exposure in Logs**
**Location:** Multiple `logger.info()` calls with email addresses and user IDs
**Example:** Line 226: `logger.info(\`[Gallery:CRM] Auto-created lead id=${lead.id} from visitor=${visitor.id}\`)`
**Risk:** GDPR/CCPA violation, sensitive data in log aggregators.
**Fix:** Use anonymized identifiers or hash sensitive data:
```javascript
logger.info(`[Gallery:CRM] Lead created: ${hashEmail(email)}`);
```

### 6. **Missing CORS Configuration**
**Location:** No CORS headers configured in routes
**Risk:** CSRF attacks, unauthorized cross-origin requests.
**Fix:** Implement strict CORS policy:
```javascript
import cors from 'cors';
router.use(cors({
  origin: process.env.FRONTEND_URL || 'https://sswanstudios.com',
  credentials: true
}));
```

### 7. **Insecure Direct Object Reference (IDOR)**
**Location:** `/photos/:id/download` - checks `eventId` but not visitor ownership
**Risk:** Any gallery visitor can download any photo from their accessed event by guessing IDs.
**Impact:** Unauthorized photo access.
**Fix:** Add visitor-specific permission check or use signed URLs.

---

## Medium Severity Findings

### 8. **Weak Rate Limiting Configuration**
**Location:** Rate limiters use IP-based tracking which can be bypassed
**Risk:** Brute force attacks against `/events/:slug/access` endpoint.
**Fix:** Implement visitorId-based rate limiting for authenticated endpoints.

### 9. **Missing Content Security Policy Headers**
**Location:** No CSP headers in responses
**Risk:** XSS attacks could execute malicious scripts.
**Fix:** Implement strict CSP:
```javascript
res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:;");
```

### 10. **Insecure File Fetch in Form Analysis**
**Location:** `formAnalysisService.mjs` - fetches external URLs without validation
**Risk:** SSRF attack if `photo.url` can be controlled/malformed.
**Fix:** Validate URLs are from trusted domains (R2/S3):
```javascript
if (!photo.url.startsWith('https://r2.sswanstudios.com/')) {
  throw new Error('Invalid photo source');
}
```

### 11. **API Key Exposure Risk**
**Location:** `formAnalysisService.mjs` - Gemini API key in environment variable
**Risk:** Key could leak via error messages or logs.
**Fix:** Ensure error responses don't expose key; rotate keys regularly.

### 12. **Missing Audit Logging for VIP Changes**
**Location:** VIP status changes lack audit trail
**Risk:** Cannot trace who activated VIP or when.
**Fix:** Create audit entries for all privilege changes.

---

## Low Severity Findings

### 13. **Information Disclosure via Error Messages**
**Location:** Generic error messages but stack traces in development
**Risk:** Path disclosure, technology stack revelation.
**Fix:** Use production error handler that sanitizes responses.

### 14. **Missing HTTP Security Headers**
**Location:** No HSTS, X-Frame-Options, X-Content-Type-Options
**Risk:** Clickjacking, MIME sniffing attacks.
**Fix:** Add security middleware:
```javascript
app.use(helmet());
```

### 15. **Inconsistent Input Trimming**
**Location:** Some fields trimmed (`email.trim()`), others not
**Risk:** Data quality issues, potential bypass of validation.
**Fix:** Consistent trimming middleware or schema preprocessing.

### 16. **Missing Database Query Timeouts**
**Location:** Sequelize queries without timeouts
**Risk:** DoS via slow queries.
**Fix:** Add query timeouts:
```javascript
await GalleryEvent.findAll({
  where: { isPublished: true },
  timeout: 5000 // 5 seconds
});
```

---

## Positive Security Practices Noted

1. **Rate Limiting Implemented** - Good coverage on sensitive endpoints
2. **Structured Logging** - Consistent logger usage with context
3. **Password Hashing** - Proper bcrypt usage for event passwords
4. **JWT Token Validation** - Type checking and expiration handling
5. **Sequelize Parameterization** - Reduces SQL injection risk
6. **Environment Variable Usage** - Configuration separated from code

---

## Immediate Action Items (Priority Order)

1. **CRITICAL**: Remove JWT fallback secret - deploy within 24 hours
2. **CRITICAL**: Implement Stripe webhook verification - 48 hours
3. **HIGH**: Add input validation with Zod schemas - 72 hours
4. **HIGH**: Configure CORS and security headers - 24 hours
5. **MEDIUM**: Fix SSRF vulnerability in form analysis - 72 hours

---

## Overall Risk Assessment

**Current Risk Level: HIGH**  
The system contains critical vulnerabilities that could lead to complete compromise. However, the codebase shows good security awareness in many areas and can be secured with focused improvements.

**Recommendation:** Implement all critical/high findings before next production deployment. Conduct penetration testing after fixes are applied.

---

*Report generated by Security Auditor for SwanStudios*  
*Theme Compliance: Enchanted Apex (Midnight Sapphire #002060 palette verified)*  
*RETIRED Galaxy-Swan theme properly avoided*

---

*Part of SwanStudios 7-Brain Validation System*
