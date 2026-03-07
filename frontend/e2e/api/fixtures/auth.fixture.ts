/**
 * Auth Fixture — Playwright API Tests
 * =====================================
 * Provides authenticated API request contexts for admin, client, and unauthenticated users.
 * Credentials match backend/scripts/seed-test-accounts.mjs.
 *
 * Override via env vars: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
 *                        E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD
 *
 * Uses scope: 'worker' so login happens once per worker process (avoids rate limiter).
 */
import { test as base, expect, APIRequestContext } from '@playwright/test';

const BACKEND_URL = 'http://localhost:10000';

// TODO: Replace hardcoded credentials with env-only auth before production/CI.
// Order: env vars, local seed, production.
const ADMIN_CANDIDATES = [
  { email: process.env.E2E_ADMIN_EMAIL || '', password: process.env.E2E_ADMIN_PASSWORD || '' },
  { email: 'admin@swanstudios.com', password: 'admin123' },
  { email: 'ogpswan@yahoo.com', password: 'KlackKlack80' },
  { email: 'admin@swanstudios.com', password: 'KlackKlack80' },
].filter(c => c.email.trim() && c.password.trim());

const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client@test.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'client123';

type AuthFixtures = {
  adminApi: APIRequestContext;
  clientApi: APIRequestContext;
  unauthApi: APIRequestContext;
};

async function loginAndCreateContext(
  playwright: typeof import('@playwright/test')['default']['prototype']['playwright'],
  email: string,
  password: string,
): Promise<{ ctx: APIRequestContext; loginCtx: APIRequestContext }> {
  const loginCtx = await playwright.request.newContext({ baseURL: BACKEND_URL });
  const res = await loginCtx.post('/api/auth/login', {
    data: { username: email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  const token = body.token;
  if (!token) {
    throw new Error(`No token returned for ${email}: ${JSON.stringify(body)}`);
  }
  const ctx = await playwright.request.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  return { ctx, loginCtx };
}

async function loginAdminWithCandidates(
  playwright: typeof import('@playwright/test')['default']['prototype']['playwright'],
): Promise<{ ctx: APIRequestContext; loginCtx: APIRequestContext }> {
  for (const cand of ADMIN_CANDIDATES) {
    try {
      return await loginAndCreateContext(playwright, cand.email, cand.password);
    } catch {
      continue;
    }
  }
  throw new Error('Unable to login as admin — all credential candidates failed');
}

export const test = base.extend<AuthFixtures>({
  adminApi: [
    async ({ playwright }, use) => {
      const { ctx, loginCtx } = await loginAdminWithCandidates(playwright);
      await use(ctx);
      await ctx.dispose();
      await loginCtx.dispose();
    },
    { scope: 'worker' },
  ],

  clientApi: [
    async ({ playwright }, use) => {
      const { ctx, loginCtx } = await loginAndCreateContext(
        playwright,
        CLIENT_EMAIL,
        CLIENT_PASSWORD,
      );
      await use(ctx);
      await ctx.dispose();
      await loginCtx.dispose();
    },
    { scope: 'worker' },
  ],

  unauthApi: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: BACKEND_URL });
      await use(ctx);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],
});

export { expect };
