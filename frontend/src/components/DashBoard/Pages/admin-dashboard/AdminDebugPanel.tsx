import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  CalendarDays,
  Users,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

// Import GlowButton to ensure consistent styling
import GlowButton from '../../../ui/GlowButton';

/* ------------------------------------------------------------------ */
/*  Galaxy-Swan Theme Tokens                                          */
/* ------------------------------------------------------------------ */
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgDeep: '#1a1a2e',
  bgSection: '#2d2d42',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  success: '#4caf50',
  warning: '#f59e0b',
  error: '#f44336',
};

/* ------------------------------------------------------------------ */
/*  Keyframes                                                         */
/* ------------------------------------------------------------------ */
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* ------------------------------------------------------------------ */
/*  Styled Components                                                 */
/* ------------------------------------------------------------------ */
const Wrapper = styled.div`
  margin-bottom: 1.5rem;
`;

const GlassPanel = styled.div<{ $bg?: string }>`
  background: ${({ $bg }) => $bg || theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: ${theme.text};
`;

const FlexRow = styled.div<{ $gap?: string; $mb?: string; $justify?: string; $align?: string }>`
  display: flex;
  gap: ${({ $gap }) => $gap || '0.5rem'};
  margin-bottom: ${({ $mb }) => $mb || '0'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
`;

const Heading = styled.h2`
  font-size: 1.35rem;
  font-weight: 600;
  color: ${theme.cyan};
  margin: 0;
`;

const Subtitle = styled.p<{ $mb?: string }>`
  font-size: 0.9rem;
  color: ${theme.textMuted};
  margin: 0 0 ${({ $mb }) => $mb || '0.5rem'} 0;
`;

const SmallHeading = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 0.5rem 0;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: ${theme.text};
  margin: 0;
`;

/* ---------- Alert Box ---------- */
interface AlertBoxProps {
  $severity: 'success' | 'error' | 'warning' | 'info';
}

const severityColors: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.4)', text: '#66bb6a' },
  error:   { bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.4)', text: '#ef5350' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#f59e0b' },
  info:    { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', text: '#38bdf8' },
};

const AlertBox = styled.div<AlertBoxProps>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${({ $severity }) => severityColors[$severity].bg};
  border: 1px solid ${({ $severity }) => severityColors[$severity].border};
  color: ${({ $severity }) => severityColors[$severity].text};
`;

/* ---------- Spinner ---------- */
const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${theme.border};
  border-top-color: ${theme.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/* ---------- Collapsible (Accordion replacement) ---------- */
const CollapsibleWrapper = styled.div`
  background: ${theme.bgSection};
  border: 1px solid ${theme.border};
  border-radius: 10px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`;

const CollapsibleHeader = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: ${theme.text};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  svg:last-child {
    transition: transform 0.25s ease;
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
    flex-shrink: 0;
  }
`;

const CollapsibleBody = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 0 1rem 1rem 1rem;
  color: ${theme.text};
`;

/* ---------- Table ---------- */
const TableScroll = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: ${theme.textMuted};
  border-bottom: 1px solid ${theme.border};
  font-weight: 600;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: ${theme.text};
`;

/* ---------- Chip ---------- */
interface ChipStyledProps {
  $variant: 'success' | 'warning' | 'error';
}

const chipColors: Record<string, { bg: string; text: string }> = {
  success: { bg: 'rgba(76,175,80,0.2)', text: '#66bb6a' },
  warning: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  error:   { bg: 'rgba(244,67,54,0.2)', text: '#ef5350' },
};

const StyledChip = styled.span<ChipStyledProps>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $variant }) => chipColors[$variant].bg};
  color: ${({ $variant }) => chipColors[$variant].text};
`;

/* ---------- Grid ---------- */
const GridRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

/* ---------- List ---------- */
const ListWrapper = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledListItem = styled.li`
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const ListPrimary = styled.span<{ $color?: string }>`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ $color }) => $color || theme.text};
`;

const ListSecondary = styled.span`
  display: block;
  font-size: 0.8rem;
  color: ${theme.textMuted};
  margin-top: 2px;
`;

/* ---------- Input ---------- */
const TextInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  margin-right: 0.5rem;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }
`;

/* ---------- Divider ---------- */
const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 1rem 0;
`;

/* ---------- Pre (code block) ---------- */
const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  color: ${theme.text};
  overflow: auto;
  max-height: 200px;
  margin: 0;
`;

/* ---------- Log line ---------- */
const LogLine = styled.div`
  font-family: monospace;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: ${theme.textMuted};
`;

const LogScroll = styled.div`
  max-height: 300px;
  overflow: auto;
`;

/* ------------------------------------------------------------------ */
/*  Collapsible helper component                                      */
/* ------------------------------------------------------------------ */
interface CollapsibleProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Collapsible: React.FC<CollapsibleProps> = ({ icon, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <CollapsibleWrapper>
      <CollapsibleHeader $open={open} onClick={() => setOpen((v) => !v)}>
        <FlexRow $align="center" $gap="0.5rem">
          {icon}
          <span>{title}</span>
        </FlexRow>
        <ChevronDown size={18} />
      </CollapsibleHeader>
      <CollapsibleBody $open={open}>{children}</CollapsibleBody>
    </CollapsibleWrapper>
  );
};

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

  // Helper to determine chip variant from flow status
  const chipVariant = (status: string): 'success' | 'warning' | 'error' => {
    if (status === 'Complete') return 'success';
    if (status.includes('Partial')) return 'warning';
    return 'error';
  };

  return (
    <Wrapper>
      <GlassPanel $bg={theme.bgDeep}>
        <FlexRow $align="center" $mb="0.75rem" $gap="0.5rem">
          <Bug size={28} color={theme.cyan} />
          <Heading>Admin System Diagnostic Dashboard</Heading>
        </FlexRow>

        <Subtitle $mb="1rem">
          This diagnostic tool focuses on session purchase and data synchronization across dashboards.
        </Subtitle>

        {isLoading ? (
          <FlexRow $justify="center" style={{ padding: '2rem 0' }}>
            <Spinner />
          </FlexRow>
        ) : (
          <>
            {/* Status alerts */}
            <FlexRow $gap="0.75rem" $mb="1rem">
              <AlertBox $severity={connectionIssues.length > 0 ? 'error' : 'success'}>
                {connectionIssues.length > 0
                  ? <AlertTriangle size={18} />
                  : <CheckCircle2 size={18} />}
                {connectionIssues.length > 0
                  ? `${connectionIssues.length} API Connection Issues`
                  : 'All API endpoints connected'}
              </AlertBox>

              <AlertBox $severity={dataFlowIssues.length > 0 ? 'warning' : 'success'}>
                {dataFlowIssues.length > 0
                  ? <AlertTriangle size={18} />
                  : <CheckCircle2 size={18} />}
                {dataFlowIssues.length > 0
                  ? `${dataFlowIssues.length} Data Flow Issues`
                  : 'Data flow is healthy'}
              </AlertBox>
            </FlexRow>

            {/* Action buttons */}
            <FlexRow $gap="0.75rem" $mb="1rem">
              <GlowButton
                variant="primary"
                onClick={refreshDebugData}
                style={{ flex: 1 }}
              >
                <RefreshCw size={16} style={{ marginRight: 6 }} />
                Refresh Diagnostics
              </GlowButton>

              <GlowButton
                variant="secondary"
                onClick={syncSessionsAcrossDashboards}
                style={{ flex: 1 }}
              >
                Force Session Sync
              </GlowButton>
            </FlexRow>

            {/* Session Purchase Flow Analysis */}
            <Collapsible
              icon={<CalendarDays size={18} color={theme.textMuted} />}
              title="Session Purchase Flow Analysis"
            >
              <Subtitle>
                This analysis tracks how sessions purchases flow through your system
              </Subtitle>

              {sessionPurchaseFlow.length > 0 ? (
                <TableScroll>
                  <StyledTable>
                    <thead>
                      <tr>
                        <Th>Order ID</Th>
                        <Th>Date</Th>
                        <Th>Package</Th>
                        <Th>Client</Th>
                        <Th>Sessions Credited</Th>
                        <Th>Sessions Scheduled</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionPurchaseFlow.map((flow, index) => (
                        <tr key={index}>
                          <Td>{flow.orderId}</Td>
                          <Td>{new Date(flow.orderDate).toLocaleDateString()}</Td>
                          <Td>{flow.packageName}</Td>
                          <Td>{flow.clientName}</Td>
                          <Td>
                            {flow.sessionsCredited
                              ? <CheckCircle2 size={18} color={theme.success} />
                              : <AlertTriangle size={18} color={theme.error} />}
                          </Td>
                          <Td>{flow.sessionsScheduled}</Td>
                          <Td>
                            <StyledChip $variant={chipVariant(flow.status)}>
                              {flow.status}
                            </StyledChip>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </StyledTable>
                </TableScroll>
              ) : (
                <BodyText>No session purchases found to analyze</BodyText>
              )}
            </Collapsible>

            {/* Cart & Order System Status */}
            <Collapsible
              icon={<ShoppingCart size={18} color={theme.textMuted} />}
              title="Cart & Order System Status"
            >
              <GridRow>
                <div>
                  <SmallHeading>Cart System Status</SmallHeading>
                  <ListWrapper>
                    <StyledListItem>
                      <ListPrimary $color={apiStatus['/api/cart']?.ok ? theme.success : theme.error}>
                        API Connection
                      </ListPrimary>
                      <ListSecondary>
                        {apiStatus['/api/cart']?.ok ? 'Connected' : 'Disconnected'}
                      </ListSecondary>
                    </StyledListItem>
                    <StyledListItem>
                      <ListPrimary>Active Cart Items</ListPrimary>
                      <ListSecondary>{cartData.length.toString()}</ListSecondary>
                    </StyledListItem>
                    <StyledListItem>
                      <ListPrimary>Session Packages in Cart</ListPrimary>
                      <ListSecondary>
                        {cartData.filter((item: any) => item.itemType === 'training').length.toString()}
                      </ListSecondary>
                    </StyledListItem>
                  </ListWrapper>
                </div>

                <div>
                  <SmallHeading>Order System Status</SmallHeading>
                  <ListWrapper>
                    <StyledListItem>
                      <ListPrimary $color={apiStatus['/api/orders']?.ok ? theme.success : theme.error}>
                        API Connection
                      </ListPrimary>
                      <ListSecondary>
                        {apiStatus['/api/orders']?.ok ? 'Connected' : 'Disconnected'}
                      </ListSecondary>
                    </StyledListItem>
                    <StyledListItem>
                      <ListPrimary>Total Orders</ListPrimary>
                      <ListSecondary>{orderData.length.toString()}</ListSecondary>
                    </StyledListItem>
                    <StyledListItem>
                      <ListPrimary>Orders with Sessions</ListPrimary>
                      <ListSecondary>
                        {orderData.filter(order =>
                          order.items?.some((item: any) => item.itemType === 'training')
                        ).length.toString()}
                      </ListSecondary>
                    </StyledListItem>
                  </ListWrapper>
                </div>
              </GridRow>
            </Collapsible>

            {/* Cross-Dashboard Data Status */}
            <Collapsible
              icon={<Users size={18} color={theme.textMuted} />}
              title="Cross-Dashboard Data Status"
            >
              <Subtitle>
                Session data visibility across different dashboard views
              </Subtitle>

              <TableScroll>
                <StyledTable>
                  <thead>
                    <tr>
                      <Th>Dashboard</Th>
                      <Th>Session Visibility</Th>
                      <Th>Update Method</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>Admin</Td>
                      <Td>All sessions</Td>
                      <Td>Real-time API</Td>
                      <Td>
                        <StyledChip $variant={apiStatus['/api/sessions']?.ok ? 'success' : 'error'}>
                          {apiStatus['/api/sessions']?.ok ? 'Connected' : 'Error'}
                        </StyledChip>
                      </Td>
                    </tr>
                    <tr>
                      <Td>Client</Td>
                      <Td>User's sessions only</Td>
                      <Td>Filtered API</Td>
                      <Td>
                        <StyledChip $variant={apiStatus['/api/sessions']?.ok ? 'success' : 'error'}>
                          {apiStatus['/api/sessions']?.ok ? 'Connected' : 'Error'}
                        </StyledChip>
                      </Td>
                    </tr>
                    <tr>
                      <Td>Trainer</Td>
                      <Td>Assigned sessions only</Td>
                      <Td>Filtered API</Td>
                      <Td>
                        <StyledChip $variant={apiStatus['/api/sessions']?.ok ? 'success' : 'error'}>
                          {apiStatus['/api/sessions']?.ok ? 'Connected' : 'Error'}
                        </StyledChip>
                      </Td>
                    </tr>
                  </tbody>
                </StyledTable>
              </TableScroll>

              <StyledDivider />

              <SmallHeading>Detected Data Flow Issues</SmallHeading>

              {dataFlowIssues.length > 0 ? (
                <ListWrapper>
                  {dataFlowIssues.map((issue, index) => (
                    <StyledListItem key={index}>
                      <ListPrimary>{issue}</ListPrimary>
                    </StyledListItem>
                  ))}
                </ListWrapper>
              ) : (
                <BodyText>No data flow issues detected</BodyText>
              )}
            </Collapsible>

            {/* Test Custom Endpoint */}
            <Collapsible title="Test Custom Endpoint">
              <FlexRow $mb="0.75rem">
                <TextInput
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
                <AlertBox $severity="error" style={{ marginBottom: '0.75rem' }}>
                  {testEndpointError}
                </AlertBox>
              )}

              {testEndpointResult && (
                <CodeBlock>
                  {JSON.stringify(testEndpointResult, null, 2)}
                </CodeBlock>
              )}
            </Collapsible>

            {/* Debug Log */}
            <Collapsible title="Debug Log">
              <LogScroll>
                {debugLogs.map((log, index) => (
                  <LogLine key={index}>{log}</LogLine>
                ))}
              </LogScroll>
            </Collapsible>
          </>
        )}
      </GlassPanel>
    </Wrapper>
  );
};

export default AdminDebugPanel;