import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ConstructionIcon from '@mui/icons-material/Construction';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import WifiOffIcon from '@mui/icons-material/WifiOff';

import { enableMockDataMode, isMockDataModeEnabled } from '../../utils/apiConnectivityFixer';
import api from '../../services/api';

// Endpoints to check
const ENDPOINTS = [
  { name: 'Notifications', url: '/notifications', key: 'notifications' },
  { name: 'Sessions', url: '/sessions', key: 'sessions' },
  { name: 'User Profile', url: '/users/profile', key: 'profile' },
  { name: 'Workouts', url: '/workout/plans', key: 'workouts' }
];

const ApiDebugger = () => {
  const [endpointStatus, setEndpointStatus] = useState(
    ENDPOINTS.map(endpoint => ({
      ...endpoint,
      status: 'unchecked',
      error: null,
      data: null
    }))
  );
  const [checking, setChecking] = useState(false);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [mockEnabled, setMockEnabled] = useState(isMockDataModeEnabled());
  const [showDetails, setShowDetails] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    checked: false,
    successful: 0,
    failed: 0
  });

  // Check the status of the mock data
  useEffect(() => {
    setMockEnabled(isMockDataModeEnabled());
    
    // Check every 2 seconds
    const interval = setInterval(() => {
      setMockEnabled(isMockDataModeEnabled());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Check API connection health
  const checkApiConnection = async () => {
    setChecking(true);
    setBackendStatus('checking');
    
    try {
      // Attempt to request a small endpoint
      await fetch('/api/health', { method: 'GET', timeout: 5000 });
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus('offline');
    }
    
    setChecking(false);
  };

  // Check all endpoints
  const checkAllEndpoints = async () => {
    setChecking(true);
    
    // Copy the current state
    const newStatus = [...endpointStatus];
    
    // Reset connection stats
    const stats = {
      checked: true,
      successful: 0,
      failed: 0
    };
    
    // Check each endpoint
    for (let i = 0; i < ENDPOINTS.length; i++) {
      const endpoint = ENDPOINTS[i];
      newStatus[i] = {
        ...endpoint,
        status: 'checking',
        error: null,
        data: null
      };
      
      setEndpointStatus([...newStatus]);
      
      try {
        // Try to fetch the data
        const data = await api.get(endpoint.url);
        
        // Update the status
        newStatus[i] = {
          ...endpoint,
          status: 'online',
          error: null,
          data
        };
        
        stats.successful++;
      } catch (error) {
        // Update status with error
        newStatus[i] = {
          ...endpoint,
          status: 'error',
          error: error.message || 'Unknown error',
          data: null
        };
        
        stats.failed++;
      }
      
      setEndpointStatus([...newStatus]);
    }
    
    setConnectionStats(stats);
    setChecking(false);
  };

  // Enable mock data mode
  const enableMockMode = () => {
    enableMockDataMode();
    setMockEnabled(true);
  };

  // Reload the application
  const reloadApp = () => {
    window.location.reload();
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorOutlineIcon sx={{ color: 'error.main' }} />;
      case 'checking':
        return <AutorenewIcon sx={{ color: 'info.main' }} className="spinning" />;
      default:
        return <WifiOffIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ConstructionIcon sx={{ mr: 1, color: 'warning.main' }} />
        <Typography variant="h6" component="h2">
          API Connectivity Debugger
        </Typography>
      </Box>

      {/* Connection status */}
      <Box sx={{ mb: 2 }}>
        <Alert 
          severity={mockEnabled ? "warning" : "info"} 
          variant="outlined"
          sx={{ mb: 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              {mockEnabled 
                ? "Mock data mode is ENABLED. You are using simulated data." 
                : "Mock data mode is disabled. You are using real backend data."}
            </Typography>
            
            {!mockEnabled && (
              <Button 
                size="small" 
                variant="outlined" 
                color="warning"
                onClick={enableMockMode}
                sx={{ ml: 2 }}
              >
                Enable Mock Data
              </Button>
            )}
          </Box>
        </Alert>
        
        {connectionStats.checked && (
          <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Connection Test Results:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label={`${connectionStats.successful} Successful`} 
                color="success" 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={`${connectionStats.failed} Failed`} 
                color="error" 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          size="small"
          disabled={checking}
          onClick={checkAllEndpoints}
          startIcon={checking ? <CircularProgress size={16} /> : null}
        >
          {checking ? 'Checking...' : 'Check Endpoints'}
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          color="secondary"
          onClick={reloadApp}
        >
          Reload App
        </Button>
      </Box>

      {/* Endpoint details */}
      <Collapse in={showDetails}>
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom>
          Endpoint Status:
        </Typography>
        
        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {endpointStatus.map((endpoint, index) => (
            <ListItem key={endpoint.key} divider={index < endpointStatus.length - 1}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStatusIcon(endpoint.status)}
              </ListItemIcon>
              <ListItemText
                primary={endpoint.name}
                secondary={
                  endpoint.status === 'error' 
                    ? `Error: ${endpoint.error}` 
                    : `${endpoint.url}`
                }
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <Chip
                label={
                  endpoint.status === 'online' ? 'Available' :
                  endpoint.status === 'error' ? 'Failed' :
                  endpoint.status === 'checking' ? 'Checking...' :
                  'Unchecked'
                }
                size="small"
                color={
                  endpoint.status === 'online' ? 'success' :
                  endpoint.status === 'error' ? 'error' :
                  endpoint.status === 'checking' ? 'info' :
                  'default'
                }
                variant="outlined"
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  );
};

export default ApiDebugger;