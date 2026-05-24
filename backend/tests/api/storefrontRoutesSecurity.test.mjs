import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function readRepoFile(pathFromRoot) {
  return readFileSync(resolve(repoRoot, pathFromRoot), 'utf8');
}

const routeSource = readRepoFile('backend/routes/storeFrontRoutes.mjs');
const coreRoutesSource = readRepoFile('backend/core/routes.mjs');
const shopSource = readRepoFile('frontend/src/pages/shop/StoreV3.tsx');
const productDetailSource = readRepoFile('frontend/src/components/Shop/ProductDetail.tsx');
const pricingHookSource = readRepoFile('frontend/src/hooks/useCustomPackagePricing.ts');

describe('storefront route security contract', () => {
  it('maps the live public storefront surface before route hardening', () => {
    expect(coreRoutesSource).toContain("app.use('/api/storefront', storefrontRoutes)");
    expect(shopSource).toContain("api.get('/api/storefront')");
    expect(productDetailSource).toContain('api.get(`/api/storefront/${id}`)');
    expect(pricingHookSource).toContain('/api/storefront/calculate-price?sessions=${sessionCount}');
  });

  it('keeps calculate-price before the dynamic item id route', () => {
    expect(routeSource.indexOf("router.get('/calculate-price'")).toBeGreaterThan(-1);
    expect(routeSource.indexOf("router.get('/:id'")).toBeGreaterThan(-1);
    expect(routeSource.indexOf("router.get('/calculate-price'")).toBeLessThan(
      routeSource.indexOf("router.get('/:id'")
    );
  });

  it('does not expose raw operational errors from storefront responses', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(routeSource).toContain('function sendInternalError(res, message)');
    expect(routeSource).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('message: error.message');
    expect(routeSource).not.toContain('details: error.message');
  });

  it('uses strict public query parsing instead of partial parseInt or parseFloat input coercion', () => {
    expect(routeSource).toContain('function parseStrictInteger(value)');
    expect(routeSource).toContain('function parseOptionalPrice(value, fallback = null)');
    expect(routeSource).toContain('const safeLimit = Math.min(Math.max(requestedLimit, 1), MAX_STOREFRONT_LIMIT)');
    expect(routeSource).toContain('const safeOffset = Math.min(Math.max(requestedOffset, 0), MAX_STOREFRONT_OFFSET)');
    expect(routeSource).not.toContain('parseInt(limit');
    expect(routeSource).not.toContain('parseInt(offset');
    expect(routeSource).not.toContain('parseInt(req.query.sessions');
    expect(routeSource).not.toContain('parseFloat(req.query.pricePerSession');
    expect(routeSource).not.toContain('parseFloat(sanitizedPayload.pricePerSession');
  });
});
