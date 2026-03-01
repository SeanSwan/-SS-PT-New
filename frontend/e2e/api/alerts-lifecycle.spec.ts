/**
 * Alerts Lifecycle — Playwright API Regression
 * ===============================================
 * 5 tests: list alerts, auth guard, acknowledge 404, resolve 404, RBAC.
 * Route base: /api/ai-monitoring/alerts (aiMonitoringRoutes.mjs)
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Alerts Lifecycle', () => {
  test('GET /api/ai-monitoring/alerts as admin returns alerts array', async ({ adminApi }) => {
    const res = await adminApi.get('/api/ai-monitoring/alerts');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('alerts');
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body).toHaveProperty('timestamp');
  });

  test('GET /api/ai-monitoring/alerts without auth returns 401', async ({ unauthApi }) => {
    const res = await unauthApi.get('/api/ai-monitoring/alerts');
    expect(res.status()).toBe(401);
  });

  test('POST /api/ai-monitoring/alerts/99999/acknowledge returns 404 for nonexistent alert', async ({
    adminApi,
  }) => {
    const res = await adminApi.post('/api/ai-monitoring/alerts/99999/acknowledge');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /api/ai-monitoring/alerts/99999/resolve returns 404 for nonexistent alert', async ({
    adminApi,
  }) => {
    const res = await adminApi.post('/api/ai-monitoring/alerts/99999/resolve');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /api/ai-monitoring/alerts as client (non-admin) returns 403', async ({
    clientApi,
  }) => {
    const res = await clientApi.get('/api/ai-monitoring/alerts');
    expect(res.status()).toBe(403);
  });
});
