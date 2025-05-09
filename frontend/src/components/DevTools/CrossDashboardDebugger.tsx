import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  CardHeader,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Import services
import sessionService from '../../services/session-service';
import api from '../../services/api';
import { axiosInstance, authAxiosInstance } from '../../utils/axiosConfig';
import { workoutMcpApi } from '../../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../../services/mcp/gamificationMcpService';

/**
 * CrossDashboardDebugger
 * 
 * A comprehensive debugging tool that analyzes data flow between client, admin, and trainer 
 * dashboards with a special focus on sessions, notifications, and gamification.
 */
const CrossDashboardDebugger: React.FC = () => {
  // State for various data sources
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<Record<string, boolean>>({
    workout: false,
    gamification: false
  });
  const [dataFlowIssues, setDataFlowIssues] = useState<string[]>([]);
  const [fixAttempts, setFixAttempts] = useState<Record<string, string>>({});
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Add to debug log
  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    setDebugLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Fetch all data for debugging
  const fetchAllData = async () => {
    setLoading(true);
    log('Starting comprehensive data fetch');
    
    try {
      // Check API endpoints
      const endpoints = [
        '/api/sessions',
        '/api/notifications',
        '/api/users',
        '/api/workouts',
        '/api/gamification/profile'
      ];
      
      const apiResults: Record<string, any> = {};
      
      for (const endpoint of endpoints) {
        try {
          log(`Testing endpoint: ${endpoint}`);
          const response = await authAxiosInstance.get(endpoint);
          
          apiResults[endpoint] = {
            status: response.status,
            ok: true,
            statusText: response.statusText
          };
          
          // Store data based on endpoint
          if (endpoint === '/api/sessions') {
            setSessions(response.data);
            log(`Found ${response.data.length} sessions`);
          } else if (endpoint === '/api/notifications') {
            setNotifications(response.data.notifications || []);
            log(`Found ${response.data.notifications?.length || 0} notifications`);
          } else if (endpoint === '/api/users') {
            setUsers(response.data);
            log(`Found ${response.data.length} users`);
          }
          
        } catch (error: any) {
          apiResults[endpoint] = {
            status: error.response?.status || 'error',
            ok: false,
            statusText: error.response?.statusText || error.message
          };
          log(`Error connecting to ${endpoint}: ${error.message}`);
        }
      }
      
      setApiStatus(apiResults);
      
      // Check MCP server status
      try {
        log('Testing Workout MCP server connection');
        const workoutStatus = await workoutMcpApi.checkServerStatus();
        setMcpStatus(prev => ({ ...prev, workout: true }));
        log('Workout MCP server is connected');
      } catch (error) {
        setMcpStatus(prev => ({ ...prev, workout: false }));
        log('Workout MCP server connection failed');
      }
      
      try {
        log('Testing Gamification MCP server connection');
        const gamificationStatus = await gamificationMcpApi.checkServerStatus();
        setMcpStatus(prev => ({ ...prev, gamification: true }));
        log('Gamification MCP server is connected');
      } catch (error) {
        setMcpStatus(prev => ({ ...prev, gamification: false }));
        log('Gamification MCP server connection failed');
      }
      
      // Analyze data flow issues
      analyzeDataFlow();
      
    } catch (error: any) {
      log(`Error in data fetch: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze potential data flow issues between dashboards
  const analyzeDataFlow = () => {
    const issues: string[] = [];
    
    // Check if session API is working
    if (!apiStatus['/api/sessions']?.ok) {
      issues.push('Session API is not accessible - this will prevent sessions from appearing in all dashboards');
    }
    
    // Check if notification API is working
    if (!apiStatus['/api/notifications']?.ok) {
      issues.push('Notification API is not accessible - this will prevent notifications from appearing');
    }
    
    // Check sessions data
    if (sessions.length === 0) {
      issues.push('No sessions found - clients will see empty session lists');
    } else {
      // Check for scheduled sessions with no trainer assigned
      const unassignedSessions = sessions.filter(session => 
        (session.status === 'scheduled' || session.status === 'confirmed') && 
        !session.trainerId
      );
      
      if (unassignedSessions.length > 0) {
        issues.push(`${unassignedSessions.length} scheduled sessions have no assigned trainer`);
      }
      
      // Check for orphaned sessions (client no longer exists)
      const clientIds = users.filter(user => user.role === 'client').map(user => user.id);
      const orphanedSessions = sessions.filter(session => 
        session.userId && !clientIds.includes(session.userId)
      );
      
      if (orphanedSessions.length > 0) {
        issues.push(`${orphanedSessions.length} sessions are associated with clients that don't exist`);
      }
    }
    
    // Check MCP issues
    if (!mcpStatus.workout) {
      issues.push('Workout MCP server is not accessible - workout data will not be synchronized');
    }
    if (!mcpStatus.gamification) {
      issues.push('Gamification MCP server is not accessible - achievements and rewards will not update');
    }
    
    setDataFlowIssues(issues);
    log(`Analysis complete: Found ${issues.length} potential data flow issues`);
  };
  
  // Fix common issues
  const attemptFixCommonIssues = async () => {
    log('Attempting to fix common issues');
    const fixResults: Record<string, string> = {};
    
    // Try to fix session-trainer assignments
    if (sessions.length > 0) {
      try {
        const unassignedSessions = sessions.filter(session => 
          (session.status === 'scheduled' || session.status === 'confirmed') && 
          !session.trainerId
        );
        
        if (unassignedSessions.length > 0) {
          log(`Fixing ${unassignedSessions.length} unassigned sessions`);
          
          // Find trainers
          const trainers = users.filter(user => user.role === 'trainer');
          
          if (trainers.length > 0) {
            // Attempt to assign trainers to sessions
            let fixedCount = 0;
            
            for (const session of unassignedSessions) {
              // Pick a trainer in round-robin fashion
              const trainer = trainers[fixedCount % trainers.length];
              
              try {
                // Call admin API to assign a trainer
                await authAxiosInstance.post(`/api/sessions/${session.id}/assign-trainer`, {
                  trainerId: trainer.id
                });
                
                fixedCount++;
              } catch (error) {
                log(`Failed to assign trainer to session ${session.id}`);
              }
            }
            
            fixResults['unassignedSessions'] = `Fixed ${fixedCount} of ${unassignedSessions.length} unassigned sessions`;
          } else {
            fixResults['unassignedSessions'] = 'No trainers available to assign to sessions';
          }
        } else {
          fixResults['unassignedSessions'] = 'No unassigned sessions found';
        }
      } catch (error: any) {
        fixResults['unassignedSessions'] = `Error fixing unassigned sessions: ${error.message}`;
      }
    }
    
    // Try to repair data connections
    try {
      log('Synchronizing data across dashboards');
      await authAxiosInstance.post('/api/admin/sync-data');
      fixResults['dataSynchronization'] = 'Data synchronization successful';
    } catch (error: any) {
      fixResults['dataSynchronization'] = `Data synchronization failed: ${error.message}`;
    }
    
    // Try to restart MCP connections if needed
    if (!mcpStatus.workout || !mcpStatus.gamification) {
      try {
        log('Attempting to reconnect to MCP servers');
        await authAxiosInstance.post('/api/admin/restart-mcp-connections');
        fixResults['mcpConnections'] = 'MCP reconnection attempt successful';
      } catch (error: any) {
        fixResults['mcpConnections'] = `MCP reconnection failed: ${error.message}`;
      }
    }
    
    setFixAttempts(fixResults);
    // Refresh data after fix attempts
    fetchAllData();
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#1a1a2e', color: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BugReportIcon sx={{ fontSize: 36, mr: 2, color: '#00ffff' }} />
          <Typography variant="h4" sx={{ color: '#00ffff' }}>
            Cross-Dashboard Debugger
          </Typography>
        </Box>
        
        <Typography variant="body1" gutterBottom>
          This tool diagnoses issues with data sharing between client, admin, and trainer dashboards.
          It focuses on sessions, notifications, workouts and gamification.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={fetchAllData}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh All Data
          </Button>
          
          <Button 
            variant="contained"
            color="secondary"  
            onClick={attemptFixCommonIssues}
            disabled={loading || dataFlowIssues.length === 0}
          >
            Attempt Auto-Fix
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <Alert 
                severity={dataFlowIssues.length > 0 ? "warning" : "success"}
                icon={dataFlowIssues.length > 0 ? <WarningIcon /> : <CheckCircleIcon />}
                sx={{ mb: 2 }}
              >
                {dataFlowIssues.length > 0 
                  ? `${dataFlowIssues.length} data flow issues detected` 
                  : "All systems appear to be functioning correctly"}
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ backgroundColor: apiStatus['/api/sessions']?.ok ? '#31304D' : '#4F3A3A' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Sessions
                      </Typography>
                      <Typography variant="h4">
                        {sessions.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {apiStatus['/api/sessions']?.ok ? 'API Connected' : 'API Disconnected'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ backgroundColor: apiStatus['/api/notifications']?.ok ? '#31304D' : '#4F3A3A' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Notifications
                      </Typography>
                      <Typography variant="h4">
                        {notifications.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {apiStatus['/api/notifications']?.ok ? 'API Connected' : 'API Disconnected'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card sx={{ backgroundColor: (mcpStatus.workout && mcpStatus.gamification) ? '#31304D' : '#4F3A3A' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        MCP Servers
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                          label="Workout" 
                          color={mcpStatus.workout ? "success" : "error"}
                          size="small"
                        />
                        <Chip 
                          label="Gamification" 
                          color={mcpStatus.gamification ? "success" : "error"}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ 
                mb: 3,
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': { color: '#f5f5f5' },
                '& .Mui-selected': { color: '#00ffff' }
              }}
            >
              <Tab label="Issues & Fixes" />
              <Tab label="Sessions Data" />
              <Tab label="API Status" />
              <Tab label="Debug Log" />
            </Tabs>
            
            {/* Issues & Fixes Tab */}
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Detected Issues
                </Typography>
                
                {dataFlowIssues.length > 0 ? (
                  <Box sx={{ mb: 4 }}>
                    {dataFlowIssues.map((issue, index) => (
                      <Alert 
                        key={index} 
                        severity="warning" 
                        sx={{ mb: 1 }}
                        icon={<WarningIcon />}
                      >
                        {issue}
                      </Alert>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="success" sx={{ mb: 4 }}>
                    No data flow issues detected
                  </Alert>
                )}
                
                {Object.keys(fixAttempts).length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Fix Attempts
                    </Typography>
                    
                    <Box sx={{ mb: 4 }}>
                      {Object.entries(fixAttempts).map(([key, result], index) => (
                        <Alert 
                          key={index} 
                          severity={result.includes('successful') ? "success" : "info"} 
                          sx={{ mb: 1 }}
                        >
                          {result}
                        </Alert>
                      ))}
                    </Box>
                  </>
                )}
                
                <Typography variant="h6" gutterBottom>
                  Common Solutions
                </Typography>
                
                <Accordion sx={{ mb: 2, bgcolor: '#31304D' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Sessions Not Appearing</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography paragraph>
                      If sessions are not appearing in dashboards, try these solutions:
                    </Typography>
                    <ol>
                      <li>Check that the session API endpoint is accessible</li>
                      <li>Verify that sessions have the correct status and are associated with valid users</li>
                      <li>Ensure sessions are associated with the correct client ID</li>
                      <li>Check that role-based filtering is working correctly in the session controller</li>
                    </ol>
                    <Typography sx={{ mt: 2 }}>
                      Direct fix: You can run a database repair script from the admin panel to ensure session data consistency.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion sx={{ mb: 2, bgcolor: '#31304D' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Notifications Not Appearing</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography paragraph>
                      If notifications are not appearing correctly, try these solutions:
                    </Typography>
                    <ol>
                      <li>Check that the notification API endpoint is accessible</li>
                      <li>Verify WebSocket connections are established for real-time updates</li>
                      <li>Ensure notification events are being properly triggered by actions</li>
                      <li>Check that notification types are being correctly filtered</li>
                    </ol>
                    <Typography sx={{ mt: 2 }}>
                      Direct fix: You can manually trigger test notifications for all users to verify the notification system.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion sx={{ mb: 2, bgcolor: '#31304D' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Session Purchase Not Showing in Client Dashboard</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography paragraph>
                      If sessions purchased through the cart system are not showing up in client accounts, try these solutions:
                    </Typography>
                    <ol>
                      <li>Check that order processing is correctly adding session credits to client accounts</li>
                      <li>Verify the client's availableSessions field is being updated</li>
                      <li>Ensure session packages are correctly defined with session counts</li>
                      <li>Check that the cart checkout process is completing successfully</li>
                    </ol>
                    <Typography sx={{ mt: 2 }}>
                      Direct fix: You can manually add session credits to client accounts from the admin dashboard.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion sx={{ mb: 2, bgcolor: '#31304D' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>MCP Server Connection Issues</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography paragraph>
                      If MCP servers are not connecting properly, try these solutions:
                    </Typography>
                    <ol>
                      <li>Check that MCP servers are running on the correct ports</li>
                      <li>Verify API keys and authentication tokens are valid</li>
                      <li>Ensure CORS is properly configured for cross-origin requests</li>
                      <li>Check network connectivity between frontend and MCP servers</li>
                    </ol>
                    <Typography sx={{ mt: 2 }}>
                      Direct fix: You can restart the MCP servers using the scripts in the /scripts directory.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {/* Sessions Data Tab */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Session Data Analysis
                </Typography>
                
                {sessions.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Client</TableCell>
                          <TableCell>Trainer</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Visibility</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessions.map((session) => {
                          // Find client and trainer objects
                          const client = users.find(user => user.id === session.userId);
                          const trainer = users.find(user => user.id === session.trainerId);
                          
                          // Determine dashboard visibility
                          const adminVisible = true;
                          const clientVisible = !!session.userId;
                          const trainerVisible = !!session.trainerId;
                          
                          return (
                            <TableRow key={session.id}>
                              <TableCell>{session.id}</TableCell>
                              <TableCell>{new Date(session.sessionDate).toLocaleString()}</TableCell>
                              <TableCell>
                                {client 
                                  ? `${client.firstName} ${client.lastName}`
                                  : session.userId 
                                    ? <Chip label="MISSING CLIENT" color="error" size="small" />
                                    : "Not booked"
                                }
                              </TableCell>
                              <TableCell>
                                {trainer 
                                  ? `${trainer.firstName} ${trainer.lastName}`
                                  : session.trainerId
                                    ? <Chip label="MISSING TRAINER" color="error" size="small" />
                                    : <Chip label="UNASSIGNED" color="warning" size="small" />
                                }
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={session.status} 
                                  color={
                                    session.status === 'available' ? 'info' :
                                    session.status === 'completed' ? 'success' :
                                    session.status === 'cancelled' ? 'error' :
                                    'default'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Chip 
                                    label="A" 
                                    color={adminVisible ? "success" : "error"}
                                    size="small"
                                    title="Admin dashboard visibility"
                                  />
                                  <Chip 
                                    label="C" 
                                    color={clientVisible ? "success" : "error"}
                                    size="small"
                                    title="Client dashboard visibility"
                                  />
                                  <Chip 
                                    label="T" 
                                    color={trainerVisible ? "success" : "error"}
                                    size="small"
                                    title="Trainer dashboard visibility"
                                  />
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="warning">
                    No session data available
                  </Alert>
                )}
              </Box>
            )}
            
            {/* API Status Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  API Connection Status
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Endpoint</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(apiStatus).map(([endpoint, status]) => (
                        <TableRow key={endpoint}>
                          <TableCell>{endpoint}</TableCell>
                          <TableCell>
                            <Chip 
                              label={status.ok ? "Connected" : "Error"} 
                              color={status.ok ? "success" : "error"}
                            />
                          </TableCell>
                          <TableCell>
                            {status.ok 
                              ? `Status: ${status.status} ${status.statusText}`
                              : `Error: ${status.statusText || status.error || status.status}`
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                  MCP Server Status
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Server</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Impact</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Workout MCP</TableCell>
                        <TableCell>
                          <Chip 
                            label={mcpStatus.workout ? "Connected" : "Disconnected"} 
                            color={mcpStatus.workout ? "success" : "error"}
                          />
                        </TableCell>
                        <TableCell>
                          {mcpStatus.workout 
                            ? "Workout data synchronized properly"
                            : "Workout recommendations and tracking will be unavailable"
                          }
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gamification MCP</TableCell>
                        <TableCell>
                          <Chip 
                            label={mcpStatus.gamification ? "Connected" : "Disconnected"} 
                            color={mcpStatus.gamification ? "success" : "error"}
                          />
                        </TableCell>
                        <TableCell>
                          {mcpStatus.gamification 
                            ? "Gamification features working properly"
                            : "Achievements, rewards and points will not update"
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {/* Debug Log Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Debug Log
                </Typography>
                
                <Paper sx={{ p: 2, maxHeight: 500, overflow: 'auto', bgcolor: '#000', color: '#00ff00', fontFamily: 'monospace' }}>
                  {debugLog.map((log, index) => (
                    <Box key={index} sx={{ mb: 0.5 }}>
                      {log}
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default CrossDashboardDebugger;
