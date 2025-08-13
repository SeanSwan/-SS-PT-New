/**
 * MCPServersSection.tsx
 * =====================
 * 
 * Comprehensive MCP Servers Management Interface for Admin Dashboard
 * Monitors and manages Model Context Protocol servers and AI agents
 * Styled with Stellar Command Center theme
 * 
 * Features:
 * - MCP server health monitoring
 * - AI agent status tracking
 * - Performance metrics and analytics
 * - Server configuration management
 * - Real-time connection monitoring
 * - Error logs and debugging tools
 * - Resource usage tracking
 * - WCAG AA accessibility compliance
 * 
 * Backend Integration:
 * - /api/admin/mcp/servers (GET, POST, PUT, DELETE)
 * - /api/admin/mcp/health (GET)
 * - /api/admin/mcp/metrics (GET)
 * - /api/admin/mcp/logs (GET)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Server, Cpu, HardDrive, Wifi, WifiOff, Activity,
  Search, Filter, Download, RefreshCw, MoreVertical,
  AlertTriangle, CheckCircle, Clock, Eye, Settings,
  Trash2, Plus, Play, Pause, RotateCw, Zap,
  BarChart3, TrendingUp, TrendingDown, Globe,
  Shield, Database, Memory, Gauge, FileText
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// === STYLED COMPONENTS ===
const ManagementContainer = styled.div`
  padding: 0;
`;

const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
  
  option {
    background: #1e3a8a;
    color: #ffffff;
  }
`;

const CommandButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #2563eb 0%, #00e6ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ServersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ServerCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(30, 58, 138, 0.3);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.status) {
        case 'healthy': return 'linear-gradient(90deg, #10b981, #00ffff)';
        case 'warning': return 'linear-gradient(90deg, #f59e0b, #eab308)';
        case 'error': return 'linear-gradient(90deg, #ef4444, #dc2626)';
        case 'offline': return 'linear-gradient(90deg, #6b7280, #9ca3af)';
        default: return 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
      }
    }};
  }
`;

const ServerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ServerIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => {
    switch (props.status) {
      case 'healthy': return 'linear-gradient(135deg, #10b981, #00ffff)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #eab308)';
      case 'error': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'offline': return 'linear-gradient(135deg, #6b7280, #9ca3af)';
      default: return 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  margin-right: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  
  ${props => props.status === 'healthy' && `
    animation: healthyPulse 2s infinite;
    
    @keyframes healthyPulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3); }
      50% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.6); }
    }
  `}
`;

const ServerInfo = styled.div`
  flex: 1;
`;

const ServerName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
`;

const ServerDescription = styled.p`
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const ServerEndpoint = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Monaco', 'Menlo', monospace;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.healthy {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  &.offline {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
`;

const ConnectionIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
`;

const PulsingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected ? '#10b981' : '#ef4444'};
  animation: ${props => props.connected ? 'connectedPulse' : 'disconnectedPulse'} 2s infinite;
  
  @keyframes connectedPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes disconnectedPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const ServerMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PerformanceBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin: 0.5rem 0;
`;

const PerformanceFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.value >= 90) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (props.value >= 70) return 'linear-gradient(90deg, #f59e0b, #eab308)';
    return 'linear-gradient(90deg, #10b981, #00ffff)';
  }};
  border-radius: 3px;
  transition: width 0.3s ease;
  width: ${props => props.value}%;
`;

const ActionMenu = styled.div`
  position: relative;
`;

const ActionButton = styled(motion.button)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const ActionDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ActionItem = styled(motion.button)`
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.danger {
    color: #ef4444;
    
    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.1);
    }
  }
  
  &.success {
    color: #10b981;
    
    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.1);
    }
  }
`;

const StatsBar = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1.5rem;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  
  &.healthy { color: #10b981; }
  &.warning { color: #f59e0b; }
  &.error { color: #ef4444; }
  &.default { color: #00ffff; }
`;

const StatTitle = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LogsPanel = styled(motion.div)`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  max-height: 400px;
  overflow-y: auto;
`;

const LogEntry = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  
  &:last-child {
    border-bottom: none;
  }
`;

const LogTimestamp = styled.div`
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
  min-width: 80px;
`;

const LogLevel = styled.div`
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.625rem;
  flex-shrink: 0;
  
  &.info {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
  
  &.warn {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
`;

const LogMessage = styled.div`
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  word-break: break-word;
`;

const ErrorAlert = styled(motion.div)`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const RetryButton = styled(motion.button)`
  background: none;
  border: 1px solid #ef4444;
  border-radius: 6px;
  color: #ef4444;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const LoadingSpinner = styled(motion.div)`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #00ffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ConfirmationOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ConfirmationDialog = styled(motion.div)`
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ConfirmationTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #ffffff;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConfirmationMessage = styled.p`
  margin: 0 0 2rem 0;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
`;

const ConfirmationActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ConfirmButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &.cancel {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
    border: 1px solid rgba(107, 114, 128, 0.3);
    
    &:hover {
      background: rgba(107, 114, 128, 0.3);
    }
  }
  
  &.confirm {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    
    &:hover {
      background: rgba(239, 68, 68, 0.3);
    }
  }
  
  &.confirm.success {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    
    &:hover {
      background: rgba(16, 185, 129, 0.3);
    }
  }
`;

// === INTERFACES ===
interface MCPServer {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  type: 'ai-agent' | 'data-processor' | 'scheduler' | 'analytics';
  status: 'healthy' | 'warning' | 'error' | 'offline';
  version: string;
  uptime: number;
  lastSeen: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
    responseTime: number;
    errorRate: number;
  };
  configuration: {
    maxConnections: number;
    timeout: number;
    retryCount: number;
  };
}

interface MCPStats {
  totalServers: number;
  healthyServers: number;
  warningServers: number;
  errorServers: number;
  offlineServers: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  server: string;
  message: string;
}

// === MAIN COMPONENT ===
const MCPServersSection: React.FC = () => {
  const { authAxios } = useAuth();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [stats, setStats] = useState<MCPStats>({
    totalServers: 0,
    healthyServers: 0,
    warningServers: 0,
    errorServers: 0,
    offlineServers: 0
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<{ [serverId: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    actionType: 'danger' | 'success';
    actionText: string;
  } | null>(null);

  // Fetch MCP servers from backend with enhanced error handling
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get('/api/admin/mcp/servers', {
        params: {
          includeMetrics: true,
          includeHealth: true
        }
      });
      
      if (response.data.success && response.data.servers) {
        const serversData = response.data.servers.map((server: any) => ({
          id: server.id?.toString() || '',
          name: server.name || '',
          description: server.description || '',
          endpoint: server.endpoint || '',
          type: server.type || 'ai-agent',
          status: server.status || 'offline',
          version: server.version || '1.0.0',
          uptime: server.uptime || 0,
          lastSeen: server.lastSeen || new Date().toISOString(),
          metrics: {
            cpuUsage: server.metrics?.cpuUsage || 0,
            memoryUsage: server.metrics?.memoryUsage || 0,
            requestCount: server.metrics?.requestCount || 0,
            responseTime: server.metrics?.responseTime || 0,
            errorRate: server.metrics?.errorRate || 0
          },
          configuration: {
            maxConnections: server.configuration?.maxConnections || 100,
            timeout: server.configuration?.timeout || 30000,
            retryCount: server.configuration?.retryCount || 3
          }
        }));
        
        setServers(serversData);
        calculateStats(serversData);
        setError(null);
      } else {
        throw new Error(response.data.message || 'Invalid server response format');
      }
    } catch (error: any) {
      console.error('Error fetching MCP servers:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch MCP servers');
      // Don't fallback to mock data in production - keep existing servers if any
      if (servers.length === 0) {
        setServers([]);
        setStats({
          totalServers: 0,
          healthyServers: 0,
          warningServers: 0,
          errorServers: 0,
          offlineServers: 0
        });
      }
    } finally {
      setLoading(false);
    }
  }, [authAxios, servers.length]);

  // Fetch logs with enhanced error handling
  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      setLogsError(null);
      const response = await authAxios.get('/api/admin/mcp/logs', {
        params: {
          limit: 50,
          level: 'all'
        }
      });
      
      if (response.data.success && response.data.logs) {
        setLogs(response.data.logs);
      } else {
        throw new Error(response.data.message || 'Invalid logs response format');
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      setLogsError(error.response?.data?.message || error.message || 'Failed to fetch logs');
      // Keep existing logs if available, don't fallback to mock data
    } finally {
      setLogsLoading(false);
    }
  }, [authAxios]);

  // Toast notification helper (to be implemented with proper toast library)
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    console.log(`${type.toUpperCase()}: ${message}`);
    // TODO: Integrate with proper toast notification library (react-hot-toast or similar)
  };

  // Calculate server statistics
  const calculateStats = (serversData: MCPServer[]) => {
    const totalServers = serversData.length;
    const healthyServers = serversData.filter(s => s.status === 'healthy').length;
    const warningServers = serversData.filter(s => s.status === 'warning').length;
    const errorServers = serversData.filter(s => s.status === 'error').length;
    const offlineServers = serversData.filter(s => s.status === 'offline').length;
    
    setStats({
      totalServers,
      healthyServers,
      warningServers,
      errorServers,
      offlineServers
    });
  };

  // Load data on component mount
  useEffect(() => {
    fetchServers();
    fetchLogs();
  }, [fetchServers, fetchLogs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServers();
      if (showLogs) {
        fetchLogs();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchServers, fetchLogs, showLogs]);

  // Filter servers based on search and filters
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    const matchesType = typeFilter === 'all' || server.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Confirmation dialog helper
  const showConfirmation = (config: {
    title: string;
    message: string;
    action: () => void;
    actionType: 'danger' | 'success';
    actionText: string;
  }) => {
    setConfirmationDialog({
      isOpen: true,
      ...config
    });
  };

  const closeConfirmation = () => {
    setConfirmationDialog(null);
  };

  // Enhanced server action handlers with loading states and error handling
  const executeStartServer = async (serverId: string) => {
    const serverName = servers.find(s => s.id === serverId)?.name || serverId;
    showConfirmation({
      title: 'Start Server',
      message: `Are you sure you want to start ${serverName}? This will make the server available for requests.`,
      action: () => performStartServer(serverId),
      actionType: 'success',
      actionText: 'Start Server'
    });
  };

  const performStartServer = async (serverId: string) => {
    closeConfirmation();
    try {
      setOperationLoading(prev => ({ ...prev, [serverId]: 'starting' }));
      setActiveActionMenu(null);
      
      // Optimistic update
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'warning' as const }
          : server
      ));
      
      const response = await authAxios.post(`/api/admin/mcp/servers/${serverId}/start`);
      
      if (response.data.success) {
        showToast(`Server ${serverId} started successfully`, 'success');
        await fetchServers(); // Refresh to get actual status
      } else {
        throw new Error(response.data.message || 'Failed to start server');
      }
    } catch (error: any) {
      console.error('Error starting server:', error);
      showToast(
        error.response?.data?.message || error.message || `Failed to start server ${serverId}`,
        'error'
      );
      // Revert optimistic update on error
      await fetchServers();
    } finally {
      setOperationLoading(prev => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
    }
  };

  const executeStopServer = async (serverId: string) => {
    const serverName = servers.find(s => s.id === serverId)?.name || serverId;
    showConfirmation({
      title: 'Stop Server',
      message: `Are you sure you want to stop ${serverName}? This will make the server unavailable and may interrupt active requests.`,
      action: () => performStopServer(serverId),
      actionType: 'danger',
      actionText: 'Stop Server'
    });
  };

  const performStopServer = async (serverId: string) => {
    closeConfirmation();
    try {
      setOperationLoading(prev => ({ ...prev, [serverId]: 'stopping' }));
      setActiveActionMenu(null);
      
      // Optimistic update
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'warning' as const }
          : server
      ));
      
      const response = await authAxios.post(`/api/admin/mcp/servers/${serverId}/stop`);
      
      if (response.data.success) {
        showToast(`Server ${serverId} stopped successfully`, 'success');
        await fetchServers(); // Refresh to get actual status
      } else {
        throw new Error(response.data.message || 'Failed to stop server');
      }
    } catch (error: any) {
      console.error('Error stopping server:', error);
      showToast(
        error.response?.data?.message || error.message || `Failed to stop server ${serverId}`,
        'error'
      );
      // Revert optimistic update on error
      await fetchServers();
    } finally {
      setOperationLoading(prev => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
    }
  };

  const executeRestartServer = async (serverId: string) => {
    const serverName = servers.find(s => s.id === serverId)?.name || serverId;
    showConfirmation({
      title: 'Restart Server',
      message: `Are you sure you want to restart ${serverName}? This will temporarily interrupt service while the server restarts.`,
      action: () => performRestartServer(serverId),
      actionType: 'danger',
      actionText: 'Restart Server'
    });
  };

  const performRestartServer = async (serverId: string) => {
    closeConfirmation();
    try {
      setOperationLoading(prev => ({ ...prev, [serverId]: 'restarting' }));
      setActiveActionMenu(null);
      
      // Optimistic update
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'warning' as const }
          : server
      ));
      
      const response = await authAxios.post(`/api/admin/mcp/servers/${serverId}/restart`);
      
      if (response.data.success) {
        showToast(`Server ${serverId} restarted successfully`, 'success');
        await fetchServers(); // Refresh to get actual status
      } else {
        throw new Error(response.data.message || 'Failed to restart server');
      }
    } catch (error: any) {
      console.error('Error restarting server:', error);
      showToast(
        error.response?.data?.message || error.message || `Failed to restart server ${serverId}`,
        'error'
      );
      // Revert optimistic update on error
      await fetchServers();
    } finally {
      setOperationLoading(prev => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
    }
  };

  const handleViewLogs = (serverId: string) => {
    console.log('View server logs:', serverId);
    setShowLogs(true);
    setActiveActionMenu(null);
  };

  const handleConfigureServer = (serverId: string) => {
    console.log('Configure server:', serverId);
    setActiveActionMenu(null);
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'ai-agent': return <Cpu size={20} />;
      case 'data-processor': return <Database size={20} />;
      case 'scheduler': return <Clock size={20} />;
      case 'analytics': return <BarChart3 size={20} />;
      default: return <Server size={20} />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return formatDuration(diffMs);
  };

  // Enhanced refresh handler with error handling
  const handleRefresh = async () => {
    try {
      setError(null);
      await fetchServers();
      if (showLogs) {
        await fetchLogs();
      }
      showToast('Data refreshed successfully', 'success');
    } catch (error: any) {
      showToast('Failed to refresh data', 'error');
    }
  };

  if (loading) {
    return (
      <ManagementContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={32} color="#00ffff" />
          </motion.div>
        </div>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      {/* Stats Overview */}
      <StatsBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber className="default">{stats.totalServers}</StatNumber>
          <StatTitle>Total Servers</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber className="healthy">{stats.healthyServers}</StatNumber>
          <StatTitle>Healthy</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber className="warning">{stats.warningServers}</StatNumber>
          <StatTitle>Warning</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber className="error">{stats.errorServers}</StatNumber>
          <StatTitle>Error</StatTitle>
        </StatCard>
        <StatCard whileHover={{ scale: 1.02 }}>
          <StatNumber className="error">{stats.offlineServers}</StatNumber>
          <StatTitle>Offline</StatTitle>
        </StatCard>
      </StatsBar>

      {/* Action Bar */}
      <ActionBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SearchContainer>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search servers by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="offline">Offline</option>
          </FilterSelect>
          
          <FilterSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="ai-agent">AI Agent</option>
            <option value="data-processor">Data Processor</option>
            <option value="scheduler">Scheduler</option>
            <option value="analytics">Analytics</option>
          </FilterSelect>
        </SearchContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : <RefreshCw size={16} />}
            Refresh
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLogs(!showLogs)}
          >
            <FileText size={16} />
            {showLogs ? 'Hide Logs' : 'Show Logs'}
          </CommandButton>
          
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} />
            Add Server
          </CommandButton>
        </div>
      </ActionBar>

      {/* Error Displays */}
      <AnimatePresence>
        {error && (
          <ErrorAlert
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AlertTriangle size={16} />
            <span>Error loading servers: {error}</span>
            <RetryButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={loading}
            >
              Retry
            </RetryButton>
          </ErrorAlert>
        )}
      </AnimatePresence>

      {/* Servers Grid */}
      <ServersGrid>
        <AnimatePresence>
          {filteredServers.map((server, index) => (
            <ServerCard
              key={server.id}
              status={server.status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <ServerHeader>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <ServerIcon status={server.status}>
                    {getServerTypeIcon(server.type)}
                  </ServerIcon>
                  <ServerInfo>
                    <ServerName>{server.name}</ServerName>
                    <ServerDescription>{server.description}</ServerDescription>
                    <ServerEndpoint>{server.endpoint}</ServerEndpoint>
                  </ServerInfo>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <StatusBadge className={server.status}>
                    {operationLoading[server.id] ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <LoadingSpinner style={{ width: '12px', height: '12px' }} />
                        {operationLoading[server.id]}
                      </span>
                    ) : (
                      server.status
                    )}
                  </StatusBadge>
                  
                  <ActionMenu>
                    <ActionButton
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setActiveActionMenu(
                        activeActionMenu === server.id ? null : server.id
                      )}
                    >
                      <MoreVertical size={16} />
                    </ActionButton>
                    
                    <AnimatePresence>
                      {activeActionMenu === server.id && (
                        <ActionDropdown
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          {server.status === 'offline' ? (
                            <ActionItem
                              className="success"
                              whileHover={{ x: 4 }}
                              onClick={() => executeStartServer(server.id)}
                              disabled={operationLoading[server.id]}
                            >
                              {operationLoading[server.id] === 'starting' ? (
                                <LoadingSpinner />
                              ) : (
                                <Play size={16} />
                              )}
                              {operationLoading[server.id] === 'starting' ? 'Starting...' : 'Start Server'}
                            </ActionItem>
                          ) : (
                            <ActionItem
                              className="danger"
                              whileHover={{ x: 4 }}
                              onClick={() => executeStopServer(server.id)}
                              disabled={operationLoading[server.id]}
                            >
                              {operationLoading[server.id] === 'stopping' ? (
                                <LoadingSpinner />
                              ) : (
                                <Pause size={16} />
                              )}
                              {operationLoading[server.id] === 'stopping' ? 'Stopping...' : 'Stop Server'}
                            </ActionItem>
                          )}
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => executeRestartServer(server.id)}
                            disabled={operationLoading[server.id]}
                          >
                            {operationLoading[server.id] === 'restarting' ? (
                              <LoadingSpinner />
                            ) : (
                              <RotateCw size={16} />
                            )}
                            {operationLoading[server.id] === 'restarting' ? 'Restarting...' : 'Restart'}
                          </ActionItem>
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => handleViewLogs(server.id)}
                            disabled={operationLoading[server.id]}
                          >
                            <FileText size={16} />
                            View Logs
                          </ActionItem>
                          <ActionItem
                            whileHover={{ x: 4 }}
                            onClick={() => handleConfigureServer(server.id)}
                            disabled={operationLoading[server.id]}
                          >
                            <Settings size={16} />
                            Configure
                          </ActionItem>
                        </ActionDropdown>
                      )}
                    </AnimatePresence>
                  </ActionMenu>
                </div>
              </ServerHeader>

              <ConnectionIndicator>
                <PulsingDot connected={server.status !== 'offline'} />
                {server.status === 'offline' ? (
                  <WifiOff size={16} color="#ef4444" />
                ) : (
                  <Wifi size={16} color="#10b981" />
                )}
                <span style={{ color: server.status === 'offline' ? '#ef4444' : '#10b981' }}>
                  {server.status === 'offline' ? 'Disconnected' : 'Connected'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                  v{server.version}
                </span>
              </ConnectionIndicator>

              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
                Uptime: {formatUptime(server.uptime)} • Last seen: {getTimeAgo(server.lastSeen)} ago
              </div>

              <ServerMetrics>
                <MetricItem>
                  <MetricValue>{server.metrics.cpuUsage}%</MetricValue>
                  <MetricLabel>CPU</MetricLabel>
                  <PerformanceBar>
                    <PerformanceFill value={server.metrics.cpuUsage} />
                  </PerformanceBar>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{server.metrics.memoryUsage}%</MetricValue>
                  <MetricLabel>Memory</MetricLabel>
                  <PerformanceBar>
                    <PerformanceFill value={server.metrics.memoryUsage} />
                  </PerformanceBar>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{server.metrics.requestCount}</MetricValue>
                  <MetricLabel>Requests</MetricLabel>
                </MetricItem>
                <MetricItem>
                  <MetricValue>{server.metrics.responseTime}ms</MetricValue>
                  <MetricLabel>Response</MetricLabel>
                </MetricItem>
              </ServerMetrics>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span>Error Rate: {server.metrics.errorRate}%</span>
                <span>Max Connections: {server.configuration.maxConnections}</span>
              </div>
            </ServerCard>
          ))}
        </AnimatePresence>
      </ServersGrid>

      {/* Logs Panel */}
      <AnimatePresence>
        {showLogs && (
          <LogsPanel
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ 
                color: '#00ffff', 
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FileText size={20} />
                Server Logs
                {logsLoading && <LoadingSpinner />}
              </h3>
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchLogs}
                disabled={logsLoading}
              >
                {logsLoading ? <LoadingSpinner /> : <RefreshCw size={14} />}
                Refresh
              </CommandButton>
            </div>
            
            {/* Logs Error Display */}
            {logsError && (
              <ErrorAlert
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle size={16} />
                <span>Error loading logs: {logsError}</span>
                <RetryButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchLogs}
                  disabled={logsLoading}
                >
                  Retry
                </RetryButton>
              </ErrorAlert>
            )}
            
            {logs.map((log, index) => (
              <LogEntry key={index}>
                <LogTimestamp>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </LogTimestamp>
                <LogLevel className={log.level}>
                  {log.level}
                </LogLevel>
                <div style={{ 
                  fontWeight: 600, 
                  color: 'rgba(255, 255, 255, 0.8)',
                  minWidth: '120px',
                  flexShrink: 0
                }}>
                  {log.server}
                </div>
                <LogMessage>{log.message}</LogMessage>
              </LogEntry>
            ))}
          </LogsPanel>
        )}
      </AnimatePresence>
      
      {filteredServers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255, 255, 255, 0.6)'
          }}
        >
          <Server size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No servers found</h3>
          <p>Try adjusting your search or filters</p>
        </motion.div>
      )}
      
      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmationDialog && (
          <ConfirmationOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeConfirmation();
              }
            }}
          >
            <ConfirmationDialog
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
            >
              <ConfirmationTitle>
                {confirmationDialog.actionType === 'danger' ? (
                  <AlertTriangle size={20} color="#ef4444" />
                ) : (
                  <CheckCircle size={20} color="#10b981" />
                )}
                {confirmationDialog.title}
              </ConfirmationTitle>
              
              <ConfirmationMessage>
                {confirmationDialog.message}
              </ConfirmationMessage>
              
              <ConfirmationActions>
                <ConfirmButton
                  className="cancel"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeConfirmation}
                >
                  Cancel
                </ConfirmButton>
                
                <ConfirmButton
                  className={`confirm ${confirmationDialog.actionType === 'success' ? 'success' : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmationDialog.action}
                >
                  {confirmationDialog.actionText}
                </ConfirmButton>
              </ConfirmationActions>
            </ConfirmationDialog>
          </ConfirmationOverlay>
        )}
      </AnimatePresence>
    </ManagementContainer>
  );
};

export default MCPServersSection;

// Export types for index.ts
export type { MCPServer, MCPStats };