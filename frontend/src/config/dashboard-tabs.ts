/**
 * Dashboard Tabs Configuration
 *
 * Centralized configuration for dashboard tabs across different user roles.
 * This ensures consistency between admin, trainer, and client dashboards.
 */

export type TabStatus = 'real' | 'mock' | 'partial' | 'fix' | 'progress' | 'new' | 'error';

export type DashboardTab = {
  key: string;
  label: string;
  icon: string;
  order: number;
  status?: TabStatus;
  section?: 'command' | 'management' | 'business' | 'content' | 'system';
  route?: string;
  description?: string;
  notification?: number;
  isNew?: boolean;
  isDisabled?: boolean;
};

// Common tabs shared across dashboard types
export const COMMON_DASHBOARD_TABS: DashboardTab[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: 'Shield',
    order: 1,
    status: 'mock',
  },
  {
    key: 'sessions',
    label: 'Schedule',
    icon: 'Calendar',
    order: 2,
    status: 'partial',
  },
  {
    key: 'workouts',
    label: 'Workouts',
    icon: 'Dumbbell',
    order: 3,
    status: 'real',
  },
  {
    key: 'client-progress',
    label: 'Client Progress',
    icon: 'BarChart3',
    order: 4,
    status: 'real',
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: 'Mail',
    order: 5,
    status: 'real',
  },
  {
    key: 'gamification',
    label: 'Gamification',
    icon: 'Gamepad2',
    order: 6,
    status: 'real',
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'Users',
    order: 7,
    status: 'progress',
  },
];

// Admin dashboard tabs (full navigation set)
export const ADMIN_DASHBOARD_TABS: DashboardTab[] = [
  {
    key: 'overview',
    label: 'Dashboard Overview',
    icon: 'Shield',
    order: 1,
    status: 'mock',
    section: 'command',
    route: '/dashboard/default',
    description: 'Executive command center overview',
  },
  {
    key: 'master-schedule',
    label: 'Master Schedule',
    icon: 'Calendar',
    order: 2,
    status: 'partial',
    section: 'command',
    route: '/dashboard/admin/master-schedule',
    description: 'Universal Master Schedule management',
    isNew: true,
  },
  {
    key: 'analytics',
    label: 'Analytics Hub',
    icon: 'BarChart3',
    order: 3,
    status: 'real',
    section: 'command',
    route: '/dashboard/analytics',
    description: 'Comprehensive analytics and insights',
  },
  {
    key: 'users',
    label: 'User Management',
    icon: 'Users',
    order: 4,
    status: 'real',
    section: 'management',
    route: '/dashboard/user-management',
    description: 'Manage all platform users',
  },
  {
    key: 'trainers',
    label: 'Trainer Management',
    icon: 'UserCheck',
    order: 5,
    status: 'real',
    section: 'management',
    route: '/dashboard/trainers',
    description: 'Manage trainer accounts and permissions',
  },
  {
    key: 'clients',
    label: 'Client Management',
    icon: 'Users',
    order: 6,
    status: 'real',
    section: 'management',
    route: '/dashboard/clients',
    description: 'Monitor client accounts and engagement',
  },
  {
    key: 'client-onboarding',
    label: 'Client Onboarding',
    icon: 'UserPlus',
    order: 7,
    status: 'new',
    section: 'management',
    route: '/dashboard/client-onboarding',
    description: 'Onboard new clients with comprehensive wizard',
    isNew: true,
  },
  {
    key: 'sessions',
    label: 'Session Scheduling',
    icon: 'Calendar',
    order: 8,
    status: 'partial',
    section: 'management',
    route: '/dashboard/admin-sessions',
    description: 'Manage training sessions and appointments',
  },
  {
    key: 'packages',
    label: 'Package Management',
    icon: 'Package',
    order: 9,
    status: 'real',
    section: 'management',
    route: '/dashboard/admin-packages',
    description: 'Configure pricing and session packages',
  },
  {
    key: 'revenue',
    label: 'Revenue Analytics',
    icon: 'DollarSign',
    order: 10,
    status: 'real',
    section: 'business',
    route: '/dashboard/revenue',
    description: 'Track revenue streams and financial metrics',
  },
  {
    key: 'pending-orders',
    label: 'Pending Orders',
    icon: 'CreditCard',
    order: 11,
    status: 'real',
    section: 'business',
    route: '/dashboard/pending-orders',
    description: 'Manage manual payments and pending orders',
    notification: 3,
  },
  {
    key: 'reports',
    label: 'Performance Reports',
    icon: 'FileText',
    order: 12,
    status: 'real',
    section: 'business',
    route: '/dashboard/reports',
    description: 'Generate comprehensive performance reports',
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: 'Mail',
    order: 13,
    status: 'real',
    section: 'content',
    route: '/dashboard/messages',
    description: 'View and manage platform messages',
  },
  {
    key: 'content',
    label: 'Content Moderation',
    icon: 'MessageSquare',
    order: 14,
    status: 'real',
    section: 'content',
    route: '/dashboard/content',
    description: 'Review and moderate user-generated content',
    notification: 5,
  },
  {
    key: 'gamification',
    label: 'Gamification Engine',
    icon: 'Gamepad2',
    order: 15,
    status: 'real',
    section: 'content',
    route: '/dashboard/gamification',
    description: 'Configure achievements and engagement systems',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'Bell',
    order: 16,
    status: 'error',
    section: 'content',
    route: '/dashboard/notifications',
    description: 'Manage platform notifications and alerts',
    notification: 12,
  },
  {
    key: 'system-health',
    label: 'System Health',
    icon: 'Monitor',
    order: 17,
    status: 'mock',
    section: 'system',
    route: '/dashboard/system-health',
    description: 'Monitor system performance and uptime',
  },
  {
    key: 'security',
    label: 'Security Dashboard',
    icon: 'ShieldCheck',
    order: 18,
    status: 'real',
    section: 'system',
    route: '/dashboard/security',
    description: 'Security monitoring and threat analysis',
  },
  {
    key: 'mcp-servers',
    label: 'MCP Servers',
    icon: 'Server',
    order: 19,
    status: 'real',
    section: 'system',
    route: '/dashboard/mcp-servers',
    description: 'MCP server status and configuration',
  },
  {
    key: 'settings',
    label: 'Admin Settings',
    icon: 'Settings',
    order: 20,
    status: 'real',
    section: 'system',
    route: '/dashboard/settings',
    description: 'Administrative settings and configurations',
  },
  {
    key: 'style-guide',
    label: 'Aesthetic Codex',
    icon: 'Grid',
    order: 21,
    status: 'real',
    section: 'system',
    route: '/dashboard/style-guide',
    description: 'Living style guide and design system',
    isNew: true,
  },
];

// Trainer-specific tabs
export const TRAINER_DASHBOARD_TABS: DashboardTab[] = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'clients',
    label: 'Clients',
    icon: 'Users',
    order: 8,
  },
  {
    key: 'packages',
    label: 'Packages',
    icon: 'ShoppingBag',
    order: 9,
  },
];

// Client-specific tabs
export const CLIENT_DASHBOARD_TABS: DashboardTab[] = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'creative',
    label: 'Creative Hub',
    icon: 'Palette',
    order: 8,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'UserCircle',
    order: 9,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    order: 10,
  },
];

export default {
  COMMON_DASHBOARD_TABS,
  ADMIN_DASHBOARD_TABS,
  TRAINER_DASHBOARD_TABS,
  CLIENT_DASHBOARD_TABS,
};
