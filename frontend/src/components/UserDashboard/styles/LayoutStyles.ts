/**
 * ============================================================================
 * FILE: LayoutStyles.ts
 * PURPOSE: Layout-level styled-components for UserDashboard (container, grid, sidebar, tabs)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the structural layout components — containers,
 * grid, sidebar, tab navigation, loading states, and noise overlay.
 * HOW IT FITS IN THE APP: Imported by UserDashboard orchestrator and sub-components
 * KEY DECISIONS: Separated from profile styles to keep each file under 300 lines
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// SECTION: Cinematic Overlays
// PURPOSE: V3 noise overlay and z-index wrapper for film-grain depth
// ─────────────────────────────────────────────────────────────

export const NoiseOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

export const MainContentZWrapper = styled.div`
  position: relative;
  z-index: 2;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Page Container
// PURPOSE: Root container with background pattern
// ─────────────────────────────────────────────────────────────

export const ProfileContainer = styled(motion.div)`
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

export const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;

  @media (max-width: 1024px) { max-width: 100%; padding: 2rem 1.5rem; }
  @media (max-width: 768px) { padding: 1.5rem 1rem; }
  @media (max-width: 480px) { padding: 1rem 0.75rem; }
  @media (max-width: 320px) { padding: 0.75rem 0.5rem; }
  @media (min-width: 2560px) { max-width: 1600px; padding: 4rem 3rem; }
  @media (min-width: 3840px) { max-width: 2200px; padding: 5rem 4rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Content Grid
// PURPOSE: Two-column layout (sidebar + main)
// ─────────────────────────────────────────────────────────────

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; gap: 1.5rem; }
  @media (max-width: 320px) { gap: 1rem; margin-top: 1rem; }
  @media (min-width: 2560px) { grid-template-columns: 380px 1fr; gap: 2.5rem; margin-top: 3rem; }
  @media (min-width: 3840px) { grid-template-columns: 460px 1fr; gap: 3rem; margin-top: 4rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Sidebar
// PURPOSE: Left sidebar container and card styles
// ─────────────────────────────────────────────────────────────

export const Sidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: 320px) { gap: 1rem; }
  @media (min-width: 2560px) { gap: 2rem; }
  @media (min-width: 3840px) { gap: 2.5rem; }
`;

export const SidebarCard = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.15);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 20px rgba(139, 92, 246, 0.05);
  }

  @media (max-width: 320px) { padding: 1rem; border-radius: 12px; }
  @media (min-width: 2560px) { padding: 2rem; border-radius: 20px; }
  @media (min-width: 3840px) { padding: 2.5rem; border-radius: 24px; }
`;

export const SidebarTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 320px) { font-size: 1rem; }
  @media (min-width: 2560px) { font-size: 1.4rem; }
  @media (min-width: 3840px) { font-size: 1.6rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Content Area
// PURPOSE: Right-side content container
// ─────────────────────────────────────────────────────────────

export const MainContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: 320px) { gap: 1rem; }
  @media (min-width: 2560px) { gap: 2rem; }
  @media (min-width: 3840px) { gap: 2.5rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Navigation
// PURPOSE: Horizontal tab bar with active indicator
// ─────────────────────────────────────────────────────────────

export const TabNavigationBar = styled.div`
  display: flex;
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 0.5rem;
  overflow-x: auto;

  @media (max-width: 320px) { border-radius: 12px; padding: 0.375rem; }
  @media (min-width: 2560px) { border-radius: 20px; padding: 0.625rem; }
  @media (min-width: 3840px) { border-radius: 24px; padding: 0.75rem; }
`;

export const Tab = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'transparent'
  };
  color: ${({ $active }) =>
    $active ? 'white' : 'var(--text-secondary)'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  min-height: 44px;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #8B5CF6))' : 'var(--bg-surface, var(--bg-elevated))'
    };
    color: ${({ $active }) =>
      $active ? 'white' : 'var(--text-primary)'
    };
  }

  @media (max-width: 320px) { padding: 0.5rem 0.75rem; font-size: 0.8rem; gap: 0.3rem; }
  @media (min-width: 2560px) { padding: 0.9rem 1.25rem; font-size: 1.1rem; }
  @media (min-width: 3840px) { padding: 1rem 1.5rem; font-size: 1.25rem; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Loading & Utility
// PURPOSE: Loading spinner, hidden inputs
// ─────────────────────────────────────────────────────────────

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors?.primary || '#60C0F0'};
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

export const HiddenInput = styled.input`
  display: none;
`;
