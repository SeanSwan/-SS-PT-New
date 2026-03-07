import React from 'react';
import { Trophy, Gift, Settings, BarChart3 } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'achievements', label: 'Achievements', icon: <Trophy size={18} />, path: '/dashboard/gamification' },
  { id: 'rewards', label: 'Rewards', icon: <Gift size={18} />, path: '/dashboard/gamification/rewards' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/dashboard/gamification/settings' },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, path: '/dashboard/gamification/analytics' },
];

const GamificationWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Gamification Engine"
    subtitle="Achievements, badges, rewards, and engagement systems"
    tabs={tabs}
  />
);

export default GamificationWorkspace;
