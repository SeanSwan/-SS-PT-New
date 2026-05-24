import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/checkout/CheckoutSuccess.tsx'), 'utf8');

describe('legacy CheckoutSuccess truth contract', () => {
  it('does not fabricate Stripe checkout identifiers', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).not.toMatch(/`cs_\$\{Date\.now\(\)\}/);
    expect(SOURCE).not.toMatch(/`pi_\$\{Date\.now\(\)\}/);
    expect(SOURCE).toContain('Missing Stripe checkout session ID');
  });
});
