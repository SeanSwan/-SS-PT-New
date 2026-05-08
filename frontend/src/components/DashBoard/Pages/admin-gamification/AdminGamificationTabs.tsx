/**
 * Tab renderer for the canonical admin gamification surface.
 */

import React, { lazy, Suspense } from 'react';
import { Gift, Settings, Sparkles, Trophy, Users, type LucideIcon } from 'lucide-react';
import { Spinner } from '../../../UniversalMasterSchedule/ui';
import {
  TabButton,
  TabContent,
  TabLoadingContainer,
  TabPanelContainer,
  TabsContainer,
} from './admin-gamification.styles';
import type { AdminGamificationController } from './useAdminGamificationController';

const AchievementManager = lazy(() => import('./components/AchievementManager'));
const RewardManager = lazy(() => import('./components/RewardManager'));
const GamificationSettings = lazy(() => import('./components/GamificationSettings'));
const SystemAnalytics = lazy(() => import('./components/SystemAnalytics'));
const RPGFeaturesPanel = lazy(() => import('./components/RPGFeaturesPanel'));

const tabs: Array<{ index: number; label: string; aria: string; Icon: LucideIcon }> = [
  { index: 0, label: 'Achievements', aria: 'Manage achievements and badges', Icon: Trophy },
  { index: 1, label: 'Rewards', aria: 'Manage rewards and redemptions', Icon: Gift },
  { index: 2, label: 'System Settings', aria: 'Configure gamification settings', Icon: Settings },
  { index: 3, label: 'Analytics', aria: 'View gamification analytics and reports', Icon: Users },
  { index: 4, label: 'RPG Features', aria: 'RPG features: Aegis HUD, Vault, Ghost Mode, Fortress', Icon: Sparkles },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <TabPanelContainer
      role="tabpanel"
      hidden={value !== index}
      id={`admin-gamification-tabpanel-${index}`}
      aria-labelledby={`admin-gamification-tab-${index}`}
      {...other}
    >
      {value === index && <TabContent>{children}</TabContent>}
    </TabPanelContainer>
  );
}

const a11yProps = (index: number) => ({
  id: `admin-gamification-tab-${index}`,
  'aria-controls': `admin-gamification-tabpanel-${index}`,
});

const TabLoadingFallback = () => (
  <TabLoadingContainer>
    <Spinner size={32} />
  </TabLoadingContainer>
);

interface AdminGamificationTabsProps {
  controller: AdminGamificationController;
}

const AdminGamificationTabs: React.FC<AdminGamificationTabsProps> = ({ controller }) => (
  <>
    <TabsContainer role="tablist" aria-label="Gamification management tabs">
      {tabs.map(({ index, label, aria, Icon }) => (
        <TabButton
          key={index}
          role="tab"
          aria-selected={controller.tabValue === index}
          {...a11yProps(index)}
          onClick={() => controller.handleTabChange(index)}
          $active={controller.tabValue === index}
          aria-label={aria}
        >
          <Icon size={16} />
          {label}
        </TabButton>
      ))}
    </TabsContainer>

    <TabPanel value={controller.tabValue} index={0}>
      <Suspense fallback={<TabLoadingFallback />}>
        <AchievementManager
          achievements={controller.achievements}
          onCreateAchievement={controller.handleCreateAchievement}
          onUpdateAchievement={controller.handleUpdateAchievement}
          onDeleteAchievement={controller.handleDeleteAchievement}
          onToggleStatus={controller.handleToggleAchievementStatus}
        />
      </Suspense>
    </TabPanel>

    <TabPanel value={controller.tabValue} index={1}>
      <Suspense fallback={<TabLoadingFallback />}>
        <RewardManager
          rewards={controller.rewards}
          onCreateReward={controller.handleCreateReward}
          onUpdateReward={controller.handleUpdateReward}
          onDeleteReward={controller.handleDeleteReward}
          onToggleStatus={controller.handleToggleRewardStatus}
          onUpdateStock={controller.handleUpdateRewardStock}
        />
      </Suspense>
    </TabPanel>

    <TabPanel value={controller.tabValue} index={2}>
      <Suspense fallback={<TabLoadingFallback />}>
        <GamificationSettings
          pointValues={controller.pointValues}
          tierThresholds={controller.tierThresholds}
          levelSettings={controller.levelSettings}
          systemSettings={controller.systemSettings}
          onUpdatePointValues={controller.handleUpdatePointValues}
          onUpdateTierThresholds={controller.handleUpdateTierThresholds}
          onUpdateLevelSettings={controller.handleUpdateLevelSettings}
          onUpdateSystemSettings={controller.handleUpdateSystemSettings}
          onSaveSettings={controller.handleSaveSettings}
          onRestoreDefaults={controller.handleRestoreDefaults}
        />
      </Suspense>
    </TabPanel>

    <TabPanel value={controller.tabValue} index={3}>
      <Suspense fallback={<TabLoadingFallback />}>
        <SystemAnalytics data={controller.analyticsData} />
      </Suspense>
    </TabPanel>

    <TabPanel value={controller.tabValue} index={4}>
      <Suspense fallback={<TabLoadingFallback />}>
        <RPGFeaturesPanel />
      </Suspense>
    </TabPanel>
  </>
);

export default AdminGamificationTabs;
