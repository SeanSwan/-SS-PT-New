import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Bug,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShoppingCart,
  CalendarDays,
  Users,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import GlowButton from '../../../ui/GlowButton';
import axios from 'axios';

/* ──────────────────── Theme tokens ──────────────────── */
const T = {
  bg: 'rgba(15,23,42,0.95)',
  surface: 'rgba(30,30,60,0.85)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  green: '#4caf50',
  red: '#f44336',
  orange: '#ff9800',
  panelBg: 'rgba(45,45,66,0.80)',
  deepBg: 'rgba(13,13,26,0.95)',
} as const;

/* ──────────────────── Animations ──────────────────── */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* ──────────────────── Styled primitives ──────────────────── */

const PageWrapper = styled.div`
  width: 100%;
`;

const GlassPanel = styled.div<{ $bg?: string }>`
  background: ${({ $bg }) => $bg || T.surface};
  border: 1px solid ${T.border};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`;

const FlexRow = styled.div<{ $gap?: string; $justify?: string; $align?: string; $wrap?: string }>`
  display: flex;
  gap: ${({ $gap }) => $gap || '0'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  flex-wrap: ${({ $wrap }) => $wrap || 'nowrap'};
`;

const Heading5 = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${T.cyan};
  margin: 0;
`;

const Heading6 = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 8px 0;
`;

const Subtitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${T.text};
  margin: 0 0 8px 0;
`;

const BigNumber = styled.span<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ $color }) => $color || T.cyan};
  display: block;
  margin-bottom: 4px;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: ${T.textMuted};
  margin: 0;
  line-height: 1.5;
`;

const StrongText = styled.strong`
  color: ${T.text};
`;

/* ── Alert ── */
type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

const alertColors: Record<AlertSeverity, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.4)', text: T.green },
  warning: { bg: 'rgba(255,152,0,0.12)', border: 'rgba(255,152,0,0.4)', text: T.orange },
  error:   { bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.4)', text: T.red },
  info:    { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', text: T.accent },
};

const AlertBox = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
  background: ${({ $severity }) => alertColors[$severity].bg};
  border: 1px solid ${({ $severity }) => alertColors[$severity].border};
  color: ${({ $severity }) => alertColors[$severity].text};
  margin-bottom: 16px;
`;

const AlertIcon: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  const size = 18;
  switch (severity) {
    case 'success': return <CheckCircle2 size={size} />;
    case 'warning': return <AlertTriangle size={size} />;
    case 'error':   return <AlertTriangle size={size} />;
    case 'info':    return <Info size={size} />;
  }
};

/* ── Tabs ── */
const TabBar = styled.div`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  margin-bottom: 16px;
  border-bottom: 1px solid ${T.border};
  padding-bottom: 0;
  -webkit-overflow-scrolling: touch;
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? T.accent : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(14,165,233,0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? T.accent : T.textMuted)};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  border-radius: 6px 6px 0 0;

  &:hover {
    color: ${T.accent};
    background: rgba(14,165,233,0.06);
  }
`;

/* ── Cards / Grid ── */
const CardGrid = styled.div<{ $cols?: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || 'repeat(auto-fit, minmax(220px, 1fr))'};
  gap: 16px;
  margin-bottom: 24px;
`;

const CardPanel = styled.div<{ $bg?: string }>`
  background: ${({ $bg }) => $bg || T.panelBg};
  border: 1px solid ${T.border};
  border-radius: 10px;
  padding: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  height: 100%;
  box-sizing: border-box;
`;

/* ── Accordion / Collapsible ── */
const CollapsibleWrapper = styled.div`
  background: ${T.panelBg};
  border: 1px solid ${T.border};
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`;

const CollapsibleHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: ${T.text};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(14,165,233,0.05);
  }
`;

const CollapsibleChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transition: transform 0.25s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const CollapsibleBody = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 0 16px 16px;
`;

/* ── List ── */
const ListUl = styled.ul<{ $dense?: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListLi = styled.li<{ $dense?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: ${({ $dense }) => ($dense ? '6px 8px' : '10px 0')};
  border-bottom: 1px solid rgba(255,255,255,0.04);
  min-height: ${({ $dense }) => ($dense ? '36px' : '44px')};

  &:last-child {
    border-bottom: none;
  }
`;

const ListIcon = styled.span<{ $minW?: string }>`
  flex-shrink: 0;
  display: inline-flex;
  min-width: ${({ $minW }) => $minW || '24px'};
  padding-top: 2px;
`;

const ListContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListPrimary = styled.span`
  display: block;
  color: ${T.text};
  font-size: 0.875rem;
`;

const ListSecondary = styled.span`
  display: block;
  color: ${T.textMuted};
  font-size: 0.8rem;
  margin-top: 2px;
`;

/* ── Chip ── */
const ChipSpan = styled.span<{ $color?: string; $bg?: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || T.text};
  background: ${({ $bg }) => $bg || T.panelBg};
  white-space: nowrap;
`;

/* ── Input ── */
const StyledInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${T.border};
  background: ${T.deepBg};
  color: ${T.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${T.textMuted};
  }

  &:focus {
    border-color: ${T.accent};
  }
`;

/* ── Spinner ── */
const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${T.border};
  border-top-color: ${T.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SpinnerWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

/* ── Code block ── */
const CodeBlock = styled.div`
  background: ${T.deepBg};
  padding: 12px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  color: ${T.text};
  margin-top: 8px;
  overflow-x: auto;
`;

const PreBlock = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: ${T.text};
  font-size: 0.85rem;
`;

const ErrorText = styled.span`
  color: ${T.red};
`;

/* ── Full-width action ── */
const FullWidthAction = styled.div`
  width: 100%;
  & > button {
    width: 100%;
  }
`;

/* ── Scroll wrapper ── */
const ScrollArea = styled.div<{ $maxH?: string }>`
  max-height: ${({ $maxH }) => $maxH || '300px'};
  overflow: auto;
`;

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

  // Accordion / collapsible open-state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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
  const handleTabChange = (newValue: number) => {
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

  /* ── Tab labels ── */
  const tabLabels = ['System Status', 'Purchase Flow', 'Data Flow', 'MCP Server', 'Debug Tools'];

  return (
    <PageWrapper>
      <GlassPanel $bg={T.bg} style={{ marginBottom: 24 }}>
        {/* Header */}
        <FlexRow $align="center" $gap="10px" style={{ marginBottom: 16 }}>
          <Bug size={30} color={T.cyan} />
          <Heading5>Admin System Diagnostics</Heading5>
        </FlexRow>

        {/* Global status alert */}
        <AlertBox $severity={connectionIssues.length > 0 ? 'warning' : 'success'}>
          <AlertIcon severity={connectionIssues.length > 0 ? 'warning' : 'success'} />
          {connectionIssues.length > 0
            ? `Found ${connectionIssues.length} connection issues`
            : 'All systems operational'}
        </AlertBox>

        {/* Tabs */}
        <TabBar>
          {tabLabels.map((label, idx) => (
            <TabButton
              key={label}
              $active={activeTab === idx}
              onClick={() => handleTabChange(idx)}
            >
              {label}
            </TabButton>
          ))}
        </TabBar>

        {isLoading ? (
          <SpinnerWrap><Spinner /></SpinnerWrap>
        ) : (
          <>
            {/* ════════════ System Status Tab ════════════ */}
            {activeTab === 0 && (
              <div>
                <CardGrid $cols="repeat(auto-fit, minmax(200px, 1fr))">
                  {/* API Status */}
                  <CardPanel>
                    <Heading6>API Status</Heading6>
                    <BigNumber $color={
                      Object.values(apiStatus).every(s => s.ok)
                        ? T.green
                        : T.red
                    }>
                      {Object.values(apiStatus).every(s => s.ok)
                        ? 'Healthy'
                        : 'Issues Detected'}
                    </BigNumber>
                    <BodyText>{Object.keys(apiStatus).length} endpoints checked</BodyText>
                  </CardPanel>

                  {/* MCP Status */}
                  <CardPanel>
                    <Heading6>MCP Server</Heading6>
                    <BigNumber $color={
                      mcpStatus.status === 'connected' ? T.green : T.red
                    }>
                      {mcpStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </BigNumber>
                    <BodyText>{mcpStatus.version || 'Unknown version'}</BodyText>
                  </CardPanel>

                  {/* Orders */}
                  <CardPanel>
                    <Heading6>Orders</Heading6>
                    <BigNumber>{orderData.length}</BigNumber>
                    <BodyText>Total orders in system</BodyText>
                  </CardPanel>

                  {/* Users */}
                  <CardPanel>
                    <Heading6>Users</Heading6>
                    <BigNumber>{userStats?.total || 0}</BigNumber>
                    <BodyText>{userStats?.clients || 0} clients, {userStats?.trainers || 0} trainers</BodyText>
                  </CardPanel>
                </CardGrid>

                {/* API Endpoints accordion */}
                <CollapsibleWrapper>
                  <CollapsibleHeader onClick={() => toggleSection('apiEndpoints')}>
                    <span>API Endpoints</span>
                    <CollapsibleChevron $open={!!openSections['apiEndpoints']}>
                      <ChevronDown size={20} />
                    </CollapsibleChevron>
                  </CollapsibleHeader>
                  <CollapsibleBody $open={!!openSections['apiEndpoints']}>
                    <ListUl>
                      {Object.entries(apiStatus).map(([endpoint, status]) => (
                        <ListLi key={endpoint}>
                          <ListIcon>
                            {status.ok
                              ? <CheckCircle2 size={20} color={T.green} />
                              : <AlertTriangle size={20} color={T.red} />}
                          </ListIcon>
                          <ListContent>
                            <ListPrimary>{endpoint}</ListPrimary>
                            <ListSecondary>
                              {status.ok
                                ? `Connected (${status.status})`
                                : `Error: ${status.statusText || status.error || status.status}`}
                            </ListSecondary>
                          </ListContent>
                        </ListLi>
                      ))}
                    </ListUl>
                  </CollapsibleBody>
                </CollapsibleWrapper>

                {/* Connection Issues accordion */}
                <CollapsibleWrapper>
                  <CollapsibleHeader onClick={() => toggleSection('connIssues')}>
                    <span>Connection Issues</span>
                    <CollapsibleChevron $open={!!openSections['connIssues']}>
                      <ChevronDown size={20} />
                    </CollapsibleChevron>
                  </CollapsibleHeader>
                  <CollapsibleBody $open={!!openSections['connIssues']}>
                    {connectionIssues.length > 0 ? (
                      <ListUl>
                        {connectionIssues.map((issue, index) => (
                          <ListLi key={index}>
                            <ListIcon>
                              <AlertTriangle size={20} color={T.red} />
                            </ListIcon>
                            <ListContent>
                              <ListPrimary>{issue}</ListPrimary>
                            </ListContent>
                          </ListLi>
                        ))}
                      </ListUl>
                    ) : (
                      <BodyText>No connection issues detected</BodyText>
                    )}
                  </CollapsibleBody>
                </CollapsibleWrapper>

                <FullWidthAction>
                  <GlowButton
                    variant="primary"
                    onClick={refreshDebugData}
                    style={{ width: '100%' }}
                  >
                    <FlexRow $align="center" $gap="8px" $justify="center">
                      <RefreshCw size={16} />
                      Refresh System Status
                    </FlexRow>
                  </GlowButton>
                </FullWidthAction>
              </div>
            )}

            {/* ════════════ Purchase Flow Tab ════════════ */}
            {activeTab === 1 && (
              <div>
                <AlertBox $severity={purchaseFlowIssues.length > 0 ? 'warning' : 'success'}>
                  <AlertIcon severity={purchaseFlowIssues.length > 0 ? 'warning' : 'success'} />
                  {purchaseFlowIssues.length > 0
                    ? `Found ${purchaseFlowIssues.length} issues in the purchase flow`
                    : 'Purchase flow appears to be working correctly'}
                </AlertBox>

                <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
                  <Heading6 style={{ marginBottom: 0 }}>Session Purchase Verification</Heading6>
                  <GlowButton
                    variant="primary"
                    onClick={testPurchaseFlow}
                    disabled={isTestingPurchaseFlow}
                  >
                    {isTestingPurchaseFlow ? 'Testing...' : 'Test Session Purchase Flow'}
                  </GlowButton>
                </FlexRow>

                {/* Purchase Flow Test Results */}
                {purchaseFlowLog.length > 0 && (
                  <GlassPanel $bg={T.deepBg} style={{ marginBottom: 24 }}>
                    <Subtitle>Purchase Flow Test Results</Subtitle>
                    <ListUl $dense>
                      {purchaseFlowLog.map((log, index) => (
                        <ListLi key={index} $dense>
                          <ListIcon $minW="22px">
                            {log.status === 'success' && <CheckCircle2 size={18} color={T.green} />}
                            {log.status === 'warning' && <Info size={18} color={T.orange} />}
                            {log.status === 'error' && <AlertTriangle size={18} color={T.red} />}
                          </ListIcon>
                          <ListContent>
                            <ListPrimary>
                              <FlexRow $align="center" $gap="8px">
                                <ChipSpan $bg={T.panelBg}>{log.step}</ChipSpan>
                                <span>{log.message}</span>
                              </FlexRow>
                            </ListPrimary>
                            <ListSecondary>{log.timestamp.toLocaleTimeString()}</ListSecondary>
                          </ListContent>
                        </ListLi>
                      ))}
                    </ListUl>
                  </GlassPanel>
                )}

                <Heading6>Recent Session Purchases</Heading6>

                {recentPurchases.length > 0 ? (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {recentPurchases.map((purchase, index) => (
                      <GlassPanel key={index} $bg={T.panelBg}>
                        <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 8 }}>
                          <Subtitle style={{ marginBottom: 0 }}>
                            Order #{purchase.order.id}
                          </Subtitle>
                          <ChipSpan
                            $color={purchase.isCorrect ? T.green : T.red}
                            $bg={purchase.isCorrect ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)'}
                          >
                            {purchase.isCorrect ? 'Sessions Added' : 'Issue Detected'}
                          </ChipSpan>
                        </FlexRow>

                        <CardGrid $cols="repeat(auto-fit, minmax(180px, 1fr))">
                          <div>
                            <BodyText>
                              <StrongText>Client:</StrongText> {purchase.user.firstName} {purchase.user.lastName}
                            </BodyText>
                            <BodyText>
                              <StrongText>Date:</StrongText> {new Date(purchase.order.createdAt).toLocaleString()}
                            </BodyText>
                          </div>
                          <div>
                            <BodyText>
                              <StrongText>Sessions Before:</StrongText> {purchase.sessionCountBefore}
                            </BodyText>
                            <BodyText>
                              <StrongText>Sessions After:</StrongText> {purchase.sessionCountAfter}
                            </BodyText>
                          </div>
                          <div>
                            <BodyText>
                              <StrongText>Items:</StrongText> {purchase.order.items?.length || 0}
                            </BodyText>
                            <BodyText>
                              <StrongText>Total:</StrongText> ${purchase.order.total?.toFixed(2)}
                            </BodyText>
                          </div>
                        </CardGrid>
                      </GlassPanel>
                    ))}
                  </div>
                ) : (
                  <AlertBox $severity="info">
                    <AlertIcon severity="info" />
                    No recent session purchases found to verify
                  </AlertBox>
                )}

                {purchaseFlowIssues.length > 0 && (
                  <CollapsibleWrapper style={{ marginTop: 16 }}>
                    <CollapsibleHeader onClick={() => toggleSection('purchaseIssues')}>
                      <span>Purchase Flow Issues</span>
                      <CollapsibleChevron $open={!!openSections['purchaseIssues']}>
                        <ChevronDown size={20} />
                      </CollapsibleChevron>
                    </CollapsibleHeader>
                    <CollapsibleBody $open={!!openSections['purchaseIssues']}>
                      <ListUl>
                        {purchaseFlowIssues.map((issue, index) => (
                          <ListLi key={index}>
                            <ListIcon>
                              <AlertTriangle size={20} color={T.red} />
                            </ListIcon>
                            <ListContent>
                              <ListPrimary>{issue}</ListPrimary>
                            </ListContent>
                          </ListLi>
                        ))}
                      </ListUl>
                    </CollapsibleBody>
                  </CollapsibleWrapper>
                )}
              </div>
            )}

            {/* ════════════ Data Flow Tab ════════════ */}
            {activeTab === 2 && (
              <div>
                <Heading6>Cross-Platform Data Visualization</Heading6>
                <AlertBox $severity="info">
                  <AlertIcon severity="info" />
                  This section visualizes how data is shared between client, trainer, and admin dashboards.
                </AlertBox>

                <CardGrid $cols="repeat(auto-fit, minmax(260px, 1fr))">
                  {/* Cart & Order Flow */}
                  <CardPanel>
                    <FlexRow $align="center" $gap="8px" style={{ marginBottom: 16 }}>
                      <ShoppingCart size={20} color={T.text} />
                      <Heading6 style={{ marginBottom: 0 }}>Cart &amp; Order Flow</Heading6>
                    </FlexRow>

                    <div style={{ marginBottom: 12 }}>
                      <BodyText><StrongText>Active Cart Items:</StrongText> {cartData.length}</BodyText>
                      <BodyText><StrongText>Orders:</StrongText> {orderData.length}</BodyText>
                      <BodyText>
                        <StrongText>Session Packages Sold:</StrongText>{' '}
                        {orderData.reduce((count, order) =>
                          count + (order.items?.filter((item: any) =>
                            item.type === 'session_package' ||
                            item.category === 'training'
                          ).length || 0), 0)}
                      </BodyText>
                    </div>

                    <AlertBox
                      $severity={
                        cartData.length > 0 && orderData.length > 0
                          ? 'success'
                          : 'warning'
                      }
                    >
                      <AlertIcon severity={cartData.length > 0 && orderData.length > 0 ? 'success' : 'warning'} />
                      {cartData.length > 0 && orderData.length > 0
                        ? 'Cart & order systems are operational'
                        : 'Cart or order data may be missing'}
                    </AlertBox>
                  </CardPanel>

                  {/* Session Data Flow */}
                  <CardPanel>
                    <FlexRow $align="center" $gap="8px" style={{ marginBottom: 16 }}>
                      <CalendarDays size={20} color={T.text} />
                      <Heading6 style={{ marginBottom: 0 }}>Session Data Flow</Heading6>
                    </FlexRow>

                    <div style={{ marginBottom: 12 }}>
                      <BodyText><StrongText>Total Sessions:</StrongText> {sessionData.length}</BodyText>
                      <BodyText>
                        <StrongText>Available Sessions:</StrongText>{' '}
                        {sessionData.filter(s => s.status === 'available').length}
                      </BodyText>
                      <BodyText>
                        <StrongText>Booked Sessions:</StrongText>{' '}
                        {sessionData.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length}
                      </BodyText>
                      <BodyText>
                        <StrongText>Completed Sessions:</StrongText>{' '}
                        {sessionData.filter(s => s.status === 'completed').length}
                      </BodyText>
                    </div>

                    <AlertBox $severity={sessionData.length > 0 ? 'success' : 'warning'}>
                      <AlertIcon severity={sessionData.length > 0 ? 'success' : 'warning'} />
                      {sessionData.length > 0
                        ? 'Session management is operational'
                        : 'No session data found'}
                    </AlertBox>
                  </CardPanel>

                  {/* User Role Distribution */}
                  <CardPanel>
                    <FlexRow $align="center" $gap="8px" style={{ marginBottom: 16 }}>
                      <Users size={20} color={T.text} />
                      <Heading6 style={{ marginBottom: 0 }}>User Role Distribution</Heading6>
                    </FlexRow>

                    {userStats ? (
                      <div style={{ marginBottom: 12 }}>
                        <BodyText>
                          <StrongText>Clients:</StrongText> {userStats.clients} ({Math.round(userStats.clients / userStats.total * 100)}%)
                        </BodyText>
                        <BodyText>
                          <StrongText>Trainers:</StrongText> {userStats.trainers} ({Math.round(userStats.trainers / userStats.total * 100)}%)
                        </BodyText>
                        <BodyText>
                          <StrongText>Admins:</StrongText> {userStats.admins} ({Math.round(userStats.admins / userStats.total * 100)}%)
                        </BodyText>
                      </div>
                    ) : (
                      <BodyText>No user statistics available</BodyText>
                    )}

                    <AlertBox $severity={userStats ? 'success' : 'warning'}>
                      <AlertIcon severity={userStats ? 'success' : 'warning'} />
                      {userStats
                        ? 'User management is operational'
                        : 'User data not available'}
                    </AlertBox>
                  </CardPanel>
                </CardGrid>

                <div style={{ marginTop: 24 }}>
                  <Heading6>Data Flow Recommendations</Heading6>

                  <ListUl>
                    {sessionData.length === 0 && (
                      <ListLi>
                        <ListIcon><AlertTriangle size={20} color={T.red} /></ListIcon>
                        <ListContent>
                          <ListPrimary>No session data found</ListPrimary>
                          <ListSecondary>Create available sessions for clients to book</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}

                    {sessionData.filter(s => s.status === 'available').length === 0 && (
                      <ListLi>
                        <ListIcon><AlertTriangle size={20} color={T.red} /></ListIcon>
                        <ListContent>
                          <ListPrimary>No available sessions</ListPrimary>
                          <ListSecondary>Create available session slots for clients to book</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}

                    {!userStats || userStats.trainers === 0 && (
                      <ListLi>
                        <ListIcon><AlertTriangle size={20} color={T.red} /></ListIcon>
                        <ListContent>
                          <ListPrimary>No trainers found</ListPrimary>
                          <ListSecondary>Create trainer accounts to assign to sessions</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}

                    {purchaseFlowIssues.length > 0 && (
                      <ListLi>
                        <ListIcon><AlertTriangle size={20} color={T.red} /></ListIcon>
                        <ListContent>
                          <ListPrimary>{purchaseFlowIssues.length} issues in purchase flow</ListPrimary>
                          <ListSecondary>Check the Purchase Flow tab for details</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}

                    {connectionIssues.length > 0 && (
                      <ListLi>
                        <ListIcon><AlertTriangle size={20} color={T.red} /></ListIcon>
                        <ListContent>
                          <ListPrimary>{connectionIssues.length} API connection issues</ListPrimary>
                          <ListSecondary>Check API endpoints in System Status tab</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}

                    {/* If everything seems ok */}
                    {sessionData.length > 0 &&
                     sessionData.filter(s => s.status === 'available').length > 0 &&
                     userStats && userStats.trainers > 0 &&
                     purchaseFlowIssues.length === 0 &&
                     connectionIssues.length === 0 && (
                      <ListLi>
                        <ListIcon><CheckCircle2 size={20} color={T.green} /></ListIcon>
                        <ListContent>
                          <ListPrimary>All data flow systems appear operational</ListPrimary>
                          <ListSecondary>Cart, sessions, and account systems are working correctly</ListSecondary>
                        </ListContent>
                      </ListLi>
                    )}
                  </ListUl>
                </div>
              </div>
            )}

            {/* ════════════ MCP Server Tab ════════════ */}
            {activeTab === 3 && (
              <div>
                <Heading6>MCP Server Status</Heading6>

                <AlertBox $severity={mcpStatus.status === 'connected' ? 'success' : 'error'}>
                  <AlertIcon severity={mcpStatus.status === 'connected' ? 'success' : 'error'} />
                  {mcpStatus.status === 'connected'
                    ? 'MCP Server is connected and operational'
                    : 'MCP Server connection issue detected'}
                </AlertBox>

                {mcpStatus.status === 'connected' ? (
                  <GlassPanel $bg={T.panelBg}>
                    <CardGrid $cols="1fr 1fr">
                      <div>
                        <Subtitle>Server Information</Subtitle>
                        <BodyText><StrongText>Version:</StrongText> {mcpStatus.data?.version || 'Unknown'}</BodyText>
                        <BodyText><StrongText>Status:</StrongText> {mcpStatus.data?.status || 'Unknown'}</BodyText>
                        <BodyText><StrongText>Uptime:</StrongText> {mcpStatus.data?.uptime || 'Unknown'}</BodyText>
                      </div>

                      <div>
                        <Subtitle>Available Tools</Subtitle>
                        {mcpStatus.data?.tools ? (
                          <ListUl $dense>
                            {mcpStatus.data.tools.map((tool: any, index: number) => (
                              <ListLi key={index} $dense>
                                <ListContent>
                                  <ListPrimary>{tool.name}</ListPrimary>
                                  <ListSecondary>{tool.description}</ListSecondary>
                                </ListContent>
                              </ListLi>
                            ))}
                          </ListUl>
                        ) : (
                          <BodyText>No tools information available</BodyText>
                        )}
                      </div>
                    </CardGrid>
                  </GlassPanel>
                ) : (
                  <GlassPanel $bg={T.panelBg}>
                    <Subtitle>Connection Error</Subtitle>
                    <ErrorText>{mcpStatus.error || 'Could not connect to MCP server'}</ErrorText>
                    <BodyText style={{ marginTop: 8 }}>
                      Check that the MCP server is running and configured correctly.
                      You can start the MCP server using the command:
                    </BodyText>
                    <CodeBlock>npm run start-mcp</CodeBlock>
                  </GlassPanel>
                )}

                <div style={{ marginTop: 24 }}>
                  <Heading6>MCP Integration Status</Heading6>

                  <CardGrid $cols="1fr 1fr">
                    {/* Workout MCP */}
                    <CardPanel>
                      <Subtitle>Workout MCP</Subtitle>

                      <AlertBox
                        $severity={
                          mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name === 'generate_workout')
                            ? 'success'
                            : 'warning'
                        }
                      >
                        <AlertIcon severity={
                          mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name === 'generate_workout')
                            ? 'success'
                            : 'warning'
                        } />
                        {mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name === 'generate_workout')
                          ? 'Workout generation is available'
                          : 'Workout generation tools not detected'}
                      </AlertBox>

                      <BodyText>
                        The workout MCP server provides AI-powered workout generation, customization, and analysis.
                      </BodyText>
                    </CardPanel>

                    {/* Gamification MCP */}
                    <CardPanel>
                      <Subtitle>Gamification MCP</Subtitle>

                      <AlertBox
                        $severity={
                          mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name?.includes('gamification'))
                            ? 'success'
                            : 'warning'
                        }
                      >
                        <AlertIcon severity={
                          mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name?.includes('gamification'))
                            ? 'success'
                            : 'warning'
                        } />
                        {mcpStatus.status === 'connected' && mcpStatus.data?.tools?.some((t: any) => t.name?.includes('gamification'))
                          ? 'Gamification features are available'
                          : 'Gamification tools not detected'}
                      </AlertBox>

                      <BodyText>
                        The gamification MCP server provides achievement tracking, points management, and reward systems.
                      </BodyText>
                    </CardPanel>
                  </CardGrid>
                </div>
              </div>
            )}

            {/* ════════════ Debug Tools Tab ════════════ */}
            {activeTab === 4 && (
              <div>
                <Heading6>Debug Tools</Heading6>

                <GlassPanel $bg={T.panelBg} style={{ marginBottom: 24 }}>
                  <Subtitle>Test Custom API Endpoint</Subtitle>
                  <FlexRow $gap="8px" style={{ marginBottom: 16 }}>
                    <StyledInput
                      value={testEndpointUrl}
                      onChange={(e) => setTestEndpointUrl(e.target.value)}
                      placeholder="/api/example"
                    />
                    <GlowButton
                      variant="primary"
                      onClick={testEndpoint}
                    >
                      Test
                    </GlowButton>
                  </FlexRow>

                  {testEndpointError && (
                    <AlertBox $severity="error">
                      <AlertIcon severity="error" />
                      {testEndpointError}
                    </AlertBox>
                  )}

                  {testEndpointResult && (
                    <ScrollArea $maxH="300px">
                      <CodeBlock>
                        <PreBlock>{JSON.stringify(testEndpointResult, null, 2)}</PreBlock>
                      </CodeBlock>
                    </ScrollArea>
                  )}
                </GlassPanel>

                <CollapsibleWrapper>
                  <CollapsibleHeader onClick={() => toggleSection('debugLog')}>
                    <span>Debug Log</span>
                    <CollapsibleChevron $open={!!openSections['debugLog']}>
                      <ChevronDown size={20} />
                    </CollapsibleChevron>
                  </CollapsibleHeader>
                  <CollapsibleBody $open={!!openSections['debugLog']}>
                    <ScrollArea $maxH="300px">
                      {debugLogs.map((log, index) => (
                        <div key={index} style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: 4, color: T.textMuted }}>
                          {log}
                        </div>
                      ))}
                    </ScrollArea>
                  </CollapsibleBody>
                </CollapsibleWrapper>
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </PageWrapper>
  );
};

export default DiagnosticsDashboard;
