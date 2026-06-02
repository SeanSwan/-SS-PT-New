import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './MasterDetailCardStyles.ts'), 'utf8');

describe('MasterDetailCardStyles touch target contract', () => {
  it('keeps client quick action buttons at the app minimum touch target size', () => {
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*width: 44px;/);
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*height: 44px;/);
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*min-width: 44px;/);
  });

  it('keeps client list card styling bridged to theme variables', () => {
    expect(source).toContain('var(--bg-elevated, #1A1A24)');
    expect(source).toContain('var(--accent-secondary, #8B5CF6)');
    expect(source).toContain('var(--accent-gold, #C6A84B)');
    expect(source).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(source).not.toContain("return '#");
    expect(source).not.toContain('background-color: #');
    expect(source).not.toContain('background: rgba(96, 192, 240');
    expect(source).not.toContain('outline: 2px solid #');
    expect(source).not.toContain('box-shadow: 0 0 6px rgba(96, 192, 240');
  });
});
