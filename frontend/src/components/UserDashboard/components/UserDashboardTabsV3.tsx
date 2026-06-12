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
const DashboardFeedTab = lazy(() => import('./DashboardFeedTab'));
const StudioLenses = lazy(() => import('./UserDashboardStudioLenses'));
const VerticalReels = lazy(() => import('../../Social/Reels/VerticalReels'));
const FriendsList = lazy(() => import('../../Social/Friends/FriendsList'));
const ChallengesView = lazy(() => import('../../Social/Challenges/ChallengesView'));
const DashboardNotificationsTab = lazy(() => import('./DashboardNotificationsTab'));
const CreativeGallery = lazy(() => import('./CreativeGallery'));
const PhotoGallery = lazy(() => import('./PhotoGallery'));
const AboutSection = lazy(() => import('./AboutSection'));
const ActivitySection = lazy(() => import('./ActivitySection'));
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

  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
};

interface UserDashboardTabsV3Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  transformationPhotos: TransformationPhoto[];
  transformationVisibility: PhotoVisibility;
  homeProfile: UserProfile | null;
  homeDisplayStats: ProfileStats;
  homeProfilePosts: SocialPost[];
  homeFollowStats: FollowStats | null;
  homeDisplayName: string;
  homeUsername: string;
}

const UserDashboardTabsV3: React.FC<UserDashboardTabsV3Props> = ({
  activeTab,
  onTabChange,
  transformationPhotos,
  transformationVisibility,
  homeProfile,
  homeDisplayStats,
  homeProfilePosts,
  homeFollowStats,
  homeDisplayName,
  homeUsername,
}) => (
  <MainContent
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8, delay: 0.4 }}
  >
    <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
      <TabPanel id="home" activeTab={activeTab}>
        <HomeTab onTabChange={(tab) => onTabChange(tab as TabId)}
          profile={homeProfile}
          displayStats={homeDisplayStats}
          profilePosts={homeProfilePosts}
          followStats={homeFollowStats}
          displayNameOverride={homeDisplayName}
          usernameOverride={homeUsername}
        />
      </TabPanel>
      {/* Workstream N: the feed tab is the absorbed /social hub — full feed
          (its FeedCoverStudio is the cover, so no SectionChrome hero here),
          coach dock, and the desktop right rail. */}
      <TabPanel id="feed" activeTab={activeTab}>
        <DashboardFeedTab />
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
          <ChallengesView />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="notifications" activeTab={activeTab}>
        <SectionChrome id="notifications">
          <DashboardNotificationsTab />
        </SectionChrome>
      </TabPanel>
      {/* Workstream N5: the Studio group — one bar entry, four lenses.
          Each lens keeps its own TabId + URL; the strip switches in place. */}
      <TabPanel id="creative" activeTab={activeTab}>
        <StudioLenses activeTab={activeTab} onTabChange={onTabChange} />
        <SectionChrome id="creative">
          <CreativeGallery />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="photos" activeTab={activeTab}>
        <StudioLenses activeTab={activeTab} onTabChange={onTabChange} />
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
