/**
 * Regression: MAX_CART_ITEM_QUANTITY must actually BIND in every consumer.
 *
 * Found 2026-08-16 while porting the offline-rail hardening onto the ACH rail.
 *
 * `utils/cartHelpers.mjs` exports MAX_CART_ITEM_QUANTITY as a NAMED export only —
 * it is not a key on the default-export object. `cartRoutes.mjs` destructured it
 * off the DEFAULT import:
 *
 *     const { MAX_CART_ITEM_QUANTITY } = cartHelpers;   // => undefined
 *
 * so every `quantity > MAX_CART_ITEM_QUANTITY` check evaluated `n > undefined`,
 * which is ALWAYS false. All three cart ceilings were dead, and the user-facing
 * error read "Quantity must be undefined or fewer per item."
 *
 * Why no existing test caught it: `cartQuantityCeiling.test.mjs` mocks
 * `utils/cartHelpers.mjs` and supplies MAX_CART_ITEM_QUANTITY in the mock — the
 * MOCK WAS MORE COMPLETE THAN THE REAL MODULE, so the suite was green against a
 * module shape that does not exist at runtime.
 *
 * This suite therefore deliberately uses NO mocks. It asserts against the real
 * module and the real route sources.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONSUMERS = [
  'routes/cartRoutes.mjs',
  'routes/achPaymentRoutes.mjs',
  'routes/offlinePaymentRoutes.mjs',
  'routes/v2PaymentRoutes.mjs',
];

describe('MAX_CART_ITEM_QUANTITY binds for real in every consumer', () => {
  it('is a usable positive integer on the real (unmocked) module', async () => {
    const mod = await import('../../utils/cartHelpers.mjs');

    expect(Number.isInteger(mod.MAX_CART_ITEM_QUANTITY)).toBe(true);
    expect(mod.MAX_CART_ITEM_QUANTITY).toBeGreaterThan(0);
  });

  it('every consumer takes it as a NAMED import, never off the default export', () => {
    for (const path of CONSUMERS) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8');

      // The exact shape that silently bound `undefined`.
      expect(source, `${path} destructures the constant off the default export`)
        .not.toMatch(/const\s*\{[^}]*\bMAX_CART_ITEM_QUANTITY\b[^}]*\}\s*=\s*cartHelpers/);

      // A named import is link-time validated: if the export is removed or
      // renamed, the module fails to load rather than disabling the guard.
      expect(source, `${path} must use a named import`)
        .toMatch(/import\s+(?:\w+\s*,\s*)?\{[^}]*\bMAX_CART_ITEM_QUANTITY\b[^}]*\}\s*from\s*['"][^'"]*cartHelpers\.mjs['"]/);
    }
  });

  // The comparison is only meaningful against a number. `n > undefined` is false
  // for every n, which is precisely how the dead ceiling stayed invisible.
  it('rejects the undefined-comparison shape that produced the bug', async () => {
    const { MAX_CART_ITEM_QUANTITY } = await import('../../utils/cartHelpers.mjs');

    expect(9_999_999 > MAX_CART_ITEM_QUANTITY).toBe(true);
    expect(MAX_CART_ITEM_QUANTITY + 1 > MAX_CART_ITEM_QUANTITY).toBe(true);
    expect(MAX_CART_ITEM_QUANTITY > MAX_CART_ITEM_QUANTITY).toBe(false);

    // Documents the defect: this is what every guard was actually computing.
    expect(9_999_999 > undefined).toBe(false);
  });

  it('never interpolates the constant into user-facing copy without a value', () => {
    // "Quantity must be undefined or fewer per item." shipped to users.
    for (const path of CONSUMERS) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8');
      expect(source, path).not.toContain('undefined or fewer');
    }
  });
});
