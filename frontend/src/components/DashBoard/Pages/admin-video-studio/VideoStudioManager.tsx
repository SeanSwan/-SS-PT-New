/**
 * VideoStudioManager.tsx
 * =====================
 * Main container for the Admin Video Studio.
 * Tabbed layout with 6 tabs: Library, YouTube Growth, Members Vault,
 * Collections, Analytics, Jobs.
 */

import React, { useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Film,
  Youtube,
  Lock,
  FolderOpen,
  BarChart3,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

import LibraryTab from './tabs/LibraryTab';
import YouTubeGrowthTab from './tabs/YouTubeGrowthTab';
import MembersVaultTab from './tabs/MembersVaultTab';
import CollectionsTab from './tabs/CollectionsTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import JobsTab from './tabs/JobsTab';

// ─── Types ────────────────────────────────────────────
interface TabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

// ─── Styled Components ───────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  background: rgba(10, 10, 26, 0.95);
  padding: 24px;
  color: rgba(255, 255, 255, 0.9);

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px 0;

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  min-width: 44px;
  border: 1px solid ${(p) => (p.$active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.2)')};
  border-radius: 10px;
  background: ${(p) =>
    p.$active
      ? 'linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(0, 255, 255, 0.15))'
      : 'rgba(30, 58, 138, 0.15)'};
  color: ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)')};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(59, 130, 246, 0.4);
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    padding: 10px 14px;
    font-size: 13px;
    gap: 6px;

    svg {
      width: 16px;
      height: 16px;
    }
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

class StudioErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[VideoStudio] Render error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackWrapper>
          <h3>Video Studio encountered an error</h3>
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
const VideoStudioManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('library');
  const { user } = useAuth();

  const tabs: TabDef[] = [
    { id: 'library', label: 'Library', icon: <Film />, component: <LibraryTab /> },
    { id: 'youtube', label: 'YouTube Growth', icon: <Youtube />, component: <YouTubeGrowthTab /> },
    { id: 'vault', label: 'Members Vault', icon: <Lock />, component: <MembersVaultTab /> },
    { id: 'collections', label: 'Collections', icon: <FolderOpen />, component: <CollectionsTab /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 />, component: <AnalyticsTab /> },
    { id: 'jobs', label: 'Jobs', icon: <Cpu />, component: <JobsTab /> },
  ];

  const activeTabDef = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <PageWrapper>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader>
          <PageTitle>Video Studio</PageTitle>
          <PageSubtitle>Manage your video library, YouTube integrations, and member content</PageSubtitle>
        </PageHeader>

        <TabBar role="tablist">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </TabButton>
          ))}
        </TabBar>

        <TabContent role="tabpanel">
          <StudioErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {activeTabDef.component}
              </motion.div>
            </AnimatePresence>
          </StudioErrorBoundary>
        </TabContent>
      </motion.div>
    </PageWrapper>
  );
};

export default VideoStudioManager;
