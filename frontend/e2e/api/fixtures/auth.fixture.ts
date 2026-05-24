/**
 * Auth Fixture - Playwright API Tests
 * ===================================
 * Provides authenticated API request contexts for admin, client, and unauthenticated users.
 *
 * Credentials are env-only:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
 *   E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD
 *
 * Uses scope: 'worker' so login happens once per worker process (avoids rate limiter).
 */
import { test as base, expect, APIRequestContext } from '@playwright/test';

const BACKEND_URL = 'http://localhost:10000';

function readCredentialPair(label: string, emailEnv: string, passwordEnv: string) {
  const email = process.env[emailEnv]?.trim() || '';
  const password = process.env[passwordEnv]?.trim() || '';

  if (!email || !password) {
    throw new Error(
      `${label} API E2E credentials require ${emailEnv} and ${passwordEnv}. ` +
      'Do not use hardcoded production or local seed credentials.',
    );
  }

  return { email, password };
}

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

async function loginAdmin(
  playwright: typeof import('@playwright/test')['default']['prototype']['playwright'],
): Promise<{ ctx: APIRequestContext; loginCtx: APIRequestContext }> {
  const admin = readCredentialPair('Admin', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD');
  return loginAndCreateContext(playwright, admin.email, admin.password);
}

export const test = base.extend<AuthFixtures>({
  adminApi: [
    async ({ playwright }, use) => {
      const { ctx, loginCtx } = await loginAdmin(playwright);
      await use(ctx);
      await ctx.dispose();
      await loginCtx.dispose();
    },
    { scope: 'worker' },
  ],

  clientApi: [
    async ({ playwright }, use) => {
      const client = readCredentialPair('Client', 'E2E_CLIENT_EMAIL', 'E2E_CLIENT_PASSWORD');
      const { ctx, loginCtx } = await loginAndCreateContext(
        playwright,
        client.email,
        client.password,
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
