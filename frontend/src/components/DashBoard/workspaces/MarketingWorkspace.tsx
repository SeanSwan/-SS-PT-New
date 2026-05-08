/**
 * ============================================================================
 * WORKSPACE: MarketingWorkspace.tsx
 * PURPOSE: Operator command center for campaigns, approvals, leads, and signals.
 * AUTHOR: Codex GPT-5 | UPDATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Keeps the admin marketing surface compressed to five
 * revenue-facing workflows: Overview, Approval Queue, Calendar, Leads, and
 * Analytics.
 *
 * HOW IT FITS IN THE APP: Mounted by UniversalDashboardLayout at the admin
 * marketing route and lazy-loads the existing marketing panels.
 *
 * KEY DECISIONS:
 * - Secondary SEO, keyword, blog, email, and competitor tools are not top-level.
 * - The workspace is for operations, not content creation settings.
 * - Styled-components only with Crystalline Swan token fallbacks.
 */

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, CalendarDays, Users, Megaphone, BarChart3,
} from 'lucide-react';

const MarketingCommandOverview = lazy(() => import('./marketing/MarketingCommandOverview'));
const SocialPostGenerator = lazy(() => import('./marketing/SocialPostGenerator'));
const MarketingCalendar = lazy(() => import('./marketing/MarketingCalendar'));
const LeadPipelinePanel = lazy(() => import('./marketing/LeadPipelinePanel'));
const SocialAnalyticsDashboard = lazy(() => import('./marketing/SocialAnalyticsDashboard'));

type TabId = 'overview' | 'queue' | 'calendar' | 'leads' | 'analytics';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: <Megaphone size={16} /> },
  { id: 'queue', label: 'Approval Queue', icon: <Share2 size={16} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { id: 'leads', label: 'Leads', icon: <Users size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
];

const Wrapper = styled.div`
  min-height: 100dvh;
  background: var(--bg-base, #0A0A0F);
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;

  @media (max-width: 768px) {
    padding: 12px;
  }
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

  @media (max-width: 768px) {
    font-size: 22px;
  }
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

  &::-webkit-scrollbar {
    display: none;
  }

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
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
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

const MarketingWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'overview':
        return <MarketingCommandOverview onSelectTab={(tab) => setActiveTab(tab)} />;
      case 'queue':
        return <SocialPostGenerator />;
      case 'calendar':
        return <MarketingCalendar />;
      case 'leads':
        return <LeadPipelinePanel />;
      case 'analytics':
        return <SocialAnalyticsDashboard />;
      default:
        return null;
    }
  };

  return (
    <Wrapper>
      <Header>
        <Title>
          <Megaphone size={28} style={{ opacity: 0.7 }} />
          Marketing Command Center
        </Title>
        <Subtitle>Human-approved campaigns, publishing cadence, lead follow-up, and performance signals</Subtitle>
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
            {renderActivePanel()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Wrapper>
  );
};

export default MarketingWorkspace;
