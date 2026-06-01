import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('ApplyPaymentModal style extraction', () => {
  it('keeps the canonical admin payment modal focused on payment behavior', () => {
    const source = read('ApplyPaymentModal.tsx');

    expect(source).toContain("from './ApplyPaymentModal.baseStyles'");
    expect(source).toContain("from './ApplyPaymentModal.packageStyles'");
    expect(source).toContain("from './ApplyPaymentModal.paymentStyles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const ClientCard\s*=\s*styled/);
    expect(source).not.toMatch(/const PackageCard\s*=\s*styled/);
    expect(source).not.toMatch(/const CardOption\s*=\s*styled/);
    expect(source).not.toMatch(/const ForceOverrideButton\s*=\s*styled/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(1125);
  });

  it('keeps extracted payment modal style modules below the project file cap', () => {
    [
      'ApplyPaymentModal.baseStyles.ts',
      'ApplyPaymentModal.packageStyles.ts',
      'ApplyPaymentModal.paymentStyles.ts',
    ].forEach((fileName) => {
      const source = read(fileName);
      expect(source).toContain('export const ');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
