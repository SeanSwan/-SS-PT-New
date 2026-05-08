/**
 * Tab navigation and lazy tab panels for UserDashboard V3.
 */

import React, { lazy, Suspense } from 'react';
import { Activity, Home, Sparkles, User, Users, type LucideIcon } from 'lucide-react';
import {
  LoadingContainer,
  LoadingSpinner,
  MainContent,
  Tab,
  TabNavigation,
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

const dashboardTabs: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'feed', label: 'Feed', Icon: Sparkles },
  { id: 'progress', label: 'Progress', Icon: Activity },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'profile', label: 'Profile', Icon: User },
];

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
    <TabNavigation role="tablist" aria-label="Dashboard sections">
      {dashboardTabs.map(({ id, label, Icon }) => (
        <Tab
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          $active={activeTab === id}
          onClick={() => onTabChange(id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Icon size={18} />
          {label}
        </Tab>
      ))}
    </TabNavigation>

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
