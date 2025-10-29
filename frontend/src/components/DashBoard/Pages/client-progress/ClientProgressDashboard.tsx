import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Tabs, 
  Tab,
  CircularProgress
} from '@mui/material';

// Import the admin-client-progress view
import AdminClientProgressView from '../admin-client-progress/admin-client-progress-view.V2.tsx';

// Import the TrainerClientProgressView to reuse components
import ClientProgressView from '../../../TrainerDashboard/ClientProgress/ClientProgressView';

/**
 * ClientProgressDashboard Component
 * 
 * Admin-level dashboard for viewing client progress across the platform
 * Integrates with the existing admin client progress view or uses the trainer view
 * depending on selected tab view.
 */
/**
 * ClientProgressDashboard Component
 * 
 * Admin-level dashboard for viewing client progress across the platform
 * Integrates with the existing admin client progress view or uses the trainer view
 * depending on selected tab view. Both views share the same MCP hooks for data
 * consistency, and the enhanced view uses the same component structure as the trainer
 * view for a consistent user experience across roles.
 */
const ClientProgressDashboard: React.FC = () => {
  // Default to enhanced view to match the trainer view for consistency
  const [viewMode, setViewMode] = useState<'classic' | 'enhanced'>('enhanced');
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Client Progress Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage client progression through the SwanStudios fitness platform.
          This dashboard is synchronized with the trainer dashboard through MCP integration
          for consistent data and functionality across user roles.
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body1">
            Choose your preferred view mode (Enhanced view matches Trainer Dashboard):
          </Typography>
          
          <Box>
            <Button 
              variant={viewMode === 'classic' ? 'contained' : 'outlined'} 
              onClick={() => setViewMode('classic')}
              sx={{ mr: 1 }}
            >
              Classic View
            </Button>
            <Button 
              variant={viewMode === 'enhanced' ? 'contained' : 'outlined'} 
              onClick={() => setViewMode('enhanced')}
            >
              Enhanced View
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {viewMode === 'classic' ? (
        <AdminClientProgressView />
      ) : (
        <ClientProgressView />
      )}
    </Box>
  );
};

export default ClientProgressDashboard;