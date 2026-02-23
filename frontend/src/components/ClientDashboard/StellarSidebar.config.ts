import {
  Home,
  Calendar,
  Activity,
  TrendingUp,
  Trophy,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Wrench,
  XCircle,
  ClipboardList,
  Star,
} from 'lucide-react';

export type NavStatus = 'real' | 'mock' | 'partial' | 'fix' | 'progress' | 'new' | 'error';

export const navStatusMeta: Record<
  NavStatus,
  { label: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  real: { label: 'Real', Icon: CheckCircle },
  mock: { label: 'Mock', Icon: AlertTriangle },
  partial: { label: 'Partial', Icon: RefreshCw },
  progress: { label: 'WIP', Icon: RefreshCw },
  fix: { label: 'Fix', Icon: Wrench },
  new: { label: 'New', Icon: Star },
  error: { label: 'Error', Icon: XCircle },
};

export interface NavItemData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  section: 'priority' | 'core' | 'engagement' | 'tools' | 'account';
  status?: NavStatus;
}

export const navigationItems: NavItemData[] = [
  // Priority
  { id: 'overview', label: 'Overview', icon: Home, section: 'priority', status: 'real' },
  { id: 'onboarding', label: 'Onboarding', icon: ClipboardList, section: 'priority', status: 'new' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, section: 'priority', status: 'real' },

  // Core Features
  { id: 'workouts', label: 'Workouts', icon: Activity, section: 'core', status: 'real' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, section: 'core', status: 'real' },
  { id: 'gamification', label: 'Gamification', icon: Trophy, section: 'core', status: 'real' },

  // Account
  { id: 'account', label: 'My Account', icon: User, section: 'account', status: 'real' },
];

export const sectionTitles = {
  priority: 'Priority',
  core: 'Core Features',
  account: 'Account',
};
