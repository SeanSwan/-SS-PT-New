/**
 * themes/index.js
 * Exports all themes and provides utility function to select theme
 */

// Import all theme variants
import berryDarkTheme from './berryDarkTheme';
import berryLightTheme from './berryLightTheme';
import berryOriginalTheme from './berryOriginalTheme';

// Export individual themes for direct access
export {
  berryDarkTheme,
  berryLightTheme,
  berryOriginalTheme
};

/**
 * Utility function to select theme based on customization
 * @param {Object} customization - Customization object from Redux store
 * @returns {Object} Selected theme object
 */
export const getThemeFromCustomization = (customization) => {
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