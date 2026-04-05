# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 68.3s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:18:53 PM

---

# DEEP ARCHITECTURE REVIEW & BUG HUNT
## SwanStudios — Marketing Dashboard + Content Studio Blueprint

**Review Date:** 2026-01-09
**Reviewer:** Principal Software Engineer (Level: #1 Ranked)
**Document:** `docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md`

---

> **⚠️ CRITICAL DISTINCTION:** This document is a **SPECIFICATION/PLANNING blueprint**, not executable code. Traditional code bug categories (race conditions, null pointer dereferences, useEffect leaks) **do not apply**. This review focuses on **architectural gaps, security vulnerabilities, integration risks, and production blockers** that would manifest when this plan is implemented.

---

# EXECUTIVE SUMMARY

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 8 |
| 🟠 HIGH | 12 |
| 🟡 MEDIUM | 10 |
| 🟢 LOW | 5 |

**Production Blockers:** 6  
**Security Vulnerabilities:** 7  
**Architectural Flaws:** 9  
**Missing Implementation Details:** 14

---

# SECTION 1: SECURITY VULNERABILITIES

## 🔴 CRITICAL-1: OAuth Token Refresh Without Token Rotation Strategy

**File & Line:** Section "Social platform OAuth tokens must be securely stored and refreshable" (implicit throughout)

**What's Wrong:**
The specification requires "securely stored and refreshable" OAuth tokens but provides **ZERO implementation guidance** on:
- How token rotation works with AT Protocol (BlueSky)
- Meta's expiring access tokens for Facebook/Instagram
- TikTok's token expiration requirements
- Secure storage mechanism (encrypted DB column? Vault? AWS Secrets Manager?)

**Attack Vector:**
```
1. Tokens stored in plain PostgreSQL text column
2. Token expires silently during distribution queue
3. Queue jobs fail silently → posts never publish
4. No alerting → Sean discovers 3 days later via social analytics
5. Reputation damage, missed engagement windows
```

**Fix:**
```javascript
// backend/services/tokenVault.mjs
import crypto from 'crypto';

class TokenVault {
  constructor(encryptionKey) {
    this.cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, Buffer.alloc(16));
  }
  
  async storeToken(platform, userId, { access_token, refresh_token, expires_at }) {
    const encrypted = this.encrypt(JSON.stringify({ access_token, refresh_token }));
    await db.tokens.upsert({
      platform,
      user_id: userId,
      encrypted_payload: encrypted,
      expires_at: new Date(expires_at),
      updated_at: new Date()
    });
  }
  
  async getValidToken(platform, userId) {
    const token = await db.tokens.findOne({ platform, user_id: userId });
    
    // Auto-refresh if expiring within 5 minutes
    if (token.expires_at - Date.now() < 5 * 60 * 1000) {
      return await this.refreshToken(platform, userId);
    }
    
    return this.decrypt(token.encrypted_payload);
  }
  
  async refreshToken(platform, userId) {
    // Platform-specific refresh logic with exponential backoff
    // Alert Sean via email/Slack if refresh fails after 3 attempts
  }
}
```

---

## 🔴 CRITICAL-2: CSRF Protection Described But Not Implemented

**File & Line:** Section "CSRF protection on all state-changing marketing operations"

**What's Wrong:**
CSRF protection is listed as a **requirement** but the blueprint provides **NO implementation details**:
- No mention of CSRF token generation strategy
- No mention of token storage (session vs. JWT)
- No mention of SameSite cookie configuration
- No mention of custom header validation pattern

**Attack Vector:**
```javascript
// Malicious page Sean visits while logged in
<form action="https://sswanstudios.com/api/marketing/publish" method="POST">
  <input name="content" value="CLICK HERE FOR FREE TRAINING" />
  <input name="platforms" value="['all']" />
</form>
// JavaScript auto-submits this form
```

**Fix:**
```javascript
// backend/middleware/csrfProtection.mjs
import { randomBytes } from 'crypto';

export const csrfProtection = async (req, res, next) => {
  // Safe methods don't need CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Validate origin header
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://sswanstudios.com',
    'https://www.sswanstudios.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000'
  ].filter(Boolean);
  
  if (!allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  
  // Validate CSRF token for cookie-based sessions
  const cookieToken = req.cookies['csrf_token'];
  const headerToken = req.headers['x-csrf-token'];
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  
  next();
};

// Token generation endpoint
export const generateCsrfToken = (req, res) => {
  const token = randomBytes(32).toString('hex');
  res.cookie('csrf_token', token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  res.json({ csrfToken: token });
};
```

---

## 🔴 CRITICAL-3: Blog Content XSS Prevention Missing DOMPurify Integration

**File & Line:** Section "Blog content must be sanitized before rendering (prevent injection)"

**What's Wrong:**
XSS prevention is mentioned but the **implementation strategy is unspecified**:
- No mention of DOMPurify or sanitize-html
- No mention of Content Security Policy headers
- No mention of sanitization context (HTML body vs. attribute vs. URL)

**Attack Vector:**
```html
<!-- User submits blog post with malicious content -->
<script>
  fetch('https://sswanstudios.com/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ cookies: document.cookie })
  });
</script>

<!-- Or stored XSS via attributes -->
<img src=x onerror="stealSession()">
```

**Fix:**
```javascript
// backend/services/contentSanitizer.mjs
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption'
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];

export const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    // Force all links to open in new tab with noopener
    ADD_ATTR: ['target="_blank"', 'rel="noopener noreferrer"'],
    // Sanitize URLs strictly
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
};

// Usage in blogService.mjs
export const publishBlogPost = async (postId, userId) => {
  const post = await db.posts.findById(postId);
  
  // Sanitize before any processing
  const sanitizedContent = sanitizeHtml(post.content);
  const sanitizedTitle = sanitizeHtml(post.title);
  
  // Also run output encoding at render time (frontend)
  await db.posts.update(postId, {
    content: sanitizedContent,
    title: sanitizedTitle,
    published_at: new Date(),
    published_by: userId
  });
};
```

---

## 🔴 CRITICAL-4: API Keys in Environment Variables Is NOT Encrypted Storage

**File & Line:** Section "API key storage must be encrypted, not plain text in .env"

**What's Wrong:**
The requirement contradicts itself. **Environment variables are NOT encrypted**:
- `.env` files are plain text, committed to repo history potentially
- Environment variables appear in error logs, stack traces
- They can't be rotated without redeployment
- No audit trail of who accessed them

**Current (WRONG):**
```bash
# .env - INSECURE
LATE_API_KEY=sk_live_xxxxxxxxxxxxxxxx
BLOTATO_API_KEY=btk_live_xxxxxxxxxxxxx
```

**Fix - Use Secrets Manager:**
```javascript
// backend/config/secrets.mjs
import { SMClient } from '@aws/aws-secrets-manager';

class SecretsManager {
  constructor() {
    this.client = new SMClient({ region: 'us-east-1' });
    this.cache = new Map();
    this.cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 min TTL
  }
  
  async getSecret(secretName) {
    // Check cache first
    if (this.cache.has(secretName) && Date.now() < this.cacheExpiry) {
      return this.cache.get(secretName);
    }
    
    const response = await this.client.getSecretValue({ SecretId: secretName });
    const secret = JSON.parse(response.SecretString);
    
    // Cache for subsequent reads
    this.cache.set(secretName, secret);
    
    return secret;
  }
  
  async getApiKey(service) {
    const secrets = await this.getSecret('swanstudios/api-keys');
    return secrets[service]; // Throws if not found
  }
}

// Alternative for development (NEVER use in production)
export const getApiKey = process.env.NODE_ENV === 'development'
  ? (service) => process.env[`${service}_API_KEY`] || throwMissingKey(service)
  : (service) => secretsManager.getApiKey(service);
```

---

## 🔴 CRITICAL-5: Missing Rate Limiting Implementation

**File & Line:** Section "Rate limiting on all content generation endpoints"

**What's Wrong:**
Rate limiting is mentioned as **required** but no implementation provided:
- No rate limit strategy (token bucket, sliding window, fixed window)
- No limits specified (requests/minute? per user? per endpoint?)
- No 429 response strategy
- No differentiation between free/paid tiers

**Fix:**
```javascript
// backend/middleware/rateLimiter.mjs
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Token bucket algorithm - 100 requests per minute, burst of 20
const RATE_LIMITS = {
  'content:generate': { tokens: 100, refillRate: 100, bucketSize: 20 },
  'social:publish':   { tokens: 50,  refillRate: 50,  bucketSize: 10 },
  'seo:audit':        { tokens: 10,  refillRate: 10,  bucketSize: 2  },
  'default':          { tokens: 200, refillRate: 200, bucketSize: 50 }
};

export const rateLimiter = (limitType = 'default') => async (req, res, next) => {
  const config = RATE_LIMITS[limitType];
  const key = `ratelimit:${limitType}:${req.user?.id || req.ip}`;
  
  const [tokens, lastRefill] = await redis.hmget(key, 'tokens', 'lastRefill');
  
  const now = Date.now();
  const timePassed = (now - parseInt(lastRefill)) / 1000;
  const refilledTokens = Math.floor(timePassed * (config.refillRate / 60));
  
  let currentTokens = Math.min(config.bucketSize, parseInt(tokens || config.bucketSize) + refilledTokens);
  
  if (currentTokens <= 0) {
    const retryAfter = Math.ceil((config.bucketSize / (config.refillRate / 60)));
    res.set('Retry-After', retryAfter);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: config.refillRate,
      remaining: 0,
      reset: new Date(now + retryAfter * 1000)
    });
  }
  
  await redis.hmset(key, {
    tokens: currentTokens - 1,
    lastRefill: now
  });
  await redis.expire(key, 60);
  
  res.set({
    'X

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
