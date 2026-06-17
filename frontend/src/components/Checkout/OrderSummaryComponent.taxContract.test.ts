import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './OrderSummaryComponent.tsx'), 'utf8');

describe('legacy order summary tax contract', () => {
  it('does not calculate sales tax from a hardcoded flat percentage', () => {
    expect(source).not.toContain('subtotal * 0.0875');
    expect(source).not.toContain('subtotal * 0.08');
    expect(source).toContain('const taxes = 0;');
  });
});
