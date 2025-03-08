/**
 * Berry Admin Dashboard Configuration
 */

const config = {
  // Base paths
  basename: '',
  defaultPath: '/dashboard',
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8,

  // Dashboard paths
  DASHBOARD_PATH: '/dashboard',
  
  // Theme settings
  presetColor: 'default', // default, theme1, theme2, theme3, theme4, theme5, theme6
  locale: 'en', // 'en' - English, 'fr' - French, 'ro' - Romanian
  rtlLayout: false,
  container: false,
  
  // Other settings
  mode: 'dark', // 'light' or 'dark'
  useCustomization: true, // Flag to use customization drawer
};

export const {
  DASHBOARD_PATH
} = config;

export default config;