/**
 * Real-Time Connection Status Indicator Component
 * ============================================
 * Displays the current WebSocket connection status with visual feedback
 * 
 * Features:
 * - Live connection status with color-coded indicators
 * - Performance metrics tooltip
 * - Connection quality display
 * - Reconnection progress
 * - Click-to-reconnect functionality
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Tooltip } from '@mui/material';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Pulsing animation for connected state
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
`;

// Blinking animation for connecting/reconnecting
const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
`;

// Spinning animation for reconnecting
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ConnectionStatusContainer = styled(motion.div)<{ 
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  quality: 'excellent' | 'good' | 'poor' | 'critical';
}>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid;
  
  ${({ status, quality }) => {
    switch (status) {
      case 'connected':
        const bgColor = quality === 'excellent' 
          ? 'rgba(16, 185, 129, 0.1)' 
          : quality === 'good'
          ? 'rgba(59, 130, 246, 0.1)'
          : quality === 'poor'
          ? 'rgba(245, 158, 11, 0.1)'
          : 'rgba(239, 68, 68, 0.1)';
        
        const borderColor = quality === 'excellent' 
          ? '#10b981' 
          : quality === 'good'
          ? '#3b82f6'
          : quality === 'poor'
          ? '#f59e0b'
          : '#ef4444';
          
        const textColor = quality === 'excellent' 
          ? '#10b981' 
          : quality === 'good'
          ? '#3b82f6'
          : quality === 'poor'
          ? '#f59e0b'
          : '#ef4444';
        
        return `
          background: ${bgColor};
          border-color: ${borderColor};
          color: ${textColor};
          animation: ${quality === 'excellent' ? pulse : 'none'} 2s infinite;
        `;
      case 'connecting':
      case 'reconnecting':
        return `
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
          color: #f59e0b;
          animation: ${blink} 1.5s infinite;
        `;
      case 'disconnected':
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          border-color: #6b7280;
          color: #6b7280;
        `;
    }
  }}
  
  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ConnectionIcon = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    ${({ status }) => status === 'reconnecting' ? `animation: ${spin} 1s linear infinite;` : ''}
  }
`;

const ConnectionText = styled.span<{ isMobile?: boolean }>`
  ${({ isMobile }) => isMobile ? 'display: none;' : ''}
  
  @media (max-width: 480px) {
    display: none;
  }
`;

const MetricsDisplay = styled.div`
  font-size: 0.625rem;
  opacity: 0.8;
  margin-top: 0.25rem;
`;

interface RealTimeConnectionStatusProps {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open';
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastMessageTime: Date | null;
  reconnectAttempts: number;
  messagesReceived: number;
  uptime: number;
  networkLatency: number;
  onReconnect?: () => void;
  onGetPerformanceMetrics?: () => any;
  isMobile?: boolean;
}

const RealTimeConnectionStatus: React.FC<RealTimeConnectionStatusProps> = ({
  connectionStatus,
  isConnected,
  connectionQuality,
  lastMessageTime,
  reconnectAttempts,
  messagesReceived,
  uptime,
  networkLatency,
  onReconnect,
  onGetPerformanceMetrics,
  isMobile = false
}) => {
  
  // Get appropriate icon based on status
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectionQuality === 'excellent' 
          ? <CheckCircle size={16} />
          : connectionQuality === 'good'
          ? <Wifi size={16} />
          : connectionQuality === 'poor'
          ? <Activity size={16} />
          : <AlertCircle size={16} />;
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw size={16} />;
      case 'disconnected':
      case 'error':
      case 'circuit-open':
        return <WifiOff size={16} />;
      default:
        return <Clock size={16} />;
    }
  };
  
  // Get status text
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectionQuality === 'excellent' 
          ? 'Live'
          : connectionQuality === 'good'
          ? 'Connected'
          : connectionQuality === 'poor'
          ? 'Slow'
          : 'Unstable';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return reconnectAttempts > 1 ? `Retry ${reconnectAttempts}` : 'Reconnecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Error';
      case 'circuit-open':
        return 'Protected';
      default:
        return 'Unknown';
    }
  };
  
  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };
  
  // Create tooltip content with performance metrics
  const getTooltipContent = () => {
    const metrics = onGetPerformanceMetrics?.() || {};
    
    return (
      <div style={{ padding: '0.5rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
          Real-Time Connection Status
        </div>
        
        <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem' }}>
          <div>Status: <strong>{getStatusText()}</strong></div>
          <div>Quality: <strong>{connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}</strong></div>
          
          {isConnected && (
            <>
              <div>Uptime: <strong>{formatTime(uptime)}</strong></div>
              <div>Messages: <strong>{messagesReceived.toLocaleString()}</strong></div>
              {networkLatency > 0 && (
                <div>Latency: <strong>{networkLatency}ms</strong></div>
              )}
              {lastMessageTime && (
                <div>Last update: <strong>{new Date(lastMessageTime).toLocaleTimeString()}</strong></div>
              )}
            </>
          )}
          
          {!isConnected && reconnectAttempts > 0 && (
            <div>Attempts: <strong>{reconnectAttempts}</strong></div>
          )}
          
          {metrics.connectionStability && (
            <div>Stability: <strong>{metrics.connectionStability.toFixed(0)}%</strong></div>
          )}
        </div>
        
        {!isConnected && onReconnect && (
          <div style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            color: '#3b82f6'
          }}>
            Click to reconnect
          </div>
        )}
      </div>
    );
  };
  
  const handleClick = () => {
    if (!isConnected && onReconnect) {
      onReconnect();
    }
  };
  
  return (
    <Tooltip 
      title={getTooltipContent()} 
      placement="bottom"
      arrow
    >
      <ConnectionStatusContainer
        status={connectionStatus}
        quality={connectionQuality}
        onClick={handleClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.95 }}
      >
        <ConnectionIcon status={connectionStatus}>
          {getStatusIcon()}
        </ConnectionIcon>
        
        <ConnectionText isMobile={isMobile}>
          {getStatusText()}
        </ConnectionText>
        
        {!isMobile && isConnected && connectionQuality === 'excellent' && (
          <MetricsDisplay>
            {messagesReceived > 0 && `${messagesReceived} msgs`}
          </MetricsDisplay>
        )}
      </ConnectionStatusContainer>
    </Tooltip>
  );
};

export default RealTimeConnectionStatus;
