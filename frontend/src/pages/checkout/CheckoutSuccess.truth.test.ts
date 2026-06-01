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

  it('retries initialization in-app instead of reloading the page', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).toContain('const [retryNonce, setRetryNonce] = useState<number>(0);');
    expect(SOURCE).toContain('setRetryNonce(prevNonce => prevNonce + 1);');
    expect(SOURCE).toContain('retryNonce');
  });
});
