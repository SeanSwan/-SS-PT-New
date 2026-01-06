import {
  Users,
  Calendar,
  TrendingUp,
  Target,
  Video,
  MessageSquare,
  FileText,
  Settings,
  BarChart3,
  Award,
  Upload,
  Bell,
  Dumbbell,
  UserCheck,
  Zap,
  Camera,
  PlayCircle,
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
  // Priority
  { id: 'overview', label: 'Training Overview', icon: BarChart3, section: 'priority', status: 'real' },
  { id: 'schedule', label: 'Training Schedule', icon: Calendar, section: 'priority', status: 'partial' },

  // Core Features
  { id: 'log-workout', label: 'Log Workout', icon: Dumbbell, section: 'core', status: 'real' },
  { id: 'progress', label: 'Client Progress', icon: TrendingUp, section: 'core', status: 'real' },
  { id: 'messages', label: 'Client Messages', icon: MessageSquare, section: 'core', badge: 5, status: 'progress' },

  // Client Training
  { id: 'clients', label: 'My Clients', icon: Users, section: 'training', status: 'real' },
  { id: 'assessments', label: 'Form Assessments', icon: UserCheck, section: 'training', status: 'partial' },
  { id: 'goals', label: 'Goal Tracking', icon: Target, section: 'training', status: 'progress' },

  // Content & Media
  { id: 'videos', label: 'Training Videos', icon: Video, section: 'content', status: 'progress' },
  { id: 'form-checks', label: 'Form Check Center', icon: Camera, section: 'content', badge: 3, status: 'progress' },
  { id: 'content-library', label: 'Content Library', icon: PlayCircle, section: 'content', status: 'progress' },
  { id: 'uploads', label: 'Upload Center', icon: Upload, section: 'content', status: 'progress' },

  // Performance Analytics
  { id: 'analytics', label: 'Training Analytics', icon: BarChart3, section: 'analytics', status: 'partial' },
  { id: 'achievements', label: 'Client Achievements', icon: Award, section: 'analytics', status: 'partial' },
  { id: 'engagement', label: 'Engagement Metrics', icon: Zap, section: 'analytics', status: 'progress' },

  // Tools
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'tools', status: 'progress' },
  { id: 'reports', label: 'Training Reports', icon: FileText, section: 'tools', status: 'partial' },
  { id: 'settings', label: 'Trainer Settings', icon: Settings, section: 'tools', status: 'real' },
];

export const trainerSectionTitles = {
  priority: 'Command Center',
  core: 'Core Features',
  training: 'Client Training',
  content: 'Content Studio',
  analytics: 'Performance',
  tools: 'Trainer Tools',
};
