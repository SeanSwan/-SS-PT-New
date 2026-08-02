/**
 * COMPONENT: WorkoutPlannerV2Shell (S17 — JARVIS blueprint §4.1, ruling A4)
 * PURPOSE: The Planner IA V2 layout shell. Desktop (≥1280px) keeps the
 * proven two/three-panel grid. Below 1280px: bottom tab bar 48px
 * (Program | Builder | Exercises), the Rolodex becomes a SHEET (never
 * stacked above the builder), the Coach dock floats as a FAB-style layer
 * above the fold, and the SaveBar sticks above the tab bar. Z-scale per
 * ruling A4: FAB 60 · sheet backdrop 90. Presentational slots only —
 * panels arrive as children props; zero fetching; tab state lives in
 * PlannerUIContext. Mounted ONLY when PLANNER_IA_V2 is on.
 */

import React from 'react';
import styled from 'styled-components';
import { usePlannerUI } from './plannerContexts/PlannerUIContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';
import { PlannerEmpty } from './PlannerStateViews';
import { usePlannerLibraryDialog } from './hooks/usePlannerLibraryDialog';

const MOBILE_MAX = '1279px';
const DESKTOP_MIN = '1280px';

const DesktopGrid = styled.div<{ $teachModeOpen?: boolean }>`
  display: grid; gap: 16px;
  grid-template-columns: ${({ $teachModeOpen }) =>
    $teachModeOpen ? 'minmax(280px, 360px) 1fr minmax(280px, 360px)' : 'minmax(280px, 360px) 1fr'};
  @media (max-width: ${MOBILE_MAX}) { display: none; }
`;

const LibraryPane = styled.aside`
  position: sticky;
  top: 16px;
  align-self: start;
  max-height: calc(100dvh - 160px);
  overflow-y: auto;
  scrollbar-gutter: stable;
  border-radius: 14px;
`;

const MobileStage = styled.div`
  display: none;
  @media (max-width: ${MOBILE_MAX}) {
    display: block;
    /* The last card's actions must clear FAB + tab bar + safe area (A4). */
    scroll-padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px));
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
`;

const TabBar = styled.nav`
  display: none;
  @media (max-width: ${MOBILE_MAX}) {
    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
    height: calc(48px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--world-surface, var(--bg-base, #030712));
    border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1; min-height: 44px; border: none; cursor: pointer;
  background: transparent;
  color: ${({ $active }) => ($active
    ? 'var(--world-accent, var(--accent-primary, #60C0F0))'
    : 'var(--world-text-dim, var(--text-secondary, #9fb3c8))')};
  font-family: 'Sora', sans-serif; font-size: 0.74rem; font-weight: 800;
  border-top: 2px solid ${({ $active }) => ($active
    ? 'var(--world-accent, var(--accent-primary, #60C0F0))' : 'transparent')};
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: -2px; }
`;

const SheetBackdrop = styled.div`
  @media (max-width: ${MOBILE_MAX}) {
    position: fixed; inset: 0; z-index: 90;
    background: color-mix(in srgb, var(--deep-dark, #0A0A0F) 62%, transparent);
  }
  @media (min-width: ${DESKTOP_MIN}) { display: none; }
`;

const Sheet = styled.div`
  @media (max-width: ${MOBILE_MAX}) {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 91;
    max-height: 82dvh; overflow-y: auto;
    background: var(--world-surface-raised, var(--card-dark, #141419));
    border-radius: 16px 16px 0 0;
    border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

const SheetClose = styled.button`
  min-height: 44px; width: 100%; border: none; cursor: pointer;
  background: transparent;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 800;
`;

const CoachLayer = styled.div`
  @media (max-width: ${MOBILE_MAX}) {
    position: fixed; right: 16px; bottom: 72px; z-index: 60;
    max-width: calc(100vw - 32px);
  }
`;

export interface WorkoutPlannerV2ShellProps {
  teachModeOpen: boolean;
  rolodex: React.ReactNode;
  builder: React.ReactNode;
  teach?: React.ReactNode;
  coachDock?: React.ReactNode;
  saveBar?: React.ReactNode;
  program?: React.ReactNode;
}

const WorkoutPlannerV2Shell: React.FC<WorkoutPlannerV2ShellProps> = ({
  teachModeOpen, rolodex, builder, teach, coachDock, saveBar, program,
}) => {
  const { plannerActiveTab } = usePlannerUI();
  const act = usePlannerActions();
  const setTab = act.setters.setPlannerActiveTab;
  const closeSheet = React.useCallback(() => setTab('builder'), [setTab]);
  const { dialogRef, open: libraryOpen } = usePlannerLibraryDialog({
    requestedOpen: plannerActiveTab === 'exercises', onClose: closeSheet,
  });

  return (
    <>
      <DesktopGrid $teachModeOpen={teachModeOpen}>
        <LibraryPane aria-label="Exercise library">{rolodex}</LibraryPane>
        {builder}
        {teach}
      </DesktopGrid>

      <MobileStage>
        {plannerActiveTab === 'program' && (
          program ?? (
            <PlannerEmpty
              title="Program view is on its way"
              body="Week-by-week adherence lands with plan-vs-actual. Build today from the Builder tab."
              actionLabel="Go to Builder"
              onAction={closeSheet}
            />
          )
        )}
        {plannerActiveTab !== 'program' && builder}
        {libraryOpen && (
          <>
            <SheetBackdrop onClick={closeSheet} aria-hidden />
            <Sheet ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="planner-library-title" id="planner-rolodex-sheet" data-testid="planner-rolodex-sheet" tabIndex={-1}>
              <span id="planner-library-title">Exercise library</span>
              <SheetClose type="button" aria-label="Close exercise library" onClick={closeSheet}>Close library ▾</SheetClose>
              {rolodex}
            </Sheet>
          </>
        )}
        {teachModeOpen && teach}
      </MobileStage>

      {saveBar}
      {coachDock && <CoachLayer>{coachDock}</CoachLayer>}

      <TabBar aria-label="Planner sections">
        {(['program', 'builder', 'exercises'] as const).map(tab => (
          <TabButton
            key={tab}
            type="button"
            $active={plannerActiveTab === tab}
            aria-pressed={plannerActiveTab === tab}
            aria-controls={tab === 'exercises' ? 'planner-rolodex-sheet' : undefined}
            aria-expanded={tab === 'exercises' ? libraryOpen : undefined}
            onClick={() => setTab(tab)}
          >
            {tab === 'program' ? 'Program' : tab === 'builder' ? 'Builder' : 'Exercises'}
          </TabButton>
        ))}
      </TabBar>
    </>
  );
};

export default WorkoutPlannerV2Shell;
