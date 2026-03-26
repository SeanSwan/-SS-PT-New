/**
 * AdminLayoutTheme.ts — Variable Bridge Theme
 * =============================================
 * Maps admin dashboard theme to CSS custom properties from UniversalThemeContext.
 * Fallback values use Crystalline Swan active palette per CLAUDE.md.
 *
 * AI Village Consensus (2026-03-22): Replace hardcoded Galaxy-Swan tokens with
 * CSS variable bridge so the 14-theme changer works across all dashboards.
 */

import { createGlobalStyle } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Variable Bridge Theme
// PURPOSE: Maps styled-components theme to CSS custom properties
// WHY: Enables theme changer to affect admin dashboard without
//      rewriting every individual styled-component
// ─────────────────────────────────────────────────────────────

export const executiveCommandTheme = {
  colors: {
    deepSpace: 'var(--bg-base, #0A0A0F)',             // Obsidian Black
    commandNavy: 'var(--brand-primary, #002060)',       // Midnight Sapphire
    stellarAuthority: 'var(--accent-purple, #8B5CF6)',  // Wing Purple
    cyberIntelligence: 'var(--accent-cyan, #60C0F0)',   // Ice Wing
    executiveAccent: 'var(--accent-cyan, #60C0F0)',     // Ice Wing
    warningAmber: 'var(--warning, #f59e0b)',
    successGreen: 'var(--success, #10b981)',
    criticalRed: 'var(--danger, #ef4444)',
    stellarWhite: 'var(--text-primary, #E0ECF4)',       // Frost White
    platinumSilver: 'var(--text-secondary, rgba(224, 236, 244, 0.65))',
    cosmicGray: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
    voidBlack: '#000000',
    contentBackground: 'var(--bg-surface, #141419)',    // Carbon
    cardBackground: 'var(--bg-elevated, #1A1A24)',      // Graphite
  },
  gradients: {
    commandCenter: 'var(--gradient-cosmic-nebula, linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%))',
    executiveGlass: 'var(--gradient-vault-glass, linear-gradient(180deg, rgba(20, 20, 25, 0.8) 0%, rgba(10, 10, 15, 0.9) 100%))',
    dataFlow: 'radial-gradient(ellipse at top, var(--accent-purple, #8B5CF6) 0%, var(--brand-primary, #002060) 50%, var(--bg-base, #0A0A0F) 100%)',
    intelligenceHorizon: 'linear-gradient(270deg, var(--accent-cyan, #60C0F0), var(--accent-purple, #8B5CF6), var(--brand-primary, #002060))',
    commandAurora: 'linear-gradient(45deg, var(--accent-cyan, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 50%, var(--brand-primary, #002060) 100%)',
  },
  shadows: {
    commandGlow: '0 0 30px rgba(139, 92, 246, 0.4)',   // Wing Purple glow
    executiveDepth: '0 20px 40px rgba(0, 0, 0, 0.3)',
    intelligenceCard: '0 8px 32px rgba(0, 32, 96, 0.2)', // Midnight Sapphire shadow
    systemAlert: '0 0 20px currentColor',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
};

export const ExecutiveGlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    height: 100%;
    overflow-x: hidden;
  }

  body {
    font-family: ${props => props.theme.typography.fontFamily};
    color: var(--text-primary, #E0ECF4);
    background: var(--bg-base, #0A0A0F);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg-elevated, #1A1A24);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--accent-cyan, rgba(96, 192, 240, 0.3));
    border-radius: 3px;

    &:hover {
      background: rgba(96, 192, 240, 0.5);
    }
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(96, 192, 240, 0.3) var(--bg-elevated, #1A1A24);
  }

  @media (max-width: 768px) {
    ::-webkit-scrollbar {
      width: 3px;
    }
  }

  *:focus-visible {
    outline: 2px solid var(--accent-cyan, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4), inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  *:focus:not(:focus-visible) {
    outline: none;
  }
`;
