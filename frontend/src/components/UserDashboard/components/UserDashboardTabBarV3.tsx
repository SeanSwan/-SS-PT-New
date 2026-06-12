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
import {
  Aperture,
  Bell,
  Dumbbell,
  Home,
  Sparkles,
  Trophy,
  UserPlus,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Tab, TabNavigation } from '../styles/DashboardV3Styles';
import { STUDIO_TAB_IDS, type TabId } from '../types/UserDashboardTypes';

interface UserDashboardTabBarV3Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/* Workstream N5 (tab compaction, vision brief): 14 → 9 visible entries.
   Studio groups Creative/Photos/About/Activity behind one entry (in-panel
   lens strip switches between them). Profile (Settings flow) and Community
   keep their panels + URLs but leave the bar. */
const dashboardTabs: Array<{ id: TabId; label: string; Icon: LucideIcon; matches?: readonly TabId[] }> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'progress', label: 'Progress', Icon: Dumbbell },
  { id: 'feed', label: 'Feed', Icon: Sparkles },
  { id: 'reels', label: 'Reels', Icon: Video },
  { id: 'friends', label: 'Friends', Icon: UserPlus },
  { id: 'challenges', label: 'Challenges', Icon: Trophy },
  { id: 'notifications', label: 'Alerts', Icon: Bell },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { id: 'creative', label: 'Studio', Icon: Aperture, matches: STUDIO_TAB_IDS },
];

const UserDashboardTabBarV3: React.FC<UserDashboardTabBarV3Props> = ({
  activeTab,
  onTabChange,
}) => (
  <TabNavigation role="tablist" aria-label="Dashboard sections">
    {dashboardTabs.map(({ id, label, Icon, matches }) => {
      const isActive = matches ? matches.includes(activeTab) : activeTab === id;
      return (
        <Tab
          key={id}
          id={`tab-${id}`}
          role="tab"
          aria-selected={isActive}
          aria-controls={`panel-${id}`}
          $active={isActive}
          onClick={() => onTabChange(id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Icon size={18} />
          {label}
        </Tab>
      );
    })}
  </TabNavigation>
);

export default React.memo(UserDashboardTabBarV3);
