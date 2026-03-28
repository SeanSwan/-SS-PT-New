/**
 * WorkspaceContainer.tsx
 * =====================
 * Reusable workspace layout with horizontal tab bar and animated content transitions.
 * Extracted from VideoStudioManager pattern for use across all admin workspaces.
 * Uses React Router's Outlet for nested route rendering.
 */

import React, { Component, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// ─── Types ────────────────────────────────────────────
export interface WorkspaceTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface WorkspaceContainerProps {
  title: string;
  subtitle: string;
  tabs: WorkspaceTab[];
}

// ─── Styled Components ───────────────────────────────
const WorkspaceWrapper = styled.div`
  min-height: 100dvh;
  background: var(--bg-base, #0A0A0F);
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;

  @media (max-width: 768px) {
    padding: 12px;
  }

  @media (max-width: 375px) {
    padding: 8px;
  }

  @media (min-width: 2560px) {
    padding: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

const MaxWidthWrapper = styled.div`
  width: 100%;
  max-width: 1600px;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;

  @media (max-width: 768px) {
    margin-bottom: 12px;
  }
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px 0;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;

  @media (max-width: 430px) {
    font-size: 13px;
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
  padding-bottom: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    gap: 4px;
    margin-bottom: 16px;
    padding: 4px 0;
    border-bottom: none;
    background: rgba(0, 32, 96, 0.3);
    border-radius: 12px;
    padding: 6px 8px;
  }

  @media (max-width: 375px) {
    gap: 2px;
    padding: 4px 4px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: ${(p) => (p.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.5)')};
  font-size: 15px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease;
  flex-shrink: 0;
  position: relative;
  scroll-snap-align: start;

  &:hover {
    color: ${(p) => (p.$active ? '#A78BFA' : '#FFFFFF')};
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
    border-radius: 4px;
  }

  /* Animated underline for active tab */
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: ${(p) => (p.$active ? '100%' : '0')};
    height: 2px;
    background: linear-gradient(90deg, #8B5CF6, #60C0F0);
    box-shadow: ${(p) => (p.$active ? '0 -2px 10px rgba(139, 92, 246, 0.5)' : 'none')};
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 13px;
    gap: 6px;
    border-radius: 18px;
    min-height: 44px;

    &::after {
      display: none;
    }

    background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.15)' : 'transparent')};
    border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.3)' : 'transparent')};

    svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 430px) {
    padding: 8px 12px;
    font-size: 13px;
    min-height: 44px;
    gap: 6px;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  @media (max-width: 375px) {
    padding: 8px 10px;
    font-size: 12px;
    min-height: 44px;
  }
`;

const TabContent = styled.div`
  position: relative;
`;

const ErrorFallbackWrapper = styled.div`
  padding: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 12px;
  margin: 16px 0;
`;

const RetryButton = styled.button`
  margin-top: 16px;
  padding: 10px 24px;
  min-height: 44px;
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  &:hover { background: rgba(59, 130, 246, 0.5); }
`;

// ─── Error Boundary ──────────────────────────────────
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }

class WorkspaceErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[Workspace] Render error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackWrapper>
          <h3>This workspace encountered an error</h3>
          <p style={{ opacity: 0.6, fontSize: 13 }}>{this.state.error?.message}</p>
          <RetryButton onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </RetryButton>
        </ErrorFallbackWrapper>
      );
    }
    return this.props.children;
  }
}

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ─── Component ───────────────────────────────────────
const WorkspaceContainer: React.FC<WorkspaceContainerProps> = ({ title, subtitle, tabs }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTabId = useMemo(() => {
    const sorted = [...tabs].sort((a, b) => b.path.length - a.path.length);
    const match = sorted.find(
      (t) => location.pathname === t.path || location.pathname.startsWith(t.path + '/')
    );
    return match?.id || tabs[0]?.id;
  }, [location.pathname, tabs]);

  return (
    <WorkspaceWrapper>
      <MaxWidthWrapper>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PageHeader>
            <PageTitle>{title}</PageTitle>
            <PageSubtitle>{subtitle}</PageSubtitle>
          </PageHeader>

          <TabBar role="tablist">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                role="tab"
                aria-selected={activeTabId === tab.id}
                aria-controls={`panel-${tab.id}`}
                $active={activeTabId === tab.id}
                onClick={() => navigate(tab.path)}
              >
                {tab.icon}
                {tab.label}
              </TabButton>
            ))}
          </TabBar>

          <TabContent role="tabpanel" id={`panel-${activeTabId}`}>
            <WorkspaceErrorBoundary>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTabId}
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </WorkspaceErrorBoundary>
          </TabContent>
        </motion.div>
      </MaxWidthWrapper>
    </WorkspaceWrapper>
  );
};

export default WorkspaceContainer;
