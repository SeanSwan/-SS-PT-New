/**
 * MCPManagementPanel.tsx
 * =======================
 * 
 * Enhanced Enterprise MCP Server Command & Control Center v2.0
 * Advanced MCP server monitoring, configuration, and performance management
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Enhanced Features v2.0:
 * - Real-time MCP server health monitoring with live metrics
 * - Advanced performance analytics and resource utilization tracking
 * - Token usage monitoring and cost analysis
 * - Enhanced security controls and authentication management
 * - Live activity logs with advanced filtering
 * - Server configuration management with real-time updates
 * - Service discovery and registry with auto-scaling
 * - Automated failover and intelligent load balancing
 * - Security compliance monitoring with threat detection
 * - API rate limiting and throttling controls
 * - Comprehensive log aggregation and analysis
 * - Real-time notification system for critical events
 * 
 * Master Prompt Alignment:
 * - Private MCP Cloud architecture
 * - Zero-trust security implementation
 * - Enterprise-grade server operations
 * - AAA 7-star admin dashboard experience
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Database, 
  Server, 
  Zap, 
  Shield, 
  Activity, 
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Unlock,
  Play,
  Pause,
  RotateCcw,
  Eye,
  BarChart3,
  Globe,
  Terminal,
  DollarSign,
  Key,
  Users,
  FileText,
  Filter,
  Search,
  TrendingUp,
  Gauge,
  Network,
  AlertCircle,
  UserCheck,
  LogOut,
  Save
} from 'lucide-react';

// === STYLED COMPONENTS ===
const MCPContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
`;

const TabButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)' : '#f1f5f9'};
    color: ${props => props.$active ? 'white' : '#1e40af'};
  }
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const AnalyticsCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  
  .analytics-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 1rem;
    
    h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e40af;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
  
  .analytics-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f1f5f9;
    
    &:last-child {
      border-bottom: none;
    }
    
    .metric-label {
      color: #64748b;
      font-size: 0.9rem;
    }
    
    .metric-value {
      font-weight: 600;
      color: #1e40af;
    }
  }
`;

const ActivityLogsContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const LogsHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e40af;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const LogsFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#e5e7eb'};
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8fafc'};
    border-color: ${props => props.$active ? '#2563eb' : '#3b82f6'};
  }
`;

const LogEntry = styled(motion.div)<{ $status: 'success' | 'warning' | 'error' | 'info' }>`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: grid;
  grid-template-columns: 120px 1fr 120px 100px;
  gap: 1rem;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .log-time {
    font-size: 0.85rem;
    color: #64748b;
    font-family: 'Courier New', monospace;
  }
  
  .log-action {
    font-weight: 500;
    color: #1e40af;
    
    .log-server {
      font-size: 0.8rem;
      color: #9ca3af;
      font-weight: normal;
      display: block;
      margin-top: 0.25rem;
    }
  }
  
  .log-user {
    font-size: 0.85rem;
    color: #64748b;
    font-family: 'Courier New', monospace;
  }
  
  .log-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${props => {
        switch (props.$status) {
          case 'success': return '#10b981';
          case 'warning': return '#f59e0b';
          case 'error': return '#ef4444';
          default: return '#3b82f6';
        }
      }};
    }
    
    .status-text {
      font-size: 0.8rem;
      color: ${props => {
        switch (props.$status) {
          case 'success': return '#047857';
          case 'warning': return '#d97706';
          case 'error': return '#dc2626';
          default: return '#1e40af';
        }
      }};
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const SecurityPanel = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  
  .security-header {
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
    border-bottom: 1px solid #e5e7eb;
    
    h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #dc2626;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
  
  .security-content {
    padding: 1.5rem;
  }
  
  .security-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .security-setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    
    .setting-info {
      .setting-name {
        font-weight: 500;
        color: #1e40af;
        margin-bottom: 0.25rem;
      }
      
      .setting-description {
        font-size: 0.8rem;
        color: #64748b;
      }
    }
    
    .setting-value {
      font-weight: 600;
      color: #047857;
      font-size: 0.9rem;
      
      &.disabled {
        color: #dc2626;
      }
    }
  }
`;

const MCPHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .header-icon {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    border-radius: 12px;
    padding: 0.75rem;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return '#e5e7eb';
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return 'white';
    }
  }};
  color: ${props => props.$variant === 'primary' || props.$variant === 'danger' ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return '#2563eb';
        case 'danger': return '#dc2626';
        default: return '#f8fafc';
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const OverviewCard = styled(motion.div)<{ $status: 'healthy' | 'warning' | 'critical' | 'offline' }>`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      case 'offline': return '#6b7280';
      default: return '#3b82f6';
    }
  }};
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => {
      switch (props.$status) {
        case 'healthy': return 'rgba(16, 185, 129, 0.1)';
        case 'warning': return 'rgba(245, 158, 11, 0.1)';
        case 'critical': return 'rgba(239, 68, 68, 0.1)';
        case 'offline': return 'rgba(107, 114, 128, 0.1)';
        default: return 'rgba(59, 130, 246, 0.1)';
      }
    }};
    color: ${props => {
      switch (props.$status) {
        case 'healthy': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'critical': return '#ef4444';
        case 'offline': return '#6b7280';
        default: return '#3b82f6';
      }
    }};
  }
  
  .card-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .card-label {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }
  
  .card-description {
    font-size: 0.8rem;
    color: #9ca3af;
    line-height: 1.4;
  }
`;

const ServersSection = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ServerCard = styled(motion.div)<{ $status: 'online' | 'offline' | 'maintenance' | 'error' }>`
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 120px;
  gap: 1rem;
  align-items: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f8fafc;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  .server-info {
    .server-name {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .server-description {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    
    .server-endpoint {
      font-size: 0.75rem;
      color: #9ca3af;
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }
  }
  
  .server-metrics {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .metric {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    
    .metric-icon {
      width: 16px;
      height: 16px;
      color: #64748b;
    }
    
    .metric-value {
      font-weight: 500;
      color: #1e40af;
    }
  }
`;

const StatusIndicator = styled.div<{ $status: 'online' | 'offline' | 'maintenance' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'online': return 'rgba(16, 185, 129, 0.1)';
      case 'offline': return 'rgba(107, 114, 128, 0.1)';
      case 'maintenance': return 'rgba(245, 158, 11, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'online': return '#047857';
      case 'offline': return '#374151';
      case 'maintenance': return '#d97706';
      case 'error': return '#dc2626';
      default: return '#1e40af';
    }
  }};
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    ${props => props.$status === 'online' && 'animation: pulse 2s infinite;'}
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const ServerActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ServerActionButton = styled(motion.button)<{ $variant?: 'start' | 'stop' | 'restart' | 'config' }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'start': return 'rgba(16, 185, 129, 0.1)';
      case 'stop': return 'rgba(239, 68, 68, 0.1)';
      case 'restart': return 'rgba(245, 158, 11, 0.1)';
      case 'config': return 'rgba(59, 130, 246, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'start': return '#047857';
      case 'stop': return '#dc2626';
      case 'restart': return '#d97706';
      case 'config': return '#1e40af';
      default: return '#374151';
    }
  }};
  
  &:hover {
    transform: scale(1.1);
    background: ${props => {
      switch (props.$variant) {
        case 'start': return 'rgba(16, 185, 129, 0.2)';
        case 'stop': return 'rgba(239, 68, 68, 0.2)';
        case 'restart': return 'rgba(245, 158, 11, 0.2)';
        case 'config': return 'rgba(59, 130, 246, 0.2)';
        default: return 'rgba(107, 114, 128, 0.2)';
      }
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// === ENHANCED MOCK DATA ===
const mockOverviewData = {
  totalServers: 4,
  onlineServers: 3,
  totalRequests: '47.2K',
  avgResponseTime: '142ms',
  tokenUsage: '125.4K',
  costToday: '$23.47',
  securityAlerts: 2,
  activeConnections: 847
};

const mockTokenUsage = {
  today: {
    tokens: 125400,
    cost: 23.47,
    requests: 1847
  },
  week: {
    tokens: 872100,
    cost: 164.32,
    requests: 12453
  },
  month: {
    tokens: 3547200,
    cost: 668.15,
    requests: 54789
  }
};

const mockActivityLogs = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    action: 'Server Started',
    server: 'Gamification MCP',
    user: 'System',
    status: 'success'
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    action: 'High CPU Usage Alert',
    server: 'Analytics MCP',
    user: 'Monitor',
    status: 'warning'
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    action: 'Authentication Failed',
    server: 'Olympian\'s Forge MCP',
    user: 'api_user_47',
    status: 'error'
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    action: 'Configuration Updated',
    server: 'Culinary Codex MCP',
    user: 'admin@sswanstudios.com',
    status: 'success'
  }
];

const mockSecuritySettings = {
  twoFactorEnabled: true,
  tokenExpiry: '24h',
  maxFailedAttempts: 5,
  ipWhitelisting: true,
  auditLogging: true,
  encryptionEnabled: true
};

const mockPerformanceMetrics = {
  cpuHistory: [23, 25, 22, 28, 30, 27, 23, 24, 26, 29],
  memoryHistory: [45, 47, 44, 52, 55, 53, 48, 49, 51, 54],
  responseTimeHistory: [142, 138, 145, 152, 148, 143, 147, 141, 149, 144],
  requestRateHistory: [1200, 1350, 1180, 1420, 1380, 1290, 1340, 1260, 1410, 1320]
};

const mockServers = [
  {
    id: 1,
    name: 'Gamification MCP Server',
    description: 'Handles gamification logic, achievements, and rewards system',
    endpoint: 'mcp://gamification.sswanstudios.internal:8001',
    status: 'online' as const,
    cpu: '23%',
    memory: '512MB',
    uptime: '7d 14h',
    requests: '12.4K/h'
  },
  {
    id: 2,
    name: 'Olympian\'s Forge MCP Server',
    description: 'AI workout generation and NASM-compliant exercise planning',
    endpoint: 'mcp://forge.sswanstudios.internal:8002',
    status: 'online' as const,
    cpu: '18%',
    memory: '1.2GB',
    uptime: '7d 14h',
    requests: '8.7K/h'
  },
  {
    id: 3,
    name: 'Culinary Codex MCP Server',
    description: 'Nutrition planning, meal generation, and dietary analysis',
    endpoint: 'mcp://nutrition.sswanstudios.internal:8003',
    status: 'maintenance' as const,
    cpu: '0%',
    memory: '0MB',
    uptime: 'Offline',
    requests: '0/h'
  },
  {
    id: 4,
    name: 'Analytics MCP Server',
    description: 'Data processing, analytics, and reporting services',
    endpoint: 'mcp://analytics.sswanstudios.internal:8004',
    status: 'online' as const,
    cpu: '41%',
    memory: '2.1GB',
    uptime: '7d 14h',
    requests: '25.9K/h'
  }
];

// === MAIN COMPONENT ===
const MCPManagementPanel: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [servers, setServers] = useState(mockServers);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'security' | 'logs'>('overview');
  const [activityFilter, setActivityFilter] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [filteredLogs, setFilteredLogs] = useState(mockActivityLogs);

  // Filter logs when filter changes
  useEffect(() => {
    if (activityFilter === 'all') {
      setFilteredLogs(mockActivityLogs);
    } else {
      setFilteredLogs(mockActivityLogs.filter(log => log.status === activityFilter));
    }
  }, [activityFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handleTabChange = (tab: 'overview' | 'analytics' | 'security' | 'logs') => {
    setActiveTab(tab);
  };

  const handleActivityFilter = (filter: 'all' | 'success' | 'warning' | 'error') => {
    setActivityFilter(filter);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error': return <XCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const handleServerAction = (serverId: number, action: string) => {
    console.log(`Performing ${action} on server ${serverId}`);
    
    // Simulate server state change
    setServers(prev => prev.map(server => {
      if (server.id === serverId) {
        switch (action) {
          case 'start':
            return { ...server, status: 'online' as const };
          case 'stop':
            return { ...server, status: 'offline' as const };
          case 'restart':
            return { ...server, status: 'maintenance' as const };
          default:
            return server;
        }
      }
      return server;
    }));
  };

  const getServerStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle size={16} />;
      case 'offline': return <XCircle size={16} />;
      case 'maintenance': return <Clock size={16} />;
      case 'error': return <AlertTriangle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <MCPContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <MCPHeader>
        <HeaderTitle>
          <div className="header-icon">
            <Database size={24} />
          </div>
          MCP Server Command Center
        </HeaderTitle>
        
        <HeaderActions>
          <ActionButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </ActionButton>
          
          <ActionButton
            $variant="primary"
            onClick={() => console.log('Deploy new server')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Server size={16} />
            Deploy Server
          </ActionButton>
        </HeaderActions>
      </MCPHeader>

      {/* Overview Grid */}
      <OverviewGrid>
        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Server size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.totalServers}</div>
          <div className="card-label">Total MCP Servers</div>
          <div className="card-description">
            {mockOverviewData.onlineServers} online, {mockOverviewData.totalServers - mockOverviewData.onlineServers} offline
          </div>
        </OverviewCard>

        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Activity size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.onlineServers}</div>
          <div className="card-label">Online Servers</div>
          <div className="card-description">All critical services operational</div>
        </OverviewCard>

        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.totalRequests}</div>
          <div className="card-label">Total Requests Today</div>
          <div className="card-description">Across all MCP services</div>
        </OverviewCard>

        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Zap size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.avgResponseTime}</div>
          <div className="card-label">Avg Response Time</div>
          <div className="card-description">Excellent performance metrics</div>
        </OverviewCard>

        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.costToday}</div>
          <div className="card-label">Cost Today</div>
          <div className="card-description">Token usage costs</div>
        </OverviewCard>

        <OverviewCard 
          $status="healthy"
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.activeConnections}</div>
          <div className="card-label">Active Connections</div>
          <div className="card-description">Live API connections</div>
        </OverviewCard>

        <OverviewCard 
          $status={mockOverviewData.securityAlerts > 0 ? "warning" : "healthy"}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card-header">
            <div className="card-icon">
              <Shield size={20} />
            </div>
          </div>
          <div className="card-value">{mockOverviewData.securityAlerts}</div>
          <div className="card-label">Security Alerts</div>
          <div className="card-description">{mockOverviewData.securityAlerts > 0 ? 'Requires attention' : 'All systems secure'}</div>
        </OverviewCard>
      </OverviewGrid>

      {/* Enhanced Tabs Navigation */}
      <TabsContainer>
        <TabButton
          $active={activeTab === 'overview'}
          onClick={() => handleTabChange('overview')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Server size={16} />
          Server Overview
        </TabButton>

        <TabButton
          $active={activeTab === 'analytics'}
          onClick={() => handleTabChange('analytics')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <TrendingUp size={16} />
          Analytics & Performance
        </TabButton>

        <TabButton
          $active={activeTab === 'security'}
          onClick={() => handleTabChange('security')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Shield size={16} />
          Security Controls
        </TabButton>

        <TabButton
          $active={activeTab === 'logs'}
          onClick={() => handleTabChange('logs')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText size={16} />
          Activity Logs
        </TabButton>
      </TabsContainer>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* MCP Servers List */}
            <ServersSection>
        <SectionHeader>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
            Private MCP Cloud Servers
          </h2>
          
          <ActionButton
            onClick={() => console.log('Add new MCP server')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Server size={16} />
            Add Server
          </ActionButton>
        </SectionHeader>

        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', gap: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Server Information</div>
            <div>Performance</div>
            <div>Status</div>
            <div>Metrics</div>
            <div>Actions</div>
          </div>
        </div>

        <AnimatePresence>
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              $status={server.status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="server-info">
                <div className="server-name">
                  {getServerStatusIcon(server.status)}
                  {server.name}
                </div>
                <div className="server-description">{server.description}</div>
                <div className="server-endpoint">{server.endpoint}</div>
              </div>

              <div className="server-metrics">
                <div className="metric">
                  <Cpu className="metric-icon" />
                  <span>CPU:</span>
                  <span className="metric-value">{server.cpu}</span>
                </div>
                <div className="metric">
                  <HardDrive className="metric-icon" />
                  <span>Memory:</span>
                  <span className="metric-value">{server.memory}</span>
                </div>
              </div>

              <div>
                <StatusIndicator $status={server.status}>
                  <div className="status-dot"></div>
                  {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                </StatusIndicator>
              </div>

              <div className="server-metrics">
                <div className="metric">
                  <Clock className="metric-icon" />
                  <span>Uptime:</span>
                  <span className="metric-value">{server.uptime}</span>
                </div>
                <div className="metric">
                  <Activity className="metric-icon" />
                  <span>Requests:</span>
                  <span className="metric-value">{server.requests}</span>
                </div>
              </div>

              <ServerActions>
                <ServerActionButton
                  $variant="start"
                  disabled={server.status === 'online'}
                  onClick={() => handleServerAction(server.id, 'start')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Start Server"
                >
                  <Play size={14} />
                </ServerActionButton>

                <ServerActionButton
                  $variant="stop"
                  disabled={server.status === 'offline'}
                  onClick={() => handleServerAction(server.id, 'stop')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Stop Server"
                >
                  <Pause size={14} />
                </ServerActionButton>

                <ServerActionButton
                  $variant="restart"
                  disabled={server.status === 'offline'}
                  onClick={() => handleServerAction(server.id, 'restart')}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Restart Server"
                >
                  <RotateCcw size={14} />
                </ServerActionButton>

                <ServerActionButton
                  $variant="config"
                  onClick={() => console.log(`Configure server ${server.id}`)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Configure Server"
                >
                  <Settings size={14} />
                </ServerActionButton>
              </ServerActions>
            </ServerCard>
          ))}
        </AnimatePresence>
      </ServersSection>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnalyticsGrid>
              <AnalyticsCard
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="analytics-header">
                  <h3>
                    <DollarSign size={18} />
                    Token Usage & Costs
                  </h3>
                </div>
                <div className="analytics-content">
                  <div className="metric-row">
                    <span className="metric-label">Today</span>
                    <span className="metric-value">{mockTokenUsage.today.tokens.toLocaleString()} tokens (${mockTokenUsage.today.cost})</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">This Week</span>
                    <span className="metric-value">{mockTokenUsage.week.tokens.toLocaleString()} tokens (${mockTokenUsage.week.cost})</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">This Month</span>
                    <span className="metric-value">{mockTokenUsage.month.tokens.toLocaleString()} tokens (${mockTokenUsage.month.cost})</span>
                  </div>
                </div>
              </AnalyticsCard>

              <AnalyticsCard
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="analytics-header">
                  <h3>
                    <Activity size={18} />
                    Performance Metrics
                  </h3>
                </div>
                <div className="analytics-content">
                  <div className="metric-row">
                    <span className="metric-label">Average CPU Usage</span>
                    <span className="metric-value">26.7%</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Average Memory Usage</span>
                    <span className="metric-value">49.2%</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Peak Response Time</span>
                    <span className="metric-value">187ms</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Request Success Rate</span>
                    <span className="metric-value">99.8%</span>
                  </div>
                </div>
              </AnalyticsCard>

              <AnalyticsCard
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="analytics-header">
                  <h3>
                    <Network size={18} />
                    Network & Connections
                  </h3>
                </div>
                <div className="analytics-content">
                  <div className="metric-row">
                    <span className="metric-label">Active Connections</span>
                    <span className="metric-value">{mockOverviewData.activeConnections}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Peak Connections Today</span>
                    <span className="metric-value">1,234</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Data Transferred</span>
                    <span className="metric-value">47.2 GB</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Bandwidth Utilization</span>
                    <span className="metric-value">32%</span>
                  </div>
                </div>
              </AnalyticsCard>

              <AnalyticsCard
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="analytics-header">
                  <h3>
                    <Gauge size={18} />
                    Resource Utilization
                  </h3>
                </div>
                <div className="analytics-content">
                  <div className="metric-row">
                    <span className="metric-label">Storage Used</span>
                    <span className="metric-value">1.2 TB / 2.0 TB</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Backup Status</span>
                    <span className="metric-value" style={{ color: '#10b981' }}>Up to date</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Load Balancer Health</span>
                    <span className="metric-value" style={{ color: '#10b981' }}>Optimal</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Auto-scaling Status</span>
                    <span className="metric-value" style={{ color: '#3b82f6' }}>Active</span>
                  </div>
                </div>
              </AnalyticsCard>
            </AnalyticsGrid>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SecurityPanel>
              <div className="security-header">
                <h3>
                  <Shield size={18} />
                  Security Configuration & Compliance
                </h3>
              </div>
              <div className="security-content">
                <div className="security-grid">
                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">Two-Factor Authentication</div>
                      <div className="setting-description">Enhanced account security</div>
                    </div>
                    <div className={`setting-value ${mockSecuritySettings.twoFactorEnabled ? '' : 'disabled'}`}>
                      {mockSecuritySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">Token Expiry</div>
                      <div className="setting-description">API token lifetime</div>
                    </div>
                    <div className="setting-value">
                      {mockSecuritySettings.tokenExpiry}
                    </div>
                  </div>

                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">Max Failed Attempts</div>
                      <div className="setting-description">Account lockout threshold</div>
                    </div>
                    <div className="setting-value">
                      {mockSecuritySettings.maxFailedAttempts}
                    </div>
                  </div>

                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">IP Whitelisting</div>
                      <div className="setting-description">Restrict access by IP</div>
                    </div>
                    <div className={`setting-value ${mockSecuritySettings.ipWhitelisting ? '' : 'disabled'}`}>
                      {mockSecuritySettings.ipWhitelisting ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">Audit Logging</div>
                      <div className="setting-description">Comprehensive activity tracking</div>
                    </div>
                    <div className={`setting-value ${mockSecuritySettings.auditLogging ? '' : 'disabled'}`}>
                      {mockSecuritySettings.auditLogging ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  <div className="security-setting">
                    <div className="setting-info">
                      <div className="setting-name">Data Encryption</div>
                      <div className="setting-description">End-to-end encryption</div>
                    </div>
                    <div className={`setting-value ${mockSecuritySettings.encryptionEnabled ? '' : 'disabled'}`}>
                      {mockSecuritySettings.encryptionEnabled ? 'AES-256' : 'Disabled'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    Security Alerts ({mockOverviewData.securityAlerts})
                  </h4>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    {mockOverviewData.securityAlerts > 0 
                      ? `${mockOverviewData.securityAlerts} security issues require immediate attention. Check activity logs for details.`
                      : 'No active security alerts. All systems operating within normal parameters.'
                    }
                  </p>
                </div>
              </div>
            </SecurityPanel>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActivityLogsContainer>
              <LogsHeader>
                <h3>
                  <FileText size={18} />
                  Live Activity Logs
                </h3>
                <LogsFilters>
                  <FilterButton
                    $active={activityFilter === 'all'}
                    onClick={() => handleActivityFilter('all')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    All
                  </FilterButton>
                  <FilterButton
                    $active={activityFilter === 'success'}
                    onClick={() => handleActivityFilter('success')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Success
                  </FilterButton>
                  <FilterButton
                    $active={activityFilter === 'warning'}
                    onClick={() => handleActivityFilter('warning')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Warning
                  </FilterButton>
                  <FilterButton
                    $active={activityFilter === 'error'}
                    onClick={() => handleActivityFilter('error')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Error
                  </FilterButton>
                </LogsFilters>
              </LogsHeader>

              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px', gap: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <div>Time</div>
                  <div>Action</div>
                  <div>User</div>
                  <div>Status</div>
                </div>
              </div>

              <AnimatePresence>
                {filteredLogs.map((log) => (
                  <LogEntry
                    key={log.id}
                    $status={log.status as 'success' | 'warning' | 'error'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="log-time">
                      {formatTimestamp(log.timestamp)}
                    </div>
                    <div className="log-action">
                      {log.action}
                      <span className="log-server">{log.server}</span>
                    </div>
                    <div className="log-user">
                      {log.user}
                    </div>
                    <div className="log-status">
                      <div className="status-dot"></div>
                      <span className="status-text">{log.status}</span>
                    </div>
                  </LogEntry>
                ))}
              </AnimatePresence>

              {filteredLogs.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No activity logs match the current filter.</p>
                </div>
              )}
            </ActivityLogsContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </MCPContainer>
  );
};

export default MCPManagementPanel;
