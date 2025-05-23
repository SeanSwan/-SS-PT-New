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
  ListItemIcon,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import GlowButton from '../../../ui/GlowButton';
import axios from 'axios';

/**
 * DiagnosticsDashboard Component
 * 
 * An admin-only comprehensive debugging tool to diagnose system issues and ensure
 * proper data flow between client, trainer, and admin dashboards.
 * 
 * Features:
 * - API connection status
 * - Database health checks
 * - Cart & session purchase flow diagnostics
 * - MCP server status
 * - Cross-component integration verification
 * - Custom endpoint testing
 */
const DiagnosticsDashboard: React.FC = () => {
  // State for tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Debug state
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<Record<string, any>>({});
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [cartData, setCartData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionIssues, setConnectionIssues] = useState<string[]>([]);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [testEndpointUrl, setTestEndpointUrl] = useState<string>('');
  const [testEndpointResult, setTestEndpointResult] = useState<any>(null);
  const [testEndpointError, setTestEndpointError] = useState<string | null>(null);
  
  // Purchase flow diagnostics
  const [purchaseFlowIssues, setPurchaseFlowIssues] = useState<string[]>([]);
  const [purchaseFlowLog, setPurchaseFlowLog] = useState<any[]>([]);
  const [isTestingPurchaseFlow, setIsTestingPurchaseFlow] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);

  // Initialize debug data collection
  useEffect(() => {
    debugLog('Initializing admin diagnostics dashboard');
    collectDebugData();
  }, []);

  // Helper to add debug logs
  const debugLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Main debug data collection
  const collectDebugData = async () => {
    setIsLoading(true);
    debugLog('Starting system diagnostics');

    try {
      // Check API endpoints
      const apiEndpoints = [
        '/api/sessions',
        '/api/users',
        '/api/orders',
        '/api/cart',
        '/api/notifications',
        '/api/workouts'
      ];

      setEndpoints(apiEndpoints);
      const apiResults: Record<string, any> = {};
      const issues: string[] = [];

      for (const endpoint of apiEndpoints) {
        try {
          debugLog(`Testing endpoint: ${endpoint}`);
          const response = await axios.get(endpoint);

          apiResults[endpoint] = {
            status: response.status,
            ok: response.status >= 200 && response.status < 300,
            statusText: response.statusText
          };

          if (response.status >= 200 && response.status < 300) {
            const data = response.data;
            
            // Store data from specific endpoints
            if (endpoint === '/api/sessions' && Array.isArray(data)) {
              setSessionData(data);
              debugLog(`Found ${data.length} sessions`);
            } else if (endpoint === '/api/cart' && Array.isArray(data)) {
              setCartData(data);
              debugLog(`Found ${data.length} cart items`);
            } else if (endpoint === '/api/orders' && Array.isArray(data)) {
              setOrderData(data);
              debugLog(`Found ${data.length} orders`);
            } else if (endpoint === '/api/users' && data.users) {
              setUserStats({
                total: data.users.length,
                clients: data.users.filter((u: any) => u.role === 'client').length,
                trainers: data.users.filter((u: any) => u.role === 'trainer').length,
                admins: data.users.filter((u: any) => u.role === 'admin').length
              });
              debugLog(`Found ${data.users.length} users`);
            }
          } else {
            issues.push(`API endpoint ${endpoint} returned status ${response.status}`);
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
        const mcpResponse = await axios.get('/mcp/status');
        
        setMcpStatus({
          status: 'connected',
          version: mcpResponse.data.version || 'unknown',
          data: mcpResponse.data
        });
        debugLog('MCP server is connected');
      } catch (error) {
        setMcpStatus({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        issues.push(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Check recent purchases and session assignments
      try {
        const ordersResponse = await axios.get('/api/orders/recent');
        const recentOrders = ordersResponse.data.slice(0, 5);
        
        // For each order, verify if it created sessions when it should have
        const purchaseWithSessions = [];
        let purchaseFlowErrors = [];
        
        for (const order of recentOrders) {
          // Check if order contains session packages
          const hasSessionPackages = order.items?.some((item: any) => 
            item.type === 'session_package' || 
            item.category === 'training'
          );
          
          if (hasSessionPackages) {
            // Check if user received sessions
            try {
              const userResponse = await axios.get(`/api/users/${order.userId}`);
              const user = userResponse.data;
              
              // Look for session changes
              const sessionLogs = await axios.get(`/api/logs/user/${order.userId}/sessions`);
              
              purchaseWithSessions.push({
                order,
                user,
                sessionLogs: sessionLogs.data || [],
                sessionCountBefore: user.sessionCountHistory?.find((h: any) => 
                  new Date(h.date) < new Date(order.createdAt)
                )?.count || 0,
                sessionCountAfter: user.availableSessions || 0,
                isCorrect: user.availableSessions > 0
              });
              
              if (user.availableSessions <= 0) {
                purchaseFlowErrors.push(`Order ${order.id} did not add sessions for user ${user.id}`);
              }
            } catch (error) {
              purchaseFlowErrors.push(`Error checking sessions for order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
        
        setRecentPurchases(purchaseWithSessions);
        setPurchaseFlowIssues(purchaseFlowErrors);
        debugLog(`Checked ${purchaseWithSessions.length} purchases for session flow integrity`);
      } catch (error) {
        debugLog(`Error checking purchase flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setConnectionIssues(issues);
      debugLog('System diagnostics complete');
    } catch (error) {
      debugLog(`Error in diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test session purchase flow programmatically
  const testPurchaseFlow = async () => {
    setIsTestingPurchaseFlow(true);
    setPurchaseFlowLog([]);
    
    try {
      // Internal function to add to the purchase flow log
      const addToLog = (step: string, status: 'success' | 'warning' | 'error', message: string, data?: any) => {
        setPurchaseFlowLog(prev => [...prev, { step, status, message, data, timestamp: new Date() }]);
      };
      
      addToLog('Start', 'success', 'Starting purchase flow test', null);
      
      // 1. Create a test user (or get a test user)
      let testUser;
      try {
        addToLog('User', 'warning', 'Creating test user', null);
        const userResponse = await axios.post('/api/debug/test-user', {
          role: 'client',
          generateTestData: true
        });
        testUser = userResponse.data;
        addToLog('User', 'success', 'Test user created', testUser);
      } catch (error) {
        addToLog('User', 'error', `Failed to create test user: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        throw error;
      }
      
      // 2. Get a session package product
      let sessionPackage;
      try {
        addToLog('Product', 'warning', 'Finding session package product', null);
        const productsResponse = await axios.get('/api/storefront?category=training');
        const products = productsResponse.data;
        sessionPackage = products.find((p: any) => p.type === 'session_package');
        
        if (!sessionPackage) {
          addToLog('Product', 'error', 'No session package product found', products);
          throw new Error('No session package product found');
        }
        
        addToLog('Product', 'success', 'Found session package product', sessionPackage);
      } catch (error) {
        addToLog('Product', 'error', `Failed to find session package: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        throw error;
      }
      
      // 3. Add product to cart
      try {
        addToLog('Cart', 'warning', 'Adding product to cart', null);
        await axios.post('/api/cart/add', {
          userId: testUser.id,
          productId: sessionPackage.id,
          quantity: 1
        });
        addToLog('Cart', 'success', 'Product added to cart', null);
      } catch (error) {
        addToLog('Cart', 'error', `Failed to add product to cart: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        throw error;
      }
      
      // 4. Create order from cart
      let order;
      try {
        addToLog('Order', 'warning', 'Creating order from cart', null);
        const orderResponse = await axios.post('/api/orders/create', {
          userId: testUser.id,
          paymentMethod: 'test',
          notes: 'Diagnostic test purchase'
        });
        order = orderResponse.data;
        addToLog('Order', 'success', 'Order created', order);
      } catch (error) {
        addToLog('Order', 'error', `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        throw error;
      }
      
      // 5. Check if sessions were added to the user
      try {
        addToLog('Verify', 'warning', 'Verifying session credits', null);
        // Wait a brief moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userResponse = await axios.get(`/api/users/${testUser.id}`);
        const updatedUser = userResponse.data;
        
        if (updatedUser.availableSessions > 0) {
          addToLog('Verify', 'success', `User now has ${updatedUser.availableSessions} sessions`, updatedUser);
        } else {
          addToLog('Verify', 'error', 'User did not receive session credits', updatedUser);
        }
      } catch (error) {
        addToLog('Verify', 'error', `Failed to verify session credits: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        throw error;
      }
      
      // 6. Check if admin and trainer dashboards can see this order
      try {
        addToLog('Visibility', 'warning', 'Checking order visibility in dashboards', null);
        
        // Admin visibility
        const adminOrdersResponse = await axios.get(`/api/orders/admin/${order.id}`);
        const isVisibleToAdmin = adminOrdersResponse.status === 200;
        
        if (isVisibleToAdmin) {
          addToLog('Visibility', 'success', 'Order is visible in admin dashboard', null);
        } else {
          addToLog('Visibility', 'error', 'Order is not visible in admin dashboard', null);
        }
        
        // TODO: Check trainer visibility if applicable
      } catch (error) {
        addToLog('Visibility', 'error', `Failed to check dashboard visibility: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      }
      
      // 7. Final result
      addToLog('Complete', 'success', 'Purchase flow test completed', null);
      
    } catch (error) {
      setPurchaseFlowLog(prev => [...prev, { 
        step: 'Error',
        status: 'error',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: error,
        timestamp: new Date()
      }]);
    } finally {
      setIsTestingPurchaseFlow(false);
    }
  };

  // Test an arbitrary endpoint
  const testEndpoint = async () => {
    if (!testEndpointUrl) return;

    setTestEndpointResult(null);
    setTestEndpointError(null);
    debugLog(`Testing custom endpoint: ${testEndpointUrl}`);

    try {
      const response = await axios.get(testEndpointUrl);
      setTestEndpointResult(response.data);
      debugLog(`Custom endpoint test successful: ${testEndpointUrl}`);
    } catch (error) {
      setTestEndpointError(error instanceof Error ? error.message : 'Unknown error');
      debugLog(`Custom endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Refresh debug data
  const refreshDebugData = () => {
    debugLog('Manually refreshing diagnostics data');
    collectDebugData();
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#1a1a2e' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BugReportIcon sx={{ fontSize: 30, mr: 1, color: '#00ffff' }} />
          <Typography variant="h5" sx={{ color: '#00ffff' }}>
            Admin System Diagnostics
          </Typography>
        </Box>

        <Alert 
          severity={connectionIssues.length > 0 ? "warning" : "success"} 
          sx={{ mb: 2 }}
        >
          {connectionIssues.length > 0 
            ? `Found ${connectionIssues.length} connection issues` 
            : "All systems operational"}
        </Alert>

        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="System Status" />
          <Tab label="Purchase Flow" />
          <Tab label="Data Flow" />
          <Tab label="MCP Server" />
          <Tab label="Debug Tools" />
        </Tabs>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* System Status Tab */}
            {activeTab === 0 && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', backgroundColor: '#2d2d42' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>API Status</Typography>
                        <Typography variant="h4" sx={{ color: 
                          Object.values(apiStatus).every(s => s.ok) 
                            ? '#4caf50' 
                            : '#f44336' 
                        }}>
                          {Object.values(apiStatus).every(s => s.ok) 
                            ? 'Healthy' 
                            : 'Issues Detected'}
                        </Typography>
                        <Typography variant="body2">
                          {Object.keys(apiStatus).length} endpoints checked
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', backgroundColor: '#2d2d42' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>MCP Server</Typography>
                        <Typography variant="h4" sx={{ color: 
                          mcpStatus.status === 'connected'
                            ? '#4caf50' 
                            : '#f44336' 
                        }}>
                          {mcpStatus.status === 'connected'
                            ? 'Connected' 
                            : 'Disconnected'}
                        </Typography>
                        <Typography variant="body2">
                          {mcpStatus.version || 'Unknown version'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', backgroundColor: '#2d2d42' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Orders</Typography>
                        <Typography variant="h4" sx={{ color: '#00ffff' }}>
                          {orderData.length}
                        </Typography>
                        <Typography variant="body2">
                          Total orders in system
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Card sx={{ height: '100%', backgroundColor: '#2d2d42' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Users</Typography>
                        <Typography variant="h4" sx={{ color: '#00ffff' }}>
                          {userStats?.total || 0}
                        </Typography>
                        <Typography variant="body2">
                          {userStats?.clients || 0} clients, {userStats?.trainers || 0} trainers
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Accordion sx={{ mb: 2, backgroundColor: '#2d2d42' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>API Endpoints</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {Object.entries(apiStatus).map(([endpoint, status]) => (
                        <ListItem key={endpoint}>
                          <ListItemIcon>
                            {status.ok 
                              ? <CheckCircleIcon sx={{ color: '#4caf50' }} /> 
                              : <WarningIcon sx={{ color: '#f44336' }} />}
                          </ListItemIcon>
                          <ListItemText
                            primary={endpoint}
                            secondary={
                              status.ok 
                                ? `Connected (${status.status})` 
                                : `Error: ${status.statusText || status.error || status.status}`
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
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
                            <ListItemIcon>
                              <WarningIcon sx={{ color: '#f44336' }} />
                            </ListItemIcon>
                            <ListItemText primary={issue} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography>No connection issues detected</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
                
                <GlowButton 
                  variant="primary" 
                  onClick={refreshDebugData}
                  sx={{ width: '100%' }}
                >
                  Refresh System Status
                </GlowButton>
              </Box>
            )}

            {/* Purchase Flow Tab */}
            {activeTab === 1 && (
              <Box>
                <Alert 
                  severity={purchaseFlowIssues.length > 0 ? "warning" : "success"} 
                  sx={{ mb: 2 }}
                >
                  {purchaseFlowIssues.length > 0 
                    ? `Found ${purchaseFlowIssues.length} issues in the purchase flow` 
                    : "Purchase flow appears to be working correctly"}
                </Alert>
                
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Session Purchase Verification</Typography>
                  <GlowButton 
                    variant="primary" 
                    onClick={testPurchaseFlow}
                    disabled={isTestingPurchaseFlow}
                  >
                    {isTestingPurchaseFlow ? 'Testing...' : 'Test Session Purchase Flow'}
                  </GlowButton>
                </Box>
                
                {/* Purchase Flow Test Results */}
                {purchaseFlowLog.length > 0 && (
                  <Paper sx={{ p: 2, mb: 3, backgroundColor: '#0d0d1a' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Purchase Flow Test Results
                    </Typography>
                    <List dense>
                      {purchaseFlowLog.map((log, index) => (
                        <ListItem key={index} sx={{ px: 1, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            {log.status === 'success' && <CheckCircleIcon sx={{ color: '#4caf50' }} />}
                            {log.status === 'warning' && <InfoIcon sx={{ color: '#ff9800' }} />}
                            {log.status === 'error' && <WarningIcon sx={{ color: '#f44336' }} />}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={log.step} 
                                  size="small" 
                                  sx={{ mr: 1, backgroundColor: '#2d2d42' }} 
                                />
                                {log.message}
                              </Box>
                            }
                            secondary={log.timestamp.toLocaleTimeString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                
                <Typography variant="h6" gutterBottom>Recent Session Purchases</Typography>
                
                {recentPurchases.length > 0 ? (
                  <Grid container spacing={2}>
                    {recentPurchases.map((purchase, index) => (
                      <Grid item xs={12} key={index}>
                        <Paper sx={{ p: 2, backgroundColor: '#2d2d42' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle1">
                              Order #{purchase.order.id}
                            </Typography>
                            <Chip 
                              label={purchase.isCorrect ? 'Sessions Added' : 'Issue Detected'} 
                              color={purchase.isCorrect ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2">
                                <strong>Client:</strong> {purchase.user.firstName} {purchase.user.lastName}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Date:</strong> {new Date(purchase.order.createdAt).toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2">
                                <strong>Sessions Before:</strong> {purchase.sessionCountBefore}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Sessions After:</strong> {purchase.sessionCountAfter}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2">
                                <strong>Items:</strong> {purchase.order.items?.length || 0}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Total:</strong> ${purchase.order.total?.toFixed(2)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No recent session purchases found to verify
                  </Alert>
                )}
                
                {purchaseFlowIssues.length > 0 && (
                  <Accordion sx={{ mt: 2, backgroundColor: '#2d2d42' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>Purchase Flow Issues</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {purchaseFlowIssues.map((issue, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <WarningIcon sx={{ color: '#f44336' }} />
                            </ListItemIcon>
                            <ListItemText primary={issue} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}

            {/* Data Flow Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>Cross-Platform Data Visualization</Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  This section visualizes how data is shared between client, trainer, and admin dashboards.
                </Alert>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#2d2d42', height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <ShoppingCartIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Cart & Order Flow</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Active Cart Items:</strong> {cartData.length}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Orders:</strong> {orderData.length}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Session Packages Sold:</strong> {
                            orderData.reduce((count, order) => 
                              count + (order.items?.filter((item: any) => 
                                item.type === 'session_package' || 
                                item.category === 'training'
                              ).length || 0), 0)
                          }
                        </Typography>
                      </Box>
                      
                      <Alert 
                        severity={
                          cartData.length > 0 && orderData.length > 0 
                            ? "success" 
                            : "warning"
                        } 
                        sx={{ mb: 1 }}
                      >
                        {cartData.length > 0 && orderData.length > 0 
                          ? "Cart & order systems are operational" 
                          : "Cart or order data may be missing"}
                      </Alert>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#2d2d42', height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <EventIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Session Data Flow</Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Total Sessions:</strong> {sessionData.length}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Available Sessions:</strong> {
                            sessionData.filter(s => s.status === 'available').length
                          }
                        </Typography>
                        <Typography variant="body2">
                          <strong>Booked Sessions:</strong> {
                            sessionData.filter(s => 
                              s.status === 'scheduled' || 
                              s.status === 'confirmed'
                            ).length
                          }
                        </Typography>
                        <Typography variant="body2">
                          <strong>Completed Sessions:</strong> {
                            sessionData.filter(s => s.status === 'completed').length
                          }
                        </Typography>
                      </Box>
                      
                      <Alert 
                        severity={sessionData.length > 0 ? "success" : "warning"} 
                        sx={{ mb: 1 }}
                      >
                        {sessionData.length > 0 
                          ? "Session management is operational" 
                          : "No session data found"}
                      </Alert>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#2d2d42', height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PeopleIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">User Role Distribution</Typography>
                      </Box>
                      
                      {userStats ? (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Clients:</strong> {userStats.clients} ({Math.round(userStats.clients / userStats.total * 100)}%)
                          </Typography>
                          <Typography variant="body2">
                            <strong>Trainers:</strong> {userStats.trainers} ({Math.round(userStats.trainers / userStats.total * 100)}%)
                          </Typography>
                          <Typography variant="body2">
                            <strong>Admins:</strong> {userStats.admins} ({Math.round(userStats.admins / userStats.total * 100)}%)
                          </Typography>
                        </Box>
                      ) : (
                        <Typography>No user statistics available</Typography>
                      )}
                      
                      <Alert 
                        severity={userStats ? "success" : "warning"} 
                        sx={{ mb: 1 }}
                      >
                        {userStats 
                          ? "User management is operational" 
                          : "User data not available"}
                      </Alert>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Data Flow Recommendations</Typography>
                  
                  <List>
                    {sessionData.length === 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                        <ListItemText 
                          primary="No session data found" 
                          secondary="Create available sessions for clients to book" 
                        />
                      </ListItem>
                    )}
                    
                    {sessionData.filter(s => s.status === 'available').length === 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                        <ListItemText 
                          primary="No available sessions" 
                          secondary="Create available session slots for clients to book" 
                        />
                      </ListItem>
                    )}
                    
                    {!userStats || userStats.trainers === 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                        <ListItemText 
                          primary="No trainers found" 
                          secondary="Create trainer accounts to assign to sessions" 
                        />
                      </ListItem>
                    )}
                    
                    {purchaseFlowIssues.length > 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                        <ListItemText 
                          primary={`${purchaseFlowIssues.length} issues in purchase flow`} 
                          secondary="Check the Purchase Flow tab for details" 
                        />
                      </ListItem>
                    )}
                    
                    {connectionIssues.length > 0 && (
                      <ListItem>
                        <ListItemIcon><WarningIcon sx={{ color: '#f44336' }} /></ListItemIcon>
                        <ListItemText 
                          primary={`${connectionIssues.length} API connection issues`} 
                          secondary="Check API endpoints in System Status tab" 
                        />
                      </ListItem>
                    )}
                    
                    {/* If everything seems ok */}
                    {sessionData.length > 0 && 
                     sessionData.filter(s => s.status === 'available').length > 0 &&
                     userStats && userStats.trainers > 0 &&
                     purchaseFlowIssues.length === 0 &&
                     connectionIssues.length === 0 && (
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon sx={{ color: '#4caf50' }} /></ListItemIcon>
                        <ListItemText 
                          primary="All data flow systems appear operational" 
                          secondary="Cart, sessions, and account systems are working correctly" 
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </Box>
            )}

            {/* MCP Server Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>MCP Server Status</Typography>
                
                <Alert 
                  severity={mcpStatus.status === 'connected' ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {mcpStatus.status === 'connected' 
                    ? "MCP Server is connected and operational" 
                    : "MCP Server connection issue detected"}
                </Alert>
                
                {mcpStatus.status === 'connected' ? (
                  <Paper sx={{ p: 2, backgroundColor: '#2d2d42' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>Server Information</Typography>
                        <Typography variant="body2">
                          <strong>Version:</strong> {mcpStatus.data?.version || 'Unknown'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Status:</strong> {mcpStatus.data?.status || 'Unknown'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Uptime:</strong> {mcpStatus.data?.uptime || 'Unknown'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>Available Tools</Typography>
                        {mcpStatus.data?.tools ? (
                          <List dense>
                            {mcpStatus.data.tools.map((tool: any, index: number) => (
                              <ListItem key={index}>
                                <ListItemText 
                                  primary={tool.name} 
                                  secondary={tool.description} 
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography>No tools information available</Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 2, backgroundColor: '#2d2d42' }}>
                    <Typography variant="subtitle1" gutterBottom>Connection Error</Typography>
                    <Typography color="error">
                      {mcpStatus.error || 'Could not connect to MCP server'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Check that the MCP server is running and configured correctly.
                      You can start the MCP server using the command:
                    </Typography>
                    <Box 
                      sx={{ 
                        backgroundColor: '#1a1a2e', 
                        p: 1, 
                        borderRadius: 1, 
                        mt: 1,
                        fontFamily: 'monospace'
                      }}
                    >
                      npm run start-mcp
                    </Box>
                  </Paper>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>MCP Integration Status</Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#2d2d42', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>Workout MCP</Typography>
                        
                        <Alert 
                          severity={
                            mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name === 'generate_workout') 
                              ? "success" 
                              : "warning"
                          }
                          sx={{ mb: 2 }}
                        >
                          {mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name === 'generate_workout')
                            ? "Workout generation is available" 
                            : "Workout generation tools not detected"}
                        </Alert>
                        
                        <Typography variant="body2">
                          The workout MCP server provides AI-powered workout generation, customization, and analysis.
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#2d2d42', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>Gamification MCP</Typography>
                        
                        <Alert 
                          severity={
                            mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name?.includes('gamification')) 
                              ? "success" 
                              : "warning"
                          }
                          sx={{ mb: 2 }}
                        >
                          {mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name?.includes('gamification'))
                            ? "Gamification features are available" 
                            : "Gamification tools not detected"}
                        </Alert>
                        
                        <Typography variant="body2">
                          The gamification MCP server provides achievement tracking, points management, and reward systems.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            )}

            {/* Debug Tools Tab */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom>Debug Tools</Typography>
                
                <Paper sx={{ p: 2, mb: 3, backgroundColor: '#2d2d42' }}>
                  <Typography variant="subtitle1" gutterBottom>Test Custom API Endpoint</Typography>
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
                    <Box sx={{ maxHeight: '300px', overflow: 'auto', backgroundColor: '#1a1a2e', p: 2, borderRadius: 1 }}>
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(testEndpointResult, null, 2)}
                      </pre>
                    </Box>
                  )}
                </Paper>
                
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
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DiagnosticsDashboard;