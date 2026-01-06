import { createGlobalStyle } from 'styled-components';

export const executiveCommandTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    commandNavy: '#1e3a8a',
    stellarAuthority: '#3b82f6',
    cyberIntelligence: '#0ea5e9',
    executiveAccent: '#0891b2',
    warningAmber: '#f59e0b',
    successGreen: '#10b981',
    criticalRed: '#ef4444',
    stellarWhite: '#ffffff',
    platinumSilver: '#e5e7eb',
    cosmicGray: '#9ca3af',
    voidBlack: '#000000',
    contentBackground: '#f8fafc',
    cardBackground: 'rgba(30, 58, 138, 0.1)',
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #0891b2 100%)',
    executiveGlass: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #3b82f6 0%, #1e3a8a 50%, #0a0a0f 100%)',
    intelligenceHorizon: 'linear-gradient(270deg, #0891b2, #3b82f6, #1e3a8a)',
    commandAurora: 'linear-gradient(45deg, #00ffff 0%, #3b82f6 50%, #1e3a8a 100%)',
  },
  shadows: {
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.4)',
    executiveDepth: '0 20px 40px rgba(0, 0, 0, 0.3)',
    intelligenceCard: '0 8px 32px rgba(30, 58, 138, 0.2)',
    systemAlert: '0 0 20px currentColor',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
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
    color: ${props => props.theme.colors.stellarWhite};
    background: ${props => props.theme.gradients.dataFlow};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.gradients.commandCenter};
    border-radius: 4px;

    &:hover {
      background: ${props => props.theme.colors.stellarAuthority};
    }
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: ${props => props.theme.colors.stellarAuthority} rgba(10, 10, 15, 0.3);
  }

  *:focus {
    outline: 2px solid ${props => props.theme.colors.stellarAuthority};
    outline-offset: 2px;
  }

  .js-focus-visible *:focus:not(.focus-visible) {
    outline: none;
  }
`;
