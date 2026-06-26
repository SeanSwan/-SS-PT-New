/**
 * ============================================================================
 * FILE: ContentStudioHub.tsx
 * PURPOSE: Two-tier Content Studio hub - Bootstrap (free) vs Full Arsenal (paid)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-06
 * PHASE: 10 - Content Studio Upgrades (3 new tabs + Settings extracted)
 * ============================================================================
 *
 * PHASE 10 ADDITIONS:
 * - SeedanceVideoPanel (Seedance 2.0 AI video generation)
 * - BlogWriterTab (SEO-optimized long-form content)
 * - Publishing and provider settings are intentionally outside this workspace
 * - Styled components extracted to ContentStudioHub.styles.ts
 *
 * COMPONENT: ContentStudioHub
 * PURPOSE: Two-tier Content Studio with service status
 * OWNER: Claude Opus 4.6
 * P0 NOTE: Provider-only tools are hidden until configured; marketing tools
 * moved to the Marketing workspace.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Video, Mic2, Hexagon, Sparkles, FileText, Film,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import ContentStudioStorageMeter from './ContentStudioStorageMeter';
import {
  Page, Header, TitleGroup, HeaderIcon, Title, TierBadge,
  StudioBrief, TabBar, Tab, TabContent, LoadingFallback,
} from './ContentStudioHub.styles';

const VideoLibraryV3 = React.lazy(() => import('../../../../pages/VideoLibraryV3'));
const CrystallineCoverageTracker = React.lazy(() => import('./CrystallineCoverageTracker'));
const VoiceStudioPanel = React.lazy(() => import('./VoiceStudioPanel'));
const NanoBananaBadgeCreator = React.lazy(() => import('./NanoBananaBadgeCreator'));
const SeedanceVideoPanel = React.lazy(() => import('./SeedanceVideoPanel'));
const BlogWriterTab = React.lazy(() => import('./BlogWriterTab'));
const VideoOptimizerPanel = React.lazy(() => import('./VideoOptimizerPanel'));

type StudioTab =
  | 'library' | 'coverage' | 'video-optimizer' | 'seedance-video'
  | 'nano-banana' | 'voice' | 'blog-writer';

const TABS: { id: StudioTab; label: string; icon: React.ReactNode; requiresService?: string }[] = [
  { id: 'library', label: 'Video Library', icon: <Video size={16} /> },
  { id: 'coverage', label: 'Coverage Tracker', icon: <Hexagon size={16} /> },
  { id: 'video-optimizer', label: 'Video Optimizer', icon: <Film size={16} /> },
  { id: 'nano-banana', label: 'Badge Assets', icon: <Sparkles size={16} /> },
  { id: 'blog-writer', label: 'Blog Drafts', icon: <FileText size={16} /> },
  { id: 'seedance-video', label: 'Seedance Video', icon: <Sparkles size={16} />, requiresService: 'seedance' },
  { id: 'voice', label: 'Voice Studio', icon: <Mic2 size={16} />, requiresService: 'elevenlabs' },
];

const ContentStudioHub: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('library');
  const [serviceConfig, setServiceConfig] = useState<Record<string, boolean>>({
    remotion: true, seedance: false, elevenlabs: false, blotato: false,
  });
  const [, setLoadingConfig] = useState(true);

  const fetchServiceStatus = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/content-studio/service-status');
      if (res.data?.success) setServiceConfig(prev => ({ ...prev, ...res.data.data }));
    } catch { /* bootstrap mode */ }
    finally { setLoadingConfig(false); }
  }, [authAxios]);

  useEffect(() => { fetchServiceStatus(); }, [fetchServiceStatus]);

  const visibleTabs = TABS.filter(tab => !tab.requiresService || serviceConfig[tab.requiresService]);
  const currentTier: 'bootstrap' | 'full' = serviceConfig.seedance || serviceConfig.elevenlabs ? 'full' : 'bootstrap';

  const fallback = (msg: string) => <LoadingFallback>{msg}</LoadingFallback>;

  const renderTab = () => {
    switch (activeTab) {
      case 'library': return <Suspense fallback={fallback('Loading video library...')}><VideoLibraryV3 /></Suspense>;
      case 'coverage': return <Suspense fallback={fallback('Loading coverage...')}><CrystallineCoverageTracker /></Suspense>;
      case 'video-optimizer': return <Suspense fallback={fallback('Loading optimizer...')}><VideoOptimizerPanel /></Suspense>;
      case 'nano-banana': return <Suspense fallback={fallback('Loading badge creator...')}><NanoBananaBadgeCreator /></Suspense>;
      case 'blog-writer': return <Suspense fallback={fallback('Loading blog writer...')}><BlogWriterTab /></Suspense>;
      case 'seedance-video': return <Suspense fallback={fallback('Loading Seedance video...')}><SeedanceVideoPanel /></Suspense>;
      case 'voice': return <Suspense fallback={fallback('Loading voice studio...')}><VoiceStudioPanel /></Suspense>;
      default: return null;
    }
  };

  return (
    <Page>
      <Header>
        <TitleGroup>
          <HeaderIcon><Video size={22} /></HeaderIcon>
          <Title>Content Studio</Title>
          <TierBadge $tier={currentTier}>{currentTier === 'full' ? 'Provider Tools Ready' : 'Creator Mode'}</TierBadge>
        </TitleGroup>
        <StudioBrief>
          Create assets here: exercise videos, education coverage, badges, and blog drafts.
          Move publishing, distribution, lead capture, and performance tracking through the Marketing Command Center.
        </StudioBrief>
      </Header>
      <ContentStudioStorageMeter />
      <TabBar role="tablist">
        {visibleTabs.map(tab => (
          <Tab key={tab.id} $active={activeTab === tab.id} $locked={false} onClick={() => setActiveTab(tab.id)} role="tab" aria-selected={activeTab === tab.id} title={tab.label}>
            {tab.icon} {tab.label}
          </Tab>
        ))}
      </TabBar>
      <TabContent role="tabpanel">{renderTab()}</TabContent>
    </Page>
  );
};

export default ContentStudioHub;
