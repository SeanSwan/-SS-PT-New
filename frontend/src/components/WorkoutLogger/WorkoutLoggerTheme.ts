/**
 * Workout Logger - Stellar Command Center Theme
 * ============================================
 * Advanced theming system for the NASM-compliant workout logger
 * 
 * BLUEPRINT IMPLEMENTATION - STELLAR COMMAND CENTER AESTHETICS:
 * This implements the stellar command center theme from The Grand Unifying
 * Blueprint v43.2, featuring professional blue-focused styling with
 * tactical precision for in-gym tablet use.
 * 
 * ✅ Tactical command center aesthetics  
 * ✅ Tablet-optimized touch interfaces
 * ✅ High contrast for gym lighting
 * ✅ Professional trainer authority
 * ✅ NASM-compliant color coding
 * ✅ Accessibility-first design
 */

import { createTheme } from '@mui/material/styles';
import { keyframes } from 'styled-components';

// ==================== CORE THEME PALETTE ====================

export const workoutLoggerTheme = {
  // Core Command Colors
  colors: {
    // Primary Command Palette
    deepSpace: '#0a0a0f',
    commandNavy: '#1e3a8a',           // Primary backgrounds
    stellarAuthority: '#3b82f6',      // Primary actions, active states
    cyberIntelligence: '#0ea5e9',     // Data highlights, progress indicators
    tacticalAccent: '#0891b2',        // Secondary actions, hover states
    
    // NASM Phase Colors (High Contrast for Gym Use)
    foundationGreen: '#16a34a',       // Phase 1: Foundation/Activation
    strengthBlue: '#2563eb',          // Phase 2: Strength/Control  
    powerOrange: '#ea580c',           // Phase 3: Power/Skill
    recoveryPurple: '#7c3aed',        // Phase 4: Recovery
    
    // Exercise Category Colors
    coreGold: '#f59e0b',              // Core exercises
    balanceEmerald: '#059669',        // Balance exercises
    plyoRed: '#dc2626',               // Plyometric exercises
    resistanceSteel: '#475569',       // Resistance training
    cardioRose: '#e11d48',            // Cardio exercises
    flexibilityLavender: '#8b5cf6',   // Flexibility/stretching
    
    // Status & Feedback Colors
    successGreen: '#10b981',          // Completed, excellent form
    warningAmber: '#f59e0b',          // Attention needed, moderate form
    criticalRed: '#ef4444',           // Error, poor form
    infoBlue: '#06b6d4',             // Information, tips
    neutralGray: '#6b7280',           // Disabled, neutral states
    
    // Text Hierarchy
    stellarWhite: '#ffffff',          // Primary text
    platinumSilver: '#e5e7eb',        // Secondary text
    cosmicGray: '#9ca3af',            // Tertiary text, placeholders
    voidBlack: '#000000',             // Deep contrast text
    
    // Interface Elements
    commandGlass: 'rgba(30, 58, 138, 0.15)',    // Glass backgrounds
    tacticalBorder: 'rgba(59, 130, 246, 0.3)',  // Component borders
    energyGlow: 'rgba(59, 130, 246, 0.6)',      // Active glow effects
    shadowDepth: 'rgba(0, 0, 0, 0.4)'           // Depth shadows
  },
  
  // Advanced Gradients
  gradients: {
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #0891b2 100%)',
    tacticalGlass: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
    energyFlow: 'radial-gradient(ellipse at center, #3b82f6 0%, #1e3a8a 70%, #0a0a0f 100%)',
    successGradient: 'linear-gradient(135deg, #16a34a 0%, #10b981 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)',
    criticalGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    dataVisualization: 'linear-gradient(90deg, #0ea5e9 0%, #3b82f6 50%, #1e3a8a 100%)',
    
    // NASM Phase Gradients
    foundationGradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
    strengthGradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    powerGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    recoveryGradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
  },
  
  // Professional Shadows & Effects
  shadows: {
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.4)',
    tacticalDepth: '0 8px 32px rgba(0, 0, 0, 0.3)',
    energyPulse: '0 0 20px rgba(59, 130, 246, 0.6)',
    dataCard: '0 4px 20px rgba(30, 58, 138, 0.2)',
    floatingPanel: '0 12px 40px rgba(0, 0, 0, 0.4)',
    insetGlow: 'inset 0 0 20px rgba(59, 130, 246, 0.2)',
    
    // Form Element Shadows  
    inputFocus: '0 0 0 3px rgba(59, 130, 246, 0.3)',
    buttonActive: '0 2px 8px rgba(59, 130, 246, 0.4)',
    cardHover: '0 8px 25px rgba(59, 130, 246, 0.25)'
  },
  
  // Typography Scale
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800
    },
    sizes: {
      xs: '0.75rem',      // 12px - Small labels
      sm: '0.875rem',     // 14px - Secondary text
      base: '1rem',       // 16px - Body text
      lg: '1.125rem',     // 18px - Large body
      xl: '1.25rem',      // 20px - Subheadings
      '2xl': '1.5rem',    // 24px - Headings
      '3xl': '1.875rem',  // 30px - Large headings
      '4xl': '2.25rem',   // 36px - Display text
      '5xl': '3rem'       // 48px - Hero text
    }
  },
  
  // Responsive Spacing System
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
    '5xl': '8rem'     // 128px
  },
  
  // Border Radius System
  borderRadius: {
    none: '0',
    sm: '0.25rem',     // 4px
    base: '0.5rem',    // 8px
    md: '0.75rem',     // 12px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    '2xl': '2rem',     // 32px
    full: '9999px'     // Circular
  },
  
  // Animation System
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms'
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  
  // Breakpoints for Responsive Design
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1280px',
    wide: '1536px'
  }
};

// ==================== KEYFRAME ANIMATIONS ====================

export const workoutAnimations = {
  // Command Center Animations
  commandFloat: keyframes`
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
    33% { transform: translateY(-6px) rotate(0.5deg); opacity: 1; }
    66% { transform: translateY(-3px) rotate(-0.5deg); opacity: 0.95; }
  `,
  
  energyPulse: keyframes`
    0%, 100% { 
      opacity: 0.7; 
      transform: scale(1); 
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }
    50% { 
      opacity: 1; 
      transform: scale(1.02); 
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
    }
  `,
  
  dataFlow: keyframes`
    0% { 
      background-position: 0% 50%; 
      opacity: 0.8;
    }
    50% { 
      background-position: 100% 50%; 
      opacity: 1;
    }
    100% { 
      background-position: 0% 50%; 
      opacity: 0.8;
    }
  `,
  
  // Workout-Specific Animations
  setCompleted: keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  `,
  
  exerciseAdded: keyframes`
    0% { 
      opacity: 0; 
      transform: translateX(-20px) scale(0.9); 
    }
    100% { 
      opacity: 1; 
      transform: translateX(0) scale(1); 
    }
  `,
  
  formValidation: keyframes`
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  `,
  
  progressBar: keyframes`
    0% { width: 0%; }
    100% { width: var(--progress-width); }
  `,
  
  timerTick: keyframes`
    0% { color: rgba(255, 255, 255, 0.7); }
    50% { color: rgba(59, 130, 246, 1); }
    100% { color: rgba(255, 255, 255, 0.7); }
  `,
  
  rpeGlow: keyframes`
    0% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
    100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
  `
};

// ==================== MATERIAL-UI THEME CONFIGURATION ====================

export const muiWorkoutTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: workoutLoggerTheme.colors.stellarAuthority,
      light: workoutLoggerTheme.colors.cyberIntelligence,
      dark: workoutLoggerTheme.colors.commandNavy,
      contrastText: workoutLoggerTheme.colors.stellarWhite
    },
    secondary: {
      main: workoutLoggerTheme.colors.tacticalAccent,
      light: workoutLoggerTheme.colors.cyberIntelligence,
      dark: workoutLoggerTheme.colors.commandNavy,
      contrastText: workoutLoggerTheme.colors.stellarWhite
    },
    success: {
      main: workoutLoggerTheme.colors.successGreen,
      light: workoutLoggerTheme.colors.foundationGreen,
      dark: '#065f46',
      contrastText: workoutLoggerTheme.colors.stellarWhite
    },
    warning: {
      main: workoutLoggerTheme.colors.warningAmber,
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: workoutLoggerTheme.colors.voidBlack
    },
    error: {
      main: workoutLoggerTheme.colors.criticalRed,
      light: '#f87171',
      dark: '#b91c1c',
      contrastText: workoutLoggerTheme.colors.stellarWhite
    },
    info: {
      main: workoutLoggerTheme.colors.infoBlue,
      light: '#67e8f9',
      dark: '#0891b2',
      contrastText: workoutLoggerTheme.colors.stellarWhite
    },
    background: {
      default: workoutLoggerTheme.colors.deepSpace,
      paper: workoutLoggerTheme.colors.commandGlass
    },
    text: {
      primary: workoutLoggerTheme.colors.stellarWhite,
      secondary: workoutLoggerTheme.colors.platinumSilver,
      disabled: workoutLoggerTheme.colors.cosmicGray
    },
    divider: workoutLoggerTheme.colors.tacticalBorder
  },
  
  typography: {
    fontFamily: workoutLoggerTheme.typography.fontFamily,
    h1: {
      fontSize: workoutLoggerTheme.typography.sizes['5xl'],
      fontWeight: workoutLoggerTheme.typography.weights.bold,
      lineHeight: 1.2
    },
    h2: {
      fontSize: workoutLoggerTheme.typography.sizes['4xl'],
      fontWeight: workoutLoggerTheme.typography.weights.semibold,
      lineHeight: 1.3
    },
    h3: {
      fontSize: workoutLoggerTheme.typography.sizes['3xl'],
      fontWeight: workoutLoggerTheme.typography.weights.semibold,
      lineHeight: 1.4
    },
    h4: {
      fontSize: workoutLoggerTheme.typography.sizes['2xl'],
      fontWeight: workoutLoggerTheme.typography.weights.medium,
      lineHeight: 1.4
    },
    h5: {
      fontSize: workoutLoggerTheme.typography.sizes.xl,
      fontWeight: workoutLoggerTheme.typography.weights.medium,
      lineHeight: 1.5
    },
    h6: {
      fontSize: workoutLoggerTheme.typography.sizes.lg,
      fontWeight: workoutLoggerTheme.typography.weights.medium,
      lineHeight: 1.5
    },
    body1: {
      fontSize: workoutLoggerTheme.typography.sizes.base,
      fontWeight: workoutLoggerTheme.typography.weights.normal,
      lineHeight: 1.6
    },
    body2: {
      fontSize: workoutLoggerTheme.typography.sizes.sm,
      fontWeight: workoutLoggerTheme.typography.weights.normal,
      lineHeight: 1.5
    },
    caption: {
      fontSize: workoutLoggerTheme.typography.sizes.xs,
      fontWeight: workoutLoggerTheme.typography.weights.normal,
      lineHeight: 1.4
    }
  },
  
  shape: {
    borderRadius: 12
  },
  
  components: {
    // Button Overrides
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: workoutLoggerTheme.borderRadius.md,
          textTransform: 'none',
          fontWeight: workoutLoggerTheme.typography.weights.medium,
          padding: `${workoutLoggerTheme.spacing.md} ${workoutLoggerTheme.spacing.lg}`,
          transition: `all ${workoutLoggerTheme.animations.duration.normal} ${workoutLoggerTheme.animations.easing.easeInOut}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: workoutLoggerTheme.shadows.buttonActive
          }
        },
        containedPrimary: {
          background: workoutLoggerTheme.gradients.commandCenter,
          '&:hover': {
            background: workoutLoggerTheme.gradients.commandCenter,
            boxShadow: workoutLoggerTheme.shadows.commandGlow
          }
        }
      }
    },
    
    // TextField Overrides
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: workoutLoggerTheme.borderRadius.md,
            backgroundColor: workoutLoggerTheme.colors.commandGlass,
            '& fieldset': {
              borderColor: workoutLoggerTheme.colors.tacticalBorder
            },
            '&:hover fieldset': {
              borderColor: workoutLoggerTheme.colors.stellarAuthority
            },
            '&.Mui-focused fieldset': {
              borderColor: workoutLoggerTheme.colors.stellarAuthority,
              boxShadow: workoutLoggerTheme.shadows.inputFocus
            }
          }
        }
      }
    },
    
    // Card Overrides
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: workoutLoggerTheme.colors.commandGlass,
          border: `1px solid ${workoutLoggerTheme.colors.tacticalBorder}`,
          borderRadius: workoutLoggerTheme.borderRadius.lg,
          backdropFilter: 'blur(20px)',
          transition: `all ${workoutLoggerTheme.animations.duration.normal} ${workoutLoggerTheme.animations.easing.easeInOut}`,
          '&:hover': {
            boxShadow: workoutLoggerTheme.shadows.cardHover,
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    
    // Chip Overrides
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: workoutLoggerTheme.borderRadius.base,
          fontWeight: workoutLoggerTheme.typography.weights.medium
        }
      }
    }
  }
});

// ==================== COMPONENT-SPECIFIC THEMES ====================

export const componentThemes = {
  // Exercise Card Theme
  exerciseCard: {
    background: workoutLoggerTheme.colors.commandGlass,
    border: `1px solid ${workoutLoggerTheme.colors.tacticalBorder}`,
    borderRadius: workoutLoggerTheme.borderRadius.lg,
    padding: workoutLoggerTheme.spacing.lg,
    boxShadow: workoutLoggerTheme.shadows.dataCard,
    '&:hover': {
      boxShadow: workoutLoggerTheme.shadows.cardHover,
      transform: 'translateY(-2px)'
    }
  },
  
  // Set Logging Grid Theme
  setGrid: {
    background: workoutLoggerTheme.colors.commandGlass,
    border: `1px solid ${workoutLoggerTheme.colors.tacticalBorder}`,
    borderRadius: workoutLoggerTheme.borderRadius.md,
    '& .grid-header': {
      background: workoutLoggerTheme.gradients.tacticalGlass,
      color: workoutLoggerTheme.colors.stellarWhite,
      fontWeight: workoutLoggerTheme.typography.weights.semibold
    },
    '& .grid-row': {
      borderBottom: `1px solid ${workoutLoggerTheme.colors.tacticalBorder}`,
      '&:hover': {
        background: 'rgba(59, 130, 246, 0.1)'
      }
    }
  },
  
  // RPE Slider Theme
  rpeSlider: {
    '& .MuiSlider-thumb': {
      background: workoutLoggerTheme.gradients.commandCenter,
      boxShadow: workoutLoggerTheme.shadows.energyPulse,
      '&:hover': {
        boxShadow: workoutLoggerTheme.shadows.commandGlow
      }
    },
    '& .MuiSlider-track': {
      background: workoutLoggerTheme.gradients.dataVisualization
    },
    '& .MuiSlider-rail': {
      background: workoutLoggerTheme.colors.tacticalBorder
    }
  },
  
  // Form Rating Stars Theme
  formStars: {
    '& .star-active': {
      color: workoutLoggerTheme.colors.warningAmber,
      filter: 'drop-shadow(0 0 6px currentColor)'
    },
    '& .star-inactive': {
      color: workoutLoggerTheme.colors.cosmicGray
    },
    '& .star-hover': {
      color: workoutLoggerTheme.colors.cyberIntelligence,
      transform: 'scale(1.1)'
    }
  }
};

export default workoutLoggerTheme;
