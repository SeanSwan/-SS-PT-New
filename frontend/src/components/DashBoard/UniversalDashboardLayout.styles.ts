import { motion } from 'framer-motion';
import styled, { createGlobalStyle, css } from 'styled-components';

import { media, PHONE_MAX_WIDTH } from '../../styles/device-matrix';

export const universalTheme = {
  admin: {
    primary: 'var(--brand-primary, #002060)',
    secondary: 'var(--accent-purple, #8B5CF6)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  trainer: {
    primary: 'var(--accent-purple, #8B5CF6)',
    secondary: 'var(--accent-cyan, #60C0F0)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  client: {
    primary: 'var(--accent-cyan, #60C0F0)',
    secondary: 'var(--accent-purple, #8B5CF6)',
    accent: 'var(--accent-cyan, #60C0F0)',
    gradients: {
      primary: 'linear-gradient(135deg, var(--accent-cyan, #60C0F0) 0%, var(--accent-purple, #8B5CF6) 100%)',
      background: 'var(--bg-base, #0A0A0F)',
    },
  },
  common: {
    deepSpace: 'var(--bg-base, #0A0A0F)',
    stellarWhite: 'var(--text-primary, #E0ECF4)',
    platinumSilver: 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent))',
    cosmicGray: 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 40%, transparent))',
    voidBlack: 'var(--bg-void, #000000)',
    warningAmber: 'var(--warning, #f59e0b)',
    successGreen: 'var(--success, #10b981)',
    criticalRed: 'var(--danger, #C92A54)',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
  borderRadius: { sm: '6px', md: '12px', lg: '16px', xl: '24px' },
};

export const UniversalGlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* min-height (NOT height) + clip (NOT hidden-only): pinning body to viewport
     height while giving it non-visible overflow turns <body> into an inner
     scroller and kills native document scrolling (gummy-scroll root cause). */
  html, body {
    min-height: 100%;
    overflow-x: hidden;
    overflow-x: clip;
  }

  body.mobile-sidebar-open {
    overflow: hidden;
    position: fixed;
    width: 100%;
    touch-action: none;
  }

  body {
    font-family: 'Plus Jakarta Sans', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text-primary, #E0ECF4);
    background: var(--app-canvas, #0A0A0F);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  @media (max-width: 430px) {
    body { font-size: 15px; }
    h1 { font-size: clamp(1.2rem, 5vw, 1.5rem); }
    h2 { font-size: clamp(1.05rem, 4vw, 1.25rem); }
    h3 { font-size: clamp(0.95rem, 3.5vw, 1.1rem); }
  }

  @media (max-width: 375px) {
    body { font-size: 14px; }
  }

  @media (min-width: 2560px) {
    body { font-size: 17px; }
    h1 { font-size: clamp(1.75rem, 3vw, 2.5rem); }
    h2 { font-size: clamp(1.4rem, 2.5vw, 2rem); }
    h3 { font-size: clamp(1.15rem, 2vw, 1.5rem); }
  }

  @media (min-width: 3840px) {
    body { font-size: 20px; }
    h1 { font-size: clamp(2rem, 3vw, 3rem); }
    h2 { font-size: clamp(1.6rem, 2.5vw, 2.25rem); }
    h3 { font-size: clamp(1.3rem, 2vw, 1.75rem); }
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  *:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: var(--shadow-focus, 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)),
                inset 0 0 0 1px var(--border-accent-subtle, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent));
  }

  *:focus:not(:focus-visible) {
    outline: none;
  }
`;

export const UniversalLayoutContainer = styled.div`
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background: var(--app-canvas, #0A0A0F);
  position: relative;
  overflow-x: hidden;
`;

export const UniversalMainContent = styled(motion.main)<{ $compactMobileTop?: boolean; $sidebarCollapsed?: boolean }>`
  flex: 1;
  margin-left: ${({ $sidebarCollapsed }) =>
    $sidebarCollapsed
      ? 'var(--lens-sidebar-collapsed, 64px)'
      : 'var(--lens-sidebar-width, 280px)'};
  padding: var(--lens-main-padding, 24px);
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background: var(--app-canvas, #0A0A0F);
  /* No overflow-y here: the DOCUMENT owns vertical scroll (sidebars are
     position: fixed). An inner overflow-y:auto made this a nested scroller
     that swallowed touch gestures before the page moved. clip keeps the
     horizontal guard without creating a scroll container. */
  overflow-x: hidden;
  overflow-x: clip;
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    margin-left: 0;
    padding: var(--lens-main-padding-mobile, 16px);
    padding-top: 128px;
  }

  @media (max-width: 430px) {
    padding: 12px;
    padding-top: 132px;
    font-size: 15px;
  }

  @media (max-width: 375px) {
    padding: 8px;
    padding-top: 128px;
  }

  @media (max-width: 320px) {
    padding: 6px;
    padding-top: 124px;
  }

  @media (min-width: 2560px) {
    padding: 40px;
    padding-top: 96px;
  }

  @media (min-width: 3840px) {
    padding: 56px;
    padding-top: 112px;
  }

  ${({ $compactMobileTop }) => $compactMobileTop && css`
    ${media.phone} {
      padding-top: 72px;
    }

    ${media.shortViewport(700)} and (max-width: ${PHONE_MAX_WIDTH}px) and (pointer: coarse) {
      padding-top: 44px;
    }
  `}
`;

export const UniversalPageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;

  @media (min-width: 2560px) {
    max-width: 2200px;
  }

  @media (min-width: 3840px) {
    max-width: 3000px;
  }
`;

export const MobileDashboardSafeArea = styled.div`
  display: none;

  @media (max-width: 1024px) {
    display: block;
    position: fixed;
    top: calc(var(--header-height, 60px) + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    height: 60px;
    z-index: 998;
    pointer-events: none;
    border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    background:
      linear-gradient(180deg,
        color-mix(in srgb, var(--app-canvas, #0A0A0F) 98%, transparent) 0%,
        color-mix(in srgb, var(--app-canvas, #0A0A0F) 97%, transparent) 76%,
        color-mix(in srgb, var(--app-canvas, #0A0A0F) 88%, transparent) 100%);
    box-shadow: 0 16px 28px color-mix(in srgb, var(--app-canvas, #0A0A0F) 32%, transparent);
    backdrop-filter: blur(12px);
  }

  @media (max-width: 375px) {
    height: 56px;
  }
`;

// Loading + error state chrome lives in a sibling module (extracted 2026-07-11 to
// honour the 300-line section cap). Re-exported so every existing import of
// `UniversalDashboardLayout.styles` keeps working unchanged.
export * from './UniversalDashboardLayout.stateStyles';
