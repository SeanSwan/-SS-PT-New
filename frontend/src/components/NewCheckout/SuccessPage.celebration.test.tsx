import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const successSource = readFileSync(resolve(__dirname, './SuccessPage.tsx'), 'utf8');
const styleSource = readFileSync(resolve(__dirname, './SuccessPage.styles.ts'), 'utf8');

describe('checkout success celebration contract', () => {
  it('requires verified success state and honors reduced motion', () => {
    expect(successSource).toContain('useReducedMotion');
    expect(successSource).toContain('verificationConfirmed');
    expect(styleSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('does not celebrate a pending or failed verification response', () => {
    expect(successSource).toContain('if (!verificationConfirmed || !orderData)');
  });
});
