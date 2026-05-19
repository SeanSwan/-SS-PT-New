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
  Activity,
  Aperture,
  Camera,
  Dumbbell,
  Info,
  MessageCircle,
  UserRound,
  Users,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {
  LoadingContainer,
  LoadingSpinner,
  MainContent,
  TabStack,
} from '../styles/DashboardV3Styles';
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
const SocialFeed = lazy(() => import('../../Social/Feed/SocialFeed'));
const VerticalReels = lazy(() => import('../../Social/Reels/VerticalReels'));
const CommunityTab = lazy(() => import('./CommunityTab'));
const CreativeGallery = lazy(() => import('./CreativeGallery'));
const PhotoGallery = lazy(() => import('./PhotoGallery'));
const AboutSection = lazy(() => import('./AboutSection'));
const ActivitySection = lazy(() => import('./ActivitySection'));
const NutritionWorkspace = lazy(() => import('../../DashBoard/workspaces/NutritionWorkspace'));
const WorkoutsTab = lazy(() => import('./WorkoutsTab'));
const TransformationPhotoShowcase = lazy(() => import('./TransformationPhotoShowcase'));

const sectionMeta: Record<Exclude<TabId, 'home'>, {
  eyebrow: string;
  title: string;
  copy: string;
  tone: 'cyan' | 'violet' | 'gold';
  Icon: LucideIcon;
}> = {
  feed: {
    eyebrow: 'Community Signal',
    title: 'Feed',
    copy: 'Creator posts, training updates, and visible momentum from the SwanStudios community.',
    tone: 'cyan',
    Icon: MessageCircle,
  },
  reels: {
    eyebrow: 'Short-Form Studio',
    title: 'Reels',
    copy: 'Training clips, transformations, and creator highlights in the same crystalline dashboard language.',
    tone: 'violet',
    Icon: Video,
  },
  creative: {
    eyebrow: 'Media Forge',
    title: 'Creative',
    copy: 'Video drops and shared media organized as a premium creator gallery.',
    tone: 'violet',
    Icon: Aperture,
  },
  photos: {
    eyebrow: 'Visual Proof',
    title: 'Photos',
    copy: 'Progress photos, transformation media, and gallery uploads in one focused view.',
    tone: 'cyan',
    Icon: Camera,
  },
  about: {
    eyebrow: 'Identity Core',
    title: 'About',
    copy: 'Profile signals, milestones, skill trees, and earned achievements.',
    tone: 'gold',
    Icon: Info,
  },
  activity: {
    eyebrow: 'Live Momentum',
    title: 'Activity',
    copy: 'Recent posts, workouts, reactions, and creator movement without leaving the observatory.',
    tone: 'cyan',
    Icon: Activity,
  },
  nutrition: {
    eyebrow: 'Fuel Lab',
    title: 'Nutrition',
    copy: 'Meal logging, hydration, macros, and food intelligence inside the same user dashboard shell.',
    tone: 'gold',
    Icon: Utensils,
  },
  progress: {
    eyebrow: 'Training Signal',
    title: 'Progress',
    copy: 'Workout usage and training analytics for the user-side daily loop.',
    tone: 'cyan',
    Icon: Dumbbell,
  },
  community: {
    eyebrow: 'Discovery',
    title: 'Community',
    copy: 'Feed, challenges, friends, factions, and community actions without duplicate navigation.',
    tone: 'violet',
    Icon: Users,
  },
  profile: {
    eyebrow: 'Creator Profile',
    title: 'Profile',
    copy: 'The profile overview remains focused while deeper media sections live in their own tabs.',
    tone: 'gold',
    Icon: UserRound,
  },
};

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
      <TabPanel id="feed" activeTab={activeTab}>
        <SectionChrome id="feed">
          <SocialFeed variant="compact" />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="reels" activeTab={activeTab}>
        <SectionChrome id="reels">
          <VerticalReels frame="dashboard" />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="creative" activeTab={activeTab}>
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
        <SectionChrome id="about">
          <AboutSection />
        </SectionChrome>
      </TabPanel>
      <TabPanel id="activity" activeTab={activeTab}>
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
      <TabPanel id="community" activeTab={activeTab}>
        <SectionChrome id="community">
          <CommunityTab />
        </SectionChrome>
      </TabPanel>
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
