/**
 * FILE: AscensionPage.themeContract.test.ts
 * PURPOSE: Guard the live ascension page shell against embedded style and mojibake regressions.
 * LAST VALIDATED: 2026-06-09 during subscription onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './AscensionPage.tsx'), 'utf8');

describe('AscensionPage shell theme contract', () => {
  it('keeps the mounted ascension page shell on extracted Crystalline Swan styles', () => {
    expect(source).toContain("from './AscensionPage.styles'");
    expect(source).not.toContain('styled');
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/\u00e2|\u00ef|console\.error/);
  });
});
