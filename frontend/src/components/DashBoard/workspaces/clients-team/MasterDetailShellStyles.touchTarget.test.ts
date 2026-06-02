import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './MasterDetailShellStyles.ts'), 'utf8');

describe('MasterDetailShellStyles touch target contract', () => {
  it('keeps the sidebar collapse control at the app minimum touch target size', () => {
    expect(source).toMatch(/export const CollapseButton = styled\.button`[\s\S]*min-width: 44px;/);
    expect(source).toMatch(/export const CollapseButton = styled\.button`[\s\S]*min-height: 44px;/);
  });

  it('keeps pillar navigation controls at the app minimum touch target size', () => {
    expect(source).toMatch(/export const PillarButton = styled\.button[\s\S]*min-height: 44px;/);
  });

  it('keeps shell chrome styling bridged to theme variables', () => {
    expect(source).toContain('var(--bg-surface, #141419)');
    expect(source).toContain('var(--accent-gold, #C6A84B)');
    expect(source).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(source).not.toContain('background: #141419');
    expect(source).not.toContain('outline: 2px solid #60C0F0');
    expect(source).not.toContain('color: #C6A84B');
    expect(source).not.toContain('background: rgba(96, 192, 240');
    expect(source).not.toContain('border-right: 1px solid rgba(224, 236, 244');
    expect(source).not.toContain('border-bottom: 1px solid rgba(224, 236, 244');
    expect(source).not.toContain('border: 1px solid rgba(224, 236, 244');
    expect(source).not.toContain('box-shadow: 0 2px 8px rgba');
    expect(source).not.toContain('color: rgba(224, 236, 244');
  });
});
