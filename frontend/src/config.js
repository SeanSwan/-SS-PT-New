/**
 * src/config.js
 * Application Configuration
 * Central configuration settings for Swan Studios application
 */

// Environment-specific API base URL
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://swanstudios.onrender.com' // Production backend URL
  : ''; // Empty for development (using proxy)

// Authentication configuration
export const AUTH_CONFIG = {
  tokenKey: 'token',
  refreshTokenKey: 'refreshToken',
  tokenRefreshThresholdMs: 5 * 60 * 1000, // 5 minutes before expiry
  sessionExpiryCheckIntervalMs: 60 * 1000 // Check token expiration every minute
};

// UI configuration defaults
const config = {
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8
};

export default config;