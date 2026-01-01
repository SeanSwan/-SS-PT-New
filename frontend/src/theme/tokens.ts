/**
 * Design Tokens - SwanStudios Personal Training Platform
 *
 * Centralized design system for consistent spacing, typography, colors, and breakpoints
 * across all dashboards (Admin, Client, Trainer).
 *
 * Usage:
 * import { theme } from '../theme/tokens';
 *
 * padding: ${theme.spacing.md};
 * font-size: ${theme.typography.scale.xl};
 * color: ${theme.colors.brand.cyan};
 */

export const theme = {
  /**
   * Spacing Scale - 8px Base Grid System
   * Use these values for padding, margin, gap
   */
  spacing: {
    xs: '4px',    // Extra small - tight spacing
    sm: '8px',    // Small - compact spacing
    md: '16px',   // Medium - standard spacing (default)
    lg: '24px',   // Large - generous spacing
    xl: '32px',   // Extra large - section spacing
    '2xl': '48px' // 2X large - major section spacing
  },

  /**
   * Typography Scale
   * Font sizes and weights for consistent text hierarchy
   */
  typography: {
    scale: {
      xs: '0.75rem',   // 12px - captions, labels
      sm: '0.875rem',  // 14px - secondary text
      base: '1rem',    // 16px - body text (default)
      lg: '1.125rem',  // 18px - emphasized text
      xl: '1.5rem',    // 24px - h2 headings
      '2xl': '1.875rem', // 30px - h1 headings
      '3xl': '2.25rem'   // 36px - hero text
    },
    weight: {
      normal: 400,   // Regular text
      medium: 500,   // Slightly emphasized
      semibold: 600, // Headings
      bold: 700      // Strong emphasis
    }
  },

  /**
   * Color System
   * Brand colors, semantic colors, session status colors
   */
  colors: {
    brand: {
      cyan: '#00ffff',    // Primary brand color
      purple: '#7851a9',  // Secondary brand color
      gradient: 'linear-gradient(135deg, #00ffff, #7851a9)' // Brand gradient
    },
    semantic: {
      success: '#22c55e', // Green - success states
      warning: '#f59e0b', // Orange - warnings
      error: '#ef4444',   // Red - errors
      info: '#3b82f6'     // Blue - information
    },
    session: {
      available: '#22c55e',  // Green - session available
      booked: '#3b82f6',     // Blue - session booked
      confirmed: '#7c3aed',  // Purple - session confirmed
      completed: '#6b7280',  // Gray - session completed
      cancelled: '#ef4444',  // Red - session cancelled
      blocked: '#f59e0b'     // Orange - time blocked
    },
    text: {
      primary: '#ffffff',                  // White - main text
      secondary: 'rgba(255, 255, 255, 0.7)', // 70% white - secondary text
      disabled: 'rgba(255, 255, 255, 0.5)'   // 50% white - disabled text
    }
  },

  /**
   * Responsive Breakpoints
   * Use for media queries
   */
  breakpoints: {
    mobile: '480px',   // Small phones
    tablet: '768px',   // Tablets, large phones
    desktop: '1024px', // Desktop, laptops
    wide: '1280px'     // Large desktops
  }
};

/**
 * Accessibility: Reduced Motion Support
 * Use this in styled-components to respect user preferences
 */
export const prefersReducedMotion = '@media (prefers-reduced-motion: reduce)';

export default theme;
