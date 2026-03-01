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

// Credentials from seed-test-accounts.mjs (seeded in dev DB)
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@swanstudios.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin123';
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

export const test = base.extend<AuthFixtures>({
  adminApi: [
    async ({ playwright }, use) => {
      const { ctx, loginCtx } = await loginAndCreateContext(
        playwright,
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
      );
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
