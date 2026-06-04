import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const STYLE_FILES = [
  'ApplyPaymentModal.baseStyles.ts',
  'ApplyPaymentModal.packageStyles.ts',
  'ApplyPaymentModal.paymentStyles.ts',
];

describe('ApplyPaymentModal theme bridge', () => {
  it('keeps payment recovery chrome on Crystalline Swan tokens', () => {
    const themeSource = read('ApplyPaymentModal.theme.ts');
    const styleSource = STYLE_FILES.map(read).join('\n');

    expect(themeSource).toContain('APPLY_PAYMENT_THEME');
    expect(themeSource).toContain('var(--accent-primary, #60C0F0)');
    expect(styleSource).toContain('./ApplyPaymentModal.theme');

    expect(styleSource).not.toMatch(/rgba\(/);
    expect(styleSource).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });
});
