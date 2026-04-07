/**
 * +--- WORKSPACE: Security Intelligence Panel -------------------------+
 * | PURPOSE: Tab container for vulnerability scanner, dependency       |
 * |          health, security alerts, CVE watchlist, and score card.   |
 * | PATTERN: Internal tab state + lazy loading (matches                |
 * |          MarketingWorkspace) -- works with roleConfigurations      |
 * |          flat routing in UniversalDashboardLayout.                 |
 * +--------------------------------------------------------------------+
 */

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, Package, Bell, Eye, Award,
} from 'lucide-react';

// Lazy-load panels for code-splitting
const VulnerabilityScannerPanel = lazy(() => import('./security/VulnerabilityScannerPanel'));
const DependencyHealthWidget = lazy(() => import('./security/DependencyHealthWidget'));
const SecurityAlertsFeed = lazy(() => import('./security/SecurityAlertsFeed'));
const CVEWatchList = lazy(() => import('./security/CVEWatchList'));
const SecurityScoreCard = lazy(() => import('./security/SecurityScoreCard'));

// --- Types ---------------------------------------------------------------
type TabId = 'scanner' | 'dependencies' | 'alerts' | 'watchlist' | 'scorecard';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'scanner', label: 'Vuln Scanner', icon: <ShieldAlert size={16} /> },
  { id: 'dependencies', label: 'Dependencies', icon: <Package size={16} /> },
  { id: 'alerts', label: 'Alerts Feed', icon: <Bell size={16} /> },
  { id: 'watchlist', label: 'CVE Watch', icon: <Eye size={16} /> },
  { id: 'scorecard', label: 'Score Card', icon: <Award size={16} /> },
];

const TAB_COMPONENTS: Record<TabId, React.LazyExoticComponent<React.FC>> = {
  scanner: VulnerabilityScannerPanel,
  dependencies: DependencyHealthWidget,
  alerts: SecurityAlertsFeed,
  watchlist: CVEWatchList,
  scorecard: SecurityScoreCard,
};

// --- Styled Components ---------------------------------------------------
const Wrapper = styled.div`
  min-height: 100dvh;
  background: var(--bg-base, #0A0A0F);
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;

  @media (max-width: 768px) { padding: 12px; }
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    var(--accent-secondary, #8B5CF6),
    var(--accent-primary, #60C0F0)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 768px) { font-size: 22px; }
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 0;
`;

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    gap: 4px;
    background: var(--bg-surface, rgba(0, 32, 96, 0.3));
    border-radius: 12px;
    padding: 6px 8px;
  }
`;

const TabBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)'
    : 'transparent'};
  color: ${({ $active }) => $active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
    color: var(--text-primary, #E0ECF4);
  }
`;

const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

// --- Component -----------------------------------------------------------
const SecurityWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('scanner');
  const ActivePanel = TAB_COMPONENTS[activeTab];

  return (
    <Wrapper>
      <Header>
        <Title>
          <ShieldCheck size={28} style={{ opacity: 0.7 }} />
          Security Intelligence
        </Title>
        <Subtitle>Vulnerability scanning, dependency health, alerts, and security posture</Subtitle>
      </Header>

      <TabBar role="tablist">
        {TABS.map((tab) => (
          <TabBtn
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </TabBtn>
        ))}
      </TabBar>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Suspense fallback={<LoadingFallback>Loading panel...</LoadingFallback>}>
            <ActivePanel />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Wrapper>
  );
};

export default SecurityWorkspace;
