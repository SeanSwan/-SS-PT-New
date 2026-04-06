/**
 * ============================================================================
 * FILE: ContentStudioHub.tsx
 * PURPOSE: Two-tier Content Studio hub — Bootstrap (free) vs Full Arsenal (paid)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-06
 * PHASE: 10 — Content Studio Upgrades (3 new tabs + Settings extracted)
 * ============================================================================
 *
 * PHASE 10 ADDITIONS:
 * - SeedanceVideoPanel (Seedance 2.0 AI video generation)
 * - BlogWriterTab (SEO-optimized long-form content)
 * - SocialDistributionPanel (IG/FB/X publishing + previews)
 * - ContentStudioSettings extracted to own file
 * - Styled components extracted to ContentStudioHub.styles.ts
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ContentStudioHub                                  ║
 * ║  PURPOSE: Two-tier Content Studio with service status          ║
 * ║  OWNER: Claude Opus 4.6                                        ║
 * ╚════���═════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Video, Wand2, Mic2, Share2, Settings, Hexagon,
  CheckCircle2, Lock, Sparkles, CalendarDays, FileText, Send,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import CrystallineLockOverlay from '../../../Shared/CrystallineLockOverlay';
import { AICommandBar } from '../../../Shared/AICommandBar';
import {
  Page, Header, TitleGroup, HeaderIcon, Title, TierBadge,
  ServiceGrid, ServiceCard, ServiceIcon, ServiceInfo,
  ServiceLabel, ServiceMeta, TabBar, Tab, TabContent, LoadingFallback,
} from './ContentStudioHub.styles';

// Lazy-load tab components
const VideoLibraryV3 = React.lazy(() => import('../../../../pages/VideoLibraryV3'));
const CrystallineCoverageTracker = React.lazy(() => import('./CrystallineCoverageTracker'));
const RemotionTemplateGallery = React.lazy(() => import('./RemotionTemplateGallery'));
const VoiceStudioPanel = React.lazy(() => import('./VoiceStudioPanel'));
const ContentCalendarPanel = React.lazy(() => import('./ContentCalendarPanel'));
const DistributionHubPanel = React.lazy(() => import('./DistributionHubPanel'));
const NanoBananaBadgeCreator = React.lazy(() => import('./NanoBananaBadgeCreator'));
const ContentStudioSettings = React.lazy(() => import('./ContentStudioSettings'));
const SeedanceVideoPanel = React.lazy(() => import('./SeedanceVideoPanel'));
const BlogWriterTab = React.lazy(() => import('./BlogWriterTab'));
const SocialDistributionPanel = React.lazy(() => import('./SocialDistributionPanel'));

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─��───────────────────────────────────────────────────────────
interface ServiceStatusItem {
  key: string; label: string; description: string;
  icon: React.ReactNode; configured: boolean; tier: 'bootstrap' | 'full';
}

type StudioTab =
  | 'library' | 'coverage' | 'ai-video' | 'seedance-video'
  | 'nano-banana' | 'voice' | 'calendar'
  | 'blog-writer' | 'social-publish'
  | 'distribution' | 'settings';

const TABS: { id: StudioTab; label: string; icon: React.ReactNode; requiresService?: string }[] = [
  { id: 'library', label: 'Video Library', icon: <Video size={16} /> },
  { id: 'coverage', label: 'Coverage Tracker', icon: <Hexagon size={16} /> },
  { id: 'ai-video', label: 'Motion Templates', icon: <Wand2 size={16} /> },
  { id: 'seedance-video', label: 'AI Video', icon: <Sparkles size={16} />, requiresService: 'seedance' },
  { id: 'nano-banana', label: 'Badge Creator', icon: <Sparkles size={16} /> },
  { id: 'blog-writer', label: 'Blog Writer', icon: <FileText size={16} /> },
  { id: 'social-publish', label: 'Social Publish', icon: <Send size={16} /> },
  { id: 'voice', label: 'Voice Studio', icon: <Mic2 size={16} />, requiresService: 'elevenlabs' },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { id: 'distribution', label: 'Distribution', icon: <Share2 size={16} />, requiresService: 'blotato' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────���───
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

  const services: ServiceStatusItem[] = [
    { key: 'remotion', label: 'Remotion', description: 'Video rendering', icon: <Video size={16} />, configured: true, tier: 'bootstrap' },
    { key: 'seedance', label: 'Seedance 2.0', description: 'AI video (Higgsfield)', icon: <Sparkles size={16} />, configured: serviceConfig.seedance, tier: 'full' },
    { key: 'elevenlabs', label: 'ElevenLabs', description: 'Voice synthesis', icon: <Mic2 size={16} />, configured: serviceConfig.elevenlabs, tier: 'full' },
    { key: 'blotato', label: 'Blotato', description: 'Distribution', icon: <Share2 size={16} />, configured: serviceConfig.blotato, tier: 'full' },
  ];

  const configuredCount = services.filter(s => s.configured).length;
  const currentTier: 'bootstrap' | 'full' = configuredCount >= services.length ? 'full' : 'bootstrap';
  const isLocked = (tab: typeof TABS[number]) => tab.requiresService ? !serviceConfig[tab.requiresService] : false;

  const fallback = (msg: string) => <LoadingFallback>{msg}</LoadingFallback>;

  const lockWrap = (service: string, name: string, desc: string, cta: string, children: React.ReactNode) => (
    <CrystallineLockOverlay isLocked={!serviceConfig[service]} featureName={name} description={desc} onConfigure={() => setActiveTab('settings')} ctaLabel={cta}>
      {children}
    </CrystallineLockOverlay>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'library': return <Suspense fallback={fallback('Loading video library...')}><VideoLibraryV3 /></Suspense>;
      case 'coverage': return <Suspense fallback={fallback('Loading coverage...')}><CrystallineCoverageTracker /></Suspense>;
      case 'ai-video': return <Suspense fallback={fallback('Loading templates...')}><RemotionTemplateGallery /></Suspense>;
      case 'seedance-video': return lockWrap('seedance', 'Seedance 2.0 Video', 'Generate exercise demos and social clips with AI. Add your Seedance/Higgsfield API key in Settings.', 'Configure Seedance', <Suspense fallback={fallback('Loading AI video...')}><SeedanceVideoPanel /></Suspense>);
      case 'nano-banana': return <Suspense fallback={fallback('Loading badge creator...')}><NanoBananaBadgeCreator /></Suspense>;
      case 'blog-writer': return <Suspense fallback={fallback('Loading blog writer...')}><BlogWriterTab /></Suspense>;
      case 'social-publish': return <Suspense fallback={fallback('Loading social...')}><SocialDistributionPanel /></Suspense>;
      case 'voice': return lockWrap('elevenlabs', 'Voice Studio', 'Create professional voiceovers with ElevenLabs. Add your API key in Settings.', 'Configure ElevenLabs', <Suspense fallback={fallback('Loading voice studio...')}><VoiceStudioPanel /></Suspense>);
      case 'calendar': return <Suspense fallback={fallback('Loading calendar...')}><ContentCalendarPanel /></Suspense>;
      case 'distribution': return lockWrap('blotato', 'Distribution Hub', 'Publish to YouTube, TikTok, Instagram and more. Add your Blotato API key in Settings.', 'Configure Blotato', <Suspense fallback={fallback('Loading distribution...')}><DistributionHubPanel /></Suspense>);
      case 'settings': return <Suspense fallback={fallback('Loading settings...')}><ContentStudioSettings serviceConfig={serviceConfig} onRefresh={fetchServiceStatus} /></Suspense>;
      default: return null;
    }
  };

  return (
    <Page>
      <Header>
        <TitleGroup>
          <HeaderIcon><Video size={22} /></HeaderIcon>
          <Title>Content Studio</Title>
          <TierBadge $tier={currentTier}>{currentTier === 'full' ? 'Full Arsenal' : 'Bootstrap Mode'}</TierBadge>
        </TitleGroup>
      </Header>
      <div style={{ padding: '16px 24px 0' }}><AICommandBar context="content" /></div>
      <ServiceGrid>
        {services.map(svc => (
          <ServiceCard key={svc.key} $configured={svc.configured}>
            <ServiceIcon $configured={svc.configured}>{svc.configured ? <CheckCircle2 size={16} /> : svc.icon}</ServiceIcon>
            <ServiceInfo>
              <ServiceLabel>{svc.label}</ServiceLabel>
              <ServiceMeta $configured={svc.configured}>{svc.configured ? 'Ready' : 'Not configured'}</ServiceMeta>
            </ServiceInfo>
          </ServiceCard>
        ))}
      </ServiceGrid>
      <TabBar role="tablist">
        {TABS.map(tab => {
          const locked = isLocked(tab);
          return (
            <Tab key={tab.id} $active={activeTab === tab.id} $locked={locked} onClick={() => !locked && setActiveTab(tab.id)} role="tab" aria-selected={activeTab === tab.id} aria-disabled={locked} title={locked ? `Requires ${tab.requiresService} API key` : tab.label}>
              {tab.icon} {tab.label} {locked && <Lock size={12} />}
            </Tab>
          );
        })}
      </TabBar>
      <TabContent role="tabpanel">{renderTab()}</TabContent>
    </Page>
  );
};

export default ContentStudioHub;
