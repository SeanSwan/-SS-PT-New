/**
 * Environment Configuration
 * 
 * Contains all environment-specific configuration for the application.
 * Centralized to make it easier to manage environment variables.
 */

// MCP Server URLs
export const MCP_CONFIG = {
  // Workout MCP Server
  WORKOUT_MCP_URL: process.env.REACT_APP_WORKOUT_MCP_URL || 'http://localhost:8000',
  
  // Gamification MCP Server
  GAMIFICATION_MCP_URL: process.env.REACT_APP_GAMIFICATION_MCP_URL || 'http://localhost:8001',
  
  // Authentication settings
  AUTH_TOKEN_KEY: 'auth_token',
  
  // Default timeout (in milliseconds)
  DEFAULT_TIMEOUT: 10000
};

// API URLs
export const API_CONFIG = {
  // Base API URL
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH_TOKEN: '/auth/refresh-token',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User endpoints
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/update-profile',
    CHANGE_PASSWORD: '/user/change-password',
  },
  
  // Client endpoints
  CLIENT: {
    GET_ALL: '/clients',
    GET_BY_ID: '/clients/',
    CREATE: '/clients',
    UPDATE: '/clients/',
    DELETE: '/clients/',
    GET_WORKOUTS: '/clients/workouts/',
    GET_SESSIONS: '/clients/sessions/',
  },
  
  // Trainer endpoints
  TRAINER: {
    GET_ALL: '/trainers',
    GET_BY_ID: '/trainers/',
    CREATE: '/trainers',
    UPDATE: '/trainers/',
    DELETE: '/trainers/',
  },
  
  // Session endpoints
  SESSION: {
    GET_ALL: '/sessions',
    GET_BY_ID: '/sessions/',
    CREATE: '/sessions',
    UPDATE: '/sessions/',
    DELETE: '/sessions/',
  },
  
  // Workout endpoints
  WORKOUT: {
    GET_ALL: '/workouts',
    GET_BY_ID: '/workouts/',
    CREATE: '/workouts',
    UPDATE: '/workouts/',
    DELETE: '/workouts/',
  },
  
  // Product endpoints
  PRODUCT: {
    GET_ALL: '/products',
    GET_BY_ID: '/products/',
    CREATE: '/products',
    UPDATE: '/products/',
    DELETE: '/products/',
    GET_BY_CATEGORY: '/products/category/',
  },
  
  // Order endpoints
  ORDER: {
    GET_ALL: '/orders',
    GET_BY_ID: '/orders/',
    CREATE: '/orders',
    UPDATE: '/orders/',
    DELETE: '/orders/',
    GET_USER_ORDERS: '/orders/user/',
  },
};

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_GAMIFICATION: process.env.REACT_APP_ENABLE_GAMIFICATION === 'true' || true,
  ENABLE_FOOD_TRACKER: process.env.REACT_APP_ENABLE_FOOD_TRACKER === 'true' || true,
  ENABLE_SOCIAL_FEATURES: process.env.REACT_APP_ENABLE_SOCIAL_FEATURES === 'true' || false,
  ENABLE_DANCE_WORKOUTS: process.env.REACT_APP_ENABLE_DANCE_WORKOUTS === 'true' || false,
  ENABLE_CORPORATE_WELLNESS: process.env.REACT_APP_ENABLE_CORPORATE_WELLNESS === 'true' || false,
};

// App configuration
export const APP_CONFIG = {
  APP_NAME: 'SwanStudios Fitness',
  APP_VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'en',
  SUPPORT_EMAIL: 'support@swanstudios.com',
  ACCESSIBILITY_CONTACT: 'accessibility@swanstudios.com',
  COPYRIGHT_YEAR: new Date().getFullYear(),
  COMPANY_NAME: 'Swan Studios LLC',
};

// Default export for convenient import
export default {
  MCP_CONFIG,
  API_CONFIG,
  FEATURE_FLAGS,
  APP_CONFIG
};