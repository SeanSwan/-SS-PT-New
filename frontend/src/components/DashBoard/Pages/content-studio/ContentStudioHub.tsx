/**
 * ============================================================================
 * FILE: ContentStudioHub.tsx
 * PURPOSE: Creator workflow hub plus Content Studio production tools
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-08-11
 * PHASE: 10 - Content Studio Upgrades; 2026-08 - hosted-video removal
 * ============================================================================
 *
 * CURRENT TABS: Workflow, Video Library, Coverage Tracker, Video Optimizer,
 * Badge Assets, Blog Drafts (flag-gated OFF), Voice Studio (key-gated).
 *
 * 2026-08-11 — the third-party AI-video panel and its backend service were
 * deleted. The generate endpoint returned a provider job id that nothing could
 * ever poll, so no generated video was ever retrievable. Video generation is
 * being rebuilt as a model harness (local GPU + hosted providers behind one
 * contract) with a durable job queue. Until that ships there is deliberately
 * NO AI-video tab rather than a broken one.
 *
 * COMPONENT: ContentStudioHub
 * PURPOSE: Two-tier Content Studio with service status and creator workflow
 * OWNER: Claude Opus 4.6
 * P0 NOTE: Provider-only tools are hidden until configured; marketing tools
 * moved to the Marketing workspace.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Clapperboard,
  FileText,
  Film,
  Hexagon,
  PackageCheck,
  Scissors,
  Sparkles,
  UploadCloud,
  Video,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import ContentStudioStorageMeter from './ContentStudioStorageMeter';
import ContentStudioProjectQueue from './ContentStudioProjectQueue';
import type { ContentProjectStatus } from './ContentStudioProjects.api';
import {
  Page, Header, TitleGroup, HeaderIcon, Title, TierBadge,
  StudioBrief, TabBar, Tab, TabContent, LoadingFallback,
  WorkflowPanel, WorkflowHeader, WorkflowTitle, WorkflowCopy,
  WorkflowGrid, WorkflowStep, WorkflowStepIcon, WorkflowStepBody,
  WorkflowStepLabel, WorkflowStepMeta, WorkflowActionRow, WorkflowActionButton,
} from './ContentStudioHub.styles';

const VideoLibraryV3 = React.lazy(() => import('../../../../pages/VideoLibraryV3'));
const CrystallineCoverageTracker = React.lazy(() => import('./CrystallineCoverageTracker'));
const NanoBananaBadgeCreator = React.lazy(() => import('./NanoBananaBadgeCreator'));
const VideoOptimizerPanel = React.lazy(() => import('./VideoOptimizerPanel'));

type StudioTab =
  | 'workflow' | 'library' | 'coverage' | 'video-optimizer' | 'nano-banana';

/**
 * Tab gating has two distinct kinds, and conflating them is what shipped a
 * permanently-broken Blog tab to production:
 *
 * - `requiresService` — an EXTERNAL provider key is configured. Only meaningful for
 *   an integration we proxy, where a key genuinely means the feature works.
 * - `requiresFlag`    — OUR OWN backend for this tab exists. Key presence says nothing
 *   about whether our routes were ever written, so a feature whose endpoints are
 *   missing must be flag-gated, never key-gated.
 *
 * Blog Drafts and Voice Studio were removed entirely (2026-08-11) rather than gated:
 * their endpoints (/blog/outline, /blog/draft, /blog/save, /synthesize-voice) do not
 * exist in backend/routes/contentStudioRoutes.mjs. Gating alone still shipped their
 * chunks to every admin. They return as actions on objects when real backends exist.
 */
const FEATURE_FLAGS: Record<string, boolean> = {};

const TABS: {
  id: StudioTab; label: string; icon: React.ReactNode;
  requiresService?: string; requiresFlag?: string;
}[] = [
  { id: 'workflow', label: 'Workflow', icon: <ClipboardList size={16} /> },
  { id: 'library', label: 'Video Library', icon: <Video size={16} /> },
  { id: 'coverage', label: 'Coverage Tracker', icon: <Hexagon size={16} /> },
  { id: 'video-optimizer', label: 'Video Optimizer', icon: <Film size={16} /> },
  { id: 'nano-banana', label: 'Badge Assets', icon: <Sparkles size={16} /> },
];

interface WorkflowStage {
  id: ContentProjectStatus;
  label: string;
  meta: string;
  icon: React.ReactNode;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { id: 'idea', label: 'Idea', meta: 'Coverage gap or client proof selected', icon: <Sparkles size={16} /> },
  { id: 'script', label: 'Script', meta: 'Hook, lesson arc, and call-to-action drafted', icon: <FileText size={16} /> },
  { id: 'shot_list', label: 'Shot List', meta: 'Angles, exercise cues, and B-roll checklist ready', icon: <ClipboardList size={16} /> },
  { id: 'scheduled', label: 'Scheduled', meta: 'Filming, editing, and publish deadlines queued', icon: <CalendarClock size={16} /> },
  { id: 'filmed', label: 'Filmed', meta: 'Raw capture ready for editing handoff', icon: <Clapperboard size={16} /> },
  { id: 'editing', label: 'Editing', meta: 'Cuts, captions, thumbnails, and variants in progress', icon: <Scissors size={16} /> },
  { id: 'qa', label: 'QA', meta: 'Brand, training accuracy, and accessibility checked', icon: <BadgeCheck size={16} /> },
  { id: 'youtube_ready', label: 'YouTube Ready', meta: 'Title, description, chapters, and shorts prompts packaged', icon: <PackageCheck size={16} /> },
  { id: 'uploaded', label: 'Uploaded', meta: 'Final asset imported back into the video library', icon: <UploadCloud size={16} /> },
];

const WORKFLOW_ACTIONS: { label: string; tab: StudioTab; icon: React.ReactNode }[] = [
  { label: 'Create Project From Coverage', tab: 'coverage', icon: <Hexagon size={16} /> },
  { label: 'Prep Editing Handoff', tab: 'video-optimizer', icon: <Film size={16} /> },
  { label: 'Open Video Library', tab: 'library', icon: <Video size={16} /> },
];

const ContentStudioHub: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('workflow');
  const [serviceConfig, setServiceConfig] = useState<Record<string, boolean>>({
    remotion: true, elevenlabs: false, blotato: false,
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

  const visibleTabs = TABS.filter(tab => (
    (!tab.requiresService || serviceConfig[tab.requiresService])
    && (!tab.requiresFlag || FEATURE_FLAGS[tab.requiresFlag] === true)
  ));
  // No provider-gated tools remain in this hub, so a "Provider Tools Ready" tier would
  // advertise a capability that does not exist. The badge states what this surface IS.

  const fallback = (msg: string) => <LoadingFallback>{msg}</LoadingFallback>;

  const renderWorkflow = () => (
    <WorkflowPanel aria-label="Creator Command Center workflow">
      <WorkflowHeader>
        <WorkflowTitle><ClipboardList size={18} /> Creator Command Center</WorkflowTitle>
        <WorkflowCopy>
          Turn exercise coverage gaps into scripts, shot lists, editing handoffs, and YouTube-ready packages.
        </WorkflowCopy>
      </WorkflowHeader>
      <WorkflowGrid>
        {WORKFLOW_STAGES.map(stage => (
          <WorkflowStep key={stage.id}>
            <WorkflowStepIcon>{stage.icon}</WorkflowStepIcon>
            <WorkflowStepBody>
              <WorkflowStepLabel>{stage.label}</WorkflowStepLabel>
              <WorkflowStepMeta>{stage.meta}</WorkflowStepMeta>
            </WorkflowStepBody>
          </WorkflowStep>
        ))}
      </WorkflowGrid>
      <ContentStudioProjectQueue stages={WORKFLOW_STAGES} />
      <WorkflowActionRow aria-label="Content Studio workflow actions">
        {WORKFLOW_ACTIONS.map(action => (
          <WorkflowActionButton key={action.label} type="button" onClick={() => setActiveTab(action.tab)}>
            {action.icon}
            {action.label}
          </WorkflowActionButton>
        ))}
      </WorkflowActionRow>
    </WorkflowPanel>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'workflow': return renderWorkflow();
      case 'library': return <Suspense fallback={fallback('Loading video library...')}><VideoLibraryV3 /></Suspense>;
      case 'coverage': return <Suspense fallback={fallback('Loading coverage...')}><CrystallineCoverageTracker /></Suspense>;
      case 'video-optimizer': return <Suspense fallback={fallback('Loading optimizer...')}><VideoOptimizerPanel /></Suspense>;
      case 'nano-banana': return <Suspense fallback={fallback('Loading badge creator...')}><NanoBananaBadgeCreator /></Suspense>;
      default: return null;
    }
  };

  return (
    <Page>
      <Header>
        <TitleGroup>
          <HeaderIcon><Video size={22} /></HeaderIcon>
          <Title>Content Studio</Title>
          <TierBadge $tier="bootstrap">Creator Mode</TierBadge>
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
