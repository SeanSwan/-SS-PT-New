/**
 * FILE: SuccessPage.themeContract.test.ts
 * PURPOSE: Guard the paid checkout success route against retired theme and inline color regressions.
 * LAST VALIDATED: 2026-06-09 during checkout onboarding-readiness hardening.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = resolve(__dirname, './SuccessPage.tsx');
const source = readFileSync(sourcePath, 'utf8');

describe('SuccessPage theme contract', () => {
  it('keeps the paid checkout success screen on Crystalline Swan tokens', () => {
    expect(source).toContain("from './SuccessPage.styles'");
    expect(source).not.toMatch(/\bGenesis\b|\bGalaxy\b|galaxy/i);
    expect(source).not.toContain('keyframes');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba\(/);
  });
});
