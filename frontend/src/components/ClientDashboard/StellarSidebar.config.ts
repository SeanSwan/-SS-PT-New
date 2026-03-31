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
  MessageSquare,
  HeartPulse,
  Video,
  Dumbbell,
  Brain,
  Apple,
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
  section: 'priority' | 'training' | 'health' | 'engagement' | 'account';
  status?: NavStatus;
}

export const navigationItems: NavItemData[] = [
  // Priority — daily glance
  { id: 'overview', label: 'Overview', icon: Home, section: 'priority', status: 'real' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, section: 'priority', status: 'real' },

  // Training — core workout loop
  { id: 'workouts', label: 'Workouts', icon: Activity, section: 'training', status: 'real' },
  { id: 'logger', label: 'Log Workout', icon: Dumbbell, section: 'training', status: 'new' },
  { id: 'ai-workout', label: 'AI Workout', icon: Brain, section: 'training', status: 'new' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, section: 'training', status: 'real' },

  // Health — body & nutrition tools
  { id: 'health', label: 'Body Map', icon: HeartPulse, section: 'health', status: 'real' },
  { id: 'food-intel', label: 'Nutrition', icon: Apple, section: 'health', status: 'new' },
  { id: 'form-check', label: 'Form Check', icon: Video, section: 'health', status: 'new' },

  // Engagement — social & rewards
  { id: 'gamification', label: 'Gamification', icon: Trophy, section: 'engagement', status: 'real' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, section: 'engagement', status: 'real' },

  // Account — settings & setup
  { id: 'onboarding', label: 'My Profile', icon: ClipboardList, section: 'account', status: 'new' },
  { id: 'account', label: 'My Account', icon: User, section: 'account', status: 'real' },
];

export const sectionTitles: Record<string, string> = {
  priority: 'Dashboard',
  training: 'Training',
  health: 'Health & Nutrition',
  engagement: 'Engagement',
  account: 'Account',
};
