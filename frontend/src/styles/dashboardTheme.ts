// src/styles/dashboardTheme.ts
/**
 * Shared dashboard theme definition to ensure consistent styling
 * between Styled Components and MUI
 */

// Define spacing scale (in pixels)
export const spacing = {
  none: '0',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// Define colors
export const colors = {
  // Primary colors
  primary: '#00ffff',
  primaryLight: '#7efbfb',
  primaryDark: '#00b8b8',
  
  // Secondary colors
  secondary: '#7851a9',
  secondaryLight: '#a67dd4',
  secondaryDark: '#5e3d90',
  
  // Background colors
  background: '#0a0a1a',
  paperLight: 'rgba(30, 30, 60, 0.3)',
  paperDark: 'rgba(20, 20, 40, 0.7)',
  
  // Text colors
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  
  // Accent colors
  error: '#ff416c',
  warning: '#ffb700',
  success: '#00bf8f',
  info: '#2196f3',
  
  // Gradients
  gradientPrimary: 'linear-gradient(90deg, #00ffff 0%, #7efbfb 100%)',
  gradientSecondary: 'linear-gradient(90deg, #7851a9 0%, #a67dd4 100%)',
};

// Define border radii
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
};

// Define breakpoints
export const breakpoints = {
  xs: '0px',
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1920px',
};

// Define transitions
export const transitions = {
  short: 'all 0.2s ease',
  medium: 'all 0.3s ease-in-out',
  long: 'all 0.5s ease-in-out',
};

// Define shadows
export const shadows = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
  md: '0 4px 8px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
};

// Define the complete theme object
const dashboardTheme = {
  colors,
  spacing,
  borderRadius,
  breakpoints,
  transitions,
  shadows,
};

export default dashboardTheme;
