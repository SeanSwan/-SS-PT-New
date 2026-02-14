import {
  Home,
  Calendar,
  Activity,
  TrendingUp,
  MessageCircle,
  Trophy,
  Star,
  Video,
  BarChart3,
  Package,
  User,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Wrench,
  XCircle,
  ClipboardList,
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
  { id: 'schedule', label: 'Schedule', icon: Calendar, section: 'priority', status: 'partial' },

  // Core Features
  { id: 'workouts', label: 'Workouts', icon: Activity, section: 'core', status: 'real' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, section: 'core', status: 'real' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, section: 'core', status: 'progress' },

  // Engagement
  { id: 'achievements', label: 'Gamification', icon: Trophy, section: 'engagement', status: 'partial' },
  { id: 'community', label: 'Community', icon: Star, section: 'engagement', status: 'progress' },

  // Tools & Content
  { id: 'videos', label: 'Videos', icon: Video, section: 'tools', status: 'progress' },
  { id: 'logs', label: 'Logs & Trackers', icon: BarChart3, section: 'tools', status: 'progress' },
  { id: 'packages', label: 'Packages', icon: Package, section: 'tools', status: 'partial' },

  // Account
  { id: 'profile', label: 'Profile', icon: User, section: 'account', status: 'real' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'account', status: 'real' },
];

export const sectionTitles = {
  priority: 'Priority',
  core: 'Core Features',
  engagement: 'Engagement',
  tools: 'Mission Tools',
  account: 'Personal Space',
};
