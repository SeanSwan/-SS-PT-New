/**
 * Universal Master Schedule - Theme Configuration
 * =============================================
 * Stellar Command Center theme aligned with SwanStudios design system
 * 
 * This theme provides the visual foundation for the Universal Master Schedule,
 * featuring the professional blue-focused palette, stellar gradients, and
 * premium glass-morphism effects that define the admin command center aesthetic.
 */

import { createTheme } from '@mui/material/styles';

// ==================== COLOR PALETTE ====================

export const stellarColors = {
  // Primary Command Center Colors
  deepSpace: '#0a0a0f',
  commandNavy: '#1e3a8a',
  stellarBlue: '#3b82f6',
  cyberBlue: '#0ea5e9',
  arcticBlue: '#0891b2',
  
  // Accent Colors
  cosmicPurple: '#8b5cf6',
  emeraldGreen: '#10b981',
  rubyRed: '#ef4444',
  amberGold: '#f59e0b',
  
  // Neutral Colors
  stellarWhite: '#ffffff',
  platinumSilver: '#e5e7eb',
  cosmicGray: '#9ca3af',
  darkMatter: '#374151',
  
  // Status Colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Transparency Levels
  alpha: {
    5: 'rgba(255, 255, 255, 0.05)',
    10: 'rgba(255, 255, 255, 0.1)',
    20: 'rgba(255, 255, 255, 0.2)',
    30: 'rgba(255, 255, 255, 0.3)',
    50: 'rgba(255, 255, 255, 0.5)',
    70: 'rgba(255, 255, 255, 0.7)',
    90: 'rgba(255, 255, 255, 0.9)',
  }
};

// ==================== GRADIENTS ====================

export const stellarGradients = {
  // Command Center Gradients
  commandCenter: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(14, 165, 233, 0.1) 50%, rgba(8, 145, 178, 0.05) 100%)',
  executiveGlass: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)',
  
  // Status Gradients
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  
  // Overlay Gradients
  overlay: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%)',
  glassMorphism: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  
  // Radial Gradients
  stellarRadial: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
  commandRadial: 'radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.2) 0%, transparent 60%)',
};

// ==================== SPACING SYSTEM ====================

export const stellarSpacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
  '5xl': '8rem',   // 128px
};

// ==================== BREAKPOINTS ====================

export const stellarBreakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
  ultrawide: '1536px',
};

// ==================== TYPOGRAPHY ====================

export const stellarTypography = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "JetBrains Mono", Consolas, Monaco, monospace',
  },
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

// ==================== SHADOWS ====================

export const stellarShadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Glow effects
  glow: {
    blue: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
    purple: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
    emerald: '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)',
    ruby: '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
  },
  
  // Command center shadows
  command: '0 8px 32px rgba(30, 58, 138, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)',
  stellar: '0 8px 32px rgba(59, 130, 246, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)',
};

// ==================== BORDER RADIUS ====================

export const stellarBorderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
};

// ==================== ANIMATION DURATIONS ====================

export const stellarAnimations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '1000ms',
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

// ==================== STELLAR THEME OBJECT ====================

export const stellarTheme = {
  colors: stellarColors,
  gradients: stellarGradients,
  spacing: stellarSpacing,
  breakpoints: stellarBreakpoints,
  typography: stellarTypography,
  shadows: stellarShadows,
  borderRadius: stellarBorderRadius,
  animations: stellarAnimations,
};

// ==================== MATERIAL-UI THEME ====================

export const CommandCenterTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: stellarColors.stellarBlue,
      light: stellarColors.cyberBlue,
      dark: stellarColors.commandNavy,
      contrastText: stellarColors.stellarWhite,
    },
    secondary: {
      main: stellarColors.cosmicPurple,
      light: stellarColors.platinumSilver,
      dark: stellarColors.darkMatter,
      contrastText: stellarColors.stellarWhite,
    },
    error: {
      main: stellarColors.error,
    },
    warning: {
      main: stellarColors.warning,
    },
    info: {
      main: stellarColors.info,
    },
    success: {
      main: stellarColors.success,
    },
    background: {
      default: stellarColors.deepSpace,
      paper: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      primary: stellarColors.stellarWhite,
      secondary: stellarColors.cosmicGray,
    },
    divider: stellarColors.alpha[20],
  },
  typography: {
    fontFamily: stellarTypography.fontFamily.primary,
    h1: {
      fontSize: stellarTypography.fontSize['4xl'],
      fontWeight: stellarTypography.fontWeight.light,
      lineHeight: stellarTypography.lineHeight.tight,
    },
    h2: {
      fontSize: stellarTypography.fontSize['3xl'],
      fontWeight: stellarTypography.fontWeight.light,
      lineHeight: stellarTypography.lineHeight.tight,
    },
    h3: {
      fontSize: stellarTypography.fontSize['2xl'],
      fontWeight: stellarTypography.fontWeight.normal,
      lineHeight: stellarTypography.lineHeight.tight,
    },
    h4: {
      fontSize: stellarTypography.fontSize.xl,
      fontWeight: stellarTypography.fontWeight.medium,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    h5: {
      fontSize: stellarTypography.fontSize.lg,
      fontWeight: stellarTypography.fontWeight.medium,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    h6: {
      fontSize: stellarTypography.fontSize.base,
      fontWeight: stellarTypography.fontWeight.semibold,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    body1: {
      fontSize: stellarTypography.fontSize.base,
      fontWeight: stellarTypography.fontWeight.normal,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    body2: {
      fontSize: stellarTypography.fontSize.sm,
      fontWeight: stellarTypography.fontWeight.normal,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    caption: {
      fontSize: stellarTypography.fontSize.xs,
      fontWeight: stellarTypography.fontWeight.normal,
      lineHeight: stellarTypography.lineHeight.normal,
    },
    button: {
      fontSize: stellarTypography.fontSize.sm,
      fontWeight: stellarTypography.fontWeight.medium,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    stellarShadows.sm,
    stellarShadows.md,
    stellarShadows.lg,
    stellarShadows.xl,
    stellarShadows['2xl'],
    stellarShadows.command,
    stellarShadows.stellar,
    stellarShadows.glow.blue,
    stellarShadows.glow.purple,
    stellarShadows.glow.emerald,
    stellarShadows.glow.ruby,
    stellarShadows.inner,
    stellarShadows.sm,
    stellarShadows.md,
    stellarShadows.lg,
    stellarShadows.xl,
    stellarShadows['2xl'],
    stellarShadows.command,
    stellarShadows.stellar,
    stellarShadows.glow.blue,
    stellarShadows.glow.purple,
    stellarShadows.glow.emerald,
    stellarShadows.glow.ruby,
    stellarShadows.inner,
  ],
  breakpoints: {
    values: {
      xs: 0,
      sm: parseInt(stellarBreakpoints.mobile),
      md: parseInt(stellarBreakpoints.tablet),
      lg: parseInt(stellarBreakpoints.desktop),
      xl: parseInt(stellarBreakpoints.wide),
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: stellarBorderRadius.lg,
          textTransform: 'none',
          fontWeight: stellarTypography.fontWeight.medium,
          transition: `all ${stellarAnimations.duration.normal} ${stellarAnimations.easing.easeInOut}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: stellarGradients.glassMorphism,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${stellarColors.alpha[10]}`,
          borderRadius: stellarBorderRadius.xl,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: stellarGradients.overlay,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${stellarColors.alpha[10]}`,
          borderRadius: stellarBorderRadius['2xl'],
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: stellarColors.alpha[30],
            },
            '&:hover fieldset': {
              borderColor: stellarColors.alpha[50],
            },
            '&.Mui-focused fieldset': {
              borderColor: stellarColors.stellarBlue,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: stellarColors.alpha[30],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: stellarColors.alpha[50],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: stellarColors.stellarBlue,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: stellarBorderRadius.lg,
          fontWeight: stellarTypography.fontWeight.medium,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${stellarColors.alpha[20]}`,
          borderRadius: stellarBorderRadius.lg,
          fontSize: stellarTypography.fontSize.sm,
        },
      },
    },
  },
});

// ==================== CALENDAR THEME ====================

export const calendarTheme = {
  // Calendar-specific colors
  eventColors: {
    available: {
      background: stellarColors.success,
      border: stellarColors.success,
      text: stellarColors.stellarWhite,
    },
    scheduled: {
      background: stellarColors.stellarBlue,
      border: stellarColors.stellarBlue,
      text: stellarColors.stellarWhite,
    },
    confirmed: {
      background: stellarColors.cyberBlue,
      border: stellarColors.cyberBlue,
      text: stellarColors.stellarWhite,
    },
    completed: {
      background: stellarColors.cosmicGray,
      border: stellarColors.cosmicGray,
      text: stellarColors.stellarWhite,
    },
    cancelled: {
      background: stellarColors.error,
      border: stellarColors.error,
      text: stellarColors.stellarWhite,
    },
    requested: {
      background: stellarColors.warning,
      border: stellarColors.warning,
      text: stellarColors.stellarWhite,
    },
  },
  
  // Calendar layout colors
  layout: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: stellarColors.alpha[10],
    header: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: stellarColors.alpha[10],
      text: stellarColors.stellarWhite,
    },
    cell: {
      background: 'rgba(0, 0, 0, 0.1)',
      border: stellarColors.alpha[5],
      today: 'rgba(59, 130, 246, 0.1)',
    },
    timeGutter: {
      background: 'rgba(0, 0, 0, 0.2)',
      border: stellarColors.alpha[10],
      text: stellarColors.cosmicGray,
    },
  },
  
  // Calendar toolbar
  toolbar: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: stellarColors.alpha[10],
    button: {
      background: stellarColors.alpha[10],
      border: stellarColors.alpha[20],
      text: stellarColors.stellarWhite,
      hover: stellarColors.alpha[20],
      active: stellarColors.stellarBlue,
    },
  },
};

// ==================== EXPORT DEFAULT ====================

export default stellarTheme;