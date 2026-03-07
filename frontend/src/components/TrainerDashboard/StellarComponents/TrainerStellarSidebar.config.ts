import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  Settings,
  BarChart3,
  Award,
  Dumbbell,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Wrench,
  Star,
  XCircle,
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

export interface TrainerNavItemData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  section: 'priority' | 'core' | 'training' | 'content' | 'analytics' | 'tools';
  badge?: number;
  status?: NavStatus;
}

export const trainerNavigationItems: TrainerNavItemData[] = [
  // Command Center
  { id: 'overview', label: 'Training Overview', icon: BarChart3, section: 'priority', status: 'real' },
  { id: 'schedule', label: 'Training Schedule', icon: Calendar, section: 'priority', status: 'partial' },

  // Core Features
  { id: 'log-workout', label: 'Log Workout', icon: Dumbbell, section: 'core', status: 'real' },
  { id: 'progress', label: 'Client Progress', icon: TrendingUp, section: 'core', status: 'real' },

  // Client Training
  { id: 'clients', label: 'My Clients', icon: Users, section: 'training', status: 'real' },
  { id: 'assessments', label: 'Form Assessments', icon: UserCheck, section: 'training', status: 'partial' },

  // Performance
  { id: 'analytics', label: 'Training Analytics', icon: BarChart3, section: 'analytics', status: 'partial' },
  { id: 'achievements', label: 'Client Achievements', icon: Award, section: 'analytics', status: 'partial' },

  // Tools
  { id: 'reports', label: 'Training Reports', icon: FileText, section: 'tools', status: 'partial' },
  { id: 'settings', label: 'Trainer Settings', icon: Settings, section: 'tools', status: 'real' },
];

export const trainerSectionTitles = {
  priority: 'Command Center',
  core: 'Core Features',
  training: 'Client Training',
  analytics: 'Performance',
  tools: 'Trainer Tools',
};
