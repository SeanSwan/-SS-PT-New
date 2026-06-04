import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('ApplyPaymentModal style extraction', () => {
  it('keeps the canonical admin payment modal focused on payment behavior', () => {
    const source = read('ApplyPaymentModal.tsx');
    const extractedSource = [
      source,
      read('ApplyPaymentModal.ClientList.tsx'),
      read('ApplyPaymentModal.ForceOverridePanel.tsx'),
      read('ApplyPaymentModal.SelectedClientPanel.tsx'),
    ].join('\n');

    expect(source).toContain("from './ApplyPaymentModal.baseStyles'");
    expect(source).toContain("from './ApplyPaymentModal.controller'");
    expect(source).toContain("from './ApplyPaymentModal.footer'");
    expect(source).toContain("from './ApplyPaymentModal.ClientList'");
    expect(source).toContain("from './ApplyPaymentModal.ForceOverridePanel'");
    expect(source).toContain("from './ApplyPaymentModal.SelectedClientPanel'");
    expect(extractedSource).toContain("from './ApplyPaymentModal.packageStyles'");
    expect(extractedSource).toContain("from './ApplyPaymentModal.paymentStyles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const ClientCard\s*=\s*styled/);
    expect(source).not.toMatch(/const PackageCard\s*=\s*styled/);
    expect(source).not.toMatch(/const CardOption\s*=\s*styled/);
    expect(source).not.toMatch(/const ForceOverrideButton\s*=\s*styled/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps extracted payment modal style modules below the project file cap', () => {
    [
      'ApplyPaymentModal.baseStyles.ts',
      'ApplyPaymentModal.packageStyles.ts',
      'ApplyPaymentModal.paymentStyles.ts',
      'ApplyPaymentModal.api.ts',
      'ApplyPaymentModal.config.ts',
      'ApplyPaymentModal.controller.ts',
      'ApplyPaymentModal.footer.tsx',
      'ApplyPaymentModal.ClientList.tsx',
      'ApplyPaymentModal.ForceOverridePanel.tsx',
      'ApplyPaymentModal.SelectedClientPanel.tsx',
      'ApplyPaymentModal.types.ts',
    ].forEach((fileName) => {
      const source = read(fileName);
      expect(source).toContain('export const ');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
