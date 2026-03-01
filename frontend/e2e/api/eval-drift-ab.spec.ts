/**
 * Eval / Drift / AB Status — Playwright API Regression
 * ======================================================
 * 4 tests: eval-status, drift-status, ab-status, auth guard.
 * Route base: /api/ai-monitoring (aiMonitoringRoutes.mjs)
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('Eval / Drift / AB Status', () => {
  test('GET /api/ai-monitoring/eval-status returns evalStatus + timestamp', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/eval-status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('evalStatus');
    expect(body).toHaveProperty('timestamp');
    // evalStatus may be null if no baseline file exists
    expect(body.evalStatus === null || typeof body.evalStatus === 'object').toBe(true);
  });

  test('GET /api/ai-monitoring/drift-status returns driftStatus + timestamp', async ({
    adminApi,
  }) => {
    const res = await adminApi.get('/api/ai-monitoring/drift-status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('driftStatus');
    expect(body).toHaveProperty('timestamp');
    // driftStatus may be null if no baseline file exists
    if (body.driftStatus !== null) {
      expect(body.driftStatus).toHaveProperty('drifted');
      expect(body.driftStatus).toHaveProperty('changes');
    }
  });

  test('GET /api/ai-monitoring/ab-status returns abStatus + timestamp', async ({ adminApi }) => {
    const res = await adminApi.get('/api/ai-monitoring/ab-status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('abStatus');
    expect(body).toHaveProperty('timestamp');
    // abStatus may be null if no AB report file exists
    expect(body.abStatus === null || typeof body.abStatus === 'object').toBe(true);
  });

  test('all three endpoints reject unauthenticated requests with 401', async ({ unauthApi }) => {
    const evalRes = await unauthApi.get('/api/ai-monitoring/eval-status');
    expect(evalRes.status()).toBe(401);

    const driftRes = await unauthApi.get('/api/ai-monitoring/drift-status');
    expect(driftRes.status()).toBe(401);

    const abRes = await unauthApi.get('/api/ai-monitoring/ab-status');
    expect(abRes.status()).toBe(401);
  });
});
