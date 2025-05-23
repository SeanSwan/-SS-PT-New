import React, { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// Import trainer dashboard components
import ClientProgressView from '../ClientProgress/ClientProgressView';
import TrainerDashboard from '../TrainerDashboard';
// Import the trainer workout management component
import TrainerWorkoutManagement from '../WorkoutManagement/TrainerWorkoutManagement';
// Import the content & form check component
import ContentFormCheck from '../ContentFormCheck';
// Import the trainer schedule component
import TrainerScheduleTab from '../../DashBoard/Pages/trainer-dashboard/schedule';

/**
 * Trainer Dashboard Home Component
 * Central dashboard view for trainers showing key metrics and navigation
 */
const TrainerDashboardHome = () => <TrainerDashboard />;

/**
 * My Clients View Component
 * View and manage assigned clients
 */
const MyClientsView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>My Clients</Typography>
    <Typography variant="body1" paragraph>
      View and manage your assigned clients.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Client Dashboard</Typography>
      <Typography variant="body2">
        Access detailed profiles of your assigned clients. View their progress,
        workout history, and current training programs. Add notes and track their
        fitness journey. All client data is securely synchronized with the MCP server.
      </Typography>
    </Box>
  </Box>
);

/**
 * Schedule View Component
 * View and manage trainer calendar and schedule
 */
const ScheduleView = () => <TrainerScheduleTab />;

/**
 * Workout Plans View Component with MCP Integration
 * Create and manage workout plans for clients
 */
const WorkoutPlansView = () => <TrainerWorkoutManagement />;

/**
 * Training Sessions View Component
 * Schedule and manage client training sessions
 */
const TrainingSessionsView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Training Sessions</Typography>
    <Typography variant="body1" paragraph>
      Schedule and manage your training sessions with clients.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Session Calendar</Typography>
      <Typography variant="body2">
        View your training schedule in calendar format. Book new sessions with clients,
        reschedule existing appointments, and track session completion.
        Sessions are synchronized with the MCP server for client visibility.
      </Typography>
    </Box>
  </Box>
);

/**
 * Messages View Component
 * Manage client communications
 */
const MessagesView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Messages</Typography>
    <Typography variant="body1" paragraph>
      Communicate with your clients and manage conversations.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Client Communications</Typography>
      <Typography variant="body2">
        Send messages to your clients, share workout feedback, provide motivation,
        and answer questions. All messages are stored securely and synchronized
        across the platform for seamless communication.
      </Typography>
    </Box>
  </Box>
);

/**
 * Content & Form Checks View Component
 * Manage training content and review client form check videos
 */
const ContentFormChecksView = () => <ContentFormCheck />;

// Loading fallback component
const LoadingFallback = () => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh' 
  }}>
    <CircularProgress />
    <Typography variant="body1" sx={{ ml: 2 }}>
      Loading...
    </Typography>
  </Box>
);

/**
 * TrainerDashboardRoutes Component
 * 
 * Provides routing configuration for the trainer dashboard
 * Ensures that routes match the NavItems in TrainerDashboardLayout
 * Focused on trainer-specific functionality without admin features
 * Integrates with MCP services for synchronized data across user roles
 */
const TrainerDashboardRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<TrainerDashboardHome />} />
        <Route path="/dashboard" element={<TrainerDashboardHome />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/clients" element={<MyClientsView />} />
        <Route path="/workouts" element={<WorkoutPlansView />} />
        <Route path="/sessions" element={<TrainingSessionsView />} />
        <Route path="/client-progress" element={<ClientProgressView />} />
        <Route path="/messages" element={<MessagesView />} />
        <Route path="/content" element={<ContentFormChecksView />} />
        <Route path="*" element={<Navigate to="/trainer-dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default TrainerDashboardRoutes;