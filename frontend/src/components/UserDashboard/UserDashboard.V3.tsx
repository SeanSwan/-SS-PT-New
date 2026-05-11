/**
 * Canonical Home-first user dashboard shell.
 */

import React, { lazy, Suspense } from 'react';
import {
  ContentGrid,
  ContentWrapper,
  HiddenInput,
  MainContentZWrapper,
  NoiseOverlay,
  ProfileContainer,
} from './styles/DashboardV3Styles';
import ObservatoryShell from './components/ObservatoryShell';
import { OBSERVATORY_NAV_ITEMS } from './components/ObservatoryShellAdapter';
import UserDashboardErrorBoundaryV3, {
  UserDashboardErrorState,
  UserDashboardLoadingState,
} from './components/UserDashboardStatusStatesV3';
import UserDashboardProfileHeaderV3 from './components/UserDashboardProfileHeaderV3';
import UserDashboardSidebarV3 from './components/UserDashboardSidebarV3';
import UserDashboardTabBarV3 from './components/UserDashboardTabBarV3';
import UserDashboardTabsV3 from './components/UserDashboardTabsV3';
import { useUserDashboardV3Controller } from './hooks/useUserDashboardV3Controller';

const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

const UserDashboardV3: React.FC = () => {
  const dashboard = useUserDashboardV3Controller();

  if (dashboard.isLoading && !dashboard.profile) {
    return <UserDashboardLoadingState />;
  }

  if (dashboard.error && !dashboard.profile) {
    return <UserDashboardErrorState message={dashboard.error} />;
  }

  return (
    <UserDashboardErrorBoundaryV3>
      <ProfileContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <NoiseOverlay />
        <MainContentZWrapper>
          <ContentWrapper>
            <ObservatoryShell
              activeTab={dashboard.activeTab}
              profileHeaderVisible={dashboard.activeTab !== 'home'}
              onTabChange={dashboard.setActiveTab}
              onNavigate={dashboard.navigate}
              observatoryLevel={dashboard.observatoryLevel}
              observatoryPoints={dashboard.observatoryPoints}
              observatoryTierName={dashboard.observatoryTierName}
              observatoryProgressPct={dashboard.observatoryProgressPct}
              observatoryXpToNext={dashboard.observatoryXpToNext}
              observatoryStreakDays={dashboard.observatoryStreakDays}
              topBadges={dashboard.topBadges}
              navItems={OBSERVATORY_NAV_ITEMS}
              nextBestActions={dashboard.observatoryNextBest}
            >
              {/* 2026-05-10 SLICE 1 (Codex round-2 placement): tab strip is
                  the FIRST child of ObservatoryShell so position: sticky
                  pins from the top of the scroll area regardless of
                  whether ProfileHeader mounts below. Fixes "tabs become
                  inoperable after Home -> non-home" on mobile/tablet. */}
              <UserDashboardTabBarV3
                activeTab={dashboard.activeTab}
                onTabChange={dashboard.setActiveTab}
              />

              {dashboard.activeTab !== 'home' && (
                <UserDashboardProfileHeaderV3
                  backgroundImage={dashboard.backgroundImage}
                  bannerObjectPosition={dashboard.bannerObjectPosition}
                  showRepositionPanel={dashboard.showRepositionPanel}
                  onToggleRepositionPanel={dashboard.toggleRepositionPanel}
                  onBannerPositionChange={dashboard.handleBannerPositionChange}
                  profile={dashboard.profile}
                  displayStats={dashboard.displayStats}
                  topBadges={dashboard.topBadges}
                  level={dashboard.levelProgress?.level}
                  displayName={dashboard.getDisplayName()}
                  username={dashboard.getUsernameForDisplay()}
                  userInitials={dashboard.getUserInitials()}
                  onBackgroundClick={dashboard.handleBackgroundClick}
                  onProfileImageClick={dashboard.handleProfileImageClick}
                  onEditProfile={dashboard.handleEditProfile}
                  onSettings={dashboard.handleSettings}
                  onShare={dashboard.handleShare}
                />
              )}

              <ContentGrid $fullWidth={dashboard.activeTab === 'home'}>
                {dashboard.activeTab !== 'home' && (
                  <UserDashboardSidebarV3
                    displayStats={dashboard.displayStats}
                    canonicalLevel={dashboard.canonicalLevel}
                  />
                )}

                <UserDashboardTabsV3
                  activeTab={dashboard.activeTab}
                  onTabChange={dashboard.setActiveTab}
                  transformationPhotos={dashboard.transformationPhotos}
                  transformationVisibility={dashboard.transformationVisibility}
                />
              </ContentGrid>
            </ObservatoryShell>

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
                  profile={dashboard.profile}
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
