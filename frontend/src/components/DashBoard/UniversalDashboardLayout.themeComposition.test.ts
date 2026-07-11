import { describe, expect, it } from 'vitest';
import type { DefaultTheme } from 'styled-components';
import { createUniversalDashboardTheme } from './UniversalDashboardLayout.theme';

const parentTheme = {
  id: 'crystalline-dark',
  name: 'Crystalline Dark',
  colors: { primary: '#60C0F0' },
  palette: { accent: '#8B5CF6' },
  typography: { heading: 'Plus Jakarta Sans' },
  shadows: { focus: 'outer-focus' },
  background: { primary: '#030712' },
  text: { primary: '#E0ECF4' },
  fonts: { ui: 'Sora' },
  borders: { subtle: 'outer-border' },
  gradients: { hero: 'outer-gradient' },
  effects: { grain: true },
  swan: { active: true },
  spacing: { custom: '72px' },
  breakpoints: { desktop: 1200 },
  glass: { panel: 'outer-glass' },
  components: { button: 'outer-button' },
} as unknown as DefaultTheme;

describe('UniversalDashboardLayout theme composition', () => {
  it('augments the outer palette theme instead of shadowing it', () => {
    const theme = createUniversalDashboardTheme('admin', parentTheme);

    expect(theme.id).toBe('crystalline-dark');
    expect(theme.colors).toBe(parentTheme.colors);
    expect(theme.palette).toBe(parentTheme.palette);
    expect(theme.background).toBe(parentTheme.background);
    expect(theme.shadows).toBe(parentTheme.shadows);
    expect(theme.admin).toBeTruthy();
    expect(theme.common).toBeTruthy();
    expect(theme.currentRole).toBe('admin');
  });

  it('preserves outer typography and spacing while adding dashboard defaults', () => {
    const theme = createUniversalDashboardTheme('trainer', parentTheme);

    expect(theme.typography.heading).toBe('Plus Jakarta Sans');
    expect(theme.typography.weights.bold).toBe(700);
    expect(theme.spacing.custom).toBe('72px');
    expect(theme.spacing.md).toBe('1rem');
  });
});
