/**
 * Trainer onboarding route security contract.
 *
 * Pins authenticated-user rate limiting before multipart parsing or writes.
 */
import { describe, expect, it, vi } from 'vitest';

import router, {
  trainerApplicationLimiter,
  trainerCredentialUploadLimiter,
  trainerOnboardingRateLimitKey,
} from '../../routes/trainerOnboardingRoutes.mjs';

const routeModule = await import('../../routes/trainerOnboardingRoutes.mjs');

function route(path) {
  return router.stack.find((layer) => layer.route?.path === path)?.route;
}

describe('trainer onboarding route controls', () => {
  it('fails closed until the trainer onboarding launch flag is explicitly enabled', () => {
    expect(routeModule.requireTrainerOnboardingEnabled).toBeTypeOf('function');

    const previous = process.env.ENABLE_TRAINER_ONBOARDING;
    const res = {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; return this; },
    };
    const next = vi.fn();

    try {
      delete process.env.ENABLE_TRAINER_ONBOARDING;
      routeModule.requireTrainerOnboardingEnabled({}, res, next);
      expect(res.statusCode).toBe(503);
      expect(res.payload.code).toBe('TRAINER_ONBOARDING_DISABLED');
      expect(next).not.toHaveBeenCalled();

      process.env.ENABLE_TRAINER_ONBOARDING = 'true';
      routeModule.requireTrainerOnboardingEnabled({}, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const gateIndex = router.stack.findIndex(
        (layer) => layer.handle === routeModule.requireTrainerOnboardingEnabled,
      );
      const firstEndpointIndex = router.stack.findIndex((layer) => layer.route);
      expect(gateIndex).toBeGreaterThan(-1);
      expect(gateIndex).toBeLessThan(firstEndpointIndex);
    } finally {
      if (previous === undefined) delete process.env.ENABLE_TRAINER_ONBOARDING;
      else process.env.ENABLE_TRAINER_ONBOARDING = previous;
    }
  });

  it('keys expensive authenticated actions by user before falling back to IP', () => {
    expect(trainerOnboardingRateLimitKey({ user: { id: 42 }, ip: '203.0.113.1' })).toBe('u:42');
    expect(trainerOnboardingRateLimitKey({ ip: '203.0.113.1' })).toBe('ip:203.0.113.1');
  });

  it('runs the credential upload limiter before multipart parsing and storage', () => {
    const handlers = route('/credentials').stack.map((layer) => layer.handle);
    expect(handlers[0]).toBe(trainerCredentialUploadLimiter);
    expect(handlers.length).toBeGreaterThanOrEqual(2);
  });

  it('runs the application limiter before controller persistence', () => {
    const handlers = route('/apply').stack.map((layer) => layer.handle);
    expect(handlers[0]).toBe(trainerApplicationLimiter);
    expect(handlers.length).toBeGreaterThanOrEqual(2);
  });
});
