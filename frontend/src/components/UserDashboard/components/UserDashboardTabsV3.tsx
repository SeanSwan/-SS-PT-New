/**
 * Lazy tab panels for UserDashboard V3.
 *
 * 2026-05-10 SLICE 1 (Codex round-2 placement): the tab strip moved out
 * of this component into UserDashboardTabBarV3 so it can be mounted as
 * the FIRST child of ObservatoryShell (above ProfileHeader). This file
 * now only renders MainContent + the per-tab Suspense panels.
 */

import React, { lazy, Suspense } from 'react';
import {
  LoadingContainer,
  LoadingSpinner,
  MainContent,
  TabStack,
} from '../styles/DashboardV3Styles';
import { sectionMeta } from './UserDashboardSectionMeta';
import {
  VisionCopy,
  VisionEyebrow,
  VisionHeroContent,
  VisionHeroIcon,
  VisionLegacyScope,
  VisionSectionHero,
  VisionTabSurface,
  VisionTitle,
} from './UserDashboardSectionChrome.styles';
import type { TransformationPhoto, PhotoVisibility } from './TransformationPhotoTypes';
import type { ProfileStats, TabId } from '../types/UserDashboardTypes';
import type { FollowStats, SocialPost, UserProfile } from '../../../services/profileService';

const HomeTab = lazy(() => import('./HomeTab'));
const GroupsTab = lazy(() => import('./groups/GroupsTab'));
const StudioLenses = lazy(() => import('./UserDashboardStudioLenses'));
const VerticalReels = lazy(() => import('../../Social/Reels/VerticalReels'));
const FriendsList = lazy(() => import('../../Social/Friends/FriendsList'));
const ChallengesView = lazy(() => import('../../Social/Challenges/ChallengesView'));
const DashboardChallengesParty = lazy(() => import('./DashboardChallengesParty'));
const DashboardNotificationsTab = lazy(() => import('./DashboardNotificationsTab'));
const CreativeGallery = lazy(() => import('./CreativeGallery'));
const PhotoGallery = lazy(() => import('./PhotoGallery'));
const AboutSection = lazy(() => import('./AboutSection'));
const ActivitySection = lazy(() => import('./ActivitySection'));
const UserSettingsHub = lazy(() => import('./UserSettingsHub'));
const NutritionWorkspace = lazy(() => import('../../DashBoard/workspaces/NutritionWorkspace'));
const WorkoutsTab = lazy(() => import('./WorkoutsTab'));
const TransformationPhotoShowcase = lazy(() => import('./TransformationPhotoShowcase'));

interface SectionChromeProps {
  id: Exclude<TabId, 'home'>;
  children: React.ReactNode;
}

const SectionChrome: React.FC<SectionChromeProps> = ({ id, children }) => {
  const meta = sectionMeta[id];
  const Icon = meta.Icon;

  return (
    <VisionTabSurface>
      <VisionSectionHero $tone={meta.tone}>
        <VisionHeroContent>
          <VisionHeroIcon $tone={meta.tone}>
            <Icon size={26} aria-hidden="true" />
          </VisionHeroIcon>
          <div>
            <VisionEyebrow>{meta.eyebrow}</VisionEyebrow>
            <VisionTitle>{meta.title}</VisionTitle>
            <VisionCopy>{meta.copy}</VisionCopy>
          </div>
        </VisionHeroContent>
      </VisionSectionHero>
      <VisionLegacyScope>{children}</VisionLegacyScope>
    </VisionTabSurface>
  );
};

interface TabPanelProps {
  id: TabId;
  activeTab: TabId;
  children: React.ReactNode;
}

const TabPanel: React.FC<TabPanelProps> = ({ id, activeTab, children }) => {
  if (activeTab !== id) return null;

  const labelledBy = id === 'profile' ? 'tab-studio' : `tab-${id}`;

  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={labelledBy}>
      {children}
    </div>
  );
};

const TabLoadingFallback = () => (
  <LoadingContainer
    role="status"
    aria-label="Loading dashboard section"
    aria-live="polite"
  >
    <LoadingSpinner aria-hidden="true" />
  </LoadingContainer>
);

interface UserDashboardTabsV3Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  transformationPhotos: TransformationPhoto[];
  transformationVisibility: PhotoVisibility;
  homeProfile: UserProfile | null;
  homeDisplayStats: ProfileStats;
  homeProfileStatsKnown?: boolean;
  homeGamificationKnown?: boolean;
  homeProfilePosts: SocialPost[];
  homeFollowStats: FollowStats | null;
  homeDisplayName: string;
  homeUsername: string;
  profileSettingsProfile?: UserProfile | null;
  /**
   * REQUIRED. Persists the settings payload. Must actually write.
   * Deliberately non-optional: a missing handler used to fall back to a no-op that
   * resolved successfully, so Settings reported "Saved" while writing nothing
   * (privacy + health fields silently discarded). Absence must fail at compile time.
   */
  onUpdateProfile: (data: Record<string, unknown>) => Promise<void>;
  /** REQUIRED. Opens the profile editor. Same no-op hazard as onUpdateProfile. */
  onOpenEditProfile: () => void;
}

const UserDashboardTabsV3: React.FC<UserDashboardTabsV3Props> = ({
  activeTab,
  onTabChange,
  transformationPhotos,
  transformationVisibility,
  homeProfile,
  homeDisplayStats,
  homeProfileStatsKnown,
  homeGamificationKnown,
  homeProfilePosts,
  homeFollowStats,
  homeDisplayName,
  homeUsername,
  profileSettingsProfile,
  onUpdateProfile,
  onOpenEditProfile,
}) => (
  <MainContent
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8, delay: 0.4 }}
  >
    <Suspense fallback={<TabLoadingFallback />}>
      <TabPanel id="home" activeTab={activeTab}>
        <HomeTab onTabChange={(tab) => onTabChange(tab as TabId)}
          profile={homeProfile}
          displayStats={homeDisplayStats}
          profileStatsKnown={homeProfileStatsKnown}
          gamificationKnown={homeGamificationKnown}
          profilePosts={homeProfilePosts}
          followStats={homeFollowStats}
          displayNameOverride={homeDisplayName}
          usernameOverride={homeUsername}
        />
      </TabPanel>
      {/* Workstream O: the Feed panel is unmounted — it duplicated Home
          (composer, latest post, live activity, challenge, leaderboard,
          trending, coach dock); its one unique widget (Faction War) moved to
          the Home right rail. The feed panel component file stays on disk
          per rule 34 pending the cleanup pass; its URL falls back to home. */}
      {/* Groups upgrade 2026-07-14: first-class communities with their own
          feed + chat, promoted out of Messages onto the main social surface. */}
      <TabPanel id="groups" activeTab={activeTab}>
        <SectionChrome id="groups">
          <GroupsTab />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="reels" activeTab={activeTab}>
        <SectionChrome id="reels">
          <VerticalReels frame="dashboard" />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="friends" activeTab={activeTab}>
        <SectionChrome id="friends">
          <FriendsList />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="challenges" activeTab={activeTab}>
        <SectionChrome id="challenges">
          <TabStack>
            <ChallengesView />
            {/* Workstream O2: the party (accountability squad) widgets moved
                here from the retired Feed tab — squads belong with the
                challenges they train against. */}
            <DashboardChallengesParty />
          </TabStack>
        </SectionChrome>
      </TabPanel>
      <TabPanel id="notifications" activeTab={activeTab}>
        <SectionChrome id="notifications">
          <DashboardNotificationsTab />
        </SectionChrome>
      </TabPanel>
      {/* Photos is a first-class library; Creative keeps the profile/story lenses. */}
      <TabPanel id="creative" activeTab={activeTab}>
        <StudioLenses activeTab={activeTab} onTabChange={onTabChange} />
        <SectionChrome id="creative">
          <CreativeGallery />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="photos" activeTab={activeTab}>
        <SectionChrome id="photos">
          <TabStack>
            <TransformationPhotoShowcase
              photos={transformationPhotos}
              visibility={transformationVisibility}
              isOwnProfile
            />
            <PhotoGallery />
          </TabStack>
        </SectionChrome>
      </TabPanel>
      <TabPanel id="about" activeTab={activeTab}>
        <StudioLenses activeTab={activeTab} onTabChange={onTabChange} />
        <SectionChrome id="about">
          <AboutSection />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="activity" activeTab={activeTab}>
        <StudioLenses activeTab={activeTab} onTabChange={onTabChange} />
        <SectionChrome id="activity">
          <ActivitySection />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="nutrition" activeTab={activeTab}>
        <SectionChrome id="nutrition">
          <NutritionWorkspace />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="progress" activeTab={activeTab}>
        <SectionChrome id="progress">
          <WorkoutsTab />
        </SectionChrome>
      </TabPanel>
      {/* Workstream N5: the Community launcher panel is unmounted — its cards
          duplicated tabs that are now first-class (Friends/Challenges); the
          component file stays on disk per rule 34 pending the cleanup pass. */}
      <TabPanel id="profile" activeTab={activeTab}>
        <SectionChrome id="profile">
          <TabStack>
            <UserSettingsHub
              profile={profileSettingsProfile ?? homeProfile}
              onUpdateProfile={onUpdateProfile}
              onOpenEditProfile={onOpenEditProfile}
            />
            <AboutSection />
            <TransformationPhotoShowcase
              photos={transformationPhotos}
              visibility={transformationVisibility}
              isOwnProfile
            />
          </TabStack>
        </SectionChrome>
      </TabPanel>
    </Suspense>
  </MainContent>
);

export default React.memo(UserDashboardTabsV3);
