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
import HomeTab from '../../../UserDashboard/components/HomeTab';
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
  challenges: '/dashboard/client/community',
  community: '/dashboard/client/community',
  notifications: '/dashboard/client/messages',
  profile: '/dashboard/client/profile',
};

const ClientHomeTab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <HomeTab
      embedded
      onTabChange={(tab) => navigate(CLIENT_TAB_ROUTES[tab] || '/dashboard/client/overview')}
      profile={null}
      displayStats={EMPTY_STATS}
      profilePosts={[]}
      followStats={null}
      displayNameOverride=""
      usernameOverride=""
    />
  );
};

export default ClientHomeTab;
