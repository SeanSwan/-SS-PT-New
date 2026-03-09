# Security — Validation Report

> **Status:** PASS | **Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 47.9s
> **Files:** backend/routes/exerciseRoutes.mjs, backend/routes/aiChatRoutes.mjs, backend/services/aiChatService.mjs, backend/models/AiConversation.mjs, backend/models/DailyMacroLog.mjs, backend/routes/dailyMacroRoutes.mjs, frontend/src/components/ClientDashboard/sections/FormAnalysisGalaxy.tsx, frontend/src/components/AIAssistant/AIAssistantFAB.tsx
> **Generated:** 3/7/2026, 9:08:31 PM

---

# Security Audit Report - SwanStudios Web Application

## Executive Summary
This security audit reviewed backend routes, services, models, and frontend components for the SwanStudios personal training SaaS platform. The review identified several security vulnerabilities ranging from CRITICAL to LOW severity. Key findings include SQL injection risks, insufficient input validation, improper error handling exposing sensitive information, and potential authorization bypasses.

## Critical Findings (CRITICAL)

### 1. SQL Injection via Sequelize Literal
**File:** `backend/routes/exerciseRoutes.mjs`  
**Location:** Line 73-74  
**Vulnerability:** Direct string concatenation in `sequelize.literal()`  
**Code:**
```javascript
[sequelize.literal(`CASE WHEN LOWER(name) LIKE '%' || ${sequelize.escape(searchQuery)} || '%' THEN 1 ELSE 2 END`), 'ASC']
```
**Risk:** `sequelize.escape()` is insufficient protection against SQL injection. An attacker could craft `searchQuery` to break out of the LIKE clause and execute arbitrary SQL.
**Impact:** Full database compromise, data exfiltration, data destruction.
**Fix:** Use parameterized queries or Sequelize's built-in operators instead of raw SQL literals.

### 2. API Key Exposure in Frontend Requests
**File:** `backend/services/aiChatService.mjs`  
**Location:** Line 157-158 (Gemini API call)  
**Vulnerability:** API key passed in URL query parameter  
**Code:**
```javascript
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
```
**Risk:** API keys in URLs can be logged by proxies, browsers, and third-party services. This exposes the Gemini API key to unauthorized access.
**Impact:** Unauthorized API usage, financial loss, potential data leakage.
**Fix:** Move API key to Authorization header or use server-side proxy.

## High Severity Findings (HIGH)

### 3. Insufficient Input Validation
**File:** `backend/routes/aiChatRoutes.mjs`  
**Location:** Line 96-97  
**Vulnerability:** No validation on `context` parameter beyond role check  
**Risk:** Potential injection of malicious context values that could affect AI prompt construction.
**Impact:** Prompt injection, AI manipulation, data leakage.
**Fix:** Implement strict validation using allowlists for context values.

### 4. JSON Parsing Without Validation
**File:** `backend/routes/exerciseRoutes.mjs`  
**Location:** Line 138-145  
**Vulnerability:** Direct `JSON.parse()` on database fields without validation  
**Code:**
```javascript
JSON.parse(exercise.primaryMuscles).forEach(muscle => muscleGroups.add(muscle));
```
**Risk:** If database is compromised or contains malicious data, this could lead to denial of service or prototype pollution attacks.
**Impact:** Server crashes, remote code execution (if combined with other vulnerabilities).
**Fix:** Use try-catch blocks and validate JSON structure before parsing.

### 5. Error Messages Expose Sensitive Information
**Files:** Multiple backend route files  
**Vulnerability:** Detailed error messages returned in development mode  
**Code Pattern:**
```javascript
error: process.env.NODE_ENV === 'development' ? error.message : undefined
```
**Risk:** Attackers can force errors to gain insights into system architecture, database structure, or business logic.
**Impact:** Information disclosure, reconnaissance for further attacks.
**Fix:** Use generic error messages in all environments; log detailed errors server-side only.

### 6. Missing Rate Limiting
**Files:** All backend routes  
**Vulnerability:** No rate limiting on API endpoints  
**Risk:** Denial of service attacks, API key exhaustion (for paid AI services), brute force attacks.
**Impact:** Service disruption, financial loss, account lockouts.
**Fix:** Implement rate limiting per user/IP on all endpoints.

## Medium Severity Findings (MEDIUM)

### 7. Insecure Direct Object References (IDOR)
**File:** `backend/routes/aiChatRoutes.mjs`  
**Location:** Multiple endpoints using `userId: req.user.id`  
**Vulnerability:** While user isolation exists, there's no validation that users can only access their own conversations in all endpoints.
**Risk:** Potential authorization bypass if middleware fails or is misconfigured.
**Impact:** Unauthorized access to other users' AI conversations.
**Fix:** Implement additional resource ownership checks in each route handler.

### 8. No Input Sanitization for AI Messages
**File:** `backend/routes/aiChatRoutes.mjs`  
**Location:** Line 109-110  
**Vulnerability:** User messages sent to AI providers without sanitization  
**Risk:** Prompt injection attacks, potentially leaking system prompts or manipulating AI behavior.
**Impact:** AI manipulation, data leakage, unauthorized actions.
**Fix:** Implement message sanitization and prompt injection detection.

### 9. Missing Content Security Policy (CSP)
**File:** Frontend components  
**Vulnerability:** No CSP headers implemented  
**Risk:** Cross-site scripting (XSS) attacks could execute malicious scripts.
**Impact:** Session hijacking, data theft, malicious actions on behalf of users.
**Fix:** Implement strict CSP headers for the React application.

### 10. Insecure CORS Configuration
**Files:** Backend routes (CORS configuration not shown)  
**Vulnerability:** Assuming overly permissive CORS settings  
**Risk:** Cross-origin attacks, CSRF vulnerabilities.
**Impact:** Data leakage, unauthorized actions.
**Fix:** Implement strict CORS policies with allowlisted origins only.

## Low Severity Findings (LOW)

### 11. Client-Side Storage of Sensitive Data
**File:** Frontend components (implied)  
**Vulnerability:** JWT tokens likely stored in localStorage  
**Risk:** XSS attacks could steal tokens from localStorage.
**Impact:** Account compromise.
**Fix:** Use httpOnly cookies for authentication tokens or secure storage mechanisms.

### 12. Missing Request Size Limits
**Files:** Backend routes accepting POST requests  
**Vulnerability:** No body size limits on express routes  
**Risk:** Denial of service via large request bodies.
**Impact:** Server resource exhaustion.
**Fix:** Implement body size limits using express middleware.

### 13. Information Disclosure in Logs
**Files:** Multiple backend files using `logger`  
**Vulnerability:** Potentially logging sensitive user data  
**Risk:** PII exposure in logs.
**Impact:** Privacy violations, regulatory compliance issues.
**Fix:** Implement structured logging with redaction of sensitive data.

### 14. Missing Security Headers
**Files:** Backend routes  
**Vulnerability:** Security headers not implemented (X-Frame-Options, X-Content-Type-Options, etc.)  
**Risk:** Clickjacking, MIME sniffing attacks.
**Impact:** User interface manipulation, content injection.
**Fix:** Implement comprehensive security headers.

## Recommendations by Priority

### Immediate Actions (CRITICAL/HIGH):
1. **Fix SQL injection vulnerability** in exerciseRoutes.mjs by removing raw SQL literals
2. **Move API keys from URL parameters** to Authorization headers
3. **Implement input validation schemas** using Zod or Joi for all user inputs
4. **Add rate limiting** to all API endpoints
5. **Sanitize JSON parsing** with validation and error handling

### Short-term Actions (MEDIUM):
1. **Implement Content Security Policy** headers
2. **Add request size limits** to Express middleware
3. **Enhance error handling** to prevent information disclosure
4. **Implement prompt injection detection** for AI messages
5. **Add CORS configuration** with strict origin allowlisting

### Long-term Actions (LOW):
1. **Review authentication token storage** strategy
2. **Implement security headers** (X-Frame-Options, etc.)
3. **Add security logging** with PII redaction
4. **Conduct penetration testing** for authorization bypasses
5. **Implement API versioning** with security improvements

## Overall Security Rating: **POOR**

The application exhibits multiple critical security flaws that require immediate attention. The most urgent issues are the SQL injection vulnerability and API key exposure. While some basic security measures are in place (authentication middleware, role-based access control), fundamental security practices like input validation, output encoding, and secure configuration are lacking or improperly implemented.

---

*Part of SwanStudios 7-Brain Validation System*
