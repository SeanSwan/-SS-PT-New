/**
 * shadows.ts
 * Custom shadow definitions for the theme
 */
import { alpha, Theme } from '@mui/material/styles';

// Type for custom shadows
interface CustomShadows {
  z1: string;
  z8: string;
  z12: string;
  z16: string;
  z20: string;
  z24: string;
  primary: string;
  secondary: string;
  orange: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * Creates custom shadow definitions based on a color
 * @param theme - Material-UI theme object
 * @param color - Base color for shadows
 * @returns Custom shadow definitions
 */
function createCustomShadow(theme: Theme, color: string): CustomShadows {
  const transparent = alpha(color, 0.24);
  
  // Safely access orange color with fallback to secondary or warning
  const orangeColor = theme.palette.orange?.main || 
                     theme.palette.warning?.main || 
                     '#ED6C02'; // Default MUI orange color
  
  return {
    z1: `0 1px 2px 0 ${transparent}`,
    z8: `0 8px 16px 0 ${transparent}`,
    z12: `0 12px 24px 0 ${transparent} 0 10px 20px 0 ${transparent}`,
    z16: `0 0 3px 0 ${transparent} 0 14px 28px -5px ${transparent}`,
    z20: `0 0 3px 0 ${transparent} 0 18px 36px -5px ${transparent}`,
    z24: `0 0 6px 0 ${transparent} 0 21px 44px 0 ${transparent}`,

    primary: `0px 12px 14px 0px ${alpha(theme.palette.primary.main, 0.3)}`,
    secondary: `0px 12px 14px 0px ${alpha(theme.palette.secondary.main, 0.3)}`,
    orange: `0px 12px 14px 0px ${alpha(orangeColor, 0.3)}`,
    success: `0px 12px 14px 0px ${alpha(theme.palette.success.main, 0.3)}`,
    warning: `0px 12px 14px 0px ${alpha(theme.palette.warning.main, 0.3)}`,
    error: `0px 12px 14px 0px ${alpha(theme.palette.error.main, 0.3)}`
  };
}

/**
 * Generates custom shadows based on theme
 * @param mode - Theme mode (light/dark)
 * @param theme - Material-UI theme object
 * @returns Custom shadow definitions
 */
export default function customShadows(mode: 'light' | 'dark', theme: Theme): CustomShadows {
  return createCustomShadow(theme, theme.palette.grey[900]);
}