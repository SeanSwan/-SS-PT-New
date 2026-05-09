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
  overflow: hidden;

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
  background: var(--bg-elevated);
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

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  @media (max-width: 430px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    overflow-x: visible;
    scrollbar-width: none;
    scroll-snap-type: none;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    border-radius: 12px;
    padding: 0.375rem;
  }

  @media (min-width: 2560px) {
    border-radius: 20px;
    padding: 0.625rem;
  }

  @media (min-width: 3840px) {
    border-radius: 24px;
    padding: 0.75rem;
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

  @media (max-width: 430px) {
    width: 100%;
    min-width: 0;
    justify-content: center;
    flex: 1 1 auto;
    white-space: normal;
    text-align: center;

    &:last-child {
      grid-column: 1 / -1;
    }
  }

  /* Phase 20.2: tighten padding/gap below 414px so all 5 tabs are
     more visible at iPhone XR portrait without page horizontal
     overflow. min-height: 44px touch target preserved (parent rule). */
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
