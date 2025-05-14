/**
 * internal-routes.tsx
 * Internal routing configuration for AdminDashboardLayout
 * Creates pre-loaded components for routes to avoid dynamic import issues
 */
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

// Directly import views to avoid dynamic import errors
import MainDashboard from './Pages/admin-dashboard/admin-dashboard-view';
import AdminClientProgressView from './Pages/admin-client-progress/admin-client-progress-view';
import AdminClientManagementView from './Pages/admin-clients/AdminClientManagementView';
import ClientProgressDashboard from './Pages/client-progress/ClientProgressDashboard';
import EnhancedAdminSessionsView from './Pages/admin-sessions/enhanced-admin-sessions-view';
import AdminPackagesView from './Pages/admin-packages/admin-packages-view';
import ModernUserManagementSystem from './Pages/user-management/modern-user-management';
import ClientDashboardView from './Pages/client-dashboard/client-dashboard-view';
import OrientationDashboardView from './Pages/admin-dashboard/orientation-dashboard-view';
import AdminDebugPage from './Pages/admin-dashboard/AdminDebugPage';
import CommunityDashboard from './Pages/community/community-dashboard';
import AdminOrientation from './Pages/admin-orientation/AdminOrientation';

// Import the new AdminWorkoutManagement component
import AdminWorkoutManagement from '../WorkoutManagement/AdminWorkoutManagement';

// For components that might have issues, we create wrapped versions
// with error handling to prevent the entire dashboard from crashing
const withErrorBoundary = (Component: React.ComponentType, componentName: string) => {
  return (props: any) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error(`Error loading ${componentName}:`, error);
      return (
        <div style={{
          padding: '2rem',
          background: 'rgba(255, 65, 108, 0.1)',
          borderRadius: '8px',
          textAlign: 'center',
          margin: '1rem'
        }}>
          <h3>Error Loading {componentName}</h3>
          <p>There was a problem loading this component. Please try refreshing.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              marginTop: '1rem',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
  };
};

// Use the new AdminWorkoutManagement component
// This replaces the placeholder with full MCP integration
const WorkoutProgramsView = withErrorBoundary(AdminWorkoutManagement, 'Workout Management');

// Create wrapped versions of potentially problematic components using proper React patterns
const AdminGamificationView = React.lazy(() => 
  import('./Pages/admin-gamification/admin-gamification-view')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Gamification component:', error);
      return {
        default: () => (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Gamification Dashboard</h2>
            <p>This feature is currently unavailable. Our team is working on it.</p>
          </div>
        )
      };
    })
);

// Wrap the lazy-loaded component with Suspense - properly defined as a component
const GamificationComponent = (props) => (
  <React.Suspense fallback={<div>Loading Gamification Dashboard...</div>}>
    {withErrorBoundary(AdminGamificationView, 'Gamification Dashboard')(props)}
  </React.Suspense>
);

/**
 * AdminDashboardRoutes Component
 * Central routing configuration for all admin dashboard views
 * 
 * Provides consistent routes that align with TrainerDashboardRoutes for
 * seamless integration and synchronized functionality across user roles.
 * Uses the same MCP hooks for data retrieval to ensure data consistency.
 */
const AdminDashboardRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/default" replace />} />
      <Route path="/default" element={<MainDashboard />} />
      <Route path="/client-progress" element={<ClientProgressDashboard />} />
      <Route path="/clients" element={<AdminClientManagementView />} />
      <Route path="/workouts" element={<WorkoutProgramsView />} />
      <Route path="/admin-sessions" element={<EnhancedAdminSessionsView />} />
      <Route path="/admin-packages" element={<AdminPackagesView />} />
      <Route path="/gamification" element={<GamificationComponent />} />
      <Route path="/user-management" element={<ModernUserManagementSystem />} />
      <Route path="/client-dashboard" element={<ClientDashboardView />} />
      <Route path="/client-orientation" element={<AdminOrientation />} />
      <Route path="/community" element={<CommunityDashboard />} />
      <Route path="/admin/debug" element={<AdminDebugPage />} />
      <Route path="*" element={<Navigate to="/dashboard/default" replace />} />
    </Routes>
  );
};

export default AdminDashboardRoutes;