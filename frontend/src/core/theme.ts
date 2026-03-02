/**
 * core/theme.ts
 * Consolidated Styled Components Theme for SwanStudios
 * Unifies Crystalline Swan theme with existing theme systems
 *
 * Typography Stacks:
 * - Headings: "Plus Jakarta Sans"
 * - Drama: "Cormorant Garamond" Italic
 * - Data: "Fira Code"
 * - UI: "Sora"
 */

import galaxySwanTheme, { themeUtils, mediaQueries, animationConfig } from '../styles/galaxy-swan-theme';
import existingTheme from '../styles/theme';

/**
 * Typography Fonts — Crystalline Swan stacks
 */
export const fonts = {
  heading: '"Plus Jakarta Sans", "Sora", sans-serif',
  drama: '"Cormorant Garamond", Georgia, serif',
  data: '"Fira Code", "Cascadia Code", monospace',
  ui: '"Sora", "Plus Jakarta Sans", sans-serif',
};

/**
 * Typography Scale
 */
export const typography = {
  // Font stacks
  fonts,

  // Display typography (headers, hero text)
  display: {
    h1: {
      fontFamily: fonts.heading,
      fontSize: '3.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: fonts.heading,
      fontSize: '2.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: fonts.heading,
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
  },

  // Body typography (content, UI text)
  body: {
    large: {
      fontFamily: fonts.ui,
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    medium: {
      fontFamily: fonts.ui,
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    small: {
      fontFamily: fonts.ui,
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
  },

  // Drama typography (hero captions, pull-quotes)
  drama: {
    large: {
      fontFamily: fonts.drama,
      fontSize: '2rem',
      fontWeight: 400,
      fontStyle: 'italic' as const,
      lineHeight: 1.4,
    },
    medium: {
      fontFamily: fonts.drama,
      fontSize: '1.5rem',
      fontWeight: 400,
      fontStyle: 'italic' as const,
      lineHeight: 1.5,
    },
  },

  // Data typography (numbers, code, stats)
  data: {
    display: {
      fontFamily: fonts.data,
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    body: {
      fontFamily: fonts.data,
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },

  // UI typography (buttons, labels, captions)
  ui: {
    button: {
      fontFamily: fonts.ui,
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    label: {
      fontFamily: fonts.ui,
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
    },
    caption: {
      fontFamily: fonts.ui,
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.3,
    },
  },
};

/**
 * Spacing Scale - 8px base grid system
 */
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  xxl: '3rem',      // 48px
  xxxl: '4rem',     // 64px

  // Component-specific spacing
  component: {
    padding: {
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
    },
    margin: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
  },
};

/**
 * Breakpoints - Mobile-first responsive design
 */
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  ultrawide: '1400px',

  // Media query helpers
  up: {
    mobile: '@media (min-width: 480px)',
    tablet: '@media (min-width: 768px)',
    desktop: '@media (min-width: 1024px)',
    ultrawide: '@media (min-width: 1400px)',
  },
  down: {
    mobile: '@media (max-width: 479px)',
    tablet: '@media (max-width: 767px)',
    desktop: '@media (max-width: 1023px)',
    ultrawide: '@media (max-width: 1399px)',
  },
};

/**
 * Consolidated SwanStudios Theme
 * Combines Crystalline Swan palette with existing theme systems
 */
export const swanStudiosTheme = {
  // === CORE IDENTITY ===
  // Primary Crystalline Swan theme integration
  ...galaxySwanTheme,

  // === TYPOGRAPHY SYSTEM ===
  typography,
  fonts,

  // === SPACING SYSTEM ===
  spacing,

  // === RESPONSIVE SYSTEM ===
  breakpoints,
  mediaQueries,

  // === ANIMATION SYSTEM ===
  animation: animationConfig,

  // === EXISTING THEME INTEGRATION ===
  // Light/Dark variants from existing theme
  variants: {
    light: existingTheme.light,
    dark: existingTheme.dark,
  },

  // === COMPONENT TOKENS ===
  // Pre-built styling for common components
  components: {
    ...galaxySwanTheme.components,

    // Form components
    input: {
      background: 'rgba(0, 48, 128, 0.4)',
      border: `1px solid ${galaxySwanTheme.primary.main}`,
      borderRadius: '8px',
      padding: spacing.sm,
      fontSize: typography.body.medium.fontSize,
      color: galaxySwanTheme.text.primary,

      focus: {
        borderColor: galaxySwanTheme.primary.main,
        boxShadow: galaxySwanTheme.shadows.primaryGlow,
        outline: 'none',
      },

      error: {
        borderColor: '#FF6B6B',
        boxShadow: '0 0 10px rgba(255, 107, 107, 0.3)',
      },
    },

    // Button base styles (CSS template literal compatible)
    buttonBase: `
      padding: ${spacing.sm} ${spacing.md};
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-family: ${fonts.ui};
      font-size: ${typography.ui.button.fontSize};
      font-weight: ${typography.ui.button.fontWeight};
      text-transform: ${typography.ui.button.textTransform};
      letter-spacing: ${typography.ui.button.letterSpacing};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  },

  // === UTILITY FUNCTIONS ===
  utils: {
    ...themeUtils,

    // Helper to get spacing value
    getSpacing: (size: keyof typeof spacing): string => spacing[size],

    // Helper to get typography style
    getTypography: (category: keyof typeof typography, variant: string): any => {
      const categoryObj = typography[category] as any;
      return categoryObj[variant] || null;
    },

    // Helper to create responsive styles
    responsive: (styles: Record<string, string>): string => {
      return Object.entries(styles).map(([breakpoint, style]) => {
        if (breakpoint === 'base') return style;
        const breakpointKey = breakpoint as keyof typeof breakpoints.up;
        if (breakpoints.up[breakpointKey]) {
          return `${breakpoints.up[breakpointKey]} { ${style} }`;
        }
        return '';
      }).filter(Boolean).join(' ');
    },
  },
};

export default swanStudiosTheme;

// Export individual systems for direct use
export { galaxySwanTheme, mediaQueries, animationConfig, themeUtils };

// Type definitions for TypeScript support
export type SwanStudiosTheme = typeof swanStudiosTheme;
export type TypographyVariant = keyof typeof typography;
export type SpacingSize = keyof typeof spacing;
export type BreakpointSize = keyof typeof breakpoints;
