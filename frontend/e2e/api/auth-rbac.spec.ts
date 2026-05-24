/**
 * Auth & RBAC - Playwright API Regression
 * =======================================
 * Login flow, token validation, and RBAC enforcement.
 */
import { test, expect } from './fixtures/auth.fixture';

const BACKEND_URL = 'http://localhost:10000';
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() || '';
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() || '';
const hasAdminCredentials = Boolean(adminEmail && adminPassword);
const hasAdminEmail = Boolean(adminEmail);
const hasClientCredentials = Boolean(
  process.env.E2E_CLIENT_EMAIL?.trim() && process.env.E2E_CLIENT_PASSWORD?.trim(),
);

test.describe('Auth & RBAC', () => {
  test('POST /api/auth/login with valid admin credentials returns token', async ({ playwright }) => {
    test.skip(!hasAdminCredentials, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for admin login coverage.');

    const ctx = await playwright.request.newContext({ baseURL: BACKEND_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: adminEmail, password: adminPassword },
    });
    const body = await res.json();

    expect(res.ok()).toBe(true);
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user).toBeTruthy();
    expect(body.user.role).toBe('admin');
    await ctx.dispose();
  });

  test('POST /api/auth/login with bad password returns non-success', async ({ playwright }) => {
    test.skip(!hasAdminEmail, 'Set E2E_ADMIN_EMAIL for negative login coverage.');

    const ctx = await playwright.request.newContext({ baseURL: BACKEND_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: adminEmail, password: 'IntentionallyWrongPassword999!' },
    });
    const body = await res.json();

    if (res.status() === 200) {
      expect(body.success).toBe(false);
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
    await ctx.dispose();
  });

  test('GET /api/ai-monitoring/metrics without token returns 401', async ({ unauthApi }) => {
    const res = await unauthApi.get('/api/ai-monitoring/metrics');
    expect(res.status()).toBe(401);
  });

  test.describe('client RBAC', () => {
    test.skip(!hasClientCredentials, 'Set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD for client RBAC coverage.');

    test('POST /api/ai-monitoring/reset as client (non-admin) returns 403', async ({ clientApi }) => {
      const res = await clientApi.post('/api/ai-monitoring/reset');
      expect(res.status()).toBe(403);
    });

    test('GET /api/ai-monitoring/alerts as client (non-admin) returns 403', async ({ clientApi }) => {
      const res = await clientApi.get('/api/ai-monitoring/alerts');
      expect(res.status()).toBe(403);
    });
  });
});
