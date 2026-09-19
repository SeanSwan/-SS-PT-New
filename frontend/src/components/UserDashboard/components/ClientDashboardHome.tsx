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
  PrimaryStack,
  RightRail,
} from './ClientDashboardHome.layoutStyles';
import {
  ClientProfileHero,
  ClientSidebar,
  ClientTopNavigation,
  NextSessionCard,
  TodaySnapshotCard,
  TodaysAssignmentCard,
} from './ClientDashboardHome.sections';
import { ClientRightRail } from './ClientDashboardHome.railSections';
import { ClientQuickActions } from './ClientDashboardHome.quickActions';
import {
  CommunityFeedCard,
  PerformanceZoneCard,
  QuickPostCard,
  TrainingFocusCard,
  WeeklyInsightsCard,
} from './ClientDashboardHome.feedSections';
import { SocialDockSlot, ThreeColumnGrid, TwoColumnGrid } from './ClientDashboardHome.cardStyles';
import HomeTabNextBestAction from './HomeTabNextBestAction';
// S1.5 — the social dock lives on the live Home feed. Its coach-only chips
// (Send a Signal) self-gate by role inside SocialCoachDock, so client surfaces are
// unchanged. Wired here because the previous mount point (DashboardFeedTab) has no
// live consumer, which left S1's coach action unreachable (hostile review F1.1).
import SocialCoachDock from '../../Social/CoachDock/SocialCoachDock';
// S2.5 — ProofCard's live entry point. Self-hides when the member has no completed
// session yet, so it never renders an empty shell.
import LatestProofCard from '../../Social/Feed/components/LatestProofCard';
// S4 — shame-free welcome-back recognition. Renders nothing unless the member has just
// returned from a real absence, and never shows how long they were away.
import ComebackMoment from '../../Social/Prompts/ComebackMoment';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';
import SocialProgressAnalyticsPreview from './SocialProgressAnalyticsPreview';

const ClientDashboardHome: React.FC<ClientDashboardHomeProps> = (props) => {
  const embedded = !!props.embedded;

  return (
    <ClientDashboardShell data-testid="client-dashboard-home" $embedded={embedded}>
      <ClientTopNavigation {...props} />
      <DashboardFrame $embedded={embedded}>
        {!embedded && <ClientSidebar onNavigate={props.onNavigate} onTarget={props.onTarget} />}
        <MainCanvas $embedded={embedded}>
          {props.backgroundSettings && <BackgroundSettingsSlot>{props.backgroundSettings}</BackgroundSettingsSlot>}
          <ContentGrid>
            <PrimaryStack>
              <ClientProfileHero {...props} />
              {props.nextBestAction && (
                <HomeTabNextBestAction
                  streakAtRisk={props.nextBestAction.streakAtRisk}
                  streakDays={props.nextBestAction.streakDays}
                  onLogWorkout={props.nextBestAction.onLogWorkout}
                />
              )}
              {props.communicationInbox}
              <ClientQuickActions actions={props.quickActions} onNavigate={props.onNavigate} onTarget={props.onTarget} />
              <SocialProgressAnalyticsPreview onNavigate={props.onNavigate} onTarget={props.onTarget} />
              <ThreeColumnGrid>
                <TodaysAssignmentCard assignment={props.assignment} onNavigate={props.onNavigate} />
                <TrainingFocusCard {...props} />
                {props.canBookSessions && <NextSessionCard sessionPreview={props.sessionPreview} onNavigate={props.onNavigate} />}
              </ThreeColumnGrid>
              <ComebackMoment />
              <SocialDockSlot>
                <SocialCoachDock />
              </SocialDockSlot>
              <LatestProofCard />
              <TwoColumnGrid>
                <CommunityFeedCard {...props} />
                <QuickPostCard {...props} />
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
