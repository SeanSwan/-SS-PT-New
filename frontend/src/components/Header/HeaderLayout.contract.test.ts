import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const headerSource = readFileSync(resolve(__dirname, './header.tsx'), 'utf-8');
const navSource = readFileSync(resolve(__dirname, './components/NavigationLinks.tsx'), 'utf-8');
const logoSource = readFileSync(resolve(__dirname, './components/Logo.tsx'), 'utf-8');
const dashboardSelectorSource = readFileSync(
  resolve(__dirname, '../DashboardSelector/DashboardSelector.tsx'),
  'utf-8'
);
const tokensSource = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf-8');

const readZIndexToken = (name: string) => {
  const match = tokensSource.match(new RegExp(`${name}:\\s*(\\d+)`));
  return Number(match?.[1] ?? 0);
};

describe('Header layout contract', () => {
  it('keeps the logo, navigation, and action icons in non-overlapping desktop columns', () => {
    expect(headerSource).toContain('display: grid;');
    expect(headerSource).toContain('grid-template-columns: auto minmax(0, 1fr) auto auto;');
    expect(headerSource).toContain('column-gap:');
    expect(navSource).toContain('min-width: 0;');
    expect(navSource).toContain('margin-left: 0;');
    expect(logoSource).toContain('flex-shrink: 0;');
  });

  it('keeps the dashboard selector dropdown above dashboard content and unclipped by desktop nav', () => {
    expect(headerSource).toContain('z-index: var(--z-header');
    expect(navSource).toContain('const DashboardSelectorMount = styled.div');
    expect(navSource).toContain('overflow: visible;');
    expect(dashboardSelectorSource).toContain('z-index: var(--z-dropdown');
    expect(dashboardSelectorSource).toContain('max-height: min(70vh, 420px);');
    expect(dashboardSelectorSource).toContain('overflow-y: auto;');
    expect(dashboardSelectorSource).toContain('const toggleDropdown = () =>');
    expect(readZIndexToken('--z-header')).toBeGreaterThanOrEqual(1200);
    expect(readZIndexToken('--z-dropdown')).toBeGreaterThan(readZIndexToken('--z-header'));
  });
});
