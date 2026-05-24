import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/orderRoutes.mjs'), 'utf8');

describe('order route structure', () => {
  it('keeps active order routes thin and delegates mutation workflows', () => {
    expect(routeSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(routeSource).toMatch(/router\.post\('\/create-from-cart',\s*protect,\s*createOrderFromCart\)/);
    expect(routeSource).toMatch(/router\.post\('\/:id\/apply-payment',\s*protect,\s*applyOrderPayment\)/);
  });
});
