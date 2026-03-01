/**
 * Monitoring Core — Playwright API Regression
 * ==============================================
 * 5 tests: metrics, health, trends, feature-name guard, reset.
 * Route base: /api/ai-monitoring (aiMonitoringRoutes.mjs)
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Monitoring Core', () => {
  test('GET /api/ai-monitoring/metrics returns overview + features + timestamp', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/metrics');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('overview');
    expect(body).toHaveProperty('features');
    expect(body).toHaveProperty('timestamp');
    expect(body.overview).toHaveProperty('totalRequests');
    expect(typeof body.overview.totalRequests).toBe('number');
  });

  test('GET /api/ai-monitoring/health returns status in valid set', async ({ adminApi }) => {
    const res = await adminApi.get('/api/ai-monitoring/health');
    // Health endpoint returns 200 (healthy), 206 (degraded), or 503 (unhealthy)
    expect([200, 206, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('overall');
    expect(body.overall).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.overall.status);
  });

  test('GET /api/ai-monitoring/trends/workoutGeneration returns trend data', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/trends/workoutGeneration?timeRange=24h');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('feature');
    expect(body.feature).toBe('workoutGeneration');
    expect(body).toHaveProperty('timeRange');
    expect(body).toHaveProperty('trends');
  });

  test('GET /api/ai-monitoring/trends with invalid feature name returns 400', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/trends/invalidFeature!!!');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /api/ai-monitoring/reset then GET metrics shows zeroed counters', async ({
    adminApi,
  }) => {
    // Reset metrics
    const resetRes = await adminApi.post('/api/ai-monitoring/reset');
    expect(resetRes.status()).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody.success).toBe(true);

    // Verify metrics are zeroed
    const metricsRes = await adminApi.get('/api/ai-monitoring/metrics');
    expect(metricsRes.status()).toBe(200);
    const metricsBody = await metricsRes.json();
    expect(metricsBody.overview.totalRequests).toBe(0);
  });
});
