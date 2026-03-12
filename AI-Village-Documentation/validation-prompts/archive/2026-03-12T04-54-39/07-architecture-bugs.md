# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 86.0s
> **Files:** AI-Village-Documentation/gemini-consults/latest.md, backend/controllers/authController.mjs, backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs, backend/models/GalleryPhoto.mjs, backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 9:54:39 PM

---

# SwanStudios Deep Code Review

## Executive Summary

This review identifies **CRITICAL** security vulnerabilities, architectural flaws, and production readiness issues that must be addressed before shipping. The authentication controller in particular has severe issues that would expose the system to attacks.

---

## 1. Bug Detection

### CRITICAL: Authentication Bypass via Disabled Rate Limiting

**File:** `backend/controllers/authController.mjs`  
**Line:** ~145-146

```javascript
// TODO: REVERT TO PRODUCTION VALUES BEFORE LAUNCH:
//   LOGIN_ATTEMPT_LIMIT = 10
//   LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000  (15 minutes)
// Currently disabled for Playwright E2E testing.
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 999999;
const LOGIN_ATTEMPT_WINDOW = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, 10) || 1 * 60 * 1000;
```

**What's Wrong:** The rate limiting is effectively disabled with a default of 999,999 attempts allowed. Combined with the 1-minute window, this allows ~16,650 login attempts per second. This completely defeats the purpose of rate limiting and exposes the system to brute-force attacks.

**Fix:**
```javascript
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 5;
const LOGIN_ATTEMPT_WINDOW = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, 10) || 15 * 60 * 1000;
```

---

### CRITICAL: Password Logging in Production

**File:** `backend/controllers/authController.mjs`  
**Line:** ~320

```javascript
console.log('Registration request body:', JSON.stringify(req.body, null, 2));
```

**What's Wrong:** Logs full request body including plaintext passwords. If this logs to a centralized logging system or stdout in production, passwords will be persisted in logs.

**Fix:** Remove or sanitize:
```javascript
logger.info('Processing new user registration', { 
  email: email?.substring(0, 3) + '***',
  hasPassword: !!password 
});
```

---

### CRITICAL: Authorization Token Logging

**File:** `backend/controllers/authController.mjs`  
**Line:** ~452

```javascript
console.log('Request headers:', JSON.stringify(req.headers, null, 2));
```

**What's Wrong:** Logs all request headers including `Authorization: Bearer <token>` tokens. This exposes valid JWT tokens in logs, allowing attackers to hijack sessions.

**Fix:** Remove entirely or log only safe headers:
```javascript
console.log('Request method:', req.method, 'path:', req.path);
```

---

### HIGH: Timing Attack in forgotPassword

**File:** `backend/controllers/authController.mjs`  
**Line:** ~860-865

```javascript
// Respond IMMEDIATELY — truly constant timing (no DB work before response)
res.status(200).json({
  success: true,
  message: 'If an account with that email exists, a password reset link has been sent.'
});
```

**What's Wrong:** While the immediate response is good for timing attack prevention, the implementation is incomplete. If the email doesn't exist, the user gets a success message. If the email exists but sending fails (e.g., SMTP down), the user also gets a success message but never receives the email. This creates confusion and makes debugging harder.

**Fix:** Add logging for email sending failures and consider a more nuanced response in development mode:
```javascript
// After setImmediate block, check if email sending failed
// and silently retry or log for admin attention
```

---

### HIGH: Race Condition in Token Refresh

**File:** `backend/controllers/authController.mjs`  
**Line:** ~620-640

```javascript
const decoded = jwt.verify(refreshToken, ...);
// ... 
const user = await User.findByPk(decoded.id);
// ...
const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);
```

**What's Wrong:** There's a time-of-check to time-of-use (TOCTOU) gap. If a user deletes their account between JWT verification and database lookup, the code will crash. More critically, if the refresh token is revoked (user logged out elsewhere) between these operations, the error handling may be inconsistent.

**Fix:** Add null checks and proper error handling:
```javascript
if (!user) {
  return res.status(401).json({
    success: false,
    message: 'User not found or account deleted'
  });
}

if (!user.refreshTokenHash) {
  return res.status(401).json({
    success: false,
    message: 'Session revoked. Please log in again.'
  });
}
```

---

### MEDIUM: Redundant Database Query in Auto-Follow

**File:** `backend/controllers/authController.mjs`  
**Line:** ~395-400

```javascript
// --- Best-effort: auto-follow admin so new users see content ---
try {
  const User = getUser();  // Already have User from earlier in function!
  const Friendship = sequelize.models.Friendship;
```

**What's Wrong:** The `User` model is already retrieved at line ~330. Calling `getUser()` again is redundant. Additionally, accessing `sequelize.models.Friendship` directly without checking if the model is loaded can throw if the model isn't properly imported.

**Fix:**
```javascript
try {
  // User is already available from earlier in this function
  const Friendship = sequelize.models.Friendship;
  if (!Friendship) {
    logger.warn('Friendship model not available for auto-follow');
    return;
  }
```

---

### MEDIUM: Inconsistent Password Regex Replacement

**File:** `backend/controllers/authController.mjs`  
**Line:** ~449

```javascript
console.log('LOGIN REQUEST BODY:', JSON.stringify(req.body, null, 2).replace(/"password":"[^"]+"/, '"password":"***"'));
```

**What's Wrong:** The regex `[^"]+` won't match if the password contains escaped quotes or if the JSON structure differs. It's a fragile attempt at sanitization that provides false confidence.

**Fix:** Use a proper sanitization function or don't log the body at all in production.

---

### LOW: Unused Variable in checkAndRecordAttempt

**File:** `backend/controllers/authController.mjs`  
**Line:** ~170-178

```javascript
const checkAndRecordAttempt = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];
  
  // Filter recent attempts and add current attempt in one operation
  const recentAttempts = attempts
    .filter(timestamp => now - timestamp < LOGIN_ATTEMPT_WINDOW)
    .concat(now);
  
  loginAttempts.set(identifier, recentAttempts);
  
  // Return if rate limited (excluding the current attempt)
  return recentAttempts.length > LOGIN_ATTEMPT_LIMIT;
};
```

**What's Wrong:** The comment says "excluding the current attempt" but the implementation includes it. This is actually correct (allows LIMIT attempts, blocks on LIMIT+1), but the comment is misleading.

**Fix:** Update comment to match behavior:
```javascript
// Return true if rate limited (current attempt included in count)
return recentAttempts.length > LOGIN_ATTEMPT_LIMIT;
```

---

## 2. Architecture Flaws

### CRITICAL: God Controller (900+ Lines)

**File:** `backend/controllers/authController.mjs`  
**Lines:** Entire file

**What's Wrong:** This single file handles:
- User registration
- Login/logout
- Token generation and refresh
- Profile management
- Password reset (forgot/reset/force-change)
- Rate limiting
- User validation

This violates the Single Responsibility Principle. At 900+ lines, it's impossible to test in isolation, difficult to maintain, and any change risks breaking unrelated functionality.

**Fix:** Split into separate modules:
```
backend/controllers/
├── authController.mjs        # Login, register, logout only
├── tokenController.mjs       # Token refresh, validation
├── profileController.mjs     # Profile CRUD
├── passwordController.mjs    # Forgot, reset, force-change
└── rateLimiter.mjs          # Extract rate limiting logic
```

---

### HIGH: Prop Drilling in Design Document (Reference)

**File:** `AI-Village-Documentation/gemini-consults/latest.md`  
**Section:** "Architecture Recommendations"

The design document recommends using "a robust context or Zustand store for the `UploadQueue`" but doesn't specify how to handle:
- Cross-tab synchronization
- Persistence across browser restarts
- Conflict resolution if same user has multiple tabs open

This is mentioned as an architecture gap that needs addressing in implementation.

---

### MEDIUM: Inconsistent Model Loading Pattern

**File:** `backend/controllers/authController.mjs`  
**Throughout**

The code uses `getUser()` lazy loading everywhere:
```javascript
const User = getUser(); // At line ~330, ~470, ~620, ~700, etc.
```

**What's Wrong:** 
1. Inconsistent - sometimes called multiple times in same function
2. No error handling if `getUser()` returns undefined
3. Repetitive boilerplate

**Fix:** Create a middleware or wrapper:
```javascript
const getUserModel = () => {
  const User = getUser();
  if (!User) throw new Error('User model not initialized');
  return User;
};
```

---

## 3. Integration Issues

### HIGH: Frontend-Backend Contract Mismatch Risk

**File:** `backend/controllers/authController.mjs`  
**Line:** ~460-465

```javascript
return res.status(200).json({
  success: true,
  forcePasswordChange: true,
  tempToken,
  message: 'Password change required before first use'
});
```

**What's Wrong:** The response includes `forcePasswordChange: true` but the standard login success response doesn't include this field. Frontend must know to check for this field's presence vs. value. Additionally, the `tempToken` uses a different expiry (15m) than standard tokens, which the frontend must handle specially.

**Fix:** Standardize the response shape or document the contract explicitly in an OpenAPI spec.

---

### MEDIUM: Missing Error Boundary for Async Operations

**File:** `backend/controllers/authController.mjs`  
**Line:** ~395-410 (auto-follow)

```javascript
try {
  // ... auto-follow logic
} catch (autoFollowErr) {
  logger.warn(`Auto-follow failed for new user ${user.id}: ${autoFollowErr.message}`);
}
```

**What's Wrong:** The auto-follow failure is silently caught, but there's no:
- Retry mechanism
- Dead letter queue
- Monitoring/alerting
- Distinction between "expected" failures (Friendship model missing) vs "unexpected" failures (database down)

**Fix:** Add failure categorization:
```javascript
} catch (autoFollowErr) {
  const isExpected = ['Friendship' , 'autoFollowErr.message'].some(e => autoFollowErr.message.includes(e));
  if (!isExpected) {
    logger.error(`Auto-follow failed for new user ${user.id}`, { error: autoFollowErr });
    // Trigger alert
  }
}
```

---

## 4. Dead Code & Tech Debt

### MEDIUM: Commented-Out Production Values

**File:** `backend/controllers/authController.mjs`  
**Line:** ~141-144

```javascript
// TODO: REVERT TO PRODUCTION VALUES BEFORE LAUNCH:
//   LOGIN_ATTEMPT_LIMIT = 10
//   LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000  (15 minutes)
// Currently disabled for Playwright E2E testing.
```

**What's Wrong:** This TODO has been sitting here since development. It should either:
1. Be implemented via environment variables (which it partially is)
2. Be removed with a comment explaining the current behavior
3. Be moved to a config file with clear "development only" warnings

**Fix:** Remove the TODO and ensure environment variables are properly documented:
```javascript
// Rate limiting: 5 attempts per 15 minutes (configurable via env)
// Lower values for production recommended
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 5;
```

---

### LOW: Unused Export

**File:** `backend/controllers/authController.mjs`  
**Line:** ~820-830

```javascript
// Export the original controller function for backward compatibility
export const authController = async (req, res) => {
  try {
    logger.info('Processing request', { path: req.path, method: req.method

---

*Part of SwanStudios 7-Brain Validation System*
