/**
 * MCPManagementPanel.tsx
 * =======================
 * 
 * Enterprise MCP Server Command & Control Center
 * Advanced MCP server monitoring, configuration, and performance management
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time MCP server health monitoring
 * - Performance metrics and resource utilization
 * - Server configuration management
 * - Service discovery and registry
 * - Automated failover and load balancing
 * - Security compliance monitoring
 * - API rate limiting and throttling controls
 * - Log aggregation and analysis
 * 
 * Master Prompt Alignment:
 * - Private MCP Cloud architecture
 * - Zero-trust security implementation
 * - Enterprise-grade server operations
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
  Terminal
} from 'lucide-react';

// === STYLED COMPONENTS ===
const MCPContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
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

// === MOCK DATA ===
const mockOverviewData = {
  totalServers: 4,
  onlineServers: 3,
  totalRequests: '47.2K',
  avgResponseTime: '142ms'
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

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
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
      </OverviewGrid>

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
    </MCPContainer>
  );
};

export default MCPManagementPanel;
