// Frontend config file - config.js
import { logger } from '@/utils/logger';

const isProd = import.meta.env.PROD || import.meta.env.VITE_APP_ENV === 'production';

// Dev-only auth inspection/reset utility.
//
// `force()` was removed 2026-08-14. It wrote `bypass_admin_verification` and
// `admin_emergency_mode`, and NOTHING has read either flag since the emergency
// bypass branch was retired from protected-route.tsx — verified by grepping a
// production build (0 reads, 0 sourcemaps). A writer with no reader is not a
// feature, it is bait: the next person to find these keys re-adds the consumer
// and silently restores an admin bypass. The remaining helpers only CLEAR and
// REPORT local state, which stays useful for users carrying stale flags.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.adminAccess = {
    reset: function() {
      localStorage.removeItem('bypass_admin_verification');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_emergency_mode');
      logger.log('Auth reset. Reloading...');
      window.location.reload();
      return 'Reset auth and reloaded';
    },
    showUser: function() {
      return {
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
        hasToken: !!localStorage.getItem('token'),
        bypass: !!localStorage.getItem('bypass_admin_verification'),
        emergencyMode: !!localStorage.getItem('admin_emergency_mode')
      };
    }
  };
  logger.log('[DEV MODE] Auth utility available: window.adminAccess.reset() clears local auth state, .showUser() inspects it.');
}

// API URLs
export const API_BASE_URL = ''; // Empty string relies on proxy for /api paths
export const DEV_BACKEND_URL = 'http://localhost:10000';
export const PROD_BACKEND_URL = 'https://sswanstudios.com';

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
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'support@sswanstudios.com',
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

logger.log(`Running in ${isProd ? 'production' : 'development'} mode`);
logger.log(`API Base URL: ${API_BASE_URL || '(using proxy for /api)'}`);

export default {
  API_BASE_URL,
  DEV_BACKEND_URL,
  PROD_BACKEND_URL,
  AUTH_CONFIG,
  APP_CONFIG,
  FEATURES,
  LOGGING,
};
