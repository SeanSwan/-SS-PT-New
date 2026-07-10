/**
 * Sidebar, tab navigation, hidden input, and loading-state styles for UserDashboard V3.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Sidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

export const SidebarCard = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  &:hover {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 1rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 2rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;
    border-radius: 24px;
  }
`;

export const SidebarTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.4rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.6rem;
  }
`;

// SECTION: Main Content & Tab Components
// PURPOSE: Tab navigation and content area

export const MainContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  /* 2026-05-10 SLICE 1: overflow: hidden removed; it was confining the
     descendant TabNavigation's position: sticky to MainContent's box,
     so once ProfileHeader mounted on non-home tabs and pushed MainContent
     below the fold, the tab strip scrolled out of view and felt "inoperable".
     The sticky tab strip now lives ABOVE MainContent (in V3 ObservatoryShell
     children), so MainContent only contains panels — horizontal clipping
     is still handled by ProfileContainer + ContentWrapper. */

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

export const TabNavigation = styled.div`
  display: flex;
  gap: 0.25rem;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 0.5rem;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
  /* Phase 20.2: scroll-snap so users at <=414px who horizontally scroll
     the tab strip land on tab edges rather than mid-tab. overscroll-
     behavior-x prevents the dashboard from triggering history nav. */
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;

  /* 2026-05-10 SLICE 1 (Codex round-2 placement): the in-tree tab strip
     is mounted ABOVE ProfileHeader in the V3 ObservatoryShell children,
     so sticky pins from the top of the scroll area on every tab regardless
     of whether ProfileHeader is present. z-index: 50 sits well below the
     modal/dropdown layer (1000) and above ambient page chrome (0-10).
     The translucent bg keeps the underlying scroll content faintly
     visible behind the strip — premium feel. */
  position: sticky;
  top: 0.5rem;
  z-index: 50;

  @media (min-width: 1025px) {
    display: none;
  }

  @supports not (backdrop-filter: blur(20px)) {
    /* iOS <= 16.1 fallback: solid bg so the sticky strip stays opaque. */
    background: var(--bg-elevated, #141419);
  }

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  /* O3 app-shell nav: phones get a FIXED BOTTOM bar — thumb-reach, app-like,
     pre-aligned with the future native build. Horizontal scroll + snap keeps
     all entries reachable; iOS home-indicator safe-area respected. */
  @media (max-width: 768px) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 16px 16px 0 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    padding: 0.5rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* 2026-05-10 SLICE 1: scale the sticky offset at large breakpoints so
     the strip doesn't hug the chrome edge on QHD/4K, where ContentWrapper
     already pads 4-5rem in. Matches CLAUDE.md responsive audit matrix
     (1440 / 1920 / 2560 / 3440 / 3840). */
  @media (min-width: 1920px) {
    top: 0.75rem;
  }

  @media (min-width: 2560px) {
    border-radius: 20px;
    padding: 0.625rem;
    top: 1rem;
  }

  @media (min-width: 3440px) {
    top: 1.25rem;
  }

  @media (min-width: 3840px) {
    border-radius: 24px;
    padding: 0.75rem;
    top: 1.5rem;
  }
`;

/* Apex Phase 1b: Home's left rail is gone, so the tab bar is its desktop nav. Other surfaces keep it hidden >=1025px (they have sidebars).
   display:contents is REQUIRED: TabNavigation is position:sticky, and a wrapper box would become its containing block and kill the stick. */
export const HomeDesktopNavShell = styled.div`
  display: contents;

  @media (min-width: 1025px) {
    ${TabNavigation} { display: flex; }
  }
`;

export const Tab = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  /* Phase 20.2: scroll-snap-align matches the parent TabNavigation's
     scroll-snap-type so each tab snaps to start when the strip is
     scrolled horizontally on mobile. */
  scroll-snap-align: start;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'transparent'
  };
  color: ${({ $active }) =>
    $active ? 'var(--color-white, #E0ECF4)' : 'var(--text-secondary)'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: ${({ $active }) => $active ? '600' : '500'};

  &:hover {
    background: ${({ $active }) =>
      $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'var(--bg-surface, var(--bg-elevated))'
    };
    color: ${({ $active }) =>
      $active ? 'var(--color-white, #E0ECF4)' : 'var(--text-primary)'
    };
  }

  /* O3: the old <=430px wrap-grid retired with the bottom-bar conversion —
     tabs stay a snap-scrolling row inside the fixed bar. Tightened so the
     first five entries read at iPhone-XR width; 44px targets preserved. */
  @media (max-width: 414px) {
    padding: 0.625rem 0.75rem;
    font-size: 0.85rem;
    gap: 0.375rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 0.625rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.25rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
  }
`;

// SECTION: Utility Components
// PURPOSE: Hidden inputs, loading states, error boundary

export const HiddenInput = styled.input`
  display: none;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--accent-primary, #60C0F0);
`;

export const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
