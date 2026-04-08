/**
 * ┌─── WORKSPACE: Marketing Dashboard ──────────────────────────┐
 * │ PURPOSE: Tab container for SEO, keywords, blog, social,     │
 * │          email, calendar, and competitor analysis panels.    │
 * │ PATTERN: Internal tab state + lazy loading (like             │
 * │          ContentStudioHub) — works with roleConfigurations   │
 * │          flat routing in UniversalDashboardLayout.           │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Hash, FileText, Share2, Mail, CalendarDays, Users, Megaphone, BarChart3,
} from 'lucide-react';

// Lazy-load panels for code-splitting
const SEOAuditPanel = lazy(() => import('./marketing/SEOAuditPanel'));
const KeywordResearchWidget = lazy(() => import('./marketing/KeywordResearchWidget'));
const BlogWriterPanel = lazy(() => import('./marketing/BlogWriterPanel'));
const SocialPostGenerator = lazy(() => import('./marketing/SocialPostGenerator'));
const EmailDigestBuilder = lazy(() => import('./marketing/EmailDigestBuilder'));
const MarketingCalendar = lazy(() => import('./marketing/MarketingCalendar'));
const CompetitorAnalysisWidget = lazy(() => import('./marketing/CompetitorAnalysisWidget'));
const SocialAnalyticsDashboard = lazy(() => import('./marketing/SocialAnalyticsDashboard'));
const ContentCalendarPanel = lazy(() => import('./marketing/ContentCalendarPanel'));

// ─── Types ─────────────────────────────────────────────────────
type TabId = 'seo' | 'keywords' | 'blog' | 'social' | 'social-hub' | 'email' | 'calendar' | 'ai-calendar' | 'competitors';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'seo', label: 'SEO Audit', icon: <Search size={16} /> },
  { id: 'keywords', label: 'Keywords', icon: <Hash size={16} /> },
  { id: 'blog', label: 'Blog Writer', icon: <FileText size={16} /> },
  { id: 'social', label: 'Social Posts', icon: <Share2 size={16} /> },
  { id: 'social-hub', label: 'Social Hub', icon: <BarChart3 size={16} /> },
  { id: 'email', label: 'Email Digest', icon: <Mail size={16} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { id: 'ai-calendar', label: 'AI Calendar', icon: <Megaphone size={16} /> },
  { id: 'competitors', label: 'Competitors', icon: <Users size={16} /> },
];

const TAB_COMPONENTS: Record<TabId, React.LazyExoticComponent<React.FC>> = {
  seo: SEOAuditPanel,
  keywords: KeywordResearchWidget,
  blog: BlogWriterPanel,
  social: SocialPostGenerator,
  'social-hub': SocialAnalyticsDashboard,
  email: EmailDigestBuilder,
  calendar: MarketingCalendar,
  'ai-calendar': ContentCalendarPanel,
  competitors: CompetitorAnalysisWidget,
};

// ─── Styled Components ─────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────
const MarketingWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('seo');
  const ActivePanel = TAB_COMPONENTS[activeTab];

  return (
    <Wrapper>
      <Header>
        <Title>
          <Megaphone size={28} style={{ opacity: 0.7 }} />
          Marketing
        </Title>
        <Subtitle>SEO, content creation, social media, and competitive intelligence</Subtitle>
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

export default MarketingWorkspace;
