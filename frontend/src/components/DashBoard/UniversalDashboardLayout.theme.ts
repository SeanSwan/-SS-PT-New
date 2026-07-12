import type { DefaultTheme } from 'styled-components';
import { universalTheme } from './UniversalDashboardLayout.styles';

const emptyThemeScale = {};

export const createUniversalDashboardTheme = (
  activeRole: string,
  parentTheme?: DefaultTheme
): DefaultTheme => ({
  ...universalTheme,
  ...parentTheme,
  id: parentTheme?.id ?? 'universal-dashboard',
  name: parentTheme?.name ?? 'Universal Dashboard',
  colors: parentTheme?.colors ?? emptyThemeScale,
  palette: parentTheme?.palette ?? emptyThemeScale,
  typography: {
    ...universalTheme.typography,
    ...parentTheme?.typography,
  },
  shadows: parentTheme?.shadows ?? emptyThemeScale,
  background: parentTheme?.background ?? emptyThemeScale,
  text: parentTheme?.text ?? emptyThemeScale,
  fonts: parentTheme?.fonts ?? emptyThemeScale,
  borders: parentTheme?.borders ?? emptyThemeScale,
  gradients: parentTheme?.gradients ?? emptyThemeScale,
  effects: parentTheme?.effects ?? emptyThemeScale,
  swan: parentTheme?.swan ?? emptyThemeScale,
  spacing: {
    ...universalTheme.spacing,
    ...parentTheme?.spacing,
  },
  breakpoints: parentTheme?.breakpoints ?? emptyThemeScale,
  glass: parentTheme?.glass ?? emptyThemeScale,
  components: parentTheme?.components ?? emptyThemeScale,
  currentRole: activeRole,
});
