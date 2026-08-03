/**
 * Canonical Home-first user dashboard shell.
 */

import React, { lazy, Suspense } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ContentGrid,
  ContentWrapper,
  HiddenInput,
  MainContentZWrapper,
  NoiseOverlay,
  ProfileContainer,
} from './styles/DashboardV3Styles';
import DashboardTeachMeGuide from '../Shared/DashboardTeachMeGuide';
import brandLogo from '../../assets/Logo.png';
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
import { useGamificationRealtime } from '../../hooks/gamification/useGamificationRealtime';
import { buildUserDashboardTeachCoachRoute } from './UserDashboardTeachCoachRoute';
import UserDashboardBackgroundControlsDisclosure from './backgrounds/UserDashboardBackgroundControlsDisclosure';
import useUserDashboardBackgroundPreference from './backgrounds/useUserDashboardBackgroundPreference';
import { USER_DASHBOARD_TAB_IDS, type TabId } from './types/UserDashboardTypes';

const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

const UserDashboardV3: React.FC = () => {
  const dashboard = useUserDashboardV3Controller();
  // Level-up fireworks: subscribes to gamification:level_up and fires the
  // CelebrationPortal takeover + refreshes the rank pill (2026-07-14).
  useGamificationRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  const routedTab: TabId = USER_DASHBOARD_TAB_IDS.includes(urlTab as TabId)
    ? (urlTab as TabId)
    : 'home';
  const { setActiveTab } = dashboard;
  React.useEffect(() => {
    setActiveTab(routedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routedTab, setActiveTab]);

  const isHomeTab = dashboard.activeTab === 'home';
  const isNutritionTaskTab = dashboard.activeTab === 'nutrition';
  const handleTabChange = React.useCallback((tab: TabId) => {
    navigate(tab === 'home' ? '/user-dashboard' : `/user-dashboard/${tab}`);
    resetUserDashboardTabScroll();
  }, [navigate]);
  const handleTeachMeCoachPrompt = React.useCallback((prompt: string) => {
    navigate(buildUserDashboardTeachCoachRoute(prompt));
  }, [navigate]);
  const teachMePathname = `${location.pathname}#${dashboard.activeTab}`;
  const dashboardBackground = useUserDashboardBackgroundPreference(brandLogo);
  const dashboardBackgroundControls = (
    <UserDashboardBackgroundControlsDisclosure
      preference={dashboardBackground.preference}
      activeBackground={dashboardBackground.activeBackground}
      customUploadError={dashboardBackground.customUploadError}
      onModeChange={dashboardBackground.setMode}
      onBackgroundSelect={dashboardBackground.setSelectedId}
      onIntervalChange={dashboardBackground.setIntervalMinutes}
      onCustomImageFile={(file) => { void dashboardBackground.setCustomImageFile(file); }}
    />
  );

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
        $backgroundStyle={dashboardBackground.backgroundStyle}
      >
        <NoiseOverlay />
        <MainContentZWrapper>
          <ObservatoryCoverHero
            displayName={dashboard.getDisplayName()}
            username={dashboard.getUsernameForDisplay()}
            userInitials={dashboard.getUserInitials()}
            tierName={dashboard.observatoryTierName}
            rankTitleLabel={dashboard.observatoryRankTitleLabel}
            level={dashboard.observatoryLevel}
            profilePhoto={dashboard.profile?.photo}
            onEditProfile={dashboard.handleEditProfile}
            onSettings={dashboard.handleSettings}
            onShare={dashboard.handleShare}
            onAvatarClick={dashboard.handleProfileImageClick}
            dashboardBackgroundControls={dashboardBackgroundControls}
          />
          <ContentWrapper data-user-dashboard-scroll-root $belowCover>
            {isHomeTab ? (
              <>
              {/* CrownHeader (giant in-dashboard "YOUR LOOK" theme-swatch bar) removed 2026-07-21 (Sean):
                  it duplicated the header Appearance Studio (UniversalThemeToggle → AppearanceStudioPanel),
                  which is the single theming authority. Theme/color/sizing lives in the header only. */}
              <UserDashboardTabBarV3
                activeTab={dashboard.activeTab}
                onTabChange={handleTabChange}
              />
              <DashboardTeachMeGuide
                dashboardRole="user"
                pathname={teachMePathname}
                onAskCoach={handleTeachMeCoachPrompt}
                onNavigate={navigate}
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
              </>
            ) : (
              <ObservatoryShell
                activeTab={dashboard.activeTab}
                focusMode={isNutritionTaskTab}
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
                <DashboardTeachMeGuide
                  dashboardRole="user"
                  pathname={teachMePathname}
                  onAskCoach={handleTeachMeCoachPrompt}
                  onNavigate={navigate}
                />

                <ContentGrid $fullWidth={isNutritionTaskTab}>
                  {!isNutritionTaskTab && (
                    <UserDashboardSidebarV3
                      displayStats={dashboard.displayStats}
                      canonicalLevel={dashboard.canonicalLevel}
                      streakDays={dashboard.observatoryStreakDays}
                      progressPercent={dashboard.observatoryProgressPct}
                      pointsToNext={dashboard.observatoryXpToNext}
                    />
                  )}

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
