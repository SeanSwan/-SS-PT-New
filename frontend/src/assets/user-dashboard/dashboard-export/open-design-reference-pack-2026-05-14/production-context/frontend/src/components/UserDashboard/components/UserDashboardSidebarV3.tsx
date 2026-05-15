/**
 * Quick stats sidebar rendered on non-home UserDashboard V3 tabs.
 */

import React from 'react';
import styled from 'styled-components';
import { Crown, Dumbbell, Sparkles, Star, type LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarCard,
  SidebarTitle,
} from '../styles/DashboardV3Styles';
import type { ProfileStats } from '../types/UserDashboardTypes';

const QuickStatsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const QuickStatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent);
  transition: all 0.2s ease;
`;

const QuickStatLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-size: 0.9rem;
`;

const QuickStatIcon = styled.span`
  display: inline-flex;
  color: var(--accent-primary, #60C0F0);
  opacity: 0.6;
`;

const QuickStatValue = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  font-weight: 700;
`;

interface SidebarStat {
  label: string;
  value: number;
  Icon: LucideIcon;
}

interface UserDashboardSidebarV3Props {
  displayStats: ProfileStats;
  canonicalLevel: number;
}

const UserDashboardSidebarV3: React.FC<UserDashboardSidebarV3Props> = ({
  displayStats,
  canonicalLevel,
}) => {
  const stats: SidebarStat[] = [
    { label: 'Workouts', value: displayStats.workouts, Icon: Dumbbell },
    { label: 'Level', value: canonicalLevel, Icon: Crown },
    { label: 'Points', value: displayStats.points, Icon: Sparkles },
  ];

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

        <QuickStatsList>
          {stats.map(({ label, value, Icon }) => (
            <QuickStatRow key={label}>
              <QuickStatLabel>
                <QuickStatIcon>
                  <Icon size={16} />
                </QuickStatIcon>
                {label}
              </QuickStatLabel>
              <QuickStatValue>{value}</QuickStatValue>
            </QuickStatRow>
          ))}
        </QuickStatsList>
      </SidebarCard>
    </Sidebar>
  );
};

export default React.memo(UserDashboardSidebarV3);
