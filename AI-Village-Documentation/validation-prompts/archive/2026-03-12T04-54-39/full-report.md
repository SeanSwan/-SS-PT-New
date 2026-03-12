# SwanStudios Validation Report

> Generated: 3/11/2026, 9:54:39 PM
> Files reviewed: 5
> Validators: 8 succeeded, 0 errored
> Cost: $0.0923
> Duration: 210.1s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `AI-Village-Documentation/gemini-consults/latest.md`
- `backend/controllers/authController.mjs`
- `backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs`
- `backend/models/GalleryPhoto.mjs`
- `backend/routes/adminGalleryRoutes.mjs`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 18,230 / 3,450 | 17.3s | PASS |
| 2 | Code Quality | anthropic/claude-4.5-sonnet-20250929 | 17,817 / 4,096 | 49.5s | PASS |
| 3 | Security | deepseek/deepseek-v3.2-20251201 | 17,929 / 2,287 | 70.7s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 18,261 / 1,315 | 10.4s | PASS |
| 5 | Competitive Intelligence | minimax/minimax-m2.1 | 15,067 / 3,318 | 74.3s | PASS |
| 6 | User Research & Persona Alignment | deepseek/deepseek-v3.2-20251201 | 17,992 / 2,216 | 152.3s | PASS |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.5-20260211 | 15,359 / 4,096 | 86.0s | PASS |
| 8 | Frontend UI/UX Expert | google/gemini-3.1-pro-preview | 22,403 / 3,168 | 47.5s | PASS |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 17.3s

Here's a comprehensive UX and accessibility audit of the provided code, focusing on WCAG 2.1 AA compliance, mobile UX, design consistency, user flow friction, and loading states.

---

## AI-Village-Documentation/gemini-consults/latest.md

This document outlines design directives for a new upload queue system. While it's not code, it contains critical design specifications that directly impact UX and accessibility.

### WCAG 2.1 AA Compliance

*   **Finding:** The document explicitly mentions `aria-live="polite"` for screen reader announcements of upload progress.
    *   **Rating:** LOW (Positive finding, but implementation needs to be verified in actual code)
    *   **Recommendation:** Ensure this is implemented correctly in the frontend, providing clear and concise announcements without being overly verbose or disruptive.
*   **Finding:** Color contrast is not explicitly mentioned for text on backgrounds, especially for the "Galaxy Core" background and various colored states (Swan Cyan, Cosmic Purple, Neon Mint, Neon Rose).
    *   **Rating:** MEDIUM
    *   **Recommendation:** The design directives specify `rgba(10, 10, 26, 0.75)` for the background and `rgba(255, 255, 255, 0.6)` for status text. This needs to be checked against WCAG 2.1 AA contrast ratios (at least 4.5:1 for normal text, 3:1 for large text). The various color states for success/error also need to meet contrast requirements against their background.
*   **Finding:** Keyboard navigation and focus management are not explicitly addressed for the floating widget or its interactive elements.
    *   **Rating:** MEDIUM
    *   **Recommendation:** Ensure all interactive elements within the upload widget (toggle, retry buttons, collapse/expand buttons) are keyboard navigable and have clear focus indicators. The floating widget itself should not trap focus.

### Mobile UX

*   **Finding:** The document specifies `height: 44px;` for the "RAW vs HQ JPEG Toggle" (Segmented Control), meeting the minimum touch target size.
    *   **Rating:** LOW (Positive finding, but implementation needs to be verified in actual code)
    *   **Recommendation:** Ensure all other interactive elements within the widget (e.g., close button, retry buttons, individual queue item actions) also meet the 44px minimum touch target size.
*   **Finding:** Responsive breakpoints are defined for the upload widget (`Desktop (1024px+): width: 380px; max-height: 600px;` and `Mobile (320px - 768px): width: 100%; border-radius: 24px 24px 0 0;`). It also mentions a collapsed "Mini Progress" state for mobile.
    *   **Rating:** LOW (Positive finding, but implementation needs to be verified in actual code)
    *   **Recommendation:** Verify the transition between desktop and mobile states is smooth and that the "Mini Progress" state provides sufficient information without being overwhelming. Ensure the bottom sheet on mobile doesn't obscure critical content.
*   **Finding:** Gesture support is not mentioned.
    *   **Rating:** LOW
    *   **Recommendation:** Consider if gestures like swipe-to-dismiss for individual queue items or pull-to-refresh for the queue list (if applicable) would enhance the mobile experience.

### Design Consistency

*   **Finding:** The document provides explicit color tokens (e.g., `Galaxy Core with opacity`, `Swan Cyan`, `Cosmic Purple`, `Neon Mint`, `Neon Rose`) and styling directives (glassmorphism, border-radius, font sizes). This promotes strong design consistency.
    *   **Rating:** LOW (Positive finding, but adherence needs to be verified in actual code)
    *   **Recommendation:** Ensure these exact tokens and styles are used throughout the frontend implementation and that no hardcoded values deviate from these specifications.
*   **Finding:** Specific gradients are defined for the active pill in the segmented control and for the processing animation.
    *   **Rating:** LOW (Positive finding)
    *   **Recommendation:** Ensure these gradients are implemented precisely as specified.

### User Flow Friction

*   **Finding:** The plan addresses a critical user flow friction point by proposing a "global, non-blocking floating widget" for uploads, allowing users to navigate away. This is a significant improvement over a blocking spinner.
    *   **Rating:** LOW (Positive finding, addresses a critical friction point)
    *   **Recommendation:** Ensure the widget's visibility and behavior are intuitive. How does the user open/close it? How is it indicated when it's minimized?
*   **Finding:** Granular state granularity (`Queued, Uploading, Processing, Success, Error`) and specific error recovery (retry on individual files) are excellent for user feedback and control.
    *   **Rating:** LOW (Positive finding)
    *   **Recommendation:** Ensure the visual representation of these states is clear and distinct, and that the retry mechanism is easily discoverable and functional.
*   **Finding:** The "24h JWT" rejection in favor of "Silent Token Refresh" is a good UX decision, preventing disruptive re-logins during long operations.
    *   **Rating:** LOW (Positive finding)
    *   **Recommendation:** Ensure the silent refresh mechanism is robust and handles network issues gracefully without user intervention.

### Loading States

*   **Finding:** The document describes a "Processing Animation" for the progress bar that transitions to an "infinite cosmic pulse" for server-side work. This acts as a specific loading state.
    *   **Rating:** LOW (Positive finding, provides a custom loading state)
    *   **Recommendation:** Ensure this animation is smooth, non-distracting, and clearly communicates that work is ongoing.
*   **Finding:** Skeleton screens or empty states for the upload queue itself (when no files are being uploaded) are not explicitly mentioned.
    *   **Rating:** MEDIUM
    *   **Recommendation:** When the upload queue is empty, consider a clear empty state message (e.g., "No active uploads. Drag and drop files here to start.") to guide the user.

---

## backend/controllers/authController.mjs

This file is backend logic, so direct UX/accessibility concerns are minimal. However, its behavior can indirectly impact user experience.

### WCAG 2.1 AA Compliance

*   **Finding:** No direct WCAG concerns as this is backend code.
    *   **Rating:** N/A

### Mobile UX

*   **Finding:** No direct mobile UX concerns as this is backend code.
    *   **Rating:** N/A

### Design Consistency

*   **Finding:** No direct design consistency concerns as this is backend code.
    *   **Rating:** N/A

### User Flow Friction

*   **Finding:** The `forgotPassword` endpoint immediately responds with a success message, then processes the email sending in the background. This is excellent for preventing timing attacks and providing immediate feedback to the user, reducing perceived friction.
    *   **Rating:** LOW (Positive finding)
    *   **Recommendation:** Ensure the frontend handles this immediate success message gracefully, without implying the email has *already* been sent, but rather that the request was received.
*   **Finding:** The `LOGIN_ATTEMPT_LIMIT` is currently set to `999999` for Playwright E2E testing. While understandable for testing, this is a **CRITICAL** security and user flow friction issue in production.
    *   **Rating:** CRITICAL
    *   **Recommendation:** **IMMEDIATELY REVERT** `LOGIN_ATTEMPT_LIMIT` and `LOGIN_ATTEMPT_WINDOW` to production values (e.g., 5 attempts per 15 minutes) before deployment. Unlimited login attempts are a severe security vulnerability and can lead to brute-force attacks, causing significant user friction through account compromise.
*   **Finding:** The `forcePasswordChange` mechanism is a good security practice but introduces an extra step in the login flow.
    *   **Rating:** LOW
    *   **Recommendation:** Ensure the frontend clearly communicates *why* a password change is required and guides the user through the process seamlessly.
*   **Finding:** The `refreshToken` endpoint handles token reuse attacks by revoking all refresh tokens for a user. This is a good security measure but can cause user friction if a legitimate user's token is compromised.
    *   **Rating:** LOW
    *   **Recommendation:** Consider adding a notification mechanism (e.g., email) to alert users if their refresh token has been revoked due to suspicious activity, allowing them to take action.
*   **Finding:** Password strength validation is implemented, which is good for security but can be a source of friction if the requirements are too strict or not clearly communicated.
    *   **Rating:** LOW
    *   **Recommendation:** Ensure the frontend clearly displays the password requirements during registration and password changes, providing real-time feedback as the user types.

### Loading States

*   **Finding:** No direct loading state concerns as this is backend code. The `forgotPassword` endpoint's immediate response is a form of "optimistic UI" which is good.
    *   **Rating:** N/A

---

## backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs

This is a database migration file. It has no direct UX or accessibility implications.

### WCAG 2.1 AA Compliance

*   **Finding:** N/A
    *   **Rating:** N/A

### Mobile UX

*   **Finding:** N/A
    *   **Rating:** N/A

### Design Consistency

*   **Finding:** N/A
    *   **Rating:** N/A

### User Flow Friction

*   **Finding:** N/A
    *   **Rating:** N/A

### Loading States

*   **Finding:** N/A
    *   **Rating:** N/A

---

## backend/models/GalleryPhoto.mjs

This is a Sequelize model definition. It has no direct UX or accessibility implications, but the `sourceType` field is relevant to the design directives.

### WCAG 2.1 AA Compliance

*   **Finding:** N/A
    *   **Rating:** N/A

### Mobile UX

*   **Finding:** N/A
    *   **Rating:** N/A

### Design Consistency

*   **Finding:** The `sourceType` field (`raw | jpeg`) directly supports the "RAW vs HQ JPEG Toggle" and "Photo Type Badges" described in the design document. This is good for enabling consistent UI based on data.
    *   **Rating:** LOW (Positive finding, supports design consistency)
    *   **Recommendation:** Ensure the values stored in `sourceType` (e.g., 'raw', 'jpeg') are consistently used and mapped to the correct visual representations in the frontend.

### User Flow Friction

*   **Finding:** N/A
    *   **Rating:** N/A

### Loading States

*   **Finding:** N/A
    *   **Rating:** N/A

---

## backend/routes/adminGalleryRoutes.mjs

This is a route definition file. The truncated nature of the provided code limits a full review, but based on the comments, it's for admin-only functionality.

### WCAG 2.1 AA Compliance

*   **Finding:** No direct WCAG concerns as this is backend code.
    *   **Rating:** N/A

### Mobile UX

*   **Finding:** No direct mobile UX concerns as this is backend code.
    *   **Rating:** N/A

### Design Consistency

*   **Finding:** No direct design consistency concerns as this is backend code.
    *   **Rating:** N/A

### User Flow Friction

*   **Finding:** The comment "All routes require authentication + admin role" indicates proper access control, which is good for security.
    *   **Rating:** LOW (Positive finding)
    *   **Recommendation:** Ensure the frontend provides clear feedback if a non-admin user attempts to access these routes (e.g., "Access Denied" message, not just a broken page).

### Loading States

*   **Finding:** No direct loading state concerns as this is backend code.
    *   **Rating:** N/A

---

## Summary of Key Findings & Recommendations

**CRITICAL:**

*   **backend/controllers/authController.mjs:** The `LOGIN_ATTEMPT_LIMIT` is set to `999999` for testing. This *must* be reverted to a low production value (e.g., 5 attempts) before deployment to prevent brute-force attacks.

**HIGH:**

*   **AI-Village-Documentation/gemini-consults/latest.md:** Color contrast for text on backgrounds (especially status text on glassmorphism background and various colored states) needs to be rigorously checked against WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text). This is a common failure point in dark themes with subtle colors.

**MEDIUM:**

*   **AI-Village-Documentation/gemini-consults/latest.md:** Keyboard navigation and focus management for the floating upload widget and its interactive elements are not explicitly addressed. This needs to be a core part of the frontend implementation.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Skeleton screens or clear empty states for the upload queue itself (when no files are active) are not mentioned.

**LOW (Positive Findings or Minor Recommendations):**

*   **AI-Village-Documentation/gemini-consults/latest.md:** Explicit mention of `aria-live="polite"` is good, but implementation needs verification.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Defined `44px` touch target for the toggle is good, but ensure all other interactive elements also meet this.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Responsive breakpoints and a collapsed "Mini Progress" state for mobile are good, but verify smooth transitions and sufficient information.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Strong design consistency directives with explicit color tokens and styles are positive, but adherence in code needs verification.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Non-blocking global widget, granular states, and individual file retry are excellent for user flow.
*   **AI-Village-Documentation/gemini-consults/latest.md:** Custom "cosmic pulse" processing animation is a good loading state.
*   **backend/controllers/authController.mjs:** Immediate response for `forgotPassword` is good for UX and security.
*   **backend/controllers/authController.mjs:** `forcePasswordChange` and `refreshToken` revocation are good security features, but frontend communication and user alerts should be considered.
*   **backend/controllers/authController.mjs:** Password strength validation is good, but clear frontend feedback is essential.
*   **backend/models/GalleryPhoto.mjs:** `sourceType` field directly supports frontend design, ensuring data consistency.
*   **backend/routes/adminGalleryRoutes.mjs:** Admin-only access control is good, but clear frontend feedback for unauthorized access is needed.

This audit highlights that the design plan is well-thought-out from a UX perspective, particularly in addressing the challenging upload flow. The main areas for concern are ensuring the detailed implementation adheres to WCAG standards (especially color contrast and keyboard accessibility) and immediately addressing the critical security flaw in the authentication controller's rate limiting.

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.5s

# Code Review: SwanStudios Personal Training SaaS Platform

## Executive Summary
This review covers authentication controller, database migrations, models, and documentation for a personal training SaaS platform. The codebase shows good documentation practices but has several critical TypeScript/typing issues, security concerns, and performance anti-patterns.

---

## 1. TypeScript & Type Safety Issues

### ❌ CRITICAL: Missing TypeScript Entirely
**Location:** All `.mjs` files  
**Issue:** Entire backend is JavaScript (`.mjs`), not TypeScript (`.ts`). No type safety whatsoever.

```javascript
// Current (authController.mjs)
export const register = async (req, res) => {
  const { firstName, lastName, email } = req.body; // No types!
```

**Should be:**
```typescript
// authController.ts
interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role?: 'admin' | 'trainer' | 'client';
  adminCode?: string;
}

export const register = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response
): Promise<void> => {
  // ...
}
```

**Impact:** No compile-time safety, runtime errors inevitable, refactoring dangerous.

---

### ❌ CRITICAL: Implicit `any` Types Throughout
**Location:** `authController.mjs` (all functions)

```javascript
// Lines 450-500+ - No parameter types
const sanitizeUser = (user) => { // user is 'any'
  const sanitized = { /* ... */ };
  return sanitized; // Return type unknown
};
```

**Fix:**
```typescript
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'trainer' | 'client';
  password?: string; // Should be excluded
  // ... other fields
}

type SanitizedUser = Omit<User, 'password' | 'refreshTokenHash'>;

const sanitizeUser = (user: User): SanitizedUser => {
  // TypeScript ensures we don't leak sensitive fields
};
```

---

### 🔴 HIGH: No Discriminated Unions for API Responses
**Location:** All controller responses

```javascript
// Current - inconsistent response shapes
res.status(200).json({ success: true, user, token });
res.status(401).json({ success: false, message: 'Invalid' });
res.status(500).json({ success: false, message: 'Error', error: err });
```

**Should use discriminated union:**
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// Usage
const response: ApiResponse<{ user: SanitizedUser; token: string }> = {
  success: true,
  data: { user: sanitizedUser, token: accessToken }
};
```

---

## 2. Security Issues

### ❌ CRITICAL: Password Reset Token Timing Attack
**Location:** `authController.mjs:1450-1480` (`forgotPassword`)

```javascript
// Line 1450 - Responds BEFORE checking if user exists
res.status(200).json({
  success: true,
  message: 'If an account with that email exists...'
});

// Then does DB lookup in background
setImmediate(async () => {
  const user = await User.findOne({ where: { email } });
  // ...
});
```

**Issue:** While the response timing is constant, the **background work duration** can still be measured via side channels (server load, network timing). An attacker can send 1000 requests and measure which ones trigger DB queries.

**Fix:**
```typescript
export const forgotPassword = async (req, res) => {
  const startTime = Date.now();
  const CONSTANT_DELAY = 200; // ms
  
  try {
    const user = await User.findOne({ where: { email } });
    
    if (user) {
      // Generate token, send email
    }
    
    // Always wait until CONSTANT_DELAY has passed
    const elapsed = Date.now() - startTime;
    if (elapsed < CONSTANT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, CONSTANT_DELAY - elapsed));
    }
    
    res.status(200).json({ success: true, message: '...' });
  } catch (err) {
    // Still wait the full delay on error
    const elapsed = Date.now() - startTime;
    if (elapsed < CONSTANT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, CONSTANT_DELAY - elapsed));
    }
    res.status(200).json({ success: true, message: '...' });
  }
};
```

---

### 🔴 HIGH: JWT Secret Fallback is Dangerous
**Location:** `authController.mjs:150, 1520`

```javascript
// Line 150
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;

// Line 1520
jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
```

**Issue:** If `JWT_REFRESH_SECRET` is not set, refresh tokens use the same secret as access tokens, defeating the purpose of token separation.

**Fix:**
```typescript
// config/secrets.ts
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const RESET_SECRET = process.env.PASSWORD_RESET_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET || !RESET_SECRET) {
  throw new Error('CRITICAL: Missing required JWT secrets in environment');
}

export { JWT_SECRET, JWT_REFRESH_SECRET, RESET_SECRET };
```

---

### 🔴 HIGH: Rate Limiting Disabled for Testing
**Location:** `authController.mjs:145-148`

```javascript
// TODO: REVERT TO PRODUCTION VALUES BEFORE LAUNCH:
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 999999;
const LOGIN_ATTEMPT_WINDOW = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, 10) || 1 * 60 * 1000;
```

**Issue:** Massive security hole if deployed to production. No CI/CD check to prevent this.

**Fix:**
```typescript
// Add environment-based validation
const LOGIN_ATTEMPT_LIMIT = (() => {
  const limit = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10);
  
  if (process.env.NODE_ENV === 'production' && (!limit || limit > 20)) {
    throw new Error('CRITICAL: LOGIN_ATTEMPT_LIMIT must be set to ≤20 in production');
  }
  
  return limit || (process.env.NODE_ENV === 'production' ? 10 : 999999);
})();
```

---

### 🟡 MEDIUM: Weak Password Validation
**Location:** `authController.mjs:270-295`

```javascript
const validatePasswordStrength = (password) => {
  if (password.length < 8) return { success: false };
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  
  if (!(hasUppercase && hasLowercase && hasNumbers)) {
    return { success: false, message: '...' };
  }
  
  // Special char check is NOT enforced (just a warning)
  if (!hasSpecialChars) {
    return { success: false, message: 'Password should include...' }; // ❌ Returns false but message says "should"
  }
  
  return { success: true };
};
```

**Issue:** Inconsistent - special chars are "required" (returns `false`) but message says "should" (optional).

**Fix:**
```typescript
interface PasswordValidation {
  success: boolean;
  message?: string;
  warnings?: string[];
}

const validatePasswordStrength = (password: string): PasswordValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must include uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must include lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must include number');
  
  // Optional but recommended
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    warnings.push('Consider adding special characters for better security');
  }
  
  return {
    success: errors.length === 0,
    message: errors.join(', '),
    warnings
  };
};
```

---

## 3. Error Handling Issues

### 🔴 HIGH: Inconsistent Error Response Shapes
**Location:** Throughout `authController.mjs`

```javascript
// Line 400
return res.status(400).json({ success: false, message: 'Missing fields' });

// Line 450
return res.status(409).json({ success: false, message: 'User exists' });

// Line 500
return res.status(500).json({ 
  success: false, 
  message: 'Error',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined 
});

// Line 600
return res.status(400).json({
  success: false,
  message: 'Validation error',
  errors: error.errors.map(e => ({ field: e.path, message: e.message }))
});
```

**Issue:** 4 different error shapes - clients can't handle errors consistently.

**Fix:**
```typescript
interface ApiError {
  success: false;
  error: {
    code: string; // Machine-readable: 'MISSING_FIELDS', 'USER_EXISTS'
    message: string; // Human-readable
    field?: string; // For validation errors
    details?: unknown; // Dev-only stack traces
  };
}

const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  options?: { field?: string; details?: unknown }
): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...options,
      details: process.env.NODE_ENV === 'development' ? options?.details : undefined
    }
  });
};

// Usage
return sendError(res, 400, 'MISSING_FIELDS', 'Please provide all required fields');
```

---

### 🟡 MEDIUM: No Error Boundary for Async Operations
**Location:** `authController.mjs:350-450` (`register` function)

```javascript
export const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // 100+ lines of logic
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    // Error handling
  }
};
```

**Issue:** If `transaction.commit()` throws, rollback never happens. If `transaction.rollback()` throws, error is swallowed.

**Fix:**
```typescript
export const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Business logic
    await transaction.commit();
    
    res.status(201).json({ /* success */ });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error('CRITICAL: Transaction rollback failed', { 
        originalError: error, 
        rollbackError 
      });
    }
    
    // Send error response
  }
};
```

---

## 4. Performance Anti-Patterns

### 🔴 HIGH: N+1 Query in User Lookup
**Location:** `authController.mjs:650` (`login` function)

```javascript
const user = await User.findOne({ 
  where: { 
    [Op.or]: [{ username }, { email: username }] 
  }
});

// Later, if user has associations (not shown in this file but likely):
// await user.getProfile(); // Separate query
// await user.getPermissions(); // Separate query
```

**Fix:**
```typescript
const user = await User.findOne({
  where: { [Op.or]: [{ username }, { email: username }] },
  include: [
    { model: Profile, as: 'profile' },
    { model: Permission, as: 'permissions' }
  ]
});
```

---

### 🟡 MEDIUM: Inefficient Rate Limiting Cleanup
**Location:** `authController.mjs:240-250`

```javascript
const checkAndRecordAttempt = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];
  
  // Filters EVERY time - O(n) for every login attempt
  const recentAttempts = attempts
    .filter(timestamp => now - timestamp < LOGIN_ATTEMPT_WINDOW)
    .concat(now);
  
  loginAttempts.set(identifier, recentAttempts);
  return recentAttempts.length > LOGIN_ATTEMPT_LIMIT;
};
```

**Issue:** No cleanup of old entries. Map grows unbounded. Filtering on every request is wasteful.

**Fix:**
```typescript
// Periodic cleanup (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, attempts] of loginAttempts.entries()) {
    const recent = attempts.filter(t => now - t < LOGIN_ATTEMPT_WINDOW);
    if (recent.length === 0) {
      loginAttempts.delete(key);
    } else {
      loginAttempts.set(key, recent);
    }
  }
}, 5 * 60 * 1000);

// Optimized check (only filter if needed)
const checkAndRecordAttempt = (identifier: string): boolean => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];
  
  // Only filter if we're near the limit
  const recentAttempts = attempts.length > LOGIN_ATTEMPT_LIMIT * 0.8
    ? attempts.filter(t => now - t < LOGIN_ATTEMPT_WINDOW)
    : attempts;
  
  recentAttempts.push(now);
  loginAttempts.set(identifier, recentAttempts);
  
  return recentAttempts.length > LOGIN_ATTEMPT_LIMIT;
};
```

---

### 🟡 MEDIUM: Unnecessary bcrypt Hashing on Every Refresh
**Location:** `authController.mjs:850-900` (`refreshToken`)

```javascript
// Generate new tokens
const newAccessToken = generateAccessToken(user.id, user.role);
const newRefreshToken = generateRefreshToken(user.id);

// Hash EVERY time (100ms+ operation)
await user.update({
  refreshTokenHash: await bcrypt.hash(newRefreshToken, 10),
  lastActive: new Date()
});
```

**Issue:** Refresh tokens are rotated on every use. bcrypt hashing adds 100ms+ to every refresh request.

**Fix (Option 1 - Reduce rounds):**
```typescript
// Use 8 rounds instead of 10 for refresh tokens (still secure, 4x faster)
refreshTokenHash: await bcrypt.hash(newRefreshToken, 8)
```

**Fix (Option 2 - Token rotation policy):**
```typescript
// Only rotate refresh token if it's >50% expired
const decoded = jwt.decode(refreshToken);
const halfLife = (decoded.exp - decoded.iat) / 2;
const age = Date.now() / 1000 - decoded.iat;

if (age > halfLife) {
  // Generate new refresh token
} else {
  //

---

## [PASS] Security
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 70.7s

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

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.4s

This review focuses on the **SwanStudios** backend and architectural plan, specifically addressing the transition to RAW photo handling and the existing authentication logic.

### 1. Database & Query Efficiency
*   **Missing Index on `source_type`** | **MEDIUM**
    *   **Finding:** The migration adds `source_type` to `gallery_photos`, and the model reflects this, but no index is created.
    *   **Impact:** As the gallery grows, filtering for "RAW" vs "JPEG" photos (as suggested in the UI directives) will trigger full table scans.
    *   **Recommendation:** Add an index to `source_type` in a follow-up migration.
*   **Unbounded `User.findOne` in `forgotPassword`** | **LOW**
    *   **Finding:** The query uses `sequelize.fn('LOWER', ...)` on the email column.
    *   **Impact:** Functional indexes are required for this to be performant in PostgreSQL. Without a specific expression index on `LOWER(email)`, this query bypasses the standard unique index on `email`.
    *   **Recommendation:** Use a standard case-insensitive collation or ensure an expression index exists.

### 2. Network & Memory Efficiency
*   **OOM Risk: Multer Memory Storage (Critical Context)** | **CRITICAL**
    *   **Finding:** The documentation notes that 120MB RAW files cause OOM crashes on Render (512MB RAM).
    *   **Impact:** Even with a reduced batch size, `multer`'s default memory storage buffers the entire file into RAM before processing. Two concurrent 120MB uploads + Node.js overhead + Sharp processing will exceed 512MB instantly.
    *   **Recommendation:** Switch `multer` to `diskStorage` immediately or implement the suggested **tus** protocol (chunked uploads) to stream data directly to disk/S3, bypassing memory buffering.
*   **N+1 Risk in Gallery Associations** | **MEDIUM**
    *   **Finding:** `GalleryPhoto.associate` defines `hasMany` enhancement requests.
    *   **Impact:** If the admin dashboard lists photos and then queries requests per photo in a loop, it will trigger N+1 queries.
    *   **Recommendation:** Ensure `adminGalleryRoutes.mjs` (truncated in snippet) uses `include: [{ model: EnhancementRequest }]` with proper limit/offset.

### 3. Scalability Concerns
*   **In-Memory Rate Limiting (`loginAttempts`)** | **HIGH**
    *   **Finding:** `authController.mjs` uses `const loginAttempts = new Map();`.
    *   **Impact:** This state is local to the instance. If SwanStudios scales to 2+ instances on Render, a brute-force attack can rotate through instances to reset their attempt count. Additionally, a restart clears all blocks.
    *   **Recommendation:** Migrate `loginAttempts` to Redis as noted in the code's TODO.
*   **In-Memory Upload Queue State** | **MEDIUM**
    *   **Finding:** The plan suggests a `GlobalUploadManager` in React context.
    *   **Impact:** If the user refreshes the browser, the upload state is lost unless persisted.
    *   **Recommendation:** Use `localStorage` or `IndexedDB` to persist the `UploadQueue` metadata so the UI can resume tracking after a crash or refresh.

### 4. Security & Logic
*   **JWT Secret Fallback** | **HIGH**
    *   **Finding:** `generateRefreshToken` uses `process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET`.
    *   **Impact:** If the refresh secret isn't set, the access and refresh tokens use the same key. If an access token is compromised, the attacker has the key to forge refresh tokens.
    *   **Recommendation:** Force a unique `JWT_REFRESH_SECRET` and throw an error during startup if it is missing.
*   **Bcrypt Blocking the Event Loop** | **MEDIUM**
    *   **Finding:** `bcrypt.hash(refreshToken, 10)` is called inside the login/refresh flow.
    *   **Impact:** While `bcryptjs` is asynchronous, it is CPU intensive. High login volume can lead to event loop lag.
    *   **Recommendation:** This is acceptable for current scale, but monitor "Event Loop Delay" metrics as the user base grows.

### 5. Performance & Bundle Size (Frontend Plan)
*   **Framer Motion Layout Animations** | **LOW**
    *   **Finding:** The plan specifies `layout` changes for reordering 40+ items.
    *   **Impact:** `layout` prop in Framer Motion triggers heavy calculations (getBoundingClientRect) on every frame for every sibling in the list.
    *   **Recommendation:** Use `React Window` or `TanStack Virtual` if the gallery upload queue exceeds 50 items to keep the DOM lean.
*   **Glassmorphism Performance** | **LOW**
    *   **Finding:** `backdrop-filter: blur(24px)` on a floating widget.
    *   **Impact:** High GPU usage on mobile devices, especially during concurrent CSS animations (the "Cosmic Pulse").
    *   **Recommendation:** Use `will-change: transform` on the progress bar and consider disabling blur on low-power devices via media queries.

### Summary Rating Table

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Multer Memory Storage OOM** | **CRITICAL** | Memory / Scalability |
| **In-Memory Rate Limiting** | **HIGH** | Scalability / Security |
| **JWT Secret Fallback** | **HIGH** | Security |
| **Missing Index on `source_type`** | **MEDIUM** | DB Efficiency |
| **In-Memory Upload State** | **MEDIUM** | UX / Scalability |
| **Bcrypt Event Loop Lag** | **MEDIUM** | Render Performance |

---

## [PASS] Competitive Intelligence
**Model:** minimax/minimax-m2.1 | **Duration:** 74.3s

Based on the code review of the SwanStudios backend, frontend documentation (Gemini Consult), and database models, here is a structured strategic analysis.

### Strategic Overview
SwanStudios is positioning itself as a **Premium, Aesthetic-Driven Fitness Platform** with a heavy emphasis on visual transformation (gallery/high-res RAW photos) and AI-driven personalization. Unlike generic competitors (Trainerize, TrueCoach) that focus on utilitarian workout logging, SwanStudios targets the high-end "influencer trainer" or "premium results-based" market segment.

---

### 1. Feature Gap Analysis

While the provided code focuses heavily on Authentication and the Media Gallery (the "Proof" of fitness), competitors like **Trainerize** and **TrueCoach** dominate the "Process" (workouts/nutrition).

| Competitor Feature | Gap in SwanStudios (Based on Code) | Opportunity |
| :--- | :--- | :--- |
| **Native Nutrition Tracking** | The `authController` captures `fitnessGoal` and `trainingExperience`, but there is no visible nutrition logging, macro calculation, or meal photo API in the provided routes. | Add a "Nutrition API" or integration with nutrition databases (e.g., Nutritionix). |
| **In-App Video Coaching** | No evidence of WebRTC or video streaming infrastructure. Competitors allow trainers to send "Check out this form" videos. | The Gallery is currently for *photos*. Extend the `sourceType` to include `video/mp4` and build a video messaging module. |
| **Habit & Mood Tracking** | Competitors track streaks and daily check-ins. | The `GalleryPhoto` model has a `metadata` JSON field. This could be leveraged to store daily "Mood/Soreness" logs alongside transformation photos. |
| **Client Progress Charts** | The backend handles user data, but no specific "Metrics" endpoints (weight over time, PRs) are visible in this slice. | Visualizing the "Pain-Aware" or "NASM AI" data via charts is a must-have for the "Results" market. |

---

### 2. Differentiation Strengths

The code reveals specific architectural decisions that create a moat against generic SaaS competitors.

*   **The "Cosmic" High-Fidelity UX**: The Gemini documentation (`latest.md`) explicitly dictates a premium, non-blocking "Command Center" UI for uploads. This is a massive differentiator. Competitors use standard HTML forms; SwanStudios uses a **Global Floating Widget**, **Framer Motion animations**, and **Glassmorphism**. This appeals to users who value aesthetics as much as function.
*   **Pro-Grade Media Pipeline**: The support for **RAW files** (`sourceType: 'raw'`) and the planned implementation of **tus** (chunked uploads) and **Sharp** (server-side processing) positions SwanStudios for professional photographers and studios, not just gym goers. This is a "High-Ticket" feature.
*   **Security & Polish**: The `authController` is robust, featuring:
    *   **Silent Token Refresh**: (Mentioned in the plan, implied in architecture) preventing logged-out UX breaks during long uploads.
    *   **RBAC (Role-Based Access Control)**: Explicit `adminCode` verification for registration prevents unauthorized admin access.
*   **AI-Ready Architecture**: The `GalleryPhoto` model includes `enhancedStorageKey`, `enhancedUrl`, and `metadata`. This schema is explicitly designed for AI inference (e.g., generating "Perfect Form" overlays or background removal) without cluttering the original file.

---

### 3. Monetization Opportunities

The current architecture supports several high-value revenue streams.

1.  **AI Enhancement Credits**:
    *   **Model**: `enhancementRequestCount` exists in the DB.
    *   **Strategy**: Allow X free enhancements per month (e.g., "Swan Glow" filter or background removal). Charge per "Enhance" click beyond that. This converts the compute cost (Sharp/AI) directly to revenue.
2.  **Storage Tiering**:
    *   **Model**: RAW files are huge (120MB). JPEG are small.
    *   **Strategy**: Offer a "Pro Photographer" plan that includes **RAW file storage & delivery**. Standard plans convert to JPEG server-side (saving bandwidth) but lose the professional quality.
3.  **White-Label / Agency Model**:
    *   **Code**: `adminCode` logic suggests an invite-only system.
    *   **Strategy**: Enable "Master Trainers" to onboard their own sub-trainers. Charge a platform fee per sub-trainer.

---

### 4. Market Positioning

**Comparison to Industry Leaders:**

| Metric | Trainerize / TrueCoach | SwanStudios (Current) | Advantage |
| :--- | :--- | :--- | :--- |
| **Tech Stack** | Legacy Rails / Older JS | **Modern React/TS + Node** | Faster iteration, Type safety. |
| **Design** | Functional / Bootstrap | **Galaxy-Swan Theme (Dark Mode)** | "Cool Factor" – appeals to Gen Z/Millennial fitness audience. |
| **Focus** | Workout Logging | **Visual Transformation + AI** | Different niche: "The Visual Coach." |
| **Infrastructure** | Standard RDBMS | **Cloud-Agnostic (S3/Render)** | Ready for serverless scaling (evidenced by the Queue system). |

**Positioning Statement**: *"SwanStudios is the first 'Aesthetic-First' fitness platform designed for visual coaches and transformation specialists, featuring NASM-grade AI analysis and pro photographer workflows."*

---

### 5. Growth Blockers (Technical & UX)

The code reveals critical issues that must be resolved before scaling to 10k+ users.

1.  **Security Technical Debt (P0 - Critical)**:
    *   **Issue**: In `backend/controllers/authController.mjs`, `LOGIN_ATTEMPT_LIMIT` is hardcoded to `999999` for testing.
    *   **Impact**: The application is currently vulnerable to brute-force attacks if exposed to the public internet in this state.
    *   **Fix**: Must revert to `LOGIN_ATTEMPT_LIMIT = 10` and `LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000` before launch.

2.  **Infrastructure Bottleneck (P0 - Critical)**:
    *   **Issue**: The Gemini doc confirms the app runs on **Render starter plan (512MB RAM)**. Processing RAW files (120MB) with Sharp is memory-intensive.
    *   **Impact**: As user volume grows, the sequential queue system will become too slow, and the server will crash (OOM).
    *   **Fix**: Offload image processing to a dedicated worker (e.g., AWS Lambda or Cloudinary) or upgrade to a container with >1GB RAM.

3.  **Scalability of Auth (P1 - High)**:
    *   **Issue**: `loginAttempts` (rate limiting) uses an **In-Memory Map**.
    *   **Impact**: In a distributed environment (e.g., multiple Render instances), rate limiting won't work (IP address changes per request). It also clears on server restart.
    *   **Fix**: Migrate to **Redis** for rate limiting and session storage.

4.  **Sequelize N+1 Query Risk (P2 - Medium)**:
    *   **Issue**: The code uses generic Sequelize queries. The Gallery routes (implied) will likely fetch many photos per event.
    *   **Impact**: Fetching 50 photos individually will cause 50 separate database calls, killing latency at scale.
    *   **Fix**: Implement aggressive `eager loading` (includes) in the Gallery routes.

---

## [PASS] User Research & Persona Alignment
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 152.3s

# SwanStudios Fitness SaaS Platform - User Research Analysis

## Executive Summary
Based on the provided codebase, SwanStudios demonstrates strong technical foundations but shows significant gaps in persona-specific UX design. The platform excels in security and backend architecture but lacks targeted user experience design for its core personas.

## 1. Persona Alignment Analysis

### **Primary Persona (Working Professionals 30-55)**
**Current State:**
- ✅ Comprehensive user profile system with fitness goals, experience tracking
- ✅ Secure authentication with professional-grade security
- ❌ No evidence of time-saving features for busy professionals
- ❌ Missing integration with calendar systems (Google/Outlook)
- ❌ No quick-workout modes or "lunch break" workout options

**Recommendations:**
1. **Add "Express Workout" mode** - 15-20 minute focused sessions
2. **Implement calendar sync** for scheduling training sessions
3. **Create "Professional Progress Dashboard"** showing ROI metrics (productivity gains, energy levels)
4. **Add meeting integration** - "I have a meeting in 45 minutes" workout suggestions

### **Secondary Persona (Golfers)**
**Current State:**
- ❌ No sport-specific training modules found in code
- ❌ Missing golf performance metrics (swing analysis, mobility tracking)
- ❌ No golf-specific imagery or terminology

**Recommendations:**
1. **Create golf-specific training modules** with swing mechanics focus
2. **Add golf performance tracking** (drive distance, flexibility metrics)
3. **Implement "Pre-round Warmup" quick routines**
4. **Partner with golf equipment brands** for cross-promotion

### **Tertiary Persona (Law Enforcement/First Responders)**
**Current State:**
- ✅ Strong security foundations (JWT, rate limiting)
- ✅ User role system supports admin/client distinctions
- ❌ No certification tracking system
- ❌ Missing department/agency onboarding flows
- ❌ No PT test preparation modules

**Recommendations:**
1. **Add certification tracking dashboard** with renewal reminders
2. **Create agency bulk onboarding system**
3. **Implement "Duty Fitness" modules** (tactical gear workouts)
4. **Add PT test preparation plans** (Cooper Test, obstacle course prep)

### **Admin Persona (Sean Swan)**
**Current State:**
- ✅ Advanced gallery management system
- ✅ RAW photo processing capabilities
- ✅ Detailed logging and monitoring
- ❌ Missing client progress analytics dashboard
- ❌ Limited batch client management tools

**Recommendations:**
1. **Build client analytics dashboard** showing retention metrics
2. **Create template workout system** for rapid client onboarding
3. **Implement client communication tools** within platform
4. **Add revenue tracking** for subscription management

## 2. Onboarding Friction Assessment

### **Current Strengths:**
- ✅ Clean registration flow with comprehensive validation
- ✅ Auto-follow admin feature for immediate content access
- ✅ Password strength validation with clear feedback
- ✅ Email verification system in place

### **Critical Gaps:**
1. **Missing onboarding wizard** - No guided first-time experience
2. **No fitness assessment questionnaire** - Can't personalize without initial data
3. **Absence of "quick start" tutorial** - Users dropped into complex interface
4. **No progressive disclosure** - All features visible immediately

### **Recommendations:**
1. **Implement 3-step onboarding wizard:**
   - Step 1: Fitness goals & experience level
   - Step 2: Schedule availability & time constraints
   - Step 3: Equipment access assessment
2. **Add interactive tutorial** using tooltips and guided tours
3. **Create "First Week Success" checklist** with daily micro-goals
4. **Implement "empty state" designs** that guide action

## 3. Trust Signals Analysis

### **Current Implementation:**
- ✅ Professional-grade security documentation visible in code
- ✅ Detailed error handling and validation
- ✅ Secure password reset flow
- ❌ No visible certifications on frontend
- ❌ Missing testimonials system
- ❌ No social proof elements

### **Recommendations:**
1. **Frontend trust elements:**
   - Display NASM certification badge prominently
   - Add "25+ Years Experience" badge on all pages
   - Implement client testimonials carousel
   - Add before/after photo gallery
2. **Enhanced verification:**
   - Add verified client badges
   - Implement review system with photo verification
   - Create "Success Stories" section
3. **Professional associations:**
   - Display fitness association memberships
   - Add insurance verification badge
   - Show continuing education certifications

## 4. Emotional Design Evaluation

### **Galaxy-Swan Theme Assessment:**
**Strengths:**
- ✅ Premium dark theme aligns with luxury fitness market
- ✅ Cosmic purple (#7851A9) creates distinctive brand identity
- ✅ Swan cyan (#00FFFF) provides good contrast for CTAs

**Weaknesses:**
1. **Too technical/sterile** - Lacks human warmth for personal training
2. **Poor contrast for 40+ demographic** - Cyan on dark may strain eyes
3. **Missing motivational elements** - No progress celebration animations
4. **Inconsistent emotional tone** - Cosmic theme doesn't align with golf/law enforcement

### **Recommendations:**
1. **Add warmth layers:**
   - Incorporate subtle organic shapes alongside cosmic elements
   - Use gradient overlays with warmer tones in user-facing areas
   - Add human photography with cosmic overlays
2. **Improve accessibility:**
   - Increase default font sizes by 20%
   - Implement high-contrast mode toggle
   - Add text-to-speech for workout instructions
3. **Enhance motivation:**
   - Add celebration animations for milestone achievements
   - Implement "streak" visualizations with cosmic effects
   - Create motivational quote system tied to progress

## 5. Retention Hooks Analysis

### **Current Implementation:**
- ✅ Auto-follow admin creates immediate content access
- ✅ LastActive tracking enables engagement monitoring
- ❌ No gamification systems found
- ❌ Limited progress visualization
- ❌ Missing community features

### **Missing Retention Elements:**
1. **Gamification:**
   - No points/badges system
   - Missing achievement unlocks
   - No leaderboards or challenges
2. **Progress Tracking:**
   - Basic lastActive timestamp only
   - No workout completion tracking
   - Missing body measurement history
3. **Community Features:**
   - No social feed found
   - Missing group challenges
   - No peer support system

### **Recommendations:**
1. **Implement "Cosmic Journey" gamification:**
   - Star collection for completed workouts
   - Constellation unlocks for consistency streaks
   - Planet progression system for long-term goals
2. **Build comprehensive progress dashboard:**
   - Visual timeline of all metrics
   - Photo progress comparison tool
   - Goal completion percentage visualizations
3. **Add community elements:**
   - "Swan Flock" group challenges
   - Success story sharing system
   - Virtual high-fives between clients

## 6. Accessibility for Target Demographics

### **Working Professionals (Mobile-First):**
**Current Gaps:**
- ❌ No evidence of mobile-optimized workout interface
- ❌ Missing offline mode for gym/travel use
- ❌ No quick-action mobile widgets

**Recommendations:**
1. **Implement true mobile-first design:**
   - Thumb-friendly navigation zones
   - Voice command integration
   - One-tap workout start
2. **Add offline capabilities:**
   - Download workouts for gym use
   - Sync progress when back online
   - Low-bandwidth mode

### **40+ Demographic (Visual Accessibility):**
**Critical Issues:**
- Small font sizes in code comments suggest potentially small UI text
- High-contrast cyan may cause eye strain
- No font scaling preferences found

**Recommendations:**
1. **Implement accessibility suite:**
   - Font size slider in user settings
   - High-contrast mode toggle
   - Reduced motion preference
2. **Add senior-friendly features:**
   - Larger touch targets (44px minimum)
   - Simplified navigation for first-time tech users
   - Family member access for accountability

## Priority Action Plan

### **Phase 1 (1-2 Weeks) - Critical UX Fixes**
1. **Add onboarding wizard** with persona-specific paths
2. **Implement font size controls** in user settings
3. **Create trust elements** - NASM badge, testimonials carousel
4. **Add "Express Workout" mode** for time-pressed professionals

### **Phase 2 (3-4 Weeks) - Retention Foundation**
1. **Build basic gamification** - star system for completed workouts
2. **Implement progress dashboard** with visual metrics
3. **Add mobile optimization** for workout interface
4. **Create sport-specific modules** for golfers

### **Phase 3 (5-8 Weeks) - Advanced Features**
1. **Develop community features** - challenges and sharing
2. **Implement certification tracking** for first responders
3. **Add admin analytics dashboard** for Sean
4. **Create agency onboarding flows** for bulk signups

### **Phase 4 (9-12 Weeks) - Premium Enhancements**
1. **AI workout personalization** based on progress
2. **Virtual reality integration** for form checking
3. **Wearable device integration** (Apple Watch, Fitbit)
4. **Advanced reporting** for corporate wellness programs

## Technical Debt Notes
1. **Gallery system** is over-engineered for admin use but lacks client-facing features
2. **Authentication system** is robust but login flow could be simplified for non-tech users
3. **Missing frontend components** for most persona-specific features
4. **Theme implementation** needs persona-specific variations

## Conclusion
SwanStudios has excellent backend foundations but requires significant frontend development to serve its target personas effectively. The platform currently feels like a developer's tool rather than a personal training service. Immediate focus should shift from technical perfection to user-centered design that addresses the specific needs, motivations, and limitations of each persona group.

**Key Insight:** The most critical gap is the lack of persona-specific onboarding and value proposition communication. Users likely abandon the platform before discovering its value due to generic UX that doesn't speak to their specific fitness goals and constraints.

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.5-20260211 | **Duration:** 86.0s

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

## [PASS] Frontend UI/UX Expert
**Model:** google/gemini-3.1-pro-preview | **Duration:** 47.5s

As the Lead UI/UX Design Authority and Co-Orchestrator for SwanStudios, I have reviewed the provided architectural plans and backend code. 

While the backend triage for the Render OOM crashes is technically sound, the frontend design proposed in the previous Gemini consult is too generic. "Glassmorphism" and "shimmer effects" are baseline concepts. We charge premium prices; our UI must feel like a **Cosmic Command Center**—akin to Apple Fitness+ or a high-end native iOS app, not a standard web dashboard. 

Furthermore, I am overriding the secondary scanner's generic accessibility notes. We will achieve WCAG 2.1 AA compliance not by compromising our dark theme, but by using precise typographic hierarchies and luminous contrast ratios.

Claude, as my engineering counterpart, you will execute the following design directives exactly as specified. 

---

### DIRECTIVE 1: The "Cosmic Command Center" Upload Widget
**Severity:** HIGH
**File & Location:** Frontend `src/components/Admin/Gallery/UploadWidget.tsx` (To be created)
**Design Problem:** The previously proposed glassmorphism (`rgba(10, 10, 26, 0.75)`) will look muddy over complex gallery images. It lacks physical depth and premium edge-lighting.
**Design Solution:** We will use a "Dual-Border Glass" technique. The widget must feel like a physical pane of dark glass hovering above the UI, with a distinct inner light reflection.

**Implementation Notes for Claude:**
1. Create a fixed, non-blocking container.
2. Use Framer Motion for the entrance: `initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}`.
3. Implement the following exact `styled-components` specification:

```typescript
const WidgetContainer = styled(motion.div)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  max-height: 65vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  z-index: 9999;
  overflow: hidden;
  
  /* The Premium Deep Space Glass */
  background: rgba(5, 5, 10, 0.65);
  backdrop-filter: blur(40px) saturate(150%);
  -webkit-backdrop-filter: blur(40px) saturate(150%);
  
  /* Dual-Border Technique for physical depth */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 24px 48px rgba(0, 0, 0, 0.6), /* Deep ambient shadow */
    inset 0 1px 0 rgba(255, 255, 255, 0.15), /* Top edge highlight */
    inset 0 0 0 1px rgba(0, 255, 255, 0.05); /* Subtle Swan Cyan inner glow */

  @media (max-width: 768px) {
    bottom: 0;
    right: 0;
    width: 100%;
    border-radius: 24px 24px 0 0;
    border-bottom: none;
  }
`;

const WidgetHeader = styled.div`
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(10, 10, 26, 0.9) 0%, rgba(10, 10, 26, 0.4) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
```

---

### DIRECTIVE 2: Magnetic Segmented Control (RAW vs JPEG)
**Severity:** MEDIUM
**File & Location:** Frontend `src/components/Admin/Gallery/UploadModeToggle.tsx` (To be created)
**Design Problem:** Standard radio buttons or basic CSS transitions feel cheap. The toggle must provide haptic-like visual feedback and clear WCAG contrast for the active state.
**Design Solution:** A magnetic pill toggle using Framer Motion's `layoutId` for fluid background transitions. 

**Implementation Notes for Claude:**
1. The container must be `height: 44px` (strict mobile touch target).
2. The active text must be `#FFFFFF`, inactive must be `rgba(255, 255, 255, 0.5)` (WCAG AA compliant against the dark background).
3. Implement this exact structure:

```tsx
// Inside your component
const [activeMode, setActiveMode] = useState<'jpeg' | 'raw'>('jpeg');

<ToggleContainer>
  {['jpeg', 'raw'].map((mode) => (
    <ToggleButton 
      key={mode} 
      onClick={() => setActiveMode(mode)}
      $isActive={activeMode === mode}
    >
      {activeMode === mode && (
        <ActivePill 
          layoutId="activeUploadMode"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          $mode={mode}
        />
      )}
      <ToggleText>{mode.toUpperCase()}</ToggleText>
    </ToggleButton>
  ))}
</ToggleContainer>

// Styled Components
const ToggleContainer = styled.div`
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 4px;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
`;

const ActivePill = styled(motion.div)<{ $mode: string }>`
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: ${props => props.$mode === 'raw' 
    ? 'linear-gradient(135deg, #7851A9 0%, #4A2B75 100%)' // Cosmic Purple
    : 'linear-gradient(135deg, #00FFFF 0%, #008080 100%)'}; // Swan Cyan
  box-shadow: 0 2px 8px ${props => props.$mode === 'raw' ? 'rgba(120, 81, 169, 0.4)' : 'rgba(0, 255, 255, 0.3)'};
  z-index: 0;
`;
```

---

### DIRECTIVE 3: The "Cosmic Pulse" Processing State
**Severity:** HIGH
**File & Location:** Frontend `src/components/Admin/Gallery/QueueItem.tsx` (To be created)
**Design Problem:** The previous plan suggested a simple CSS shimmer for the "Processing" state (Sharp CPU conversion). This does not convey the "heavy lifting" happening on the backend.
**Design Solution:** We will use an indeterminate, animated barber-pole stripe overlaid with a pulsing glow to indicate intense server activity.

**Implementation Notes for Claude:**
1. Build the `ProgressBar` component with three distinct layers: Track, Fill (Network Upload), and Processing (CPU).
2. Apply this exact CSS for the Processing state:

```typescript
const ProgressBarFill = styled(motion.div)<{ $state: 'uploading' | 'processing' | 'success' | 'error' }>`
  height: 4px;
  border-radius: 2px;
  width: ${props => props.$progress}%;
  
  ${props => props.$state === 'uploading' && `
    background: #00FFFF;
    box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  `}

  ${props => props.$state === 'processing' && `
    width: 100%;
    background: repeating-linear-gradient(
      -45deg,
      #7851A9,
      #7851A9 10px,
      #9B72CF 10px,
      #9B72CF 20px
    );
    background-size: 28px 28px;
    animation: barberpole 1s linear infinite, pulseGlow 2s ease-in-out infinite;
  `}

  @keyframes barberpole {
    100% { background-position: 28px 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 8px rgba(120, 81, 169, 0.4); }
    50% { box-shadow: 0 0 16px rgba(120, 81, 169, 0.8); }
  }
`;
```

---

### DIRECTIVE 4: Premium Photo Type Badges
**Severity:** MEDIUM
**File & Location:** Frontend `src/components/Gallery/PhotoGridItem.tsx` (To be updated based on `backend/models/GalleryPhoto.mjs`)
**Design Problem:** The backend now supports `sourceType` (raw vs jpeg). The previous AI suggested placing badges top-right. Top-right is standard for selection checkboxes in photo grids (like Google Photos/Apple Photos). Badges there will conflict with selection UX.
**Design Solution:** Badges must be positioned **Top-Left**. They must be ultra-minimalist, utilizing heavy blur and strict typography to avoid distracting from the photography.

**Implementation Notes for Claude:**
1. Position the badge `top: 8px; left: 8px;` absolute within the photo thumbnail container.
2. Use this exact styling:

```typescript
const SourceBadge = styled.div<{ $type: 'raw' | 'jpeg' }>`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  
  /* Typography - Strict */
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  
  /* Glass Effect */
  background: ${props => props.$type === 'raw' ? 'rgba(20, 10, 30, 0.6)' : 'rgba(10, 20, 30, 0.6)'};
  backdrop-filter: blur(8px);
  border: 1px solid ${props => props.$type === 'raw' ? 'rgba(120, 81, 169, 0.4)' : 'rgba(0, 255, 255, 0.3)'};
  color: ${props => props.$type === 'raw' ? '#E6D5FF' : '#E0FFFF'};
  
  /* Prevent interaction */
  pointer-events: none;
  user-select: none;
`;
```

---

### DIRECTIVE 5: Auth Security Friction & Force Password UX
**Severity:** CRITICAL
**File & Location:** `backend/controllers/authController.mjs` & Frontend Auth Flow
**Design Problem:** 
1. The backend has `LOGIN_ATTEMPT_LIMIT` defaulting to `999999` if the env var is missing. This is a catastrophic security risk if deployed.
2. The `forcePasswordChange` flow lacks a defined UX. It must be a high-friction, inescapable modal.

**Design Solution:** 
1. **Backend:** Claude, immediately change line 150 in `authController.mjs` to fallback to a secure default: `parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 5;`
2. **Frontend:** When the login response returns `forcePasswordChange: true`, do NOT route to the dashboard. Render a full-screen, blocking overlay.

**Implementation Notes for Claude:**
1. Update the backend fallback value.
2. For the frontend `ForcePasswordChange` view, implement a strict, centered layout:
   - Background: `#05050A` (Solid, no transparency).
   - Container: `max-width: 400px;` centered.
   - Typography: `h1` "Secure Your Account", `p` "Your administrator has issued a temporary password. You must set a permanent, secure password to continue."
   - Include a visual password strength meter (4 segments: Red, Orange, Yellow, Swan Cyan). The submit button must remain disabled (`opacity: 0.5`, `cursor: not-allowed`) until the strength meter hits Swan Cyan (meets all regex requirements).

---

### Summary of Execution for Claude:
1. **Fix the Auth Controller:** Patch the rate limit fallback immediately.
2. **Build the Upload Architecture:** Set up the Zustand store and WebSockets for the queue.
3. **Implement the UI Directives:** Apply the exact styled-components, Framer Motion specs, and CSS keyframes provided above. Do not deviate from the hex codes or animation timings.

I have established the visual and interactive baseline. Proceed with the technical implementation.

---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- This document outlines design directives for a new upload queue system. While it's not code, it contains critical design specifications that directly impact UX and accessibility.
- *   **Recommendation:** Verify the transition between desktop and mobile states is smooth and that the "Mini Progress" state provides sufficient information without being overwhelming. Ensure the bottom sheet on mobile doesn't obscure critical content.
- *   **Finding:** The plan addresses a critical user flow friction point by proposing a "global, non-blocking floating widget" for uploads, allowing users to navigate away. This is a significant improvement over a blocking spinner.
- *   **Rating:** LOW (Positive finding, addresses a critical friction point)
- *   **Finding:** The `LOGIN_ATTEMPT_LIMIT` is currently set to `999999` for Playwright E2E testing. While understandable for testing, this is a **CRITICAL** security and user flow friction issue in production.
**Code Quality:**
- This review covers authentication controller, database migrations, models, and documentation for a personal training SaaS platform. The codebase shows good documentation practices but has several critical TypeScript/typing issues, security concerns, and performance anti-patterns.
- throw new Error('CRITICAL: Missing required JWT secrets in environment');
- throw new Error('CRITICAL: LOGIN_ATTEMPT_LIMIT must be set to ≤20 in production');
- logger.error('CRITICAL: Transaction rollback failed', {
**Security:**
- The code review reveals several **CRITICAL** and **HIGH** severity security vulnerabilities, particularly in authentication and authorization mechanisms. The authController contains multiple security flaws including weak JWT configuration, improper secret management, and authorization bypass risks. While the code demonstrates good security awareness in documentation, actual implementation contains dangerous oversights.
- The application demonstrates security awareness in documentation but contains critical implementation flaws that would make it vulnerable to common attacks. The authentication system requires immediate remediation before production use.
**Performance & Scalability:**
- *   **OOM Risk: Multer Memory Storage (Critical Context)** | **CRITICAL**
**Competitive Intelligence:**
- The code reveals critical issues that must be resolved before scaling to 10k+ users.
- 1.  **Security Technical Debt (P0 - Critical)**:
- 2.  **Infrastructure Bottleneck (P0 - Critical)**:
**User Research & Persona Alignment:**
- **Critical Issues:**
- **Key Insight:** The most critical gap is the lack of persona-specific onboarding and value proposition communication. Users likely abandon the platform before discovering its value due to generic UX that doesn't speak to their specific fitness goals and constraints.
**Architecture & Bug Hunter:**
- This review identifies **CRITICAL** security vulnerabilities, architectural flaws, and production readiness issues that must be addressed before shipping. The authentication controller in particular has severe issues that would expose the system to attacks.
- **What's Wrong:** There's a time-of-check to time-of-use (TOCTOU) gap. If a user deletes their account between JWT verification and database lookup, the code will crash. More critically, if the refresh token is revoked (user logged out elsewhere) between these operations, the error handling may be inconsistent.
**Frontend UI/UX Expert:**
- **Severity:** CRITICAL

### High Priority Findings
**UX & Accessibility:**
- **HIGH:**
- This audit highlights that the design plan is well-thought-out from a UX perspective, particularly in addressing the challenging upload flow. The main areas for concern are ensuring the detailed implementation adheres to WCAG standards (especially color contrast and keyboard accessibility) and immediately addressing the critical security flaw in the authentication controller's rate limiting.
**Security:**
- The code review reveals several **CRITICAL** and **HIGH** severity security vulnerabilities, particularly in authentication and authorization mechanisms. The authController contains multiple security flaws including weak JWT configuration, improper secret management, and authorization bypass risks. While the code demonstrates good security awareness in documentation, actual implementation contains dangerous oversights.
- **Issue:** Rate limiting constants set to extremely high values (`999999` attempts, `1 minute` window) for testing.
**Performance & Scalability:**
- *   **In-Memory Rate Limiting (`loginAttempts`)** | **HIGH**
- *   **JWT Secret Fallback** | **HIGH**
- *   **Impact:** While `bcryptjs` is asynchronous, it is CPU intensive. High login volume can lead to event loop lag.
- *   **Impact:** High GPU usage on mobile devices, especially during concurrent CSS animations (the "Cosmic Pulse").
**Competitive Intelligence:**
- SwanStudios is positioning itself as a **Premium, Aesthetic-Driven Fitness Platform** with a heavy emphasis on visual transformation (gallery/high-res RAW photos) and AI-driven personalization. Unlike generic competitors (Trainerize, TrueCoach) that focus on utilitarian workout logging, SwanStudios targets the high-end "influencer trainer" or "premium results-based" market segment.
- *   **The "Cosmic" High-Fidelity UX**: The Gemini documentation (`latest.md`) explicitly dictates a premium, non-blocking "Command Center" UI for uploads. This is a massive differentiator. Competitors use standard HTML forms; SwanStudios uses a **Global Floating Widget**, **Framer Motion animations**, and **Glassmorphism**. This appeals to users who value aesthetics as much as function.
- *   **Pro-Grade Media Pipeline**: The support for **RAW files** (`sourceType: 'raw'`) and the planned implementation of **tus** (chunked uploads) and **Sharp** (server-side processing) positions SwanStudios for professional photographers and studios, not just gym goers. This is a "High-Ticket" feature.
- The current architecture supports several high-value revenue streams.
- 3.  **Scalability of Auth (P1 - High)**:
**User Research & Persona Alignment:**
- - Implement high-contrast mode toggle
- - Virtual high-fives between clients
- - High-contrast cyan may cause eye strain
- - High-contrast mode toggle
**Frontend UI/UX Expert:**
- While the backend triage for the Render OOM crashes is technically sound, the frontend design proposed in the previous Gemini consult is too generic. "Glassmorphism" and "shimmer effects" are baseline concepts. We charge premium prices; our UI must feel like a **Cosmic Command Center**—akin to Apple Fitness+ or a high-end native iOS app, not a standard web dashboard.
- **Severity:** HIGH
- inset 0 1px 0 rgba(255, 255, 255, 0.15), /* Top edge highlight */
- **Severity:** HIGH
- 2. The `forcePasswordChange` flow lacks a defined UX. It must be a high-friction, inescapable modal.

---

*SwanStudios Validation Orchestrator v8.0 — AI Village Edition*
*8 Validators: Gemini 2.5 Flash + Claude 4.5 Sonnet + DeepSeek V3.2 x2 + Gemini 3 Flash + MiniMax M2.1 + MiniMax M2.5 + Gemini 3.1 Pro*
