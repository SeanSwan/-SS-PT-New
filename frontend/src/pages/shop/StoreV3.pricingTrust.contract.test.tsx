import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A mixed physical/training catalog cannot promise all-inclusive totals.
// Preserve the original trust intent at the current rendered copy boundaries.
const read = (file: string) => readFileSync(resolve(process.cwd(), 'src', file), 'utf8');
const storefront = read('pages/shop/StoreV3.tsx');
const product = read('pages/shop/components/ProductCard.tsx');
const story = read('pages/shop/components/StoreStory.tsx');
const checkout = read('components/NewCheckout/CheckoutView.sections.tsx');

describe('store pricing transparency for physical and training products', () => {
  it('explains applicable checkout tax rather than promising a final catalog total', () => {
    expect(product).toContain('Applicable tax is calculated at checkout.');
    expect(story).toContain('applicable tax');
  });
  it('does not publish unsupported final-price or refund guarantees', () => {
    expect([storefront, product, story, checkout].join('\n')).not.toMatch(/All-inclusive pricing|the price you see is the price you pay|Money Back Guarantee/i);
  });
});
