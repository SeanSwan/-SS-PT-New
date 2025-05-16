// Frontend config file - config.js
const isProd = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';

// API URLs
export const API_BASE_URL = ''; // Empty string relies on proxy for /api paths
export const DEV_BACKEND_URL = 'http://localhost:10000';
export const PROD_BACKEND_URL = 'https://swanstudios.onrender.com';

// Auth configuration
export const AUTH_CONFIG = {
  tokenKey: 'swanstudios_token',
  refreshTokenKey: 'swanstudios_refresh_token',
  tokenRefreshThresholdMs: 10 * 60 * 1000, // 10 minutes
};

// Application settings
export const APP_CONFIG = {
  appName: 'Swan Studios',
  logoPath: '/Logo.png',
  contactEmail: 'ogpswan@yahoo.com',
  supportPhone: '+18777804236',
};

// Feature flags
export const FEATURES = {
  enableRegistration: true,
  enablePasswordReset: true,
  enableSocialLogin: false,
  enableNotifications: true,
};

// Logging configuration
export const LOGGING = {
  enableDetailedLogs: !isProd,
  logApiCalls: !isProd,
  logAuthEvents: true,
};

console.log(`Running in ${isProd ? 'production' : 'development'} mode`);
console.log(`API Base URL: ${API_BASE_URL || '(using proxy for /api)'}`);

export default {
  API_BASE_URL,
  DEV_BACKEND_URL,
  PROD_BACKEND_URL,
  AUTH_CONFIG,
  APP_CONFIG,
  FEATURES,
  LOGGING,
};