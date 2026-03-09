# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 71.2s
> **Files:** backend/controllers/authController.mjs, frontend/e2e/admin-focused-flow.spec.ts
> **Generated:** 3/6/2026, 11:57:12 PM

---

# Code Review: SwanStudios Authentication & E2E Testing

## Summary
**Overall Assessment**: The backend authentication controller is production-ready with excellent documentation, but contains several TypeScript/typing issues and minor security concerns. The E2E test file has critical type safety issues and anti-patterns that need immediate attention.

---

## Backend: `authController.mjs`

### CRITICAL Issues

#### 1. **File Extension Mismatch** - CRITICAL
**Location**: File extension `.mjs` with TypeScript-style JSDoc
```javascript
// File: authController.mjs
/**
 * @param   {String} id - User ID
 * @returns {String} Signed JWT token
 */
```

**Issue**: Using `.mjs` (JavaScript module) but the review requests TypeScript analysis. No actual TypeScript types, only JSDoc comments.

**Impact**: 
- No compile-time type checking
- Runtime type errors possible
- Inconsistent with "TypeScript best practices" requirement

**Recommendation**: 
```typescript
// Convert to authController.ts
const generateAccessToken = (id: string, role: UserRole): string => {
  return jwt.sign(/* ... */);
};
```

---

#### 2. **Missing Input Validation on Critical Endpoints** - CRITICAL
**Location**: `forgotPassword` function (lines ~850-900)
```javascript
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  // Responds IMMEDIATELY without validating email format
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists...'
  });
```

**Issue**: No email format validation before database query in background task. Could cause database errors or expose timing attacks.

**Recommendation**:
```javascript
const { email } = req.body;

// Validate BEFORE responding
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
  return res.status(200).json({ /* same response */ });
}

res.status(200).json({ /* ... */ });
```

---

#### 3. **Unsafe Token Storage in Memory** - CRITICAL
**Location**: `loginAttempts` Map (line ~95)
```javascript
const loginAttempts = new Map();
```

**Issue**: 
- In-memory rate limiting won't work across multiple server instances
- No TTL cleanup mechanism (memory leak potential)
- Comment says "should migrate to Redis" but still in production code

**Impact**: 
- Rate limiting bypassed in load-balanced environments
- Memory exhaustion over time
- Security vulnerability (brute force attacks)

**Recommendation**:
```typescript
// Use Redis with proper TTL
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const checkAndRecordAttempt = async (identifier: string): Promise<boolean> => {
  const key = `login_attempts:${identifier}`;
  const attempts = await redis.incr(key);
  
  if (attempts === 1) {
    await redis.expire(key, LOGIN_ATTEMPT_WINDOW / 1000);
  }
  
  return attempts > LOGIN_ATTEMPT_LIMIT;
};
```

---

### HIGH Priority Issues

#### 4. **Inconsistent Error Handling** - HIGH
**Location**: Multiple functions (register, login, updateProfile)
```javascript
} catch (error) {
  logger.error('Registration error:', { 
    error: error.message, 
    stack: error.stack
  });
  
  // Sometimes returns specific errors, sometimes generic
  res.status(500).json({ 
    success: false,
    message: 'Server error during registration'
  });
}
```

**Issue**: 
- No centralized error handling
- Inconsistent error response structure
- Some functions check `error.name`, others don't
- Potential information leakage in development mode

**Recommendation**:
```typescript
// utils/errorHandler.ts
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

// Centralized error middleware
export const errorHandler = (err: Error, req: Request, res: Response) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  logger.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
```

---

#### 5. **Race Condition in User Model Loading** - HIGH
**Location**: `getUser()` calls throughout
```javascript
const User = getUser(); // 🎯 ENHANCED: Lazy load User model
const user = await User.findOne({ where: { email } });
```

**Issue**: 
- Every function calls `getUser()` separately
- No guarantee of model initialization state
- Comments mention "race condition fix" but pattern still risky

**Recommendation**:
```typescript
// models/index.mjs - Ensure single initialization
let userModelInstance: typeof User | null = null;

export const getUser = (): typeof User => {
  if (!userModelInstance) {
    userModelInstance = sequelize.models.User as typeof User;
    if (!userModelInstance) {
      throw new Error('User model not initialized');
    }
  }
  return userModelInstance;
};
```

---

#### 6. **Password Validation Inconsistency** - HIGH
**Location**: `validatePasswordStrength` (lines ~200-240)
```javascript
const validatePasswordStrength = (password) => {
  // Check length
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { success: false, message: '...' };
  }
  
  // Special char check returns different structure
  if (!hasSpecialChars) {
    return {
      success: false,
      message: 'Password should include...' // "should" vs "must"
    };
  }
```

**Issue**: 
- Inconsistent messaging ("must" vs "should")
- Special character requirement not enforced (just a warning)
- No TypeScript type for return value

**Recommendation**:
```typescript
type ValidationResult = {
  success: boolean;
  message?: string;
  warnings?: string[];
};

const validatePasswordStrength = (password: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  
  if (!hasSpecialChars) {
    warnings.push('Consider adding special characters for better security');
  }
  
  return {
    success: errors.length === 0,
    message: errors[0],
    warnings
  };
};
```

---

### MEDIUM Priority Issues

#### 7. **DRY Violation: Repeated User Sanitization** - MEDIUM
**Location**: Multiple endpoints
```javascript
// Repeated in 8+ places
res.status(200).json({
  success: true,
  user: sanitizeUser(user),
  token: accessToken
});
```

**Recommendation**:
```typescript
// utils/apiResponse.ts
export const authSuccessResponse = (
  res: Response,
  user: User,
  tokens: { accessToken: string; refreshToken?: string }
) => {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(user),
    ...tokens
  });
};
```

---

#### 8. **Magic Numbers in Token Expiry** - MEDIUM
**Location**: Lines ~88-90
```javascript
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '3h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
```

**Issue**: String-based expiry times are error-prone

**Recommendation**:
```typescript
enum TokenExpiry {
  ACCESS = 3 * 60 * 60, // 3 hours in seconds
  REFRESH = 7 * 24 * 60 * 60 // 7 days in seconds
}

const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || TokenExpiry.ACCESS;
```

---

#### 9. **Unsafe Type Coercion** - MEDIUM
**Location**: `register` function (line ~350)
```javascript
const userId = user.id.toString();
logger.info(`User authenticated, generating tokens: userID type=${typeof userId} id=${userId}`);
```

**Issue**: Assumes `user.id` exists and is coercible to string

**Recommendation**:
```typescript
if (!user?.id) {
  throw new AppError(500, 'User creation failed - no ID assigned');
}
const userId: string = String(user.id);
```

---

#### 10. **Missing Transaction Rollback** - MEDIUM
**Location**: `login` function
```javascript
export const login = async (req, res) => {
  try {
    // No transaction started, but updates user
    await user.update({
      failedLoginAttempts: 0,
      lastLogin: new Date()
    });
```

**Issue**: Other functions use transactions, but `login` doesn't

**Recommendation**: Use transactions consistently for all database writes

---

### LOW Priority Issues

#### 11. **Verbose Logging** - LOW
**Location**: Throughout (e.g., lines ~500-520)
```javascript
console.log('========== LOGIN ATTEMPT ==========');
console.log('LOGIN REQUEST BODY:', JSON.stringify(req.body, null, 2));
console.log('Request headers:', JSON.stringify(req.headers, null, 2));
```

**Issue**: Debug console.logs left in production code

**Recommendation**: Use logger levels and remove console.log

---

#### 12. **Hardcoded Admin Auto-Follow** - LOW
**Location**: `register` function (lines ~400-420)
```javascript
try {
  const adminUser = await User.findOne({ where: { role: 'admin' } });
  if (adminUser && adminUser.id !== user.id) {
    await Friendship.findOrCreate({/* ... */});
  }
} catch (autoFollowErr) {
  logger.warn(`Auto-follow failed...`);
}
```

**Issue**: Business logic hardcoded in auth controller

**Recommendation**: Extract to separate service/hook

---

## Frontend: `admin-focused-flow.spec.ts`

### CRITICAL Issues

#### 13. **Hardcoded Credentials in Source** - CRITICAL
**Location**: Lines ~20-30
```typescript
const credentialCandidates: CredentialCandidate[] = [
  // ...
  { username: 'admin@swanstudios.com', password: 'admin123' },
  { username: 'ogpswan@yahoo.com', password: 'KlackKlack80' },
  { username: 'admin@swanstudios.com', password: 'KlackKlack80' },
];
```

**Issue**: 
- **SECURITY VIOLATION**: Real credentials committed to source control
- Exposed in git history permanently
- TODO comment acknowledges issue but not fixed

**Impact**: 
- Production credentials compromised
- Potential unauthorized access
- Compliance violation (SOC 2, GDPR)

**Recommendation**:
```typescript
// IMMEDIATE ACTION REQUIRED:
// 1. Rotate ALL exposed passwords
// 2. Remove from git history (git filter-branch)
// 3. Use ONLY environment variables

const credentialCandidates: CredentialCandidate[] = [
  {
    username: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!,
  }
].filter(c => c.username && c.password);

if (credentialCandidates.length === 0) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}
```

---

#### 14. **Type Safety Violations** - CRITICAL
**Location**: Throughout
```typescript
async function resolveAdminSession(request: APIRequestContext): Promise<AdminSession> {
  // ...
  let payload: any = null; // ❌ Using 'any'
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
```

**Issue**: Extensive use of `any`, no response type validation

**Recommendation**:
```typescript
type LoginResponse = {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    role: string;
    email: string;
  };
  message?: string;
};

const payload = await response.json() as LoginResponse;

if (!payload.success || !payload.token) {
  throw new Error(`Login failed: ${payload.message || 'Unknown error'}`);
}
```

---

#### 15. **Global Mutable State** - CRITICAL
**Location**: Line ~32
```typescript
let cachedSession: AdminSession | null = null;
```

**Issue**: 
- Shared state across tests
- Tests not isolated
- Race conditions in parallel execution

**Recommendation**:
```typescript
// Use Playwright's storageState feature
test.use({
  storageState: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login once
    const session = await performLogin(page);
    
    // Save state
    const state = await context.storageState();
    await context.close();
    
    await use(state);
  }
});
```

---

### HIGH Priority Issues

#### 16. **Missing Error Boundaries** - HIGH
**Location**: All test functions
```typescript
test('client/trainer photo updates persist', async ({ page }) => {
  // No try/catch around critical operations
  const clientUpdateResponse = await clientUpdatePromise;
  expect(clientUpdateResponse.status()).toBeLessThan(500);
```

**Issue**: Test failures don't clean up state

**Recommendation**:
```typescript
test('client/trainer photo updates persist', async ({ page }) => {
  let clientId: number | null = null;
  
  try {
    // Test logic
  } finally {
    // Always cleanup
    if (clientId) {
      await cleanupClient(page, clientId);
    }
  }
});
```

---

#### 17. **Inefficient Selector Strategy** - HIGH
**Location**: Lines ~150-160
```typescript
const firstClientCard = page.locator('[data-testid^="client-card-"]').first();
await expect(firstClientCard).toBeVisible({ timeout: 30_000 });

const clientTestId = await firstClientCard.getAttribute('data-testid');
clientId = parseIdFromTestId(clientTestId, 'client-card-');
```

**Issue**: 
- Multiple DOM queries for same element
- Parsing IDs from strings (fragile)
- No null checks before parsing

**Recommendation**:
```typescript
const clientCard = await page.waitForSelector(
  '[data-testid^="client-card-"]',
  { state: 'visible', timeout: 30_000 }
);

const clientId = await clientCard.evaluate(el => {
  const id = el.getAttribute('data-client-id');
  return id ? parseInt(id, 10) : null;
});

if (!clientId) {
  throw new Error('Could not extract client ID');
}
```

---

### MEDIUM Priority Issues

#### 18. **DRY Violation: Repeated Fetch Pattern** - MEDIUM
**Location**: Lines ~70-80, repeated 5+ times
```typescript
const response = await page.request.get(`${API_BASE_URL}${url}`, {
  headers: { Authorization: `Bearer ${token}` },
});
expect(response.ok()).toBeTruthy();
return response.json();
```

**Recommendation**:
```typescript
class ApiClient {
  constructor(private token: string) {}
  
  async get<T>(url: string): Promise<T> {
    const response = await page.request.get(`${API_BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    
    if (!response.ok()) {

---

*Part of SwanStudios 7-Brain Validation System*
