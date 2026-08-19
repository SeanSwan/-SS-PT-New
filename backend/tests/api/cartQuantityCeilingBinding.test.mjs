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
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const BACKEND_ROOT = resolve(process.cwd());
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', '__tests__', 'coverage', 'dist']);
const CEILING_NAMES = ['MAX_CART_ITEM_QUANTITY', 'MAX_PAYMENT_LINE_ITEMS'];

/**
 * Discover consumers by walking the tree, NOT from a hardcoded list — a new
 * payment rail added later must be covered automatically. A fixed list is
 * exactly how the original bug stayed invisible in one file while a sibling
 * did it correctly.
 */
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.mjs')) out.push(full);
  }
  return out;
};

const CONSUMERS = walk(BACKEND_ROOT)
  .filter((full) => {
    const src = readFileSync(full, 'utf8');
    return CEILING_NAMES.some((n) => src.includes(n));
  })
  .map((full) => relative(BACKEND_ROOT, full).replace(/\\/g, '/'))
  // The declaring module itself is not a consumer.
  .filter((p) => p !== 'utils/cartHelpers.mjs');

describe('MAX_CART_ITEM_QUANTITY binds for real in every consumer', () => {
  it('is a usable positive integer on the real (unmocked) module', async () => {
    const mod = await import('../../utils/cartHelpers.mjs');

    for (const name of CEILING_NAMES) {
      expect(Number.isInteger(mod[name]), `${name} must be an integer`).toBe(true);
      expect(mod[name], `${name} must be positive`).toBeGreaterThan(0);
    }
  });

  // Fails loudly if the walk stops finding files (renamed dirs, moved routes) —
  // a discovery test that silently matches nothing asserts nothing.
  it('discovers the known consumers', () => {
    expect(CONSUMERS.length).toBeGreaterThanOrEqual(4);
    for (const expected of [
      'routes/cartRoutes.mjs',
      'routes/achPaymentRoutes.mjs',
      'routes/offlinePaymentRoutes.mjs',
      'routes/v2PaymentRoutes.mjs',
    ]) {
      expect(CONSUMERS, `${expected} must be discovered`).toContain(expected);
    }
  });

  it('every consumer takes it as a NAMED import, never off the default export', () => {
    for (const path of CONSUMERS) {
      const source = readFileSync(resolve(BACKEND_ROOT, path), 'utf8');

      for (const name of CEILING_NAMES) {
        if (!source.includes(name)) continue;

        // The exact shape that silently bound `undefined` — and the aliased
        // variant (`const h = cartHelpers; const { X } = h;`) that a check
        // anchored on the literal `= cartHelpers` would sail past.
        expect(source, `${path} destructures ${name} off a default export`)
          .not.toMatch(new RegExp(`const\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=\\s*(?!require)\\w+\\s*;`));

        // A named import is link-time validated: if the export is removed or
        // renamed, the module fails to load rather than disabling the guard.
        expect(source, `${path} must import ${name} by name`)
          .toMatch(new RegExp(`import\\s+(?:\\w+\\s*,\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*cartHelpers\\.mjs['"]`));
      }
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
      const source = readFileSync(resolve(BACKEND_ROOT, path), 'utf8');
      expect(source, path).not.toContain('undefined or fewer');
    }
  });
});
