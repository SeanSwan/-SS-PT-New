/**
 * FILE: ClientHomeTab.tsx
 * PURPOSE: Canonical /dashboard/client/overview premium home wrapper.
 *
 * Bridges the standalone /user-dashboard home composition into the mounted
 * UniversalDashboardLayout client route so the real client dashboard receives
 * the same premium home experience.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ClientDashboardHomeTab from '../../../UserDashboard/components/ClientDashboardHomeTab';
import ClientOnboardingLaunchCard from './ClientOnboardingLaunchCard';
import { useAuth } from '../../../../context/AuthContext';
import {
  DashboardBackgroundSettingsPanel,
  DashboardBackgroundSurface,
} from '../../shared/DashboardBackgroundStudio';
import type { ProfileStats, TabId } from '../../../UserDashboard/types/UserDashboardTypes';

const EMPTY_STATS: ProfileStats = {
  posts: 0,
  followers: 0,
  following: 0,
  workouts: 0,
  points: 0,
  level: 1,
};

const CLIENT_TAB_ROUTES: Partial<Record<TabId, string>> = {
  home: '/dashboard/client/overview',
  progress: '/dashboard/client/progress',
  nutrition: '/dashboard/client/meal-planner',
  challenges: '/dashboard/client/challenges',
  community: '/dashboard/client/community',
  notifications: '/dashboard/client/messages',
  profile: '/dashboard/client/profile',
};

const ClientHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <DashboardBackgroundSurface>
      {/* Entry point into the NASM-informed assessment. Renders only while the
          client's onboarding is known-incomplete; see ClientOnboardingLaunchCard. */}
      <ClientOnboardingLaunchCard
        isOnboardingComplete={user?.isOnboardingComplete}
        role={user?.role}
        firstName={user?.firstName}
      />
      <ClientDashboardHomeTab
        embedded
        backgroundSettings={<DashboardBackgroundSettingsPanel scopeLabel="Client" />}
        onTabChange={(tab) => navigate(CLIENT_TAB_ROUTES[tab] || '/dashboard/client/overview')}
        profile={null}
        displayStats={EMPTY_STATS}
        profilePosts={[]}
        followStats={null}
        displayNameOverride=""
        usernameOverride=""
      />
    </DashboardBackgroundSurface>
  );
};

export default ClientHomeTab;
