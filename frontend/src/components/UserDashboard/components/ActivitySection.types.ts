/**
 * Shared types for the active UserDashboard V3 activity section.
 */

import type { LucideIcon } from 'lucide-react';

export type ActivityFilterId = 'all' | 'workout' | 'general' | 'achievement' | 'progress';

export interface ActivityFilterOption {
  id: ActivityFilterId;
  label: string;
  Icon: LucideIcon;
}

export interface ActivityStat {
  label: string;
  value: string;
  color: string;
  Icon: LucideIcon;
}

export interface ProfileStatsSnapshot {
  workouts?: number;
  streak?: number;
  followers?: number;
  level?: number;
}

export interface ProfileActivityPost {
  id?: string;
  type?: string;
  content?: string;
  createdAt?: string;
}

export interface DashboardActivity {
  id: string;
  typeKey: string;
  type: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  time: string;
}
