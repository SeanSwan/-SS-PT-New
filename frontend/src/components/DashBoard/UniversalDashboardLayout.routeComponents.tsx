import React, { Suspense } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { parseDashboardUserId } from './UniversalDashboardLayout.logic';
import {
  UniversalErrorContainer,
  UniversalLoadingContainer,
  UniversalLoadingSpinner,
  NutritionLoadingFallback,
} from './UniversalDashboardLayout.styles';
import { UniversalButton } from './UniversalDashboardLayout.controls';
import UniversalSchedule from '../Schedule/UniversalSchedule';
import ClientProgressLensFrame from './Pages/client-dashboard/ClientProgressLensFrame';
import { LensChartPaletteProvider } from '../Charts/lensChartPalette';

export { UniversalSchedule };

export const RevolutionaryAdminDashboard = React.lazy(() => import('./Pages/admin-dashboard/admin-dashboard-view'));
export const OwnerSupportInboxPage = React.lazy(() => import('./Pages/admin-support/OwnerSupportInboxPage'));
export const EnhancedAdminSessionsView = React.lazy(() => import('./Pages/admin-sessions/enhanced-admin-sessions-view'));
export const ModernUserManagementSystem = React.lazy(() => import('./Pages/user-management/modern-user-management'));
export const AdminClientProgressView = React.lazy(() => import('./Pages/admin-client-progress/admin-client-progress-view.V2'));
export const AdminPackagesView = React.lazy(() => import('./Pages/admin-packages/admin-packages-view'));
export const AdminCreateSpecialManager = React.lazy(() => import('./Pages/admin-specials/AdminCreateSpecialManager'));
export const AdminAccountAccessPage = React.lazy(() => import('./Pages/admin-account-access/AdminAccountAccessPage'));
export const LaunchControlPage = React.lazy(() => import('./Pages/admin-launch-control/LaunchControlPage'));
export const DesignPlaygroundLayout = React.lazy(() => import('../../pages/DesignPlayground/DesignPlaygroundLayout'));
export const TrainersManagementSection = React.lazy(() => import('./Pages/admin-dashboard/TrainersManagementSection'));
export const AdminGamificationView = React.lazy(() => import('./Pages/admin-gamification/admin-gamification-view'));
export const RevenueAnalyticsPanel = React.lazy(() => import('./Pages/admin-dashboard/components/RevenueAnalyticsPanel'));
export const AdminTrainerPayoutsPanel = React.lazy(() => import('./Pages/admin-payouts/AdminTrainerPayoutsPanel'));
export const PendingOrdersAdminPanel = React.lazy(() => import('./Pages/admin-dashboard/components/PendingOrdersAdminPanel'));
export const ClientOnboardingWizard = React.lazy(() => import('./Pages/admin-clients/components/ClientOnboardingWizard'));
export const ClientSelfOnboardingWizard = React.lazy(() => import('../../pages/onboarding/ClientOnboardingWizard'));
export const NutritionPlanBuilder = React.lazy(() => import('../Admin/NutritionPlanBuilder'));
export const NotesManager = React.lazy(() => import('../Admin/NotesManager'));
export const PhotoManager = React.lazy(() => import('../Admin/PhotoManager'));
export const AdminGalleryStudio = React.lazy(() => import('./Pages/admin-gallery/AdminGalleryStudio'));
export const AutomationManager = React.lazy(() => import('../Admin/AutomationManager'));
export const SMSLogsPanel = React.lazy(() => import('../Admin/SMSLogsPanel'));
export const EnhancedUserDataManagement = React.lazy(() => import('./Pages/admin-users/EnhancedUserDataManagement'));
export const EnhancedTrainerDataManagement = React.lazy(() => import('./Pages/admin-trainers/EnhancedTrainerDataManagement'));
export const UnifiedOnboardingWizard = React.lazy(() => import('./Pages/admin-onboarding/UnifiedOnboardingWizard'));
export const BodyMapPage = React.lazy(() => import('../BodyMap'));
export const ClientTrainerAssignments = React.lazy(() => import('../Admin/ClientTrainerAssignments'));
export const TrainerPermissionsManager = React.lazy(() => import('../Admin/TrainerPermissionsManager'));
export const SessionAllocationManager = React.lazy(() => import('../Admin/SessionAllocationManager'));
export const WorkoutLogger = React.lazy(() => import('../WorkoutLogger/WorkoutLogger'));
export const AdminPersonalWorkoutLogger = React.lazy(() => import('../WorkoutLogger/AdminPersonalWorkoutLogger'));
export const NASMProgressCharts = React.lazy(() => import('../ClientProgressCharts'));
export const TheAestheticCodex = React.lazy(() => import('../../core/TheAestheticCodex'));
// There is intentionally NO MyClientsView export here. The trainer client surface is
// TrainerClientsWorkspace -> <ClientsWorkspace audience="trainer" /> (see
// UniversalDashboardLayout.routes.tsx, trainer '/clients'). The legacy
// TrainerDashboard/ClientManagement tree that this once pointed at was deleted 2026-08-23; its
// card-parity law now guards the shared ClientHubGridCard instead (clientCardSystem.contract.test.ts).
// Audit: DASHBOARD-CONVERGENCE-AUDIT-RECORD-2026-08-22.md (F1/F3).
export const EnhancedWorkoutLogger = React.lazy(() => import('../TrainerDashboard/WorkoutLogging'));
export const EnhancedClientProgressView = React.lazy(() =>
  import('../TrainerDashboard/ClientProgress').then((module) => ({
    default: module.EnhancedClientProgressView,
  }))
);
export const AiConsentScreen = React.lazy(() => import('./Pages/client-dashboard/AiConsentScreen'));
export const MessagingPageLazy = React.lazy(() => import('../../pages/MessagingPage'));
export const NutritionWorkspaceLazy = React.lazy(() => import('./workspaces/NutritionWorkspace'));
export const CanadaImmigrationTab = React.lazy(() => import('./Pages/canada-immigration/CanadaImmigrationTab'));
export const ChallengeCommandWorkspace = React.lazy(() => import('./Pages/challenges/ChallengeCommandWorkspace'));
export const ContentStudioHub = React.lazy(() => import('./Pages/content-studio/ContentStudioHub'));
export const FeatureAccessPage = React.lazy(() => import('./Pages/admin-feature-access/FeatureAccessPage'));
export const WorkoutPlannerPage = React.lazy(() => import('./Pages/admin-workout-planner/WorkoutPlannerPage'));
export const WorkoutDesignLabPage = React.lazy(() => import('./Pages/workout-design-lab/WorkoutDesignLabPage'));
export const LiveStreamingPage = React.lazy(() => import('../Social/LiveStreaming/LiveStreamingView'));
export const CreatorEconomyPage = React.lazy(() => import('../Social/CreatorEconomy/CreatorEconomyView'));
export const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'));
export const AdminWaiversManagerPage = React.lazy(() => import('./Pages/admin-waivers/AdminWaiversManager'));
export const AdminViewAsWrapper = React.lazy(() => import('./Pages/admin-clients/components/AdminViewAsWrapper'));
export const ClientMyWorkoutsPage = React.lazy(() => import('./Pages/client-dashboard/ClientMyWorkoutsPage'));
export const ClientHomeTab = React.lazy(() => import('./Pages/client-dashboard/ClientHomeTab'));
export const ClientChallengesPage = React.lazy(() => import('./Pages/client-dashboard/ClientChallengesPage'));
export const ClientProfilePage = React.lazy(() => import('./Pages/client-dashboard/ClientProfilePage'));
export const ClientRewardsPage = React.lazy(() => import('./Pages/client-dashboard/ClientRewardsPage'));
export const ClientCommunityPage = React.lazy(() => import('./Pages/client-dashboard/ClientCommunityPage'));
export const TrainerHomeTab = React.lazy(() => import('./Pages/trainer-dashboard/TrainerHomeTab'));
export const TrainerEarningsPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerEarningsPage'));
export const TrainerAssessmentsPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerAssessmentsPage'));
export const TrainerVideosPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerVideosPage'));
export const VideoLibraryPage = React.lazy(() => import('../../pages/VideoLibraryV3'));
export const EquipmentManagerPage = React.lazy(() => import('../EquipmentManager/EquipmentManagerPage'));
export const MyEquipmentPage = React.lazy(() => import('../MyEquipment/MyEquipmentPage'));
export const BootcampBuilderPage = React.lazy(() => import('../BootcampBuilder/BootcampBuilderPage'));
export const SprintPlannerPage = React.lazy(() => import('../SprintPlanner/SprintPlannerPage'));
export const VideoCallPage = React.lazy(() => import('../VideoChat/VideoCallPage'));
export const AvatarHomePage = React.lazy(() => import('../AvatarHome/AvatarHomePage'));
export const VirtualOlympicsPage = React.lazy(() => import('../VirtualOlympics/VirtualOlympicsPage'));
export const BadgeCreatorPage = React.lazy(() => import('../BadgeCreator/BadgeCreatorPage'));
export const MarketingWorkspace = React.lazy(() => import('./workspaces/MarketingWorkspace'));
export const SecurityWorkspace = React.lazy(() => import('./workspaces/SecurityWorkspace'));
export const PlaudIntelligenceWorkspacePage = React.lazy(() => import('../../pages/dashboard/PlaudIntelligenceWorkspacePage'));
export const ClientsWorkspace = React.lazy(() => import('./workspaces/ClientsWorkspace'));
export const TrainerClientsWorkspace = React.lazy(() => import('./workspaces/TrainerClientsWorkspace'));
export const ClientProgressDashboardPage = React.lazy(() => import('./Pages/client-dashboard/ClientProgressDashboardPage'));

export const ClientProgressWrapper: React.FC = () => {
  const { user } = useAuth();
  const { hasGuardianAccess, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const clientId = parseDashboardUserId(user?.id);
  const userRole = user?.role;
  const isStaffRole = userRole === 'admin' || userRole === 'trainer';
  const hasDetailedProgressAccess = isStaffRole || hasGuardianAccess;

  if (!clientId) {
    return (
      <UniversalErrorContainer role="status">
        <h2>Progress identity unavailable</h2>
        <p>Reload the dashboard once your account identity finishes loading.</p>
      </UniversalErrorContainer>
    );
  }

  if (subscriptionLoading && !isStaffRole) {
    return (
      <UniversalLoadingContainer role="status">
        <UniversalLoadingSpinner />
        <h2>Checking analytics access...</h2>
      </UniversalLoadingContainer>
    );
  }

  if (!hasDetailedProgressAccess) {
    return (
      <UniversalErrorContainer role="status">
        <h2>Guardian analytics required</h2>
        <p>Detailed progress analytics are available with Swan Guardian, Crystalline Swan, or an active premium trial.</p>
        <UniversalButton
          type="button"
          onClick={() => navigate('/ascension')}
        >
          View Memberships
        </UniversalButton>
      </UniversalErrorContainer>
    );
  }

  // Lens frame + palette provider: same fail-closed bridge the canonical
  // /progress grid wears — zero visual delta until a v2 recipe is worn.
  return (
    <ClientProgressLensFrame>
      <LensChartPaletteProvider>
        <NASMProgressCharts clientId={clientId} />
      </LensChartPaletteProvider>
    </ClientProgressLensFrame>
  );
};

const ADMIN_PLAUD_COMMAND_CENTER_PATH = '/dashboard/admin/coach-assistant?workspace=plaud';

export const AdminPlaudCommandCenterRedirect: React.FC = () => {
  const location = useLocation();
  if (!location.search) {
    return <Navigate to={ADMIN_PLAUD_COMMAND_CENTER_PATH} replace />;
  }
  const params = new URLSearchParams(location.search);
  params.set('workspace', 'plaud');
  return <Navigate to={`/dashboard/admin/coach-assistant?${params.toString()}`} replace />;
};

export const ClientSelfOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const goToOverview = () => navigate('/dashboard/client/overview');
  const handleComplete = async () => {
    await refreshUser();
    goToOverview();
  };
  return <ClientSelfOnboardingWizard selfSubmit onComplete={handleComplete} onCancel={goToOverview} />;
};

export const AdminClientDetailsRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/dashboard/admin/client-management${location.search}`} replace />;
};

// Workout-OS C7 (2026-07-29): the Build Plan / Workout Forge surface was a
// proven strict subset of the canonical Workout Planner, so every legacy URL
// now redirects into the planner. `location.search` is forwarded whole because
// the planner honors clientId and returnTo (extra params are ignored safely).
export const TrainerBuildPlanToPlannerRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/dashboard/trainer/workout-planner${location.search}`} replace />;
};

export const AdminBuildPlanToPlannerRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/dashboard/admin/workout-planner${location.search}`} replace />;
};

export const AdminLogWorkoutRedirect: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('tab', 'training');
  params.set('trainingSection', 'logger');
  return <Navigate to={`/dashboard/admin/client-management?${params.toString()}`} replace />;
};

export const AdminWorkoutPlansRedirect: React.FC = () => {
  const { clientId } = useParams<{ clientId?: string }>();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryClientId = params.get('clientId')?.trim();
  const safeClientId = [clientId, queryClientId].find((value) => value && /^[1-9]\d*$/.test(value));

  if (!safeClientId) {
    return <Navigate to="/dashboard/admin/client-management?intent=plan_next" replace />;
  }

  params.set('clientId', safeClientId);
  params.set('source', 'legacy-admin-workouts');
  params.set('returnTo', `/dashboard/admin/client-management?clientId=${safeClientId}`);
  return <Navigate to={`/dashboard/admin/workout-planner?${params.toString()}`} replace />;
};

export const ClientMealPlannerRoute: React.FC = () => (
  <Suspense fallback={<NutritionLoadingFallback>Loading nutrition...</NutritionLoadingFallback>}>
    <NutritionWorkspaceLazy />
  </Suspense>
);
