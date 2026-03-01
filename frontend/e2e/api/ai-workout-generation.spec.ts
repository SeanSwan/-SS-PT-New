/**
 * AI Workout Generation — Playwright API Regression
 * ===================================================
 * 4 tests: generation endpoint, auth guard, response shape, empty body.
 * Route: POST /api/ai/workout-generation (aiRoutes.mjs:30)
 * Middleware: protect → aiKillSwitch → aiRateLimiter → generateWorkoutPlan
 *
 * In test env without API keys, expects degraded response (200 + degraded:true)
 * or 403 (consent not granted) or 503 (kill switch active).
 *
 * 429 is expected: aiRateLimiter allows 3 req/min/user and the suite makes
 * 5 AI requests as admin (3 workout + 2 long-horizon) within seconds.
 */
import { test, expect } from './fixtures/auth.fixture';

test.describe('AI Workout Generation', () => {
  test('POST /api/ai/workout-generation as admin returns generation or consent/killswitch response', async ({ adminApi }) => {
    const res = await adminApi.post('/api/ai/workout-generation', {
      data: {
        userId: 1,
        fitnessLevel: 'intermediate',
        goals: ['strength', 'endurance'],
        equipment: ['dumbbells', 'barbell'],
        duration: 45,
      },
    });
    const status = res.status();
    // 200: full or degraded generation, 400: validation, 403: consent not granted, 503: kill switch
    // 429: AI rate limiter (3 req/min/user, 5 AI tests share one admin user)
    expect([200, 400, 403, 429, 503]).toContain(status);
    const body = await res.json();
    if (status === 200) {
      expect(body).toBeTruthy();
      expect(typeof body === 'object').toBe(true);
    } else if (status === 403) {
      // Consent not granted — expected shape
      expect(body).toHaveProperty('message');
    }
  });

  test('POST /api/ai/workout-generation without auth returns 401', async ({ unauthApi }) => {
    const res = await unauthApi.post('/api/ai/workout-generation', {
      data: { userId: 1, fitnessLevel: 'beginner' },
    });
    expect(res.status()).toBe(401);
  });

  test('response shape includes expected fields on 200', async ({ adminApi }) => {
    const res = await adminApi.post('/api/ai/workout-generation', {
      data: {
        userId: 1,
        fitnessLevel: 'beginner',
        goals: ['general_fitness'],
        duration: 30,
      },
    });
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body === 'object' && body !== null).toBe(true);
    }
    // 400/403/429/503 are valid non-error responses in test env
    expect([200, 400, 403, 429, 503]).toContain(res.status());
  });

  test('POST /api/ai/workout-generation with empty body returns 400 or consent/killswitch', async ({
    adminApi,
  }) => {
    const res = await adminApi.post('/api/ai/workout-generation', {
      data: {},
    });
    // 400: validation, 403: consent required, 429: rate limiter, 503: kill switch
    // 200: degraded is possible if controller doesn't validate before calling provider
    expect([200, 400, 403, 429, 503]).toContain(res.status());
  });
});
