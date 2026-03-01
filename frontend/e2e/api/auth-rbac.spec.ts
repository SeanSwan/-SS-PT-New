/**
 * Auth & RBAC — Playwright API Regression
 * =========================================
 * 5 tests: login flow, token validation, RBAC enforcement.
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Auth & RBAC', () => {
  test('POST /api/auth/login with valid admin credentials returns token', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:10000' });
    const email = process.env.E2E_ADMIN_EMAIL || 'admin@swanstudios.com';
    const password = process.env.E2E_ADMIN_PASSWORD || 'admin123';
    const res = await ctx.post('/api/auth/login', {
      data: { username: email, password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user).toBeTruthy();
    expect(body.user.role).toBe('admin');
    await ctx.dispose();
  });

  test('POST /api/auth/login with bad password returns non-success', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: 'http://localhost:10000' });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'admin@swanstudios.com', password: 'WrongPassword999!' },
    });
    // Server returns 401 with success:false
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

  test('POST /api/ai-monitoring/reset as client (non-admin) returns 403', async ({ clientApi }) => {
    const res = await clientApi.post('/api/ai-monitoring/reset');
    expect(res.status()).toBe(403);
  });

  test('GET /api/ai-monitoring/alerts as client (non-admin) returns 403', async ({ clientApi }) => {
    const res = await clientApi.get('/api/ai-monitoring/alerts');
    expect(res.status()).toBe(403);
  });
});
