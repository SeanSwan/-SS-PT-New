/**
 * Application Configuration
 * Central configuration for Swan Studios application
 */

// Environment-specific API base URL
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://swanstudios.onrender.com' // Your Render backend URL
  : ''; // Empty for development (using proxy)

// Authentication configuration
export const AUTH_CONFIG = {
  useProtectedRoutes: true,
  tokenKey: 'token',
  refreshTokenKey: 'refreshToken',
  tokenRefreshThresholdMs: 5 * 60 * 1000, // 5 minutes before expiry
  sessionExpiryCheckIntervalMs: 60 * 1000 // Check token expiration every minute
};

// UI theme configuration
export const THEME_CONFIG = {
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8
};

// Navigation paths
export const ROUTES = {
  DASHBOARD: '/sample-page',
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile'
};

// Export combined configuration
const config = {
  api: { baseUrl: API_BASE_URL },
  auth: AUTH_CONFIG,
  theme: THEME_CONFIG,
  routes: ROUTES
};

export default config;