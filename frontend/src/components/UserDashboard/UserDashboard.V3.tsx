/**
 * Canonical Home-first user dashboard shell.
 */

import React, { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ContentGrid,
  ContentWrapper,
  HiddenInput,
  MainContentZWrapper,
  NoiseOverlay,
  ProfileContainer,
} from './styles/DashboardV3Styles';
import ObservatoryShell from './components/ObservatoryShell';
import ObservatoryCoverHero from './components/ObservatoryCoverHero';
import { OBSERVATORY_NAV_ITEMS } from './components/ObservatoryShellAdapter';
import UserDashboardErrorBoundaryV3, {
  UserDashboardErrorState,
  UserDashboardLoadingState,
} from './components/UserDashboardStatusStatesV3';
import UserDashboardSidebarV3 from './components/UserDashboardSidebarV3';
import UserDashboardTabBarV3 from './components/UserDashboardTabBarV3';
import UserDashboardTabsV3 from './components/UserDashboardTabsV3';
import { resetUserDashboardTabScroll } from './components/UserDashboardTabScroll';
import { useUserDashboardV3Controller } from './hooks/useUserDashboardV3Controller';
import { USER_DASHBOARD_TAB_IDS, type TabId } from './types/UserDashboardTypes';

const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

const UserDashboardV3: React.FC = () => {
  const dashboard = useUserDashboardV3Controller();
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  // Workstream N: tabs are URL-driven (/user-dashboard/:tab) so old /social
  // links, redirects, and back/forward all land on the right tab. Unknown
  // segments fall back to home.
  const routedTab: TabId = USER_DASHBOARD_TAB_IDS.includes(urlTab as TabId)
    ? (urlTab as TabId)
    : 'home';
  const { setActiveTab } = dashboard;
  React.useEffect(() => {
    setActiveTab(routedTab);
    // routedTab only — internal setActiveTab calls (e.g. Settings → profile)
    // may diverge from the URL without being snapped back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routedTab, setActiveTab]);

  const isHomeTab = dashboard.activeTab === 'home';
  const handleTabChange = React.useCallback((tab: TabId) => {
    navigate(tab === 'home' ? '/user-dashboard' : `/user-dashboard/${tab}`);
    resetUserDashboardTabScroll();
  }, [navigate]);

  if (dashboard.isLoading && !dashboard.profile) {
    return <UserDashboardLoadingState />;
  }

  if (dashboard.error && !dashboard.profile) {
    return <UserDashboardErrorState message={dashboard.error} onRetry={dashboard.refreshProfile} />;
  }

  return (
    <UserDashboardErrorBoundaryV3>
      <ProfileContainer
        data-user-dashboard-scroll-root
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <NoiseOverlay />
        <MainContentZWrapper>
          {/* Workstream O: the cover carousel sits at the VERY top of every
              non-home tab, edge-to-edge in normal flow — it replaces the
              retired full-bleed profile header (banner + bulky identity
              block + rail clearance offsets). Same media layer + embedded
              editor as Home's hero (one cover system). */}
          {!isHomeTab && (
            <ObservatoryCoverHero
              displayName={dashboard.getDisplayName()}
              username={dashboard.getUsernameForDisplay()}
              userInitials={dashboard.getUserInitials()}
              tierName={dashboard.observatoryTierName}
              level={dashboard.observatoryLevel}
              profilePhoto={dashboard.profile?.photo}
              onEditProfile={dashboard.handleEditProfile}
              onSettings={dashboard.handleSettings}
              onShare={dashboard.handleShare}
              onAvatarClick={dashboard.handleProfileImageClick}
            />
          )}
          <ContentWrapper data-user-dashboard-scroll-root $belowCover={!isHomeTab}>
            {isHomeTab ? (
              <UserDashboardTabsV3
                activeTab={dashboard.activeTab}
                onTabChange={handleTabChange}
                transformationPhotos={dashboard.transformationPhotos}
                transformationVisibility={dashboard.transformationVisibility}
                homeProfile={dashboard.profile}
                homeDisplayStats={dashboard.displayStats}
                homeProfilePosts={dashboard.profilePosts}
                homeFollowStats={dashboard.followStats}
                homeDisplayName={dashboard.getDisplayName()}
                homeUsername={dashboard.getUsernameForDisplay()}
              />
            ) : (
              <ObservatoryShell
                activeTab={dashboard.activeTab}
                onTabChange={handleTabChange}
                observatoryLevel={dashboard.observatoryLevel}
                observatoryPoints={dashboard.observatoryPoints}
                observatoryTierName={dashboard.observatoryTierName}
                observatoryProgressPct={dashboard.observatoryProgressPct}
                observatoryXpToNext={dashboard.observatoryXpToNext}
                observatoryStreakDays={dashboard.observatoryStreakDays}
                topBadges={dashboard.topBadges}
                navItems={OBSERVATORY_NAV_ITEMS}
              >
                <UserDashboardTabBarV3
                  activeTab={dashboard.activeTab}
                  onTabChange={handleTabChange}
                />

                <ContentGrid>
                  <UserDashboardSidebarV3
                    displayStats={dashboard.displayStats}
                    canonicalLevel={dashboard.canonicalLevel}
                  />

                  <UserDashboardTabsV3
                    activeTab={dashboard.activeTab}
                    onTabChange={handleTabChange}
                    transformationPhotos={dashboard.transformationPhotos}
                    transformationVisibility={dashboard.transformationVisibility}
                    homeProfile={dashboard.profile}
                    homeDisplayStats={dashboard.displayStats}
                    homeProfilePosts={dashboard.profilePosts}
                    homeFollowStats={dashboard.followStats}
                    homeDisplayName={dashboard.getDisplayName()}
                    homeUsername={dashboard.getUsernameForDisplay()}
                  />
                </ContentGrid>
              </ObservatoryShell>
            )}

            <HiddenInput
              ref={dashboard.profileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => dashboard.handleFileChange(event, 'profile')}
            />
            <HiddenInput
              ref={dashboard.backgroundInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => dashboard.handleFileChange(event, 'background')}
            />

            {dashboard.showEditModal && (
              <Suspense fallback={null}>
                <EditProfileModal
                  profile={dashboard.profile as any}
                  onClose={() => dashboard.setShowEditModal(false)}
                  onSave={async (data) => {
                    await dashboard.updateProfile(data);
                    dashboard.setShowEditModal(false);
                  }}
                />
              </Suspense>
            )}
          </ContentWrapper>
        </MainContentZWrapper>
      </ProfileContainer>
    </UserDashboardErrorBoundaryV3>
  );
};

export default React.memo(UserDashboardV3);
