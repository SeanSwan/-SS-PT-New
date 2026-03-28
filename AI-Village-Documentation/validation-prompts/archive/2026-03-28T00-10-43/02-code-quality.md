# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 53.1s
> **Files:** backend/routes/claimRoutes.mjs, backend/services/claimTokenService.mjs, backend/controllers/adminClientController.mjs, backend/migrations/20260327000001-add-account-status-claim-token.cjs
> **Generated:** 3/27/2026, 5:10:43 PM

---

# Code Review: SwanStudios Claim Token System

## CRITICAL Issues

### 1. **SQL Injection Vulnerability via Object Injection**
**File:** `backend/controllers/adminClientController.mjs`  
**Location:** `getClientWorkoutStats` method  
**Severity:** CRITICAL

```typescript
// VULNERABLE CODE:
const isValidDate = (d) => d && !isNaN(Date.parse(String(d)));
const safeStartDate = isValidDate(startDate) ? new Date(String(startDate)).toISOString() : null;

// If attacker passes: ?startDate[gt]=2020-01-01
// String({gt: '2020-01-01'}) = '[object Object]'
// Date.parse('[object Object]') = NaN (passes validation!)
// Then used in: dateFilter.date = { [Op.gte]: safeStartDate }
```

**Fix:**
```typescript
const isValidDate = (d) => {
  if (typeof d !== 'string') return false;
  const parsed = Date.parse(d);
  return !isNaN(parsed) && parsed > 0;
};
```

---

### 2. **Timing Attack on Token Verification**
**File:** `backend/routes/claimRoutes.mjs`  
**Location:** `/verify/:token` and `/activate` endpoints  
**Severity:** CRITICAL

```javascript
// VULNERABLE: Loops through ALL invited users and bcrypt.compare() each
for (const candidate of candidates) {
  if (isTokenExpired(candidate.claimTokenExpires)) continue;
  const match = await verifyClaimToken(token, candidate.claimTokenHash);
  if (match) return res.json({ success: true, ... });
}
```

**Problem:** Attacker can measure response time to determine:
- How many invited users exist (more users = longer response)
- Whether token matches early vs late in list
- Brute-force tokens by timing attacks

**Fix:** Use constant-time comparison + indexed lookup:
```javascript
// Add index on claimTokenHash (partial match first 8 chars)
// Store token prefix in separate column for O(1) lookup
const tokenPrefix = token.substring(0, 8); // "SWAN-A7X"
const candidates = await User.findAll({
  where: { 
    claimTokenPrefix: tokenPrefix,
    accountStatus: 'invited',
    claimTokenExpires: { [Op.gt]: new Date() }
  }
});

// Use crypto.timingSafeEqual for constant-time comparison
```

---

### 3. **Race Condition in Token Activation**
**File:** `backend/routes/claimRoutes.mjs`  
**Location:** `/activate` endpoint  
**Severity:** CRITICAL

```javascript
// VULNERABLE: No transaction, no row locking
const matchedUser = /* find user */;
await matchedUser.update({
  password,
  accountStatus: 'active',
  claimTokenHash: null, // Token consumed
});
```

**Attack Scenario:**
1. Attacker intercepts valid token `SWAN-A7X3`
2. Sends 10 parallel requests to `/activate` with different passwords
3. First request activates account with password `hacker123`
4. Victim's legitimate request fails (token already consumed)

**Fix:**
```javascript
const transaction = await sequelize.transaction();
const matchedUser = await User.findOne({
  where: { id: candidateId },
  lock: transaction.LOCK.UPDATE, // Row-level lock
  transaction
});

if (!matchedUser || matchedUser.accountStatus !== 'invited') {
  await transaction.rollback();
  return res.status(404).json({ success: false, message: 'Token already used' });
}

await matchedUser.update({ ... }, { transaction });
await transaction.commit();
```

---

## HIGH Issues

### 4. **Hardcoded Token Expiry (30 Days)**
**File:** `backend/services/claimTokenService.mjs`  
**Severity:** HIGH

```javascript
// HARDCODED: No configuration, no override
const expires = new Date();
expires.setDate(expires.getDate() + 30);
```

**Problem:** 
- Move Fitness clients may need shorter expiry (7 days)
- No way to extend tokens without regenerating
- No audit trail of token regeneration

**Fix:**
```typescript
export async function generateClaimToken(expiryDays = 30) {
  const expires = new Date();
  expires.setDate(expires.getDate() + expiryDays);
  // ... rest of code
}

// In controller:
const { plainToken, hash, expires } = await generateClaimToken(
  clientSource === 'move_fitness' ? 7 : 30
);
```

---

### 5. **Missing Rate Limiting on Public Endpoints**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** HIGH

```javascript
// NO RATE LIMITING on public endpoints
router.get('/verify/:token', async (req, res) => { ... });
router.post('/activate', async (req, res) => { ... });
```

**Attack Scenario:**
- Attacker brute-forces `SWAN-XXXX` tokens (32^4 = 1M combinations)
- No CAPTCHA, no rate limiting, no IP blocking
- Can enumerate all invited users

**Fix:**
```javascript
import rateLimit from 'express-rate-limit';

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many claim attempts, please try again later'
});

router.post('/activate', claimLimiter, async (req, res) => { ... });
```

---

### 6. **Weak Token Entropy (Only 1M Combinations)**
**File:** `backend/services/claimTokenService.mjs`  
**Severity:** HIGH

```javascript
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars
const suffix = Array.from(crypto.randomBytes(4))
  .map(b => CHARSET[b % CHARSET.length])
  .join(''); // 4 chars = 32^4 = 1,048,576 combinations
```

**Problem:**
- Only 1M possible tokens (brute-forceable in hours)
- Modulo bias: `b % 32` doesn't evenly distribute (256 % 32 = 0)
- No HMAC/signature to prevent forgery

**Fix:**
```javascript
// Increase to 8 chars (32^8 = 1.1 trillion combinations)
const suffix = Array.from(crypto.randomBytes(8))
  .map(b => CHARSET[b % CHARSET.length])
  .join('');
const plainToken = `SWAN-${suffix.slice(0,4)}-${suffix.slice(4)}`;

// Or use cryptographically secure random selection:
function secureRandomChar(charset) {
  const max = 256 - (256 % charset.length); // Avoid modulo bias
  let byte;
  do {
    byte = crypto.randomBytes(1)[0];
  } while (byte >= max);
  return charset[byte % charset.length];
}
```

---

### 7. **Email Enumeration via Error Messages**
**File:** `backend/controllers/adminClientController.mjs`  
**Severity:** HIGH

```javascript
// LEAKS INFORMATION: Attacker can enumerate registered emails
const existingUser = await User.findOne({ where: { email } });
if (existingUser) {
  return res.status(400).json({
    success: false,
    message: 'Email already exists' // ❌ Reveals email is registered
  });
}
```

**Fix:**
```javascript
if (existingUser) {
  return res.status(400).json({
    success: false,
    message: 'Unable to create account. Please contact support.' // ✅ Generic message
  });
}
```

---

## MEDIUM Issues

### 8. **Missing Input Validation (Token Format)**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** MEDIUM

```javascript
// WEAK VALIDATION: Only checks length, not format
if (!token || token.length < 6) {
  return res.status(400).json({ success: false, message: 'Invalid token format' });
}
```

**Fix:**
```javascript
const TOKEN_REGEX = /^SWAN-[A-Z2-9]{4}$/;
if (!token || !TOKEN_REGEX.test(token)) {
  return res.status(400).json({ success: false, message: 'Invalid token format' });
}
```

---

### 9. **Inconsistent Error Handling**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** MEDIUM

```javascript
// INCONSISTENT: Some endpoints return 500, others return 404
catch (error) {
  logger.error('[ClaimRoutes] Token verification failed:', error);
  return res.status(500).json({ success: false, message: 'Verification failed' });
}

// vs.

catch (error) {
  logger.error('[ClaimRoutes] Account activation failed:', error);
  return res.status(500).json({ success: false, message: 'Activation failed' });
}
```

**Fix:** Create centralized error handler:
```typescript
class ClaimError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

function handleClaimError(error: Error, res: Response) {
  if (error instanceof ClaimError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  logger.error('Unexpected claim error:', error);
  return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
}
```

---

### 10. **Missing Audit Logging**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** MEDIUM

```javascript
// NO AUDIT TRAIL for failed claim attempts
if (!matchedUser) {
  return res.status(404).json({
    success: false,
    message: 'Invalid or expired invite code'
  });
}
```

**Fix:**
```javascript
logger.warn('[ClaimRoutes] Failed activation attempt', {
  token: token.substring(0, 8), // Log prefix only
  ip: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date().toISOString()
});
```

---

### 11. **DRY Violation: Duplicate Token Verification Logic**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** MEDIUM

```javascript
// DUPLICATED in /verify and /activate endpoints
const candidates = await User.findAll({
  where: {
    claimTokenHash: { [Op.ne]: null },
    accountStatus: 'invited',
  },
});

for (const candidate of candidates) {
  if (isTokenExpired(candidate.claimTokenExpires)) continue;
  const match = await verifyClaimToken(token, candidate.claimTokenHash);
  if (match) { /* ... */ }
}
```

**Fix:** Extract to service method:
```typescript
// claimTokenService.mjs
export async function findUserByClaimToken(token: string): Promise<User | null> {
  const User = getUser();
  const candidates = await User.findAll({
    where: {
      claimTokenHash: { [Op.ne]: null },
      accountStatus: 'invited',
      claimTokenExpires: { [Op.gt]: new Date() } // Filter expired in DB
    },
  });

  for (const candidate of candidates) {
    const match = await verifyClaimToken(token, candidate.claimTokenHash);
    if (match) return candidate;
  }
  return null;
}
```

---

### 12. **Unsafe Email Update (No Verification)**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** MEDIUM

```javascript
// ALLOWS TAKEOVER: Client can claim account with ANY email
if (email && email !== matchedUser.email) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }
  updates.email = email; // ❌ No verification email sent
}
```

**Fix:**
```javascript
// Don't allow email change during activation
// Require separate email verification flow
if (email && email !== matchedUser.email) {
  return res.status(400).json({
    success: false,
    message: 'Email cannot be changed during activation. Please contact support.'
  });
}
```

---

## LOW Issues

### 13. **Missing TypeScript Types (JavaScript Files)**
**File:** All `.mjs` files  
**Severity:** LOW

**Problem:** No type safety, no IDE autocomplete, runtime errors

**Fix:** Convert to TypeScript:
```typescript
// claimTokenService.ts
interface ClaimToken {
  plainToken: string;
  hash: string;
  expires: Date;
}

export async function generateClaimToken(): Promise<ClaimToken> {
  // ...
}
```

---

### 14. **Hardcoded Frontend URL**
**File:** `backend/routes/claimRoutes.mjs`  
**Severity:** LOW

```javascript
claimUrl: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/claim/${plainToken}`
```

**Fix:**
```javascript
// config/app.js
export const FRONTEND_URL = process.env.FRONTEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sswanstudios.com' 
    : 'http://localhost:3000');
```

---

### 15. **Inconsistent Logging Format**
**File:** Multiple files  
**Severity:** LOW

```javascript
// INCONSISTENT:
logger.info('[ClaimRoutes] Token generated for client %d by admin %d', clientId, req.user.id);
logger.info(`External client created: ${email} (source: ${clientSource})`);
```

**Fix:** Use structured logging:
```javascript
logger.info('Token generated', {
  context: 'ClaimRoutes',
  clientId,
  adminId: req.user.id,
  action: 'generate_token'
});
```

---

## Summary

| Severity | Count | Must Fix Before Production |
|----------|-------|---------------------------|
| CRITICAL | 3 | ✅ YES |
| HIGH | 4 | ✅ YES |
| MEDIUM | 5 | ⚠️ RECOMMENDED |
| LOW | 3 | 💡 NICE TO HAVE |

**Top Priority Fixes:**
1. Add transaction + row locking to `/activate` endpoint
2. Implement rate limiting on public endpoints
3. Fix timing attack vulnerability in token verification
4. Increase token entropy to 8 characters
5. Add audit logging for failed claim attempts

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
