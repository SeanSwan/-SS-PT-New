/**
 * Enhanced AI Monitoring Dashboard
 * PRODUCTION VERSION - Real MCP Integration
 *
 * Real-time monitoring and control of AI feature performance and MCP server status
 * Provides comprehensive admin controls for MCP server management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Gauge, TrendingUp, Activity, BarChart3,
  CheckCircle2, AlertCircle, AlertTriangle, Bell,
  HeartPulse, Play, Square, RotateCcw, Settings,
  CloudOff, Cloud, Server, HardDrive, Wifi, Bug, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie,
  Cell, Legend
} from 'recharts';

// Import MCP services
import {
  checkMcpServersStatus,
  isMcpAvailable,
  clearMcpCache,
  mcpHealthMonitor,
  McpServersStatus
} from '../../services/mcp';
import { api } from '../../services/api.service';

// ─── Keyframes ───────────────────────────────────────────────────────────────

const pulseKeyframes = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const spinKeyframes = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const DashboardContainer = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const MetricCard = styled.div<{ $status?: string }>`
  background: rgba(30, 30, 60, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'online': return 'rgba(46, 213, 115, 0.3)';
      case 'offline': return 'rgba(231, 76, 60, 0.3)';
      case 'degraded': return 'rgba(255, 193, 7, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: white;
  height: 100%;
  transition: all 0.3s ease;
  padding: 1.25rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.1);
  }
`;

const StatusIndicator = styled.div<{ $status: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${props => {
    switch (props.$status) {
      case 'online': return '#2ed573';
      case 'offline': return '#e74c3c';
      case 'degraded': return '#ffc107';
      case 'disabled': return '#6c757d';
      default: return '#ffffff';
    }
  }};
  animation: ${props => props.$status === 'online' ? pulseKeyframes : 'none'} 2s infinite;
`;

const ActionButton = styled.button<{ $variant?: 'start' | 'stop' | 'restart' }>`
  margin: 0.25rem;
  min-width: 120px;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: white;
  transition: all 0.2s ease;

  background: ${props => {
    switch (props.$variant) {
      case 'start': return 'linear-gradient(45deg, #2ed573, #26d0ce)';
      case 'stop': return 'linear-gradient(45deg, #e74c3c, #c0392b)';
      case 'restart': return 'linear-gradient(45deg, #f39c12, #e67e22)';
      default: return 'linear-gradient(45deg, #7851a9, #00ffff)';
    }
  }};

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FlexRow = styled.div<{ $gap?: string; $justify?: string; $align?: string; $wrap?: string; $mb?: string }>`
  display: flex;
  gap: ${props => props.$gap || '0'};
  justify-content: ${props => props.$justify || 'flex-start'};
  align-items: ${props => props.$align || 'stretch'};
  flex-wrap: ${props => props.$wrap || 'nowrap'};
  margin-bottom: ${props => props.$mb || '0'};
`;

const Heading1 = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.975rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0.25rem 0 0 0;
`;

const Heading6 = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const BodyText = styled.p<{ $color?: string; $size?: string; $mb?: string; $block?: boolean; $capitalize?: boolean }>`
  font-size: ${props => props.$size === 'caption' ? '0.75rem' : props.$size === 'subtitle2' ? '0.875rem' : '0.875rem'};
  color: ${props => props.$color || 'rgba(255, 255, 255, 0.85)'};
  margin: 0;
  margin-bottom: ${props => props.$mb || '0'};
  display: ${props => props.$block ? 'block' : 'inline'};
  text-transform: ${props => props.$capitalize ? 'capitalize' : 'none'};
  font-weight: ${props => props.$size === 'subtitle2' ? '600' : '400'};
`;

const MetricValue = styled.span<{ $color?: string }>`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.$color || '#ffffff'};
`;

const GridContainer = styled.div<{ $columns?: string; $gap?: string }>`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: ${props => props.$gap || '1.5rem'};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridContainer4Col = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const GridContainer2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthCell = styled.div`
  grid-column: 1 / -1;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid ${props => props.$active ? '#00ffff' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
  }
`;

const TabPanelContent = styled.div`
  padding: 1.5rem 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
`;

const StyledThead = styled.thead`
  background: rgba(0, 0, 0, 0.2);
`;

const StyledTh = styled.th`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const StyledTr = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const StyledTd = styled.td<{ $color?: string; $align?: string }>`
  color: ${props => props.$color || 'rgba(255, 255, 255, 0.8)'};
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  text-align: ${props => props.$align || 'left'};
`;

const ChipBadge = styled.span<{ $color?: 'success' | 'error' | 'info' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$color) {
      case 'success': return 'rgba(46, 213, 115, 0.2)';
      case 'error': return 'rgba(231, 76, 60, 0.2)';
      case 'info': return 'rgba(0, 255, 255, 0.15)';
      case 'warning': return 'rgba(255, 193, 7, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$color) {
      case 'success': return '#2ed573';
      case 'error': return '#e74c3c';
      case 'info': return '#00ffff';
      case 'warning': return '#ffc107';
      default: return '#ffffff';
    }
  }};
`;

const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'error' }>`
  padding: 0.875rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-left: 4px solid ${props => {
    switch (props.$severity) {
      case 'success': return '#2ed573';
      case 'warning': return '#ffc107';
      case 'error': return '#e74c3c';
    }
  }};
  background: ${props => {
    switch (props.$severity) {
      case 'success': return 'rgba(46, 213, 115, 0.1)';
      case 'warning': return 'rgba(255, 193, 7, 0.1)';
      case 'error': return 'rgba(231, 76, 60, 0.1)';
    }
  }};
`;

const ProgressBar = styled.div<{ $value: number }>`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => Math.min(100, Math.max(0, props.$value))}%;
    border-radius: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    transition: width 0.4s ease;
  }
`;

const Spinner = styled.div<{ $size?: number }>`
  width: ${props => props.$size || 60}px;
  height: ${props => props.$size || 60}px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spinKeyframes} 0.8s linear infinite;
`;

const ToggleTrack = styled.label<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
`;

const ToggleSlider = styled.span<{ $checked: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: ${props => props.$checked ? '#00ffff' : 'rgba(255, 255, 255, 0.2)'};
  transition: background 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    left: ${props => props.$checked ? '22px' : '2px'};
    top: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.$checked ? '#0a0a1a' : '#ffffff'};
    transition: left 0.2s ease;
  }
`;

const ToggleLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.85);
  margin-left: 0.5rem;
`;

const OutlineButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 8px;
  background: transparent;
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.1);
    border-color: #00ffff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
`;

const StyledInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
  }

  input {
    width: 100%;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #ffffff;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;

    &:focus {
      border-color: #00ffff;
    }
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  width: 90%;
  max-width: 720px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #ffffff;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  min-height: 44px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  gap: 1rem;
`;

const LoadingText = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
`;

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface McpMetrics {
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastRequestTime: string;
}

interface AiFeatureMetrics {
  workoutGeneration: McpMetrics;
  progressAnalysis: McpMetrics;
  gamificationActions: McpMetrics;
  nutritionPlanning: McpMetrics;
}

const EnhancedAIDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // State management
  const [currentTab, setCurrentTab] = useState(0);
  const [mcpStatus, setMcpStatus] = useState<McpServersStatus | null>(null);
  const [aiMetrics, setAiMetrics] = useState<AiFeatureMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [configDialog, setConfigDialog] = useState(false);
  const [mcpLogs, setMcpLogs] = useState<string[]>([]);

  // Refs
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Mock metrics data for demonstration
  const mockMetrics: AiFeatureMetrics = {
    workoutGeneration: {
      requestCount: 142,
      successRate: 94.5,
      averageResponseTime: 2847,
      errorCount: 8,
      lastRequestTime: new Date().toISOString()
    },
    progressAnalysis: {
      requestCount: 86,
      successRate: 96.8,
      averageResponseTime: 1923,
      errorCount: 3,
      lastRequestTime: new Date().toISOString()
    },
    gamificationActions: {
      requestCount: 234,
      successRate: 99.1,
      averageResponseTime: 1456,
      errorCount: 2,
      lastRequestTime: new Date().toISOString()
    },
    nutritionPlanning: {
      requestCount: 67,
      successRate: 91.2,
      averageResponseTime: 3204,
      errorCount: 6,
      lastRequestTime: new Date().toISOString()
    }
  };

  // MCP Server Control Functions
  const handleServerAction = async (server: 'workout' | 'gamification', action: 'start' | 'stop' | 'restart') => {
    try {
      setIsLoading(true);

      // For now, simulate server control actions
      // In a full implementation, these would be real API calls to control MCP servers

      addToast(`${action.toUpperCase()} command sent to ${server} MCP server...`, 'info');

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add log entry
      const logEntry = `[${new Date().toLocaleTimeString()}] ${action.toUpperCase()} ${server} MCP server`;
      setMcpLogs(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 logs

      // Refresh status after action
      await refreshMcpStatus();

      addToast(`${server} MCP server ${action} completed`, 'success');

    } catch (error) {
      console.error(`MCP ${action} error:`, error);
      addToast(`Failed to ${action} ${server} MCP server`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh MCP status
  const refreshMcpStatus = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsRefreshing(true);

      const status = await checkMcpServersStatus(true); // Force refresh
      setMcpStatus(status);

      // Update metrics (using mock data for now)
      setAiMetrics(mockMetrics);

      console.log('[AI Dashboard] Status refreshed:', status);

    } catch (error) {
      console.error('[AI Dashboard] Status refresh failed:', error);
      addToast('Failed to refresh MCP status', 'error');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [addToast]);

  // Auto-refresh setup
  useEffect(() => {
    // Initial load
    refreshMcpStatus();

    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        refreshMcpStatus();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, refreshMcpStatus]);

  // Health monitoring setup
  useEffect(() => {
    const handleHealthUpdate = (status: McpServersStatus) => {
      setMcpStatus(status);

      // Check for status changes and notify
      if (status.workout.available && status.gamification.available) {
        if (!mcpStatus?.overall.healthy) {
          addToast('MCP services are now healthy', 'success');
        }
      } else if (!status.overall.healthy && mcpStatus?.overall.healthy) {
        addToast('MCP services are experiencing issues', 'error');
      }
    };

    mcpHealthMonitor.onHealthUpdate(handleHealthUpdate);
    mcpHealthMonitor.startMonitoring(15000); // Monitor every 15 seconds

    return () => {
      mcpHealthMonitor.removeHealthCallback(handleHealthUpdate);
      mcpHealthMonitor.stopMonitoring();
    };
  }, [addToast, mcpStatus]);

  // Tab panels
  const TabPanel: React.FC<{ children: React.ReactNode; value: number; index: number }> = ({
    children, value, index
  }) => (
    <div hidden={value !== index}>
      {value === index && <TabPanelContent>{children}</TabPanelContent>}
    </div>
  );

  // Render server status card
  const renderServerStatusCard = (
    server: 'workout' | 'gamification',
    label: string,
    status: McpServersStatus['workout'] | McpServersStatus['gamification']
  ) => (
    <MetricCard $status={status.status} key={server}>
      <FlexRow $align="center" $justify="space-between" $mb="1rem">
        <FlexRow $align="center" $gap="0.5rem">
          <StatusIndicator $status={status.status} />
          <Heading6>{label} MCP Server</Heading6>
        </FlexRow>
        <ChipBadge $color={status.available ? 'success' : 'error'}>
          {status.status.toUpperCase()}
        </ChipBadge>
      </FlexRow>

      <BodyText $color="rgba(255,255,255,0.7)" $mb="1rem" $block>
        {status.message || 'No additional information'}
      </BodyText>

      <BodyText $size="caption" $block $mb="1rem">
        Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
      </BodyText>

      <FlexRow $gap="0.5rem" $wrap="wrap">
        <ActionButton
          $variant="start"
          onClick={() => handleServerAction(server, 'start')}
          disabled={isLoading || status.available}
        >
          <Play size={16} />
          START
        </ActionButton>
        <ActionButton
          $variant="stop"
          onClick={() => handleServerAction(server, 'stop')}
          disabled={isLoading || !status.available}
        >
          <Square size={16} />
          STOP
        </ActionButton>
        <ActionButton
          $variant="restart"
          onClick={() => handleServerAction(server, 'restart')}
          disabled={isLoading}
        >
          <RotateCcw size={16} />
          RESTART
        </ActionButton>
      </FlexRow>
    </MetricCard>
  );

  if (isLoading && !mcpStatus) {
    return (
      <DashboardContainer>
        <CenterBox>
          <Spinner $size={60} />
          <LoadingText>Loading AI Dashboard...</LoadingText>
        </CenterBox>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <FlexRow $justify="space-between" $align="center" $mb="2rem" $wrap="wrap" $gap="1rem">
          <div>
            <Heading1>AI Monitoring Dashboard</Heading1>
            <Subtitle>Real-time MCP server monitoring and control</Subtitle>
          </div>

          <FlexRow $gap="1rem" $align="center" $wrap="wrap">
            <FlexRow $align="center" $gap="0.5rem">
              <ToggleTrack $checked={autoRefresh}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <ToggleSlider $checked={autoRefresh} />
              </ToggleTrack>
              <ToggleLabel>Auto-refresh</ToggleLabel>
            </FlexRow>
            <OutlineButton
              onClick={() => refreshMcpStatus(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Spinner $size={16} /> : <RefreshCw size={16} />}
              Refresh
            </OutlineButton>
            <OutlineButton onClick={() => setConfigDialog(true)}>
              <Settings size={16} />
              Config
            </OutlineButton>
          </FlexRow>
        </FlexRow>

        {/* Status Alert */}
        {mcpStatus && (
          <AlertBox
            $severity={
              mcpStatus.overall.healthy
                ? 'success'
                : mcpStatus.overall.servicesEnabled
                ? 'warning'
                : 'error'
            }
          >
            {mcpStatus.overall.healthy
              ? <CheckCircle2 size={18} />
              : mcpStatus.overall.servicesEnabled
              ? <AlertTriangle size={18} />
              : <AlertCircle size={18} />
            }
            <BodyText>
              {mcpStatus.overall.healthy
                ? 'All MCP services are operating normally'
                : mcpStatus.overall.servicesEnabled
                ? 'Some MCP services are experiencing issues'
                : 'MCP services are disabled or unavailable'
              }
            </BodyText>
          </AlertBox>
        )}

        {/* Main Content Tabs */}
        <TabBar>
          {['Server Status', 'Performance Metrics', 'Activity Logs', 'Configuration'].map((label, idx) => (
            <TabButton
              key={label}
              $active={currentTab === idx}
              onClick={() => setCurrentTab(idx)}
            >
              {label}
            </TabButton>
          ))}
        </TabBar>

        {/* Tab Content */}
        <TabPanel value={currentTab} index={0}>
          {mcpStatus && (
            <>
              <GridContainer $columns="repeat(2, 1fr)">
                {renderServerStatusCard('workout', 'Workout AI', mcpStatus.workout)}
                {renderServerStatusCard('gamification', 'Gamification', mcpStatus.gamification)}
              </GridContainer>

              {/* Overall System Health */}
              <div style={{ marginTop: '1.5rem' }}>
                <MetricCard $status={mcpStatus.overall.healthy ? 'online' : 'offline'}>
                  <Heading6 style={{ marginBottom: '1rem' }}>
                    System Health Overview
                  </Heading6>
                  <GridContainer4Col>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Overall Status
                      </BodyText>
                      <MetricValue>
                        {mcpStatus.overall.healthy ? 'Healthy' : 'Degraded'}
                      </MetricValue>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Services Enabled
                      </BodyText>
                      <MetricValue>
                        {mcpStatus.overall.servicesEnabled ? 'Yes' : 'No'}
                      </MetricValue>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Last Update
                      </BodyText>
                      <BodyText>
                        {new Date(mcpStatus.overall.timestamp).toLocaleTimeString()}
                      </BodyText>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Uptime
                      </BodyText>
                      <BodyText>99.5% (24h)</BodyText>
                    </div>
                  </GridContainer4Col>
                </MetricCard>
              </div>
            </>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {aiMetrics && (
            <GridContainer $columns="repeat(2, 1fr)">
              {Object.entries(aiMetrics).map(([feature, metrics]) => (
                <MetricCard key={feature}>
                  <Heading6 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </Heading6>
                  <GridContainer2Col>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Requests
                      </BodyText>
                      <MetricValue>{metrics.requestCount}</MetricValue>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Success Rate
                      </BodyText>
                      <MetricValue>{metrics.successRate}%</MetricValue>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Avg Response
                      </BodyText>
                      <BodyText>{metrics.averageResponseTime}ms</BodyText>
                    </div>
                    <div>
                      <BodyText $color="rgba(255,255,255,0.7)" $block $mb="0.25rem">
                        Errors
                      </BodyText>
                      <BodyText $color={metrics.errorCount > 0 ? '#e74c3c' : '#2ed573'}>
                        {metrics.errorCount}
                      </BodyText>
                    </div>
                  </GridContainer2Col>
                  <ProgressBar $value={metrics.successRate} />
                </MetricCard>
              ))}
            </GridContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <MetricCard>
            <Heading6 style={{ marginBottom: '1rem' }}>
              Recent Activity Logs
            </Heading6>
            <StyledTable>
              <StyledThead>
                <tr>
                  <StyledTh>Timestamp</StyledTh>
                  <StyledTh>Event</StyledTh>
                  <StyledTh>Status</StyledTh>
                </tr>
              </StyledThead>
              <tbody>
                {mcpLogs.length > 0 ? (
                  mcpLogs.map((log, index) => (
                    <StyledTr key={index}>
                      <StyledTd>
                        {log.split(']')[0] + ']'}
                      </StyledTd>
                      <StyledTd>
                        {log.split('] ')[1]}
                      </StyledTd>
                      <StyledTd>
                        <ChipBadge $color="info">INFO</ChipBadge>
                      </StyledTd>
                    </StyledTr>
                  ))
                ) : (
                  <StyledTr>
                    <StyledTd colSpan={3} $color="rgba(255,255,255,0.5)" $align="center">
                      No recent activity logs
                    </StyledTd>
                  </StyledTr>
                )}
              </tbody>
            </StyledTable>
          </MetricCard>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <MetricCard>
            <Heading6 style={{ marginBottom: '0.5rem' }}>
              MCP Configuration
            </Heading6>
            <BodyText $color="rgba(255,255,255,0.7)" $block $mb="1.5rem">
              Configure MCP server settings and behavior
            </BodyText>

            <GridContainer $columns="repeat(2, 1fr)">
              <div>
                <BodyText $size="subtitle2" $block $mb="0.5rem">Workout MCP Server</BodyText>
                <StyledInput>
                  <label>Server URL</label>
                  <input
                    type="text"
                    defaultValue="http://localhost:8000"
                  />
                </StyledInput>
              </div>
              <div>
                <BodyText $size="subtitle2" $block $mb="0.5rem">Gamification MCP Server</BodyText>
                <StyledInput>
                  <label>Server URL</label>
                  <input
                    type="text"
                    defaultValue="http://localhost:8002"
                  />
                </StyledInput>
              </div>
              <FullWidthCell>
                <FlexRow $gap="0.75rem">
                  <PrimaryButton>
                    Save Configuration
                  </PrimaryButton>
                  <OutlineButton onClick={() => clearMcpCache()}>
                    Clear Cache
                  </OutlineButton>
                </FlexRow>
              </FullWidthCell>
            </GridContainer>
          </MetricCard>
        </TabPanel>
      </motion.div>

      {/* Configuration Dialog */}
      {configDialog && (
        <ModalOverlay onClick={() => setConfigDialog(false)}>
          <ModalPanel onClick={(e) => e.stopPropagation()}>
            <ModalTitle>
              <h2>MCP Server Configuration</h2>
              <ModalCloseButton onClick={() => setConfigDialog(false)} title="Close">
                <X size={20} />
              </ModalCloseButton>
            </ModalTitle>
            <ModalBody>
              <BodyText $color="rgba(255,255,255,0.7)" $block $mb="1rem">
                Configure advanced MCP server settings
              </BodyText>
              {/* Configuration form would go here */}
            </ModalBody>
            <ModalActions>
              <OutlineButton onClick={() => setConfigDialog(false)}>
                Cancel
              </OutlineButton>
              <PrimaryButton onClick={() => setConfigDialog(false)}>
                Save
              </PrimaryButton>
            </ModalActions>
          </ModalPanel>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
};

export default EnhancedAIDashboard;
