/**
 * ============================================================================
 * FILE: TrainingTabContent.tsx
 * PURPOSE: Training tab's vertical sidebar layout with 4 sub-sections
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a sidebar + content area layout for the Training
 * tab inside ClientDetailView. The sidebar lists 4 sub-sections (Program Architect,
 * Active Session, Enchanted AI, Vault History). Selecting a sidebar item lazy-loads
 * the corresponding component into the main content area.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → renderTraining → TrainingTabContent
 *
 * KEY DECISIONS: Sidebar collapses to icon-only at tablet, converts to horizontal
 * pill tabs on mobile. React.lazy for heavy components (WorkoutPlanBuilder,
 * WorkoutCopilotPanel) to avoid loading unused code. AICommandBar is eagerly
 * loaded since it's lightweight.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainingTabContent                               ║
 * ║  PURPOSE: Training tab sidebar layout with 4 sub-sections    ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * Desktop (>=1024px):
 * ┌─── 240px Sidebar ────────┬──── Flex Content ──────────────┐
 * │ [*] Program Architect     │                                 │
 * │ [ ] Active Session        │  (Lazy-loaded content for       │
 * │ [ ] Enchanted AI          │   selected sidebar item)        │
 * │ [ ] Vault History         │                                 │
 * └──────────────────────────┴─────────────────────────────────┘
 *
 * Tablet (768-1023px):
 * ┌─72px─┬──── Content ──────────────────────────┐
 * │ [ic] │                                        │
 * │ [ic] │  (Same content, sidebar icons only)    │
 * │ [ic] │                                        │
 * │ [ic] │                                        │
 * └──────┴────────────────────────────────────────┘
 *
 * Mobile (<768px):
 * ┌──────────────────────────────────────────────┐
 * │ [Architect] [Session] [AI] [History]  ← pills│
 * ├──────────────────────────────────────────────┤
 * │  (Content below)                              │
 * └──────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName }
 * State:     { activeSection }
 * Children:  WorkoutPlanBuilder (lazy), WorkoutCopilotPanel (lazy),
 *            AICommandBar (eager), VaultHistoryPlaceholder
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Sidebar: Program Architect] -> Sets activeSection='architect' -> Loads WorkoutPlanBuilder
 * [Sidebar: Active Session]    -> Sets activeSection='session'   -> Loads WorkoutCopilotPanel
 * [Sidebar: Enchanted AI]      -> Sets activeSection='ai'        -> Renders AICommandBar
 * [Sidebar: Vault History]     -> Sets activeSection='history'   -> Shows placeholder
 */

import React, { useState, useCallback, Suspense } from 'react';
import styled from 'styled-components';
import { Wand2, Play, Sparkles, Archive, FileAudio } from 'lucide-react';
// AICommandBar now embedded at workspace level, not per-tab

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded heavy components
// PURPOSE: Code-split WorkoutPlanBuilder (~30KB+) and WorkoutCopilotPanel
// WHY: User may never open these tabs in a session — avoid eager bundle cost
// ─────────────────────────────────────────────────────────────

const WorkoutPlanBuilder = React.lazy(
  () => import('../../../../WorkoutManagement/WorkoutPlanBuilder')
);

const WorkoutLogger = React.lazy(
  () => import('../../../../WorkoutLogger/WorkoutLogger')
);

const PlaudMergeWorkspace = React.lazy(
  () => import('../../../../PlaudClipMerge/PlaudMergeWorkspace')
    .then((m) => ({ default: m.PlaudMergeWorkspace }))
);

const WorkoutCopilotPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel')
);

// Phase 13 (2026-04-15): Clients & Team "Workout History" tab now mounts the
// shared WorkoutHistoryPanel — the same architecture used by the admin-clients
// EnhancedWorkoutsModal (SummaryBar + History/Charts/PRs + conditional
// Tempo/Rest/RPE/Est.1RM columns). The previous thin WorkoutHistoryTimeline
// is dormant. Do not reintroduce it — the consolidation point is one shared
// panel powered by useWorkoutAnalytics.
const WorkoutHistoryPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Configuration
// ─────────────────────────────────────────────────────────────

type TrainingSection = 'architect' | 'logger' | 'plaud' | 'copilot' | 'history';

interface TrainingTabContentProps {
  clientId: number | string;
  clientName?: string;
}

const SECTIONS: {
  id: TrainingSection;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  { id: 'architect', label: 'Program Architect', shortLabel: 'Architect', icon: <Wand2 size={18} /> },
  { id: 'logger', label: 'Workout Logger', shortLabel: 'Logger', icon: <Play size={18} /> },
  { id: 'plaud', label: 'PLAUD Uploads', shortLabel: 'PLAUD', icon: <FileAudio size={18} /> },
  { id: 'copilot', label: 'Swan Coach Copilot', shortLabel: 'Copilot', icon: <Sparkles size={18} /> },
  { id: 'history', label: 'Workout History', shortLabel: 'History', icon: <Archive size={18} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Responsive sidebar + content layout with dark-first design
// WHY: CSS custom properties for theme changer compatibility
// ─────────────────────────────────────────────────────────────

/**
 * Phase 13.2 (2026-04-15) scroll-ownership fix:
 *
 * The prior `LayoutWrapper` used `overflow: hidden` with `min-height: 400px`
 * and `ContentArea` tried to own a nested `overflow-y: auto`. Two things went
 * wrong on the embedded Workout History tab:
 *
 *   1. LayoutWrapper's `overflow: hidden` clipped expanded session cards
 *      whose content exceeded the container, because no parent in the chain
 *      gave LayoutWrapper a real height cap — it clipped at natural height.
 *   2. ContentArea's inner `overflow-y: auto` competed with the page-level
 *      scroll, and since no parent fed it a min-height:0 flex constraint,
 *      its inner scroll never activated.
 *
 * Net effect: expanded workouts, notes, and edit controls fell below the
 * visible region with no way to reach them at normal browser zoom.
 *
 * Fix: the embedded route owns scroll at the PAGE level (document scroll).
 * LayoutWrapper no longer clips, and ContentArea no longer traps an inner
 * scroll. The content grows to its natural height and the browser's normal
 * page scroll reaches everything.
 *
 * Modal variant is untouched — `EnhancedWorkoutsModal`'s WidePanel still
 * caps at 90vh and its inner ScrollBody still owns modal-local scroll.
 */
const LayoutWrapper = styled.div`
  display: flex;
  min-height: 400px;
  gap: 0;
  border-radius: 12px;
  /* overflow: visible so expanded sessions / notes / edit controls are
     never clipped by the tab wrapper. Page-level scroll owns navigation. */
  overflow: visible;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (max-width: 767px) {
    flex-direction: column;
    min-height: 360px;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-elevated, #1A1A24);
  border-right: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (min-width: 768px) and (max-width: 1023px) {
    width: 72px;
    align-items: center;
    padding: 8px 4px;
  }

  @media (max-width: 767px) {
    flex-direction: row;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
    padding: 6px;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

const SidebarItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 180ms ease;
  position: relative;
  white-space: nowrap;

  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94a3b8)'};
  background: ${({ $active }) =>
    $active ? 'var(--bg-active-sidebar, #003080)' : 'transparent'};
  text-shadow: ${({ $active }) =>
    $active ? '0 0 12px rgba(96, 192, 240, 0.5)' : 'none'};

  /* Active left border (desktop/tablet) */
  ${({ $active }) =>
    $active &&
    `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: #8B5CF6;
    }
  `}

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'var(--bg-active-sidebar, #003080)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4);
  }

  /* Tablet: icon-only */
  @media (min-width: 768px) and (max-width: 1023px) {
    justify-content: center;
    padding: 10px;
    width: 56px;
    min-height: 48px;

    & > span { display: none; }

    &::before {
      top: 6px;
      bottom: 6px;
    }
  }

  /* Mobile: pill tabs */
  @media (max-width: 767px) {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 8px 14px;
    border-radius: 20px;
    gap: 6px;
    font-size: 12px;

    &::before { display: none; }

    ${({ $active }) =>
      $active &&
      `
      border: 1.5px solid #8B5CF6;
    `}

    /* Show short label on mobile */
    & > span.full-label { display: none; }
    & > span.short-label { display: inline; }
  }

  /* Desktop: show full label, hide short */
  @media (min-width: 768px) {
    & > span.short-label { display: none; }
    & > span.full-label { display: inline; }
  }
`;

const ContentArea = styled.div`
  /* Phase 13.2: min-height: 0 lets this flex child shrink properly in the
     parent flex row, and overflow: visible hands scroll duty to the page.
     The prior overflow-y: auto rule never activated because no ancestor
     gave LayoutWrapper a real height cap, leaving expanded session content
     unreachable below the viewport fold at normal browser zoom. */
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  overflow: visible;
`;

const ShimmerLoader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;

  & > div {
    height: 20px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent-primary, #50A0F0) 10%, var(--bg-surface, #141419));
    animation: shimmer 1.5s ease-in-out infinite alternate;
  }

  & > div:nth-child(1) { width: 70%; }
  & > div:nth-child(2) { width: 90%; }
  & > div:nth-child(3) { width: 55%; }

  @keyframes shimmer {
    0% { opacity: 0.4; }
    100% { opacity: 0.8; }
  }
`;

const PlaceholderCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  border-radius: 12px;
  background: var(--bg-elevated, #1A1A24);
  border: 1px dashed var(--border-soft, rgba(224, 236, 244, 0.1));

  h4 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    color: var(--text-primary, #E0ECF4);
    margin: 12px 0 6px;
  }

  p {
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Suspense Fallback
// PURPOSE: Frost shimmer skeleton while lazy components load
// ─────────────────────────────────────────────────────────────

const SuspenseFallback: React.FC = () => (
  <ShimmerLoader role="status" aria-live="polite" aria-label="Loading content">
    <div />
    <div />
    <div />
  </ShimmerLoader>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TrainingTabContent: React.FC<TrainingTabContentProps> = ({ clientId, clientName }) => {
  const [activeSection, setActiveSection] = useState<TrainingSection>('architect');

  const handleSectionChange = useCallback((section: TrainingSection) => {
    setActiveSection(section);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'architect':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutPlanBuilder
              clientId={String(clientId)}
              clientName={clientName}
            />
          </Suspense>
        );
      case 'logger':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutLogger
              clientId={Number(clientId)}
              onComplete={(formData) => {
                console.log('Workout completed:', formData);
              }}
              onCancel={() => {
                setActiveSection('architect');
              }}
            />
          </Suspense>
        );
      case 'plaud':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <PlaudMergeWorkspace
              initialClientId={Number(clientId)}
              initialClientName={clientName}
              embedded={true}
            />
          </Suspense>
        );
      case 'copilot':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutCopilotPanel inline={true} />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<PlaceholderCard><p>Loading workout history...</p></PlaceholderCard>}>
            <WorkoutHistoryPanel
              clientId={typeof clientId === 'string' ? Number(clientId) : clientId}
              clientName={clientName || 'Client'}
              variant="embedded"
              active={true}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <LayoutWrapper>
      <Sidebar role="tablist" aria-label="Training sub-sections">
        {SECTIONS.map((section) => (
          <SidebarItem
            key={section.id}
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`training-panel-${section.id}`}
            $active={activeSection === section.id}
            onClick={() => handleSectionChange(section.id)}
            title={section.label}
          >
            {section.icon}
            <span className="full-label">{section.label}</span>
            <span className="short-label">{section.shortLabel}</span>
          </SidebarItem>
        ))}
      </Sidebar>

      <ContentArea
        role="tabpanel"
        id={`training-panel-${activeSection}`}
        aria-label={SECTIONS.find((s) => s.id === activeSection)?.label}
      >
        {renderContent()}
      </ContentArea>
    </LayoutWrapper>
  );
};

export default React.memo(TrainingTabContent);
