# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.5s
> **Files:** AI-Village-Documentation/gemini-consults/latest.md, backend/controllers/authController.mjs, backend/migrations/20260311000000-add-source-type-to-gallery-photos.cjs, backend/models/GalleryPhoto.mjs, backend/routes/adminGalleryRoutes.mjs
> **Generated:** 3/11/2026, 9:54:39 PM

---

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

*Part of SwanStudios 7-Brain Validation System*
