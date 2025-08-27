/**
 * Header Safety Enhancement Patch
 * Adds critical theme fallbacks and error prevention
 */

// This patch adds safety fallbacks to the most critical theme access points
// to prevent undefined errors during theme switching or initialization

const themeSafetyPatches = {
  // Common theme fallbacks for galaxy header
  primaryColor: '#00ffff',
  accentColor: '#ff6b9d', 
  backgroundColor: 'rgba(10, 10, 26, 0.9)',
  textColor: 'rgba(255, 255, 255, 0.9)',
  
  // Safe theme property access helper
  safeThemeAccess: (theme, path, fallback) => {
    try {
      const value = path.split('.').reduce((obj, key) => obj?.[key], theme);
      return value || fallback;
    } catch (error) {
      console.warn(`Theme property ${path} not found, using fallback:`, fallback);
      return fallback;
    }
  }
};

// Export theme safety utilities
export { themeSafetyPatches };

console.log('🛡️ Theme safety enhancements ready for header component');
