/**
 * ┌─── SUB-COMPONENT: TabContent ─────────────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Lazy-loads and renders the active tab's content   |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | |  [Active Tab Content]                    |               |
 * | |  - SocialFeed (feed)                     |               |
 * | |  - CreativeGallery (creative)            |               |
 * | |  - PhotoGallery (photos)                 |               |
 * | |  - AboutSection (about)                  |               |
 * | |  - ActivitySection (activity)            |               |
 * | |  - NutritionWorkspace (nutrition)        |               |
 * | +------------------------------------------+               |
 * | Props: { activeTab }                                       |
 * | CLICK-OUTCOMES: Delegated to each tab's child component    |
 * +------------------------------------------------------------+
 */

import React, { Suspense, lazy } from 'react';
import type { TabContentProps } from '../types/UserDashboardTypes';
import { LoadingContainer, LoadingSpinner } from '../styles/LayoutStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded Tab Components
// PURPOSE: Code-split each tab for optimal bundle size
// WHY: Each tab may pull in heavy deps (charts, video, social)
// ─────────────────────────────────────────────────────────────

const SocialFeed = lazy(() => import('../../Social/Feed/SocialFeed'));
const CreativeGallery = lazy(() => import('./CreativeGallery'));
const PhotoGallery = lazy(() => import('./PhotoGallery'));
const AboutSection = lazy(() => import('./AboutSection'));
const ActivitySection = lazy(() => import('./ActivitySection'));
const NutritionWorkspace = lazy(() => import('../../DashBoard/workspaces/NutritionWorkspace'));

/**
 * Renders the currently active tab's content inside a Suspense
 * boundary with a loading spinner fallback. Only one tab renders
 * at a time — others are unmounted to save memory.
 */
const TabContent: React.FC<TabContentProps> = React.memo(({ activeTab }) => {
  return (
    <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
      {activeTab === 'feed' && <SocialFeed variant="compact" />}
      {activeTab === 'creative' && <CreativeGallery />}
      {activeTab === 'photos' && <PhotoGallery />}
      {activeTab === 'about' && <AboutSection />}
      {activeTab === 'activity' && <ActivitySection />}
      {activeTab === 'nutrition' && <NutritionWorkspace />}
    </Suspense>
  );
});

TabContent.displayName = 'TabContent';

export default TabContent;
