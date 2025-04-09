// Configuration file for the Swan Studios application
// This file defines key configuration values used throughout the application

// API Base URL configuration
// In development, set to empty string to use the proxy defined in vite.config.js
// In production, set to the actual backend URL
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://swanstudios.onrender.com'  // Production backend URL
  : '';  // Empty in development (will use proxy)

// Auth configuration
export const AUTH_CONFIG = {
  tokenKey: 'swan_auth_token',
  refreshTokenKey: 'swan_refresh_token',
  tokenRefreshThresholdMs: 5 * 60 * 1000  // 5 minutes
};

// Backend URL for direct API calls (only used in development)
// This should match the proxy target in vite.config.js
export const DEV_BACKEND_URL = 'http://localhost:5000';

// Application settings
export const APP_CONFIG = {
  defaultPageSize: 10,
  maxUploadSizeMB: 5,
  sessionTimeoutMinutes: 30,
  appName: 'Swan Studios',
  copyright: `© ${new Date().getFullYear()} Swan Studios LLC. All rights reserved.`
};

// Media asset paths (use these constants instead of hardcoding paths)
export const MEDIA_PATHS = {
  logo: '/Logo.png',
  wavesVideo: '/Waves.mp4',
  videoPosters: {
    waves: '/video-poster.jpg'
  },
  profiles: {
    male1: '/male1.jpg',
    male2: '/male2.jpg',
    maleBlk: '/maleblk.jpg',
    femaleAsi: '/femaleasi.jpg',
    femaleLat: '/femalelat.jpg',
    femaleOldWht: '/femaleoldwht.jpg',
    femaleWht: '/femalewht.jpg'
  }
};

// Feature flags
export const FEATURES = {
  enableReports: true,
  enableNotifications: true,
  enableScheduling: true,
  enableChat: true
};