import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ExecutivePageContainer } from './AdminLayout.styles';

import { RevolutionaryAdminDashboard } from './Pages/admin-dashboard/admin-dashboard-view';
import EnhancedAdminSessionsView from './Pages/admin-sessions/enhanced-admin-sessions-view';
import ModernUserManagementSystem from './Pages/user-management/modern-user-management';
import AdminClientProgressView from './Pages/admin-client-progress/admin-client-progress-view.V2';
import AdminPackagesView from './Pages/admin-packages/admin-packages-view';
import AdminSpecialsManager from './Pages/admin-specials/AdminSpecialsManager';
import TrainersManagementSection from './Pages/admin-dashboard/TrainersManagementSection';
import AdminGamificationView from './Pages/admin-gamification/admin-gamification-view';
import MessagingPage from '../../pages/MessagingPage';

import UniversalSchedule from '../Schedule/UniversalSchedule';
import RevenueAnalyticsPanel from './Pages/admin-dashboard/components/RevenueAnalyticsPanel';
import PendingOrdersAdminPanel from './Pages/admin-dashboard/components/PendingOrdersAdminPanel';
import UserAnalyticsPanel from './Pages/admin-dashboard/components/UserAnalyticsPanel';
import SystemHealthPanel from './Pages/admin-dashboard/components/SystemHealthPanel';
import SecurityMonitoringPanel from './Pages/admin-dashboard/components/SecurityMonitoringPanel';
import PerformanceReportsPanel from './Pages/admin-dashboard/components/PerformanceReportsPanel';

import {
  ClientsManagementSection,
  PackagesManagementSection,
  ContentModerationSection,
  NotificationsSection,
  MCPServersSection,
  AdminSettingsSection,
} from './Pages/admin-dashboard/sections';

import TrainerPermissionsManager from '../Admin/TrainerPermissionsManager';
import ClientTrainerAssignments from '../Admin/ClientTrainerAssignments';
import NutritionPlanBuilder from '../Admin/NutritionPlanBuilder';
import WorkoutPlanBuilder from '../Admin/WorkoutPlanBuilder';
import NotesManager from '../Admin/NotesManager';
import PhotoManager from '../Admin/PhotoManager';
import AutomationManager from '../Admin/AutomationManager';
import SMSLogsPanel from '../Admin/SMSLogsPanel';
import PricingSheetViewer from '../Admin/PricingSheetViewer';
import SalesScriptViewer from '../Admin/SalesScriptViewer';
import LaunchChecklist from '../Admin/LaunchChecklist';
import AdminSocialManagementView from './Pages/admin-dashboard/components/AdminSocialManagementView';
import NASMCompliancePanel from './Pages/admin-dashboard/components/NASMCompliancePanel';
import AdminExerciseCommandCenter from './Pages/admin-exercises';
import { TheAestheticCodex } from '../../core';

const ClientOnboardingWizard = React.lazy(() => import('../../pages/onboarding/ClientOnboardingWizard'));
const SocialMediaCommandCenter = React.lazy(
  () => import('./Pages/admin-dashboard/components/SocialMediaCommand/SocialMediaCommandCenter')
);
const EnterpriseBusinessIntelligenceSuite = React.lazy(
  () => import('./Pages/admin-dashboard/components/BusinessIntelligence/EnterpriseBusinessIntelligenceSuite')
);

const pageMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const wrap = (element: React.ReactNode) => (
  <ExecutivePageContainer {...pageMotion}>{element}</ExecutivePageContainer>
);

const UnifiedAdminRoutes: React.FC = () => (
  <Routes>
    {/* Overview Routes */}
    <Route path="/" element={<Navigate to="/dashboard/default" replace />} />
    <Route path="/default" element={<RevolutionaryAdminDashboard />} />
    <Route path="/analytics" element={wrap(<UserAnalyticsPanel />)} />

    {/* Platform Management Routes */}
    <Route path="/user-management" element={<ModernUserManagementSystem />} />
    <Route path="/trainers" element={wrap(<TrainersManagementSection />)} />
    <Route path="/trainers/permissions" element={wrap(<TrainerPermissionsManager onPermissionChange={() => {}} />)} />
    <Route path="/client-trainer-assignments" element={wrap(<ClientTrainerAssignments onAssignmentChange={() => {}} />)} />
    <Route path="/client-management" element={<AdminClientProgressView />} />
    <Route path="/clients" element={wrap(<ClientsManagementSection />)} />
    <Route path="/client-onboarding" element={wrap(<ClientOnboardingWizard />)} />
    <Route path="/admin/nutrition/:clientId?" element={wrap(<NutritionPlanBuilder />)} />
    <Route path="/admin/workouts/:clientId?" element={wrap(<WorkoutPlanBuilder />)} />
    <Route path="/admin/notes/:clientId?" element={wrap(<NotesManager />)} />
    <Route path="/admin/photos/:clientId?" element={wrap(<PhotoManager />)} />
    <Route path="/admin/automation" element={wrap(<AutomationManager />)} />
    <Route path="/admin/sms-logs" element={wrap(<SMSLogsPanel />)} />
    <Route path="/admin/pricing-sheet" element={wrap(<PricingSheetViewer />)} />
    <Route path="/admin/sales-scripts" element={wrap(<SalesScriptViewer />)} />
    <Route path="/admin/launch-checklist" element={wrap(<LaunchChecklist />)} />
    <Route path="/packages" element={wrap(<PackagesManagementSection />)} />
    <Route path="/admin-sessions" element={<EnhancedAdminSessionsView />} />
    <Route path="/admin/master-schedule" element={wrap(<UniversalSchedule mode="admin" />)} />
    <Route path="/admin-packages" element={<AdminPackagesView />} />
    <Route path="/admin-specials" element={wrap(<AdminSpecialsManager />)} />
    <Route path="/content" element={wrap(<ContentModerationSection />)} />

    {/* Business Intelligence Routes */}
    <Route path="/revenue" element={wrap(<RevenueAnalyticsPanel />)} />
    <Route path="/pending-orders" element={wrap(<PendingOrdersAdminPanel />)} />
    <Route path="/reports" element={wrap(<PerformanceReportsPanel />)} />
    <Route path="/gamification" element={wrap(<AdminGamificationView />)} />
    <Route path="/notifications" element={wrap(<NotificationsSection />)} />
    <Route path="/messages" element={wrap(<MessagingPage />)} />

    {/* System Operations Routes */}
    <Route path="/system-health" element={wrap(<SystemHealthPanel />)} />
    <Route path="/security" element={wrap(<SecurityMonitoringPanel />)} />
    <Route path="/mcp-servers" element={wrap(<MCPServersSection />)} />
    <Route path="/settings" element={wrap(<AdminSettingsSection />)} />

    {/* The Aesthetic Codex */}
    <Route path="/style-guide" element={wrap(<TheAestheticCodex />)} />

    {/* Enterprise Business Intelligence Routes */}
    <Route path="/mcp-overview" element={wrap(<MCPServersSection />)} />
    <Route path="/social-overview" element={wrap(<SocialMediaCommandCenter />)} />
    <Route path="/business-intelligence" element={wrap(<EnterpriseBusinessIntelligenceSuite />)} />

    {/* Enhanced Admin Features */}
    <Route path="/social-management" element={wrap(<AdminSocialManagementView />)} />
    <Route path="/nasm-compliance" element={wrap(<NASMCompliancePanel />)} />

    {/* Admin Exercise Command Center */}
    <Route path="/exercise-management" element={wrap(<AdminExerciseCommandCenter />)} />

    {/* Fallback Route */}
    <Route path="*" element={<Navigate to="/dashboard/default" replace />} />
  </Routes>
);

export default UnifiedAdminRoutes;
