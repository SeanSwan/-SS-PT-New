/**
 * ┌─── SUB-COMPONENT: TabNavigation ──────────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Horizontal tab bar for switching content sections |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | | [Feed] [Creative] [Photos] [About] ...   |               |
 * | +------------------------------------------+               |
 * | Props: { tabs, activeTab, onTabChange }                    |
 * | CLICK-OUTCOMES:                                            |
 * | [Tab] -> onTabChange(tabId) -> parent updates activeTab    |
 * +------------------------------------------------------------+
 */

import React from 'react';
import type { TabNavigationProps } from '../types/UserDashboardTypes';
import { TabNavigationBar, Tab } from '../styles/LayoutStyles';

/**
 * Renders a horizontal scrollable tab bar. Each tab shows an icon
 * and label. The active tab gets a gradient background.
 * All tabs meet 44px minimum touch target requirement.
 */
const TabNavigation: React.FC<TabNavigationProps> = React.memo(({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <TabNavigationBar>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Tab
            key={tab.id}
            $active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={18} />
            {tab.label}
          </Tab>
        );
      })}
    </TabNavigationBar>
  );
});

TabNavigation.displayName = 'TabNavigation';

export default TabNavigation;
