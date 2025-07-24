import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// Animations
const slideDown = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

// Styled Components
const NetworkStatusContainer = styled.div<{ 
  show: boolean; 
  isOnline: boolean;
  position: 'top' | 'bottom';
}>`
  position: fixed;
  ${props => props.position === 'top' ? 'top: 0' : 'bottom: 0'};
  left: 0;
  right: 0;
  z-index: 9999;
  background: ${props => 
    props.isOnline 
      ? 'linear-gradient(90deg, #10b981, #059669)' 
      : 'linear-gradient(90deg, #ef4444, #dc2626)'
  };
  color: white;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  box-shadow: ${props => 
    props.position === 'top' 
      ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
      : '0 -2px 8px rgba(0, 0, 0, 0.15)'
  };
  animation: ${props => props.show ? slideDown : slideUp} 0.3s ease-out;
  display: ${props => props.show ? 'block' : 'none'};
  
  @media (max-width: 768px) {
    font-size: 13px;
    padding: 10px 16px;
  }
`;

const StatusContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 1200px;
  margin: 0 auto;
`;

const StatusIcon = styled.span<{ isOnline: boolean; isConnecting?: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isOnline ? '#ffffff' : '#ffffff'};
  animation: ${props => props.isConnecting ? pulse : 'none'} 1.5s infinite;
  flex-shrink: 0;
`;

const StatusText = styled.span`
  line-height: 1.2;
`;

const RetryButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    touch-action: manipulation;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  opacity: 0.8;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    font-size: 14px;
    padding: 4px;
    touch-action: manipulation;
  }
`;

interface NetworkStatusProps {
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  autoHideDelay?: number;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ 
  position = 'top',
  autoHide = true,
  autoHideDelay = 3000
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'fast' | 'slow' | 'unknown'>('unknown');
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null);

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;
    let connectionCheckTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      console.log('Network: Connection restored');
      setIsConnecting(true);
      
      // Test connection quality
      testConnectionQuality();
      
      // Show reconnected status
      setIsOnline(true);
      setShowStatus(true);
      
      // Hide connecting indicator after a moment
      setTimeout(() => {
        setIsConnecting(false);
      }, 1000);
      
      // Auto-hide after success message
      if (autoHide) {
        hideTimeout = setTimeout(() => {
          setShowStatus(false);
        }, autoHideDelay);
      }
    };

    const handleOffline = () => {
      console.log('Network: Connection lost');
      setIsOnline(false);
      setShowStatus(true);
      setIsConnecting(false);
      setConnectionQuality('unknown');
      setLastOfflineTime(new Date());
      
      // Clear any hide timeout when going offline
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };

    const testConnectionQuality = async () => {
      try {
        const startTime = performance.now();
        
        // Try to fetch a small resource from your backend
        const response = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-cache'
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          setConnectionQuality(responseTime < 1000 ? 'fast' : 'slow');
        } else {
          setConnectionQuality('slow');
        }
      } catch (error) {
        console.log('Network: Connection quality test failed:', error);
        setConnectionQuality('slow');
      }
    };

    // Initial connection quality test if online
    if (navigator.onLine) {
      testConnectionQuality();
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const startPeriodicCheck = () => {
      connectionCheckTimeout = setTimeout(async () => {
        if (navigator.onLine) {
          try {
            await fetch('/api/health', {
              method: 'HEAD',
              cache: 'no-cache',
              signal: AbortSignal.timeout(5000)
            });
          } catch (error) {
            // If fetch fails but navigator.onLine is true, show degraded connection
            if (isOnline) {
              setConnectionQuality('slow');
            }
          }
        }
        startPeriodicCheck();
      }, 30000); // Check every 30 seconds
    };

    startPeriodicCheck();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (connectionCheckTimeout) clearTimeout(connectionCheckTimeout);
    };
  }, [autoHide, autoHideDelay, isOnline]);

  const handleRetry = async () => {
    setIsConnecting(true);
    
    try {
      // Force a page refresh to reconnect
      const response = await fetch('/api/health', {
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setIsOnline(true);
        setConnectionQuality('fast');
        if (autoHide) {
          setTimeout(() => setShowStatus(false), 2000);
        }
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.log('Network: Retry failed:', error);
      setConnectionQuality('slow');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setShowStatus(false);
  };

  const getStatusMessage = () => {
    if (!isOnline) {
      return 'You\'re offline. Some features may not work.';
    }
    
    if (isConnecting) {
      return 'Reconnecting...';
    }
    
    if (connectionQuality === 'slow') {
      return 'Connection restored, but seems slow.';
    }
    
    if (lastOfflineTime) {
      return 'You\'re back online!';
    }
    
    return 'Connection restored';
  };

  // Don't show if online and never been offline
  if (isOnline && !lastOfflineTime && !showStatus) {
    return null;
  }

  return (
    <NetworkStatusContainer 
      show={showStatus || !isOnline}
      isOnline={isOnline}
      position={position}
    >
      <StatusContent>
        <StatusIcon 
          isOnline={isOnline} 
          isConnecting={isConnecting}
        />
        <StatusText>{getStatusMessage()}</StatusText>
        
        {!isOnline && (
          <RetryButton onClick={handleRetry} disabled={isConnecting}>
            {isConnecting ? 'Trying...' : 'Retry'}
          </RetryButton>
        )}
        
        {(isOnline || position === 'bottom') && (
          <CloseButton onClick={handleClose} aria-label="Close network status">
            ×
          </CloseButton>
        )}
      </StatusContent>
    </NetworkStatusContainer>
  );
};

export default NetworkStatus;
