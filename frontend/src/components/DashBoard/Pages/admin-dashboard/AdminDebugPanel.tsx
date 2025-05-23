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
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';

// Import GlowButton to ensure consistent styling
import GlowButton from '../../../ui/GlowButton';

/**
 * AdminDebugPanel Component
 * 
 * A comprehensive debugging tool for admin dashboard with focus on:
 * - Session purchase and visibility across dashboards
 * - Cart functionality
 * - Data synchronization between admin, client, and trainer views
 * - System health monitoring
 */
const AdminDebugPanel: React.FC = () => {
  // Debug state
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<Record<string, any>>({});
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [cartData, setCartData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionIssues, setConnectionIssues] = useState<string[]>([]);
  const [dataFlowIssues, setDataFlowIssues] = useState<string[]>([]);
  const [testEndpointUrl, setTestEndpointUrl] = useState<string>('');
  const [testEndpointResult, setTestEndpointResult] = useState<any>(null);
  const [testEndpointError, setTestEndpointError] = useState<string | null>(null);
  const [sessionPurchaseFlow, setSessionPurchaseFlow] = useState<any[]>([]);

  // Initialize debug data collection
  useEffect(() => {
    debugLog('Initializing admin debug panel');
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
    debugLog('Starting admin debug data collection');
    const issues: string[] = [];
    const dataIssues: string[] = [];

    try {
      // Check API endpoints
      const apiEndpoints = [
        '/api/sessions',
        '/api/users',
        '/api/cart',
        '/api/orders',
        '/api/workouts',
      ];

      const apiResults: Record<string, any> = {};

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
              
              // Store data based on endpoint
              if (endpoint === '/api/sessions' && Array.isArray(data)) {
                setSessionData(data);
                debugLog(`Found ${data.length} sessions`);
              } else if (endpoint === '/api/users' && Array.isArray(data)) {
                setUserData(data);
                debugLog(`Found ${data.length} users`);
              } else if (endpoint === '/api/cart') {
                setCartData(Array.isArray(data) ? data : (data.items || []));
                debugLog(`Found ${Array.isArray(data) ? data.length : (data.items?.length || 0)} cart items`);
              } else if (endpoint === '/api/orders' && Array.isArray(data)) {
                setOrderData(data);
                debugLog(`Found ${data.length} orders`);
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

      // Get session purchase flow data
      // This would detect if sessions purchased show up correctly in all dashboards
      try {
        debugLog('Analyzing session purchase flow');
        
        // Get recent orders that include session packages
        const sessionOrders = orderData.filter(order => 
          order.items?.some((item: any) => item.itemType === 'training')
        );
        
        // For each order with sessions, track the purchase flow
        const purchaseFlowData = [];
        
        for (const order of sessionOrders.slice(0, 5)) { // Limit to last 5 orders
          const sessionItems = order.items.filter((item: any) => item.itemType === 'training');
          
          for (const item of sessionItems) {
            const userId = order.userId;
            const purchaseDate = new Date(order.createdAt);
            
            // Find corresponding client
            const client = userData.find(user => user.id === userId);
            
            // Check if sessions were added to client's account
            const clientHasSessions = client && client.availableSessions > 0;
            
            // Check for sessions scheduled after purchase
            const clientSessions = sessionData.filter(session => 
              session.userId === userId && new Date(session.bookingDate) > purchaseDate
            );
            
            // Purchase flow status
            const purchaseFlow = {
              orderId: order.id,
              orderDate: purchaseDate,
              packageName: item.name,
              sessionCount: item.sessionCount || 'Unknown',
              clientId: userId,
              clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
              sessionsCredited: clientHasSessions,
              sessionsScheduled: clientSessions.length,
              status: clientHasSessions && clientSessions.length > 0 ? 'Complete' : 
                     clientHasSessions ? 'Partial - No Sessions Scheduled' : 'Broken - No Sessions Credited'
            };
            
            purchaseFlowData.push(purchaseFlow);
            
            // Log issues
            if (!clientHasSessions) {
              dataIssues.push(`Order ${order.id}: Sessions not credited to client account`);
            }
            if (clientSessions.length === 0) {
              dataIssues.push(`Order ${order.id}: Client has not scheduled any sessions after purchase`);
            }
          }
        }
        
        setSessionPurchaseFlow(purchaseFlowData);
        
      } catch (error) {
        debugLog(`Error analyzing session purchase flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        dataIssues.push('Failed to analyze session purchase flow');
      }

      setConnectionIssues(issues);
      setDataFlowIssues(dataIssues);
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

  // Force synchronization of sessions across dashboards
  const syncSessionsAcrossDashboards = async () => {
    debugLog('Attempting to force session synchronization');
    
    try {
      // This would call a backend endpoint that ensures session data is consistent
      const response = await fetch('/api/admin/sync-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        debugLog('Session synchronization successful');
        // Refresh debug data
        collectDebugData();
      } else {
        debugLog(`Session synchronization failed: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      debugLog(`Session synchronization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            Admin System Diagnostic Dashboard
          </Typography>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          This diagnostic tool focuses on session purchase and data synchronization across dashboards.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Alert 
                severity={connectionIssues.length > 0 ? "error" : "success"} 
                sx={{ flex: 1 }}
                icon={connectionIssues.length > 0 ? <WarningIcon /> : <CheckCircleIcon />}
              >
                {connectionIssues.length > 0 
                  ? `${connectionIssues.length} API Connection Issues` 
                  : "All API endpoints connected"}
              </Alert>
              
              <Alert 
                severity={dataFlowIssues.length > 0 ? "warning" : "success"} 
                sx={{ flex: 1 }}
                icon={dataFlowIssues.length > 0 ? <WarningIcon /> : <CheckCircleIcon />}
              >
                {dataFlowIssues.length > 0 
                  ? `${dataFlowIssues.length} Data Flow Issues` 
                  : "Data flow is healthy"}
              </Alert>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <GlowButton 
                variant="primary" 
                onClick={refreshDebugData}
                sx={{ flex: 1 }}
              >
                Refresh Diagnostics
              </GlowButton>
              
              <GlowButton 
                variant="secondary" 
                onClick={syncSessionsAcrossDashboards}
                sx={{ flex: 1 }}
              >
                Force Session Sync
              </GlowButton>
            </Box>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarMonthIcon sx={{ mr: 1 }} />
                  <Typography>Session Purchase Flow Analysis</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  This analysis tracks how sessions purchases flow through your system
                </Typography>
                
                {sessionPurchaseFlow.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order ID</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Package</TableCell>
                          <TableCell>Client</TableCell>
                          <TableCell>Sessions Credited</TableCell>
                          <TableCell>Sessions Scheduled</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionPurchaseFlow.map((flow, index) => (
                          <TableRow key={index}>
                            <TableCell>{flow.orderId}</TableCell>
                            <TableCell>{new Date(flow.orderDate).toLocaleDateString()}</TableCell>
                            <TableCell>{flow.packageName}</TableCell>
                            <TableCell>{flow.clientName}</TableCell>
                            <TableCell>
                              {flow.sessionsCredited ? 
                                <CheckCircleIcon color="success" /> : 
                                <WarningIcon color="error" />}
                            </TableCell>
                            <TableCell>{flow.sessionsScheduled}</TableCell>
                            <TableCell>
                              <Chip 
                                label={flow.status} 
                                color={flow.status === 'Complete' ? 'success' : 
                                       flow.status.includes('Partial') ? 'warning' : 'error'} 
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography>No session purchases found to analyze</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ShoppingCartIcon sx={{ mr: 1 }} />
                  <Typography>Cart & Order System Status</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Cart System Status</Typography>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="API Connection" 
                          secondary={apiStatus['/api/cart']?.ok ? 'Connected' : 'Disconnected'} 
                          primaryTypographyProps={{
                            style: { color: apiStatus['/api/cart']?.ok ? '#4caf50' : '#f44336' }
                          }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Active Cart Items" 
                          secondary={cartData.length.toString()} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Session Packages in Cart" 
                          secondary={cartData.filter((item: any) => 
                            item.itemType === 'training'
                          ).length.toString()} 
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Order System Status</Typography>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="API Connection" 
                          secondary={apiStatus['/api/orders']?.ok ? 'Connected' : 'Disconnected'} 
                          primaryTypographyProps={{
                            style: { color: apiStatus['/api/orders']?.ok ? '#4caf50' : '#f44336' }
                          }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Total Orders" 
                          secondary={orderData.length.toString()} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Orders with Sessions" 
                          secondary={orderData.filter(order => 
                            order.items?.some((item: any) => item.itemType === 'training')
                          ).length.toString()} 
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ mr: 1 }} />
                  <Typography>Cross-Dashboard Data Status</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Session data visibility across different dashboard views
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Dashboard</TableCell>
                        <TableCell>Session Visibility</TableCell>
                        <TableCell>Update Method</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Admin</TableCell>
                        <TableCell>All sessions</TableCell>
                        <TableCell>Real-time API</TableCell>
                        <TableCell>
                          <Chip 
                            label={apiStatus['/api/sessions']?.ok ? "Connected" : "Error"} 
                            color={apiStatus['/api/sessions']?.ok ? "success" : "error"} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell>User's sessions only</TableCell>
                        <TableCell>Filtered API</TableCell>
                        <TableCell>
                          <Chip 
                            label={apiStatus['/api/sessions']?.ok ? "Connected" : "Error"} 
                            color={apiStatus['/api/sessions']?.ok ? "success" : "error"} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Trainer</TableCell>
                        <TableCell>Assigned sessions only</TableCell>
                        <TableCell>Filtered API</TableCell>
                        <TableCell>
                          <Chip 
                            label={apiStatus['/api/sessions']?.ok ? "Connected" : "Error"} 
                            color={apiStatus['/api/sessions']?.ok ? "success" : "error"} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Detected Data Flow Issues
                </Typography>
                
                {dataFlowIssues.length > 0 ? (
                  <List dense>
                    {dataFlowIssues.map((issue, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={issue} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>No data flow issues detected</Typography>
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
    </Box>
  );
};

export default AdminDebugPanel;