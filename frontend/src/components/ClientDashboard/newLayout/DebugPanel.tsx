import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GlowButton from '../../ui/GlowButton';

/**
 * DebugPanel Component
 * 
 * A comprehensive debugging tool for client dashboard components.
 * This helps identify issues with:
 * - API connections
 * - Data flow between admin, client, and trainer
 * - Authentication
 * - MCP Server status
 * - Database connectivity
 * - Integration points between components
 */
const DebugPanel: React.FC = () => {
  // Debug state
  const [authState, setAuthState] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<Record<string, any>>({});
  const [userRoleDebug, setUserRoleDebug] = useState<string>('unknown');
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [notificationData, setNotificationData] = useState<any[]>([]);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userFound, setUserFound] = useState<boolean>(false);
  const [connectionIssues, setConnectionIssues] = useState<string[]>([]);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [testEndpointUrl, setTestEndpointUrl] = useState<string>('');
  const [testEndpointResult, setTestEndpointResult] = useState<any>(null);
  const [testEndpointError, setTestEndpointError] = useState<string | null>(null);

  // Initialize debug data collection
  useEffect(() => {
    debugLog('Initializing debug panel');
    collectDebugData();
  }, []);

  // Helper to add debug logs
  const debugLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Main debug data collection
  const collectDebugData = async () => {
    setIsLoading(true);
    debugLog('Starting debug data collection');

    try {
      // Check authentication status
      try {
        // Check for user in window/global object
        const windowAuth = (window as any).auth || {};
        const sessionAuth = sessionStorage.getItem('auth');
        const localAuth = localStorage.getItem('auth');

        let parsedSessionAuth = {};
        let parsedLocalAuth = {};

        try {
          if (sessionAuth) parsedSessionAuth = JSON.parse(sessionAuth);
        } catch (e) {
          debugLog('Failed to parse session auth');
        }

        try {
          if (localAuth) parsedLocalAuth = JSON.parse(localAuth);
        } catch (e) {
          debugLog('Failed to parse local auth');
        }

        const authData = {
          window: windowAuth,
          session: parsedSessionAuth,
          local: parsedLocalAuth
        };

        setAuthState(authData);
        debugLog('Auth data collected');

        // Try to determine user role
        const token = 
          windowAuth.token || 
          (parsedSessionAuth as any)?.token || 
          (parsedLocalAuth as any)?.token ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('token');

        if (token) {
          try {
            // Try to decode JWT
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decodedToken = JSON.parse(window.atob(base64));
            setUserRoleDebug(decodedToken.role || 'unknown');
            setUserFound(true);
            debugLog(`User role detected: ${decodedToken.role}`);
          } catch (e) {
            debugLog('Failed to decode token');
          }
        }
      } catch (error) {
        debugLog('Error collecting auth data');
      }

      // Check API endpoints
      const apiEndpoints = [
        '/api/sessions',
        '/api/notifications',
        '/api/users/profile',
        '/api/workouts',
        '/api/gamification/profile'
      ];

      setEndpoints(apiEndpoints);

      const apiResults: Record<string, any> = {};
      const issues: string[] = [];

      for (const endpoint of apiEndpoints) {
        try {
          debugLog(`Testing endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
            }
          });

          apiResults[endpoint] = {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          };

          if (!response.ok) {
            issues.push(`API endpoint ${endpoint} returned status ${response.status}`);
          } else {
            try {
              const data = await response.json();
              if (endpoint === '/api/sessions' && Array.isArray(data)) {
                setSessionData(data);
                debugLog(`Found ${data.length} sessions`);
              } else if (endpoint === '/api/notifications' && data.notifications) {
                setNotificationData(data.notifications);
                debugLog(`Found ${data.notifications.length} notifications`);
              } else if (endpoint === '/api/workouts' && Array.isArray(data)) {
                setWorkoutData(data);
                debugLog(`Found ${data.length} workouts`);
              } else if (endpoint === '/api/gamification/profile') {
                setGamificationData(data);
                debugLog('Gamification profile data found');
              }
            } catch (e) {
              debugLog(`Error parsing JSON for ${endpoint}`);
            }
          }
        } catch (error) {
          apiResults[endpoint] = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          issues.push(`Failed to connect to ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setApiStatus(apiResults);
      setConnectionIssues(issues);

      // Check MCP server
      try {
        debugLog('Testing MCP server connection');
        const response = await fetch('/mcp/status');
        if (response.ok) {
          const data = await response.json();
          setMcpStatus({
            status: 'connected',
            version: data.version || 'unknown',
            data
          });
          debugLog('MCP server is connected');
        } else {
          setMcpStatus({
            status: 'error',
            statusCode: response.status,
            statusText: response.statusText
          });
          issues.push(`MCP server returned status ${response.status}`);
        }
      } catch (error) {
        setMcpStatus({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        issues.push(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setConnectionIssues(issues);
      debugLog('Debug data collection complete');
    } catch (error) {
      debugLog(`Error in debug data collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test an arbitrary endpoint
  const testEndpoint = async () => {
    if (!testEndpointUrl) return;

    setTestEndpointResult(null);
    setTestEndpointError(null);
    debugLog(`Testing custom endpoint: ${testEndpointUrl}`);

    try {
      const response = await fetch(testEndpointUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestEndpointResult(data);
        debugLog(`Custom endpoint test successful: ${testEndpointUrl}`);
      } else {
        setTestEndpointError(`Status: ${response.status} - ${response.statusText}`);
        debugLog(`Custom endpoint error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      setTestEndpointError(error instanceof Error ? error.message : 'Unknown error');
      debugLog(`Custom endpoint exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Refresh debug data
  const refreshDebugData = () => {
    debugLog('Manually refreshing debug data');
    collectDebugData();
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#1a1a2e' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BugReportIcon sx={{ fontSize: 30, mr: 1, color: '#00ffff' }} />
          <Typography variant="h5" sx={{ color: '#00ffff' }}>
            System Diagnostics Panel
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Alert 
              severity={connectionIssues.length > 0 ? "error" : "success"} 
              sx={{ mb: 2 }}
              icon={connectionIssues.length > 0 ? <WarningIcon /> : <CheckCircleIcon />}
            >
              {connectionIssues.length > 0 
                ? `Found ${connectionIssues.length} connection issues`
                : "All systems connected"
              }
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography>
                User Role: <strong>{userRoleDebug}</strong>
              </Typography>
              <Typography>
                User Found: <strong>{userFound ? 'Yes' : 'No'}</strong>
              </Typography>
              <Typography>
                MCP Status: <strong>{mcpStatus.status || 'Unknown'}</strong>
              </Typography>
            </Box>

            <GlowButton 
              variant="primary" 
              onClick={refreshDebugData}
              sx={{ width: '100%', mb: 2 }}
            >
              Refresh Diagnostics
            </GlowButton>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Authentication Status</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(authState, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>API Connectivity</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {Object.entries(apiStatus).map(([endpoint, status]) => (
                    <ListItem key={endpoint}>
                      <ListItemText
                        primary={endpoint}
                        secondary={
                          status.ok 
                            ? `Connected (${status.status})` 
                            : `Error: ${status.statusText || status.error || status.status}`
                        }
                        primaryTypographyProps={{
                          style: { color: status.ok ? '#4caf50' : '#f44336' }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Data Summary</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Sessions</Typography>
                    <Typography variant="body2">Count: {sessionData.length}</Typography>
                    {sessionData.length > 0 && (
                      <Typography variant="body2">
                        Most recent: {new Date(sessionData[0].sessionDate).toLocaleString()}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Notifications</Typography>
                    <Typography variant="body2">Count: {notificationData.length}</Typography>
                    {notificationData.length > 0 && (
                      <Typography variant="body2">
                        Most recent: {new Date(notificationData[0].createdAt).toLocaleString()}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Workouts</Typography>
                    <Typography variant="body2">Count: {workoutData.length}</Typography>
                    {workoutData.length > 0 && (
                      <Typography variant="body2">
                        Most recent: {new Date(workoutData[0].createdAt).toLocaleString()}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Gamification</Typography>
                    {gamificationData ? (
                      <>
                        <Typography variant="body2">
                          Level: {gamificationData.profile?.level || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          Points: {gamificationData.profile?.points || 'N/A'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2">No data available</Typography>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Connection Issues</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {connectionIssues.length > 0 ? (
                  <List>
                    {connectionIssues.map((issue, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={issue} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>No connection issues detected</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Test Custom Endpoint</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <TextField
                    fullWidth
                    label="API Endpoint"
                    value={testEndpointUrl}
                    onChange={(e) => setTestEndpointUrl(e.target.value)}
                    placeholder="/api/example"
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <GlowButton 
                    variant="primary" 
                    onClick={testEndpoint}
                  >
                    Test
                  </GlowButton>
                </Box>

                {testEndpointError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {testEndpointError}
                  </Alert>
                )}

                {testEndpointResult && (
                  <Paper sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
                    <pre>
                      {JSON.stringify(testEndpointResult, null, 2)}
                    </pre>
                  </Paper>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Debug Log</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  {debugLogs.map((log, index) => (
                    <div key={index} style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '4px' }}>
                      {log}
                    </div>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Paper>

      <Paper sx={{ p: 3, backgroundColor: '#1a1a2e' }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#00ffff' }}>
          <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Integration Diagnostics
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Cross-Component Data Flow
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Client -> Admin" 
                  secondary={
                    sessionData.length > 0 
                      ? "Integrated via Sessions API" 
                      : "Integration issue: No session data"
                  }
                  primaryTypographyProps={{
                    style: { color: sessionData.length > 0 ? '#4caf50' : '#f44336' }
                  }}
                />
              </ListItem>
              <ListItem>