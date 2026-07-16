/**
 * ============================================================================
 * FILE: AdminLayout.styles.ts
 * PURPOSE: Styled components for the admin dashboard layout container
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-26
 * ============================================================================
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ExecutiveLayoutContainer = styled.div`
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background: var(--bg-base, #0A0A0F);
  position: relative;
  overflow-x: hidden;
`;

export const ExecutiveMainContent = styled(motion.main)<{ $sidebarCollapsed?: boolean }>`
  flex: 1;
  margin-left: ${({ $sidebarCollapsed }) => ($sidebarCollapsed ? '64px' : '280px')};
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background: var(--bg-base, #0A0A0F);
  overflow: hidden;
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 1024px) {
    margin-left: 0;
  }
`;

// Dashboard scroll area — holds routes, takes the padding that was on ExecutiveMainContent
export const ExecutiveDashboardScroll = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  height: 100vh;
  height: 100dvh;

  @media (max-width: 1024px) {
    padding: 16px;
    padding-top: 72px; /* space for mobile menu button */
  }

  @media (max-width: 430px) {
    padding: 12px;
    padding-top: 68px;
  }

  @media (max-width: 375px) {
    padding: 8px;
    padding-top: 64px;
  }

  @media (max-width: 320px) {
    padding: 6px;
    padding-top: 60px;
  }
`;

export const ExecutivePageContainer = styled(motion.div)`
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

export const ExecutiveLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
`;

export const ExecutiveLoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
  margin-bottom: 24px;
`;

export const ExecutiveErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  text-align: center;
  padding: 32px;

  h2 {
    color: var(--danger, #C92A54); /* Crimson Frost */
    margin-bottom: 16px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary, rgba(224, 236, 244, 0.65));
    margin-bottom: 24px;
    max-width: 600px;
    line-height: 1.6;
  }
`;

export const ExecutiveButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6) 0%, var(--accent-primary, #60C0F0) 100%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 12px;
  color: var(--text-on-accent, #FFFFFF);
  padding: 12px 24px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    box-shadow: var(--shadow-accent, 0 0 20px rgba(139, 92, 246, 0.4));
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
