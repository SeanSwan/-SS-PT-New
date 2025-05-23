// Frontend config file - config.js
const isProd = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';

// Create a forceDev utility for development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.adminAccess = {
    force: function() {
      localStorage.setItem('bypass_admin_verification', 'true');
      console.log('Admin access bypass flag set. Reloading...');
      window.location.reload();
      return 'Forced admin access and reloaded';
    },
    reset: function() {
      localStorage.removeItem('bypass_admin_verification');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('Auth reset. Reloading...');
      window.location.reload();
      return 'Reset auth and reloaded';
    },
    showUser: function() {
      return {
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
        hasToken: !!localStorage.getItem('token'),
        bypass: !!localStorage.getItem('bypass_admin_verification')
      };
    }
  };
  console.log('[DEV MODE] Admin access utility available. Type window.adminAccess.force() in console to force admin access.');
}

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
  bypassAdminVerificationInDev: true, // Bypass admin verification in development mode
  useProtectedRoutes: true, // Enable/disable protected routes
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