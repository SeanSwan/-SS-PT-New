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

const ClientDashboardHome: React.FC<ClientDashboardHomeProps> = (props) => {
  const embedded = !!props.embedded;

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
              <SocialProgressAnalyticsPreview onNavigate={props.onNavigate} onTarget={props.onTarget} />
              <ThreeColumnGrid>
                <TrainingFocusCard {...props} />
                {props.canBookSessions && <NextSessionCard sessionPreview={props.sessionPreview} onNavigate={props.onNavigate} />}
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
