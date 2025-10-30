/**
 * Admin Dashboard Components - Enhanced Index
 * ==========================================
 * 
 * Centralized export point for all admin dashboard components
 * Maintains backwards compatibility while providing cleaner import paths
 * 
 * PRODUCTION COMPONENTS (DO NOT MODIFY):
 * - UnifiedAdminDashboardLayout (Primary admin layout)
 * - AdminStellarSidebar (Primary navigation)
 * - TheAestheticCodex (Style guide)
 */

// === PRIMARY PRODUCTION COMPONENTS (DO NOT MODIFY) ===
export { default as UnifiedAdminDashboardLayout } from './UnifiedAdminDashboardLayout';

// Primary Dashboard Pages (Production Ready)
export { RevolutionaryAdminDashboard } from './Pages/admin-dashboard/admin-dashboard-view';
export { default as EnhancedAdminSessionsView } from './Pages/admin-sessions/enhanced-admin-sessions-view';
export { default as ModernUserManagementSystem } from './Pages/user-management/modern-user-management';
export { default as AdminClientProgressView } from './Pages/admin-client-progress/admin-client-progress-view.V2.tsx';
export { default as AdminPackagesView } from './Pages/admin-packages/admin-packages-view';
export { default as AdminGamificationView } from './Pages/admin-gamification/admin-gamification-view';

// Navigation Components
export { default as AdminStellarSidebar } from './Pages/admin-dashboard/AdminStellarSidebar';

// Management Sections (All Production Ready)
export {
  ClientsManagementSection,
  PackagesManagementSection,
  ContentModerationSection,
  NotificationsSection,
  MCPServersSection,
  AdminSettingsSection
} from './Pages/admin-dashboard/sections';

// === ANALYTICS & BUSINESS INTELLIGENCE ===
export { default as RevenueAnalyticsPanel } from './Pages/admin-dashboard/components/RevenueAnalyticsPanel';
export { default as UserAnalyticsPanel } from './Pages/admin-dashboard/components/UserAnalyticsPanel';
export { default as SystemHealthPanel } from './Pages/admin-dashboard/components/SystemHealthPanel';
export { default as SecurityMonitoringPanel } from './Pages/admin-dashboard/components/SecurityMonitoringPanel';
export { default as PerformanceReportsPanel } from './Pages/admin-dashboard/components/PerformanceReportsPanel';
export { default as PendingOrdersAdminPanel } from './Pages/admin-dashboard/components/PendingOrdersAdminPanel';

// === SPECIALIZED COMPONENTS ===
export { default as TrainersManagementSection } from './Pages/admin-dashboard/TrainersManagementSection';
export { default as AdminSocialManagementView } from './Pages/admin-dashboard/components/AdminSocialManagementView';
export { default as NASMCompliancePanel } from './Pages/admin-dashboard/components/NASMCompliancePanel';

// === EXERCISE MANAGEMENT SYSTEM ===
export { default as AdminExerciseCommandCenter } from './Pages/admin-exercises';
export * from './Pages/admin-exercises'; // Export all exercise management components

// === UNIVERSAL MASTER SCHEDULE INTEGRATION ===
export { default as AdminScheduleIntegration } from '../UniversalMasterSchedule/AdminScheduleIntegration';

// === STYLE GUIDE & THEME ===
export { TheAestheticCodex } from '../../core';

// === LAZY-LOADED ENTERPRISE COMPONENTS ===
// These are loaded dynamically, so we export lazy loading functions
export const SocialMediaCommandCenter = () => import('./Pages/admin-dashboard/components/SocialMediaCommand/SocialMediaCommandCenter');
export const EnterpriseBusinessIntelligenceSuite = () => import('./Pages/admin-dashboard/components/BusinessIntelligence/EnterpriseBusinessIntelligenceSuite');

// === TYPE DEFINITIONS ===
export interface AdminDashboardProps {
  user?: any;
  role?: 'admin' | 'super_admin';
  permissions?: string[];
}

export interface AdminSectionProps {
  onDataChange?: () => void;
  refreshInterval?: number;
}

export interface AdminAnalyticsProps extends AdminSectionProps {
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  includeComparisons?: boolean;
}

// === UTILITY FUNCTIONS ===
export const formatAdminNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const getAdminRouteTitle = (pathname: string): string => {
  const routeTitles: Record<string, string> = {
    '/dashboard/default': 'Executive Overview',
    '/dashboard/user-management': 'User Management',
    '/dashboard/admin-sessions': 'Session Management',
    '/dashboard/style-guide': 'Design System',
    '/dashboard/admin/master-schedule': 'Master Schedule',
    '/dashboard/analytics': 'Analytics Dashboard',
    '/dashboard/revenue': 'Revenue Analytics',
    '/dashboard/trainers': 'Trainer Management',
    '/dashboard/clients': 'Client Management',
    '/dashboard/packages': 'Package Management',
    '/dashboard/content': 'Content Moderation',
    '/dashboard/notifications': 'Notification Center',
    '/dashboard/system-health': 'System Health',
    '/dashboard/security': 'Security Monitor',
    '/dashboard/mcp-servers': 'MCP Servers',
    '/dashboard/settings': 'Admin Settings',
    '/dashboard/exercise-management': 'Exercise Center',
    '/dashboard/gamification': 'Gamification Hub',
    '/dashboard/social-management': 'Social Management',
    '/dashboard/nasm-compliance': 'NASM Compliance'
  };
  
  return routeTitles[pathname] || 'Admin Dashboard';
};

// === BACKWARDS COMPATIBILITY ===
// Maintain all existing import patterns for production safety
export { default as UniversalDashboardLayout } from './UniversalDashboardLayout';

// === CONSTANTS ===
export const ADMIN_DASHBOARD_VERSION = '2.1.0';
export const SUPPORTED_ADMIN_ROLES = ['admin', 'super_admin'] as const;
export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds
export const MAX_CONCURRENT_REQUESTS = 5;

export const ADMIN_PERMISSIONS = {
  READ_USERS: 'admin:read:users',
  WRITE_USERS: 'admin:write:users',
  READ_ANALYTICS: 'admin:read:analytics',
  WRITE_SYSTEM: 'admin:write:system',
  READ_FINANCIAL: 'admin:read:financial',
  WRITE_FINANCIAL: 'admin:write:financial',
  MANAGE_TRAINERS: 'admin:manage:trainers',
  MANAGE_CONTENT: 'admin:manage:content',
  SYSTEM_ADMIN: 'admin:system:full'
} as const;

export default {
  UnifiedAdminDashboardLayout,
  AdminStellarSidebar,
  TheAestheticCodex,
  version: ADMIN_DASHBOARD_VERSION
};
