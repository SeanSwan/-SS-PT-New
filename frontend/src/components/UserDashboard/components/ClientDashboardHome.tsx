/**
 * FILE: ClientDashboardHome.tsx
 * PURPOSE: Composed client dashboard Home surface for /user-dashboard and /dashboard/client/overview.
 */
import React from 'react';
import {
  ClientDashboardShell,
  ContentGrid,
  DashboardFrame,
  MainCanvas,
  PrimaryStack,
  RightRail,
} from './ClientDashboardHome.layoutStyles';
import {
  ClientProfileHero,
  ClientQuickActions,
  ClientSidebar,
  ClientTopNavigation,
  NextSessionCard,
  TodaySnapshotCard,
  TodaysAssignmentCard,
} from './ClientDashboardHome.sections';
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

const ClientDashboardHome: React.FC<ClientDashboardHomeProps> = (props) => {
  const embedded = !!props.embedded;

  return (
    <ClientDashboardShell data-testid="client-dashboard-home" $embedded={embedded}>
      <ClientTopNavigation {...props} />
      <DashboardFrame $embedded={embedded}>
        {!embedded && <ClientSidebar onNavigate={props.onNavigate} onTarget={props.onTarget} />}
        <MainCanvas $embedded={embedded}>
          <ContentGrid>
            <PrimaryStack>
              <ClientProfileHero {...props} />
              <ClientQuickActions actions={props.quickActions} onNavigate={props.onNavigate} onTarget={props.onTarget} />
              <ThreeColumnGrid>
                <TrainingFocusCard {...props} />
                <TodaysAssignmentCard assignment={props.assignment} onNavigate={props.onNavigate} />
                <NextSessionCard sessionPreview={props.sessionPreview} onNavigate={props.onNavigate} />
              </ThreeColumnGrid>
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
