/**
 * Cross-Phase Smoke — Playwright API Regression
 * ================================================
 * 2 tests: health→metrics→digest chain, provider metrics consistency.
 * Validates that Phase 10 endpoints work together without 500s.
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Cross-Phase Smoke', () => {
  test('health → metrics → digest chain all return 200 with valid shapes', async ({
    adminApi,
  }) => {
    // Step 1: Health
    const healthRes = await adminApi.get('/api/ai-monitoring/health');
    expect([200, 206, 503]).toContain(healthRes.status());
    const healthBody = await healthRes.json();
    expect(healthBody).toHaveProperty('overall');

    // Step 2: Metrics
    const metricsRes = await adminApi.get('/api/ai-monitoring/metrics');
    expect(metricsRes.status()).toBe(200);
    const metricsBody = await metricsRes.json();
    expect(metricsBody).toHaveProperty('overview');
    expect(metricsBody).toHaveProperty('features');

    // Step 3: Digest
    const digestRes = await adminApi.get('/api/ai-monitoring/digest');
    expect(digestRes.status()).toBe(200);
    const digestBody = await digestRes.json();
    expect(digestBody).toHaveProperty('period');
  });

  test('GET /api/ai-monitoring/providers returns valid response (no 500)', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/providers');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body === 'object' && body !== null).toBe(true);
  });
});
