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
   * Color System — Enchanted Apex: Crystalline Swan
   * Brand colors, glow system, semantic colors, session status colors
   */
  colors: {
    brand: {
      /* Theme-aware bridge (2026-07-20): brand/glow/primary-text express as
         var(--token, #previous-hex) so importers re-skin with the 18-theme runtime
         (the static palette was invisible to the Appearance Studio — PREREQ-SLICE
         2026-07-16 §2.2). Fallbacks keep the exact prior value when vars are absent. */
      cyan: 'var(--accent-primary, #60c0f0)',    // Ice Wing — gaming/data accent
      purple: 'var(--accent-secondary, #8b5cf6)',  // Wing Purple — primary glow/interactive accent
      gradient: 'linear-gradient(135deg, var(--accent-secondary, #8b5cf6), var(--accent-primary, #60c0f0))' // Cosmic Nebula gradient (purple → cyan)
    },
    surface: {
      midnightSapphire: '#002060', // Primary surfaces
      royalDepth: '#003080',       // Elevated surfaces
      abyssalNavy: '#001840',      // WCAG-compliant dark backgrounds
    },
    glow: {
      primary: 'var(--accent-secondary, #8b5cf6)',   // Wing Purple — glow on blue buttons, focus rings, active nav
      cyan: 'var(--accent-primary, #60c0f0)',      // Ice Wing Cyan — glow on purple buttons, XP bars, gaming accents
      secondary: '#50a0f0', // Arctic Cyan — charts, data viz, cold metrics only (data-only law: stays static)
      luxury: 'var(--accent-gold, #c6a84b)',    // Gilded Fern — gold borders, luxury accents
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
      primary: 'var(--text-primary, #ffffff)', // Runtime text token (falls back to white)
      secondary: 'rgba(255, 255, 255, 0.7)', // 70% white - secondary text
      disabled: 'rgba(255, 255, 255, 0.5)',  // 50% white - disabled text
      frost: '#e0ecf4',                      // Frost White — headings, emphasis
    }
  },

  /**
   * Dual-Button Glow System
   * Blue buttons get purple glow, purple buttons get cyan glow.
   * This creates visual variety and breaks up solid-blue monotony.
   */
  buttons: {
    primary: { bg: '#002060', glow: '#8b5cf6' },   // Midnight Sapphire + Wing Purple glow
    accent:  { bg: '#8b5cf6', glow: '#60c0f0' },   // Wing Purple + Ice Wing Cyan glow
    cosmic:  { bg: 'linear-gradient(135deg, #8b5cf6, #60c0f0)', glow: '#8b5cf6' }, // Nebula gradient
  },

  /**
   * Shadow System — Gemini 3.1 Pro approved multi-layer glow tokens
   */
  shadows: {
    glowPrimary: '0 4px 12px rgba(0, 24, 64, 0.5), 0 0 12px 0 rgba(139, 92, 246, 0.4), 0 0 24px 0 rgba(139, 92, 246, 0.2)',
    glowPrimaryHover: '0 6px 16px rgba(0, 24, 64, 0.6), 0 0 16px 2px rgba(139, 92, 246, 0.6), 0 0 32px 4px rgba(139, 92, 246, 0.3)',
    glowSecondary: '0 4px 12px rgba(0, 24, 64, 0.5), 0 0 12px 0 rgba(80, 160, 240, 0.4), 0 0 24px 0 rgba(80, 160, 240, 0.2)',
    glowGaming: '0 4px 12px rgba(0, 24, 64, 0.5), 0 0 12px 0 rgba(96, 192, 240, 0.4), 0 0 24px 0 rgba(96, 192, 240, 0.2)',
  },

  /**
   * Animation Easing — Gemini 3.1 Pro approved
   */
  easing: {
    premiumSnap: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
