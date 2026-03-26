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
import { Wand2, Play, Sparkles, Archive } from 'lucide-react';
import AICommandBar from '../../../../Shared/AICommandBar/AICommandBar';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded heavy components
// PURPOSE: Code-split WorkoutPlanBuilder (~30KB+) and WorkoutCopilotPanel
// WHY: User may never open these tabs in a session — avoid eager bundle cost
// ─────────────────────────────────────────────────────────────

const WorkoutPlanBuilder = React.lazy(
  () => import('../../../../WorkoutManagement/WorkoutPlanBuilder')
);

const WorkoutCopilotPanel = React.lazy(
  () => import('../../../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Configuration
// ─────────────────────────────────────────────────────────────

type TrainingSection = 'architect' | 'session' | 'ai' | 'history';

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
  { id: 'session', label: 'Active Session', shortLabel: 'Session', icon: <Play size={18} /> },
  { id: 'ai', label: 'Enchanted AI', shortLabel: 'AI', icon: <Sparkles size={18} /> },
  { id: 'history', label: 'Vault History', shortLabel: 'History', icon: <Archive size={18} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Responsive sidebar + content layout with dark-first design
// WHY: CSS custom properties for theme changer compatibility
// ─────────────────────────────────────────────────────────────

const LayoutWrapper = styled.div`
  display: flex;
  min-height: 400px;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));

  @media (max-width: 767px) {
    flex-direction: column;
    min-height: 360px;
  }
`;

const Sidebar = styled.nav`
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
  flex: 1;
  min-width: 0;
  padding: 16px;
  overflow-y: auto;
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
            <WorkoutPlanBuilder />
          </Suspense>
        );
      case 'session':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <WorkoutCopilotPanel inline={true} />
          </Suspense>
        );
      case 'ai':
        return (
          <AICommandBar
            context="training"
            clientId={clientId}
            clientName={clientName}
          />
        );
      case 'history':
        return (
          <PlaceholderCard>
            <Archive size={32} color="var(--text-muted, #64748b)" />
            <h4>Vault History</h4>
            <p>Session history coming soon</p>
          </PlaceholderCard>
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
