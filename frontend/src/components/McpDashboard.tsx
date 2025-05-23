/**
 * MCP Dashboard Component
 * 
 * A complete dashboard for managing MCP server integration
 * with all MCP-related functionality in one place.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useClientDashboardMcp from '../hooks/useClientDashboardMcp';
import McpStatusIndicator from './ui/McpStatusIndicator';
import McpMonitor from './ui/McpMonitor';
import McpIntegrationWrapper from './ui/McpIntegrationWrapper';
import GamificationDisplay from './Gamification/GamificationDisplay';
import { checkMcpServersStatus } from '../utils/mcp-utils';
import { getMcpAuthHeaders, setMcpAuthToken } from '../utils/mcp-auth';

// Material UI components
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Tabs,
  Tab,
  FormHelperText,
  Alert,
  Snackbar
} from '@mui/material';

// Icons
import { 
  Server, 
  Settings,
  Play,
  PauseCircle,
  RefreshCw,
  UserCheck,
  Shield,
  Key,
  SaveIcon
} from 'lucide-react';

/**
 * Admin dashboard for managing MCP server integration
 */
const McpDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    mcpStatus,
    loading,
    error,
    workoutData,
    gamificationData,
    refreshData
  } = useClientDashboardMcp();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // MCP Settings
  const [workoutMcpUrl, setWorkoutMcpUrl] = useState<string>(
    process.env.REACT_APP_WORKOUT_MCP_URL || 'http://localhost:8000'
  );
  const [gamificationMcpUrl, setGamificationMcpUrl] = useState<string>(
    process.env.REACT_APP_GAMIFICATION_MCP_URL || 'http://localhost:8001'
  );
  const [apiToken, setApiToken] = useState<string>(localStorage.getItem('auth_token') || '');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(true);
  
  // Server control
  const [serverStarting, setServerStarting] = useState<boolean>(false);
  const [serverStopping, setServerStopping] = useState<boolean>(false);
  
  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Check MCP status on mount
  useEffect(() => {
    checkMcpStatus();
  }, []);
  
  // Check MCP server status
  const checkMcpStatus = async () => {
    try {
      const status = await checkMcpServersStatus();
      console.log('MCP Status:', status);
    } catch (error) {
      console.error('Error checking MCP status:', error);
    }
  };
  
  // Save MCP settings
  const saveSettings = () => {
    // Save to local storage
    localStorage.setItem('workout_mcp_url', workoutMcpUrl);
    localStorage.setItem('gamification_mcp_url', gamificationMcpUrl);
    
    // Set auth token
    if (apiToken) {
      setMcpAuthToken(apiToken);
    }
    
    // Show notification
    setNotification({
      open: true,
      message: 'MCP settings saved successfully!',
      severity: 'success'
    });
    
    // Refresh data
    refreshData(true);
  };
  
  // Simulate starting MCP servers
  const startServers = () => {
    setServerStarting(true);
    
    // Simulate server startup delay
    setTimeout(() => {
      setServerStarting(false);
      
      // Show notification
      setNotification({
        open: true,
        message: 'MCP servers started successfully!',
        severity: 'success'
      });
      
      // Refresh data
      refreshData(true);
    }, 2000);
  };
  
  // Simulate stopping MCP servers
  const stopServers = () => {
    setServerStopping(true);
    
    // Simulate server stop delay
    setTimeout(() => {
      setServerStopping(false);
      
      // Show notification
      setNotification({
        open: true,
        message: 'MCP servers stopped!',
        severity: 'info'
      });
      
      // Refresh data
      refreshData(true);
    }, 2000);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Status
        return (
          <Box mt={2}>
            <McpMonitor
              variant="full"
              autoRefresh={autoRefresh}
              refreshInterval={30000}
              onStatusChange={(status) => {
                console.log('MCP Status changed:', status);
              }}
            />
          </Box>
        );
        
      case 1: // Settings
        return (
          <Box mt={2}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                MCP Server Configuration
              </Typography>
              
              <Grid container spacing={3}>
                {/* Workout MCP URL */}
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Workout MCP Server URL"
                    value={workoutMcpUrl}
                    onChange={(e) => setWorkoutMcpUrl(e.target.value)}
                    fullWidth
                    variant="outlined"
                    helperText="URL for the AI Workout MCP server"
                  />
                </Grid>
                
                {/* Gamification MCP URL */}
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Gamification MCP Server URL"
                    value={gamificationMcpUrl}
                    onChange={(e) => setGamificationMcpUrl(e.target.value)}
                    fullWidth
                    variant="outlined"
                    helperText="URL for the Gamification MCP server"
                  />
                </Grid>
                
                {/* API Token */}
                <Grid item xs={12}>
                  <TextField
                    label="API Authentication Token"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    fullWidth
                    variant="outlined"
                    type="password"
                    helperText="Authentication token for MCP server requests"
                  />
                </Grid>
                
                {/* Auto Refresh Toggle */}
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Auto-Refresh"
                  />
                  <FormHelperText>
                    Automatically refresh MCP data at regular intervals
                  </FormHelperText>
                </Grid>
                
                {/* Fallback Toggle */}
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={fallbackEnabled}
                        onChange={(e) => setFallbackEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Fallback Mode"
                  />
                  <FormHelperText>
                    Use mock data when MCP servers are offline
                  </FormHelperText>
                </Grid>
                
                {/* Save Settings Button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon size={16} />}
                    onClick={saveSettings}
                    fullWidth
                  >
                    Save MCP Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
            
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Server Control
              </Typography>
              
              <Box display="flex" gap={2} mt={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Play size={16} />}
                  onClick={startServers}
                  disabled={serverStarting || (mcpStatus.workout && mcpStatus.gamification)}
                  sx={{ flex: 1 }}
                >
                  {serverStarting ? 'Starting Servers...' : 'Start MCP Servers'}
                </Button>
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PauseCircle size={16} />}
                  onClick={stopServers}
                  disabled={serverStopping || (!mcpStatus.workout && !mcpStatus.gamification)}
                  sx={{ flex: 1 }}
                >
                  {serverStopping ? 'Stopping Servers...' : 'Stop MCP Servers'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={16} />}
                  onClick={() => refreshData(true)}
                  sx={{ flex: 1 }}
                >
                  Refresh Data
                </Button>
              </Box>
              
              <Alert severity="info" sx={{ mt: 3 }}>
                Note: Server control is simulated in this dashboard. In a production environment,
                you would implement actual server management functionality.
              </Alert>
            </Paper>
          </Box>
        );
        
      case 2: // Security
        return (
          <Box mt={2}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                MCP Security Settings
              </Typography>
              
              <Grid container spacing={3}>
                {/* Authentication */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Authentication" 
                      avatar={<UserCheck size={20} />}
                    />
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            label="Current API Token"
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            fullWidth
                            variant="outlined"
                            type="password"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                              // Generate a mock token
                              const newToken = `mcp_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
                              setApiToken(newToken);
                            }}
                          >
                            Generate New Token
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Access Control */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Access Control" 
                      avatar={<Shield size={20} />}
                    />
                    <Divider />
                    <CardContent>
                      <Typography variant="body2" paragraph>
                        Configure which users and roles can access the MCP servers.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={true}
                                color="primary"
                              />
                            }
                            label="Admin Access"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={true}
                                color="primary"
                              />
                            }
                            label="Trainer Access"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={true}
                                color="primary"
                              />
                            }
                            label="Client Access"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={false}
                                color="primary"
                              />
                            }
                            label="Guest Access"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Encryption */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader 
                      title="Data Encryption" 
                      avatar={<Key size={20} />}
                    />
                    <Divider />
                    <CardContent>
                      <Typography variant="body2" paragraph>
                        Configure encryption settings for data sent to and from MCP servers.
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={true}
                                color="primary"
                              />
                            }
                            label="SSL/TLS Encryption"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={true}
                                color="primary"
                              />
                            }
                            label="Encrypt Request Data"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Save Button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon size={16} />}
                    onClick={() => {
                      // Save security settings
                      setNotification({
                        open: true,
                        message: 'Security settings saved successfully!',
                        severity: 'success'
                      });
                    }}
                    fullWidth
                  >
                    Save Security Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
        
      case 3: // Gamification
        return (
          <Box mt={2}>
            <McpIntegrationWrapper
              loading={loading}
              mcpStatus={mcpStatus}
              error={error}
              requireFullFunctionality={false}
              loadingMessage="Loading gamification data..."
              onRetry={() => refreshData(true)}
            >
              <GamificationDisplay
                variant="full"
                onDataLoaded={(data) => {
                  console.log('Gamification data loaded:', data);
                }}
              />
            </McpIntegrationWrapper>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          <Server size={28} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
          MCP Server Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and monitor Model Context Protocol (MCP) servers for
          AI-powered workout recommendations and gamification.
        </Typography>
      </Box>
      
      {/* Status indicators */}
      <Box mb={3} display="flex" gap={2}>
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: mcpStatus.workout ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            border: '1px solid',
            borderColor: mcpStatus.workout ? 'rgba(0, 200, 83, 0.3)' : 'rgba(244, 67, 54, 0.3)'
          }}
        >
          <Typography variant="body2">
            Workout MCP: <strong>{mcpStatus.workout ? 'Online' : 'Offline'}</strong>
          </Typography>
        </Paper>
        
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: mcpStatus.gamification ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            border: '1px solid',
            borderColor: mcpStatus.gamification ? 'rgba(0, 200, 83, 0.3)' : 'rgba(244, 67, 54, 0.3)'
          }}
        >
          <Typography variant="body2">
            Gamification MCP: <strong>{mcpStatus.gamification ? 'Online' : 'Offline'}</strong>
          </Typography>
        </Paper>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshCw size={16} />}
          onClick={() => refreshData(true)}
          sx={{ ml: 'auto' }}
        >
          Refresh Status
        </Button>
      </Box>
      
      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="Status"
            icon={<Server size={16} />}
            iconPosition="start"
          />
          <Tab
            label="Settings"
            icon={<Settings size={16} />}
            iconPosition="start"
          />
          <Tab
            label="Security"
            icon={<Shield size={16} />}
            iconPosition="start"
          />
          <Tab
            label="Gamification"
            icon={<Trophy size={16} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      {renderTabContent()}
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default McpDashboard;