/**
 * ============================================================================
 * FILE: ContentStudioHub.tsx
 * PURPOSE: Two-tier Content Studio hub — Bootstrap (free) vs Full Arsenal (paid)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps the Content Studio with a tier-aware dashboard.
 * Shows service status cards (Remotion, Kling, ElevenLabs, Blotato) with
 * CrystallineLockOverlay on services that haven't been configured yet.
 * Services unlock independently as API keys are added via admin settings.
 *
 * HOW IT FITS IN THE APP: Admin Dashboard → Content Studio → ContentStudioHub
 * KEY DECISIONS: Tab-based navigation. Bootstrap Mode = Remotion + uploads only.
 * Full Arsenal = all services. Each service unlocks independently.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ContentStudioHub                                  ║
 * ║  PURPOSE: Two-tier Content Studio with service status          ║
 * ║  OWNER: Claude Opus 4.6                                        ║
 * ║  LAST VALIDATED: 2026-03-28                                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Content Studio                    [Bootstrap Mode ▾]       │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Video Library] [AI Video] [Voice Studio] [Distribution]  │
 * ├────────────────────────────────────────────────────────────┤
 * │ SERVICE STATUS:                                            │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
 * │ │ Remotion  │ │ Kling AI │ │ Eleven   │ │ Blotato  │      │
 * │ │ ✅ Ready  │ │ 🔒 Lock  │ │ 🔒 Lock  │ │ 🔒 Lock  │      │
 * │ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
 * ├────────────────────────────────────────────────────────────┤
 * │ [Active Tab Content Area]                                  │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import styled from 'styled-components';
import {
  Video, Wand2, Mic2, Share2, Settings, Hexagon,
  CheckCircle2, Lock, Zap, Sparkles, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import CrystallineLockOverlay from '../../../Shared/CrystallineLockOverlay';
import { AICommandBar } from '../../../Shared/AICommandBar';

// Lazy-load heavy tab components
const VideoLibraryV3 = React.lazy(() => import('../../../../pages/VideoLibraryV3'));
const CrystallineCoverageTracker = React.lazy(() => import('./CrystallineCoverageTracker'));
const RemotionTemplateGallery = React.lazy(() => import('./RemotionTemplateGallery'));
const VoiceStudioPanel = React.lazy(() => import('./VoiceStudioPanel'));
const ContentCalendarPanel = React.lazy(() => import('./ContentCalendarPanel'));
const DistributionHubPanel = React.lazy(() => import('./DistributionHubPanel'));
const NanoBananaBadgeCreator = React.lazy(() => import('./NanoBananaBadgeCreator'));

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface ServiceStatus {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  configured: boolean;
  tier: 'bootstrap' | 'full';
}

type StudioTab = 'library' | 'coverage' | 'ai-video' | 'nano-banana' | 'voice' | 'calendar' | 'distribution' | 'settings';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
`;

const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

const TierBadge = styled.span<{ $tier: 'bootstrap' | 'full' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 6px;
  color: ${({ $tier }) => ($tier === 'full' ? '#C6A84B' : '#60C0F0')};
  background: ${({ $tier }) =>
    $tier === 'full' ? 'rgba(198, 168, 75, 0.15)' : 'rgba(96, 192, 240, 0.12)'};
  border: 1px solid ${({ $tier }) =>
    $tier === 'full' ? 'rgba(198, 168, 75, 0.3)' : 'rgba(96, 192, 240, 0.2)'};
`;

// ─── Service Status Cards ─────────────────────────────────
const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px 24px;
`;

const ServiceCard = styled.div<{ $configured: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $configured }) =>
    $configured
      ? 'rgba(96, 192, 240, 0.25)'
      : 'rgba(96, 192, 240, 0.08)'};
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-surface, #1A1A24);
  }
`;

const ServiceIcon = styled.div<{ $configured: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $configured }) =>
    $configured ? 'rgba(96, 192, 240, 0.12)' : 'rgba(139, 92, 246, 0.12)'};
  color: ${({ $configured }) => ($configured ? '#60C0F0' : '#8B5CF6')};
  flex-shrink: 0;
`;

const ServiceInfo = styled.div`
  min-width: 0;
`;

const ServiceLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const ServiceMeta = styled.div<{ $configured: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: ${({ $configured }) => ($configured ? '#60C0F0' : 'rgba(224, 236, 244, 0.6)')};
  display: flex;
  align-items: center;
  gap: 4px;
`;

// ─── Tab Navigation ───────────────────────────────────────
const TabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ $active: boolean; $locked?: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: ${({ $locked }) => ($locked ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  min-height: 44px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active, $locked }) =>
    $locked
      ? 'rgba(224, 236, 244, 0.3)'
      : $active
        ? 'var(--text-primary, #E0ECF4)'
        : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  border-bottom: 2px solid ${({ $active }) =>
    $active ? '#8B5CF6' : 'transparent'};
  white-space: nowrap;
  transition: all 0.2s ease;
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};

  &:hover:not([disabled]) {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
  }

  svg {
    flex-shrink: 0;
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const PlaceholderPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
  text-align: center;
`;

const PlaceholderIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
`;

const PlaceholderTitle = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PlaceholderDesc = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
  max-width: 400px;
  line-height: 1.5;
`;

const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: rgba(224, 236, 244, 0.6);
  font-size: 0.9rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Definitions
// ─────────────────────────────────────────────────────────────
const TABS: { id: StudioTab; label: string; icon: React.ReactNode; requiresService?: string }[] = [
  { id: 'library', label: 'Video Library', icon: <Video size={16} /> },
  { id: 'coverage', label: 'Coverage Tracker', icon: <Hexagon size={16} /> },
  { id: 'ai-video', label: 'Motion Templates', icon: <Wand2 size={16} /> },
  { id: 'nano-banana', label: 'Badge Creator', icon: <Sparkles size={16} /> },
  { id: 'voice', label: 'Voice Studio', icon: <Mic2 size={16} />, requiresService: 'elevenlabs' },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { id: 'distribution', label: 'Distribution', icon: <Share2 size={16} />, requiresService: 'blotato' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ContentStudioHub: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('library');
  const [serviceConfig, setServiceConfig] = useState<Record<string, boolean>>({
    remotion: true,   // Always available (bootstrap)
    kling: false,
    elevenlabs: false,
    blotato: false,
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Fetch service configuration status from backend
  const fetchServiceStatus = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/content-studio/service-status');
      if (res.data?.success) {
        setServiceConfig(prev => ({ ...prev, ...res.data.data }));
      }
    } catch {
      // Non-fatal — assume bootstrap mode if API not ready yet
    } finally {
      setLoadingConfig(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchServiceStatus();
  }, [fetchServiceStatus]);

  // Build service status list
  const services: ServiceStatus[] = [
    {
      key: 'remotion',
      label: 'Remotion',
      description: 'Video rendering engine',
      icon: <Video size={16} />,
      configured: true,
      tier: 'bootstrap',
    },
    {
      key: 'kling',
      label: 'Kling AI',
      description: 'AI video generation',
      icon: <Sparkles size={16} />,
      configured: serviceConfig.kling,
      tier: 'full',
    },
    {
      key: 'elevenlabs',
      label: 'ElevenLabs',
      description: 'AI voice synthesis',
      icon: <Mic2 size={16} />,
      configured: serviceConfig.elevenlabs,
      tier: 'full',
    },
    {
      key: 'blotato',
      label: 'Blotato',
      description: 'Multi-platform distribution',
      icon: <Share2 size={16} />,
      configured: serviceConfig.blotato,
      tier: 'full',
    },
  ];

  const configuredCount = services.filter(s => s.configured).length;
  const currentTier: 'bootstrap' | 'full' = configuredCount >= services.length ? 'full' : 'bootstrap';

  const isTabLocked = (tab: typeof TABS[number]) => {
    if (!tab.requiresService) return false;
    return !serviceConfig[tab.requiresService];
  };

  const handleTabClick = (tab: typeof TABS[number]) => {
    if (isTabLocked(tab)) return;
    setActiveTab(tab.id);
  };

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'library':
        return (
          <Suspense fallback={<LoadingFallback>Loading video library...</LoadingFallback>}>
            <VideoLibraryV3 />
          </Suspense>
        );

      case 'coverage':
        return (
          <Suspense fallback={<LoadingFallback>Loading coverage tracker...</LoadingFallback>}>
            <CrystallineCoverageTracker />
          </Suspense>
        );

      case 'ai-video':
        return (
          <Suspense fallback={<LoadingFallback>Loading motion templates...</LoadingFallback>}>
            <RemotionTemplateGallery />
          </Suspense>
        );

      case 'nano-banana':
        return (
          <Suspense fallback={<LoadingFallback>Loading badge creator...</LoadingFallback>}>
            <NanoBananaBadgeCreator />
          </Suspense>
        );

      case 'voice':
        return (
          <CrystallineLockOverlay
            isLocked={!serviceConfig.elevenlabs}
            featureName="Voice Studio"
            description="Create professional voiceovers with ElevenLabs. Add your API key in Settings to unlock."
            onConfigure={() => setActiveTab('settings')}
            ctaLabel="Configure ElevenLabs"
          >
            <Suspense fallback={<LoadingFallback>Loading voice studio...</LoadingFallback>}>
              <VoiceStudioPanel />
            </Suspense>
          </CrystallineLockOverlay>
        );

      case 'calendar':
        return (
          <Suspense fallback={<LoadingFallback>Loading content calendar...</LoadingFallback>}>
            <ContentCalendarPanel />
          </Suspense>
        );

      case 'distribution':
        return (
          <CrystallineLockOverlay
            isLocked={!serviceConfig.blotato}
            featureName="Distribution Hub"
            description="Publish to YouTube, TikTok, Instagram and more with Blotato. Add your API key in Settings to unlock."
            onConfigure={() => setActiveTab('settings')}
            ctaLabel="Configure Blotato"
          >
            <Suspense fallback={<LoadingFallback>Loading distribution hub...</LoadingFallback>}>
              <DistributionHubPanel />
            </Suspense>
          </CrystallineLockOverlay>
        );

      case 'settings':
        return <ContentStudioSettings serviceConfig={serviceConfig} onRefresh={fetchServiceStatus} />;

      default:
        return null;
    }
  };

  return (
    <Page>
      <Header>
        <TitleGroup>
          <HeaderIcon><Video size={22} /></HeaderIcon>
          <Title>Content Studio</Title>
          <TierBadge $tier={currentTier}>
            {currentTier === 'full' ? 'Full Arsenal' : 'Bootstrap Mode'}
          </TierBadge>
        </TitleGroup>
      </Header>

      {/* AI Command Bar — content context */}
      <div style={{ padding: '16px 24px 0' }}>
        <AICommandBar context="content" />
      </div>

      {/* Service Status Cards */}
      <ServiceGrid>
        {services.map(svc => (
          <ServiceCard key={svc.key} $configured={svc.configured}>
            <ServiceIcon $configured={svc.configured}>
              {svc.configured ? <CheckCircle2 size={16} /> : svc.icon}
            </ServiceIcon>
            <ServiceInfo>
              <ServiceLabel>{svc.label}</ServiceLabel>
              <ServiceMeta $configured={svc.configured}>
                {svc.configured ? 'Ready' : 'Not configured'}
              </ServiceMeta>
            </ServiceInfo>
          </ServiceCard>
        ))}
      </ServiceGrid>

      {/* Tab Navigation */}
      <TabBar role="tablist">
        {TABS.map(tab => {
          const locked = isTabLocked(tab);
          return (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              $locked={locked}
              onClick={() => handleTabClick(tab)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-disabled={locked}
              title={locked ? `Requires ${tab.requiresService} API key` : tab.label}
            >
              {tab.icon}
              {tab.label}
              {locked && <Lock size={12} />}
            </Tab>
          );
        })}
      </TabBar>

      {/* Tab Content */}
      <TabContent role="tabpanel">
        {renderTabContent()}
      </TabContent>
    </Page>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Settings Sub-Component
// PURPOSE: API key configuration panel for Content Studio services
// ─────────────────────────────────────────────────────────────
const SettingsPage = styled.div`
  padding: 24px;
  max-width: 640px;
`;

const SettingsTitle = styled.h2`
  margin: 0 0 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
`;

const SettingsDesc = styled.p`
  margin: 0 0 24px;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.5;
`;

const FieldGroup = styled.div`
  margin-bottom: 20px;
`;

const FieldLabel = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 6px;
`;

const FieldHint = styled.div`
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 8px;
`;

const ApiKeyInput = styled.input`
  width: 100%;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  min-height: 44px;
  transition: border-color 0.3s ease;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }

  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }
`;

const SaveButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 14px;
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  background: var(--bg-primary, #002060);
  color: #E0ECF4;
  border: 1px solid rgba(139, 92, 246, 0.3);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.5);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  font-size: 0.8rem;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(96, 192, 240, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  border-left: 3px solid ${({ $type }) =>
    $type === 'success' ? '#60C0F0' : '#8B5CF6'};
  color: var(--text-primary, #E0ECF4);
`;

interface ContentStudioSettingsProps {
  serviceConfig: Record<string, boolean>;
  onRefresh: () => Promise<void>;
}

const ContentStudioSettings: React.FC<ContentStudioSettingsProps> = ({ serviceConfig, onRefresh }) => {
  const { authAxios } = useAuth();
  const [klingKey, setKlingKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [blotatoKey, setBlotatoKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const keys: Record<string, string> = {};
      if (klingKey.trim()) keys.kling = klingKey.trim();
      if (elevenLabsKey.trim()) keys.elevenlabs = elevenLabsKey.trim();
      if (blotatoKey.trim()) keys.blotato = blotatoKey.trim();

      if (Object.keys(keys).length === 0) {
        setStatus({ type: 'error', msg: 'Enter at least one API key to save.' });
        setSaving(false);
        return;
      }

      await authAxios.put('/api/content-studio/api-keys', { keys });
      setStatus({ type: 'success', msg: 'API keys saved. Services are now unlocking.' });
      setKlingKey('');
      setElevenLabsKey('');
      setBlotatoKey('');
      await onRefresh();
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save API keys. Check your connection.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsTitle>Content Studio Configuration</SettingsTitle>
      <SettingsDesc>
        Add API keys to unlock premium services. Each service activates
        independently — you don't need all keys at once.
      </SettingsDesc>

      <FieldGroup>
        <FieldLabel>Kling AI API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.kling ? '✓ Configured' : 'Get your key from kling.ai'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={klingKey}
          onChange={(e) => setKlingKey(e.target.value)}
          placeholder={serviceConfig.kling ? '••••••••••••••••' : 'sk-kling-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>ElevenLabs API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.elevenlabs ? '✓ Configured' : 'Get your key from elevenlabs.io'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={elevenLabsKey}
          onChange={(e) => setElevenLabsKey(e.target.value)}
          placeholder={serviceConfig.elevenlabs ? '••••••••••••••••' : 'xi-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Blotato API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.blotato ? '✓ Configured' : 'Get your key from blotato.com'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={blotatoKey}
          onChange={(e) => setBlotatoKey(e.target.value)}
          placeholder={serviceConfig.blotato ? '••••••••••••••••' : 'blt-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <SaveButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save API Keys'}
      </SaveButton>

      {status && <StatusMsg $type={status.type}>{status.msg}</StatusMsg>}
    </SettingsPage>
  );
};

export default ContentStudioHub;
