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
import VideoStudioManager from './Pages/admin-video-studio/VideoStudioManager';
import VideoDetailView from './Pages/admin-video-studio/VideoDetailView';
import { TheAestheticCodex } from '../../core';
import ContactNotifications from './Pages/admin-dashboard/components/ContactNotifications';
import ParamRedirect from './ParamRedirect';

const HomepageDesignLab = React.lazy(() => import('./Pages/admin-design/HomepageDesignLab'));

// Workspace containers
import DashboardWorkspace from './workspaces/DashboardWorkspace';
import ClientsWorkspace from './workspaces/ClientsWorkspace';
import SchedulingWorkspace from './workspaces/SchedulingWorkspace';
import StoreWorkspace from './workspaces/StoreWorkspace';
import ContentWorkspace from './workspaces/ContentWorkspace';
import AnalyticsWorkspace from './workspaces/AnalyticsWorkspace';
import SystemWorkspace from './workspaces/SystemWorkspace';
// Design Playground — lazy-loaded only when VITE_DESIGN_PLAYGROUND=true (not shipped to prod bundle)
const DesignPlayground = import.meta.env.VITE_DESIGN_PLAYGROUND === 'true'
  ? React.lazy(() => import('../../pages/DesignPlayground/DesignPlayground'))
  : null;

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
    {/* ─── Legacy Route Redirects → Workspace Routes ─── */}
    <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
    <Route path="/default" element={<Navigate to="/dashboard/home" replace />} />

    {/* People workspace redirects */}
    <Route path="/user-management" element={<Navigate to="/dashboard/people" replace />} />
    <Route path="/trainers" element={<Navigate to="/dashboard/people/trainers" replace />} />
    <Route path="/trainers/permissions" element={<Navigate to="/dashboard/people/trainers/permissions" replace />} />
    <Route path="/client-trainer-assignments" element={<Navigate to="/dashboard/people/assignments" replace />} />
    <Route path="/client-management" element={<Navigate to="/dashboard/people/progress" replace />} />
    <Route path="/clients" element={<Navigate to="/dashboard/people/clients" replace />} />
    <Route path="/client-onboarding" element={<Navigate to="/dashboard/people/onboarding" replace />} />
    <Route path="/admin/nutrition/:clientId?" element={<ParamRedirect base="/dashboard/people/nutrition" />} />
    <Route path="/admin/workouts/:clientId?" element={<ParamRedirect base="/dashboard/people/workouts" />} />
    <Route path="/admin/notes/:clientId?" element={<ParamRedirect base="/dashboard/people/notes" />} />
    <Route path="/admin/photos/:clientId?" element={<ParamRedirect base="/dashboard/people/photos" />} />
    <Route path="/admin/sms-logs" element={<Navigate to="/dashboard/people/sms-logs" replace />} />
    <Route path="/nasm-compliance" element={<Navigate to="/dashboard/people/nasm" replace />} />
    <Route path="/social-management" element={<Navigate to="/dashboard/people/social" replace />} />
    <Route path="/messages" element={<Navigate to="/dashboard/people/messages" replace />} />

    {/* Scheduling workspace redirects */}
    <Route path="/admin/master-schedule" element={<Navigate to="/dashboard/scheduling" replace />} />
    <Route path="/admin-sessions" element={<Navigate to="/dashboard/scheduling/sessions" replace />} />

    {/* Store workspace redirects */}
    <Route path="/pending-orders" element={<Navigate to="/dashboard/store" replace />} />
    <Route path="/admin-packages" element={<Navigate to="/dashboard/store/packages" replace />} />
    <Route path="/admin-specials" element={<Navigate to="/dashboard/store/specials" replace />} />
    <Route path="/packages" element={<Navigate to="/dashboard/store/packages" replace />} />

    {/* Content workspace redirects */}
    <Route path="/video-studio" element={<Navigate to="/dashboard/content/video-studio" replace />} />
    <Route path="/video-studio/:id" element={<ParamRedirect base="/dashboard/content/video-studio" />} />
    <Route path="/exercise-management" element={<Navigate to="/dashboard/content/exercises" replace />} />
    <Route path="/gamification" element={<Navigate to="/dashboard/content/gamification" replace />} />

    {/* Analytics workspace redirects */}
    <Route path="/analytics" element={<Navigate to="/dashboard/analytics" replace />} />
    <Route path="/revenue" element={<Navigate to="/dashboard/analytics/revenue" replace />} />
    <Route path="/reports" element={<Navigate to={import.meta.env.DEV ? "/dashboard/analytics/performance" : "/dashboard/analytics"} replace />} />
    <Route path="/business-intelligence" element={<Navigate to="/dashboard/analytics/bi" replace />} />
    <Route path="/social-overview" element={<Navigate to="/dashboard/analytics/social" replace />} />

    {/* System workspace redirects */}
    <Route path="/system-health" element={<Navigate to="/dashboard/system" replace />} />
    <Route path="/security" element={<Navigate to={import.meta.env.DEV ? "/dashboard/system/security" : "/dashboard/system"} replace />} />
    <Route path="/admin/automation" element={<Navigate to="/dashboard/system/automation" replace />} />
    <Route path="/mcp-servers" element={<Navigate to="/dashboard/system/mcp" replace />} />
    <Route path="/mcp-overview" element={<Navigate to="/dashboard/system/mcp" replace />} />
    <Route path="/settings" element={<Navigate to="/dashboard/system/settings" replace />} />
    <Route path="/admin/pricing-sheet" element={<Navigate to="/dashboard/system/settings/pricing" replace />} />
    <Route path="/admin/sales-scripts" element={<Navigate to="/dashboard/system/settings/scripts" replace />} />
    <Route path="/admin/launch-checklist" element={<Navigate to="/dashboard/system/settings/launch" replace />} />
    <Route path="/style-guide" element={<Navigate to="/dashboard/system/settings/style-guide" replace />} />

    {/* Dashboard workspace redirects */}
    <Route path="/notifications" element={<Navigate to="/dashboard/home/notifications" replace />} />

    {/* Legacy content route → workspace moderation (flat /content was ContentModerationSection) */}
    <Route path="/content" element={<Navigate to="/dashboard/content/moderation" replace />} />

    {/* Design Playground - Admin concept viewer (build-time gated per CLAUDE.md) */}
    {DesignPlayground && (
      <Route path="/design-playground" element={wrap(
        <React.Suspense fallback={<div>Loading...</div>}>
          <DesignPlayground />
        </React.Suspense>
      )} />
    )}

    {/* ─── Workspace Routes (canonical) ─── */}
    <Route path="/home" element={<DashboardWorkspace />}>
      <Route index element={<RevolutionaryAdminDashboard />} />
      <Route path="notifications" element={<NotificationsSection />} />
      <Route path="alerts" element={<ContactNotifications autoRefresh showActions />} />
      <Route path="approvals" element={<PendingOrdersAdminPanel />} />
      <Route path="snapshot" element={<SystemHealthPanel />} />
    </Route>

    <Route path="/people" element={<ClientsWorkspace />}>
      <Route index element={<ModernUserManagementSystem />} />
      <Route path="clients" element={<ClientsManagementSection />} />
      <Route path="trainers" element={<TrainersManagementSection />} />
      <Route path="trainers/permissions" element={<TrainerPermissionsManager onPermissionChange={() => {}} />} />
      <Route path="onboarding" element={
        <React.Suspense fallback={<div style={{ color: '#fff', padding: 32 }}>Loading...</div>}>
          <ClientOnboardingWizard />
        </React.Suspense>
      } />
      <Route path="messages" element={<MessagingPage />} />
      <Route path="sms-logs" element={<SMSLogsPanel />} />
      <Route path="notes/:clientId?" element={<NotesManager />} />
      <Route path="nutrition/:clientId?" element={<NutritionPlanBuilder />} />
      <Route path="workouts/:clientId?" element={<WorkoutPlanBuilder />} />
      <Route path="photos/:clientId?" element={<PhotoManager />} />
      <Route path="nasm" element={<NASMCompliancePanel />} />
      <Route path="progress" element={<AdminClientProgressView />} />
      <Route path="assignments" element={<ClientTrainerAssignments onAssignmentChange={() => {}} />} />
      <Route path="social" element={<AdminSocialManagementView />} />
    </Route>

    <Route path="/scheduling" element={<SchedulingWorkspace />}>
      <Route index element={<UniversalSchedule mode="admin" />} />
      <Route path="sessions" element={<EnhancedAdminSessionsView />} />
      <Route path="assignments" element={<ClientTrainerAssignments onAssignmentChange={() => {}} />} />
    </Route>

    <Route path="/store" element={<StoreWorkspace />}>
      <Route index element={<PendingOrdersAdminPanel />} />
      <Route path="packages" element={<AdminPackagesView />} />
      <Route path="specials" element={<AdminSpecialsManager />} />
    </Route>

    <Route path="/content" element={<ContentWorkspace />}>
      <Route index element={<Navigate to="/dashboard/content/video-studio" replace />} />
      <Route path="video-studio" element={<VideoStudioManager />} />
      <Route path="video-studio/:id" element={<VideoDetailView />} />
      <Route path="moderation" element={<ContentModerationSection />} />
      <Route path="exercises" element={<AdminExerciseCommandCenter />} />
      <Route path="gamification" element={<AdminGamificationView />} />
      <Route path="design" element={
        <React.Suspense fallback={<div style={{ color: '#fff', padding: 32 }}>Loading Design Lab...</div>}>
          <HomepageDesignLab />
        </React.Suspense>
      } />
    </Route>

    <Route path="/analytics" element={<AnalyticsWorkspace />}>
      <Route index element={<UserAnalyticsPanel />} />
      <Route path="revenue" element={<RevenueAnalyticsPanel />} />
      <Route path="performance" element={
        import.meta.env.DEV ? <PerformanceReportsPanel /> : <Navigate to="/dashboard/analytics" replace />
      } />
      <Route path="bi" element={
        <React.Suspense fallback={<div style={{ color: '#fff', padding: 32 }}>Loading...</div>}>
          <EnterpriseBusinessIntelligenceSuite />
        </React.Suspense>
      } />
      <Route path="social" element={
        <React.Suspense fallback={<div style={{ color: '#fff', padding: 32 }}>Loading...</div>}>
          <SocialMediaCommandCenter />
        </React.Suspense>
      } />
    </Route>

    <Route path="/system" element={<SystemWorkspace />}>
      <Route index element={<SystemHealthPanel />} />
      <Route path="health" element={<SystemHealthPanel />} />
      <Route path="security" element={
        import.meta.env.DEV ? <SecurityMonitoringPanel /> : <Navigate to="/dashboard/system" replace />
      } />
      <Route path="automation" element={<AutomationManager />} />
      <Route path="mcp" element={<MCPServersSection />} />
      <Route path="settings" element={<AdminSettingsSection />} />
      <Route path="settings/pricing" element={<PricingSheetViewer />} />
      <Route path="settings/scripts" element={<SalesScriptViewer />} />
      <Route path="settings/launch" element={<LaunchChecklist />} />
      <Route path="settings/style-guide" element={<TheAestheticCodex />} />
    </Route>

    {/* Fallback Route */}
    <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
  </Routes>
);

export default UnifiedAdminRoutes;
