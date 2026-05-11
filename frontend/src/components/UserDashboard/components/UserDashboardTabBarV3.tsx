/**
 * Sticky in-tree tab strip for UserDashboard V3.
 *
 * 2026-05-10 SLICE 1 (Codex round-2 placement): rendered as the FIRST
 * child of <ObservatoryShell> so position: sticky pins from the top of
 * the scroll area on every tab, including when ProfileHeader mounts on
 * non-home tabs. The tab content panels stay in UserDashboardTabsV3
 * inside ContentGrid so the visual hierarchy (sticky bar above
 * ProfileHeader, panels in the scroll content) stays intact.
 */
import React from 'react';
import { Activity, Home, Sparkles, User, Users, type LucideIcon } from 'lucide-react';
import { Tab, TabNavigation } from '../styles/DashboardV3Styles';
import type { TabId } from '../types/UserDashboardTypes';

interface UserDashboardTabBarV3Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const dashboardTabs: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'feed', label: 'Feed', Icon: Sparkles },
  { id: 'progress', label: 'Progress', Icon: Activity },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'profile', label: 'Profile', Icon: User },
];

const UserDashboardTabBarV3: React.FC<UserDashboardTabBarV3Props> = ({
  activeTab,
  onTabChange,
}) => (
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
);

export default React.memo(UserDashboardTabBarV3);
