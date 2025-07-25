/**
 * Admin Dashboard Components Index
 * Exports all admin dashboard components
 */

// Main dashboard - Revolutionary Stellar Command Center
export { default as AdminDashboardView } from './admin-dashboard-view';
export { RevolutionaryAdminDashboard, MainDashboard } from './admin-dashboard-view';
export { default as RevolutionaryAdminDashboard } from './admin-dashboard-view';

// Analytics components
export { default as RevenueAnalyticsPanel } from './components/RevenueAnalyticsPanel';
export { default as UserAnalyticsPanel } from './components/UserAnalyticsPanel';

// Monitoring components
export { default as AIMonitoringPanel } from './components/AIMonitoringPanel';
export { default as SecurityMonitoringPanel } from './components/SecurityMonitoringPanel';
export { default as SystemHealthPanel } from './components/SystemHealthPanel';

// Legacy components - File removed, functionality integrated into main dashboard