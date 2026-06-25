import type { DefaultTheme } from 'styled-components';
import { universalTheme } from './UniversalDashboardLayout.styles';

const emptyThemeScale = {};

export const createUniversalDashboardTheme = (activeRole: string): DefaultTheme => ({
  ...universalTheme,
  id: 'universal-dashboard',
  name: 'Universal Dashboard',
  colors: emptyThemeScale,
  palette: emptyThemeScale,
  typography: universalTheme.typography,
  shadows: emptyThemeScale,
  background: emptyThemeScale,
  text: emptyThemeScale,
  fonts: emptyThemeScale,
  borders: emptyThemeScale,
  gradients: emptyThemeScale,
  effects: emptyThemeScale,
  swan: emptyThemeScale,
  spacing: universalTheme.spacing,
  breakpoints: emptyThemeScale,
  glass: emptyThemeScale,
  components: emptyThemeScale,
  currentRole: activeRole,
});
