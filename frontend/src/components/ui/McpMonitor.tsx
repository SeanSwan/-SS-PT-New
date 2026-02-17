/**
 * MCP Monitor Component
 *
 * A diagnostic component for monitoring MCP server health
 * and connection status. Useful for admin dashboards.
 *
 * Architecture: styled-components + lucide-react (Galaxy-Swan dark theme)
 * No MUI dependencies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Server,
  Trophy,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  ChevronDown
} from 'lucide-react';
import { MCP_CONFIG } from '../../config/env-config';
import { checkMcpServersStatus, McpServerStatus } from '../../utils/mcp-utils';
import { isMcpAuthenticated } from '../../utils/mcp-auth';

// ─── Types / Interfaces ──────────────────────────────────────────────

interface McpServerHealthData {
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  uptime: string;
  lastCheck: Date;
  apiVersion?: string;
  errors: any[];
  recentRequests: number;
}

interface McpMonitorProps {
  variant?: 'full' | 'compact';
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: McpServerStatus) => void;
}

// ─── Galaxy-Swan Theme Tokens ────────────────────────────────────────

const theme = {
  bg: 'rgba(15, 23, 42, 0.95)',
  bgCard: 'rgba(15, 23, 42, 0.8)',
  border: 'rgba(14, 165, 233, 0.2)',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#0ea5e9',
  success: '#00c853',
  warning: '#ff9800',
  error: '#f44336',
  successBg: 'rgba(0, 200, 83, 0.1)',
  successBorder: 'rgba(0, 200, 83, 0.3)',
  warningBg: 'rgba(255, 152, 0, 0.1)',
  warningBorder: 'rgba(255, 152, 0, 0.3)',
  errorBg: 'rgba(244, 67, 54, 0.1)',
  errorBorder: 'rgba(244, 67, 54, 0.3)',
} as const;

// ─── Animations ──────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────

const PanelWrapper = styled.div`
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 24px;
  color: ${theme.text};
`;

const CompactPanelWrapper = styled(PanelWrapper)`
  padding: 16px;
`;

const FlexRow = styled.div<{ $justify?: string; $gap?: string; $mb?: string; $mt?: string }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: ${({ $gap }) => $gap || '8px'};
  ${({ $mb }) => $mb && css`margin-bottom: ${$mb};`}
  ${({ $mt }) => $mt && css`margin-top: ${$mt};`}
`;

const GridTwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridTwoColFull = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Heading5 = styled.h2`
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0;
  color: ${theme.text};
`;

const Heading6 = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: ${theme.text};
`;

const Subtitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.text};
`;

const BodyText = styled.p<{ $muted?: boolean }>`
  font-size: 0.875rem;
  margin: 0;
  color: ${({ $muted }) => $muted ? theme.muted : theme.text};
`;

const CaptionText = styled.span<{ $muted?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $muted }) => $muted ? theme.muted : theme.text};
`;

const ErrorText = styled.span`
  font-size: 1rem;
  color: ${theme.error};
`;

const StyledButton = styled.button<{ $variant?: 'outlined' | 'default'; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: ${({ $small }) => $small ? '6px 16px' : '10px 20px'};
  border-radius: 8px;
  font-size: ${({ $small }) => $small ? '0.8125rem' : '0.875rem'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${theme.accent};
  background: ${({ $variant }) => $variant === 'outlined' ? 'transparent' : 'rgba(14, 165, 233, 0.1)'};
  border: 1px solid ${({ $variant }) => $variant === 'outlined' ? theme.accent : 'rgba(14, 165, 233, 0.3)'};

  &:hover:not(:disabled) {
    background: rgba(14, 165, 233, 0.2);
    border-color: ${theme.accent};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg.spinning {
    animation: ${spin} 1s linear infinite;
  }
`;

interface StatusChipProps {
  $status: 'success' | 'error' | 'warning';
}

const statusChipColors: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: theme.successBg, border: theme.successBorder, text: theme.success },
  error: { bg: theme.errorBg, border: theme.errorBorder, text: theme.error },
  warning: { bg: theme.warningBg, border: theme.warningBorder, text: theme.warning },
};

const StatusChip = styled.span<StatusChipProps>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
  background: ${({ $status }) => statusChipColors[$status].bg};
  border: 1px solid ${({ $status }) => statusChipColors[$status].border};
  color: ${({ $status }) => statusChipColors[$status].text};
`;

const ServerCard = styled.div<{ $online?: boolean; $health?: 'healthy' | 'degraded' | 'offline' }>`
  background: ${({ $online, $health }) => {
    if (!$online) return theme.errorBg;
    if ($health === 'healthy') return 'rgba(0, 200, 83, 0.05)';
    if ($health === 'degraded') return 'rgba(255, 152, 0, 0.05)';
    return theme.errorBg;
  }};
  border: 1px solid ${({ $online, $health }) => {
    if (!$online) return theme.errorBorder;
    if ($health === 'healthy') return 'rgba(0, 200, 83, 0.2)';
    if ($health === 'degraded') return 'rgba(255, 152, 0, 0.2)';
    return theme.errorBorder;
  }};
  border-radius: 8px;
  padding: 16px;
  height: 100%;
`;

const CompactServerCard = styled(ServerCard)`
  padding: 12px;
`;

// ─── Table Styled Components ─────────────────────────────────────────

const TableWrapper = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 16px;
  color: ${theme.muted};
  font-weight: 600;
  font-size: 0.8125rem;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid ${theme.border};
`;

const Td = styled.td<{ $width?: string }>`
  padding: 8px 16px;
  color: ${theme.text};
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  ${({ $width }) => $width && css`width: ${$width};`}
`;

const ThCell = styled(Td)`
  font-weight: 600;
  color: ${theme.muted};
`;

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
`;

// ─── Accordion / Collapsible Styled Components ───────────────────────

const CollapsibleWrapper = styled.div`
  background: rgba(244, 67, 54, 0.05);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const CollapsibleHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${theme.error};
  font-size: 1rem;
  font-weight: 500;
  text-align: left;

  &:hover {
    background: rgba(244, 67, 54, 0.08);
  }
`;

const CollapsibleChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const CollapsibleBody = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => ($open ? '500px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
  padding: ${({ $open }) => ($open ? '0 16px 16px' : '0 16px')};
`;

// ─── Alert Styled Components ─────────────────────────────────────────

const AlertBox = styled.div<{ $severity: 'error' | 'warning' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  border-left: 4px solid ${({ $severity }) =>
    $severity === 'error' ? theme.error : theme.warning};
  background: ${({ $severity }) =>
    $severity === 'error' ? theme.errorBg : theme.warningBg};
  color: ${({ $severity }) =>
    $severity === 'error' ? '#fca5a5' : '#fcd34d'};
  font-size: 0.875rem;
  line-height: 1.5;
`;

// ─── Progress Bar Styled Components ──────────────────────────────────

const ProgressTrack = styled.div`
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $value: number; $color: string }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  border-radius: 5px;
  background: ${({ $color }) => $color};
  transition: width 0.4s ease;
`;

// ─── Component ───────────────────────────────────────────────────────

/**
 * Component for monitoring MCP server health
 */
const McpMonitor: React.FC<McpMonitorProps> = ({
  variant = 'full',
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onStatusChange
}) => {
  // State for MCP server status
  const [mcpStatus, setMcpStatus] = useState<McpServerStatus>({
    workout: false,
    gamification: false
  });

  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // State for health data
  const [workoutHealth, setWorkoutHealth] = useState<McpServerHealthData>({
    status: 'offline',
    latency: 0,
    uptime: 'Unknown',
    lastCheck: new Date(),
    errors: [],
    recentRequests: 0
  });

  const [gamificationHealth, setGamificationHealth] = useState<McpServerHealthData>({
    status: 'offline',
    latency: 0,
    uptime: 'Unknown',
    lastCheck: new Date(),
    errors: [],
    recentRequests: 0
  });

  // State for refreshing
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // State for collapsible error panels
  const [workoutErrorsOpen, setWorkoutErrorsOpen] = useState<boolean>(false);
  const [gamificationErrorsOpen, setGamificationErrorsOpen] = useState<boolean>(false);

  // Check MCP status
  const checkStatus = useCallback(async () => {
    setRefreshing(true);

    try {
      // Check server status
      const status = await checkMcpServersStatus();

      // Update status
      setMcpStatus(status);

      // Notify status change
      if (onStatusChange) {
        onStatusChange(status);
      }

      // Update health data for workout MCP
      if (status.workout) {
        try {
          // Simulate health check - in a real implementation,
          // you would call an actual health check endpoint
          const startTime = Date.now();
          await fetch(`${MCP_CONFIG.WORKOUT_MCP_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          } as RequestInit)
            .then(async (response) => {
              const latency = Date.now() - startTime;
              const data = await response.json();

              setWorkoutHealth({
                status: 'healthy',
                latency,
                uptime: data.uptime || 'Unknown',
                lastCheck: new Date(),
                apiVersion: data.version || 'Unknown',
                errors: [],
                recentRequests: data.requestCount || 0
              });
            })
            .catch(error => {
              setWorkoutHealth(prev => ({
                ...prev,
                status: 'degraded',
                latency: Date.now() - startTime,
                lastCheck: new Date(),
                errors: [...prev.errors, error.message]
              }));
            });
        } catch (error) {
          console.error('Error checking workout MCP health:', error);
        }
      } else {
        setWorkoutHealth(prev => ({
          ...prev,
          status: 'offline',
          lastCheck: new Date(),
          errors: []
        }));
      }

      // Update health data for gamification MCP
      if (status.gamification) {
        try {
          // Simulate health check - in a real implementation,
          // you would call an actual health check endpoint
          const startTime = Date.now();
          await fetch(`${MCP_CONFIG.GAMIFICATION_MCP_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          } as RequestInit)
            .then(async (response) => {
              const latency = Date.now() - startTime;
              const data = await response.json();

              setGamificationHealth({
                status: 'healthy',
                latency,
                uptime: data.uptime || 'Unknown',
                lastCheck: new Date(),
                apiVersion: data.version || 'Unknown',
                errors: [],
                recentRequests: data.requestCount || 0
              });
            })
            .catch(error => {
              setGamificationHealth(prev => ({
                ...prev,
                status: 'degraded',
                latency: Date.now() - startTime,
                lastCheck: new Date(),
                errors: [...prev.errors, error.message]
              }));
            });
        } catch (error) {
          console.error('Error checking gamification MCP health:', error);
        }
      } else {
        setGamificationHealth(prev => ({
          ...prev,
          status: 'offline',
          lastCheck: new Date(),
          errors: []
        }));
      }

      // Check authentication
      const authStatus = await isMcpAuthenticated();
      setIsAuthenticated(authStatus);

      // Update last refresh time
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error checking MCP status:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onStatusChange]);

  // Initial check and set up auto-refresh
  useEffect(() => {
    // Initial check
    checkStatus();

    // Set up auto-refresh
    let intervalId: NodeJS.Timeout | null = null;

    if (autoRefresh) {
      intervalId = setInterval(checkStatus, refreshInterval);
    }

    // Clean up
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkStatus, autoRefresh, refreshInterval]);

  // Helper functions
  const getStatusColor = (status: 'healthy' | 'degraded' | 'offline') => {
    switch (status) {
      case 'healthy':
        return '#00c853';
      case 'degraded':
        return '#ff9800';
      case 'offline':
        return '#f44336';
      default:
        return '#f44336';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'offline') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} color={getStatusColor(status)} />;
      case 'degraded':
        return <AlertTriangle size={16} color={getStatusColor(status)} />;
      case 'offline':
        return <XCircle size={16} color={getStatusColor(status)} />;
      default:
        return <XCircle size={16} color={getStatusColor(status)} />;
    }
  };

  const getChipStatus = (online: boolean, health: 'healthy' | 'degraded' | 'offline'): 'success' | 'warning' | 'error' => {
    if (!online) return 'error';
    if (health === 'healthy') return 'success';
    if (health === 'degraded') return 'warning';
    return 'error';
  };

  const getLoadValue = (health: McpServerHealthData, workoutDefaults: boolean): number => {
    if (health.status === 'healthy') return workoutDefaults ? 30 : 25;
    if (health.status === 'degraded') return workoutDefaults ? 70 : 65;
    return 100;
  };

  const getLoadLabel = (health: McpServerHealthData, workoutDefaults: boolean): string => {
    if (health.status === 'healthy') return workoutDefaults ? '30%' : '25%';
    if (health.status === 'degraded') return workoutDefaults ? '70%' : '65%';
    return '100%';
  };

  const formatTimeSinceLastCheck = () => {
    const elapsed = new Date().getTime() - lastRefresh.getTime();
    const seconds = Math.floor(elapsed / 1000);

    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }

    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  };

  // ─── Compact Variant ─────────────────────────────────────────────

  if (variant === 'compact') {
    return (
      <CompactPanelWrapper>
        <FlexRow $justify="space-between" $mb="16px">
          <Heading6>MCP Server Status</Heading6>
          <StyledButton $small onClick={checkStatus} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            Refresh
          </StyledButton>
        </FlexRow>

        <GridTwoCol>
          {/* Workout MCP */}
          <CompactServerCard $online={mcpStatus.workout}>
            <FlexRow $mb="8px">
              <Server size={20} color={mcpStatus.workout ? '#00c853' : '#f44336'} />
              <Subtitle>Workout MCP</Subtitle>
              <span style={{ marginLeft: 'auto' }}>
                <StatusChip $status={mcpStatus.workout ? 'success' : 'error'}>
                  {mcpStatus.workout ? 'Online' : 'Offline'}
                </StatusChip>
              </span>
            </FlexRow>

            {mcpStatus.workout && (
              <FlexRow $mt="8px">
                <CaptionText $muted>
                  Latency: {workoutHealth.latency}ms
                </CaptionText>
              </FlexRow>
            )}
          </CompactServerCard>

          {/* Gamification MCP */}
          <CompactServerCard $online={mcpStatus.gamification}>
            <FlexRow $mb="8px">
              <Trophy size={20} color={mcpStatus.gamification ? '#00c853' : '#f44336'} />
              <Subtitle>Gamification MCP</Subtitle>
              <span style={{ marginLeft: 'auto' }}>
                <StatusChip $status={mcpStatus.gamification ? 'success' : 'error'}>
                  {mcpStatus.gamification ? 'Online' : 'Offline'}
                </StatusChip>
              </span>
            </FlexRow>

            {mcpStatus.gamification && (
              <FlexRow $mt="8px">
                <CaptionText $muted>
                  Latency: {gamificationHealth.latency}ms
                </CaptionText>
              </FlexRow>
            )}
          </CompactServerCard>
        </GridTwoCol>

        <FlexRow $justify="space-between" $mt="16px">
          <FlexRow $gap="4px">
            <Clock size={14} />
            <CaptionText>Last checked: {formatTimeSinceLastCheck()}</CaptionText>
          </FlexRow>

          <StatusChip $status={isAuthenticated ? 'success' : 'warning'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </StatusChip>
        </FlexRow>
      </CompactPanelWrapper>
    );
  }

  // ─── Full Variant ────────────────────────────────────────────────

  return (
    <PanelWrapper>
      <FlexRow $justify="space-between" $mb="24px">
        <Heading5>MCP Server Monitoring</Heading5>
        <FlexRow $gap="16px">
          <StatusChip $status={isAuthenticated ? 'success' : 'warning'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </StatusChip>
          <StyledButton $variant="outlined" onClick={checkStatus} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            Refresh Status
          </StyledButton>
        </FlexRow>
      </FlexRow>

      {/* Warning if both servers are offline */}
      {!mcpStatus.workout && !mcpStatus.gamification && (
        <AlertBox $severity="error">
          <XCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          All MCP servers are offline. The application is running in fallback mode with limited functionality.
        </AlertBox>
      )}

      {/* Warning if only gamification server is offline */}
      {mcpStatus.workout && !mcpStatus.gamification && (
        <AlertBox $severity="warning">
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          Gamification MCP server is offline. Basic functionality is available, but gamification features are limited.
        </AlertBox>
      )}

      <GridTwoColFull>
        {/* Workout MCP Server */}
        <ServerCard $online={mcpStatus.workout} $health={workoutHealth.status}>
          <FlexRow $mb="16px">
            <Server
              size={24}
              color={mcpStatus.workout ? getStatusColor(workoutHealth.status) : '#f44336'}
            />
            <Heading6 style={{ marginLeft: 4 }}>Workout MCP Server</Heading6>
            <span style={{ marginLeft: 'auto' }}>
              <StatusChip $status={getChipStatus(mcpStatus.workout, workoutHealth.status)}>
                {mcpStatus.workout
                  ? getStatusIcon(workoutHealth.status)
                  : <XCircle size={16} />
                }
                {mcpStatus.workout ? workoutHealth.status : 'Offline'}
              </StatusChip>
            </span>
          </FlexRow>

          <TableWrapper>
            <StyledTable>
              <tbody>
                <Tr>
                  <ThCell $width="40%">Status</ThCell>
                  <Td>{mcpStatus.workout ? workoutHealth.status : 'Offline'}</Td>
                </Tr>
                <Tr>
                  <ThCell>URL</ThCell>
                  <Td>{MCP_CONFIG.WORKOUT_MCP_URL}</Td>
                </Tr>
                <Tr>
                  <ThCell>Last Check</ThCell>
                  <Td>{workoutHealth.lastCheck.toLocaleTimeString()}</Td>
                </Tr>
                {mcpStatus.workout && (
                  <>
                    <Tr>
                      <ThCell>Latency</ThCell>
                      <Td>{workoutHealth.latency}ms</Td>
                    </Tr>
                    <Tr>
                      <ThCell>API Version</ThCell>
                      <Td>{workoutHealth.apiVersion || 'Unknown'}</Td>
                    </Tr>
                    <Tr>
                      <ThCell>Recent Requests</ThCell>
                      <Td>{workoutHealth.recentRequests}</Td>
                    </Tr>
                  </>
                )}
              </tbody>
            </StyledTable>
          </TableWrapper>

          {workoutHealth.errors.length > 0 && (
            <CollapsibleWrapper>
              <CollapsibleHeader onClick={() => setWorkoutErrorsOpen(prev => !prev)}>
                <ErrorText>
                  {workoutHealth.errors.length} Error{workoutHealth.errors.length !== 1 ? 's' : ''}
                </ErrorText>
                <CollapsibleChevron $open={workoutErrorsOpen}>
                  <ChevronDown size={20} />
                </CollapsibleChevron>
              </CollapsibleHeader>
              <CollapsibleBody $open={workoutErrorsOpen}>
                {workoutHealth.errors.map((error, index) => (
                  <BodyText key={index} style={{ marginBottom: 8 }}>
                    {error}
                  </BodyText>
                ))}
              </CollapsibleBody>
            </CollapsibleWrapper>
          )}

          {mcpStatus.workout && (
            <div>
              <Subtitle style={{ display: 'block', marginBottom: 8 }}>Server Load</Subtitle>
              <FlexRow $gap="8px">
                <div style={{ flex: 1 }}>
                  <ProgressTrack>
                    <ProgressFill
                      $value={getLoadValue(workoutHealth, true)}
                      $color={getStatusColor(workoutHealth.status)}
                    />
                  </ProgressTrack>
                </div>
                <span title="Current server load percentage" style={{ minWidth: 35 }}>
                  <BodyText $muted>{getLoadLabel(workoutHealth, true)}</BodyText>
                </span>
              </FlexRow>
            </div>
          )}
        </ServerCard>

        {/* Gamification MCP Server */}
        <ServerCard $online={mcpStatus.gamification} $health={gamificationHealth.status}>
          <FlexRow $mb="16px">
            <Trophy
              size={24}
              color={mcpStatus.gamification ? getStatusColor(gamificationHealth.status) : '#f44336'}
            />
            <Heading6 style={{ marginLeft: 4 }}>Gamification MCP Server</Heading6>
            <span style={{ marginLeft: 'auto' }}>
              <StatusChip $status={getChipStatus(mcpStatus.gamification, gamificationHealth.status)}>
                {mcpStatus.gamification
                  ? getStatusIcon(gamificationHealth.status)
                  : <XCircle size={16} />
                }
                {mcpStatus.gamification ? gamificationHealth.status : 'Offline'}
              </StatusChip>
            </span>
          </FlexRow>

          <TableWrapper>
            <StyledTable>
              <tbody>
                <Tr>
                  <ThCell $width="40%">Status</ThCell>
                  <Td>{mcpStatus.gamification ? gamificationHealth.status : 'Offline'}</Td>
                </Tr>
                <Tr>
                  <ThCell>URL</ThCell>
                  <Td>{MCP_CONFIG.GAMIFICATION_MCP_URL}</Td>
                </Tr>
                <Tr>
                  <ThCell>Last Check</ThCell>
                  <Td>{gamificationHealth.lastCheck.toLocaleTimeString()}</Td>
                </Tr>
                {mcpStatus.gamification && (
                  <>
                    <Tr>
                      <ThCell>Latency</ThCell>
                      <Td>{gamificationHealth.latency}ms</Td>
                    </Tr>
                    <Tr>
                      <ThCell>API Version</ThCell>
                      <Td>{gamificationHealth.apiVersion || 'Unknown'}</Td>
                    </Tr>
                    <Tr>
                      <ThCell>Recent Requests</ThCell>
                      <Td>{gamificationHealth.recentRequests}</Td>
                    </Tr>
                  </>
                )}
              </tbody>
            </StyledTable>
          </TableWrapper>

          {gamificationHealth.errors.length > 0 && (
            <CollapsibleWrapper>
              <CollapsibleHeader onClick={() => setGamificationErrorsOpen(prev => !prev)}>
                <ErrorText>
                  {gamificationHealth.errors.length} Error{gamificationHealth.errors.length !== 1 ? 's' : ''}
                </ErrorText>
                <CollapsibleChevron $open={gamificationErrorsOpen}>
                  <ChevronDown size={20} />
                </CollapsibleChevron>
              </CollapsibleHeader>
              <CollapsibleBody $open={gamificationErrorsOpen}>
                {gamificationHealth.errors.map((error, index) => (
                  <BodyText key={index} style={{ marginBottom: 8 }}>
                    {error}
                  </BodyText>
                ))}
              </CollapsibleBody>
            </CollapsibleWrapper>
          )}

          {mcpStatus.gamification && (
            <div>
              <Subtitle style={{ display: 'block', marginBottom: 8 }}>Server Load</Subtitle>
              <FlexRow $gap="8px">
                <div style={{ flex: 1 }}>
                  <ProgressTrack>
                    <ProgressFill
                      $value={getLoadValue(gamificationHealth, false)}
                      $color={getStatusColor(gamificationHealth.status)}
                    />
                  </ProgressTrack>
                </div>
                <span title="Current server load percentage" style={{ minWidth: 35 }}>
                  <BodyText $muted>{getLoadLabel(gamificationHealth, false)}</BodyText>
                </span>
              </FlexRow>
            </div>
          )}
        </ServerCard>
      </GridTwoColFull>

      {/* Activity Monitoring */}
      <div style={{ marginTop: 24 }}>
        <Heading6 style={{ marginBottom: 12 }}>
          <Activity size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Recent Activity
        </Heading6>

        <TableWrapper>
          <StyledTable>
            <thead>
              <tr>
                <Th>Server</Th>
                <Th>Endpoint</Th>
                <Th>Status</Th>
                <Th>Latency</Th>
                <Th>Timestamp</Th>
              </tr>
            </thead>
            <tbody>
              {/* Mock activity data */}
              <Tr>
                <Td>Workout MCP</Td>
                <Td>/tools/GetWorkoutRecommendations</Td>
                <Td>
                  <StatusChip $status="success">Success</StatusChip>
                </Td>
                <Td>235ms</Td>
                <Td>{new Date().toLocaleTimeString()}</Td>
              </Tr>
              <Tr>
                <Td>Gamification MCP</Td>
                <Td>/tools/GetAchievements</Td>
                <Td>
                  <StatusChip $status="success">Success</StatusChip>
                </Td>
                <Td>187ms</Td>
                <Td>{new Date().toLocaleTimeString()}</Td>
              </Tr>
              <Tr>
                <Td>Workout MCP</Td>
                <Td>/tools/LogWorkoutSession</Td>
                <Td>
                  <StatusChip $status="success">Success</StatusChip>
                </Td>
                <Td>312ms</Td>
                <Td>{new Date(Date.now() - 120000).toLocaleTimeString()}</Td>
              </Tr>
            </tbody>
          </StyledTable>
        </TableWrapper>
      </div>

      <FlexRow $justify="space-between" $mt="24px">
        <FlexRow $gap="6px">
          <Clock size={16} />
          <BodyText $muted>Last checked: {formatTimeSinceLastCheck()}</BodyText>
        </FlexRow>

        <BodyText $muted>
          Auto-refresh: {autoRefresh ? `Every ${refreshInterval / 1000} seconds` : 'Disabled'}
        </BodyText>
      </FlexRow>
    </PanelWrapper>
  );
};

export default McpMonitor;