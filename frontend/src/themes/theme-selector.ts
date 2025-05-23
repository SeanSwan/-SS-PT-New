/**
 * theme-selector.ts
 * Exports all themes and provides utility function to select theme
 */
import { Theme } from '@mui/material/styles';

// Import all theme variants
import berryDarkTheme from './berry-dark-theme';
import berryLightTheme from './berry-light-theme';
import berryOriginalTheme from './berry-original-theme';

// Interface for customization object from Redux store
interface Customization {
  themeType?: 'light' | 'dark' | 'original';
  [key: string]: any;
}

// Export individual themes for direct access
export {
  berryDarkTheme,
  berryLightTheme,
  berryOriginalTheme
};

/**
 * Utility function to select theme based on customization
 * @param customization - Customization object from Redux store
 * @returns Selected theme object
 */
export const getThemeFromCustomization = (customization?: Customization): Theme => {
  const themeType = customization?.themeType || 'dark';
  
  switch(themeType) {
    case 'light':
      return berryLightTheme;
    case 'original':
      return berryOriginalTheme;
    case 'dark':
    default:
      return berryDarkTheme;
  }
};

// Default export for backward compatibility
export default getThemeFromCustomization;