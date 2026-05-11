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
import type { TransformationPhoto, PhotoVisibility } from './TransformationPhotoTypes';
import type { TabId } from '../types/UserDashboardTypes';

const HomeTab = lazy(() => import('./HomeTab'));
const SocialFeed = lazy(() => import('../../Social/Feed/SocialFeed'));
const CommunityTab = lazy(() => import('./CommunityTab'));
const CreativeGallery = lazy(() => import('./CreativeGallery'));
const PhotoGallery = lazy(() => import('./PhotoGallery'));
const AboutSection = lazy(() => import('./AboutSection'));
const ActivitySection = lazy(() => import('./ActivitySection'));
const NutritionWorkspace = lazy(() => import('../../DashBoard/workspaces/NutritionWorkspace'));
const WorkoutsTab = lazy(() => import('./WorkoutsTab'));
const TransformationPhotoShowcase = lazy(() => import('./TransformationPhotoShowcase'));

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
}

const UserDashboardTabsV3: React.FC<UserDashboardTabsV3Props> = ({
  activeTab,
  onTabChange,
  transformationPhotos,
  transformationVisibility,
}) => (
  <MainContent
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8, delay: 0.4 }}
  >
    <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
      <TabPanel id="home" activeTab={activeTab}>
        <HomeTab onTabChange={(tab) => onTabChange(tab as TabId)} />
      </TabPanel>
      <TabPanel id="feed" activeTab={activeTab}>
        <SocialFeed variant="compact" />
      </TabPanel>
      <TabPanel id="progress" activeTab={activeTab}>
        <TabStack>
          <WorkoutsTab />
          <ActivitySection />
          <NutritionWorkspace />
        </TabStack>
      </TabPanel>
      <TabPanel id="community" activeTab={activeTab}>
        <CommunityTab onTabChange={(tab) => onTabChange(tab as TabId)} />
      </TabPanel>
      <TabPanel id="profile" activeTab={activeTab}>
        <TabStack>
          <AboutSection />
          <TransformationPhotoShowcase
            photos={transformationPhotos}
            visibility={transformationVisibility}
            isOwnProfile
          />
          <CreativeGallery />
          <PhotoGallery />
        </TabStack>
      </TabPanel>
    </Suspense>
  </MainContent>
);

export default React.memo(UserDashboardTabsV3);
