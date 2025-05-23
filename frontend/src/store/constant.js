// Application Constants

// Theme constants
export const gridSpacing = 3;
export const drawerWidth = 260;
export const appDrawerWidth = 320;

// Theme Configuration
export const THEME_CONFIG = {
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12
  },
  transitions: {
    short: 150,
    medium: 300,
    long: 500
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem'
  },
  spacing: {
    unit: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  }
};

// API Constants - Fixed for Vite environment variables
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// UI Constants
export const defaultFont = "'Roboto', sans-serif";
export const PRIMARY_COLOR = '#00ffff'; // Cyan/teal color from your app
export const SECONDARY_COLOR = '#7b2cbf'; // Purple color from your app
export const BACKGROUND_COLOR = '#1a1a1a'; // Dark background
export const TEXT_PRIMARY = '#ffffff'; // White text
export const TEXT_SECONDARY = '#b3b3b3'; // Light gray text

// Animation constants (matches your existing animations)
export const motionDuration = 0.3; // Matches your reduced animation time
export const motionEase = [0.76, 0, 0.24, 1]; // Matches your ease values in header

// Dashboard card sizes
export const smallCardHeight = 120;
export const mediumCardHeight = 220;
export const largeCardHeight = 320;

// Routes
export const DASHBOARD_PATH = '/dashboard';
export const AUTH_PATH = '/auth';
export const HOME_PATH = '/';

export default {
  gridSpacing,
  drawerWidth,
  appDrawerWidth,
  THEME_CONFIG,
  API_BASE_URL,
  defaultFont,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  BACKGROUND_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  motionDuration,
  motionEase,
  smallCardHeight,
  mediumCardHeight,
  largeCardHeight,
  DASHBOARD_PATH,
  AUTH_PATH,
  HOME_PATH
};