# Rate Limiter Revert Instructions

> **Status:** TEMPORARILY DISABLED for Playwright E2E testing
> **Date disabled:** 2026-03-07
> **Revert by:** Before production launch (1-2 days)

## Option 1: Render Dashboard (Preferred — no redeploy needed)

In **Render Dashboard > Environment > Add these env vars:**

```
LOGIN_ATTEMPT_LIMIT=10
LOGIN_ATTEMPT_WINDOW_MS=900000
```

This sets 10 login attempts per 15-minute window per IP/email.

## Option 2: Code Change

File: `backend/controllers/authController.mjs` lines 246-249

Change FROM:
```javascript
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 999999;
```

Change TO:
```javascript
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 10;
```

## Why it was disabled

Playwright E2E tests run many parallel tests, each attempting login with a credential candidate chain. With 40+ tests and retries, even a limit of 50 was exhausted within seconds, causing all tests to fail with 429 errors.

## What the env vars control

| Env Var | Default (current) | Production Value | Description |
|---------|-------------------|-----------------|-------------|
| `LOGIN_ATTEMPT_LIMIT` | 999999 | 10 | Max login attempts per identifier |
| `LOGIN_ATTEMPT_WINDOW_MS` | 60000 (1 min) | 900000 (15 min) | Rolling window for attempt tracking |

The rate limiter is in-memory (Map-based). A server restart clears all tracked attempts.
