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
  Trophy,
  UserPlus,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Tab, TabNavigation } from '../styles/DashboardV3Styles';
import { STUDIO_TAB_IDS, type TabId } from '../types/UserDashboardTypes';
import { getNextRovingTabIndex } from './UserDashboardRovingTabs';

interface UserDashboardTabBarV3Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/* Workstream N5 (tab compaction, vision brief): 14 → 9 visible entries.
   Creative groups Creative/Photos/About/Activity behind one entry (in-panel
   lens strip switches between them). Profile (Settings flow) and Community
   keep their panels + URLs but leave the bar.
   Workstream O: Feed left the bar too — Home absorbed its unique widgets
   (Faction War on the right rail); everything else was a duplicate of Home. */
const dashboardTabs: Array<{ id: TabId; label: string; Icon: LucideIcon; matches?: readonly TabId[] }> = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'progress', label: 'Progress', Icon: Dumbbell },
  { id: 'reels', label: 'Reels', Icon: Video },
  { id: 'friends', label: 'Friends', Icon: UserPlus },
  { id: 'challenges', label: 'Challenges', Icon: Trophy },
  { id: 'notifications', label: 'Alerts', Icon: Bell },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { id: 'creative', label: 'Creative', Icon: Aperture, matches: STUDIO_TAB_IDS },
];

const UserDashboardTabBarV3: React.FC<UserDashboardTabBarV3Props> = ({
  activeTab,
  onTabChange,
}) => {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const handleRovingKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const nextIndex = getNextRovingTabIndex(index, event.key, dashboardTabs.length);
    if (nextIndex === null) return;

    event.preventDefault();
    onTabChange(dashboardTabs[nextIndex].id);
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }, [onTabChange]);

  return (
    <TabNavigation role="tablist" aria-label="Dashboard sections">
      {dashboardTabs.map(({ id, label, Icon, matches }, index) => {
        const isActive = matches ? matches.includes(activeTab) : activeTab === id;
        const controlledPanelId = isActive && matches ? activeTab : id;
        return (
          <Tab
            key={id}
            ref={(element) => { tabRefs.current[index] = element; }}
            id={matches ? 'tab-studio' : `tab-${id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${controlledPanelId}`}
            tabIndex={isActive ? 0 : -1}
            $active={isActive}
            onClick={() => onTabChange(id)}
            onKeyDown={(event) => handleRovingKeyDown(event, index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Tab>
        );
      })}
    </TabNavigation>
  );
};

export default React.memo(UserDashboardTabBarV3);
