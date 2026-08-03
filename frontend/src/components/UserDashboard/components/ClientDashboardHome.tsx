/**
 * FILE: ClientDashboardHome.tsx
 * PURPOSE: Composed client dashboard Home surface for /user-dashboard and /dashboard/client/overview.
 */
import React from 'react';
import {
  BackgroundSettingsSlot,
  ClientDashboardShell,
  ContentGrid,
  DashboardFrame,
  MainCanvas,
} from './ClientDashboardHome.layoutStyles';
import { PrimaryStack, RightRail } from './ClientDashboardHome.priorityStyles';
import { ClientProfileHero, ClientQuickActions, ClientSidebar, ClientTopNavigation, NextSessionCard } from './ClientDashboardHome.sections';
import { ClientRightRail } from './ClientDashboardHome.railSections';
import {
  CommunityFeedCard,
  PerformanceZoneCard,
  QuickPostCard,
  TrainingFocusCard,
  WeeklyInsightsCard,
} from './ClientDashboardHome.feedSections';
import { ThreeColumnGrid, TwoColumnGrid } from './ClientDashboardHome.cardStyles';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';
import SocialProgressAnalyticsPreview from './SocialProgressAnalyticsPreview';
import FirstSessionOrientationStrip from './FirstSessionOrientationStrip';
import CoachVoiceRecapCard from './CoachVoiceRecapCard';

const ClientDashboardHome: React.FC<ClientDashboardHomeProps> = (props) => {
  const embedded = !!props.embedded;
  // Zero-history = the session fetch settled AND no logged session exists in
  // the history window. Every new signup lands here first (launch panel
  // 2026-08-03, Q5): swap social noise for first-session orientation.
  const zeroHistory = !!props.workoutHistorySettled && !props.trainingProof.lastSession;

  return (
    <ClientDashboardShell data-testid="client-dashboard-home" $embedded={embedded}>
      {/* Embedded = mounted inside UniversalDashboardLayout, which already owns
          navigation (ClientStellarSidebar). Rendering a second full top-nav
          there duplicated chrome on the canonical /overview (panel launch
          review 2026-08-03, gap d). Standalone mode keeps it. */}
      {!embedded && <ClientTopNavigation {...props} />}
      <DashboardFrame $embedded={embedded}>
        {!embedded && <ClientSidebar onNavigate={props.onNavigate} onTarget={props.onTarget} />}
        <MainCanvas $embedded={embedded}>
          {props.backgroundSettings && <BackgroundSettingsSlot>{props.backgroundSettings}</BackgroundSettingsSlot>}
          <ContentGrid>
            <PrimaryStack>
              <ClientProfileHero {...props} />
              <ClientQuickActions actions={props.quickActions} onNavigate={props.onNavigate} onTarget={props.onTarget} />
              {/* The plan the member is paying for — above the fold, always present.
                  The shelf owns its own loading/empty/error states, so this slot is
                  never conditionally removed. */}
              {props.programShelf}
              {/* First-session orientation: pre-frames the empty Progress tab
                  as ANTICIPATED, not broken. Renders only for settled
                  zero-history clients. */}
              {zeroHistory && <FirstSessionOrientationStrip />}
              {/* Deterministic coach-voice recap of the REAL logged week —
                  sentences, not axes (panel Q2 #1). Self-hides on zero history
                  or unsettled data. */}
              <CoachVoiceRecapCard proof={props.trainingProof} settled={!!props.workoutHistorySettled} />
              <SocialProgressAnalyticsPreview onNavigate={props.onNavigate} onTarget={props.onTarget} />
              <ThreeColumnGrid>
                <TrainingFocusCard {...props} />
                {props.canBookSessions && <NextSessionCard sessionPreview={props.sessionPreview} onNavigate={props.onNavigate} />}
              </ThreeColumnGrid>
              <TwoColumnGrid>
                <CommunityFeedCard {...props} />
                {/* The quick-post composer invites a brand-new client to post
                    into a community they have no context for — suppressed
                    until their first logged workout (conditional render,
                    trivially reversible). */}
                {!zeroHistory && <QuickPostCard {...props} />}
              </TwoColumnGrid>
              <TwoColumnGrid>
                <WeeklyInsightsCard insights={props.insights} />
                <PerformanceZoneCard {...props} />
              </TwoColumnGrid>
            </PrimaryStack>
            <RightRail>
              <ClientRightRail {...props} />
            </RightRail>
          </ContentGrid>
        </MainCanvas>
      </DashboardFrame>
    </ClientDashboardShell>
  );
};

export default ClientDashboardHome;
