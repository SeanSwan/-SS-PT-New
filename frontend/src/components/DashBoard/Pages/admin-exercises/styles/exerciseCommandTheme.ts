/**
 * Exercise Command Center Theme
 * ============================
 * 
 * Pixel-perfect, ultra-mobile responsive theme system for Exercise Management
 * Extends existing admin command theme with exercise-specific enhancements
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Professional blue command center aesthetic
 * - Mobile-first responsive design system
 * - Pixel-perfect spacing and typography
 * - Enhanced gamification visual elements
 * - WCAG AA accessibility compliance
 * - GPU-accelerated animations
 */

import { keyframes } from 'styled-components';

// === EXERCISE COMMAND CENTER THEME ===
export const exerciseCommandTheme = {
  colors: {
    // Core Command Palette (inherited from admin theme)
    deepSpace: '#0a0a0f',
    commandBlue: '#1e3a8a',
    stellarBlue: '#3b82f6',
    cyberCyan: '#00ffff',
    stellarWhite: '#ffffff',
    energyBlue: '#0ea5e9',
    
    // Exercise-Specific Enhancements
    exerciseGreen: '#10b981',      // Exercise completion, success states
    formPerfect: '#00d9ff',        // Perfect form indicators
    nasmGold: '#fbbf24',           // NASM compliance highlights
    uploadProgress: '#6366f1',     // Upload progress indicators
    videoPreview: '#8b5cf6',       // Video preview elements
    
    // Status & Alert System
    warningAmber: '#f59e0b',       // Warnings
    successGreen: '#10b981',       // Success states
    criticalRed: '#ef4444',        // Critical alerts
    infoBlue: '#3b82f6',           // Information states
    
    // Content Hierarchy
    primaryText: '#ffffff',        // Primary text
    secondaryText: '#e5e7eb',      // Secondary text
    tertiaryText: '#9ca3af',       // Tertiary text
    placeholderText: '#6b7280',    // Placeholder text
    
    // Background System
    cardBackground: 'rgba(30, 58, 138, 0.1)',    // Glass cards
    modalBackground: 'rgba(10, 10, 15, 0.95)',   // Modal overlays
    inputBackground: 'rgba(30, 58, 138, 0.05)',  // Input fields
    hoverBackground: 'rgba(59, 130, 246, 0.1)',  // Hover states
  },
  
  gradients: {
    // Command Center Gradients
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #00ffff 100%)',
    adminNebula: 'linear-gradient(45deg, #0f172a 0%, #1e3a8a 50%, #0a0a0f 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #3b82f6 0%, #1e3a8a 50%, #0a0a0f 100%)',
    
    // Exercise-Specific Gradients
    exerciseCard: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    uploadZone: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
    progressBar: 'linear-gradient(90deg, #6366f1 0%, #00d9ff 100%)',
    achievementGlow: 'conic-gradient(from 0deg, #00ffff, #10b981, #fbbf24, #00ffff)',
    formValidation: 'linear-gradient(90deg, #10b981 0%, #00d9ff 100%)',
    videoPreview: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    
    // Interactive States
    buttonPrimary: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
    buttonSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    buttonWarning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    buttonDanger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  
  shadows: {
    // Command Center Shadows
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.6)',
    cardElevation: '0 8px 32px rgba(30, 58, 138, 0.2)',
    modalShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    
    // Exercise-Specific Shadows
    exerciseCard: '0 4px 20px rgba(30, 58, 138, 0.15)',
    exerciseCardHover: '0 8px 30px rgba(30, 58, 138, 0.25)',
    uploadZone: '0 4px 15px rgba(99, 102, 241, 0.2)',
    uploadZoneActive: '0 8px 25px rgba(99, 102, 241, 0.4)',
    achievementGlow: '0 0 20px rgba(0, 255, 255, 0.5)',
    formValidation: '0 2px 10px rgba(16, 185, 129, 0.3)',
    videoPreview: '0 4px 20px rgba(139, 92, 246, 0.3)',
    
    // Interactive Elements
    buttonElevation: '0 4px 15px rgba(59, 130, 246, 0.3)',
    buttonPressed: '0 2px 8px rgba(59, 130, 246, 0.4)',
    inputFocus: '0 0 0 3px rgba(59, 130, 246, 0.2)',
  },
  
  // === RESPONSIVE DESIGN SYSTEM ===
  breakpoints: {
    mobile: '320px',      // Mobile devices
    mobileLg: '480px',    // Large mobile devices
    tablet: '768px',      // Tablet devices
    desktop: '1024px',    // Desktop devices
    desktopLg: '1200px',  // Large desktop devices
    desktopXl: '1440px',  // Extra large desktop devices
  },
  
  // === PIXEL-PERFECT SPACING SYSTEM ===
  spacing: {
    // Base spacing units (4px base)
    xs: '0.25rem',        // 4px
    sm: '0.5rem',         // 8px
    md: '0.75rem',        // 12px
    lg: '1rem',           // 16px
    xl: '1.25rem',        // 20px
    '2xl': '1.5rem',      // 24px
    '3xl': '2rem',        // 32px
    '4xl': '2.5rem',      // 40px
    '5xl': '3rem',        // 48px
    '6xl': '4rem',        // 64px
    
    // Component-specific spacing
    cardPadding: '1.5rem',              // 24px
    cardPaddingMobile: '1rem',          // 16px
    sectionGap: '2rem',                 // 32px
    sectionGapMobile: '1.5rem',         // 24px
    elementGap: '1rem',                 // 16px
    elementGapMobile: '0.75rem',        // 12px
    inputPadding: '0.75rem 1rem',       // 12px 16px
    buttonPadding: '0.75rem 1.5rem',    // 12px 24px
    buttonPaddingSmall: '0.5rem 1rem',  // 8px 16px
  },
  
  // === TYPOGRAPHY SYSTEM ===
  typography: {
    fontFamily: {
      primary: '"Inter", "SF Pro Display", "Roboto", sans-serif',
      secondary: '"SF Pro Text", "Segoe UI", sans-serif',
      monospace: '"SF Mono", "Monaco", "Cascadia Code", monospace',
    },
    
    fontSizes: {
      // Responsive text sizes
      xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',     // 12px - 14px
      sm: 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',       // 14px - 16px
      base: 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',       // 16px - 18px
      lg: 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',      // 18px - 20px
      xl: 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',       // 20px - 24px
      '2xl': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',      // 24px - 30px
      '3xl': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)', // 30px - 36px
      '4xl': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',      // 36px - 48px
    },
    
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },
  
  // === BORDER RADIUS SYSTEM ===
  borderRadius: {
    none: '0',
    sm: '0.375rem',       // 6px
    md: '0.5rem',         // 8px
    lg: '0.75rem',        // 12px
    xl: '1rem',           // 16px
    '2xl': '1.25rem',     // 20px
    '3xl': '1.5rem',      // 24px
    full: '9999px',       // Perfect circle
    
    // Component-specific radii
    card: '0.75rem',      // 12px
    button: '0.5rem',     // 8px
    input: '0.5rem',      // 8px
    modal: '1rem',        // 16px
    badge: '9999px',      // Perfect pill
  },
  
  // === Z-INDEX SYSTEM ===
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
  
  // === TRANSITION SYSTEM ===
  transitions: {
    // Standard transitions
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Specialized transitions
    spring: '250ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: '300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};

// === ENHANCED KEYFRAME ANIMATIONS ===

// Command Center Animations
export const commandFloat = keyframes`
  0%, 100% { 
    transform: translateY(0) rotate(0deg); 
    opacity: 0.8; 
  }
  33% { 
    transform: translateY(-6px) rotate(0.5deg); 
    opacity: 1; 
  }
  66% { 
    transform: translateY(-3px) rotate(-0.5deg); 
    opacity: 0.95; 
  }
`;

export const commandPulse = keyframes`
  0%, 100% { 
    opacity: 0.7; 
    transform: scale(1); 
    filter: hue-rotate(0deg);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.01); 
    filter: hue-rotate(20deg);
  }
`;

export const dataOrbit = keyframes`
  0% { 
    transform: rotate(0deg) translateX(12px) rotate(0deg); 
    opacity: 0; 
  }
  10%, 90% { 
    opacity: 1; 
  }
  100% { 
    transform: rotate(360deg) translateX(12px) rotate(-360deg); 
    opacity: 0; 
  }
`;

// Exercise-Specific Animations
export const exerciseUpload = keyframes`
  0% { 
    transform: scale(1) rotate(0deg);
    opacity: 0.8;
  }
  50% { 
    transform: scale(1.05) rotate(180deg);
    opacity: 1;
  }
  100% { 
    transform: scale(1) rotate(360deg);
    opacity: 0.8;
  }
`;

export const progressFill = keyframes`
  0% { 
    width: 0%;
    background-position: 0% 50%;
  }
  100% { 
    background-position: 100% 50%;
  }
`;

export const achievementCelebration = keyframes`
  0% { 
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  25% { 
    transform: scale(1.2) rotate(90deg);
    opacity: 1;
  }
  50% { 
    transform: scale(1) rotate(180deg);
    opacity: 1;
  }
  75% { 
    transform: scale(1.1) rotate(270deg);
    opacity: 1;
  }
  100% { 
    transform: scale(1) rotate(360deg);
    opacity: 1;
  }
`;

export const formValidationSuccess = keyframes`
  0% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
  100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
`;

export const videoPreviewGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
  }
  50% { 
    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
  }
`;

export const uploadProgress = keyframes`
  0% { 
    background-position: -200px 0;
  }
  100% { 
    background-position: calc(200px + 100%) 0;
  }
`;

export const particleFloat = keyframes`
  0%, 100% { 
    transform: translateY(0px) translateX(0px) rotate(0deg);
    opacity: 0.4;
  }
  33% { 
    transform: translateY(-10px) translateX(5px) rotate(120deg);
    opacity: 0.8;
  }
  66% { 
    transform: translateY(-5px) translateX(-5px) rotate(240deg);
    opacity: 0.6;
  }
`;

export const commandAuroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Gamification Animations
export const levelUpCelebration = keyframes`
  0% { 
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  25% { 
    transform: scale(1.3) rotate(-90deg);
    opacity: 0.8;
  }
  50% { 
    transform: scale(0.9) rotate(0deg);
    opacity: 1;
  }
  75% { 
    transform: scale(1.1) rotate(90deg);
    opacity: 1;
  }
  100% { 
    transform: scale(1) rotate(180deg);
    opacity: 1;
  }
`;

export const confettiExplosion = keyframes`
  0% { 
    transform: scale(0) translateY(0);
    opacity: 1;
  }
  50% { 
    transform: scale(1) translateY(-20px);
    opacity: 0.8;
  }
  100% { 
    transform: scale(1.5) translateY(-40px);
    opacity: 0;
  }
`;

export const streakFire = keyframes`
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    filter: hue-rotate(0deg);
  }
  25% { 
    transform: scale(1.1) rotate(2deg);
    filter: hue-rotate(10deg);
  }
  50% { 
    transform: scale(1.05) rotate(-1deg);
    filter: hue-rotate(20deg);
  }
  75% { 
    transform: scale(1.08) rotate(1deg);
    filter: hue-rotate(10deg);
  }
`;

// === MEDIA QUERY HELPERS ===
export const mediaQueries = {
  mobile: `@media (max-width: ${exerciseCommandTheme.breakpoints.tablet})`,
  tablet: `@media (min-width: ${exerciseCommandTheme.breakpoints.tablet}) and (max-width: ${exerciseCommandTheme.breakpoints.desktop})`,
  desktop: `@media (min-width: ${exerciseCommandTheme.breakpoints.desktop})`,
  desktopLg: `@media (min-width: ${exerciseCommandTheme.breakpoints.desktopLg})`,
  
  // Hover support
  hover: '@media (hover: hover) and (pointer: fine)',
  
  // Reduced motion support
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // High contrast support
  highContrast: '@media (prefers-contrast: high)',
  
  // Dark mode support
  darkMode: '@media (prefers-color-scheme: dark)',
};

// === COMPONENT VARIANT SYSTEM ===
export const componentVariants = {
  // Button variants
  button: {
    primary: {
      background: exerciseCommandTheme.gradients.buttonPrimary,
      color: exerciseCommandTheme.colors.stellarWhite,
      boxShadow: exerciseCommandTheme.shadows.buttonElevation,
    },
    success: {
      background: exerciseCommandTheme.gradients.buttonSuccess,
      color: exerciseCommandTheme.colors.stellarWhite,
      boxShadow: exerciseCommandTheme.shadows.buttonElevation,
    },
    warning: {
      background: exerciseCommandTheme.gradients.buttonWarning,
      color: exerciseCommandTheme.colors.deepSpace,
      boxShadow: exerciseCommandTheme.shadows.buttonElevation,
    },
    danger: {
      background: exerciseCommandTheme.gradients.buttonDanger,
      color: exerciseCommandTheme.colors.stellarWhite,
      boxShadow: exerciseCommandTheme.shadows.buttonElevation,
    },
  },
  
  // Card variants
  card: {
    default: {
      background: exerciseCommandTheme.gradients.exerciseCard,
      boxShadow: exerciseCommandTheme.shadows.exerciseCard,
      borderRadius: exerciseCommandTheme.borderRadius.card,
    },
    elevated: {
      background: exerciseCommandTheme.gradients.exerciseCard,
      boxShadow: exerciseCommandTheme.shadows.exerciseCardHover,
      borderRadius: exerciseCommandTheme.borderRadius.card,
    },
    modal: {
      background: exerciseCommandTheme.colors.modalBackground,
      boxShadow: exerciseCommandTheme.shadows.modalShadow,
      borderRadius: exerciseCommandTheme.borderRadius.modal,
    },
  },
};

export default exerciseCommandTheme;
