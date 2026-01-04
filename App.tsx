import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Assuming a layout component that provides the sidebar and overall structure
import UnifiedAdminDashboardLayout from './components/Layout/UnifiedAdminDashboardLayout'; 

// Lazy load the new page components for better performance
const WorkoutEntryPage = lazy(() => import('./pages/admin/WorkoutEntryPage'));
const MeasurementEntryPage = lazy(() => import('./pages/admin/MeasurementEntryPage'));
const ClientDashboardPage = lazy(() => import('./pages/client/ClientDashboardPage'));

// Lazy load existing admin dashboard view and other top-level pages
const RevolutionaryAdminDashboard = lazy(() => import('./components/DashBoard/Pages/admin-dashboard/admin-dashboard-view'));
const LoginPage = () => <div>Login Page</div>;
// const ClientDashboard = () => <div>Client Dashboard</div>; // Replaced

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading Page...</div>}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          {/* Example Client Dashboard Route */}
          <Route path="/dashboard/client" element={<ClientDashboardPage />} />

          {/* Admin Dashboard Routes with a shared layout */}
          <Route path="/dashboard/admin" element={<UnifiedAdminDashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<RevolutionaryAdminDashboard />} />
            
            {/* NEW ROUTES FOR WORKOUT & MEASUREMENT ENTRY */}
            <Route path="workout-entry" element={<WorkoutEntryPage />} />
            <Route path="measurement-entry" element={<MeasurementEntryPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;