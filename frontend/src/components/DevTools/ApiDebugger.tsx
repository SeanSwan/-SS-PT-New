import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  CheckCircle,
  AlertCircle,
  Construction,
  RotateCcw,
  WifiOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { enableMockDataMode, isMockDataModeEnabled } from '../../utils/apiConnectivityFixer';
import api from '../../services/api';

// Styled Components
const Container = styled.div`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  color: #00ffff;
  margin: 0;
`;

const AlertBox = styled.div<{ $severity: 'warning' | 'info' | 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid ${({ $severity }) => {
    switch ($severity) {
      case 'warning': return 'rgba(255, 193, 7, 0.3)';
      case 'success': return 'rgba(40, 167, 69, 0.3)';
      case 'error': return 'rgba(220, 53, 69, 0.3)';
      default: return 'rgba(23, 162, 184, 0.3)';
    }
  }};
  background-color: ${({ $severity }) => {
    switch ($severity) {
      case 'warning': return 'rgba(255, 193, 7, 0.1)';
      case 'success': return 'rgba(40, 167, 69, 0.1)';
      case 'error': return 'rgba(220, 53, 69, 0.1)';
      default: return 'rgba(23, 162, 184, 0.1)';
    }
  }};
  color: ${({ $severity }) => {
    switch ($severity) {
      case 'warning': return '#ffc107';
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#17a2b8';
    }
  }};
`;

const AlertContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
`;

const Button = styled.button<{ $variant?: 'contained' | 'outlined'; $color?: string; $size?: 'small' | 'medium' }>`
  padding: ${({ $size }) => $size === 'small' ? '6px 12px' : '8px 16px'};
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  font-size: ${({ $size }) => $size === 'small' ? '0.75rem' : '0.875rem'};
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  
  ${({ $variant, $color }) => {
    if ($variant === 'contained') {
      return `
        background-color: ${$color === 'warning' ? '#ffc107' : '#00ffff'};
        color: ${$color === 'warning' ? '#000' : '#000'};
        border-color: ${$color === 'warning' ? '#ffc107' : '#00ffff'};
        
        &:hover {
          background-color: ${$color === 'warning' ? '#e0a800' : '#00e6e6'};
        }
      `;
    } else {
      return `
        background-color: transparent;
        color: ${$color === 'warning' ? '#ffc107' : $color === 'secondary' ? '#7851A9' : '#00ffff'};
        border-color: ${$color === 'warning' ? '#ffc107' : $color === 'secondary' ? '#7851A9' : '#00ffff'};
        
        &:hover {
          background-color: ${$color === 'warning' ? 'rgba(255, 193, 7, 0.1)' : $color === 'secondary' ? 'rgba(120, 81, 169, 0.1)' : 'rgba(0, 255, 255, 0.1)'};
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const StatsContainer = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background-color: rgba(40, 40, 80, 0.3);
  border-radius: 8px;
`;

const StatsTitle = styled.h3`
  font-size: 0.875rem;
  color: #ccc;
  margin: 0 0 8px 0;
`;

const ChipContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Chip = styled.div<{ $color: 'success' | 'error' | 'info' | 'default' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  border: 1px solid;
  background-color: transparent;
  
  ${({ $color }) => {
    switch ($color) {
      case 'success':
        return 'color: #28a745; border-color: #28a745;';
      case 'error':
        return 'color: #dc3545; border-color: #dc3545;';
      case 'info':
        return 'color: #17a2b8; border-color: #17a2b8;';
      default:
        return 'color: #ccc; border-color: #ccc;';
    }
  }}
`;

const spinning = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningIcon = styled.div`
  animation: ${spinning} 1s linear infinite;
  display: flex;
  align-items: center;
`;

const CollapseContainer = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 16px 0;
`;

const EndpointList = styled.div`
  background-color: rgba(40, 40, 80, 0.3);
  border-radius: 8px;
`;

const EndpointItem = styled.div<{ $hasBottomBorder: boolean }>`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  ${({ $hasBottomBorder }) => $hasBottomBorder ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.1);' : ''}
`;

const EndpointIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EndpointContent = styled.div`
  flex: 1;
`;

const EndpointName = styled.div`
  font-size: 0.875rem;
  color: white;
  margin-bottom: 2px;
`;

const EndpointUrl = styled.div`
  font-size: 0.75rem;
  color: #ccc;
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  color: #ccc;
  margin: 0 0 8px 0;
`;

// Endpoints to check
const ENDPOINTS = [
  { name: 'Notifications', url: '/notifications', key: 'notifications' },
  { name: 'Sessions', url: '/sessions', key: 'sessions' },
  { name: 'User Profile', url: '/users/profile', key: 'profile' },
  { name: 'Workouts', url: '/workout/plans', key: 'workouts' }
];

const ApiDebugger = () => {
  const [endpointStatus, setEndpointStatus] = useState(
    ENDPOINTS.map(endpoint => ({
      ...endpoint,
      status: 'unchecked',
      error: null,
      data: null
    }))
  );
  const [checking, setChecking] = useState(false);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [mockEnabled, setMockEnabled] = useState(isMockDataModeEnabled());
  const [showDetails, setShowDetails] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    checked: false,
    successful: 0,
    failed: 0
  });

  // Check the status of the mock data
  useEffect(() => {
    setMockEnabled(isMockDataModeEnabled());
    
    // Check every 2 seconds
    const interval = setInterval(() => {
      setMockEnabled(isMockDataModeEnabled());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Check API connection health
  const checkApiConnection = async () => {
    setChecking(true);
    setBackendStatus('checking');
    
    try {
      // Attempt to request a small endpoint
      await fetch('/api/health', { method: 'GET', timeout: 5000 });
      setBackendStatus('online');
    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus('offline');
    }
    
    setChecking(false);
  };

  // Check all endpoints
  const checkAllEndpoints = async () => {
    setChecking(true);
    
    // Copy the current state
    const newStatus = [...endpointStatus];
    
    // Reset connection stats
    const stats = {
      checked: true,
      successful: 0,
      failed: 0
    };
    
    // Check each endpoint
    for (let i = 0; i < ENDPOINTS.length; i++) {
      const endpoint = ENDPOINTS[i];
      newStatus[i] = {
        ...endpoint,
        status: 'checking',
        error: null,
        data: null
      };
      
      setEndpointStatus([...newStatus]);
      
      try {
        // Try to fetch the data
        const data = await api.get(endpoint.url);
        
        // Update the status
        newStatus[i] = {
          ...endpoint,
          status: 'online',
          error: null,
          data
        };
        
        stats.successful++;
      } catch (error) {
        // Update status with error
        newStatus[i] = {
          ...endpoint,
          status: 'error',
          error: error.message || 'Unknown error',
          data: null
        };
        
        stats.failed++;
      }
      
      setEndpointStatus([...newStatus]);
    }
    
    setConnectionStats(stats);
    setChecking(false);
  };

  // Enable mock data mode
  const enableMockMode = () => {
    enableMockDataMode();
    setMockEnabled(true);
  };

  // Reload the application
  const reloadApp = () => {
    window.location.reload();
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={20} color="#28a745" />;
      case 'error':
        return <AlertCircle size={20} color="#dc3545" />;
      case 'checking':
        return (
          <SpinningIcon>
            <RotateCcw size={20} color="#17a2b8" />
          </SpinningIcon>
        );
      default:
        return <WifiOff size={20} color="#6c757d" />;
    }
  };

  return (
    <Container>
      <Header>
        <Construction size={20} color="#ffc107" />
        <Title>API Connectivity Debugger</Title>
      </Header>

      {/* Connection status */}
      <div>
        <AlertBox $severity={mockEnabled ? "warning" : "info"}>
          <AlertContent>
            <div>
              {mockEnabled 
                ? "Mock data mode is ENABLED. You are using simulated data." 
                : "Mock data mode is disabled. You are using real backend data."}
            </div>
            
            {!mockEnabled && (
              <Button 
                $size="small" 
                $variant="outlined" 
                $color="warning"
                onClick={enableMockMode}
              >
                Enable Mock Data
              </Button>
            )}
          </AlertContent>
        </AlertBox>
        
        {connectionStats.checked && (
          <StatsContainer>
            <StatsTitle>Connection Test Results:</StatsTitle>
            <ChipContainer>
              <Chip $color="success">
                {connectionStats.successful} Successful
              </Chip>
              <Chip $color="error">
                {connectionStats.failed} Failed
              </Chip>
            </ChipContainer>
          </StatsContainer>
        )}
      </div>

      {/* Action buttons */}
      <ButtonGroup>
        <Button
          $variant="contained"
          $size="small"
          disabled={checking}
          onClick={checkAllEndpoints}
        >
          {checking ? (
            <SpinningIcon>
              <RotateCcw size={16} />
            </SpinningIcon>
          ) : null}
          {checking ? 'Checking...' : 'Check Endpoints'}
        </Button>
        
        <Button
          $variant="outlined"
          $size="small"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <ChevronUp size={16} />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show Details
            </>
          )}
        </Button>
        
        <Button
          $variant="outlined"
          $size="small"
          $color="secondary"
          onClick={reloadApp}
        >
          Reload App
        </Button>
      </ButtonGroup>

      {/* Endpoint details */}
      <CollapseContainer $open={showDetails}>
        <Divider />
        
        <SectionTitle>Endpoint Status:</SectionTitle>
        
        <EndpointList>
          {endpointStatus.map((endpoint, index) => (
            <EndpointItem 
              key={endpoint.key} 
              $hasBottomBorder={index < endpointStatus.length - 1}
            >
              <EndpointIcon>
                {getStatusIcon(endpoint.status)}
              </EndpointIcon>
              <EndpointContent>
                <EndpointName>{endpoint.name}</EndpointName>
                <EndpointUrl>
                  {endpoint.status === 'error' 
                    ? `Error: ${endpoint.error}` 
                    : `${endpoint.url}`}
                </EndpointUrl>
              </EndpointContent>
              <Chip
                $color={
                  endpoint.status === 'online' ? 'success' :
                  endpoint.status === 'error' ? 'error' :
                  endpoint.status === 'checking' ? 'info' :
                  'default'
                }
              >
                {endpoint.status === 'online' ? 'Available' :
                 endpoint.status === 'error' ? 'Failed' :
                 endpoint.status === 'checking' ? 'Checking...' :
                 'Unchecked'}
              </Chip>
            </EndpointItem>
          ))}
        </EndpointList>
      </CollapseContainer>
    </Container>
  );
};

export default ApiDebugger;