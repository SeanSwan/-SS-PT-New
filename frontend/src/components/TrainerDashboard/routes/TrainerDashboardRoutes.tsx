import React, { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

// Import trainer dashboard components
import ClientProgressView from '../ClientProgress/ClientProgressView';

/**
 * Trainer Dashboard Home Component
 * Central dashboard view for trainers showing key metrics and navigation
 */
const TrainerDashboardHome = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Trainer Dashboard</Typography>
    <Typography variant="body1" paragraph>
      Welcome to the trainer dashboard. Manage your clients, workouts, and more from here.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3,
      mb: 4
    }}>
      <Typography variant="h6" gutterBottom>Quick Navigation</Typography>
      <Typography variant="body2">
        Use the navigation menu to access client progress tracking, workout program management,
        session scheduling, and more. All client data is synchronized with the MCP server for
        real-time updates and sharing with the admin dashboard.
      </Typography>
    </Box>
  </Box>
);

/**
 * Workout Programs View Component
 * Manage and create workout programs for clients
 */
const WorkoutsView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Workout Programs</Typography>
    <Typography variant="body1" paragraph>
      Create and manage workout programs for your clients.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Features</Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="body2">Create new workout programs</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="body2">Assign programs to clients</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="body2">Track program completion</Typography>
        </Box>
        <Box component="li" sx={{ mb: 1 }}>
          <Typography variant="body2">Analyze program effectiveness</Typography>
        </Box>
      </Box>
    </Box>
  </Box>
);

/**
 * Training Sessions View Component
 * Schedule and manage client training sessions
 */
const SessionsView = () => (
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
      <Typography variant="h6" gutterBottom>Calendar Integration</Typography>
      <Typography variant="body2">
        This section will display a calendar view of all scheduled sessions with clients.
        You can add, edit, or cancel sessions directly from the calendar interface.
        Sessions are synchronized with the MCP server for client visibility.
      </Typography>
    </Box>
  </Box>
);

/**
 * Training Packages View Component
 * Manage training packages and offerings
 */
const PackagesView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Training Packages</Typography>
    <Typography variant="body1" paragraph>
      Manage training packages for clients.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Package Management</Typography>
      <Typography variant="body2">
        This section will allow you to create and manage different training package offerings.
        Track client purchases, session usage, and package expirations.
        All package data is synced with the admin dashboard via MCP integration.
      </Typography>
    </Box>
  </Box>
);

/**
 * Gamification View Component
 * Manage gamification features for clients
 */
const GamificationView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Gamification</Typography>
    <Typography variant="body1" paragraph>
      Manage gamification features for your clients.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Gamification Tools</Typography>
      <Typography variant="body2">
        Create challenges, achievements, and reward systems to increase client engagement.
        Set up custom badges, milestones, and leaderboards.
        All gamification data is synchronized with the admin dashboard through MCP integration.
      </Typography>
    </Box>
  </Box>
);

/**
 * Community View Component
 * Manage community features and interactions
 */
const CommunityView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Community</Typography>
    <Typography variant="body1" paragraph>
      Manage community features and interactions.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Community Management</Typography>
      <Typography variant="body2">
        Create and manage discussion groups, challenges, and events for your clients.
        Monitor community engagement and foster a supportive environment.
        All community data syncs with the admin dashboard for comprehensive oversight.
      </Typography>
    </Box>
  </Box>
);

/**
 * Clients View Component
 * Manage client list and details
 */
const ClientsView = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom>Client Management</Typography>
    <Typography variant="body1" paragraph>
      View and manage your client list.
    </Typography>
    
    <Box sx={{ 
      p: 3, 
      bgcolor: 'rgba(0, 255, 255, 0.05)',
      borderRadius: 2,
      mt: 3
    }}>
      <Typography variant="h6" gutterBottom>Client Database</Typography>
      <Typography variant="body2">
        Access detailed client profiles, manage client information, and track client status.
        Add new clients, update client details, and manage client permissions.
        All client data is securely stored and synchronized with the admin dashboard via MCP integration.
      </Typography>
    </Box>
  </Box>
);

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
 * Uses the same route structure as AdminDashboardRoutes for consistency
 * Integrates with MCP services for synchronized data across user roles
 */
const TrainerDashboardRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/trainer/dashboard" replace />} />
        <Route path="/dashboard" element={<TrainerDashboardHome />} />
        <Route path="/client-progress" element={<ClientProgressView />} />
        <Route path="/workouts" element={<WorkoutsView />} />
        <Route path="/sessions" element={<SessionsView />} />
        <Route path="/packages" element={<PackagesView />} />
        <Route path="/gamification" element={<GamificationView />} />
        <Route path="/community" element={<CommunityView />} />
        <Route path="/clients" element={<ClientsView />} />
        <Route path="*" element={<Navigate to="/trainer/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default TrainerDashboardRoutes;