/**
 * Challenge workspace tab metadata.
 *
 * Keeps tab ids, labels, icons, and panel linkage helpers out of the main
 * workspace component so the command surface can stay below the file cap.
 */

import React from 'react';
import { BarChart3, CalendarClock, Settings, ShieldCheck, Trophy, Users } from 'lucide-react';

export type ChallengeWorkspaceTab = 'templates' | 'live' | 'audience' | 'results' | 'submissions' | 'settings';

interface TabDefinition {
  id: ChallengeWorkspaceTab;
  label: string;
  icon: React.ReactNode;
}

export const CHALLENGE_WORKSPACE_TABS: TabDefinition[] = [
  { id: 'templates', label: 'Templates', icon: <Trophy size={16} /> },
  { id: 'live', label: 'Live Challenges', icon: <CalendarClock size={16} /> },
  { id: 'audience', label: 'Audience', icon: <Users size={16} /> },
  { id: 'results', label: 'Results', icon: <BarChart3 size={16} /> },
  { id: 'submissions', label: 'Submissions', icon: <ShieldCheck size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

export const getChallengeWorkspaceTabId = (id: ChallengeWorkspaceTab) => `challenge-workspace-tab-${id}`;

export const CHALLENGE_WORKSPACE_PANEL_ID = 'challenge-workspace-panel';
