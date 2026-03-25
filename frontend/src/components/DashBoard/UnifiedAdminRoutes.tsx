import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ExecutivePageContainer } from './AdminLayout.styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded route components (~40% initial bundle reduction)
// All route-level components use React.lazy for code-splitting.
// Only structural/layout components (workspaces, Suspense loader) stay eager.
// ─────────────────────────────────────────────────────────────
import CosmicSuspenseLoader from '../Shared/CosmicSuspenseLoader';
import ParamRedirect from './ParamRedirect';

// Dashboard home — eager since it's the default landing page
import { RevolutionaryAdminDashboard } from './Pages/admin-dashboard/admin-dashboard-view';

// Lazy: Admin panels & views
const EnhancedAdminSessionsView = React.lazy(() => import('./Pages/admin-sessions/enhanced-admin-sessions-view'));
const ModernUserManagementSystem = React.lazy(() => import('./Pages/user-management/modern-user-management'));
const AdminClientProgressView = React.lazy(() => import('./Pages/admin-client-progress/admin-client-progress-view.V2'));
const AdminPackagesView = React.lazy(() => import('./Pages/admin-packages/admin-packages-view.V2'));
const AdminSpecialsManager = React.lazy(() => import('./Pages/admin-specials/AdminSpecialsManager'));
const CustomPackageCreator = React.lazy(() => import('./Pages/admin-dashboard/CustomPackageCreator'));
const EnhancedTrainerDataManagement = React.lazy(() => import('./Pages/admin-trainers/EnhancedTrainerDataManagement'));
const MessagingPage = React.lazy(() => import('../../pages/MessagingPage'));

// Lazy: Schedule & analytics
const UniversalSchedule = React.lazy(() => import('../Schedule/UniversalSchedule'));
const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'));
const PendingOrdersAdminPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PendingOrdersAdminPanel'));
const UserAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/UserAnalyticsPanel'));
const SystemHealthPanel = React.lazy(() => import('./Pages/admin-dashboard/components/SystemHealthPanel'));
const SecurityMonitoringPanel = React.lazy(() => import('./Pages/admin-dashboard/components/SecurityMonitoringPanel'));
const PerformanceReportsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PerformanceReportsPanel'));

// Lazy: Dashboard sections (named exports → wrapped for React.lazy)
const ClientsManagementSection = React.lazy(() => import('./Pages/admin-dashboard/sections').then(m => ({ default: m.ClientsManagementSection })));
const ContentModerationSection = React.lazy(() => import('./Pages/admin-dashboard/sections').then(m => ({ default: m.ContentModerationSection })));
const NotificationsSection = React.lazy(() => import('./Pages/admin-dashboard/sections').then(m => ({ default: m.NotificationsSection })));
const MCPServersSection = React.lazy(() => import('./Pages/admin-dashboard/sections').then(m => ({ default: m.MCPServersSection })));
const AdminSettingsSection = React.lazy(() => import('./Pages/admin-dashboard/sections').then(m => ({ default: m.AdminSettingsSection })));

// Lazy: Admin tools
const TrainerPermissionsManager = React.lazy(() => import('../Admin/TrainerPermissionsManager'));
const ClientTrainerAssignments = React.lazy(() => import('../Admin/ClientTrainerAssignments'));
const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'));
const WorkoutPlanBuilder = React.lazy(() => import('../Admin/WorkoutPlanBuilder'));
const NotesManager = React.lazy(() => import('../Admin/NotesManager'));
const PhotoManager = React.lazy(() => import('../Admin/PhotoManager'));
const AutomationManager = React.lazy(() => import('../Admin/AutomationManager'));
const SMSLogsPanel = React.lazy(() => import('../Admin/SMSLogsPanel'));
const PricingSheetViewer = React.lazy(() => import('../Admin/PricingSheetViewer'));
const AdminSocialManagementView = React.lazy(() => import('./Pages/admin-dashboard/components/AdminSocialManagementView'));
const AdminWaiversManager = React.lazy(() => import('./Pages/admin-waivers/AdminWaiversManager'));

// Lazy: Specialized views
const MeasurementEntry = React.lazy(() => import('./Pages/admin-dashboard/MeasurementEntry'));
const NASMCompliancePanel = React.lazy(() => import('./Pages/admin-dashboard/components/NASMCompliancePanel'));
const AdminExerciseCommandCenter = React.lazy(() => import('./Pages/admin-exercises'));
const VideoStudioManager = React.lazy(() => import('./Pages/admin-video-studio/VideoStudioManager'));
const VideoDetailView = React.lazy(() => import('./Pages/admin-video-studio/VideoDetailView'));
const OrientationList = React.lazy(() => import('./Pages/admin-dashboard/components/OrientationList'));

// Lazy: Feature modules
const AdminGalleryManager = React.lazy(() => import('./Pages/admin-gallery/AdminGalleryManager'));
// HomepageDesignLab removed — not currently routed (was Phase 1 consolidation)
const MovementAnalysisListPage = React.lazy(() => import('./Pages/admin-movement-analysis/MovementAnalysisListPage'));
const MovementAnalysisWizard = React.lazy(() => import('./Pages/admin-movement-analysis/MovementAnalysisWizard'));
const FormAnalysisPage = React.lazy(() => import('../FormAnalysis/FormAnalysisPage'));
const BodyMap = React.lazy(() => import('../BodyMap'));
const BootcampBuilderPage = React.lazy(() => import('../BootcampBuilder/BootcampBuilderPage'));
const EquipmentManagerPage = React.lazy(() => import('../EquipmentManager/EquipmentManagerPage'));
// FoodIntelligenceDashboard removed — merged into NutritionWorkspace
const NutritionWorkspace = React.lazy(() => import('./workspaces/NutritionWorkspace'));
const FoodScannerPage = React.lazy(() => import('../../pages/FoodScanner/FoodScannerPage'));
const CATaxCalculatorWidget = React.lazy(() => import('./Pages/admin-revenue/CATaxCalculatorWidget'));
const PaymentSettingsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PaymentSettingsPanel'));
const LeadCRMDashboard = React.lazy(() => import('./Pages/admin-leads/LeadCRMDashboard'));
const CanadaImmigrationTab = React.lazy(() => import('./Pages/canada-immigration/CanadaImmigrationTab'));
const AdminViewAsWrapper = React.lazy(() => import('./Pages/admin-clients/components/AdminViewAsWrapper'));
const ChartGallery = React.lazy(() => import('../Charts/ChartGallery'));
const BadgeArtGallery = React.lazy(() => import('../BadgeGallery/BadgeArtGallery'));


// Workspace containers
import DashboardWorkspace from './workspaces/DashboardWorkspace';
import ClientsWorkspace from './workspaces/ClientsWorkspace';
import SchedulingWorkspace from './workspaces/SchedulingWorkspace';
import StoreWorkspace from './workspaces/StoreWorkspace';
import ContentWorkspace from './workspaces/ContentWorkspace';
import GamificationWorkspace from './workspaces/GamificationWorkspace';
import WorkoutsWorkspace from './workspaces/WorkoutsWorkspace';
import WorkoutOutletWrapper from './workspaces/WorkoutOutletWrapper';
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

// Suspense wrapper for lazy-loaded route components
const S: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <React.Suspense fallback={<CosmicSuspenseLoader />}>{children}</React.Suspense>
);

const UnifiedAdminRoutes: React.FC = () => (
  <Routes>
    {/* ─── Legacy Route Redirects → Workspace Routes ─── */}
    <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
    <Route path="/default" element={<Navigate to="/dashboard/home" replace />} />

    {/* People workspace redirects */}
    <Route path="/user-management" element={<Navigate to="/dashboard/people/users" replace />} />
    <Route path="/trainers" element={<Navigate to="/dashboard/people/trainers" replace />} />
    <Route path="/trainers/permissions" element={<Navigate to="/dashboard/people/trainers/permissions" replace />} />
    <Route path="/client-trainer-assignments" element={<Navigate to="/dashboard/people/assignments" replace />} />
    <Route path="/client-management" element={<Navigate to="/dashboard/people/progress" replace />} />
    <Route path="/clients" element={<Navigate to="/dashboard/people" replace />} />
    <Route path="/client-onboarding" element={<Navigate to="/dashboard/people/onboarding" replace />} />
    <Route path="/admin/nutrition/:clientId?" element={<ParamRedirect base="/dashboard/people/nutrition" />} />
    <Route path="/admin/workouts/:clientId?" element={<ParamRedirect base="/dashboard/people/workouts" />} />
    <Route path="/admin/notes/:clientId?" element={<ParamRedirect base="/dashboard/people/notes" />} />
    <Route path="/admin/photos/:clientId?" element={<ParamRedirect base="/dashboard/people/photos" />} />
    <Route path="/admin/sms-logs" element={<Navigate to="/dashboard/people/sms-logs" replace />} />
    <Route path="/nasm-compliance" element={<Navigate to="/dashboard/people/nasm" replace />} />
    <Route path="/social-management" element={<Navigate to="/dashboard/people/social" replace />} />
    <Route path="/messages" element={<Navigate to="/dashboard/people/messages" replace />} />
    <Route path="/client-orientation" element={<Navigate to="/dashboard/people/orientations" replace />} />
    <Route path="/movement-screen" element={<Navigate to="/dashboard/people/movement-screen" replace />} />

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
    {/* Phase 1 consolidation: removed tabs redirect to settings */}
    <Route path="/admin/sales-scripts" element={<Navigate to="/dashboard/system/settings" replace />} />
    <Route path="/admin/launch-checklist" element={<Navigate to="/dashboard/system/settings" replace />} />
    <Route path="/style-guide" element={<Navigate to="/dashboard/system/settings" replace />} />

    {/* Dashboard workspace redirects */}
    <Route path="/notifications" element={<Navigate to="/dashboard/home/notifications" replace />} />

    {/* Legacy content route → workspace moderation (flat /content was ContentModerationSection) */}
    <Route path="/content" element={<Navigate to="/dashboard/content/moderation" replace />} />

    {/* Design Playground - Admin concept viewer (build-time gated per CLAUDE.md) */}
    {DesignPlayground && (
      <Route path="/design-playground" element={wrap(
        <React.Suspense fallback={<CosmicSuspenseLoader />}>
          <DesignPlayground />
        </React.Suspense>
      )} />
    )}

    {/* ─── Workspace Routes (canonical) ─── */}
    <Route path="/home" element={<DashboardWorkspace />}>
      <Route index element={<RevolutionaryAdminDashboard />} />
      <Route path="notifications" element={<S><NotificationsSection /></S>} />
      <Route path="alerts" element={<Navigate to="/dashboard/home" replace />} />
      <Route path="approvals" element={<S><PendingOrdersAdminPanel /></S>} />
      <Route path="snapshot" element={<S><SystemHealthPanel /></S>} />
    </Route>

    <Route path="/people" element={<ClientsWorkspace />}>
      <Route index element={<S><ClientsManagementSection /></S>} />
      <Route path="view-as/:userId" element={<S><AdminViewAsWrapper /></S>} />
      <Route path="users" element={<S><ModernUserManagementSystem /></S>} />
      <Route path="trainers" element={<S><EnhancedTrainerDataManagement /></S>} />
      <Route path="trainers/permissions" element={<S><TrainerPermissionsManager onPermissionChange={() => {}} /></S>} />
      <Route path="orientations" element={<S><OrientationList /></S>} />
      <Route path="onboarding" element={<S><ClientOnboardingWizard /></S>} />
      <Route path="messages" element={<S><MessagingPage /></S>} />
      <Route path="sms-logs" element={<S><SMSLogsPanel /></S>} />
      <Route path="notes/:clientId?" element={<S><NotesManager /></S>} />
      <Route path="nutrition/:clientId?" element={<S><NutritionPlanBuilder /></S>} />
      <Route path="workouts/:clientId?" element={<S><WorkoutPlanBuilder /></S>} />
      <Route path="photos/:clientId?" element={<S><PhotoManager /></S>} />
      <Route path="nasm" element={<S><NASMCompliancePanel /></S>} />
      <Route path="progress" element={<S><AdminClientProgressView /></S>} />
      <Route path="assignments" element={<S><ClientTrainerAssignments onAssignmentChange={() => {}} /></S>} />
      <Route path="social" element={<S><AdminSocialManagementView /></S>} />
      <Route path="waivers" element={<S><AdminWaiversManager /></S>} />
      <Route path="leads" element={<S><LeadCRMDashboard /></S>} />
      <Route path="movement-screen" element={<S><MovementAnalysisListPage /></S>} />
      <Route path="movement-screen/new" element={<S><MovementAnalysisWizard /></S>} />
      <Route path="movement-screen/new/:clientId" element={<S><MovementAnalysisWizard /></S>} />
      <Route path="movement-screen/:id" element={<S><MovementAnalysisWizard /></S>} />
      <Route path="measurements/:clientId?" element={<S><MeasurementEntry /></S>} />
    </Route>

    <Route path="/scheduling" element={<SchedulingWorkspace />}>
      <Route index element={<S><UniversalSchedule mode="admin" /></S>} />
      <Route path="sessions" element={<S><EnhancedAdminSessionsView /></S>} />
      <Route path="assignments" element={<S><ClientTrainerAssignments onAssignmentChange={() => {}} /></S>} />
    </Route>

    <Route path="/store" element={<StoreWorkspace />}>
      <Route index element={<S><PendingOrdersAdminPanel /></S>} />
      <Route path="packages" element={<S><AdminPackagesView /></S>} />
      <Route path="specials" element={<S><AdminSpecialsManager /></S>} />
      <Route path="custom-packages" element={<S><CustomPackageCreator /></S>} />
      <Route path="revenue" element={<S><CATaxCalculatorWidget /></S>} />
      <Route path="payment-settings" element={<S><PaymentSettingsPanel /></S>} />
    </Route>

    <Route path="/workouts" element={<WorkoutsWorkspace />}>
      <Route index element={<WorkoutOutletWrapper component="planner" />} />
      <Route path="logger" element={<WorkoutOutletWrapper component="logger" />} />
      <Route path="ai" element={<WorkoutOutletWrapper component="ai" />} />
      <Route path="movement" element={<S><MovementAnalysisListPage /></S>} />
      <Route path="movement/new" element={<S><MovementAnalysisWizard /></S>} />
      <Route path="movement/new/:clientId" element={<S><MovementAnalysisWizard /></S>} />
      <Route path="movement/:id" element={<S><MovementAnalysisWizard /></S>} />
      {/* Redirect legacy /ai route to planner (AI Generator merged into Workout Planner tab) */}
      <Route path="ai" element={<Navigate to="/dashboard/workouts" replace />} />
      <Route path="form-analysis" element={<S><FormAnalysisPage /></S>} />
      <Route path="body-map" element={<WorkoutOutletWrapper component="body-map" />} />
      <Route path="bootcamp" element={<S><BootcampBuilderPage /></S>} />
      <Route path="equipment" element={<S><EquipmentManagerPage /></S>} />
      <Route path="nutrition" element={<S><NutritionWorkspace /></S>} />
      {/* food-scanner merged into nutrition tab */}
      <Route path="food-scanner" element={<Navigate to="/dashboard/workouts/nutrition" replace />} />
    </Route>

    {/* Phase 3 consolidation: AdminGamificationView manages its own internal tabs,
        so the 4 redundant outer workspace tabs were removed. Sub-routes redirect to index. */}
    <Route path="/gamification" element={<GamificationWorkspace />} />
    <Route path="/gamification/rewards" element={<Navigate to="/dashboard/gamification" replace />} />
    <Route path="/gamification/settings" element={<Navigate to="/dashboard/gamification" replace />} />
    <Route path="/gamification/analytics" element={<Navigate to="/dashboard/gamification" replace />} />

    <Route path="/content" element={<ContentWorkspace />}>
      <Route index element={<Navigate to="/dashboard/content/video-studio" replace />} />
      <Route path="video-studio" element={<S><VideoStudioManager /></S>} />
      <Route path="video-studio/:id" element={<S><VideoDetailView /></S>} />
      <Route path="moderation" element={<S><ContentModerationSection /></S>} />
      <Route path="exercises" element={<S><AdminExerciseCommandCenter /></S>} />
      {/* Legacy route - gamification moved to its own workspace */}
      <Route path="gamification" element={<Navigate to="/dashboard/gamification" replace />} />
      <Route path="gallery" element={<S><AdminGalleryManager /></S>} />
      {/* Design tab removed (Phase 1 consolidation) - redirect to content root */}
      <Route path="design" element={<Navigate to="/dashboard/content/video-studio" replace />} />
    </Route>

    <Route path="/analytics" element={<AnalyticsWorkspace />}>
      <Route index element={<S><UserAnalyticsPanel /></S>} />
      <Route path="charts" element={<S><ChartGallery /></S>} />
      <Route path="badges" element={<S><BadgeArtGallery /></S>} />
      <Route path="revenue" element={<S><RevenueAnalyticsPanel /></S>} />
      <Route path="performance" element={
        import.meta.env.DEV ? <S><PerformanceReportsPanel /></S> : <Navigate to="/dashboard/analytics" replace />
      } />
      <Route path="bi" element={<S><EnterpriseBusinessIntelligenceSuite /></S>} />
      <Route path="social" element={<S><SocialMediaCommandCenter /></S>} />
    </Route>

    <Route path="/system" element={<SystemWorkspace />}>
      <Route index element={<S><SystemHealthPanel /></S>} />
      <Route path="health" element={<S><SystemHealthPanel /></S>} />
      <Route path="security" element={
        import.meta.env.DEV ? <S><SecurityMonitoringPanel /></S> : <Navigate to="/dashboard/system" replace />
      } />
      <Route path="automation" element={<S><AutomationManager /></S>} />
      <Route path="mcp" element={<S><MCPServersSection /></S>} />
      <Route path="settings" element={<S><AdminSettingsSection /></S>} />
      <Route path="settings/pricing" element={<S><PricingSheetViewer /></S>} />
      {/* Phase 1 consolidation: Sales Scripts, Launch Checklist, Style Guide removed - redirect to settings */}
      <Route path="settings/scripts" element={<Navigate to="/dashboard/system/settings" replace />} />
      <Route path="settings/launch" element={<Navigate to="/dashboard/system/settings" replace />} />
      <Route path="settings/style-guide" element={<Navigate to="/dashboard/system/settings" replace />} />
    </Route>

    {/* Canada Immigration — Admin-only standalone mini-app */}
    <Route path="/immigration" element={
      <React.Suspense fallback={<CosmicSuspenseLoader />}>
        <CanadaImmigrationTab />
      </React.Suspense>
    } />

    {/* Fallback Route */}
    <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
  </Routes>
);

export default UnifiedAdminRoutes;
