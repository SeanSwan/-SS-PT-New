/**
 * FILE: ClientHomeTab.tsx
 * PURPOSE: Canonical /dashboard/client/overview wrapper.
 *
 * Bridges the full Creator Observatory Home into the role dashboard route so
 * /user-dashboard can remain a redirect without losing the original widgets.
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../../../hooks/profile/useProfile';
import HomeTab from '../../../UserDashboard/components/HomeTab';
import type { ProfileStats, TabId } from '../../../UserDashboard/types/UserDashboardTypes';

const CLIENT_TAB_ROUTES: Record<TabId, string> = {
  home: '/dashboard/client/overview',
  feed: '/dashboard/client/community',
  progress: '/dashboard/client/progress',
  community: '/dashboard/client/community',
  profile: '/dashboard/client/profile',
};

const ClientHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile,
    stats,
    posts,
    followStats,
    getDisplayName,
    getUsernameForDisplay,
  } = useProfile();

  const displayStats = useMemo<ProfileStats>(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level ?? 0,
  }), [stats]);

  const handleTabChange = useCallback((tab: TabId) => {
    navigate(CLIENT_TAB_ROUTES[tab] || CLIENT_TAB_ROUTES.home);
  }, [navigate]);

  return (
    <HomeTab
      onTabChange={handleTabChange}
      profile={profile}
      displayStats={displayStats}
      profilePosts={posts}
      followStats={followStats}
      displayNameOverride={getDisplayName()}
      usernameOverride={getUsernameForDisplay()}
    />
  );
};

export default ClientHomeTab;
