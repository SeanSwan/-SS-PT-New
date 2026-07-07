import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Launch Charter P1-1 lock: price visibility comes from the SERVER
 * (`pricesVisible` on /api/storefront, driven by the admin-granted
 * `store-prices` feature flag) — never from local auth state. Being
 * logged in must not reveal prices.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const storeV3 = read('./StoreV3.tsx');
const storeV2 = read('./StoreV2.tsx');
const packageCard = read('./components/PackageCard.tsx');
const featureAccess = read(
  '../../components/DashBoard/Pages/admin-feature-access/FeatureAccessPage.tsx',
);

describe('store price gating — server-truth contract', () => {
  it.each([
    ['StoreV3', storeV3],
    ['StoreV2', storeV2],
  ])('%s derives canViewPrices from the server signal, not isAuthenticated', (_name, src) => {
    expect(src).not.toMatch(/canViewPrices = isAuthenticated/);
    expect(src).toMatch(/setPricesVisible\(response\.data\?\.pricesVisible === true\)/);
    expect(src).toMatch(/const canViewPrices = pricesVisible/);
  });

  it('non-granted fallback copy asks for an invitation instead of promising login reveals prices', () => {
    expect(packageCard).not.toContain('Login to view premium prices');
    expect(packageCard).toContain('Pricing is by invitation');
  });

  it('admin Feature Access page can grant the store-prices flag', () => {
    expect(featureAccess).toContain("key: 'store-prices'");
  });
});
