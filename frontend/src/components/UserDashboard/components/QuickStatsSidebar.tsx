/**
 * ┌─── SUB-COMPONENT: QuickStatsSidebar ──────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Left sidebar showing workouts, level, points      |
 * | WIREFRAME:                                                 |
 * | +------------------------+                                 |
 * | | [Star] Quick Stats     |                                 |
 * | |                        |                                 |
 * | | Workouts        42     |                                 |
 * | | Level            7     |                                 |
 * | | Points        1,250    |                                 |
 * | +------------------------+                                 |
 * | Props: { stats, themeColors }                              |
 * | CLICK-OUTCOMES: None (display-only)                        |
 * | GAMIFICATION: Displays current level and point total       |
 * +------------------------------------------------------------+
 */

import React from 'react';
import { Star } from 'lucide-react';
import type { QuickStatsSidebarProps } from '../types/UserDashboardTypes';
import { Sidebar, SidebarCard, SidebarTitle } from '../styles/LayoutStyles';

/**
 * Renders the left sidebar with a Quick Stats card showing
 * the user's workout count, gamification level, and total points.
 */
const QuickStatsSidebar: React.FC<QuickStatsSidebarProps> = React.memo(({
  stats,
  themeColors,
}) => {
  const accentColor = themeColors?.primary || '#60C0F0';

  return (
    <Sidebar
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <SidebarCard>
        <SidebarTitle>
          <Star size={20} />
          Quick Stats
        </SidebarTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Workouts</span>
            <span style={{ fontWeight: 'bold', color: accentColor }}>
              {stats.workouts}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Level</span>
            <span style={{ fontWeight: 'bold', color: accentColor }}>
              {stats.level}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Points</span>
            <span style={{ fontWeight: 'bold', color: accentColor }}>
              {stats.points}
            </span>
          </div>
        </div>
      </SidebarCard>
    </Sidebar>
  );
});

QuickStatsSidebar.displayName = 'QuickStatsSidebar';

export default QuickStatsSidebar;
