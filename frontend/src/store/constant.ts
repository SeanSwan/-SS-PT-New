/**
 * Application Constants
 * 
 * This file contains global constants used throughout the application
 * for consistent styling, theming, and configuration.
 */

// Grid spacing used for consistent layout throughout the application
export const gridSpacing = 2; // Reduced from 3 to 2 for more compact and wider content layout

// Theme configuration constants
export const THEME_CONFIG = {
  // Default font sizes for various elements (in pixels)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
  },
  
  // Breakpoints for responsive design (in pixels)
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
  
  // Default border radius values
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: '50%',
  },
  
  // Transition durations in milliseconds
  transitions: {
    short: 150,
    medium: 300,
    long: 500,
  },
  
  // Common z-index values
  zIndex: {
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

// API related constants
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  
  profile: {
    get: '/profile',
    update: '/profile/update',
  },
  
  clients: {
    list: '/clients',
    details: '/clients/:id',
    progress: '/clients/:id/progress',
    sessions: '/clients/:id/sessions',
  },
  
  sessions: {
    list: '/sessions',
    create: '/sessions/create',
    update: '/sessions/:id',
    delete: '/sessions/:id',
  },
  
  workouts: {
    list: '/workouts',
    popular: '/workouts/popular',
    create: '/workouts/create',
    details: '/workouts/:id',
  },
  
  metrics: {
    overview: '/metrics/overview',
    progress: '/metrics/progress',
    retention: '/metrics/retention',
  },
};

// Local storage keys
export const STORAGE_KEYS = {
  authToken: 'auth_token',
  user: 'user_data',
  theme: 'app_theme',
  language: 'app_language',
  preferences: 'user_preferences',
};

// Permission levels for role-based access control
export const PERMISSIONS = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  CLIENT: 'client',
  GUEST: 'guest',
};