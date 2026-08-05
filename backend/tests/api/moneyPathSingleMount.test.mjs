/**
 * Money-path routers must be mounted EXACTLY ONCE (Lane 4 audit, drift fix P-3)
 * =============================================================================
 * `v2PaymentRoutes` and `sessionPackageRoutes` were each registered twice:
 * directly in core/routes.mjs, and again in routes/api.mjs which is reached via
 * the `app.use('/api', apiRoutes)` fallback. The direct mount runs first and
 * always wins, so the second registration never served a request.
 *
 * That is worse than dead code on a payment path: an edit applied to the
 * shadowed copy looks correct, passes review, and silently does nothing.
 *
 * Equivalent guards already existed for /api/cart and /api/storefront
 * (cartRoutesSecurity, storefrontRoutesSecurity) — which is exactly why those
 * two never drifted, and why these two did. This closes the gap.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(backendRoot, rel), 'utf8');

const coreRoutes = read('core/routes.mjs');
const apiRoutes = read('routes/api.mjs');

/** Count real (non-commented) registrations of a router path across both files. */
const countMounts = (source, pattern) =>
  source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .filter((line) => pattern.test(line))
    .length;

describe('money-path routers are mounted exactly once', () => {
  it.each([
    ['v2PaymentRoutes', /app\.use\(\s*['"]\/api\/v2\/payments['"]/, /router\.use\(\s*['"]\/v2\/payments['"]/],
    ['sessionPackageRoutes', /app\.use\(\s*['"]\/api\/session-packages['"]/, /router\.use\(\s*['"]\/session-packages['"]/],
  ])('%s is registered in core/routes.mjs and NOT re-registered in api.mjs', (_name, corePattern, apiPattern) => {
    expect(countMounts(coreRoutes, corePattern), 'expected exactly one direct mount').toBe(1);
    expect(countMounts(apiRoutes, apiPattern), 'shadowed duplicate must not return').toBe(0);
  });

  it('api.mjs does not import the routers it must not mount', () => {
    // An unused import is how a removed registration quietly comes back.
    expect(apiRoutes).not.toMatch(/^import v2PaymentRoutes /m);
    expect(apiRoutes).not.toMatch(/^import sessionPackageRoutes /m);
  });

  it('records WHY the absence is deliberate, so it is not "restored" as a bug fix', () => {
    expect(apiRoutes).toMatch(/DELIBERATELY not registered here/);
  });

  it('the pre-existing single-mount guards for cart and storefront still hold', () => {
    expect(countMounts(coreRoutes, /app\.use\(\s*['"]\/api\/cart['"]/)).toBe(1);
    expect(countMounts(coreRoutes, /app\.use\(\s*['"]\/api\/storefront['"]/)).toBe(1);
  });

  it('the canonical Stripe webhook router keeps its two INTENTIONAL aliases', () => {
    // /webhooks/stripe and /api/webhook/stripe are the same router on purpose —
    // this guard must not be mistaken for a rule against that.
    const webhookMounts = countMounts(coreRoutes, /stripeWebhookRouter/);
    expect(webhookMounts).toBeGreaterThanOrEqual(2);
  });
});
